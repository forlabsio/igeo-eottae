'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ServiceCard from '@/components/ServiceCard';
import api from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';

interface ServiceItem {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; isHidden: boolean; categoryId?: string; categoryName?: string;
  userId: string; userNickname?: string; isLiked?: boolean; isBookmarked?: boolean; createdAt: string;
}

const TABS = ['내 서비스', '좋아요한 서비스', '관심 서비스'] as const;
type Tab = typeof TABS[number];

const endpoints: Record<Tab, string> = {
  '내 서비스': '/users/me/services',
  '좋아요한 서비스': '/users/me/likes',
  '관심 서비스': '/users/me/bookmarks',
};

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
    api.get(endpoints[tab]).then(({ data }) => setItems(data));
  }, [tab, user]);

  if (loading) return <div className="p-8 text-[14px] text-text-secondary">로딩 중...</div>;
  if (!user) return null;

  return (
    <div className="max-w-[1120px] mx-auto px-8 py-10">
      {/* Profile header */}
      <div className="bg-card border border-border rounded-2xl p-7 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-accent-green rounded-2xl flex items-center justify-center text-[20px] font-extrabold text-black">
            {user.nickname[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-[18px] text-text-primary">{user.nickname}</p>
            <p className="text-[13px] text-text-secondary mt-0.5">{user.email}</p>
          </div>
        </div>
        <Link href="/services/new"
          className="px-5 py-2.5 rounded-xl text-[13.5px] font-semibold bg-text-primary text-bg hover:bg-text-primary/90 transition-all">
          + 서비스 등록
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg border border-border rounded-xl p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 ${
              tab === t ? 'bg-card shadow-card text-text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2.5">
        {items.map((s) => (
          <div key={s.id} className="relative group/item">
            <ServiceCard service={s} />
            {tab === '내 서비스' && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity z-10">
                <Link href={`/services/${s.id}/edit`}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-card border border-border text-text-secondary hover:bg-text-primary hover:border-text-primary hover:text-bg transition-all shadow-sm"
                  title="수정">
                  <Pencil size={13} />
                </Link>
                <button
                  onClick={async () => {
                    if (!confirm(`"${s.name}" 서비스를 삭제하시겠습니까?`)) return;
                    await api.delete(`/services/${s.id}`);
                    setItems((prev) => prev.filter((x) => x.id !== s.id));
                  }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-card border border-border text-text-secondary hover:bg-danger/15 hover:border-danger hover:text-danger transition-all shadow-sm"
                  title="삭제">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="bg-card border border-border rounded-2xl py-14 text-center">
            <p className="text-[32px] mb-2">📭</p>
            <p className="text-text-secondary font-medium">아직 {tab}가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
