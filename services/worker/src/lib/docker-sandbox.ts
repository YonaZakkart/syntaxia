import { PassThrough } from 'node:stream';
import Docker from 'dockerode';

const docker = new Docker();

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number; // en milisegundos
}

interface LanguageConfig {
  dockerImage: string;
  compileCommand?: string;
  runCommand: string;
  fileExtension: string;
}

function getLanguageConfig(
  languageId: string,
  dockerImage: string
): LanguageConfig {
  const langMap: Record<string, Omit<LanguageConfig, 'dockerImage'>> = {
    python: {
      compileCommand: undefined,
      runCommand: 'python3',
      fileExtension: '.py',
    },
    javascript: {
      compileCommand: undefined,
      runCommand: 'node',
      fileExtension: '.js',
    },
    cpp: {
      compileCommand: 'g++ /tmp/solution.cpp -o /tmp/solution -O2',
      runCommand: '/tmp/solution',
      fileExtension: '.cpp',
    },
    java: {
      compileCommand: 'javac /tmp/Solution.java',
      runCommand: 'java -cp /tmp Solution',
      fileExtension: '.java',
    },
  };

  const config = langMap[languageId.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported language: ${languageId}`);
  }

  return {
    dockerImage,
    ...config,
  };
}

async function demuxStream(
  stream: NodeJS.ReadableStream
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();

    let stdoutData = '';
    let stderrData = '';

    stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    stream.on('end', () => {
      resolve({ stdout: stdoutData, stderr: stderrData });
    });

    stream.on('error', reject);

    docker.modem.demuxStream(stream, stdout, stderr);
  });
}

export async function executeInSandbox(
  code: string,
  languageId: string,
  dockerImage: string,
  timeoutMs = 5000,
  stdinInput?: string
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const langConfig = getLanguageConfig(languageId, dockerImage);
  const sourceFile = `/tmp/solution${langConfig.fileExtension}`;

  let container: Docker.Container | null = null;

  try {
    container = await docker.createContainer({
      Image: langConfig.dockerImage,
      Cmd: ['/bin/sh', '-c', 'sleep 3600'],
      HostConfig: {
        Memory: 256 * 1024 * 1024,
        NanoCpus: 1000000000,
        NetworkMode: 'none',
        PidsLimit: 64,
      },
    });

    await container.start();

    const writeCodeExec = await container.exec({
      Cmd: ['sh', '-c', `cat > ${sourceFile} << 'EOF'\n${code}\nEOF`],
      AttachStdout: true,
      AttachStderr: true,
    });

    const writeCodeStream = await writeCodeExec.start({});
    await demuxStream(writeCodeStream);

    if (stdinInput !== undefined) {
      const writeInputExec = await container.exec({
        Cmd: ['sh', '-c', `cat > /tmp/input.txt << 'EOF'\n${stdinInput}\nEOF`],
        AttachStdout: true,
        AttachStderr: true,
      });
      const writeInputStream = await writeInputExec.start({});
      await demuxStream(writeInputStream);
    }

    if (langConfig.compileCommand) {
      const compileExec = await container.exec({
        Cmd: ['sh', '-c', langConfig.compileCommand],
        AttachStdout: true,
        AttachStderr: true,
      });

      const compileStream = await compileExec.start({});
      const compileResult = await demuxStream(compileStream);
      const compileInspect = await compileExec.inspect();

      if (compileInspect.ExitCode !== 0) {
        return {
          stdout: '',
          stderr: compileResult.stderr,
          exitCode: compileInspect.ExitCode ?? -1, // <-- CORREGIDO
          duration: Date.now() - startTime,
        };
      }
    }

    let runCmd: string;
    if (stdinInput !== undefined) {
      runCmd = `cat /tmp/input.txt | timeout ${Math.ceil(timeoutMs / 1000)}s ${langConfig.runCommand} ${sourceFile}`;
    } else {
      runCmd = `timeout ${Math.ceil(timeoutMs / 1000)}s ${langConfig.runCommand} ${sourceFile}`;
    }

    const runExec = await container.exec({
      Cmd: ['sh', '-c', runCmd],
      AttachStdout: true,
      AttachStderr: true,
    });

    const runStream = await runExec.start({});
    const result = await demuxStream(runStream);
    const runInspect = await runExec.inspect();

    const duration = Date.now() - startTime;

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: runInspect.ExitCode ?? -1, // <-- CORREGIDO
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: -1,
      duration,
    };
  } finally {
    if (container) {
      try {
        await container.stop({ t: 0 });
        await container.remove({ force: true });
      } catch (cleanupError) {
        console.error('Error cleaning up container:', cleanupError);
      }
    }
  }
}
