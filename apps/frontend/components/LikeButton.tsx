'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

interface Props { serviceId: string; count: number; isLiked?: boolean; size?: 'sm' | 'lg'; }

export default function LikeButton({ serviceId, count: initCount, isLiked: initLiked, size = 'sm' }: Props) {
  const [liked, setLiked] = useState(initLiked ?? false);
  const [count, setCount] = useState(initCount);
  const [popping, setPopping] = useState(false);
  const [counting, setCounting] = useState(false);
  const countKey = useRef(0);

  useEffect(() => {
    setLiked(initLiked ?? false);
    setCount(initCount);
  }, [initLiked, initCount]);

  const toggle = async () => {
    try {
      const { data } = await api.post(`/services/${serviceId}/like`);
      setLiked(data.liked);
      setCount((c) => data.liked ? c + 1 : c - 1);
      if (data.liked) {
        setPopping(true);
        setTimeout(() => setPopping(false), 400);
      }
      countKey.current += 1;
      setCounting(true);
      setTimeout(() => setCounting(false), 300);
    } catch {
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
  };

  if (size === 'lg') {
    return (
      <button onClick={toggle}
        className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 ${
          liked
            ? 'bg-accent-green border-accent-green text-black'
            : 'bg-card border-border text-text-secondary hover:border-text-secondary hover:text-text-primary'
        }`}>
        <span className={popping ? 'like-pop inline-block' : 'inline-block'}>
          {liked ? '★' : '☆'}
        </span>
        <span key={countKey.current} className={counting ? 'count-in inline-block tabular-nums font-bold' : 'inline-block tabular-nums font-bold'}>
          {count}
        </span>
      </button>
    );
  }

  /* sm — vertical pill on card left side */
  return (
    <button onClick={toggle}
      className={`flex flex-col items-center justify-center gap-0.5 w-[68px] self-stretch rounded-l-xl border-r border-border transition-all duration-150 cursor-pointer flex-shrink-0 ${
        liked ? 'bg-accent-green/20' : 'bg-transparent hover:bg-border/50'
      }`}>
      <span className={`text-[16px] leading-none ${popping ? 'like-pop inline-block' : 'inline-block'} ${liked ? 'text-[#5c7a00]' : 'text-text-secondary'}`}>
        {liked ? '★' : '☆'}
      </span>
      <span
        key={countKey.current}
        className={`text-[12px] font-bold tabular-nums leading-none ${counting ? 'count-in inline-block' : 'inline-block'} ${liked ? 'text-[#5c7a00]' : 'text-text-secondary'}`}>
        {count}
      </span>
    </button>
  );
}
