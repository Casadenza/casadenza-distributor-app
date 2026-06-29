import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const LOGO_URL = "https://portal.casadenza.app/brand/casadenza-logo.png";

function formatMoney(value: unknown) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function safeText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function isValidEmail(value: unknown) {
  const email = safeText(value).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function calculateGrandTotal(orderData: any, items: any[]) {
  if (typeof orderData.grandTotal === "number") return Number(orderData.grandTotal || 0);

  return items.reduce((sum: number, item: any) => {
    const qty = Number(item.quantity || item.qty || 0);
    const unitPrice = Number(item.unitPrice || item.unit_price || 0);
    return sum + qty * unitPrice;
  }, 0);
}

function getItemTotal(item: any) {
  const qty = Number(item.quantity || item.qty || 0);
  const unitPrice = Number(item.unitPrice || item.unit_price || 0);
  return typeof item.total === "number" ? Number(item.total || 0) : qty * unitPrice;
}

function buildAdminItemsHtml(items: any[]) {
  return items
    .map((item: any, index: number) => {
      const qty = Number(item.quantity || item.qty || 0);
      const unitPrice = Number(item.unitPrice || item.unit_price || 0);
      const total = getItemTotal(item);

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

function buildClientItemsHtml(items: any[], currency: string) {
  return items
    .map((item: any, index: number) => {
      const qty = Number(item.quantity || item.qty || 0);
      const unitPrice = Number(item.unitPrice || item.unit_price || 0);
      const total = getItemTotal(item);

      return `
        <tr>
          <td style="padding:6px 6px;border:1px solid #e8e3d9;text-align:center;color:#222;font-size:11px;line-height:1.25;">${index + 1}</td>
          <td style="padding:6px 7px;border:1px solid #e8e3d9;color:#222;font-size:11px;line-height:1.25;">${safeText(item.collection || item.collectionName)}</td>
          <td style="padding:6px 7px;border:1px solid #e8e3d9;color:#222;font-size:11px;line-height:1.25;white-space:nowrap;">${safeText(item.sku || item.SKU)}</td>
          <td style="padding:6px 7px;border:1px solid #e8e3d9;color:#111;font-size:11px;line-height:1.25;font-weight:700;">${safeText(item.productName || item.product_name || item.name)}</td>
          <td style="padding:6px 7px;border:1px solid #e8e3d9;text-align:center;color:#222;font-size:11px;line-height:1.25;white-space:nowrap;">${safeText(item.size)}</td>
          <td style="padding:6px 7px;border:1px solid #e8e3d9;text-align:center;color:#222;font-size:11px;line-height:1.25;white-space:nowrap;">${safeText(item.unit)}</td>
          <td style="padding:6px 7px;border:1px solid #e8e3d9;text-align:center;color:#222;font-size:11px;line-height:1.25;">${qty}</td>
          <td style="padding:6px 7px;border:1px solid #e8e3d9;text-align:right;color:#222;font-size:11px;line-height:1.25;white-space:nowrap;">${formatMoney(unitPrice)}</td>
          <td style="padding:6px 7px;border:1px solid #e8e3d9;text-align:right;color:#222;font-size:11px;line-height:1.25;white-space:nowrap;">${formatMoney(total)}</td>
        </tr>
      `;
    })
    .join("");
}

function buildAdminEmailHtml(orderData: any, items: any[], grandTotal: number) {
  const itemsHtml = buildAdminItemsHtml(items);

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.5;">
      <h2 style="margin:0 0 12px;">New Distributor Order Received</h2>

      <table style="border-collapse:collapse;margin-bottom:18px;width:100%;max-width:760px;">
        <tr><td style="padding:6px 0;width:190px;"><strong>PO Number:</strong></td><td style="padding:6px 0;">${safeText(orderData.poNumber)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>PO Date:</strong></td><td style="padding:6px 0;">${safeText(orderData.poDate)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Buyer PO Ref:</strong></td><td style="padding:6px 0;">${safeText(orderData.buyerPoRef)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Order Type:</strong></td><td style="padding:6px 0;">${safeText(orderData.orderType)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Currency:</strong></td><td style="padding:6px 0;">${safeText(orderData.currency)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Incoterm:</strong></td><td style="padding:6px 0;">EXW</td></tr>
        <tr><td style="padding:6px 0;"><strong>Delivery:</strong></td><td style="padding:6px 0;">${safeText(orderData.deliveryMethod)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Destination Port:</strong></td><td style="padding:6px 0;">${safeText(orderData.destinationPort)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Client Confirmation Email:</strong></td><td style="padding:6px 0;">${safeText(orderData.orderEmail || orderData.signerEmail || orderData.clientEmail)}</td></tr>
      </table>

      <h3 style="margin:0 0 10px;">Shipping Details</h3>
      <table style="border-collapse:collapse;margin-bottom:18px;width:100%;max-width:760px;">
        <tr><td style="padding:6px 0;width:190px;"><strong>Company:</strong></td><td style="padding:6px 0;">${safeText(orderData.shipTo?.companyName)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Contact:</strong></td><td style="padding:6px 0;">${safeText(orderData.shipTo?.contactName)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Shipping Email:</strong></td><td style="padding:6px 0;">${safeText(orderData.shipTo?.email)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Phone:</strong></td><td style="padding:6px 0;">${safeText(orderData.shipTo?.phone)}</td></tr>
        <tr>
          <td style="padding:6px 0;"><strong>Address:</strong></td>
          <td style="padding:6px 0;">
            ${safeText(orderData.shipTo?.address1)} ${safeText(orderData.shipTo?.address2)}
            ${safeText(orderData.shipTo?.city)} ${safeText(orderData.shipTo?.state)}
            ${safeText(orderData.shipTo?.postal)} ${safeText(orderData.shipTo?.country)}
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
          ${itemsHtml || `<tr><td colspan="9" style="padding:8px;border:1px solid #ddd;">No items found.</td></tr>`}
        </tbody>
      </table>

      <table style="border-collapse:collapse;margin-top:18px;width:100%;max-width:420px;margin-left:auto;">
        <tr><td style="padding:6px 0;"><strong>Items Total:</strong></td><td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.itemsTotal)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Freight:</strong></td><td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.freight)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Insurance:</strong></td><td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.insurance)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Discount:</strong></td><td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.discount)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Other Charge:</strong></td><td style="padding:6px 0;text-align:right;">${safeText(orderData.currency)} ${formatMoney(orderData.otherCharge)}</td></tr>
        <tr><td style="padding:10px 0;border-top:1px solid #ddd;"><strong>Grand Total:</strong></td><td style="padding:10px 0;border-top:1px solid #ddd;text-align:right;"><strong>${safeText(orderData.currency)} ${formatMoney(grandTotal)}</strong></td></tr>
      </table>

      ${orderData.notes ? `<p style="margin-top:18px;"><strong>Notes:</strong><br/>${safeText(orderData.notes)}</p>` : ""}
    </div>
  `;
}

function buildClientEmailHtml(orderData: any, items: any[], grandTotal: number) {
  const currency = safeText(orderData.currency || "");
  const itemsHtml = buildClientItemsHtml(items, currency);
  const customerName =
    safeText(orderData.signerName).trim() ||
    safeText(orderData.shipTo?.contactName).trim() ||
    "Customer";

  const discountValue = Number(orderData.discount || 0);

  return `
    <div style="margin:0;padding:0;background:#f7f6f3;font-family:Arial,Helvetica,sans-serif;color:#171717;font-size:13px;">
      <div style="max-width:940px;margin:0 auto;padding:22px 10px;">
        <div style="background:#ffffff;border:1px solid #eee9df;border-radius:10px;overflow:hidden;">

          <div style="background:#ffffff;padding:20px 36px 16px;border-bottom:1px solid #ece7dc;">
            <img src="${LOGO_URL}" alt="Casadenza" style="display:block;width:250px;max-width:100%;height:auto;" />
          </div>

          <div style="background:#111111;color:#ffffff;padding:17px 36px;border-bottom:3px solid #c69c3a;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="width:46px;vertical-align:middle;">
                  <div style="width:32px;height:32px;border:2px solid #c69c3a;border-radius:999px;text-align:center;line-height:30px;color:#c69c3a;font-size:19px;font-weight:bold;">✓</div>
                </td>
                <td style="vertical-align:middle;">
                  <div style="font-size:20px;line-height:1.2;font-weight:800;letter-spacing:.4px;text-transform:uppercase;">Order Received Successfully</div>
                </td>
              </tr>
            </table>
          </div>

          <div style="padding:24px 36px 28px;">
            <h2 style="margin:0 0 10px;font-size:20px;line-height:1.3;color:#111;">Dear ${safeText(customerName)},</h2>

            <p style="margin:0 0 4px;font-size:13px;line-height:1.55;color:#222;">Thank you for placing your order with Casadenza.</p>
            <p style="margin:0 0 18px;font-size:13px;line-height:1.55;color:#222;">We have successfully received your order request. Our team will review the details and share the official Proforma Invoice shortly.</p>

            <div style="border:1px solid #ded7c8;border-radius:6px;padding:12px 16px;margin:0 0 22px;">
              <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <tr>
                  <td style="width:50%;vertical-align:top;padding-right:18px;border-right:1px solid #ded7c8;">
                    <table style="width:100%;border-collapse:collapse;">
                      <tr><td style="padding:6px 0;width:52%;color:#333;text-transform:uppercase;font-size:10px;line-height:1.25;">PO Number</td><td style="padding:6px 0;font-weight:800;text-align:left;font-size:12px;line-height:1.25;">${safeText(orderData.poNumber)}</td></tr>
                      <tr><td style="padding:6px 0;color:#333;text-transform:uppercase;font-size:10px;line-height:1.25;">PO Date</td><td style="padding:6px 0;font-weight:700;font-size:12px;line-height:1.25;">${safeText(orderData.poDate)}</td></tr>
                      <tr><td style="padding:6px 0;color:#333;text-transform:uppercase;font-size:10px;line-height:1.25;">Buyer PO Reference</td><td style="padding:6px 0;font-weight:700;font-size:12px;line-height:1.25;">${safeText(orderData.buyerPoRef) || "—"}</td></tr>
                      <tr><td style="padding:6px 0;color:#333;text-transform:uppercase;font-size:10px;line-height:1.25;">Order Type</td><td style="padding:6px 0;font-weight:700;font-size:12px;line-height:1.25;">${safeText(orderData.orderType)}</td></tr>
                    </table>
                  </td>

                  <td style="width:50%;vertical-align:top;padding-left:24px;">
                    <table style="width:100%;border-collapse:collapse;">
                      <tr><td style="padding:6px 0;width:52%;color:#333;text-transform:uppercase;font-size:10px;line-height:1.25;">Incoterm</td><td style="padding:6px 0;font-weight:800;font-size:12px;line-height:1.25;">EXW</td></tr>
                      <tr><td style="padding:6px 0;color:#333;text-transform:uppercase;font-size:10px;line-height:1.25;">Delivery Method</td><td style="padding:6px 0;font-weight:700;font-size:12px;line-height:1.25;">${safeText(orderData.deliveryMethod)}</td></tr>
                      <tr><td style="padding:6px 0;color:#333;text-transform:uppercase;font-size:10px;line-height:1.25;">Destination Port</td><td style="padding:6px 0;font-weight:700;font-size:12px;line-height:1.25;">${safeText(orderData.destinationPort) || "—"}</td></tr>
                      <tr><td style="padding:6px 0;color:#333;text-transform:uppercase;font-size:10px;line-height:1.25;">Currency</td><td style="padding:6px 0;font-weight:800;font-size:12px;line-height:1.25;">${currency}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            <div style="font-size:16px;line-height:1.2;font-weight:800;text-transform:uppercase;margin:0 0 10px;color:#111;">Order Items</div>

            <table style="border-collapse:collapse;width:100%;font-size:11px;margin:0 0 8px;table-layout:auto;">
              <thead>
                <tr style="background:#111;color:#ffffff;">
                  <th style="padding:8px 6px;border:1px solid #333;text-align:center;font-size:10px;text-transform:uppercase;white-space:nowrap;">#</th>
                  <th style="padding:8px 6px;border:1px solid #333;text-align:left;font-size:10px;text-transform:uppercase;">Collection</th>
                  <th style="padding:8px 6px;border:1px solid #333;text-align:left;font-size:10px;text-transform:uppercase;white-space:nowrap;">SKU</th>
                  <th style="padding:8px 6px;border:1px solid #333;text-align:left;font-size:10px;text-transform:uppercase;">Product Name</th>
                  <th style="padding:8px 6px;border:1px solid #333;text-align:center;font-size:10px;text-transform:uppercase;white-space:nowrap;">Size</th>
                  <th style="padding:8px 6px;border:1px solid #333;text-align:center;font-size:10px;text-transform:uppercase;white-space:nowrap;">Unit</th>
                  <th style="padding:8px 6px;border:1px solid #333;text-align:center;font-size:10px;text-transform:uppercase;white-space:nowrap;">Qty</th>
                  <th style="padding:8px 6px;border:1px solid #333;text-align:right;font-size:10px;text-transform:uppercase;white-space:nowrap;">Unit Price</th>
                  <th style="padding:8px 6px;border:1px solid #333;text-align:right;font-size:10px;text-transform:uppercase;white-space:nowrap;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml || `<tr><td colspan="9" style="padding:10px;border:1px solid #e8e3d9;">No items found.</td></tr>`}
              </tbody>
            </table>

            <table style="border-collapse:collapse;margin-top:8px;width:100%;max-width:390px;margin-left:auto;font-size:12px;border:1px solid #ded7c8;">
              <tr><td style="padding:6px 20px;">Items Total</td><td style="padding:6px 20px;text-align:right;">${formatMoney(orderData.itemsTotal)}</td></tr>
              <tr><td style="padding:6px 20px;">Freight</td><td style="padding:6px 20px;text-align:right;">${formatMoney(orderData.freight)}</td></tr>
              <tr><td style="padding:6px 20px;">Insurance</td><td style="padding:6px 20px;text-align:right;">${formatMoney(orderData.insurance)}</td></tr>
              <tr><td style="padding:6px 20px;">Discount</td><td style="padding:6px 20px;text-align:right;color:${discountValue > 0 ? "#d21d1d" : "#222"};">${discountValue > 0 ? "-" : ""}${formatMoney(discountValue)}</td></tr>
              <tr><td style="padding:6px 20px;">Other Charge</td><td style="padding:6px 20px;text-align:right;">${formatMoney(orderData.otherCharge)}</td></tr>
              <tr style="background:#f4efe5;"><td style="padding:10px 20px;border-top:1px solid #ded7c8;font-weight:800;text-transform:uppercase;">Order Total</td><td style="padding:10px 20px;border-top:1px solid #ded7c8;text-align:right;font-weight:800;">${currency} ${formatMoney(grandTotal)}</td></tr>
            </table>

            <div style="border:1px solid #d2aa4a;background:#fffaf0;border-radius:6px;margin:24px 0 16px;padding:12px 16px;font-size:12px;line-height:1.55;color:#2b2b2b;">
              <strong>IMPORTANT:</strong> This email is only an order acknowledgement and is not the final Proforma Invoice. The official Proforma Invoice will be shared after review and confirmation by our team.
            </div>

            ${orderData.notes ? `<p style="margin:0 0 14px;font-size:12px;line-height:1.55;color:#222;"><strong>Notes:</strong><br/>${safeText(orderData.notes)}</p>` : ""}

            <p style="margin:0 0 14px;font-size:12px;line-height:1.55;color:#222;">If any correction is required in the order details, please reply to this email.</p>

            <div style="border-top:1px solid #d8c8a4;margin-top:16px;padding-top:14px;font-size:12px;line-height:1.5;color:#222;">
              Warm regards,<br/>
              <strong>Casadenza Team</strong><br/>
              <span style="color:#777;">Casadenza Distributor Portal</span>
            </div>
          </div>
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

    const clientEmail = safeText(
      orderData.orderEmail || orderData.signerEmail || orderData.clientEmail
    ).trim();

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
