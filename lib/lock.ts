'use client';

const ACTIVE_KEY = 'goal-track:lastActive';

export async function lockNow() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch {}
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {}
  window.location.href = '/login';
}

function loginTime(): number {
  const m = document.cookie.match(/(?:^|;\s*)gt_login=(\d+)/);
  return m ? Number(m[1]) : 0;
}

export function markActive() {
  try {
    localStorage.setItem(ACTIVE_KEY, String(Date.now()));
  } catch {}
}

/** The latest of: last activity on this device, or the last unlock. */
export function lastActive(): number {
  let stored = 0;
  try {
    stored = Number(localStorage.getItem(ACTIVE_KEY)) || 0;
  } catch {}
  return Math.max(stored, loginTime()) || Date.now();
}
