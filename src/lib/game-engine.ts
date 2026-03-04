import {
  BIOMASS_GROWTH_BY_TYPE,
  MUTATION_OPTIONS,
  SEASON_BY_MONTH,
  SEASON_EVAPORATION,
  SEASON_GROWTH_MULTIPLIER,
  TURN_PER_YEAR,
} from "@/lib/game-constants";
import {
  Animal,
  AnimalSex,
  ClimateZone,
  CreatureDesignParts,
  CreatureDesignStats,
  CreatureDesignSubmission,
  DietType,
  Hex,
  HexType,
  MutationEffect,
  Season,
  Species,
  SpeciesStats,
  Trait,
  WeatherType,
} from "@/lib/types";

const GRID_WIDTH = 20;
const GRID_HEIGHT = 14;
const DEFAULT_RANDOM_SEED = 20260304;

const normalizeSeed = (seed: number) => {
  const normalized = Math.abs(Math.trunc(seed)) >>> 0;
  return normalized === 0 ? 1 : normalized;
};

const deriveSeed = (seed: number, salt: number) => normalizeSeed(Math.imul(seed ^ salt, 1597334677) + salt);

interface RandomSource {
  getState: () => number;
  next: () => number;
  nextInt: (maxExclusive: number) => number;
}

const createRandomSource = (initialState: number): RandomSource => {
  let state = initialState >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };

  return {
    getState: () => state,
    next,
    nextInt: (maxExclusive) => (maxExclusive <= 1 ? 0 : Math.floor(next() * maxExclusive)),
  };
};

const randomId = (rng: RandomSource) => {
  let id = "";
  for (let index = 0; index < 8; index += 1) {
    id += Math.floor(rng.next() * 36).toString(36);
  }
  return id;
};

const evenRowNeighbors = [
  [1, 0],
  [0, -1],
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
] as const;

const oddRowNeighbors = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [0, 1],
  [1, 1],
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const offsetToCube = (q: number, r: number) => {
  const x = q - (r - (r & 1)) / 2;
  const z = r;
  const y = -x - z;
  return { x, y, z };
};

const hexDistance = (a: Pick<Hex, "q" | "r">, b: Pick<Hex, "q" | "r">) => {
  const ac = offsetToCube(a.q, a.r);
  const bc = offsetToCube(b.q, b.r);
  return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
};

export interface MapSizeConfig {
  width: number;
  height: number;
}

export const DEFAULT_MAP_SIZE: MapSizeConfig = {
  width: GRID_WIDTH,
  height: GRID_HEIGHT,
};

export interface GameStateData {
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
  evolutionPoints: number;
  hexes: Hex[];
  species: Species[];
  selectedHexId: string | null;
  selectedSpeciesId: string | null;
  events: string[];
}

const MIN_GENE_VALUE = 0.2;
const MAX_GENE_VALUE = 6;
const GRAZING_PRESSURE_MAX = 36;
const MIN_MATURITY_AGE = 2;
const MAX_MATURITY_AGE = 80;

const cloneSpecies = (species: Species): Species => ({
  ...species,
  traits: [...species.traits],
});

const clampGeneValue = (value: number) => clamp(value, MIN_GENE_VALUE, MAX_GENE_VALUE);

const defaultGeneProfile = (diet: DietType) => ({
  awareness: diet === "herbivore" ? 2 : 1.8,
  stamina: diet === "herbivore" ? 2 : 2.2,
  fecundity: diet === "herbivore" ? 1.9 : 1.2,
  defense: diet === "herbivore" ? 1.5 : 1.4,
  stealth: diet === "herbivore" ? 1 : 1.6,
  attackPower: diet === "herbivore" ? 0.6 : 2,
  foragingEfficiency: diet === "herbivore" ? 2 : 1.3,
  collectiveForce: diet === "herbivore" ? 2.6 : 2.1,
  heatTolerance: 1.6,
  coldTolerance: 1.4,
});

const getDefaultMaturityAge = (diet: DietType) => (diet === "herbivore" ? 10 : 12);

const normalizeSpecies = (species: Species): Species => {
  const fallback = defaultGeneProfile(species.diet);
  const maxAge = clamp(species.maxAge, 24, 180);
  const maturityAge = clamp(
    species.maturityAge ?? getDefaultMaturityAge(species.diet),
    MIN_MATURITY_AGE,
    Math.min(MAX_MATURITY_AGE, maxAge - 2),
  );

  return {
    ...species,
    traits: [...species.traits],
    maxAge,
    maturityAge,
    awareness: clampGeneValue(species.awareness ?? fallback.awareness),
    stamina: clampGeneValue(species.stamina ?? fallback.stamina),
    fecundity: clampGeneValue(species.fecundity ?? fallback.fecundity),
    defense: clampGeneValue(species.defense ?? fallback.defense),
    stealth: clampGeneValue(species.stealth ?? fallback.stealth),
    attackPower: clampGeneValue(species.attackPower ?? fallback.attackPower),
    foragingEfficiency: clampGeneValue(species.foragingEfficiency ?? fallback.foragingEfficiency),
    collectiveForce: clampGeneValue(species.collectiveForce ?? fallback.collectiveForce),
    heatTolerance: clampGeneValue(species.heatTolerance ?? fallback.heatTolerance),
    coldTolerance: clampGeneValue(species.coldTolerance ?? fallback.coldTolerance),
  };
};

export const normalizeSpeciesCollection = (species: Species[]) => species.map((item) => normalizeSpecies(item));

const applyMutationEffect = (species: Species, effects: MutationEffect): Species =>
  normalizeSpecies({
    ...species,
    baseSpeed: clamp(species.baseSpeed + (effects.baseSpeed ?? 0), 0.8, 6),
    baseMetabolism: clamp(species.baseMetabolism + (effects.baseMetabolism ?? 0), 2.5, 18),
    maxAge: clamp(species.maxAge + (effects.maxAge ?? 0), 24, 180),
    maturityAge: clamp(
      species.maturityAge + (effects.maturityAge ?? 0),
      MIN_MATURITY_AGE,
      Math.min(MAX_MATURITY_AGE, species.maxAge - 2),
    ),
    size: clamp(species.size + (effects.size ?? 0), 0.6, 4.5),
    awareness: species.awareness + (effects.awareness ?? 0),
    stamina: species.stamina + (effects.stamina ?? 0),
    fecundity: species.fecundity + (effects.fecundity ?? 0),
    defense: species.defense + (effects.defense ?? 0),
    stealth: species.stealth + (effects.stealth ?? 0),
    attackPower: species.attackPower + (effects.attackPower ?? 0),
    foragingEfficiency: species.foragingEfficiency + (effects.foragingEfficiency ?? 0),
    collectiveForce: species.collectiveForce,
    heatTolerance: species.heatTolerance + (effects.heatTolerance ?? 0),
    coldTolerance: species.coldTolerance + (effects.coldTolerance ?? 0),
  });

export const getSeasonByTurn = (turn: number): Season => {
  const monthIndex = turn % TURN_PER_YEAR;
  return SEASON_BY_MONTH[monthIndex];
};

const pickAnimalSex = (rng: RandomSource): AnimalSex => (rng.next() < 0.5 ? "female" : "male");

const inferAnimalSex = (id: string): AnimalSex => {
  const last = id.charCodeAt(id.length - 1) || 0;
  return last % 2 === 0 ? "female" : "male";
};

const normalizeAnimal = (animal: Animal): Animal => ({
  ...animal,
  sex: animal.sex === "male" || animal.sex === "female" ? animal.sex : inferAnimalSex(animal.id),
  venomCooldown: animal.venomCooldown ?? 0,
});

const normalizeHexState = (hex: Hex): Hex => ({
  ...hex,
  grazingPressure: clamp(hex.grazingPressure ?? 0, 0, GRAZING_PRESSURE_MAX),
  inhabitants: hex.inhabitants.map((animal) => normalizeAnimal(animal)),
});

const cloneHexState = (hexes: Hex[]): Hex[] => hexes.map((hex) => normalizeHexState({ ...hex }));
export const normalizeHexCollection = (hexes: Hex[]) => cloneHexState(hexes);

const makeAnimal = (
  species: Species,
  homeHexId: string,
  rng: RandomSource,
  overrides: Partial<Pick<Animal, "sex" | "energy">> = {},
): Animal => ({
  id: randomId(rng),
  speciesId: species.id,
  sex: overrides.sex ?? pickAnimalSex(rng),
  energy: overrides.energy ?? 72,
  age: 0,
  isHungry: true,
  canMate: false,
  homeHexId,
  venomCooldown: 0,
  size: species.size,
  aquatic: species.aquatic,
});

const getCollectiveSexProfile = (
  collectiveForce: number,
  groupSize: number,
  fallbackMaleRatio = 0.34,
) => {
  const total = Math.max(2, Math.round(groupSize));
  const maleRatio = clamp(fallbackMaleRatio - collectiveForce * 0.045, 0.08, 0.38);
  let maleCount = Math.max(1, Math.round(total * maleRatio));
  if (collectiveForce >= 3.8 && total >= 5) {
    maleCount = 1;
  } else if (collectiveForce >= 2.8 && total >= 6) {
    maleCount = Math.min(maleCount, 2);
  }
  let femaleCount = total - maleCount;
  if (femaleCount < 1) {
    femaleCount = 1;
    maleCount = Math.max(1, total - 1);
  }
  if (total >= 4 && femaleCount < 2) {
    femaleCount = 2;
    maleCount = Math.max(1, total - femaleCount);
  }
  return { maleCount, femaleCount };
};

const hashNoise = (x: number, y: number, seed = 1) => {
  const raw = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return raw - Math.floor(raw);
};

const smoothNoise = (x: number, y: number, seed = 1) => {
  const corners =
    (hashNoise(x - 1, y - 1, seed) +
      hashNoise(x + 1, y - 1, seed) +
      hashNoise(x - 1, y + 1, seed) +
      hashNoise(x + 1, y + 1, seed)) /
    16;
  const sides =
    (hashNoise(x - 1, y, seed) +
      hashNoise(x + 1, y, seed) +
      hashNoise(x, y - 1, seed) +
      hashNoise(x, y + 1, seed)) /
    8;
  const center = hashNoise(x, y, seed) / 4;
  return corners + sides + center;
};

const pickHexType = (elevation: number, wetness: number): HexType => {
  if (elevation <= 2 || wetness > 0.84) return "water";
  if (wetness < 0.25) return "desert";
  if (wetness > 0.58) return "woods";
  return "grass";
};

const WEATHER_EFFECTS: Record<WeatherType, { growth: number; evaporation: number; rainfall: number }> = {
  clear: { growth: 1, evaporation: 1, rainfall: 0 },
  rain: { growth: 1.2, evaporation: 0.75, rainfall: 2.5 },
  storm: { growth: 1.1, evaporation: 0.7, rainfall: 4.5 },
  drought: { growth: 0.6, evaporation: 1.5, rainfall: -1.2 },
  heatwave: { growth: 0.7, evaporation: 1.8, rainfall: -0.6 },
  cold_snap: { growth: 0.65, evaporation: 0.55, rainfall: 0.2 },
};

const WATER_NEIGHBOR_TYPES: HexType[] = ["water", "marsh"];

const chooseWeatherForSeason = (season: Season, wetBias: number, rng: RandomSource): WeatherType => {
  const roll = rng.next();
  const wetShift = clamp(wetBias, -1.2, 1.2) * 0.12;

  if (season === "spring") {
    if (roll < 0.42 + wetShift) return "rain";
    if (roll < 0.55 + wetShift) return "storm";
    if (roll < 0.72 + wetShift * 0.4) return "clear";
    if (roll < 0.88) return "cold_snap";
    return "drought";
  }

  if (season === "summer") {
    if (roll < 0.4 + wetShift * 0.45) return "clear";
    if (roll < 0.62 - wetShift * 0.2) return "heatwave";
    if (roll < 0.78 - wetShift * 0.5) return "drought";
    if (roll < 0.95 + wetShift) return "rain";
    return "storm";
  }

  if (season === "fall") {
    if (roll < 0.36 + wetShift * 0.2) return "clear";
    if (roll < 0.58 + wetShift) return "rain";
    if (roll < 0.74 + wetShift * 0.7) return "storm";
    if (roll < 0.86) return "cold_snap";
    return "drought";
  }

  if (roll < 0.33 - wetShift * 0.25) return "cold_snap";
  if (roll < 0.58) return "clear";
  if (roll < 0.75 + wetShift * 0.65) return "storm";
  if (roll < 0.91 + wetShift) return "rain";
  return "drought";
};

