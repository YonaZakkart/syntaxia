export type DifficultyMeta = {
  label: string;
  className: string;
};

const difficultyStyles: Record<string, DifficultyMeta> = {
  EASY: {
    label: 'Easy',
    className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
  },
  HARD: {
    label: 'Hard',
    className: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  },
};

const fallbackDifficulty: DifficultyMeta = {
  label: 'Unknown',
  className: 'border-white/10 bg-white/5 text-slate-300',
};

export function getDifficultyMeta(difficulty: string): DifficultyMeta {
  return difficultyStyles[difficulty] ?? fallbackDifficulty;
}
