// 음소 조음 이미지 관리. 음소 키 + 이미지 파일을 업로드해 등록/교체하고, 그리드에서 삭제한다.
// 등록된 이미지는 피드백의 조음 카드에 표시된다.

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';
import { adminApi, type PhonemeAsset } from '../../api';
import { useApiResource } from '../../hooks/useApiResource';
import { notifyApiError } from '../../lib/notify';
import { useConfirm } from '../ConfirmProvider';

export default function PhonemeManager() {
  const { data, loading, error, setData } = useApiResource(
    () => adminApi.listPhonemeAssets(),
    [],
    { errorFallback: '음소 이미지를 불러오지 못했습니다.', initialData: [] }
  );
  const confirm = useConfirm();
  const assets = data ?? [];

  const [phoneme, setPhoneme] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const key = phoneme.trim().toUpperCase();
    if (uploading || !key || !file) return;
    setUploading(true);
    try {
      const saved = await adminApi.uploadPhonemeImage(key, file);
      setData((prev) => {
        const list = prev ?? [];
        const next = list.some((a) => a.phoneme === saved.phoneme)
          ? list.map((a) => (a.phoneme === saved.phoneme ? saved : a))
          : [...list, saved];
        return [...next].sort((a, b) => a.phoneme.localeCompare(b.phoneme));
      });
      setPhoneme('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      toast.success(`${saved.phoneme} 이미지를 저장했습니다.`);
    } catch (err) {
      notifyApiError(err, '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (asset: PhonemeAsset) => {
    const ok = await confirm({
      title: '이미지 삭제',
      description: `${asset.phoneme} 음소 이미지를 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.deletePhonemeImage(asset.phoneme);
      setData((prev) => (prev ?? []).filter((a) => a.phoneme !== asset.phoneme));
      toast.success('삭제했습니다.');
    } catch (err) {
      notifyApiError(err, '삭제에 실패했습니다.');
    }
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-1">음소 이미지</h2>
      <p className="text-sm text-gray-500 mb-4">
        피드백 조음 카드에 쓰는 음소별 이미지입니다 (PNG/JPEG/WEBP/SVG).
      </p>

      <div className="mb-4 p-4 bg-brand-50 rounded-xl space-y-3">
        <input
          value={phoneme}
          onChange={(e) => setPhoneme(e.target.value.toUpperCase())}
          placeholder="음소 (예: R, AY, TH)"
          className="w-full h-10 px-3 border-2 border-gray-300 rounded-lg focus:border-brand-500 bg-white font-mono"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-600"
        />
        <button
          onClick={handleUpload}
          disabled={uploading || !phoneme.trim() || !file}
          className="w-full h-10 flex items-center justify-center gap-1 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
        >
          <Upload size={16} /> {uploading ? '업로드 중...' : '업로드'}
        </button>
      </div>

      {loading && <p className="text-gray-500">불러오는 중...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && assets.length === 0 && (
        <p className="text-gray-500 text-sm">아직 등록된 음소 이미지가 없습니다.</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {assets.map((asset) => (
          <div
            key={asset.phoneme}
            className="border-2 border-gray-200 rounded-xl p-2 flex flex-col items-center gap-1"
          >
            <img
              src={asset.imageUrl}
              alt={`${asset.phoneme} 조음`}
              className="w-full aspect-square object-contain rounded-lg bg-gray-50"
            />
            <div className="flex items-center justify-between w-full px-1">
              <span className="font-mono font-bold text-sm text-gray-900">{asset.phoneme}</span>
              <button
                onClick={() => handleDelete(asset)}
                aria-label={`${asset.phoneme} 삭제`}
                className="p-1 hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