const applyWeatherPersistence = (
  previous: WeatherType,
  candidate: WeatherType,
  season: Season,
  wetBias: number,
  rng: RandomSource,
) => {
  const similarFamily =
    ((previous === "rain" || previous === "storm") && (candidate === "rain" || candidate === "storm")) ||
    ((previous === "drought" || previous === "heatwave") &&
      (candidate === "drought" || candidate === "heatwave"));

  const persistenceChance = similarFamily ? 0.46 : 0.26;
  if (rng.next() > persistenceChance) return candidate;

  if (previous === "storm" && season === "winter") return "cold_snap";
  if (previous === "heatwave" && season !== "summer") return "clear";
  if (wetBias > 0.55 && (previous === "drought" || previous === "heatwave")) return "rain";
  return previous;
};

const WEATHER_LABEL: Record<WeatherType, string> = {
  clear: "Clear Skies",
  rain: "Rain Front",
  storm: "Storm Surge",
  drought: "Dry Drought",
  heatwave: "Heatwave",
  cold_snap: "Cold Snap",
};

const BIOMASS_MOISTURE_THRESHOLD: Record<HexType, number> = {
  water: 0,
  marsh: 2.4,
  grass: 2.1,
  woods: 2.8,
  desert: 0.9,
};

const SOIL_PROFILE: Record<HexType, { fieldCapacity: number; wiltingPoint: number; runoff: number; carrying: number }> = {
  water: { fieldCapacity: 18, wiltingPoint: 0, runoff: 0.68, carrying: 10 },
  marsh: { fieldCapacity: 13, wiltingPoint: 2.2, runoff: 0.35, carrying: 105 },
  grass: { fieldCapacity: 9.5, wiltingPoint: 1.9, runoff: 0.24, carrying: 88 },
  woods: { fieldCapacity: 11.5, wiltingPoint: 2.5, runoff: 0.2, carrying: 112 },
  desert: { fieldCapacity: 4.2, wiltingPoint: 0.8, runoff: 0.4, carrying: 28 },
};

const SEASON_WATER_BIAS: Record<Season, number> = {
  spring: 0.42,
  summer: -0.34,
  fall: 0.18,
  winter: -0.12,
};

const MIN_WATER_COVERAGE_RATIO = 0.1;

const computeMoistureIndex = (hexes: Hex[]) => {
  if (hexes.length === 0) return 0.5;
  const totalMoisture = hexes.reduce((sum, hex) => sum + hex.moisture, 0);
  const normalized = totalMoisture / (hexes.length * 10);
  return clamp(normalized, 0, 1);
};

const computeCycleWetBias = (turn: number, moistureIndex: number, droughtDebt: number) => {
  const shortCycle = Math.sin((2 * Math.PI * turn) / 8);
  const longCycle = Math.sin((2 * Math.PI * turn) / 54);
  const recoveryBias = clamp((0.48 - moistureIndex) * 1.5, -0.8, 1.1) + droughtDebt * 0.85;
  return clamp(shortCycle * 0.22 + longCycle * 0.72 + recoveryBias, -1.4, 1.6);
};

const getZoneModifier = (zone: ClimateZone, level: number) => {
  const tunedLevel = clamp(Math.round(level), 1, 5);
  const intensity = (tunedLevel - 1) / 4;

  if (zone === "rain") {
    return {
      rainfallMultiplier: 1.2 + intensity * 0.3,
      biomassMultiplier: 1.08 + intensity * 0.18,
      evaporationMultiplier: clamp(0.95 - intensity * 0.2, 0.68, 1),
      wetBiasOffset: 0.28 + intensity * 0.36,
    };
  }

  if (zone === "dry") {
    return {
      rainfallMultiplier: clamp(0.82 - intensity * 0.32, 0.34, 0.9),
      biomassMultiplier: clamp(0.95 - intensity * 0.22, 0.56, 1),
      evaporationMultiplier: 1.08 + intensity * 0.28,
      wetBiasOffset: -(0.22 + intensity * 0.4),
    };
  }

  const tilt = (tunedLevel - 3) / 2;
  return {
    rainfallMultiplier: 1 + tilt * 0.12,
    biomassMultiplier: 1 + tilt * 0.1,
    evaporationMultiplier: 1 - tilt * 0.08,
    wetBiasOffset: tilt * 0.2,
  };
};

const getHexAt = (hexes: Hex[], q: number, r: number) =>
  hexes.find((hex) => hex.q === q && hex.r === r);

export const getNeighborHexes = (hexes: Hex[], hex: Hex): Hex[] => {
  const deltas = hex.r % 2 === 0 ? evenRowNeighbors : oddRowNeighbors;

  return deltas
    .map(([dq, dr]) => getHexAt(hexes, hex.q + dq, hex.r + dr))
    .filter((neighbor): neighbor is Hex => Boolean(neighbor));
};

const getHexesWithinRange = (hexes: Hex[], origin: Hex, range: number): Hex[] => {
  const maxRange = Math.max(1, Math.floor(range));
  if (maxRange <= 1) return getNeighborHexes(hexes, origin);

  const byId = new Map(hexes.map((hex) => [hex.id, hex]));
  const visited = new Set<string>([origin.id]);
  const queue: Array<{ hex: Hex; depth: number }> = [{ hex: origin, depth: 0 }];
  const collected: Hex[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.depth >= maxRange) continue;

    for (const neighbor of getNeighborHexes(hexes, current.hex)) {
      if (visited.has(neighbor.id)) continue;
      visited.add(neighbor.id);
      const hydrated = byId.get(neighbor.id);
      if (!hydrated) continue;
      collected.push(hydrated);
      queue.push({ hex: hydrated, depth: current.depth + 1 });
    }
  }

  return collected;
};

const BASE_SPECIES: Species[] = [
  {
    id: "player-herbivore",
    name: "Player Grazer",
    isPlayer: true,
    diet: "herbivore",
    traits: ["long_legs"],
    baseSpeed: 2,
    baseMetabolism: 7,
    maxAge: 72,
    maturityAge: 10,
    size: 1,
    aquatic: false,
    awareness: 2.2,
    stamina: 2.2,
    fecundity: 2.1,
    defense: 1.7,
    stealth: 1,
    attackPower: 0.6,
    foragingEfficiency: 2.3,
    collectiveForce: 2.8,
    heatTolerance: 1.8,
    coldTolerance: 1.4,
  },
  {
    id: "wild-grazer",
    name: "Wild Grazer",
    isPlayer: false,
    diet: "herbivore",
    traits: ["big_ears"],
    baseSpeed: 2,
    baseMetabolism: 6,
    maxAge: 70,
    maturityAge: 9,
    size: 1,
    aquatic: false,
    awareness: 2.5,
    stamina: 2,
    fecundity: 1.9,
    defense: 1.5,
    stealth: 1,
    attackPower: 0.5,
    foragingEfficiency: 2.2,
    collectiveForce: 3.2,
    heatTolerance: 1.9,
    coldTolerance: 1.3,
  },
  {
    id: "wild-hunter",
    name: "Wild Hunter",
    isPlayer: false,
    diet: "carnivore",
    traits: ["ambush_camo"],
    baseSpeed: 3,
    baseMetabolism: 8,
    maxAge: 64,
    maturityAge: 11,
    size: 1,
    aquatic: false,
    awareness: 2.1,
    stamina: 2.5,
    fecundity: 1.2,
    defense: 1.5,
    stealth: 1.9,
    attackPower: 2.4,
    foragingEfficiency: 1.5,
    collectiveForce: 2.3,
    heatTolerance: 1.7,
    coldTolerance: 1.5,
  },
];

const createBaseSpeciesRoster = () => BASE_SPECIES.map((species) => cloneSpecies(species));

const toGeneScale = (statValue: number, bias = 0) =>
  clamp(0.4 + statValue * 0.52 + bias, MIN_GENE_VALUE, MAX_GENE_VALUE);

const toSpeedValue = (topSpeed: number, burst: number, bodyMass: number) =>
  clamp(1 + topSpeed * 0.42 + burst * 0.08 - bodyMass * 0.16, 0.8, 6);

const toMetabolismValue = (
  foodLoad: number,
  legPairs: number,
  furDensity: number,
  stomachComplexity: number,
) =>
  clamp(2.6 + foodLoad * 1.08 + legPairs * 0.24 + furDensity * 0.2 - stomachComplexity * 0.22, 2.5, 18);

const toMaxAgeValue = (defense: number, heat: number, cold: number, foodLoad: number, longevity: number) =>
  clamp(26 + longevity * 8 + defense * 3.2 + (heat + cold) * 1.2 - foodLoad * 0.8, 24, 220);

const toMaturityAgeValue = (maturitySpeed: number, bodyMass: number, foodLoad: number) =>
  clamp(20 - maturitySpeed * 1.8 + bodyMass * 1.2 + foodLoad * 0.35, MIN_MATURITY_AGE, MAX_MATURITY_AGE);

const toSizeValue = (bodyMass: number, hornSize: number) => clamp(0.8 + bodyMass * 0.45 + hornSize * 0.08, 0.6, 4.5);

const sanitizeSpeciesName = (name: string) => {
  const cleaned = name.trim().replace(/\s+/g, " ").slice(0, 26);
  return cleaned.length > 0 ? cleaned : "Custom Species";
};

const makeUniqueSpeciesName = (name: string, species: Species[]) => {
  const base = sanitizeSpeciesName(name);
  const existing = new Set(species.map((item) => item.name.toLowerCase()));
  if (!existing.has(base.toLowerCase())) return base;

  for (let index = 2; index <= 99; index += 1) {
    const candidate = `${base} ${index}`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
  }

  return `${base} ${Math.floor(Date.now() % 1000)}`;
};

const normalizeDesignParts = (partsInput: Partial<CreatureDesignParts> | undefined): CreatureDesignParts => {
  const rawParts: CreatureDesignParts = {
    bodyMass: partsInput?.bodyMass ?? 1,
    legPairs: partsInput?.legPairs ?? 1,
    eyePairs: partsInput?.eyePairs ?? 1,
    earSize: partsInput?.earSize ?? 1,
    mouthPower: partsInput?.mouthPower ?? 1,
    stomachComplexity: partsInput?.stomachComplexity ?? 1,
    furDensity: partsInput?.furDensity ?? 0,
    hornSize: partsInput?.hornSize ?? 0,
    tailLength: partsInput?.tailLength ?? 1,
    camouflage: partsInput?.camouflage ?? 0,
    scentPlumes: partsInput?.scentPlumes ?? 0,
  };

  const maxPartValue = Math.max(...Object.values(rawParts).map((value) => (Number.isFinite(value) ? value : 0)));
  const scale = maxPartValue > 8 ? 10 : 1;

  return {
    bodyMass: clamp(rawParts.bodyMass / scale, 0.5, 5),
    legPairs: clamp(rawParts.legPairs / scale, 0.5, 5),
    eyePairs: clamp(rawParts.eyePairs / scale, 0.5, 5),
    earSize: clamp(rawParts.earSize / scale, 0.5, 5),
    mouthPower: clamp(rawParts.mouthPower / scale, 0.5, 5),
    stomachComplexity: clamp(rawParts.stomachComplexity / scale, 0.5, 5),
    furDensity: clamp(rawParts.furDensity / scale, 0, 5),
    hornSize: clamp(rawParts.hornSize / scale, 0, 5),
    tailLength: clamp(rawParts.tailLength / scale, 0.5, 5),
    camouflage: clamp(rawParts.camouflage / scale, 0, 5),
    scentPlumes: clamp(rawParts.scentPlumes / scale, 0, 5),
  };
};

const clampDesignStat = (value: number | undefined, fallback: number) => {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return clamp(numeric, 0.5, 10);
};

const normalizeDesignStats = (statsInput: Partial<CreatureDesignStats> | undefined): CreatureDesignStats => {
  const topSpeed = clampDesignStat(statsInput?.topSpeed, 5);
  const maneuver = clampDesignStat(statsInput?.maneuver, 5);
  const burst = clampDesignStat(statsInput?.burst, 5);
  const foodLoad = clampDesignStat(statsInput?.foodLoad, 4);
  const digestion = clampDesignStat(statsInput?.digestion, 5);
  const biteForce = clampDesignStat(statsInput?.biteForce, 5);
  const awareness = clampDesignStat(statsInput?.awareness, 5);
  const defense = clampDesignStat(statsInput?.defense, 5);
  const attack = clampDesignStat(statsInput?.attack, 5);
  const stealth = clampDesignStat(statsInput?.stealth, 5);
  const avoidance = clampDesignStat(statsInput?.avoidance, 5);
  const heat = clampDesignStat(statsInput?.heat, 5);
  const cold = clampDesignStat(statsInput?.cold, 5);
  const fertility = clampDesignStat(statsInput?.fertility, 5);
  const populateSpeed = clampDesignStat(statsInput?.populateSpeed, 5);
  const maturitySpeed = clampDesignStat(statsInput?.maturitySpeed, 5);
  const migrationDrive = clampDesignStat(statsInput?.migrationDrive, (maneuver + burst + avoidance) / 3);
  const mateDrive = clampDesignStat(statsInput?.mateDrive, (fertility + populateSpeed) / 2);
  const collectiveForce = clampDesignStat(
    statsInput?.collectiveForce,
    (mateDrive + populateSpeed + awareness) / 3,
  );
  const longevity = clampDesignStat(statsInput?.longevity, (defense + heat + cold) / 3);

  return {
    topSpeed,
    maneuver,
    burst,
    foodLoad,
    digestion,
    biteForce,
    awareness,
    defense,
    attack,
    stealth,
    avoidance,
    migrationDrive,
    mateDrive,
    collectiveForce,
    heat,
    cold,
    longevity,
    fertility,
    populateSpeed,
    maturitySpeed,
  };
};

