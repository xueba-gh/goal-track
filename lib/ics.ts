import { parseLocal, pad } from './dates';
import type { Goal, PlanItem } from './types';

function stamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** Builds an .ics calendar so reminders fire from the phone's calendar even when the app is closed. */
export function buildIcs(items: PlanItem[], goals: Goal[]): string {
  const goalName = new Map(goals.map((g) => [g.id, g.title]));
  const now = stamp(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Goal Track//EN', 'CALSCALE:GREGORIAN'];
  for (const it of items) {
    const start = parseLocal(it.date);
    const end = new Date(start.getTime() + (it.durationMin ?? 60) * 60000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${it.id}@goal-track`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(it.title)}`,
      `DESCRIPTION:${esc([goalName.get(it.goalId), it.detail].filter(Boolean).join('\n'))}`,
    );
    if (it.remindMin !== null) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(it.title)}`, `TRIGGER:-PT${it.remindMin}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
