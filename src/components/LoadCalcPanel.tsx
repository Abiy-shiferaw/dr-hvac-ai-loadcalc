"use client";

import React, { useState } from "react";
import {
  runLoadCalc,
  LoadCalcInput,
  LoadCalcResult,
  SidingType,
  WindowAmount,
  Orientation,
  InsulationLevel,
} from "@/lib/loadCalc";

interface LoadCalcPanelProps {
  defaultStories?: number;
  defaultWindows?: WindowAmount;
  defaultSiding?: SidingType;
  onResult?: (result: LoadCalcResult) => void;
}

export default function LoadCalcPanel({
  defaultStories,
  defaultWindows,
  defaultSiding,
  onResult,
}: LoadCalcPanelProps) {
  const [sqft, setSqft] = useState<string>("");

  const [stories, setStories] = useState<number>(defaultStories ?? 1);
  const [windows, setWindows] = useState<WindowAmount>(
    defaultWindows ?? "average"
  );
  const [orientation, setOrientation] = useState<Orientation>("mixed");
  const [insulation, setInsulation] = useState<InsulationLevel>("average");
  const [siding, setSiding] = useState<SidingType>(
    defaultSiding ?? "unknown"
  );
  const [ductsInAtticOrCrawl, setDuctsInAtticOrCrawl] =
    useState<boolean>(false);

  const [result, setResult] = useState<LoadCalcResult | null>(null);

  function handleRunCalc() {
    const sqftNum = Number(sqft);
    if (!sqftNum || sqftNum <= 0) {
      alert("Please enter a valid square footage.");
      return;
    }

    const input: LoadCalcInput = {
      sqft: sqftNum,
      stories,
      windows,
      orientation,
      insulation,
      siding,
      designDeltaT: 40,
      indoorRH: 45,
      ductsInAtticOrCrawl,
    };

    const calc = runLoadCalc(input);
    setResult(calc);
    if (onResult) {
      onResult(calc);
    }
  }

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #2d3748",
        borderRadius: "12px",
        marginTop: "20px",
        background: "#020617",
        color: "#e5e7eb",
      }}
    >
      <h2 style={{ marginBottom: "8px", fontSize: "16px", fontWeight: 600 }}>
        Manual-J Lite Load Calculator
      </h2>
      <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "12px" }}>
        Quick, conservative load estimate based on square footage and basic
        envelope details. Not a full ACCA Manual J, but perfect for in-home
        ballparking.
      </p>

      {/* SQFT */}
      <div style={{ marginBottom: "10px", fontSize: "13px" }}>
        <label>Square Footage:</label>
        <input
          type="number"
          value={sqft}
          onChange={(e) => setSqft(e.target.value)}
          placeholder="e.g. 2200"
          style={{
            marginLeft: "10px",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            background: "#020617",
            color: "#e5e7eb",
          }}
        />
      </div>

      {/* Stories */}
      <div style={{ marginBottom: "10px", fontSize: "13px" }}>
        <label>Stories:</label>
        <select
          value={stories}
          onChange={(e) => setStories(Number(e.target.value))}
          style={{
            marginLeft: "10px",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            background: "#020617",
            color: "#e5e7eb",
          }}
        >
          <option value={1}>1</option>
          <option value={1.5}>1.5</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </div>

      {/* Windows */}
      <div style={{ marginBottom: "10px", fontSize: "13px" }}>
        <label>Windows:</label>
        <select
          value={windows}
          onChange={(e) =>
            setWindows(e.target.value as WindowAmount)
          }
          style={{
            marginLeft: "10px",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            background: "#020617",
            color: "#e5e7eb",
          }}
        >
          <option value="few">Few</option>
          <option value="average">Average</option>
          <option value="many">Many</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {/* Orientation */}
      <div style={{ marginBottom: "10px", fontSize: "13px" }}>
        <label>Orientation:</label>
        <select
          value={orientation}
          onChange={(e) =>
            setOrientation(e.target.value as Orientation)
          }
          style={{
            marginLeft: "10px",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            background: "#020617",
            color: "#e5e7eb",
          }}
        >
          <option value="mixed">Mixed</option>
          <option value="north">North</option>
          <option value="south">South</option>
          <option value="east">East</option>
          <option value="west">West</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {/* Insulation */}
      <div style={{ marginBottom: "10px", fontSize: "13px" }}>
        <label>Insulation Level:</label>
        <select
          value={insulation}
          onChange={(e) =>
            setInsulation(e.target.value as InsulationLevel)
          }
          style={{
            marginLeft: "10px",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            background: "#020617",
            color: "#e5e7eb",
          }}
        >
          <option value="poor">Poor</option>
          <option value="average">Average</option>
          <option value="good">Good</option>
        </select>
      </div>

      {/* Siding */}
      <div style={{ marginBottom: "10px", fontSize: "13px" }}>
        <label>Siding:</label>
        <select
          value={siding}
          onChange={(e) =>
            setSiding(e.target.value as SidingType)
          }
          style={{
            marginLeft: "10px",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            background: "#020617",
            color: "#e5e7eb",
          }}
        >
          <option value="unknown">Unknown</option>
          <option value="vinyl">Vinyl</option>
          <option value="wood">Wood</option>
          <option value="fiber cement">Fiber Cement</option>
          <option value="stucco">Stucco</option>
          <option value="brick">Brick</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      {/* Duct location */}
      <div style={{ marginBottom: "14px", fontSize: "13px" }}>
        <label>
          <input
            type="checkbox"
            checked={ductsInAtticOrCrawl}
            onChange={(e) => setDuctsInAtticOrCrawl(e.target.checked)}
            style={{ marginRight: "6px" }}
          />
          Ducts in attic or crawlspace
        </label>
      </div>

      <button
        onClick={handleRunCalc}
        style={{
          padding: "8px 16px",
          background: "#22c55e",
          color: "#020617",
          borderRadius: "8px",
          border: "none",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Run Load Calc
      </button>

      {result && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            border: "1px solid #374151",
            borderRadius: "10px",
            background: "#020617",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
            Load Calc Result
          </h3>
          <p style={{ fontSize: "13px" }}>
            <strong>Sensible BTUH:</strong> {result.sensibleBTUH}
          </p>
          <p style={{ fontSize: "13px" }}>
            <strong>Latent BTUH:</strong> {result.latentBTUH}
          </p>
          <p style={{ fontSize: "13px" }}>
            <strong>Total BTUH:</strong> {result.totalBTUH}
          </p>
          <p style={{ fontSize: "13px" }}>
            <strong>Recommended Tonnage:</strong>{" "}
            {result.recommendedTonnage.toFixed(2)} Tons
          </p>

          {result.notes.length > 0 && (
            <>
              <h4
                style={{
                  marginTop: "10px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Notes:
              </h4>
              <ul style={{ fontSize: "12px", paddingLeft: "18px" }}>
                {result.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}