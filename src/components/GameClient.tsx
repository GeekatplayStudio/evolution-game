"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CreatureDesigner } from "@/components/CreatureDesigner";
import { HexDetails } from "@/components/HexDetails";
import { HexMap } from "@/components/HexMap";
import { MutationLab } from "@/components/MutationLab";
import { SpeciesTable } from "@/components/SpeciesTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/useGameStore";

type DrawerMode = "systems" | "intel" | "evolution" | "events";

type SpeciesHexStatus = "core" | "spreading" | "stable" | "stressed";

interface SpeciesFootprintEntry {
  hexId: string;
  q: number;
  r: number;
  terrain: string;
  population: number;
  avgEnergy: number;
  hungryRatio: number;
  matureRatio: number;
  status: SpeciesHexStatus;
}

const AUTO_ADVANCE_PRESETS = [
  { intervalMs: 15 * 60 * 1000, label: "1 turn / 15m" },
  { intervalMs: 5 * 60 * 1000, label: "1 turn / 5m" },
  { intervalMs: 60 * 1000, label: "1 turn / 1m" },
  { intervalMs: 15 * 1000, label: "1 turn / 15s" },
  { intervalMs: 5 * 1000, label: "1 turn / 5s" },
  { intervalMs: 1000, label: "1 turn / 1s" },
  { intervalMs: 500, label: "2 turns / s" },
  { intervalMs: 250, label: "4 turns / s" },
  { intervalMs: 80, label: "12 turns / s" },
] as const;

const DRAWER_META: Record<DrawerMode, { label: string; eyebrow: string; title: string; description: string }> = {
  systems: {
    label: "World",
    eyebrow: "Simulation Controls",
    title: "Command Deck",
    description: "Climate, map generation, save state, and reset tools live here so the map stays clear.",
  },
  intel: {
    label: "Tile",
    eyebrow: "Map Intelligence",
    title: "Tile Intel",
    description: "Select a hex on the map to inspect its terrain, water, biomass, and local population.",
  },
  evolution: {
    label: "Evolution",
    eyebrow: "Species + Traits",
    title: "Evolution Bay",
    description: "Track population health and spend evolution points where they will change the ecosystem.",
  },
  events: {
    label: "Feed",
    eyebrow: "Recent Simulation Events",
    title: "Activity Feed",
    description: "Use the latest weather and colonization changes to understand why the map is shifting.",
  },
};

function HudMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "cyan" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
      : tone === "emerald"
        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
        : tone === "amber"
          ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
          : "border-white/10 bg-white/5 text-slate-100";

  return (
    <div className={cn("min-w-[6.4rem] rounded-xl border px-2.5 py-1.5", toneClass)}>
      <p className="text-[9px] uppercase tracking-[0.16em] text-slate-300/80">{label}</p>
      <p className="mt-0.5 text-xs font-semibold tracking-wide sm:text-sm">{value}</p>
    </div>
  );
}

function DrawerToggle({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "pointer-events-auto rounded-2xl border px-3 py-2 text-left shadow-lg transition-all",
        "backdrop-blur-xl sm:min-w-[8rem]",
        isActive
          ? "border-cyan-300/50 bg-cyan-300/18 text-cyan-50"
          : "border-white/10 bg-slate-950/65 text-slate-200 hover:border-cyan-300/30 hover:bg-slate-900/85",
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300/80">Panel</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
    </button>
  );
}

