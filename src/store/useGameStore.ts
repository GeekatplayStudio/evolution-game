"use client";

import { create } from "zustand";
import {
  DEFAULT_MAP_SIZE,
  createInitialGameState,
  filterMutationsForSpecies,
  getSpeciesStats,
  mutateSpecies,
  runTurn,
} from "@/lib/game-engine";
import { ClimateZone, Hex, MutationOption, Season, Species, SpeciesStats, Trait, WeatherType } from "@/lib/types";

interface GameStore {
  turn: number;
  month: number;
  year: number;
  season: Season;
  weather: WeatherType;
  climateZone: ClimateZone;
  climateTuningLevel: number;
  climateMoistureIndex: number;
  droughtDebt: number;
  cycleWetBias: number;
  mapWidth: number;
  mapHeight: number;
  evolutionPoints: number;
  hexes: Hex[];
  species: Species[];
  selectedHexId: string | null;
  selectedSpeciesId: string | null;
  events: string[];
  speciesStats: SpeciesStats[];
  availableMutations: MutationOption[];
  nextTurn: () => void;
  selectHex: (hexId: string) => void;
  selectSpecies: (speciesId: string) => void;
  applyMutation: (mutationId: Trait) => void;
  setClimateZone: (zone: ClimateZone) => void;
  setClimateTuningLevel: (level: number) => void;
  regenerateMap: (width: number, height: number) => void;
  resetGame: () => void;
}

const initial = createInitialGameState();

