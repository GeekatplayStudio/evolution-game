"use client";

import { useEffect, useId, useMemo, useState } from "react";
import eyeTextureOne from "@/assets/components/eye_1.png";
import eyeTextureTwo from "@/assets/components/eye_2.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatureDesignParts, CreatureDesignStats, CreatureDesignSubmission, DietType } from "@/lib/types";
import { cn } from "@/lib/utils";

type CreatureRole = DietType;

type DesignerPartId =
  | "bodyMass"
  | "legPairs"
  | "tailLength"
  | "eyePairs"
  | "earSize"
  | "mouthPower"
  | "stomachComplexity"
  | "furDensity"
  | "hornSize"
  | "camouflage"
  | "scentPlumes";

type DesignerTuningId =
  | "runningFocus"
  | "avoidanceFocus"
  | "migrationFocus"
  | "mateFocus"
  | "collectiveForce"
  | "populateSpeed"
  | "maturitySpeed"
  | "longevityFocus";

type DesignerParts = CreatureDesignParts;

interface DesignerTuning {
  runningFocus: number;
  avoidanceFocus: number;
  migrationFocus: number;
  mateFocus: number;
  collectiveForce: number;
  populateSpeed: number;
  maturitySpeed: number;
  longevityFocus: number;
}

type StatKey =
  | "topSpeed"
  | "maneuver"
  | "burst"
  | "foodLoad"
  | "digestion"
  | "biteForce"
  | "awareness"
  | "defense"
  | "attack"
  | "stealth"
  | "avoidance"
  | "migrationDrive"
  | "mateDrive"
  | "collectiveForce"
  | "heat"
  | "cold"
  | "longevity"
  | "fertility"
  | "populateSpeed"
  | "maturitySpeed";

type CreatureStatBlock = CreatureDesignStats;

interface DesignerPartBlueprint {
  id: DesignerPartId;
  label: string;
  description: string;
  min: number;
  max: number;
  defaultValue: number;
  stepCost: number;
}

interface DesignerTuningBlueprint {
  id: DesignerTuningId;
  label: string;
  description: string;
  min: number;
  max: number;
  defaultValue: number;
  stepCost: number;
}

interface StatMeta {
  key: StatKey;
  label: string;
  max: number;
  tone: "cyan" | "emerald" | "amber";
  lowIsGood?: boolean;
}

const CONTROL_SCALE = 10;
const DESIGN_POINT_BUDGET = 300;
const MAX_SEED_PAIRS = 8;

const DEFAULT_PARTS: DesignerParts = {
  bodyMass: 10,
  legPairs: 10,
  tailLength: 10,
  eyePairs: 10,
  earSize: 10,
  mouthPower: 10,
  stomachComplexity: 10,
  furDensity: 0,
  hornSize: 0,
  camouflage: 0,
  scentPlumes: 0,
};

const DEFAULT_TUNING: DesignerTuning = {
  runningFocus: 30,
  avoidanceFocus: 30,
  migrationFocus: 30,
  mateFocus: 30,
  collectiveForce: 30,
  populateSpeed: 30,
  maturitySpeed: 30,
  longevityFocus: 30,
};

const BASE_STATS_BY_ROLE: Record<CreatureRole, CreatureStatBlock> = {
  herbivore: {
    topSpeed: 5.2,
    maneuver: 5.3,
    burst: 4.6,
    foodLoad: 3.4,
    digestion: 5.8,
    biteForce: 2.3,
    awareness: 5.4,
    defense: 3.5,
    attack: 2.1,
    stealth: 3.5,
    avoidance: 5.5,
    migrationDrive: 5.2,
    mateDrive: 5.4,
    collectiveForce: 5.8,
    heat: 4.8,
    cold: 4.2,
    longevity: 5.1,
    fertility: 5.8,
    populateSpeed: 5.6,
    maturitySpeed: 5.1,
  },
  carnivore: {
    topSpeed: 5,
    maneuver: 4.8,
    burst: 5.5,
    foodLoad: 4.3,
    digestion: 5.3,
    biteForce: 5.9,
    awareness: 5,
    defense: 4,
    attack: 6,
    stealth: 5.1,
    avoidance: 4.6,
    migrationDrive: 5,
    mateDrive: 4.4,
    collectiveForce: 4.8,
    heat: 4.6,
    cold: 4.4,
    longevity: 4.9,
    fertility: 3.7,
    populateSpeed: 3.8,
    maturitySpeed: 4.2,
  },
};

const PART_BLUEPRINTS: DesignerPartBlueprint[] = [
  {
    id: "bodyMass",
    label: "Body Mass",
    description: "Heavier frame: stronger defense and impact, higher food demand.",
    min: 10,
    max: 50,
    defaultValue: 10,
    stepCost: 2,
  },
  {
    id: "legPairs",
    label: "Leg Pairs",
    description: "More legs boost sustained speed but reduce handling and acceleration.",
    min: 10,
    max: 50,
    defaultValue: 10,
    stepCost: 2,
  },
  {
    id: "tailLength",
    label: "Tail",
    description: "Longer tail stabilizes turns and improves escape control.",
    min: 10,
    max: 50,
    defaultValue: 10,
    stepCost: 1,
  },
  {
    id: "eyePairs",
    label: "Eyes",
    description: "Extra eye pairs increase awareness, but add visibility and upkeep.",
    min: 10,
    max: 50,
    defaultValue: 10,
    stepCost: 1,
  },
  {
    id: "earSize",
    label: "Ears",
    description: "Bigger ears improve threat detection and avoidance responses.",
    min: 10,
    max: 50,
    defaultValue: 10,
    stepCost: 1,
  },
  {
    id: "mouthPower",
    label: "Mouth / Jaw",
    description: "Stronger jaw improves bite and attack, but raises energy demand.",
    min: 10,
    max: 50,
    defaultValue: 10,
    stepCost: 2,
  },
  {
    id: "stomachComplexity",
    label: "Stomach",
    description: "Complex digestion lowers food pressure and supports faster breeding.",
    min: 10,
    max: 50,
    defaultValue: 10,
    stepCost: 2,
  },
  {
    id: "furDensity",
    label: "Fur",
    description: "Dense fur helps in cold climates but hurts heat performance.",
    min: 0,
    max: 50,
    defaultValue: 0,
    stepCost: 1,
  },
  {
    id: "hornSize",
    label: "Horns",
    description: "Horn growth boosts defense and close combat at movement cost.",
    min: 0,
    max: 50,
    defaultValue: 0,
    stepCost: 2,
  },
  {
    id: "camouflage",
    label: "Camouflage",
    description: "Camo pattern raises stealth and avoidance in mixed terrain.",
    min: 0,
    max: 50,
    defaultValue: 0,
    stepCost: 2,
  },
  {
    id: "scentPlumes",
    label: "Smell",
    description: "Scent organs improve tracking and awareness with upkeep tradeoff.",
    min: 0,
    max: 50,
    defaultValue: 0,
    stepCost: 1,
  },
];

