Backend quick notes:

- Run development: `pnpm dev` in package folder (requires pnpm)
- Set DATABASE_URL in .env
- Initialize prisma: `pnpm prisma:migrate`

Socket.IO: provide token on connect as `auth: { token: 'Bearer <accessToken>' }`