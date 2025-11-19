// src/lib/loadCalc.ts

export type WindowAmount = "few" | "average" | "many" | "unknown";

export type InsulationLevel = "poor" | "average" | "good";

export type Orientation = "north" | "south" | "east" | "west" | "mixed" | "unknown";

export type SidingType =
  | "vinyl"
  | "wood"
  | "fiber cement"
  | "stucco"
  | "brick"
  | "mixed"
  | "unknown";

export interface LoadCalcInput {
  sqft: number;
  stories: number;
  windows: WindowAmount;
  orientation: Orientation;
  insulation: InsulationLevel;
  siding: SidingType;
  designDeltaT: number;
  indoorRH: number;
  ductsInAtticOrCrawl: boolean;
}

export interface LoadCalcResult {
  sensibleBTUH: number;
  latentBTUH: number;
  totalBTUH: number;
  recommendedTonnage: number;
  notes: string[];
}

/**
 * Manual-J-lite style load calc.
 * This is NOT a replacement for full ACCA MJ, but a conservative helper
 * to get you in the ballpark quickly.
 */
export function runLoadCalc(input: LoadCalcInput): LoadCalcResult {
  const notes: string[] = [];

  const {
    sqft,
    stories,
    windows,
    orientation,
    insulation,
    siding,
    designDeltaT,
    indoorRH,
    ductsInAtticOrCrawl,
  } = input;

  if (sqft <= 0) {
    throw new Error("sqft must be > 0");
  }

  // 1) Base sensible BTU per sq ft (roughly based on delta-T)
  const basePerSqFtAt30 = 10;
  const basePerSqFt = basePerSqFtAt30 * (designDeltaT / 30);

  // 2) Insulation factor
  let insulationFactor = 1;
  switch (insulation) {
    case "good":
      insulationFactor = 0.85;
      notes.push("Good insulation: slightly reduced load.");
      break;
    case "average":
      insulationFactor = 1;
      break;
    case "poor":
      insulationFactor = 1.2;
      notes.push("Poor insulation: increased envelope load.");
      break;
  }

  // 3) Windows factor
  let windowFactor = 1;
  switch (windows) {
    case "few":
      windowFactor = 0.9;
      notes.push("Few windows: reduced gain/loss.");
      break;
    case "average":
      windowFactor = 1;
      break;
    case "many":
      windowFactor = 1.15;
      notes.push("Many windows: increased gain/loss.");
      break;
    case "unknown":
      notes.push("Window amount unknown: assuming average.");
      break;
  }

  // 4) Orientation factor
  let orientationFactor = 1;
  switch (orientation) {
    case "south":
    case "west":
      orientationFactor = 1.1;
      notes.push("South/West orientation: higher solar gain.");
      break;
    case "north":
      orientationFactor = 0.95;
      notes.push("North orientation: slightly lower solar gain.");
      break;
    case "east":
      orientationFactor = 1.05;
      break;
    case "mixed":
    case "unknown":
      orientationFactor = 1;
      break;
  }

  // 5) Stories factor
  let storiesFactor = 1;
  if (stories >= 2) {
    storiesFactor = 1.08;
    notes.push("Multi-story: extra load for stack effect and envelope area.");
  }

  // 6) Siding factor (small tweak)
  let sidingFactor = 1;
  switch (siding) {
    case "brick":
      sidingFactor = 0.97;
      break;
    case "stucco":
      sidingFactor = 0.99;
      break;
    case "fiber cement":
    case "wood":
    case "vinyl":
    case "mixed":
    case "unknown":
      sidingFactor = 1;
      break;
  }

  // 7) Duct location penalty
  let ductFactor = 1;
  if (ductsInAtticOrCrawl) {
    ductFactor = 1.1;
    notes.push("Ducts in unconditioned space: 10% penalty added.");
  }

  const sensiblePerSqFt =
    basePerSqFt *
    insulationFactor *
    windowFactor *
    orientationFactor *
    storiesFactor *
    sidingFactor *
    ductFactor;

  const sensibleBTUH = sensiblePerSqFt * sqft;

  // 8) Latent load (simplified)
  let latentRatio = 0.2;
  if (indoorRH <= 35) latentRatio = 0.15;
  else if (indoorRH >= 55) latentRatio = 0.25;

  const latentBTUH = sensibleBTUH * latentRatio;

  // 9) Total & tonnage
  const totalBTUH = sensibleBTUH + latentBTUH;
  const rawTonnage = totalBTUH / 12000;
  const recommendedTonnage = Math.round(rawTonnage * 4) / 4;

  notes.push(
    `Based on the inputs, total design load is ~${Math.round(
      totalBTUH
    )} BTU/h, which is roughly ${recommendedTonnage.toFixed(2)} tons.`
  );

  return {
    sensibleBTUH: Math.round(sensibleBTUH),
    latentBTUH: Math.round(latentBTUH),
    totalBTUH: Math.round(totalBTUH),
    recommendedTonnage,
    notes,
  };
}