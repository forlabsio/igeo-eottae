'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LikeButton from '@/components/LikeButton';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Pencil, Trash2 } from 'lucide-react';

interface ServiceDetail {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; categoryName?: string; userNickname?: string; userId?: string;
  isLiked?: boolean; isBookmarked?: boolean; createdAt: string;
}

export default function ServiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
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

  const handleDelete = async () => {
    if (!service || !confirm(`"${service.name}" 서비스를 삭제하시겠습니까?`)) return;
    await api.delete(`/services/${id}`);
    router.push('/mypage');
  };

  if (!service) {
    return (
      <div className="max-w-[780px] mx-auto px-8 py-12 text-text-secondary text-[14px]">
        로딩 중...
      </div>
    );
  }

  const initials = service.name.slice(0, 2).toUpperCase();
  const hues = ['bg-[#E8F5D4]', 'bg-[#D4EAF5]', 'bg-[#F5E8D4]', 'bg-[#EED4F5]', 'bg-[#F5D4D4]'];
  const colorIdx = service.name.charCodeAt(0) % hues.length;

  return (
    <div className="max-w-[780px] mx-auto px-8 py-10">
      <Link href="/services"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary mb-6 transition-colors">
        ← 목록으로
      </Link>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-8 py-8 border-b border-border">
          <div className="flex items-start gap-5">
            <div className={`w-[72px] h-[72px] rounded-2xl ${hues[colorIdx]} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
              {service.imageUrl ? (
                <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[18px] font-bold text-text-primary/50">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[24px] font-bold text-text-primary leading-tight">{service.name}</h1>
                {service.categoryName && (
                  <span className="text-[12px] bg-bg border border-border rounded-full px-3 py-0.5 text-text-secondary font-medium">
                    {service.categoryName}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-text-secondary mt-1">
                by @{service.userNickname} · {new Date(service.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-7">
          <p className="text-[15px] text-text-primary leading-[1.8] whitespace-pre-wrap">{service.description}</p>
        </div>

        {/* Actions */}
        <div className="px-8 py-6 bg-bg border-t border-border flex items-center gap-3 flex-wrap">
          <LikeButton serviceId={service.id} count={service.likeCount} isLiked={service.isLiked} size="lg" />
          {user?.id === service.userId ? (
            <>
              <Link href={`/services/${service.id}/edit`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold border border-border bg-card text-text-secondary hover:bg-[#1A1918] hover:border-[#1A1918] hover:text-white transition-all duration-150">
                <Pencil size={14} /> 수정
              </Link>
              <button onClick={handleDelete}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold border border-border bg-card text-text-secondary hover:bg-[#F5D4D4] hover:border-[#D43B3B] hover:text-[#D43B3B] transition-all duration-150">
                <Trash2 size={14} /> 삭제
              </button>
            </>
          ) : (
            <button onClick={toggleBookmark}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold border transition-all duration-150 ${
                bookmarked
                  ? 'bg-[#1A1918] text-white border-[#1A1918]'
                  : 'bg-card border-border text-text-secondary hover:border-text-secondary hover:text-text-primary'
              }`}>
              {bookmarked ? '★ 관심 등록됨' : '☆ 관심 등록'}
            </button>
          )}
          <a href={service.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold bg-accent-green text-black border border-accent-green hover:bg-[#c8ff57] transition-all duration-150 ml-auto">
            사이트 방문 ↗
          </a>
        </div>
      </div>
    </div>
  );
}
