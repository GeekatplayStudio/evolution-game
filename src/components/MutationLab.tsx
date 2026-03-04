"use client";

import { MutationOption } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface MutationLabProps {
  points: number;
  options: MutationOption[];
  onApply: (mutationId: MutationOption["id"]) => void;
}

export function MutationLab({ points, options, onApply }: MutationLabProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400">Evolution Points: {points}</div>
      {options.length === 0 && <p className="text-xs text-slate-500">No available mutations.</p>}
      {options.map((option) => (
        <div key={option.id} className="rounded-md border border-slate-700 p-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-100">{option.name}</h4>
            <span className="text-xs text-slate-400">Cost: {option.cost}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{option.description}</p>
          <p className="mt-1 text-xs text-emerald-400">{option.plus}</p>
          <p className="text-xs text-rose-400">{option.minus}</p>
          <Button
            className="mt-2 w-full"
            variant="outline"
            disabled={points < option.cost}
            onClick={() => onApply(option.id)}
          >
            Apply Mutation
          </Button>
        </div>
      ))}
    </div>
  );
}
