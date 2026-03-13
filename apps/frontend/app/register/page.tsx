'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="bg-white border border-border rounded-xl p-10 w-[440px] flex flex-col gap-5">
        <div className="text-xl font-bold">이거 어때</div>
        <div>
          <h1 className="text-xl font-semibold">새 계정 만들기</h1>
          <p className="text-sm text-text-secondary mt-1">서비스를 등록하고 커뮤니티와 공유하세요.</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {([
            { label: '닉네임', key: 'nickname', type: 'text', placeholder: 'maker_kim' },
            { label: '이메일', key: 'email', type: 'email', placeholder: 'hello@example.com' },
            { label: '비밀번호', key: 'password', type: 'password', placeholder: '8자 이상 입력하세요' },
          ] as const).map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-sm font-medium mb-1.5 block">{label}</label>
              <input type={type} value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg"
                placeholder={placeholder} required />
            </div>
          ))}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="w-full bg-black text-white py-3.5 rounded text-sm font-semibold mt-2">회원가입</button>
        </form>
        <p className="text-center text-sm text-text-secondary">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold text-black">로그인</Link>
        </p>
      </div>
    </div>
  );
}
