export const pad = (n: number) => String(n).padStart(2, '0');

/** Local date-time string (no timezone) -> Date in the device's local time. */
export function parseLocal(s: string): Date {
  return new Date(s);
}

export function toLocalString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function addDays(dateOnly: string, days: number): string {
  const d = new Date(`${dateOnly}T12:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtDay(s: string): string {
  return parseLocal(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtLongDay(s: string): string {
  return parseLocal(s).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtTime(s: string): string {
  return parseLocal(s).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Monday of the week containing the date, as YYYY-MM-DD. */
export function weekKey(s: string): string {
  const d = parseLocal(s);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function relativeDay(s: string, now = new Date()): string {
  const d = parseLocal(s);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(now)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return fmtDay(s);
}

export function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const REMINDER_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'No reminder', value: null },
  { label: 'At start time', value: 0 },
  { label: '10 min before', value: 10 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
];

export function reminderLabel(v: number | null): string {
  return REMINDER_OPTIONS.find((o) => o.value === v)?.label ?? `${v} min before`;
}
