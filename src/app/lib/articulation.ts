// 음소별 조음 위치(혀 / 입 모양) 안내의 단일 출처.
//
// 사진: src/assets/articulation/<PHONEME>.{png,jpg,webp,svg} 를 넣으면 자동으로 잡힌다.
//   - 파일명은 stress 숫자 없는 ARPAbet 대문자 (예: R.png, AY.png, TH.png).
//   - import.meta.glob 이 빌드 시 디렉토리를 훑으므로, 새 음소 사진을 추가할 때
//     이 파일을 수정할 필요가 없다 — 디렉토리에 넣기만 하면 된다 (확장 지점).
// 설명: 아학편 가이드 기반 텍스트. 사진이 없을 때의 fallback 이자 사진의 보조 설명.

const IMAGE_MODULES = import.meta.glob('../../assets/articulation/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

// glob key(전체 경로) → 파일명(확장자 제거, 대문자) 으로 정규화한 매핑.
const IMAGE_BY_PHONEME: Record<string, string> = {};
for (const [path, url] of Object.entries(IMAGE_MODULES)) {
  const file = path.split('/').pop() ?? '';
  const name = file.replace(/\.[^.]+$/, '').toUpperCase();
  if (name) IMAGE_BY_PHONEME[name] = url;
}

// ARPAbet 음소에서 stress 숫자(0/1/2)를 떼고 대문자로 정규화한다. (AY1 → AY)
export function normalizePhoneme(phoneme: string): string {
  return phoneme.replace(/[0-9]/g, '').trim().toUpperCase();
}

// 해당 음소의 조음 사진 URL. 없으면 null.
export function getArticulationImage(phoneme: string): string | null {
  return IMAGE_BY_PHONEME[normalizePhoneme(phoneme)] ?? null;
}

export type ArticulationGuide = { koreanCue: string; tip: string };

// 아학편 기반 조음 가이드. 사진의 보조 설명이자 사진이 없을 때의 fallback.
// TH / ZH 처럼 무성·유성 쌍은 대표 단서로 합쳐 적는다.
const GUIDE: Record<string, ArticulationGuide> = {
  R: { koreanCue: '(으)뤄~', tip: '혀끝을 어디에도 닿지 않게 띄우고 입술을 살짝 모은다. "우" 와 비슷한 입 모양에서 시작.' },
  L: { koreanCue: '(혀끝 윗니뒤) ㄹ', tip: '혀끝을 윗니 바로 뒤 잇몸에 꼭 댄 채로 소리를 흘려보낸다.' },
  TH: { koreanCue: '(혀끝 살짝 깨물고) 쓰/드', tip: '혀끝을 위·아래 앞니 사이로 살짝 내밀고 바람을 흘린다. 입술은 다물지 않는다.' },
  DH: { koreanCue: '(혀끝 살짝 깨물고) 드', tip: 'TH 와 같은 혀 위치에서 성대를 떨어 "드" 비슷한 소리를 낸다.' },
  V: { koreanCue: '(윗니로 아랫입술) ㅸ', tip: '윗니로 아랫입술 안쪽을 가볍게 누른 채 떨림을 만든다. 한국어 "ㅂ" 과 다름.' },
  F: { koreanCue: '(윗니로 아랫입술) 프', tip: 'V 와 같은 입 모양에서 떨림 없이 바람만 내보낸다.' },
  Z: { koreanCue: '(혀끝 잇몸 가까이) ㅿ', tip: '혀끝을 윗니 뒤 가까이 둔 채 떨림을 만든다. 한국어 "ㅈ" 보다 길게 울린다.' },
  SH: { koreanCue: '쉬', tip: '혀를 입천장 쪽으로 둥글게 올리고 입술은 약간 앞으로 내민다.' },
  ZH: { koreanCue: '(입술 둥글게) 쥬', tip: 'SH 와 같은 혀 위치에서 성대를 떨어 짧게 끊는다.' },
  W: { koreanCue: '우→워', tip: '입술을 둥글게 모은 채 "우" 에서 시작해 모음으로 빠르게 이동.' },
  AE: { koreanCue: '애 (옆으로 넓게)', tip: '"에" 와 "아" 사이. 입꼬리를 좌우로 당겨 옆으로 길게 벌린다.' },
  AH: { koreanCue: '(목 깊은) 어', tip: '입을 살짝만 벌리고 목 깊은 곳에서 짧게 "어".' },
  AO: { koreanCue: '(입 둥글게) 오~', tip: '입술을 둥글게 모으고 약간 길게 "오".' },
  IY: { koreanCue: '이~ (길게)', tip: '입꼬리를 위로 살짝 들고 길게 "이".' },
  IH: { koreanCue: '(짧게) 이', tip: 'IY 보다 입을 약간 더 벌리고 짧게 끊는다.' },
  UH: { koreanCue: '(짧게) 우', tip: '입술을 살짝만 모으고 짧게 "우".' },
  UW: { koreanCue: '우~ (둥글게)', tip: '입술을 단단히 둥글게 모으고 길게 "우".' },
  ER: { koreanCue: '어r', tip: '"어" 에서 시작해 혀끝을 들어올려 R 로 마무리. 한국어 "어" 단독과 다름.' },
  D: { koreanCue: '(으)드', tip: '성대를 진동시켜 유성음으로 발음. 한국어 "ㄷ" 단독과 다름.' },
  // 이중모음 — 두 모음을 한 호흡에 미끄러지듯 이어 발음한다.
  AY: { koreanCue: '아이', tip: '입을 크게 벌려 "아" 로 시작한 뒤 입꼬리를 당기며 "이" 로 매끄럽게 연결.' },
  EY: { koreanCue: '에이', tip: '"에" 에서 시작해 "이" 로 빠르게 이어 미끄러진다.' },
  OW: { koreanCue: '오우', tip: '입술을 둥글게 "오" 에서 시작해 "우" 로 모으며 마무리.' },
  AW: { koreanCue: '아우', tip: '입을 크게 "아" 로 벌렸다가 입술을 모아 "우" 로 이동.' },
  OY: { koreanCue: '오이', tip: '둥근 "오" 에서 입꼬리를 당기며 "이" 로 이어준다.' },
};

// 해당 음소의 조음 가이드 텍스트. 없으면 null.
export function getArticulationGuide(phoneme: string): ArticulationGuide | null {
  return GUIDE[normalizePhoneme(phoneme)] ?? null;
}

// 사진이든 설명이든 보여줄 조음 정보가 하나라도 있으면 true.
export function hasArticulation(phoneme: string): boolean {
  const n = normalizePhoneme(phoneme);
  return n in IMAGE_BY_PHONEME || n in GUIDE;
}
