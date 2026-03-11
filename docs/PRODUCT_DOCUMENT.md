# Evolution Sandbox — Product Document

## 1) Product Vision
Build a turn-based ecological sandbox where life emerges bottom-up from environmental systems:
- Weather and seasonal shifts drive water and biomass.
- Plants sustain herbivores; herbivores sustain carnivores.
- Player progression comes from colonization, adaptation, and tradeoff-based mutation.

## 2) Goals
- Deliver a playable simulation loop in browser with instant turn feedback.
- Expose ecosystem state through clear UI (map + species analytics + hex details).
- Make evolution meaningful via advantages with explicit disadvantages.

## 3) Non-Goals (MVP)
- Multiplayer or networking.
- Full realism simulation (genetics, pathfinding optimization, deterministic replay).
- Heavy narrative campaign.

## 4) Core Gameplay Loop
1. Player observes map and species metrics.
2. Player advances turn (1 month).
3. Systems update in order:
   - Season/weather effect
   - Plant growth
   - Water overflow / flooding
   - Animal feeding, movement, hunting, reproduction, death
4. Player earns evolution points from colonized new hexes.
5. Player spends points in Mutation Lab.

## 5) World Model
- Grid: Hexagonal map.
- Terrain: `water`, `grass`, `woods`, `desert`, optional emergent `marsh`.
- Hydrology:
  - Hexes track moisture and saturation.
  - Overflow transfers to lower-elevation adjacent hexes.
- Seasons:
  - 12 turns = 1 year.
  - Spring/Summer/Fall/Winter multipliers affect growth and evaporation.

## 6) Species & Niche System
- Plants: automatic biomass layer.
- Herbivores: consume biomass; optimized for evasion/efficiency.
- Carnivores: consume herbivores/carrion; optimized for hunting.

### Trait Design Principle
Every plus has a minus to avoid dominant strategy.

## 7) UX Requirements
- Left: interactive zoom/pan hex map.
- Right: species analytics table (population, occupied hexes, avg energy).
- Bottom: selected hex details and activity feed.
- Interaction: click hex to inspect; click species row to focus mutation options.

## 8) Progression & Economy
- Earn: `+1 Evolution Point` for each newly colonized hex by player species.
- Spend: mutation costs from Mutation Lab.
- Constraint: mutation only if enough points and trait not already owned.

## 9) Data Contracts
Use TypeScript-first contracts for engine and UI alignment:
- `Hex`
- `Animal`
- `Species`
- `MutationOption`
- `SpeciesStats`

## 10) MVP Success Criteria
- Game compiles and runs in Next.js.
- Turns advance with visible ecosystem changes.
- Species table and hex details update every turn.
- Mutation purchase flow works and persists in state.
- Build passes (`npm run build`).

## 11) Risks
- High-frequency updates can cause UI re-render costs.
- Water/animal simulation order bugs can create unstable populations.
- Balance risk: extinction loops too early or runaway growth.

## 12) Mitigations
- Keep logic centralized in engine module.
- Add deterministic helper tests for flow and season logic.
- Add tuning constants and event feed for debugging state changes.
