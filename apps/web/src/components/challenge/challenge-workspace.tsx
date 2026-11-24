'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  ChallengeDetail,
  ChallengeSummary,
  ExecutionResponse,
  ExecutionRunResponse,
  ExecutionRunResult,
  ExecutionRunState,
} from '@/types/challenge';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Loader2,
  Play,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

const MonacoEditor = dynamic(
  async () => {
    const { default: Editor, loader } = await import('@monaco-editor/react');
    loader.config({ paths: { vs: '/monaco/vs' } });
    return Editor;
  },
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  }
);

const monacoLanguages: Record<string, string> = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python: 'python',
  'C++': 'cpp',
  Java: 'java',
  Go: 'go',
};

const runStatusLabels: Record<string, string> = {
  PASSED: 'Accepted',
  WRONG_ANSWER: 'Wrong answer',
  TIME_LIMIT_EXCEEDED: 'Time limit exceeded',
  MEMORY_LIMIT_EXCEEDED: 'Memory limit exceeded',
  RUNTIME_ERROR: 'Runtime error',
  COMPILATION_ERROR: 'Compilation error',
  SYSTEM_ERROR: 'System error',
};

function getMonacoLanguage(name: string) {
  return monacoLanguages[name] ?? 'plaintext';
}

function getRunStatusLabel(status: string) {
  return runStatusLabels[status] ?? status;
}

type RunStatus = 'idle' | 'running' | 'finished' | 'error';

