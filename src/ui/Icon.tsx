import type { Tool } from '../game/index.ts';

// Stroke icons of the prototype, 24×24 (the « dep » badge is 12×12).
const paths: Record<Exclude<Tool, 'recover'> | 'dep', string[]> = {
  rebase: ['M3 18h7M3 7h18', 'M10 18c4 0 5-11 9-11', 'M16 4l3 3-3 3'],
  merge: ['M6 3v3c0 5 6 6 6 11v4M18 3v3c0 5-6 6-6 11'],
  'cherry-pick': ['M16 4H6a2 2 0 0 0-2 2v10', 'M10 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z'],
  squash: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  revert: ['M9 14L4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'],
  commit: ['M6 6h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z', 'M12 9v6M9 12h6'],
  branch: ['M3 18h18', 'M3 18c8 0 9-11 18-11'],
  push: ['M7 17L17 7M9 7h8v8'],
  pull: ['M17 7L7 17M15 17H7V9'],
  'pull-rebase': ['M12 3v11M7 9l5 5 5-5M4 20h16'],
  dep: ['M3 9l6-6M4.5 3H9v4.5'],
};

export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg viewBox={name === 'dep' ? '0 0 12 12' : '0 0 24 24'} aria-hidden="true">
      {paths[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
