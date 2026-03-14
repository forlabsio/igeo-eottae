'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LikeButton from './LikeButton';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, User, Handshake } from 'lucide-react';

interface ServiceItem {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; isHidden: boolean; categoryId?: string; categoryName?: string;
  userId: string; userNickname?: string; isLiked?: boolean; isBookmarked?: boolean;
  createdAt: string; targetRegions?: string[] | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  'AI/ML': '⚡', 'SaaS': '☁️', '개발툴': '🛠', '핀테크': '💳',
  '마케팅': '📢', '커머스': '🛍', '기타': '📦',
};

export const REGION_MAP: Record<string, { flag: string; label: string }> = {
  'kr':             { flag: '🇰🇷', label: '한국' },
  'east-asia':      { flag: '🌏', label: '동아시아' },
  'southeast-asia': { flag: '🌴', label: '동남아시아' },
  'europe':         { flag: '🌍', label: '유럽' },
  'north-america':  { flag: '🌎', label: '북미' },
  'south-america':  { flag: '🌎', label: '남미' },
  'middle-east':    { flag: '🌙', label: '중동' },
  'africa':         { flag: '🌍', label: '아프리카' },
  'global':         { flag: '🌐', label: '글로벌' },
};

const PALETTE = [
  { bg: 'bg-[#1D2E10]', accent: '#7CC71A' },
  { bg: 'bg-[#0E2230]', accent: '#3B9ED4' },
  { bg: 'bg-[#2E1E0A]', accent: '#D4903B' },
  { bg: 'bg-[#230A33]', accent: '#A63BD4' },
  { bg: 'bg-[#2E0A0A]', accent: '#D43B3B' },
  { bg: 'bg-[#082E24]', accent: '#1DB37D' },
];

export default function ServiceCard({ service }: { service: ServiceItem }) {
  const { user } = useAuth();
  const router = useRouter();
  const idx = service.name.charCodeAt(0) % PALETTE.length;
  const { bg, accent } = PALETTE[idx];
  const initials = service.name.slice(0, 2).toUpperCase();
  const catIcon = service.categoryName ? (CATEGORY_ICONS[service.categoryName] ?? '📦') : '📦';
  const regions = service.targetRegions?.slice(0, 2) ?? [];
  const extraRegions = (service.targetRegions?.length ?? 0) - 2;

  const handleExternalLink = (e: React.MouseEvent) => {
    if (!user) { e.preventDefault(); router.push('/register?reason=link'); }
  };

  const handleConnect = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push('/register?reason=connect'); return; }
    router.push(`/services/${service.id}?connect=1`);
  };

  return (
    <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-text-primary/20 hover:shadow-card-hover transition-all duration-200 flex flex-col">
      {/* Top color band + logo */}
      <div className={`${bg} h-[80px] relative flex items-end px-4 pb-0`}>
        {/* Category badge top-right */}
        {service.categoryName && (
          <span className="absolute top-3 right-3 text-[11px] font-semibold bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 text-text-primary/80 flex items-center gap-1">
            <span>{catIcon}</span> {service.categoryName}
          </span>
        )}
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl border-2 border-border shadow-md flex items-center justify-center overflow-hidden translate-y-7 bg-card-elevated"
          style={{ boxShadow: `0 4px 16px ${accent}40` }}>
          {service.imageUrl ? (
            <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[15px] font-black" style={{ color: accent }}>{initials}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-4 pt-10 pb-3 gap-1">
        <Link href={`/services/${service.id}`}
          className="font-bold text-[15px] text-text-primary hover:text-text-primary/60 transition-colors leading-tight line-clamp-1">
          {service.name}
        </Link>
        <p className="text-[12.5px] text-text-secondary leading-relaxed line-clamp-2 min-h-[36px]">
          {service.description}
        </p>

        {/* Region badges */}
        {regions.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {regions.map((r) => (
              <span key={r} className="inline-flex items-center gap-0.5 text-[11px] bg-bg border border-border rounded-full px-2 py-0.5 text-text-secondary">
                {REGION_MAP[r]?.flag} {REGION_MAP[r]?.label}
              </span>
            ))}
            {extraRegions > 0 && (
              <span className="text-[11px] bg-bg border border-border rounded-full px-2 py-0.5 text-text-secondary">
                +{extraRegions}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11.5px] text-text-secondary/70">
          <User size={11} />
          <span>@{service.userNickname}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LikeButton serviceId={service.id} count={service.likeCount} isLiked={service.isLiked} size="lg" />
          {/* Connect 버튼 (본인 서비스 제외) */}
          {(!user || user.id !== service.userId) && (
            <button onClick={handleConnect}
              title="사업 문의 보내기"
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-border bg-card text-text-secondary hover:bg-text-primary hover:border-text-primary hover:text-bg transition-all duration-150">
              <Handshake size={14} />
            </button>
          )}
          <a href={service.url} target="_blank" rel="noopener noreferrer"
            onClick={handleExternalLink}
            title="서비스 방문"
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-text-primary bg-text-primary text-bg hover:bg-text-primary/90 hover:border-text-primary/90 transition-all duration-150">
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
