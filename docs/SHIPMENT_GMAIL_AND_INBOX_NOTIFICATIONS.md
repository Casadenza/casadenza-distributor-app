# Casadenza Shipment Finder and Inbox Notifications

## Shipped to Preview branch

Admin > Shipment Finder searches both approved mailboxes read-only using invoice number, AWB/HAWB, PO number, or distributor company. An admin must preview the PDF and manually confirm the consignee and exact portal order before approving a share. The file becomes an OrderDocument and is visible only in that distributor's order Documents page. No mailbox document is forwarded automatically.

ChatGPT's Gmail integration cannot authorize Vercel's Distributor Portal; the app needs its own Google OAuth integration. Preview cannot import documents into the shared live database or send real distributor email notices.

One-to-one portal messages automatically attempt an SMTP notification on Production. Notifications say "New message in your Casadenza inbox", link to login and DO NOT expose the message body or documents. SENT means SMTP accepted a request, not proven delivery.

The Admin Send to All option creates a private conversation for each distributor. Optional email requires explicit selection, confirmation, a production enable flag, verified SMTP, and currently supports at most 15 recipients. Portal-only messages support up to 200 recipients. A durable queue is required for larger email sends.

## Connect read-only Gmail to the deployed app

1. Enable Gmail API in a Casadenza-owned Google Cloud project.
2. Configure OAuth consent with the minimum Gmail scope: https://www.googleapis.com/auth/gmail.readonly. This is a Google-restricted scope and may require production OAuth verification/security review.
3. Create a secure OAuth client and use an approved offline authorization flow for EACH of info@casadenza.com and neeraj@casadenza.com. Generate refresh tokens with offline access; each token must represent the corresponding mailbox.
4. Store five server-side settings privately in the Vercel dashboard, as applicable:
   GMAIL_CLIENT_ID
   GMAIL_CLIENT_SECRET
   GMAIL_REFRESH_TOKEN_INFO
   GMAIL_REFRESH_TOKEN_NEERAJ
5. Redeploy Preview and check Admin > Integrations and Admin > Shipment Finder. Configuration presence alone does not verify actual Gmail permission; search a known invoice and preview a known AWB/HAWB PDF to verify.
6. The server validates Gmail users/me/profile email identity for each configured mailbox; a mismatch is refused.

Do NOT post client secrets or refresh tokens in chat or Git. Google OAuth External/Testing refresh tokens generally expire after 7 days; use an appropriate verified publishing state before production use.

## Approve and share a shipment PDF

Search invoice number, PO, AWB/HAWB or company. Review source mailbox, sender, subject and preview. Choose the exact portal order and confirm the consignee. Only after the production security gate is complete, set ENABLE_SHIPMENT_DOCUMENT_IMPORT=true in Production. The API always refuses imports on Preview. Import writes a PDF to existing Cloudinary-backed OrderDocument storage; it does not email the recipient automatically.

SECURITY BLOCKER: Audit Cloudinary document access first. The current document route checks a user's authorization, but an accidentally exposed raw Cloudinary media URL may bypass portal authentication. Use private/authenticated assets or suitably controlled signed delivery before enabling shipment-document import.

## Production email notifications

Use existing SMTP_USER, SMTP_PASS, optional SMTP_HOST/SMTP_PORT, and ADMIN_ORDER_EMAIL. After testing organizational sender identity, deliverability, bounce handling and recipient isolation, set ENABLE_BROADCAST_EMAIL_NOTIFICATIONS=true ONLY for Production.

One-to-one: automatic SMTP attempt after message creation and after replies. Send to All: email checkbox, recipient-count confirmation, one private portal conversation per partner, max 15 email recipients until durable queue infrastructure exists. No emails are sent in Preview. No automatic email retries to prevent duplicates.

Production release requires approved PR, no leaked Cloudinary credential, verified ownership tests across at least two distributor accounts, PDF privacy audit, and SMTP acceptance plus real inbox receipt testing. The current production portal remains unchanged until the explicit release approval.
