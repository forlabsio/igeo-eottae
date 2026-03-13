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
    <div>
      {/* Hero */}
      <div className="bg-white border-b border-border py-16 flex flex-col items-center gap-4">
        <span className="bg-accent-green text-black text-xs font-semibold px-3 py-1 rounded-full">
          Korean Makers Platform
        </span>
        <h1 className="text-4xl font-bold text-text-primary text-center">당신의 서비스를 세상에 알리세요</h1>
        <p className="text-text-secondary text-center max-w-md">직접 만든 서비스와 사업 아이디어를 등록하고, 커뮤니티의 피드백을 받아보세요.</p>
        <div className="flex gap-3 mt-2">
          <Link href="/services/new" className="bg-black text-white px-6 py-3 rounded text-sm font-semibold">
            서비스 등록하기
          </Link>
          <Link href="/services" className="border border-border text-text-primary px-6 py-3 rounded text-sm">
            서비스 탐색하기
          </Link>
        </div>
      </div>

      {/* 서비스 목록 */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        {services.length > 0 ? (
          <div className="flex flex-col gap-3">
            {services.map((s) => <ServiceCard key={s.id} service={s} />)}
          </div>
        ) : (
          <div className="text-center py-12 text-text-secondary">아직 등록된 서비스가 없습니다.</div>
        )}
        <div className="text-center mt-8">
          <Link href="/services" className="text-sm border border-border px-6 py-3 rounded text-text-secondary hover:bg-bg">
            전체 서비스 보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