export function GameClient() {
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [autoAdvancePresetIndex, setAutoAdvancePresetIndex] = useState(6);
  const [activeDrawer, setActiveDrawer] = useState<DrawerMode | null>(null);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);

  const {
    turn,
    month,
    year,
    season,
    weather,
    climateZone,
    climateTuningLevel,
    aiPopulationMode,
    climateMoistureIndex,
    droughtDebt,
    cycleWetBias,
    mapWidth,
    mapHeight,
    randomSeed,
    snapshotSavedAt,
    evolutionPoints,
    deploymentBatch,
    hexes,
    species,
    selectedHexId,
    selectedSpeciesId,
    speciesStats,
    availableMutations,
    events,
    nextTurn,
    addDesignedSpecies,
    saveCreatureDesign,
    removeCreatureDesign,
    clearCreatureBatch,
    deployCreatureBatch,
    regenerateMap,
    resetEvolution,
    setClimateZone,
    setClimateTuningLevel,
    setAiPopulationMode,
    generateAiPopulation,
    selectHex,
    selectSpecies,
    applyMutation,
    resetGame,
    saveSnapshot,
    loadSnapshot,
  } = useGameStore();

  const pendingMapWidthRef = useRef<HTMLInputElement>(null);
  const pendingMapHeightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAutoAdvancing) return;

    const intervalMs = AUTO_ADVANCE_PRESETS[autoAdvancePresetIndex].intervalMs;
    const timer = window.setInterval(() => {
      nextTurn();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [isAutoAdvancing, autoAdvancePresetIndex, nextTurn]);

  const selectedHex = useMemo(
    () => hexes.find((hex) => hex.id === selectedHexId) ?? null,
    [hexes, selectedHexId],
  );
  const selectedSpeciesName = useMemo(
    () => speciesStats.find((item) => item.speciesId === selectedSpeciesId)?.speciesName ?? "No Species Selected",
    [selectedSpeciesId, speciesStats],
  );
  const selectedSpecies = useMemo(
    () => species.find((item) => item.id === selectedSpeciesId) ?? null,
    [selectedSpeciesId, species],
  );
  const speciesNameById = useMemo(
    () => Object.fromEntries(species.map((item) => [item.id, item.name])),
    [species],
  );
  const selectedSpeciesFootprint = useMemo<SpeciesFootprintEntry[]>(() => {
    if (!selectedSpecies) return [];

    const entries: SpeciesFootprintEntry[] = [];
    for (const hex of hexes) {
      const residents = hex.inhabitants.filter((animal) => animal.speciesId === selectedSpecies.id);
      if (residents.length === 0) continue;

      const population = residents.length;
      const totalEnergy = residents.reduce((sum, animal) => sum + animal.energy, 0);
      const hungryCount = residents.filter((animal) => animal.isHungry).length;
      const matureCount = residents.filter((animal) => animal.age >= selectedSpecies.maturityAge).length;
      const avgEnergy = population === 0 ? 0 : totalEnergy / population;
      const hungryRatio = population === 0 ? 0 : hungryCount / population;
      const matureRatio = population === 0 ? 0 : matureCount / population;

      let status: SpeciesHexStatus = "stable";
      if (avgEnergy < 34 || hungryRatio > 0.62) {
        status = "stressed";
      } else if (population <= 2 && avgEnergy >= 48 && matureRatio >= 0.45) {
        status = "spreading";
      } else if (population >= 4 && avgEnergy >= 44) {
        status = "core";
      }

      entries.push({
        hexId: hex.id,
        q: hex.q,
        r: hex.r,
        terrain: hex.type,
        population,
        avgEnergy,
        hungryRatio,
        matureRatio,
        status,
      });
    }

    return entries.sort((a, b) => {
      if (b.population !== a.population) return b.population - a.population;
      return b.avgEnergy - a.avgEnergy;
    });
  }, [hexes, selectedSpecies]);
  const footprintSummary = useMemo(() => {
    if (!selectedSpecies || selectedSpeciesFootprint.length === 0) {
      return {
        spreadState: "No Presence",
        coreHexes: 0,
        frontierHexes: 0,
        averageEnergy: 0,
      };
    }

    const coreHexes = selectedSpeciesFootprint.filter((hex) => hex.status === "core").length;
    const frontierHexes = selectedSpeciesFootprint.filter((hex) => hex.status === "spreading").length;
    const averageEnergy =
      selectedSpeciesFootprint.reduce((sum, hex) => sum + hex.avgEnergy * hex.population, 0) /
      selectedSpeciesFootprint.reduce((sum, hex) => sum + hex.population, 0);
    const stressedRatio =
      selectedSpeciesFootprint.filter((hex) => hex.status === "stressed").length / selectedSpeciesFootprint.length;

    let spreadState = "Stable";
    if (stressedRatio > 0.45 || averageEnergy < 35) {
      spreadState = "Declining";
    } else if (frontierHexes > coreHexes && averageEnergy > 46) {
      spreadState = "Spreading";
    } else if (coreHexes >= frontierHexes && averageEnergy > 42) {
      spreadState = "Anchored";
    } else {
      spreadState = "Contested";
    }

    return {
      spreadState,
      coreHexes,
      frontierHexes,
      averageEnergy,
    };
  }, [selectedSpecies, selectedSpeciesFootprint]);

  const moistureSeasonLabel =
    season === "spring" ? "Rain Season" : season === "summer" ? "Dry Season" : season === "fall" ? "Mixed Season" : "Cold Dry Season";
  const snapshotStatus = snapshotSavedAt
    ? `Saved ${new Date(snapshotSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "No Snapshot";
  const climateLabel = `${climateZone.toUpperCase()} L${climateTuningLevel}`;
  const autoAdvanceLabel = AUTO_ADVANCE_PRESETS[autoAdvancePresetIndex].label;
  const selectedTileLabel = selectedHex ? `Q${selectedHex.q} R${selectedHex.r}` : "Tap A Tile";
  const drawerMeta = activeDrawer ? DRAWER_META[activeDrawer] : null;
  const batchPairsTotal = useMemo(
    () => deploymentBatch.reduce((sum, item) => sum + item.seedPairs, 0),
    [deploymentBatch],
  );
  const totalPopulation = useMemo(
    () => speciesStats.reduce((sum, item) => sum + item.population, 0),
    [speciesStats],
  );
  const topPopulationRows = useMemo(
    () =>
      [...speciesStats]
        .filter((row) => row.population > 0)
        .sort((a, b) => b.population - a.population)
        .slice(0, 4),
    [speciesStats],
  );
  const sidePopulationRows = useMemo(
    () =>
      [...speciesStats]
        .filter((row) => row.population > 0)
        .sort((a, b) => b.population - a.population)
        .slice(0, 8),
    [speciesStats],
  );

  const toggleDrawer = (mode: DrawerMode) => {
    setActiveDrawer((current) => (current === mode ? null : mode));
  };

  const handleSelectHex = (hexId: string) => {
    selectHex(hexId);
    setActiveDrawer("intel");
  };

  const handleSelectSpecies = (speciesId: string) => {
    selectSpecies(speciesId);
    setActiveDrawer("evolution");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03111a] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(24,160,251,0.18),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(16,185,129,0.14),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.08),transparent_28%),linear-gradient(180deg,#020617_0%,#05131d_48%,#03111a_100%)]" />

      <section className="relative h-screen p-3 sm:p-4">
        <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 shadow-[0_24px_90px_rgba(2,6,23,0.75)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(14,116,144,0.12),transparent_34%),linear-gradient(320deg,rgba(22,101,52,0.12),transparent_42%)]" />

          <div className="absolute inset-x-3 top-3 z-30 sm:inset-x-4 sm:top-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/76 px-3 py-2 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/12 px-2 py-0.5 text-[9px] uppercase tracking-[0.17em] text-cyan-100">
                  Evolution Sandbox
                </span>
                <Button
                  variant="outline"
                  className="h-8 border-cyan-300/30 px-3 text-xs text-cyan-100 hover:border-cyan-200/60 hover:bg-cyan-300/10"
                  onClick={() => {
                    setIsAutoAdvancing(false);
                    setActiveDrawer(null);
                    setIsDesignerOpen(true);
                  }}
                >
                  Creature Forge
                </Button>
                <Button className="h-8 px-3 text-xs" onClick={nextTurn}>
                  Next Turn
                </Button>
                <Button
                  variant={isAutoAdvancing ? "default" : "outline"}
                  className="h-8 px-3 text-xs"
                  onClick={() => setIsAutoAdvancing((value) => !value)}
                >
                  {isAutoAdvancing ? "Pause Auto" : "Auto"}
                </Button>
                <Button
                  variant="outline"
                  className="h-8 border-rose-400/30 px-3 text-xs text-rose-100 hover:border-rose-300/60 hover:bg-rose-400/10"
                  onClick={() => {
                    setIsAutoAdvancing(false);
                    resetGame();
                  }}
                >
                  Reset Run
                </Button>
                <div className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1">
                  <label htmlFor="turn-speed" className="text-[9px] uppercase tracking-[0.16em] text-slate-300">
                    Speed
                  </label>
                  <input
                    id="turn-speed"
                    type="range"
                    min={0}
                    max={AUTO_ADVANCE_PRESETS.length - 1}
                    step={1}
                    value={autoAdvancePresetIndex}
                    onChange={(event) => setAutoAdvancePresetIndex(Number(event.target.value))}
                    className="h-2 flex-1 cursor-pointer accent-cyan-400"
                  />
                  <span className="w-20 text-right text-[10px] font-semibold text-slate-100 sm:text-[11px]">
                    {autoAdvanceLabel}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <HudMetric label="Turn" value={`${turn} · M${month} · Y${year}`} tone="cyan" />
                <HudMetric label="Weather" value={weather.replace("_", " ").toUpperCase()} />
                <HudMetric label="Hydrology" value={`${(climateMoistureIndex * 100).toFixed(0)}% Moisture`} tone="emerald" />
                <HudMetric label="Population" value={`${totalPopulation} Creatures`} tone="emerald" />
                <HudMetric label="Evolution" value={`${evolutionPoints} Points`} tone="amber" />
                <HudMetric label="Focus" value={selectedTileLabel} />
              </div>
            </div>
          </div>

          <div className="absolute inset-0 px-3 pb-3 pt-[7.4rem] sm:px-4 sm:pb-4 sm:pt-[7.1rem] lg:pt-[6.9rem]">
            <div className="relative h-full overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-slate-950/65 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-200">
                  {mapWidth} x {mapHeight} World Grid
                </span>
                <span className="rounded-full border border-white/10 bg-slate-950/65 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                  Scroll To Zoom · Drag To Pan · Tap To Inspect
                </span>
              </div>
              <div className="pointer-events-none absolute left-4 top-14 z-20 min-w-[13rem] max-w-[17rem] rounded-2xl border border-white/10 bg-slate-950/72 px-3 py-2 text-xs shadow-xl">
                <p className="text-[9px] uppercase tracking-[0.15em] text-slate-400">Population Tracker</p>
                {topPopulationRows.length === 0 ? (
                  <p className="mt-1 text-slate-300">No active creatures seeded.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {topPopulationRows.map((row) => (
                      <li key={row.speciesId} className="flex items-center justify-between gap-2 text-slate-200">
                        <span className="truncate">{row.speciesName}</span>
                        <span className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold">
                          {row.population}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="pointer-events-none absolute bottom-4 left-4 z-20 max-w-[24rem] rounded-2xl border border-white/10 bg-slate-950/68 px-3 py-2 text-xs text-slate-300 shadow-xl">
                Balanced water grows life. Too little moisture pushes tiles red. Too much flooding pushes them toward blue and suppresses biomass.
              </div>
              <div className="h-full p-2 sm:p-3">
                <HexMap hexes={hexes} species={species} selectedHexId={selectedHexId} onSelectHex={handleSelectHex} />
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2">
            {(["systems", "intel", "evolution", "events"] as const).map((mode) => (
              <DrawerToggle
                key={mode}
                label={DRAWER_META[mode].label}
                isActive={activeDrawer === mode}
                onClick={() => toggleDrawer(mode)}
              />
            ))}
          </div>

          <div className="absolute bottom-4 left-4 z-40 w-[15.5rem] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/82 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.17em] text-slate-300">Population Side</p>
            </div>
            <div className="max-h-56 overflow-y-auto p-2">
              {sidePopulationRows.length === 0 ? (
                <p className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-2 text-xs text-slate-400">
                  No species active. Seed your creature or generate AI.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {sidePopulationRows.map((row) => (
                    <li key={row.speciesId}>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-xl border px-2 py-1.5 text-left transition-colors",
                          row.speciesId === selectedSpeciesId
                            ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100"
                            : "border-white/8 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]",
                        )}
                        onClick={() => handleSelectSpecies(row.speciesId)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold">{row.speciesName}</span>
                          <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px]">
                            {row.population}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <aside
            className={cn(
              "absolute z-50 transition-all duration-300 ease-out",
              "left-3 right-3 bottom-3 top-auto h-[70vh]",
              "sm:left-auto sm:right-4 sm:top-[6.4rem] sm:h-[calc(100%-7.8rem)] sm:w-[min(30rem,calc(100%-2rem))]",
              activeDrawer
                ? "pointer-events-auto translate-y-0 opacity-100 sm:translate-x-0"
                : "pointer-events-none translate-y-[105%] opacity-0 sm:translate-y-0 sm:translate-x-[105%]",
            )}
          >
            <div className="flex h-full flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/86 shadow-[0_20px_80px_rgba(2,6,23,0.78)] backdrop-blur-2xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">
                      {drawerMeta?.eyebrow ?? "Side Drawer"}
                    </p>
                    <h2 className="mt-2 font-['Avenir_Next','Segoe_UI',sans-serif] text-xl font-semibold tracking-tight text-white">
                      {drawerMeta?.title ?? "Drawer Closed"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                      {drawerMeta?.description ?? "Choose a drawer mode from the floating buttons to open the command panel."}
                    </p>
                  </div>
                  <Button variant="ghost" className="h-10 px-3" onClick={() => setActiveDrawer(null)}>
                    Close
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {activeDrawer === "systems" && (
                  <div className="space-y-4">
                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <CardTitle>Live World State</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 text-sm text-slate-200">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Season Window</p>
                          <p className="mt-1 font-semibold">{season.toUpperCase()} · {moistureSeasonLabel}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Climate Tuning</p>
                          <p className="mt-1 font-semibold">{climateLabel}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Drought Debt</p>
                          <p className="mt-1 font-semibold">{droughtDebt.toFixed(2)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Wet Bias</p>
                          <p className="mt-1 font-semibold">{cycleWetBias.toFixed(2)}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <CardTitle>Population Mode</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-1">
                          <button
                            type="button"
                            onClick={() => setAiPopulationMode("players_only")}
                            className={cn(
                              "rounded-xl px-2 py-2 text-xs font-semibold transition-all",
                              aiPopulationMode === "players_only"
                                ? "bg-cyan-300/18 text-cyan-100"
                                : "text-slate-300 hover:bg-white/[0.05]",
                            )}
                          >
                            Players Only
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiPopulationMode("mixed_ai")}
                            className={cn(
                              "rounded-xl px-2 py-2 text-xs font-semibold transition-all",
                              aiPopulationMode === "mixed_ai"
                                ? "bg-emerald-300/18 text-emerald-100"
                                : "text-slate-300 hover:bg-white/[0.05]",
                            )}
                          >
                            Mixed With AI
                          </button>
                        </div>
                        <Button
                          variant="outline"
                          className="h-10 w-full"
                          disabled={aiPopulationMode !== "mixed_ai"}
                          onClick={() => {
                            setIsAutoAdvancing(false);
                            generateAiPopulation();
                          }}
                        >
                          Generate AI Population
                        </Button>
                        <p className="text-xs text-slate-400">
                          Reset always clears all creatures. In Mixed mode, use Generate AI to repopulate non-player species.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <CardTitle>Climate Director</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <label htmlFor="zone-select" className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Zone Preset
                          </label>
                          <select
                            id="zone-select"
                            value={climateZone}
                            onChange={(event) => setClimateZone(event.target.value as "rain" | "normal" | "dry")}
                            className="h-11 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100"
                          >
                            <option value="rain">Rain</option>
                            <option value="normal">Normal</option>
                            <option value="dry">Dry</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                            <span>Intensity</span>
                            <span>{climateTuningLevel}</span>
                          </div>
                          <input
                            id="zone-level"
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={climateTuningLevel}
                            onChange={(event) => setClimateTuningLevel(Number(event.target.value))}
                            className="h-2 w-full cursor-pointer accent-cyan-400"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <CardTitle>World Regeneration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <input
                            key={`map-width-${mapWidth}-${mapHeight}`}
                            ref={pendingMapWidthRef}
                            type="number"
                            min={8}
                            max={96}
                            defaultValue={mapWidth}
                            className="h-11 rounded-2xl border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100"
                          />
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">x</span>
                          <input
                            key={`map-height-${mapWidth}-${mapHeight}`}
                            ref={pendingMapHeightRef}
                            type="number"
                            min={8}
                            max={96}
                            defaultValue={mapHeight}
                            className="h-11 rounded-2xl border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-100"
                          />
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Seed Lock</p>
                          <p className="mt-1 text-sm text-slate-200">{randomSeed}</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            variant="outline"
                            className="h-11"
                            onClick={() => {
                              const nextWidth = Math.max(8, Math.min(96, Number(pendingMapWidthRef.current?.value) || mapWidth));
                              const nextHeight = Math.max(8, Math.min(96, Number(pendingMapHeightRef.current?.value) || mapHeight));
                              setIsAutoAdvancing(false);
                              regenerateMap(nextWidth, nextHeight, randomSeed);
                            }}
                          >
                            Apply Same Seed
                          </Button>
                          <Button
                            variant="outline"
                            className="h-11"
                            onClick={() => {
                              setIsAutoAdvancing(false);
                              regenerateMap(mapWidth, mapHeight, Date.now());
                            }}
                          >
                            Roll New Seed
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <CardTitle>State Tools</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-200">
                          Auto Cycle Rate: {autoAdvanceLabel}
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-200">
                          Snapshot Status: {snapshotStatus}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button variant="outline" className="h-11" onClick={saveSnapshot}>
                            Save Snapshot
                          </Button>
                          <Button
                            variant="outline"
                            className="h-11"
                            disabled={!snapshotSavedAt}
                            onClick={() => {
                              setIsAutoAdvancing(false);
                              loadSnapshot();
                            }}
                          >
                            Load Snapshot
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          className="h-11 border-amber-400/35 text-amber-100 hover:border-amber-300/60 hover:bg-amber-400/10"
                          onClick={resetEvolution}
                        >
                          Clear All Creatures
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 border-rose-400/35 text-rose-100 hover:border-rose-300/60 hover:bg-rose-400/10"
                          onClick={() => {
                            setIsAutoAdvancing(false);
                            resetGame();
                          }}
                        >
                          Reset Full Run
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle>Creature Deployment Batch</CardTitle>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                            {deploymentBatch.length} saved
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-sm text-slate-200">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Designs</p>
                            <p className="mt-1 font-semibold">{deploymentBatch.length}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total Pairs</p>
                            <p className="mt-1 font-semibold">{batchPairsTotal}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total Units</p>
                            <p className="mt-1 font-semibold">{batchPairsTotal * 2}</p>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            className="h-10"
                            disabled={deploymentBatch.length === 0}
                            onClick={() => {
                              setIsAutoAdvancing(false);
                              deployCreatureBatch();
                            }}
                          >
                            Deploy Batch
                          </Button>
                          <Button
                            variant="outline"
                            className="h-10"
                            disabled={deploymentBatch.length === 0}
                            onClick={clearCreatureBatch}
                          >
                            Clear Batch
                          </Button>
                        </div>

                        {deploymentBatch.length === 0 ? (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-400">
                            No saved creatures yet. Open Creature Forge and use Save To Batch.
                          </div>
                        ) : (
                          <div className="max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] p-2">
                            <ul className="space-y-1.5">
                              {deploymentBatch.map((design) => (
                                <li
                                  key={design.id}
                                  className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-100">{design.name}</p>
                                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                                        {design.diet} · {design.seedPairs} pair{design.seedPairs === 1 ? "" : "s"} ({design.seedPairs * 2} units)
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      className="h-7 px-2 text-[11px] text-rose-200 hover:bg-rose-400/10 hover:text-rose-100"
                                      onClick={() => removeCreatureDesign(design.id)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeDrawer === "intel" && (
                  <div className="space-y-4">
                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <CardTitle>Selected Tile</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <HexDetails hex={selectedHex} speciesNameById={speciesNameById} />
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <CardTitle>Ecology Read Guide</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-slate-300">
                        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/8 px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200/75">Dry Stress</p>
                          <p className="mt-1">Low moisture and low biomass drive the tile toward red and can trigger desertification.</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/75">Prime Growth</p>
                          <p className="mt-1">Moderate water with strong vegetation trends toward dark green and supports stable grazing.</p>
                        </div>
                        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/8 px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/75">Flooded Ground</p>
                          <p className="mt-1">Heavy saturation pushes the tile blue. Water can recede into marsh first, then biomass takes over if the ground stays damp.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeDrawer === "evolution" && (
                  <div className="space-y-4">
                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle>Species Board</CardTitle>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                            Focus: {selectedSpeciesName}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <SpeciesTable rows={speciesStats} selectedSpeciesId={selectedSpeciesId} onSelect={handleSelectSpecies} />
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle>Population Footprint</CardTitle>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                            {footprintSummary.spreadState}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Core</p>
                            <p className="mt-1 font-semibold text-slate-100">{footprintSummary.coreHexes}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Frontier</p>
                            <p className="mt-1 font-semibold text-slate-100">{footprintSummary.frontierHexes}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Avg Energy</p>
                            <p className="mt-1 font-semibold text-slate-100">{footprintSummary.averageEnergy.toFixed(1)}</p>
                          </div>
                        </div>

                        {selectedSpeciesFootprint.length === 0 ? (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-400">
                            Select a species with active population to see occupied hexes and spread status.
                          </div>
                        ) : (
                          <div className="max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] p-2">
                            <ul className="space-y-1.5">
                              {selectedSpeciesFootprint.slice(0, 16).map((entry) => (
                                <li key={entry.hexId}>
                                  <button
                                    type="button"
                                    className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:bg-white/[0.07]"
                                    onClick={() => selectHex(entry.hexId)}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs font-semibold text-slate-100">
                                        Q{entry.q} R{entry.r} · {entry.terrain}
                                      </p>
                                      <span
                                        className={cn(
                                          "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]",
                                          entry.status === "core" &&
                                            "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
                                          entry.status === "spreading" &&
                                            "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
                                          entry.status === "stressed" &&
                                            "border-rose-400/30 bg-rose-400/10 text-rose-100",
                                          entry.status === "stable" &&
                                            "border-white/15 bg-white/[0.05] text-slate-200",
                                        )}
                                      >
                                        {entry.status}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-300">
                                      <span>Pop {entry.population}</span>
                                      <span>E {entry.avgEnergy.toFixed(0)}</span>
                                      <span>Hungry {(entry.hungryRatio * 100).toFixed(0)}%</span>
                                      <span>Mature {(entry.matureRatio * 100).toFixed(0)}%</span>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <CardTitle>Mutation Lab</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MutationLab points={evolutionPoints} options={availableMutations} onApply={applyMutation} />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeDrawer === "events" && (
                  <div className="space-y-4">
                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <CardTitle>Recent Events</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm text-slate-300">
                          {events.map((event, index) => (
                            <li
                              key={`${event}-${index}`}
                              className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3"
                            >
                              {event}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <CardTitle>How To Read The Feed</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-slate-300">
                        <p>Weather changes explain broad moisture shifts across the whole map.</p>
                        <p>Flood pulse messages usually predict blue expansion and temporary biomass suppression.</p>
                        <p>Colonization events tell you when the player species is actually converting map control into evolution points.</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {isDesignerOpen && (
            <CreatureDesigner
              onClose={() => setIsDesignerOpen(false)}
              onSaveCreature={(design) => {
                saveCreatureDesign(design);
              }}
              onSeedCreature={(design) => {
                addDesignedSpecies(design);
              }}
            />
          )}
        </div>
      </section>
    </main>
  );
}
