'use client';

import { useEffect, type ReactNode } from 'react';
import {
  Bell,
  Building2,
  CalendarClock,
  Check,
  Clapperboard,
  Clock,
  Flag,
  GraduationCap,
  Package,
  Smartphone,
  Target,
  X,
  type LucideIcon,
} from 'lucide-react';
import { fmtTime, parseLocal, relativeDay } from '@/lib/dates';
import type { Goal, PlanItem } from '@/lib/types';

export const AREA_ICONS: Record<string, LucideIcon> = {
  certifications: GraduationCap,
  content: Clapperboard,
  products: Package,
  apps: Smartphone,
  'long game': Building2,
};

export function areaIcon(area: string): LucideIcon {
  return AREA_ICONS[area.trim().toLowerCase()] ?? Target;
}

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
            <X size={20} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
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

export function StatusBadge({ status }: { status: Goal['status'] }) {
  const label = { active: 'Active', next: 'Up next', later: 'Later', achieved: 'Achieved' }[status];
  return <span className={`badge badge-${status}`}>{label}</span>;
}

/** One plan step: checkbox, date column, title, meta. */
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
  const d = parseLocal(item.date);
  const overdue = !item.done && d.getTime() + (item.durationMin ?? 60) * 60000 < Date.now();
  return (
    <li className={`row kind-${item.kind}${item.done ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}`}>
      <button
        className="checkbox"
        onClick={onToggle}
        aria-pressed={item.done}
        aria-label={item.done ? `Mark "${item.title}" as not done` : `Mark "${item.title}" as done`}
      >
        {item.done && <Check size={14} strokeWidth={3} />}
      </button>
      <button className="row-main" onClick={onOpen}>
        <span className="row-date">
          <span className="row-day">{relativeDay(item.date)}</span>
          <span className="row-time">{fmtTime(item.date)}</span>
        </span>
        <span className="row-body">
          <span className="row-title">
            {item.kind === 'milestone' && <Flag size={14} className="row-kind" aria-label="Milestone" />}
            {item.kind === 'deadline' && <CalendarClock size={14} className="row-kind" aria-label="Exam or deadline" />}
            {item.title}
          </span>
          <span className="row-meta">
            {showGoal && goal && (
              <span className="goal-tag">
                <i style={{ background: goal.color }} />
                {goal.title}
              </span>
            )}
            {item.durationMin ? (
              <span className="meta-bit">
                <Clock size={12} /> {item.durationMin} min
              </span>
            ) : null}
            {item.remindMin !== null && !item.done && (
              <span className="meta-bit" aria-label="Reminder set">
                <Bell size={12} />
              </span>
            )}
            {overdue && <span className="badge badge-warn">Reschedule</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

export function SectionHead({ title, count, action }: { title: string; count?: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>
        {title}
        {count !== undefined && <span className="count">{count}</span>}
      </h2>
      {action}
    </div>
  );
}
