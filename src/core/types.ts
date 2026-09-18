export type IRCTCSite = "NGET" | "ETICKET" | "UNKNOWN";

export type HumanCheckpointType =
  | "CAPTCHA"
  | "OTP"
  | "PAYMENT_AUTHORIZATION"
  | "OTHER";

export type SiteMetadata = {
  readonly site: Exclude<IRCTCSite, "UNKNOWN">;
  readonly officialUrl: string;
};
