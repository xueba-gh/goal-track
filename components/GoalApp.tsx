'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, LayoutDashboard, Link2, Lock, Plus, Settings as SettingsIcon, Target, Trophy, type LucideIcon } from 'lucide-react';
import { addDays, fmtDay, fmtLongDay, fmtTime, parseLocal, reminderLabel, toLocalString, uid, weekKey } from '@/lib/dates';
import { lastActive, lockNow, markActive } from '@/lib/lock';
import { registerServiceWorker, showNotification } from '@/lib/notify';
import { useAppData } from '@/lib/store';
import type { AppData, Goal, GoalStatus, PlanItem } from '@/lib/types';
import Countdown from './Countdown';
import { GoalSheet, ItemSheet, SettingsSheet, WinSheet } from './Sheets';
import VoiceInput from './VoiceInput';
import { areaIcon, ItemRow, SectionHead, StatusBadge } from './ui';

const OrbitScene = dynamic(() => import('./OrbitScene'), { ssr: false });

type Tab = 'overview' | 'goals' | 'plan' | 'wins';
type Overlay =
  | { kind: 'goal'; goalId?: string }
  | { kind: 'item'; itemId?: string; newForGoalId?: string }
  | { kind: 'win'; goalId: string; itemId?: string; title: string }
  | { kind: 'settings' }
  | null;

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'wins', label: 'Wins', icon: Trophy },
];

const STATUS_ORDER: GoalStatus[] = ['active', 'next', 'later', 'achieved'];
const STATUS_HEAD: Record<GoalStatus, string> = { active: 'Active', next: 'Up next', later: 'Later', achieved: 'Achieved' };

