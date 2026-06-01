// EXP → 레벨 변환 유틸. 백엔드 User.exp 한 값만 입력으로 받아 화면용 레벨/진행도를 파생한다.
// 게임 요소 실험용으로 프론트에서만 계산하며, 백엔드 스키마를 건드리지 않는다.
//
// 레벨 곡선: 레벨 L(1-base)에 도달하기 위한 누적 EXP = 50 * (L-1) * L.
//   L1: 0, L2: 100, L3: 300, L4: 600, L5: 1000 ... (레벨이 오를수록 더 많은 EXP 필요)

export type LevelInfo = {
  level: number;        // 현재 레벨 (1-base)
  current: number;      // 현재 레벨 안에서 쌓은 EXP
  required: number;     // 다음 레벨까지 필요한 EXP 총량
  ratio: number;        // 0~1, 현재 레벨 진행률
  totalExp: number;     // 입력 그대로의 누적 EXP
};

// 레벨 L 에 도달하는 누적 EXP 임계값.
function thresholdFor(level: number): number {
  return 50 * (level - 1) * level;
}

export function levelInfo(exp: number): LevelInfo {
  const totalExp = Math.max(0, Math.floor(exp || 0));

  // 임계값을 넘는 가장 높은 레벨을 찾는다. 곡선이 2차라 단순 증가 루프로 충분하다.
  let level = 1;
  while (thresholdFor(level + 1) <= totalExp) level += 1;

  const base = thresholdFor(level);
  const next = thresholdFor(level + 1);
  const required = next - base;
  const current = totalExp - base;
  const ratio = required > 0 ? Math.min(1, current / required) : 0;

  return { level, current, required, ratio, totalExp };
}
