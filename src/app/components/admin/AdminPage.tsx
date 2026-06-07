// 관리자 대시보드. AdminRoute 가 ADMIN 권한을 보장한 뒤 진입한다.
// 상단 탭으로 섹션을 전환한다. 이후 음소 이미지·프롬프트 등 탭이 여기에 추가된다.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { paths } from '../../lib/paths';
import LlmSettingsSection from './LlmSettingsSection';
import AsrModelSection from './AsrModelSection';
import BadgeManager from './BadgeManager';
import ContentSection from './ContentSection';
import LegalManager from './LegalManager';
import PromptManager from './PromptManager';
import PhonemeManager from './PhonemeManager';
import SettingsManager from './SettingsManager';
import SystemStatusSection from './SystemStatusSection';

type TabKey =
  | 'content'
  | 'llm'
  | 'prompt'
  | 'phoneme'
  | 'settings'
  | 'badge'
  | 'legal'
  | 'system';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'content', label: '콘텐츠' },
  { key: 'llm', label: '모델' },
  { key: 'prompt', label: '프롬프트' },
  { key: 'phoneme', label: '음소' },
  { key: 'settings', label: '설정' },
  { key: 'badge', label: '배지' },
  { key: 'legal', label: '약관' },
  { key: 'system', label: '상태' },
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

        {/* 탭이 8 개라 grid-cols-4 가 2 행으로 깔끔하게 차오른다 — cols-3 은 마지막 행에 2 개만 남아 정렬이 깨졌다. */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`h-10 rounded-xl text-sm font-medium transition-colors ${
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
          {tab === 'content' && <ContentSection />}
          {tab === 'llm' && (
            <>
              <LlmSettingsSection />
              <AsrModelSection />
            </>
          )}
          {tab === 'prompt' && <PromptManager />}
          {tab === 'phoneme' && <PhonemeManager />}
          {tab === 'settings' && <SettingsManager />}
          {tab === 'badge' && <BadgeManager />}
          {tab === 'legal' && <LegalManager />}
          {tab === 'system' && <SystemStatusSection />}
        </div>
      </div>
    </div>
  );
}
