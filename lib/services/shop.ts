import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function buyItem(userId: string, itemId: string) {
  return db.$transaction(async (tx) => {
    const item = await tx.shopItem.findUnique({ where: { id: itemId } });
    if (!item || !item.active) throw new AppError("Item not available.");

    if (item.stock !== null) {
      const s = await tx.shopItem.updateMany({ where: { id: itemId, stock: { gt: 0 } }, data: { stock: { decrement: 1 } } });
      if (s.count === 0) throw new AppError("Out of stock.");
    }
    // Conditional update: balance can never go negative, even with parallel requests.
    const paid = await tx.user.updateMany({ where: { id: userId, coins: { gte: item.price } }, data: { coins: { decrement: item.price } } });
    if (paid.count === 0) throw new AppError("Not enough coins.");

    await tx.purchase.create({ data: { userId, itemId, price: item.price } });
    await tx.userInventory.upsert({
      where: { userId_itemId: { userId, itemId } },
      update: { quantity: { increment: 1 } },
      create: { userId, itemId },
    });
    await tx.notification.create({ data: { userId, type: "PURCHASE", message: `You bought ${item.name}.` } });
    return { item: item.name };
  });
}