const TUNING_BLUEPRINTS: DesignerTuningBlueprint[] = [
  {
    id: "runningFocus",
    label: "Running Focus",
    description: "Push speed and burst at the cost of control and energy.",
    min: 10,
    max: 50,
    defaultValue: 30,
    stepCost: 1,
  },
  {
    id: "avoidanceFocus",
    label: "Avoidance Focus",
    description: "Shift into evasion behavior and better escape timing.",
    min: 10,
    max: 50,
    defaultValue: 30,
    stepCost: 1,
  },
  {
    id: "migrationFocus",
    label: "Migration Focus",
    description: "Drives roaming into neighboring hexes for prey, mates, and richer food.",
    min: 10,
    max: 50,
    defaultValue: 30,
    stepCost: 1,
  },
  {
    id: "mateFocus",
    label: "Mate Focus",
    description: "Increases active partner-seeking and breeding pressure.",
    min: 10,
    max: 50,
    defaultValue: 30,
    stepCost: 1,
  },
  {
    id: "collectiveForce",
    label: "Collective Force",
    description: "Group cohesion and social hierarchy. Higher values favor pack/herd living and larger local groups.",
    min: 10,
    max: 50,
    defaultValue: 30,
    stepCost: 2,
  },
  {
    id: "populateSpeed",
    label: "Population Speed",
    description: "Faster population growth, with higher energy and fragility pressure.",
    min: 10,
    max: 50,
    defaultValue: 30,
    stepCost: 2,
  },
  {
    id: "maturitySpeed",
    label: "Maturity Speed",
    description: "Reach reproductive age sooner, with less durable adults.",
    min: 10,
    max: 50,
    defaultValue: 30,
    stepCost: 2,
  },
  {
    id: "longevityFocus",
    label: "Longevity Focus",
    description: "Raises lifespan potential but slows early life performance.",
    min: 10,
    max: 50,
    defaultValue: 30,
    stepCost: 2,
  },
];

const STAT_META: StatMeta[] = [
  { key: "topSpeed", label: "Running", max: 10, tone: "cyan" },
  { key: "maneuver", label: "Maneuver", max: 10, tone: "cyan" },
  { key: "burst", label: "Acceleration", max: 10, tone: "cyan" },
  { key: "foodLoad", label: "Food Load", max: 10, tone: "amber", lowIsGood: true },
  { key: "digestion", label: "Digestion", max: 10, tone: "emerald" },
  { key: "biteForce", label: "Bite Force", max: 10, tone: "amber" },
  { key: "awareness", label: "Awareness", max: 10, tone: "emerald" },
  { key: "defense", label: "Defense", max: 10, tone: "emerald" },
  { key: "attack", label: "Attack", max: 10, tone: "amber" },
  { key: "stealth", label: "Stealth", max: 10, tone: "emerald" },
  { key: "avoidance", label: "Avoidance", max: 10, tone: "cyan" },
  { key: "migrationDrive", label: "Migration", max: 10, tone: "cyan" },
  { key: "mateDrive", label: "Mate Drive", max: 10, tone: "emerald" },
  { key: "collectiveForce", label: "Collective", max: 10, tone: "emerald" },
  { key: "heat", label: "Heat", max: 10, tone: "amber" },
  { key: "cold", label: "Cold", max: 10, tone: "cyan" },
  { key: "longevity", label: "Longevity", max: 10, tone: "emerald" },
  { key: "fertility", label: "Fertility", max: 10, tone: "emerald" },
  { key: "populateSpeed", label: "Populate Speed", max: 10, tone: "emerald" },
  { key: "maturitySpeed", label: "Maturity Speed", max: 10, tone: "emerald" },
];

const clampStat = (value: number) => Math.max(0.5, Math.min(10, value));
const EYE_TEXTURES = [eyeTextureOne.src, eyeTextureTwo.src, "/assets/components/eye_3.png"] as const;

const pseudoRandom = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const toModelValue = (value: number) => value / CONTROL_SCALE;

const toModelParts = (parts: DesignerParts): CreatureDesignParts => ({
  bodyMass: toModelValue(parts.bodyMass),
  legPairs: toModelValue(parts.legPairs),
  tailLength: toModelValue(parts.tailLength),
  eyePairs: toModelValue(parts.eyePairs),
  earSize: toModelValue(parts.earSize),
  mouthPower: toModelValue(parts.mouthPower),
  stomachComplexity: toModelValue(parts.stomachComplexity),
  furDensity: toModelValue(parts.furDensity),
  hornSize: toModelValue(parts.hornSize),
  camouflage: toModelValue(parts.camouflage),
  scentPlumes: toModelValue(parts.scentPlumes),
});

const toModelTuning = (tuning: DesignerTuning): DesignerTuning => ({
  runningFocus: toModelValue(tuning.runningFocus),
  avoidanceFocus: toModelValue(tuning.avoidanceFocus),
  migrationFocus: toModelValue(tuning.migrationFocus),
  mateFocus: toModelValue(tuning.mateFocus),
  collectiveForce: toModelValue(tuning.collectiveForce),
  populateSpeed: toModelValue(tuning.populateSpeed),
  maturitySpeed: toModelValue(tuning.maturitySpeed),
  longevityFocus: toModelValue(tuning.longevityFocus),
});

