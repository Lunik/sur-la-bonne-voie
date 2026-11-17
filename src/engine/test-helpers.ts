import assert from 'node:assert/strict';
import { exec, firstParentChain, tipOf, type RepoState } from './index.ts';

export function ok(state: RepoState, line: string) {
  const result = exec(state, line);
  if (!result.ok) assert.fail(`${line}: ${result.error}`);
  return result;
}

/** Asserts the command is refused and leaves `state` untouched; returns the error. */
export function refused(state: RepoState, line: string): string {
  const before = structuredClone(state);
  const result = exec(state, line);
  if (result.ok) assert.fail(`${line} should be refused`);
  assert.deepEqual(state, before);
  return result.error;
}

/** First-parent labels of a branch, oldest first: `A-B-C`. */
export function chain(state: RepoState, name: string): string {
  return firstParentChain(state, tipOf(state, name))
    .reverse()
    .map((id) => state.commits[id].label)
    .join('-');
}

export const labels = (state: RepoState, ids: string[]) => ids.map((id) => state.commits[id].label);

export const FORK = ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'switch main', 'commit'];
export const TRI = ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'switch main'];
