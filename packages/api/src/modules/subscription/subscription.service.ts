import prisma from "@NewsFlow/db";

type PrismaClient = typeof prisma;

export async function getOrCreateSubscription(
  db: PrismaClient,
  userId: string
) {
  const existing = await db.subscription.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return db.subscription.create({
    data: {
      userId,
      tier: "free",
      status: "active",
    },
  });
}
