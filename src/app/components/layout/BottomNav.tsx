// 모든 메인 화면에서 공유하는 하단 네비게이션 바. active 탭만 sky 색으로 강조하고
// 그 외에는 회색 hover 처리. variant 로 노출할 탭 묶음을 결정한다.
//   - 'main'  : 홈/통계/프로필 (메인 흐름)
//   - 'study' : 홈/프로필 (학습 화면, 통계 진입 차단)

import { useNavigate } from 'react-router';
import { Home, LineChart, User } from 'lucide-react';
import { paths } from '../../lib/paths';

export type BottomNavTab = 'home' | 'stats' | 'profile';
export type BottomNavVariant = 'main' | 'study';

interface BottomNavProps {
  active?: BottomNavTab;
  variant?: BottomNavVariant;
}

const VARIANT_TABS: Record<BottomNavVariant, BottomNavTab[]> = {
  main: ['home', 'stats', 'profile'],
  study: ['home', 'profile'],
};

const TAB_META: Record<BottomNavTab, { label: string; path: string; Icon: typeof Home }> = {
  home: { label: '홈', path: paths.main, Icon: Home },
  stats: { label: '통계', path: paths.stats, Icon: LineChart },
  profile: { label: '프로필', path: paths.profile, Icon: User },
};

export default function BottomNav({ active, variant = 'main' }: BottomNavProps) {
  const navigate = useNavigate();
  const tabs = VARIANT_TABS[variant];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center h-20">
        {tabs.map((tab) => {
          const { label, path, Icon } = TAB_META[tab];
          const isActive = tab === active;
          return (
            <button
              key={tab}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-sky-500' : 'text-gray-400 hover:text-sky-500'
              }`}
            >
              <Icon size={28} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium mt-1">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
