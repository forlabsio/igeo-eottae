import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/mypage', '/services/new', '/admin', '/bookmarks'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  if (PROTECTED.some((p) => request.nextUrl.pathname.startsWith(p)) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/mypage/:path*', '/services/new', '/admin/:path*', '/bookmarks'] };
