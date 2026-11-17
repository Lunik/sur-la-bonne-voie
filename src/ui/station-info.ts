// Display facts derived from a station.
import { stations, type Station } from '../game/index.ts';
import type { Tag } from './strings.ts';

export function tags(s: Station): Tag[] {
  const t: Tag[] = [s.type];
  if (s.type === 'predict') return t;
  if (s.budget !== undefined) t.push('budget');
  if (s.keyboardOnly) t.push('keyboard');
  if (s.timeLimit) t.push('timed');
  if (s.fastForwardOnly) t.push('breakdown');
  return t;
}

/** The tag shown under a station dot on the map. */
export function mainTag(s: Station): Tag {
  const t = tags(s);
  return (['timed', 'keyboard', 'budget', 'breakdown'] as const).find((x) => t.includes(x)) ?? s.type;
}

/** 1-based position within its line. */
export const indexInLine = (s: Station) => stations.filter((x) => x.line === s.line).indexOf(s) + 1;
