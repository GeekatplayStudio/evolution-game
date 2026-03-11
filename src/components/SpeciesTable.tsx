"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { SpeciesStats } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SpeciesTableProps {
  rows: SpeciesStats[];
  selectedSpeciesId: string | null;
  onSelect: (speciesId: string) => void;
}

const columns: ColumnDef<SpeciesStats>[] = [
  {
    id: "species",
    header: "Species",
    cell: ({ row }) => (
      <div>
        <p className="font-semibold text-slate-100">{row.original.speciesName}</p>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-slate-500">#{row.index + 1} ranked</p>
      </div>
    ),
  },
  {
    accessorKey: "diet",
    header: "Niche",
    cell: ({ row }) => (
      <span
        className={cn(
          "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
          row.original.diet === "herbivore"
            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
            : "border-rose-400/25 bg-rose-400/10 text-rose-100",
        )}
      >
        {row.original.diet}
      </span>
    ),
  },
  {
    accessorKey: "population",
    header: "Population",
    cell: ({ row }) => {
      const width = `${Math.max(8, Math.min(100, row.original.population * 4))}%`;
      return (
        <div className="min-w-[8rem]">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-100">{row.original.population}</span>
            <span className="text-slate-500">units</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-900/80">
            <div className="h-2 rounded-full bg-gradient-to-r from-cyan-300/80 to-sky-400/80" style={{ width }} />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "occupiedHexes",
    header: "Hexes",
    cell: ({ row }) => <span className="font-semibold text-slate-100">{row.original.occupiedHexes}</span>,
  },
  {
    accessorKey: "averageEnergy",
    header: "Avg Energy",
    cell: ({ row }) => {
      const width = `${Math.max(8, Math.min(100, row.original.averageEnergy))}%`;
      return (
        <div className="min-w-[7rem]">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-100">{row.original.averageEnergy.toFixed(1)}</span>
            <span className="text-slate-500">energy</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-900/80">
            <div className="h-2 rounded-full bg-gradient-to-r from-emerald-300/80 to-green-400/80" style={{ width }} />
          </div>
        </div>
      );
    },
  },
];

export function SpeciesTable({ rows, selectedSpeciesId, onSelect }: SpeciesTableProps) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/8 bg-slate-950/35">
      <table className="w-full text-sm">
        <thead className="text-left text-slate-300">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-2 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "cursor-pointer border-t border-white/8 text-slate-200 transition-colors hover:bg-white/[0.05]",
                row.original.speciesId === selectedSpeciesId && "bg-cyan-400/10 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18)]",
              )}
              onClick={() => onSelect(row.original.speciesId)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-2 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
