import { MutationOption, Season } from "@/lib/types";

export const TURN_PER_YEAR = 12;

export const SEASON_BY_MONTH: Season[] = [
  "spring",
  "spring",
  "spring",
  "summer",
  "summer",
  "summer",
  "fall",
  "fall",
  "fall",
  "winter",
  "winter",
  "winter",
];

export const BIOMASS_GROWTH_BY_TYPE = {
  water: 0,
  grass: 7,
  woods: 5,
  desert: 2,
  marsh: 9,
} as const;

export const SEASON_GROWTH_MULTIPLIER: Record<Season, number> = {
  spring: 1.4,
  summer: 1.2,
  fall: 0.9,
  winter: 0.4,
};

export const SEASON_EVAPORATION: Record<Season, number> = {
  spring: 0.8,
  summer: 1.3,
  fall: 0.7,
  winter: 0.3,
};

export const HEX_COLORS = {
  water: "#2563eb",
  grass: "#16a34a",
  woods: "#166534",
  desert: "#eab308",
  marsh: "#15803d",
} as const;

export const MUTATION_OPTIONS: MutationOption[] = [
  {
    id: "long_legs",
    name: "Long Legs",
    description: "Escape-focused morphology.",
    plus: "+20% escape chance from predators.",
    minus: "+15% food consumption.",
    cost: 2,
    diet: "herbivore",
  },
  {
    id: "big_ears",
    name: "Big Ears",
    description: "Early predator detection.",
    plus: "Detects predators 2 hexes away.",
    minus: "+10% chance to be spotted.",
    cost: 2,
    diet: "herbivore",
  },
  {
    id: "thick_fur",
    name: "Thick Fur",
    description: "Cold-weather adaptation.",
    plus: "Survival bonus in winter.",
    minus: "Rapid energy loss in summer/desert.",
    cost: 2,
    diet: "herbivore",
  },
  {
    id: "ruminant_stomach",
    name: "Ruminant Stomach",
    description: "Digest bark/twigs from woods.",
    plus: "Can consume woods biomass.",
    minus: "Moves 1 hex slower.",
    cost: 3,
    diet: "herbivore",
  },
  {
    id: "high_fecundity",
    name: "High Fecundity",
    description: "More offspring per reproduction event.",
    plus: "Produces 2 offspring.",
    minus: "Offspring start with 50% energy.",
    cost: 3,
    diet: "herbivore",
  },
  {
    id: "ambush_camo",
    name: "Ambush Camo",
    description: "Stealth hunting in woods.",
    plus: "Hidden in woods hexes.",
    minus: "-50% catch rate in grass.",
    cost: 2,
    diet: "carnivore",
  },
  {
    id: "pack_hunter",
    name: "Pack Hunter",
    description: "Cooperative hunting behavior.",
    plus: "+10% kill chance per ally.",
    minus: "Requires 2x total biomass.",
    cost: 3,
    diet: "carnivore",
  },
  {
    id: "venomous_bite",
    name: "Venomous Bite",
    description: "Take down larger prey.",
    plus: "Can kill larger prey.",
    minus: "2-turn cooldown after a kill.",
    cost: 3,
    diet: "carnivore",
  },
  {
    id: "apex_size",
    name: "Apex Size",
    description: "Top-of-chain body plan.",
    plus: "Cannot be killed by other predators.",
    minus: "Slow and starves 20% faster.",
    cost: 4,
    diet: "carnivore",
  },
];
