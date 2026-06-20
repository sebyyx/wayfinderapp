// A decorative SVG constellation that echoes the app's daily map. Pure markup —
// no client JS — so it renders instantly in the hero.
const NODES = [
  { x: 80, y: 120, r: 3.5 },
  { x: 150, y: 70, r: 2.5 },
  { x: 210, y: 140, r: 4.5 },
  { x: 280, y: 90, r: 2.5 },
  { x: 250, y: 200, r: 3 },
  { x: 170, y: 220, r: 5 },
  { x: 110, y: 190, r: 2.5 },
  { x: 320, y: 170, r: 3 },
  { x: 300, y: 250, r: 2.5 },
  { x: 200, y: 280, r: 3.5 },
];

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 6], [6, 0], [3, 7], [7, 8], [8, 4], [5, 9],
];

export default function Constellation({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 340"
      className={className}
      role="img"
      aria-label="A constellation drawn from a day's movement"
    >
      <defs>
        <radialGradient id="wf-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#84c1de" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#84c1de" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="400" height="340" fill="url(#wf-glow)" />
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={NODES[a].x}
          y1={NODES[a].y}
          x2={NODES[b].x}
          y2={NODES[b].y}
          stroke="#84c1de"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
      ))}
      {NODES.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r} fill="#f1ece4">
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur={`${3 + (i % 4)}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}
