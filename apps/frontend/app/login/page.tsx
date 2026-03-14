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
      document.cookie = `accessToken=${data.accessToken}; path=/; max-age=604800; SameSite=Strict`;
      const { data: me } = await api.get('/users/me');
      setUser(me);
      router.push('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 bg-accent-green text-black text-[12px] font-bold px-3 py-1 rounded-full">
            ✦ BuildBoard
          </span>
          <h1 className="text-[26px] font-extrabold text-text-primary mt-4 tracking-tight">다시 만나서 반가워요</h1>
          <p className="text-[14px] text-text-secondary mt-1.5">계정에 로그인하여 서비스를 탐색하세요.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="text-[13px] font-semibold text-text-primary mb-1.5 block">이메일</label>
              <input type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-border rounded-xl px-4 py-3 text-[14px] bg-bg text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-text-secondary transition-colors"
                placeholder="hello@example.com" required />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-text-primary mb-1.5 block">비밀번호</label>
              <input type="password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-border rounded-xl px-4 py-3 text-[14px] bg-bg text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-text-secondary transition-colors"
                placeholder="••••••••" required />
            </div>
            {error && (
              <p className="text-[13px] text-danger bg-danger/10 px-4 py-2.5 rounded-xl">{error}</p>
            )}
            <button type="submit"
              className="w-full bg-text-primary text-bg py-3.5 rounded-xl text-[14.5px] font-semibold mt-1 hover:bg-text-primary/90 transition-all">
              로그인
            </button>
          </form>
          <p className="text-center text-[13px] text-text-secondary mt-5">
            계정이 없으신가요?{' '}
            <Link href="/register" className="font-semibold text-text-primary hover:underline">회원가입</Link>
          </p>
        </div>

        <div className="mt-4 bg-accent-green/20 border border-accent-green/40 rounded-xl px-5 py-3 text-[13px] font-medium text-text-primary text-center">
          한국 메이커들이 만든 서비스를 발견하세요 ✦
        </div>
      </div>
    </div>
  );
}
