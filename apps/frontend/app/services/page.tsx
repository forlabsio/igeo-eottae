'use client';
import { useEffect, useState } from 'react';
import ServiceCard from '@/components/ServiceCard';
import api from '@/lib/api';
import Link from 'next/link';

interface ServiceItem {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; isHidden: boolean; categoryId?: string; categoryName?: string;
  userId: string; userNickname?: string; isLiked?: boolean; isBookmarked?: boolean; createdAt: string;
}

const CATEGORIES = ['전체', 'AI/ML', 'SaaS', '개발툴', '핀테크', '마케팅', '커머스', '기타'];
const CATEGORY_SLUGS: Record<string, string> = {
  'AI/ML': 'ai-ml', 'SaaS': 'saas', '개발툴': 'devtools',
  '핀테크': 'fintech', '마케팅': 'marketing', '커머스': 'commerce', '기타': 'etc',
};

const SORTS = [
  { value: 'likes', label: '★ 좋아요순' },
  { value: 'latest', label: '↓ 최신순' },
  { value: 'name', label: 'A→Z 이름순' },
] as const;

type SortValue = typeof SORTS[number]['value'];

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortValue>('likes');
  const [category, setCategory] = useState('전체');
  const [search, setSearch] = useState('');
  const totalPages = Math.ceil(total / 12);

  useEffect(() => {
    const params = new URLSearchParams({ sort, page: String(page), limit: '12' });
    if (category !== '전체') params.set('category', CATEGORY_SLUGS[category]);
    if (search) params.set('search', search);
    api.get(`/services?${params}`).then(({ data }) => {
      setServices(data.data);
      setTotal(data.total);
    });
  }, [sort, category, page, search]);

  return (
    <div className="max-w-[1120px] mx-auto px-8 py-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary">서비스 탐색</h1>
          <p className="text-[13px] text-text-secondary mt-0.5">총 {total}개의 서비스</p>
        </div>
        <div className="flex items-center gap-2.5">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="검색..."
            className="border border-border rounded-xl px-4 py-2.5 text-[13.5px] w-56 bg-card text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-text-secondary transition-colors" />
          <Link href="/services/new"
            className="px-5 py-2.5 rounded-xl text-[13.5px] font-semibold bg-[#1A1918] text-white hover:bg-[#2d2c2b] transition-all whitespace-nowrap">
            + 등록하기
          </Link>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-3">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 border ${
              category === cat
                ? 'bg-[#1A1918] text-white border-[#1A1918]'
                : 'bg-card border-border text-text-secondary hover:border-text-secondary hover:text-text-primary'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-[12px] text-text-secondary/70 font-medium">정렬:</span>
        {SORTS.map((s) => (
          <button key={s.value} onClick={() => { setSort(s.value); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 border ${
              sort === s.value
                ? 'bg-accent-green border-accent-green text-black'
                : 'bg-card border-border text-text-secondary hover:border-text-secondary hover:text-text-primary'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2.5">
        {services.map((s) => <ServiceCard key={s.id} service={s} />)}
        {services.length === 0 && (
          <div className="bg-card border border-border rounded-xl py-16 text-center">
            <p className="text-[32px] mb-2">🔍</p>
            <p className="text-text-secondary">서비스가 없습니다.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 mt-8">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3.5 py-2 border border-border rounded-lg text-[13px] text-text-secondary disabled:opacity-40 hover:bg-border/40 transition-all">
            ← 이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`px-3.5 py-2 border rounded-lg text-[13px] font-medium transition-all ${
                p === page ? 'bg-[#1A1918] text-white border-[#1A1918]' : 'border-border text-text-secondary hover:bg-border/40'
              }`}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3.5 py-2 border border-border rounded-lg text-[13px] text-text-secondary disabled:opacity-40 hover:bg-border/40 transition-all">
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}
