# Dr HVAC – AI Load & Equipment Intake System

An AI-powered HVAC field tool that lets techs:

- Upload **exterior + equipment photos**
- Automatically extract **house & equipment data**
- Run a **Manual-J Lite** style load calculation
- Generate a **1-page professional PDF job summary**

Built for **in-home comfort consultations, replacements, and sizing checks**.

---

## 🔧 Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **UI:** React, basic CSS/Tailwind-ready
- **AI:** OpenAI API (vision + reasoning)
- **PDF:** pdf-lib
- **Runtime:** Node.js

---

## 🧠 Core Features

### 1. AI Intake (Photos → Structured Data)

**Route:** \`POST /api/intake\`  
**File:** \`src/app/api/intake/route.ts\`

Given:

- Address
- Exterior photos
- Equipment photos (label, cabinet, flue, etc.)

The system returns:

- **Exterior Analysis**
  - Stories
  - Siding type
  - Window amount (few/average/many)
  - Gutters (yes/no/unclear)
  - Overall condition
  - Confidence score

- **Equipment Analysis**
  - Equipment type (furnace, air handler, HP, AC)
  - Manufacturer (e.g., Trane, Goodman)
  - Model number
  - Serial number
  - Input BTUH / output BTUH (if visible)
  - Staging (single / two-stage / modulating)
  - AFUE (approx or label)
  - Vent type (metal flue / PVC)
  - Manufacture year (derived from serial when possible)

- **Warranty Estimation**
  - Manufacture year
  - Approx age (years)
  - Likely status:
    - \`likely_in_parts_warranty\`
    - \`likely_out_of_warranty\`
    - \`unknown\`

- **Equipment Flags**
  - AFUE vs vent mismatch
  - Any notes (e.g., “80% furnace with PVC venting – check install”)

This is the core “brain” of the system.

---

### 2. Clarification / Validation Layer

**Component:** \`ClarificationForm\` (under \`src/components\`)

When AI confidence is low or data is unclear, the system:

- Prompts for **stories**, **siding**, **window amount**, etc.
- Shows text like:
  - “Overall confidence is low. Please confirm a few key details.”
  - “I couldn’t determine the number of stories. Please select 1, 1.5, 2, or 3.”

This ensures we avoid blind guessing and keep things closer to **ACCA expectations**.

---

### 3. Manual-J Lite Load Calculator

**Engine:** \`src/lib/loadCalc.ts\`  
**UI Panel:** \`src/components/LoadCalcPanel.tsx\`

Inputs:

- Conditioned square footage
- Stories
- Windows: few / average / many
- Orientation: north / south / east / west / mixed
- Insulation: poor / average / good
- Siding type (vinyl, wood, brick, etc.)
- Ducts in attic/crawl: yes/no
- Design ΔT (e.g., 40°F)
- Indoor RH (e.g., 45%)

Outputs:

- **Sensible BTUH**
- **Latent BTUH**
- **Total BTUH**
- **Recommended tonnage** (rounded to quarter-ton)
- Notes such as:
  - “Ducts in unconditioned space: 10% penalty added.”
  - “Based on the inputs, total design load is ~38,720 BTU/h, which is roughly 3.25 tons.”

This is **not** a full ACCA Manual J, but a conservative “Manual-J-lite” approximation for ballpark sizing and comfort discussions.

---

### 4. Combined Job Summary Object

**File:** \`src/app/page.tsx\`

The main page combines all the pieces into a single object:

\`\`\`ts
interface JobSummary {
  address: string;
  exterior: ExteriorAnalysis | null;
  equipment: EquipmentAnalysis | null;
  warranty: WarrantyInfo;
  equipmentFlags: EquipmentFlags | null;
  loadCalc: LoadCalcResult | null;
}
\`\`\`

Example:

\`\`\`json
{
  "address": "7320 45th Ave NE, Seattle, WA 98115",
  "exterior": {
    "stories": 1,
    "siding": "mixed",
    "windows": "average",
    "gutters": "unclear",
    "condition": "good",
    "confidence": 0.75
  },
  "equipment": {
    "equipmentType": "furnace",
    "manufacturer": "Trane",
    "modelNumber": "AUD2B080A9V3VBA",
    "serialNumber": "123745N3G1G",
    "inputBTUH": 80000,
    "afue": 80,
    "stages": "two-stage",
    "ventType": "metal_flue",
    "manufactureYear": 2012
  },
  "warranty": {
    "manufactureYear": 2012,
    "approxAgeYears": 13,
    "likelyWarrantyStatus": "likely_out_of_warranty"
  },
  "equipmentFlags": {
    "afueVentMismatch": false,
    "notes": []
  },
  "loadCalc": {
    "sensibleBTUH": 32267,
    "latentBTUH": 6453,
    "totalBTUH": 38720,
    "recommendedTonnage": 3.25,
    "notes": [
      "Ducts in unconditioned space: 10% penalty added.",
      "Based on the inputs, total design load is ~38720 BTU/h, which is roughly 3.25 tons."
    ]
  }
}
\`\`\`

This object is the **single source of truth** for:

- PDF generation
- Future CRM integration
- Job history storage

---

### 5. PDF Job Report Generator

**Route:** \`POST /api/pdf\`  
**File:** \`src/app/api/pdf/route.ts\`  
**Lib:** \`pdf-lib\`

Takes a \`JobSummary\` payload and returns a **1-page PDF** containing:

- Header: **“Dr HVAC – Job Summary Report”**
- Address
- Exterior section
- Equipment summary
- Warranty information
- Flags (equipment notes, mismatches, etc.)
- Manual-J Lite results (BTUH + tonnage)
- Footer: “Generated by Dr HVAC AI”

On the frontend, a button calls:

\`\`\ts
await fetch("/api/pdf", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(jobSummary),
});
\`\`\`

Then downloads the PDF as \`job-summary.pdf\`.

---

## �� Folder Structure (High Level)

\`\`\bash
src/
  app/
    api/
      intake/
        route.ts      # AI intake: photos -> analysis JSON
      pdf/
        route.ts      # PDF generator: JobSummary -> PDF
    page.tsx          # Main UI + workflow + jobSummary
  components/
    LoadCalcPanel.tsx # Manual-J Lite UI
    ClarificationForm.tsx (optional) # AI clarification UI
  lib/
    loadCalc.ts       # Manual-J Lite engine (no UI)
\`\`\`

---

## ▶️ Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- npm or pnpm or yarn
- OpenAI API key

### 1. Install dependencies

From the \`web\` folder:

\`\`\bash
npm install
\`\`\`

### 2. Set environment variables

Create \`.env.local\`:

\`\`\bash
OPENAI_API_KEY=your_real_api_key_here
\`\`\`

(Make sure the OpenAI client in \`/api/intake/route.ts\` is reading from \`process.env.OPENAI_API_KEY\`.)

### 3. Run the dev server

\`\`\bash
npm run dev
\`\`\`

Then open:

\`\`\text
http://localhost:3000
\`\`\`

---

## 🧪 How to Use the App (Field / Staff Guide)

1. **Enter the address** of the property.
2. **Upload at least one exterior photo** (front of house).
3. **Upload equipment photos**:
   - Close-up of model/serial label
   - Wider shot of furnace/air handler/HP
   - Flue / venting if possible
4. Click **Run AI Intake**.
5. Review the **Exterior** and **Equipment** summaries.
6. If needed, fix any unclear details (stories, siding, windows).
7. Scroll to the **Manual-J Lite Load Calculator**:
   - Enter square footage and other fields.
   - Click **Run Load Calc**.
8. Review the **Combined Job Summary JSON** (debug section).
9. Click **Download PDF Summary** to get a 1-page PDF.

---

## 🧱 Developer Notes

- To change AI behavior or extraction logic:  
  → Update prompts/logic in \`src/app/api/intake/route.ts\`.

- To tweak load calculation logic:  
  → Edit \`src/lib/loadCalc.ts\`.

- To change how the PDF looks:  
  → Modify \`src/app/api/pdf/route.ts\`.

- To add more fields to the report:
  - Add them to \`JobSummary\` in \`page.tsx\`
  - Pass them into the PDF route
  - Draw them with \`page.drawText\` in \`route.ts\`

---

## 🚀 Future Roadmap Ideas

- Full ACCA Manual J support
- Good/Better/Best replacement recommendations
- Customer-facing proposal version of the PDF
- Embedding photos in the PDF (house + equipment)
- Tech login & job history
- Direct CRM / project management integration

---

## 👤 Owner

**Dr HVAC / Proxel Solutions**  
Built as an internal tool to modernize in-home HVAC consultations using AI, data, and automation.
