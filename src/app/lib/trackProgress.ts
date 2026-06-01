// 트랙 챕터 완료 상태를 클라이언트(localStorage)에 보관하는 유틸.
// 백엔드에 챕터별 완료/잠금 API 가 없어, 지도형 경로의 "잠금 해제 / 완료 체크" 를
// 프론트에서만 추적한다. 게임 요소 실험용이라 서버 정합성보다 즉시성·롤백 용이성을 우선한다.
//
// 저장 형태: echo.trackProgress = { "<trackId>": [완료된 chapterIndex, ...] }

const STORAGE_KEY = 'echo.trackProgress';

type ProgressMap = Record<string, number[]>;

function read(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

function write(map: ProgressMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage 비활성화 환경은 무시 (진행도는 휘발).
  }
}

// 한 트랙에서 완료된 chapterIndex 집합.
export function completedChapters(trackId: number): Set<number> {
  const list = read()[String(trackId)] ?? [];
  return new Set(list);
}

// 챕터 완료 기록. 이미 있으면 그대로 둔다. 변경되면 true 를 반환(첫 완료 여부 판별용).
export function markChapterComplete(trackId: number, chapterIndex: number): boolean {
  const map = read();
  const key = String(trackId);
  const list = map[key] ?? [];
  if (list.includes(chapterIndex)) return false;
  map[key] = [...list, chapterIndex].sort((a, b) => a - b);
  write(map);
  return true;
}

// chapterIndex 가 진입 가능한지(=잠금 해제) 판정.
// 규칙: 0번 챕터는 항상 열려 있고, 이후 챕터는 직전 챕터가 완료돼야 열린다.
//       (이미 완료한 챕터는 복습 위해 당연히 열려 있다.)
export function isChapterUnlocked(trackId: number, chapterIndex: number): boolean {
  if (chapterIndex <= 0) return true;
  const done = completedChapters(trackId);
  return done.has(chapterIndex) || done.has(chapterIndex - 1);
}

// 트랙 전체 진행도 (완료 챕터 수 / 전체).
export function trackProgressRatio(trackId: number, totalChapters: number): number {
  if (totalChapters <= 0) return 0;
  const done = completedChapters(trackId);
  let count = 0;
  for (let i = 0; i < totalChapters; i += 1) if (done.has(i)) count += 1;
  return count / totalChapters;
}

// 실험 초기화용 — 한 트랙 혹은 전체 진행도를 지운다.
export function resetTrackProgress(trackId?: number): void {
  if (trackId === undefined) {
    write({});
    return;
  }
  const map = read();
  delete map[String(trackId)];
  write(map);
}
