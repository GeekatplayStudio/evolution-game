import { beforeEach, describe, expect, it } from "vitest";
import { filterMutationsForSpecies, getSpeciesStats, createInitialGameState } from "@/lib/game-engine";
import { useGameStore } from "@/store/useGameStore";

const resetStore = () => {
  useGameStore.persist.clearStorage();
  localStorage.clear();

  const fresh = createInitialGameState({ includeBaseSpecies: true, seed: 20260311 });
  const selectedSpecies = fresh.species.find((species) => species.id === "player-herbivore");
  if (!selectedSpecies) {
    throw new Error("Expected player herbivore in base roster");
  }

  useGameStore.setState({
    turn: fresh.turn,
    month: fresh.month,
    year: fresh.year,
    randomSeed: fresh.randomSeed,
    rngState: fresh.rngState,
    season: fresh.season,
    weather: fresh.weather,
    climateZone: fresh.climateZone,
    climateTuningLevel: fresh.climateTuningLevel,
    climateMoistureIndex: fresh.climateMoistureIndex,
    droughtDebt: fresh.droughtDebt,
    cycleWetBias: fresh.cycleWetBias,
    mapWidth: 20,
    mapHeight: 14,
    evolutionPoints: 5,
    hexes: fresh.hexes,
    species: fresh.species,
    selectedHexId: null,
    selectedSpeciesId: selectedSpecies.id,
    events: [],
    snapshotSavedAt: null,
    deploymentBatch: [],
    aiPopulationMode: "players_only",
    speciesStats: getSpeciesStats(fresh.hexes, fresh.species),
    availableMutations: filterMutationsForSpecies(selectedSpecies.diet, selectedSpecies.traits),
  });
};

describe("useGameStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("applies a mutation, deducts points, and removes the option from availability", () => {
    const before = useGameStore.getState();
    expect(before.availableMutations.map((mutation) => mutation.id)).toContain("big_ears");

    before.applyMutation("big_ears");

    const after = useGameStore.getState();
    const playerSpecies = after.species.find((species) => species.id === "player-herbivore");

    expect(playerSpecies).toBeDefined();
    expect(playerSpecies!.traits).toContain("big_ears");
    expect(after.evolutionPoints).toBe(3);
    expect(after.availableMutations.map((mutation) => mutation.id)).not.toContain("big_ears");
    expect(after.events[0]).toContain("Player Grazer learned Big Ears.");
  });
});
