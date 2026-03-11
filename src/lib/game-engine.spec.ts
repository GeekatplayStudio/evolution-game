import { describe, expect, it } from "vitest";
import { TURN_PER_YEAR } from "@/lib/game-constants";
import { createInitialGameState, runTurn } from "@/lib/game-engine";
import type { GameStateData } from "@/lib/game-engine";
import type { Hex } from "@/lib/types";

const makeHex = ({ id, q, r, ...overrides }: Partial<Hex> & Pick<Hex, "id" | "q" | "r">): Hex => ({
  id,
  q,
  r,
  type: "grass",
  elevation: 4,
  moisture: 3,
  vegetation: 24,
  saturationCapacity: 8,
  carrion: 0,
  grazingPressure: 0,
  inhabitants: [],
  ...overrides,
});

describe("game engine", () => {
  it("advances month, year, and season across a full year", () => {
    let state = createInitialGameState({ includeBaseSpecies: false, seed: 20260311 });

    for (let index = 0; index < 3; index += 1) {
      state = runTurn(state);
    }

    expect(state.turn).toBe(3);
    expect(state.month).toBe(4);
    expect(state.year).toBe(1);
    expect(state.season).toBe("summer");

    for (let index = 3; index < TURN_PER_YEAR; index += 1) {
      state = runTurn(state);
    }

    expect(state.turn).toBe(TURN_PER_YEAR);
    expect(state.month).toBe(1);
    expect(state.year).toBe(2);
    expect(state.season).toBe("spring");
  });

  it("moves excess water into lower elevation neighbors during turn processing", () => {
    const seedState = createInitialGameState({ includeBaseSpecies: false, seed: 77 });
    const sourceHex = makeHex({ id: "0,0", q: 0, r: 0, elevation: 6, moisture: 20, saturationCapacity: 8 });
    const lowerNeighbor = makeHex({ id: "1,0", q: 1, r: 0, elevation: 1, moisture: 1, saturationCapacity: 8 });

    const customState: GameStateData = {
      ...seedState,
      hexes: [sourceHex, lowerNeighbor],
      species: [],
      selectedHexId: null,
      selectedSpeciesId: null,
      events: [],
    };

    const nextState = runTurn(customState);
    const nextSource = nextState.hexes.find((hex) => hex.id === sourceHex.id);
    const nextNeighbor = nextState.hexes.find((hex) => hex.id === lowerNeighbor.id);

    expect(nextSource).toBeDefined();
    expect(nextNeighbor).toBeDefined();
    expect(nextSource!.moisture).toBeLessThan(sourceHex.moisture);
    expect(nextSource!.moisture).toBeLessThan(sourceHex.moisture - 5);
    expect(nextNeighbor!.moisture).toBeGreaterThan(lowerNeighbor.moisture);
  });
});
