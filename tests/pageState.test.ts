import assert from "node:assert/strict";
import test from "node:test";
import { decisionForCheckpoint, detectPageState } from "../src/core/pageState.js";

const base = {
  site: "NGET" as const,
  url: "https://www.irctc.co.in/nget/train-search",
};

test("recognizes a verified train-search destination", () => {
  const result = detectPageState({ ...base, title: "IRCTC Train Search", visibleText: "From To Search" });
  assert.equal(result.state, "TRAIN_SEARCH");
  assert.equal(result.decision, "CONTINUE");
});

test("recognizes verified train results evidence", () => {
  const result = detectPageState({
    ...base,
    title: "Train Results",
    visibleText: "Train Number Train Name Availability",
    trainResultCount: 2,
    hasTrainResultStructure: true,
  });
  assert.equal(result.state, "TRAIN_RESULTS");
  assert.equal(result.decision, "CONTINUE");
});

test("recognizes a no-trains result", () => {
  const result = detectPageState({ ...base, title: "", visibleText: "No trains found for this journey" });
  assert.equal(result.state, "NO_TRAINS");
  assert.equal(result.decision, "STOP");
});

test("returns UNKNOWN when there is insufficient evidence", () => {
  const result = detectPageState({ site: "UNKNOWN", url: "https://example.com/", title: "", visibleText: "" });
  assert.equal(result.state, "UNKNOWN");
  assert.equal(result.decision, "STOP");
});

test("creates human checkpoints without exposing values", () => {
  const captcha = detectPageState({ ...base, title: "", visibleText: "Security verification CAPTCHA" });
  assert.equal(captcha.state, "HUMAN_CAPTCHA");
  assert.equal(captcha.decision, "PAUSE_FOR_HUMAN");
  assert.equal(captcha.checkpoint?.requiresHumanAction, true);
  assert.equal(decisionForCheckpoint("OTP"), "PAUSE_FOR_HUMAN");
  assert.equal(decisionForCheckpoint("PAYMENT_AUTHORIZATION"), "PAUSE_FOR_HUMAN");
});

test("stops on access restrictions and queues", () => {
  const restricted = detectPageState({ ...base, title: "", visibleText: "Access denied" });
  const queue = detectPageState({ ...base, title: "", visibleText: "Waiting room" });
  assert.equal(restricted.state, "ACCESS_RESTRICTED");
  assert.equal(restricted.decision, "STOP");
  assert.equal(queue.state, "QUEUE_OR_WAITING_ROOM");
  assert.equal(queue.decision, "STOP");
});
