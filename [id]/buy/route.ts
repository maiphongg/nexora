import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { buyItem } from "@/lib/services/shop";
import { fail } from "@/lib/api";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await buyItem(userId, (await params).id)); }
  catch (e) { return fail(e); }
}
