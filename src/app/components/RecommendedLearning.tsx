import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Flame, Star } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { scriptsApi, type ScriptSummary } from '../api';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

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
        if (cancelled) return;
        setUnits(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '추천 학습을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
              onClick={() => navigate(paths.pronunciationPractice(unit.id))}
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

      <BottomNav active="home" />
    </div>
  );
}
