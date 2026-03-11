"use client";

import { AlertTriangle, Droplets, Leaf, PawPrint, ShieldAlert } from "lucide-react";
import { Hex } from "@/lib/types";

interface HexDetailsProps {
  hex: Hex | null;
  speciesNameById?: Record<string, string>;
}

export function HexDetails({ hex, speciesNameById = {} }: HexDetailsProps) {
  if (!hex) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-400">
        Select a hex on the map to inspect terrain, water, biomass, and local inhabitants.
      </div>
    );
  }

  const moistureRatio = Math.min(100, (hex.moisture / Math.max(1, hex.saturationCapacity + 6)) * 100);
  const biomassRatio = Math.min(100, (hex.vegetation / 120) * 100);
  const carrionRatio = Math.min(100, (hex.carrion / 40) * 100);
  const grazingRatio = Math.min(100, ((hex.grazingPressure ?? 0) / 20) * 100);
  const hydrationState =
    hex.moisture < 2.5 ? "Dry Stress" : hex.moisture > hex.saturationCapacity ? "Flood Pressure" : "Balanced";
  const biomassState = hex.vegetation < 18 ? "Collapsed" : hex.vegetation > 72 ? "Lush" : "Recovering";

  return (
    <div className="space-y-4 text-sm text-slate-200">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/8 px-3 py-3">
          <div className="flex items-center gap-2 text-cyan-200/80">
            <Droplets className="h-4 w-4" />
            <p className="text-[10px] uppercase tracking-[0.18em]">Hydration State</p>
          </div>
          <p className="mt-1 font-semibold text-cyan-50">{hydrationState}</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-3">
          <div className="flex items-center gap-2 text-emerald-200/80">
            <Leaf className="h-4 w-4" />
            <p className="text-[10px] uppercase tracking-[0.18em]">Biomass State</p>
          </div>
          <p className="mt-1 font-semibold text-emerald-50">{biomassState}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Type</p>
          <p className="mt-1 font-semibold capitalize">{hex.type}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Elevation</p>
          <p className="mt-1 font-semibold">{hex.elevation}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Moisture</p>
          <p className="mt-1 font-semibold">{hex.moisture.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Biomass</p>
          <p className="mt-1 font-semibold">{hex.vegetation.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Carrion</p>
          <p className="mt-1 font-semibold">{hex.carrion.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Grazing</p>
          <p className="mt-1 font-semibold">{(hex.grazingPressure ?? 0).toFixed(1)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Population</p>
          <p className="mt-1 font-semibold">{hex.inhabitants.length}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { label: "Moisture", value: moistureRatio, reading: hex.moisture.toFixed(1), tone: "from-cyan-300/80 to-sky-400/80" },
          { label: "Biomass", value: biomassRatio, reading: hex.vegetation.toFixed(1), tone: "from-emerald-300/80 to-green-400/80" },
          { label: "Carrion", value: carrionRatio, reading: hex.carrion.toFixed(1), tone: "from-rose-300/80 to-orange-400/80", icon: ShieldAlert },
          { label: "Grazing", value: grazingRatio, reading: (hex.grazingPressure ?? 0).toFixed(1), tone: "from-amber-300/80 to-yellow-400/80", icon: PawPrint },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                {metric.icon ? <metric.icon className="h-3.5 w-3.5" /> : metric.label === "Moisture" ? <Droplets className="h-3.5 w-3.5" /> : metric.label === "Biomass" ? <Leaf className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                <p className="uppercase tracking-[0.18em]">{metric.label}</p>
              </div>
              <p className="font-semibold text-slate-100">{metric.reading}</p>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-900/80">
              <div className={`h-2 rounded-full bg-gradient-to-r ${metric.tone}`} style={{ width: `${Math.max(6, metric.value)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div>
        <h4 className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">Species Mix</h4>
        <div className="mb-3 max-h-28 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs">
          {(() => {
            const bySpecies = new Map<
              string,
              { count: number; female: number; male: number; energyTotal: number; ageTotal: number }
            >();
            for (const animal of hex.inhabitants) {
              const current = bySpecies.get(animal.speciesId) ?? {
                count: 0,
                female: 0,
                male: 0,
                energyTotal: 0,
                ageTotal: 0,
              };
              current.count += 1;
              current.energyTotal += animal.energy;
              current.ageTotal += animal.age;
              if (animal.sex === "female") {
                current.female += 1;
              } else {
                current.male += 1;
              }
              bySpecies.set(animal.speciesId, current);
            }

            const rows = [...bySpecies.entries()].sort((a, b) => b[1].count - a[1].count);
            if (rows.length === 0) {
              return <p className="text-slate-500">No species currently present.</p>;
            }

            return (
              <ul className="space-y-1">
                {rows.map(([speciesId, summary]) => (
                  <li
                    key={speciesId}
                    className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-2 text-slate-300"
                  >
                    <p className="font-medium text-slate-100">{speciesNameById[speciesId] ?? speciesId}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {summary.count} total · F{summary.female}/M{summary.male} · E:
                      {(summary.energyTotal / summary.count).toFixed(0)} · Age:
                      {(summary.ageTotal / summary.count).toFixed(1)}
                    </p>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>

        <h4 className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">Inhabitants</h4>
        <div className="max-h-44 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs">
          {hex.inhabitants.length === 0 ? (
            <p className="text-slate-500">No animals here.</p>
          ) : (
            <ul className="space-y-1">
              {hex.inhabitants.map((animal) => (
                <li
                  key={animal.id}
                  className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-2 text-slate-300"
                >
                  {speciesNameById[animal.speciesId] ?? animal.speciesId} · {animal.sex === "female" ? "F" : "M"} · E:
                  {animal.energy.toFixed(0)} · Age:{animal.age}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
