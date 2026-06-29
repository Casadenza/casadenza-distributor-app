import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const LOGO_URL = "https://portal.casadenza.app/brand/casadenza-logo.png";

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

function buildAdminItemsHtml(items: any[]) {
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

function buildClientItemsHtml(items: any[], currency: string) {
  return items
    .map((item: any, index: number) => {
      const qty = Number(item.quantity || item.qty || 0);
      const unitPrice = Number(item.unitPrice || item.unit_price || 0);
      const total =
        typeof item.total === "number" ? Number(item.total || 0) : qty * unitPrice;

      return `
        <tr>
          <td style="padding:12px 10px;border-bottom:1px solid #ece7dc;color:#777;font-size:13px;">${index + 1}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #ece7dc;font-size:13px;">
            <div style="font-weight:700;color:#171717;">${safeText(item.productName || item.product_name || item.name)}</div>
            <div style="font-size:12px;color:#777;margin-top:3px;">${safeText(item.collection || item.collectionName)} • ${safeText(item.sku || item.SKU)}</div>
          </td>
          <td style="padding:12px 10px;border-bottom:1px solid #ece7dc;font-size:13px;color:#333;">${safeText(item.size)}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #ece7dc;font-size:13px;color:#333;">${safeText(item.unit)}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #ece7dc;text-align:right;font-size:13px;color:#333;">${qty}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #ece7dc;text-align:right;font-size:13px;color:#333;">${currency} ${formatMoney(unitPrice)}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #ece7dc;text-align:right;font-size:13px;font-weight:700;color:#171717;">${currency} ${formatMoney(total)}</td>
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
  const itemsHtml = buildAdminItemsHtml(items);

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
          <td style="padding:6px 0;"><strong>Client Confirmation Email:</strong></td>
          <td style="padding:6px 0;">${safeText(orderData.orderEmail || orderData.signerEmail || orderData.clientEmail)}</td>
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
  const currency = safeText(orderData.currency || "");
  const itemsHtml = buildClientItemsHtml(items, currency);
  const customerName =
    safeText(orderData.signerName).trim() ||
    safeText(orderData.shipTo?.contactName).trim() ||
    "Customer";

  return `
    <div style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#181818;">
      <div style="display:none;max-height:0;overflow:hidden;">
        Your Casadenza order has been received. Our team will review it and share the official Proforma Invoice shortly.
      </div>

      <div style="max-width:920px;margin:0 auto;padding:34px 14px;">
        <div style="background:#ffffff;border:1px solid #ded6c7;border-radius:22px;overflow:hidden;box-shadow:0 14px 40px rgba(30,24,12,0.08);">

          <div style="padding:30px 34px 24px;background:#ffffff;border-bottom:1px solid #e8dfcf;">
            <img
              src="${LOGO_URL}"
              alt="Casadenza"
              style="display:block;width:230px;max-width:100%;height:auto;margin:0 0 24px;"
            />

            <div style="display:inline-block;background:#111;color:#d7bf83;border-radius:999px;padding:7px 12px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
              Order Acknowledgement
            </div>

            <h1 style="margin:16px 0 8px;font-size:28px;line-height:1.25;color:#111;font-weight:800;">
              Your order has been received successfully.
            </h1>

            <p style="margin:0;font-size:15px;line-height:1.75;color:#5f5a50;">
              Thank you for placing your order with Casadenza. Our team will review the details and share the official Proforma Invoice shortly.
            </p>
          </div>

          <div style="padding:30px 34px;">
            <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#222;">
              Dear <strong>${safeText(customerName)}</strong>,
            </p>

            <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#4a4a4a;">
              We have successfully received your order request. Below is a summary of the order submitted through the Casadenza Distributor Portal.
            </p>

            <div style="background:#fbfaf7;border:1px solid #e6decf;border-radius:16px;padding:20px 22px;margin:0 0 26px;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr>
                  <td style="padding:7px 0;color:#777;">PO Number</td>
                  <td style="padding:7px 0;text-align:right;font-weight:800;color:#111;">${safeText(orderData.poNumber)}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#777;">PO Date</td>
                  <td style="padding:7px 0;text-align:right;color:#222;">${safeText(orderData.poDate)}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#777;">Buyer PO Reference</td>
                  <td style="padding:7px 0;text-align:right;color:#222;">${safeText(orderData.buyerPoRef) || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#777;">Order Type</td>
                  <td style="padding:7px 0;text-align:right;color:#222;">${safeText(orderData.orderType)}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#777;">Incoterm</td>
                  <td style="padding:7px 0;text-align:right;color:#222;">EXW</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#777;">Delivery Method</td>
                  <td style="padding:7px 0;text-align:right;color:#222;">${safeText(orderData.deliveryMethod)}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#777;">Destination Port</td>
                  <td style="padding:7px 0;text-align:right;color:#222;">${safeText(orderData.destinationPort) || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#777;">Currency</td>
                  <td style="padding:7px 0;text-align:right;color:#222;">${currency}</td>
                </tr>
              </table>
            </div>

            <h2 style="margin:0 0 14px;font-size:18px;color:#111;font-weight:800;">Order Items</h2>

            <div style="border:1px solid #e6decf;border-radius:16px;overflow:hidden;margin-bottom:24px;">
              <table style="border-collapse:collapse;width:100%;font-size:13px;background:#fff;">
                <thead>
                  <tr style="background:#111;color:#fff;">
                    <th style="padding:12px 10px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;">#</th>
                    <th style="padding:12px 10px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Product</th>
                    <th style="padding:12px 10px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Size</th>
                    <th style="padding:12px 10px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Unit</th>
                    <th style="padding:12px 10px;text-align:right;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Qty</th>
                    <th style="padding:12px 10px;text-align:right;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Unit Price</th>
                    <th style="padding:12px 10px;text-align:right;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    itemsHtml ||
                    `<tr><td colspan="7" style="padding:14px;border-bottom:1px solid #ece7dc;">No items found.</td></tr>`
                  }
                </tbody>
              </table>
            </div>

            <table style="border-collapse:collapse;width:100%;max-width:460px;margin-left:auto;font-size:14px;">
              <tr>
                <td style="padding:7px 0;color:#666;">Items Total</td>
                <td style="padding:7px 0;text-align:right;color:#222;">${currency} ${formatMoney(orderData.itemsTotal)}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;color:#666;">Freight</td>
                <td style="padding:7px 0;text-align:right;color:#222;">${currency} ${formatMoney(orderData.freight)}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;color:#666;">Insurance</td>
                <td style="padding:7px 0;text-align:right;color:#222;">${currency} ${formatMoney(orderData.insurance)}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;color:#666;">Discount</td>
                <td style="padding:7px 0;text-align:right;color:#222;">${currency} ${formatMoney(orderData.discount)}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;color:#666;">Other Charge</td>
                <td style="padding:7px 0;text-align:right;color:#222;">${currency} ${formatMoney(orderData.otherCharge)}</td>
              </tr>
              <tr>
                <td style="padding:14px 0;border-top:2px solid #111;font-weight:800;font-size:16px;color:#111;">Order Total</td>
                <td style="padding:14px 0;border-top:2px solid #111;text-align:right;font-weight:800;font-size:16px;color:#111;">${currency} ${formatMoney(grandTotal)}</td>
              </tr>
            </table>

            <div style="background:#fff8e4;border:1px solid #e5cc87;border-radius:16px;padding:16px 18px;margin-top:26px;font-size:13px;line-height:1.7;color:#5a4314;">
              <strong>Important:</strong> This email is an order acknowledgement only and is not the final Proforma Invoice.
              The official Proforma Invoice will be shared after review and confirmation by the Casadenza team.
            </div>

            ${
              orderData.notes
                ? `<div style="margin-top:22px;background:#fafafa;border:1px solid #e6e6e6;border-radius:14px;padding:15px 16px;font-size:13px;line-height:1.6;color:#444;">
                    <strong style="color:#111;">Order Notes:</strong><br/>${safeText(orderData.notes)}
                  </div>`
                : ""
            }

            <p style="margin:26px 0 0;font-size:14px;line-height:1.8;color:#444;">
              If any correction is required in the order details, please reply to this email and our team will assist you.
            </p>

            <p style="margin:20px 0 0;font-size:14px;line-height:1.8;color:#222;">
              Warm regards,<br />
              <strong>Casadenza Team</strong>
            </p>
          </div>

          <div style="background:#111;color:#d6c6a1;padding:16px 34px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">
            Casadenza Distributor Portal
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