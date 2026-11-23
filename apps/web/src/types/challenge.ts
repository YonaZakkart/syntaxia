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
