import { useNavigate } from 'react-router';
import { Flame, Zap } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { paths } from '../lib/paths';
import { levelInfo } from '../lib/leveling';

interface StatusHeaderProps {
  streak?: number;
  exp?: number;
}

// 사용자의 streak 와 exp 표시. props 가 명시되면 그 값을 우선 사용하고,
// 없으면 AuthContext 의 현재 user 값으로 폴백한다.
export default function StatusHeader({ streak, exp }: StatusHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const streakValue = streak ?? user?.streak ?? 0;
  const expValue = exp ?? user?.exp ?? 0;
  const lv = levelInfo(expValue);

  const goStats = () => navigate(paths.stats);

  return (
    <div className="flex items-center justify-end gap-2 mb-4 flex-wrap">
      <button
        onClick={goStats}
        className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 rounded-full transition-colors"
      >
        <Flame size={20} className="text-orange-500" />
        <span className="text-sm font-medium text-gray-900">
          연속 출석 {streakValue}일!
        </span>
      </button>

      {/* 레벨 배지 — EXP 에서 파생한 레벨과 현재 레벨 진행률을 함께 노출 */}
      <button
        onClick={goStats}
        className="flex items-center gap-2 px-3 py-2 bg-brand-50 hover:bg-brand-100 rounded-full transition-colors"
        title={`레벨 ${lv.level} · ${lv.current}/${lv.required} EXP`}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
          {lv.level}
        </span>
        <span className="flex flex-col items-start">
          <span className="text-[11px] font-bold leading-none text-brand-700">Lv {lv.level}</span>
          <span className="mt-1 h-1.5 w-14 overflow-hidden rounded-full bg-brand-100">
            <span
              className="block h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${Math.round(lv.ratio * 100)}%` }}
            />
          </span>
        </span>
      </button>

      <button
        onClick={goStats}
        className="flex items-center gap-2 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 rounded-full transition-colors"
      >
        <Zap size={20} className="text-yellow-500" />
        <span className="text-sm font-medium text-gray-900">
          EXP {expValue}
        </span>
      </button>
    </div>
  );
}
