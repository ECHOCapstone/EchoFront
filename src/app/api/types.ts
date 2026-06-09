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
  // 일반 비밀번호로 로그인 가능한 계정인지 — OAuth 전용 가입자는 false. 프론트가 본인 확인 칸을 숨기거나
  // "비밀번호 변경"을 비활성화하는 데 사용한다.
  hasPassword: boolean;
  createdAt: string;
  // 온보딩 튜토리얼 완료 여부. false 면 최초 진입 시 1회 튜토리얼을 자동으로 띄운다.
  onboardingCompleted: boolean;
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

// 음소인식 모델 후보 한 건. type 은 echo(자체 체크포인트) | slplab(HuggingFace).
export type AsrModelOption = {
  id: string;
  label: string;
  type: string;
};

// 어드민의 음소인식 모델 선택. selected 는 현재 적용값, options 는 모델 서버가 제공하는 후보.
// serverAvailable 이 false 면 모델 서버에 연결할 수 없어 후보를 못 받은 상태다.
export type ModelServerConfig = {
  selected: string;
  options: AsrModelOption[];
  serverAvailable: boolean;
};

// LLM 프롬프트 한 건. overridden 이 true 면 classpath 기본값이 아닌 재정의 본문이다.
export type Prompt = {
  key: string;
  content: string;
  overridden: boolean;
};

// 음소 조음 안내 한 건. 백엔드 인벤토리(SSOT)에서 내려온다.
// koreanCue 는 짧은 한글 음차, tip 은 혀·입 모양 설명, imageUrl 은 이미지 바이트를 서빙하는 공개 경로.
export type PhonemeArticulation = {
  phoneme: string;
  koreanCue: string;
  tip: string;
  imageUrl: string;
};

// 편집 가능한 게임화/메시지 설정 한 건. type 으로 입력 형식을, overridden 으로 재정의 여부를 안다.
export type Setting = {
  key: string;
  value: string;
  type: 'INT' | 'DOUBLE' | 'STRING';
  overridden: boolean;
};

// 어드민 영구 저장본 파일 한 건의 상태. exists 가 false 면 공장 기본값으로 동작 중.
export type SeedFileStatus = {
  exists: boolean;
  lastModified: string | null;
  path: string;
};

// 시스템 상태 대시보드 응답.
export type SystemStatus = {
  modelServer: { reachable: boolean; activeModel: string | null };
  llm: { geminiAvailable: boolean };
  database: { latestMigration: string | null; appliedAt: string | null; totalMigrations: number };
  seedFiles: { domain: string; supportsExplicitPersist: boolean; status: SeedFileStatus }[];
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
  // targetText 에 대응하는 한국어 자막. 백엔드 ScriptService 가 TranslationService 로 미리 채워 보내며,
  // 번역이 없거나 INTRO 단계처럼 발화 텍스트가 없으면 null.
  koreanTranslation: string | null;
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
  // text 에 대응하는 한국어 자막. 백엔드 SessionService 가 get/patch 응답에 함께 실어 보낸다.
  // 번역이 없으면 null.
  koreanTranslation: string | null;
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

// 단어별 canonical 음소. 백엔드가 LLM 으로 생성하므로 문맥 의존 발음 (the → DH IY 등) 도 정확히 반영된다.
// 음소를 단어 경계로 잘라 보여줄 때 사용한다.
export type CanonicalWord = {
  word: string;
  phonemes: string[];
};

// 한 번의 녹음 업로드 응답.
// canonical / alignment / stepScore 는 백엔드 LLM 출력에서 도출된다 — 시각·표시 로직은 동일.
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
  // LLM 정렬 결과의 시퀀스 전체. errors 와 달리 MATCH 도 포함해 음소별 색칠 / 정·오답 표시의 단일 소스로 쓴다.
  alignment: AlignmentOp[];
  wrongWords: WrongWord[];
  phonemeTips: PhonemeTip[];
  speechRate: SpeechRate;
  // 단어별 canonical 음소. 비어 있으면 (조회 응답 등) 전체 음소를 한 줄로 폴백 표시한다.
  canonicalWords: CanonicalWord[];
  // 합격선 점수 (어드민이 바꿀 수 있음). 조회 응답에는 null. 점수 게이지가 이 값으로 합격선 마커 위치를 정한다.
  passThreshold: number | null;
  createdAt: string;
};

// LLM 이 보고하는 음소 실수 한 건. MATCH 는 errors 에 포함되지 않는다 — errors 는 실수 모음.
// op 는 백엔드 enum 직렬화 결과로 UPPERCASE 로 고정된다.
export type PhonemeError = {
  op: 'SUBSTITUTION' | 'INSERTION' | 'DELETION';
  canonical: string | null;
  perceived: string | null;
  canonicalIndex: number | null;
};

