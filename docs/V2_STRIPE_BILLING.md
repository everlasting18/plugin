# ContentAI V2 — Stripe Billing And Pro Entitlement

## Scope

This document describes the proposed V2 architecture for paid Pro billing with Stripe.
It is a target design, not a description of the current implementation.

V1 remains:

- Free tier works for real
- Pro exists as demo or manual activation
- PocketBase stores users, domains, licenses, and free usage

V2 adds:

- Stripe Checkout for Pro purchase
- Stripe webhook handling
- automatic license creation and renewal
- clearer billing state in the dashboard

The design below intentionally keeps the existing runtime model:

- WordPress plugin stays a client
- Astro frontend stays a client/dashboard
- Deno API remains the source of truth for entitlement
- PocketBase remains the main app data store

## Goals

### Product goals

- Let a logged-in user buy Pro from the dashboard
- Automatically activate or renew Pro after successful payment
- Keep the plugin flow unchanged for generation requests
- Support renewals, cancellations, and expired subscriptions

### Engineering goals

- Do not make Stripe the source of truth for plugin authorization
- Keep `licenses` as the entitlement layer consumed by the backend
- Avoid forcing the plugin to know anything about Stripe
- Minimize changes to the current V1 free flow

## Non-goals

- Full invoicing backoffice
- seat-based team billing
- multiple products with separate entitlements
- moving plugin auth directly to Stripe customer sessions

## Current V1 Model

Current data layers:

- `users`: PocketBase auth users
- `user_domains`: which website belongs to which user
- `licenses`: manual/demo/pro entitlement state
- `usage`: free quota per `domain_id + month`

Current request behavior:

- free: plugin sends `x-site-url`
- pro: plugin sends `x-site-url + x-license-key`
- backend verifies entitlement in the API before allowing generation

That core model stays in V2.

## V2 High-Level Architecture

```
Frontend Dashboard
  -> POST /api/billing/checkout
  -> Stripe Checkout
  -> Stripe Webhook -> API backend
  -> API updates PocketBase
  -> Dashboard reflects updated entitlement

WordPress Plugin
  -> POST /api/generate with x-site-url + x-license-key
  -> API verifies against PocketBase licenses
  -> generation allowed
```

### Key rule

Stripe is the payment source.
The API backend is the entitlement source.
The plugin only trusts the API.

## Recommended Data Model

### Keep existing collections

#### `users`

Used for:

- login
- dashboard identity
- ownership of `user_domains`

#### `user_domains`

Used for:

- mapping a user to one or more sites
- showing tier in the dashboard
- storing the active license key bound to a site

Recommended fields:

- `user`: relation -> `users`, required
- `domain`: url, required
- `tier`: select `free | pro`, required
- `license_key`: text, optional
- `is_active`: bool, optional

#### `licenses`

Used for:

- backend entitlement checks
- plugin verification
- license expiration and renewal

Recommended base fields:

- `key`: text, required, unique
- `tier`: select `free | pro`, required
- `status`: select `active | revoked | expired`, required
- `site_url`: url, optional
- `expires`: number timestamp, optional
- `activated_at`: number timestamp, optional

### Add Stripe-specific fields to `licenses`

For V2, the fastest path is to extend `licenses` instead of adding a new `subscriptions` collection immediately.

Recommended new fields:

- `billing_email`: email or text, optional
- `stripe_customer_id`: text, optional
- `stripe_subscription_id`: text, optional
- `stripe_price_id`: text, optional
- `billing_status`: select:
  - `inactive`
  - `trialing`
  - `active`
  - `past_due`
  - `canceled`
  - `unpaid`
- `cancel_at_period_end`: bool, optional
- `current_period_end`: number timestamp, optional

### Keep `usage` unchanged

`usage` remains only for free tier:

- `domain_id`
- `month`
- `count`

Pro requests should not rely on this table.

## Why No `subscriptions` Table Yet

A separate `subscriptions` collection is valid, but not necessary for the first Stripe release.

For this project, putting Stripe references directly on `licenses` is simpler because:

- backend verification already reads `licenses`
- plugin already depends on license-style auth
- renewal only needs to update one entitlement record
- fewer joins and fewer state-sync bugs

