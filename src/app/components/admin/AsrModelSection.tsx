// 음소인식 모델 선택 섹션. 백엔드 /api/admin/model-server 의 현재값과 후보를 받아
// 드롭다운으로 바꾸고 저장한다. 후보는 모델 서버가 떠 있을 때만 내려오며(serverAvailable),
// 선택한 모델은 백엔드가 /analyze 호출 시 model 파라미터로 함께 보낸다(요청 시 교체 로드).

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { useApiResource } from '../../hooks/useApiResource';
import { notifyApiError } from '../../lib/notify';

export default function AsrModelSection() {
  const { data, loading, error, setData } = useApiResource(
    () => adminApi.getModelServerConfig(),
    [],
    { errorFallback: '음소인식 모델 설정을 불러오지 못했습니다.' }
  );

  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);

  // 응답이 도착하면 폼을 현재 적용값으로 초기화한다.
  useEffect(() => {
    if (data) {
      setModel(data.selected);
    }
  }, [data]);

  const handleSave = async () => {
    if (saving || !model) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateModelServerConfig(model);
      setData(updated);
      setModel(updated.selected);
      toast.success('음소인식 모델을 저장했습니다.');
    } catch (err) {
      notifyApiError(err, '음소인식 모델 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-1">음소인식 모델</h2>
      <p className="text-sm text-gray-500 mb-4">발음을 음소로 인식할 모델을 선택합니다.</p>

      {loading && <p className="text-gray-500">불러오는 중...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {data && !data.serverAvailable && (
        <p className="text-amber-600 text-sm mb-3">
          모델 서버에 연결할 수 없어 후보를 불러오지 못했습니다. 모델 서버 기동 후 다시 시도하세요.
          {data.selected && <> (저장된 선택값: <span className="font-medium">{data.selected}</span>)</>}
        </p>
      )}

      {data && data.serverAvailable && (
        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">모델</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full h-11 px-3 border-2 border-gray-300 rounded-xl focus:border-brand-500 bg-white"
            >
              {data.options.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.type})
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={handleSave}
            disabled={saving || !model}
            className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      )}
    </section>
  );
}
