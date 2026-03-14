'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LikeButton from './LikeButton';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, User } from 'lucide-react';

interface ServiceItem {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; isHidden: boolean; categoryId?: string; categoryName?: string;
  userId: string; userNickname?: string; isLiked?: boolean; isBookmarked?: boolean; createdAt: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  'AI/ML': '⚡', 'SaaS': '☁️', '개발툴': '🛠', '핀테크': '💳',
  '마케팅': '📢', '커머스': '🛍', '기타': '📦',
};

const PALETTE = [
  { bg: 'bg-[#E8F5D4]', accent: '#7CC71A' },
  { bg: 'bg-[#D4EAF5]', accent: '#3B9ED4' },
  { bg: 'bg-[#F5E8D4]', accent: '#D4903B' },
  { bg: 'bg-[#EED4F5]', accent: '#A63BD4' },
  { bg: 'bg-[#F5D4D4]', accent: '#D43B3B' },
  { bg: 'bg-[#D4F5EE]', accent: '#1DB37D' },
];

export default function ServiceCard({ service }: { service: ServiceItem }) {
  const { user } = useAuth();
  const router = useRouter();
  const idx = service.name.charCodeAt(0) % PALETTE.length;
  const { bg, accent } = PALETTE[idx];
  const initials = service.name.slice(0, 2).toUpperCase();
  const catIcon = service.categoryName ? (CATEGORY_ICONS[service.categoryName] ?? '📦') : '📦';

  const handleExternalLink = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      router.push('/register?reason=link');
    }
  };

  return (
    <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-[#1A1918]/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] transition-all duration-200 flex flex-col">
      {/* Top color band + logo */}
      <div className={`${bg} h-[80px] relative flex items-end px-4 pb-0`}>
        {/* Category badge top-right */}
        {service.categoryName && (
          <span className="absolute top-3 right-3 text-[11px] font-semibold bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1 text-text-primary/70 flex items-center gap-1">
            <span>{catIcon}</span> {service.categoryName}
          </span>
        )}
        {/* Logo floats half out */}
        <div className={`w-14 h-14 rounded-2xl border-2 border-white shadow-md flex items-center justify-center overflow-hidden translate-y-7 bg-white`}
          style={{ boxShadow: `0 4px 16px ${accent}30` }}>
          {service.imageUrl ? (
            <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[15px] font-black" style={{ color: accent }}>{initials}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-4 pt-10 pb-4 gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/services/${service.id}`}
            className="font-bold text-[15px] text-text-primary hover:text-text-primary/60 transition-colors leading-tight line-clamp-1">
            {service.name}
          </Link>
        </div>
        <p className="text-[12.5px] text-text-secondary leading-relaxed line-clamp-2 min-h-[36px]">
          {service.description}
        </p>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11.5px] text-text-secondary/70">
          <User size={11} />
          <span>@{service.userNickname}</span>
        </div>
        <div className="flex items-center gap-2">
          <LikeButton serviceId={service.id} count={service.likeCount} isLiked={service.isLiked} size="lg" />
          <a href={service.url} target="_blank" rel="noopener noreferrer"
            onClick={handleExternalLink}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#1A1918] text-white hover:bg-[#2d2c2b] transition-all duration-150">
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}