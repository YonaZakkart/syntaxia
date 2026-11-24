'use client';

import { useAuth } from '@/components/auth/auth-provider';
import type {
  ChallengeDetail,
  ChallengeDetailResponse,
} from '@/types/challenge';
import { useCallback, useEffect, useState } from 'react';

export type ChallengeStatus = 'loading' | 'ready' | 'error' | 'not-found';

export function useChallenge(id: string) {
  const { authFetch } = useAuth();
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [status, setStatus] = useState<ChallengeStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const response = await authFetch(
        `/api/challenges/${encodeURIComponent(id)}`
      );
      const body = (await response
        .json()
        .catch(() => null)) as ChallengeDetailResponse | null;

      if (response.status === 404 || response.status === 400) {
        setChallenge(null);
        setStatus('not-found');
        return;
      }

      if (!response.ok || !body?.success || !body.data) {
        throw new Error(body?.error ?? 'Unable to load the challenge');
      }

      setChallenge(body.data);
      setStatus('ready');
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load the challenge'
      );
      setStatus('error');
    }
  }, [authFetch, id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { challenge, status, error, reload: load };
}
