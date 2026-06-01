// 트랙별 화면 표현 방식(테마)을 고르는 단일 출처.
// 백엔드가 트랙 제목을 자유롭게 주므로 id 가 아니라 제목 키워드로 가린다 —
// 콘텐츠가 늘어도 규칙만 맞으면 자동 적용되고, 분기를 바꾸고 싶으면 이 파일만 손보면 된다.
//
//   - 'forest' : 푸른숲 지도형 경로 (현재 "기본발음트랙", "일상회화표현" 용)
//   - 'list'   : 카드 목록형 (그 외 트랙)

export type TrackTheme = 'forest' | 'list';

// 숲 지도 테마를 적용할 트랙 제목 키워드. 공백 제거 후 포함 여부로 판정한다.
//   "기본발음트랙"   → '발음' 매칭
//   "일상회화표현"   → '회화' / '표현' 매칭
const FOREST_KEYWORDS = ['발음', '회화', '표현'];

export function resolveTrackTheme(track: { id: number; title: string }): TrackTheme {
  const title = (track.title ?? '').replace(/\s+/g, '');
  return FOREST_KEYWORDS.some((kw) => title.includes(kw)) ? 'forest' : 'list';
}
