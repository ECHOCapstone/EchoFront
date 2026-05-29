import type { ReactNode } from 'react';
import booAvatar from '@/assets/boo-pic/BOO9-1.png';

// 봇 말풍선 — 왼쪽 정렬 + 코치 아바타 + 꼬리. 아바타는 발음 코치 캐릭터(BOO).
export function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#DFEEFF] to-[#C0DFFF] border border-[#C0DFFF] flex-shrink-0 flex items-center justify-center overflow-hidden">
        <img src={booAvatar} alt="코치" className="w-full h-full object-contain" />
      </div>

      <div className="relative flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ml-2">
        {/* 말풍선 꼬리 (테두리용 바깥 삼각형) */}
        <span
          className="absolute top-3 -left-2 w-0 h-0
                     border-t-[8px] border-t-transparent
                     border-b-[8px] border-b-transparent
                     border-r-[9px] border-r-gray-200"
        />
        {/* 말풍선 꼬리 (내부 흰색 삼각형) */}
        <span
          className="absolute top-3 -left-[7px] w-0 h-0
                     border-t-[7px] border-t-transparent
                     border-b-[7px] border-b-transparent
                     border-r-[8px] border-r-white"
        />
        {children}
      </div>
    </div>
  );
}

// 사용자 말풍선 — 오른쪽 정렬 + 꼬리.
export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="relative max-w-[75%] bg-[#77B5FE] text-white rounded-2xl px-4 py-3 shadow-sm mr-2">
        <span
          className="absolute top-3 -right-2 w-0 h-0
                     border-t-[8px] border-t-transparent
                     border-b-[8px] border-b-transparent
                     border-l-[9px] border-l-[#77B5FE]"
        />
        <p className="text-base font-medium">{children}</p>
      </div>
    </div>
  );
}