export default function GoalApp() {
  const { data, update, replace } = useAppData();
  const [tab, setTab] = useState<Tab>('overview');
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [toast, setToast] = useState('');

  const overlay = overlays[overlays.length - 1] ?? null;
  const push = useCallback((o: Overlay) => setOverlays((s) => [...s, o]), []);
  const pop = useCallback(() => setOverlays((s) => s.slice(0, -1)), []);

  useEffect(() => {
    registerServiceWorker();
    const fromHash = window.location.hash.replace('#', '') as Tab;
    if (TABS.some((t) => t.id === fromHash)) setTab(fromHash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Auto-lock after inactivity.
  const autoLockMin = data?.settings.autoLockMin ?? 30;
  useEffect(() => {
    if (!data) return;
    const expired = () => autoLockMin > 0 && Date.now() - lastActive() > autoLockMin * 60000;
    if (expired()) {
      lockNow();
      return;
    }
    markActive();
    let lastMark = Date.now();
    const onActivity = () => {
      if (Date.now() - lastMark > 15000) {
        lastMark = Date.now();
        markActive();
      }
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (expired()) lockNow();
      else markActive();
    };
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    document.addEventListener('visibilitychange', onVisible);
    const t = setInterval(() => expired() && lockNow(), 30000);
    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data, autoLockMin]);

  // Reminder engine: checks every 20 seconds while the app is open.
  useEffect(() => {
    if (!data) return;
    const check = () => {
      const now = Date.now();
      const due = data.items.filter((i) => {
        if (i.done || i.remindMin === null || i.notified) return false;
        const start = parseLocal(i.date).getTime();
        return now >= start - i.remindMin * 60000 && now <= start + 2 * 3600000;
      });
      if (!due.length) return;
      due.forEach((i) => {
        const when = i.remindMin === 0 ? `Starts now, ${fmtTime(i.date)}` : `Starts at ${fmtTime(i.date)} (${reminderLabel(i.remindMin)})`;
        if (data.settings.notifications) showNotification(i.title, when, i.id);
      });
      setToast(`Reminder: ${due[0].title}`);
      const ids = new Set(due.map((i) => i.id));
      update((d) => ({ ...d, items: d.items.map((i) => (ids.has(i.id) ? { ...i, notified: true } : i)) }));
    };
    check();
    const t = setInterval(check, 20000);
    return () => clearInterval(t);
  }, [data, update]);

  const goalById = useMemo(() => new Map((data?.goals ?? []).map((g) => [g.id, g])), [data]);

  const toggleItem = useCallback(
    (item: PlanItem) => {
      if (item.done) {
        update((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, done: false, doneAt: undefined } : i)) }));
        return;
      }
      update((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, done: true, doneAt: toLocalString(new Date()) } : i)) }));
      push({ kind: 'win', goalId: item.goalId, itemId: item.id, title: item.title });
    },
    [update, push],
  );

  const goTab = (t: Tab) => {
    setTab(t);
    try {
      history.replaceState(null, '', `#${t}`);
    } catch {}
    window.scrollTo({ top: 0 });
  };

  if (!data) {
    return <div className="boot" aria-busy="true" />;
  }

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Main">
        <div className="brand">
          <span className="brand-mark">
            <Target size={16} strokeWidth={2.4} />
          </span>
          Goal Track
        </div>
        <nav className="side-nav">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => goTab(id)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button onClick={() => push({ kind: 'settings' })}>
            <SettingsIcon size={18} /> Settings
          </button>
          <button onClick={() => lockNow()}>
            <Lock size={18} /> Lock
          </button>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <Target size={16} strokeWidth={2.4} />
            </span>
            Goal Track
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => lockNow()} aria-label="Lock">
              <Lock size={19} />
            </button>
            <button className="icon-btn" onClick={() => push({ kind: 'settings' })} aria-label="Settings">
              <SettingsIcon size={19} />
            </button>
          </div>
        </header>

        <main className="main">
          {tab === 'overview' && <OverviewView data={data} update={update} goalById={goalById} onToggle={toggleItem} push={push} />}
          {tab === 'goals' && <GoalsView data={data} push={push} />}
          {tab === 'plan' && <PlanView data={data} goalById={goalById} onToggle={toggleItem} push={push} />}
          {tab === 'wins' && <WinsView data={data} goalById={goalById} />}
        </main>
      </div>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => goTab(id)}>
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {overlay?.kind === 'goal' && (
        <GoalSheet
          key={overlay.goalId ?? 'new'}
          data={data}
          update={update}
          goalId={overlay.goalId}
          onClose={pop}
          onOpenItem={(id) => push({ kind: 'item', itemId: id })}
          onAddItem={(goalId) => push({ kind: 'item', newForGoalId: goalId })}
          onToggleItem={toggleItem}
          onAchieved={(g: Goal) => push({ kind: 'win', goalId: g.id, title: `Achieved: ${g.title}` })}
        />
      )}
      {overlay?.kind === 'item' && (
        <ItemSheet
          key={overlay.itemId ?? `new-${overlay.newForGoalId}`}
          data={data}
          update={update}
          itemId={overlay.itemId}
          newForGoalId={overlay.newForGoalId}
          onClose={pop}
          onCompleted={toggleItem}
        />
      )}
      {overlay?.kind === 'win' && <WinSheet key={overlay.title} data={data} update={update} goalId={overlay.goalId} itemId={overlay.itemId} title={overlay.title} onClose={pop} />}
      {overlay?.kind === 'settings' && <SettingsSheet data={data} update={update} replace={replace} onClose={pop} />}
    </div>
  );
}

function PageHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ================================================================ Overview */

