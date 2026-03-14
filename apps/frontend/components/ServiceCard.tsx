import Link from 'next/link';
import LikeButton from './LikeButton';

interface ServiceItem {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; isHidden: boolean; categoryId?: string; categoryName?: string;
  userId: string; userNickname?: string; isLiked?: boolean; isBookmarked?: boolean; createdAt: string;
}

export default function ServiceCard({ service }: { service: ServiceItem }) {
  const initials = service.name.slice(0, 2).toUpperCase();
  const hues = ['bg-[#E8F5D4]', 'bg-[#D4EAF5]', 'bg-[#F5E8D4]', 'bg-[#EED4F5]', 'bg-[#F5D4D4]'];
  const colorIdx = service.name.charCodeAt(0) % hues.length;

  return (
    <div className="bg-card border border-border rounded-xl flex items-stretch overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-200 min-h-[88px]">
      {/* Vote */}
      <LikeButton serviceId={service.id} count={service.likeCount} isLiked={service.isLiked} />

      {/* Logo */}
      <div className={`w-[72px] flex items-center justify-center flex-shrink-0 border-r border-border`}>
        <div className={`w-12 h-12 rounded-xl ${hues[colorIdx]} flex items-center justify-center overflow-hidden`}>
          {service.imageUrl ? (
            <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[13px] font-bold text-text-primary/60">{initials}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/services/${service.id}`}
            className="font-semibold text-[15px] text-text-primary hover:text-text-primary/60 transition-colors leading-tight">
            {service.name}
          </Link>
          {service.categoryName && (
            <span className="text-[11px] bg-bg border border-border rounded-full px-2.5 py-0.5 text-text-secondary font-medium leading-none">
              {service.categoryName}
            </span>
          )}
        </div>
        <p className="text-[13px] text-text-secondary mt-1 line-clamp-1 leading-relaxed">
          {service.description}
        </p>
        <p className="text-[11px] text-text-secondary/60 mt-1">
          by @{service.userNickname}
        </p>
      </div>

      {/* Visit arrow */}
      <div className="flex items-center pr-5 flex-shrink-0">
        <a href={service.url} target="_blank" rel="noopener noreferrer"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-border text-text-secondary hover:bg-[#1A1918] hover:text-white hover:border-[#1A1918] transition-all duration-150 text-sm">
          ↗
        </a>
      </div>
    </div>
  );
}
