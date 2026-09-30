import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(raw) {
        const p = schema.safeParse(raw);
        if (!p.success) return null;
        const user = await db.user.findUnique({ where: { email: p.data.email } });
        if (!user || user.banned) return null;
        if (!(await bcrypt.compare(p.data.password, user.passwordHash))) return null;
        return { id: user.id, name: user.username, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) { if (user) token.uid = user.id; return token; },
    session({ session, token }) { if (token.uid) (session.user as { id?: string }).id = token.uid as string; return session; },
  },
});

export async function requireUserId() {
  const s = await auth();
  const id = (s?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  return id;
}

// Role is always read from the database, never from the client or token.
export async function requireRole(minimum: "MODERATOR" | "ADMIN") {
  const id = await requireUserId();
  if (!id) return null;
  const u = await db.user.findUnique({ where: { id }, select: { role: true, banned: true } });
  if (!u || u.banned) return null;
  const ok = minimum === "ADMIN" ? u.role === "ADMIN" : u.role !== "USER";
  return ok ? id : null;
}