Add a `subscriptions` collection later only if you need:

- multiple subscriptions per user
- historical billing records
- invoice history
- more than one paid product

## Purchase Flow

### 1. User opens dashboard

The dashboard already knows:

- current logged-in user
- selected website from `user_domains`
- current tier

### 2. User clicks upgrade

Frontend calls:

- `POST /api/billing/checkout`

Payload:

```json
{
  "domain": "https://example.com",
  "success_url": "https://contentai.vn/dashboard?billing=success",
  "cancel_url": "https://contentai.vn/dashboard?billing=cancel"
}
```

Server responsibilities:

- authenticate the user
- verify the domain belongs to that user
- create a Stripe Checkout Session
- attach useful metadata

Recommended Stripe metadata:

- `user_id`
- `domain`
- `domain_record_id`
- `flow = contentai_pro`

Response:

```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### 3. User completes payment in Stripe

Stripe handles:

- payment method collection
- billing details
- subscription creation

### 4. Stripe sends webhook to API

API route:

- `POST /api/billing/webhook`

The webhook must:

- verify Stripe signature
- parse event type
- update entitlement in PocketBase

### 5. API updates entitlement

On successful subscription creation:

- create or update a `licenses` record
- bind it to the purchased site
- mark status active
- set expiry fields
- persist Stripe IDs

Then update `user_domains`:

- `tier = pro`
- `license_key = <generated or assigned key>`

### 6. User returns to dashboard

Dashboard reloads:

- `user_domains`
- optional billing summary endpoint

The selected site now displays:

- tier `Pro`
- active license key
- no free quota prompt

## Renewal Flow

Renewal should not require the user to re-add the site or re-enter the key.

### Renewal event path

1. Stripe renews subscription
2. Stripe sends `invoice.paid`
3. API finds the license by `stripe_subscription_id`
4. API updates:
   - `billing_status = active`
   - `current_period_end`
   - `expires`
   - `status = active`

Plugin behavior does not change.
The next request simply passes verification again.

## Cancellation Flow

### Cancel at period end

Stripe event:

- `customer.subscription.updated`

API updates:

- `cancel_at_period_end = true`
- keep `status = active` until period end

### Fully canceled or expired

Stripe events:

- `customer.subscription.deleted`
- or a final unpaid/expired state

API updates:

- `billing_status = canceled` or `unpaid`
- `status = expired`

Dashboard updates:

- `user_domains.tier` may return to `free`
- or remain `pro` visually until backend says expired

Recommended rule:

- source of truth is still `licenses.status`
- `user_domains.tier` is just UI convenience

## Recommended License Key Strategy

### Option A: keep one generated key per site

On first successful purchase:

- generate a key such as `CAI-PRO-XXXX-XXXX`
- store it in `licenses.key`
- also copy it to `user_domains.license_key`

This is the simplest option because:

- plugin already knows how to send a key
- renewals only update the same record

### Option B: pure account-based Pro without visible key

Possible, but not recommended for V2 because:

- it would force plugin auth changes
- it breaks the current contract shape
- it makes WordPress-only use more coupled to dashboard auth

For V2, keep the key model.

## Required API Routes

### `POST /api/billing/checkout`

Purpose:

- create Stripe Checkout Session for a logged-in user and one owned domain

Validation:

- user must be authenticated
- domain must belong to user
- site must not already have an active Pro subscription

Output:

- Stripe checkout URL or session id

### `POST /api/billing/webhook`

Purpose:

- receive Stripe events and update entitlement

Requirements:

- raw request body verification
- Stripe signature verification
- idempotent processing

### Optional: `GET /api/billing/summary`

Purpose:

- return clean billing state for the dashboard

Suggested output:

```json
{
  "domain": "https://example.com",
  "tier": "pro",
  "licenseKey": "CAI-PRO-1234-5678",
  "billingStatus": "active",
  "cancelAtPeriodEnd": false,
  "currentPeriodEnd": 1772442000000
}
```

### Optional: `POST /api/billing/portal`

Purpose:

- create a Stripe customer portal session for subscription management

## Webhook Event Mapping

### `checkout.session.completed`

Use for:

- linking the purchase back to `user_id` and `domain`

Typical actions:

- confirm metadata
- store `stripe_customer_id`
- prepare or create the license if not already created

### `customer.subscription.created`

Typical actions:

- set `billing_status = active` or `trialing`
- set `stripe_subscription_id`
- set `stripe_price_id`
- set `current_period_end`
- set `expires`
- set `status = active`

### `invoice.paid`

Typical actions:

- extend `current_period_end`
- extend `expires`
- keep `status = active`

### `invoice.payment_failed`

Typical actions:

- set `billing_status = past_due`
- do not immediately revoke access unless your business rule requires it

### `customer.subscription.updated`

Typical actions:

- update `cancel_at_period_end`
- update `billing_status`
- update `current_period_end`

### `customer.subscription.deleted`

Typical actions:

- set `billing_status = canceled`
- set `status = expired`

## Idempotency And Safety

Webhook processing must be idempotent.

Minimum rules:

- key updates should upsert by `stripe_subscription_id`
- repeated events should not create duplicate licenses
- repeated events should not create duplicate domain bindings

Recommended implementation:

- use `stripe_subscription_id` as the stable external identifier
- if missing, fall back carefully to metadata plus customer id

## Dashboard Behavior In V2

### On free site

Show:

- current free usage
- upgrade CTA

### On active Pro site

Show:

- badge `Pro`
- billing status
- renewal or next invoice date
- button to manage subscription

### On past due site

Show:

- warning state
- retry payment / manage billing CTA

### On canceled but not yet expired site

Show:

- `cancel at period end`
- still allow Pro until `current_period_end`

## WordPress Plugin Behavior In V2

The plugin should change as little as possible.

### What stays the same

- plugin stores or receives `licenseKey`
- plugin sends `x-license-key`
- plugin sends `x-site-url`
- backend decides access

### What may improve

- settings page can show billing status from the backend
- plugin can display clearer `Pro active until ...`

### What should not happen

- plugin should not call Stripe directly
- plugin should not store Stripe customer data
- plugin should not decide entitlement locally

## Security Model

### Backend only

Stripe secret key and webhook secret must live only in the API backend.

### Private collections

PocketBase collections `licenses` and `usage` should remain private.

Recommended API rules:

- `listRule = null`
- `viewRule = null`
- `createRule = null`
- `updateRule = null`
- `deleteRule = null`

### User-owned collection

`user_domains` remains owner-scoped:

- `@request.auth.id != "" && user = @request.auth.id`

### Webhook verification

Never trust webhook payloads without Stripe signature verification.

## Suggested Environment Variables

### API

```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
APP_BASE_URL=https://contentai.vn
PB_URL=https://your-pocketbase-url
PB_ADMIN_TOKEN=...
```

### Frontend

```bash
PUBLIC_PB_URL=https://your-pocketbase-url
PUBLIC_API_URL=https://your-api-url/api
```

## Suggested Implementation Order

### Phase 1

- add Stripe env vars
- add `billing` routes to API
- create Checkout Session
- stub webhook handler

### Phase 2

- extend `licenses` schema with Stripe fields
- implement `checkout.session.completed`
- implement `customer.subscription.created`
- implement `invoice.paid`

### Phase 3

- wire dashboard upgrade CTA
- show billing state in dashboard
- update `user_domains` after activation

### Phase 4

- add cancel/portal flow
- add past-due and canceled UX
- add regression tests

## Testing Checklist

### Purchase

- free user upgrades one owned domain
- checkout completes successfully
- license record is created
- `user_domains.tier` becomes `pro`

### Renewal

- `invoice.paid` extends `expires`
- plugin continues working without reactivation

### Cancellation

- `cancel_at_period_end` updates correctly
- final cancellation eventually blocks Pro access

### Security

- user cannot start checkout for another user's domain
- private PB collections are not readable from browser client
- webhook rejects invalid signatures

### Plugin

- plugin still generates on free
- plugin still generates on active Pro
- expired Pro falls back to rejection, not silent success

## Recommended Final Rule

For V2, keep the architecture simple:

- Stripe handles payment
- API handles entitlement
- PocketBase stores app state
- plugin remains a thin client

Do not let billing logic leak into the plugin.
Do not let the frontend become the entitlement source.