const getPartSpend = (parts: DesignerParts) =>
  PART_BLUEPRINTS.reduce((total, part) => total + Math.max(0, parts[part.id] - part.defaultValue) * part.stepCost, 0);

const getTuningSpend = (tuning: DesignerTuning) =>
  TUNING_BLUEPRINTS.reduce(
    (total, tune) => total + Math.abs(tuning[tune.id] - tune.defaultValue) * tune.stepCost,
    0,
  );

const getSeedSpend = (seedPairs: number) => Math.max(0, seedPairs - 1) * 2;

const buildStats = (role: CreatureRole, parts: DesignerParts, tuning: DesignerTuning): CreatureStatBlock => {
  const modelParts = toModelParts(parts);
  const modelTuning = toModelTuning(tuning);
  const modelDefaultParts = toModelParts(DEFAULT_PARTS);
  const modelDefaultTuning = toModelTuning(DEFAULT_TUNING);
  const next = { ...BASE_STATS_BY_ROLE[role] };
  const bodyMassDelta = modelParts.bodyMass - modelDefaultParts.bodyMass;
  const legPairsDelta = modelParts.legPairs - modelDefaultParts.legPairs;
  const tailLengthDelta = modelParts.tailLength - modelDefaultParts.tailLength;
  const eyePairsDelta = modelParts.eyePairs - modelDefaultParts.eyePairs;
  const earSizeDelta = modelParts.earSize - modelDefaultParts.earSize;
  const mouthDelta = modelParts.mouthPower - modelDefaultParts.mouthPower;
  const stomachDelta = modelParts.stomachComplexity - modelDefaultParts.stomachComplexity;

  next.defense += bodyMassDelta * 1.25;
  next.attack += bodyMassDelta * 0.55;
  next.biteForce += bodyMassDelta * 0.5;
  next.cold += bodyMassDelta * 0.8;
  next.topSpeed -= bodyMassDelta * 0.45;
  next.burst -= bodyMassDelta * 0.75;
  next.maneuver -= bodyMassDelta * 0.35;
  next.foodLoad += bodyMassDelta * 1.05;
  next.maturitySpeed -= bodyMassDelta * 0.35;
  next.populateSpeed -= bodyMassDelta * 0.2;

  next.topSpeed += legPairsDelta * 1.05;
  next.maneuver -= legPairsDelta * 0.68;
  next.burst -= legPairsDelta * 0.55;
  next.foodLoad += legPairsDelta * 0.9;
  next.defense += legPairsDelta * 0.2;
  next.avoidance -= legPairsDelta * 0.2;

  next.maneuver += tailLengthDelta * 0.95;
  next.burst += tailLengthDelta * 0.22;
  next.avoidance += tailLengthDelta * 0.4;
  next.foodLoad += tailLengthDelta * 0.15;

  next.awareness += eyePairsDelta * 1;
  next.attack += eyePairsDelta * 0.2;
  next.avoidance += eyePairsDelta * 0.32;
  next.stealth -= eyePairsDelta * 0.25;
  next.foodLoad += eyePairsDelta * 0.2;

  next.awareness += earSizeDelta * 0.9;
  next.avoidance += earSizeDelta * 0.65;
  next.maneuver += earSizeDelta * 0.18;
  next.topSpeed -= earSizeDelta * 0.2;
  next.foodLoad += earSizeDelta * 0.18;

  next.biteForce += mouthDelta * 1.4;
  next.attack += mouthDelta * 1.05;
  next.digestion += mouthDelta * 0.2;
  next.foodLoad += mouthDelta * 0.35;
  next.stealth -= mouthDelta * 0.08;

  next.digestion += stomachDelta * 1.45;
  next.foodLoad -= stomachDelta * 1.05;
  next.fertility += stomachDelta * 0.25;
  next.populateSpeed += stomachDelta * 0.2;
  next.topSpeed -= stomachDelta * 0.12;
  next.maturitySpeed -= stomachDelta * 0.3;
  next.maneuver -= stomachDelta * 0.1;

  next.cold += modelParts.furDensity * 1.35;
  next.defense += modelParts.furDensity * 0.28;
  next.heat -= modelParts.furDensity * 1.02;
  next.foodLoad += modelParts.furDensity * 0.4;
  next.topSpeed -= modelParts.furDensity * 0.14;
  next.stealth += modelParts.furDensity * 0.12;

  next.defense += modelParts.hornSize * 1.15;
  next.attack += modelParts.hornSize * 0.92;
  next.biteForce += modelParts.hornSize * 0.32;
  next.topSpeed -= modelParts.hornSize * 0.28;
  next.maneuver -= modelParts.hornSize * 0.28;
  next.foodLoad += modelParts.hornSize * 0.35;
  next.avoidance -= modelParts.hornSize * 0.18;

  next.stealth += modelParts.camouflage * 1.12;
  next.avoidance += modelParts.camouflage * 0.45;
  next.awareness += modelParts.camouflage * 0.15;
  next.topSpeed -= modelParts.camouflage * 0.16;

  next.awareness += modelParts.scentPlumes * 0.7;
  next.attack += modelParts.scentPlumes * 0.18;
  next.foodLoad += modelParts.scentPlumes * 0.3;
  next.stealth -= modelParts.scentPlumes * 0.18;
  next.avoidance += modelParts.scentPlumes * 0.2;

  next.migrationDrive +=
    legPairsDelta * 0.52 +
    tailLengthDelta * 0.58 -
    bodyMassDelta * 0.3 +
    modelParts.scentPlumes * 0.12 +
    modelParts.camouflage * 0.1;
  next.mateDrive +=
    modelParts.scentPlumes * 0.66 +
    eyePairsDelta * 0.34 +
    earSizeDelta * 0.38 -
    bodyMassDelta * 0.14;
  next.collectiveForce +=
    modelParts.earSize * 0.18 +
    modelParts.scentPlumes * 0.2 +
    modelParts.eyePairs * 0.12 +
    modelParts.bodyMass * 0.08;
  next.longevity += stomachDelta * 0.42 + modelParts.furDensity * 0.22 + bodyMassDelta * 0.18;

  const runningDelta = modelTuning.runningFocus - modelDefaultTuning.runningFocus;
  const avoidanceDelta = modelTuning.avoidanceFocus - modelDefaultTuning.avoidanceFocus;
  const migrationDelta = modelTuning.migrationFocus - modelDefaultTuning.migrationFocus;
  const mateDelta = modelTuning.mateFocus - modelDefaultTuning.mateFocus;
  const collectiveDelta = modelTuning.collectiveForce - modelDefaultTuning.collectiveForce;
  const populateDelta = modelTuning.populateSpeed - modelDefaultTuning.populateSpeed;
  const maturityDelta = modelTuning.maturitySpeed - modelDefaultTuning.maturitySpeed;
  const longevityDelta = modelTuning.longevityFocus - modelDefaultTuning.longevityFocus;

  next.topSpeed += runningDelta * 0.92;
  next.burst += runningDelta * 0.7;
  next.foodLoad += runningDelta * 0.55;
  next.maneuver -= runningDelta * 0.33;
  next.avoidance -= runningDelta * 0.12;

  next.avoidance += avoidanceDelta * 1.08;
  next.maneuver += avoidanceDelta * 0.58;
  next.stealth += avoidanceDelta * 0.5;
  next.topSpeed -= avoidanceDelta * 0.22;
  next.biteForce -= avoidanceDelta * 0.2;

  next.populateSpeed += populateDelta * 1.24;
  next.fertility += populateDelta * 0.82;
  next.mateDrive += populateDelta * 0.3;
  next.foodLoad += populateDelta * 0.58;
  next.defense -= populateDelta * 0.25;
  next.maturitySpeed += populateDelta * 0.32;

  next.maturitySpeed += maturityDelta * 1.28;
  next.populateSpeed += maturityDelta * 0.36;
  next.mateDrive += maturityDelta * 0.26;
  next.defense -= maturityDelta * 0.32;
  next.biteForce -= maturityDelta * 0.16;
  next.foodLoad += maturityDelta * 0.24;

  next.migrationDrive += migrationDelta * 1.2;
  next.awareness += migrationDelta * 0.48;
  next.topSpeed += migrationDelta * 0.35;
  next.foodLoad += migrationDelta * 0.36;
  next.stealth -= migrationDelta * 0.18;

  next.mateDrive += mateDelta * 1.25;
  next.fertility += mateDelta * 0.74;
  next.populateSpeed += mateDelta * 0.52;
  next.awareness += mateDelta * 0.22;
  next.foodLoad += mateDelta * 0.4;
  next.defense -= mateDelta * 0.18;

  next.collectiveForce += collectiveDelta * 1.42;
  next.fertility += collectiveDelta * 0.44;
  next.populateSpeed += collectiveDelta * 0.32;
  next.mateDrive += collectiveDelta * 0.68;
  next.defense += collectiveDelta * 0.22;
  next.stealth -= collectiveDelta * 0.14;
  next.foodLoad += collectiveDelta * 0.2;

  next.longevity += longevityDelta * 1.38;
  next.defense += longevityDelta * 0.34;
  next.maturitySpeed -= longevityDelta * 0.34;
  next.populateSpeed -= longevityDelta * 0.24;
  next.topSpeed -= longevityDelta * 0.2;
  next.foodLoad += longevityDelta * 0.28;

  if (role === "carnivore") {
    next.attack += 0.8;
    next.biteForce += 0.9;
    next.stealth += 0.3;
    next.migrationDrive += 0.34;
    next.mateDrive -= 0.36;
    next.collectiveForce += 0.18;
    next.foodLoad += 0.6;
    next.digestion += 0.2;
    next.longevity -= 0.18;
    next.fertility -= 0.9;
    next.populateSpeed -= 0.7;
    next.avoidance -= 0.25;
  } else {
    next.digestion += 0.5;
    next.migrationDrive += 0.16;
    next.mateDrive += 0.28;
    next.collectiveForce += 0.38;
    next.fertility += 0.65;
    next.populateSpeed += 0.45;
    next.longevity += 0.22;
    next.avoidance += 0.25;
    next.biteForce -= 0.5;
  }

  return {
    topSpeed: clampStat(next.topSpeed),
    maneuver: clampStat(next.maneuver),
    burst: clampStat(next.burst),
    foodLoad: clampStat(next.foodLoad),
    digestion: clampStat(next.digestion),
    biteForce: clampStat(next.biteForce),
    awareness: clampStat(next.awareness),
    defense: clampStat(next.defense),
    attack: clampStat(next.attack),
    stealth: clampStat(next.stealth),
    avoidance: clampStat(next.avoidance),
    migrationDrive: clampStat(next.migrationDrive),
    mateDrive: clampStat(next.mateDrive),
    collectiveForce: clampStat(next.collectiveForce),
    heat: clampStat(next.heat),
    cold: clampStat(next.cold),
    longevity: clampStat(next.longevity),
    fertility: clampStat(next.fertility),
    populateSpeed: clampStat(next.populateSpeed),
    maturitySpeed: clampStat(next.maturitySpeed),
  };
};

