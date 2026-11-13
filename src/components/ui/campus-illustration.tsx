import { cn } from "@/lib/utils";

/*
 * Flat illustration of the ring campus in the style of the official campus
 * map: lawn, a three-armed river meeting in the centre, the white ring with
 * buildings hanging inside it, radial outer buildings, sports ground and pins.
 * Every colour is a theme token, so it switches with dark mode automatically.
 */

const CX = 186;
const CY = 106;

function polar(radius: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

/** Outer ring of radial buildings; gaps leave room for the three river arms. */
const OUTER_ANGLES = [-150, -125, -100, -78, -52, -28, 0, 22, 45, 120, 145, 170];
/** Teardrop academic buildings hanging from the inside of the ring (A–G). */
const INNER_ANGLES = [-140, -95, -45, 10, 50, 130, 165];
const TREES = [
  [28, 30],
  [48, 22],
  [300, 24],
  [322, 40],
  [338, 150],
  [312, 176],
  [246, 186],
  [108, 186],
  [86, 30],
  [270, 14],
];

function Pin({ x, y, label, alt = false }: { x: number; y: number; label: string; alt?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M0 6 C-3 2 -7 -1 -7 -6 A7 7 0 1 1 7 -6 C7 -1 3 2 0 6Z"
        className={alt ? "fill-map-pin-alt" : "fill-map-pin"}
      />
      <text
        x="0"
        y="-3.2"
        textAnchor="middle"
        className={cn("text-[8px] font-bold", alt ? "fill-black/70" : "fill-white")}
      >
        {label}
      </text>
    </g>
  );
}

export function CampusIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 210"
      aria-hidden
      focusable="false"
      className={cn("h-auto w-full select-none", className)}
    >
      {/* Ground */}
      <rect x="6" y="6" width="348" height="198" rx="44" className="fill-map-lawn" />

      {/* River: west and east arms meet in the centre, then flow south */}
      <g className="fill-none stroke-map-river" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 52 C60 50 90 70 120 82 S160 96 186 104" strokeWidth="13" />
        <path d="M354 60 C310 62 280 70 250 86 S210 98 186 104" strokeWidth="12" />
        <path d="M186 104 C190 130 176 150 182 172 S186 196 190 210" strokeWidth="11" />
      </g>
      <ellipse cx={CX} cy={CY - 2} rx="30" ry="17" className="fill-map-river" />

      {/* Sports ground and courts */}
      <rect x="22" y="104" width="46" height="84" rx="23" className="fill-map-track" />
      <rect x="29" y="113" width="32" height="66" rx="16" className="fill-map-lawn-deep" />
      <rect x="78" y="160" width="26" height="24" rx="6" className="fill-info/45" />

      {/* Outer radial buildings */}
      {OUTER_ANGLES.map((angle) => {
        const { x, y } = polar(88, angle);
        return (
          <rect
            key={angle}
            x={x - 9}
            y={y - 4.5}
            width="18"
            height="9"
            rx="4.5"
            transform={`rotate(${angle} ${x} ${y})`}
            className="fill-map-building"
          />
        );
      })}

      {/* The ring, with academic buildings hanging from its inner edge */}
      <circle cx={CX} cy={CY} r="66" className="fill-none stroke-black/5" strokeWidth="14" />
      <circle cx={CX} cy={CY} r="66" className="fill-none stroke-map-ring" strokeWidth="10" />
      {INNER_ANGLES.map((angle) => {
        const { x, y } = polar(52, angle);
        return (
          <ellipse
            key={angle}
            cx={x}
            cy={y}
            rx="12"
            ry="7.5"
            transform={`rotate(${angle + 90} ${x} ${y})`}
            className="fill-map-building"
          />
        );
      })}

      {/* Bridges */}
      <g strokeLinecap="round" strokeWidth="3.5" className="fill-none">
        <path d="M150 84 l10 14" className="stroke-event-space" />
        <path d="M222 84 l-8 15" className="stroke-map-pin-alt" />
        <path d="M172 140 l18 2" className="stroke-event-office" />
      </g>

      {/* Trees */}
      {TREES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="6" className="fill-map-lawn-deep" />
      ))}

      {/* Map pins */}
      <Pin x={CX} y={CY - 26} label="D" />
      <Pin x={CX + 44} y={CY - 18} label="C" />
      <Pin x={CX - 42} y={CY - 12} label="E" />
      <Pin x={CX + 40} y={CY + 30} label="B" />
      <Pin x={CX - 30} y={CY + 34} label="F" />
      <Pin x={CX + 2} y={CY + 2} label="H" alt />
    </svg>
  );
}
