'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LikeButton from '@/components/LikeButton';
import api from '@/lib/api';

interface ServiceDetail {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; categoryName?: string; userNickname?: string;
  isLiked?: boolean; isBookmarked?: boolean; createdAt: string;
}

export default function ServiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    api.get(`/services/${id}`).then(({ data }) => {
      setService(data);
      setBookmarked(data.isBookmarked ?? false);
    });
  }, [id]);

  const toggleBookmark = async () => {
    try {
      const { data } = await api.post(`/services/${id}/bookmark`);
      setBookmarked(data.bookmarked);
    } catch {
      window.location.href = '/login';
    }
  };

  if (!service) return <div className="p-8 text-text-secondary">로딩 중...</div>;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="bg-white border border-border rounded-lg p-8">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-xl bg-accent-green flex items-center justify-center text-2xl font-bold flex-shrink-0 overflow-hidden">
            {service.imageUrl ? (
              <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span>{service.name[0]}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{service.name}</h1>
            {service.categoryName && (
              <span className="text-xs bg-bg text-text-secondary px-2 py-0.5 rounded mt-2 inline-block">{service.categoryName}</span>
            )}
          </div>
        </div>

        <p className="text-text-secondary mt-6 leading-relaxed">{service.description}</p>

        <div className="flex items-center gap-4 mt-8">
          <LikeButton serviceId={service.id} count={service.likeCount} isLiked={service.isLiked} size="lg" />
          <button onClick={toggleBookmark}
            className={`px-6 py-3 rounded-lg text-sm font-medium border ${bookmarked ? 'bg-black text-white border-black' : 'border-border text-text-secondary hover:bg-bg'}`}>
            {bookmarked ? '★ 관심 등록됨' : '☆ 관심 등록'}
          </button>
          <a href={service.url} target="_blank" rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg text-sm font-medium bg-black text-white">
            사이트 방문 →
          </a>
        </div>

        <div className="border-t border-border mt-8 pt-6 text-sm text-text-secondary space-y-2">
          <p>등록자: @{service.userNickname}</p>
          <p>등록일: {new Date(service.createdAt).toLocaleDateString('ko-KR')}</p>
        </div>
      </div>
      <Link href="/services" className="text-sm text-text-secondary mt-4 inline-block hover:underline">← 목록으로</Link>
    </div>
  );
}
