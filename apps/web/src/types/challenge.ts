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

export type ChallengesResponse = {
  success: boolean;
  data?: ChallengeSummary[];
  error?: string;
};
