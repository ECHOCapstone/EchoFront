// 피드백 LLM provider / model 선택 섹션. 백엔드 /api/admin/llm 의 현재값과 후보를 받아
// 드롭다운으로 바꾸고 저장한다. gemini 는 API 키가 설정된 경우(geminiAvailable)에만 고를 수 있다.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { useApiResource } from '../../hooks/useApiResource';
import { notifyApiError } from '../../lib/notify';

const PROVIDER_LABELS: Record<string, string> = {
  'rule-based': '규칙 기반 (외부 호출 없음)',
  gemini: 'Gemini',
};

export default function LlmSettingsSection() {
  const { data, loading, error, setData } = useApiResource(
    () => adminApi.getLlmConfig(),
    [],
    { errorFallback: 'LLM 설정을 불러오지 못했습니다.' }
  );

  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);

  // 응답이 도착하면 폼을 현재 적용값으로 초기화한다.
  useEffect(() => {
    if (data) {
      setProvider(data.provider);
      setModel(data.model);
    }
  }, [data]);

  const isGemini = provider === 'gemini';

  const handleSave = async () => {
    if (saving || !provider) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateLlmConfig(provider, isGemini ? model : undefined);
      setData(updated);
      setProvider(updated.provider);
      setModel(updated.model);
      toast.success('LLM 설정을 저장했습니다.');
    } catch (err) {
      notifyApiError(err, 'LLM 설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-1">피드백 LLM</h2>
      <p className="text-sm text-gray-500 mb-4">발음 피드백을 생성할 모델을 선택합니다.</p>

      {loading && <p className="text-gray-500">불러오는 중...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {data && (
        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">제공자</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full h-11 px-3 border-2 border-gray-300 rounded-xl focus:border-brand-500 bg-white"
            >
              {data.providerOptions.map((p) => (
                <option key={p} value={p} disabled={p === 'gemini' && !data.geminiAvailable}>
                  {PROVIDER_LABELS[p] ?? p}
                  {p === 'gemini' && !data.geminiAvailable ? ' — API 키 미설정' : ''}
                </option>
              ))}
            </select>
          </label>

          {isGemini && (
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">모델</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-11 px-3 border-2 border-gray-300 rounded-xl focus:border-brand-500 bg-white"
              >
                {data.modelOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      )}
    </section>
  );
}
