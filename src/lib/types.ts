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
  | "high_fecundity";

export type PredatorTrait =
  | "ambush_camo"
  | "pack_hunter"
  | "venomous_bite"
  | "apex_size";

export type Trait = HerbivoreTrait | PredatorTrait;

export interface Animal {
  id: string;
  speciesId: string;
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
  size: number;
  aquatic: boolean;
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
}
