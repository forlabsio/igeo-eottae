import Link from 'next/link';
import ServiceCard from '@/components/ServiceCard';
import { ArrowRight, Zap, Plus } from 'lucide-react';

interface ServiceItem {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; isHidden: boolean; categoryId?: string; categoryName?: string;
  userId: string; userNickname?: string; isLiked?: boolean; isBookmarked?: boolean; createdAt: string;
}

async function getTopServices(): Promise<ServiceItem[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const res = await fetch(`${apiUrl}/services?sort=likes&limit=6`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const services = await getTopServices();

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Hero ── */}
      <div className="bg-card border-b border-border overflow-hidden relative">
        {/* Background grid decoration */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#F2F0EB 0,#F2F0EB 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#F2F0EB 0,#F2F0EB 1px,transparent 1px,transparent 40px)' }} />

        <div className="max-w-[1120px] mx-auto px-8 py-16 relative">
          <div className="flex flex-col gap-5 max-w-[560px]">
              <span className="inline-flex items-center gap-1.5 bg-accent-green text-black text-[11px] font-extrabold px-3 py-1.5 rounded-full tracking-widest w-fit">
                <Zap size={11} /> MAKERS PLATFORM
              </span>
              <h1 className="text-[48px] font-extrabold text-text-primary leading-[1.08] tracking-tight">
                당신의 서비스를<br />
                <span className="relative inline-block">
                  세상에 알리세요
                  <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-accent-green rounded-full" />
                </span>
              </h1>
              <p className="text-[15px] text-text-secondary leading-relaxed">
                서비스를 등록하고 발견하세요. 마음에 드는 팀에<br />
                Connect로 사업 문의를 보내고 협업 기회를 찾으세요.
              </p>
              <div className="flex gap-3 mt-1">
                <Link href="/services/new"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold bg-accent-green text-black hover:bg-accent-green/90 transition-all">
                  <Plus size={15} />
                  서비스 등록하기
                </Link>
                <Link href="/services"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium border border-border text-text-primary hover:bg-card-elevated transition-all group">
                  둘러보기
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
          </div>
        </div>
      </div>

      {/* ── Top services ── */}
      <div className="max-w-[1120px] mx-auto px-8 py-10">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent-green rounded-xl flex items-center justify-center">
              <Zap size={15} className="text-black" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-text-primary leading-none">인기 서비스</h2>
              <p className="text-[12px] text-text-secondary mt-0.5">좋아요를 가장 많이 받은 서비스</p>
            </div>
          </div>
          <Link href="/services"
            className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary hover:text-text-primary border border-border px-4 py-2 rounded-xl transition-all hover:bg-card-elevated group">
            전체 보기
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {services.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => <ServiceCard key={s.id} service={s} />)}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl py-20 text-center">
            <div className="w-16 h-16 bg-bg border border-border rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap size={24} className="text-text-secondary/30" />
            </div>
            <p className="font-semibold text-text-primary mb-1">아직 등록된 서비스가 없어요</p>
            <p className="text-[13px] text-text-secondary mb-5">첫 번째 서비스를 등록해보세요!</p>
            <Link href="/services/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold bg-text-primary text-bg hover:bg-text-primary/90 transition-all">
              <Plus size={14} />
              첫 서비스 등록하기
            </Link>
          </div>
        )}

        {/* CTA bottom strip */}
        {services.length > 0 && (
          <div className="mt-8 bg-accent-green rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-black font-bold text-[15px]">내 서비스도 여기에 올리고 싶다면?</p>
              <p className="text-black/60 text-[13px] mt-0.5">등록하고, Connect로 파트너를 찾아보세요</p>
            </div>
            <Link href="/services/new"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13.5px] font-semibold bg-black text-white hover:bg-black/80 transition-all whitespace-nowrap flex-shrink-0">
              <Plus size={14} />
              지금 등록하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
