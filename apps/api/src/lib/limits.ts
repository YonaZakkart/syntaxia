// Keep in sync with services/worker/src/lib/limits.ts (enforcement point).
// Extracted to share one implementation between the detail endpoint and tests;
// unify both copies in a shared package during fix/general-stabilization.
export interface ExecutionLimits {
  timeLimitMs: number;
  memoryLimitMb: number;
  outputLimitBytes: number;
}

const GLOBAL_DEFAULT_LIMITS: ExecutionLimits = {
  timeLimitMs: 5000,
  memoryLimitMb: 256,
  outputLimitBytes: 1024 * 1024,
};

const TIME_LIMIT_RANGE = { min: 100, max: 60_000 };
const MEMORY_LIMIT_RANGE = { min: 32, max: 2048 };
const OUTPUT_LIMIT_RANGE = { min: 1024, max: 10 * 1024 * 1024 };

interface ChallengeOverrides {
  timeLimitMs: number | null;
  memoryLimitMb: number | null;
  outputLimitBytes: number | null;
}

interface LanguageDefaults {
  defaultTimeLimitMs: number;
  defaultMemoryLimitMb: number;
  defaultOutputLimitBytes: number;
}

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
  challenge: ChallengeOverrides,
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
