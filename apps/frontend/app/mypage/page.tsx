'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ServiceCard from '@/components/ServiceCard';
import api from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ServiceItem {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; isHidden: boolean; categoryId?: string; categoryName?: string;
  userId: string; userNickname?: string; isLiked?: boolean; isBookmarked?: boolean; createdAt: string;
}

const TABS = ['내 서비스', '좋아요한 서비스', '관심 서비스'] as const;
type Tab = typeof TABS[number];

export default function MyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('내 서비스');
  const [items, setItems] = useState<ServiceItem[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const endpoints: Record<Tab, string> = {
      '내 서비스': '/users/me/services',
      '좋아요한 서비스': '/users/me/likes',
      '관심 서비스': '/users/me/bookmarks',
    };
    api.get(endpoints[tab]).then(({ data }) => setItems(data));
  }, [tab, user]);

  if (loading) return <div className="p-8 text-text-secondary">로딩 중...</div>;
  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-accent-green rounded-full flex items-center justify-center text-xl font-bold">
            {user.nickname[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-lg">{user.nickname}</p>
            <p className="text-sm text-text-secondary">{user.email}</p>
          </div>
        </div>
        <Link href="/services/new" className="bg-black text-white px-5 py-2.5 rounded text-sm font-semibold">+ 서비스 등록</Link>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-black text-black' : 'border-transparent text-text-secondary hover:text-black'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {items.map((s) => <ServiceCard key={s.id} service={s} />)}
        {items.length === 0 && <div className="text-center py-12 text-text-secondary">아직 {tab}가 없습니다.</div>}
      </div>
    </div>
  );
}
