'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const path = usePathname();

  const navLink = (href: string, label: string) => {
    const active = path === href || (href !== '/' && path.startsWith(href));
    return (
      <Link href={href}
        className={`px-4 py-1.5 rounded-lg text-[13.5px] font-medium transition-all duration-150 ${
          active ? 'bg-[#1A1918] text-white' : 'text-text-secondary hover:text-text-primary hover:bg-border/60'
        }`}>
        {label}
      </Link>
    );
  };

  return (
    <nav className="bg-card/90 backdrop-blur-md border-b border-border sticky top-0 z-50 h-[58px] flex items-center">
      <div className="max-w-[1120px] w-full mx-auto px-8 flex items-center">
        {/* Logo - flex-1 so it takes equal space as right section */}
        <div className="flex-1">
          <Link href="/" className="text-[17px] font-bold tracking-tight text-text-primary">
            BuildBoard
          </Link>
        </div>

        {/* Center nav - truly centered */}
        <div className="flex items-center gap-1 bg-bg rounded-xl p-1 border border-border">
          {navLink('/', '홈')}
          {navLink('/services', '서비스 탐색')}
        </div>

        {/* Right - flex-1 with justify-end */}
        <div className="flex-1 flex items-center justify-end gap-2.5">
          {user ? (
            <>
              <Link href="/bookmarks"
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  path === '/bookmarks' ? 'bg-accent-green text-black' : 'text-text-secondary hover:text-text-primary hover:bg-border/60'
                }`}>
                ☆ 관심목록
              </Link>
              <Link href="/mypage" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-border/60 transition-all">
                <div className="w-7 h-7 bg-accent-green rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
                  {user.nickname[0].toUpperCase()}
                </div>
                <span className="text-[13.5px] font-medium text-text-primary">{user.nickname}</span>
              </Link>
              <button onClick={logout}
                className="px-3.5 py-1.5 rounded-lg text-[13px] text-text-secondary hover:text-text-primary hover:bg-border/60 transition-all">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login"
                className="px-4 py-2 rounded-lg text-[13.5px] font-medium border border-border text-text-secondary hover:text-text-primary hover:border-text-secondary transition-all">
                로그인
              </Link>
              <Link href="/register"
                className="px-4 py-2 rounded-lg text-[13.5px] font-semibold bg-[#1A1918] text-white hover:bg-[#2d2c2b] transition-all">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
