import { BrowserManager } from "../browser/browserManager.js";
import { loadConfig } from "../config/env.js";
import { parseSearchArgs, tripInputFromArgs, tripSummary } from "../config/searchArgs.js";
import { validateTrip } from "../core/tripConfig.js";
import { classifyNavigationError } from "../core/navigation.js";
import { NgetTrainSearchPage } from "../sites/nget/trainSearchPage.js";
import { logger } from "../utils/logger.js";

async function run(): Promise<void> {
  const args = parseSearchArgs(process.argv.slice(2));
  const validation = validateTrip(tripInputFromArgs(args));
  if (!validation.valid || validation.trip === undefined) {
    for (const error of validation.errors) logger.error(error);
    process.exitCode = 2;
    return;
  }

  logger.info("SEARCH-ONLY MODE — NO BOOKING WILL BE ATTEMPTED", { dryRun: args.dryRun });
  logger.info("Validated trip", tripSummary(validation.trip));
  if (args.dryRun) return;

  const config = loadConfig({ ...process.env, IRCTC_INTERFACE: "nget" });
  if (config.headless) {
    throw new Error("Live NGET search requires headed Chrome. Set IRCTC_HEADLESS=false; headless mode is not used for live search.");
  }

  const browserManager = new BrowserManager({
    headless: false,
    timeoutMs: config.timeoutMs,
    ...(config.browserExecutablePath === undefined ? {} : { executablePath: config.browserExecutablePath }),
  });
  try {
    const page = await browserManager.launch();
    logger.info("Starting one live NGET search", { requestedUrl: config.targetUrl, browser: "headed-chromium" });
    const searchPage = new NgetTrainSearchPage(page);
    try {
      await page.goto(config.targetUrl, { waitUntil: "domcontentloaded" });
    } catch (error: unknown) {
      const classification = classifyNavigationError(error);
      if (classification !== "NAVIGATION_ABORTED") throw error;
      logger.warn("Initial navigation was superseded; continuing only if the verified NGET page is usable", {
        classification,
        currentUrl: page.url(),
      });
    }
    await searchPage.verifyTrainSearchPage();
    await searchPage.fillSource(validation.trip.fromStation);
    await searchPage.fillDestination(validation.trip.toStation);
    await searchPage.setJourneyDate(validation.trip.journeyDate);
    await searchPage.selectQuota(validation.trip.quota);
    const result = await searchPage.submitSearch(validation.trip);
    logger.info("NGET search-only result", {
      ...tripSummary(validation.trip),
      state: result.state.state,
      decision: result.state.decision,
      resultCount: result.resultCount,
      trainNumbers: result.visibleTrainNumbers,
      automaticRetries: 0,
      bookingActions: 0,
    });
  } finally {
    await browserManager.close();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown search failure";
  logger.error("Search-only workflow stopped", { message });
  process.exitCode = 1;
});
