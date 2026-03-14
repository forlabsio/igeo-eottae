'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { REGION_MAP } from '@/components/ServiceCard';

interface Category { id: string; name: string; slug: string; }

const REGIONS = Object.entries(REGION_MAP).map(([slug, { flag, label }]) => ({ slug, flag, label }));

export default function EditServicePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: '', description: '', url: '', categoryId: '' });
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id || loading) return;
    if (!user) return; // login redirect handled by other effect
    api.get(`/services/${id}`)
      .then(({ data }) => {
        if (data.userId && data.userId !== user.id) {
          router.replace(`/services/${id}`);
          return;
        }
        setForm({
          name: data.name ?? '',
          description: data.description ?? '',
          url: data.url ?? '',
          categoryId: data.categoryId ?? '',
        });
        setSelectedRegions(data.targetRegions ?? []);
      })
      .catch(() => router.replace('/mypage'))
      .finally(() => setFetching(false));
  }, [id, router, user, loading]);

  const toggleRegion = (slug: string) => {
    setSelectedRegions((prev) =>
      prev.includes(slug) ? prev.filter((r) => r !== slug) : [...prev, slug]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || undefined,
        targetRegions: selectedRegions.length > 0 ? selectedRegions : [],
      };
      await api.patch(`/services/${id}`, payload);
      router.push(`/services/${id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || '수정에 실패했습니다.'));
    }
  };

  if (loading || fetching) return <div className="p-8 text-[14px] text-text-secondary">로딩 중...</div>;

  return (
    <div className="max-w-[680px] mx-auto px-8 py-10">
      <div className="mb-7">
        <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">서비스 수정</h1>
        <p className="text-[14px] text-text-secondary mt-1.5">서비스 정보를 수정하세요.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div>
            <label className="text-[13px] font-semibold text-text-primary mb-1.5 block">서비스 이름 *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-[14px] bg-bg text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-text-secondary transition-colors"
              placeholder="AI Meeting Summary" required />
          </div>

          <div>
            <label className="text-[13px] font-semibold text-text-primary mb-1.5 block">서비스 설명 *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-[14px] bg-bg text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-text-secondary transition-colors h-28 resize-none"
              placeholder="서비스를 간략하게 설명해 주세요." required />
          </div>

          <div>
            <label className="text-[13px] font-semibold text-text-primary mb-1.5 block">서비스 링크 *</label>
            <input type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && !v.match(/^https?:\/\//)) setForm((f) => ({ ...f, url: `https://${v}` }));
              }}
              className="w-full border border-border rounded-xl px-4 py-3 text-[14px] bg-bg text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-text-secondary transition-colors"
              placeholder="example.com" required />
          </div>

          <div>
            <label className="text-[13px] font-semibold text-text-primary mb-1.5 block">카테고리 <span className="text-text-secondary font-normal">(선택)</span></label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-[14px] bg-bg text-text-primary focus:outline-none focus:border-text-secondary transition-colors appearance-none">
              <option value="">카테고리 선택</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Target regions */}
          <div>
            <label className="text-[13px] font-semibold text-text-primary mb-2 block">
              타겟 지역 <span className="text-text-secondary font-normal">(선택, 복수 가능)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map(({ slug, flag, label }) => {
                const on = selectedRegions.includes(slug);
                return (
                  <button key={slug} type="button" onClick={() => toggleRegion(slug)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all duration-150 ${
                      on
                        ? 'bg-[#1A1918] text-white border-[#1A1918]'
                        : 'bg-bg border-border text-text-secondary hover:border-[#1A1918]/40 hover:text-text-primary'
                    }`}>
                    <span>{flag}</span> {label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-[13px] text-danger bg-danger/10 px-4 py-2.5 rounded-xl">{error}</p>}

          <div className="flex justify-end gap-2.5 pt-1">
            <button type="button" onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl text-[14px] border border-border text-text-secondary hover:text-text-primary hover:bg-bg transition-all">
              취소
            </button>
            <button type="submit"
              className="px-6 py-2.5 rounded-xl text-[14px] font-semibold bg-[#1A1918] text-white hover:bg-[#2d2c2b] transition-all">
              수정하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
