// Display facts derived from a station.
import { isPlayed, stations, type Station } from '../game/index.ts';
import type { Tag } from './strings.ts';

export function tags(s: Station): Tag[] {
  const t: Tag[] = [s.type];
  if (!isPlayed(s)) return t;
  if (s.budget !== undefined) t.push('budget');
  if (s.timeLimit) t.push('timed');
  if (s.fastForwardOnly) t.push('breakdown');
  if (s.events?.length) t.push('events');
  if (s.publicLocked) t.push('locked');
  if (s.gcAfter) t.push('gc');
  if (s.workflow) t.push('gitflow');
  if (s.todo) t.push('todo');
  return t;
}

/** The tag shown under a station dot on the map: a modifier first, else the type. */
export function mainTag(s: Station): Tag {
  const t = tags(s);
  return (['timed', 'budget', 'breakdown', 'events', 'locked', 'gc', 'gitflow', 'todo'] as const).find((x) => t.includes(x)) ?? s.type;
}

/** 1-based position within its line. */
export const indexInLine = (s: Station) => stations.filter((x) => x.line === s.line).indexOf(s) + 1;
