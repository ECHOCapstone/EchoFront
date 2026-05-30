// 학습 트랙 목록 화면. 백엔드 GET /api/tracks 응답을 카드로 노출하고,
// 카드를 누르면 트랙 진입 화면(`/tracks/:trackId`) 으로 이동한다.

import { useNavigate } from 'react-router';
import { ArrowLeft, BookOpen, Flame } from 'lucide-react';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { tracksApi } from '../api';
import { useApiResource } from '../hooks/useApiResource';
import { paths } from '../lib/paths';

export default function TrackList() {
  const navigate = useNavigate();
  const { data: tracks, loading, error } = useApiResource(
    () => tracksApi.list(),
    [],
    { errorFallback: '학습 트랙을 불러오지 못했습니다.' }
  );

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex justify-start mb-4">
          <button
            onClick={() => navigate(paths.main)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <Flame size={32} className="text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-900">학습 트랙</h1>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-gray-500">불러오는 중...</p>}
          {!loading && error && <p className="text-red-500">{error}</p>}
          {!loading && !error && tracks && tracks.length === 0 && (
            <p className="text-gray-500">아직 등록된 학습 트랙이 없습니다.</p>
          )}
          {!loading && !error && tracks && tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => navigate(paths.trackOverview(track.id))}
              className="w-full text-left bg-white border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 rounded-2xl p-5 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={24} className="text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{track.title}</h2>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{track.description}</p>
                  <p className="text-xs text-brand-600 font-medium">챕터 {track.chapterCount}개</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
