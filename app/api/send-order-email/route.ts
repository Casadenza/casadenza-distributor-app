import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

function formatMoney(value: unknown) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
}

function safeText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function isValidEmail(value: unknown) {
  const email = safeText(value).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildItemsHtml(items: any[]) {
  return items
    .map((item: any, index: number) => {
      const qty = Number(item.quantity || item.qty || 0);
      const unitPrice = Number(item.unitPrice || item.unit_price || 0);
      const total =
        typeof item.total === "number" ? Number(item.total || 0) : qty * unitPrice;

      return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${index + 1}</td>
          <td style="padding:8px;border:1px solid #ddd;">${safeText(item.collection || item.collectionName)}</td>
          <td style="padding:8px;border:1px solid #ddd;">${safeText(item.sku || item.SKU)}</td>
          <td style="padding:8px;border:1px solid #ddd;">${safeText(item.productName || item.product_name || item.name)}</td>
          <td style="padding:8px;border:1px solid #ddd;">${safeText(item.size)}</td>
          <td style="padding:8px;border:1px solid #ddd;">${safeText(item.unit)}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${qty}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatMoney(unitPrice)}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatMoney(total)}</td>
        </tr>
      `;
    })
    .join("");
}

function calculateGrandTotal(orderData: any, items: any[]) {
  if (typeof orderData.grandTotal === "number") return Number(orderData.grandTotal || 0);

  return items.reduce((sum: number, item: any) => {
    const qty = Number(item.quantity || item.qty || 0);
    const unitPrice = Number(item.unitPrice || item.unit_price || 0);
    return sum + qty * unitPrice;
  }, 0);
}

function buildAdminEmailHtml(orderData: any, items: any[], grandTotal: number) {
  const itemsHtml = buildItemsHtml(items);

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.5;">
      <h2 style="margin:0 0 12px;">New Distributor Order Received</h2>

      <table style="border-collapse:collapse;margin-bottom:18px;width:100%;max-width:760px;">
        <tr>
          <td style="padding:6px 0;width:180px;"><strong>PO Number:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.poNumber)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>PO Date:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.poDate)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Buyer PO Ref:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.buyerPoRef)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Order Type:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.orderType)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Currency:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.currency)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Incoterm:</strong></td>
          <td style="padding:6px 0;">EXW</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Delivery:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.deliveryMethod)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Destination Port:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.destinationPort)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Confirmation Email:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.signerEmail || orderData.clientEmail)}</td>
        </tr>
      </table>

      <h3 style="margin:0 0 10px;">Shipping Details</h3>
      <table style="border-collapse:collapse;margin-bottom:18px;width:100%;max-width:760px;">
        <tr>
          <td style="padding:6px 0;width:180px;"><strong>Company:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.shipTo?.companyName)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Contact:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.shipTo?.contactName)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Shipping Email:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.shipTo?.email)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Phone:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.shipTo?.phone)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Address:</strong></td>
          <td style="padding:6px 0;">
            ${safeText(orderData.shipTo?.address1)}
            ${safeText(orderData.shipTo?.address2)}
            ${safeText(orderData.shipTo?.city)}
            ${safeText(orderData.shipTo?.state)}
            ${safeText(orderData.shipTo?.postal)}
            ${safeText(orderData.shipTo?.country)}
          </td>
        </tr>
      </table>

      <h3 style="margin:0 0 10px;">Order Items</h3>

      <table style="border-collapse:collapse;width:100%;max-width:1100px;font-size:14px;">
        <thead>
          <tr style="background:#f3f3f3;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">#</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Collection</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">SKU</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Product Name</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Size</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Unit</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Qty</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Unit Price</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${
            itemsHtml ||
            `<tr><td colspan="9" style="padding:8px;border:1px solid #ddd;">No items found.</td></tr>`
          }
        </tbody>
      </table>

      <table style="border-collapse:collapse;margin-top:18px;width:100%;max-width:420px;margin-left:auto;">
        <tr>
          <td style="padding:6px 0;"><strong>Items Total:</strong></td>
          <td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.itemsTotal)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Freight:</strong></td>
          <td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.freight)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Insurance:</strong></td>
          <td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.insurance)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Discount:</strong></td>
          <td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.discount)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;"><strong>Other Charge:</strong></td>
          <td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.otherCharge)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-top:1px solid #ddd;"><strong>Grand Total:</strong></td>
          <td style="padding:10px 0;border-top:1px solid #ddd;text-align:right;"><strong>${safeText(orderData.currency)} ${formatMoney(grandTotal)}</strong></td>
        </tr>
      </table>

      ${
        orderData.notes
          ? `<p style="margin-top:18px;"><strong>Notes:</strong><br/>${safeText(orderData.notes)}</p>`
          : ""
      }
    </div>
  `;
}

function buildClientEmailHtml(orderData: any, items: any[], grandTotal: number) {
  const itemsHtml = buildItemsHtml(items);
  const customerName =
    safeText(orderData.signerName).trim() ||
    safeText(orderData.shipTo?.contactName).trim() ||
    "Customer";

  return `
    <div style="margin:0;padding:0;background:#f6f5f2;font-family:Arial,sans-serif;color:#222;">
      <div style="max-width:860px;margin:0 auto;padding:28px 16px;">
        <div style="background:#111;color:#fff;padding:22px 26px;border-radius:16px 16px 0 0;">
          <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#d6c6a1;font-weight:bold;">Casadenza</div>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">Order Received Successfully</h1>
        </div>

        <div style="background:#fff;border:1px solid #e7e1d6;border-top:0;padding:26px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 14px;font-size:15px;">Dear ${safeText(customerName)},</p>

          <p style="margin:0 0 14px;font-size:15px;line-height:1.7;">
            Thank you for placing your order with Casadenza. We have successfully received your order request.
            Our team will review the details and share the official Proforma Invoice shortly.
          </p>

          <div style="background:#faf8f3;border:1px solid #e7e1d6;border-radius:12px;padding:16px;margin:22px 0;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr>
                <td style="padding:6px 0;color:#777;">PO Number</td>
                <td style="padding:6px 0;text-align:right;font-weight:bold;">${safeText(orderData.poNumber)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#777;">PO Date</td>
                <td style="padding:6px 0;text-align:right;">${safeText(orderData.poDate)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#777;">Buyer PO Reference</td>
                <td style="padding:6px 0;text-align:right;">${safeText(orderData.buyerPoRef) || "—"}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#777;">Incoterm</td>
                <td style="padding:6px 0;text-align:right;">EXW</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#777;">Delivery Method</td>
                <td style="padding:6px 0;text-align:right;">${safeText(orderData.deliveryMethod)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#777;">Currency</td>
                <td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)}</td>
              </tr>
            </table>
          </div>

          <h2 style="font-size:16px;margin:0 0 12px;">Order Items</h2>

          <div style="overflow-x:auto;">
            <table style="border-collapse:collapse;width:100%;font-size:13px;">
              <thead>
                <tr style="background:#f3f0e8;">
                  <th style="padding:9px;border:1px solid #e1dacd;text-align:left;">#</th>
                  <th style="padding:9px;border:1px solid #e1dacd;text-align:left;">Collection</th>
                  <th style="padding:9px;border:1px solid #e1dacd;text-align:left;">SKU</th>
                  <th style="padding:9px;border:1px solid #e1dacd;text-align:left;">Product Name</th>
                  <th style="padding:9px;border:1px solid #e1dacd;text-align:left;">Size</th>
                  <th style="padding:9px;border:1px solid #e1dacd;text-align:left;">Unit</th>
                  <th style="padding:9px;border:1px solid #e1dacd;text-align:right;">Qty</th>
                  <th style="padding:9px;border:1px solid #e1dacd;text-align:right;">Unit Price</th>
                  <th style="padding:9px;border:1px solid #e1dacd;text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${
                  itemsHtml ||
                  `<tr><td colspan="9" style="padding:9px;border:1px solid #e1dacd;">No items found.</td></tr>`
                }
              </tbody>
            </table>
          </div>

          <table style="border-collapse:collapse;margin-top:18px;width:100%;max-width:420px;margin-left:auto;font-size:14px;">
            <tr>
              <td style="padding:6px 0;">Items Total</td>
              <td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.itemsTotal)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;">Freight</td>
              <td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.freight)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;">Insurance</td>
              <td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.insurance)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;">Discount</td>
              <td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.discount)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;">Other Charge</td>
              <td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.otherCharge)}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-top:1px solid #ddd;font-weight:bold;">Order Total</td>
              <td style="padding:12px 0;border-top:1px solid #ddd;text-align:right;font-weight:bold;">${safeText(orderData.currency)} ${formatMoney(grandTotal)}</td>
            </tr>
          </table>

          <div style="background:#fff8e6;border:1px solid #edd79a;border-radius:12px;padding:14px;margin-top:22px;font-size:13px;line-height:1.6;color:#5b4618;">
            <strong>Important:</strong> This email is only an order acknowledgement and is not the final Proforma Invoice.
            The official Proforma Invoice will be shared after review and confirmation by our team.
          </div>

          <p style="margin:22px 0 0;font-size:14px;line-height:1.7;">
            If any correction is required in the order details, please reply to this email.
          </p>

          <p style="margin:18px 0 0;font-size:14px;line-height:1.7;">
            Warm regards,<br />
            <strong>Casadenza Team</strong>
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(req: Request) {
  try {
    const orderData = await req.json();

    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const adminEmail = process.env.ADMIN_ORDER_EMAIL || smtpUser;

    if (!smtpUser || !smtpPass || !adminEmail) {
      return NextResponse.json(
        { success: false, error: "Email environment variables are missing." },
        { status: 500 }
      );
    }

    const items = Array.isArray(orderData.items)
      ? orderData.items
      : Array.isArray(orderData.orderItems)
        ? orderData.orderItems
        : [];

    const grandTotal = calculateGrandTotal(orderData, items);

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"Casadenza Distributor App" <${smtpUser}>`,
      to: adminEmail,
      subject: `New Distributor Order Received${orderData.poNumber ? ` - ${orderData.poNumber}` : ""}`,
      html: buildAdminEmailHtml(orderData, items, grandTotal),
    });

    const clientEmail = safeText(orderData.orderEmail || orderData.signerEmail || orderData.clientEmail).trim();

    if (isValidEmail(clientEmail)) {
      await transporter.sendMail({
        from: `"Casadenza" <${smtpUser}>`,
        to: clientEmail,
        replyTo: smtpUser,
        subject: `Your Casadenza Order Has Been Received${orderData.poNumber ? ` - ${orderData.poNumber}` : ""}`,
        html: buildClientEmailHtml(orderData, items, grandTotal),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order email error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send order email." },
      { status: 500 }
    );
  }
}
