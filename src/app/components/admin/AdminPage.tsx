// 관리자 대시보드. AdminRoute 가 ADMIN 권한을 보장한 뒤 진입한다.
// 상단 탭으로 섹션을 전환한다. 이후 음소 이미지·프롬프트 등 탭이 여기에 추가된다.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { paths } from '../../lib/paths';
import LlmSettingsSection from './LlmSettingsSection';
import TrackManager from './TrackManager';

type TabKey = 'content' | 'llm';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'content', label: '콘텐츠' },
  { key: 'llm', label: 'LLM' },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('content');

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

        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 h-10 rounded-xl text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-brand-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {tab === 'content' && <TrackManager />}
          {tab === 'llm' && <LlmSettingsSection />}
        </div>
      </div>
    </div>
  );
}
