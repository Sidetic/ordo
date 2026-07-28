# Ordo

A self-hostable bookmark manager. Save URLs, read them in a clean reader mode, organize into folders.

## Structure

```
ordo/
  packages/
    shared/   zod schemas, DTOs, types, API client contract
  apps/
    server/   NestJS + Prisma (SQLite)
    mobile/   Expo (React Native) + Expo Router
```

## Quick start

```bash
pnpm install
pnpm db:generate      # generate prisma client + create sqlite db
pnpm --filter server dev   # start backend (http://localhost:3000)
pnpm --filter mobile start # start expo
```

The server boots with zero config (SQLite at `apps/server/prisma/ordo.db`).

## Environment (all optional)

| Var | Default | Description |
|---|---|---|
| `PORT` | `3000` | Backend port |
| `DATABASE_URL` | `file:./ordo.db` | SQLite path |
| `JWT_SECRET` | auto-generated + persisted | App secret (token pepper) |
| `REGISTRATION_ENABLED` | `true` | Allow new sign-ups |
| `CORS_ALLOWED_ORIGINS` | reflect origin | Comma-separated origins |
| `EMAIL_VERIFICATION_REQUIRED` | `false` | Require email verification on signup |
| `SMTP_URL` / `SMTP_HOST` | — | SMTP for verification emails (console if unset) |
