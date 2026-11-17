// Rolling stock families, one per station (see `train` in levels/stations.ts).
// Side-on silhouettes after real French trains: nose profile, roof line, doors, window rhythm, bogies.
// No logos, no wordmarks: colours come from theme tokens (`.t-<family>` rules in app.css).
// Geometry contract shared with Yard.tsx: a car spans x 0..70, a locomotive x 0..100; both run from
// their roof (y -4..-7, the car matching its locomotive) down to y 34,
// wheels sit on the rail at y = 42 (CAR_H + 8), the gap to the previous vehicle is -8..0.
// Yard.tsx draws the livery stripe (y 24..28), the label (x 23..47, y 9..25) and the flags (above
// y = -11) on top of the car, so details stay out of the label box and stay neutral in colour.
import { createContext, type ReactNode } from 'react';
import type { Train } from '../game/index.ts';

/** Train of the station on screen. The header art, outside any station, uses the default. */
export const TrainContext = createContext<Train>('tgv-m');

const H = 34; // CAR_H

// ---------- Parts ----------

/** A window with its light streak. */
const pane = (x: number, y: number, w: number, h: number, rx = 1.5) => (
  <g key={`p${x},${y}`}>
    <rect className="pane" x={x} y={y} width={w} height={h} rx={rx} />
    <path className="glint" d={`M${x + w * 0.5} ${y + 0.7} h${w * 0.22} L${x + w * 0.32} ${y + h - 0.7} h${-w * 0.22} Z`} />
  </g>
);

/** A sliding double door, glazed. `acc` paints it in the family accent (cab cars only). */
const door = (x: number, y: number, w: number, h: number, acc = false) => (
  <g key={`d${x}`}>
    <rect className={`door${acc ? ' acc' : ''}`} x={x} y={y} width={w} height={h} rx={0.8} />
    <rect className="pane" x={x + 0.8} y={y + 2} width={w / 2 - 1.2} height={h * 0.38} rx={0.5} />
    <rect className="pane" x={x + w / 2 + 0.4} y={y + 2} width={w / 2 - 1.2} height={h * 0.38} rx={0.5} />
    <path className="seam" d={`M${x + w / 2} ${y} V${y + h}`} />
  </g>
);

/** Two-axle bogie: wheels with hubs, side frame over them, axle boxes and the central spring. */
const bogie = (a: number, b: number, r = 3.6) => {
  const cy = 42.1 - r;
  return (
    <>
      {[a, b].map((cx) => (
        <g key={cx}>
          <circle className="wheel" cx={cx} cy={cy} r={r} />
          <circle className="hub" cx={cx} cy={cy} r={r * 0.32} />
        </g>
      ))}
      <path className="frame" d={`M${a - 5} ${H + 0.5} H${b + 5} V${H + 2.4} L${b + 1.5} ${H + 4.6} H${a - 1.5} L${a - 5} ${H + 2.4} Z`} />
      <rect className="spring" x={(a + b) / 2 - 2} y={H + 1.6} width={4} height={3.4} rx={0.8} />
    </>
  );
};

/** Equipment boxes hung under the floor, between the bogies. */
const under = (x1: number, x2: number, h = 3.5) => <rect className="trim" x={x1} y={H} width={x2 - x1} height={h} rx={1} />;

/** Single-arm pantograph on its insulators, folded down. */
const panto = (x: number, y: number) => (
  <g key={`pa${x}`}>
    <rect className="insul" x={x} y={y - 2} width={3} height={2} rx={0.5} />
    <rect className="insul" x={x + 11} y={y - 2} width={3} height={2} rx={0.5} />
    <path className="panto" d={`M${x + 1} ${y - 2} H${x + 13} M${x + 3} ${y - 2} L${x + 14} ${y - 4.5} L${x + 5} ${y - 7}`} />
    <rect className="pan" x={x + 1} y={y - 8.6} width={9} height={1.8} rx={0.9} />
  </g>
);

/** Ventilation grille: a panel with vertical louvres. */
const vent = (x: number, y: number, w: number, h: number) => (
  <g key={`v${x}`}>
    <rect className="vent" x={x} y={y} width={w} height={h} rx={1} />
    <path className="louvre" d={Array.from({ length: Math.floor(w / 2.4) }, (_, i) => `M${x + 1.4 + i * 2.4} ${y + 1.2} V${y + h - 1.2}`).join(' ')} />
  </g>
);

