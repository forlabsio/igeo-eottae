import Link from 'next/link';
import LikeButton from './LikeButton';

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl?: string;
  likeCount: number;
  isHidden: boolean;
  categoryId?: string;
  categoryName?: string;
  userId: string;
  userNickname?: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
}

export default function ServiceCard({ service }: { service: ServiceItem }) {
  return (
    <div className="bg-white border border-border rounded-lg flex items-center h-[100px] overflow-hidden">
      <LikeButton serviceId={service.id} count={service.likeCount} isLiked={service.isLiked} />
      <div className="w-16 h-16 rounded-lg flex items-center justify-center text-xl mx-4 bg-accent-green font-bold flex-shrink-0 overflow-hidden">
        {service.imageUrl ? (
          <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <span>{service.name[0]}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 pr-4">
        <Link href={`/services/${service.id}`} className="font-semibold text-text-primary text-[15px] hover:underline">
          {service.name}
        </Link>
        <p className="text-sm text-text-secondary truncate mt-1">{service.description}</p>
        <div className="flex items-center gap-2 mt-1">
          {service.categoryName && (
            <span className="text-xs bg-bg text-text-secondary px-2 py-0.5 rounded">{service.categoryName}</span>
          )}
          <span className="text-xs text-text-secondary/60">by @{service.userNickname}</span>
        </div>
      </div>
    </div>
  );
}
