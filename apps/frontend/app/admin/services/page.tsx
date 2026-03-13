'use client';
import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import api from '@/lib/api';

interface AdminService {
  id: string;
  name: string;
  description: string;
  isHidden: boolean;
  likeCount: number;
  createdAt: string;
  user?: { nickname: string };
  category?: { name: string };
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<AdminService[]>([]);

  const load = () => api.get('/admin/services').then(({ data }) => setServices(data[0]));
  useEffect(() => { load(); }, []);

  const hide = async (id: string) => {
    await api.patch(`/admin/services/${id}/hide`);
    load();
  };
  const del = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await api.delete(`/admin/services/${id}`);
    load();
  };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">서비스 관리</h1>
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg text-xs text-text-secondary font-semibold">
              <tr>
                {['서비스명', '등록자', '카테고리', '좋아요', '상태', '등록일', '작업'].map((h) => (
                  <th key={h} className="text-left px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3.5 text-sm font-medium max-w-[180px] truncate">{s.name}</td>
                  <td className="px-4 py-3.5 text-sm text-text-secondary">@{s.user?.nickname}</td>
                  <td className="px-4 py-3.5 text-xs text-text-secondary">{s.category?.name ?? '-'}</td>
                  <td className="px-4 py-3.5 text-sm font-medium">▲ {s.likeCount}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${s.isHidden ? 'bg-red-100 text-danger' : 'bg-accent-green text-black'}`}>
                      {s.isHidden ? '숨김' : '공개'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-text-secondary">
                    {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => hide(s.id)} className="border border-border text-xs px-2 py-1 rounded text-text-secondary hover:bg-bg">
                        {s.isHidden ? '공개' : '숨김'}
                      </button>
                      <button onClick={() => del(s.id)} className="bg-danger text-white text-xs px-2 py-1 rounded">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-secondary text-sm">서비스가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