// LLM 정렬 결과의 한 셀. MATCH 까지 포함한 시퀀스 전체를 그대로 노출해 음소별 색칠/표시의 단일 소스가 된다.
// canonicalIndex 는 canonical 시퀀스에서의 0-based 위치. INSERTION 은 canonical 자리에 매핑되지 않아 null.
export type AlignmentOp = {
  errorType: 'MATCH' | 'SUBSTITUTION' | 'INSERTION' | 'DELETION';
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

// 어드민이 등록한 "오늘의 챌린지" 의 사용자 시점 응답.
//   id, targetText, koreanTranslation : 챌린지 본문.
//   activatedAt                       : 활성화 시점 — 기간 안내용 ISO 8601.
//   attemptsToday / attemptsLimit     : 본인 오늘 도전 횟수 / 하루 상한.
//   myBestScore                       : 본인의 챌린지 best 점수 (미도전이면 null).
export type ChallengeCurrent = {
  id: number;
  targetText: string;
  koreanTranslation: string | null;
  activatedAt: string | null;
  attemptsToday: number;
  attemptsLimit: number;
  myBestScore: number | null;
};

// 한 번의 챌린지 도전 결과. isMyNewBest 가 true 면 효과음/애니메이션 트리거에 사용한다.
// errors / alignment 는 RecordingResult 와 같은 형태 — 챌린지 결과 카드에서도 음소 정렬 시각화를 그대로 쓴다.
export type ChallengeAttempt = {
  attemptId: number;
  score: number;
  passThreshold: number;
  isMyNewBest: boolean;
  attemptsToday: number;
  attemptsLimit: number;
  perceived: string[];
  canonical: string[];
  errors: PhonemeError[];
  alignment: AlignmentOp[];
};

// 챌린지 랭킹 응답.
export type ChallengeRanking = {
  challengeId: number;
  targetText: string;
  totalRanked: number;
  myRank: number;
  myBestScore: number | null;
  myAttempts: number;
  myEntryShown: boolean;
  entries: {
    rank: number;
    nickname: string;
    bestScore: number;
    attempts: number;
    isMe: boolean;
  }[];
};

// "지난 챌린지" 한 행. 1~3등 미니뷰와 본인 결과가 함께 들어 있다.
export type ChallengeHistoryItem = {
  id: number;
  targetText: string;
  koreanTranslation: string | null;
  activatedAt: string | null;
  deactivatedAt: string | null;
  topEntries: { rank: number; nickname: string; bestScore: number; badgeId: string | null }[];
  myBestScore: number | null;
  myRank: number;
  myBadgeId: string | null;
};

// 어드민 챌린지 목록의 한 행.
export type AdminChallengeListItem = {
  id: number;
  targetText: string;
  koreanTranslation: string | null;
  active: boolean;
  createdAt: string;
  activatedAt: string | null;
  deactivatedAt: string | null;
  totalAttempts: number;
  totalParticipants: number;
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

// 시스템 누적 배지 한 정의. 어드민이 추가/수정/삭제 가능. condition 은 백엔드 enum (BadgeCondition) 의
// 식별자 — availableConditions 가 어드민 UI 가 보여줄 선택지를 같이 내려준다.
export type Badge = {
  id: string;
  name: string;
  condition: string;
  threshold: number;
};

export type BadgeCatalog = {
  badges: Badge[];
  availableConditions: string[];
};

export type BadgeInput = {
  id: string;
  name: string;
  condition: string;
  threshold: number;
};

// "이어서 학습" 진입 시 사용자에게 다시 보여 줄 이전 시도의 압축 데이터.
//   recordingId       : 종합 피드백 generate 호출 시 사용 (학습 흐름 재개 시 마지막 step 까지의 latest id 묶음에 포함).
//   stepId            : chapter 모드는 LearningStep.id, session 모드는 SessionSentence.id — prompt.id 와 같다.
//   stepScore         : 0~100. 분석 실패 등으로 null 가능.
//   guidanceKr        : LLM 이 만든 한국어 가이드. 없으면 빈 문자열.
//   perceived/canonical : 모델 음소 시퀀스. 빈 배열이면 시각화는 생략.
//   errors / alignment / wrongWords : 저장된 오류 / 정렬 / 약점 단어 — FeedbackBubble 의 음소 정렬 / 단어 강조에 그대로 사용.
//                                      alignment 는 MATCH 까지 포함한 시퀀스 전체.
//   createdAt         : 시도 시각.
export type RecordingHistoryItem = {
  recordingId: number;
  stepId: number;
  stepScore: number | null;
  guidanceKr: string;
  perceived: string[];
  canonical: string[];
  errors: PhonemeError[];
  alignment: AlignmentOp[];
  wrongWords: WrongWord[];
  createdAt: string;
};

// 챕터 / 세션의 이전 시도 묶음.
export type RecordingHistory = {
  // 응답 시점의 통과 임계 — FE 가 historical 점수의 통과 여부 판정에 사용.
  passThreshold: number;
  // step / sentence 별 가장 최근 한 건씩. 시간 순 ASC.
  items: RecordingHistoryItem[];
};

// 영어 → 한국어 번역 응답 한 건. target 이 빈 문자열이면 외부 호출이 실패했거나 provider 가 noop 으로 폴백된 상태.
export type TranslationItem = {
  source: string;
  target: string;
};

// 번역 배치 응답. items 는 요청 texts 와 같은 길이·같은 순서다.
export type TranslationBatchResponse = {
  items: TranslationItem[];
};

// 어드민 약관 관리에서 받아오는 한 종류 약관 본문 + override 여부.
export type LegalTermsEntry = {
  kind: string;
  label: string;
  body: string;
  overridden: boolean;
};

export type LegalTermsCatalog = {
  version: string;
  entries: LegalTermsEntry[];
  seedStatus: SeedFileStatus;
};
