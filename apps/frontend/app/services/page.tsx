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

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'likes' | 'latest'>('likes');
  const [category, setCategory] = useState('전체');
  const [search, setSearch] = useState('');

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
    <div className="flex min-h-screen">
      {/* 사이드바 */}
      <aside className="w-[220px] bg-white border-r border-border p-6 flex-shrink-0">
        <p className="text-xs font-semibold text-text-secondary mb-3">카테고리</p>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
            className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${category === cat ? 'bg-black text-white' : 'text-text-secondary hover:bg-bg'}`}>
            {cat}
          </button>
        ))}
      </aside>

      {/* 본문 */}
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="서비스 이름 또는 설명 검색..." className="border border-border rounded px-4 py-2 text-sm w-80 bg-bg" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">총 {total}개</span>
            <button onClick={() => setSort('likes')} className={`px-3 py-1.5 rounded text-sm ${sort === 'likes' ? 'bg-black text-white' : 'border border-border text-text-secondary'}`}>좋아요순</button>
            <button onClick={() => setSort('latest')} className={`px-3 py-1.5 rounded text-sm ${sort === 'latest' ? 'bg-black text-white' : 'border border-border text-text-secondary'}`}>최신순</button>
            <Link href="/services/new" className="bg-black text-white px-4 py-2 rounded text-sm font-semibold">+ 서비스 등록</Link>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {services.map((s) => <ServiceCard key={s.id} service={s} />)}
          {services.length === 0 && <div className="text-center py-12 text-text-secondary">서비스가 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}
