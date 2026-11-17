/**
 * Ephemeral state for "Run Code" executions.
 *
 * Runs are intentionally NOT persisted in PostgreSQL: they live only in Redis
 * with a short TTL so the client can poll for the result. Keep this contract in
 * sync with services/worker/src/lib/run-store.ts (the writer).
 */
export const RUN_STATE_KEY_PREFIX = 'execution:run:';
export const RUN_STATE_TTL_SECONDS = 5 * 60;

export type ExecutionRunStatus = 'QUEUED' | 'RUNNING' | 'FINISHED';

export type ExecutionRunFinalStatus =
  | 'PASSED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR'
  | 'SYSTEM_ERROR';

export interface ExecutionRunTestResult {
  testCaseId: string;
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
  error?: string;
  duration: number;
}

export interface ExecutionRunResult {
  finalStatus: ExecutionRunFinalStatus;
  testsPassed: number;
  testsTotal: number;
  totalDurationMs: number;
  testResults: ExecutionRunTestResult[];
  failedTestCaseId?: string;
  errorMessage?: string;
}

export interface ExecutionRunState {
  runId: string;
  /** Owner of the run. Required to authorize GET /:runId. */
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
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    ttlSeconds: number
  ): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export function runStateKey(runId: string): string {
  return `${RUN_STATE_KEY_PREFIX}${runId}`;
}

export async function readRunState(
  store: RunStateStore,
  runId: string
): Promise<ExecutionRunState | null> {
  const raw = await store.get(runStateKey(runId));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ExecutionRunState;
  } catch {
    console.error(`Invalid run state payload for run ${runId}`);
    return null;
  }
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

export async function deleteRunState(
  store: RunStateStore,
  runId: string
): Promise<void> {
  await store.del(runStateKey(runId));
}
