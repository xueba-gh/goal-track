'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fmtDay, fmtLongDay, fmtTime, parseLocal, reminderLabel, toLocalString, uid, weekKey } from '@/lib/dates';
import { registerServiceWorker, showNotification } from '@/lib/notify';
import { useAppData } from '@/lib/store';
import type { AppData, Goal, GoalStatus, PlanItem } from '@/lib/types';
import Countdown from './Countdown';
import { GoalSheet, ItemSheet, SettingsSheet, WinSheet } from './Sheets';
import VoiceInput from './VoiceInput';
import { GearIcon, ItemRow, LinkIcon, NavIcons, PlusIcon } from './ui';

const OrbitScene = dynamic(() => import('./OrbitScene'), { ssr: false });

type Tab = 'home' | 'goals' | 'plan' | 'wins';
type Overlay =
  | { kind: 'goal'; goalId?: string }
  | { kind: 'item'; itemId?: string; newForGoalId?: string }
  | { kind: 'win'; goalId: string; itemId?: string; title: string }
  | { kind: 'settings' }
  | null;

const STATUS_ORDER: GoalStatus[] = ['active', 'next', 'later', 'achieved'];
const STATUS_HEAD: Record<GoalStatus, string> = { active: 'Active now', next: 'Up next', later: 'Later', achieved: 'Achieved' };

