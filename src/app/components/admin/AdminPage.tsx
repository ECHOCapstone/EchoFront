// 관리자 대시보드. AdminRoute 가 ADMIN 권한을 보장한 뒤 진입한다.
// 섹션(피드백 LLM 등)을 카드로 나열하며, 이후 콘텐츠·음소 이미지·프롬프트 섹션이 여기에 추가된다.

import { useNavigate } from 'react-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { paths } from '../../lib/paths';
import LlmSettingsSection from './LlmSettingsSection';

export default function AdminPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto md:shadow-xl flex flex-col">
      <div className="flex-1 p-6">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate(paths.main)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <ShieldCheck size={24} className="text-brand-500" />
          <h1 className="text-2xl font-bold text-gray-900">관리자</h1>
        </div>

        <div className="space-y-6">
          <LlmSettingsSection />
        </div>
      </div>
    </div>
  );
}
