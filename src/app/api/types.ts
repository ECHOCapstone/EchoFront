// 백엔드(mock 또는 실제) 와 1:1 로 매칭되는 DTO 타입.
// 응답 envelope, 도메인별 응답/요청, 에러 코드 모두 한 곳에서 정의한다.

export type ApiError = { code: string; message: string };

export type ApiEnvelope<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError };

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type StepKind = 'INTRO' | 'RECORD';

export type User = {
  id: number;
  username: string;
  email: string;
  nickname: string;
  streak: number;
  exp: number;
  createdAt: string;
};

export type TokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSec: number;
  user: User;
};

export type ScriptSummary = {
  id: number;
  title: string;
  difficulty: Difficulty;
  isPreset: boolean;
};

export type LearningStep = {
  id: number;
  orderIndex: number;
  kind: StepKind;
  prompt: string;
  targetText: string | null;
  canonicalPhonemes: string[];
};

export type ScriptDetail = {
  id: number;
  title: string;
  content: string;
  difficulty: Difficulty;
  isPreset: boolean;
  steps: LearningStep[];
};

export type Session = {
  id: number;
  title: string;
  scriptText: string;
  createdAt: string;
  updatedAt: string;
};

export type RecordingResult = {
  id: number;
  scriptId: number | null;
  sessionId: number | null;
  stepId: number | null;
  durationSec: number | null;
  perceived: string[];
  canonical: string[];
  peakSoftmax: number[];
  stepScore: number | null;
  guidanceKr: string | null;
  createdAt: string;
};

export type PhonemeError = {
  op: string;
  canonical: string | null;
  perceived: string | null;
  canonicalIndex: number | null;
};

export type Feedback = {
  id: number;
  scriptId: number | null;
  sessionId: number | null;
  title: string;
  accuracy: number;
  weakPhoneme: string | null;
  practiceWord: string | null;
  guidanceKr: string | null;
  errors: PhonemeError[];
  createdAt: string;
};

export type FeedbackSummary = {
  id: number;
  title: string;
  accuracy: number;
  weakPhoneme: string | null;
  createdAt: string;
};

export type RetryWordResult = {
  correct: boolean;
  perceived: string[];
  canonical: string[];
  score: number;
  guidanceKr: string;
};

export type Stats = {
  streak: number;
  exp: number;
  attendance: { year: number; month: number; days: Record<string, number> };
  weeklyErrors: { sound: string; count: number }[];
  badges: { id: string; name: string; achieved: boolean }[];
};

export type Ranking = {
  unitTitle: string;
  myRank: number;
  totalUsers: number;
  myAccuracy: number;
  entries: { rank: number; nickname: string; accuracy: number; isMe: boolean }[];
};
