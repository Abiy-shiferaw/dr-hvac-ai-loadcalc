"use client";

import React, { useState, FormEvent } from "react";
import LoadCalcPanel from "@/components/LoadCalcPanel";
import { LoadCalcResult, WindowAmount, SidingType } from "@/lib/loadCalc";

interface ExteriorAnalysis {
  stories: number | string;
  siding: string;
  windows: string;
  gutters: string;
  condition: string;
  confidence?: number;
}

interface ExteriorValidation {
  issues: string[];
  needsClarification: boolean;
}

interface EquipmentAnalysis {
  equipmentType: string;
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
  stages?: string;
  ventType?: string | null;
  afueSource?: string | null;
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

interface IntakeData {
  address: string;
  photoCountExterior: number;
  photoCountEquipment: number;
  exteriorAnalysis: ExteriorAnalysis | null;
  exteriorValidation: ExteriorValidation;
  equipmentAnalysis: EquipmentAnalysis | null;
  warranty: WarrantyInfo;
  equipmentFlags: EquipmentFlags | null;
}

interface IntakeResponse {
  ok: boolean;
  message: string;
  data: IntakeData;
}

interface JobSummary {
  address: string;
  exterior: ExteriorAnalysis | null;
  equipment: EquipmentAnalysis | null;
  warranty: WarrantyInfo;
  equipmentFlags: EquipmentFlags | null;
  loadCalc: LoadCalcResult | null;
}

export default function HomePage() {
  const [address, setAddress] = useState<string>("");
  const [exteriorPhotos, setExteriorPhotos] = useState<FileList | null>(null);
  const [equipmentPhotos, setEquipmentPhotos] = useState<FileList | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<IntakeData | null>(null);
  const [loadCalcResult, setLoadCalcResult] = useState<LoadCalcResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setRawResponse(null);
    setAnalysis(null);
    setLoadCalcResult(null);

    try {
      const formData = new FormData();
      formData.append("address", address);

      if (exteriorPhotos) {
        Array.from(exteriorPhotos).forEach((file) => {
          formData.append("exteriorPhotos", file);
        });
      }

      if (equipmentPhotos) {
        Array.from(equipmentPhotos).forEach((file) => {
          formData.append("equipmentPhotos", file);
        });
      }

      const res = await fetch("/api/intake", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const json = (await res.json()) as IntakeResponse;
      setRawResponse(JSON.stringify(json, null, 2));

      if (json.ok && json.data) {
        setAnalysis(json.data);
      } else {
        setError(json.message || "Unknown error from API.");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while sending the intake.");
    } finally {
      setIsLoading(false);
    }
  }

  const jobSummary: JobSummary | null = analysis
    ? {
        address: analysis.address,
        exterior: analysis.exteriorAnalysis,
        equipment: analysis.equipmentAnalysis,
        warranty: analysis.warranty,
        equipmentFlags: analysis.equipmentFlags,
        loadCalc: loadCalcResult,
      }
    : null;

  const defaultStories =
    typeof analysis?.exteriorAnalysis?.stories === "number"
      ? analysis.exteriorAnalysis.stories
      : undefined;

  const defaultWindows = analysis?.exteriorAnalysis?.windows
    ? (analysis.exteriorAnalysis.windows as WindowAmount)
    : undefined;

  const defaultSiding = analysis?.exteriorAnalysis?.siding
    ? (analysis.exteriorAnalysis.siding as SidingType)
    : undefined;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-2">
          Dr HVAC – Load & Equipment AI Intake
        </h1>
        <p className="text-xs text-slate-400 mb-6">
          Upload exterior + equipment photos, let AI read the house and equipment,
          then run a Manual-J lite load calc and combine everything into a
          structured summary.
        </p>

        {/* Intake Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border border-slate-800 rounded-lg p-4 bg-slate-900/60"
        >
          <div className="space-y-1 text-xs">
            <label className="block font-medium text-slate-200">
              Address (required)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="7320 45th Ave NE, Seattle, WA 98115"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              required
            />
          </div>

          <div className="space-y-1 text-xs">
            <label className="block font-medium text-slate-200">
              Exterior Photos (front of house, sides)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setExteriorPhotos(e.target.files)}
              className="block w-full text-xs text-slate-300"
            />
            <p className="text-[11px] text-slate-500">
              At least one exterior photo is required.
            </p>
          </div>

          <div className="space-y-1 text-xs">
            <label className="block font-medium text-slate-200">
              Equipment Photos (furnace label, open door, flue, etc.)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setEquipmentPhotos(e.target.files)}
              className="block w-full text-xs text-slate-300"
            />
            <p className="text-[11px] text-slate-500">
              Add label close-up + wide shots of the equipment for best results.
            </p>
          </div>

          {error && (
            <div className="text-[11px] text-red-400 border border-red-500/40 bg-red-950/40 rounded-md px-2 py-1">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Analyzing..." : "Run AI Intake"}
          </button>
        </form>

        {/* Human-readable summary */}
        {analysis && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/60">
              <h2 className="text-xs font-semibold mb-2 text-slate-200">
                Exterior Summary
              </h2>
              {analysis.exteriorAnalysis ? (
                <ul className="text-[11px] space-y-1 text-slate-300">
                  <li>
                    <strong>Stories:</strong> {String(analysis.exteriorAnalysis.stories)}
                  </li>
                  <li>
                    <strong>Siding:</strong> {analysis.exteriorAnalysis.siding}
                  </li>
                  <li>
                    <strong>Windows:</strong> {analysis.exteriorAnalysis.windows}
                  </li>
                  <li>
                    <strong>Gutters:</strong> {analysis.exteriorAnalysis.gutters}
                  </li>
                  <li>
                    <strong>Condition:</strong> {analysis.exteriorAnalysis.condition}
                  </li>
                  <li>
                    <strong>Confidence:</strong>{" "}
                    {analysis.exteriorAnalysis.confidence ?? "N/A"}
                  </li>
                </ul>
              ) : (
                <p className="text-[11px] text-slate-400">
                  No exterior analysis returned.
                </p>
              )}
              {analysis.exteriorValidation.needsClarification &&
                analysis.exteriorValidation.issues.length > 0 && (
                  <div className="mt-2 text-[11px] text-amber-300">
                    <p className="font-semibold">Needs clarification:</p>
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      {analysis.exteriorValidation.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/60">
              <h2 className="text-xs font-semibold mb-2 text-slate-200">
                Equipment Summary
              </h2>
              {analysis.equipmentAnalysis ? (
                <ul className="text-[11px] space-y-1 text-slate-300">
                  <li>
                    <strong>Type:</strong> {analysis.equipmentAnalysis.equipmentType}
                  </li>
                  <li>
                    <strong>Manufacturer:</strong>{" "}
                    {analysis.equipmentAnalysis.manufacturer}
                  </li>
                  <li>
                    <strong>Model:</strong>{" "}
                    {analysis.equipmentAnalysis.modelNumber}
                  </li>
                  <li>
                    <strong>Serial:</strong>{" "}
                    {analysis.equipmentAnalysis.serialNumber}
                  </li>
                  <li>
                    <strong>Input BTUH:</strong>{" "}
                    {analysis.equipmentAnalysis.inputBTUH ?? "N/A"}
                  </li>
                  <li>
                    <strong>Stages:</strong>{" "}
                    {analysis.equipmentAnalysis.stages ?? "unknown"}
                  </li>
                  <li>
                    <strong>Vent Type:</strong>{" "}
                    {analysis.equipmentAnalysis.ventType ?? "unknown"}
                  </li>
                  <li>
                    <strong>AFUE:</strong>{" "}
                    {analysis.equipmentAnalysis.afue ?? "unknown"}
                  </li>
                </ul>
              ) : (
                <p className="text-[11px] text-slate-400">
                  No equipment analysis returned.
                </p>
              )}

              <div className="mt-3 border-t border-slate-800 pt-2">
                <h3 className="text-[11px] font-semibold text-slate-200">
                  Warranty & Flags
                </h3>
                <ul className="text-[11px] space-y-1 text-slate-300 mt-1">
                  <li>
                    <strong>Manufacture Year:</strong>{" "}
                    {analysis.warranty.manufactureYear ?? "unknown"}
                  </li>
                  <li>
                    <strong>Approx Age:</strong>{" "}
                    {analysis.warranty.approxAgeYears ?? "unknown"}
                  </li>
                  <li>
                    <strong>Warranty:</strong>{" "}
                    {analysis.warranty.likelyWarrantyStatus}
                  </li>
                </ul>

                {analysis.equipmentFlags &&
                  (analysis.equipmentFlags.afueVentMismatch ||
                    analysis.equipmentFlags.notes.length > 0) && (
                    <div className="mt-2 text-[11px] text-amber-300">
                      <p className="font-semibold">Equipment Flags:</p>
                      <ul className="list-disc ml-4 mt-1 space-y-1">
                        {analysis.equipmentFlags.notes.map((note, i) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Raw debug JSON */}
        {rawResponse && (
          <div className="mt-6">
            <h2 className="text-xs font-semibold mb-1 text-slate-300">
              Raw Debug JSON
            </h2>
            <pre className="text-[11px] bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto max-h-64">
              {rawResponse}
            </pre>
          </div>
        )}

        {/* Combined job summary JSON */}
        {jobSummary && (
          <div className="mt-6">
            <h2 className="text-xs font-semibold mb-1 text-slate-300">
              Combined Job Summary (Ready for PDF)
            </h2>
            <pre className="text-[11px] bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto max-h-64">
              {JSON.stringify(jobSummary, null, 2)}
            </pre>
          </div>
        )}

        {/* Manual-J Lite Load Calc Panel, auto-filled from AI */}
        <div className="mt-8">
          <LoadCalcPanel
            defaultStories={defaultStories}
            defaultWindows={defaultWindows}
            defaultSiding={defaultSiding}
            onResult={setLoadCalcResult}
          />
        </div>
      </div>
    </main>
  );
}