import { executeInSandbox } from '../src/lib/docker-sandbox';

if (process.env.ALLOW_ADVERSARIAL_SANDBOX !== '1') {
  console.error(
    'Refusing to run adversarial sandbox cases. Set ALLOW_ADVERSARIAL_SANDBOX=1 to continue.'
  );
  process.exit(1);
}

const PYTHON_IMAGE = 'python:3.11-slim';
const MEMORY_LIMIT_BYTES = 256 * 1024 * 1024;
const OUTPUT_LIMIT_BYTES = 1024 * 1024;

interface AdversarialCase {
  name: string;
  description: string;
  code: string;
  timeoutMs: number;
  expectedExitCode: number;
}

const cases: AdversarialCase[] = [
  {
    name: 'fork-bomb',
    description:
      'Hits PidsLimit; the container is removed and the host stays up.',
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
    code: 'import os\nos.setuid(0)',
    timeoutMs: 3000,
    expectedExitCode: 1,
  },
];

async function main() {
  let failures = 0;

  for (const testCase of cases) {
    const result = await executeInSandbox(
      testCase.code,
      'Python',
      PYTHON_IMAGE,
      {
        timeoutMs: testCase.timeoutMs,
        memoryLimitBytes: MEMORY_LIMIT_BYTES,
        outputLimitBytes: OUTPUT_LIMIT_BYTES,
      }
    );

    const ok = result.exitCode === testCase.expectedExitCode;
    if (!ok) failures += 1;

    console.log(
      JSON.stringify(
        {
          name: testCase.name,
          description: testCase.description,
          expectedExitCode: testCase.expectedExitCode,
          ok,
          exitCode: result.exitCode,
          duration: result.duration,
          stdout: result.stdout.slice(0, 200),
          stderr: result.stderr.slice(0, 200),
          systemError: result.systemError,
        },
        null,
        2
      )
    );
  }

  if (failures > 0) {
    console.error(
      `${failures} adversarial case(s) did not match the expectation`
    );
    process.exit(1);
  }
}

void main();
