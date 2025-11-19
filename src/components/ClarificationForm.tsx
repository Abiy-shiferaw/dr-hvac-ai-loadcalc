// src/components/ClarificationForm.tsx
"use client";

import { useState } from "react";

export interface ExteriorAnalysis {
  stories: number | string;
  siding: string;
  windows: string;
  gutters: string;
  condition: string;
  confidence?: number;
}

export interface ValidationResult {
  issues: string[];
  needsClarification: boolean;
}

interface ClarificationFormProps {
  analysis: ExteriorAnalysis;
  validation: ValidationResult;
  onConfirm: (updated: ExteriorAnalysis) => void;
}

export function ClarificationForm({
  analysis,
  validation,
  onConfirm,
}: ClarificationFormProps) {
  const initialStories =
    typeof analysis.stories === "number"
      ? analysis.stories.toString()
      : analysis.stories === "unknown"
      ? ""
      : analysis.stories.toString();

  const initialWindows =
    analysis.windows === "unknown" || analysis.windows === ""
      ? ""
      : analysis.windows;

  const initialSiding =
    analysis.siding === "unknown" || analysis.siding === ""
      ? ""
      : analysis.siding;

  const [stories, setStories] = useState<string>(initialStories);
  const [windows, setWindows] = useState<string>(initialWindows);
  const [siding, setSiding] = useState<string>(initialSiding);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const updated: ExteriorAnalysis = {
      stories: stories === "" ? "unknown" : stories,
      windows: windows === "" ? "unknown" : windows,
      siding: siding === "" ? "unknown" : siding,
      gutters: analysis.gutters,
      condition: analysis.condition,
      confidence: analysis.confidence ?? 0.8,
    };

    onConfirm(updated);
  };

  return (
    <div className="mt-6 border border-amber-500/40 bg-amber-500/5 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-amber-300 mb-2">
        A few details need clarification
      </h2>

      {validation.issues.length > 0 && (
        <ul className="list-disc list-inside text-xs text-amber-200 mb-4 space-y-1">
          {validation.issues.map((issue, idx) => (
            <li key={idx}>{issue}</li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div>
          <label className="block text-xs mb-1 text-slate-200">
            Number of stories
          </label>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:outline-none focus:ring focus:ring-emerald-500/60"
            value={stories}
            onChange={(e) => setStories(e.target.value)}
          >
            <option value="">Select stories</option>
            <option value="1">1 story</option>
            <option value="1.5">1.5 stories</option>
            <option value="2">2 stories</option>
            <option value="3">3 stories</option>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 text-slate-200">
            Window amount (visible sides)
          </label>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:outline-none focus:ring focus:ring-emerald-500/60"
            value={windows}
            onChange={(e) => setWindows(e.target.value)}
          >
            <option value="">Select window amount</option>
            <option value="few">Few</option>
            <option value="average">Average</option>
            <option value="many">Many</option>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 text-slate-200">
            Siding type
          </label>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:outline-none focus:ring focus:ring-emerald-500/60"
            value={siding}
            onChange={(e) => setSiding(e.target.value)}
          >
            <option value="">Select siding</option>
            <option value="vinyl">Vinyl</option>
            <option value="wood">Wood</option>
            <option value="fiber cement">Fiber cement</option>
            <option value="stucco">Stucco</option>
            <option value="brick">Brick</option>
            <option value="mixed">Mixed</option>
            <option value="unknown">Not sure / other</option>
          </select>
        </div>

        <button
          type="submit"
          className="mt-2 inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold"
        >
          Confirm these details
        </button>
      </form>
    </div>
  );
}