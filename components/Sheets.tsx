'use client';

import { useState } from 'react';
import { fmtDay, fmtLongDay, fmtTime, parseLocal, REMINDER_OPTIONS, toLocalString, uid } from '@/lib/dates';
import { buildIcs, downloadFile } from '@/lib/ics';
import { requestNotificationPermission } from '@/lib/notify';
import { isValidData } from '@/lib/store';
import { makeSeed } from '@/lib/seed';
import type { AppData, Goal, GoalStatus, ItemKind, Note, PlanItem, Smart } from '@/lib/types';
import VoiceInput from './VoiceInput';
import { ExternalLink, Lock, Plus } from 'lucide-react';
import { lockNow } from '@/lib/lock';
import { Field, ItemRow, Sheet } from './ui';

type Update = (fn: (d: AppData) => AppData) => void;

const FEELINGS = ['Proud', 'Relieved', 'Energised', 'Grateful', 'Calm', 'Unstoppable'];
const GOAL_COLORS = ['#1f4e8c', '#2a8c82', '#b4505a', '#6c5fa7', '#4c8c4a', '#c08a2e', '#6b7280', '#3d7ea6'];
const STATUS_LABEL: Record<GoalStatus, string> = { active: 'Active now', next: 'Up next', later: 'Later', achieved: 'Achieved' };

/* ---------------------------------------------------------------- Notes */

