import type { IRCTCSite } from "./types.js";

export type NavigationClassification =
  | "SUCCESS"
  | "HTTP_ERROR"
  | "NETWORK_ERROR"
  | "TLS_ERROR"
  | "PROTOCOL_ERROR"
  | "TIMEOUT"
  | "DNS_ERROR"
  | "BLOCKED_OR_CHALLENGED"
  | "UNEXPECTED_REDIRECT"
  | "UNKNOWN_ERROR";

export type NavigationDecision = "CONTINUE" | "PAUSE_FOR_HUMAN" | "STOP";

export interface NavigationResult {
  readonly requestedUrl: string;
  readonly finalUrl?: string;
  readonly detectedSite: IRCTCSite;
  readonly classification: NavigationClassification;
  readonly httpStatus?: number;
  readonly pageTitle?: string;
  readonly elapsedMs: number;
  readonly errorName?: string;
  readonly errorMessage?: string;
}

export function classifyNavigationError(error: unknown): NavigationClassification {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("timeout")) return "TIMEOUT";
  if (normalized.includes("err_name_not_resolved") || normalized.includes("enotfound") || normalized.includes("dns")) {
    return "DNS_ERROR";
  }
  if (normalized.includes("certificate") || normalized.includes("tls") || normalized.includes("ssl")) {
    return "TLS_ERROR";
  }
  if (normalized.includes("protocol") || normalized.includes("http2")) return "PROTOCOL_ERROR";
  if (
    normalized.includes("network") ||
    normalized.includes("connection") ||
    normalized.includes("socket") ||
    normalized.includes("eai_again")
  ) {
    return "NETWORK_ERROR";
  }
  return "UNKNOWN_ERROR";
}

export function classifyNavigationResponse(status: number | undefined, redirectedToExpectedSite: boolean): NavigationClassification {
  if (status !== undefined && status >= 400) return "HTTP_ERROR";
  if (!redirectedToExpectedSite) return "UNEXPECTED_REDIRECT";
  return "SUCCESS";
}

export function navigationDecision(classification: NavigationClassification): NavigationDecision {
  return classification === "SUCCESS" ? "CONTINUE" : "STOP";
}