const normalizeDesignSubmission = (design: CreatureDesignSubmission): CreatureDesignSubmission => ({
  ...design,
  name: sanitizeSpeciesName(design.name),
  seedPairs: clamp(Math.round(design.seedPairs), 1, 8),
  parts: normalizeDesignParts(design.parts),
  stats: normalizeDesignStats(design.stats),
});

const deriveTraitsFromDesign = (design: CreatureDesignSubmission): Trait[] => {
  const traits: Trait[] = [];
  const pushUnique = (trait: Trait) => {
    if (!traits.includes(trait)) traits.push(trait);
  };

  if (design.diet === "herbivore") {
    if (design.parts.legPairs >= 4 || design.stats.topSpeed >= 7.3) pushUnique("long_legs");
    if (design.parts.earSize >= 2 || design.stats.awareness >= 6.5 || design.stats.avoidance >= 6.9) pushUnique("big_ears");
    if (design.parts.furDensity >= 2 || design.stats.cold >= 6.8) pushUnique("thick_fur");
    if (design.parts.hornSize >= 2 || design.stats.defense >= 6.4) pushUnique("horned_defense");
    if (design.parts.tailLength >= 3 || design.stats.maneuver >= 6.2 || design.stats.avoidance >= 6.4) {
      pushUnique("sure_footing");
    }
    if (design.seedPairs >= 3 || design.stats.awareness >= 6.9 || design.stats.populateSpeed >= 7) pushUnique("herd_instinct");
    if (design.stats.fertility >= 7.1 || design.stats.populateSpeed >= 7.3) pushUnique("high_fecundity");
    if (design.stats.foodLoad <= 3.8 && (design.parts.bodyMass >= 2 || design.parts.stomachComplexity >= 2 || design.stats.digestion >= 6.5)) {
      pushUnique("ruminant_stomach");
    }
    return traits;
  }

  if (design.parts.camouflage >= 2 || design.stats.stealth >= 6.6) pushUnique("ambush_camo");
  if (design.seedPairs >= 3 || design.stats.attack >= 6.6 || design.stats.populateSpeed >= 6.7) pushUnique("pack_hunter");
  if (design.parts.scentPlumes >= 2 || design.stats.awareness >= 6.9 || design.stats.avoidance >= 6.5) {
    pushUnique("keen_smell");
  }
  if (design.parts.legPairs >= 4 || design.stats.topSpeed >= 7.2) pushUnique("sprint_burst");
  if (design.parts.hornSize >= 2 || design.parts.mouthPower >= 2 || design.stats.biteForce >= 6.8 || design.stats.attack >= 7.2) {
    pushUnique("crushing_jaws");
  }
  if (design.parts.bodyMass >= 4 || design.stats.attack >= 8.1) pushUnique("apex_size");
  if ((design.parts.bodyMass >= 3 && design.stats.attack >= 7.5) || (design.parts.mouthPower >= 3 && design.stats.biteForce >= 7.2)) {
    pushUnique("venomous_bite");
  }
  if (design.stats.foodLoad <= 4.1 || design.parts.scentPlumes >= 2 || design.parts.stomachComplexity >= 2 || design.stats.digestion >= 6.6) {
    pushUnique("scavenger_gut");
  }
  return traits;
};

const createSpeciesFromDesign = (
  design: CreatureDesignSubmission,
  id: string,
  existingSpecies: Species[],
): Species => {
  const attackBias = design.diet === "carnivore" ? 0.35 : -0.15;
  const foragingBias = design.diet === "herbivore" ? 0.35 : 0;

  return normalizeSpecies({
    id,
    name: makeUniqueSpeciesName(design.name, existingSpecies),
    isPlayer: true,
    diet: design.diet,
    traits: deriveTraitsFromDesign(design),
    baseSpeed: toSpeedValue(design.stats.topSpeed, design.stats.burst, design.parts.bodyMass),
    baseMetabolism: toMetabolismValue(
      design.stats.foodLoad,
      design.parts.legPairs,
      design.parts.furDensity,
      design.parts.stomachComplexity,
    ),
    maxAge: Math.round(
      toMaxAgeValue(
        design.stats.defense,
        design.stats.heat,
        design.stats.cold,
        design.stats.foodLoad,
        design.stats.longevity,
      ),
    ),
    maturityAge: Math.round(
      toMaturityAgeValue(
        design.stats.maturitySpeed,
        design.parts.bodyMass,
        design.stats.foodLoad,
      ),
    ),
    size: toSizeValue(design.parts.bodyMass, design.parts.hornSize),
    aquatic: false,
    awareness: toGeneScale(
      design.stats.awareness,
      design.parts.eyePairs * 0.08 +
        design.parts.scentPlumes * 0.1 +
        design.parts.earSize * 0.06 +
        design.stats.migrationDrive * 0.035,
    ),
    stamina: toGeneScale(
      (design.stats.maneuver + design.stats.burst + design.stats.avoidance + design.stats.migrationDrive) / 4,
      -design.parts.legPairs * 0.05 + design.parts.tailLength * 0.03 + design.stats.migrationDrive * 0.03,
    ),
    defense: toGeneScale(design.stats.defense, design.parts.hornSize * 0.12 + design.parts.bodyMass * 0.04),
    stealth: toGeneScale(
      design.stats.stealth,
      design.parts.camouflage * 0.12 - design.parts.eyePairs * 0.06 + design.stats.avoidance * 0.03,
    ),
    attackPower: toGeneScale(
      design.stats.attack,
      design.parts.hornSize * 0.14 + attackBias + design.parts.mouthPower * 0.12 + design.stats.biteForce * 0.04,
    ),
    foragingEfficiency: toGeneScale(
      10 - design.stats.foodLoad + design.stats.digestion * 0.42 + design.parts.stomachComplexity * 0.4,
      foragingBias,
    ),
    collectiveForce: toGeneScale(
      design.stats.collectiveForce,
      (design.diet === "herbivore" ? 0.22 : 0.06) +
        design.seedPairs * 0.06 +
        design.stats.mateDrive * 0.05 +
        design.stats.populateSpeed * 0.04,
    ),
    heatTolerance: toGeneScale(design.stats.heat),
    coldTolerance: toGeneScale(design.stats.cold),
    fecundity: toGeneScale(
      design.stats.fertility * 0.55 + design.stats.populateSpeed * 0.3 + design.stats.mateDrive * 0.15,
      design.seedPairs * 0.03 +
        design.stats.populateSpeed * 0.06 +
        design.stats.mateDrive * 0.035 -
        design.stats.maturitySpeed * 0.02,
    ),
  });
};

