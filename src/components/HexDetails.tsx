"use client";

import { Hex } from "@/lib/types";

interface HexDetailsProps {
  hex: Hex | null;
}

export function HexDetails({ hex }: HexDetailsProps) {
  if (!hex) {
    return <p className="text-sm text-slate-400">Select a hex to inspect moisture, vegetation, and inhabitants.</p>;
  }

  return (
    <div className="space-y-2 text-sm text-slate-200">
      <div className="grid grid-cols-2 gap-2">
        <p>Type: {hex.type}</p>
        <p>Elevation: {hex.elevation}</p>
        <p>Moisture: {hex.moisture.toFixed(1)}</p>
        <p>Vegetation: {hex.vegetation.toFixed(1)}</p>
        <p>Carrion: {hex.carrion.toFixed(1)}</p>
        <p>Population: {hex.inhabitants.length}</p>
      </div>
      <div>
        <h4 className="mb-1 text-xs uppercase tracking-wide text-slate-400">Inhabitants</h4>
        <div className="max-h-28 overflow-y-auto rounded-md border border-slate-700 p-2 text-xs">
          {hex.inhabitants.length === 0 ? (
            <p className="text-slate-500">No animals here.</p>
          ) : (
            <ul className="space-y-1">
              {hex.inhabitants.map((animal) => (
                <li key={animal.id} className="text-slate-300">
                  {animal.speciesId} · E:{animal.energy.toFixed(0)} · Age:{animal.age}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
