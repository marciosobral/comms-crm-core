## Summary

<!-- What this PR delivers and why, in 1-3 sentences. -->

## Decisions

<!-- Open decisions settled in this PR and what was chosen. Remove if none. -->

## How to test

<!-- Steps to verify locally or on a client instance. -->

## Checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass
- [ ] Tests cover the new behavior
- [ ] UI changes checked rendered, at the width of their column
- [ ] New env vars added to `apps/api/.env.example`, `deploy/instance/docker-compose.yml` and, when per client, `clients/example/client.env` and `DEPLOY.md`
- [ ] Migration SQL reviewed and `prisma migrate diff` is empty (if any)
