import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  type ExecutionRunState,
  RUN_STATE_KEY_PREFIX,
  RUN_STATE_TTL_SECONDS,
  type RunStateStore,
  deleteRunState,
  readRunState,
  saveRunState,
} from './runStore';

class MemoryStore implements RunStateStore {
  values = new Map<string, string>();
  lastSet?: { key: string; mode: string; ttlSeconds: number };

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(
    key: string,
    value: string,
    mode: 'EX',
    ttlSeconds: number
  ): Promise<unknown> {
    this.values.set(key, value);
    this.lastSet = { key, mode, ttlSeconds };
    return 'OK';
  }

  async del(key: string): Promise<unknown> {
    this.values.delete(key);
    return 1;
  }
}

const state: ExecutionRunState = {
  runId: '3da7ec1a-369e-4506-89e2-391f4deb7a29',
  userId: 'user-1',
  challengeId: 'challenge-1',
  languageId: 'language-1',
  status: 'FINISHED',
  createdAt: '2026-11-16T00:00:00.000Z',
  result: {
    finalStatus: 'PASSED',
    testsPassed: 1,
    testsTotal: 1,
    totalDurationMs: 42,
    testResults: [
      {
        testCaseId: 'tc-1',
        passed: true,
        expectedOutput: 'ok',
        actualOutput: 'ok',
        duration: 10,
      },
    ],
  },
};

describe('run state store', () => {
  it('writes the run under the prefixed key with the configured TTL', async () => {
    const store = new MemoryStore();

    await saveRunState(store, state);

    assert.equal(store.lastSet?.key, `${RUN_STATE_KEY_PREFIX}${state.runId}`);
    assert.equal(store.lastSet?.mode, 'EX');
    assert.equal(store.lastSet?.ttlSeconds, RUN_STATE_TTL_SECONDS);
  });

  it('reads a saved run back', async () => {
    const store = new MemoryStore();
    await saveRunState(store, state);

    assert.deepEqual(await readRunState(store, state.runId), state);
  });

  it('returns null for a missing run', async () => {
    const store = new MemoryStore();

    assert.equal(await readRunState(store, 'missing-run'), null);
  });

  it('returns null for an invalid payload instead of throwing', async () => {
    const store = new MemoryStore();
    store.values.set(`${RUN_STATE_KEY_PREFIX}broken`, '{not json');

    const originalError = console.error;
    console.error = () => undefined;
    try {
      assert.equal(await readRunState(store, 'broken'), null);
    } finally {
      console.error = originalError;
    }
  });

  it('deletes a run', async () => {
    const store = new MemoryStore();
    await saveRunState(store, state);

    await deleteRunState(store, state.runId);

    assert.equal(await readRunState(store, state.runId), null);
  });
});
