'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      const { data: me } = await api.get('/users/me');
      setUser(me);
      router.push('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="bg-white border border-border rounded-xl p-10 w-[440px] flex flex-col gap-6">
        <div className="text-xl font-bold">이거 어때</div>
        <div>
          <h1 className="text-xl font-semibold">다시 만나서 반가워요 👋</h1>
          <p className="text-sm text-text-secondary mt-1">계정에 로그인하여 서비스를 탐색하세요.</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">이메일</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg" placeholder="hello@example.com" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">비밀번호</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg" placeholder="••••••••" required />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="w-full bg-black text-white py-3.5 rounded text-sm font-semibold mt-2">로그인</button>
        </form>
        <p className="text-center text-sm text-text-secondary">
          계정이 없으신가요?{' '}
          <Link href="/register" className="font-semibold text-black">회원가입</Link>
        </p>
        <div className="bg-accent-green rounded px-4 py-3 text-sm font-medium text-black">
          한국 메이커들이 만든 서비스를 발견하세요!
        </div>
      </div>
    </div>
  );
}
