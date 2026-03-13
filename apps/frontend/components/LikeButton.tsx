'use client';
import { useState } from 'react';
import api from '@/lib/api';

interface Props { serviceId: string; count: number; isLiked?: boolean; size?: 'sm' | 'lg'; }

export default function LikeButton({ serviceId, count: initialCount, isLiked: initialLiked, size = 'sm' }: Props) {
  const [liked, setLiked] = useState(initialLiked ?? false);
  const [count, setCount] = useState(initialCount);

  const toggle = async () => {
    try {
      const { data } = await api.post(`/services/${serviceId}/like`);
      setLiked(data.liked);
      setCount((c) => data.liked ? c + 1 : c - 1);
    } catch {
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
  };

  const base = size === 'lg'
    ? 'flex flex-col items-center justify-center gap-1 px-6 py-4 rounded-lg cursor-pointer'
    : 'flex flex-col items-center justify-center gap-1 w-[72px] h-full border-r border-border cursor-pointer';

  return (
    <button onClick={toggle} className={`${base} ${liked ? 'bg-accent-green' : 'bg-transparent hover:bg-bg'}`}>
      <span className={`text-sm font-bold ${liked ? 'text-black' : 'text-text-secondary'}`}>▲</span>
      <span className={`text-xs font-bold ${liked ? 'text-black' : 'text-text-secondary'}`}>{count}</span>
    </button>
  );
}
