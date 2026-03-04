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
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Evolution Points</p>
        <p className="mt-1 text-lg font-semibold text-slate-100">{points}</p>
      </div>
      {options.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs text-slate-500">
          No available mutations for the current species.
        </p>
      )}
      {options.map((option) => (
        <div key={option.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-100">{option.name}</h4>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
              Cost {option.cost}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{option.description}</p>
          <p className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-2 py-2 text-xs text-emerald-200">
            + {option.plus}
          </p>
          <p className="mt-2 rounded-xl border border-rose-400/20 bg-rose-400/8 px-2 py-2 text-xs text-rose-200">
            - {option.minus}
          </p>
          <Button
            className="mt-2 w-full"
            variant="outline"
            disabled={points < option.cost}
            onClick={() => onApply(option.id)}
          >
            {points < option.cost ? "Need More Points" : "Apply Mutation"}
          </Button>
        </div>
      ))}
    </div>
  );
}
