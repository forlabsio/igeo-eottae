'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import AdminSidebar from '@/components/AdminSidebar';
import Link from 'next/link';
import { Handshake, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';

interface AdminInquiry {
  id: string;
  title: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  service: { id: string; name: string } | null;
  sender: { nickname: string } | null;
  receiver: { nickname: string } | null;
}

const STATUS_MAP = {
  pending:  { label: '대기중', icon: Clock,       color: 'text-[#D4903B] bg-[#F5E8D4]' },
  accepted: { label: '수락됨', icon: CheckCircle, color: 'text-[#5c7a00] bg-[#E8F5D4]' },
  rejected: { label: '거절됨', icon: XCircle,     color: 'text-[#D43B3B] bg-[#F5D4D4]' },
};

export default function AdminInquiriesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AdminInquiry[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/');
  }, [user, loading, router]);

  const load = async () => {
    setFetching(true);
    try {
      const { data } = await api.get('/admin/inquiries');
      // findAndCount returns [array, count]
      setItems(Array.isArray(data[0]) ? data[0] : data);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { if (user?.role === 'admin') load(); }, [user]);

  const del = async (id: string) => {
    if (!confirm('이 문의를 삭제하시겠습니까?')) return;
    await api.delete(`/admin/inquiries/${id}`);
    load();
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-bg flex">
      <AdminSidebar />
      <div className="flex-1 p-8 max-w-[900px]">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-9 h-9 bg-[#1A1918] rounded-xl flex items-center justify-center">
            <Handshake size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-text-primary leading-none">문의 관리</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">전체 사업 문의 조회 및 삭제</p>
          </div>
          <span className="ml-auto text-[12px] text-text-secondary bg-card border border-border rounded-full px-3 py-1">
            총 {items.length}건
          </span>
        </div>

        {fetching ? (
          <div className="text-center py-20 text-text-secondary text-[13px]">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-20 text-center">
            <Handshake size={28} className="text-text-secondary/30 mx-auto mb-3" />
            <p className="text-text-secondary text-[14px]">문의 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const st = STATUS_MAP[item.status];
              const StIcon = st.icon;
              return (
                <div key={item.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[14px] text-text-primary">{item.title}</p>
                      <p className="text-[12px] text-text-secondary mt-0.5">
                        {item.service ? (
                          <Link href={`/services/${item.service.id}`} className="hover:underline">{item.service.name}</Link>
                        ) : '삭제된 서비스'}
                        {' · '}@{item.sender?.nickname ?? '-'} → @{item.receiver?.nickname ?? '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${st.color}`}>
                        <StIcon size={11} /> {st.label}
                      </span>
                      <button onClick={() => del(item.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center border border-border text-text-secondary hover:bg-[#F5D4D4] hover:border-[#D43B3B] hover:text-[#D43B3B] transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[12.5px] text-text-secondary leading-relaxed bg-bg rounded-xl px-3 py-2.5 line-clamp-2">
                    {item.message}
                  </p>
                  <p className="text-[11px] text-text-secondary/50">
                    {new Date(item.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
