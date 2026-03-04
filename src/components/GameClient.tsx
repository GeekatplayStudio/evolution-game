"use client";

import { useEffect, useMemo, useState } from "react";
import { HexDetails } from "@/components/HexDetails";
import { HexMap } from "@/components/HexMap";
import { MutationLab } from "@/components/MutationLab";
import { SpeciesTable } from "@/components/SpeciesTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameStore } from "@/store/useGameStore";

export function GameClient() {
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [turnsPerSecond, setTurnsPerSecond] = useState(2);

  const {
    turn,
    month,
    year,
    season,
    weather,
    climateZone,
    climateTuningLevel,
    climateMoistureIndex,
    droughtDebt,
    cycleWetBias,
    mapWidth,
    mapHeight,
    evolutionPoints,
    hexes,
    selectedHexId,
    selectedSpeciesId,
    speciesStats,
    availableMutations,
    events,
    nextTurn,
    regenerateMap,
    setClimateZone,
    setClimateTuningLevel,
    selectHex,
    selectSpecies,
    applyMutation,
    resetGame,
  } = useGameStore();

  const [pendingMapWidth, setPendingMapWidth] = useState(mapWidth);
  const [pendingMapHeight, setPendingMapHeight] = useState(mapHeight);

  useEffect(() => {
    setPendingMapWidth(mapWidth);
    setPendingMapHeight(mapHeight);
  }, [mapWidth, mapHeight]);

  useEffect(() => {
    if (!isAutoAdvancing) return;

    const intervalMs = Math.max(60, Math.floor(1000 / turnsPerSecond));
    const timer = window.setInterval(() => {
      nextTurn();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [isAutoAdvancing, turnsPerSecond, nextTurn]);

  const selectedHex = useMemo(
    () => hexes.find((hex) => hex.id === selectedHexId) ?? null,
    [hexes, selectedHexId],
  );

  const moistureSeasonLabel =
    season === "spring" ? "Rain Season" : season === "summer" ? "Dry Season" : season === "fall" ? "Mixed Season" : "Cold Dry Season";

  return (
    <main className="min-h-screen p-4 text-slate-100 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-900/65 p-4 backdrop-blur-sm">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 bg-clip-text text-2xl font-semibold text-transparent">
            Evolution Sandbox
          </h1>
          <p className="text-sm text-slate-300">
            Turn {turn} · Month {month} · Year {year} · {season.toUpperCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-violet-700/60 bg-violet-950/35 px-3 py-1 text-sm text-violet-100">
            Weather: {weather.replace("_", " ").toUpperCase()}
          </div>
          <div className="rounded-lg border border-blue-700/60 bg-blue-950/30 px-3 py-1 text-sm text-blue-100">
            {moistureSeasonLabel}
          </div>
          <div className="rounded-lg border border-teal-700/60 bg-teal-950/30 px-3 py-1 text-sm text-teal-100">
            Moisture {(climateMoistureIndex * 100).toFixed(0)}% · Debt {droughtDebt.toFixed(2)} · Bias {cycleWetBias.toFixed(2)}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-indigo-700/60 bg-indigo-950/30 px-3 py-1">
            <label htmlFor="zone-select" className="text-xs text-slate-300">
              Zone
            </label>
            <select
              id="zone-select"
              value={climateZone}
              onChange={(event) => setClimateZone(event.target.value as "rain" | "normal" | "dry")}
              className="h-8 rounded border border-slate-600 bg-slate-900 px-2 text-xs text-slate-100"
            >
              <option value="rain">Rain</option>
              <option value="normal">Normal</option>
              <option value="dry">Dry</option>
            </select>
            <label htmlFor="zone-level" className="text-xs text-slate-300">
              Level
            </label>
            <input
              id="zone-level"
              type="range"
              min={1}
              max={5}
              step={1}
              value={climateTuningLevel}
              onChange={(event) => setClimateTuningLevel(Number(event.target.value))}
              className="h-2 w-20 cursor-pointer accent-indigo-400"
            />
            <span className="w-6 text-right text-xs text-slate-100">{climateTuningLevel}</span>
          </div>
          <div className="rounded-lg border border-cyan-700/60 bg-cyan-950/35 px-3 py-1 text-sm">
            Evolution Points: {evolutionPoints}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-sky-700/60 bg-sky-950/30 px-3 py-1">
            <span className="text-xs text-slate-300">Map</span>
            <input
              type="number"
              min={8}
              max={96}
              value={pendingMapWidth}
              onChange={(event) => setPendingMapWidth(Number(event.target.value))}
              className="h-8 w-16 rounded border border-slate-600 bg-slate-900 px-2 text-xs"
            />
            <span className="text-xs text-slate-400">×</span>
            <input
              type="number"
              min={8}
              max={96}
              value={pendingMapHeight}
              onChange={(event) => setPendingMapHeight(Number(event.target.value))}
              className="h-8 w-16 rounded border border-slate-600 bg-slate-900 px-2 text-xs"
            />
            <Button
              variant="outline"
              className="h-8 px-3"
              onClick={() => {
                const nextWidth = Math.max(8, Math.min(96, pendingMapWidth || mapWidth));
                const nextHeight = Math.max(8, Math.min(96, pendingMapHeight || mapHeight));
                setIsAutoAdvancing(false);
                regenerateMap(nextWidth, nextHeight);
              }}
            >
              Apply Size
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-3 py-1">
            <Button
              variant={isAutoAdvancing ? "default" : "outline"}
              className="h-8 px-3"
              onClick={() => setIsAutoAdvancing((value) => !value)}
            >
              {isAutoAdvancing ? "Pause Auto" : "Auto Advance"}
            </Button>
            <div className="flex items-center gap-2">
              <label htmlFor="turn-speed" className="text-xs text-slate-300">
                Speed
              </label>
              <input
                id="turn-speed"
                type="range"
                min={1}
                max={12}
                step={1}
                value={turnsPerSecond}
                onChange={(event) => setTurnsPerSecond(Number(event.target.value))}
                className="h-2 w-28 cursor-pointer accent-cyan-400"
              />
              <span className="w-14 text-right text-xs text-slate-200">{turnsPerSecond} t/s</span>
            </div>
          </div>
          <Button onClick={nextTurn}>Next Turn</Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsAutoAdvancing(false);
              resetGame();
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[2.1fr_1fr]">
        <Card className="h-[64vh]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Hex Environment</CardTitle>
              <div className="text-xs text-slate-400">
                {mapWidth} × {mapHeight} · Scroll: zoom · Drag: pan · Click: inspect
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[calc(64vh-56px)] pb-4">
            <HexMap hexes={hexes} selectedHexId={selectedHexId} onSelectHex={selectHex} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Species Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <SpeciesTable rows={speciesStats} selectedSpeciesId={selectedSpeciesId} onSelect={selectSpecies} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mutation Lab</CardTitle>
            </CardHeader>
            <CardContent>
              <MutationLab points={evolutionPoints} options={availableMutations} onApply={applyMutation} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Selected Hex Details</CardTitle>
          </CardHeader>
          <CardContent>
            <HexDetails hex={selectedHex} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulation Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="max-h-44 space-y-1 overflow-y-auto text-sm text-slate-300">
              {events.map((event, index) => (
                <li key={`${event}-${index}`} className="border-b border-slate-800 pb-1">
                  {event}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