export default function GoalApp() {
  const { data, update, replace } = useAppData();
  const [tab, setTab] = useState<Tab>('home');
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [toast, setToast] = useState<string>('');

  const overlay = overlays[overlays.length - 1] ?? null;
  const push = (o: Overlay) => setOverlays((s) => [...s, o]);
  const pop = useCallback(() => setOverlays((s) => s.slice(0, -1)), []);

  useEffect(() => {
    registerServiceWorker();
    const fromHash = window.location.hash.replace('#', '') as Tab;
    if (['home', 'goals', 'plan', 'wins'].includes(fromHash)) setTab(fromHash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);

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
        const when = i.remindMin === 0 ? 'Starting now' : `${reminderLabel(i.remindMin).replace(' before', '')} to go · ${fmtTime(i.date)}`;
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
    [update],
  );

  const goTab = (t: Tab) => {
    setTab(t);
    try {
      history.replaceState(null, '', `#${t}`);
    } catch {}
    window.scrollTo({ top: 0 });
  };

  if (!data) {
    return (
      <div className="boot" aria-busy="true">
        <span className="brand">Goal Track</span>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">
            Goal<span>Track</span>
          </span>
          <button className="icon-btn" onClick={() => push({ kind: 'settings' })} aria-label="Settings">
            <GearIcon />
          </button>
        </div>
      </header>

      <main className="main">
        {tab === 'home' && <HomeView data={data} update={update} goalById={goalById} onToggle={toggleItem} push={push} />}
        {tab === 'goals' && <GoalsView data={data} push={push} />}
        {tab === 'plan' && <PlanView data={data} goalById={goalById} onToggle={toggleItem} push={push} />}
        {tab === 'wins' && <WinsView data={data} goalById={goalById} />}
      </main>

      <nav className="tabbar" aria-label="Sections">
        {(['home', 'goals', 'plan', 'wins'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} aria-current={tab === t ? 'page' : undefined} onClick={() => goTab(t)}>
            {NavIcons[t]}
            <span>{t === 'home' ? 'Today' : t[0].toUpperCase() + t.slice(1)}</span>
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

/* ================================================================ Today */

function HomeView({
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
  const weekAgo = now - 7 * 86400000;
  const upcoming = data.items
    .filter((i) => !i.done && parseLocal(i.date).getTime() > weekAgo)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const [noteText, setNoteText] = useState('');
  const [noteGoal, setNoteGoal] = useState(focus?.id ?? data.goals[0]?.id ?? '');
  const [noteVoice, setNoteVoice] = useState(false);
  const [saved, setSaved] = useState(false);

  const moons = data.goals.filter((g) => g.id !== focus?.id && g.status !== 'achieved').map((g) => ({ color: g.color, status: g.status }));

  return (
    <div className="view">
      {focus?.deadline ? (
        <section className="hero" aria-label={`${focus.title} countdown`}>
          <OrbitScene progress={progress} moons={moons} accent={focus.color} />
          <div className="hero-content">
            <p className="eyebrow">{focus.title}</p>
            <Countdown target={focus.deadline} />
            <p className="hero-date mono">
              {fmtLongDay(focus.deadline)} · {fmtTime(focus.deadline)}
            </p>
            <div className="progress" aria-label={`${done} of ${focusItems.length} plan items done`}>
              <div className="progress-bar">
                <span style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <span className="mono">
                {done}/{focusItems.length} steps
              </span>
            </div>
            <div className="hero-actions">
              {focus.link ? (
                <a className="btn btn-accent btn-sm" href={focus.link} target="_blank" rel="noreferrer">
                  <LinkIcon /> {focus.linkLabel || 'Open link'}
                </a>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => push({ kind: 'goal', goalId: focus.id })}>
                  <LinkIcon /> Add practice site link
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => push({ kind: 'goal', goalId: focus.id })}>
                Open goal
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="hero hero-empty">
          <p>Give a goal a target date to see its countdown here.</p>
          <button className="btn btn-accent btn-sm" onClick={() => push({ kind: 'goal' })}>
            New goal
          </button>
        </section>
      )}

      <section className="block">
        <div className="block-head">
          <h2>Next up</h2>
          <button className="btn btn-quiet btn-sm" onClick={() => push({ kind: 'item' })}>
            <PlusIcon /> Add
          </button>
        </div>
        {upcoming.length ? (
          <ul className="items">
            {upcoming.map((i) => (
              <ItemRow key={i.id} item={i} goal={goalById.get(i.goalId)} showGoal={i.goalId !== focus?.id} onToggle={() => onToggle(i)} onOpen={() => push({ kind: 'item', itemId: i.id })} />
            ))}
          </ul>
        ) : (
          <p className="empty">Nothing scheduled. Add the next step to a goal.</p>
        )}
      </section>

      <section className="block">
        <h2>Quick note</h2>
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
            placeholder="Tap the mic and talk. It types for you."
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
              className="btn"
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
              Save
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
      <div className="block-head view-head">
        <h1>Goals</h1>
        <button className="btn btn-sm" onClick={() => push({ kind: 'goal' })}>
          <PlusIcon /> New goal
        </button>
      </div>
      {STATUS_ORDER.map((status) => {
        const goals = data.goals.filter((g) => g.status === status);
        if (!goals.length) return null;
        return (
          <section key={status} className="block">
            <h2 className={`status-head status-${status}`}>
              {STATUS_HEAD[status]} <span className="mono muted">{goals.length}</span>
            </h2>
            <ul className="goal-list">
              {goals.map((g) => {
                const items = data.items.filter((i) => i.goalId === g.id);
                const done = items.filter((i) => i.done).length;
                const next = items.filter((i) => !i.done).sort((a, b) => a.date.localeCompare(b.date))[0];
                const noteCount = data.notes.filter((n) => n.goalId === g.id).length;
                return (
                  <li key={g.id}>
                    <button className="goal-card" onClick={() => push({ kind: 'goal', goalId: g.id })} style={{ '--goal': g.color } as React.CSSProperties}>
                      <span className="goal-dot" />
                      <span className="goal-body">
                        <span className="goal-area">{g.area}</span>
                        <span className="goal-title">{g.title}</span>
                        {items.length > 0 && (
                          <span className="goal-progress">
                            <span className="progress-bar thin">
                              <span style={{ width: `${(done / items.length) * 100}%` }} />
                            </span>
                            <span className="mono">
                              {done}/{items.length}
                            </span>
                          </span>
                        )}
                        <span className="goal-meta mono">
                          {next ? `Next: ${fmtDay(next.date)}` : g.why ? g.why.slice(0, 70) + (g.why.length > 70 ? '…' : '') : 'No plan yet'}
                          {g.deadline && status !== 'achieved' ? ` · due ${fmtDay(g.deadline)}` : ''}
                          {noteCount ? ` · ${noteCount} note${noteCount > 1 ? 's' : ''}` : ''}
                        </span>
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

  return (
    <div className="view">
      <div className="block-head view-head">
        <h1>Plan</h1>
        <button className="btn btn-sm" onClick={() => push({ kind: 'item', newForGoalId: filter !== 'all' ? filter : undefined })}>
          <PlusIcon /> Add
        </button>
      </div>
      <div className="filters" role="group" aria-label="Filter by goal">
        <button className={`chip${filter === 'all' ? ' on' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </button>
        {goalsWithItems.map((g) => (
          <button key={g.id} className={`chip${filter === g.id ? ' on' : ''}`} aria-pressed={filter === g.id} onClick={() => setFilter(g.id)}>
            <i className="chip-dot" style={{ background: g.color }} />
            {g.title.length > 22 ? g.title.slice(0, 21) + '…' : g.title}
          </button>
        ))}
        <button className={`chip${showDone ? ' on' : ''}`} aria-pressed={showDone} onClick={() => setShowDone(!showDone)}>
          Show done
        </button>
      </div>
      {[...weeks.entries()].map(([k, list]) => {
        const focus = list.find((i) => i.kind === 'session' && i.detail)?.detail;
        return (
          <section key={k} className={`week${k === thisWeek ? ' is-now' : ''}`}>
            <h2 className="week-head">
              <span>
                Week of {fmtDay(`${k}T12:00`).replace(/^\w+,?\s/, '')}
                {k === thisWeek && <span className="pill pill-now">This week</span>}
              </span>
              {focus && <span className="week-focus">{focus}</span>}
            </h2>
            <ul className="items">
              {list.map((i) => (
                <ItemRow key={i.id} item={i} goal={goalById.get(i.goalId)} showGoal={filter === 'all' && goalsWithItems.length > 1} onToggle={() => onToggle(i)} onOpen={() => push({ kind: 'item', itemId: i.id })} />
              ))}
            </ul>
          </section>
        );
      })}
      {!items.length && <p className="empty">Nothing here yet. Add a session with a date and a reminder.</p>}
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
      <div className="view-head">
        <h1>Wins</h1>
      </div>
      <div className="stats">
        <div>
          <span className="stat-num">{thisWeek}</span>
          <span className="stat-label">done this week</span>
        </div>
        <div>
          <span className="stat-num">{doneItems.length}</span>
          <span className="stat-label">steps done</span>
        </div>
        <div>
          <span className="stat-num">{achieved}</span>
          <span className="stat-label">goals achieved</span>
        </div>
      </div>
      {wins.length ? (
        <ul className="win-list">
          {wins.map((w) => {
            const g = goalById.get(w.goalId);
            return (
              <li key={w.id} className="win-card" style={{ '--goal': g?.color ?? 'var(--accent)' } as React.CSSProperties}>
                <div className="win-top">
                  <span className="pill pill-feel">{w.feeling}</span>
                  <span className="mono muted">
                    {fmtDay(w.createdAt)} · {fmtTime(w.createdAt)}
                  </span>
                </div>
                <p className="win-title">{w.title}</p>
                {g && <p className="goal-area">{g.title}</p>}
                {w.thoughts && <p className="win-thoughts">{w.thoughts}</p>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty">
          Tick off a step and you&rsquo;ll be asked how it felt. Your thoughts land here, so you can look back at how far you&rsquo;ve come.
        </p>
      )}
    </div>
  );
}
