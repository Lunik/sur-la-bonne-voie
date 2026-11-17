// Stations are data. Jalon 2 defines the schema and ports the 21 stations.
import type { RepoState } from '../engine/index.ts';

export interface Station {
  id: string;
  line: number;
  title: string;
  start: string[];
  /** Built from `start` by the engine; computed, never written by hand. */
  preview?: RepoState;
}

export const stations: Station[] = [];
