import assert from "node:assert/strict";
import test from "node:test";
import { parseSearchArgs, tripInputFromArgs } from "../src/config/searchArgs.js";

test("parses explicit search arguments and dry-run", () => {
  const args = parseSearchArgs([
    "--from=NDLS",
    "--to=BCT",
    "--date=2026-10-01",
    "--quota=GENERAL",
    "--dry-run",
  ]);
  assert.deepEqual(args, { from: "NDLS", to: "BCT", date: "2026-10-01", quota: "GENERAL", dryRun: true });
  assert.deepEqual(tripInputFromArgs(args).fromStation, { code: "NDLS" });
});
