import { useNavigate } from 'react-router';
import { Flame, Zap } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { paths } from '../lib/paths';

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

  const goStats = () => navigate(paths.stats);

  return (
    <div className="flex items-center justify-end gap-2 mb-4">
      <button
        onClick={goStats}
        className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 rounded-full transition-colors"
      >
        <Flame size={20} className="text-orange-500" />
        <span className="text-sm font-medium text-gray-900">
          연속 출석 {streakValue}일!
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
