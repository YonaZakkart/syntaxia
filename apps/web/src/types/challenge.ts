export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type ChallengeSummary = {
  id: string;
  title: string;
  difficulty: string;
  language: {
    id: string;
    name: string;
  };
};

export type ExecutionLimits = {
  timeLimitMs: number;
  memoryLimitMb: number;
  outputLimitBytes: number;
};

export type ChallengeTestCase = {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
};

export type ChallengeDetail = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  starterCode: string;
  language: {
    id: string;
    name: string;
    version: string;
    dockerImage: string;
  };
  limits: ExecutionLimits;
  testCases: ChallengeTestCase[];
};

export type ChallengesResponse = {
  success: boolean;
  data?: ChallengeSummary[];
  error?: string;
};

export type ChallengeDetailResponse = {
  success: boolean;
  data?: ChallengeDetail;
  error?: string;
};

export type ExecutionRunStatus = 'QUEUED' | 'RUNNING' | 'FINISHED';

export type ExecutionRunFinalStatus =
  | 'PASSED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR'
  | 'SYSTEM_ERROR';

export type ExecutionRunTestResult = {
  testCaseId: string;
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
  error?: string;
  duration: number;
};

export type ExecutionRunResult = {
  finalStatus: ExecutionRunFinalStatus;
  testsPassed: number;
  testsTotal: number;
  totalDurationMs: number;
  testResults: ExecutionRunTestResult[];
  failedTestCaseId?: string;
  errorMessage?: string;
};

export type ExecutionRunState = {
  runId: string;
  status: ExecutionRunStatus;
  result?: ExecutionRunResult;
};

export type ExecutionResponse = {
  success: boolean;
  data?: {
    runId: string;
    status: ExecutionRunStatus;
    expiresInSeconds: number;
  };
  error?: string;
};

export type ExecutionRunResponse = {
  success: boolean;
  data?: ExecutionRunState;
  error?: string;
};

export type SubmissionResponse = {
  success: boolean;
  data?: {
    submissionId: string;
    status: string;
  };
  error?: string;
};
