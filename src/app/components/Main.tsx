import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { useAuth } from '../auth/useAuth';
import { paths } from '../lib/paths';

export default function Main() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const nickname = user?.nickname ?? '사용자';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Hello,</h1>
          <h1 className="text-4xl font-bold text-sky-500">{nickname}님</h1>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => navigate(paths.recommendedLearning)}
            className="w-full h-48 bg-sky-500 hover:bg-sky-600 text-white shadow-lg rounded-3xl"
          >
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">오늘의 추천 학습</div>
              <div className="text-sm opacity-90">매일 새로운 학습 내용을 추천해드립니다</div>
            </div>
          </Button>

          <Button
            onClick={() => navigate(paths.customLearning)}
            className="w-full h-48 bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg rounded-3xl"
          >
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">맞춤 학습</div>
              <div className="text-sm opacity-90">나에게 맞는 학습 계획을 설정하세요</div>
            </div>
          </Button>
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
