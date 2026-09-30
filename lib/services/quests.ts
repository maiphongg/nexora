import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { applyXP, LEVEL_UP_COINS } from "@/lib/xp";

export async function claimQuest(userId: string, questId: string) {
  return db.$transaction(async (tx) => {
    // Lock the user row so concurrent claims cannot lose XP/coin updates.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

    const uq = await tx.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true },
    });
    if (!uq || !uq.quest.active) throw new AppError("Quest not found.");
    if (uq.quest.expiresAt && uq.quest.expiresAt < new Date()) throw new AppError("Quest expired.");
    if (uq.progress < uq.quest.target) throw new AppError("Quest not completed yet.");

    // Atomic guard: only one request can flip claimedAt from null.
    const flipped = await tx.userQuest.updateMany({
      where: { userId, questId, claimedAt: null },
      data: { claimedAt: new Date() },
    });
    if (flipped.count === 0) throw new AppError("Quest already claimed.");

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const { level, xp, levelsGained } = applyXP(user.level, user.xp, uq.quest.rewardXp);
    const coins = uq.quest.rewardCoins + levelsGained * LEVEL_UP_COINS;

    await tx.user.update({
      where: { id: userId },
      data: { level, xp, totalXp: { increment: uq.quest.rewardXp }, coins: { increment: coins } },
    });
    await tx.notification.createMany({
      data: [
        { userId, type: "QUEST", message: `Quest completed: ${uq.quest.title} (+${uq.quest.rewardXp} XP, +${uq.quest.rewardCoins} coins)` },
        ...(levelsGained > 0 ? [{ userId, type: "LEVEL_UP", message: `LEVEL UP! You reached level ${level}.` }] : []),
      ],
    });
    return { level, xp, coinsGained: coins, xpGained: uq.quest.rewardXp, leveledUp: levelsGained > 0 };
  });
}
