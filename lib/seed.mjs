import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@casadenza.local";
  const distributorEmail = "distributor1@casadenza.local";
  const tempPassword = "ChangeMe123!";

  const hash = await bcrypt.hash(tempPassword, 10);

  // ✅ ADMIN USER
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hash,
      role: "ADMIN",
      forcePasswordReset: false,
    },
    create: {
      email: adminEmail,
      passwordHash: hash,
      role: "ADMIN",
      forcePasswordReset: false,
    },
  });

  // ✅ DISTRIBUTOR USER
  const distUser = await prisma.user.upsert({
    where: { email: distributorEmail },
    update: {
      passwordHash: hash,
      role: "DISTRIBUTOR",
      forcePasswordReset: true,
    },
    create: {
      email: distributorEmail,
      passwordHash: hash,
      role: "DISTRIBUTOR",
      forcePasswordReset: true,
    },
  });

  // ✅ DISTRIBUTOR PROFILE (use unique userId)
  const distributor = await prisma.distributor.upsert({
    where: { userId: distUser.id },
    update: {
      name: "Distributor 1",
      tier: "STANDARD",
      country: "India",
      defaultCurrency: "USD",
      email: distributorEmail,
    },
    create: {
      userId: distUser.id,
      name: "Distributor 1",
      tier: "STANDARD",
      country: "India",
      defaultCurrency: "USD",
      email: distributorEmail,
    },
  });

  console.log("✅ Seed done.");
  console.log("Admin Login:", adminEmail, "/", tempPassword);
  console.log("Distributor Login:", distributorEmail, "/", tempPassword);
  console.log("Distributor ID:", distributor.id);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
