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

    const itemsHtml = items
      .map((item: any, index: number) => {
        const qty = Number(item.quantity || item.qty || 0);
        const unitPrice = Number(item.unitPrice || item.unit_price || 0);
        const total = qty * unitPrice;

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

    const grandTotal =
      typeof orderData.grandTotal === "number"
        ? Number(orderData.grandTotal || 0)
        : items.reduce((sum: number, item: any) => {
            const qty = Number(item.quantity || item.qty || 0);
            const unitPrice = Number(item.unitPrice || item.unit_price || 0);
            return sum + qty * unitPrice;
          }, 0);

    const html = `
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
            <td style="padding:6px 0;"><strong>Email:</strong></td>
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
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order email error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send order email." },
      { status: 500 }
    );
  }
}