const getStrengthTags = (stats: CreatureStatBlock) =>
  [...STAT_META]
    .filter((meta) => !meta.lowIsGood)
    .sort((a, b) => stats[b.key] - stats[a.key])
    .slice(0, 4)
    .map((meta) => meta.label);

const getLiabilityTags = (stats: CreatureStatBlock) =>
  [...STAT_META]
    .sort((a, b) => {
      const aScore = a.lowIsGood ? stats[a.key] : a.max - stats[a.key];
      const bScore = b.lowIsGood ? stats[b.key] : b.max - stats[b.key];
      return bScore - aScore;
    })
    .slice(0, 4)
    .map((meta) => meta.label);

function StatMeter({ meta, value }: { meta: StatMeta; value: number }) {
  const normalized = Math.max(0, Math.min(100, (value / meta.max) * 100));
  const shellClass =
    meta.tone === "cyan"
      ? "border-cyan-400/20 bg-cyan-400/8"
      : meta.tone === "emerald"
        ? "border-emerald-400/20 bg-emerald-400/8"
        : "border-amber-400/20 bg-amber-400/8";
  const barClass =
    meta.tone === "cyan"
      ? "from-cyan-300 via-sky-300 to-blue-400"
      : meta.tone === "emerald"
        ? "from-emerald-300 via-green-300 to-emerald-500"
        : "from-amber-300 via-orange-300 to-rose-400";

  return (
    <div className={cn("rounded-xl border px-2.5 py-2", shellClass)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-200/85">{meta.label}</p>
        <p className="text-xs font-semibold text-white">{value.toFixed(1)}</p>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-slate-950/60">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-300", barClass)}
          style={{ width: `${normalized}%` }}
        />
      </div>
      {meta.lowIsGood && <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">Lower is better</p>}
    </div>
  );
}

