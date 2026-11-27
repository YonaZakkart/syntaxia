export type SubmissionStatusMeta = {
  label: string;
  className: string;
};

const statusStyles: Record<string, SubmissionStatusMeta> = {
  QUEUED: {
    label: 'Queued',
    className: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  },
  RUNNING: {
    label: 'Running',
    className: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  },
  PASSED: {
    label: 'Accepted',
    className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  },
  WRONG_ANSWER: {
    label: 'Wrong answer',
    className: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  },
  TIME_LIMIT_EXCEEDED: {
    label: 'Time limit exceeded',
    className: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
  },
  MEMORY_LIMIT_EXCEEDED: {
    label: 'Memory limit exceeded',
    className: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
  },
  RUNTIME_ERROR: {
    label: 'Runtime error',
    className: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  },
  COMPILATION_ERROR: {
    label: 'Compilation error',
    className: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  },
  SYSTEM_ERROR: {
    label: 'System error',
    className: 'border-white/10 bg-white/5 text-slate-300',
  },
};

const fallbackStatus: SubmissionStatusMeta = {
  label: 'Unknown',
  className: 'border-white/10 bg-white/5 text-slate-300',
};

export function getSubmissionStatusMeta(status: string): SubmissionStatusMeta {
  return statusStyles[status] ?? fallbackStatus;
}
