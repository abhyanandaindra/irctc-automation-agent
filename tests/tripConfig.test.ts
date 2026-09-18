import assert from "node:assert/strict";
import test from "node:test";
import {
  formatJourneyDateForUi,
  isQuota,
  normalizeJourneyDate,
  validateTrip,
} from "../src/core/tripConfig.js";

const validInput = {
  fromStation: { code: "NDLS" },
  toStation: { code: "BCT" },
  journeyDate: "2026-10-01",
  quota: "GENERAL",
  today: "2026-09-18",
};

test("accepts a valid trip", () => {
  const result = validateTrip(validInput);
  assert.equal(result.valid, true);
  assert.equal(result.trip?.fromStation.code, "NDLS");
});

test("rejects missing and malformed stations", () => {
  assert.equal(validateTrip({ ...validInput, fromStation: undefined }).valid, false);
  assert.equal(validateTrip({ ...validInput, toStation: undefined }).valid, false);
  assert.equal(validateTrip({ ...validInput, fromStation: { code: "N" } }).valid, false);
  assert.equal(validateTrip({ ...validInput, fromStation: { code: "NDLS1" } }).valid, false);
  assert.equal(validateTrip({ ...validInput, fromStation: { code: "ndls" } }).valid, false);
});

test("rejects identical stations", () => {
  const result = validateTrip({ ...validInput, toStation: { code: "NDLS" } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("different")));
});

test("rejects invalid and past dates", () => {
  assert.equal(validateTrip({ ...validInput, journeyDate: "2026-02-30" }).valid, false);
  assert.equal(validateTrip({ ...validInput, journeyDate: "2026-09-17" }).valid, false);
});

test("normalizes and formats dates deterministically", () => {
  assert.equal(normalizeJourneyDate(" 2026-10-01 "), "2026-10-01");
  assert.equal(formatJourneyDateForUi("2026-10-01"), "01/10/2026");
});

test("accepts supported quotas and rejects unsupported quota", () => {
  assert.equal(isQuota("GENERAL"), true);
  assert.equal(isQuota("TATKAL"), true);
  assert.equal(isQuota("PREMIUM_TATKAL"), true);
  assert.equal(validateTrip({ ...validInput, quota: "LADIES" }).valid, false);
});
