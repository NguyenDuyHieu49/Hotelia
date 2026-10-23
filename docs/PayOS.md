# payOS integration

## Configuration

Keep these values in the backend environment only:

```dotenv
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
PAYOS_RETURN_URL=hotelia://payment/success
PAYOS_CANCEL_URL=hotelia://payment/cancel
```

The native app requests a checkout with `POST /api/v1/payments` and opens the
hosted `checkoutUrl`. The backend calculates the amount from the stored booking;
the client cannot supply or change it.

## Webhook

After deploying the API to a public HTTPS host, register this URL for the payOS
payment channel:

```text
https://hotelia-api-eimb.onrender.com/api/v1/payments/webhooks/payos
```

The endpoint verifies the webhook with the channel checksum key through the
official `@payos/node` SDK. Invalid signatures return HTTP 400. Duplicate valid
webhooks are idempotent. A successful payment confirms a booking only while the
booking is still held; a late payment creates a cancellation/refund review state
instead of silently overselling the room.

The return URL only brings the customer back to Hotelia and triggers a refresh.
It is not proof of payment. payOS does not provide a separate sandbox for this
flow, so the final end-to-end check should use a small real transaction after the
public webhook has been registered.

Automatic refunds are not enabled. A paid cancellation remains pending until an
operator refunds it through the bank/payOS process and reconciles the booking.
