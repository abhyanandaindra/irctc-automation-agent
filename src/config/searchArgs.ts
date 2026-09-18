import type { Station, TripConfig } from "../core/tripConfig.js";

export interface SearchArgs {
  readonly from?: string;
  readonly to?: string;
  readonly date?: string;
  readonly quota?: string;
  readonly dryRun: boolean;
}

export function parseSearchArgs(argv: readonly string[]): SearchArgs {
  const values: { from?: string; to?: string; date?: string; quota?: string } = {};
  let dryRun = false;

  for (const argument of argv) {
    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }
    const separator = argument.indexOf("=");
    if (!argument.startsWith("--") || separator < 0) continue;
    const key = argument.slice(2, separator);
    const value = argument.slice(separator + 1);
    if (key === "from" || key === "to" || key === "date" || key === "quota") values[key] = value;
  }

  return { ...values, dryRun };
}

export function tripInputFromArgs(args: SearchArgs): {
  readonly fromStation: Station | undefined;
  readonly toStation: Station | undefined;
  readonly journeyDate: string | undefined;
  readonly quota: string | undefined;
} {
  return {
    fromStation: args.from === undefined ? undefined : { code: args.from },
    toStation: args.to === undefined ? undefined : { code: args.to },
    journeyDate: args.date,
    quota: args.quota,
  };
}

export function tripSummary(trip: TripConfig): Record<string, string> {
  return {
    from: trip.fromStation.code,
    to: trip.toStation.code,
    date: trip.journeyDate,
    quota: trip.quota,
  };
}
