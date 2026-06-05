// LLM 프롬프트 관리 섹션. 목록에서 하나를 골라 본문을 편집(재정의)하거나 기본값으로 되돌린다.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { adminApi, type Prompt, type SeedFileStatus } from '../../api';
import { useApiResource } from '../../hooks/useApiResource';
import { notifyApiError } from '../../lib/notify';
import { useConfirm } from '../ConfirmProvider';
import SeedPersistActions from './SeedPersistActions';

export default function PromptManager() {
  const { data, loading, error, setData } = useApiResource(
    () => adminApi.listPrompts(),
    [],
    { errorFallback: '프롬프트를 불러오지 못했습니다.', initialData: [] }
  );
  const prompts = data ?? [];
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [seedStatus, setSeedStatus] = useState<SeedFileStatus | null>(null);

  useEffect(() => {
    adminApi.getPromptsSeedInfo().then(setSeedStatus).catch(() => setSeedStatus(null));
  }, []);

  const handleResetAll = async () => {
    const restored = await adminApi.resetPromptsToDefaults();
    setData(() => restored);
    setSelected(null);
    toast.success('모든 프롬프트를 기본값으로 되돌렸습니다.');
    return await adminApi.getPromptsSeedInfo();
  };

  const applyUpdate = (updated: Prompt) => {
    setData((prev) => (prev ?? []).map((p) => (p.key === updated.key ? updated : p)));
    setSelected(updated);
  };

  if (selected) {
    return <PromptEditor prompt={selected} onBack={() => setSelected(null)} onSaved={applyUpdate} />;
  }

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="mb-4 space-y-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">프롬프트</h2>
          <p className="text-sm text-gray-500">피드백 생성에 쓰는 LLM 프롬프트를 편집합니다.</p>
        </div>
        <SeedPersistActions
          status={seedStatus}
          reset={handleResetAll}
          resetConfirmMessage="모든 프롬프트의 편집본을 지우고 공장 기본값으로 되돌립니다. 진행하시겠습니까?"
          resetLabel="모두 기본값으로"
          onStatusChange={setSeedStatus}
        />
      </div>

      {loading && <p className="text-gray-500">불러오는 중...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="space-y-2">
        {prompts.map((prompt) => (
          <button
            key={prompt.key}
            onClick={() => setSelected(prompt)}
            className="w-full flex items-center gap-2 p-3 border-2 border-gray-200 rounded-xl hover:border-brand-300 text-left transition-colors"
          >
            <span className="flex-1 font-medium text-gray-900 truncate">{prompt.key}</span>
            {prompt.overridden && (
              <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full flex-shrink-0">
                재정의됨
              </span>
            )}
            <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>
    </section>
  );
}

function PromptEditor({
  prompt,
  onBack,
  onSaved,
}: {
  prompt: Prompt;
  onBack: () => void;
  onSaved: (prompt: Prompt) => void;
}) {
  const confirm = useConfirm();
  const [content, setContent] = useState(prompt.content);
  const [busy, setBusy] = useState(false);
  const dirty = content !== prompt.content;

  const handleSave = async () => {
    if (busy || !dirty || !content.trim()) return;
    setBusy(true);
    try {
      onSaved(await adminApi.updatePrompt(prompt.key, content));
      toast.success('프롬프트를 저장했습니다.');
    } catch (err) {
      notifyApiError(err, '프롬프트 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (busy) return;
    const ok = await confirm({
      title: '기본값으로 되돌리기',
      description: '기본값으로 되돌리시겠습니까? 재정의한 내용이 사라집니다.',
      confirmLabel: '되돌리기',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const reset = await adminApi.resetPrompt(prompt.key);
      setContent(reset.content);
      onSaved(reset);
      toast.success('기본값으로 되돌렸습니다.');
    } catch (err) {
      notifyApiError(err, '초기화에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          aria-label="프롬프트 목록"
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1 truncate">{prompt.key}</h2>
        {prompt.overridden && (
          <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full flex-shrink-0">
            재정의됨
          </span>
        )}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-80 p-3 border-2 border-gray-300 rounded-lg focus:border-brand-500 font-mono text-xs resize-none"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={busy || !dirty || !content.trim()}
          className="flex-1 h-11 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl disabled:opacity-50 transition-colors"
        >
          {busy ? '처리 중...' : '저장'}
        </button>
        <button
          onClick={handleReset}
          disabled={busy || !prompt.overridden}
          className="flex-1 h-11 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          기본값으로
        </button>
      </div>
    </section>
  );
}
