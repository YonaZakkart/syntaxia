'use client';

import { useAuth } from '@/components/auth/auth-provider';
import type { ChallengeSummary, ChallengesResponse } from '@/types/challenge';
import { useCallback, useEffect, useState } from 'react';

export type ChallengesStatus = 'loading' | 'ready' | 'error';

export function useChallenges() {
  const { authFetch } = useAuth();
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [status, setStatus] = useState<ChallengesStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const response = await authFetch('/api/challenges');
      const body = (await response
        .json()
        .catch(() => null)) as ChallengesResponse | null;

      if (!response.ok || !body?.success || !Array.isArray(body.data)) {
        throw new Error(body?.error ?? 'Unable to load challenges');
      }

      setChallenges(body.data);
      setStatus('ready');
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load challenges'
      );
      setStatus('error');
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  return { challenges, status, error, reload: load };
}
