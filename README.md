# IRCTC Train Ticket Booking Automation Agent

Minimal TypeScript/Playwright foundation for legitimate IRCTC train-booking assistance. This project currently performs navigation smoke testing and URL/interface identification only. It does not implement booking selectors or booking actions.

## Supported interfaces

- Primary/current: <https://www.irctc.co.in/nget/train-search>
- Beta/alternate: <https://www.irctc.co.in/eticket/train-search>

The two interfaces are identified independently from the verified browser URL. Their DOM structures and future page interactions must not be assumed to be identical.

## Installation

```sh
npm install
npx playwright install chromium
cp .env.example .env
```

No credentials are required for the foundation stage. Do not add credentials to source files or `.env.example`.

## Commands

```sh
npm run typecheck
npm run build
npm test
npm run start
npm run smoke
```

The default browser mode is headed. Set `IRCTC_HEADLESS=true` only for a controlled navigation-only smoke run. Select the interface with `IRCTC_INTERFACE=nget` or `IRCTC_INTERFACE=eticket`.

If the Playwright-managed browser is unavailable on a particular development machine, `BROWSER_EXECUTABLE_PATH` may point to a locally installed Chromium-compatible browser for the smoke test. The path is validated and is never discovered by scanning arbitrary filesystem locations.

Set `SMOKE_SCREENSHOT=true` to allow one local diagnostic screenshot when a rendered page is classified as blocked, an IRCTC error, unexpected, or unknown. Screenshots are written under ignored `diagnostics/` and are never uploaded.

## Architecture

- `src/config` — official URLs and environment configuration.
- `src/core` — shared typed booking states and foundational types.
- `src/browser` — Chromium lifecycle and timeout configuration.
- `src/sites` — URL detection and separate interface metadata modules.
- `src/utils` — lightweight redacted logging.
- `tests` — pure unit tests that do not contact IRCTC.

## Security boundaries

CAPTCHA, OTP, payment authorization, queues, waiting rooms, rate limits, authentication/security controls, anti-bot protections, access restrictions, and payment security are not bypassed. Human verification checkpoints must remain manual. This project contains no CAPTCHA solver, OTP automation, stealth tooling, fingerprint manipulation, proxy rotation, private booking API integration, or request-flooding logic.

The smoke command only navigates to an official train-search URL, reads the resulting URL, identifies the interface, logs non-sensitive status, and exits. It does not log in, search trains, fill forms, book tickets, or access payment.