const head = (x: number, y: number) => <text className="head" x={x} y={y}>HEAD</text>;
/** Headlights: one high, one low. */
const lamps = (x1: number, y1: number, x2: number, y2: number) => (
  <>
    <circle className="lamp" cx={x1} cy={y1} r={1.6} />
    <circle className="lamp" cx={x2} cy={y2} r={1.9} />
  </>
);
/** Snowplough under the cab, in front of the leading bogie. */
const plough = (x: number) => <path className="trim" d={`M${x} ${H - 1} H${x + 14} L${x + 16} ${H + 3} L${x + 13} ${H + 6} H${x + 2} Z`} />;
/** Windscreen wiper, parked. */
const wiper = (x: number, y: number, l = 5) => <path className="wiper" d={`M${x} ${y} l${l} -${l}`} />;

// ---------- Links to the previous vehicle (drawn in the gap -8..0) ----------

/** Rubber bellows of a multiple unit, over the coupler. */
const gangway = (
  <>
    <rect className="coupler" x={-8} y={H - 12} width={8} height={3} />
    <rect className="gangway" x={-8.5} y={-1} width={9} height={28} rx={1} />
    <path className="louvre" d="M-6 1 V25 M-4 1 V25 M-2 1 V25" />
  </>
);
/** Screw coupling between two pairs of buffers. */
const buffers = (
  <>
    <rect className="coupler" x={-8} y={H - 7} width={8} height={2} />
    <rect className="buffer-head" x={-8} y={H - 10} width={2.2} height={7} rx={0.8} />
    <rect className="buffer-head" x={-2.2} y={H - 10} width={2.2} height={7} rx={0.8} />
  </>
);

interface Loco {
  outline: string;
  /** The front from this x is painted signal yellow: the HEAD mark, whatever the train. */
  nose: number;
  /** Behind the body: pantographs, roof equipment. */
  roof?: ReactNode;
  /** Clipped to the outline, under the nose: liveries, skirts, masks. */
  paint?: ReactNode;
  /** On top: windows, doors, HEAD, lamps, bogies. */
  front: ReactNode;
}

interface Family {
  /** Drawn under the stripe and the label. */
  car: ReactNode;
  /** Gap to the previous vehicle, drawn when coupled. */
  link: ReactNode;
  loco: Loco;
}

