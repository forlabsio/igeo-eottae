'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      document.cookie = `accessToken=${data.accessToken}; path=/; max-age=604800; SameSite=Strict`;
      const { data: me } = await api.get('/users/me');
      setUser(me);
      router.push('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || '회원가입에 실패했습니다.'));
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 bg-accent-green text-black text-[12px] font-bold px-3 py-1 rounded-full">
            ✦ BuildBoard
          </span>
          <h1 className="text-[26px] font-extrabold text-text-primary mt-4 tracking-tight">새 계정 만들기</h1>
          <p className="text-[14px] text-text-secondary mt-1.5">
            {reason === 'link' ? '웹사이트 방문은 회원만 가능해요. 가입하고 모든 서비스를 탐색하세요.' : '서비스를 등록하고 커뮤니티와 공유하세요.'}
          </p>
        </div>
        {reason === 'link' && (
          <div className="bg-accent-green/20 border border-accent-green/40 rounded-xl px-4 py-3 mb-4 text-[13px] font-medium text-text-primary text-center">
            회원가입 후 모든 서비스 링크에 자유롭게 접근할 수 있어요 🔓
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          <form onSubmit={submit} className="flex flex-col gap-4">
            {([
              { label: '닉네임', key: 'nickname', type: 'text', placeholder: 'maker_kim' },
              { label: '이메일', key: 'email', type: 'email', placeholder: 'hello@example.com' },
              { label: '비밀번호', key: 'password', type: 'password', placeholder: '8자 이상 입력하세요' },
            ] as const).map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="text-[13px] font-semibold text-text-primary mb-1.5 block">{label}</label>
                <input type={type} value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-border rounded-xl px-4 py-3 text-[14px] bg-bg text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-text-secondary transition-colors"
                  placeholder={placeholder} required />
              </div>
            ))}
            {error && (
              <p className="text-[13px] text-danger bg-danger/10 px-4 py-2.5 rounded-xl">{error}</p>
            )}
            <button type="submit"
              className="w-full bg-text-primary text-bg py-3.5 rounded-xl text-[14.5px] font-semibold mt-1 hover:bg-text-primary/90 transition-all">
              회원가입
            </button>
          </form>
          <p className="text-center text-[13px] text-text-secondary mt-5">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="font-semibold text-text-primary hover:underline">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
