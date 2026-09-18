export const IRCTC_URLS = {
  nget: "https://www.irctc.co.in/nget/train-search",
  eticket: "https://www.irctc.co.in/eticket/train-search",
} as const;

export const IRCTC_HOSTNAMES = new Set([
  "www.irctc.co.in",
  "irctc.co.in",
]);

export const DEFAULT_TIMEOUT_MS = 30_000;
