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
      if (parsed && parsed.version === 1 && Array.isArray(parsed.goals)) return parsed;
    }
  } catch {}
  const seed = makeSeed();
  saveData(seed);
  return seed;
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
    saveData(d);
    setData(d);
  }, []);

  return { data, update, replace };
}
