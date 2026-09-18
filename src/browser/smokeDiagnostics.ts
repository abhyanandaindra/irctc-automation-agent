import type { Page } from "playwright";

export interface SmokeDiagnosticEvent {
  readonly type: "REQUEST_FAILED" | "DOCUMENT_RESPONSE" | "PAGE_ERROR" | "PAGE_CRASH";
  readonly url?: string;
  readonly resourceType?: string;
  readonly status?: number;
  readonly reason?: string;
  readonly message?: string;
}

export class SmokeDiagnostics {
  private readonly events: SmokeDiagnosticEvent[] = [];

  public constructor(private readonly maxEvents = 20) {}

  public attach(page: Page): void {
    page.on("requestfailed", (request) => {
      if (!request.isNavigationRequest() && request.resourceType() !== "document") return;
      const failureReason = request.failure()?.errorText;
      this.add({
        type: "REQUEST_FAILED",
        url: sanitizeUrl(request.url()),
        resourceType: request.resourceType(),
        ...(failureReason === undefined ? {} : { reason: failureReason }),
      });
    });
    page.on("response", (response) => {
      if (response.request().resourceType() !== "document") return;
      this.add({ type: "DOCUMENT_RESPONSE", url: sanitizeUrl(response.url()), status: response.status() });
    });
    page.on("pageerror", (error) => this.add({ type: "PAGE_ERROR", message: sanitizeMessage(error.message) }));
    page.on("crash", () => this.add({ type: "PAGE_CRASH", message: "Page crashed" }));
  }

  public snapshot(): SmokeDiagnosticEvent[] {
    return [...this.events];
  }

  private add(event: SmokeDiagnosticEvent): void {
    if (this.events.length >= this.maxEvents) return;
    this.events.push(event);
  }
}

export function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "[UNPARSEABLE_URL]";
  }
}

export function sanitizeMessage(value: string): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, 300);
}
