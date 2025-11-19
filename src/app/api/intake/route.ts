// src/app/api/intake/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Buffer } from "buffer";
import { openai } from "@/lib/openai";

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}

// --------- EXTERIOR TYPES & VALIDATION ----------

export interface ExteriorAnalysis {
  stories: number | string;
  siding: string;
  windows: string;
  gutters: string;
  condition: string;
  confidence?: number;
}

interface ValidationResult {
  issues: string[];
  needsClarification: boolean;
}

function validateExteriorAnalysis(
  analysis: ExteriorAnalysis | null
): ValidationResult {
  const issues: string[] = [];

  if (!analysis) {
    issues.push(
      "I couldn’t confidently read this photo. Please upload a clearer exterior shot (front of the house)."
    );
    return {
      issues,
      needsClarification: true,
    };
  }

  const confidence = analysis.confidence ?? 0;

  if (confidence < 0.75) {
    issues.push(
      "Overall confidence is low. Please confirm a few key details (stories, siding type, and approximate window amount)."
    );
  }

  if (
    analysis.stories === "unknown" ||
    analysis.stories === null ||
    analysis.stories === undefined
  ) {
    issues.push(
      "I couldn’t determine the number of stories. Please select: 1, 1.5, 2, or 3 stories."
    );
  }

  if (
    analysis.windows === "unknown" ||
    analysis.windows === "" ||
    analysis.windows === "unclear"
  ) {
    issues.push(
      "I couldn’t clearly estimate window amount. Please choose: few, average, or many windows."
    );
  }

  if (analysis.siding === "unknown" || analysis.siding === "") {
    issues.push(
      "Siding type is unclear. Please choose the closest match: vinyl, wood, fiber cement, stucco, brick, or mixed."
    );
  }

  return {
    issues,
    needsClarification: issues.length > 0,
  };
}

// --------- EQUIPMENT TYPES, WARRANTY & FLAGS ----------

export interface EquipmentAnalysis {
  equipmentType: string; // furnace, air_handler, heat_pump, ac_condenser, package_unit, other
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  nominalTonnage?: number | null;
  inputBTUH?: number | null;
  outputBTUH?: number | null;
  seer?: number | null;
  seer2?: number | null;
  hspf?: number | null;
  hspf2?: number | null;
  afue?: number | null;
  refrigerant?: string | null;
  heatStripKW?: number | null;
  manufactureYear?: number | null;
  stages?: string; // single, two-stage, variable, unknown

  // sanity-check helpers
  ventType?: string | null; // "metal_flue", "pvc", "mixed", "unknown"
  afueSource?: string | null; // "label", "inferred", "model_lookup", "unknown"
}

interface WarrantyInfo {
  manufactureYear: number | null;
  approxAgeYears: number | null;
  likelyWarrantyStatus:
    | "likely_in_parts_warranty"
    | "likely_out_of_warranty"
    | "unknown";
}

interface EquipmentFlags {
  afueVentMismatch: boolean;
  notes: string[];
}

// 🔎 Small model → AFUE lookup (extend over time)
const AFUE_MODEL_TABLE: Record<string, number> = {
  // Trane / American Standard example (your current test)
  AUD2B080A9V3VBA: 80,

  // Example Goodman 95% you saw earlier:
  GMH950703BX: 95,
};

function applyAfueFromModelTable(
  equipment: EquipmentAnalysis | null
): EquipmentAnalysis | null {
  if (!equipment) return equipment;

  // If AFUE already set by AI, don't override
  if (equipment.afue !== null && equipment.afue !== undefined) {
    return equipment;
  }

  const rawModel = equipment.modelNumber ?? "";
  if (!rawModel) return equipment;

  const key = rawModel.trim().toUpperCase();

  if (AFUE_MODEL_TABLE[key] !== undefined) {
    return {
      ...equipment,
      afue: AFUE_MODEL_TABLE[key],
      afueSource: equipment.afueSource && equipment.afueSource !== "unknown"
        ? equipment.afueSource
        : "model_lookup",
    };
  }

  return equipment;
}

function computeWarrantyInfo(
  equipment: EquipmentAnalysis | null
): WarrantyInfo {
  if (!equipment || !equipment.manufactureYear) {
    return {
      manufactureYear: null,
      approxAgeYears: null,
      likelyWarrantyStatus: "unknown",
    };
  }

  const currentYear = new Date().getFullYear();
  const age = currentYear - equipment.manufactureYear;

  if (age <= 10) {
    return {
      manufactureYear: equipment.manufactureYear,
      approxAgeYears: age,
      likelyWarrantyStatus: "likely_in_parts_warranty",
    };
  }

  return {
    manufactureYear: equipment.manufactureYear,
    approxAgeYears: age,
    likelyWarrantyStatus: "likely_out_of_warranty",
  };
}

