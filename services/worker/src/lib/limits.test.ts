import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GLOBAL_DEFAULT_LIMITS, resolveExecutionLimits } from './limits';

const languageDefaults = {
  defaultTimeLimitMs: 8000,
  defaultMemoryLimitMb: 512,
  defaultOutputLimitBytes: 2 * 1024 * 1024,
};

const noOverrides = {
  timeLimitMs: null,
  memoryLimitMb: null,
  outputLimitBytes: null,
};

describe('resolveExecutionLimits', () => {
  it('uses language defaults when the challenge has no overrides', () => {
    const limits = resolveExecutionLimits(noOverrides, languageDefaults);

    assert.deepEqual(limits, {
      timeLimitMs: 8000,
      memoryLimitMb: 512,
      outputLimitBytes: 2 * 1024 * 1024,
    });
  });

  it('lets challenge overrides win over language defaults', () => {
    const limits = resolveExecutionLimits(
      { timeLimitMs: 15000, memoryLimitMb: 1024, outputLimitBytes: 4096 },
      languageDefaults
    );

    assert.deepEqual(limits, {
      timeLimitMs: 15000,
      memoryLimitMb: 1024,
      outputLimitBytes: 4096,
    });
  });

  it('falls back to global defaults when values are missing or zero', () => {
    const limits = resolveExecutionLimits(
      { timeLimitMs: 0, memoryLimitMb: 0, outputLimitBytes: 0 },
      {
        defaultTimeLimitMs: 0,
        defaultMemoryLimitMb: 0,
        defaultOutputLimitBytes: 0,
      }
    );

    assert.deepEqual(limits, GLOBAL_DEFAULT_LIMITS);
  });

  it('clamps values to safe ranges', () => {
    const limits = resolveExecutionLimits(
      {
        timeLimitMs: 1_000_000,
        memoryLimitMb: 1,
        outputLimitBytes: 1,
      },
      languageDefaults
    );

    assert.equal(limits.timeLimitMs, 60_000);
    assert.equal(limits.memoryLimitMb, 32);
    assert.equal(limits.outputLimitBytes, 1024);
  });
});
