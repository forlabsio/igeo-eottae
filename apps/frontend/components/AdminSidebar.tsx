'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menus = [
  { label: '대시보드', href: '/admin' },
  { label: '회원 관리', href: '/admin/users' },
  { label: '서비스 관리', href: '/admin/services' },
];

export default function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="w-[220px] bg-white border-r border-border p-6 min-h-screen flex-shrink-0">
      <p className="text-xs font-semibold text-text-secondary mb-3">관리 메뉴</p>
      {menus.map((m) => (
        <Link key={m.href} href={m.href}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded text-sm mb-1 ${path === m.href ? 'bg-black text-white' : 'text-text-secondary hover:bg-bg'}`}>
          {m.label}
        </Link>
      ))}
    </aside>
  );
}
