import Link from 'next/link';
import ServiceCard from '@/components/ServiceCard';

interface ServiceItem {
  id: string; name: string; description: string; url: string; imageUrl?: string;
  likeCount: number; isHidden: boolean; categoryId?: string; categoryName?: string;
  userId: string; userNickname?: string; isLiked?: boolean; isBookmarked?: boolean; createdAt: string;
}

async function getTopServices(): Promise<ServiceItem[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const res = await fetch(`${apiUrl}/services?sort=likes&limit=8`, { cache: 'no-store' });
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
    <div>
      {/* Hero */}
      <div className="bg-card border-b border-border">
        <div className="max-w-[1120px] mx-auto px-8 py-16 flex flex-col items-start gap-5">
          <span className="inline-flex items-center gap-1.5 bg-accent-green text-black text-[12px] font-bold px-3 py-1 rounded-full tracking-wide">
            ✦ Korean Makers Platform
          </span>
          <h1 className="text-[44px] font-extrabold text-text-primary leading-[1.12] tracking-tight max-w-xl">
            당신의 서비스를<br />세상에 알리세요
          </h1>
          <p className="text-[15px] text-text-secondary leading-relaxed max-w-md">
            직접 만든 서비스와 사업 아이디어를 등록하고,
            커뮤니티의 피드백과 관심을 받아보세요.
          </p>
          <div className="flex gap-3 mt-1">
            <Link href="/services/new"
              className="px-6 py-3 rounded-xl text-[14px] font-semibold bg-[#1A1918] text-white hover:bg-[#2d2c2b] transition-all">
              서비스 등록하기
            </Link>
            <Link href="/services"
              className="px-6 py-3 rounded-xl text-[14px] font-medium border border-border text-text-primary hover:bg-bg transition-all">
              서비스 탐색하기 →
            </Link>
          </div>
        </div>
      </div>

      {/* Top services */}
      <div className="max-w-[1120px] mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[20px] font-bold text-text-primary">인기 서비스</h2>
            <p className="text-[13px] text-text-secondary mt-0.5">좋아요 많이 받은 서비스들</p>
          </div>
          <Link href="/services"
            className="text-[13px] text-text-secondary hover:text-text-primary border border-border px-4 py-2 rounded-lg transition-all hover:bg-border/40">
            전체 보기 →
          </Link>
        </div>

        {services.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {services.map((s) => <ServiceCard key={s.id} service={s} />)}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <p className="text-[40px] mb-3">🌱</p>
            <p className="text-text-secondary font-medium">아직 등록된 서비스가 없습니다.</p>
            <Link href="/services/new"
              className="inline-block mt-4 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold bg-[#1A1918] text-white hover:bg-[#2d2c2b] transition-all">
              첫 서비스 등록하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
