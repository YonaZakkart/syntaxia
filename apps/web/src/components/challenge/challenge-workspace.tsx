'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChallengeDetail, ChallengeSummary } from '@/types/challenge';
import { Code2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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

function getMonacoLanguage(name: string) {
  return monacoLanguages[name] ?? 'plaintext';
}

export function ChallengeWorkspace({
  challenge,
  variants,
}: {
  challenge: ChallengeDetail;
  variants: ChallengeSummary[];
}) {
  const router = useRouter();
  const [code, setCode] = useState(challenge.starterCode);

  useEffect(() => {
    setCode(challenge.starterCode);
  }, [challenge.starterCode]);

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

  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Code2 aria-hidden className="size-4" />
          Code
        </CardTitle>

        <div className="flex items-center gap-2">
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
          {challenge.language.name} {challenge.language.version} · Monaco
        </p>
      </CardContent>
    </Card>
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
