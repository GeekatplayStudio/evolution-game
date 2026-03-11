export type HexType = "water" | "grass" | "woods" | "desert" | "marsh";

export type Season = "spring" | "summer" | "fall" | "winter";

export type WeatherType =
  | "clear"
  | "rain"
  | "storm"
  | "drought"
  | "heatwave"
  | "cold_snap";

export type ClimateZone = "rain" | "normal" | "dry";

export type DietType = "herbivore" | "carnivore";

export type HerbivoreTrait =
  | "long_legs"
  | "big_ears"
  | "thick_fur"
  | "ruminant_stomach"
  | "high_fecundity"
  | "herd_instinct"
  | "horned_defense"
  | "sure_footing";

export type PredatorTrait =
  | "ambush_camo"
  | "pack_hunter"
  | "venomous_bite"
  | "apex_size"
  | "keen_smell"
  | "sprint_burst"
  | "crushing_jaws"
  | "scavenger_gut";

export type Trait = HerbivoreTrait | PredatorTrait;

export type AnimalSex = "male" | "female";

export interface SpeciesGenetics {
  awareness: number;
  stamina: number;
  fecundity: number;
  defense: number;
  stealth: number;
  attackPower: number;
  foragingEfficiency: number;
  heatTolerance: number;
  coldTolerance: number;
}

export interface MutationEffect extends Partial<SpeciesGenetics> {
  baseSpeed?: number;
  baseMetabolism?: number;
  maxAge?: number;
  maturityAge?: number;
  size?: number;
}

export interface Animal {
  id: string;
  speciesId: string;
  sex: AnimalSex;
  energy: number;
  age: number;
  isHungry: boolean;
  canMate: boolean;
  homeHexId?: string;
  venomCooldown?: number;
  size: number;
  aquatic: boolean;
}

export interface Hex {
  id: string;
  q: number;
  r: number;
  type: HexType;
  elevation: number;
  moisture: number;
  vegetation: number;
  saturationCapacity: number;
  carrion: number;
  grazingPressure: number;
  inhabitants: Animal[];
}

export interface Species {
  id: string;
  name: string;
  isPlayer: boolean;
  diet: DietType;
  traits: Trait[];
  baseSpeed: number;
  baseMetabolism: number;
  maxAge: number;
  maturityAge: number;
  size: number;
  aquatic: boolean;
  awareness: number;
  stamina: number;
  fecundity: number;
  defense: number;
  stealth: number;
  attackPower: number;
  foragingEfficiency: number;
  collectiveForce: number;
  heatTolerance: number;
  coldTolerance: number;
}

export interface SpeciesStats {
  speciesId: string;
  speciesName: string;
  diet: DietType;
  population: number;
  occupiedHexes: number;
  averageEnergy: number;
}

export interface MutationOption {
  id: Trait;
  name: string;
  description: string;
  plus: string;
  minus: string;
  cost: number;
  diet: DietType;
  effects: MutationEffect;
}

export interface CreatureDesignStats {
  topSpeed: number;
  maneuver: number;
  burst: number;
  foodLoad: number;
  digestion: number;
  biteForce: number;
  awareness: number;
  defense: number;
  attack: number;
  stealth: number;
  avoidance: number;
  migrationDrive: number;
  mateDrive: number;
  collectiveForce: number;
  heat: number;
  cold: number;
  longevity: number;
  fertility: number;
  populateSpeed: number;
  maturitySpeed: number;
}

export interface CreatureDesignParts {
  bodyMass: number;
  legPairs: number;
  eyePairs: number;
  earSize: number;
  mouthPower: number;
  stomachComplexity: number;
  furDensity: number;
  hornSize: number;
  tailLength: number;
  camouflage: number;
  scentPlumes: number;
}

export interface CreatureDesignSubmission {
  name: string;
  diet: DietType;
  seedPairs: number;
  stats: CreatureDesignStats;
  parts: CreatureDesignParts;
}

export interface SavedCreatureDesign extends CreatureDesignSubmission {
  id: string;
  createdAt: number;
}
