import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { createRequire } from "node:module";
import { existsSync, statSync } from "node:fs";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json") as { readonly version?: string };

export class BrowserManagerError extends Error {
  public override readonly name = "BrowserManagerError";

  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export interface BrowserManagerOptions {
  readonly headless: boolean;
  readonly timeoutMs: number;
  readonly executablePath?: string;
}

export type BrowserExecutableSource = "PLAYWRIGHT_MANAGED" | "CONFIGURED_LOCAL";

export interface RuntimeDiagnostics {
  readonly nodeVersion: string;
  readonly platform: NodeJS.Platform;
  readonly architecture: string;
  readonly playwrightVersion: string;
  readonly browserEngine: "chromium";
  readonly executablePath: string;
  readonly executableSource: BrowserExecutableSource;
  readonly headless: boolean;
  readonly browserVersion: string;
}

export interface BrowserLaunchResolution {
  readonly executablePath: string;
  readonly executableSource: BrowserExecutableSource;
  readonly launchExecutablePath?: string;
}

export function resolveBrowserExecutable(configuredPath?: string): BrowserLaunchResolution {
  if (configuredPath !== undefined) {
    if (!existsSync(configuredPath) || !statSync(configuredPath).isFile()) {
      throw new BrowserManagerError(`Configured browser executable does not exist: ${configuredPath}`);
    }
    return {
      executablePath: configuredPath,
      executableSource: "CONFIGURED_LOCAL",
      launchExecutablePath: configuredPath,
    };
  }

  const managedPath = chromium.executablePath();
  if (existsSync(managedPath) && statSync(managedPath).isFile()) {
    return {
      executablePath: managedPath,
      executableSource: "PLAYWRIGHT_MANAGED",
    };
  }

  throw new BrowserManagerError(
    "No usable Chromium executable found. Install Playwright Chromium with `npx playwright install chromium` or set BROWSER_EXECUTABLE_PATH to an existing local Chromium-compatible executable.",
  );
}

export class BrowserManager {
  private browser: Browser | undefined;
  private context: BrowserContext | undefined;
  private page: Page | undefined;
  private readonly resolution: BrowserLaunchResolution;

  public constructor(private readonly options: BrowserManagerOptions) {
    this.resolution = resolveBrowserExecutable(options.executablePath);
  }

  public async launch(): Promise<Page> {
    if (this.page !== undefined) return this.page;

    try {
      this.browser = await chromium.launch({
        headless: this.options.headless,
        ...(this.resolution.launchExecutablePath === undefined
          ? {}
          : { executablePath: this.resolution.launchExecutablePath }),
      });
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.options.timeoutMs);
      this.page.setDefaultNavigationTimeout(this.options.timeoutMs);
      return this.page;
    } catch (error: unknown) {
      await this.close();
      throw new BrowserManagerError("Unable to launch Chromium", { cause: error });
    }
  }

  public runtimeDiagnostics(): RuntimeDiagnostics {
    if (this.browser === undefined) {
      throw new BrowserManagerError("Runtime diagnostics require a launched browser");
    }

    return {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      playwrightVersion: playwrightPackage.version ?? "unknown",
      browserEngine: "chromium",
      executablePath: this.resolution.executablePath,
      executableSource: this.resolution.executableSource,
      headless: this.options.headless,
      browserVersion: this.browser.version(),
    };
  }

  public async close(): Promise<void> {
    this.page = undefined;
    this.context = undefined;
    if (this.browser !== undefined) {
      await this.browser.close();
      this.browser = undefined;
    }
  }
}