const pickSeedingHexes = (
  hexes: Hex[],
  diet: DietType,
  seedPairs: number,
  speciesById: Map<string, Species>,
  rng: RandomSource,
) => {
  const candidates = hexes
    .filter((hex) => hex.type !== "water")
    .map((hex) => {
      const preyCount = hex.inhabitants.reduce((total, animal) => {
        const residentSpecies = speciesById.get(animal.speciesId);
        if (!residentSpecies) return total;
        if (diet === "carnivore") return total + (residentSpecies.diet === "herbivore" ? 1 : 0);
        return total + (residentSpecies.diet === "carnivore" ? 1 : 0);
      }, 0);

      const terrainBias =
        diet === "herbivore"
          ? hex.vegetation * 0.72 + hex.moisture * 0.22 - preyCount * 1.6
          : preyCount * 8 + hex.carrion * 0.55 + hex.moisture * 0.1;
      const randomBias = rng.next() * 4.8;

      return { hex, score: terrainBias + randomBias };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(seedPairs * 2, 12));

  if (candidates.length === 0) return [];

  const chosen: Hex[] = [];
  for (let index = 0; index < seedPairs; index += 1) {
    const pick = candidates[(index * 2 + rng.nextInt(candidates.length)) % candidates.length].hex;
    chosen.push(pick);
  }
  return chosen;
};

export const addDesignedSpeciesToState = (
  state: GameStateData,
  design: CreatureDesignSubmission,
): GameStateData => {
  const normalizedDesign = normalizeDesignSubmission(design);
  const normalizedPairs = normalizedDesign.seedPairs;
  const rng = createRandomSource(state.rngState);
  const hexes = cloneHexState(state.hexes);
  const species = normalizeSpeciesCollection(state.species);
  const speciesById = new Map(species.map((item) => [item.id, item]));
  const speciesId = `custom-${randomId(rng)}`;
  const newcomer = createSpeciesFromDesign(
    {
      ...normalizedDesign,
      seedPairs: normalizedPairs,
    },
    speciesId,
    species,
  );

  species.push(newcomer);
  speciesById.set(newcomer.id, newcomer);

  const seedHexes = pickSeedingHexes(hexes, newcomer.diet, normalizedPairs, speciesById, rng);
  if (seedHexes.length === 0) {
    return {
      ...state,
      rngState: rng.getState(),
      events: [`Failed to seed ${newcomer.name}: no valid land hexes.`, ...state.events].slice(0, 12),
    };
  }

  const seedEnergy = clamp(58 + newcomer.stamina * 4 - newcomer.baseMetabolism * 0.35, 36, 84);
  const foundingGroupSize = clamp(
    4 + Math.round(normalizedDesign.stats.collectiveForce * 0.62 + normalizedDesign.stats.populateSpeed * 0.28),
    4,
    10,
  );
  const foundingSexProfile = getCollectiveSexProfile(newcomer.collectiveForce, foundingGroupSize, 0.34);
  let totalSeeded = 0;
  seedHexes.forEach((hex) => {
    for (let i = 0; i < foundingSexProfile.maleCount; i += 1) {
      hex.inhabitants.push(makeAnimal(newcomer, hex.id, rng, { sex: "male", energy: seedEnergy }));
      totalSeeded += 1;
    }
    for (let i = 0; i < foundingSexProfile.femaleCount; i += 1) {
      hex.inhabitants.push(makeAnimal(newcomer, hex.id, rng, { sex: "female", energy: seedEnergy }));
      totalSeeded += 1;
    }
  });

  return {
    ...state,
    rngState: rng.getState(),
    hexes,
    species,
    selectedSpeciesId: newcomer.id,
    events: [
      `Seeded ${newcomer.name}: ${totalSeeded} creatures across ${seedHexes.length} hexes.`,
      ...state.events,
    ].slice(0, 12),
  };
};

export const createInitialGameState = (
  config: Partial<MapSizeConfig> & { seed?: number; includeBaseSpecies?: boolean } = {},
): GameStateData => {
  const randomSeed = normalizeSeed(config.seed ?? DEFAULT_RANDOM_SEED);
  const rng = createRandomSource(randomSeed);
  const includeBaseSpecies = config.includeBaseSpecies ?? true;
  const species = includeBaseSpecies ? createBaseSpeciesRoster() : [];
  const width = clamp(Math.floor(config.width ?? GRID_WIDTH), 8, 96);
  const height = clamp(Math.floor(config.height ?? GRID_HEIGHT), 8, 96);
  const hexes: Hex[] = [];
  const centerQ = (width - 1) / 2;
  const centerR = (height - 1) / 2;
  const maxDist = Math.sqrt(centerQ * centerQ + centerR * centerR);
  const elevationSeed = deriveSeed(randomSeed, 3) % 997;
  const wetSeedA = deriveSeed(randomSeed, 9) % 997;
  const wetSeedB = deriveSeed(randomSeed, 21) % 997;

  for (let r = 0; r < height; r += 1) {
    for (let q = 0; q < width; q += 1) {
      const dx = q - centerQ;
      const dy = r - centerR;
      const radial = Math.sqrt(dx * dx + dy * dy) / maxDist;
      const elevationNoise = smoothNoise(q * 0.85, r * 0.85, elevationSeed);
      const wetNoiseA = smoothNoise(q * 0.63, r * 0.63, wetSeedA);
      const wetNoiseB = smoothNoise(q * 1.19, r * 1.19, wetSeedB);
      const wetness = Math.min(1, Math.max(0, wetNoiseA * 0.7 + wetNoiseB * 0.3 + (0.35 - radial * 0.25)));

      const elevation = Math.min(10, Math.max(0, Math.round(elevationNoise * 10 + (0.55 - radial) * 3)));
      const type = pickHexType(elevation, wetness);
      const isWater = type === "water";

      hexes.push({
        id: `${q},${r}`,
        q,
        r,
        type,
        elevation,
        moisture: isWater ? 12 : Math.round(2 + wetness * 9),
        vegetation: isWater ? 0 : Math.round(8 + wetness * 45),
        saturationCapacity: 8 + Math.round(elevation / 2),
        carrion: 0,
        grazingPressure: 0,
        inhabitants: [],
      });
    }
  }

  const candidateHexes = hexes.filter((hex) => hex.type !== "water");
  if (includeBaseSpecies && candidateHexes.length > 0) {
    species.forEach((species, index) => {
      const groupSize = clamp(4 + Math.round(species.collectiveForce * 1.15), 4, 10);
      const sexProfile = getCollectiveSexProfile(species.collectiveForce, groupSize, 0.34);
      for (let i = 0; i < 4; i += 1) {
        const offset = rng.nextInt(candidateHexes.length);
        const home = candidateHexes[(offset + index * 12 + i * 3) % candidateHexes.length];
        for (let male = 0; male < sexProfile.maleCount; male += 1) {
          home.inhabitants.push(makeAnimal(species, home.id, rng, { sex: "male", energy: 70 }));
        }
        for (let female = 0; female < sexProfile.femaleCount; female += 1) {
          home.inhabitants.push(makeAnimal(species, home.id, rng, { sex: "female", energy: 70 }));
        }
      }
    });
  }

  return {
    turn: 0,
    month: 1,
    year: 1,
    randomSeed,
    rngState: rng.getState(),
    season: "spring",
    weather: "clear",
    climateZone: "normal",
    climateTuningLevel: 3,
    climateMoistureIndex: computeMoistureIndex(hexes),
    droughtDebt: 0,
    cycleWetBias: 0,
    evolutionPoints: 0,
    hexes,
    species,
    selectedHexId: null,
    selectedSpeciesId: includeBaseSpecies ? "player-herbivore" : null,
    events: [
      includeBaseSpecies
        ? `Simulation started with seed ${randomSeed}. Stable clear weather.`
        : `Simulation started with seed ${randomSeed}. Empty world ready for custom species.`,
    ],
  };
};

const getDefaultAiRoster = () =>
  createBaseSpeciesRoster().filter((item) => !item.isPlayer);

const countSpeciesPopulation = (hexes: Hex[], speciesId: string) =>
  hexes.reduce(
    (sum, hex) => sum + hex.inhabitants.reduce((inner, animal) => inner + (animal.speciesId === speciesId ? 1 : 0), 0),
    0,
  );

export const removeAiPopulationFromState = (state: GameStateData): GameStateData => {
  const species = normalizeSpeciesCollection(state.species);
  const aiIds = new Set(species.filter((item) => !item.isPlayer).map((item) => item.id));
  if (aiIds.size === 0) return state;

  const hexes = cloneHexState(state.hexes).map((hex) => ({
    ...hex,
    inhabitants: hex.inhabitants.filter((animal) => !aiIds.has(animal.speciesId)),
  }));
  const remainingSpecies = species.filter((item) => item.isPlayer);
  const selectedSpeciesId =
    state.selectedSpeciesId && remainingSpecies.some((item) => item.id === state.selectedSpeciesId)
      ? state.selectedSpeciesId
      : remainingSpecies[0]?.id ?? null;

  return {
    ...state,
    hexes,
    species: remainingSpecies,
    selectedSpeciesId,
    events: ["AI populations removed. World is now player-only.", ...state.events].slice(0, 12),
  };
};

export const generateAiPopulationInState = (
  state: GameStateData,
  config: { pairsPerSpecies?: number } = {},
): GameStateData => {
  const pairsPerSpecies = clamp(Math.round(config.pairsPerSpecies ?? 4), 1, 10);
  const rng = createRandomSource(state.rngState);
  const hexes = cloneHexState(state.hexes);
  const species = normalizeSpeciesCollection(state.species);
  const candidateHexes = hexes.filter((hex) => hex.type !== "water");
  if (candidateHexes.length === 0) {
    return {
      ...state,
      rngState: rng.getState(),
      events: ["AI generation failed: no non-water hexes available.", ...state.events].slice(0, 12),
    };
  }

  const defaults = getDefaultAiRoster();
  const knownIds = new Set(species.map((item) => item.id));
  for (const ai of defaults) {
    if (!knownIds.has(ai.id)) {
      species.push(normalizeSpecies({ ...ai }));
      knownIds.add(ai.id);
    }
  }

  let seededCreatures = 0;
  const aiSpecies = species.filter((item) => !item.isPlayer);
  aiSpecies.forEach((ai, index) => {
    const existingPopulation = countSpeciesPopulation(hexes, ai.id);
    if (existingPopulation > 0) return;

    const groupSize = clamp(4 + Math.round(ai.collectiveForce * 1.2), 4, 10);
    const sexProfile = getCollectiveSexProfile(ai.collectiveForce, groupSize, 0.34);
    for (let i = 0; i < pairsPerSpecies; i += 1) {
      const offset = rng.nextInt(candidateHexes.length);
      const home = candidateHexes[(offset + index * 9 + i * 5) % candidateHexes.length];
      for (let male = 0; male < sexProfile.maleCount; male += 1) {
        home.inhabitants.push(makeAnimal(ai, home.id, rng, { sex: "male", energy: 70 }));
        seededCreatures += 1;
      }
      for (let female = 0; female < sexProfile.femaleCount; female += 1) {
        home.inhabitants.push(makeAnimal(ai, home.id, rng, { sex: "female", energy: 70 }));
        seededCreatures += 1;
      }
    }
  });

  const events =
    seededCreatures > 0
      ? [`Generated AI populations: +${seededCreatures} creatures.`, ...state.events].slice(0, 12)
      : ["AI species already present. No new AI generated.", ...state.events].slice(0, 12);

  return {
    ...state,
    rngState: rng.getState(),
    hexes,
    species,
    events,
  };
};

const herbivoreIntake = (hex: Hex, species: Species, activityModifier = 1) => {
  const traits = species.traits;
  const canEatWoods = traits.includes("ruminant_stomach");
  if (hex.type === "woods" && !canEatWoods) return 0;
  const terrainMultiplier =
    hex.type === "marsh" ? 1.12 : hex.type === "grass" ? 1 : hex.type === "woods" ? 0.92 : 0.75;
  const overgrazingPenalty = Math.min(0.45, hex.grazingPressure * 0.025);
  const intakeCap =
    (8 + species.foragingEfficiency * 2.3) * (1 - overgrazingPenalty) * clamp(activityModifier, 0.28, 1.2);
  const amount = Math.min(intakeCap, hex.vegetation);
  hex.vegetation -= amount;
  hex.grazingPressure = clamp(
    hex.grazingPressure + amount * (0.032 + species.size * 0.01),
    0,
    GRAZING_PRESSURE_MAX,
  );
  return amount * terrainMultiplier;
};

const countSpeciesInHex = (hex: Hex, speciesById: Map<string, Species>, diet: DietType) =>
  hex.inhabitants.reduce((total, animal) => {
    const residentSpecies = speciesById.get(animal.speciesId);
    if (!residentSpecies || residentSpecies.diet !== diet) return total;
    return total + 1;
  }, 0);

const getTerrainPredationModifier = (hex: Hex, predatorSpecies: Species, preySpecies: Species) => {
  let bonus = 0;

  if (predatorSpecies.traits.includes("ambush_camo")) {
    if (hex.type === "woods" || hex.type === "marsh") bonus += 0.16;
    if (hex.type === "grass" || hex.type === "desert") bonus -= 0.12;
  }

  if (predatorSpecies.traits.includes("sprint_burst")) {
    if (hex.type === "grass" || hex.type === "desert") bonus += 0.12;
    if (hex.type === "woods" || hex.type === "marsh") bonus -= 0.08;
  }

  if (preySpecies.traits.includes("sure_footing") && (hex.type === "woods" || hex.type === "marsh")) {
    bonus -= 0.13;
  }

  if (preySpecies.traits.includes("long_legs") && (hex.type === "grass" || hex.type === "desert")) {
    bonus -= 0.1;
  }

  return bonus;
};

const getHideChance = (
  hex: Hex,
  predatorSpecies: Species,
  preySpecies: Species,
  preyEnergy: number,
  herdCount: number,
  predatorDensity: number,
) => {
  const terrainCover = hex.type === "woods" || hex.type === "marsh" ? 0.16 : hex.type === "grass" ? 0.05 : -0.04;
  const herdCover = preySpecies.traits.includes("herd_instinct") ? Math.min(0.12, herdCount * 0.022) : 0;
  const hungerPenalty = preyEnergy < 38 ? -0.06 : preyEnergy > 62 ? 0.04 : 0;
  const droughtPenalty = hex.grazingPressure > 12 ? -0.04 : 0;
  const scentCounter = predatorSpecies.traits.includes("keen_smell") ? 0.12 : 0;
  const visibilityCounter = predatorDensity * 0.014;

  return clamp(
    0.03 +
      preySpecies.stealth * 0.05 +
      terrainCover +
      herdCover +
      hungerPenalty +
      droughtPenalty -
      predatorSpecies.awareness * 0.03 -
      scentCounter -
      visibilityCounter,
    0.01,
    0.62,
  );
};

const attemptPredation = (
  hex: Hex,
  predator: Animal,
  speciesById: Map<string, Species>,
  rng: RandomSource,
) => {
  const predatorSpecies = speciesById.get(predator.speciesId);
  if (!predatorSpecies || predatorSpecies.diet !== "carnivore") return false;
  if ((predator.venomCooldown ?? 0) > 0) return false;

  const predatorDensity = hex.inhabitants.filter((animal) => {
    const residentSpecies = speciesById.get(animal.speciesId);
    return residentSpecies?.diet === "carnivore";
  }).length;

  const candidates = hex.inhabitants.filter((animal) => {
    const preySpecies = speciesById.get(animal.speciesId);
    if (!preySpecies || preySpecies.diet !== "herbivore") return false;
    const reach =
      predator.size +
      predatorSpecies.attackPower * 0.28 +
      (predatorSpecies.traits.includes("venomous_bite") ? 0.8 : 0) +
      (predatorSpecies.traits.includes("crushing_jaws") ? 0.45 : 0);

    return animal.size <= reach;
  });

  if (candidates.length === 0) return false;

  const visiblePrey = candidates.filter((candidate) => {
    const preySpecies = speciesById.get(candidate.speciesId);
    if (!preySpecies) return false;
    const herdCount = hex.inhabitants.filter((animal) => animal.speciesId === candidate.speciesId).length;
    const hideChance = getHideChance(
      hex,
      predatorSpecies,
      preySpecies,
      candidate.energy,
      herdCount,
      predatorDensity,
    );
    return rng.next() >= hideChance;
  });

  if (visiblePrey.length === 0) {
    predator.energy = Math.max(0, predator.energy - 1.4);
    return false;
  }

  const prey = [...visiblePrey]
    .sort((a, b) => {
      const preySpeciesA = speciesById.get(a.speciesId);
      const preySpeciesB = speciesById.get(b.speciesId);
      if (!preySpeciesA || !preySpeciesB) return 0;

      const scoreA =
        (predatorSpecies.attackPower - preySpeciesA.defense) * 0.45 +
        (predatorSpecies.baseSpeed - preySpeciesA.baseSpeed) * 0.36 +
        (predator.size - a.size) * 0.24 +
        (80 - a.energy) * 0.01 +
        rng.next() * 0.4;
      const scoreB =
        (predatorSpecies.attackPower - preySpeciesB.defense) * 0.45 +
        (predatorSpecies.baseSpeed - preySpeciesB.baseSpeed) * 0.36 +
        (predator.size - b.size) * 0.24 +
        (80 - b.energy) * 0.01 +
        rng.next() * 0.4;

      return scoreB - scoreA;
    })[0];

  const preySpecies = speciesById.get(prey.speciesId);
  if (!preySpecies) return false;

  let killChance =
    0.26 +
    (predatorSpecies.baseSpeed - preySpecies.baseSpeed) * 0.05 +
    (predatorSpecies.attackPower - preySpecies.defense) * 0.06 +
    (predatorSpecies.stamina - preySpecies.stamina) * 0.035 +
    (predatorSpecies.awareness - preySpecies.awareness) * 0.03 +
    (predatorSpecies.stealth - preySpecies.awareness * 0.45) * 0.025 +
    getTerrainPredationModifier(hex, predatorSpecies, preySpecies) +
    (hex.grazingPressure > 10 ? 0.04 : 0);

  const herdCount = preySpecies.traits.includes("herd_instinct")
    ? hex.inhabitants.filter((animal) => animal.speciesId === prey.speciesId).length
    : 0;

  if (herdCount > 1) {
    killChance -= Math.min(0.16, (herdCount - 1) * 0.035);
  }

  if (predatorSpecies.traits.includes("pack_hunter")) {
    const allies = hex.inhabitants.filter((animal) => animal.speciesId === predator.speciesId).length;
    killChance += Math.min(0.22, Math.max(0, allies - 1) * 0.06);
  }

  if (predatorSpecies.traits.includes("crushing_jaws") && preySpecies.traits.includes("horned_defense")) {
    killChance += 0.08;
  }

  if (predatorSpecies.traits.includes("keen_smell")) {
    killChance += 0.06;
  }

  const alertChance = clamp(
    0.12 +
      (preySpecies.awareness - predatorSpecies.stealth) * 0.045 +
      (preySpecies.baseSpeed - predatorSpecies.baseSpeed) * 0.035 +
      (preySpecies.stamina - predatorSpecies.stamina) * 0.025 +
      (preySpecies.traits.includes("big_ears") ? 0.08 : 0) +
      (preySpecies.traits.includes("long_legs") ? 0.05 : 0) +
      (preySpecies.traits.includes("horned_defense") ? 0.03 : 0) -
      clamp((46 - prey.energy) * 0.003, 0, 0.09),
    0.04,
    0.55,
  );

  if (rng.next() < alertChance) {
    const counterDamage =
      preySpecies.traits.includes("horned_defense") && rng.next() < 0.45
        ? 4 + preySpecies.attackPower * 1.8
        : 0;
    if (counterDamage > 0) {
      predator.energy = Math.max(0, predator.energy - counterDamage);
    }
    if (preySpecies.baseSpeed > predatorSpecies.baseSpeed && rng.next() < 0.25) {
      predator.energy = Math.max(0, predator.energy - 0.9);
    }
    return false;
  }

  killChance = clamp(killChance, 0.08, 0.92);
  if (rng.next() > killChance) return false;

  hex.inhabitants = hex.inhabitants.filter((animal) => animal.id !== prey.id);
  const energyGain =
    (predatorSpecies.traits.includes("pack_hunter") ? 21 : 28) +
    prey.size * 8 +
    predatorSpecies.attackPower * 1.8;
  predator.energy += energyGain;
  hex.grazingPressure = Math.max(0, hex.grazingPressure - 1.1);

  if (predator.energy > 100) {
    hex.carrion += predator.energy - 100;
    predator.energy = 100;
  }

  if (predatorSpecies.traits.includes("venomous_bite")) {
    predator.venomCooldown = 2;
  }

  return true;
};

const applyGeneticDrift = (species: Species[], rng: RandomSource): string | null => {
  if (rng.next() > 0.12) return null;
  const wildSpecies = species.filter((item) => !item.isPlayer);
  if (wildSpecies.length === 0) return null;

  const target = wildSpecies[rng.nextInt(wildSpecies.length)];
  const options = MUTATION_OPTIONS.filter(
    (mutation) => mutation.diet === target.diet && !target.traits.includes(mutation.id),
  );
  if (options.length === 0) return null;

  const mutation = options[rng.nextInt(options.length)];
  Object.assign(
    target,
    applyMutationEffect(
      {
        ...target,
        traits: [...target.traits, mutation.id],
      },
      mutation.effects,
    ),
  );
  return `${target.name} gained drift trait: ${mutation.name}`;
};

const processWaterFlow = (hexes: Hex[]) => {
  for (let pass = 0; pass < 8; pass += 1) {
    let hadOverflow = false;

    for (const hex of hexes) {
      const profile = SOIL_PROFILE[hex.type];
      if (hex.type !== "water" && hex.type !== "marsh" && hex.moisture > profile.fieldCapacity) {
        const runoffVolume = (hex.moisture - profile.fieldCapacity) * profile.runoff;
        hex.moisture -= runoffVolume;

        const targets = getNeighborHexes(hexes, hex)
          .filter((neighbor) => neighbor.elevation <= hex.elevation)
          .sort((a, b) => a.elevation - b.elevation || a.moisture - b.moisture);

        if (targets.length > 0) {
          const share = runoffVolume / targets.length;
          for (const target of targets) {
            target.moisture += share;
          }
        }
      }

      const threshold =
        hex.type === "water" ? hex.saturationCapacity + 1 : hex.type === "marsh" ? hex.saturationCapacity : hex.saturationCapacity - 0.2;
      if (hex.moisture <= threshold) continue;

      let overflow = hex.moisture - threshold;
      hex.moisture = threshold;

      const lowerNeighbors = getNeighborHexes(hexes, hex)
        .filter((neighbor) => neighbor.elevation <= hex.elevation)
        .sort((a, b) => a.elevation - b.elevation || a.moisture - b.moisture);

      if (lowerNeighbors.length === 0) {
        overflow = 0;
      }

      if (lowerNeighbors.length > 0) {
        const primary = lowerNeighbors[0];
        primary.moisture += overflow * 0.72;

        const spillRemainder = overflow * 0.28;
        const secondary = lowerNeighbors.slice(1, 3);
        const secondaryShare = secondary.length > 0 ? spillRemainder / secondary.length : 0;
        for (const neighbor of secondary) {
          neighbor.moisture += secondaryShare;
        }

        const touched = [primary, ...secondary];
        for (const neighbor of touched) {
          if (neighbor.elevation <= 2 && neighbor.moisture > neighbor.saturationCapacity + 0.8) {
            neighbor.type = "marsh";
            neighbor.vegetation = clamp(neighbor.vegetation + 7, 0, 120);
          }
        }
      }

      hadOverflow = hadOverflow || overflow > 0;
    }

    if (!hadOverflow) break;
  }
};

const getConnectedWaterBodies = (hexes: Hex[]) => {
  const byId = new Map(hexes.map((hex) => [hex.id, hex]));
  const visited = new Set<string>();
  const groups: Hex[][] = [];

  for (const hex of hexes) {
    if (!WATER_NEIGHBOR_TYPES.includes(hex.type) || visited.has(hex.id)) continue;

    const queue: Hex[] = [hex];
    visited.add(hex.id);
    const group: Hex[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      group.push(current);

      const neighbors = getNeighborHexes(hexes, current).filter((neighbor) => WATER_NEIGHBOR_TYPES.includes(neighbor.type));
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.id) || !byId.has(neighbor.id)) continue;
        visited.add(neighbor.id);
        queue.push(neighbor);
      }
    }

    if (group.length > 0) groups.push(group);
  }

  return groups;
};

