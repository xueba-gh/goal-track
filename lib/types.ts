export type GoalStatus = 'active' | 'next' | 'later' | 'achieved';
export type ItemKind = 'session' | 'milestone' | 'deadline' | 'task';

export interface Smart {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

export interface Goal {
  id: string;
  title: string;
  area: string;
  status: GoalStatus;
  color: string;
  /** Local date-time, e.g. 2027-01-29T09:00 */
  deadline?: string;
  link?: string;
  linkLabel?: string;
  why?: string;
  smart: Smart;
  createdAt: string;
  achievedAt?: string;
}

export interface PlanItem {
  id: string;
  goalId: string;
  title: string;
  detail?: string;
  /** Local date-time, e.g. 2026-10-19T19:00 */
  date: string;
  durationMin?: number;
  kind: ItemKind;
  done: boolean;
  doneAt?: string;
  /** Minutes before start to remind. null = no reminder. */
  remindMin: number | null;
  notified?: boolean;
}

export interface Note {
  id: string;
  goalId: string;
  itemId?: string;
  text: string;
  source: 'typed' | 'voice';
  createdAt: string;
}

export interface Win {
  id: string;
  goalId: string;
  itemId?: string;
  title: string;
  feeling: string;
  thoughts: string;
  createdAt: string;
}

export interface Settings {
  notifications: boolean;
  voiceLang: string;
  focusGoalId: string;
}

export interface AppData {
  version: 1;
  goals: Goal[];
  items: PlanItem[];
  notes: Note[];
  wins: Win[];
  settings: Settings;
}
