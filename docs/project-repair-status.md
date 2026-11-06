# Gymix project repair status — 2026-10-30

WhatsApp work is on hold. Prior WhatsApp edits are preserved, not deployed or expanded in this pass.

## Confirmed fixes

- Owner registration from a selected landing-page plan, including navigation between member and owner signup routes.
- Layout hooks execute in a consistent order when profile role changes.
- Calendar-month expiry clamps to the target month, including leap years; invalid dates rejected.
- Subscription start-date edits recalculate expiry; clearing the input does not calculate an invalid date.
- Member expiry uses the local date around Indian midnight.
- Loading members after switching gyms is no longer skipped by a global fetched flag.
- Payments clear stale subscription links on member selection, preserve full price for partial payments, and only send received receipts for paid status.
- Fixed-day renewal durations are preserved; member expiry agrees with persisted subscription expiry.
- Attendance uses local days, scanner callbacks use the current gym, invalid QR timestamps are rejected, and failed offline sync entries remain queued.
- Store cart quantities respect known stock, product numeric fields are validated, and progress weights must be finite and positive.

## Checks and limits

Regression tests use mocked external services and behavioral handler extraction, not a live Supabase database or browser/device session. Production Vite build checked locally. The npm launcher on this machine is broken; local tools can run directly through Node.

Full source lint still reports 282 errors and 22 warnings. No rules were disabled to hide the backlog. There are no remaining undefined-name or conditional-hook violations in that run. Unused symbols and React effect/dependency diagnostics require a separate reviewed cleanup; not every lint diagnostic is a runtime defect.

## Outstanding consequential work

1. Renewal writes span multiple API calls: partial failure can leave a subscription without the intended payment. Requires database transaction/RPC and live schema verification.
2. Offline attendance replay uses current server-time/manual toggle semantics, not a durable idempotent event ingestion endpoint. A response lost after a successful write can replay twice.
3. Client cart limits do not prevent concurrent checkout overselling. Inventory reservation and order creation need a database transaction.
4. Store order save and subsequent messaging failure can produce misleading checkout failure; messaging path is held at user request.
5. Biometric simulator/physical webhook and gate control are not hardware validated. Do not advertise universal verified compatibility.
6. Auth, billing, data isolation, database triggers, browser rendering, camera operation and actual payment provider callbacks still need staging end-to-end verification.
7. Website redesign and unverified marketing claims remain outstanding; this repair pass does not redesign the website.

No deployment, external messaging, real payments or database migrations were performed in this pass.

## Second repair pass

Auth, attendance/scanner, store/progress, layout and shared-hook scoped lint checks now pass without suppressions. Fixed route-derived form state, historical-date kiosk confusion, duplicate attendance loads and stale request overwrites; sidebar state on navigation; corrupt saved broadcast dismissals; realtime callbacks and redundant subscriptions; obsolete async store responses. Full suite: 60 tests passing. Production build passes. Whole-source lint remains at 234 errors and 17 warnings (backlog, not a clean-project claim).

Live database inspection was attempted but connector requires an unavailable link_id. Transaction migrations remain blocked pending a connected project/schema. Browser QA was attempted but Playwright CLI retrieval failed with EACCES/network access. No real payments, messages, migration or deployment performed. WhatsApp remains held.


## Third local repair pass

User deferred connecting Supabase; all database-dependent work stays pending. No external writes or WhatsApp integration changes in this pass.

Source lint reduced to 20 errors and 2 warnings, all errors remaining in SettingsPage (mixed integration/settings screen held from this cleanup). Other source files have zero lint errors. No rules disabled. 83 tests pass including the SuperAdmin behavioral tests; production build passes. npm test includes the additional SuperAdmin suite.

New fixes include: preserving unsaved profile fields; rejecting delayed gym results from an old account; derived unread count and no false read state after failed notification save; safe missing-plan Quick Renew; numeric-string plan durations; preselected-member plan initialization; immediate pagination/filter state; stable realtime handlers and async loads; member/profile form derived state; and corrected first-place leaderboard medal. Shared theme hook/context exports separated without changing theme API.

Live database transactions, concurrent inventory enforcement, durable offline attendance ingestion, biometric hardware, live payment/browser verification and website redesign remain unverified/outstanding. No production deployment performed.