export const useGameStore = create<GameStore>((set, get) => ({
  turn: initial.turn,
  month: initial.month,
  year: initial.year,
  season: initial.season,
  weather: initial.weather,
  climateZone: initial.climateZone,
  climateTuningLevel: initial.climateTuningLevel,
  climateMoistureIndex: initial.climateMoistureIndex,
  droughtDebt: initial.droughtDebt,
  cycleWetBias: initial.cycleWetBias,
  mapWidth: DEFAULT_MAP_SIZE.width,
  mapHeight: DEFAULT_MAP_SIZE.height,
  evolutionPoints: initial.evolutionPoints,
  hexes: initial.hexes,
  species: initial.species,
  selectedHexId: initial.selectedHexId,
  selectedSpeciesId: initial.selectedSpeciesId,
  events: initial.events,
  speciesStats: getSpeciesStats(initial.hexes, initial.species),
  availableMutations: filterMutationsForSpecies(
    initial.species.find((item) => item.id === initial.selectedSpeciesId)?.diet ?? "herbivore",
    initial.species.find((item) => item.id === initial.selectedSpeciesId)?.traits ?? [],
  ),
  nextTurn: () => {
    const state = get();
    const incoming = runTurn({
      turn: state.turn,
      month: state.month,
      year: state.year,
      season: state.season,
      weather: state.weather,
      climateZone: state.climateZone,
      climateTuningLevel: state.climateTuningLevel,
      climateMoistureIndex: state.climateMoistureIndex,
      droughtDebt: state.droughtDebt,
      cycleWetBias: state.cycleWetBias,
      evolutionPoints: state.evolutionPoints,
      hexes: state.hexes,
      species: state.species,
      selectedHexId: state.selectedHexId,
      selectedSpeciesId: state.selectedSpeciesId,
      events: state.events,
    });

    const stats = getSpeciesStats(incoming.hexes, incoming.species);
    const selectedSpecies = incoming.species.find((item) => item.id === incoming.selectedSpeciesId);

    set({
      turn: incoming.turn,
      month: incoming.month,
      year: incoming.year,
      season: incoming.season,
      weather: incoming.weather,
      climateZone: incoming.climateZone,
      climateTuningLevel: incoming.climateTuningLevel,
      climateMoistureIndex: incoming.climateMoistureIndex,
      droughtDebt: incoming.droughtDebt,
      cycleWetBias: incoming.cycleWetBias,
      evolutionPoints: incoming.evolutionPoints,
      hexes: incoming.hexes,
      species: incoming.species,
      events: incoming.events,
      speciesStats: stats,
      availableMutations: filterMutationsForSpecies(
        selectedSpecies?.diet ?? "herbivore",
        selectedSpecies?.traits ?? [],
      ),
    });
  },
  selectHex: (hexId: string) => set({ selectedHexId: hexId }),
  selectSpecies: (speciesId: string) => {
    const state = get();
    const target = state.species.find((item) => item.id === speciesId);
    if (!target) return;
    set({
      selectedSpeciesId: speciesId,
      availableMutations: filterMutationsForSpecies(target.diet, target.traits),
    });
  },
  applyMutation: (mutationId: Trait) => {
    const state = get();
    if (!state.selectedSpeciesId) return;
    const selectedSpecies = state.species.find((item) => item.id === state.selectedSpeciesId);
    if (!selectedSpecies) return;

    const mutation = state.availableMutations.find((item) => item.id === mutationId);
    if (!mutation || state.evolutionPoints < mutation.cost) return;

    const nextSpecies = mutateSpecies(state.species, selectedSpecies.id, mutationId);
    const mutated = nextSpecies.find((item) => item.id === selectedSpecies.id);

    set({
      evolutionPoints: state.evolutionPoints - mutation.cost,
      species: nextSpecies,
      availableMutations: filterMutationsForSpecies(mutated?.diet ?? "herbivore", mutated?.traits ?? []),
      events: [`${selectedSpecies.name} learned ${mutation.name}.`, ...state.events].slice(0, 12),
    });
  },
  setClimateZone: (zone: ClimateZone) => {
    set({ climateZone: zone });
  },
  setClimateTuningLevel: (level: number) => {
    const nextLevel = Math.max(1, Math.min(5, Math.round(level)));
    set({ climateTuningLevel: nextLevel });
  },
  regenerateMap: (width: number, height: number) => {
    const fresh = createInitialGameState({ width, height });
    set({
      turn: fresh.turn,
      month: fresh.month,
      year: fresh.year,
      season: fresh.season,
      weather: fresh.weather,
      climateZone: get().climateZone,
      climateTuningLevel: get().climateTuningLevel,
      climateMoistureIndex: fresh.climateMoistureIndex,
      droughtDebt: fresh.droughtDebt,
      cycleWetBias: fresh.cycleWetBias,
      mapWidth: width,
      mapHeight: height,
      evolutionPoints: fresh.evolutionPoints,
      hexes: fresh.hexes,
      species: fresh.species,
      selectedHexId: fresh.selectedHexId,
      selectedSpeciesId: fresh.selectedSpeciesId,
      events: fresh.events,
      speciesStats: getSpeciesStats(fresh.hexes, fresh.species),
      availableMutations: filterMutationsForSpecies(
        fresh.species.find((item) => item.id === fresh.selectedSpeciesId)?.diet ?? "herbivore",
        fresh.species.find((item) => item.id === fresh.selectedSpeciesId)?.traits ?? [],
      ),
    });
  },
  resetGame: () => {
    const state = get();
    const fresh = createInitialGameState({ width: state.mapWidth, height: state.mapHeight });
    set({
      turn: fresh.turn,
      month: fresh.month,
      year: fresh.year,
      season: fresh.season,
      weather: fresh.weather,
      climateZone: state.climateZone,
      climateTuningLevel: state.climateTuningLevel,
      climateMoistureIndex: fresh.climateMoistureIndex,
      droughtDebt: fresh.droughtDebt,
      cycleWetBias: fresh.cycleWetBias,
      mapWidth: state.mapWidth,
      mapHeight: state.mapHeight,
      evolutionPoints: fresh.evolutionPoints,
      hexes: fresh.hexes,
      species: fresh.species,
      selectedHexId: fresh.selectedHexId,
      selectedSpeciesId: fresh.selectedSpeciesId,
      events: fresh.events,
      speciesStats: getSpeciesStats(fresh.hexes, fresh.species),
      availableMutations: filterMutationsForSpecies(
        fresh.species.find((item) => item.id === fresh.selectedSpeciesId)?.diet ?? "herbivore",
        fresh.species.find((item) => item.id === fresh.selectedSpeciesId)?.traits ?? [],
      ),
    });
  },
}));
