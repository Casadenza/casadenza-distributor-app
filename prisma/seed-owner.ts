import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "owner@casadenza.com";
  const password = "CasaVesnaINCdenza#5252#";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "ADMIN",
      displayName: "Casadenza Owner",
      forcePasswordReset: true,
    },
    create: {
      email,
      passwordHash,
      role: "ADMIN",
      displayName: "Casadenza Owner",
      forcePasswordReset: true,
    },
  });

  console.log("Break-glass owner account ready");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });