'use client';
import { useEffect, useState, useCallback } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data[0]);
    } catch {
      setError('회원 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const block = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/block`);
      await load();
    } catch {
      setError('차단 처리 중 오류가 발생했습니다.');
    }
  };

  const del = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      await load();
    } catch {
      setError('삭제 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">회원 관리</h1>
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-100 text-danger text-sm rounded">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-center py-16 text-text-secondary text-sm">불러오는 중...</div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
