# WhatsApp first repair implementation plan

Approved scope: repair existing WhatsApp authentication and truthful message feedback for single-branch gyms. Preserve existing provider; migration to an official provider is a separate decision.

1. Reproduce background authentication and FCM coupling using the actual Edge handler with mocked external services.
2. Authenticate cron callers before supplying the gateway secret; scope member lookup to gym. Configure gateway URL and secret server-side. Reject gateway failures explicitly.
3. Exercise the actual settings test-message handler: queued is not delivered; offline/error must never simulate success.
4. Run regression tests and production build. Document deployment secrets and verification limits. No real recipient messaging or deployment in this repair.

Follow-up milestones: persistent delivery history/deduplication, core workflow audit, biometric hardware pilot, website redesign. These are not claimed complete by this patch.