function OverviewView({
  data,
  update,
  goalById,
  onToggle,
  push,
}: {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  goalById: Map<string, Goal>;
  onToggle: (i: PlanItem) => void;
  push: (o: Overlay) => void;
}) {
  const focus = goalById.get(data.settings.focusGoalId) ?? data.goals.find((g) => g.deadline && g.status !== 'achieved');
  const focusItems = focus ? data.items.filter((i) => i.goalId === focus.id && i.kind !== 'deadline') : [];
  const done = focusItems.filter((i) => i.done).length;
  const progress = focusItems.length ? done / focusItems.length : 0;

  const now = Date.now();
  const todayKey = toLocalString(new Date()).slice(0, 10);
  const wk = weekKey(toLocalString(new Date()));
  const weekItems = data.items.filter((i) => weekKey(i.date) === wk);
  const weekDone = weekItems.filter((i) => i.done).length;

  const upcoming = data.items
    .filter((i) => !i.done && parseLocal(i.date).getTime() > now - 7 * 86400000)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const milestones = data.items
    .filter((i) => !i.done && (i.kind === 'milestone' || i.kind === 'deadline') && parseLocal(i.date).getTime() > now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const [noteText, setNoteText] = useState('');
  const [noteGoal, setNoteGoal] = useState(focus?.id ?? data.goals[0]?.id ?? '');
  const [noteVoice, setNoteVoice] = useState(false);
  const [saved, setSaved] = useState(false);

  const moons = data.goals.filter((g) => g.id !== focus?.id && g.status !== 'achieved').map((g) => ({ color: g.color, status: g.status }));

  return (
    <div className="view">
      <PageHead title="Overview" subtitle={fmtLongDay(`${todayKey}T12:00`)} />

      {focus?.deadline ? (
        <section className="card focus" aria-label={`${focus.title} countdown`}>
          <div className="focus-main">
            <p className="eyebrow">Focus goal</p>
            <h2 className="focus-title">{focus.title}</h2>
            <Countdown target={focus.deadline} />
            <dl className="focus-facts">
              <div>
                <dt>Target</dt>
                <dd>
                  {fmtLongDay(focus.deadline)}, {fmtTime(focus.deadline)}
                </dd>
              </div>
              <div>
                <dt>Progress</dt>
                <dd>
                  {done} of {focusItems.length} steps ({Math.round(progress * 100)}%)
                </dd>
              </div>
            </dl>
            <div className="progress-bar" aria-hidden="true">
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="btn-row">
              {focus.link ? (
                <a className="btn btn-primary btn-sm" href={focus.link} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} /> {focus.linkLabel || 'Open link'}
                </a>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => push({ kind: 'goal', goalId: focus.id })}>
                  <Link2 size={16} /> Add practice site
                </button>
              )}
              <button className="btn btn-quiet btn-sm" onClick={() => push({ kind: 'goal', goalId: focus.id })}>
                Goal details
              </button>
            </div>
          </div>
          <div className="focus-visual">
            <OrbitScene progress={progress} moons={moons} accent={focus.color} />
          </div>
        </section>
      ) : (
        <section className="card empty-card">
          <p>Give a goal a target date to see its countdown here.</p>
          <button className="btn btn-primary btn-sm" onClick={() => push({ kind: 'goal' })}>
            <Plus size={16} /> New goal
          </button>
        </section>
      )}

      <section className="kpis" aria-label="Summary">
        <div className="kpi">
          <span className="kpi-label">Plan progress</span>
          <span className="kpi-value">{Math.round(progress * 100)}%</span>
          <span className="kpi-sub">{focus ? focus.title : 'No focus goal'}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">This week</span>
          <span className="kpi-value">
            {weekDone}
            <small>/{weekItems.length}</small>
          </span>
          <span className="kpi-sub">steps complete</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Next milestone</span>
          <span className="kpi-value kpi-date">{milestones[0] ? fmtDay(milestones[0].date) : 'None'}</span>
          <span className="kpi-sub">{milestones[0]?.title ?? 'Add one in the plan'}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Wins logged</span>
          <span className="kpi-value">{data.wins.length}</span>
          <span className="kpi-sub">reflections saved</span>
        </div>
      </section>

      <div className="split">
        <section className="panel">
          <SectionHead
            title="Up next"
            action={
              <button className="btn btn-quiet btn-sm" onClick={() => push({ kind: 'item' })}>
                <Plus size={16} /> Add step
              </button>
            }
          />
          {upcoming.length ? (
            <ul className="rows">
              {upcoming.map((i) => (
                <ItemRow key={i.id} item={i} goal={goalById.get(i.goalId)} showGoal={i.goalId !== focus?.id} onToggle={() => onToggle(i)} onOpen={() => push({ kind: 'item', itemId: i.id })} />
              ))}
            </ul>
          ) : (
            <p className="empty">Nothing scheduled. Add the next step to a goal.</p>
          )}
        </section>

        <section className="panel">
          <SectionHead title="Milestones" />
          {milestones.length ? (
            <ul className="rows">
              {milestones.map((i) => (
                <ItemRow key={i.id} item={i} goal={goalById.get(i.goalId)} showGoal={i.goalId !== focus?.id} onToggle={() => onToggle(i)} onOpen={() => push({ kind: 'item', itemId: i.id })} />
              ))}
            </ul>
          ) : (
            <p className="empty">No milestones ahead.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <SectionHead title="Quick note" />
        <div className="composer">
          <VoiceInput
            id="quick-note"
            label="Thought, idea or update"
            value={noteText}
            onChange={(v) => {
              setNoteText(v);
              setSaved(false);
            }}
            lang={data.settings.voiceLang}
            placeholder="Type, or tap the microphone and speak."
            onVoiceUsed={() => setNoteVoice(true)}
          />
          <div className="composer-row">
            <label htmlFor="quick-note-goal" className="sr-only">
              Save under goal
            </label>
            <select id="quick-note-goal" value={noteGoal} onChange={(e) => setNoteGoal(e.target.value)}>
              {data.goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              disabled={!noteText.trim() || !noteGoal}
              onClick={() => {
                update((d) => ({
                  ...d,
                  notes: [...d.notes, { id: uid(), goalId: noteGoal, text: noteText.trim(), source: noteVoice ? 'voice' : 'typed', createdAt: toLocalString(new Date()) }],
                }));
                setNoteText('');
                setNoteVoice(false);
                setSaved(true);
              }}
            >
              Save note
            </button>
          </div>
          {saved && (
            <p className="hint" role="status">
              Saved under {goalById.get(noteGoal)?.title}.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

/* ================================================================ Goals */

function GoalsView({ data, push }: { data: AppData; push: (o: Overlay) => void }) {
  return (
    <div className="view">
      <PageHead
        title="Goals"
        subtitle={`${data.goals.filter((g) => g.status === 'active').length} active, ${data.goals.length} in total`}
        action={
          <button className="btn btn-primary btn-sm" onClick={() => push({ kind: 'goal' })}>
            <Plus size={16} /> New goal
          </button>
        }
      />
      {STATUS_ORDER.map((status) => {
        const goals = data.goals.filter((g) => g.status === status);
        if (!goals.length) return null;
        return (
          <section key={status} className="group">
            <SectionHead title={STATUS_HEAD[status]} count={goals.length} />
            <ul className="goal-grid">
              {goals.map((g) => {
                const items = data.items.filter((i) => i.goalId === g.id);
                const done = items.filter((i) => i.done).length;
                const next = items.filter((i) => !i.done).sort((a, b) => a.date.localeCompare(b.date))[0];
                const noteCount = data.notes.filter((n) => n.goalId === g.id).length;
                const Icon = areaIcon(g.area);
                return (
                  <li key={g.id}>
                    <button className="goal-card" onClick={() => push({ kind: 'goal', goalId: g.id })} style={{ '--goal': g.color } as React.CSSProperties}>
                      <span className="goal-top">
                        <span className="goal-icon">
                          <Icon size={18} />
                        </span>
                        <span className="goal-heading">
                          <span className="goal-area">{g.area}</span>
                          <span className="goal-title">{g.title}</span>
                        </span>
                        <StatusBadge status={g.status} />
                      </span>
                      {items.length > 0 ? (
                        <span className="goal-progress">
                          <span className="progress-bar thin">
                            <span style={{ width: `${(done / items.length) * 100}%` }} />
                          </span>
                          <span className="mono">
                            {done}/{items.length}
                          </span>
                        </span>
                      ) : (
                        <span className="goal-why">{g.why ?? 'No plan yet. Open the goal to add steps.'}</span>
                      )}
                      <span className="goal-foot">
                        <span>{next ? `Next step ${fmtDay(next.date)}` : 'No steps scheduled'}</span>
                        {g.deadline && status !== 'achieved' && <span>Due {fmtDay(g.deadline)}</span>}
                        {noteCount > 0 && <span>{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ================================================================ Plan */

function PlanView({ data, goalById, onToggle, push }: { data: AppData; goalById: Map<string, Goal>; onToggle: (i: PlanItem) => void; push: (o: Overlay) => void }) {
  const [filter, setFilter] = useState<string>('all');
  const [showDone, setShowDone] = useState(false);

  const goalsWithItems = data.goals.filter((g) => data.items.some((i) => i.goalId === g.id));
  const items = data.items
    .filter((i) => (filter === 'all' || i.goalId === filter) && (showDone || !i.done))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weeks = new Map<string, PlanItem[]>();
  for (const i of items) {
    const k = weekKey(i.date);
    if (!weeks.has(k)) weeks.set(k, []);
    weeks.get(k)!.push(i);
  }
  const thisWeek = weekKey(toLocalString(new Date()));
  const short = (k: string) => parseLocal(`${k}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <div className="view">
      <PageHead
        title="Plan"
        subtitle={`${data.items.filter((i) => !i.done).length} steps ahead`}
        action={
          <button className="btn btn-primary btn-sm" onClick={() => push({ kind: 'item', newForGoalId: filter !== 'all' ? filter : undefined })}>
            <Plus size={16} /> Add step
          </button>
        }
      />
      <div className="toolbar">
        <label htmlFor="plan-filter" className="sr-only">
          Goal
        </label>
        <select id="plan-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All goals</option>
          {goalsWithItems.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <button className={`toggle-chip${showDone ? ' on' : ''}`} aria-pressed={showDone} onClick={() => setShowDone(!showDone)}>
          Show completed
        </button>
      </div>
      {[...weeks.entries()].map(([k, list]) => {
        const focus = list.find((i) => i.kind === 'session' && i.detail)?.detail;
        const all = data.items.filter((i) => weekKey(i.date) === k && (filter === 'all' || i.goalId === filter));
        const doneCount = all.filter((i) => i.done).length;
        return (
          <section key={k} className={`panel week${k === thisWeek ? ' is-now' : ''}`}>
            <div className="week-head">
              <div>
                <h2>
                  {short(k)} to {short(addDays(k, 6))}
                  {k === thisWeek && <span className="badge badge-active">This week</span>}
                </h2>
                {focus && <p>{focus}</p>}
              </div>
              <span className="mono muted">
                {doneCount}/{all.length}
              </span>
            </div>
            <ul className="rows">
              {list.map((i) => (
                <ItemRow key={i.id} item={i} goal={goalById.get(i.goalId)} showGoal={filter === 'all' && goalsWithItems.length > 1} onToggle={() => onToggle(i)} onOpen={() => push({ kind: 'item', itemId: i.id })} />
              ))}
            </ul>
          </section>
        );
      })}
      {!items.length && <p className="empty">No steps here. Add a step with a date and a reminder.</p>}
    </div>
  );
}

/* ================================================================ Wins */

function WinsView({ data, goalById }: { data: AppData; goalById: Map<string, Goal> }) {
  const wins = [...data.wins].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const doneItems = data.items.filter((i) => i.done);
  const wk = weekKey(toLocalString(new Date()));
  const thisWeek = doneItems.filter((i) => i.doneAt && weekKey(i.doneAt) === wk).length;
  const achieved = data.goals.filter((g) => g.status === 'achieved').length;

  return (
    <div className="view">
      <PageHead title="Wins" subtitle="Your reflections after each step you complete." />
      <section className="kpis kpis-3" aria-label="Summary">
        <div className="kpi">
          <span className="kpi-label">This week</span>
          <span className="kpi-value">{thisWeek}</span>
          <span className="kpi-sub">steps complete</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">All time</span>
          <span className="kpi-value">{doneItems.length}</span>
          <span className="kpi-sub">steps complete</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Goals</span>
          <span className="kpi-value">{achieved}</span>
          <span className="kpi-sub">achieved</span>
        </div>
      </section>
      {wins.length ? (
        <ul className="win-list">
          {wins.map((w) => {
            const g = goalById.get(w.goalId);
            return (
              <li key={w.id} className="card win-card" style={{ '--goal': g?.color ?? 'var(--accent)' } as React.CSSProperties}>
                <div className="win-top">
                  <span className="badge badge-feel">{w.feeling}</span>
                  <span className="mono muted">
                    {fmtDay(w.createdAt)}, {fmtTime(w.createdAt)}
                  </span>
                </div>
                <p className="win-title">{w.title}</p>
                {g && (
                  <p className="goal-tag">
                    <i style={{ background: g.color }} />
                    {g.title}
                  </p>
                )}
                {w.thoughts && <p className="win-thoughts">{w.thoughts}</p>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty">Complete a step and you will be asked how it felt. Your reflections collect here.</p>
      )}
    </div>
  );
}
