import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function validEmail(value: string | null | undefined) {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Internal portal messages are saved before this function is called.
 * SMTP notification failures never delete the message or claim it was delivered.
 * A normal email reply is NOT automatically synchronized back into the portal.
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
  const enabled = !!smtpUser && !!smtpPass && validEmail(recipient);
  if (!enabled) {
    await prisma.communicationMessage.update({
      where: { id: input.messageId },
      data: { notificationStatus: "SKIPPED", notificationError: "SMTP sender or recipient not configured" },
    });
    return "SKIPPED";
  }
  try {
    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: smtpUser!, pass: smtpPass! },
    });
    const path = input.senderRole === "ADMIN" ? "/dashboard/communications" : "/admin/communications";
    const link = "https://portal.casadenza.app" + path + "?thread=" + encodeURIComponent(input.threadId);
    const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#252525">' +
      '<img src="https://portal.casadenza.app/brand/casadenza-logo.png" alt="Casadenza" width="170" />' +
      '<h2 style="font-size:22px">New message in your Casadenza portal</h2>' +
      '<p><strong>' + escapeHtml(input.subject) + '</strong></p>' +
      '<p style="white-space:pre-line">' + escapeHtml(input.body).replace(/\n/g, "<br>") + '</p>' +
      '<p><a href="' + link + '" style="color:#9e7942">Read and reply in the portal</a></p>' +
      '<p style="font-size:12px;color:#777">Replies sent to this email address do not automatically appear in the portal. Please use the link above.</p></div>';
    await transporter.sendMail({
      from: '"Casadenza Portal" <' + smtpUser + '>',
      to: recipient!,
      replyTo: smtpUser!,
      subject: "Casadenza Portal: " + input.subject.slice(0, 110),
      html,
      text: input.subject + "\n\n" + input.body + "\n\nRead and reply: " + link + "\n\nPlease reply inside the portal.",
    });
    await prisma.communicationMessage.update({
      where: { id: input.messageId },
      data: { notificationStatus: "SENT", notificationSentAt: new Date(), notificationError: null },
    });
    return "SENT";
  } catch (error) {
    console.error("Communication email notification failed", error);
    await prisma.communicationMessage.update({
      where: { id: input.messageId },
      data: { notificationStatus: "FAILED", notificationError: "SMTP delivery request failed" },
    });
    return "FAILED";
  }
}
