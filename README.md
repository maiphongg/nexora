# NEXORA (core backend)

## Setup
    npm install
    cp .env.example .env      # fill DATABASE_URL and AUTH_SECRET (openssl rand -base64 32)
    npx prisma generate
    npx prisma migrate dev
    npm run dev

## Admin
Register normally, then promote yourself once in the database:
    UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';

## Included
- Prisma schema (users, quests, shop, inventory, notifications, audit log)
- XP/level formula (`lib/xp.ts`)
- Quest claim + shop purchase as row-locked / conditional-update transactions
- Auth.js credentials login, DB-checked role guards
