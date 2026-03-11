"use client";

import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Hex, Season, Species, WeatherType } from "@/lib/types";

export type MapOverlayMode = "ecology" | "moisture" | "biomass" | "elevation" | "population";

interface HexMapProps {
  hexes: Hex[];
  species: Species[];
  selectedHexId: string | null;
  overlayMode?: MapOverlayMode;
  weather?: WeatherType;
  season?: Season;
  onSelectHex: (hexId: string) => void;
}

const HEX_SIZE = 24;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;

const polygonPoints = () => {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    points.push(`${HEX_SIZE * Math.cos(angle)},${HEX_SIZE * Math.sin(angle)}`);
  }
  return points.join(" ");
};

const toPixel = (q: number, r: number) => {
  const x = HEX_SIZE * Math.sqrt(3) * (q + 0.5 * (r & 1));
  const y = HEX_SIZE * (3 / 2) * r;
  return { x, y };
};

const hexDistance = (a: Pick<Hex, "q" | "r">, b: Pick<Hex, "q" | "r">) => {
  const ax = a.q - (a.r - (a.r & 1)) / 2;
  const az = a.r;
  const ay = -ax - az;
  const bx = b.q - (b.r - (b.r & 1)) / 2;
  const bz = b.r;
  const by = -bx - bz;
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const waterDepthColor = (moisture: number) => {
  const normalized = clamp(moisture / 16, 0, 1);
  const hue = 205 + normalized * 16;
  const saturation = 64 + normalized * 18;
  const lightness = 42 - normalized * 20;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

const landVegetationColor = (hex: Hex, minWaterDistance: number) => {
  const biomass = clamp(hex.vegetation / 120, 0, 1);
  const moisture = clamp(hex.moisture / 14, 0, 1);
  const nearWaterBoost =
    minWaterDistance <= 1 ? 1 : minWaterDistance <= 2 ? 0.78 : minWaterDistance <= 3 ? 0.52 : minWaterDistance <= 4 ? 0.22 : 0;
  const farDryPenalty = minWaterDistance >= 8 ? 1 : minWaterDistance >= 6 ? 0.68 : minWaterDistance >= 5 ? 0.38 : 0;
  const moistureBalance = clamp(1 - Math.abs(moisture - 0.55) / 0.55, 0, 1);
  const floodPenalty = clamp((moisture - 0.82) / 0.28, 0, 1);

  const growthScore = clamp(
    biomass * 0.7 + moistureBalance * 0.42 + nearWaterBoost * 0.16 - farDryPenalty * 0.42 - floodPenalty * 0.36,
    0,
    1,
  );

  const hue = 0 + growthScore * 120;
  const saturation = clamp(84 - growthScore * 16, 55, 90);
  const lightness = clamp(46 - growthScore * 22, 22, 50);

  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

const marshEcologyColor = (hex: Hex, minWaterDistance: number) => {
  const biomass = clamp(hex.vegetation / 120, 0, 1);
  const moisture = clamp(hex.moisture / 13, 0, 1.35);
  const moistureBalance = clamp(1 - Math.abs(moisture - 0.55) / 0.55, 0, 1);
  const floodPenalty = clamp((moisture - 0.92) / 0.35, 0, 1);
  const ecologicalHealth = clamp(
    biomass * 0.68 + moistureBalance * 0.4 + (minWaterDistance <= 1 ? 0.08 : 0) - floodPenalty * 0.4,
    0,
    1,
  );

  if (floodPenalty > 0.55 && biomass < 0.45) {
    return waterDepthColor(hex.moisture);
  }

  const hue = 165 - ecologicalHealth * 52;
  const saturation = 48 + ecologicalHealth * 18;
  const lightness = 38 - ecologicalHealth * 14;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

const elevationColor = (elevation: number) => {
  const normalized = clamp(elevation / 10, 0, 1);
  const hue = 200 - normalized * 150;
  const saturation = 34 + normalized * 28;
  const lightness = 30 + normalized * 22;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

const biomassColor = (hex: Hex) => {
  const normalized = clamp(hex.vegetation / 120, 0, 1);
  const hue = 10 + normalized * 118;
  const saturation = 72 - normalized * 18;
  const lightness = 30 + normalized * 12;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

const moistureColor = (hex: Hex) => {
  const normalized = clamp(hex.moisture / 16, 0, 1);
  const hue = 34 + normalized * 186;
  const saturation = 78 - normalized * 12;
  const lightness = 38 + normalized * 10;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

const populationColor = (population: number) => {
  const normalized = clamp(population / 16, 0, 1);
  const hue = 218 - normalized * 26;
  const saturation = 45 + normalized * 34;
  const lightness = 22 + normalized * 18;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

const OVERLAY_META: Record<MapOverlayMode, { title: string; subtitle: string; swatches: { label: string; color: string }[] }> = {
  ecology: {
    title: "Ecology",
    subtitle: "Composite health from water balance, flood stress, and biomass.",
    swatches: [
      { label: "Dry stress", color: "hsl(8 78% 42%)" },
      { label: "Balanced growth", color: "hsl(118 58% 28%)" },
      { label: "Flooded basin", color: "hsl(214 80% 34%)" },
    ],
  },
  moisture: {
    title: "Moisture",
    subtitle: "Amber is dry, cyan-blue is saturated.",
    swatches: [
      { label: "Dry", color: "hsl(38 76% 40%)" },
      { label: "Balanced", color: "hsl(130 62% 42%)" },
      { label: "Wet", color: "hsl(210 84% 50%)" },
    ],
  },
  biomass: {
    title: "Biomass",
    subtitle: "Red is depleted ground, green is rich vegetation.",
    swatches: [
      { label: "Sparse", color: "hsl(10 72% 32%)" },
      { label: "Recovering", color: "hsl(65 68% 38%)" },
      { label: "Dense", color: "hsl(128 60% 42%)" },
    ],
  },
  elevation: {
    title: "Elevation",
    subtitle: "Blue lowlands to warm high ridges.",
    swatches: [
      { label: "Low", color: "hsl(198 42% 30%)" },
      { label: "Mid", color: "hsl(112 42% 42%)" },
      { label: "High", color: "hsl(42 58% 52%)" },
    ],
  },
  population: {
    title: "Population",
    subtitle: "Brighter tiles carry larger local populations.",
    swatches: [
      { label: "Empty", color: "hsl(220 28% 20%)" },
      { label: "Active", color: "hsl(214 58% 34%)" },
      { label: "Dense", color: "hsl(188 78% 54%)" },
    ],
  },
};

function MarkerGlyph({ type }: { type: "grazer" | "hunter" | "custom" }) {
  if (type === "grazer") {
    return (
      <g>
        <path d="M-4 1 C-4 -4, 1 -7, 5 -8 C4 -3, 1 1, -4 1 Z" fill="#86efac" opacity="0.95" />
        <path d="M-1 2 C-1 -2, 2 -5, 5 -6 C5 -2, 3 1, -1 2 Z" fill="#14532d" opacity="0.8" />
      </g>
    );
  }

  if (type === "hunter") {
    return (
      <g>
        <path d="M-5 -5 L0 6 L5 -5 Z" fill="#fdba74" opacity="0.95" />
        <path d="M-1 -6 L2 1 L5 -6" fill="none" stroke="#7c2d12" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    );
  }

  return (
    <polygon
      points="0,-6 2.2,-2.2 6,0 2.2,2.2 0,6 -2.2,2.2 -6,0 -2.2,-2.2"
      fill="#fde68a"
      stroke="#a16207"
      strokeWidth="0.9"
    />
  );
}

function WeatherOverlay({ weather, season, mapWidth, mapHeight }: { weather?: WeatherType; season?: Season; mapWidth: number; mapHeight: number }) {
  if (!weather || weather === "clear") return null;

  if (weather === "rain" || weather === "storm") {
    return (
      <g className="pointer-events-none" opacity={weather === "storm" ? 0.42 : 0.28}>
        {Array.from({ length: 30 }).map((_, index) => {
          const x = ((index + 1) / 31) * mapWidth;
          const y = (index % 5) * 24 - 50;
          return (
            <line
              key={`rain-${index}`}
              x1={x}
              y1={y}
              x2={x - 24}
              y2={y + 48}
              stroke={weather === "storm" ? "rgba(196,181,253,0.75)" : "rgba(125,211,252,0.82)"}
              strokeWidth={weather === "storm" ? 1.5 : 1.1}
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values={`0 0; -18 ${mapHeight / 3}; 0 ${mapHeight + 40}`}
                dur={weather === "storm" ? "1.7s" : "2.6s"}
                repeatCount="indefinite"
              />
            </line>
          );
        })}
        {weather === "storm" && (
          <rect x="-40" y="-40" width={mapWidth + 80} height={mapHeight + 80} fill="rgba(76,29,149,0.08)">
            <animate attributeName="opacity" values="0.18;0.05;0.2;0.08" dur="1.8s" repeatCount="indefinite" />
          </rect>
        )}
      </g>
    );
  }

  if (weather === "drought" || weather === "heatwave") {
    return (
      <g className="pointer-events-none">
        {Array.from({ length: 8 }).map((_, index) => (
          <ellipse
            key={`heat-${index}`}
            cx={(index + 0.5) * (mapWidth / 8)}
            cy={mapHeight * (0.18 + (index % 3) * 0.2)}
            rx="56"
            ry="14"
            fill={weather === "heatwave" ? "rgba(251,146,60,0.14)" : "rgba(250,204,21,0.11)"}
          >
            <animate attributeName="opacity" values="0.05;0.18;0.08" dur={`${2 + index * 0.25}s`} repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate" values="0 0; 18 6; -12 10; 0 0" dur={`${5 + index * 0.35}s`} repeatCount="indefinite" />
          </ellipse>
        ))}
      </g>
    );
  }

  return (
    <g className="pointer-events-none" opacity={season === "winter" ? 0.46 : 0.28}>
      {Array.from({ length: 24 }).map((_, index) => (
        <circle
          key={`snow-${index}`}
          cx={((index + 1) / 25) * mapWidth}
          cy={(index % 6) * 20 - 20}
          r={1.8 + (index % 3) * 0.55}
          fill="rgba(226,232,240,0.85)"
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`0 0; ${index % 2 === 0 ? -12 : 12} ${mapHeight + 28}`}
            dur={`${4 + index * 0.2}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </g>
  );
}

export function HexMap({ hexes, species, selectedHexId, overlayMode = "ecology", weather, season, onSelectHex }: HexMapProps) {
  const points = polygonPoints();
  const waterHexes = hexes.filter((hex) => hex.type === "water" || hex.type === "marsh");
  const speciesById = new Map(species.map((item) => [item.id, item]));
  const mapWidth = (Math.max(...hexes.map((hex) => hex.q), 0) + 1) * HEX_WIDTH + HEX_WIDTH;
  const mapHeight = (Math.max(...hexes.map((hex) => hex.r), 0) + 1) * HEX_SIZE * 1.5 + HEX_HEIGHT;
  const overlayMeta = OVERLAY_META[overlayMode];
  const totalPopulation = hexes.reduce((sum, hex) => sum + hex.inhabitants.length, 0);
  const inhabitedHexes = hexes.filter((hex) => hex.inhabitants.length > 0).length;
  const waterCoverage = hexes.length === 0 ? 0 : waterHexes.length / hexes.length;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/90">
      <div className="pointer-events-none absolute right-3 top-3 z-10 w-[17rem] rounded-2xl border border-slate-700/70 bg-slate-900/82 px-3 py-3 text-[10px] text-slate-300 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="uppercase tracking-[0.22em] text-cyan-200/80">Map Overlay</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{overlayMeta.title}</p>
            <p className="mt-1 leading-relaxed text-slate-400">{overlayMeta.subtitle}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1 text-right">
            <p className="uppercase tracking-[0.18em] text-slate-500">Active</p>
            <p className="mt-1 text-xs font-semibold text-slate-100">{overlayMode}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {overlayMeta.swatches.map((swatch) => (
            <div key={swatch.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
              <div className="h-2 rounded-full" style={{ background: swatch.color }} />
              <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-500">{swatch.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 w-[20rem] rounded-2xl border border-slate-700/70 bg-slate-900/82 px-3 py-3 text-[10px] text-slate-300 shadow-2xl backdrop-blur-xl">
        <p className="uppercase tracking-[0.2em] text-emerald-200/80">World Scan</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">
            <p className="uppercase tracking-[0.16em] text-slate-500">Population</p>
            <p className="mt-1 font-semibold text-slate-100">{totalPopulation}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">
            <p className="uppercase tracking-[0.16em] text-slate-500">Active Hexes</p>
            <p className="mt-1 font-semibold text-slate-100">{inhabitedHexes}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">
            <p className="uppercase tracking-[0.16em] text-slate-500">Water</p>
            <p className="mt-1 font-semibold text-slate-100">{(waterCoverage * 100).toFixed(0)}%</p>
          </div>
        </div>
        <p className="mt-2 leading-relaxed text-slate-400">
          Hex center reads resource strength. Badges show grazers, hunters, and custom species. Click any tile for a full ecological dossier.
        </p>
      </div>
      <TransformWrapper
        minScale={0.5}
        maxScale={3}
        initialScale={0.8}
        smooth
        disablePadding
        wheel={{
          step: 0.08,
          smoothStep: 0.008,
          wheelDisabled: false,
          touchPadDisabled: false,
        }}
        pinch={{ step: 3 }}
        doubleClick={{ disabled: true }}
        zoomAnimation={{ animationTime: 220, animationType: "easeOut" }}
        alignmentAnimation={{ animationTime: 180, velocityAlignmentTime: 180 }}
        velocityAnimation={{ animationTime: 220, sensitivity: 0.8, equalToMove: true }}
      >
        <TransformComponent
          wrapperClass="!w-full !h-full"
          contentClass="!w-full !h-full"
        >
          <svg
            width={mapWidth}
            height={mapHeight}
            viewBox={`-60 -60 ${mapWidth + 120} ${mapHeight + 120}`}
            className="h-full w-full"
          >
            <defs>
              <radialGradient id="bgGlow" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#0f172a" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
              </radialGradient>
              <radialGradient id="selectionPulse" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect x="-100" y="-100" width={mapWidth + 200} height={mapHeight + 200} fill="url(#bgGlow)" />
            <WeatherOverlay weather={weather} season={season} mapWidth={mapWidth} mapHeight={mapHeight} />
            {hexes.map((hex) => {
              const { x, y } = toPixel(hex.q, hex.r);
              const isSelected = selectedHexId === hex.id;
              let grazerCount = 0;
              let hunterCount = 0;
              let customCount = 0;
              for (const animal of hex.inhabitants) {
                const resident = speciesById.get(animal.speciesId);
                if (!resident) continue;
                if (resident.diet === "herbivore") {
                  grazerCount += 1;
                } else {
                  hunterCount += 1;
                }
                if (resident.id.startsWith("custom-")) customCount += 1;
              }
              const creatureMarkers = [
                grazerCount > 0
                  ? {
                      key: "grazer",
                      label: `G${grazerCount > 99 ? "99+" : grazerCount}`,
                      fill: "#14532d",
                      stroke: "#4ade80",
                      text: "#dcfce7",
                    }
                  : null,
                hunterCount > 0
                  ? {
                      key: "hunter",
                      label: `H${hunterCount > 99 ? "99+" : hunterCount}`,
                      fill: "#7c2d12",
                      stroke: "#fb923c",
                      text: "#ffedd5",
                    }
                  : null,
                customCount > 0
                  ? {
                      key: "custom",
                      label: `★${customCount > 99 ? "99+" : customCount}`,
                      fill: "#854d0e",
                      stroke: "#facc15",
                      text: "#fef9c3",
                    }
                  : null,
              ].filter((item): item is NonNullable<typeof item> => Boolean(item));
              const moistureOpacity = hex.type === "water" ? Math.min(0.14, hex.moisture / 120) : 0;
              const localPopulation = hex.inhabitants.length;
              const minWaterDistance =
                waterHexes.length === 0
                  ? 999
                  : waterHexes.reduce((best, waterHex) => Math.min(best, hexDistance(hex, waterHex)), Infinity);
              const ecologyColor =
                hex.type === "water"
                  ? waterDepthColor(hex.moisture)
                  : hex.type === "marsh"
                    ? marshEcologyColor(hex, minWaterDistance)
                    : landVegetationColor(hex, minWaterDistance);
              const fillColor =
                overlayMode === "moisture"
                  ? moistureColor(hex)
                  : overlayMode === "biomass"
                    ? biomassColor(hex)
                    : overlayMode === "elevation"
                      ? elevationColor(hex.elevation)
                      : overlayMode === "population"
                        ? populationColor(localPopulation)
                        : ecologyColor;
              const lushOpacity =
                hex.type === "water" || hex.type === "marsh"
                  ? 0
                  : minWaterDistance <= 2
                    ? 0.14
                    : minWaterDistance <= 3
                      ? 0.08
                      : 0;
              const aridOpacity =
                hex.type === "water" || hex.type === "marsh"
                  ? 0
                  : minWaterDistance >= 7
                    ? 0.18
                    : minWaterDistance >= 5
                      ? 0.1
                      : 0;

              return (
                <g key={hex.id} transform={`translate(${x}, ${y})`}>
                  {isSelected && <circle r={HEX_SIZE * 1.4} fill="url(#selectionPulse)" className="pointer-events-none" />}
                  <polygon
                    points={points}
                    fill={fillColor}
                    stroke={isSelected ? "#f8fafc" : "#0f172a"}
                    strokeWidth={isSelected ? 2.8 : 1.3}
                    opacity={0.92}
                    className="cursor-pointer transition-all hover:opacity-100"
                    onClick={() => onSelectHex(hex.id)}
                  />
                  {hex.inhabitants.length > 0 && (
                    <circle
                      cx={0}
                      cy={0}
                      r={HEX_SIZE * (0.52 + clamp(localPopulation / 18, 0, 0.36))}
                      fill="none"
                      stroke={isSelected ? "#f8fafc" : "rgba(241,245,249,0.22)"}
                      strokeWidth={isSelected ? 1.25 : 0.8}
                      className="pointer-events-none"
                    />
                  )}
                  {hex.type !== "water" && hex.vegetation > 62 && overlayMode !== "population" && (
                    <g className="pointer-events-none" opacity="0.24">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <circle
                          key={`${hex.id}-lush-${index}`}
                          cx={-8 + index * 7}
                          cy={7 - index * 4}
                          r={2 + index * 0.7}
                          fill="rgba(134,239,172,0.95)"
                        >
                          <animate attributeName="opacity" values="0.08;0.3;0.08" dur={`${2 + index * 0.45}s`} repeatCount="indefinite" />
                        </circle>
                      ))}
                    </g>
                  )}
                  {localPopulation > 0 && (
                    <g className="pointer-events-none" opacity="0.92">
                      {Array.from({ length: Math.min(localPopulation, 6) }).map((_, index) => {
                        const angle = (Math.PI * 2 * index) / Math.min(localPopulation, 6);
                        const radius = 4 + (index % 2) * 2.8;
                        const residentIndex = index % Math.max(1, hex.inhabitants.length);
                        const residentSpecies = speciesById.get(hex.inhabitants[residentIndex]?.speciesId ?? "");
                        const fill =
                          residentSpecies?.diet === "carnivore"
                            ? "rgba(251,146,60,0.92)"
                            : residentSpecies?.id.startsWith("custom-")
                              ? "rgba(250,204,21,0.92)"
                              : "rgba(74,222,128,0.92)";

                        return (
                          <circle
                            key={`${hex.id}-resident-${index}`}
                            cx={Math.cos(angle) * radius}
                            cy={Math.sin(angle) * radius}
                            r={1.8}
                            fill={fill}
                            stroke="rgba(2,6,23,0.95)"
                            strokeWidth="0.7"
                          />
                        );
                      })}
                    </g>
                  )}
                  <polygon
                    points={points}
                    fill="#38bdf8"
                    opacity={moistureOpacity}
                    className="pointer-events-none"
                  />
                  {lushOpacity > 0 && (
                    <polygon points={points} fill="#22c55e" opacity={lushOpacity} className="pointer-events-none" />
                  )}
                  {aridOpacity > 0 && (
                    <polygon points={points} fill="#f59e0b" opacity={aridOpacity} className="pointer-events-none" />
                  )}
                  <text
                    x={0}
                    y={3}
                    textAnchor="middle"
                    className="pointer-events-none select-none fill-slate-100 text-[8px] font-semibold"
                  >
                    {overlayMode === "moisture"
                      ? `${hex.moisture.toFixed(1)}`
                      : overlayMode === "elevation"
                        ? `E${hex.elevation}`
                        : overlayMode === "population"
                          ? `${localPopulation}`
                          : hex.type === "water" || hex.type === "marsh"
                            ? `W${hex.moisture.toFixed(1)}`
                            : hex.vegetation.toFixed(0)}
                  </text>
                  {(hex.type === "water" || hex.type === "marsh" || overlayMode !== "ecology") && (
                    <text
                      x={0}
                      y={11}
                      textAnchor="middle"
                      className="pointer-events-none select-none fill-cyan-100 text-[6px]"
                    >
                      {overlayMode === "moisture"
                        ? "H2O"
                        : overlayMode === "biomass"
                          ? "BIO"
                          : overlayMode === "elevation"
                            ? "ALT"
                            : overlayMode === "population"
                              ? "POP"
                              : "Lvl"}
                    </text>
                  )}
                  {creatureMarkers.length > 0 && (
                    <g
                      onClick={() => onSelectHex(hex.id)}
                      className="cursor-pointer"
                    >
                      {(() => {
                        const widths = creatureMarkers.map((marker) => 10 + marker.label.length * 4.1);
                        const gap = 2.5;
                        const totalWidth =
                          widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * gap;
                        let startX = -totalWidth / 2;

                        return creatureMarkers.map((marker, index) => {
                          const markerWidth = widths[index];
                          const markerCenterX = startX + markerWidth / 2;
                          startX += markerWidth + gap;

                          return (
                            <g key={marker.key} transform={`translate(${markerCenterX}, ${-14})`}>
                              <rect
                                x={-markerWidth / 2}
                                y={-6}
                                width={markerWidth}
                                height={12}
                                rx={5.8}
                                fill={marker.fill}
                                stroke={marker.stroke}
                                strokeWidth={0.85}
                              />
                              <g transform={`translate(${-markerWidth / 2 + 7}, 0)`}>
                                <MarkerGlyph type={marker.key as "grazer" | "hunter" | "custom"} />
                              </g>
                              <text
                                x={markerWidth > 18 ? 3 : 0}
                                y={2.1}
                                textAnchor="middle"
                                style={{ fill: marker.text, fontSize: "5.2px", fontWeight: 700, userSelect: "none" }}
                              >
                                {marker.label}
                              </text>
                            </g>
                          );
                        });
                      })()}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
