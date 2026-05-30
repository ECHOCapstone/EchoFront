// 학습 트랙 관리 섹션. 목록 조회 + 생성/수정(인라인 폼) + 삭제.
// 삭제는 백엔드가 챕터(스크립트)가 연결된 트랙을 막으므로, 그 경우 409 메시지를 토스트로 보여준다.

import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { adminApi, type TrackInput, type TrackSummary } from '../../api';
import { useApiResource } from '../../hooks/useApiResource';
import { notifyApiError } from '../../lib/notify';

const EMPTY_FORM: TrackInput = { title: '', description: '', displayOrder: 0 };

export default function TrackManager({
  onManageScripts,
}: {
  onManageScripts: (track: TrackSummary) => void;
}) {
  const { data, loading, error, setData } = useApiResource(
    () => adminApi.listTracks(),
    [],
    { errorFallback: '트랙을 불러오지 못했습니다.', initialData: [] }
  );
  const tracks = data ?? [];

  // null = 폼 닫힘, 'new' = 생성, number = 해당 트랙 수정.
  const [editing, setEditing] = useState<'new' | number | null>(null);
  const [form, setForm] = useState<TrackInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing('new');
  };

  const openEdit = (track: TrackSummary) => {
    setForm({ title: track.title, description: track.description ?? '', displayOrder: track.displayOrder });
    setEditing(track.id);
  };

  const handleSave = async () => {
    if (saving || !form.title.trim()) return;
    setSaving(true);
    try {
      if (editing === 'new') {
        const created = await adminApi.createTrack(form);
        setData((prev) => [...(prev ?? []), created]);
        toast.success('트랙을 추가했습니다.');
      } else if (typeof editing === 'number') {
        const updated = await adminApi.updateTrack(editing, form);
        setData((prev) => (prev ?? []).map((t) => (t.id === updated.id ? updated : t)));
        toast.success('트랙을 수정했습니다.');
      }
      setEditing(null);
    } catch (err) {
      notifyApiError(err, '트랙 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (track: TrackSummary) => {
    if (!confirm(`"${track.title}" 트랙을 삭제하시겠습니까?`)) return;
    try {
      await adminApi.deleteTrack(track.id);
      setData((prev) => (prev ?? []).filter((t) => t.id !== track.id));
      toast.success('트랙을 삭제했습니다.');
    } catch (err) {
      notifyApiError(err, '트랙 삭제에 실패했습니다.');
    }
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">학습 트랙</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 h-9 px-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} /> 추가
        </button>
      </div>

      {loading && <p className="text-gray-500">불러오는 중...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {editing !== null && (
        <div className="mb-4 p-4 bg-brand-50 rounded-xl space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="트랙 제목"
            className="w-full h-10 px-3 border-2 border-gray-300 rounded-lg focus:border-brand-500 bg-white"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="설명 (선택)"
            className="w-full h-20 p-3 border-2 border-gray-300 rounded-lg focus:border-brand-500 bg-white resize-none"
          />
          <label className="block text-sm text-gray-600">
            정렬 순서
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              className="w-full h-10 px-3 mt-1 border-2 border-gray-300 rounded-lg focus:border-brand-500 bg-white"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="flex-1 h-10 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="flex-1 h-10 bg-white border-2 border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {!loading && tracks.length === 0 && (
          <p className="text-gray-500 text-sm">아직 트랙이 없습니다. 우측 상단 추가 버튼을 눌러 보세요.</p>
        )}
        {tracks.map((track) => (
          <div key={track.id} className="flex items-center gap-1 p-3 border-2 border-gray-200 rounded-xl">
            <button
              onClick={() => onManageScripts(track)}
              className="flex-1 min-w-0 text-left"
              aria-label={`${track.title} 챕터 관리`}
            >
              <p className="font-medium text-gray-900 truncate flex items-center gap-1">
                {track.title}
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </p>
              <p className="text-xs text-gray-500">챕터 {track.chapterCount}개 · 순서 {track.displayOrder}</p>
            </button>
            <button
              onClick={() => openEdit(track)}
              aria-label={`${track.title} 수정`}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Pencil size={16} className="text-gray-600" />
            </button>
            <button
              onClick={() => handleDelete(track)}
              aria-label={`${track.title} 삭제`}
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
