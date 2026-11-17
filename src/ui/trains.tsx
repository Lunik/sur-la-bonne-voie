// Rolling stock families, one per station (see `train` in levels/stations.ts).
// Side-on silhouettes after real French trains: nose profile, roof line, window rhythm, bogies.
// No logos, no wordmarks: colours come from theme tokens (`.t-<family>` rules in app.css).
// Geometry contract shared with Yard.tsx: a car spans 0..70 × 0..34, a locomotive 0..100 × 0..34,
// wheels sit on the rail at y = 42 (CAR_H + 8). The car's livery stripe (y 24..28), label (centre,
// y 17) and flags (above y = -5) are drawn by Yard.tsx on top of what is here, so keep those zones quiet.
import { createContext, type ReactNode } from 'react';
import type { Train } from '../game/index.ts';

/** Train of the station on screen. The header art, outside any station, uses the default. */
export const TrainContext = createContext<Train>('tgv-m');

const H = 34; // CAR_H
const bogie = (a: number, b: number, r = 3.6) => (
  <>
    <rect className="frame" x={a - 4} y={H} width={b - a + 8} height={2} rx={1} />
    {[a, b].map((cx) => <circle key={cx} className="wheel" cx={cx} cy={42.1 - r} r={r} />)}
  </>
);
const panto = (x: number, y: number) => <path className="panto" d={`M${x} ${y} L${x + 8} ${y - 8} L${x + 16} ${y} M${x + 4} ${y - 8} H${x + 12}`} />;
const head = (x: number, y: number) => <text className="head" x={x} y={y}>HEAD</text>;
const lamp = (cx: number, cy: number) => <circle className="lamp" cx={cx} cy={cy} r={1.8} />;
const pane = (x: number, y: number, w: number, h: number, rx = 1.5) => <rect key={`${x},${y}`} className="pane" x={x} y={y} width={w} height={h} rx={rx} />;
const box = (rx: number) => <rect className="body" x={0.75} y={0.75} width={68.5} height={H - 1.5} rx={rx} />;

interface Loco {
  outline: string;
  /** The front from this x is painted signal yellow: the HEAD mark, whatever the train. */
  nose: number;
  /** Behind the body: pantographs, roof equipment. */
  roof?: ReactNode;
  /** Clipped to the outline, under the nose: liveries, skirts, masks. */
  paint?: ReactNode;
  /** On top: windows, HEAD, lamp, bogies. */
  front: ReactNode;
}

interface Family {
  /** Drawn under the stripe and the label. */
  car: ReactNode;
  loco: Loco;
}