const stabilizeWaterBodies = (hexes: Hex[]) => {
  const waterGroups = getConnectedWaterBodies(hexes);

  for (const group of waterGroups) {
    if (group.length === 0) continue;

    if (group.length === 1) {
      const isolatedLoss = group[0].type === "water" ? 0.22 : 0.16;
      group[0].moisture = Math.max(0, group[0].moisture - isolatedLoss);
      continue;
    }

    const totalMoisture = group.reduce((sum, hex) => sum + hex.moisture, 0);

    if (group.length >= 3) {
      const sortedByBasin = [...group].sort((a, b) => a.elevation - b.elevation || b.moisture - a.moisture);
      const basin = sortedByBasin[0];

      for (const waterHex of sortedByBasin.slice(1)) {
        if (waterHex.moisture <= 2.2) continue;
        const transfer = (waterHex.moisture - 2.2) * 0.24;
        waterHex.moisture -= transfer;
        basin.moisture += transfer;
      }

      for (const waterHex of sortedByBasin.slice().reverse()) {
        if (waterHex.id === basin.id) continue;
        if (waterHex.moisture > 2.3) continue;

        if (waterHex.type === "water" && waterHex.moisture > 1.15) {
          waterHex.type = "marsh";
          waterHex.moisture = Math.max(waterHex.moisture, 2.25);
          waterHex.vegetation = clamp(waterHex.vegetation + 8, 0, 120);
          continue;
        }

        waterHex.type = waterHex.elevation <= 3 ? "grass" : "desert";
        waterHex.vegetation = clamp(waterHex.vegetation + 4, 0, 120);
      }
    }

    const avgCapacity = group.reduce((sum, hex) => sum + hex.saturationCapacity, 0) / group.length;
    const avgMoisture = totalMoisture / group.length;
    if (avgMoisture > avgCapacity + 1.2) {
      const source = [...group].sort((a, b) => b.moisture - a.moisture)[0];
      const candidates = getNeighborHexes(hexes, source)
        .filter((neighbor) => !WATER_NEIGHBOR_TYPES.includes(neighbor.type))
        .sort((a, b) => a.elevation - b.elevation || a.moisture - b.moisture);

      const target = candidates[0];
      if (target) {
        const spill = Math.min(source.moisture * 0.32, 4.6);
        source.moisture -= spill;
        target.moisture += spill;
        target.type = target.elevation <= 2 ? "water" : "marsh";
        target.vegetation = clamp(target.vegetation + 4, 0, 120);
      }
    }
  }
};

const enforceMinimumWaterCoverage = (hexes: Hex[], season: Season, weather: WeatherType) => {
  const wetBoost = season === "spring" ? 0.025 : weather === "rain" || weather === "storm" ? 0.015 : 0;
  const dynamicRatio = MIN_WATER_COVERAGE_RATIO + wetBoost;
  const waterCount = hexes.filter((hex) => WATER_NEIGHBOR_TYPES.includes(hex.type)).length;
  const minWaterHexes = Math.max(6, Math.round(hexes.length * dynamicRatio));
  if (waterCount >= minWaterHexes) return;

  const need = minWaterHexes - waterCount;
  const candidates = hexes
    .filter((hex) => !WATER_NEIGHBOR_TYPES.includes(hex.type))
    .sort((a, b) => a.elevation - b.elevation || b.moisture - a.moisture);

  for (let i = 0; i < need && i < candidates.length; i += 1) {
    const target = candidates[i];
    target.type = target.elevation <= 2 ? "water" : "marsh";
    target.moisture = Math.max(target.moisture, target.saturationCapacity + 1.2);
    target.vegetation = clamp(target.vegetation + 5, 0, 120);
  }
};

const expandWaterInWetSeason = (hexes: Hex[], season: Season, weather: WeatherType, rng: RandomSource) => {
  const isWetPeriod = season === "spring" || weather === "rain" || weather === "storm";
  if (!isWetPeriod) return;

  const expansionAttempts = weather === "storm" ? 4 : weather === "rain" ? 3 : 2;
  const waterHexes = hexes.filter((hex) => WATER_NEIGHBOR_TYPES.includes(hex.type));
  if (waterHexes.length === 0) return;

  for (let i = 0; i < expansionAttempts; i += 1) {
    const source = waterHexes[rng.nextInt(waterHexes.length)];
    const candidates = getNeighborHexes(hexes, source)
      .filter((neighbor) => !WATER_NEIGHBOR_TYPES.includes(neighbor.type))
      .sort((a, b) => a.elevation - b.elevation || b.moisture - a.moisture);

    const target = candidates[0];
    if (!target) continue;

    const toWater = target.elevation <= 2 || target.moisture > target.saturationCapacity * 0.95;
    target.type = toWater ? "water" : "marsh";
    target.moisture = Math.max(target.moisture, target.saturationCapacity + (toWater ? 1.6 : 0.8));
    target.vegetation = clamp(target.vegetation + 4, 0, 120);
  }
};

const applyExtremeRainFloodPulse = (
  hexes: Hex[],
  zone: ClimateZone,
  level: number,
  weather: WeatherType,
): boolean => {
  const shouldPulse = zone === "rain" && level >= 5 && (weather === "rain" || weather === "storm");
  if (!shouldPulse) return false;

  const waterHexes = hexes
    .filter((hex) => WATER_NEIGHBOR_TYPES.includes(hex.type))
    .sort((a, b) => b.moisture - a.moisture)
    .slice(0, 18);

  if (waterHexes.length === 0) return false;

  for (const waterHex of waterHexes) {
    waterHex.moisture += weather === "storm" ? 3.6 : 2.4;

    const neighbors = getNeighborHexes(hexes, waterHex)
      .filter((neighbor) => !WATER_NEIGHBOR_TYPES.includes(neighbor.type))
      .sort((a, b) => a.elevation - b.elevation || b.moisture - a.moisture)
      .slice(0, 2);

    for (const neighbor of neighbors) {
      neighbor.moisture += weather === "storm" ? 2.2 : 1.6;
      const becomeWater = neighbor.elevation <= 1 || neighbor.moisture > neighbor.saturationCapacity + 2.2;
      neighbor.type = becomeWater ? "water" : "marsh";
      neighbor.vegetation = clamp(neighbor.vegetation + 3, 0, 120);
    }
  }

  return true;
};

