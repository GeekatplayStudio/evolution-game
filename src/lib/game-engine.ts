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
  ClimateZone,
  DietType,
  Hex,
  HexType,
  Season,
  Species,
  SpeciesStats,
  Trait,
  WeatherType,
} from "@/lib/types";

const GRID_WIDTH = 20;
const GRID_HEIGHT = 14;
const WATER_MAX = 10;

const randomId = () => Math.random().toString(36).slice(2, 10);

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

export const getSeasonByTurn = (turn: number): Season => {
  const monthIndex = turn % TURN_PER_YEAR;
  return SEASON_BY_MONTH[monthIndex];
};

const makeAnimal = (species: Species, homeHexId: string): Animal => ({
  id: randomId(),
  speciesId: species.id,
  energy: 72,
  age: 0,
  isHungry: true,
  canMate: false,
  homeHexId,
  venomCooldown: 0,
  size: species.size,
  aquatic: species.aquatic,
});

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

const chooseWeatherForSeason = (season: Season, wetBias: number): WeatherType => {
  const roll = Math.random();
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

const applyWeatherPersistence = (previous: WeatherType, candidate: WeatherType, season: Season, wetBias: number) => {
  const similarFamily =
    ((previous === "rain" || previous === "storm") && (candidate === "rain" || candidate === "storm")) ||
    ((previous === "drought" || previous === "heatwave") &&
      (candidate === "drought" || candidate === "heatwave"));

  const persistenceChance = similarFamily ? 0.46 : 0.26;
  if (Math.random() > persistenceChance) return candidate;

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

const baseSpecies: Species[] = [
  {
    id: "player-herbivore",
    name: "Player Grazer",
    isPlayer: true,
    diet: "herbivore",
    traits: ["long_legs"],
    baseSpeed: 2,
    baseMetabolism: 7,
    maxAge: 72,
    size: 1,
    aquatic: false,
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
    size: 1,
    aquatic: false,
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
    size: 1,
    aquatic: false,
  },
];

export const createInitialGameState = (config: Partial<MapSizeConfig> = {}): GameStateData => {
  const width = clamp(Math.floor(config.width ?? GRID_WIDTH), 8, 96);
  const height = clamp(Math.floor(config.height ?? GRID_HEIGHT), 8, 96);
  const hexes: Hex[] = [];
  const centerQ = (width - 1) / 2;
  const centerR = (height - 1) / 2;
  const maxDist = Math.sqrt(centerQ * centerQ + centerR * centerR);

  for (let r = 0; r < height; r += 1) {
    for (let q = 0; q < width; q += 1) {
      const dx = q - centerQ;
      const dy = r - centerR;
      const radial = Math.sqrt(dx * dx + dy * dy) / maxDist;
      const elevationNoise = smoothNoise(q * 0.85, r * 0.85, 3);
      const wetNoiseA = smoothNoise(q * 0.63, r * 0.63, 9);
      const wetNoiseB = smoothNoise(q * 1.19, r * 1.19, 21);
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
        inhabitants: [],
      });
    }
  }

  const candidateHexes = hexes.filter((hex) => hex.type !== "water");
  baseSpecies.forEach((species, index) => {
    for (let i = 0; i < 8; i += 1) {
      const home = candidateHexes[(index * 12 + i * 3) % candidateHexes.length];
      home.inhabitants.push(makeAnimal(species, home.id));
    }
  });

  return {
    turn: 0,
    month: 1,
    year: 1,
    season: "spring",
    weather: "clear",
    climateZone: "normal",
    climateTuningLevel: 3,
    climateMoistureIndex: computeMoistureIndex(hexes),
    droughtDebt: 0,
    cycleWetBias: 0,
    evolutionPoints: 0,
    hexes,
    species: baseSpecies,
    selectedHexId: null,
    selectedSpeciesId: "player-herbivore",
    events: ["Simulation started. Stable clear weather."],
  };
};

