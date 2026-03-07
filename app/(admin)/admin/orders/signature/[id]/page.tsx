import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const dynamic = "force-dynamic";

function safeParseNotes(notes: any) {
  if (!notes) return null;
  try {
    const obj = JSON.parse(String(notes));
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

function findSignatureDoc(order: any) {
  const docs: any[] = Array.isArray(order?.documents) ? order.documents : [];
  const kw = ["sign", "signature", "signed", "sig"];
  const has = (s: any) => {
    const t = String(s || "").toLowerCase();
    return kw.some((k) => t.includes(k));
  };
  return docs.find((d) => has(d?.title) || has(d?.name) || has(d?.fileName) || has(d?.url)) || null;
}

export default async function SignatureViewer({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    return <div className="p-6 text-sm text-zinc-600">Unauthorized</div>;
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { documents: true },
  });

  if (!order) return <div className="p-6 text-sm text-zinc-600">Order not found</div>;

  const meta = safeParseNotes(order.notes) || {};
  const signerName = meta?.signerName || meta?.signatureName || "";
  const signatureDataUrl = meta?.signatureDataUrl || meta?.signatureImage || meta?.signature?.dataUrl || "";

  const sigDoc = findSignatureDoc(order);
  const signatureSrc = sigDoc?.url || signatureDataUrl || "";

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto border rounded-2xl bg-white p-4">
        <div className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Signature Viewer</div>
        <div className="text-sm font-semibold mt-1">Order ID: {order.id}</div>
        <div className="text-sm text-zinc-600 mt-1">
          {signerName ? `Signed by: ${signerName}` : "Signer name not available"}
        </div>

        {signatureSrc ? (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signatureSrc}
              alt="Signature"
              className="w-full rounded-xl border bg-zinc-50 object-contain"
              style={{ maxHeight: 720 }}
            />
            <div className="mt-3">
              <a href={signatureSrc} target="_blank" rel="noreferrer" className="text-sm underline">
                Open original
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-zinc-600">Signature not found in Notes/Docs.</div>
        )}
      </div>
    </div>
  );
}