const updateHydrologyBiomes = (hexes: Hex[]) => {
  for (const hex of hexes) {
    if (hex.type === "water" && hex.moisture < 4.4) {
      hex.type = "marsh";
      hex.moisture = Math.max(hex.moisture, 2.6);
      hex.vegetation = clamp(hex.vegetation + 10, 0, 120);
    }

    if (hex.type === "marsh") {
      if (hex.moisture > 3.2 && hex.moisture < 8.8) {
        hex.vegetation = clamp(hex.vegetation + 1.4, 0, 120);
      }

      if (hex.moisture > 10.5) {
        hex.vegetation = Math.max(0, hex.vegetation - (hex.moisture - 10.5) * 0.8);
      }

      if (hex.moisture < 1.8) {
        hex.type = hex.elevation <= 3 ? "grass" : "desert";
        hex.vegetation = Math.max(0, hex.vegetation - 3);
      }
    }

    if (hex.type !== "water" && hex.type !== "marsh" && hex.moisture > hex.saturationCapacity + 5 && hex.elevation <= 1) {
      hex.type = "marsh";
      hex.vegetation = clamp(hex.vegetation + 6, 0, 120);
    }

    hex.moisture = clamp(hex.moisture, 0, 30);
  }
};

const processPlantGrowth = (
  hexes: Hex[],
  season: Season,
  weather: WeatherType,
  cycleWetBias: number,
  zoneModifier: ReturnType<typeof getZoneModifier>,
) => {
  const weatherFx = WEATHER_EFFECTS[weather];
  const seasonalBias = SEASON_WATER_BIAS[season];
  const cycleRainBoost = cycleWetBias * 0.85;
  const waterHexes = hexes.filter((hex) => WATER_NEIGHBOR_TYPES.includes(hex.type));

  for (const hex of hexes) {
    const minWaterDistance =
      waterHexes.length === 0
        ? 999
        : waterHexes.reduce((best, waterHex) => Math.min(best, hexDistance(hex, waterHex)), Infinity);

    const waterInfluence =
      minWaterDistance <= 1
        ? 1.8
        : minWaterDistance <= 2
          ? 1.42
          : minWaterDistance <= 3
            ? 1.2
            : minWaterDistance >= 7
              ? 0.58
              : minWaterDistance >= 5
                ? 0.76
              : 1;

    hex.grazingPressure = clamp(hex.grazingPressure * 0.72, 0, GRAZING_PRESSURE_MAX);
    const grazingStress = Math.max(0, hex.grazingPressure - 4) * 0.48;
    const overgrazed = hex.grazingPressure > 14;

    const base = BIOMASS_GROWTH_BY_TYPE[hex.type];
    const evaporationBase =
      SEASON_EVAPORATION[season] * weatherFx.evaporation * zoneModifier.evaporationMultiplier;
    const rainfallBase = (weatherFx.rainfall + cycleRainBoost) * zoneModifier.rainfallMultiplier;

    if (hex.type === "water") {
      const waterRainGain = rainfallBase * 1.22;
      const waterEvapLoss = evaporationBase * clamp(0.7 - cycleWetBias * 0.08, 0.4, 0.9);
      hex.moisture = Math.max(2.4, hex.moisture + waterRainGain - waterEvapLoss + seasonalBias * 0.72);
      hex.vegetation = Math.max(0, hex.vegetation - 0.2);
    } else if (hex.type === "marsh") {
      const marshRainGain = rainfallBase * 1.12;
      const marshEvapLoss = evaporationBase * clamp(0.86 - cycleWetBias * 0.08, 0.56, 1.02);
      hex.moisture = Math.max(1.4, hex.moisture + marshRainGain - marshEvapLoss + seasonalBias * 0.55);

      const marshSweetSpot = clamp(1 - Math.abs(hex.moisture - 5.2) / 4.3, 0, 1);
      const marshFloodStress = Math.max(0, hex.moisture - 9.2) * 0.34;
      hex.vegetation = clamp(hex.vegetation + marshSweetSpot * 2.8 - marshFloodStress, 0, 120);
    } else {
      hex.moisture = Math.max(0, hex.moisture - evaporationBase + rainfallBase + seasonalBias * 0.45);
    }

    if (minWaterDistance <= 3 && hex.type !== "water" && hex.type !== "marsh") {
      const seepMoisture = minWaterDistance <= 1 ? 0.9 : minWaterDistance <= 2 ? 0.55 : 0.3;
      const seepVegetation = minWaterDistance <= 1 ? 2.6 : minWaterDistance <= 2 ? 1.5 : 0.8;
      hex.moisture += seepMoisture;
      hex.vegetation = clamp(hex.vegetation + seepVegetation, 0, 120);
    }

    if (minWaterDistance >= 6 && hex.type !== "water") {
      hex.moisture = Math.max(0, hex.moisture - 0.45);
      hex.vegetation = Math.max(0, hex.vegetation - 0.85);
    }

    if (hex.type !== "water") {
      const soil = SOIL_PROFILE[hex.type];
      const carrying = clamp(soil.carrying * (0.92 + waterInfluence * 0.24), 14, 140);
      const moistureNormalized = clamp((hex.moisture - soil.wiltingPoint) / (soil.fieldCapacity - soil.wiltingPoint), 0, 1.2);
      const seasonProductivity = SEASON_GROWTH_MULTIPLIER[season] * weatherFx.growth;
      const logisticRate = 0.07;
      const logisticGrowth =
        logisticRate * seasonProductivity * moistureNormalized * hex.vegetation * (1 - hex.vegetation / Math.max(22, carrying));
      const establishment = moistureNormalized > 0.34 ? base * 0.28 * seasonProductivity : 0;
      const stress = (hex.moisture < soil.wiltingPoint ? (soil.wiltingPoint - hex.moisture) * 2.2 : 0) + grazingStress;

      hex.vegetation = clamp(
        hex.vegetation + (logisticGrowth + establishment) * zoneModifier.biomassMultiplier - stress,
        0,
        120,
      );

      if (hex.vegetation < 2 && moistureNormalized > 0.62) {
        hex.vegetation = clamp(hex.vegetation + 0.6, 0, 120);
      }

      if (hex.type === "grass" && hex.vegetation > 98 && hex.moisture > 5.4 && hex.grazingPressure < 2.2 && minWaterDistance <= 4) {
        hex.type = "woods";
      }
    }

    if (hex.type !== "water") {
      const threshold = BIOMASS_MOISTURE_THRESHOLD[hex.type];
      if (hex.moisture < threshold) {
        const moistureDeficit = threshold - hex.moisture;
        const distancePenalty = minWaterDistance >= 8 ? 1.8 : minWaterDistance >= 6 ? 1.3 : minWaterDistance >= 4 ? 1.05 : 0.8;
        const decay = 1.1 + moistureDeficit * 1.35 * distancePenalty;
        hex.vegetation = Math.max(0, hex.vegetation - decay);
      }

      if (minWaterDistance >= 7 && hex.moisture < 1.1) {
        hex.vegetation = Math.max(0, hex.vegetation - 1.4);
      }
    }

    const badSeasonStress =
      (season === "winter" ? 1.4 : 0) +
      (weather === "drought" || weather === "heatwave" ? 2.4 : 0) +
      (weather === "cold_snap" ? 0.8 : 0);

    if (badSeasonStress > 0 && hex.type !== "water") {
      const waterBuffer = minWaterDistance <= 2 ? 0.45 : minWaterDistance <= 3 ? 0.72 : 1;
      hex.vegetation = Math.max(0, hex.vegetation - badSeasonStress * waterBuffer);
    }

    if (hex.type === "grass" && minWaterDistance >= 7 && hex.moisture < 1.4 && hex.vegetation < 22) {
      hex.type = "desert";
    }

    if (overgrazed && hex.type === "grass" && hex.moisture < 3.8 && hex.vegetation < 18) {
      hex.type = "desert";
      hex.vegetation = Math.max(0, hex.vegetation - 5);
      hex.moisture = Math.max(0, hex.moisture - 0.4);
    }

    if (hex.type === "desert" && minWaterDistance <= 2 && hex.moisture > 6) {
      hex.type = "grass";
      hex.vegetation = clamp(hex.vegetation + 4, 0, 120);
    }

    if (hex.type === "woods" && minWaterDistance >= 6 && hex.moisture < 2) {
      hex.type = "grass";
    }
  }
};

const enforcePlayabilitySafeguards = (hexes: Hex[], season: Season) => {
  if (hexes.length === 0) return;

  const avgMoisture = hexes.reduce((sum, hex) => sum + hex.moisture, 0) / hexes.length;
  const avgVegetation = hexes.reduce((sum, hex) => sum + hex.vegetation, 0) / hexes.length;

  if (avgMoisture < 2.2) {
    for (const hex of hexes) {
      if (hex.type !== "water") {
        hex.moisture = clamp(hex.moisture + 0.35, 0, 30);
      }
    }
  }

  if (avgVegetation < 8.5) {
    for (const hex of hexes) {
      if (hex.type !== "water" && hex.moisture > 2.1) {
        hex.vegetation = clamp(hex.vegetation + (season === "spring" ? 1.2 : 0.8), 0, 120);
      }
    }
  }
};

const getMovementSenseRange = (species: Species) => {
  const sightSense = species.awareness * 0.8;
  const hearingSense = species.traits.includes("big_ears") ? 1.15 : 0;
  const smellSense = species.traits.includes("keen_smell")
    ? 1.25
    : species.traits.includes("scavenger_gut")
      ? 0.55
      : 0;
  const acuity = sightSense + hearingSense + smellSense + species.foragingEfficiency * 0.3;
  return clamp(1 + Math.floor(acuity / 2.6), 1, 3);
};

const scoreCandidateHex = (
  origin: Hex,
  candidate: Hex,
  species: Species,
  speciesById: Map<string, Species>,
  seekingMate: boolean,
  oppositeSex: AnimalSex,
  mateSeekingDrive: number,
  migrationDrive: number,
) => {
  const predators = countSpeciesInHex(candidate, speciesById, "carnivore");
  const prey = countSpeciesInHex(candidate, speciesById, "herbivore");
  const sameSpeciesPresence = candidate.inhabitants.filter((resident) => resident.speciesId === species.id).length;
  const mateOpportunity = candidate.inhabitants.filter(
    (resident) =>
      resident.speciesId === species.id &&
      resident.sex === oppositeSex,
  ).length;
  const travelPenalty = Math.max(0, hexDistance(origin, candidate) - 1) * 1.25;

  if (species.diet === "herbivore") {
    const foodValue = candidate.vegetation * (0.65 + species.foragingEfficiency * 0.08);
    const waterValue = candidate.moisture * 0.55;
    const threatPenalty = predators * Math.max(2.5, 5 - species.awareness * 0.55);
    const crowdPenalty =
      prey *
      (species.traits.includes("herd_instinct") ? 0.3 : 0.6) *
      clamp(1 - species.collectiveForce * 0.08, 0.45, 1);
    const grazingPenalty = candidate.grazingPressure * 0.85;
    const mateValue = seekingMate ? mateOpportunity * (6 + mateSeekingDrive * 1.8) : 0;
    const migrationBonus = migrationDrive * (candidate.grazingPressure < origin.grazingPressure ? 1.7 : 0.7);
    const colonizationBonus = sameSpeciesPresence === 0 ? migrationDrive * 1.2 : 0;
    const groupCohesionBonus =
      sameSpeciesPresence * (species.traits.includes("herd_instinct") ? 0.6 : 0.35) * (0.9 + species.collectiveForce * 0.2);
    const roughTerrainBonus =
      species.traits.includes("sure_footing") && (candidate.type === "woods" || candidate.type === "marsh")
        ? 6
        : 0;
    const hideCoverBonus =
      candidate.type === "woods" || candidate.type === "marsh"
        ? species.stealth * 0.95 + (species.traits.includes("big_ears") ? 1.4 : 0)
        : 0;

    return (
      foodValue +
      waterValue +
      mateValue +
      migrationBonus +
      colonizationBonus +
      groupCohesionBonus +
      roughTerrainBonus +
      hideCoverBonus -
      threatPenalty -
      crowdPenalty -
      grazingPenalty -
      travelPenalty
    );
  }

  const huntValue = prey * (9 + species.awareness + species.attackPower * 1.2);
  const carrionValue = candidate.carrion * (0.55 + species.foragingEfficiency * 0.12);
  const mateValue = seekingMate ? mateOpportunity * (5 + mateSeekingDrive * 1.4) : 0;
  const migrationBonus = migrationDrive * (prey > 0 ? 0.7 : 1.2);
  const packCohesionBonus =
    sameSpeciesPresence * (species.traits.includes("pack_hunter") ? 0.58 : 0.28) * (0.85 + species.collectiveForce * 0.18);
  const ambushBonus =
    species.traits.includes("ambush_camo") && (candidate.type === "woods" || candidate.type === "marsh")
      ? 7
      : 0;
  const openSprintBonus =
    species.traits.includes("sprint_burst") && (candidate.type === "grass" || candidate.type === "desert")
      ? 5
      : 0;
  const rivalPenalty = predators * (species.traits.includes("pack_hunter") ? 0.6 : 1.8);
  const overgrazingTrackBonus = candidate.grazingPressure * (species.traits.includes("keen_smell") ? 0.45 : 0.2);

  return (
    huntValue +
    carrionValue +
    mateValue +
    migrationBonus +
    packCohesionBonus +
    ambushBonus +
    openSprintBonus +
    overgrazingTrackBonus -
    rivalPenalty -
    travelPenalty
  );
};

