import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "orders@casadenza.com";
  const password = "Order#Casadenza#";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "ORDER_ADMIN",
      displayName: "Order Admin",
      forcePasswordReset: true,
    },
    create: {
      email,
      passwordHash,
      role: "ORDER_ADMIN",
      displayName: "Order Admin",
      forcePasswordReset: true,
    },
  });

  console.log("ORDER_ADMIN account ready");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });