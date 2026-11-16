import { PassThrough } from 'node:stream';
import Docker from 'dockerode';
import tar from 'tar-stream';

const docker = new Docker();

const MEMORY_LIMIT_BYTES = 256 * 1024 * 1024; // 256 MB
const CPU_LIMIT_NANOS = 1_000_000_000; // 1 CPU
const COMPILE_TIMEOUT_SECONDS = 10;
// Cap what the worker keeps in memory; the stream is still drained.
const MAX_OUTPUT_BYTES = 1024 * 1024;

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  /** True when the compilation step exited with a non-zero code. */
  compilationFailed?: boolean;
  /** True when the sandbox itself failed (Docker, image pull, unsupported language). */
  systemError?: boolean;
  /** True when stdout or stderr exceeded MAX_OUTPUT_BYTES and was truncated. */
  outputTruncated?: boolean;
}

interface LanguageConfig {
  fileName: string;
  compileCommand?: string;
  runCommand: string; // full command, source path already included when needed
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  python: {
    fileName: 'solution.py',
    runCommand: 'python3 /tmp/solution.py',
  },
  javascript: {
    fileName: 'solution.js',
    runCommand: 'node /tmp/solution.js',
  },
  cpp: {
    fileName: 'solution.cpp',
    compileCommand: 'g++ -O2 /tmp/solution.cpp -o /tmp/solution',
    runCommand: '/tmp/solution',
  },
  java: {
    fileName: 'Solution.java',
    compileCommand: 'javac /tmp/Solution.java',
    runCommand: 'java -cp /tmp Solution',
  },
};

function getLanguageConfig(languageName: string): LanguageConfig {
  const config = LANGUAGE_CONFIGS[languageName.toLowerCase()];
  if (!config) {
    throw new Error(`Language not supported yet: ${languageName}`);
  }
  return config;
}

/**
 * Build a tar archive in memory containing a single file.
 * Using putArchive avoids shell interpolation entirely, so user code
 * can never break out of the file write (no heredoc delimiter injection).
 */
function buildTarBuffer(fileName: string, content: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pack = tar.pack();
    pack.entry({ name: fileName }, content);
    pack.finalize();

    const chunks: Buffer[] = [];
    pack.on('data', (chunk) => chunks.push(chunk as Buffer));
    pack.on('end', () => resolve(Buffer.concat(chunks)));
    pack.on('error', reject);
  });
}

async function writeFileToContainer(
  container: Docker.Container,
  fileName: string,
  content: string
): Promise<void> {
  const tarBuffer = await buildTarBuffer(fileName, content);
  await container.putArchive(tarBuffer, { path: '/tmp' });
}

async function ensureImageExists(imageName: string): Promise<void> {
  try {
    await docker.getImage(imageName).inspect();
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode !== 404) {
      throw error;
    }
    console.log(`[sandbox] Pulling image ${imageName}...`);
    const stream = await docker.pull(imageName);
    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(stream, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log(`[sandbox] Image ${imageName} ready`);
  }
}

async function demuxStream(stream: NodeJS.ReadableStream): Promise<{
  stdout: string;
  stderr: string;
  truncated: boolean;
}> {
  return new Promise((resolve, reject) => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let truncated = false;

    const collect = (
      chunk: Buffer | string,
      chunks: Buffer[],
      bytes: number
    ) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const nextBytes = bytes + buffer.length;

      if (nextBytes > MAX_OUTPUT_BYTES) {
        truncated = true;
        const remaining = MAX_OUTPUT_BYTES - bytes;
        if (remaining > 0) {
          chunks.push(buffer.subarray(0, remaining));
        }
      } else {
        chunks.push(buffer);
      }

      return nextBytes;
    };

    stdout.on('data', (chunk) => {
      stdoutBytes = collect(chunk, stdoutChunks, stdoutBytes);
    });
    stderr.on('data', (chunk) => {
      stderrBytes = collect(chunk, stderrChunks, stderrBytes);
    });

    stream.on('end', () =>
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString(),
        stderr: Buffer.concat(stderrChunks).toString(),
        truncated,
      })
    );
    stream.on('error', reject);

    docker.modem.demuxStream(stream, stdout, stderr);
  });
}

export async function executeInSandbox(
  code: string,
  languageName: string,
  dockerImage: string,
  timeoutMs = 5000,
  stdinInput?: string
): Promise<ExecutionResult> {
  const startTime = Date.now();

  let container: Docker.Container | null = null;

  try {
    const config = getLanguageConfig(languageName);

    await ensureImageExists(dockerImage);

    container = await docker.createContainer({
      Image: dockerImage,
      Cmd: ['sh', '-c', 'sleep 3600'],
      User: '65534:65534',
      HostConfig: {
        Memory: MEMORY_LIMIT_BYTES,
        MemorySwap: MEMORY_LIMIT_BYTES, // no swap headroom
        NanoCpus: CPU_LIMIT_NANOS,
        NetworkMode: 'none',
        PidsLimit: 64,
        CapDrop: ['ALL'],
        SecurityOpt: ['no-new-privileges'],
        AutoRemove: false,
      },
    });

    await container.start();

    // Write source and input as tar archives: no shell involved.
    await writeFileToContainer(container, config.fileName, code);
    if (stdinInput !== undefined) {
      await writeFileToContainer(container, 'input.txt', stdinInput);
    }

    if (config.compileCommand) {
      const compileExec = await container.exec({
        Cmd: [
          'sh',
          '-c',
          `timeout ${COMPILE_TIMEOUT_SECONDS}s ${config.compileCommand}`,
        ],
        AttachStdout: true,
        AttachStderr: true,
      });
      const compileStream = await compileExec.start({});
      const compileResult = await demuxStream(compileStream);
      const compileInspect = await compileExec.inspect();

      if (compileInspect.ExitCode !== 0) {
        return {
          stdout: compileResult.stdout,
          stderr: compileResult.stderr,
          exitCode: compileInspect.ExitCode ?? -1,
          duration: Date.now() - startTime,
          compilationFailed: true,
          outputTruncated: compileResult.truncated,
        };
      }
    }

    const timeoutSeconds = Math.ceil(timeoutMs / 1000);
    const redirect = stdinInput !== undefined ? '< /tmp/input.txt' : '';
    const runCmd =
      `timeout ${timeoutSeconds}s ${config.runCommand} ${redirect}`.trim();

    const runExec = await container.exec({
      Cmd: ['sh', '-c', runCmd],
      AttachStdout: true,
      AttachStderr: true,
    });

    const runStream = await runExec.start({});
    const result = await demuxStream(runStream);
    const runInspect = await runExec.inspect();

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: runInspect.ExitCode ?? -1,
      duration: Date.now() - startTime,
      outputTruncated: result.truncated,
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: -1,
      duration: Date.now() - startTime,
      systemError: true,
    };
  } finally {
    if (container) {
      try {
        await container.stop({ t: 0 });
      } catch {
        // already stopped
      }
      try {
        await container.remove({ force: true });
      } catch {
        // already removed
      }
    }
  }
}
