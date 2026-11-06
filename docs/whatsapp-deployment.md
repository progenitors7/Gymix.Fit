# WhatsApp repair: deployment and validation

## Required configuration

Set WA_BACKEND_URL in Supabase Edge Function secrets to the HTTPS origin of the existing gateway (without /api/whatsapp/send).
Set WA_API_SECRET to the same strong secret on both the gateway host and Supabase Edge Function secrets. Never use a VITE_ variable for this secret.
VITE_WA_BACKEND_URL is the public frontend gateway origin; it must point to the same deployment.
Redeploy send-push-notification and the frontend after configuration. No deployment is performed by this patch.

## Changed behaviour

Background calls send the server-only key, reject non-successful gateway responses, and have a 15-second timeout. Member lookup includes gym_id. The internal cron flag also requires the service-role credential already sent by cron-daily-sync. WhatsApp attempts happen before Firebase configuration validation.
The settings test dialog reports queued, never delivered. Errors remain errors; there is no simulated successful send fallback.

## Verification

Run node --test tests/whatsapp-repair.test.mjs and npm run build.
Tests execute the real Edge handler in a VM with external services mocked, and the actual settings handler extracted from its component. These are regression tests, not deployment, React rendering, Deno import-resolution or real-device delivery tests.

After deployment, use an explicitly approved test recipient: connect, queue a message, confirm receipt on the phone, disconnect and confirm failure, restart gateway and check session restoration. Verify a scheduled renewal separately from a manual test. Check Edge logs for WhatsApp failures; errors are currently logged and do not replace the push-notification response.

## Remaining work

Persistent per-message status and delivery receipts, restart-safe queues, reminder deduplication, multi-gym authorization review, full core-workflow audit, biometric device validation and marketing redesign remain outstanding. Current gateway session queues are memory-based. This patch does not claim production delivery reliability.

## Provider direction

Consider direct official WhatsApp Business Platform for production automation; onboarding, number setup, template approval and usage charges need a separate implementation decision. Twilio is another official integration route with its own fee in addition to Meta charges. A user-confirmed click-to-chat reminder is a simpler manual fallback, not automatic sending.
