import "dotenv/config";
import { DEFAULT_TIMEOUT_MS, IRCTC_URLS } from "./constants.js";
import type { IRCTCSite } from "../core/types.js";

export interface AppConfig {
  readonly requestedInterface: IRCTCSite;
  readonly targetUrl: string;
  readonly headless: boolean;
  readonly timeoutMs: number;
  readonly browserExecutablePath?: string;
  readonly smokeScreenshot: boolean;
}

function parseInterface(value: string | undefined): IRCTCSite {
  if (value === "eticket") return "ETICKET";
  return "NGET";
}

function parseBoolean(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

function parseTimeout(value: string | undefined): number {
  if (value === undefined) return DEFAULT_TIMEOUT_MS;
  const timeout = Number(value);
  return Number.isInteger(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const requestedInterface = parseInterface(env.IRCTC_INTERFACE);
  const targetUrl = requestedInterface === "NGET" ? IRCTC_URLS.nget : IRCTC_URLS.eticket;

  const browserExecutablePath = env.BROWSER_EXECUTABLE_PATH;
  return {
    requestedInterface,
    targetUrl,
    headless: parseBoolean(env.IRCTC_HEADLESS),
    timeoutMs: parseTimeout(env.IRCTC_TIMEOUT_MS),
    ...(browserExecutablePath === undefined ? {} : { browserExecutablePath }),
    smokeScreenshot: parseBoolean(env.SMOKE_SCREENSHOT),
  };
}
