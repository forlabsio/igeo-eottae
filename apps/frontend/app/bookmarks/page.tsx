'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ServiceCard from '@/components/ServiceCard';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface ServiceItem {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; isHidden: boolean; categoryId?: string; categoryName?: string;
  userId: string; userNickname?: string; isLiked?: boolean; isBookmarked?: boolean; createdAt: string;
}

const CATEGORIES = ['전체', 'AI/ML', 'SaaS', '개발툴', '핀테크', '마케팅', '커머스', '기타'];
const SORTS = [
  { value: 'latest', label: '🕐 등록순' },
  { value: 'likes', label: '★ 좋아요순' },
  { value: 'name', label: 'A→Z 이름순' },
] as const;

type SortValue = typeof SORTS[number]['value'];

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [sort, setSort] = useState<SortValue>('latest');
  const [category, setCategory] = useState('전체');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get('/users/me/bookmarks').then(({ data }) => setItems(data)).catch(() => {});
  }, [user]);

  const filtered = items
    .filter((s) => category === '전체' || s.categoryName === category)
    .sort((a, b) => {
      if (sort === 'likes') return b.likeCount - a.likeCount;
      if (sort === 'name') return a.name.localeCompare(b.name, 'ko');
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (loading) return <div className="p-8 text-text-secondary">로딩 중...</div>;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">관심 목록</h1>
          <p className="text-sm text-text-secondary mt-1">저장한 서비스 {filtered.length}개</p>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORIES.filter((cat) => cat === '전체' || items.some((s) => s.categoryName === cat)).map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${category === cat ? 'bg-black text-white' : 'bg-bg border border-border text-text-secondary hover:border-black hover:text-black'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* 정렬 */}
      <div className="flex gap-2 mb-6">
        {SORTS.map((s) => (
          <button key={s.value} onClick={() => setSort(s.value)}
            className={`px-3.5 py-1.5 rounded text-sm transition-colors ${sort === s.value ? 'bg-black text-white' : 'border border-border text-text-secondary hover:border-black hover:text-black'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((s) => <ServiceCard key={s.id} service={s} />)}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-text-secondary">
            <p className="text-4xl mb-3">☆</p>
            <p>관심 등록한 서비스가 없습니다.</p>
            <p className="text-sm mt-1">서비스 상세 페이지에서 ☆ 관심 등록을 눌러 저장하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