const findEmergencyLandHex = (
  fromHex: Hex,
  species: Species,
  hexes: Hex[],
  speciesById: Map<string, Species>,
) =>
  getNeighborHexes(hexes, fromHex)
    .filter((neighbor) => neighbor.type !== "water")
    .sort((a, b) => {
      const score = (candidate: Hex) => {
        const predators = countSpeciesInHex(candidate, speciesById, "carnivore");
        if (species.diet === "herbivore") {
          return candidate.vegetation * 1.08 + candidate.moisture * 0.32 - candidate.grazingPressure * 0.62 - predators * 2.8;
        }

        const prey = countSpeciesInHex(candidate, speciesById, "herbivore");
        const rivals = countSpeciesInHex(candidate, speciesById, "carnivore");
        return prey * 8.2 + candidate.carrion * 0.78 - rivals * 1.2;
      };

      return score(b) - score(a);
    })[0];

const maybeMoveAnimal = (
  hex: Hex,
  animal: Animal,
  hexes: Hex[],
  speciesById: Map<string, Species>,
) => {
  const nearby = getNeighborHexes(hexes, hex);
  if (nearby.length === 0) return;

  const species = speciesById.get(animal.speciesId);
  if (!species) return;
  const nearbyLand = nearby.filter((neighbor) => neighbor.type !== "water");
  if (nearbyLand.length === 0) return;

  const oppositeSex: AnimalSex = animal.sex === "female" ? "male" : "female";
  const localOppositeSexResidents = hex.inhabitants.filter(
    (resident) =>
      resident.speciesId === species.id &&
      resident.id !== animal.id &&
      resident.sex === oppositeSex,
  );
  const localOppositeSexCount = localOppositeSexResidents.length;
  const seekingMate = localOppositeSexCount === 0 && animal.age >= Math.max(1, species.maturityAge - 2);
  const mateSeekingDrive = clamp(species.fecundity * 0.8 + species.awareness * 0.32, 0, 5.2);
  const migrationDrive = clamp(species.stamina * 0.42 + species.awareness * 0.25 + species.foragingEfficiency * 0.18, 0, 4.8);
  const senseRange = getMovementSenseRange(species);
  const sensedHexes = getHexesWithinRange(hexes, hex, senseRange).filter((candidate) => candidate.type !== "water");

  let target: Hex | undefined;
  if (animal.homeHexId) {
    target = nearbyLand.find((neighbor) => neighbor.id === animal.homeHexId);
  }

  if (!target) {
    const candidatePool = sensedHexes.length > 0 ? sensedHexes : nearbyLand;
    const scoredTargets = candidatePool
      .map((candidate) => ({
        candidate,
        score: scoreCandidateHex(
          hex,
          candidate,
          species,
          speciesById,
          seekingMate,
          oppositeSex,
          mateSeekingDrive,
          migrationDrive,
        ),
      }))
      .sort((a, b) => b.score - a.score);

    const strategicTarget = scoredTargets[0]?.candidate;
    if (strategicTarget) {
      if (hexDistance(hex, strategicTarget) <= 1) {
        target = strategicTarget;
      } else {
        const baseDistance = hexDistance(hex, strategicTarget);
        target = nearbyLand
          .map((neighbor) => {
            const stepDistance = hexDistance(neighbor, strategicTarget);
            const progressScore = (baseDistance - stepDistance) * 8;
            const localScore = scoreCandidateHex(
              hex,
              neighbor,
              species,
              speciesById,
              seekingMate,
              oppositeSex,
              mateSeekingDrive,
              migrationDrive,
            );
            const homeBias = animal.homeHexId && neighbor.id === animal.homeHexId ? 0.9 : 0;
            return {
              neighbor,
              score: progressScore + localScore * 0.14 + homeBias,
            };
          })
          .sort((a, b) => b.score - a.score)[0]?.neighbor;
      }
    }
  }

  if (!target) return;

  hex.inhabitants = hex.inhabitants.filter((item) => item.id !== animal.id);
  target.inhabitants.push(animal);
};

const processAnimals = (
  hexes: Hex[],
  speciesById: Map<string, Species>,
  season: Season,
  weather: WeatherType,
  rng: RandomSource,
) => {
  const hasActiveCarnivores = hexes.some((hex) =>
    hex.inhabitants.some((animal) => speciesById.get(animal.speciesId)?.diet === "carnivore"),
  );
  const forcedWaterMoved = new Set<string>();

  for (const hex of hexes) {
    const animals = [...hex.inhabitants];

    for (const animal of animals) {
      if (forcedWaterMoved.has(animal.id)) {
        continue;
      }

      const species = speciesById.get(animal.speciesId);
      if (!species) continue;

      if (hex.type === "water" && !species.aquatic) {
        const refuge = findEmergencyLandHex(hex, species, hexes, speciesById);
        if (!refuge) {
          hex.inhabitants = hex.inhabitants.filter((item) => item.id !== animal.id);
          hex.carrion = clamp(hex.carrion + 4 + species.size * 2, 0, 180);
          continue;
        }

        hex.inhabitants = hex.inhabitants.filter((item) => item.id !== animal.id);
        refuge.inhabitants.push(animal);
        animal.energy -= 3.5;
        forcedWaterMoved.add(animal.id);
        continue;
      }

      const predatorVacuumForHerbivore = !hasActiveCarnivores && species.diet === "herbivore";

      animal.age += 1;
      animal.size = species.size;
      animal.aquatic = species.aquatic;

      const metabolicLoad = Math.max(1.8, species.baseMetabolism + species.size * 0.45 - species.stamina * 0.18);
      animal.energy -= metabolicLoad;

      const heatLoad =
        (season === "summer" ? 1.1 : 0) +
        (weather === "heatwave" ? 2.4 : 0) +
        (weather === "drought" ? 0.8 : 0) +
        (hex.type === "desert" ? 1.8 : 0) +
        (hex.type === "marsh" ? 0.3 : 0);
      if (!predatorVacuumForHerbivore && heatLoad > species.heatTolerance) {
        animal.energy -= (heatLoad - species.heatTolerance) * 1.2;
      }

      const coldLoad =
        (season === "winter" ? 1.2 : 0) +
        (weather === "cold_snap" ? 2.2 : 0) +
        (hex.type === "water" ? 0.6 : 0);
      if (!predatorVacuumForHerbivore && coldLoad > species.coldTolerance) {
        animal.energy -= (coldLoad - species.coldTolerance) * 1.15;
      }

      if ((animal.venomCooldown ?? 0) > 0) {
        animal.venomCooldown = (animal.venomCooldown ?? 0) - 1;
      }

      const sameSpeciesResidents = hex.inhabitants.filter((resident) => resident.speciesId === species.id);
      const sameSpeciesCount = sameSpeciesResidents.length;
      const oppositeSex = animal.sex === "female" ? "male" : "female";
      const sameSpeciesMaleCount = sameSpeciesResidents.filter((resident) => resident.sex === "male").length;
      const sameSpeciesFemaleCount = sameSpeciesResidents.filter((resident) => resident.sex === "female").length;
      const localOppositeSexCount = sameSpeciesResidents.filter(
        (resident) => resident.id !== animal.id && resident.sex === oppositeSex,
      ).length;
      const localPredators = hex.inhabitants.reduce((total, resident) => {
        const residentSpecies = speciesById.get(resident.speciesId);
        return residentSpecies?.diet === "carnivore" ? total + 1 : total;
      }, 0);
      const localHerbivores = hex.inhabitants.reduce((total, resident) => {
        const residentSpecies = speciesById.get(resident.speciesId);
        return residentSpecies?.diet === "herbivore" ? total + 1 : total;
      }, 0);
      const localPotentialMates = sameSpeciesResidents.filter(
        (resident) =>
          resident.id !== animal.id &&
          resident.sex === oppositeSex &&
          resident.age >= species.maturityAge &&
          resident.energy > 24,
      ).length;
      const collectiveForce = species.collectiveForce;
      const localResourceCapacity = hex.vegetation / 11 + hex.moisture * 0.4 + 2;
      const localPressure = sameSpeciesCount / Math.max(1.2, localResourceCapacity);

      if (species.diet === "herbivore") {
        const terrainCover = hex.type === "woods" || hex.type === "marsh" ? 0.11 : hex.type === "grass" ? 0.03 : -0.03;
        const hideChance = clamp(
          0.05 +
            species.stealth * 0.05 +
            terrainCover +
            (species.traits.includes("big_ears") ? 0.07 : 0) -
            localPredators * 0.035,
          0.02,
          0.58,
        );
        const isHiding = !predatorVacuumForHerbivore && localPredators > 0 && rng.next() < hideChance;
        const forageActivity = predatorVacuumForHerbivore ? 1.12 : isHiding ? 0.56 : 1;

        animal.energy += herbivoreIntake(hex, species, forageActivity);
        if (isHiding) {
          animal.energy -= 0.55;
        }

        if (!predatorVacuumForHerbivore && species.traits.includes("herd_instinct")) {
          const herdSize = sameSpeciesResidents.length;
          if (herdSize > 2) {
            animal.energy -= Math.min(2.2, (herdSize - 2) * 0.65);
          }
        }

        if (!predatorVacuumForHerbivore && hex.grazingPressure > 10) {
          animal.energy -= Math.min(1.8, (hex.grazingPressure - 10) * 0.18);
        }
      } else {
        const hunted = attemptPredation(hex, animal, speciesById, rng);
        if (!hunted && hex.carrion > 0) {
          const carrionCap =
            6 + species.foragingEfficiency * 3.2 + (species.traits.includes("scavenger_gut") ? 5 : 0);
          const eatenCarrion = Math.min(carrionCap, hex.carrion);
          hex.carrion -= eatenCarrion;
          animal.energy += eatenCarrion * (0.72 + species.foragingEfficiency * 0.08);
        } else if (!hunted && species.traits.includes("sprint_burst")) {
          animal.energy -= 2.2;
        } else if (!hunted && localHerbivores === 0) {
          animal.energy -= 1.1;
        }
      }

      animal.energy = Math.min(100, animal.energy);
      animal.isHungry = animal.energy < 42 + species.size * 4;
      const maturityReady = animal.age >= species.maturityAge;
      const mateEnergyThreshold = predatorVacuumForHerbivore
        ? 56 - species.fecundity * 2.9
        : 68 - species.fecundity * 2.2;
      animal.canMate = maturityReady && animal.energy > mateEnergyThreshold;

      if (animal.energy <= 0 || animal.age >= species.maxAge) {
        hex.inhabitants = hex.inhabitants.filter((item) => item.id !== animal.id);
        continue;
      }

      const hasMate =
        animal.sex === "female" &&
        localOppositeSexCount > 0 &&
        (localPotentialMates > 0 || predatorVacuumForHerbivore);
      const crowdingPenalty = clamp(
        (localPressure - 1) * 0.038 * clamp(1 - collectiveForce * 0.1, 0.3, 1),
        0,
        0.12,
      );
      const overgrazePenalty =
        species.diet === "herbivore" ? clamp((hex.grazingPressure - 8) * 0.01, 0, 0.12) : 0;
      const maturityMomentum = clamp((animal.age - species.maturityAge) * 0.0024, 0, 0.06);
      const predatorVacuumBonus = predatorVacuumForHerbivore ? 0.09 : 0;
      const collectiveBonus = collectiveForce * 0.018;
      const haremBonus =
        animal.sex === "female" && sameSpeciesMaleCount > 0
          ? clamp((sameSpeciesFemaleCount - sameSpeciesMaleCount) * 0.008, 0, 0.06)
          : 0;
      const reproductionChance = clamp(
        0.06 +
          species.fecundity * 0.034 -
          species.size * 0.009 -
          crowdingPenalty -
          overgrazePenalty +
          maturityMomentum +
          collectiveBonus +
          haremBonus +
          predatorVacuumBonus +
          (species.traits.includes("herd_instinct") || species.traits.includes("pack_hunter") ? 0.012 : 0) +
          (species.diet === "carnivore" && localHerbivores > 0 ? 0.014 : 0),
        0.01,
        predatorVacuumForHerbivore ? 0.5 : 0.4,
      );
      if (animal.canMate && hasMate && rng.next() < reproductionChance) {
        const maxOffspring = predatorVacuumForHerbivore
          ? clamp(5 + Math.round(collectiveForce * 0.7), 5, 8)
          : clamp(3 + Math.round(collectiveForce * 0.65), 3, 7);
        const baseOffspring = Math.min(
          maxOffspring,
          (species.fecundity >= 3.2 ? 2 : 1) +
            (species.fecundity >= 4.4 ? 1 : 0) +
            (species.traits.includes("high_fecundity") ? 1 : 0) +
            (collectiveForce >= 3 ? 1 : 0) +
            (predatorVacuumForHerbivore ? 1 : 0) +
            (sameSpeciesMaleCount >= 1 && sameSpeciesFemaleCount >= 4 ? 1 : 0),
        );
        const pressureThreshold = predatorVacuumForHerbivore ? 2.7 : 2.2;
        const crowdingReduction = localPressure > pressureThreshold ? Math.ceil((localPressure - pressureThreshold) * 1.35) : 0;
        const carryingLimitedCount = Math.max(1, baseOffspring - crowdingReduction);
        const parentCostPerOffspring = Math.max(
          2.2,
          3.8 +
            species.size * 1.15 +
            species.fecundity * 0.9 +
            localPressure * 0.8 -
            collectiveForce * 0.75 -
            (predatorVacuumForHerbivore ? 1.1 : 0),
        );
        const energyBuffer = predatorVacuumForHerbivore ? 4 : 8;
        const energyLimitedCount = Math.max(
          1,
          Math.floor((animal.energy - energyBuffer) / Math.max(1.8, parentCostPerOffspring)),
        );
        const offspringCount = Math.min(
          maxOffspring,
          Math.max(1, carryingLimitedCount),
          energyLimitedCount,
        );
        const offspringEnergy = clamp(
          64 - species.fecundity * 4 - species.size * 2.8 - localPressure * 2.1 + collectiveForce * 1.2,
          26,
          66,
        );
        if (predatorVacuumForHerbivore && animal.energy - parentCostPerOffspring < 4) {
          continue;
        }
        let projectedMaleCount = sameSpeciesMaleCount;
        let projectedFemaleCount = sameSpeciesFemaleCount;
        for (let i = 0; i < offspringCount; i += 1) {
          const projectedPopulation = Math.max(1, projectedMaleCount + projectedFemaleCount);
          const currentMaleRatio = projectedMaleCount / projectedPopulation;
          const targetMaleRatio = clamp(0.32 - collectiveForce * 0.04, 0.08, 0.32);
          const babySex: AnimalSex =
            projectedMaleCount === 0
              ? "male"
              : currentMaleRatio < targetMaleRatio
                ? "male"
                : "female";
          const baby = makeAnimal(species, hex.id, rng, { sex: babySex });
          baby.energy = offspringEnergy;
          hex.inhabitants.push(baby);
          if (babySex === "male") {
            projectedMaleCount += 1;
          } else {
            projectedFemaleCount += 1;
          }
          animal.energy -= parentCostPerOffspring;
        }
      }

      if (animal.energy <= 0) {
        hex.inhabitants = hex.inhabitants.filter((item) => item.id !== animal.id);
        continue;
      }

      const expansionDrive =
        species.diet === "herbivore"
          ? clamp(
              (localPressure - (predatorVacuumForHerbivore ? 0.65 : 0.85)) * 0.14,
              0,
              predatorVacuumForHerbivore ? 0.44 : 0.3,
            ) +
            (hex.grazingPressure > 10 ? 0.11 : 0) +
            species.collectiveForce * 0.02 +
            (predatorVacuumForHerbivore ? 0.16 : 0)
          : localHerbivores === 0
            ? 0.2 + species.collectiveForce * 0.016
            : 0.06 + species.collectiveForce * 0.01;
      const activelySeekingMate =
        (animal.canMate || animal.age >= Math.max(1, species.maturityAge - 2)) && localOppositeSexCount === 0;
      const mateSeekingMoveBonus =
        activelySeekingMate
          ? clamp(0.14 + species.fecundity * 0.02 + species.awareness * 0.012, 0, 0.3)
          : 0;
      let moveChance = clamp(
        (animal.isHungry ? 0.18 : 0.05) +
          species.baseSpeed * 0.055 +
          species.stamina * 0.04 +
          species.collectiveForce * 0.018 +
          species.awareness * 0.02 -
          species.size * 0.02 +
          (predatorVacuumForHerbivore ? 0.1 : 0) +
          mateSeekingMoveBonus +
          expansionDrive,
        0.05,
        predatorVacuumForHerbivore ? 0.88 : 0.8,
      );
      if (activelySeekingMate) {
        moveChance = Math.max(moveChance, clamp(0.42 + species.baseSpeed * 0.03 + species.awareness * 0.016, 0.42, 0.72));
      }
      if (rng.next() < moveChance) {
        maybeMoveAnimal(hex, animal, hexes, speciesById);
      }
    }

    hex.carrion = Math.max(0, hex.carrion - 8);
  }
};

