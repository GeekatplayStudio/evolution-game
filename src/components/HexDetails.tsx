"use client";

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

  return (
    <div className="space-y-4 text-sm text-slate-200">
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
