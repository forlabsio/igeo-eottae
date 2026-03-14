'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menus = [
  { label: '대시보드', href: '/admin' },
  { label: '회원 관리', href: '/admin/users' },
  { label: '서비스 관리', href: '/admin/services' },
  { label: '문의 관리', href: '/admin/inquiries' },
];

export default function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="w-[220px] bg-card border-r border-border p-5 min-h-screen flex-shrink-0">
      <p className="text-[11px] font-bold text-text-secondary/60 uppercase tracking-widest mb-3 px-2">관리 메뉴</p>
      {menus.map((m) => (
        <Link key={m.href} href={m.href}
          className={`flex items-center px-3 py-2.5 rounded-xl text-[13.5px] font-medium mb-1 transition-all ${
            path === m.href
              ? 'bg-text-primary text-bg'
              : 'text-text-secondary hover:text-text-primary hover:bg-border/60'
          }`}>
          {m.label}
        </Link>
      ))}
    </aside>
  );
}
