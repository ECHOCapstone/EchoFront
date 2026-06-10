// 트랙별 화면 표현 방식(테마)을 고르는 단일 출처.
// 백엔드가 트랙 제목을 자유롭게 주므로 id 가 아니라 제목 키워드로 가린다 —
// 콘텐츠가 늘어도 규칙만 맞으면 자동 적용되고, 분기를 바꾸고 싶으면 이 파일만 손보면 된다.
//
//   - 'grid'   : 2열 격자 + 챕터별 아이콘 (장소별 / 상황별 트랙). 잠금 없이 자유 선택.
//   - 'shelf'  : 책장(도서관) + 강조된 챕터 책 (모음 구별 트랙). 잠금 없이 자유 선택.
//   - 'forest' : 푸른숲 지도형 경로 (기본발음 / 일상회화 트랙). 순차 잠금 해제.
//   - 'list'   : 카드 목록형 (그 외 트랙)

export type TrackTheme = 'grid' | 'shelf' | 'forest' | 'list';

// 격자(아이콘) 테마를 적용할 트랙 제목 키워드. forest 보다 먼저 본다 —
// "상황별 표현"처럼 forest 키워드('표현')가 섞여 있어도 격자로 보내기 위함.
const GRID_KEYWORDS = ['장소', '상황'];

// 책장 테마를 적용할 트랙 제목 키워드. forest('발음' 등) 보다 먼저 본다.
const SHELF_KEYWORDS = ['모음', '자음'];

// 숲 지도 테마를 적용할 트랙 제목 키워드.
//   "기본발음트랙"     → '발음' 매칭
//   "일상회화표현"     → '회화' / '표현' 매칭
//   "토익 LC 쉐도잉"   → '쉐도잉' 매칭 (순차 잠금 해제 경로형)
const FOREST_KEYWORDS = ['발음', '회화', '표현', '쉐도잉'];

export function resolveTrackTheme(track: { id: number; title: string }): TrackTheme {
  const title = (track.title ?? '').replace(/\s+/g, '');
  if (GRID_KEYWORDS.some((kw) => title.includes(kw))) return 'grid';
  if (SHELF_KEYWORDS.some((kw) => title.includes(kw))) return 'shelf';
  if (FOREST_KEYWORDS.some((kw) => title.includes(kw))) return 'forest';
  return 'list';
}
