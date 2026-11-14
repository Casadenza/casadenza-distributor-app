# Casadenza automatic Order & Shipment Hub — staged rollout

Status: IMPLEMENTED IN FEATURE BRANCH, NOT ACTIVE IN PRODUCTION.

## Scope

- Scan **both** info@casadenza.com and alex@casadenza.in for all order/shipment categories:
  purchase orders, invoices, packing lists, AWB/HAWB, delivery/tracking and related messages.
- Vercel **Schedules** (Nov 2026 public beta) calls `/api/cron/operations-inbox`
  every 15 minutes via a GET path. This is the *Schedules* feature, not legacy
  `crons`; the latter rejected the 15-minute interval on the Hobby plan.
- On every run, process 3 days on first execution and on subsequent runs scan
  from each mailbox's last successful run with a 30-minute overlap.
- Queue records are **idempotent** by (mailbox, Gmail message ID, attachment part ID).
  Email-body-only candidates use the special part ID `body`.
- A scan creates **unverified candidate metadata only**. It does not create
  portal Orders, forward emails, download or publish customer PDFs, or modify Gmail.
- Admin sees the latest scan and persistent Needs Review queue in
  `/admin/operations`. Can open the original PDF, select the distributor AND
  that distributor's order, and confirm sharing if separately enabled.
- The "Dismiss unrelated item" action clears a candidate without touching Gmail.
- Scan errors and hit-cap conditions are visible in `OperationsInboxScanRun`.

## Safety / release prerequisites

1. Review and apply additive migration
   `20261114143000_operations_inbox_auto_scan` **once** on the intended
   production database. Do not run migrations in shared Preview.
2. Configure Google OAuth read-only access for both mailboxes separately,
   verifying `users/me/profile` returns the intended address:
   - `GMAIL_CLIENT_ID` (server secret)
   - `GMAIL_CLIENT_SECRET` (server secret)
   - `GMAIL_REFRESH_TOKEN_INFO` (server secret)
   - `GMAIL_REFRESH_TOKEN_ALEX` (server secret)
3. Generate a random `CRON_SECRET` of **at least 32 characters**. Store it in
   Vercel Production environment variables, not in git/chat.
   Vercel Schedules path dispatches provide the legacy cron bearer
   authorization header when `CRON_SECRET` is configured.
4. Set `AUTO_INBOX_SCAN_ENABLED=true` in **Production only**, after the code,
   database schema and Gmail connections have all been verified.
   This gate prevents writes in Preview, which might share the live database.
5. Activate the static schedule from the Vercel Schedules UI if inactive.
   The feature is beta. Verify the next run logs and
   `/admin/operations` scan status. Preview schedules may be inactive by default.
6. Check the Vercel 15-minute Schedules allowance and function duration.
   Hobby has 5,000 runs/mo included; one 15-minute task is ~2,880/mo.
7. Keep `ENABLE_SHIPMENT_DOCUMENT_IMPORT` disabled until the existing manual
   document-sharing route and Cloudinary access controls have a security review.
   These are **separate** switches. Never enable automatic customer-visible
   sharing without verifying the PDF consignee and exact portal order.

## Handling failures and backfill

- If one mailbox fails, the other can still queue items. The next run uses
  the last successful run of each mailbox independently.
- Duplicate invocations within the same 15-minute slot are ignored.
- The scanner has an 80-message / mailbox / invocation cap and reports PARTIAL
  when this cap is reached. Increase capacity or use paginated Gmail polling
  if actual volume requires it.
- A gap longer than 3 days is reported as PARTIAL; manually backfill the
  missing historical period. This first iteration is not a complete archive.
- Outlook/other mailboxes are not connected.
- No AI/OCR verification of attached PDF contents exists yet. Suggested matches
  are **not** permission to publish.
- Gmail OAuth may expire/revoke (especially External Testing OAuth apps); keep
  alerts and relink procedures available.

## Verification

1. Check Vercel Preview build and GitHub TypeScript + lint + migration tests.
2. Check the scheduled route rejects unauthorized requests (401).
3. Verify Preview returns disabled even with valid secret (503) and performs
   no writes to a shared database.
4. Verify separate mailbox profiles and a recent harmless test email in each.
5. Confirm the migration exists and production-only environment switch is on.
6. Run Schedules once and verify one run record and no duplicate inbox entries.
7. Review a sample PO, commercial invoice, packing list, AWB and HAWB from each
   mailbox; inspect distributor matching and false positive rate.
8. Approve a manually selected attachment only after security and document
   access review; confirm only that distributor sees the file.

## Known technical limitations

- Initial scans inspect the latest 3 days, not complete Gmail history.
- Attachments outside PDFs are not currently downloadable through the hub.
- Current PDF classification is filename/subject/snippet heuristics.
- The review dashboard returns up to 250 pending records; implement pagination
  if backlog grows.
- No proactive scan-failure email alert is configured yet; consult dashboard
  and runtime logs.
- A complete production rollout requires explicit approval; feature branch
  deployment alone does not activate scheduling.
