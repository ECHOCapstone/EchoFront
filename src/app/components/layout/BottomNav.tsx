// 모든 메인 화면에서 공유하는 하단 네비게이션 바. active 탭만 sky 색으로 강조하고
// 그 외에는 회색 hover 처리. variant 로 노출할 탭 묶음을 결정한다.
//   - 'main'  : 홈/랭킹/통계/프로필 (메인 흐름) — 랭킹은 주간 발음 정확도 화면으로 바로 이동한다.
//   - 'study' : 홈/프로필 (학습 화면, 통계·랭킹 진입 차단)

import { useNavigate } from 'react-router';
import { Home, LineChart, Trophy, User } from 'lucide-react';
import { paths } from '../../lib/paths';

export type BottomNavTab = 'home' | 'challenge' | 'stats' | 'profile';
export type BottomNavVariant = 'main' | 'study';

interface BottomNavProps {
  active?: BottomNavTab;
  variant?: BottomNavVariant;
}

const VARIANT_TABS: Record<BottomNavVariant, BottomNavTab[]> = {
  main: ['home', 'challenge', 'stats', 'profile'],
  study: ['home', 'profile'],
};

const TAB_META: Record<BottomNavTab, { label: string; path: string; Icon: typeof Home }> = {
  home: { label: '홈', path: paths.main, Icon: Home },
  // 기존 "랭킹" 자리에 "오늘의 챌린지" 진입점. 아이콘은 Trophy 유지 (의미상 일관).
  challenge: { label: '챌린지', path: paths.challenge, Icon: Trophy },
  stats: { label: '통계', path: paths.stats, Icon: LineChart },
  profile: { label: '프로필', path: paths.profile, Icon: User },
};

export default function BottomNav({ active, variant = 'main' }: BottomNavProps) {
  const navigate = useNavigate();
  const tabs = VARIANT_TABS[variant];

  return (
    // 데스크톱에서는 폰 프레임 안쪽에 정확히 붙도록 left-1/2 + translate-x 로 가운데 정렬.
    // 모바일은 max-w-md 가 뷰포트보다 커서 w-full 그대로 화면 폭을 차지한다.
    // pb-[env(...)] : iOS 노치/홈 인디케이터 영역만큼 하단 패딩을 자동으로 확보해 탭 라벨이 가려지지 않게 한다.
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-center h-20">
        {tabs.map((tab) => {
          const { label, path, Icon } = TAB_META[tab];
          const isActive = tab === active;
          return (
            <button
              key={tab}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-brand-500' : 'text-gray-400 hover:text-brand-500'
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
