# AGENTS.md

Guidance for AI agents working in this repository. See `README.md` for setup and `DEPLOY.md` for production.

## Project

CRM monorepo for telecom sales teams, TypeScript end to end.

```
apps/api/             NestJS API + Prisma (PostgreSQL)
  src/<feature>/      module, controller, service, DTOs and specs for one feature
  prisma/             schema, migrations, seed
apps/web/             TanStack Start (React, SSR on Nitro), TanStack Query, Tailwind v4
packages/validation/  shared validators and formatters (CPF/CNPJ, phone, CEP, banks); built to dist
packages/config/      shared constants (TypeScript source, no build)
clients/example/      example client folder (client.env, seed.json, branding)
deploy/               per-client stack, shared proxy, server scripts (server-setup, client-add, crm-deploy)
```

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev (API + web) | `pnpm dev` |
| Lint / fix | `pnpm lint` / `pnpm lint:fix` |
| Typecheck | `pnpm typecheck` |
| Test | `pnpm test` |
| Build | `VITE_API_URL=<url> pnpm build` (the web build refuses to run without it) |
| Migrations | `pnpm db:migrate` |
| Seed | `pnpm db:seed` |

Before calling work done, run lint, typecheck, test and build. All must pass.

Turborepo runs in strict env mode: shell variables are dropped unless declared in `turbo.json`. Put them in the app's `.env`.

### Running tests

- Always run tests in single-run mode (`pnpm test` / `vitest run`), never watch mode.
- Vitest timeouts live in each `vitest.config.ts` (test 10s, hook 10s, teardown 5s). Keep them in any new config.
- Also bound the command itself (shell or tool timeout) so a hung process cannot block the session.
- API tests are unit tests with mocked Prisma; never point tests at a real database.
- Fixtures use obvious placeholders only (Fulano de Tal, `@example.com`, CPF `123.456.789-09`, CNPJ `11.222.333/0001-81`). Never copy real customer, seller or client data into the repository.

## Language

- **UI text: Brazilian Portuguese** (screens, messages, API error messages shown to users).
- **Everything else: English** (identifiers, comments, docs, commit messages).

## Code style

- Names must say what the value is: booleans read as questions (`isDebit`, `canEdit`), React query results end in `Query` when kept in a variable.
- No `any` and no type casts (`as`) in application code. Use `unknown` + narrowing or generics. (Specs mock Nest dependencies with `as unknown as ConstructorParameters<...>`; keep that pattern out of application code.)
- Biome formats and lints; do not hand-format against it.
- Minimal, surgical changes. No speculative abstractions or features.

### Comments

Only comment when the code cannot speak for itself:

- **High complexity**: explain what a complex function does and why.
- **Intentional non-obvious logic**: something deliberately done differently from the usual way, with the reason.

Never comment what the code already says. Comments are always in English.

## API patterns

- **Validation**: request bodies are DTO classes with `class-validator`; the global `ValidationPipe` whitelists and transforms.
- **Errors**: throw `AppException` with a code from `ErrorCode` (`src/logging/error-codes.ts`) and a pt-BR message. Never leak raw Prisma or library errors to clients.
- **Permissions**: keys live in `src/permissions/permission-catalog.ts`; mirror new keys in `apps/web/src/lib/permissions.ts` and `permission-labels.ts`. Check with `@RequirePermission` or `PermissionsService.check`.
- **Audit**: mutations record an entry with `AuditService.record` (before/after), which feeds the sale and customer history.
- **Config**: read env vars only through `ConfigService<Env>`; every variable is declared in the zod schema in `src/config.ts`. A new variable also goes into `apps/api/.env.example`, `deploy/instance/docker-compose.yml` and, when it differs per client, `clients/example/client.env` and `DEPLOY.md`. Exception: `FileInterceptor` decorator options run before Nest's DI container exists, so `ConfigService` isn't available there; use `uploadTmpDir()` (`src/config.ts`), which reads `process.env.UPLOAD_DIR` directly, for that one case.
- **Personal data**: CPF/CNPJ go through the visibility helpers in `src/customers/document-visibility.ts` (permission `customers.view_document`). Never log secrets or personal data.
- **Logging**: use the Nest logger (`WinstonLoggerService`), not `console.*`.

### Prisma

- Change `schema.prisma`, then write or review the migration SQL by hand; data backfills go in the migration.
- A new enum value needs its own migration: Postgres cannot use a value in the transaction that adds it.
- After migrating, `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` must be empty.

## Web

- Routes are file-based in `apps/web/src/routes`. `routeTree.gen.ts` is generated; never edit it.
- Server state goes through TanStack Query hooks in `src/hooks/`, calling `src/lib/api.ts`.
- Form fields use `Field` from `components/ui`; mark fields that are optional on both web and API with `optional`.
- Check UI changes rendered, at the width of the column they live in, before calling them done.
- The product name comes from `APP_NAME` (`src/lib/brand.ts`); never hardcode a client brand.

## Git and deploy

- Conventional commits, one line: `feat: add lead creation endpoint`.
- Work happens on `main`.
- Never push or create tags unless explicitly asked. Pushes to `main` run checks (`ci.yml`); **a `vX.Y.Z` tag deploys to every client** (`release.yml`).
- Client identity (name, domain, branding, domain values) belongs in the private `crm-clients` repo, never in this one.
