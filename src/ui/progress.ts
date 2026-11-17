// Per-browser progress. Keys are versioned and keyed by station id; storage may throw (private mode), so every access is guarded.
const KEY = 'gare3.progress';

export interface Progress {
  /** Station id → best stars. */
  stars: Record<string, number>;
  current: string | null;
  unlockAll: boolean;
}

export function loadProgress(): Progress {
  const empty: Progress = { stars: {}, current: null, unlockAll: false };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return saved && typeof saved === 'object' ? { ...empty, ...saved } : empty;
  } catch {
    return empty;
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Not saved: the game still plays.
  }
}
