import type { Challenge, Language } from '@syntaxia/db';

export interface ExecutionLimits {
  timeLimitMs: number;
  memoryLimitMb: number;
  outputLimitBytes: number;
}

export const GLOBAL_DEFAULT_LIMITS: ExecutionLimits = {
  timeLimitMs: 5000,
  memoryLimitMb: 256,
  outputLimitBytes: 1024 * 1024,
};

// Guard rails: values outside these ranges are clamped so a bad row in
// the database cannot disable the sandbox limits.
const TIME_LIMIT_RANGE = { min: 100, max: 60_000 };
const MEMORY_LIMIT_RANGE = { min: 32, max: 2048 };
const OUTPUT_LIMIT_RANGE = { min: 1024, max: 10 * 1024 * 1024 };

type LimitOverrides = Pick<
  Challenge,
  'timeLimitMs' | 'memoryLimitMb' | 'outputLimitBytes'
>;

type LanguageDefaults = Pick<
  Language,
  'defaultTimeLimitMs' | 'defaultMemoryLimitMb' | 'defaultOutputLimitBytes'
>;

function pick(
  override: number | null | undefined,
  languageDefault: number | null | undefined,
  globalDefault: number,
  range: { min: number; max: number }
): number {
  const candidate =
    override && override > 0
      ? override
      : languageDefault && languageDefault > 0
        ? languageDefault
        : globalDefault;

  return Math.min(Math.max(candidate, range.min), range.max);
}

/**
 * Resolve the limits for one execution:
 * challenge override > language default > global default.
 */
export function resolveExecutionLimits(
  challenge: LimitOverrides,
  language: LanguageDefaults
): ExecutionLimits {
  return {
    timeLimitMs: pick(
      challenge.timeLimitMs,
      language.defaultTimeLimitMs,
      GLOBAL_DEFAULT_LIMITS.timeLimitMs,
      TIME_LIMIT_RANGE
    ),
    memoryLimitMb: pick(
      challenge.memoryLimitMb,
      language.defaultMemoryLimitMb,
      GLOBAL_DEFAULT_LIMITS.memoryLimitMb,
      MEMORY_LIMIT_RANGE
    ),
    outputLimitBytes: pick(
      challenge.outputLimitBytes,
      language.defaultOutputLimitBytes,
      GLOBAL_DEFAULT_LIMITS.outputLimitBytes,
      OUTPUT_LIMIT_RANGE
    ),
  };
}
