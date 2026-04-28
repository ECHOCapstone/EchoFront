import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Home, LineChart, User, Flame, Star } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import { ApiException, scriptsApi, type ScriptSummary } from '../api';

export default function RecommendedLearning() {
  const navigate = useNavigate();
  const [units, setUnits] = useState<ScriptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    scriptsApi
      .recommendedToday()
      .then((data) => {
        if (!cancelled) {
          setUnits(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiException ? err.message : '추천 학습을 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnitClick = (unit: ScriptSummary) => {
    navigate(`/pronunciation-practice?scriptId=${unit.id}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex items-center gap-3 mb-8">
          <Flame size={32} className="text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-900">오늘의 추천 학습</h1>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-gray-500">불러오는 중...</p>}
          {!loading && error && <p className="text-red-500">{error}</p>}
          {!loading && !error && units.length === 0 && (
            <p className="text-gray-500">오늘은 추천 학습이 없습니다.</p>
          )}
          {!loading && !error && units.map((unit) => (
            <Button
              key={unit.id}
              onClick={() => handleUnitClick(unit)}
              variant="outline"
              className="w-full h-24 border-2 border-gray-300 hover:border-sky-500 hover:bg-sky-50 text-gray-900 rounded-2xl flex items-center justify-start px-6"
            >
              <div className="text-left flex items-center gap-3">
                <Star size={24} className="text-sky-500" />
                <div>
                  <h3 className="text-xl font-bold mb-1">{unit.title}</h3>
                  <p className="text-sm text-gray-600">난이도: {unit.difficulty}</p>
                </div>
              </div>
            </Button>
          ))}
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
