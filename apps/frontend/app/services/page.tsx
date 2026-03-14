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
  { value: 'latest', label: '🕐 최신순' },
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
    <div className="max-w-5xl mx-auto px-8 py-8">
      {/* 검색 + 등록 */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="서비스 이름 또는 설명 검색..."
          className="border border-border rounded px-4 py-2 text-sm w-72 bg-bg" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">총 {total}개</span>
          <Link href="/services/new" className="bg-black text-white px-4 py-2 rounded text-sm font-semibold">+ 서비스 등록</Link>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${category === cat ? 'bg-black text-white' : 'bg-bg border border-border text-text-secondary hover:border-black hover:text-black'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* 정렬 */}
      <div className="flex gap-2 mb-6">
        {SORTS.map((s) => (
          <button key={s.value} onClick={() => { setSort(s.value); setPage(1); }}
            className={`px-3.5 py-1.5 rounded text-sm transition-colors ${sort === s.value ? 'bg-black text-white' : 'border border-border text-text-secondary hover:border-black hover:text-black'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div className="flex flex-col gap-3">
        {services.map((s) => <ServiceCard key={s.id} service={s} />)}
        {services.length === 0 && <div className="text-center py-12 text-text-secondary">서비스가 없습니다.</div>}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-40">이전</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`px-3 py-1.5 border rounded text-sm ${p === page ? 'bg-black text-white border-black' : 'border-border text-text-secondary'}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-40">다음</button>
        </div>
      )}
    </div>
  );
}
