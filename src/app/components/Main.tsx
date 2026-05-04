import { useNavigate } from 'react-router';
import { BookOpen, Sparkles } from 'lucide-react';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { useAuth } from '../auth/useAuth';
import { paths } from '../lib/paths';

export default function Main() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const nickname = user?.nickname ?? '사용자';

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Hello,</h1>
          <h1 className="text-4xl font-bold text-sky-500">{nickname}님</h1>
        </div>

        {/* 두 학습 입구. 카드 안 콘텐츠가 아이콘 + 제목 + 한 줄 설명 정도라 h-36 이 콘텐츠와 균형이 맞는다. */}
        <div className="space-y-4">
          <button
            onClick={() => navigate(paths.tracks)}
            className="w-full h-36 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white shadow-lg rounded-3xl flex items-center gap-5 px-6 transition-colors text-left"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <BookOpen size={32} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold mb-1">학습 트랙</div>
              <div className="text-sm opacity-90 leading-relaxed">트랙을 골라 챕터별로 차근차근 익혀요</div>
            </div>
          </button>

          <button
            onClick={() => navigate(paths.customLearning)}
            className="w-full h-36 bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white shadow-lg rounded-3xl flex items-center gap-5 px-6 transition-colors text-left"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={32} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold mb-1">맞춤 학습</div>
              <div className="text-sm opacity-90 leading-relaxed">내 대본으로 한 문장씩 연습해요</div>
            </div>
          </button>
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