function NoteList({ notes, onDelete }: { notes: Note[]; onDelete: (id: string) => void }) {
  if (!notes.length) return null;
  return (
    <ul className="notes">
      {[...notes]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((n) => (
          <li key={n.id} className="note">
            <p>{n.text}</p>
            <div className="note-meta">
              <span className="mono">
                {fmtDay(n.createdAt)} · {fmtTime(n.createdAt)}
                {n.source === 'voice' ? ' · voice' : ''}
              </span>
              <button className="text-btn" onClick={() => onDelete(n.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
    </ul>
  );
}

function NoteComposer({ id, lang, onSave, label = 'Add a note' }: { id: string; lang: string; onSave: (text: string, voice: boolean) => void; label?: string }) {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(false);
  return (
    <div className="composer">
      <VoiceInput id={id} label={label} value={text} onChange={setText} lang={lang} placeholder="Type, or tap the microphone and speak" onVoiceUsed={() => setVoice(true)} />
      <button
        className="btn btn-quiet"
        disabled={!text.trim()}
        onClick={() => {
          onSave(text.trim(), voice);
          setText('');
          setVoice(false);
        }}
      >
        Save note
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- Plan item */

export function ItemSheet({
  data,
  update,
  itemId,
  newForGoalId,
  onClose,
  onCompleted,
}: {
  data: AppData;
  update: Update;
  itemId?: string;
  newForGoalId?: string;
  onClose: () => void;
  onCompleted: (item: PlanItem) => void;
}) {
  const existing = itemId ? data.items.find((i) => i.id === itemId) : undefined;
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(19, 0, 0, 0);
    return toLocalString(d);
  })();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [goalId, setGoalId] = useState(existing?.goalId ?? newForGoalId ?? data.settings.focusGoalId);
  const [date, setDate] = useState((existing?.date ?? defaultDate).slice(0, 10));
  const [time, setTime] = useState((existing?.date ?? defaultDate).slice(11, 16));
  const [duration, setDuration] = useState(String(existing?.durationMin ?? 60));
  const [kind, setKind] = useState<ItemKind>(existing?.kind ?? 'session');
  const [remind, setRemind] = useState<string>(existing ? String(existing.remindMin) : '30');
  const [detail, setDetail] = useState(existing?.detail ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const notes = existing ? data.notes.filter((n) => n.itemId === existing.id) : [];
  const lang = data.settings.voiceLang;

  const save = () => {
    if (!title.trim()) return;
    const remindMin = remind === 'null' ? null : Number(remind);
    const newDate = `${date}T${time || '09:00'}`;
    const patch = {
      title: title.trim(),
      goalId,
      date: newDate,
      durationMin: Number(duration) || undefined,
      kind,
      remindMin,
      detail: detail.trim() || undefined,
    };
    update((d) => {
      if (existing) {
        return {
          ...d,
          items: d.items.map((i) =>
            i.id === existing.id ? { ...i, ...patch, notified: i.date === newDate && i.remindMin === remindMin ? i.notified : false } : i,
          ),
          goals: kind === 'deadline' ? d.goals.map((g) => (g.id === goalId ? { ...g, deadline: newDate } : g)) : d.goals,
        };
      }
      return { ...d, items: [...d.items, { id: uid(), done: false, ...patch }] };
    });
    onClose();
  };

  return (
    <Sheet
      title={existing ? 'Plan item' : 'Add to plan'}
      onClose={onClose}
      footer={
        <>
          {existing && !existing.done && (
            <button
              className="btn btn-accent"
              onClick={() => {
                onClose();
                onCompleted(existing);
              }}
            >
              Done
            </button>
          )}
          <button className="btn" onClick={save} disabled={!title.trim()}>
            {existing ? 'Save changes' : 'Add to plan'}
          </button>
        </>
      }
    >
      <Field id="item-title" label="What">
        <input id="item-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 60 Domain 3 questions" />
      </Field>
      <div className="row-2">
        <Field id="item-date" label="Date">
          <input id="item-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field id="item-time" label="Time">
          <input id="item-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <div className="row-2">
        <Field id="item-remind" label="Reminder">
          <select id="item-remind" value={remind} onChange={(e) => setRemind(e.target.value)}>
            {REMINDER_OPTIONS.map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="item-duration" label="Minutes">
          <input id="item-duration" type="number" inputMode="numeric" min={5} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
      </div>
      <div className="row-2">
        <Field id="item-goal" label="Goal">
          <select id="item-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            {data.goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </Field>
        <Field id="item-kind" label="Type">
          <select id="item-kind" value={kind} onChange={(e) => setKind(e.target.value as ItemKind)}>
            <option value="session">Session</option>
            <option value="milestone">Milestone</option>
            <option value="task">Task</option>
            <option value="deadline">Exam / deadline</option>
          </select>
        </Field>
      </div>
      <Field id="item-detail" label="Details">
        <textarea id="item-detail" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} />
      </Field>

      {existing && (
        <section className="sub">
          <h3>Notes</h3>
          <NoteList notes={notes} onDelete={(id) => update((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }))} />
          <NoteComposer
            id={`note-item-${existing.id}`}
            lang={lang}
            onSave={(text, voice) =>
              update((d) => ({
                ...d,
                notes: [...d.notes, { id: uid(), goalId: existing.goalId, itemId: existing.id, text, source: voice ? 'voice' : 'typed', createdAt: toLocalString(new Date()) }],
              }))
            }
          />
        </section>
      )}

      {existing && (
        <div className="danger-zone">
          {confirmDelete ? (
            <div className="confirm">
              <span>Remove this from the plan?</span>
              <button
                className="btn btn-danger"
                onClick={() => {
                  update((d) => ({ ...d, items: d.items.filter((i) => i.id !== existing.id), notes: d.notes.filter((n) => n.itemId !== existing.id) }));
                  onClose();
                }}
              >
                Remove
              </button>
              <button className="btn btn-quiet" onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button className="text-btn" onClick={() => setConfirmDelete(true)}>
              Remove from plan
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Win reflection */

export function WinSheet({
  data,
  update,
  goalId,
  itemId,
  title,
  onClose,
}: {
  data: AppData;
  update: Update;
  goalId: string;
  itemId?: string;
  title: string;
  onClose: () => void;
}) {
  const [feeling, setFeeling] = useState('Proud');
  const [thoughts, setThoughts] = useState('');
  const goal = data.goals.find((g) => g.id === goalId);

  const save = () => {
    update((d) => ({
      ...d,
      wins: [...d.wins, { id: uid(), goalId, itemId, title, feeling, thoughts: thoughts.trim(), createdAt: toLocalString(new Date()) }],
    }));
    onClose();
  };

  return (
    <Sheet
      title="Step complete"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-quiet" onClick={onClose}>
            Skip
          </button>
          <button className="btn btn-accent" onClick={save}>
            Save this win
          </button>
        </>
      }
    >
      <div className="win-head">
        <p className="eyebrow">{goal?.title}</p>
        <p className="win-title">{title}</p>
      </div>
      <fieldset className="chips">
        <legend className="field-label">How do you feel?</legend>
        {FEELINGS.map((f) => (
          <button key={f} type="button" className={`chip${feeling === f ? ' on' : ''}`} aria-pressed={feeling === f} onClick={() => setFeeling(f)}>
            {f}
          </button>
        ))}
      </fieldset>
      <VoiceInput
        id="win-thoughts"
        label="Thoughts after this win"
        value={thoughts}
        onChange={setThoughts}
        lang={data.settings.voiceLang}
        rows={4}
        placeholder="What went well? What did you learn?"
      />
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Goal */

export function GoalSheet({
  data,
  update,
  goalId,
  onClose,
  onOpenItem,
  onAddItem,
  onToggleItem,
  onAchieved,
}: {
  data: AppData;
  update: Update;
  goalId?: string;
  onClose: () => void;
  onOpenItem: (id: string) => void;
  onAddItem: (goalId: string) => void;
  onToggleItem: (item: PlanItem) => void;
  onAchieved: (goal: Goal) => void;
}) {
  const existing = goalId ? data.goals.find((g) => g.id === goalId) : undefined;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [area, setArea] = useState(existing?.area ?? '');
  const [status, setStatus] = useState<GoalStatus>(existing?.status ?? 'active');
  const [color, setColor] = useState(existing?.color ?? GOAL_COLORS[(data.goals.length + 1) % GOAL_COLORS.length]);
  const [deadline, setDeadline] = useState(existing?.deadline?.slice(0, 10) ?? '');
  const [deadlineTime, setDeadlineTime] = useState(existing?.deadline?.slice(11, 16) ?? '09:00');
  const [link, setLink] = useState(existing?.link ?? '');
  const [linkLabel, setLinkLabel] = useState(existing?.linkLabel ?? '');
  const [why, setWhy] = useState(existing?.why ?? '');
  const [smart, setSmart] = useState<Smart>(existing?.smart ?? { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const lang = data.settings.voiceLang;
  const items = existing ? data.items.filter((i) => i.goalId === existing.id).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const doneCount = items.filter((i) => i.done).length;
  const visible = showDone ? items : items.filter((i) => !i.done);
  const notes = existing ? data.notes.filter((n) => n.goalId === existing.id && !n.itemId) : [];
  const wins = existing ? data.wins.filter((w) => w.goalId === existing.id) : [];

  const normalisedLink = link.trim() && !/^https?:\/\//i.test(link.trim()) ? `https://${link.trim()}` : link.trim();

  const save = (close = true) => {
    if (!title.trim()) return;
    const patch = {
      title: title.trim(),
      area: area.trim() || 'General',
      status,
      color,
      deadline: deadline ? `${deadline}T${deadlineTime || '09:00'}` : undefined,
      link: normalisedLink || undefined,
      linkLabel: linkLabel.trim() || undefined,
      why: why.trim() || undefined,
      smart,
    };
    update((d) =>
      existing
        ? { ...d, goals: d.goals.map((g) => (g.id === existing.id ? { ...g, ...patch } : g)) }
        : { ...d, goals: [...d.goals, { id: uid(), createdAt: toLocalString(new Date()), ...patch }] },
    );
    if (close) onClose();
  };

  const smartFields: { key: keyof Smart; label: string; ph: string }[] = [
    { key: 'specific', label: 'Specific: what exactly?', ph: 'Pass the exam / ship version 1 / post 12 videos' },
    { key: 'measurable', label: 'Measurable: how will you know?', ph: 'A number you can check' },
    { key: 'achievable', label: 'Achievable: how will you do it?', ph: 'Sessions per week, resources, help' },
    { key: 'relevant', label: 'Relevant: why this matters', ph: 'How it serves the bigger picture' },
    { key: 'timeBound', label: 'Time-bound: by when?', ph: 'A date' },
  ];

  return (
    <Sheet
      title={existing ? 'Goal' : 'New goal'}
      onClose={onClose}
      footer={
        <>
          {existing && existing.status !== 'achieved' && (
            <button
              className="btn btn-accent"
              onClick={() => {
                save(false);
                update((d) => ({
                  ...d,
                  goals: d.goals.map((g) => (g.id === existing.id ? { ...g, status: 'achieved', achievedAt: toLocalString(new Date()) } : g)),
                }));
                onClose();
                onAchieved(existing);
              }}
            >
              Achieved
            </button>
          )}
          <button className="btn" onClick={() => save()} disabled={!title.trim()}>
            {existing ? 'Save goal' : 'Create goal'}
          </button>
        </>
      }
    >
      <Field id="goal-title" label="Goal">
        <input id="goal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Launch the student budget app" />
      </Field>
      <div className="row-2">
        <Field id="goal-area" label="Area">
          <input id="goal-area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Certifications, Content, Apps…" />
        </Field>
        <Field id="goal-status" label="Status">
          <select id="goal-status" value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)}>
            {(Object.keys(STATUS_LABEL) as GoalStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset className="swatches">
        <legend className="field-label">Colour</legend>
        {GOAL_COLORS.map((c) => (
          <button key={c} type="button" className={`swatch${color === c ? ' on' : ''}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} />
        ))}
      </fieldset>
      <div className="row-2">
        <Field id="goal-deadline" label="Target date">
          <input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        <Field id="goal-deadline-time" label="Time">
          <input id="goal-deadline-time" type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} />
        </Field>
      </div>
      <div className="row-2">
        <Field id="goal-link" label="Website link">
          <input id="goal-link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the practice site" />
        </Field>
        <Field id="goal-link-label" label="Button name">
          <input id="goal-link-label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Practice site" />
        </Field>
      </div>
      {existing?.link && (
        <a className="link-out" href={existing.link} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Open {existing.linkLabel || 'link'}
        </a>
      )}
      <VoiceInput id="goal-why" label="Why this goal" value={why} onChange={setWhy} lang={lang} rows={2} />

      <section className="sub">
        <h3>SMART</h3>
        {smartFields.map((f) => (
          <Field key={f.key} id={`smart-${f.key}`} label={f.label}>
            <textarea id={`smart-${f.key}`} rows={2} value={smart[f.key]} placeholder={f.ph} onChange={(e) => setSmart({ ...smart, [f.key]: e.target.value })} />
          </Field>
        ))}
      </section>

      {existing && (
        <section className="sub">
          <div className="sub-head">
            <h3>
              Plan <span className="mono muted">{doneCount}/{items.length} done</span>
            </h3>
            <button className="btn btn-quiet btn-sm" onClick={() => onAddItem(existing.id)}>
              <Plus size={16} /> Add
            </button>
          </div>
          {visible.length ? (
            <ul className="rows">
              {visible.slice(0, showDone ? undefined : 8).map((i) => (
                <ItemRow key={i.id} item={i} goal={existing} onToggle={() => onToggleItem(i)} onOpen={() => onOpenItem(i.id)} />
              ))}
            </ul>
          ) : (
            <p className="empty">No plan items yet. Add the first step with a date and a reminder.</p>
          )}
          {items.length > 0 && (
            <button className="text-btn" onClick={() => setShowDone(!showDone)}>
              {showDone ? 'Show upcoming only' : `Show everything (${items.length})`}
            </button>
          )}
        </section>
      )}

      {existing && (
        <section className="sub">
          <h3>Notes</h3>
          <NoteList notes={notes} onDelete={(id) => update((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }))} />
          <NoteComposer
            id={`note-goal-${existing.id}`}
            lang={lang}
            onSave={(text, voice) =>
              update((d) => ({
                ...d,
                notes: [...d.notes, { id: uid(), goalId: existing.id, text, source: voice ? 'voice' : 'typed', createdAt: toLocalString(new Date()) }],
              }))
            }
          />
        </section>
      )}

      {existing && wins.length > 0 && (
        <section className="sub">
          <h3>Wins</h3>
          <ul className="wins">
            {wins.map((w) => (
              <li key={w.id} className="win">
                <span className="badge badge-feel">{w.feeling}</span> {w.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {existing && (
        <div className="danger-zone">
          {confirmDelete ? (
            <div className="confirm">
              <span>Delete this goal, its plan and notes?</span>
              <button
                className="btn btn-danger"
                onClick={() => {
                  update((d) => ({
                    ...d,
                    goals: d.goals.filter((g) => g.id !== existing.id),
                    items: d.items.filter((i) => i.goalId !== existing.id),
                    notes: d.notes.filter((n) => n.goalId !== existing.id),
                  }));
                  onClose();
                }}
              >
                Delete
              </button>
              <button className="btn btn-quiet" onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button className="text-btn" onClick={() => setConfirmDelete(true)}>
              Delete goal
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Settings */

export function SettingsSheet({ data, update, replace, onClose }: { data: AppData; update: Update; replace: (d: AppData) => void; onClose: () => void }) {
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const permission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

  const upcoming = data.items.filter((i) => !i.done && parseLocal(i.date).getTime() > Date.now());

  return (
    <Sheet title="Settings" onClose={onClose}>
      <section className="sub">
        <h3>Security</h3>
        <Field id="set-autolock" label="Lock after inactivity" hint="Goal Track asks for your master password again after this long without use.">
          <select
            id="set-autolock"
            value={String(data.settings.autoLockMin)}
            onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, autoLockMin: Number(e.target.value) } }))}
          >
            <option value="5">5 minutes</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="240">4 hours</option>
            <option value="0">Only after 30 days</option>
          </select>
        </Field>
        <p className="hint">To change the master password, update APP_PASSWORD in Vercel and redeploy. Every device then signs out.</p>
        <button className="btn btn-quiet btn-sm" onClick={() => lockNow()}>
          <Lock size={16} /> Lock now
        </button>
      </section>

      <section className="sub">
        <h3>Reminders</h3>
        <div className="setting">
          <div>
            <p className="setting-title">Phone notifications</p>
            <p className="hint">
              {permission === 'denied'
                ? 'Blocked in your browser. Allow notifications for this site in browser settings.'
                : permission === 'unsupported'
                  ? 'This browser does not support notifications.'
                  : 'Alerts while Goal Track is open or in the background.'}
            </p>
          </div>
          <button
            className={`toggle${data.settings.notifications && permission === 'granted' ? ' on' : ''}`}
            role="switch"
            aria-checked={data.settings.notifications && permission === 'granted'}
            aria-label="Phone notifications"
            onClick={async () => {
              if (data.settings.notifications) {
                update((d) => ({ ...d, settings: { ...d.settings, notifications: false } }));
                return;
              }
              const p = await requestNotificationPermission();
              update((d) => ({ ...d, settings: { ...d.settings, notifications: p === 'granted' } }));
              setMsg(p === 'granted' ? 'Notifications are on.' : 'Notifications were not allowed.');
            }}
          >
            <span />
          </button>
        </div>
        <div className="setting">
          <div>
            <p className="setting-title">Add the plan to your phone calendar</p>
            <p className="hint">
              Downloads {upcoming.length} upcoming items with alarms as an .ics file. Open it with Google Calendar and the alarms fire even when this app is closed.
            </p>
          </div>
          <button className="btn btn-quiet btn-sm" onClick={() => downloadFile('goal-track-plan.ics', buildIcs(upcoming, data.goals), 'text/calendar')}>
            Download
          </button>
        </div>
      </section>

      <section className="sub">
        <h3>Focus</h3>
        <Field id="set-focus" label="Countdown on the home screen">
          <select id="set-focus" value={data.settings.focusGoalId} onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, focusGoalId: e.target.value } }))}>
            {data.goals
              .filter((g) => g.deadline)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} · {fmtLongDay(g.deadline!)}
                </option>
              ))}
          </select>
        </Field>
        <Field id="set-lang" label="Voice typing language" hint="Pick the accent the transcription should listen for.">
          <select id="set-lang" value={data.settings.voiceLang} onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, voiceLang: e.target.value } }))}>
            {[
              ['en-GH', 'English (Ghana)'],
              ['en-GB', 'English (UK)'],
              ['en-US', 'English (US)'],
              ['en-NG', 'English (Nigeria)'],
              ['fr-FR', 'Français'],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
            {!['en-GH', 'en-GB', 'en-US', 'en-NG', 'fr-FR'].includes(data.settings.voiceLang) && <option value={data.settings.voiceLang}>{data.settings.voiceLang}</option>}
          </select>
        </Field>
      </section>

      <section className="sub">
        <h3>Your data</h3>
        <p className="hint">Everything is saved on this device. Back it up before you clear your browser or switch phones.</p>
        <div className="btn-row">
          <button className="btn btn-quiet btn-sm" onClick={() => downloadFile(`goal-track-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')}>
            Back up
          </button>
          <label className="btn btn-quiet btn-sm file-btn">
            Restore
            <input
              id="restore-file"
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const parsed = JSON.parse(await f.text());
                  if (!isValidData(parsed)) throw new Error();
                  replace(parsed);
                  setMsg('Backup restored.');
                } catch {
                  setMsg('That file is not a Goal Track backup.');
                }
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {confirmReset ? (
          <div className="confirm">
            <span>Replace everything with the starter plan?</span>
            <button
              className="btn btn-danger"
              onClick={() => {
                replace(makeSeed());
                setConfirmReset(false);
                setMsg('Starter plan restored.');
              }}
            >
              Reset
            </button>
            <button className="btn btn-quiet" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="text-btn" onClick={() => setConfirmReset(true)}>
            Reset to the starter plan
          </button>
        )}
      </section>
      {msg && (
        <p className="setting-msg" role="status">
          {msg}
        </p>
      )}
    </Sheet>
  );
}
