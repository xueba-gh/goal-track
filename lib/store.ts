'use client';

import { useCallback, useEffect, useState } from 'react';
import { makeSeed } from './seed';
import type { AppData } from './types';

const KEY = 'goal-track:v1';

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.goals)) return migrate(parsed);
    }
  } catch {}
  const seed = makeSeed();
  saveData(seed);
  return seed;
}

// Earlier builds used bright colours. Map them to the professional palette.
const OLD_COLORS: Record<string, string> = {
  '#f2b544': '#1f4e8c',
  '#5cc8ff': '#2a8c82',
  '#ff7a6b': '#b4505a',
  '#b892ff': '#6c5fa7',
  '#7ddc8a': '#4c8c4a',
  '#4fd1c5': '#c08a2e',
  '#e8d9b0': '#6b7280',
  '#ff9ad5': '#3d7ea6',
};

function migrate(d: AppData): AppData {
  return {
    ...d,
    goals: d.goals.map((g) => ({ ...g, color: OLD_COLORS[g.color.toLowerCase()] ?? g.color })),
    settings: { ...d.settings, autoLockMin: typeof d.settings.autoLockMin === 'number' ? d.settings.autoLockMin : 30 },
  };
}

export function saveData(d: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {}
}

export function isValidData(d: unknown): d is AppData {
  const x = d as AppData;
  return !!x && x.version === 1 && Array.isArray(x.goals) && Array.isArray(x.items) && Array.isArray(x.notes) && Array.isArray(x.wins);
}

export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    setData(loadData());
  }, []);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      saveData(next);
      return next;
    });
  }, []);

  const replace = useCallback((d: AppData) => {
    const m = migrate(d);
    saveData(m);
    setData(m);
  }, []);

  return { data, update, replace };
}
