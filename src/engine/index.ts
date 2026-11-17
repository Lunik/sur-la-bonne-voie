// Pure Git engine: knows nothing about React or the DOM.
// Jalon 1 fills in the state model and the commands; this is the wiring stub.

export type CommitKind = 'normal' | 'merge' | 'revert';

export interface Commit {
  id: string;
  parents: string[];
  label: string;
  origin: string;
  kind: CommitKind;
  cargo?: string;
}

export interface RepoState {
  commits: Record<string, Commit>;
  branches: Record<string, string>;
  head: string;
}

export type ExecResult =
  | { ok: true; state: RepoState; output: string }
  | { ok: false; error: string };

export function emptyRepo(): RepoState {
  return { commits: {}, branches: {}, head: 'main' };
}

/** Runs one command line. Never mutates `state`. */
export function exec(_state: RepoState, line: string): ExecResult {
  const cmd = line.trim().replace(/^git\s+/, '').split(/\s+/)[0];
  return { ok: false, error: `${cmd || '(vide)'} : commande inconnue` };
}
