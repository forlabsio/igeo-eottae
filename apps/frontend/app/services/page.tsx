'use client';
import { useEffect, useState } from 'react';
import ServiceCard from '@/components/ServiceCard';
import api from '@/lib/api';
import Link from 'next/link';
import {
  Search, Plus, Flame, Clock, AlignLeft,
  Zap, Cloud, Wrench, CreditCard, Megaphone, ShoppingBag, Package, LayoutGrid,
} from 'lucide-react';

interface ServiceItem {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; isHidden: boolean; categoryId?: string; categoryName?: string;
  userId: string; userNickname?: string; isLiked?: boolean; isBookmarked?: boolean; createdAt: string;
}

const CATEGORIES = [
  { label: '전체', slug: null, icon: LayoutGrid },
  { label: 'AI/ML', slug: 'ai-ml', icon: Zap },
  { label: 'SaaS', slug: 'saas', icon: Cloud },
  { label: '개발툴', slug: 'devtools', icon: Wrench },
  { label: '핀테크', slug: 'fintech', icon: CreditCard },
  { label: '마케팅', slug: 'marketing', icon: Megaphone },
  { label: '커머스', slug: 'commerce', icon: ShoppingBag },
  { label: '기타', slug: 'etc', icon: Package },
];

const SORTS = [
  { value: 'likes', label: '인기순', icon: Flame },
  { value: 'latest', label: '최신순', icon: Clock },
  { value: 'name', label: '이름순', icon: AlignLeft },
] as const;

type SortValue = typeof SORTS[number]['value'];

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortValue>('likes');
  const [category, setCategory] = useState('전체');
  const [search, setSearch] = useState('');
  const [inputVal, setInputVal] = useState('');
  const totalPages = Math.ceil(total / 12);

  useEffect(() => {
    const cat = CATEGORIES.find((c) => c.label === category);
    const params = new URLSearchParams({ sort, page: String(page), limit: '12' });
    if (cat?.slug) params.set('category', cat.slug);
    if (search) params.set('search', search);
    api.get(`/services?${params}`).then(({ data }) => {
      setServices(data.data);
      setTotal(data.total);
    });
  }, [sort, category, page, search]);

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSearch(inputVal);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Hero bar ── */}
      <div className="bg-card border-b border-border">
        <div className="max-w-[1120px] mx-auto px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold tracking-[0.12em] text-text-secondary/60 uppercase mb-1">Directory</p>
              <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">서비스 탐색</h1>
              <p className="text-[13px] text-text-secondary mt-1">
                <span className="font-bold text-text-primary">{total}</span>개의 서비스가 등록되어 있어요
              </p>
            </div>
            {/* Search + register */}
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50 pointer-events-none" />
                <input
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="서비스 검색..."
                  className="border border-border rounded-xl pl-9 pr-4 py-2.5 text-[13px] w-52 bg-bg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-text-secondary/50 transition-colors"
                />
              </form>
              <Link href="/services/new"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#1A1918] text-white hover:bg-[#2d2c2b] transition-all whitespace-nowrap">
                <Plus size={14} />
                등록하기
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-8 py-6">
        {/* ── Category icon tabs ── */}
        <div className="flex items-center gap-1.5 flex-wrap mb-5">
          {CATEGORIES.map(({ label, icon: Icon }) => (
            <button
              key={label}
              title={label}
              onClick={() => { setCategory(label); setPage(1); }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-150 ${
                category === label
                  ? 'bg-[#1A1918] text-white border-[#1A1918]'
                  : 'bg-card border-border text-text-secondary hover:text-text-primary hover:border-[#1A1918]/40 hover:bg-[#1A1918]/5'
              }`}>
              <Icon size={15} />
            </button>
          ))}

          {/* Sort — icon-only group */}
          <div className="flex items-center gap-1.5 ml-auto">
            {SORTS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                title={label}
                onClick={() => { setSort(value); setPage(1); }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-150 ${
                  sort === value
                    ? 'bg-[#1A1918] text-white border-[#1A1918]'
                    : 'bg-card border-border text-text-secondary hover:text-text-primary hover:border-[#1A1918]/40 hover:bg-[#1A1918]/5'
                }`}>
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        {services.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => <ServiceCard key={s.id} service={s} />)}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl py-20 text-center">
            <div className="w-16 h-16 bg-bg rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
              <Search size={24} className="text-text-secondary/40" />
            </div>
            <p className="font-semibold text-text-primary mb-1">서비스가 없습니다</p>
            <p className="text-[13px] text-text-secondary">다른 카테고리나 검색어를 시도해보세요</p>
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1.5 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-border rounded-xl text-[13px] text-text-secondary disabled:opacity-30 hover:bg-border/40 transition-all font-medium">
              ← 이전
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 border rounded-xl text-[13px] font-semibold transition-all ${
                    p === page ? 'bg-[#1A1918] text-white border-[#1A1918]' : 'border-border text-text-secondary hover:bg-border/40'
                  }`}>
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-border rounded-xl text-[13px] text-text-secondary disabled:opacity-30 hover:bg-border/40 transition-all font-medium">
              다음 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}