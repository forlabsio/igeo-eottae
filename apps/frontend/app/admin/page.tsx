'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from '@/components/AdminSidebar';
import api from '@/lib/api';
import { Users, Package, Heart, ShieldOff } from 'lucide-react';

interface Stats { totalUsers: number; totalServices: number; totalLikes: number; blockedUsers: number; }

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
    }
  }, [user]);

  if (loading || !user || user.role !== 'admin') return null;

  const cards = [
    { label: '총 회원수', value: stats?.totalUsers ?? '-', icon: Users, color: 'bg-[#0E2230]', text: '#3B9ED4' },
    { label: '등록 서비스', value: stats?.totalServices ?? '-', icon: Package, color: 'bg-[#1D2E10]', text: '#7CC71A' },
    { label: '총 좋아요', value: stats?.totalLikes ?? '-', icon: Heart, color: 'bg-[#2E1E0A]', text: '#D4903B' },
    { label: '차단 회원', value: stats?.blockedUsers ?? '-', icon: ShieldOff, color: 'bg-[#2E0A0A]', text: '#D43B3B' },
  ];

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8 bg-bg min-h-screen">
        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-widest text-text-secondary/50 uppercase mb-1">Admin</p>
          <h1 className="text-[24px] font-extrabold text-text-primary">대시보드</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map(({ label, value, icon: Icon, color, text }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-5">
              <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={16} style={{ color: text }} />
              </div>
              <p className="text-[28px] font-extrabold text-text-primary leading-none">{value}</p>
              <p className="text-[12px] text-text-secondary mt-1.5 font-medium">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-[13px] text-text-secondary bg-card border border-border rounded-xl px-4 py-3 w-fit">
          사이드바에서 회원 관리 또는 서비스 관리를 선택하세요.
        </p>
      </div>
    </div>
  );
}
