import type { HumanCheckpointType, IRCTCSite } from "./types.js";
import type { NavigationDecision } from "./navigation.js";

export type PageState =
  | "TRAIN_SEARCH"
  | "LOGIN_VISIBLE"
  | "AUTHENTICATED"
  | "HUMAN_CAPTCHA"
  | "HUMAN_OTP"
  | "HUMAN_PAYMENT_AUTHORIZATION"
  | "QUEUE_OR_WAITING_ROOM"
  | "ACCESS_RESTRICTED"
  | "IRCTC_ERROR"
  | "UNEXPECTED_PAGE"
  | "UNKNOWN";

export interface PageSnapshot {
  readonly site: IRCTCSite;
  readonly url: string;
  readonly title: string;
  readonly visibleText: string;
}

export interface HumanCheckpoint {
  readonly type: HumanCheckpointType;
  readonly site: IRCTCSite;
  readonly pageState: PageState;
  readonly description: string;
  readonly requiresHumanAction: true;
}

export interface PageStateResult {
  readonly state: PageState;
  readonly decision: NavigationDecision;
  readonly checkpoint?: HumanCheckpoint;
}

function hasAny(text: string, values: readonly string[]): boolean {
  return values.some((value) => text.includes(value));
}

function checkpointFor(state: PageState, site: IRCTCSite): HumanCheckpoint | undefined {
  const checkpointByState: Partial<Record<PageState, HumanCheckpoint>> = {
    HUMAN_CAPTCHA: {
      type: "CAPTCHA",
      site,
      pageState: state,
      description: "A CAPTCHA or equivalent human verification requires manual completion.",
      requiresHumanAction: true,
    },
    HUMAN_OTP: {
      type: "OTP",
      site,
      pageState: state,
      description: "An OTP checkpoint requires manual completion.",
      requiresHumanAction: true,
    },
    HUMAN_PAYMENT_AUTHORIZATION: {
      type: "PAYMENT_AUTHORIZATION",
      site,
      pageState: state,
      description: "Payment authorization requires manual completion.",
      requiresHumanAction: true,
    },
  };
  return checkpointByState[state];
}

export function detectPageState(snapshot: PageSnapshot): PageStateResult {
  const text = `${snapshot.title} ${snapshot.visibleText}`.toLowerCase();
  const path = (() => {
    try {
      return new URL(snapshot.url).pathname.toLowerCase();
    } catch {
      return "";
    }
  })();

  let state: PageState;
  if (hasAny(text, ["captcha", "i am not a robot", "security verification"])) state = "HUMAN_CAPTCHA";
  else if (hasAny(text, ["one time password", "one-time password", "enter otp", "otp verification"])) state = "HUMAN_OTP";
  else if (hasAny(text, ["payment authorization", "authorize payment", "upi pin"])) state = "HUMAN_PAYMENT_AUTHORIZATION";
  else if (hasAny(text, ["waiting room", "queue position", "please wait in queue"])) state = "QUEUE_OR_WAITING_ROOM";
  else if (hasAny(text, ["access denied", "access restricted", "too many requests", "rate limit"])) state = "ACCESS_RESTRICTED";
  else if (hasAny(text, ["something went wrong", "service unavailable", "irctc error"])) state = "IRCTC_ERROR";
  else if (/^\/(nget|eticket)\/train-search\/?$/.test(path)) state = "TRAIN_SEARCH";
  else if (hasAny(text, ["login", "sign in"])) state = "LOGIN_VISIBLE";
  else if (snapshot.site === "NGET" || snapshot.site === "ETICKET") state = "UNEXPECTED_PAGE";
  else state = "UNKNOWN";

  const checkpoint = checkpointFor(state, snapshot.site);
  if (checkpoint !== undefined) return { state, decision: "PAUSE_FOR_HUMAN", checkpoint };
  if (state === "QUEUE_OR_WAITING_ROOM" || state === "ACCESS_RESTRICTED" || state === "IRCTC_ERROR" || state === "UNEXPECTED_PAGE" || state === "UNKNOWN") {
    return { state, decision: "STOP" };
  }
  return { state, decision: "CONTINUE" };
}

export function decisionForCheckpoint(type: HumanCheckpointType): NavigationDecision {
  return type === "CAPTCHA" || type === "OTP" || type === "PAYMENT_AUTHORIZATION" ? "PAUSE_FOR_HUMAN" : "STOP";
}
