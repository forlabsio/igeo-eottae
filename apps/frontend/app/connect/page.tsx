'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import Link from 'next/link';
import { Mail, Clock, CheckCircle, XCircle, Handshake } from 'lucide-react';

interface Inquiry {
  id: string;
  title: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  service: { id: string; name: string } | null;
  senderNickname: string;
  receiverNickname: string;
  senderEmail: string | null;
  receiverEmail: string | null;
}

const STATUS_MAP = {
  pending:  { label: '대기중',  icon: Clock,        color: 'text-[#D4903B] bg-[#2E1E0A]' },
  accepted: { label: '수락됨',  icon: CheckCircle,  color: 'text-accent-green bg-[#1D2E10]' },
  rejected: { label: '거절됨',  icon: XCircle,      color: 'text-danger bg-danger/15' },
};

function InquiryCard({ item, tab, onAction }: { item: Inquiry; tab: 'received' | 'sent'; onAction: () => void }) {
  const st = STATUS_MAP[item.status];
  const StIcon = st.icon;
  const partnerNick = tab === 'received' ? item.senderNickname : item.receiverNickname;
  const partnerEmail = tab === 'received' ? item.senderEmail : item.receiverEmail;

  const accept = async () => { await api.patch(`/inquiries/${item.id}/accept`); onAction(); };
  const reject = async () => { await api.patch(`/inquiries/${item.id}/reject`); onAction(); };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] text-text-primary leading-tight">{item.title}</p>
          <p className="text-[12px] text-text-secondary mt-0.5">
            {item.service ? (
              <Link href={`/services/${item.service.id}`} className="hover:underline">{item.service.name}</Link>
            ) : '삭제된 서비스'}
            {' · '}@{partnerNick}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${st.color}`}>
          <StIcon size={11} /> {st.label}
        </span>
      </div>

      <p className="text-[13px] text-text-secondary leading-relaxed bg-bg rounded-xl px-3.5 py-2.5">
        {item.message}
      </p>

      {/* 수락 시 이메일 공개 */}
      {item.status === 'accepted' && partnerEmail && (
        <div className="flex items-center gap-2 bg-[#1D2E10] border border-accent-green/30 rounded-xl px-3.5 py-2.5">
          <Mail size={13} className="text-accent-green flex-shrink-0" />
          <div>
            <p className="text-[11px] text-accent-green font-bold">연결 이메일</p>
            <p className="text-[13px] font-semibold text-text-primary">{partnerEmail}</p>
          </div>
        </div>
      )}

      {/* 오너: 수락/거절 버튼 */}
      {tab === 'received' && item.status === 'pending' && (
        <div className="flex gap-2">
          <button onClick={accept}
            className="flex-1 py-2 rounded-xl text-[13px] font-semibold bg-text-primary text-bg hover:bg-text-primary/90 transition-all">
            수락하기
          </button>
          <button onClick={reject}
            className="flex-1 py-2 rounded-xl text-[13px] font-semibold border border-border text-text-secondary hover:bg-card-elevated transition-all">
            거절하기
          </button>
        </div>
      )}

      <p className="text-[11px] text-text-secondary/50">
        {new Date(item.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}

export default function ConnectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [items, setItems] = useState<Inquiry[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const load = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const { data } = await api.get(`/inquiries/${tab}`);
      setItems(data);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { load(); }, [tab, user]);

  const pending = items.filter((i) => i.status === 'pending').length;

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[720px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-card-elevated border border-border rounded-xl flex items-center justify-center">
            <Handshake size={16} className="text-accent-green" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-text-primary leading-none">Connect</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">사업 문의 관리</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit mb-6">
          {([['received', '받은 문의'], ['sent', '보낸 문의']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                tab === val ? 'bg-text-primary text-bg' : 'text-text-secondary hover:text-text-primary'
              }`}>
              {label}
              {val === 'received' && pending > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-green rounded-full text-[10px] font-black text-black flex items-center justify-center">
                  {pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {fetching ? (
          <div className="text-center py-20 text-text-secondary text-[13px]">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-20 text-center">
            <div className="w-14 h-14 bg-bg border border-border rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Handshake size={22} className="text-text-secondary/30" />
            </div>
            <p className="font-semibold text-text-primary mb-1">
              {tab === 'received' ? '받은 문의가 없어요' : '보낸 문의가 없어요'}
            </p>
            <p className="text-[13px] text-text-secondary">
              {tab === 'received' ? '서비스에 관심있는 파트너가 Connect 요청을 보낼 거예요' : '서비스 상세에서 Connect 버튼을 눌러 문의하세요'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <InquiryCard key={item.id} item={item} tab={tab} onAction={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
