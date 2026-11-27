import { randomUUID } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import Docker from 'dockerode';
import { executeInSandbox } from '../src/lib/docker-sandbox';

if (process.env.ALLOW_ADVERSARIAL_SANDBOX !== '1') {
  console.error(
    'Refusing to run adversarial sandbox cases. Set ALLOW_ADVERSARIAL_SANDBOX=1 to continue.'
  );
  process.exit(1);
}

const PYTHON_IMAGE = 'python:3.11-slim';
const CPP_IMAGE = process.env.CPP_IMAGE ?? 'gcc:11';
const MEMORY_LIMIT_BYTES = 256 * 1024 * 1024;
const OUTPUT_LIMIT_BYTES = 1024 * 1024;

interface AdversarialCase {
  name: string;
  description: string;
  language: 'Python' | 'C++';
  dockerImage: string;
  code: string;
  timeoutMs: number;
  expectedExitCode?: number;
  expectedCompilationFailed?: boolean;
  minDurationMs?: number;
}

const hostMarker = `/tmp/syntaxia-host-marker-${randomUUID()}`;
writeFileSync(hostMarker, 'HOST-ONLY');

const compileBomb = [
  ...Array.from({ length: 5 }, () => 'asm(".rept 2500000\\n nop\\n .endr");'),
  'int main(int argc, char** argv) {',
  '  int x = argc;',
  '  switch (x) {',
  ...Array.from(
    { length: 100_000 },
    (_, i) => `    case ${i}: return ${i % 7};`
  ),
  '    default: return -1;',
  '  }',
  '}',
].join('\n');

const cases: AdversarialCase[] = [
  {
    name: 'fork-bomb',
    description:
      'Hits PidsLimit; the container is removed and the host stays up.',
    language: 'Python',
    dockerImage: PYTHON_IMAGE,
    code: [
      'import os, time',
      'while True:',
      '    try:',
      '        pid = os.fork()',
      '        if pid == 0:',
      '            time.sleep(60)',
      '            os._exit(0)',
      '    except OSError:',
      '        pass',
    ].join('\n'),
    timeoutMs: 2000,
    expectedExitCode: 124,
  },
  {
    name: 'memory-exhaustion',
    description:
      'Allocates past the cgroup limit; the kernel OOM-kills the process.',
    language: 'Python',
    dockerImage: PYTHON_IMAGE,
    code: [
      'chunks = []',
      'while True:',
      '    chunks.append(bytearray(10 * 1024 * 1024))',
    ].join('\n'),
    timeoutMs: 5000,
    expectedExitCode: 137,
  },
  {
    name: 'privilege-escalation',
    description:
      'setuid(0) must fail for uid 65534 with all capabilities dropped.',
    language: 'Python',
    dockerImage: PYTHON_IMAGE,
    code: 'import os\nos.setuid(0)',
    timeoutMs: 3000,
    expectedExitCode: 1,
  },
  {
    name: 'malicious-compile',
    description: 'A host-only include must not resolve inside the container.',
    language: 'C++',
    dockerImage: CPP_IMAGE,
    code: `#include "${hostMarker}"\nint main() { return 0; }`,
    timeoutMs: 3000,
    expectedCompilationFailed: true,
  },
  {
    name: 'valid-compile',
    description: 'A normal C++ source compiles and runs with the same image.',
    language: 'C++',
    dockerImage: CPP_IMAGE,
    code: 'int main() { return 0; }',
    timeoutMs: 3000,
    expectedExitCode: 0,
  },
  {
    name: 'compile-timeout',
    description:
      'A valid but expensive compile is cut at the 10 s compile timeout.',
    language: 'C++',
    dockerImage: CPP_IMAGE,
    code: compileBomb,
    timeoutMs: 3000,
    expectedCompilationFailed: true,
    minDurationMs: 10_000,
  },
];

const docker = new Docker();

async function imageAvailable(image: string): Promise<boolean> {
  try {
    await docker.getImage(image).inspect();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let failures = 0;

  try {
    const cppAvailable = await imageAvailable(CPP_IMAGE);
    if (!cppAvailable) {
      console.warn(
        `[skip] C++ cases: image ${CPP_IMAGE} is not available locally. Set CPP_IMAGE to a g++ image.`
      );
    }

    for (const testCase of cases) {
      if (testCase.language === 'C++' && !cppAvailable) {
        continue;
      }

      const result = await executeInSandbox(
        testCase.code,
        testCase.language,
        testCase.dockerImage,
        {
          timeoutMs: testCase.timeoutMs,
          memoryLimitBytes: MEMORY_LIMIT_BYTES,
          outputLimitBytes: OUTPUT_LIMIT_BYTES,
        }
      );

      const exitOk =
        testCase.expectedExitCode === undefined ||
        result.exitCode === testCase.expectedExitCode;
      const compileOk =
        testCase.expectedCompilationFailed === undefined ||
        result.compilationFailed === testCase.expectedCompilationFailed;
      const durationOk =
        testCase.minDurationMs === undefined ||
        result.duration >= testCase.minDurationMs;
      const ok = exitOk && compileOk && durationOk;
      if (!ok) failures += 1;

      console.log(
        JSON.stringify(
          {
            name: testCase.name,
            description: testCase.description,
            ok,
            exitCode: result.exitCode,
            duration: result.duration,
            compilationFailed: result.compilationFailed,
            stdout: result.stdout.slice(0, 200),
            stderr: result.stderr.slice(0, 200),
            systemError: result.systemError,
          },
          null,
          2
        )
      );
    }
  } finally {
    unlinkSync(hostMarker);
  }

  if (failures > 0) {
    console.error(
      `${failures} adversarial case(s) did not match the expectation`
    );
    process.exit(1);
  }
}

void main();
