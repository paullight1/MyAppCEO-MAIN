# MVPLAB External API Spec (SDK)

## Overview
Design for the long-term SDK/API that users embed in their apps for telemetry and marketplace integration.

## 1. Authentication
- **Method:** API Key (X-MVPLAB-API-KEY header).
- **Scope:** Read-only (telemetry) vs. Read/Write (marketplace actions).

## 2. Core Endpoints

### Telemetry (`/v1/telemetry`)
- `POST /track`: Sends event data (session start, feature usage).
- `POST /heartbeat`: Sent every 60s to track DAU/active status.

### Marketplace Integration (`/v1/marketplace`)
- `GET /app-info`: Retrieves metadata for the current app listing.
- `GET /license-check`: Verifies the current installation against a purchase record.

## 3. Data Schema (Telemetry Event)
```json
{
  "event_id": "uuid",
  "timestamp": "iso8601",
  "user_id": "hashed_id",
  "event_type": "click | view | conversion",
  "payload": {
    "key": "value"
  }
}
```

## 4. SDK Support
- **JavaScript/TypeScript:** NPM package `@mvplab/sdk-js`.
- **Python:** PyPI package `mvplab-sdk`.
- **Mobile:** React Native and Flutter wrappers.

## Implementation Notes
- Use edge functions (e.g., Cloudflare Workers) to handle high-volume telemetry traffic.
- Implement rate limiting (1000 requests/min per API key).
