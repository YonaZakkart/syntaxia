import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveExecutionLimits } from './limits';

const language = {
  defaultTimeLimitMs: 5000,
  defaultMemoryLimitMb: 256,
  defaultOutputLimitBytes: 1024 * 1024,
};

describe('resolveExecutionLimits', () => {
  it('uses language defaults when the challenge has no overrides', () => {
    const limits = resolveExecutionLimits(
      { timeLimitMs: null, memoryLimitMb: null, outputLimitBytes: null },
      language
    );

    assert.deepEqual(limits, {
      timeLimitMs: 5000,
      memoryLimitMb: 256,
      outputLimitBytes: 1024 * 1024,
    });
  });

  it('lets challenge overrides win over language defaults', () => {
    const limits = resolveExecutionLimits(
      { timeLimitMs: 8000, memoryLimitMb: 512, outputLimitBytes: 2048 },
      language
    );

    assert.deepEqual(limits, {
      timeLimitMs: 8000,
      memoryLimitMb: 512,
      outputLimitBytes: 2048,
    });
  });

  it('clamps values to safe ranges', () => {
    const limits = resolveExecutionLimits(
      { timeLimitMs: 999_999, memoryLimitMb: 1, outputLimitBytes: 1 },
      language
    );

    assert.equal(limits.timeLimitMs, 60_000);
    assert.equal(limits.memoryLimitMb, 32);
    assert.equal(limits.outputLimitBytes, 1024);
  });
});
