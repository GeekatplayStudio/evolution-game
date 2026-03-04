# Evolution Sandbox — Implementation Steps

## Phase 0 — Foundation (Done)
- Initialize Next.js (App Router) + TypeScript + Tailwind.
- Install dependencies: Zustand, TanStack Table, react-zoom-pan-pinch.
- Add base app shell and global styles.

## Phase 1 — Domain Modeling (Done)
- Define core types in `src/lib/types.ts`.
- Create constants for seasons, growth multipliers, terrain colors, mutation catalog.
- Ensure all logic modules import from shared domain types.

## Phase 2 — Simulation Engine (Done)
- Create `createInitialGameState()` for procedural world setup.
- Implement turn runner sequence in `runTurn()`:
  1) season/time update
  2) plant growth + evaporation
  3) water overflow to lower elevation
  4) animal behavior updates
  5) colonization scoring
  6) genetic drift chance
- Add helper functions (`getNeighborHexes`, `getSpeciesStats`, mutation filtering).

## Phase 3 — State Management (Done)
- Build Zustand store in `src/store/useGameStore.ts`.
- Add actions:
  - `nextTurn`
  - `selectHex`
  - `selectSpecies`
  - `applyMutation`
  - `resetGame`
- Keep species state persistent across turns.

## Phase 4 — UI Composition (Done)
- Build `HexMap` (SVG + zoom/pan + click select).
- Build species analysis table with TanStack Table.
- Build Mutation Lab panel with costs and trait tradeoffs.
- Build selected hex detail panel and simulation event feed.

## Phase 5 — Validation (Done)
- Run `npm run build` and confirm successful compile.
- Fix logic defects found during verification.

---

## Next Implementation Steps (Roadmap)

### Step 1: Save/Load State
- Add localStorage persistence (`zustand/middleware/persist`).
- Add “Save Snapshot” + “Load Snapshot” controls.

### Step 2: Deterministic Simulation Mode
- Inject seeded random generator for reproducible debugging.
- Add seed display in UI.

### Step 3: Balancing Pass
- Tune growth/metabolism/reproduction constants.
- Add extinction guardrails for early-game stability.

### Step 4: Testing Automation
- Add Vitest and tests for:
  - season transitions
  - water overflow
  - mutation application
  - reproduction and death constraints

### Step 5: Content Expansion
- Add marsh/aquatic specialization depth.
- Add scavenger behavior and carrion attraction radius.
- Add AI memory weighting for successful feeding hexes.

## Delivery Checkpoints
- CP1: Stable 100-turn simulation with no runtime errors.
- CP2: Mutation economy feels meaningful (no trivial spam).
- CP3: Performance remains smooth under default map size.
