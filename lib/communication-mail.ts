import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\x27/g, "&#39;");
}
function validEmail(value: string | null | undefined) {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Save the portal message first, then attempt one outbound notification.
 * SMTP acceptance is NOT confirmation of inbox delivery.
 * Emailed replies do NOT synchronize into the portal.
 * In Preview, notifications are always skipped to protect real distributors.
 */
export async function notifyCommunicationMessage(input: {
  messageId: string;
  threadId: string;
  subject: string;
  body: string;
  senderRole: "ADMIN" | "DISTRIBUTOR";
  distributorEmail: string | null | undefined;
}) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const recipient = input.senderRole === "ADMIN"
    ? input.distributorEmail
    : (process.env.ADMIN_ORDER_EMAIL || smtpUser);
  const enabled = process.env.VERCEL_ENV === "production" &&
    validEmail(smtpUser) && !!smtpPass && validEmail(recipient);

  if (!enabled) {
    await prisma.communicationMessage.updateMany({
      where: { id: input.messageId, notificationStatus: "PENDING" },
      data: {
        notificationStatus: "SKIPPED",
        notificationError: process.env.VERCEL_ENV !== "production"
          ? "Preview notification disabled"
          : "SMTP sender or recipient not configured",
      },
    });
    return "SKIPPED";
  }

  // Atomically claim one notification to avoid duplicate sends on concurrent API retries.
  const claim = await prisma.communicationMessage.updateMany({
    where: { id: input.messageId, notificationStatus: "PENDING" },
    data: { notificationStatus: "SENDING" },
  });
  if (claim.count !== 1) return "SKIPPED";

  try {
    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: { user: smtpUser!, pass: smtpPass! },
    });
    const path = input.senderRole === "ADMIN" ? "/dashboard/communications" : "/admin/communications";
    const host = input.senderRole === "ADMIN" ? "https://portal.casadenza.app" : "https://admin.casadenza.app";
    const link = host + path + "?thread=" + encodeURIComponent(input.threadId);
    const heading = input.senderRole === "ADMIN"
      ? "You have a new message in your Casadenza inbox"
      : "A distributor has sent a new message in Casadenza";
    const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#252525">' +
      '<img src="https://portal.casadenza.app/brand/casadenza-logo.png" alt="Casadenza" width="170" />' +
      '<h2 style="font-size:22px">' + escapeHtml(heading) + '</h2>' +
      '<p>There is a new message waiting for you in the secure Casadenza Distributor Portal.</p>' +
      '<p style="font-size:15px"><strong>' + escapeHtml(input.subject) + '</strong></p>' +
      '<p><a href="' + link + '" style="display:inline-block;background:#25211C;color:white;padding:12px 18px;text-decoration:none;border-radius:6px">Open Casadenza Inbox</a></p>' +
      '<p style="font-size:12px;color:#777">For privacy, the message and its documents are only available after portal sign-in. Please reply inside the portal.</p>' +
      '</div>';
    await transporter.sendMail({
      from: '"Casadenza Portal" <' + smtpUser + '>',
      to: recipient!,
      replyTo: smtpUser!,
      subject: input.senderRole === "ADMIN" ? "New message in your Casadenza inbox" : "New distributor message in Casadenza",
      html,
      text: heading + "\n\n" + input.subject +
        "\n\nSign in to read and reply: " + link +
        "\n\nPlease reply inside the portal.",
    });
    await prisma.communicationMessage.update({
      where: { id: input.messageId },
      data: { notificationStatus: "SENT", notificationSentAt: new Date(), notificationError: null },
    });
    return "SENT";
  } catch {
    console.error("Casadenza portal email notification failed");
    await prisma.communicationMessage.update({
      where: { id: input.messageId },
      data: { notificationStatus: "FAILED", notificationError: "SMTP acceptance failed; no automatic retry" },
    }).catch(() => {});
    return "FAILED";
  }
}
