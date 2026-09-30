import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

export function fail(e: unknown) {
  if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: 400 });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
