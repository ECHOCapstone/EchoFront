// 트랙 진입 화면. 트랙 메타와 챕터 목록을 함께 보여주고,
// "처음부터 시작" 버튼은 chapterIndex=0 로 PronunciationPractice 를 띄운다.
// 챕터 카드 직접 클릭 시 해당 chapterIndex 로 진입한다.

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, BookOpen, Play } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import ForestTrackMap from './learning/ForestTrackMap';
import GridTrackMap from './learning/GridTrackMap';
import BookshelfTrackMap from './learning/BookshelfTrackMap';
import { tracksApi } from '../api';
import { useApiResource } from '../hooks/useApiResource';
import { paths } from '../lib/paths';
import { completedChapters, isChapterUnlocked, trackProgressRatio } from '../lib/trackProgress';
import { resolveTrackTheme } from '../lib/trackTheme';

export default function TrackOverview() {
  const navigate = useNavigate();
  const { trackId: trackIdParam } = useParams<{ trackId: string }>();
  const trackId = Number(trackIdParam);
  const trackIdValid = Number.isFinite(trackId) && trackId > 0;

  const { data: track, loading, error } = useApiResource(
    () => tracksApi.detail(trackId),
    [trackId],
    {
      enabled: trackIdValid,
      errorFallback: '트랙을 불러오지 못했습니다.',
    }
  );

  // 비정상 trackId 진입은 트랙 목록으로 되돌린다 (URL 변조나 잘못된 링크 대응).
  useEffect(() => {
    if (!trackIdValid) navigate(paths.tracks, { replace: true });
  }, [trackIdValid, navigate]);

  // 챕터 진입은 항상 트랙 컨텍스트(trackId, chapterIndex)와 함께 이뤄진다.
  // 이렇게 해야 PronunciationPractice 가 "다음 챕터" 흐름을 자체적으로 이어갈 수 있다.
  const enterChapter = (chapterIndex: number) => {
    if (!track || chapterIndex < 0 || chapterIndex >= track.chapters.length) return;
    const chapter = track.chapters[chapterIndex];
    navigate(paths.pronunciationPractice({
      scriptId: chapter.scriptId,
      trackId: track.id,
      chapterIndex,
    }));
  };

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex justify-start mb-4">
          <button
            onClick={() => navigate(paths.tracks)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="트랙 목록으로"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        </div>

        {loading && <p className="text-gray-500">불러오는 중...</p>}
        {!loading && error && <p className="text-red-500">{error}</p>}

        {track && (
          <>
            <div className="flex items-start gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0 mt-1">
                <BookOpen size={28} className="text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{track.title}</h1>
                <p className="text-sm text-gray-600 leading-relaxed">{track.description}</p>
              </div>
            </div>

            {(() => {
              const done = completedChapters(track.id);
              const total = track.chapters.length;
              // 이어서 학습 = 아직 완료 안 한 첫 챕터(없으면 0).
              const resumeIndex = track.chapters.findIndex((_, i) => !done.has(i));
              const startIndex = resumeIndex === -1 ? 0 : resumeIndex;
              const hasProgress = done.size > 0;
              const allDone = total > 0 && done.size >= total;
              const ratio = trackProgressRatio(track.id, total);
              const theme = resolveTrackTheme(track);

              return (
                <>
                  {/* 트랙 진행도 바 */}
                  {total > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-500">진행도</span>
                        <span className="text-xs font-bold text-brand-600">
                          {done.size}/{total} 챕터
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all duration-500"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => enterChapter(startIndex)}
                    disabled={total === 0}
                    className="w-full h-14 bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold rounded-2xl mb-6 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Play size={20} className="fill-white" />
                    <span>{allDone ? '처음부터 복습' : hasProgress ? '이어서 학습' : '처음부터 시작'}</span>
                  </Button>

                  <h2 className="text-lg font-bold text-gray-900 mb-3">
                    {theme === 'forest' ? '학습 경로' : '챕터 목록'}
                  </h2>
                  {total === 0 ? (
                    <p className="text-gray-500">이 트랙에는 아직 챕터가 없습니다.</p>
                  ) : theme === 'forest' ? (
                    // 푸른숲 지도 테마 (기본발음/일상회화 트랙) — 순차 잠금 해제
                    <ForestTrackMap trackId={track.id} chapters={track.chapters} onEnter={enterChapter} />
                  ) : theme === 'grid' ? (
                    // 격자 테마 (장소별/상황별 트랙) — 잠금 없이 원하는 챕터부터 자유 선택
                    <GridTrackMap trackId={track.id} chapters={track.chapters} onEnter={enterChapter} />
                  ) : theme === 'shelf' ? (
                    // 책장 테마 (모음 구별 트랙) — 강조된 책=챕터, 잠금 없이 자유 선택
                    <BookshelfTrackMap trackId={track.id} chapters={track.chapters} onEnter={enterChapter} />
                  ) : (
                    // 그 외 트랙: 카드 목록형 (지도와 다른 방식). 잠금 규칙은 동일하게 적용.
                    <div className="space-y-3">
                      {track.chapters.map((chapter, index) => {
                        const isDone = done.has(index);
                        const unlocked = isChapterUnlocked(track.id, index);
                        return (
                          <button
                            key={chapter.scriptId}
                            onClick={() => unlocked && enterChapter(index)}
                            disabled={!unlocked}
                            className={[
                              'w-full text-left rounded-2xl p-4 transition-colors flex items-center gap-4 border-2',
                              unlocked
                                ? 'bg-white border-gray-200 hover:border-brand-500 hover:bg-brand-50'
                                : 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-70',
                            ].join(' ')}
                          >
                            <div
                              className={[
                                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold',
                                isDone ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700',
                              ].join(' ')}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-gray-900 mb-1">{chapter.title}</h3>
                              <p className="text-xs text-gray-500">
                                난이도: {chapter.difficulty}
                                {isDone && <span className="ml-2 text-green-600 font-medium">· 완료</span>}
                                {!unlocked && <span className="ml-2 text-gray-400">· 잠김</span>}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
