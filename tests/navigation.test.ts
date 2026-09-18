import assert from "node:assert/strict";
import test from "node:test";
import { canRecoverFromAbortedNavigation, classifyNavigationError, classifyNavigationResponse, navigationDecision } from "../src/core/navigation.js";

test("classifies timeout, DNS, protocol, and unknown navigation errors", () => {
  assert.equal(classifyNavigationError(new Error("page.goto: Timeout 30000ms exceeded")), "TIMEOUT");
  assert.equal(classifyNavigationError(new Error("net::ERR_NAME_NOT_RESOLVED")), "DNS_ERROR");
  assert.equal(classifyNavigationError(new Error("net::ERR_HTTP2_PROTOCOL_ERROR")), "PROTOCOL_ERROR");
  assert.equal(classifyNavigationError(new Error("unexpected browser failure")), "UNKNOWN_ERROR");
});

test("classifies ERR_ABORTED neutrally as an aborted navigation", () => {
  assert.equal(classifyNavigationError(new Error("page.goto: net::ERR_ABORTED")), "NAVIGATION_ABORTED");
});

test("requires positive evidence before recovering an aborted navigation", () => {
  assert.equal(canRecoverFromAbortedNavigation({
    pageOpen: true,
    finalUrlIsOfficialNget: true,
    detectedSiteIsNget: true,
    pageStateIsTrainSearch: true,
    trainSearchControlsVisible: true,
  }), true);
  assert.equal(canRecoverFromAbortedNavigation({
    pageOpen: true,
    finalUrlIsOfficialNget: true,
    detectedSiteIsNget: true,
    pageStateIsTrainSearch: true,
    trainSearchControlsVisible: false,
  }), false);
});

test("classifies HTTP errors and unexpected redirects", () => {
  assert.equal(classifyNavigationResponse(503, true), "HTTP_ERROR");
  assert.equal(classifyNavigationResponse(200, false), "UNEXPECTED_REDIRECT");
  assert.equal(classifyNavigationResponse(200, true), "SUCCESS");
});

test("navigation failures always stop", () => {
  assert.equal(navigationDecision("PROTOCOL_ERROR"), "STOP");
  assert.equal(navigationDecision("NETWORK_ERROR"), "STOP");
  assert.equal(navigationDecision("NAVIGATION_ABORTED"), "STOP");
  assert.equal(navigationDecision("SUCCESS"), "CONTINUE");
});
