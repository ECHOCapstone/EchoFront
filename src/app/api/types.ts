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

// 사용자 맞춤 세션의 학습 단위 한 문장. SentenceSplitter 결과를 그대로 노출하며,
// id 를 녹음 업로드(sentenceId) 키로 사용한다.
export type SessionSentence = {
  id: number;
  sentenceIndex: number;
  text: string;
};

export type Session = {
  id: number;
  title: string;
  scriptText: string;
  favorite: boolean;
  sentences: SessionSentence[];
  createdAt: string;
  updatedAt: string;
};

export type RecordingResult = {
  id: number;
  scriptId: number | null;
  sessionId: number | null;
  stepId: number | null;
  sessionSentenceId: number | null;
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

// 학습 트랙 목록 화면에 노출되는 메타. chapterCount 로 분량을 가늠한다.
export type TrackSummary = {
  id: number;
  title: string;
  description: string;
  displayOrder: number;
  chapterCount: number;
};

// 트랙 진입 직전 한 번 받아오는 챕터 묶음. 챕터 학습 시 scriptId 그대로 /api/scripts/{id} 키가 된다.
export type ChapterSummary = {
  scriptId: number;
  chapterOrder: number;
  title: string;
  difficulty: Difficulty;
};

export type TrackDetail = {
  id: number;
  title: string;
  description: string;
  displayOrder: number;
  chapters: ChapterSummary[];
};
