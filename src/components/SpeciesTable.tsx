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
  { accessorKey: "speciesName", header: "Species" },
  { accessorKey: "diet", header: "Niche" },
  { accessorKey: "population", header: "Population" },
  { accessorKey: "occupiedHexes", header: "Hexes" },
  {
    accessorKey: "averageEnergy",
    header: "Avg Energy",
    cell: ({ row }) => row.original.averageEnergy.toFixed(1),
  },
];

export function SpeciesTable({ rows, selectedSpeciesId, onSelect }: SpeciesTableProps) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-slate-300">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-2 py-2 font-medium">
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
                "cursor-pointer border-t border-slate-800 text-slate-200 hover:bg-slate-800/60",
                row.original.speciesId === selectedSpeciesId && "bg-slate-800",
              )}
              onClick={() => onSelect(row.original.speciesId)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-2 py-2">
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