function CompactStepper({
  label,
  description,
  value,
  min,
  max,
  stepCost,
  canIncrease,
  canDecrease,
  onIncrease,
  onDecrease,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  stepCost: number;
  canIncrease: boolean;
  canDecrease: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  const progress = ((value - min) / Math.max(1, max - min)) * 100;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-white">{label}</p>
          <p className="mt-0.5 line-clamp-1 text-[9px] leading-relaxed text-slate-400">{description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-slate-300">
          +{stepCost}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-slate-950/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <Button variant="outline" className="h-7 w-7 px-0 text-xs" disabled={!canDecrease} onClick={onDecrease}>
          -
        </Button>
        <div className="min-w-[3rem] rounded-lg border border-white/10 bg-slate-900/80 px-1.5 py-0.5 text-center">
          <p className="text-xs font-semibold text-white">{value}</p>
        </div>
        <Button variant="outline" className="h-7 w-7 px-0 text-xs" disabled={!canIncrease} onClick={onIncrease}>
          +
        </Button>
      </div>
    </div>
  );
}

function CreaturePreview({
  name,
  role,
  parts,
  seedPairs,
}: {
  name: string;
  role: CreatureRole;
  parts: DesignerParts;
  seedPairs: number;
}) {
  const modelParts = toModelParts(parts);
  const bodyMass = modelParts.bodyMass;
  const legPairs = Math.max(1, Math.round(modelParts.legPairs));
  const tailLength = modelParts.tailLength;
  const eyePairs = Math.max(1, Math.round(modelParts.eyePairs));
  const earSize = modelParts.earSize;
  const mouthPower = Math.max(1, Math.round(modelParts.mouthPower));
  const hornSize = modelParts.hornSize;
  const stomachComplexity = Math.max(1, Math.round(modelParts.stomachComplexity));
  const camouflage = Math.max(0, Math.round(modelParts.camouflage));
  const scentPlumes = Math.max(0, Math.round(modelParts.scentPlumes));

  const previewId = useId().replace(/:/g, "");
  const bodyCx = 258;
  const bodyCy = 150;
  const bodyRx = 86 + bodyMass * 14 + (legPairs - 1) * 8;
  const bodyRy = 46 + bodyMass * 9;
  const headR = 30 + bodyMass * 3 + (mouthPower - 1) * 1.5;
  const headCx = bodyCx + bodyRx * 0.84;
  const headCy = bodyCy - 20;
  const tailReach = 34 + tailLength * 22;
  const tailTipX = bodyCx - bodyRx - tailReach;
  const tailTipY = bodyCy - 5 - tailLength * 4;
  const legLength = 56 + legPairs * 7 + bodyMass * 6;
  const hornHeight = hornSize * 16;
  const earLift = 11 + earSize * 6;
  const jawLength = 20 + mouthPower * 7;
  const jawDrop = 4 + mouthPower * 2.8;
  const stomachNodes = Array.from({ length: stomachComplexity }, (_, index) => ({
    x: bodyCx - bodyRx * 0.18 + index * 16,
    y: bodyCy + 8 + (index % 2 === 0 ? -4 : 2),
    r: 9 + index * 1.5,
  }));
  const legs = Array.from({ length: legPairs * 2 }, (_, index) => {
    const t = (index + 0.5) / (legPairs * 2);
    const hipX = bodyCx - bodyRx * 0.45 + t * bodyRx * 0.9;
    const hipY = bodyCy + bodyRy * 0.4;
    const side = index % 2 === 0 ? -1 : 1;
    const kneeX = hipX + side * (7 + bodyMass * 2);
    const kneeY = hipY + legLength * 0.45;
    const footX = kneeX + side * (8 + tailLength * 2);
    const footY = hipY + legLength;
    return { hipX, hipY, kneeX, kneeY, footX, footY, side };
  });
  const stripes = Array.from({ length: camouflage + 1 }, (_, index) => ({
    x: bodyCx - bodyRx * 0.58 + index * (bodyRx * 0.42),
    y: bodyCy - bodyRy * 0.65 + (index % 2 === 0 ? 0 : 7),
    w: 14 + camouflage * 4,
    h: bodyRy * 1.35,
  }));
  const eyes = Array.from({ length: eyePairs * 2 }, (_, index) => {
    const seedBase = (index + 1) * 97 + bodyMass * 29 + eyePairs * 17 + earSize * 11 + mouthPower * 7;
    const randomA = pseudoRandom(seedBase + 11);
    const randomB = pseudoRandom(seedBase + 23);
    const randomC = pseudoRandom(seedBase + 37);
    const thetaBase = ((index + randomB * 0.6) / Math.max(1, eyePairs * 2)) * Math.PI * 1.6 - Math.PI * 0.82;
    const theta = thetaBase + (randomC - 0.5) * 0.3;
    const radial = headR * (0.34 + randomA * 0.32);
    const xOffset = index % 2 === 0 ? -4.5 : 4.5;
    const yOffset = -headR * 0.15 + (randomB - 0.5) * headR * 0.14;
    const r = 4 + eyePairs * 0.2 + randomA * 1.35;

    return {
      x: headCx + Math.cos(theta) * radial + xOffset,
      y: headCy + Math.sin(theta) * (headR * 0.44) + yOffset,
      r,
      texture: EYE_TEXTURES[index % EYE_TEXTURES.length],
      rotation: (randomC - 0.5) * 26,
    };
  });
  const smellRings = Array.from({ length: scentPlumes }, (_, index) => ({
    x: headCx + headR + 6 + index * 12,
    y: headCy - 4 - index * 8,
    r: 10 + index * 5,
  }));
  const teeth = role === "carnivore" ? Array.from({ length: 2 + mouthPower }, (_, index) => index) : [];

  const bodyColors =
    role === "herbivore"
      ? { start: "#6ee7b7", mid: "#22c55e", end: "#0ea5e9" }
      : { start: "#fcd34d", mid: "#fb923c", end: "#ef4444" };

  const gradientId = `${previewId}-body`;
  const headId = `${previewId}-head`;
  const smellId = `${previewId}-smell`;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/75 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-200/70">Morphology Preview</p>
          <p className="text-sm font-semibold text-white">{name.trim() || "Unnamed Prototype"}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-right">
          <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Seed Sites</p>
          <p className="text-xs font-semibold text-white">{seedPairs}</p>
        </div>
      </div>
      <div className="h-[12.5rem] overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.65)_0%,rgba(3,17,26,0.92)_100%)]">
        <svg viewBox="0 0 540 280" className="h-full w-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={bodyColors.start} />
              <stop offset="52%" stopColor={bodyColors.mid} />
              <stop offset="100%" stopColor={bodyColors.end} />
            </linearGradient>
            <linearGradient id={headId} x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(254,242,242,0.92)" />
              <stop offset="100%" stopColor="rgba(148,163,184,0.72)" />
            </linearGradient>
            <radialGradient id={smellId}>
              <stop offset="0%" stopColor="rgba(186,230,253,0.72)" />
              <stop offset="100%" stopColor="rgba(125,211,252,0)" />
            </radialGradient>
          </defs>

          <rect width="540" height="280" fill="rgba(3,11,27,0.8)" />
          <ellipse cx="270" cy="248" rx="190" ry="26" fill="rgba(8,47,73,0.35)" />

          {legs.map((leg, index) => (
            <g
              key={`leg-${index}`}
              stroke={leg.side === -1 ? "rgba(226,232,240,0.78)" : "rgba(148,163,184,0.84)"}
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={`M ${leg.hipX} ${leg.hipY} L ${leg.kneeX} ${leg.kneeY} L ${leg.footX} ${leg.footY}`} />
              <path d={`M ${leg.footX - 6} ${leg.footY + 1} L ${leg.footX + 6} ${leg.footY + 1}`} strokeWidth={3.5} />
            </g>
          ))}

          <path
            d={`M ${bodyCx - bodyRx + 10} ${bodyCy}
              C ${bodyCx - bodyRx - 22} ${bodyCy - 12},
                ${tailTipX + 34} ${tailTipY + 11},
                ${tailTipX} ${tailTipY}
              C ${tailTipX + 18} ${tailTipY + 14},
                ${bodyCx - bodyRx - 16} ${bodyCy + 24},
                ${bodyCx - bodyRx + 12} ${bodyCy + 10} Z`}
            fill="rgba(226,232,240,0.7)"
          />

          <ellipse cx={bodyCx} cy={bodyCy} rx={bodyRx} ry={bodyRy} fill={`url(#${gradientId})`} stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          {stripes.map((stripe, index) => (
            <rect
              key={`stripe-${index}`}
              x={stripe.x}
              y={stripe.y}
              width={stripe.w}
              height={stripe.h}
              rx={stripe.w / 2}
              fill="rgba(2,6,23,0.2)"
              transform={`rotate(14 ${stripe.x + stripe.w / 2} ${stripe.y + stripe.h / 2})`}
            />
          ))}

          {stomachNodes.map((node, index) => (
            <circle
              key={`stomach-${index}`}
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill="rgba(125,211,252,0.16)"
              stroke="rgba(125,211,252,0.4)"
              strokeWidth="1.2"
            />
          ))}

          {earSize > 0 && (
            <>
              <path
                d={`M ${headCx - 12} ${headCy - headR * 0.55} Q ${headCx - 28} ${headCy - headR - earLift} ${headCx - 6} ${headCy - headR * 0.86} Z`}
                fill="rgba(191,219,254,0.72)"
              />
              <path
                d={`M ${headCx + 12} ${headCy - headR * 0.62} Q ${headCx + 30} ${headCy - headR - earLift} ${headCx + 6} ${headCy - headR * 0.9} Z`}
                fill="rgba(191,219,254,0.72)"
              />
            </>
          )}

          {hornSize > 0 && (
            <>
              <polygon
                points={`${headCx - 8},${headCy - headR + 4} ${headCx - 20},${headCy - headR - hornHeight} ${headCx - 2},${headCy - headR + 1}`}
                fill="rgba(241,245,249,0.86)"
              />
              <polygon
                points={`${headCx + 8},${headCy - headR + 3} ${headCx + 20},${headCy - headR - hornHeight} ${headCx + 2},${headCy - headR + 1}`}
                fill="rgba(241,245,249,0.86)"
              />
            </>
          )}

          <circle cx={headCx} cy={headCy} r={headR} fill={`url(#${headId})`} stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          {eyes.map((eye, index) => (
            <g key={`eye-${index}`}>
              <circle cx={eye.x} cy={eye.y} r={eye.r} fill="white" opacity="0.95" />
              <circle cx={eye.x} cy={eye.y} r={eye.r * 0.5} fill="#020617" />
              <image
                href={eye.texture}
                x={eye.x - eye.r * 1.55}
                y={eye.y - eye.r * 1.15}
                width={eye.r * 3.1}
                height={eye.r * 2.3}
                opacity={0.9}
                preserveAspectRatio="xMidYMid meet"
                transform={`rotate(${eye.rotation} ${eye.x} ${eye.y})`}
              />
            </g>
          ))}

          <path
            d={`M ${headCx + headR * 0.2} ${headCy + headR * 0.18} Q ${headCx + jawLength} ${headCy + headR * 0.1} ${headCx + jawLength + 10} ${headCy + headR * 0.28}`}
            stroke="rgba(226,232,240,0.76)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M ${headCx + headR * 0.22} ${headCy + headR * 0.22} Q ${headCx + jawLength - 2} ${headCy + headR * 0.22 + jawDrop} ${headCx + jawLength + 10} ${headCy + headR * 0.3 + jawDrop}`}
            stroke="rgba(148,163,184,0.88)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {teeth.map((_, index) => (
            <line
              key={`tooth-${index}`}
              x1={headCx + headR * 0.5 + index * 4.5}
              y1={headCy + headR * 0.22}
              x2={headCx + headR * 0.5 + index * 4.5}
              y2={headCy + headR * 0.22 + (6 + mouthPower)}
              stroke="rgba(248,250,252,0.92)"
              strokeWidth="1.5"
            />
          ))}

          {smellRings.map((ring, index) => (
            <circle key={`smell-${index}`} cx={ring.x} cy={ring.y} r={ring.r} fill={`url(#${smellId})`} />
          ))}
        </svg>
      </div>
    </div>
  );
}