export const trains: Record<Train, Family> = {
  // Z 50000 « Francilien »: low single deck, wide windows, wrap-around cab, bellows between cars.
  francilien: {
    car: (
      <>
        <rect className="roof" x={4} y={-7.5} width={62} height={3.5} rx={1.75} />
        <rect className="roof" x={26} y={-10} width={18} height={3} rx={1} />
        <rect className="body" x={0.75} y={-4.25} width={68.5} height={H + 3.5} rx={7} />
        {door(3, -1, 8, 32)}
        {door(59, -1, 8, 32)}
        {pane(13, 0, 9, 16, 2.5)}
        {pane(48, 0, 9, 16, 2.5)}
        {under(27, 43)}
        {bogie(15, 23)}
        {bogie(47, 55)}
      </>
    ),
    link: gangway,
    loco: {
      outline: 'M0 0 Q0 -5 6 -5 H66 C82 -5 92 3 96 14 Q99 22 98 30 Q97 34 93 34 H0 Z',
      nose: 86,
      roof: <>{panto(20, -5)}<rect className="roof" x={40} y={-8} width={20} height={3.5} rx={1} /></>,
      paint: <rect className="accent" x={0} y={26} width={100} height={4} />,
      front: (
        <>
          <path className="pane" d="M68 -1.5 H76 C84 -1 89 4 92 11 H68 Z" />
          {wiper(80, 10)}
          {pane(5, 3, 11, 12, 2.5)}
          {pane(19, 3, 11, 12, 2.5)}
          {door(58, 2, 8, 28, true)}
          {head(44, 21)}
          {lamps(95, 21, 96.5, 28.5)}
          {under(30, 54)}
          {plough(82)}
          {bogie(12, 22)}
          {bogie(66, 76)}
        </>
      ),
    },
  },
  // Regio 2N: double deck between raised ends, angular nose under a black mask.
  regio2n: {
    car: (
      <>
        <rect className="roof" x={2} y={-8} width={66} height={3} rx={1} />
        <rect className="roof" x={6} y={-10.5} width={12} height={3} rx={1} />
        <rect className="body" x={0.75} y={-5.25} width={68.5} height={H + 4.5} rx={4} />
        <rect className="trim" x={1} y={29.5} width={68} height={3.5} />
        {[3, 57].flatMap((x) => [pane(x, -2, 10, 8), pane(x, 10, 10, 8)])}
        {door(15, 3, 6, 28)}
        {door(49, 3, 6, 28)}
        {under(26, 44, 3)}
        {bogie(8, 17)}
        {bogie(53, 62)}
      </>
    ),
    link: gangway,
    loco: {
      outline: 'M0 -2 Q0 -6 4 -6 H70 L94 10 L98 28 Q98 34 92 34 H0 Z',
      nose: 88,
      roof: <>{panto(26, -6)}<rect className="roof" x={46} y={-9} width={14} height={3.5} rx={1} /></>,
      paint: (
        <>
          <path className="trim" d="M62 -6 H72 L96 12 L97 18 H62 Z" />
          <rect className="trim" x={0} y={29} width={100} height={5} />
        </>
      ),
      front: (
        <>
          <path className="glint" d="M76 -3 h4 L72 15 h-4 Z" />
          {[5, 18].flatMap((x) => [pane(x, -2, 10, 7), pane(x, 9, 10, 7)])}
          {door(55, 3, 6, 25, true)}
          {head(43, 22)}
          {lamps(95.5, 20, 96.5, 26.5)}
          {under(30, 52, 3)}
          {plough(80)}
          {bogie(12, 22)}
          {bogie(66, 76)}
        </>
      ),
    },
  },
  // Regiolis (Coradia Polyvalent): low floor, rounded nose, big rounded windows, roof fairing.
  regiolis: {
    car: (
      <>
        <rect className="roof" x={18} y={-9} width={34} height={5} rx={2.5} />
        <rect className="body" x={0.75} y={-4.25} width={68.5} height={H + 3.5} rx={9} />
        {door(4, 0, 7, 31)}
        {door(59, 0, 7, 31)}
        {pane(12.5, 1, 10, 14, 4)}
        {pane(47.5, 1, 10, 14, 4)}
        {under(26, 44)}
        {bogie(14, 22)}
        {bogie(48, 56)}
      </>
    ),
    link: gangway,
    loco: {
      outline: 'M0 0 Q0 -5 6 -5 H60 C78 -5 88 2 94 12 C99 20 99 28 96 32 Q95 34 91 34 H0 Z',
      nose: 82,
      roof: <>{panto(4, -5)}<rect className="roof" x={22} y={-9} width={30} height={5} rx={2} /></>,
      paint: <rect className="accent" x={0} y={28} width={100} height={6} />,
      front: (
        <>
          <path className="pane" d="M64 -1 H70 C80 0 86 5 90 12 H64 Z" />
          {wiper(78, 11)}
          {pane(5, 3, 11, 12, 4.5)}
          {door(19, 2, 7, 25, true)}
          {pane(29, 3, 11, 12, 4.5)}
          {head(53, 21)}
          {lamps(94.5, 18, 96.5, 25)}
          {under(30, 56)}
          {plough(80)}
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
        <rect className="roof" x={6} y={-10} width={16} height={5} rx={1} />
        <rect className="roof" x={48} y={-10} width={16} height={5} rx={1} />
        <rect className="body" x={0.75} y={-5.25} width={68.5} height={H + 4.5} rx={5} />
        {door(3, -1, 7, 32)}
        {door(60, -1, 7, 32)}
        {[11.5, 17.5, 46.5, 52.5].map((x) => pane(x, 1, 5, 12, 1))}
        {under(26, 44)}
        {bogie(13, 21)}
        {bogie(49, 57)}
      </>
    ),
    link: gangway,
    loco: {
      outline: 'M0 -1 Q0 -6 5 -6 H62 Q68 -6 72 -2 L84 10 Q88 13 94 16 Q99 19 99 26 Q99 34 92 34 H0 Z',
      nose: 86,
      roof: (
        <>
          <rect className="roof" x={14} y={-10} width={26} height={5} rx={1} />
          <path className="louvre" d="M17 -9 V-6 M20 -9 V-6 M23 -9 V-6 M26 -9 V-6 M29 -9 V-6 M32 -9 V-6 M35 -9 V-6" />
        </>
      ),
      paint: <rect className="accent" x={0} y={27} width={100} height={7} />,
      front: (
        <>
          <path className="pane" d="M66 -2 H70 L82 10 H66 Z" />
          {wiper(72, 9)}
          {[6, 17, 28].map((x) => pane(x, 3, 8, 10))}
          {door(59, 1, 6, 25, true)}
          {head(47, 21)}
          {lamps(93, 18, 97, 25)}
          {under(30, 54)}
          {plough(82)}
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
        <path className="body" d="M0.75 2 Q0.75 -3.25 9 -3.25 H61 Q69.25 -3.25 69.25 2 V33.25 H0.75 Z" />
        <path className="rib" d="M5 -1 H65 M2 30 H68 M2 32 H68" />
        {door(2.5, 0, 6, 31)}
        {door(61.5, 0, 6, 31)}
        {pane(10.5, 3, 7, 11, 1)}
        {pane(52.5, 3, 7, 11, 1)}
        {under(22, 31, 3)}
        {under(39, 48, 3)}
        {bogie(9, 18)}
        {bogie(52, 61)}
      </>
    ),
    link: <>{buffers}<rect className="gangway" x={-8.5} y={2} width={9} height={22} rx={1} /></>,
    loco: {
      outline: 'M15 -4 H85 L95 10 L98 12 V34 H2 V12 L5 10 Z',
      nose: 92,
      roof: (
        <>
          {panto(20, -4)}
          {panto(64, -4)}
          <rect className="roof" x={38} y={-7} width={24} height={3.5} rx={1} />
          <path className="louvre" d="M41 -6 V-4 M44 -6 V-4 M47 -6 V-4 M50 -6 V-4 M53 -6 V-4 M56 -6 V-4 M59 -6 V-4" />
        </>
      ),
      paint: <rect className="accent" x={0} y={23} width={100} height={6} />,
      front: (
        <>
          <path className="pane" d="M83 -1.5 H85 L93 9.5 H83 Z" />
          <path className="pane" d="M15 -1.5 H17 V9.5 H7 Z" />
          {wiper(84, 8, 3.5)}
          {door(19, -1, 6, 23)}
          {door(75, -1, 6, 23)}
          {vent(31, 0, 38, 9)}
          {head(50, 18)}
          {lamps(96.5, 16, 96.5, 31)}
          <rect className="buffer-head" x={98} y={27.5} width={2.2} height={6} rx={0.8} />
          {under(34, 64, 4)}
          {bogie(14, 26, 4.4)}
          {bogie(72, 84, 4.4)}
        </>
      ),
    },
  },
  // TGV Réseau: silver, dark window band, long tapered power car, bellows between trailers.
  tgv: {
    car: (
      <>
        <rect className="body" x={0.75} y={-4.25} width={68.5} height={H + 3.5} rx={3} />
        <rect className="trim" x={8} y={-1} width={54} height={8} />
        {[9.5, 18.5, 27.5, 36.5, 45.5, 54.5].map((x) => pane(x, 0, 6.5, 6, 1))}
        {door(2, -1, 5, 31)}
        {door(63, -1, 5, 31)}
        {under(24, 46, 3)}
        {bogie(9, 17)}
        {bogie(53, 61)}
      </>
    ),
    link: gangway,
    loco: {
      outline: 'M0 -1 Q0 -5 4 -5 H52 C70 -5 82 6 92 18 Q99 26 99 30 Q99 34 94 34 H0 Z',
      nose: 88,
      roof: <>{panto(16, -5)}<rect className="roof" x={34} y={-8} width={16} height={3.5} rx={1} /></>,
      paint: (
        <>
          <rect className="trim" x={0} y={4} width={100} height={5} />
        </>
      ),
      front: (
        <>
          <path className="pane" d="M58 -2.5 C66 -2 72 1 77 6 H60 Z" />
          {wiper(66, 5)}
          {vent(4, 12, 20, 9)}
          {door(52, 2, 5, 25)}
          {head(38, 18)}
          {lamps(93.5, 22, 97, 29)}
          {under(28, 50)}
          {plough(80)}
          {bogie(10, 20)}
          {bogie(56, 66)}
        </>
      ),
    },
  },
  // TGV M (Avelia Horizon): pearl double deck, very long smooth nose.
  'tgv-m': {
    car: (
      <>
        <rect className="roof" x={3} y={-8.5} width={64} height={2.5} rx={1.25} />
        <rect className="body" x={0.75} y={-6.25} width={68.5} height={H + 5.5} rx={6} />
        {[8.5, 48.5].flatMap((x) => [pane(x, -3, 13, 7, 3), pane(x, 8, 13, 7, 3)])}
        {door(2, 7, 5, 24)}
        {door(63, 7, 5, 24)}
        {under(24, 46, 3)}
        {bogie(10, 18)}
        {bogie(52, 60)}
      </>
    ),
    link: gangway,
    loco: {
      outline: 'M0 -3 Q0 -7 4 -7 H40 C62 -7 80 4 92 17 Q99 25 99 30 Q99 34 94 34 H0 Z',
      nose: 86,
      roof: <>{panto(10, -7)}<rect className="roof" x={28} y={-10} width={14} height={3.5} rx={1} /></>,
      paint: <rect className="accent" x={0} y={24} width={100} height={3} />,
      front: (
        <>
          <path className="pane" d="M50 -4 C62 -3 72 2 79 8 H52 Z" />
          {wiper(62, 7)}
          {vent(4, 16, 34, 6)}
          {door(42, -2, 5, 25)}
          {head(22, 11)}
          {lamps(93, 21, 97, 29)}
          {under(28, 50)}
          {plough(80)}
          {bogie(10, 20)}
          {bogie(56, 66)}
        </>
      ),
    },
  },
  // BB 75000 in maintenance yellow, pushing container wagons: the works train of the accidents line.
  infra: {
    car: (
      <>
        <rect className="trim" x={0} y={29} width={70} height={4} rx={1} />
        <rect className="body" x={2} y={-3.25} width={66} height={32} rx={1} />
        <path className="rib" d="M7 -1 V21 M11 -1 V21 M15 -1 V21 M55 -1 V21 M59 -1 V21 M63 -1 V21" />
        {[2, 64].flatMap((x) => [-3.25, 24.75].map((y) => <rect key={`${x},${y}`} className="trim" x={x} y={y} width={4} height={4} rx={0.5} />))}
        <path className="rod" d="M19 0 V22 M21.5 0 V22" />
        {bogie(10, 18)}
        {bogie(52, 60)}
      </>
    ),
    link: buffers,
    loco: {
      outline: 'M2 34 V8 L5 6 L11 -4 H83 L91 6 L98 8 V34 Z',
      nose: 0,
      roof: (
        <>
          <rect className="roof" x={30} y={-8} width={20} height={5} rx={1} />
          <rect className="roof" x={56} y={-7} width={12} height={4} rx={1} />
          <rect className="trim" x={36} y={-11} width={3} height={4} rx={0.5} />
        </>
      ),
      front: (
        <>
          <rect className="trim" x={2} y={27} width={96} height={3} />
          <path className="pane" d="M83 -1 L89.5 6 H83 Z" />
          <path className="pane" d="M11 -1 H13 V6 H6.5 Z" />
          <rect className="door-line" x={15} y={0} width={6} height={25} rx={0.8} />
          <rect className="door-line" x={77} y={0} width={6} height={25} rx={0.8} />
          {pane(16.2, 2, 3.6, 7, 0.6)}
          {pane(78.2, 2, 3.6, 7, 0.6)}
          {vent(25, 1, 22, 11)}
          {vent(51, 1, 22, 11)}
          {head(49, 21)}
          {lamps(95.5, 12, 96, 31)}
          <rect className="buffer-head" x={98} y={27.5} width={2.2} height={6} rx={0.8} />
          <rect className="tank" x={33} y={H} width={32} height={5} rx={2.5} />
          {bogie(14, 26, 4.4)}
          {bogie(72, 84, 4.4)}
        </>
      ),
    },
  },
};
