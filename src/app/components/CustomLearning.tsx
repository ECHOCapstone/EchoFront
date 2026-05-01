// 사용자 맞춤 세션 목록 + 신규 생성 + 삭제.
// (+) 버튼은 헤더 우측에 두어 목록이 길어져도 한 번에 누를 수 있다.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CirclePlus, Trash2, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { sessionsApi, type Session } from '../api';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

export default function CustomLearning() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    sessionsApi
      .list()
      .then((data) => !cancelled && setSessions(data))
      .catch((err: unknown) => {
        if (!cancelled) notifyApiError(err, '세션을 불러오지 못했습니다.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddSession = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const created = await sessionsApi.create('Untitled Session');
      navigate(paths.sessionDetail(created.id));
    } catch (err) {
      notifyApiError(err, '세션 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  // 카드 자체 클릭과 삭제 버튼 클릭이 겹치지 않도록 stopPropagation 으로 바깥 클릭을 차단한다.
  const handleDelete = async (event: React.MouseEvent, target: Session) => {
    event.stopPropagation();
    if (deletingId !== null) return;
    if (!confirm(`"${target.title}" 세션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    setDeletingId(target.id);
    try {
      await sessionsApi.delete(target.id);
      setSessions((prev) => prev.filter((s) => s.id !== target.id));
    } catch (err) {
      notifyApiError(err, '세션 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <Volume2 size={32} className="text-sky-500" />
            <h1 className="text-3xl font-bold text-gray-900">내 학습 목록</h1>
          </div>
          <button
            onClick={handleAddSession}
            disabled={creating}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 transition-colors"
            aria-label="새 학습 추가"
          >
            <CirclePlus size={26} strokeWidth={2.5} />
          </button>
        </div>

        <div className="space-y-3">
          {loading && <p className="text-gray-500">불러오는 중...</p>}
          {!loading && sessions.length === 0 && (
            <p className="text-gray-500">아직 만든 세션이 없습니다. 우측 상단 + 버튼을 눌러 시작해 보세요.</p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-stretch gap-2 border-2 border-gray-300 hover:border-sky-500 hover:bg-sky-50 rounded-2xl transition-colors"
            >
              <Button
                onClick={() => navigate(paths.sessionDetail(s.id))}
                variant="ghost"
                className="flex-1 h-16 justify-start text-gray-900 text-lg font-medium px-4 rounded-2xl bg-transparent hover:bg-transparent"
              >
                {s.title}
              </Button>
              <button
                onClick={(e) => handleDelete(e, s)}
                disabled={deletingId !== null}
                className="flex items-center justify-center w-12 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-r-2xl transition-colors disabled:opacity-50"
                aria-label={`${s.title} 삭제`}
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
