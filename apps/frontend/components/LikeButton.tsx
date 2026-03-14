'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

interface Props { serviceId: string; count: number; isLiked?: boolean; size?: 'sm' | 'lg'; }

export default function LikeButton({ serviceId, count: initialCount, isLiked: initialLiked, size = 'sm' }: Props) {
  const [liked, setLiked] = useState(initialLiked ?? false);
  const [count, setCount] = useState(initialCount);
  const [animate, setAnimate] = useState(false);
  const prevLiked = useRef(initialLiked ?? false);

  useEffect(() => {
    setLiked(initialLiked ?? false);
    setCount(initialCount);
    prevLiked.current = initialLiked ?? false;
  }, [initialLiked, initialCount]);

  const toggle = async () => {
    try {
      const { data } = await api.post(`/services/${serviceId}/like`);
      setLiked(data.liked);
      setCount((c) => data.liked ? c + 1 : c - 1);
      if (data.liked) {
        setAnimate(true);
        setTimeout(() => setAnimate(false), 600);
      }
    } catch {
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
  };

  if (size === 'lg') {
    return (
      <button onClick={toggle}
        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium border transition-all duration-200 ${liked ? 'bg-amber-50 border-amber-400 text-amber-600' : 'border-border text-text-secondary hover:bg-bg'}`}>
        <span className={`text-lg transition-transform duration-200 ${animate ? 'scale-125' : 'scale-100'}`}>
          {liked ? '★' : '☆'}
        </span>
        <span className={`font-bold tabular-nums ${animate ? 'text-amber-600' : ''}`}>{count}</span>
      </button>
    );
  }

  return (
    <button onClick={toggle}
      className={`flex flex-col items-center justify-center gap-0.5 w-[72px] h-full border-r border-border cursor-pointer transition-colors duration-200 ${liked ? 'bg-amber-50' : 'bg-transparent hover:bg-bg'}`}>
      <span className={`text-base transition-all duration-200 ${liked ? 'text-amber-500' : 'text-text-secondary'} ${animate ? 'scale-125' : 'scale-100'}`}>
        {liked ? '★' : '☆'}
      </span>
      <span className={`text-xs font-bold tabular-nums transition-colors duration-200 ${liked ? 'text-amber-600' : 'text-text-secondary'}`}>
        {count}
      </span>
    </button>
  );
}
