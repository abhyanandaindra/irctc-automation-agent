import assert from "node:assert/strict";
import test from "node:test";
import { classifyNavigationError, classifyNavigationResponse, navigationDecision } from "../src/core/navigation.js";

test("classifies timeout, DNS, protocol, and unknown navigation errors", () => {
  assert.equal(classifyNavigationError(new Error("page.goto: Timeout 30000ms exceeded")), "TIMEOUT");
  assert.equal(classifyNavigationError(new Error("net::ERR_NAME_NOT_RESOLVED")), "DNS_ERROR");
  assert.equal(classifyNavigationError(new Error("net::ERR_HTTP2_PROTOCOL_ERROR")), "PROTOCOL_ERROR");
  assert.equal(classifyNavigationError(new Error("unexpected browser failure")), "UNKNOWN_ERROR");
});

test("classifies HTTP errors and unexpected redirects", () => {
  assert.equal(classifyNavigationResponse(503, true), "HTTP_ERROR");
  assert.equal(classifyNavigationResponse(200, false), "UNEXPECTED_REDIRECT");
  assert.equal(classifyNavigationResponse(200, true), "SUCCESS");
});

test("navigation failures always stop", () => {
  assert.equal(navigationDecision("PROTOCOL_ERROR"), "STOP");
  assert.equal(navigationDecision("NETWORK_ERROR"), "STOP");
  assert.equal(navigationDecision("SUCCESS"), "CONTINUE");
});
