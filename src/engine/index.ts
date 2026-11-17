// Pure Git engine: knows nothing about React or the DOM.
// Port of the prototype engine (reference/artifact.html, handoff § 4.1).
import { messages as m } from './messages.ts';

export type CommitKind = 'normal' | 'merge' | 'revert';

/** Commands that count as a move (par, budget). Everything else returns `move: null`. */
export type MoveKind = 'commit' | 'branch' | 'merge' | 'rebase' | 'cherry-pick' | 'reset' | 'revert' | 'push' | 'pull';

/** `exact` compares labels, `raw` ignores primes, `shape` compares only origin + prime. */
export type MatchMode = 'exact' | 'raw' | 'shape';

export interface Commit {
  id: string;
  parents: string[];
  /** A, B… ; `′` when recreated (rebase, cherry-pick) ; `M` for a merge ; `↩X` for a revert of X. */
  label: string;
  /** Branch the commit was born on; drives its livery. */
  origin: string;
  kind: CommitKind;
  cargo: string | null;
}

export interface RepoState {
  commits: Record<string, Commit>;
  /** Local branch → tip commit id. */
  branches: Record<string, string>;
  /** Display order of local branches. */
  order: string[];
  head: string;
  /** `origin` branch → tip commit id. */
  remote: Record<string, string>;
  /** Branch → tip ids, most recent first. Unbounded; `reflogLimit` only caps the `reflog` output. */
  reflog: Record<string, string[]>;
  /** Commits unhooked by `reset --soft`/`--mixed`, oldest first; the next `commit` squashes them. */
  pending: string[];
  /** Commit label → cargo, applied when that label is first committed. */
  cargo: Record<string, string>;
  nextLabel: number;
  nextId: number;
  /** Gated commands allowed so far; `null` allows everything. */
  allowed: string[] | null;
  /** Merge commits forbidden: only fast-forwards pass. */
  fastForwardOnly: boolean;
  forceForbidden: boolean;
  maxBranches: number;
  reflogLimit: number;
}

export type ExecResult =
  | { ok: true; state: RepoState; output: string[]; move: MoveKind | null }
  | { ok: false; error: string };

/** A refused command: becomes `{ ok: false }`. Any other exception is a bug and propagates. */
export class EngineError extends Error {}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PRIME = '′';
const DEFAULT_HELP = ['commit', 'branch', 'merge', 'rebase', 'cherry-pick', 'reset', 'revert', 'push', 'pull'];

function fail(message: string): never {
  throw new EngineError(message);
}
const stripPrimes = (label: string) => label.replaceAll(PRIME, '');
/** Lookup by a player-typed name: ignores inherited keys such as `toString` or `constructor`. */
const own = <T>(record: Record<string, T>, key: string): T | undefined => (Object.hasOwn(record, key) ? record[key] : undefined);

export function emptyRepo(options: Partial<Pick<RepoState, 'maxBranches' | 'reflogLimit'>> = {}): RepoState {
  return {
    commits: {}, branches: {}, order: [], head: 'main', remote: {}, reflog: {}, pending: [], cargo: {},
    nextLabel: 0, nextId: 0, allowed: null, fastForwardOnly: false, forceForbidden: false,
    maxBranches: 3, reflogLimit: 8, ...options,
  };
}

// ---------- Graph helpers ----------

export function ancestors(s: RepoState, id: string | undefined): Set<string> {
  const seen = new Set<string>();
  const stack = id ? [id] : [];
  while (stack.length) {
    const x = stack.pop()!;
    if (seen.has(x)) continue;
    seen.add(x);
    stack.push(...s.commits[x].parents);
  }
  return seen;
}

/** Tip first, following first parents. */
export function firstParentChain(s: RepoState, id: string | undefined): string[] {
  const out: string[] = [];
  for (let x = id; x; x = s.commits[x].parents[0]) out.push(x);
  return out;
}

