# CRM

A sales CRM for telecom resellers: register sales, customers and plans, follow each sale from order to installation, and keep the team's numbers in one place. The interface is in Brazilian Portuguese.

## Features

- **Sales**: new sale form with customer lookup, plan and negotiated price within the plan's range, payment method (boleto or direct debit with full bank data), installation scheduling by period, operational fields and team assignment.
- **Sale page**: status changes, seller changes, cancellation with reason, audit and BRScan marks, installation date, typed attachments (sale audio, proof of address) and a full change history.
- **Customers**: records with multiple addresses, sales summary and history export.
- **Plans**: plan types and price ranges with a sales script.
- **Users and roles**: permission-based access, with CPF/CNPJ masking for users without document access.
- **Settings**: configurable domain values (sale status, payment method, mailing, plan type, installation period, and more).
- **Import**: spreadsheet import with value mappings, deduplication and reprocessing (API ready; the screen is currently hidden).
- **Notifications and reports**: due-date reminders, change notifications and revenue reports with CSV export.

## Stack

- **API**: NestJS, Prisma, PostgreSQL
- **Web**: TanStack Start (React, SSR on Nitro), TanStack Query, Tailwind CSS v4
- **Tooling**: pnpm workspaces, Turborepo, Biome, Vitest
- **Production**: Docker Compose with Caddy (HTTPS) and daily backups

```
apps/api/             NestJS API + Prisma schema, migrations and seed
apps/web/             web app
packages/validation/  shared validators and formatters (CPF/CNPJ, phone, CEP, banks)
packages/config/      shared constants
docker/               Caddyfile and backup script
```

## Getting started

Requirements: Node.js 22, pnpm 10 (`corepack enable`) and PostgreSQL 13 or newer.

```sh
pnpm install

cp apps/api/.env.example apps/api/.env   # set DATABASE_URL and the JWT secrets
cp apps/web/.env.example apps/web/.env

pnpm db:migrate
pnpm db:seed    # prints a generated admin password once
pnpm dev
```

The web app runs on http://localhost:3000 and the API on http://localhost:3001. Log in with `SEED_ADMIN_EMAIL` (reference `9999`) and the printed password, then create the real users from the Usuários screen.

## Scripts

| Task | Command |
|---|---|
| Dev (API + web) | `pnpm dev` |
| Lint / fix | `pnpm lint` / `pnpm lint:fix` |
| Typecheck | `pnpm typecheck` |
| Test | `pnpm test` |
| Build | `VITE_API_URL=<api url> pnpm build` |

## Configuration

Each app reads its own `.env`; the examples list every variable. Branding (`APP_NAME`, logos) and the default PDV and system that every sale is tied to are set per deployment, so the repository stays neutral.

## Deploy

Production runs on a single server with Docker Compose. See [`DEPLOY.md`](DEPLOY.md) for the first deploy, branding, backups and restore.

## License

[MIT](LICENSE)
