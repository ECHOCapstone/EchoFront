// 한 트랙의 챕터(스크립트) 관리. 목록 + ScriptForm 으로 생성/수정. 삭제 포함.

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { adminApi, type ScriptDetail, type ScriptSummary, type TrackSummary } from '../../api';
import { useApiResource } from '../../hooks/useApiResource';
import { notifyApiError } from '../../lib/notify';
import ScriptForm from './ScriptForm';

export default function ScriptManager({
  track,
  onBack,
}: {
  track: TrackSummary;
  onBack: () => void;
}) {
  const { data, loading, error, setData } = useApiResource(
    () => adminApi.listScripts(track.id),
    [track.id],
    { errorFallback: '스크립트를 불러오지 못했습니다.', initialData: [] }
  );
  const scripts = data ?? [];

  // null = 폼 닫힘, 'new' = 생성, ScriptDetail = 수정(상세 로드됨).
  const [editing, setEditing] = useState<'new' | ScriptDetail | null>(null);
  const [opening, setOpening] = useState(false);

  const openEdit = async (id: number) => {
    if (opening) return;
    setOpening(true);
    try {
      setEditing(await adminApi.getScript(id));
    } catch (err) {
      notifyApiError(err, '스크립트를 불러오지 못했습니다.');
    } finally {
      setOpening(false);
    }
  };

  const handleSaved = (saved: ScriptDetail) => {
    const summary: ScriptSummary = {
      id: saved.id,
      title: saved.title,
      difficulty: saved.difficulty,
      isPreset: saved.isPreset,
    };
    setData((prev) => {
      const list = prev ?? [];
      return list.some((s) => s.id === summary.id)
        ? list.map((s) => (s.id === summary.id ? summary : s))
        : [...list, summary];
    });
    setEditing(null);
  };

  const handleDelete = async (script: ScriptSummary) => {
    if (!confirm(`"${script.title}" 스크립트를 삭제하시겠습니까?`)) return;
    try {
      await adminApi.deleteScript(script.id);
      setData((prev) => (prev ?? []).filter((s) => s.id !== script.id));
      toast.success('스크립트를 삭제했습니다.');
    } catch (err) {
      notifyApiError(err, '스크립트 삭제에 실패했습니다.');
    }
  };

  if (editing !== null) {
    return (
      <ScriptForm
        trackId={track.id}
        initial={editing === 'new' ? null : editing}
        onCancel={() => setEditing(null)}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          aria-label="트랙 목록"
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1 truncate">{track.title}</h2>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1 h-9 px-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} /> 추가
        </button>
      </div>

      {(loading || opening) && <p className="text-gray-500">불러오는 중...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="space-y-2">
        {!loading && scripts.length === 0 && (
          <p className="text-gray-500 text-sm">아직 스크립트가 없습니다. 추가 버튼을 눌러 보세요.</p>
        )}
        {scripts.map((script) => (
          <div key={script.id} className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{script.title}</p>
              <p className="text-xs text-gray-500">{script.difficulty ?? '난이도 미지정'}</p>
            </div>
            <button
              onClick={() => openEdit(script.id)}
              aria-label={`${script.title} 수정`}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Pencil size={16} className="text-gray-600" />
            </button>
            <button
              onClick={() => handleDelete(script)}
              aria-label={`${script.title} 삭제`}
              className="p-2 hover:bg-red-50 rounded-full transition-colors"
            >
              <Trash2 size={16} className="text-red-400" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