export const runTurn = (state: GameStateData): GameStateData => {
  const rng = createRandomSource(state.rngState);
  const turn = state.turn + 1;
  const month = (turn % TURN_PER_YEAR) + 1;
  const year = Math.floor(turn / TURN_PER_YEAR) + 1;
  const season = getSeasonByTurn(turn);
  const climateWetBias = computeCycleWetBias(turn, state.climateMoistureIndex, state.droughtDebt);
  const zoneModifier = getZoneModifier(state.climateZone, state.climateTuningLevel);
  const adjustedWetBias = climateWetBias + zoneModifier.wetBiasOffset;
  const weatherCandidate = chooseWeatherForSeason(season, adjustedWetBias, rng);
  const weather = applyWeatherPersistence(state.weather, weatherCandidate, season, adjustedWetBias, rng);

  const hexes = cloneHexState(state.hexes);

  const species = normalizeSpeciesCollection(state.species);
  const speciesById = new Map(species.map((item) => [item.id, item]));

  processPlantGrowth(hexes, season, weather, adjustedWetBias, zoneModifier);
  const floodPulseTriggered = applyExtremeRainFloodPulse(
    hexes,
    state.climateZone,
    state.climateTuningLevel,
    weather,
  );
  processWaterFlow(hexes);
  expandWaterInWetSeason(hexes, season, weather, rng);
  stabilizeWaterBodies(hexes);
  updateHydrologyBiomes(hexes);
  enforceMinimumWaterCoverage(hexes, season, weather);
  enforcePlayabilitySafeguards(hexes, season);
  processAnimals(hexes, speciesById, season, weather, rng);

  const climateMoistureIndex = computeMoistureIndex(hexes);
  const droughtPressure = climateMoistureIndex < 0.4 ? (0.4 - climateMoistureIndex) * 0.95 : -0.22;
  const droughtDebt = clamp(state.droughtDebt + droughtPressure, 0, 2.8);

  const playerSpeciesIds = new Set(species.filter((item) => item.isPlayer).map((item) => item.id));
  const previousOccupancy = new Map<string, Set<string>>();
  const currentOccupancy = new Map<string, Set<string>>();

  const addOccupancy = (target: Map<string, Set<string>>, hexList: Hex[]) => {
    for (const hex of hexList) {
      for (const animal of hex.inhabitants) {
        if (!playerSpeciesIds.has(animal.speciesId)) continue;
        const occupiedHexes = target.get(animal.speciesId) ?? new Set<string>();
        occupiedHexes.add(hex.id);
        target.set(animal.speciesId, occupiedHexes);
      }
    }
  };

  addOccupancy(previousOccupancy, state.hexes);
  addOccupancy(currentOccupancy, hexes);

  let colonizedHexes = 0;
  const colonizedBySpecies: string[] = [];
  for (const speciesId of playerSpeciesIds) {
    const before = previousOccupancy.get(speciesId) ?? new Set<string>();
    const after = currentOccupancy.get(speciesId) ?? new Set<string>();
    let speciesColonized = 0;

    for (const hexId of after) {
      if (!before.has(hexId)) speciesColonized += 1;
    }

    if (speciesColonized > 0) {
      colonizedHexes += speciesColonized;
      const speciesName = species.find((item) => item.id === speciesId)?.name ?? speciesId;
      colonizedBySpecies.push(`${speciesName} +${speciesColonized}`);
    }
  }

  const overgrazedHexes = hexes.filter(
    (hex) => hex.type !== "water" && hex.grazingPressure > 12 && hex.vegetation < 24,
  ).length;
  const overgrownHexes = hexes.filter((hex) => hex.type === "woods" && hex.vegetation > 96 && hex.grazingPressure < 2.2).length;

  const events = [...state.events];
  const driftEvent = applyGeneticDrift(species, rng);
  if (driftEvent) events.unshift(driftEvent);
  events.unshift(`Weather: ${WEATHER_LABEL[weather]} during ${season}.`);
  if (floodPulseTriggered) {
    events.unshift("Extreme rain pulse triggered major flooding.");
  }
  events.unshift(
    `Climate monitor: ${state.climateZone.toUpperCase()} L${state.climateTuningLevel} · moisture ${(climateMoistureIndex * 100).toFixed(0)}% · wet-bias ${adjustedWetBias.toFixed(2)} · drought-debt ${droughtDebt.toFixed(2)}.`,
  );
  if (colonizedBySpecies.length > 0) {
    events.unshift(`Population expansion: ${colonizedBySpecies.join(" · ")}.`);
  } else if (colonizedHexes > 0) {
    events.unshift(`Player species colonized ${colonizedHexes} new hex(es).`);
  }
  if (overgrazedHexes >= 5) {
    events.unshift(`Overgrazing alert: ${overgrazedHexes} stressed hexes are losing biomass.`);
  }
  if (overgrownHexes >= 6) {
    events.unshift(`Overgrowth pulse: ${overgrownHexes} dense woods hexes expanded.`);
  }

  return {
    ...state,
    turn,
    month,
    year,
    randomSeed: state.randomSeed,
    rngState: rng.getState(),
    season,
    weather,
    climateZone: state.climateZone,
    climateTuningLevel: state.climateTuningLevel,
    climateMoistureIndex,
    droughtDebt,
    cycleWetBias: adjustedWetBias,
    evolutionPoints: state.evolutionPoints + colonizedHexes,
    hexes,
    species,
    events: events.slice(0, 12),
  };
};

export const getSpeciesStats = (hexes: Hex[], species: Species[]): SpeciesStats[] => {
  return species.map((item) => {
    let population = 0;
    let energyTotal = 0;
    const occupied = new Set<string>();

    for (const hex of hexes) {
      const residents = hex.inhabitants.filter((animal) => animal.speciesId === item.id);
      if (residents.length > 0) occupied.add(hex.id);
      population += residents.length;
      energyTotal += residents.reduce((sum, animal) => sum + animal.energy, 0);
    }

    return {
      speciesId: item.id,
      speciesName: item.name,
      diet: item.diet,
      population,
      occupiedHexes: occupied.size,
      averageEnergy: population === 0 ? 0 : energyTotal / population,
    };
  });
};

export const mutateSpecies = (
  species: Species[],
  speciesId: string,
  mutationId: Trait,
): Species[] => {
  const mutation = MUTATION_OPTIONS.find((item) => item.id === mutationId);
  if (!mutation) return species.map((item) => normalizeSpecies(item));

  return species.map((item) => {
    if (item.id !== speciesId || item.traits.includes(mutationId)) return normalizeSpecies(item);
    return applyMutationEffect(
      {
        ...item,
        traits: [...item.traits, mutationId],
      },
      mutation.effects,
    );
  });
};

export const filterMutationsForSpecies = (diet: DietType, traits: Trait[]) => {
  return MUTATION_OPTIONS.filter((item) => item.diet === diet && !traits.includes(item.id));
};
