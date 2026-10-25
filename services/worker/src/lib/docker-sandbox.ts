import Docker from 'dockerode';
import tar from 'tar-stream';

const docker = new Docker();

const EXECUTION_TIMEOUT_MS = 5000;
const MEMORY_LIMIT_BYTES = 256 * 1024 * 1024; // 256MB
const CPU_LIMIT_NANOS = 1 * 1_000_000_000; // 1 CPU

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

interface LanguageConfig {
  dockerImage: string;
  fileName: string;
  runCommand: string;
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  JavaScript: {
    dockerImage: 'node:18-alpine',
    fileName: 'solution.js',
    runCommand: 'node',
  },
  Python: {
    dockerImage: 'python:3.11-alpine',
    fileName: 'solution.py',
    runCommand: 'python',
  },
};

function getLanguageConfig(languageName: string): LanguageConfig {
  const config = LANGUAGE_CONFIGS[languageName];
  if (!config) {
    throw new Error(`Language not supported yet: ${languageName}`);
  }
  return config;
}

function buildTarBuffer(fileName: string, code: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pack = tar.pack();
    pack.entry({ name: fileName }, code);
    pack.finalize();

    const chunks: Buffer[] = [];
    pack.on('data', (chunk: Buffer) => chunks.push(chunk));
    pack.on('end', () => resolve(Buffer.concat(chunks)));
    pack.on('error', reject);
  });
}

function demuxStream(stream: NodeJS.ReadableStream): {
  stdout: string;
  stderr: string;
} {
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  return new Promise<any>((resolve) => {
    stream.on('data', (chunk: Buffer) => {
      if (chunk.length < 8) {
        stdoutChunks.push(chunk);
        return;
      }
      const streamType = chunk[0];
      const payload = chunk.subarray(8);
      if (streamType === 2) {
        stderrChunks.push(payload);
      } else {
        stdoutChunks.push(payload);
      }
    });
    stream.on('end', () => {
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat(stderrChunks).toString('utf-8'),
      });
    });
  }) as any;
}

async function ensureImageExists(imageName: string): Promise<void> {
  try {
    await docker.getImage(imageName).inspect();
    console.log(`✅ Imagen ${imageName} ya existe localmente`);
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log(`📥 Descargando imagen ${imageName}...`);
      const stream = await docker.pull(imageName);
      await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err: Error | null) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });
      console.log(`✅ Imagen ${imageName} descargada`);
    } else {
      throw error;
    }
  }
}

export async function executeInSandbox(
  code: string,
  languageName: string
): Promise<SandboxResult> {
  const config = getLanguageConfig(languageName);
  await ensureImageExists(config.dockerImage);
  let container: Docker.Container | null = null;

  try {
    container = await docker.createContainer({
      Image: config.dockerImage,
      Cmd: ['sh', '-c', 'sleep 30'],
      HostConfig: {
        Memory: MEMORY_LIMIT_BYTES,
        MemorySwap: MEMORY_LIMIT_BYTES,
        NanoCpus: CPU_LIMIT_NANOS,
        NetworkMode: 'none',
        AutoRemove: false,
        PidsLimit: 64,
      },
    });

    await container.start();

    const tarBuffer = await buildTarBuffer(config.fileName, code);
    await container.putArchive(tarBuffer, { path: '/tmp' });

    const exec = await container.exec({
      Cmd: [config.runCommand, `/tmp/${config.fileName}`],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    let timedOut = false;
    const timeoutPromise = new Promise<{ stdout: string; stderr: string }>(
      (resolve) => {
        setTimeout(() => {
          timedOut = true;
          resolve({ stdout: '', stderr: 'Execution timed out' });
        }, EXECUTION_TIMEOUT_MS);
      }
    );

    const streamPromise = demuxStream(stream as any);

    const { stdout, stderr } = await Promise.race([
      streamPromise,
      timeoutPromise,
    ]);

    const inspect = await exec.inspect();
    const exitCode = inspect.ExitCode ?? -1;

    return { stdout, stderr, exitCode, timedOut };
  } finally {
    if (container) {
      try {
        await container.stop({ t: 0 });
      } catch {
        // Puede que ya esté detenido
      }
      try {
        await container.remove({ force: true });
      } catch {
        // Puede que ya esté eliminado
      }
    }
  }
}
