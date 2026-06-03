// 게임화 수치 / 메시지 설정 관리. 그룹별로 묶어 행마다 값을 편집(재정의)하거나 기본값으로 되돌린다.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { adminApi, type SeedFileStatus, type Setting } from '../../api';
import { useApiResource } from '../../hooks/useApiResource';
import { notifyApiError } from '../../lib/notify';
import SeedPersistActions from './SeedPersistActions';

// "gamification.passThreshold" → { group: "gamification", label: "passThreshold" }
function splitKey(key: string): { group: string; label: string } {
  const dot = key.indexOf('.');
  return dot < 0
    ? { group: '기타', label: key }
    : { group: key.slice(0, dot), label: key.slice(dot + 1) };
}

const GROUP_LABELS: Record<string, string> = {
  gamification: '게임화 수치',
  messages: '메시지',
};

export default function SettingsManager() {
  const { data, loading, error, setData } = useApiResource(
    () => adminApi.listSettings(),
    [],
    { errorFallback: '설정을 불러오지 못했습니다.', initialData: [] }
  );
  const settings = data ?? [];

  const apply = (updated: Setting) =>
    setData((prev) => (prev ?? []).map((s) => (s.key === updated.key ? updated : s)));

  const [seedStatus, setSeedStatus] = useState<SeedFileStatus | null>(null);

  useEffect(() => {
    adminApi.getSettingsSeedInfo().then(setSeedStatus).catch(() => setSeedStatus(null));
  }, []);

  const handlePersist = async () => {
    const next = await adminApi.persistSettings();
    toast.success('현재 설정 오버라이드를 영구 저장했습니다.');
    return next;
  };

  const handleReset = async () => {
    const next = await adminApi.resetSettingsToDefaults();
    const fresh = await adminApi.listSettings();
    setData(() => fresh);
    toast.success('설정을 yaml 기본값으로 되돌렸습니다.');
    return next;
  };

  const groups = useMemo(() => {
    const map = new Map<string, Setting[]>();
    for (const setting of settings) {
      const { group } = splitKey(setting.key);
      const list = map.get(group);
      if (list) list.push(setting);
      else map.set(group, [setting]);
    }
    return [...map.entries()];
  }, [settings]);

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">설정</h2>
          <p className="text-sm text-gray-500">
            게임화 수치와 안내 문구를 런타임에 바꿉니다. 영구 저장을 누르면 settings-overrides.yaml 에 기록되어 새 인스턴스에서도 같은 값으로 시작합니다.
          </p>
        </div>
        <SeedPersistActions
          status={seedStatus}
          persist={handlePersist}
          reset={handleReset}
          resetConfirmMessage="모든 오버라이드와 영구 저장본을 지우고 yaml 기본값으로 되돌립니다. 진행하시겠습니까?"
          onStatusChange={setSeedStatus}
        />
      </div>

      {loading && <p className="text-gray-500">불러오는 중...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="space-y-5">
        {groups.map(([group, items]) => (
          <div key={group}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{GROUP_LABELS[group] ?? group}</h3>
            <div className="space-y-2">
              {items.map((setting) => (
                <SettingRow key={setting.key} setting={setting} onSaved={apply} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingRow({ setting, onSaved }: { setting: Setting; onSaved: (s: Setting) => void }) {
  const [value, setValue] = useState(setting.value);
  const [busy, setBusy] = useState(false);
  const { label } = splitKey(setting.key);
  const dirty = value !== setting.value;
  const isNumber = setting.type === 'INT' || setting.type === 'DOUBLE';
  const isMessage = setting.type === 'STRING';

  const save = async () => {
    if (busy || !dirty || !value.trim()) return;
    setBusy(true);
    try {
      const updated = await adminApi.updateSetting(setting.key, value.trim());
      setValue(updated.value);
      onSaved(updated);
      toast.success('저장했습니다.');
    } catch (err) {
      notifyApiError(err, '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await adminApi.resetSetting(setting.key);
      setValue(updated.value);
      onSaved(updated);
      toast.success('기본값으로 되돌렸습니다.');
    } catch (err) {
      notifyApiError(err, '초기화에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-2 border-gray-200 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-sm text-gray-900 flex-1 truncate">{label}</span>
        {setting.overridden && (
          <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full flex-shrink-0">
            재정의됨
          </span>
        )}
      </div>
      <div className="flex gap-2 items-start">
        {isMessage ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 h-16 p-2 border-2 border-gray-300 rounded-lg focus:border-brand-500 text-sm resize-none"
          />
        ) : (
          <input
            type={isNumber ? 'number' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 h-9 px-2 border-2 border-gray-300 rounded-lg focus:border-brand-500 text-sm"
          />
        )}
        <button
          onClick={save}
          disabled={busy || !dirty || !value.trim()}
          className="h-9 px-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors flex-shrink-0"
        >
          저장
        </button>
        <button
          onClick={reset}
          disabled={busy || !setting.overridden}
          aria-label="기본값으로 초기화"
          className="h-9 w-9 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors flex-shrink-0"
        >
          <RotateCcw size={15} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
}
