'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-border h-[60px] flex items-center justify-between px-12">
      <Link href="/" className="text-lg font-bold text-black">이거 어때</Link>
      <div className="flex items-center gap-8">
        <Link href="/" className="text-sm font-semibold text-black">홈</Link>
        <Link href="/services" className="text-sm text-text-secondary">서비스 탐색</Link>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link href="/bookmarks" className="text-sm text-text-secondary hover:text-black">☆ 관심목록</Link>
            <Link href="/mypage" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent-green rounded-full flex items-center justify-center text-xs font-bold">
                {user.nickname[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium">{user.nickname}</span>
            </Link>
            <button onClick={logout} className="text-sm text-text-secondary">로그아웃</button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm border border-border px-4 py-2 rounded">로그인</Link>
            <Link href="/register" className="text-sm bg-black text-white px-4 py-2 rounded">회원가입</Link>
          </>
        )}
      </div>
    </nav>
  );
}
