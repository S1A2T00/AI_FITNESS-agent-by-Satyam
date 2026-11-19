import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeFindings, POSTURE_ISSUES } from "../server/posture.mjs";

test("keeps valid findings and normalises fields", () => {
  const out = sanitizeFindings([
    { issue: "forward_head", severity: "moderate", note: "Ear ahead of shoulder." },
    { issue: "uneven_shoulders", severity: "mild", side: "right" },
  ]);
  assert.deepEqual(out, [
    { issue: "forward_head", severity: "moderate", side: "none", note: "Ear ahead of shoulder." },
    { issue: "uneven_shoulders", severity: "mild", side: "right", note: "" },
  ]);
});

test("drops unknown issues, duplicates and junk", () => {
  const out = sanitizeFindings([
    { issue: "made_up_issue", severity: "severe" },
    { issue: "kyphosis", severity: "extreme" },
    { issue: "kyphosis", severity: "mild" },
    null,
    "nonsense",
  ]);
  assert.deepEqual(out.map((f) => [f.issue, f.severity]), [["kyphosis", "mild"]]);
});

test("caps the list and tolerates non-arrays", () => {
  assert.deepEqual(sanitizeFindings(undefined), []);
  assert.deepEqual(sanitizeFindings({}), []);
  const many = POSTURE_ISSUES.map((issue) => ({ issue, severity: "mild" }));
  assert.equal(sanitizeFindings(many).length, 6);
});
