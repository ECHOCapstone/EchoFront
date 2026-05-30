// 백엔드(mock 또는 실제) 와 1:1 로 매칭되는 DTO 타입.
// 응답 envelope, 도메인별 응답/요청, 에러 코드 모두 한 곳에서 정의한다.

export type ApiError = { code: string; message: string };

export type ApiEnvelope<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError };

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type StepKind = 'INTRO' | 'RECORD';

export type Role = 'USER' | 'ADMIN';

export type User = {
  id: number;
  username: string;
  email: string;
  nickname: string;
  streak: number;
  exp: number;
  role: Role;
  createdAt: string;
};

// 어드민의 피드백 LLM 설정. provider/model 은 현재 적용값, *Options 는 선택 후보.
// geminiAvailable 이 false 면 apiKey 미설정이라 gemini 를 고를 수 없다.
export type LlmConfig = {
  provider: string;
  model: string;
  geminiAvailable: boolean;
  providerOptions: string[];
  modelOptions: string[];
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
};

export type ScriptDetail = {
  id: number;
  title: string;
  content: string;
  difficulty: Difficulty;
  isPreset: boolean;
  practiceWord: string | null;
  masteryBadgeName: string | null;
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

// LLM 이 짚어 준 잘못 발음된 단어와 그 위치. index 는 targetText 의 영어 단어 중 0-based 위치.
export type WrongWord = {
  word: string;
  index: number;
};

// LLM 이 약점 음소에 대해 제시한 한국식 발음 단서 (아학편 가이드 적용).
// koreanCue 는 한글 음차, tip 은 입 모양 / 혀 위치 등 추가 발음 요령.
export type PhonemeTip = {
  phoneme: string;
  koreanCue: string;
  tip: string;
};

// 종합 피드백에서 추천되는 추가 학습 항목. 단어 / 구 / 문장 셋 중 하나의 kind 를 가진다.
export type PracticeItem = {
  text: string;
  kind: 'WORD' | 'PHRASE' | 'SENTENCE';
  reason: string;
};

// 모델 서버가 분류한 발화 속도. FAST 이면 "조금 천천히" 안내 배지를 노출한다.
export type SpeechRate = 'FAST' | 'NORMAL' | 'SLOW';

// 단어별 canonical 음소 (백엔드 g2p words). 음소를 단어 경계로 잘라 보여줄 때 사용한다.
export type CanonicalWord = {
  word: string;
  phonemes: string[];
};

// 한 번의 녹음 업로드 응답.
// passed / retryRecommended 는 백엔드의 통과 임계 (app.gamification.pass-threshold) 와
// LLM 판정을 합쳐 결정한 SSOT 값이라 프론트가 점수만 보고 다시 판단하지 않는다.
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
  passed: boolean;
  retryRecommended: boolean;
  guidanceKr: string | null;
  strengths: string[];
  weaknesses: string[];
  errors: PhonemeError[];
  wrongWords: WrongWord[];
  phonemeTips: PhonemeTip[];
  speechRate: SpeechRate;
  // 단어별 canonical 음소. 비어 있으면 (조회 응답 등) 전체 음소를 한 줄로 폴백 표시한다.
  canonicalWords: CanonicalWord[];
  createdAt: string;
};

export type PhonemeError = {
  op: string;
  canonical: string | null;
  perceived: string | null;
  canonicalIndex: number | null;
};

// 챕터 / 세션 종합 피드백.
// nextPracticeItems 는 LLM 이 약점에 맞춰 추천한 단어 · 구 · 문장 혼합 항목이며,
// 각 항목은 POST /api/feedback/{id}/retry-word (form 의 word 파라미터) 로 개별 평가된다.
export type Feedback = {
  id: number;
  scriptId: number | null;
  sessionId: number | null;
  title: string;
  accuracy: number;
  weakPhoneme: string | null;
  practiceWord: string | null;
  guidanceKr: string | null;
  strengths: string[];
  weaknesses: string[];
  nextPracticeItems: PracticeItem[];
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

// 단어 / 구 재시도 평가 응답.
// correct 는 LLM 의 정성 판정, passed 는 점수 임계 기반, retryRecommended 는 두 신호를 합친 SSOT.
export type RetryWordResult = {
  correct: boolean;
  passed: boolean;
  retryRecommended: boolean;
  perceived: string[];
  canonical: string[];
  score: number;
  guidanceKr: string;
  phonemeTips: PhonemeTip[];
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
