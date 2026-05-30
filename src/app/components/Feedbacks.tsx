import { useNavigate } from 'react-router';
import { ArrowLeft, Check } from 'lucide-react';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import FeedbackFlow from './FeedbackFlow';
import { feedbackApi } from '../api';
import { useApiResource } from '../hooks/useApiResource';

// 가장 최근 종합 피드백을 받아 그대로 보여준다. 백엔드의 /api/feedbacks 목록 중 첫 항목을 detail 로 다시 조회한다.
async function fetchLatestFeedback() {
  const list = await feedbackApi.list();
  if (list.length === 0) return null;
  return feedbackApi.get(list[0].id);
}

export default function Feedbacks() {
  const navigate = useNavigate();
  const { data: feedback, loading, error } = useApiResource(
    fetchLatestFeedback,
    [],
    { errorFallback: '피드백을 불러오지 못했습니다.' }
  );

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto md:shadow-xl flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex justify-start mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center">
            <Check size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Feedbacks</h1>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-gray-500">불러오는 중...</p>}
          {!loading && error && <p className="text-red-500">{error}</p>}
          {!loading && !error && !feedback && (
            <p className="text-gray-500">아직 피드백이 없습니다. 학습을 먼저 진행해 보세요.</p>
          )}
          {/* 이미 완료된 피드백을 다시 보는 화면이라 EXP 가산 버튼은 숨긴다. */}
          {feedback && <FeedbackFlow feedback={feedback} allowCompletion={false} />}
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
