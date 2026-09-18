import { IRCTC_HOSTNAMES } from "../config/constants.js";
import type { IRCTCSite } from "../core/types.js";

export function detectSite(url: string): IRCTCSite {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "UNKNOWN";
  }

  if (!IRCTC_HOSTNAMES.has(parsed.hostname.toLowerCase())) return "UNKNOWN";

  const firstPathSegment = parsed.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (firstPathSegment === "nget") return "NGET";
  if (firstPathSegment === "eticket") return "ETICKET";
  return "UNKNOWN";
}
