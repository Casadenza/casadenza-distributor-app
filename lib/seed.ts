import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const adminEmail = "admin@casadenza.local";
  const distEmail = "distributor1@casadenza.local";
  const password = "ChangeMe123!";

  const adminHash = await bcrypt.hash(password, 10);
  const distHash = await bcrypt.hash(password, 10);

  // -------------------------
  // Users
  // -------------------------
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: adminHash, role: "ADMIN" },
  });

  const distUser = await prisma.user.upsert({
    where: { email: distEmail },
    update: {},
    create: { email: distEmail, passwordHash: distHash, role: "DISTRIBUTOR" },
  });

  const distributor = await prisma.distributor.upsert({
    where: { userId: distUser.id },
    update: {},
    create: {
      userId: distUser.id,
      name: "Demo Distributor",
      tier: "STANDARD",
      country: "India",
      defaultCurrency: "INR",
    },
  });

  // -------------------------
  // Products (schema-safe)
  // Product fields allowed:
  // sku, name, image, collection, stoneType, thicknessMm, isActive
  // -------------------------
  const products = [
    {
      sku: "SV-001",
      name: "Stone Veneer - Classic Grey",
      collection: "Fusion",
      stoneType: "Slate",
      thicknessMm: 1,
      image: "",
      variants: [
        { sizeLabel: "4ft x 8ft", widthMm: 1220, heightMm: 2400 },
      ],
    },
    {
      sku: "SV-002",
      name: "Stone Veneer - White Pearl",
      collection: "Fusion",
      stoneType: "Quartzite",
      thicknessMm: 1,
      image: "",
      variants: [
        { sizeLabel: "4ft x 8ft", widthMm: 1220, heightMm: 2400 },
      ],
    },
    {
      sku: "WP-101",
      name: "Luxury Wallpaper - Minimal Texture",
      collection: "Denzario",
      stoneType: "Wallpaper",
      thicknessMm: null,
      image: "",
      variants: [
        // Wallpaper ke liye sizeLabel flexible rakhte hain
        { sizeLabel: "Roll", widthMm: null, heightMm: null },
      ],
    },
  ] as const;

  for (const p of products) {
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        collection: p.collection ?? null,
        stoneType: p.stoneType ?? null,
        thicknessMm: p.thicknessMm ?? null,
        image: p.image || null,
        isActive: true,
      },
      create: {
        sku: p.sku,
        name: p.name,
        collection: p.collection ?? null,
        stoneType: p.stoneType ?? null,
        thicknessMm: p.thicknessMm ?? null,
        image: p.image || null,
        isActive: true,
      },
    });

    // Variants + Prices (variant-based)
    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where: {
          productId_sizeLabel: { productId: prod.id, sizeLabel: v.sizeLabel },
        },
        update: {
          widthMm: v.widthMm ?? null,
          heightMm: v.heightMm ?? null,
          isActive: true,
        },
        create: {
          productId: prod.id,
          sizeLabel: v.sizeLabel,
          widthMm: v.widthMm ?? null,
          heightMm: v.heightMm ?? null,
          isActive: true,
        },
      });

      // Price entry (STANDARD / INR)
      await prisma.price.upsert({
        where: {
          variantId_tier_currency: {
            variantId: variant.id,
            tier: "STANDARD",
            currency: "INR",
          },
        },
        update: {
          priceSheet: 1000,
          priceSqm: null,
          priceSqft: null,
        },
        create: {
          variantId: variant.id,
          tier: "STANDARD",
          currency: "INR",
          priceSheet: 1000,
          priceSqm: null,
          priceSqft: null,
        },
      });
    }
  }

  // -------------------------
  // Announcement (avoid duplicates)
  // -------------------------
  const existingWelcome = await prisma.announcement.findFirst({
    where: { title: "Welcome" },
  });

  if (!existingWelcome) {
    await prisma.announcement.create({
      data: {
        title: "Welcome",
        message:
          "Welcome to Casadenza Distributor Portal. You can place orders, track status, and raise support tickets here.",
        isActive: true,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Demo logins:");
  console.log("Admin:", adminEmail, password);
  console.log("Distributor:", distEmail, password);
  console.log("Distributor ID:", distributor.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });