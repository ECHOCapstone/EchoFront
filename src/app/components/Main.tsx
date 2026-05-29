import { useNavigate } from 'react-router';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { useAuth } from '../auth/useAuth';
import { paths } from '../lib/paths';
import booMain from '@/assets/boo-pic/BOO17-1.png';
import booCustom from '@/assets/boo-pic/BOO3-1.png';

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
          <h1 className="text-4xl font-bold text-[#77B5FE]">{nickname}님</h1>
        </div>

        {/* 두 학습 입구. 카드 안 콘텐츠가 아이콘 + 제목 + 한 줄 설명 정도라 h-36 이 콘텐츠와 균형이 맞는다. */}
        <div className="space-y-4">
          <div className="relative">
            <button
              onClick={() => navigate(paths.tracks)}
              className="w-full h-36 bg-[#77B5FE] hover:bg-[#65A3EC] active:bg-[#5391DA] text-white shadow-lg rounded-3xl flex items-center gap-5 px-6 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold mb-1">학습 트랙</div>
                <div className="text-sm opacity-90 leading-relaxed">트랙을 골라 챕터별로 차근차근 익혀요</div>
              </div>
            </button>
            <img
              src={booMain}
              alt=""
              aria-hidden
              className="absolute -right-2 bottom-1 w-48 h-48 object-contain pointer-events-none"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => navigate(paths.customLearning)}
              className="w-full h-36 bg-[#5BC0EB] hover:bg-[#49AED9] active:bg-[#379CC7] text-white shadow-lg rounded-3xl flex items-center gap-5 px-6 transition-colors text-left"
            >
              <div className="flex-1 min-w-0 ml-[50%]">
                <div className="text-2xl font-bold mb-1">맞춤 학습</div>
                <div className="text-sm opacity-90 leading-relaxed">내 대본으로 한 문장씩 연습해요</div>
              </div>
            </button>
            <img
              src={booCustom}
              alt=""
              aria-hidden
              className="absolute left-2 bottom-1 w-44 h-44 object-contain pointer-events-none"
            />
          </div>
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
