// Structured posture findings. The AI must pick from this fixed vocabulary so
// the frontend can pose the 3D mannequin and suggest matching exercises.
import { Type } from "@google/genai";

export const POSTURE_ISSUES = [
  "forward_head",
  "rounded_shoulders",
  "kyphosis",
  "anterior_pelvic_tilt",
  "posterior_pelvic_tilt",
  "lordosis",
  "flat_back",
  "uneven_shoulders",
  "lateral_pelvic_tilt",
  "knee_valgus",
];
export const SEVERITIES = ["mild", "moderate", "severe"];
export const SIDES = ["left", "right", "none"];

export const postureFindingsSchema = {
  type: Type.ARRAY,
  description:
    "Only for BODY_POSE analyses: each clearly visible postural deviation. Empty array for other analysis types or if posture looks neutral.",
  items: {
    type: Type.OBJECT,
    properties: {
      issue: { type: Type.STRING, enum: POSTURE_ISSUES },
      severity: { type: Type.STRING, enum: SEVERITIES },
      side: { type: Type.STRING, enum: SIDES, description: "Which side is higher/affected, for asymmetries." },
      note: { type: Type.STRING, description: "One short sentence describing what is visible in the photo." },
    },
    required: ["issue", "severity"],
  },
};

export const POSTURE_PROMPT =
  "For BODY_POSE analyses, also fill postureFindings with each clearly visible deviation " +
  "(use the side view for head, shoulder, spine and pelvis alignment; the front view for " +
  "uneven shoulders, lateral pelvic tilt and knee valgus). Only include what you can actually see. " +
  "For every other analysis type return an empty postureFindings array.";

/** Keep only well-formed, de-duplicated findings (max 6). Never trust model output blindly. */
export function sanitizeFindings(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const f of raw) {
    if (!f || !POSTURE_ISSUES.includes(f.issue) || seen.has(f.issue)) continue;
    seen.add(f.issue);
    out.push({
      issue: f.issue,
      severity: SEVERITIES.includes(f.severity) ? f.severity : "mild",
      side: SIDES.includes(f.side) ? f.side : "none",
      note: typeof f.note === "string" ? f.note.slice(0, 300) : "",
    });
    if (out.length === 6) break;
  }
  return out;
}
