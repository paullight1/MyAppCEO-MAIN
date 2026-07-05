# Phase 4 Paystack Payments

Date: 2026-05-16

## Implemented

- Crowdfunding investment initialization now uses Paystack when `PAYSTACK_SECRET_KEY` is configured.
- Backend creates an investment commitment, initializes Paystack, stores the Paystack reference on the commitment, and returns the authorization URL.
- Frontend redirects the investor to Paystack when an authorization URL is returned.
- Paystack callback handling reads `reference` and `commitmentId` from the returned URL, then confirms the investment through the backend.
- Backend verifies the Paystack transaction reference before marking the investment paid and creating shareholder ownership.
- Repeated confirmation calls for an already-paid commitment return success without reapplying funding, escrow, or ownership side effects.
- A signed webhook endpoint is available at `POST /api/v1/crowdfunding/paystack/webhook`.
- Webhook requests are validated with Paystack's `x-paystack-signature` HMAC SHA512 signature.
- Local development still supports simulated payments when `PAYSTACK_SECRET_KEY` is not configured.

## Required environment

```bash
PAYSTACK_SECRET_KEY=
PAYSTACK_CURRENCY=NGN
```

## Production requirements before launch

- Disable simulated payments in production.
- Add database-level idempotency for payment references and ownership source records.
- Decide whether user-facing investment amounts are NGN or USD and make the UI currency match `PAYSTACK_CURRENCY`.
