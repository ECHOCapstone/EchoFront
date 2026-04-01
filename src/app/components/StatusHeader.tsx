import { useNavigate, useLocation } from 'react-router';
import { Flame, Zap } from 'lucide-react';

interface StatusHeaderProps {
  streak?: number;
  exp?: number;
}

export default function StatusHeader({ streak = 0, exp = 0 }: StatusHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const nickname = location.state?.nickname || '사용자';

  const handleNavigateToStats = () => {
    navigate('/stats', { state: { nickname } });
  };

  return (
    <div className="flex items-center justify-end gap-2 mb-4">
      {/* 연속 출석 버튼 */}
      <button
        onClick={handleNavigateToStats}
        className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 rounded-full transition-colors"
      >
        <Flame size={20} className="text-orange-500" />
        <span className="text-sm font-medium text-gray-900">
          연속 출석 {streak}일!
        </span>
      </button>

      {/* 경험치 버튼 */}
      <button
        onClick={handleNavigateToStats}
        className="flex items-center gap-2 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 rounded-full transition-colors"
      >
        <Zap size={20} className="text-yellow-500" />
        <span className="text-sm font-medium text-gray-900">
          EXP {exp}
        </span>
      </button>
    </div>
  );
}
