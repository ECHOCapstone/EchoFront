// 약관 관리 탭. 종류별 본문을 어드민이 직접 편집하고 PUT 으로 영구 저장된다.
// 본문은 마크다운 평문이며, 회원가입 폼의 TermsModal 이 그대로 noopener 렌더한다.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import {
  adminApi,
  type LegalTermsCatalog,
  type LegalTermsEntry,
} from '../../api';
import { useApiResource } from '../../hooks/useApiResource';
import { notifyApiError } from '../../lib/notify';
import { useConfirm } from '../ConfirmProvider';

const EMPTY_CATALOG: LegalTermsCatalog = {
  version: '',
  entries: [],
  seedStatus: { exists: false, lastModified: null, path: '' },
};

export default function LegalManager() {
  const { data, loading, error, setData } = useApiResource(
    () => adminApi.listLegalTerms(),
    [],
    { errorFallback: '약관을 불러오지 못했습니다.', initialData: EMPTY_CATALOG }
  );
  const catalog = data ?? EMPTY_CATALOG;
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const confirm = useConfirm();

  // 카탈로그가 들어오면 첫 항목을 자동 선택. 사용자가 다른 항목을 골랐으면 그대로 둔다.
  useEffect(() => {
    if (selectedKind === null && catalog.entries.length > 0) {
      setSelectedKind(catalog.entries[0].kind);
    }
  }, [catalog.entries, selectedKind]);

  const selected = catalog.entries.find((e) => e.kind === selectedKind) ?? null;

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="mb-4 space-y-2">
        <h2 className="text-lg font-bold text-gray-900">약관</h2>
        <p className="text-sm text-gray-500">
          이용약관 / 개인정보처리방침 본문을 직접 편집합니다. 저장하면 외부 파일로 영구 저장되어 다음 부팅 후에도 유지됩니다.
        </p>
        <p className="text-xs text-gray-400">현재 버전 v{catalog.version}</p>
      </div>

      {loading && <p className="text-gray-500">불러오는 중...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="space-y-2 mb-4">
        {catalog.entries.map((entry) => (
          <button
            key={entry.kind}
            type="button"
            onClick={() => setSelectedKind(entry.kind)}
            className={`w-full flex items-center gap-2 p-3 border-2 rounded-xl text-left transition-colors ${
              selectedKind === entry.kind
                ? 'border-brand-500 bg-brand-50'
                : 'border-gray-200 hover:border-brand-300'
            }`}
          >
            <span className="flex-1 font-medium text-gray-900">{entry.label}</span>
            {entry.overridden && (
              <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full flex-shrink-0">
                재정의됨
              </span>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <LegalTermsEditor
          entry={selected}
          confirm={confirm}
          onSaved={(updated) => {
            setData((prev) => ({
              version: prev?.version ?? catalog.version,
              entries: (prev?.entries ?? []).map((e) => (e.kind === updated.kind ? updated : e)),
              seedStatus: prev?.seedStatus ?? catalog.seedStatus,
            }));
          }}
        />
      )}
    </section>
  );
}

interface EditorProps {
  entry: LegalTermsEntry;
  onSaved: (updated: LegalTermsEntry) => void;
  confirm: ReturnType<typeof useConfirm>;
}

function LegalTermsEditor({ entry, onSaved, confirm }: EditorProps) {
  // entry 가 바뀌면 편집창도 새 본문으로 다시 채운다.
  const [body, setBody] = useState(entry.body);
  const [busy, setBusy] = useState(false);
  const dirty = body !== entry.body;

  useEffect(() => {
    setBody(entry.body);
  }, [entry.body]);

  const handleSave = async () => {
    if (busy || !dirty || !body.trim()) return;
    setBusy(true);
    try {
      const updated = await adminApi.updateLegalTerm(entry.kind, body);
      onSaved(updated);
      toast.success(`${entry.label} 본문을 저장했습니다.`);
    } catch (err) {
      notifyApiError(err, '약관 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (busy) return;
    const ok = await confirm({
      title: '공장 기본값 복원',
      description: `"${entry.label}" 본문을 공장 기본값으로 되돌립니다. 어드민이 영구 저장한 본문은 사라지며 같은 버전의 .bak 파일로 보존됩니다.`,
      confirmLabel: '복원',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const updated = await adminApi.resetLegalTerm(entry.kind);
      onSaved(updated);
      toast.success(`${entry.label} 본문을 공장 기본값으로 되돌렸습니다.`);
    } catch (err) {
      notifyApiError(err, '약관 복원에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 border-t-2 border-gray-100 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">{entry.label}</h3>
        <button
          type="button"
          onClick={handleReset}
          disabled={busy || !entry.overridden}
          title={entry.overridden ? '공장 기본값으로 되돌리기' : '이미 공장 기본값입니다'}
          className="flex items-center gap-1 px-3 h-9 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RotateCcw size={14} />
          기본값
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full h-80 p-3 border-2 border-gray-300 rounded-lg focus:border-brand-500 bg-white text-sm font-mono leading-relaxed resize-y"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !dirty || !body.trim()}
          className="flex-1 h-11 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
        >
          {busy ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
