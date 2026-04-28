import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Home, LineChart, User, Volume2, CirclePlus } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import { ApiException, sessionsApi, type Session } from '../api';

export default function CustomLearning() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    sessionsApi
      .list()
      .then((data) => !cancelled && setSessions(data))
      .catch((err: unknown) => {
        if (!cancelled) {
          alert(err instanceof ApiException ? err.message : '세션을 불러오지 못했습니다.');
        }
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
      navigate(`/session-detail?sessionId=${created.id}`);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : '세션 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex items-center gap-3 mb-8">
          <Volume2 size={32} className="text-sky-500" />
          <h1 className="text-3xl font-bold text-gray-900">내 학습 목록</h1>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-gray-500">불러오는 중...</p>}
          {!loading && sessions.length === 0 && (
            <p className="text-gray-500">아직 만든 세션이 없습니다.</p>
          )}
          {sessions.map((s) => (
            <Button
              key={s.id}
              onClick={() => navigate(`/session-detail?sessionId=${s.id}`)}
              variant="outline"
              className="w-full h-16 border-2 border-gray-300 hover:border-sky-500 hover:bg-sky-50 text-gray-900 text-lg font-medium rounded-2xl"
            >
              {s.title}
            </Button>
          ))}

          <button
            onClick={handleAddSession}
            disabled={creating}
            className="w-full h-16 flex items-center justify-center text-sky-500 hover:bg-sky-50 rounded-2xl transition-colors disabled:opacity-50"
          >
            <CirclePlus size={40} strokeWidth={2} />
          </button>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-20">
          <button
            onClick={() => navigate('/main')}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-sky-500 transition-colors"
          >
            <Home size={28} />
            <span className="text-xs font-medium mt-1">홈</span>
          </button>
          <button
            onClick={() => navigate('/stats')}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-sky-500 transition-colors"
          >
            <LineChart size={28} />
            <span className="text-xs font-medium mt-1">통계</span>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-sky-500 transition-colors"
          >
            <User size={28} />
            <span className="text-xs font-medium mt-1">프로필</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