export const trains: Record<Train, Family> = {
  // Z 50000 « Francilien »: low single deck, wide windows, wrap-around cab.
  francilien: {
    car: (
      <>
        <rect className="roof" x={4} y={-2.5} width={62} height={3.5} rx={1.75} />
        {box(7)}
        {pane(4, 5, 13, 13, 3)}
        {pane(53, 5, 13, 13, 3)}
        {bogie(6, 14)}
        {bogie(56, 64)}
      </>
    ),
    loco: {
      outline: 'M0 0 Q0 -5 6 -5 H66 C82 -5 92 3 96 14 Q99 22 98 30 Q97 34 93 34 H0 Z',
      nose: 86,
      roof: panto(22, -5),
      paint: <rect className="accent" x={0} y={26} width={100} height={4} />,
      front: (
        <>
          <path className="pane" d="M68 -1.5 H76 C84 -1 89 4 92 11 H68 Z" />
          {pane(6, 3, 12, 12, 3)}
          {pane(22, 3, 12, 12, 3)}
          {head(51, 14)}
          {lamp(95, 29)}
          {bogie(12, 22)}
          {bogie(66, 76)}
        </>
      ),
    },
  },
  // Regio 2N: double deck, angular nose under a black mask.
  regio2n: {
    car: (
      <>
        <rect className="roof" x={2} y={-2} width={66} height={3} rx={1} />
        {box(4)}
        <rect className="trim" x={1} y={29.5} width={68} height={3.5} />
        {[4, 55].flatMap((x) => [pane(x, 4, 11, 7), pane(x, 14, 11, 7)])}
        {bogie(9, 19)}
        {bogie(51, 61)}
      </>
    ),
    loco: {
      outline: 'M0 -2 Q0 -6 4 -6 H70 L94 10 L98 28 Q98 34 92 34 H0 Z',
      nose: 88,
      roof: panto(28, -6),
      paint: (
        <>
          <path className="trim" d="M62 -6 H72 L96 12 L97 18 H62 Z" />
          <rect className="trim" x={0} y={29} width={100} height={5} />
        </>
      ),
      front: (
        <>
          {[5, 18].flatMap((x) => [pane(x, -2, 10, 7), pane(x, 9, 10, 7)])}
          {head(46, 14)}
          {lamp(95, 26)}
          {bogie(12, 22)}
          {bogie(66, 76)}
        </>
      ),
    },
  },
  // Regiolis (Coradia Polyvalent): rounded nose, big rounded windows, roof fairing.
  regiolis: {
    car: (
      <>
        <rect className="roof" x={18} y={-4} width={34} height={5} rx={2.5} />
        {box(9)}
        {pane(5, 6, 12, 12, 5)}
        {pane(53, 6, 12, 12, 5)}
        {bogie(11, 21)}
        {bogie(49, 59)}
      </>
    ),
    loco: {
      outline: 'M0 0 Q0 -5 6 -5 H60 C78 -5 88 2 94 12 C99 20 99 28 96 32 Q95 34 91 34 H0 Z',
      nose: 82,
      roof: <rect className="roof" x={16} y={-9} width={30} height={5} rx={2} />,
      paint: <rect className="accent" x={0} y={28} width={100} height={6} />,
      front: (
        <>
          <path className="pane" d="M64 -1 H70 C80 0 86 5 90 12 H64 Z" />
          {pane(6, 4, 12, 12, 5)}
          {pane(24, 4, 12, 12, 5)}
          {head(51, 14)}
          {lamp(95, 26)}
          {bogie(12, 22)}
          {bogie(66, 76)}
        </>
      ),
    },
  },
  // AGC (X 76500 / Z 27500): beaked cab, small paired windows, roof boxes.
  agc: {
    car: (
      <>
        <rect className="roof" x={6} y={-4} width={16} height={5} rx={1} />
        <rect className="roof" x={48} y={-4} width={16} height={5} rx={1} />
        {box(5)}
        {[4, 12, 52, 60].map((x) => pane(x, 7, 6, 9))}
        {bogie(11, 21)}
        {bogie(49, 59)}
      </>
    ),
    loco: {
      outline: 'M0 -1 Q0 -6 5 -6 H62 Q68 -6 72 -2 L84 10 Q88 13 94 16 Q99 19 99 26 Q99 34 92 34 H0 Z',
      nose: 86,
      roof: <rect className="roof" x={14} y={-10} width={26} height={5} rx={1} />,
      paint: <rect className="accent" x={0} y={27} width={100} height={7} />,
      front: (
        <>
          <path className="pane" d="M66 -2 H70 L82 10 H66 Z" />
          {[6, 17, 28].map((x) => pane(x, 3, 8, 10))}
          {head(52, 18)}
          {lamp(96, 28)}
          {bogie(12, 22)}
          {bogie(64, 74)}
        </>
      ),
    },
  },
  // BB 26000 « Sybic » hauling Corail coaches: boxy twin-cab loco, ribbed steel coaches with an arched roof.
  corail: {
    car: (
      <>
        <path className="body" d="M0.75 6 Q0.75 0.75 9 0.75 H61 Q69.25 0.75 69.25 6 V33.25 H0.75 Z" />
        <path className="rib" d="M2 30 H68 M2 32 H68" />
        {[4, 13, 50, 59].map((x) => pane(x, 7, 7, 9, 1))}
        {bogie(8, 18)}
        {bogie(52, 62)}
      </>
    ),
    loco: {
      outline: 'M15 -4 H85 L95 10 L98 12 V34 H2 V12 L5 10 Z',
      nose: 92,
      roof: <>{panto(20, -4)}{panto(62, -4)}</>,
      paint: <rect className="accent" x={0} y={23} width={100} height={6} />,
      front: (
        <>
          <path className="pane" d="M83 -1.5 H85 L93 9.5 H83 Z" />
          <path className="pane" d="M15 -1.5 H17 V9.5 H7 Z" />
          <rect className="vent" x={34} y={0} width={32} height={9} rx={1} />
          {head(50, 18)}
          {lamp(96, 31)}
          {bogie(14, 26, 4.4)}
          {bogie(72, 84, 4.4)}
        </>
      ),
    },
  },
  // TGV Réseau: silver, dark window band, long tapered power car.
  tgv: {
    car: (
      <>
        {box(3)}
        <rect className="trim" x={1} y={3} width={68} height={7} />
        {[3, 12, 21, 30, 39, 48, 57].map((x) => pane(x, 4, 7, 5, 1))}
        {bogie(5, 13)}
        {bogie(57, 65)}
      </>
    ),
    loco: {
      outline: 'M0 -1 Q0 -5 4 -5 H52 C70 -5 82 6 92 18 Q99 26 99 30 Q99 34 94 34 H0 Z',
      nose: 88,
      roof: panto(18, -5),
      paint: <rect className="trim" x={0} y={4} width={100} height={5} />,
      front: (
        <>
          <path className="pane" d="M58 -2.5 C66 -2 72 1 77 6 H60 Z" />
          <rect className="vent" x={6} y={12} width={26} height={9} rx={1} />
          {head(48, 17)}
          {lamp(96, 30)}
          {bogie(10, 20)}
          {bogie(54, 64)}
        </>
      ),
    },
  },
  // TGV M (Avelia Horizon): pearl double deck, very long smooth nose.
  'tgv-m': {
    car: (
      <>
        <rect className="roof" x={3} y={-1.5} width={64} height={2.5} rx={1.25} />
        {box(6)}
        {[4, 52].flatMap((x) => [pane(x, 3.5, 14, 6, 3), pane(x, 13, 14, 6, 3)])}
        {bogie(5, 13)}
        {bogie(57, 65)}
      </>
    ),
    loco: {
      outline: 'M0 -3 Q0 -7 4 -7 H40 C62 -7 80 4 92 17 Q99 25 99 30 Q99 34 94 34 H0 Z',
      nose: 86,
      roof: panto(12, -7),
      paint: <rect className="accent" x={0} y={24} width={100} height={3} />,
      front: (
        <>
          <path className="pane" d="M50 -4 C62 -3 72 2 79 8 H52 Z" />
          {head(26, 15)}
          {lamp(96, 30)}
          {bogie(10, 20)}
          {bogie(54, 64)}
        </>
      ),
    },
  },
  // BB 75000 in maintenance yellow, pushing container wagons: the works train of the accidents line.
  infra: {
    car: (
      <>
        <rect className="trim" x={0} y={29} width={70} height={4} rx={1} />
        <rect className="body" x={2} y={0.75} width={66} height={28} rx={1} />
        <path className="rib" d="M7 3 V21 M11 3 V21 M15 3 V21 M55 3 V21 M59 3 V21 M63 3 V21" />
        {bogie(9, 17)}
        {bogie(53, 61)}
      </>
    ),
    loco: {
      outline: 'M2 34 V8 L5 6 L11 -4 H83 L91 6 L98 8 V34 Z',
      nose: 0,
      roof: (
        <>
          <rect className="roof" x={30} y={-8} width={20} height={5} rx={1} />
          <rect className="roof" x={56} y={-7} width={12} height={4} rx={1} />
        </>
      ),
      front: (
        <>
          <rect className="trim" x={2} y={27} width={96} height={3} />
          <path className="pane" d="M83 -1 L89.5 6 H83 Z" />
          <path className="pane" d="M11 -1 H13 V6 H6.5 Z" />
          <rect className="vent" x={34} y={1} width={30} height={10} rx={1} />
          {head(49, 20)}
          {lamp(96, 31)}
          {bogie(14, 26, 4.4)}
          {bogie(72, 84, 4.4)}
        </>
      ),
    },
  },
};
