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
  { value: 'latest', label: '↓ 등록순' },
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

  const availableCategories = CATEGORIES.filter(
    (cat) => cat === '전체' || items.some((s) => s.categoryName === cat)
  );

  if (loading) return <div className="p-8 text-[14px] text-text-secondary">로딩 중...</div>;
  if (!user) return null;

  return (
    <div className="max-w-[1120px] mx-auto px-8 py-10">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-text-primary">관심 목록</h1>
        <p className="text-[13px] text-text-secondary mt-0.5">저장한 서비스 {filtered.length}개</p>
      </div>

      {availableCategories.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {availableCategories.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 border ${
                category === cat
                  ? 'bg-[#1A1918] text-white border-[#1A1918]'
                  : 'bg-card border-border text-text-secondary hover:border-text-secondary hover:text-text-primary'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <span className="text-[12px] text-text-secondary/70 font-medium">정렬:</span>
        {SORTS.map((s) => (
          <button key={s.value} onClick={() => setSort(s.value)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 border ${
              sort === s.value
                ? 'bg-accent-green border-accent-green text-black'
                : 'bg-card border-border text-text-secondary hover:border-text-secondary hover:text-text-primary'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {filtered.map((s) => <ServiceCard key={s.id} service={s} />)}
        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-2xl py-16 text-center">
            <p className="text-[40px] mb-3">☆</p>
            <p className="text-text-secondary font-medium">관심 등록한 서비스가 없습니다.</p>
            <p className="text-[13px] text-text-secondary/70 mt-1.5">서비스 상세 페이지에서 저장 버튼을 눌러 저장하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
