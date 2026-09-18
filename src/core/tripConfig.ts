export type Quota = "GENERAL" | "TATKAL" | "PREMIUM_TATKAL";

export interface Station {
  readonly code: string;
  readonly name?: string;
}

export interface TripConfig {
  readonly fromStation: Station;
  readonly toStation: Station;
  readonly journeyDate: string;
  readonly quota: Quota;
}

export interface TripValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly trip?: TripConfig;
}

const STATION_CODE_PATTERN = /^[A-Z]{2,5}$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const QUOTAS: readonly Quota[] = ["GENERAL", "TATKAL", "PREMIUM_TATKAL"];

export function isQuota(value: string): value is Quota {
  return QUOTAS.includes(value as Quota);
}

export function stationCodeMatchesText(text: string, code: string): boolean {
  const normalizedCode = code.trim().toUpperCase();
  if (normalizedCode === "") return false;
  return new RegExp(`(^|[^A-Z0-9])${normalizedCode}([^A-Z0-9]|$)`, "i").test(text);
}

export function normalizeJourneyDate(value: string): string {
  const normalized = value.trim();
  const match = DATE_PATTERN.exec(normalized);
  if (match === null) return normalized;

  const [, year, month, day] = match;
  return `${year}-${month}-${day}`;
}

export function isValidJourneyDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (match === null) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatJourneyDateForUi(value: string): string {
  if (!isValidJourneyDate(value)) throw new Error("Journey date must use valid YYYY-MM-DD format");
  const [, year, month, day] = DATE_PATTERN.exec(value) as RegExpMatchArray;
  return `${day}/${month}/${year}`;
}

export function validateTrip(input: {
  readonly fromStation: Station | undefined;
  readonly toStation: Station | undefined;
  readonly journeyDate: string | undefined;
  readonly quota: string | undefined;
  readonly today?: string;
}): TripValidationResult {
  const errors: string[] = [];
  const fromCode = input.fromStation?.code.trim() ?? "";
  const toCode = input.toStation?.code.trim() ?? "";
  const journeyDate = input.journeyDate === undefined ? "" : normalizeJourneyDate(input.journeyDate);

  if (fromCode === "") errors.push("Source station is required.");
  else if (!STATION_CODE_PATTERN.test(fromCode)) errors.push("Source station code must contain 2 to 5 uppercase letters.");

  if (toCode === "") errors.push("Destination station is required.");
  else if (!STATION_CODE_PATTERN.test(toCode)) errors.push("Destination station code must contain 2 to 5 uppercase letters.");

  if (fromCode !== "" && toCode !== "" && fromCode === toCode) {
    errors.push("Source and destination stations must be different.");
  }

  if (journeyDate === "") errors.push("Journey date is required.");
  else if (!isValidJourneyDate(journeyDate)) errors.push("Journey date must be a valid YYYY-MM-DD date.");
  else if (journeyDate < (input.today ?? todayIsoDate())) errors.push("Journey date cannot be in the past.");

  if (input.quota === undefined || input.quota.trim() === "") errors.push("Quota is required.");
  else if (!isQuota(input.quota.trim())) errors.push("Quota must be GENERAL, TATKAL, or PREMIUM_TATKAL.");

  if (errors.length > 0) return { valid: false, errors };

  const quota = input.quota?.trim();
  if (quota === undefined || !isQuota(quota)) return { valid: false, errors: ["Quota is required."] };

  return {
    valid: true,
    errors: [],
    trip: {
      fromStation: { ...input.fromStation, code: fromCode } as Station,
      toStation: { ...input.toStation, code: toCode } as Station,
      journeyDate,
      quota,
    },
  };
}
