import { test } from "node:test";
import assert from "node:assert/strict";
import {
  markerKey, parseValue, markerSeries, healthScore, scoreSeries, postureScans, postureChanges, inRange,
} from "../lib/progress.ts";

const day = (n) => new Date(Date.UTC(2026, 0, 1) + n * 86400e3);
const lab = (id, d, metrics) => ({ id, type: "MEDICAL_REPORT", timestamp: day(d), summary: "", metrics, recommendations: [], disclaimer: "" });
const pose = (id, d, posture, metrics = []) => ({ id, type: "BODY_POSE", timestamp: day(d), summary: "", metrics, recommendations: [], disclaimer: "", posture });

test("marker aliases collapse onto one key", () => {
  assert.equal(markerKey("LDL"), markerKey("LDL Cholesterol"));
  assert.equal(markerKey("LDL-C"), markerKey("ldl cholesterol"));
  assert.equal(markerKey("HbA1c (glycated)"), markerKey("A1C"));
  assert.notEqual(markerKey("LDL"), markerKey("HDL"));
});

test("parseValue reads the first number and its unit", () => {
  assert.deepEqual(parseValue("142 mg/dL"), { num: 142, unit: "mg/dL" });
  assert.deepEqual(parseValue("5.8%"), { num: 5.8, unit: "%" });
  assert.deepEqual(parseValue("1,250 IU"), { num: 1250, unit: "IU" });
  assert.equal(parseValue("120/80 mmHg").num, 120);
  assert.equal(parseValue("Normal").num, null);
  assert.equal(parseValue(7).num, 7);
});

test("markerSeries groups readings oldest → newest across reports", () => {
  const h = [
    lab("b", 30, [{ label: "LDL cholesterol", value: "128 mg/dL", status: "warning" }]),
    lab("a", 0, [{ label: "LDL", value: "160 mg/dL", status: "critical" }, { label: "HDL", value: "50 mg/dL", status: "normal" }]),
  ];
  const [ldl, hdl] = markerSeries(h);
  assert.equal(ldl.name, "LDL cholesterol", "latest wording wins");
  assert.deepEqual(ldl.points.map((p) => p.num), [160, 128]);
  assert.equal(ldl.unit, "mg/dL");
  assert.equal(hdl.points.length, 1);
});

test("healthScore weighs latest marker statuses and posture findings", () => {
  assert.equal(healthScore([]), null);
  const allNormal = [lab("a", 0, [{ label: "LDL", value: "90", status: "normal" }, { label: "HDL", value: "60", status: "normal" }])];
  assert.equal(healthScore(allNormal), 100);
  const mixed = [lab("a", 0, [{ label: "LDL", value: "160", status: "critical" }, { label: "HDL", value: "60", status: "normal" }])];
  assert.equal(healthScore(mixed), 63); // (0.25 + 1) / 2
  const improved = [...mixed, lab("b", 10, [{ label: "LDL", value: "95", status: "normal" }])];
  assert.equal(healthScore(improved), 100, "a newer reading replaces the old status");
  const withPosture = [...improved, pose("p", 12, [{ issue: "forward_head", severity: "moderate" }, { issue: "kyphosis", severity: "mild" }])];
  assert.equal(healthScore(withPosture), 94); // 100 − 4 − 2
});

test("scoreSeries yields one point per scorable analysis, chronologically", () => {
  const h = [
    lab("b", 10, [{ label: "LDL", value: "95", status: "normal" }]),
    { id: "m", type: "MEDICINE", timestamp: day(5), summary: "", metrics: [], recommendations: [], disclaimer: "" },
    lab("a", 0, [{ label: "LDL", value: "160", status: "critical" }]),
  ];
  assert.deepEqual(scoreSeries(h).map((p) => p.score), [25, 25, 100]);
});

test("postureChanges labels improved, worse, resolved and new", () => {
  const scans = postureScans([
    pose("2", 20, [{ issue: "forward_head", severity: "mild" }, { issue: "kyphosis", severity: "severe" }, { issue: "knee_valgus", severity: "mild" }]),
    pose("1", 0, [{ issue: "forward_head", severity: "moderate" }, { issue: "kyphosis", severity: "mild" }, { issue: "lordosis", severity: "mild" }]),
    pose("old", -5, undefined),
  ]);
  assert.equal(scans.length, 2, "scans without structured findings are skipped");
  const t = Object.fromEntries(postureChanges(scans[0], scans[1]).map((c) => [c.issue, c.trend]));
  assert.deepEqual(t, { forward_head: "improved", kyphosis: "worse", lordosis: "resolved", knee_valgus: "new" });
});

test("inRange keeps only analyses inside the window", () => {
  const now = day(100).getTime();
  const h = [lab("a", 0, []), lab("b", 80, []), lab("c", 99, [])];
  assert.deepEqual(inRange(h, "30d", now).map((x) => x.id), ["b", "c"]);
  assert.equal(inRange(h, "all", now).length, 3);
});
