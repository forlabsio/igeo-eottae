'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Handshake, Bookmark, User, LogOut, Settings } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import api from '@/lib/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const path = usePathname();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get('/inquiries/received')
      .then(({ data }) => {
        setPendingCount(data.filter((i: { status: string }) => i.status === 'pending').length);
      })
      .catch(() => {});
  }, [user, path]); // path 변경 시(connect 페이지 방문 후) 재조회

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
        {/* Logo */}
        <div className="flex-1">
          <Link href="/" className="text-[17px] font-bold tracking-tight text-text-primary">
            BuildBoard
          </Link>
        </div>

        {/* Center nav */}
        <div className="flex items-center gap-1 bg-bg rounded-xl p-1 border border-border">
          {navLink('/', '홈')}
          {navLink('/services', '서비스 탐색')}
        </div>

        {/* Right */}
        <div className="flex-1 flex items-center justify-end gap-1.5">
          {user ? (
            <>
              {/* Connect icon btn */}
              <Link href="/connect"
                title="Connect — 사업 문의"
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-150 ${
                  path === '/connect'
                    ? 'bg-[#1A1918] text-white border-[#1A1918]'
                    : 'bg-card border-border text-text-secondary hover:text-text-primary hover:border-[#1A1918]/40 hover:bg-[#1A1918]/5'
                }`}>
                <Handshake size={15} />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </Link>

              {/* Bookmark icon btn */}
              <Link href="/bookmarks"
                title="관심목록"
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-150 ${
                  path === '/bookmarks'
                    ? 'bg-[#1A1918] text-white border-[#1A1918]'
                    : 'bg-card border-border text-text-secondary hover:text-text-primary hover:border-[#1A1918]/40 hover:bg-[#1A1918]/5'
                }`}>
                <Bookmark size={15} />
              </Link>

              {/* Avatar dropdown */}
              <div className="relative ml-1" ref={dropRef}>
                <button
                  onClick={() => setDropOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-border/60 transition-all duration-150">
                  <div className="w-7 h-7 bg-accent-green rounded-full flex items-center justify-center text-[11px] font-black text-black flex-shrink-0">
                    {user.nickname[0].toUpperCase()}
                  </div>
                  <span className="text-[13px] font-semibold text-text-primary">{user.nickname}</span>
                </button>

                {dropOpen && (
                  <div className="absolute right-0 top-[calc(100%+6px)] w-[180px] bg-card border border-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] py-1.5 z-50">
                    <div className="px-4 py-2 border-b border-border mb-1">
                      <p className="text-[11px] text-text-secondary/60 font-medium">로그인 계정</p>
                      <p className="text-[13px] font-bold text-text-primary truncate">@{user.nickname}</p>
                    </div>
                    <Link href="/mypage" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-bg transition-all rounded-xl mx-1">
                      <User size={13} /> 마이페이지
                    </Link>
                    {user.role === 'admin' && (
                      <Link href="/admin" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-bg transition-all rounded-xl mx-1">
                        <Settings size={13} /> 관리자
                      </Link>
                    )}
                    <div className="border-t border-border mt-1 pt-1 mx-1">
                      <button onClick={() => { setDropOpen(false); logout(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-text-secondary hover:text-danger hover:bg-danger/5 transition-all rounded-xl">
                        <LogOut size={13} /> 로그아웃
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