export function ChallengeWorkspace({
  challenge,
  variants,
}: {
  challenge: ChallengeDetail;
  variants: ChallengeSummary[];
}) {
  const router = useRouter();
  const { authFetch } = useAuth();

  const [code, setCode] = useState(challenge.starterCode);
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [runState, setRunState] = useState<ExecutionRunState | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const runAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCode(challenge.starterCode);
  }, [challenge.starterCode]);

  useEffect(() => {
    return () => {
      runAbortRef.current?.abort();
    };
  }, []);

  const languageVariants = useMemo(() => {
    const unique = new Map<string, ChallengeSummary>();

    for (const variant of variants) {
      if (variant.title === challenge.title) {
        unique.set(variant.language.name, variant);
      }
    }

    if (!unique.has(challenge.language.name)) {
      unique.set(challenge.language.name, {
        id: challenge.id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        language: {
          id: challenge.language.id,
          name: challenge.language.name,
        },
      });
    }

    return [...unique.values()];
  }, [variants, challenge]);

  const canSwitchLanguage = languageVariants.length > 1;
  const isRunning = runStatus === 'running';

  async function pollRun(runId: string, signal: AbortSignal) {
    const deadline = Date.now() + 60_000;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (signal.aborted) throw new Error('Cancelled');

      const response = await authFetch(`/api/executions/${runId}`, { signal });
      const body = (await response
        .json()
        .catch(() => null)) as ExecutionRunResponse | null;

      if (!response.ok || !body?.success || !body.data) {
        throw new Error(body?.error ?? 'Unable to read the run');
      }

      if (body.data.status === 'FINISHED') {
        return body.data;
      }
    }

    throw new Error('The run took too long. Try again.');
  }

  async function handleRun() {
    if (!code.trim() || isRunning) return;

    setRunStatus('running');
    setRunError(null);
    setRunState(null);

    const controller = new AbortController();
    runAbortRef.current = controller;

    try {
      const response = await authFetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challenge.id,
          languageId: challenge.language.id,
          code,
        }),
        signal: controller.signal,
      });

      const body = (await response
        .json()
        .catch(() => null)) as ExecutionResponse | null;

      if (!response.ok || !body?.success || !body.data?.runId) {
        throw new Error(body?.error ?? 'Unable to start the run');
      }

      const finished = await pollRun(body.data.runId, controller.signal);
      if (controller.signal.aborted) return;

      setRunState(finished);
      setRunStatus('finished');
    } catch (error) {
      if (controller.signal.aborted) return;

      setRunError(
        error instanceof Error ? error.message : 'Unable to run the code'
      );
      setRunStatus('error');
    } finally {
      runAbortRef.current = null;
    }
  }

  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Code2 aria-hidden className="size-4" />
          Code
        </CardTitle>

        <div className="flex flex-wrap items-center gap-2">
          <label
            className="text-xs text-slate-500"
            htmlFor="workspace-language"
          >
            Language
          </label>
          {canSwitchLanguage ? (
            <select
              className="h-9 rounded-lg border border-white/10 bg-panel px-2 text-sm text-slate-200 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20"
              id="workspace-language"
              onChange={(event) => {
                if (event.target.value !== challenge.id) {
                  router.push(`/challenges/${event.target.value}`);
                }
              }}
              value={challenge.id}
            >
              {languageVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.language.name}
                </option>
              ))}
            </select>
          ) : (
            <Badge className="border-white/10 text-slate-300" variant="outline">
              {challenge.language.name}
            </Badge>
          )}

          <Button
            className="h-9"
            disabled={!code.trim() || isRunning}
            onClick={() => {
              void handleRun();
            }}
            size="sm"
          >
            {isRunning ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Play aria-hidden className="size-4" />
            )}
            {isRunning ? 'Running…' : 'Run Code'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-white/10">
          <MonacoEditor
            height="420px"
            language={getMonacoLanguage(challenge.language.name)}
            onChange={(value) => setCode(value ?? '')}
            options={{
              automaticLayout: true,
              fontSize: 14,
              minimap: { enabled: false },
              padding: { top: 12, bottom: 12 },
              scrollBeyondLastLine: false,
              tabSize: 2,
            }}
            theme="vs-dark"
            value={code}
          />
        </div>

        <p className="text-xs text-slate-500">
          Run Code uses the public tests only. {challenge.language.name}{' '}
          {challenge.language.version}.
        </p>

        {runStatus === 'error' ? (
          <div
            className="flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-sm text-rose-200"
            role="alert"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{runError ?? 'Unable to run the code'}</span>
          </div>
        ) : null}

        {runStatus === 'finished' && runState?.result ? (
          <RunResultPanel result={runState.result} />
        ) : null}

        {runStatus === 'finished' && !runState?.result ? (
          <p className="text-sm text-rose-300">
            The run finished without a result.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RunResultPanel({ result }: { result: ExecutionRunResult }) {
  const passed = result.finalStatus === 'PASSED';

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        passed
          ? 'border-emerald-400/20 bg-emerald-400/5'
          : 'border-rose-400/20 bg-rose-400/5'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            'flex items-center gap-2 text-sm font-medium',
            passed ? 'text-emerald-300' : 'text-rose-300'
          )}
        >
          {passed ? (
            <CheckCircle2 aria-hidden className="size-4" />
          ) : (
            <XCircle aria-hidden className="size-4" />
          )}
          {getRunStatusLabel(result.finalStatus)}
        </p>
        <p className="font-mono text-xs text-slate-400">
          {result.testsPassed}/{result.testsTotal} tests ·{' '}
          {result.totalDurationMs} ms
        </p>
      </div>

      {result.errorMessage ? (
        <p className="mt-2 text-xs text-rose-200">{result.errorMessage}</p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {result.testResults.map((test, index) => (
          <li
            className="rounded-lg border border-white/5 bg-[#050b1a] p-3"
            key={test.testCaseId}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span
                className={test.passed ? 'text-emerald-300' : 'text-rose-300'}
              >
                {test.passed ? 'Passed' : 'Failed'} · Case {index + 1}
              </span>
              <span className="font-mono text-slate-500">
                {test.duration} ms
              </span>
            </div>

            {!test.passed ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] text-slate-500">Expected</p>
                  <pre className="mt-1 overflow-x-auto font-mono text-xs leading-5 text-slate-300">
                    {test.expectedOutput}
                  </pre>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Actual</p>
                  <pre className="mt-1 overflow-x-auto font-mono text-xs leading-5 text-rose-200">
                    {test.actualOutput || test.error || '(empty)'}
                  </pre>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div
      aria-hidden
      className="h-[420px] animate-pulse rounded-xl bg-white/[0.03]"
    />
  );
}
