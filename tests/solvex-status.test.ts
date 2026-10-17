import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSolvexStatus } from "../shared/solvex-status";

test("normalizes SolvexPay terminal statuses regardless of case or event prefix", () => {
  for (const status of ["completed", "COMPLETE", "success", "successful", "succeeded", "paid", "approved"]) {
    assert.equal(normalizeSolvexStatus(status), "completed", status);
  }
  for (const status of ["failed", "FAILURE", "rejected", "declined", "cancelled", "canceled", "expired", "error", "denied", "transaction.failed"]) {
    assert.equal(normalizeSolvexStatus(status), "failed", status);
  }
  for (const status of ["pending", "processing", "initiated", "", undefined]) {
    assert.equal(normalizeSolvexStatus(status), "pending", String(status));
  }
  assert.equal(normalizeSolvexStatus(undefined, "transaction.cancelled"), "failed");
});
