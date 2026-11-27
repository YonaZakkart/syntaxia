export type SubmissionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'PASSED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR'
  | 'SYSTEM_ERROR';

export const finalSubmissionStatuses: SubmissionStatus[] = [
  'PASSED',
  'WRONG_ANSWER',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'RUNTIME_ERROR',
  'COMPILATION_ERROR',
  'SYSTEM_ERROR',
];

export function isFinalSubmissionStatus(status: string): boolean {
  return finalSubmissionStatuses.includes(status as SubmissionStatus);
}

export type SubmissionChallenge = {
  id: string;
  title: string;
  difficulty: string;
};

export type SubmissionLanguage = {
  id: string;
  name: string;
};

export type SubmissionSummary = {
  id: string;
  status: SubmissionStatus;
  createdAt: string;
  challenge: SubmissionChallenge;
  language: SubmissionLanguage;
  execution: {
    testsPassed: number;
    testsTotal: number;
    totalDurationMs: number;
  } | null;
};

export type SubmissionTestResult = {
  testCaseId?: string;
  passed?: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  duration?: number;
  hidden?: boolean;
};

export type SubmissionExecution = {
  id: string;
  testsPassed: number;
  testsTotal: number;
  totalDurationMs: number;
  testResults: SubmissionTestResult[];
  failedTestCaseId: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type SubmissionDetail = {
  id: string;
  status: SubmissionStatus;
  code: string;
  createdAt: string;
  challenge: SubmissionChallenge;
  language: SubmissionLanguage;
  execution: SubmissionExecution | null;
};

export type SubmissionsResponse = {
  success: boolean;
  data?: {
    items: SubmissionSummary[];
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
};

export type SubmissionDetailResponse = {
  success: boolean;
  data?: SubmissionDetail;
  error?: string;
};