const herbivoreIntake = (hex: Hex, traits: Trait[]) => {
  const canEatWoods = traits.includes("ruminant_stomach");
  if (hex.type === "woods" && !canEatWoods) return 0;
  const amount = Math.min(12, hex.vegetation);
  hex.vegetation -= amount;
  return amount;
};

const attemptPredation = (hex: Hex, predator: Animal, speciesById: Map<string, Species>) => {
  const predatorSpecies = speciesById.get(predator.speciesId);
  if (!predatorSpecies || predatorSpecies.diet !== "carnivore") return false;
  if ((predator.venomCooldown ?? 0) > 0) return false;

  const prey = hex.inhabitants.find((animal) => {
    const preySpecies = speciesById.get(animal.speciesId);
    if (!preySpecies || preySpecies.diet !== "herbivore") return false;
    if (predatorSpecies.traits.includes("venomous_bite")) return true;
    return animal.size <= predator.size;
  });

  if (!prey) return false;

  let killChance = 0.45;
  if (predatorSpecies.traits.includes("ambush_camo") && hex.type === "woods") killChance += 0.2;
  if (predatorSpecies.traits.includes("ambush_camo") && hex.type === "grass") killChance -= 0.2;
  if (predatorSpecies.traits.includes("pack_hunter")) {
    const allies = hex.inhabitants.filter((animal) => animal.speciesId === predator.speciesId).length;
    killChance += Math.max(0, allies - 1) * 0.1;
  }

  const escaped = Math.random() < (speciesById.get(prey.speciesId)?.traits.includes("long_legs") ? 0.2 : 0);
  if (escaped) return false;
  if (Math.random() > killChance) return false;

  hex.inhabitants = hex.inhabitants.filter((animal) => animal.id !== prey.id);
  const energyGain = predatorSpecies.traits.includes("pack_hunter") ? 24 : 35;
  predator.energy += energyGain;

  if (predator.energy > 100) {
    hex.carrion += predator.energy - 100;
    predator.energy = 100;
  }

  if (predatorSpecies.traits.includes("venomous_bite")) {
    predator.venomCooldown = 2;
  }

  return true;
};

