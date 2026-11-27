'use client';

import { useAuth } from '@/components/auth/auth-provider';
import type {
  SubmissionSummary,
  SubmissionsResponse,
} from '@/types/submission';
import { useCallback, useEffect, useState } from 'react';

export const SUBMISSIONS_PAGE_SIZE = 10;

export type SubmissionsStatus = 'loading' | 'ready' | 'error';

export type SubmissionFilters = {
  status?: string;
  challengeId?: string;
};

export function useSubmissions(
  filters: SubmissionFilters = {},
  pageSize = SUBMISSIONS_PAGE_SIZE
) {
  const { authFetch } = useAuth();
  const { status: statusFilter, challengeId } = filters;
  const [items, setItems] = useState<SubmissionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<SubmissionsStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      });

      if (statusFilter) params.set('status', statusFilter);
      if (challengeId) params.set('challengeId', challengeId);

      const response = await authFetch(`/api/submissions?${params}`);
      const body = (await response
        .json()
        .catch(() => null)) as SubmissionsResponse | null;

      if (!response.ok || !body?.success || !body.data) {
        throw new Error(body?.error ?? 'Unable to load submissions');
      }

      setItems(body.data.items);
      setTotal(body.data.total);
      setStatus('ready');
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load submissions'
      );
      setStatus('error');
    }
  }, [authFetch, page, pageSize, statusFilter, challengeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    pageCount,
    status,
    error,
    setPage,
    reload: load,
  };
}
