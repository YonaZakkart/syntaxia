import { cn } from '@/lib/utils';

export type TestResultView = {
  id: string;
  passed: boolean;
  duration?: number;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  hidden?: boolean;
};

type DiffLine = {
  type: 'same' | 'added' | 'removed';
  text: string;
};

export function TestResultsList({ results }: { results: TestResultView[] }) {
  return (
    <ul className="space-y-2">
      {results.map((test, index) => (
        <li
          className="rounded-lg border border-white/5 bg-[#050b1a] p-3"
          key={test.id}
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span
              className={cn(
                'flex items-center gap-2',
                test.passed ? 'text-emerald-300' : 'text-rose-300'
              )}
            >
              {test.passed ? 'Passed' : 'Failed'} · Case {index + 1}
            </span>
            <span className="font-mono text-slate-500">
              {test.duration == null ? '—' : `${test.duration} ms`}
            </span>
          </div>

          {test.hidden ? (
            <p className="mt-2 text-xs text-slate-500">
              Hidden test — input and output are not shown.
            </p>
          ) : null}

          {!test.hidden && !test.passed ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-slate-400 outline-none hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-brand/40">
                Show input, expected, actual and diff
              </summary>

              <div className="mt-2 space-y-2">
                {test.input === undefined ? null : (
                  <div>
                    <p className="text-[11px] text-slate-500">Input</p>
                    <pre className="mt-1 overflow-x-auto font-mono text-xs leading-5 text-slate-300">
                      {test.input || '(empty)'}
                    </pre>
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] text-slate-500">Expected</p>
                    <pre className="mt-1 overflow-x-auto font-mono text-xs leading-5 text-slate-300">
                      {test.expectedOutput ?? '(empty)'}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Actual</p>
                    <pre className="mt-1 overflow-x-auto font-mono text-xs leading-5 text-rose-200">
                      {test.actualOutput || test.error || '(empty)'}
                    </pre>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500">Diff</p>
                  <LineDiff
                    actual={test.actualOutput || test.error || ''}
                    expected={test.expectedOutput ?? ''}
                  />
                </div>
              </div>
            </details>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function diffLines(expected: string, actual: string): DiffLine[] {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const table = Array.from({ length: expectedLines.length + 1 }, () =>
    new Array<number>(actualLines.length + 1).fill(0)
  );

  for (let i = expectedLines.length - 1; i >= 0; i -= 1) {
    for (let j = actualLines.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        expectedLines[i] === actualLines[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < expectedLines.length && j < actualLines.length) {
    if (expectedLines[i] === actualLines[j]) {
      lines.push({ type: 'same', text: expectedLines[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push({ type: 'removed', text: expectedLines[i] });
      i += 1;
    } else {
      lines.push({ type: 'added', text: actualLines[j] });
      j += 1;
    }
  }

  while (i < expectedLines.length) {
    lines.push({ type: 'removed', text: expectedLines[i] });
    i += 1;
  }

  while (j < actualLines.length) {
    lines.push({ type: 'added', text: actualLines[j] });
    j += 1;
  }

  return lines;
}

function LineDiff({
  expected,
  actual,
}: {
  expected: string;
  actual: string;
}) {
  const lines = diffLines(expected, actual);

  return (
    <section
      aria-label="Diff between expected and actual output"
      className="mt-1 max-h-56 overflow-auto rounded-lg border border-white/5 bg-[#02060f] p-2 font-mono text-xs leading-5"
    >
      {lines.map((line, index) => (
        <span
          className={cn(
            'block whitespace-pre-wrap',
            line.type === 'same' && 'text-slate-400',
            line.type === 'added' && 'bg-emerald-400/10 text-emerald-200',
            line.type === 'removed' && 'bg-rose-400/10 text-rose-200'
          )}
          key={`${index}-${line.type}`}
        >
          {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
          {line.text || ' '}
        </span>
      ))}
    </section>
  );
}
