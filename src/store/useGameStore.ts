"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_MAP_SIZE,
  addDesignedSpeciesToState,
  createInitialGameState,
  filterMutationsForSpecies,
  generateAiPopulationInState,
  getSpeciesStats,
  mutateSpecies,
  normalizeHexCollection,
  normalizeSpeciesCollection,
  removeAiPopulationFromState,
  runTurn,
} from "@/lib/game-engine";
import {
  ClimateZone,
  CreatureDesignSubmission,
  Hex,
  MutationOption,
  SavedCreatureDesign,
  Season,
  Species,
  SpeciesStats,
  Trait,
  WeatherType,
} from "@/lib/types";

const PERSISTENCE_STORAGE_KEY = "evolution-game-store";
const SNAPSHOT_STORAGE_KEY = "evolution-game-snapshot";
type AiPopulationMode = "players_only" | "mixed_ai";

const createBatchDesignId = () =>
  `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface GameStoreBaseState {
  turn: number;
  month: number;
  year: number;
  randomSeed: number;
  rngState: number;
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
  snapshotSavedAt: number | null;
  deploymentBatch: SavedCreatureDesign[];
  aiPopulationMode: AiPopulationMode;
}

interface GameStoreComputedState {
  speciesStats: SpeciesStats[];
  availableMutations: MutationOption[];
}

interface GameStoreActions {
  nextTurn: () => void;
  addDesignedSpecies: (design: CreatureDesignSubmission) => void;
  saveCreatureDesign: (design: CreatureDesignSubmission) => void;
  removeCreatureDesign: (designId: string) => void;
  clearCreatureBatch: () => void;
  deployCreatureBatch: () => void;
  selectHex: (hexId: string) => void;
  selectSpecies: (speciesId: string) => void;
  applyMutation: (mutationId: Trait) => void;
  resetEvolution: () => void;
  setClimateZone: (zone: ClimateZone) => void;
  setClimateTuningLevel: (level: number) => void;
  setAiPopulationMode: (mode: AiPopulationMode) => void;
  generateAiPopulation: () => void;
  regenerateMap: (width: number, height: number, seed?: number) => void;
  resetGame: () => void;
  saveSnapshot: () => void;
  loadSnapshot: () => void;
}

type GameStore = GameStoreBaseState & GameStoreComputedState & GameStoreActions;

const initial = createInitialGameState({ includeBaseSpecies: false });

const getAvailableMutations = (species: Species[], selectedSpeciesId: string | null) => {
  if (!selectedSpeciesId) return [];
  const selectedSpecies = species.find((item) => item.id === selectedSpeciesId);
  if (!selectedSpecies) return [];
  return filterMutationsForSpecies(selectedSpecies?.diet ?? "herbivore", selectedSpecies?.traits ?? []);
};

const deriveComputedState = (state: Pick<GameStoreBaseState, "hexes" | "species" | "selectedSpeciesId">): GameStoreComputedState => ({
  speciesStats: getSpeciesStats(state.hexes, state.species),
  availableMutations: getAvailableMutations(state.species, state.selectedSpeciesId),
});

const createBaseState = (
  state: Parameters<typeof runTurn>[0],
  mapWidth: number,
  mapHeight: number,
  snapshotSavedAt: number | null,
  deploymentBatch: SavedCreatureDesign[],
  aiPopulationMode: AiPopulationMode,
): GameStoreBaseState => ({
  turn: state.turn,
  month: state.month,
  year: state.year,
  randomSeed: state.randomSeed,
  rngState: state.rngState,
  season: state.season,
  weather: state.weather,
  climateZone: state.climateZone,
  climateTuningLevel: state.climateTuningLevel,
  climateMoistureIndex: state.climateMoistureIndex,
  droughtDebt: state.droughtDebt,
  cycleWetBias: state.cycleWetBias,
  mapWidth,
  mapHeight,
  evolutionPoints: state.evolutionPoints,
  hexes: normalizeHexCollection(state.hexes),
  species: normalizeSpeciesCollection(state.species),
  selectedHexId: state.selectedHexId,
  selectedSpeciesId: state.selectedSpeciesId,
  events: state.events,
  snapshotSavedAt,
  deploymentBatch: [...deploymentBatch],
  aiPopulationMode,
});

const buildStoreState = (state: GameStoreBaseState): GameStoreBaseState & GameStoreComputedState => ({
  ...state,
  ...deriveComputedState(state),
});

const extractGameStateData = (state: GameStoreBaseState): Parameters<typeof runTurn>[0] => ({
  turn: state.turn,
  month: state.month,
  year: state.year,
  randomSeed: state.randomSeed,
  rngState: state.rngState,
  season: state.season,
  weather: state.weather,
  climateZone: state.climateZone,
  climateTuningLevel: state.climateTuningLevel,
  climateMoistureIndex: state.climateMoistureIndex,
  droughtDebt: state.droughtDebt,
  cycleWetBias: state.cycleWetBias,
  evolutionPoints: state.evolutionPoints,
  hexes: normalizeHexCollection(state.hexes),
  species: normalizeSpeciesCollection(state.species),
  selectedHexId: state.selectedHexId,
  selectedSpeciesId: state.selectedSpeciesId,
  events: state.events,
});

const toBaseState = (state: GameStore): GameStoreBaseState => ({
  turn: state.turn,
  month: state.month,
  year: state.year,
  randomSeed: state.randomSeed,
  rngState: state.rngState,
  season: state.season,
  weather: state.weather,
  climateZone: state.climateZone,
  climateTuningLevel: state.climateTuningLevel,
  climateMoistureIndex: state.climateMoistureIndex,
  droughtDebt: state.droughtDebt,
  cycleWetBias: state.cycleWetBias,
  mapWidth: state.mapWidth,
  mapHeight: state.mapHeight,
  evolutionPoints: state.evolutionPoints,
  hexes: normalizeHexCollection(state.hexes),
  species: normalizeSpeciesCollection(state.species),
  selectedHexId: state.selectedHexId,
  selectedSpeciesId: state.selectedSpeciesId,
  events: state.events,
  snapshotSavedAt: state.snapshotSavedAt,
  deploymentBatch: [...state.deploymentBatch],
  aiPopulationMode: state.aiPopulationMode,
});

const isStoredSnapshot = (value: unknown): value is GameStoreBaseState => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<GameStoreBaseState>;
  return (
    typeof candidate.turn === "number" &&
    typeof candidate.month === "number" &&
    typeof candidate.year === "number" &&
    typeof candidate.mapWidth === "number" &&
    typeof candidate.mapHeight === "number" &&
    typeof candidate.evolutionPoints === "number" &&
    Array.isArray(candidate.hexes) &&
    Array.isArray(candidate.species) &&
    Array.isArray(candidate.events)
  );
};

const initialState = buildStoreState(
  createBaseState(initial, DEFAULT_MAP_SIZE.width, DEFAULT_MAP_SIZE.height, null, [], "players_only"),
);

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      nextTurn: () => {
        const state = get();
        const incoming = runTurn(extractGameStateData(state));
        const nextState = createBaseState(
          incoming,
          state.mapWidth,
          state.mapHeight,
          state.snapshotSavedAt,
          state.deploymentBatch,
          state.aiPopulationMode,
        );

        set(buildStoreState(nextState));
      },
      addDesignedSpecies: (design: CreatureDesignSubmission) => {
        const state = get();
        const incoming = addDesignedSpeciesToState(extractGameStateData(state), design);
        const nextState = createBaseState(
          incoming,
          state.mapWidth,
          state.mapHeight,
          state.snapshotSavedAt,
          state.deploymentBatch,
          state.aiPopulationMode,
        );

        set(buildStoreState(nextState));
      },
      saveCreatureDesign: (design: CreatureDesignSubmission) => {
        const state = get();
        const normalizedDesign: SavedCreatureDesign = {
          ...design,
          parts: { ...design.parts },
          stats: { ...design.stats },
          name: design.name.trim() || "Custom Species",
          seedPairs: Math.max(1, Math.round(design.seedPairs)),
          id: createBatchDesignId(),
          createdAt: Date.now(),
        };

        set({
          deploymentBatch: [...state.deploymentBatch, normalizedDesign],
          events: [`Queued ${normalizedDesign.name} for batch deployment.`, ...state.events].slice(0, 12),
        });
      },
      removeCreatureDesign: (designId: string) => {
        const state = get();
        const target = state.deploymentBatch.find((item) => item.id === designId);
        if (!target) return;

        set({
          deploymentBatch: state.deploymentBatch.filter((item) => item.id !== designId),
          events: [`Removed ${target.name} from deployment batch.`, ...state.events].slice(0, 12),
        });
      },
      clearCreatureBatch: () => {
        const state = get();
        if (state.deploymentBatch.length === 0) return;

        set({
          deploymentBatch: [],
          events: [`Cleared deployment batch (${state.deploymentBatch.length} saved design${state.deploymentBatch.length === 1 ? "" : "s"}).`, ...state.events].slice(0, 12),
        });
      },
      deployCreatureBatch: () => {
        const state = get();
        if (state.deploymentBatch.length === 0) {
          set({
            events: ["Deployment batch is empty.", ...state.events].slice(0, 12),
          });
          return;
        }

        let incoming = extractGameStateData(state);
        for (const design of state.deploymentBatch) {
          incoming = addDesignedSpeciesToState(incoming, design);
        }

        const deployedCount = state.deploymentBatch.length;
        const withBatchEvent = {
          ...incoming,
          events: [`Batch deployed: ${deployedCount} saved species seeded.`, ...incoming.events].slice(0, 12),
        };
        const nextState = createBaseState(
          withBatchEvent,
          state.mapWidth,
          state.mapHeight,
          state.snapshotSavedAt,
          [],
          state.aiPopulationMode,
        );

        set(buildStoreState(nextState));
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

        const nextState = buildStoreState({
          ...toBaseState(state),
          evolutionPoints: state.evolutionPoints - mutation.cost,
          species: mutateSpecies(state.species, selectedSpecies.id, mutationId),
          events: [`${selectedSpecies.name} learned ${mutation.name}.`, ...state.events].slice(0, 12),
        });

        set(nextState);
      },
      resetEvolution: () => {
        const state = get();
        const clearedHexes = state.hexes.map((hex) => ({
          ...hex,
          inhabitants: [],
          carrion: 0,
          grazingPressure: 0,
        }));

        const nextState = buildStoreState({
          ...toBaseState(state),
          evolutionPoints: 0,
          species: [],
          hexes: clearedHexes,
          selectedSpeciesId: null,
          events: ["All creatures removed. Seed a species to restart evolution.", ...state.events].slice(0, 12),
        });

        set(nextState);
      },
      setClimateZone: (zone: ClimateZone) => {
        set({ climateZone: zone });
      },
      setClimateTuningLevel: (level: number) => {
        const nextLevel = Math.max(1, Math.min(5, Math.round(level)));
        set({ climateTuningLevel: nextLevel });
      },
      setAiPopulationMode: (mode: AiPopulationMode) => {
        const state = get();
        if (state.aiPopulationMode === mode) return;

        if (mode === "players_only") {
          const stripped = removeAiPopulationFromState(extractGameStateData(state));
          const nextState = createBaseState(
            stripped,
            state.mapWidth,
            state.mapHeight,
            state.snapshotSavedAt,
            state.deploymentBatch,
            mode,
          );
          set(buildStoreState(nextState));
          return;
        }

        set({
          aiPopulationMode: mode,
          events: ["AI mode enabled. Use Generate AI to seed non-player species.", ...state.events].slice(0, 12),
        });
      },
      generateAiPopulation: () => {
        const state = get();
        const incoming = generateAiPopulationInState(extractGameStateData(state));
        const nextState = createBaseState(
          incoming,
          state.mapWidth,
          state.mapHeight,
          state.snapshotSavedAt,
          state.deploymentBatch,
          state.aiPopulationMode,
        );
        set(buildStoreState(nextState));
      },
      regenerateMap: (width: number, height: number, seed?: number) => {
        const state = get();
        const fresh = createInitialGameState({
          width,
          height,
          seed: seed ?? state.randomSeed,
          includeBaseSpecies: false,
        });
        const withAi =
          state.aiPopulationMode === "mixed_ai" ? generateAiPopulationInState(fresh) : fresh;
        const nextState = createBaseState(
          {
            ...withAi,
            climateZone: state.climateZone,
            climateTuningLevel: state.climateTuningLevel,
          },
          width,
          height,
          state.snapshotSavedAt,
          state.deploymentBatch,
          state.aiPopulationMode,
        );

        set(buildStoreState(nextState));
      },
      resetGame: () => {
        const state = get();
        const fresh = createInitialGameState({
          width: state.mapWidth,
          height: state.mapHeight,
          seed: state.randomSeed,
          includeBaseSpecies: false,
        });
        const clearedHexes = fresh.hexes.map((hex) => ({
          ...hex,
          inhabitants: [],
          carrion: 0,
          grazingPressure: 0,
        }));
        const nextState = createBaseState(
          {
            ...fresh,
            hexes: clearedHexes,
            species: [],
            selectedSpeciesId: null,
            events: ["Run reset. No creatures active until you seed species.", ...state.events].slice(0, 12),
            climateZone: state.climateZone,
            climateTuningLevel: state.climateTuningLevel,
          },
          state.mapWidth,
          state.mapHeight,
          state.snapshotSavedAt,
          state.deploymentBatch,
          state.aiPopulationMode,
        );

        set(buildStoreState(nextState));
      },
      saveSnapshot: () => {
        if (typeof window === "undefined") return;

        const state = get();
        const snapshotSavedAt = Date.now();
        const snapshot = {
          ...toBaseState(state),
          snapshotSavedAt,
        };

        window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
        set({
          snapshotSavedAt,
          events: ["Manual snapshot saved.", ...state.events].slice(0, 12),
        });
      },
      loadSnapshot: () => {
        if (typeof window === "undefined") return;

        const state = get();
        const rawSnapshot = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
        if (!rawSnapshot) {
          set({
            events: ["No saved snapshot found.", ...state.events].slice(0, 12),
          });
          return;
        }

        try {
          const parsedSnapshot = JSON.parse(rawSnapshot) as unknown;
          if (!isStoredSnapshot(parsedSnapshot)) {
            throw new Error("Invalid snapshot");
          }

          const restoredState = buildStoreState({
            ...toBaseState(state),
            ...(parsedSnapshot as Partial<GameStoreBaseState>),
          });
          set({
            ...restoredState,
            events: ["Manual snapshot loaded.", ...restoredState.events].slice(0, 12),
          });
        } catch {
          set({
            events: ["Snapshot data was invalid.", ...state.events].slice(0, 12),
          });
        }
      },
    }),
    {
      name: PERSISTENCE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => toBaseState(state),
      merge: (persistedState, currentState) => {
        const mergedState = {
          ...currentState,
          ...(persistedState as Partial<GameStoreBaseState>),
        };

        return {
          ...mergedState,
          ...deriveComputedState(mergedState),
        };
      },
    },
  ),
);
