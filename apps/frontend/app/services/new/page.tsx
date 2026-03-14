'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Category { id: string; name: string; slug: string; }

export default function NewServicePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: '', description: '', url: '', categoryId: '', imageUrl: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || undefined,
        imageUrl: form.imageUrl || undefined,
      };
      const { data } = await api.post('/services', payload);
      router.push(`/services/${data.id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || '등록에 실패했습니다.'));
    }
  };

  if (loading) return <div className="p-8 text-text-secondary">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-bg py-10 px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">서비스 등록</h1>
        <p className="text-sm text-text-secondary mb-8">만든 서비스나 사업 아이디어를 커뮤니티에 공유하세요.</p>
        <div className="bg-white border border-border rounded-lg p-8">
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div>
              <label className="text-sm font-semibold mb-2 block">서비스 이름 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg" placeholder="AI Meeting Summary" required />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">서비스 설명 *</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg h-28 resize-none"
                placeholder="서비스를 10자 이상 설명해 주세요." required />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">서비스 링크 *</label>
              <input type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && !v.match(/^https?:\/\//)) setForm((f) => ({ ...f, url: `https://${v}` }));
                }}
                className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg" placeholder="example.com" required />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">대표 이미지 URL (선택)</label>
              <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg" placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">카테고리 (선택)</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg">
                <option value="">카테고리 선택</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => router.back()} className="border border-border px-6 py-3 rounded text-sm text-text-secondary">취소</button>
              <button type="submit" className="bg-black text-white px-6 py-3 rounded text-sm font-semibold">서비스 등록하기</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
