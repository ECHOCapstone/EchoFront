// 트랙 진입 화면. 트랙 메타와 챕터 목록을 함께 보여주고,
// "처음부터 시작" 버튼은 chapterIndex=0 로 PronunciationPractice 를 띄운다.
// 챕터 카드 직접 클릭 시 해당 chapterIndex 로 진입한다.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, BookOpen, Play } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { ApiException, tracksApi, type TrackDetail } from '../api';
import { paths } from '../lib/paths';

export default function TrackOverview() {
  const navigate = useNavigate();
  const { trackId: trackIdParam } = useParams<{ trackId: string }>();
  const trackId = Number(trackIdParam);
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(trackId) || trackId <= 0) {
      navigate(paths.tracks, { replace: true });
      return;
    }
    let cancelled = false;
    tracksApi
      .detail(trackId)
      .then((data) => {
        if (cancelled) return;
        setTrack(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiException ? err.message : '트랙을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trackId, navigate]);

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
    <div className="min-h-screen bg-white flex flex-col">
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
              <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0 mt-1">
                <BookOpen size={28} className="text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{track.title}</h1>
                <p className="text-sm text-gray-600 leading-relaxed">{track.description}</p>
              </div>
            </div>

            <Button
              onClick={() => enterChapter(0)}
              disabled={track.chapters.length === 0}
              className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white text-lg font-bold rounded-2xl mb-6 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play size={20} className="fill-white" />
              <span>처음부터 시작</span>
            </Button>

            <h2 className="text-lg font-bold text-gray-900 mb-3">챕터 목록</h2>
            <div className="space-y-3">
              {track.chapters.length === 0 && (
                <p className="text-gray-500">이 트랙에는 아직 챕터가 없습니다.</p>
              )}
              {track.chapters.map((chapter, index) => (
                <button
                  key={chapter.scriptId}
                  onClick={() => enterChapter(index)}
                  className="w-full text-left bg-white border-2 border-gray-200 hover:border-sky-500 hover:bg-sky-50 rounded-2xl p-4 transition-colors flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 font-bold text-gray-700">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 mb-1">{chapter.title}</h3>
                    <p className="text-xs text-gray-500">난이도: {chapter.difficulty}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
