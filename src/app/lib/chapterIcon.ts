// 챕터 제목을 보고 어울리는 아이콘 + 색을 고르는 매핑 (격자 테마용).
// 공항이면 비행기, 병원이면 병원, 긴급상황이면 느낌표(△!) … 식.
// 키워드 포함 검사로 가리며, 위에 있는 규칙이 우선한다. 못 맞추면 기본 아이콘.

import {
  AlertTriangle,
  Bus,
  CalendarCheck,
  Cloud,
  Coffee,
  GraduationCap,
  Hand,
  Hotel,
  Landmark,
  Library,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Pill,
  Plane,
  ShoppingBag,
  Stethoscope,
  Train,
  Utensils,
  type LucideIcon,
} from 'lucide-react';

export type ChapterVisual = {
  Icon: LucideIcon;
  // 아이콘 배경/전경 색 (tailwind 유틸).
  bg: string;
  fg: string;
};

type Rule = { keywords: string[]; visual: ChapterVisual };

// 위에서부터 먼저 맞는 규칙을 쓴다. 긴급/응급은 가장 먼저(다른 단어와 겹쳐도 우선).
const RULES: Rule[] = [
  { keywords: ['긴급', '응급', '위급', '사고', '비상', '119', '112'], visual: { Icon: AlertTriangle, bg: 'bg-red-100', fg: 'text-red-600' } },
  { keywords: ['공항', '비행', '항공', '입국', '출국', '면세'], visual: { Icon: Plane, bg: 'bg-sky-100', fg: 'text-sky-600' } },
  { keywords: ['약국', '약'], visual: { Icon: Pill, bg: 'bg-emerald-100', fg: 'text-emerald-600' } },
  { keywords: ['병원', '진료', '의사', '아플', '증상', '치과'], visual: { Icon: Stethoscope, bg: 'bg-rose-100', fg: 'text-rose-600' } },
  { keywords: ['식당', '레스토랑', '음식', '주문', '메뉴', '식사'], visual: { Icon: Utensils, bg: 'bg-orange-100', fg: 'text-orange-600' } },
  { keywords: ['카페', '커피', '음료'], visual: { Icon: Coffee, bg: 'bg-amber-100', fg: 'text-amber-700' } },
  { keywords: ['호텔', '숙소', '숙박', '체크인', '체크아웃'], visual: { Icon: Hotel, bg: 'bg-indigo-100', fg: 'text-indigo-600' } },
  { keywords: ['은행', '환전', '계좌', 'atm'], visual: { Icon: Landmark, bg: 'bg-teal-100', fg: 'text-teal-600' } },
  { keywords: ['쇼핑', '상점', '마트', '백화점', '구매', '계산'], visual: { Icon: ShoppingBag, bg: 'bg-pink-100', fg: 'text-pink-600' } },
  { keywords: ['학교', '수업', '교실', '시험', '학원'], visual: { Icon: GraduationCap, bg: 'bg-violet-100', fg: 'text-violet-600' } },
  { keywords: ['기차', '역', '지하철', '전철'], visual: { Icon: Train, bg: 'bg-cyan-100', fg: 'text-cyan-700' } },
  { keywords: ['버스', '정류장', '대중교통'], visual: { Icon: Bus, bg: 'bg-lime-100', fg: 'text-lime-700' } },
  { keywords: ['우체국', '우편', '택배', '편지'], visual: { Icon: Mail, bg: 'bg-blue-100', fg: 'text-blue-600' } },
  { keywords: ['도서관', '책', '서점'], visual: { Icon: Library, bg: 'bg-stone-100', fg: 'text-stone-600' } },
  { keywords: ['길', '방향', '안내', '위치', '찾기'], visual: { Icon: Navigation, bg: 'bg-green-100', fg: 'text-green-600' } },
  { keywords: ['전화', '통화', '연락'], visual: { Icon: Phone, bg: 'bg-sky-100', fg: 'text-sky-600' } },
  { keywords: ['예약', '예매'], visual: { Icon: CalendarCheck, bg: 'bg-fuchsia-100', fg: 'text-fuchsia-600' } },
  { keywords: ['인사', '소개', '만남'], visual: { Icon: Hand, bg: 'bg-yellow-100', fg: 'text-yellow-600' } },
  { keywords: ['날씨', '기온'], visual: { Icon: Cloud, bg: 'bg-sky-100', fg: 'text-sky-500' } },
];

const FALLBACK: ChapterVisual = { Icon: MapPin, bg: 'bg-brand-100', fg: 'text-brand-600' };

export function chapterVisual(title: string): ChapterVisual {
  const t = (title ?? '').toLowerCase().replace(/\s+/g, '');
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => t.includes(kw.toLowerCase()))) return rule.visual;
  }
  return FALLBACK;
}