const applyGeneticDrift = (species: Species[]): string | null => {
  if (Math.random() > 0.12) return null;
  const wildSpecies = species.filter((item) => !item.isPlayer);
  if (wildSpecies.length === 0) return null;

  const target = wildSpecies[Math.floor(Math.random() * wildSpecies.length)];
  const options = MUTATION_OPTIONS.filter(
    (mutation) => mutation.diet === target.diet && !target.traits.includes(mutation.id),
  );
  if (options.length === 0) return null;

  const mutation = options[Math.floor(Math.random() * options.length)];
  target.traits = [...target.traits, mutation.id];
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
            neighbor.inhabitants = neighbor.inhabitants.filter((animal) => animal.aquatic);
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
      group[0].moisture = Math.max(0, group[0].moisture - 0.55);
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
        if (waterHex.moisture > 1.7) continue;
        waterHex.type = waterHex.elevation <= 3 ? "grass" : "desert";
        waterHex.vegetation = clamp(waterHex.vegetation + 5, 0, 120);
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

const expandWaterInWetSeason = (hexes: Hex[], season: Season, weather: WeatherType) => {
  const isWetPeriod = season === "spring" || weather === "rain" || weather === "storm";
  if (!isWetPeriod) return;

  const expansionAttempts = weather === "storm" ? 4 : weather === "rain" ? 3 : 2;
  const waterHexes = hexes.filter((hex) => WATER_NEIGHBOR_TYPES.includes(hex.type));
  if (waterHexes.length === 0) return;

  for (let i = 0; i < expansionAttempts; i += 1) {
    const source = waterHexes[Math.floor(Math.random() * waterHexes.length)];
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
    if (hex.type === "water" && hex.moisture < 3.5) {
      hex.type = hex.elevation <= 3 ? "grass" : "desert";
      hex.vegetation = clamp(hex.vegetation + 8, 0, 120);
    }

    if (hex.type === "marsh" && hex.moisture < 2.6) {
      hex.type = hex.elevation <= 3 ? "grass" : "desert";
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

    const base = BIOMASS_GROWTH_BY_TYPE[hex.type];
    const evaporationBase =
      SEASON_EVAPORATION[season] * weatherFx.evaporation * zoneModifier.evaporationMultiplier;
    const rainfallBase = (weatherFx.rainfall + cycleRainBoost) * zoneModifier.rainfallMultiplier;

    if (hex.type === "water" || hex.type === "marsh") {
      const waterRainGain = rainfallBase * 1.25;
      const waterEvapLoss = evaporationBase * clamp(1.1 - cycleWetBias * 0.14, 0.82, 1.26);
      hex.moisture = Math.max(0, hex.moisture + waterRainGain - waterEvapLoss + seasonalBias);
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
      const stress = hex.moisture < soil.wiltingPoint ? (soil.wiltingPoint - hex.moisture) * 2.2 : 0;

      hex.vegetation = clamp(
        hex.vegetation + (logisticGrowth + establishment) * zoneModifier.biomassMultiplier - stress,
        0,
        120,
      );

      if (hex.vegetation < 2 && moistureNormalized > 0.62) {
        hex.vegetation = clamp(hex.vegetation + 0.6, 0, 120);
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

const maybeMoveAnimal = (hex: Hex, animal: Animal, hexes: Hex[]) => {
  const nearby = getNeighborHexes(hexes, hex);
  if (nearby.length === 0) return;

  let target: Hex | undefined;
  if (animal.homeHexId) {
    target = nearby.find((neighbor) => neighbor.id === animal.homeHexId);
  }

  if (!target) {
    target = nearby
      .filter((neighbor) => neighbor.type !== "water")
      .sort((a, b) => b.vegetation - a.vegetation)[0];
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
) => {
  for (const hex of hexes) {
    const animals = [...hex.inhabitants];

    for (const animal of animals) {
      const species = speciesById.get(animal.speciesId);
      if (!species) continue;

      animal.age += 1;
      animal.energy -= species.baseMetabolism;
      if (species.traits.includes("long_legs")) animal.energy -= 1;
      if (species.traits.includes("apex_size")) animal.energy -= 2;

      if (species.traits.includes("thick_fur") && (hex.type === "desert" || season === "summer")) {
        animal.energy -= 2;
      }

      if (weather === "heatwave" && !species.traits.includes("thick_fur")) {
        animal.energy -= 1.2;
      }

      if (weather === "cold_snap" && !species.traits.includes("thick_fur")) {
        animal.energy -= 1.1;
      }

      if ((animal.venomCooldown ?? 0) > 0) {
        animal.venomCooldown = (animal.venomCooldown ?? 0) - 1;
      }

      if (species.diet === "herbivore") {
        animal.energy += herbivoreIntake(hex, species.traits);
      } else {
        const hunted = attemptPredation(hex, animal, speciesById);
        if (!hunted && hex.carrion > 0) {
          const eatenCarrion = Math.min(15, hex.carrion);
          hex.carrion -= eatenCarrion;
          animal.energy += eatenCarrion;
        }
      }

      animal.energy = Math.min(100, animal.energy);
      animal.isHungry = animal.energy < 45;
      animal.canMate = animal.energy > 80;

      if (animal.energy <= 0 || animal.age >= species.maxAge) {
        hex.inhabitants = hex.inhabitants.filter((item) => item.id !== animal.id);
        continue;
      }

      if (animal.canMate && Math.random() < 0.16) {
        const offspringCount = species.traits.includes("high_fecundity") ? 2 : 1;
        for (let i = 0; i < offspringCount; i += 1) {
          const baby = makeAnimal(species, hex.id);
          baby.energy = species.traits.includes("high_fecundity") ? 35 : 55;
          hex.inhabitants.push(baby);
          animal.energy -= 18;
        }
      }

      if (animal.isHungry && Math.random() < 0.4) {
        maybeMoveAnimal(hex, animal, hexes);
      }
    }

    hex.carrion = Math.max(0, hex.carrion - 8);
  }
};

export const runTurn = (state: GameStateData): GameStateData => {
  const turn = state.turn + 1;
  const month = (turn % TURN_PER_YEAR) + 1;
  const year = Math.floor(turn / TURN_PER_YEAR) + 1;
  const season = getSeasonByTurn(turn);
  const climateWetBias = computeCycleWetBias(turn, state.climateMoistureIndex, state.droughtDebt);
  const zoneModifier = getZoneModifier(state.climateZone, state.climateTuningLevel);
  const adjustedWetBias = climateWetBias + zoneModifier.wetBiasOffset;
  const weatherCandidate = chooseWeatherForSeason(season, adjustedWetBias);
  const weather = applyWeatherPersistence(state.weather, weatherCandidate, season, adjustedWetBias);

  const hexes = state.hexes.map((hex) => ({
    ...hex,
    inhabitants: hex.inhabitants.map((animal) => ({ ...animal })),
  }));

  const species = state.species.map((item) => ({ ...item, traits: [...item.traits] }));
  const speciesById = new Map(species.map((item) => [item.id, item]));

  processPlantGrowth(hexes, season, weather, adjustedWetBias, zoneModifier);
  const floodPulseTriggered = applyExtremeRainFloodPulse(
    hexes,
    state.climateZone,
    state.climateTuningLevel,
    weather,
  );
  processWaterFlow(hexes);
  expandWaterInWetSeason(hexes, season, weather);
  stabilizeWaterBodies(hexes);
  updateHydrologyBiomes(hexes);
  enforceMinimumWaterCoverage(hexes, season, weather);
  enforcePlayabilitySafeguards(hexes, season);
  processAnimals(hexes, speciesById, season, weather);

  const climateMoistureIndex = computeMoistureIndex(hexes);
  const droughtPressure = climateMoistureIndex < 0.4 ? (0.4 - climateMoistureIndex) * 0.95 : -0.22;
  const droughtDebt = clamp(state.droughtDebt + droughtPressure, 0, 2.8);

  let colonizedHexes = 0;
  for (const hex of hexes) {
    const hasPlayer = hex.inhabitants.some((animal) => animal.speciesId === "player-herbivore");
    if (hasPlayer && !state.hexes.find((oldHex) => oldHex.id === hex.id)?.inhabitants.some((a) => a.speciesId === "player-herbivore")) {
      colonizedHexes += 1;
    }
  }

  const events = [...state.events];
  const driftEvent = applyGeneticDrift(species);
  if (driftEvent) events.unshift(driftEvent);
  events.unshift(`Weather: ${WEATHER_LABEL[weather]} during ${season}.`);
  if (floodPulseTriggered) {
    events.unshift("Extreme rain pulse triggered major flooding.");
  }
  events.unshift(
    `Climate monitor: ${state.climateZone.toUpperCase()} L${state.climateTuningLevel} · moisture ${(climateMoistureIndex * 100).toFixed(0)}% · wet-bias ${adjustedWetBias.toFixed(2)} · drought-debt ${droughtDebt.toFixed(2)}.`,
  );
  if (colonizedHexes > 0) events.unshift(`Player species colonized ${colonizedHexes} new hex(es).`);

  return {
    ...state,
    turn,
    month,
    year,
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
  return species.map((item) => {
    if (item.id !== speciesId || item.traits.includes(mutationId)) return item;
    return {
      ...item,
      traits: [...item.traits, mutationId],
    };
  });
};

export const filterMutationsForSpecies = (diet: DietType, traits: Trait[]) => {
  return MUTATION_OPTIONS.filter((item) => item.diet === diet && !traits.includes(item.id));
};
