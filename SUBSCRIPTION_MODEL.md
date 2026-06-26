# De'Facto Subscription Model

## Context

De'Facto currently has no monetisation implemented (Phase 8 "RevenueCat integration" in the build plan is still pending). This document is the source-of-truth pricing/business spec that Phase 8 implementation will follow.

## Final Subscription Model

### Plans
- **Monthly**: $4.99 / month (auto-renewing)
- **Quarterly**: $11.99 / 3 months (≈ $4.00/mo effective, ~20% discount vs monthly)
- **Yearly**: $49.99 / year (≈ $4.17/mo effective, ~17% discount vs monthly run-rate), sold through the app stores like the other two consumer plans.
- **Institutional / Custom**: sales-led B2B plan, sold outside the app stores. No published price — "Contact us" CTA only, custom quote per institution (schools, libraries, corporate L&D). Billed via invoice/Stripe directly, not through Apple/Google IAP, to avoid store fee cuts and to support bulk seat provisioning.
- No lifetime/one-time purchase tier for consumers.

### Regional Pricing (US + EU)
- Use Apple App Store / Google Play's standard price-tier auto-localization. Set the price in USD ($4.99 / $11.99 / $49.99) and let the stores convert to local currency (incl. EUR, GBP, etc.) via their standard tier tables.
- No manual per-country/PPP pricing adjustments. No separate EU price tier for VAT — accept that the store-converted local price already includes VAT per Apple/Google's standard handling (this slightly compresses net revenue in EU vs US, which is acceptable for v1 simplicity).
- Single global product configuration in RevenueCat / App Store Connect / Play Console — no region-specific offerings needed.

### Free Trial
- **Length**: 7 days, first-time subscribers only (one trial per user/account — enforced by App Store/Play Store's native introductory-offer eligibility, which already tracks this per Apple ID / Google account).
- **Payment method required upfront** at trial start (standard "free trial" subscription pattern, not a trial requiring no card).
- Auto-converts to the selected paid plan (monthly, quarterly, or yearly) immediately when the 7-day trial ends, unless the user cancels beforehand.
- Available on all three consumer plans (monthly, quarterly, yearly) — user picks their plan first, trial applies to whichever they pick, then billing begins for that plan's price/cadence after day 7.
- Institutional/custom plan: no self-serve trial — handled case-by-case by sales (e.g. pilot period in the contract) since it's not provisioned through the app stores.

### Access Model
- **During trial**: full app access, no feature gating.
- **After trial, if not subscribed (cancelled before conversion)**: hard paywall — app fully locked behind the paywall screen, no limited free tier.
- **Existing free users today** (pre-launch, no monetisation live yet): not applicable — this model applies from the monetisation launch date onward.

### Institutional / Custom Plan Details
- Not sold via IAP — avoids 15–30% Apple/Google store fee cuts and allows flexible bulk seat counts that don't map cleanly to fixed IAP SKUs.
- Entry point: a "For Schools & Institutions" link (in the paywall screen and/or app settings/marketing site) that opens a contact form or `mailto:` — no self-serve checkout.
- Sales team negotiates seat count, term, and price per institution; fulfilment is a generated batch of license/activation codes or institution-linked accounts.
- Billing handled via Stripe Invoicing (or manual invoicing) outside the mobile app's IAP flow entirely.
- Entitlement on the De'Facto backend (Supabase) must support a non-IAP "institutional" subscription source so these users get the same unlocked access as a paid consumer subscriber without going through RevenueCat/StoreKit/Play Billing.

## Technical Requirements (for Phase 8 implementation)

### Consumer plans (Monthly / Quarterly / Yearly)
- **RevenueCat**: create three products — monthly ($4.99), quarterly ($11.99), yearly ($49.99) — each with a 7-day free trial introductory offer, grouped under one subscription group/entitlement (e.g. `premium`) so they're mutually exclusive upgrade/downgrade options.
- **App Store Connect**: configure the same three auto-renewable subscriptions in one subscription group, using standard USD price tiers (no manual per-country pricing); attach the 7-day free trial as an introductory offer on each.
- **Google Play Console**: mirror the same three base plans (monthly/quarterly/yearly) under one Play Billing subscription product, each with a 7-day free trial offer.
- **Client (Expo/React Native)**:
  - Integrate `react-native-purchases` (RevenueCat SDK), already scoped in the build plan's Phase 8.
  - Paywall screen: fetch RevenueCat `Offerings`, render all three plans side-by-side, mark yearly as "best value" and quarterly as a mid-tier savings badge.
  - Entitlement check: gate all main routes (feed, topic picker) behind `customerInfo.entitlements.active['premium']`; redirect to paywall if absent.
  - Restore-purchases flow (required by both App Store and Play Store review guidelines).
- **No custom trial-tracking logic needed** — eligibility/auto-conversion is handled natively by StoreKit/Play Billing via RevenueCat.

### Institutional plan
- **Backend (Supabase)**: add a `subscription_source` (or similar) column/enum on the user/profile table distinguishing `revenuecat` vs `institutional`, plus an `institution_id` / license-code linkage table for bulk-provisioned accounts.
- **Activation flow**: either (a) admin-generated redemption codes that users enter in-app to unlock `premium` entitlement without IAP, or (b) institution-managed account list (email-domain or roster-based) auto-flagged as `institutional` on signup.
- **Billing**: Stripe Invoicing (or manual) for the institution contract — not wired into the mobile client at all; this is an admin/back-office concern, not an in-app purchase flow.
- **Entitlement check on client**: must treat `institutional` the same as an active RevenueCat entitlement when gating app routes (i.e., the gate checks "is this user premium" via either source, not RevenueCat alone).
- **Admin tooling**: minimal internal tool or Supabase SQL/admin panel to generate and track institutional license codes/seats (can be a simple script initially, not a full admin UI for v1).

## Verification
This is a planning document, not code — no automated test. Verify by:
1. Reviewing this markdown spec against App Store Connect / Play Console subscription group configuration once Phase 8 begins, to confirm $4.99 / $11.99 / $49.99 + 7-day trial settings match what's described here.
2. Confirming RevenueCat dashboard products mirror these three consumer plans before wiring the paywall UI.
3. Confirming the Supabase schema change (subscription source) supports both RevenueCat-driven and institutional entitlement checks before building the route-gating logic.
