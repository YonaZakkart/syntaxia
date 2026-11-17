import type { TestResult, TestRunnerStatus } from './test-runner';

/**
 * Ephemeral state for "Run Code" executions.
 *
 * Runs are intentionally NOT persisted in PostgreSQL: the worker writes the
 * progress and final result to Redis with a short TTL. Keep this contract in
 * sync with apps/api/src/lib/runStore.ts (the reader).
 */
export const RUN_STATE_KEY_PREFIX = 'execution:run:';
export const RUN_STATE_TTL_SECONDS = 5 * 60;

export type ExecutionRunStatus = 'QUEUED' | 'RUNNING' | 'FINISHED';

export interface ExecutionRunResult {
  finalStatus: TestRunnerStatus;
  testsPassed: number;
  testsTotal: number;
  totalDurationMs: number;
  testResults: TestResult[];
  failedTestCaseId: string | null;
  errorMessage: string | null;
}

export interface ExecutionRunState {
  runId: string;
  userId: string;
  challengeId: string;
  languageId: string;
  status: ExecutionRunStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  result?: ExecutionRunResult;
}

export interface RunStateStore {
  set(
    key: string,
    value: string,
    mode: 'EX',
    ttlSeconds: number
  ): Promise<unknown>;
}

export function runStateKey(runId: string): string {
  return `${RUN_STATE_KEY_PREFIX}${runId}`;
}

export async function saveRunState(
  store: RunStateStore,
  state: ExecutionRunState
): Promise<void> {
  await store.set(
    runStateKey(state.runId),
    JSON.stringify(state),
    'EX',
    RUN_STATE_TTL_SECONDS
  );
}