function analyzeEquipmentFlags(
  equipment: EquipmentAnalysis | null
): EquipmentFlags | null {
  if (!equipment) return null;

  const notes: string[] = [];
  let afueVentMismatch = false;

  const afue = equipment.afue ?? null;
  const ventType = equipment.ventType ?? "unknown";

  if (afue !== null && afue >= 90 && ventType === "metal_flue") {
    afueVentMismatch = true;
    notes.push(
      "AI/model lookup says 90%+ AFUE, but venting appears to be metal/B-vent only. This often indicates an 80% furnace. Please confirm AFUE manually."
    );
  }

  if (afue === null && ventType === "pvc") {
    notes.push(
      "Venting appears to be PVC, which often indicates a 90%+ condensing furnace. Confirm AFUE from the rating plate."
    );
  }

  if (!afueVentMismatch && notes.length === 0) {
    return { afueVentMismatch: false, notes: [] };
  }

  return { afueVentMismatch, notes };
}

// --------- OPENAI RESPONSE TYPES ----------

interface OutputTextContent {
  type: "output_text";
  text: string;
}

interface OutputItem {
  role?: string;
  content?: OutputTextContent[];
}

// --------- MAIN HANDLER ----------

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const address = formData.get("address");
  const exteriorRaw = formData.getAll("exteriorPhotos");
  const equipmentRaw = formData.getAll("equipmentPhotos");

  const exteriorPhotos = exteriorRaw.filter(
    (entry): entry is File => entry instanceof File
  );
  const equipmentPhotos = equipmentRaw.filter(
    (entry): entry is File => entry instanceof File
  );

  if (!address || exteriorPhotos.length === 0) {
    return NextResponse.json({
      ok: true,
      message:
        "Intake received, but at least one exterior photo and the address are required.",
      data: {
        address,
        photoCountExterior: exteriorPhotos.length,
        photoCountEquipment: equipmentPhotos.length,
      },
    });
  }

  // ---------- EXTERIOR ANALYSIS ----------

  const firstExterior = exteriorPhotos[0];
  const base64Exterior = await fileToBase64(firstExterior);
  const exteriorDataUrl = `data:${firstExterior.type};base64,${base64Exterior}`;

  const exteriorPrompt = `
You are helping an HVAC load calculation tool.

Given this exterior house photo and the address, estimate:

- number of stories (1, 1.5, 2, 3). If unsure, use "unknown".
- siding type (vinyl, wood, fiber cement, stucco, brick, mixed, unknown).
- rough window count on the visible sides (few, average, many, or "unknown").
- presence of gutters (yes, no, unclear).
- general exterior condition (good, average, poor).
- a confidence score from 0 to 1.

Return ONLY valid JSON and nothing else:

{
  "stories": 2,
  "siding": "vinyl",
  "windows": "average",
  "gutters": "yes",
  "condition": "average",
  "confidence": 0.8
}
`;

  const exteriorResponse = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: exteriorPrompt },
          { type: "input_image", image_url: exteriorDataUrl, detail: "low" },
        ],
      },
    ],
  });

  const exteriorOutput = exteriorResponse.output[0] as OutputItem | undefined;

  let exteriorAnalysis: ExteriorAnalysis | null = null;

  if (
    exteriorOutput?.content &&
    exteriorOutput.content[0]?.type === "output_text"
  ) {
    const text = exteriorOutput.content[0].text;
    try {
      const parsed = JSON.parse(text) as Partial<ExteriorAnalysis>;
      if (parsed && typeof parsed === "object") {
        exteriorAnalysis = {
          stories: parsed.stories ?? "unknown",
          siding: parsed.siding ?? "unknown",
          windows: parsed.windows ?? "unknown",
          gutters: parsed.gutters ?? "unclear",
          condition: parsed.condition ?? "average",
          confidence: parsed.confidence,
        };
      }
    } catch {
      exteriorAnalysis = null;
    }
  }

  const exteriorValidation = validateExteriorAnalysis(exteriorAnalysis);

  // ---------- EQUIPMENT ANALYSIS (ADVANCED, STRONGER MODEL) ----------

  let equipmentAnalysis: EquipmentAnalysis | null = null;

  if (equipmentPhotos.length > 0) {
    const equipmentImageContents = await Promise.all(
      equipmentPhotos.map(async (file) => {
        const base64 = await fileToBase64(file);
        const url = `data:${file.type};base64,${base64}`;
        return {
          type: "input_image" as const,
          image_url: url,
          detail: "high" as const,
        };
      })
    );

    const equipmentPrompt = `
You are helping an HVAC load calculation and replacement sizing tool.

You are given one or more images. At least one image is a CLOSE-UP of an HVAC furnace data label. Other images may show the whole furnace, flue, or surrounding equipment.

Your job:
- Find the clearest label image(s).
- Read the text on the label carefully.
- Use wide shots ONLY to understand vent type (metal B-vent vs PVC) and general furnace style.

From these images, extract as much as you can of the following. If you cannot find a field, set it to null or "unknown" as appropriate.

Return ONLY JSON like this:

{
  "equipmentType": "furnace",
  "manufacturer": "Trane",
  "modelNumber": "AUD2B080A9V3VBA",
  "serialNumber": "123745N3G1G",
  "nominalTonnage": null,
  "inputBTUH": 80000,
  "outputBTUH": null,
  "seer": null,
  "seer2": null,
  "hspf": null,
  "hspf2": null,
  "afue": 80,
  "refrigerant": null,
  "heatStripKW": null,
  "manufactureYear": 2012,
  "stages": "two-stage",
  "ventType": "metal_flue",
  "afueSource": "label"
}

/* Field definitions:

- equipmentType: one of "furnace", "air_handler", "heat_pump", "ac_condenser", "package_unit", "other"
- manufacturer: brand name if visible (e.g. Trane, American Standard, Goodman, Carrier, Rheem, etc.)
- modelNumber, serialNumber: exact strings from the label
- nominalTonnage: cooling tonnage (e.g. 2.5, 3, 4) if can be inferred
- inputBTUH, outputBTUH: furnace only, if visible
- seer, seer2, hspf, hspf2, afue: efficiency ratings if visible (null if not seen clearly)
- refrigerant: e.g. "R-410A", "R-32", "R-454B", etc. (often not applicable for straight gas furnace)
- heatStripKW: for electric heat strips (air handler / package), if visible
- manufactureYear: a 4-digit year, inferred from the label/serial pattern if possible
- stages: "single", "two-stage", "variable", or "unknown"

- ventType:
  - "metal_flue" if the furnace vents with metal/B-vent.
  - "pvc" if the furnace vents with PVC pipes.
  - "mixed" if both metal and PVC are part of the furnace venting.
  - "unknown" if you cannot tell.

- afueSource:
  - "label" if AFUE was clearly read from a rating label.
  - "inferred" if AFUE was inferred from model or other clues.
  - "model_lookup" if AFUE came from a known model number → AFUE table.
  - "unknown" if AFUE is unclear.

Be conservative:
- Prefer accurate "unknown" over a wrong number.
- If venting looks like an 80% furnace (metal flue only) but the AFUE on the label is not readable, it's okay to leave "afue": null. A separate model lookup step may fill it in.
*/
`;

    const equipmentResponse = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: equipmentPrompt },
            ...equipmentImageContents,
          ],
        },
      ],
    });

    const equipmentOutput = equipmentResponse.output[0] as OutputItem | undefined;

    if (
      equipmentOutput?.content &&
      equipmentOutput.content[0]?.type === "output_text"
    ) {
      const text = equipmentOutput.content[0].text;
      try {
        const parsed = JSON.parse(text) as Partial<EquipmentAnalysis>;
        if (parsed && typeof parsed === "object") {
          equipmentAnalysis = {
            equipmentType: parsed.equipmentType ?? "furnace",
            manufacturer: parsed.manufacturer ?? "unknown",
            modelNumber: parsed.modelNumber ?? "unknown",
            serialNumber: parsed.serialNumber ?? "unknown",
            nominalTonnage: parsed.nominalTonnage ?? null,
            inputBTUH: parsed.inputBTUH ?? null,
            outputBTUH: parsed.outputBTUH ?? null,
            seer: parsed.seer ?? null,
            seer2: parsed.seer2 ?? null,
            hspf: parsed.hspf ?? null,
            hspf2: parsed.hspf2 ?? null,
            afue: parsed.afue ?? null,
            refrigerant: parsed.refrigerant ?? null,
            heatStripKW: parsed.heatStripKW ?? null,
            manufactureYear: parsed.manufactureYear ?? null,
            stages: parsed.stages ?? "unknown",
            ventType: parsed.ventType ?? "unknown",
            afueSource: parsed.afueSource ?? "unknown",
          };
        }
      } catch {
        equipmentAnalysis = null;
      }
    }
  }

  // 🔁 apply AFUE model lookup, then warranty & flags
  equipmentAnalysis = applyAfueFromModelTable(equipmentAnalysis);

  const warranty = computeWarrantyInfo(equipmentAnalysis);
  const equipmentFlags = analyzeEquipmentFlags(equipmentAnalysis);

  return NextResponse.json({
    ok: true,
    message: exteriorValidation.needsClarification
      ? "AI analysis complete, but some exterior details need clarification."
      : "AI analysis complete.",
    data: {
      address,
      photoCountExterior: exteriorPhotos.length,
      photoCountEquipment: equipmentPhotos.length,
      exteriorAnalysis,
      exteriorValidation,
      equipmentAnalysis,
      warranty,
      equipmentFlags,
    },
  });
}