import assert from "node:assert/strict";
import test from "node:test";
import { IRCTC_URLS } from "../src/config/constants.js";
import { detectSite } from "../src/sites/detectSite.js";

test("detects the NGET interface", () => {
  assert.equal(detectSite(IRCTC_URLS.nget), "NGET");
});

test("detects the ETICKET interface", () => {
  assert.equal(detectSite(IRCTC_URLS.eticket), "ETICKET");
});

test("returns UNKNOWN for a different host or malformed URL", () => {
  assert.equal(detectSite("https://example.com/nget/train-search"), "UNKNOWN");
  assert.equal(detectSite("not-a-url"), "UNKNOWN");
});

test("preserves interface detection with query parameters and fragments", () => {
  assert.equal(detectSite(`${IRCTC_URLS.nget}?source=smoke#results`), "NGET");
  assert.equal(detectSite(`${IRCTC_URLS.eticket}?source=smoke#results`), "ETICKET");
});

test("accepts trailing path variations while keeping the host verified", () => {
  assert.equal(detectSite("https://www.irctc.co.in/nget/train-search/"), "NGET");
  assert.equal(detectSite("https://www.irctc.co.in/eticket/"), "ETICKET");
  assert.equal(detectSite("https://www.irctc.co.in/other/train-search"), "UNKNOWN");
});