export function CreatureDesigner({
  onClose,
  onSaveCreature,
  onSeedCreature,
}: {
  onClose: () => void;
  onSaveCreature: (design: CreatureDesignSubmission) => void;
  onSeedCreature: (design: CreatureDesignSubmission) => void;
}) {
  const [role, setRole] = useState<CreatureRole>("herbivore");
  const [creatureName, setCreatureName] = useState("Marsh Strider");
  const [parts, setParts] = useState<DesignerParts>(DEFAULT_PARTS);
  const [tuning, setTuning] = useState<DesignerTuning>(DEFAULT_TUNING);
  const [seedPairs, setSeedPairs] = useState(1);
  const [isCreatureQueued, setIsCreatureQueued] = useState(false);
  const [isCreatureSeeded, setIsCreatureSeeded] = useState(false);

  const modelParts = useMemo(() => toModelParts(parts), [parts]);
  const stats = useMemo(() => buildStats(role, parts, tuning), [role, parts, tuning]);
  const pointsSpent = getPartSpend(parts) + getTuningSpend(tuning) + getSeedSpend(seedPairs);
  const pointsRemaining = DESIGN_POINT_BUDGET - pointsSpent;
  const strengths = getStrengthTags(stats);
  const liabilities = getLiabilityTags(stats);

  const adjustPart = (partId: DesignerPartId, direction: 1 | -1) => {
    const blueprint = PART_BLUEPRINTS.find((part) => part.id === partId);
    if (!blueprint) return;

    setIsCreatureSeeded(false);
    setIsCreatureQueued(false);
    setParts((current) => {
      const nextValue = Math.max(blueprint.min, Math.min(blueprint.max, current[partId] + direction));
      if (nextValue === current[partId]) return current;

      const nextParts = { ...current, [partId]: nextValue };
      const nextSpend = getPartSpend(nextParts) + getTuningSpend(tuning) + getSeedSpend(seedPairs);
      if (nextSpend > DESIGN_POINT_BUDGET) return current;

      return nextParts;
    });
  };

  const adjustTuning = (tuningId: DesignerTuningId, direction: 1 | -1) => {
    const blueprint = TUNING_BLUEPRINTS.find((item) => item.id === tuningId);
    if (!blueprint) return;

    setIsCreatureSeeded(false);
    setIsCreatureQueued(false);
    setTuning((current) => {
      const nextValue = Math.max(blueprint.min, Math.min(blueprint.max, current[tuningId] + direction));
      if (nextValue === current[tuningId]) return current;

      const nextTuning = { ...current, [tuningId]: nextValue };
      const nextSpend = getPartSpend(parts) + getTuningSpend(nextTuning) + getSeedSpend(seedPairs);
      if (nextSpend > DESIGN_POINT_BUDGET) return current;

      return nextTuning;
    });
  };

  const adjustSeedPairs = (direction: 1 | -1) => {
    setIsCreatureSeeded(false);
    setIsCreatureQueued(false);
    setSeedPairs((current) => {
      const nextValue = Math.max(1, Math.min(MAX_SEED_PAIRS, current + direction));
      if (nextValue === current) return current;

      const nextSpend = getPartSpend(parts) + getTuningSpend(tuning) + getSeedSpend(nextValue);
      if (nextSpend > DESIGN_POINT_BUDGET) return current;

      return nextValue;
    });
  };

  const canSeedCreature = creatureName.trim().length > 0 && pointsRemaining >= 0;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const currentDesign: CreatureDesignSubmission = {
    name: creatureName.trim(),
    diet: role,
    seedPairs,
    parts: { ...modelParts },
    stats: { ...stats },
  };

  const handleSaveCreature = () => {
    if (!canSeedCreature) return;

    onSaveCreature(currentDesign);
    setIsCreatureQueued(true);
  };

  const handleSeedCreature = () => {
    if (!canSeedCreature) return;

    onSeedCreature(currentDesign);
    setIsCreatureSeeded(true);
  };

  return (
    <div
      className="absolute inset-0 z-[90] overflow-y-auto bg-[radial-gradient(circle_at_14%_10%,rgba(16,185,129,0.16),transparent_24%),radial-gradient(circle_at_86%_12%,rgba(56,189,248,0.18),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.1),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.94)_0%,rgba(3,17,26,0.98)_100%)] backdrop-blur-xl"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return;
        onClose();
      }}
    >
      <div className="sticky top-2 z-[95] flex justify-end px-2 sm:px-3">
        <Button
          variant="outline"
          className="h-8 border-rose-300/35 bg-slate-950/80 px-2.5 text-xs text-rose-100 hover:border-rose-200/70 hover:bg-rose-400/12"
          onClick={onClose}
        >
          Close Forge
        </Button>
      </div>
      <div className="min-h-full p-2 sm:p-3">
        <div className="mx-auto max-w-[80rem] rounded-[1.4rem] border border-white/10 bg-slate-950/80 shadow-[0_24px_80px_rgba(2,6,23,0.82)]">
          <div className="border-b border-white/10 px-3 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100">
                    Creature Forge
                  </span>
                  <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-100">
                    {DESIGN_POINT_BUDGET} points
                  </span>
                </div>
                <h1 className="mt-1 font-['Avenir_Next','Segoe_UI',sans-serif] text-lg font-semibold text-white">
                  Species Designer
                </h1>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Add body parts, tune behavior, and trade speed against survival costs.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-right">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Remaining</p>
                  <p className="text-base font-semibold text-white">{pointsRemaining}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-right">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Spent</p>
                  <p className="text-base font-semibold text-white">{pointsSpent}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2.5 p-2.5 sm:p-3 lg:grid-cols-[minmax(0,1.07fr)_minmax(0,0.93fr)]">
            <div className="space-y-2.5">
              <Card className="border-white/10 bg-white/[0.04]">
                <CardContent className="space-y-2.5 p-2.5">
                  <div className="grid gap-1.5 md:grid-cols-[minmax(0,1fr)_minmax(10rem,12rem)_minmax(11.5rem,13.5rem)]">
                    <div>
                      <label htmlFor="creature-name" className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                        Creature Name
                      </label>
                      <input
                        id="creature-name"
                        value={creatureName}
                        maxLength={26}
                        onChange={(event) => {
                          setCreatureName(event.target.value);
                          setIsCreatureSeeded(false);
                          setIsCreatureQueued(false);
                        }}
                        className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-slate-900/80 px-2.5 text-sm text-white outline-none placeholder:text-slate-500"
                        placeholder="Name your species"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Frame</p>
                      <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setRole("herbivore");
                            setIsCreatureSeeded(false);
                            setIsCreatureQueued(false);
                          }}
                          className={cn(
                            "rounded-lg px-2 py-1.5 text-xs font-semibold transition-all",
                            role === "herbivore"
                              ? "bg-emerald-400/20 text-emerald-100"
                              : "text-slate-300 hover:bg-white/[0.04]",
                          )}
                        >
                          Grazer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRole("carnivore");
                            setIsCreatureSeeded(false);
                            setIsCreatureQueued(false);
                          }}
                          className={cn(
                            "rounded-lg px-2 py-1.5 text-xs font-semibold transition-all",
                            role === "carnivore"
                              ? "bg-amber-400/20 text-amber-100"
                              : "text-slate-300 hover:bg-white/[0.04]",
                          )}
                        >
                          Hunter
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Seed Sites</p>
                      <div className="mt-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white">{seedPairs} site{seedPairs === 1 ? "" : "s"}</p>
                          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">group size scales by Collective</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <Button variant="outline" className="h-6 w-6 px-0 text-xs" disabled={seedPairs <= 1} onClick={() => adjustSeedPairs(-1)}>
                            -
                          </Button>
                          <p className="text-[10px] text-slate-400">Extra seed site costs 2 points.</p>
                          <Button
                            variant="outline"
                            className="h-6 w-6 px-0 text-xs"
                            disabled={seedPairs >= MAX_SEED_PAIRS || pointsRemaining < 2}
                            onClick={() => adjustSeedPairs(1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <CreaturePreview name={creatureName} role={role} parts={parts} seedPairs={seedPairs} />

                  <div className="grid gap-1.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(10rem,12.5rem)]">
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-2">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-emerald-200/80">Strengths</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {strengths.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-100"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-2.5 py-2">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-rose-200/80">Tradeoffs</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {liabilities.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] text-rose-100"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          variant="outline"
                          className="h-8 w-full border-cyan-300/35 text-xs text-cyan-100 hover:border-cyan-200/60 hover:bg-cyan-300/10"
                          disabled={!canSeedCreature}
                          onClick={handleSaveCreature}
                        >
                          Save To Batch
                        </Button>
                        <Button className="h-8 w-full text-xs" disabled={!canSeedCreature} onClick={handleSeedCreature}>
                          Seed Now
                        </Button>
                      </div>
                      {isCreatureQueued && (
                        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-2 text-[10px] leading-relaxed text-cyan-100">
                          Design saved to deployment batch. Deploy all saved creatures from Command Deck.
                        </div>
                      )}
                      {isCreatureSeeded && (
                        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-2 text-[10px] leading-relaxed text-emerald-100">
                          Species seeded. It now moves, hides, hunts/forages, and reproduces in the world.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.04]">
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-sm">Genetic Profile</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                  {STAT_META.map((meta) => (
                    <StatMeter key={meta.key} meta={meta} value={stats[meta.key]} />
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2.5">
              <Card className="border-white/10 bg-white/[0.04]">
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-sm">Behavior + Lifecycle Controls</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1.5 sm:grid-cols-2">
                  {TUNING_BLUEPRINTS.map((tune) => (
                    <CompactStepper
                      key={tune.id}
                      label={tune.label}
                      description={tune.description}
                      value={tuning[tune.id]}
                      min={tune.min}
                      max={tune.max}
                      stepCost={tune.stepCost}
                      canIncrease={
                        tuning[tune.id] < tune.max &&
                        getPartSpend(parts) + getTuningSpend(tuning) + getSeedSpend(seedPairs) + tune.stepCost <= DESIGN_POINT_BUDGET
                      }
                      canDecrease={tuning[tune.id] > tune.min}
                      onIncrease={() => adjustTuning(tune.id, 1)}
                      onDecrease={() => adjustTuning(tune.id, -1)}
                    />
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.04]">
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-sm">Body Modules</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1.5 sm:grid-cols-2">
                  {PART_BLUEPRINTS.map((part) => (
                    <CompactStepper
                      key={part.id}
                      label={part.label}
                      description={part.description}
                      value={parts[part.id]}
                      min={part.min}
                      max={part.max}
                      stepCost={part.stepCost}
                      canIncrease={
                        parts[part.id] < part.max &&
                        getPartSpend(parts) + getTuningSpend(tuning) + getSeedSpend(seedPairs) + part.stepCost <= DESIGN_POINT_BUDGET
                      }
                      canDecrease={parts[part.id] > part.min}
                      onIncrease={() => adjustPart(part.id, 1)}
                      onDecrease={() => adjustPart(part.id, -1)}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
