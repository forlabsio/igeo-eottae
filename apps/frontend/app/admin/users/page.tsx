'use client';
import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import api from '@/lib/api';

interface AdminUser {
  id: string;
  nickname: string;
  email: string;
  isBlocked: boolean;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  const load = () => api.get('/admin/users').then(({ data }) => setUsers(data[0]));
  useEffect(() => { load(); }, []);

  const block = async (id: string) => {
    await api.patch(`/admin/users/${id}/block`);
    load();
  };
  const del = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await api.delete(`/admin/users/${id}`);
    load();
  };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">회원 관리</h1>
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg text-xs text-text-secondary font-semibold">
              <tr>
                {['닉네임', '이메일', '상태', '가입일', '작업'].map((h) => (
                  <th key={h} className="text-left px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-5 py-3.5 text-sm font-medium">{u.nickname}</td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${u.isBlocked ? 'bg-red-100 text-danger' : 'bg-accent-green text-black'}`}>
                      {u.isBlocked ? '차단' : '활성'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-text-secondary">
                    {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => block(u.id)} className="border border-border text-xs px-2 py-1 rounded text-text-secondary hover:bg-bg">
                        {u.isBlocked ? '해제' : '차단'}
                      </button>
                      <button onClick={() => del(u.id)} className="bg-danger text-white text-xs px-2 py-1 rounded">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-text-secondary text-sm">회원이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
