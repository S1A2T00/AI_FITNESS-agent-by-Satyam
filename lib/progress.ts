// Turn the analysis history into trends: a health score over time, a series per
// lab marker, and posture changes between scans. Pure functions, no React.
import type { AnalysisResult, HealthMetric, PostureFinding, PostureIssue } from '../types';

type Status = HealthMetric['status'];

/* ---------------- lab markers ---------------- */

// Common aliases so "LDL", "LDL-C" and "LDL cholesterol" land on one line.
const ALIASES: Record<string, string> = {
  ldl: 'ldl cholesterol', ldlc: 'ldl cholesterol', ldlcholesterol: 'ldl cholesterol',
  hdl: 'hdl cholesterol', hdlc: 'hdl cholesterol', hdlcholesterol: 'hdl cholesterol',
  tg: 'triglycerides', triglyceride: 'triglycerides',
  tc: 'total cholesterol', cholesterol: 'total cholesterol', totalcholesterol: 'total cholesterol',
  hba1c: 'hba1c', a1c: 'hba1c', glycatedhemoglobin: 'hba1c', glycatedhaemoglobin: 'hba1c',
  fbs: 'fasting glucose', fastingbloodsugar: 'fasting glucose', fastingglucose: 'fasting glucose', glucosefasting: 'fasting glucose',
  hb: 'hemoglobin', hgb: 'hemoglobin', haemoglobin: 'hemoglobin', hemoglobin: 'hemoglobin',
  tsh: 'tsh', vitd: 'vitamin d', vitamind: 'vitamin d', vitamind3: 'vitamin d', '25ohd': 'vitamin d', vitaminb12: 'vitamin b12', b12: 'vitamin b12',
};

/** Stable key for a marker label. */
export function markerKey(label: string): string {
  const squashed = label.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');
  return ALIASES[squashed] ?? label.toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
}

/** First number in a value like "142 mg/dL", "5.8%", "120/80 mmHg". */
export function parseValue(value: string | number): { num: number | null; unit: string } {
  if (typeof value === 'number') return { num: Number.isFinite(value) ? value : null, unit: '' };
  const m = String(value).replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)\s*([^\d\s][^\s]*)?/);
  if (!m) return { num: null, unit: '' };
  return { num: Number(m[1]), unit: (m[2] ?? '').replace(/[.,;]$/, '') };
}

export interface MarkerPoint { date: Date; num: number | null; raw: string; status: Status; analysisId: string }
export interface MarkerSeries { key: string; name: string; unit: string; points: MarkerPoint[] }

const byDate = (a: { timestamp: Date }, b: { timestamp: Date }) => a.timestamp.getTime() - b.timestamp.getTime();

/** One series per lab marker, oldest → newest. Sorted by number of readings. */
export function markerSeries(history: AnalysisResult[]): MarkerSeries[] {
  const map = new Map<string, MarkerSeries>();
  for (const a of [...history].filter((h) => h.type === 'MEDICAL_REPORT').sort(byDate)) {
    for (const m of a.metrics) {
      const key = markerKey(m.label);
      const { num, unit } = parseValue(m.value);
      const s = map.get(key) ?? { key, name: m.label, unit, points: [] };
      s.name = m.label; // latest wording wins
      if (unit) s.unit = unit;
      s.points.push({ date: a.timestamp, num, raw: String(m.value), status: m.status, analysisId: a.id });
      map.set(key, s);
    }
  }
  return [...map.values()].sort((a, b) => b.points.length - a.points.length || a.name.localeCompare(b.name));
}

/* ---------------- health score ---------------- */

const STATUS_WEIGHT: Partial<Record<Status, number>> = { normal: 1, warning: 0.6, critical: 0.25 };
const POSTURE_PENALTY: Record<PostureFinding['severity'], number> = { mild: 2, moderate: 4, severe: 7 };

/**
 * 0–100 from the latest status of every lab marker (normal 1, watch 0.6,
 * attention 0.25), minus a penalty for findings in the latest posture scan.
 * Null when there is nothing to score yet.
 */
export function healthScore(history: AnalysisResult[]): number | null {
  const sorted = [...history].sort(byDate);
  const latest = new Map<string, Status>();
  for (const a of sorted) {
    if (a.type !== 'MEDICAL_REPORT') continue;
    for (const m of a.metrics) latest.set(markerKey(m.label), m.status);
  }
  const lastPosture = sorted.filter((a) => a.type === 'BODY_POSE').at(-1);
  // Older posture scans have no structured findings; use their metric statuses instead.
  if (lastPosture && !lastPosture.posture) {
    for (const m of lastPosture.metrics) latest.set(`posture:${markerKey(m.label)}`, m.status);
  }

  const weights = [...latest.values()].map((s) => STATUS_WEIGHT[s]).filter((w): w is number => w !== undefined);
  const penalty = Math.min(25, (lastPosture?.posture ?? []).reduce((p, f) => p + POSTURE_PENALTY[f.severity], 0));

  if (!weights.length && !lastPosture) return null;
  const base = weights.length ? (weights.reduce((a, b) => a + b, 0) / weights.length) * 100 : 100;
  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}

/** Score after each analysis (using everything up to that point). */
export function scoreSeries(history: AnalysisResult[]): { date: Date; score: number }[] {
  const sorted = [...history].sort(byDate);
  const out: { date: Date; score: number }[] = [];
  sorted.forEach((a, i) => {
    const s = healthScore(sorted.slice(0, i + 1));
    if (s !== null) out.push({ date: a.timestamp, score: s });
  });
  return out;
}

/* ---------------- posture ---------------- */

export type Trend = 'improved' | 'worse' | 'same' | 'resolved' | 'new';
const SEV_RANK: Record<PostureFinding['severity'], number> = { mild: 1, moderate: 2, severe: 3 };

export interface PostureScan { id: string; date: Date; findings: PostureFinding[] }

/** Posture scans that carry structured findings, oldest → newest. */
export function postureScans(history: AnalysisResult[]): PostureScan[] {
  return [...history]
    .filter((h) => h.type === 'BODY_POSE' && Array.isArray(h.posture))
    .sort(byDate)
    .map((h) => ({ id: h.id, date: h.timestamp, findings: h.posture! }));
}

/** Compare two scans issue by issue. */
export function postureChanges(from: PostureScan, to: PostureScan): { issue: PostureIssue; before?: PostureFinding; after?: PostureFinding; trend: Trend }[] {
  const issues = new Set<PostureIssue>([...from.findings, ...to.findings].map((f) => f.issue));
  return [...issues].map((issue) => {
    const before = from.findings.find((f) => f.issue === issue);
    const after = to.findings.find((f) => f.issue === issue);
    let trend: Trend = 'same';
    if (before && !after) trend = 'resolved';
    else if (!before && after) trend = 'new';
    else if (before && after) {
      const d = SEV_RANK[after.severity] - SEV_RANK[before.severity];
      trend = d < 0 ? 'improved' : d > 0 ? 'worse' : 'same';
    }
    return { issue, before, after, trend };
  });
}

/* ---------------- ranges ---------------- */

export type Range = '30d' | '90d' | '1y' | 'all';
export const RANGES: { id: Range; label: string }[] = [
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '1y', label: '12 months' },
  { id: 'all', label: 'All time' },
];

export function inRange(history: AnalysisResult[], range: Range, now = Date.now()): AnalysisResult[] {
  if (range === 'all') return history;
  const days = { '30d': 30, '90d': 90, '1y': 365 }[range];
  const from = now - days * 86400e3;
  return history.filter((h) => h.timestamp.getTime() >= from);
}
