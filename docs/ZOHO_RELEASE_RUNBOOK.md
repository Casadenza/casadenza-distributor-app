# Casadenza Distributor Portal - Zoho & Communications Release

## Source of truth
Zoho CRM owns account and contact records, invoices, Pro Forma Invoices (API module Sales_Orders), quotations, and deals. Portal pages only read those records using a verified Zoho Accounts record ID. Portal conversations and unapproved customer order submissions remain local to the portal. The integration does not create or overwrite Zoho invoices.

**Financial definition:** Invoiced sales is the sum of Zoho CRM Invoices Grand_Total for one exact Zoho Account, excluding known void/cancelled statuses, displayed per original currency. The figure is not paid revenue, distributor resale turnover, or net accounting revenue; credits/returns require reconciliation before displaying net sales. Lifetime and calendar-year sums come from COQL aggregate queries, not truncated records lists.

## Production blockers
1. Rotate the exposed Cloudinary API secret in Cloudinary. The older secret is present in public Git history; source edits cannot revoke it.
2. Configure the portal's own Zoho OAuth integration. ChatGPT's Zoho connection cannot provide runtime credentials to the deployed Vercel app.
3. Back up and migrate the production database for CommunicationThread, CommunicationMessage, and Distributor.zohoAccountId.
4. Map real distributors safely. Admin uses Distributors > Zoho Sales, searches Zoho Accounts, selects the intended record, and saves the verified ID. Never match by fuzzy name.
5. Test two separate distributor accounts, an admin, actual email notifications, and mobile interfaces.
6. Review transactional order-email idempotency and client-supplied order data before production release.

## Vercel deployment target
- Team: casadenzas-projects
- Project: casadenza-distributor-app
- GitHub repository: Casadenza/casadenza-distributor-app
- Feature branch: feature/responsive-communications-centre
- Pull request: https://github.com/Casadenza/casadenza-distributor-app/pull/1

Set server-only environment variables through the Vercel dashboard (never through chats or commits):
- ZOHO_REFRESH_TOKEN
- ZOHO_CLIENT_ID
- ZOHO_CLIENT_SECRET
- ZOHO_ACCOUNTS_URL=https://accounts.zoho.in
- ZOHO_BASE_URL=https://www.zohoapis.in
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (rotated)
- SMTP_USER, SMTP_PASS, optional SMTP_HOST, SMTP_PORT, ADMIN_ORDER_EMAIL
- Existing DATABASE_URL, DIRECT_URL, SESSION_SECRET remain required.

Grant read scopes for Accounts, Contacts, Invoices, Sales_Orders, Quotes, Deals, Zoho COQL, and Zoho Search for Account lookup. Do not grant write scope for read-only reporting.

## Automated tests
The GitHub workflow .github/workflows/communications-ci.yml validates:
- Prisma client generation, TypeScript, lint
- Migration chain on disposable PostgreSQL 16, including both communications tables and account-link column

Build success does not prove production credentials are configured or migrations applied.

## Safe release sequence
1. Rotate the Cloudinary credential; update Vercel environment and verify the old one no longer works.
2. Back up the production database and confirm restore procedures.
3. Run npx prisma migrate deploy against staging and validate with two test distributors.
4. Check the admin-only /admin/integrations readiness screen. Green indicates configuration, not actual mail delivery.
5. Link verified Zoho Accounts and compare invoice totals by currency with the Zoho CRM application.
6. Test communications, authorization isolation, duplicate sends and SMTP notifications.
7. Test interface at 375px, 430px, 768px, 1024px and 1440px (including mobile keyboard and tablet landscape).
8. Only then apply reviewed Prisma migrations in production and merge/release the approved branch.
9. Verify the live portal and retain frontend rollback plus database recovery procedures.

## Important limitations
- Zoho invoices are invoiced sales, not cash collected.
- Zoho Sales_Orders are labelled Pro Forma Invoices in this organization.
- Distributor resale to end customers is not captured by this portal.
- Product media, custom pricing, packing rules, marketing materials, and draft portal orders remain portal-managed until a separate source-of-truth migration.
- Replies to external notification emails do not sync into portal conversations.
