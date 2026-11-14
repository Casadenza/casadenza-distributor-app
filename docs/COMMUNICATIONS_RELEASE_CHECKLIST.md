# Distributor Communication Centre — release checklist

## Purpose and boundaries
- Admin: create and reply to one distributor at a time, link an order, manage open/resolved conversations.
- Distributor: send/reply to Casadenza, see only their own messages and orders.
- Saved portal messages are the source of truth. SMTP notifications are best-effort and do not synchronize ordinary email replies.
- Existing transactional order-email functionality remains separate.

## Responsive acceptance criteria
| Width | Expected behavior |
|---|---|
| 375px phone | Compact navigation; inbox full width; tap to open full-width thread; no horizontal scroll |
| 430px phone | Buttons at least 44px; compose fields full width |
| 768px tablet portrait | Collapsible navigation; conversation list + detail side by side |
| 1024px tablet landscape | Collapsible navigation; wider content area |
| 1280px laptop | Persistent left portal nav; conversation list + detail |
| 1440px desktop | Persistent nav and comfortable thread reading width |

Functional test checklist (test with 1 admin and 2 distributor accounts):
- Sign in/out and navigate on all breakpoints and iOS/Android touch
- Admin creates new conversation and both participants see it
- Distributor sees only their own conversation list, message details, and linked orders
- Distributor cannot access a second distributor's thread ID or order ID via APIs
- Reply flows and read counts work on both sides, as does "Resolve/Reopen"
- Email notification status is reported accurately when SMTP is configured, disabled, or rejects a request
- No duplicate notifications after retry; inspect logging and high-concurrency behavior
- No lost messages after notification errors; ensure retry/recovery plan
- Verify keyboard focus and Escape/overlay close behavior
- Verify scroll, keyboard covering reply input on mobile and narrow tablet layouts

## Security and migration gate
1. **Immediately rotate the Cloudinary API secret exposed in public repository history.** This branch removes current hardcoding, but cannot revoke the leaked value.
2. Confirm Cloudinary variables are correctly configured for Preview and Production.
3. Confirm SMTP sender settings exist. Never copy secrets into the repository.
4. Take a database backup. Run migration on a staging PostgreSQL DB and verify rollback.
5. Run \`npx prisma generate\`, \`npx tsc --noEmit\`, \`npm run build\`.
6. Verify API authorization, CSRF origin checks and per-user rate limits. Legacy order-email route has extra protections, but needs full abuse testing before production.
7. Review historical failures in Vercel logs and test with production-like data.
8. Only after all gates pass, merge the draft PR and run \`npx prisma migrate deploy\` through the normal release procedure.

## Explicitly out of scope
- Marketing bulk email campaigns; inbound mailbox sync; attachments in communications
- Distributor historical sales dashboard (separate workstream)
