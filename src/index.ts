import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { BrowserManager } from "./browser/browserManager.js";
import { loadConfig } from "./config/env.js";
import { classifyNavigationError, classifyNavigationResponse, navigationDecision } from "./core/navigation.js";
import { detectPageState } from "./core/pageState.js";
import { SmokeDiagnostics } from "./browser/smokeDiagnostics.js";
import { detectSite } from "./sites/detectSite.js";
import { logger } from "./utils/logger.js";

function requestedSiteFromArgs(): "nget" | "eticket" | undefined {
  const argument = process.argv.slice(2).find((value) => value.startsWith("--site="));
  if (argument === undefined) return undefined;
  const value = argument.slice("--site=".length);
  if (value === "nget" || value === "eticket") return value;
  throw new Error("Invalid --site value. Use --site=nget or --site=eticket.");
}

async function runSmoke(): Promise<void> {
  const cliSite = requestedSiteFromArgs();
  const config = loadConfig(cliSite === undefined ? process.env : { ...process.env, IRCTC_INTERFACE: cliSite });
  const browserManager = new BrowserManager({
    headless: config.headless,
    timeoutMs: config.timeoutMs,
    ...(config.browserExecutablePath === undefined
      ? {}
      : { executablePath: config.browserExecutablePath }),
  });

  logger.info("Starting navigation smoke test", {
    requestedInterface: config.requestedInterface,
    targetUrl: config.targetUrl,
    headless: config.headless,
  });

  try {
    const page = await browserManager.launch();
    const diagnostics = new SmokeDiagnostics();
    diagnostics.attach(page);
    logger.info("Runtime diagnostics", { ...browserManager.runtimeDiagnostics() });
    const startedAt = Date.now();
    let response;
    try {
      response = await page.goto(config.targetUrl, { waitUntil: "domcontentloaded" });
    } catch (error: unknown) {
      const classification = classifyNavigationError(error);
      const errorName = error instanceof Error ? error.name : "UnknownError";
      const errorMessage = error instanceof Error ? error.message.replace(/[\r\n]+/g, " ").slice(0, 300) : "Unknown navigation error";
      const result = {
        requestedUrl: config.targetUrl,
        detectedSite: detectSite(page.url()),
        classification,
        decision: navigationDecision(classification),
        elapsedMs: Date.now() - startedAt,
        errorName,
        errorMessage,
        diagnostics: diagnostics.snapshot(),
      };
      logger.error("Navigation result", result);
      return;
    }
    const currentUrl = page.url();
    const detectedInterface = detectSite(currentUrl);
    const pageTitle = await page.title().catch(() => "");
    const classification = classifyNavigationResponse(
      response?.status(),
      detectedInterface === config.requestedInterface,
    );
    const result = {
      requestedInterface: config.requestedInterface,
      requestedUrl: config.targetUrl,
      finalUrl: currentUrl,
      detectedSite: detectedInterface,
      classification,
      decision: navigationDecision(classification),
      httpStatus: response?.status(),
      pageTitle: pageTitle.slice(0, 200),
      elapsedMs: Date.now() - startedAt,
      diagnostics: diagnostics.snapshot(),
    };
    if (classification === "SUCCESS") {
      const visibleText = await page.locator("body").innerText({ timeout: 2_000 }).catch(() => "");
      const pageState = detectPageState({ site: detectedInterface, url: currentUrl, title: pageTitle, visibleText });
      logger.info("Navigation result", { ...result, pageState });
      if (config.smokeScreenshot && ["BLOCKED_OR_CHALLENGED", "IRCTC_ERROR", "UNEXPECTED_PAGE", "UNKNOWN"].includes(pageState.state)) {
        await mkdir("diagnostics", { recursive: true });
        const screenshotPath = join("diagnostics", `smoke-${config.requestedInterface.toLowerCase()}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath });
        logger.info("Saved one diagnostic screenshot", { screenshotPath });
      }
    } else {
      logger.warn("Navigation result", result);
    }
  } finally {
    await browserManager.close();
  }
}

runSmoke().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown smoke-test failure";
  logger.error("Navigation smoke test failed", { message });
  process.exitCode = 1;
});
