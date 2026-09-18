type LogLevel = "INFO" | "WARN" | "ERROR";
type LogRecord = Readonly<Record<string, unknown>>;

const SENSITIVE_KEY = /(password|passwd|secret|token|cookie|otp|captcha|authorization|credential|cvv|pin|session)/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(item),
      ]),
    );
  }
  return value;
}

function write(level: LogLevel, message: string, context?: LogRecord): void {
  const suffix = context === undefined ? "" : ` ${JSON.stringify(redact(context))}`;
  const line = `[${new Date().toISOString()}] ${level} ${message}${suffix}`;
  if (level === "ERROR") console.error(line);
  else if (level === "WARN") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (message: string, context?: LogRecord) => write("INFO", message, context),
  warn: (message: string, context?: LogRecord) => write("WARN", message, context),
  error: (message: string, context?: LogRecord) => write("ERROR", message, context),
};
