"use client";

import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Hex, Species } from "@/lib/types";

interface HexMapProps {
  hexes: Hex[];
  species: Species[];
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

export function HexMap({ hexes, species, selectedHexId, onSelectHex }: HexMapProps) {
  const points = polygonPoints();
  const waterHexes = hexes.filter((hex) => hex.type === "water" || hex.type === "marsh");
  const speciesById = new Map(species.map((item) => [item.id, item]));
  const mapWidth = (Math.max(...hexes.map((hex) => hex.q), 0) + 1) * HEX_WIDTH + HEX_WIDTH;
  const mapHeight = (Math.max(...hexes.map((hex) => hex.r), 0) + 1) * HEX_SIZE * 1.5 + HEX_HEIGHT;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/90">
      <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-md border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300">
        Hex center = biomass/water, badges = creatures (G grazers, H hunters, ★ custom)
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300">
        Ecological scale: Red = dry collapse · Dark Green = strong biomass with balanced water · Deep Blue = saturated water / flooded low biomass · click hex or badge for details
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
              const minWaterDistance =
                waterHexes.length === 0
                  ? 999
                  : waterHexes.reduce((best, waterHex) => Math.min(best, hexDistance(hex, waterHex)), Infinity);
              const fillColor =
                hex.type === "water"
                  ? waterDepthColor(hex.moisture)
                  : hex.type === "marsh"
                    ? marshEcologyColor(hex, minWaterDistance)
                    : landVegetationColor(hex, minWaterDistance);
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
                      r={HEX_SIZE * 0.72}
                      fill="none"
                      stroke={isSelected ? "#f8fafc" : "rgba(241,245,249,0.22)"}
                      strokeWidth={isSelected ? 1.25 : 0.8}
                      className="pointer-events-none"
                    />
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
                              <text
                                x={0}
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
