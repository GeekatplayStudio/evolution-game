"use client";

import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { HEX_COLORS } from "@/lib/game-constants";
import { Hex } from "@/lib/types";

interface HexMapProps {
  hexes: Hex[];
  selectedHexId: string | null;
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

const waterDepthColor = (moisture: number, isMarsh: boolean) => {
  const normalized = clamp(moisture / 16, 0, 1);

  if (isMarsh) {
    const lightness = 44 - normalized * 16;
    return `hsl(171 55% ${lightness}%)`;
  }

  const hue = 205 + normalized * 18;
  const saturation = 66 + normalized * 20;
  const lightness = 54 - normalized * 30;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

const landVegetationColor = (hex: Hex, minWaterDistance: number) => {
  const biomass = clamp(hex.vegetation / 120, 0, 1);
  const moisture = clamp(hex.moisture / 14, 0, 1);
  const nearWaterBoost =
    minWaterDistance <= 1 ? 1 : minWaterDistance <= 2 ? 0.78 : minWaterDistance <= 3 ? 0.52 : minWaterDistance <= 4 ? 0.22 : 0;
  const farDryPenalty = minWaterDistance >= 8 ? 1 : minWaterDistance >= 6 ? 0.68 : minWaterDistance >= 5 ? 0.38 : 0;

  const growthScore = clamp(biomass * 0.64 + moisture * 0.46 + nearWaterBoost * 0.34 - farDryPenalty * 0.5, 0, 1);

  const hue = 0 + growthScore * 120;
  const saturation = clamp(84 - growthScore * 16, 55, 90);
  const lightness = clamp(46 - growthScore * 22, 22, 50);

  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

export function HexMap({ hexes, selectedHexId, onSelectHex }: HexMapProps) {
  const points = polygonPoints();
  const waterHexes = hexes.filter((hex) => hex.type === "water" || hex.type === "marsh");
  const mapWidth = (Math.max(...hexes.map((hex) => hex.q), 0) + 1) * HEX_WIDTH + HEX_WIDTH;
  const mapHeight = (Math.max(...hexes.map((hex) => hex.r), 0) + 1) * HEX_SIZE * 1.5 + HEX_HEIGHT;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/90">
      <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-md border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300">
        Biomass values shown on each hex
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300">
        Land growth: Red (dying) → Yellow → Green → Dark Green (flourishing) · Water label: W + moisture · Water color: light to deep blue
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
            </defs>
            <rect x="-100" y="-100" width={mapWidth + 200} height={mapHeight + 200} fill="url(#bgGlow)" />
            {hexes.map((hex) => {
              const { x, y } = toPixel(hex.q, hex.r);
              const isSelected = selectedHexId === hex.id;
              const moistureOpacity = Math.min(0.45, hex.moisture / 25);
              const minWaterDistance =
                waterHexes.length === 0
                  ? 999
                  : waterHexes.reduce((best, waterHex) => Math.min(best, hexDistance(hex, waterHex)), Infinity);
              const fillColor =
                hex.type === "water" || hex.type === "marsh"
                  ? waterDepthColor(hex.moisture, hex.type === "marsh")
                  : landVegetationColor(hex, minWaterDistance);
              const lushOpacity =
                hex.type === "water" || hex.type === "marsh"
                  ? 0
                  : minWaterDistance <= 2
                    ? 0.24
                    : minWaterDistance <= 3
                      ? 0.14
                      : 0;
              const aridOpacity =
                hex.type === "water" || hex.type === "marsh"
                  ? 0
                  : minWaterDistance >= 7
                    ? 0.28
                    : minWaterDistance >= 5
                      ? 0.16
                      : 0;

              return (
                <g key={hex.id} transform={`translate(${x}, ${y})`}>
                  <polygon
                    points={points}
                    fill={fillColor}
                    stroke={isSelected ? "#f8fafc" : "#0f172a"}
                    strokeWidth={isSelected ? 2.8 : 1.3}
                    opacity={0.92}
                    className="cursor-pointer transition-all hover:opacity-100"
                    onClick={() => onSelectHex(hex.id)}
                  />
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
                    y={2}
                    textAnchor="middle"
                    className="pointer-events-none select-none fill-slate-100 text-[8px] font-semibold"
                  >
                    {hex.type === "water" || hex.type === "marsh"
                      ? `W${hex.moisture.toFixed(1)}`
                      : hex.vegetation.toFixed(0)}
                  </text>
                  {(hex.type === "water" || hex.type === "marsh") && (
                    <text
                      x={0}
                      y={11}
                      textAnchor="middle"
                      className="pointer-events-none select-none fill-cyan-100 text-[6px]"
                    >
                      Lvl
                    </text>
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