function reachable(s: RepoState): Set<string> {
  const r = new Set<string>();
  for (const tip of [...Object.values(s.branches), ...Object.values(s.remote)]) {
    for (const x of ancestors(s, tip)) r.add(x);
  }
  return r;
}

/** Siding (voie de garage): commits reachable from no branch, no remote and not pending. */
export function orphans(s: RepoState): string[] {
  const r = reachable(s);
  const pending = new Set(s.pending);
  return Object.keys(s.commits).filter((id) => !r.has(id) && !pending.has(id));
}

/** Tip of a local branch or of `origin/<branch>`. */
export function tipOf(s: RepoState, name: string): string | undefined {
  return name.startsWith('origin/') ? own(s.remote, name.slice(7)) : own(s.branches, name);
}

const normalizeLabel = (label: string) => label.toUpperCase().replace(/['’`]/g, PRIME);

/** Prefers a reachable commit; otherwise the most recent one with that label. */
function findLabel(s: RepoState, label: string): string | undefined {
  const wanted = normalizeLabel(label);
  const r = reachable(s);
  const matches = Object.values(s.commits).filter((c) => c.label === wanted);
  return (matches.find((c) => r.has(c.id)) ?? matches.at(-1))?.id;
}

function branchTip(s: RepoState, name: string | undefined): string {
  if (!name) return fail(m.missingBranch);
  return tipOf(s, name) ?? fail(m.unknownBranch(name));
}

/** `HEAD`, branch, `origin/x`, label, `X~n`, `X^`, `branch@{n}`. */
function resolve(s: RepoState, ref: string): string | undefined {
  let match;
  if ((match = ref.match(/^(.+)~(\d+)$/))) {
    let x = resolve(s, match[1]);
    for (let i = 0; x && i < Number(match[2]); i++) x = s.commits[x].parents[0];
    return x;
  }
  if ((match = ref.match(/^(.+)\^$/))) {
    const x = resolve(s, match[1]);
    return x && s.commits[x].parents[0];
  }
  if ((match = ref.match(/^(.+)@\{(\d+)\}$/))) {
    const branch = match[1] === 'HEAD' ? s.head : match[1];
    return own(s.reflog, branch)?.[Number(match[2])];
  }
  if (ref === 'HEAD') return s.branches[s.head];
  return tipOf(s, ref) ?? findLabel(s, ref);
}

// ---------- Mutating steps (on the draft only) ----------

function makeCommit(s: RepoState, parents: string[], label: string, origin: string, kind: CommitKind = 'normal', cargo: string | null = null): string {
  const id = `k${s.nextId++}`;
  s.commits[id] = { id, parents, label, origin, kind, cargo };
  return id;
}

function setTip(s: RepoState, branch: string, id: string) {
  s.branches[branch] = id;
  (s.reflog[branch] = own(s.reflog, branch) ?? []).unshift(id);
}

function headTip(s: RepoState): string {
  return s.branches[s.head] ?? fail(m.emptyBranch(s.head));
}

const labelOf = (s: RepoState, id: string) => s.commits[id].label;

function merge(s: RepoState, target: string, out: string[]): MoveKind | null {
  const head = s.head;
  const tip = headTip(s);
  if (ancestors(s, tip).has(target)) {
    out.push(m.upToDate);
    return null;
  }
  if (ancestors(s, target).has(tip)) {
    setTip(s, head, target);
    out.push(m.mergeFastForward(head, labelOf(s, target)));
    return 'merge';
  }
  if (s.fastForwardOnly) fail(m.fastForwardOnly);
  setTip(s, head, makeCommit(s, [tip, target], 'M', head, 'merge'));
  out.push(m.mergeCommit(labelOf(s, target)));
  return 'merge';
}

function rebase(s: RepoState, target: string, targetName: string, out: string[]): MoveKind | null {
  const head = s.head;
  const tip = headTip(s);
  if (ancestors(s, tip).has(target)) {
    out.push(m.rebaseUpToDate(head));
    return null;
  }
  const onTarget = ancestors(s, target);
  const toReplay = firstParentChain(s, tip)
    .filter((id) => !onTarget.has(id))
    .reverse()
    .filter((id) => s.commits[id].kind !== 'merge');
  if (!toReplay.length) {
    setTip(s, head, target);
    out.push(m.rebaseFastForward(head, targetName));
    return 'rebase';
  }
  let base = target;
  const recreated: string[] = [];
  for (const id of toReplay) {
    const o = s.commits[id];
    base = makeCommit(s, [base], o.label + PRIME, o.origin, o.kind === 'revert' ? 'revert' : 'normal', o.cargo);
    recreated.push(labelOf(s, base));
  }
  setTip(s, head, base);
  out.push(m.rebased(head, recreated));
  out.push(m.rebasedLeftBehind(toReplay.map((id) => labelOf(s, id))));
  return 'rebase';
}

function gate(s: RepoState, cmd: string) {
  if (s.allowed && !s.allowed.includes(cmd)) fail(m.notYetTaught(cmd));
}

function run(s: RepoState, line: string): { output: string[]; move: MoveKind | null } {
  const args = line.trim().replace(/^git\s+/, '').split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cmd = args[0];
  if (!cmd) return { output: out, move: null };
  if (cmd === 'checkout') cmd = 'switch';
  const head = s.head;
  const arg = args[1];

  switch (cmd) {
    case 'commit': {
      gate(s, 'commit');
      let label: string;
      let origin = head;
      let cargo: string | null;
      if (s.pending.length) {
        label = s.pending.map((id) => stripPrimes(labelOf(s, id))).join('');
        cargo = s.pending.map((id) => s.commits[id].cargo).find(Boolean) ?? null;
        origin = s.commits[s.pending[0]].origin;
        out.push(m.commitSquash(head, label, s.pending.length));
        s.pending = [];
      } else {
        label = LETTERS[s.nextLabel++] ?? fail(m.outOfLetters);
        cargo = s.cargo[label] ?? null;
        out.push(m.commitNew(head, label));
      }
      const tip = s.branches[head];
      setTip(s, head, makeCommit(s, tip ? [tip] : [], label, origin, 'normal', cargo));
      if (!s.order.includes(head)) s.order.push(head);
      return { output: out, move: 'commit' };
    }
    case 'branch': {
      gate(s, 'branch');
      if (!arg) fail(m.branchNameMissing);
      if (Object.hasOwn(s.branches, arg)) fail(m.branchExists(arg));
      if (!/^[a-z0-9][a-z0-9_-]{0,14}$/i.test(arg)) fail(m.branchNameInvalid);
      if (s.order.length >= s.maxBranches) fail(m.tooManyBranches(s.maxBranches));
      const tip = headTip(s);
      s.branches[arg] = tip;
      s.reflog[arg] = [tip];
      s.order.push(arg);
      out.push(m.branchCreated(arg, labelOf(s, tip)));
      return { output: out, move: 'branch' };
    }
    case 'switch': {
      if (arg === '-c' || arg === '-b') {
        const name = args[2] ?? '';
        out.push(...run(s, `branch ${name}`).output);
        s.head = name;
        out.push(m.switchedNew(name));
        return { output: out, move: 'branch' };
      }
      if (arg?.startsWith('origin/')) fail(m.remoteNotDrivable);
      if (!arg || !Object.hasOwn(s.branches, arg)) fail(m.unknownBranchSwitch(arg ?? ''));
      if (arg === head) out.push(m.alreadyOn(head));
      else {
        s.head = arg;
        out.push(m.switched(arg));
      }
      return { output: out, move: null };
    }
    case 'merge': {
      gate(s, 'merge');
      const target = branchTip(s, arg);
      if (arg === head) fail(m.mergeSelf);
      return { output: out, move: merge(s, target, out) };
    }
    case 'rebase': {
      gate(s, 'rebase');
      const target = branchTip(s, arg);
      if (arg === head) fail(m.rebaseSelf);
      return { output: out, move: rebase(s, target, arg, out) };
    }
    case 'cherry-pick': {
      gate(s, 'cherry-pick');
      if (!arg) fail(m.cherryPickMissing);
      const id = findLabel(s, arg) ?? fail(m.carNotFound(normalizeLabel(arg)));
      const tip = headTip(s);
      const o = s.commits[id];
      if (ancestors(s, tip).has(id)) fail(m.carAlreadyOnBranch(o.label, head));
      if (o.kind === 'merge') fail(m.cannotCopyMerge);
      const copy = makeCommit(s, [tip], stripPrimes(o.label) + PRIME, o.origin, o.kind === 'revert' ? 'revert' : 'normal', o.cargo);
      setTip(s, head, copy);
      out.push(m.cherryPicked(head, labelOf(s, copy), o.label));
      return { output: out, move: 'cherry-pick' };
    }
    case 'reset': {
      gate(s, 'reset');
      let mode = 'mixed';
      let ref = 'HEAD';
      for (const a of args.slice(1)) {
        if (a === '--soft' || a === '--hard' || a === '--mixed') mode = a.slice(2);
        else ref = a;
      }
      const tip = headTip(s);
      const target = resolve(s, ref) ?? fail(m.refNotFound(ref));
      if (target === tip) {
        out.push(m.headAt(labelOf(s, tip)));
        return { output: out, move: null };
      }
      const before = reachable(s);
      if (mode === 'hard') s.pending = [];
      else {
        const chain = firstParentChain(s, tip);
        const i = chain.indexOf(target);
        s.pending = i > 0 ? chain.slice(0, i).reverse().concat(s.pending) : [];
      }
      setTip(s, head, target);
      const after = reachable(s);
      const pending = new Set(s.pending);
      const lost = [...before].filter((x) => !after.has(x) && !pending.has(x));
      out.push(m.headAt(labelOf(s, target)));
      if (s.pending.length) out.push(m.resetPending(s.pending.map((id) => labelOf(s, id))));
      if (lost.length) out.push(m.resetLost(lost.map((id) => labelOf(s, id))));
      return { output: out, move: 'reset' };
    }
    case 'revert': {
      gate(s, 'revert');
      if (!arg) fail(m.revertMissing);
      const id = findLabel(s, arg) ?? fail(m.carNotFound(normalizeLabel(arg)));
      const tip = headTip(s);
      const o = s.commits[id];
      if (!ancestors(s, tip).has(id)) fail(m.carNotOnBranch(o.label, head));
      if (o.kind !== 'normal') fail(m.cannotRevert);
      const inverse = makeCommit(s, [tip], '↩' + stripPrimes(o.label), head, 'revert');
      setTip(s, head, inverse);
      out.push(m.reverted(head, labelOf(s, inverse), o.label));
      return { output: out, move: 'revert' };
    }
    case 'push': {
      gate(s, 'push');
      const force = args.includes('--force') || args.includes('-f');
      const tip = headTip(s);
      const remoteTip = own(s.remote, head);
      if (remoteTip === tip) {
        out.push(m.pushUpToDate);
        return { output: out, move: null };
      }
      if (remoteTip && !ancestors(s, tip).has(remoteTip)) {
        if (!force) fail(m.pushRejected(head));
        if (s.forceForbidden) fail(m.forceForbidden);
        out.push(m.pushForced);
      }
      s.remote[head] = tip;
      out.push(m.pushed(head));
      return { output: out, move: 'push' };
    }
    case 'pull': {
      gate(s, 'pull');
      const remoteTip = own(s.remote, head) ?? fail(m.noRemote(head));
      headTip(s);
      out.push(m.pulled(head));
      const integrated = args.includes('--rebase') ? rebase(s, remoteTip, `origin/${head}`, out) : merge(s, remoteTip, out);
      return { output: out, move: integrated ? 'pull' : null };
    }
    case 'fetch':
      out.push(m.fetch);
      return { output: out, move: null };
    case 'reflog': {
      const branch = args.slice(1).find((x) => x !== 'show') ?? head;
      (own(s.reflog, branch) ?? []).slice(0, s.reflogLimit).forEach((id, i) => out.push(m.reflogEntry(branch, i, labelOf(s, id))));
      return { output: out, move: null };
    }
    case 'log': {
      for (const id of firstParentChain(s, s.branches[head])) {
        const names = [
          ...Object.keys(s.branches).filter((b) => s.branches[b] === id).map((b) => (b === head ? `HEAD -> ${b}` : b)),
          ...Object.keys(s.remote).filter((b) => s.remote[b] === id).map((b) => `origin/${b}`),
        ];
        out.push(`${labelOf(s, id)}${names.length ? `  (${names.join(', ')})` : ''}`);
      }
      return { output: out, move: null };
    }
    case 'status': {
      out.push(m.statusBranch(head));
      if (s.pending.length) out.push(m.statusPending(s.pending.map((id) => labelOf(s, id))));
      const remoteTip = own(s.remote, head);
      if (remoteTip) {
        const mine = ancestors(s, s.branches[head]);
        const theirs = ancestors(s, remoteTip);
        const ahead = [...mine].filter((x) => !theirs.has(x)).length;
        const behind = [...theirs].filter((x) => !mine.has(x)).length;
        out.push(ahead || behind ? m.statusDiverged(ahead, behind, head) : m.statusInSync(head));
      }
      return { output: out, move: null };
    }
    case 'help':
      out.push(m.help(s.allowed ?? DEFAULT_HELP));
      return { output: out, move: null };
    case '_coll': {
      // Internal: a colleague pushes a new commit to origin/main.
      const remoteTip = own(s.remote, 'main') ?? fail(m.noRemote('main'));
      const label = LETTERS[s.nextLabel++] ?? fail(m.outOfLetters);
      s.remote.main = makeCommit(s, [remoteTip], label, 'collègue', 'normal', s.cargo[label] ?? null);
      return { output: out, move: null };
    }
    default:
      return fail(m.unknownCommand(cmd));
  }
}

// ---------- Public API ----------

/** Runs one command line. Never mutates `state`: works on a clone, so a refused command leaves nothing behind. */
export function exec(state: RepoState, line: string): ExecResult {
  const draft = structuredClone(state);
  try {
    return { ok: true, state: draft, ...run(draft, line) };
  } catch (error) {
    if (error instanceof EngineError) return { ok: false, error: error.message };
    throw error;
  }
}

/** Builds a board from content commands (ungated). Throws if one is refused: that is a content bug. */
export function build(commands: string[], cargo: Record<string, string> = {}, base: RepoState = emptyRepo()): RepoState {
  let state: RepoState = { ...base, cargo };
  for (const line of commands) {
    const result = exec(state, line);
    if (!result.ok) throw new Error(`build: « ${line} » refusée : ${result.error}`);
    state = result.state;
  }
  return state;
}

function chainSignature(s: RepoState, tip: string, mode: MatchMode): string {
  return firstParentChain(s, tip)
    .reverse()
    .map((id) => {
      const c = s.commits[id];
      if (c.kind === 'merge') return `M(${stripPrimes(labelOf(s, c.parents[1]))})`;
      if (mode === 'shape') return c.origin + (c.label.includes(PRIME) ? PRIME : '');
      return mode === 'raw' ? stripPrimes(c.label) : c.label;
    })
    .join('-');
}

/** Win signature: first-parent chain of each named branch (`main`, `origin/main`…). Equal signatures = same board. */
export function sig(s: RepoState, names: string[], mode: MatchMode = 'exact'): string {
  return names
    .map((name) => {
      const tip = tipOf(s, name);
      return `${name}:${tip ? chainSignature(s, tip, mode) : '∅'}`;
    })
    .join(' | ');
}
