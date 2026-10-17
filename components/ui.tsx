'use client';

import { useEffect, type ReactNode } from 'react';
import { fmtTime, parseLocal, relativeDay } from '@/lib/dates';
import type { Goal, PlanItem } from '@/lib/types';

export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <button className="sheet-scrim" aria-label="Close" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ItemRow({
  item,
  goal,
  showGoal,
  onToggle,
  onOpen,
}: {
  item: PlanItem;
  goal?: Goal;
  showGoal?: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const past = !item.done && parseLocal(item.date).getTime() + (item.durationMin ?? 60) * 60000 < Date.now();
  return (
    <li className={`item kind-${item.kind}${item.done ? ' is-done' : ''}`}>
      <button
        className="check"
        onClick={onToggle}
        aria-pressed={item.done}
        aria-label={item.done ? `Mark "${item.title}" as not done` : `Mark "${item.title}" as done`}
        style={goal ? ({ '--goal': goal.color } as React.CSSProperties) : undefined}
      >
        {item.done && <CheckIcon />}
      </button>
      <button className="item-main" onClick={onOpen}>
        <span className="item-title">{item.title}</span>
        <span className="item-meta">
          {showGoal && goal && (
            <span className="goal-tag">
              <i style={{ background: goal.color }} />
              {goal.title}
            </span>
          )}
          <span className="mono">
            {relativeDay(item.date)} · {fmtTime(item.date)}
            {item.durationMin ? ` · ${item.durationMin}m` : ''}
          </span>
          {item.kind === 'milestone' && <span className="pill pill-milestone">Milestone</span>}
          {item.kind === 'deadline' && <span className="pill pill-deadline">Exam</span>}
          {item.remindMin !== null && !item.done && (
            <span className="bell" aria-label="Reminder set">
              <BellIcon />
            </span>
          )}
          {past && <span className="pill pill-move">Move it</span>}
        </span>
      </button>
    </li>
  );
}

export function Field({ id, label, children, hint }: { id: string; label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="7" r="2.2" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="10" cy="17" r="2.2" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export const NavIcons = {
  home: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="9" ry="4.5" stroke="currentColor" strokeWidth="1.8" fill="none" transform="rotate(-20 12 12)" />
    </svg>
  ),
  goals: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  ),
  plan: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  wins: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 20h8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};
