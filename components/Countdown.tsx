'use client';

import { useEffect, useState } from 'react';
import { parseLocal } from '@/lib/dates';

export default function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = parseLocal(target).getTime() - now;
  if (diff <= 0) {
    return <p className="countdown-done">It&rsquo;s time. Go and take it.</p>;
  }
  const s = Math.floor(diff / 1000);
  const parts = [
    { v: Math.floor(s / 86400), l: 'days' },
    { v: Math.floor((s % 86400) / 3600), l: 'hrs' },
    { v: Math.floor((s % 3600) / 60), l: 'min' },
    { v: s % 60, l: 'sec' },
  ];
  return (
    <div className="countdown" role="timer" aria-label={`${parts[0].v} days, ${parts[1].v} hours, ${parts[2].v} minutes left`}>
      {parts.map((p, i) => (
        <div key={p.l} className={`cd-unit${i === 0 ? ' cd-days' : ''}`}>
          <span className="cd-num">{i === 0 ? p.v : String(p.v).padStart(2, '0')}</span>
          <span className="cd-label">{p.l}</span>
        </div>
      ))}
    </div>
  );
}
