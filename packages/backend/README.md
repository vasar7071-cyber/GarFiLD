# Backend (ChatX)

Stack: Node.js + Express + Socket.IO + Prisma + Postgres

Endpoints:
- /api/auth/register
- /api/auth/login
- /api/auth/refresh
- /api/me

Socket.IO: authenticate with { auth: { token: 'Bearer <accessToken>' } }

## Database migrations and CI

- Local dev migration (creates migration and applies locally):
  1. `pnpm prisma:generate`
  2. `pnpm prisma:migrate`  # follow prompts to create migration

- Use the prepared migration in `packages/backend/prisma/migrations/0001_init/migration.sql` to initialize a fresh database.

- CI (`.github/workflows/ci.yml`) will run tests and `pnpm prisma:deploy` using `DATABASE_URL` secret. In production (DigitalOcean) set `DATABASE_URL` secret in your repo (pointing to DO Managed Postgres) and configure `DIGITALOCEAN_ACCESS_TOKEN` if you add deployment steps.

