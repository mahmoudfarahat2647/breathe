# Breathe

Pixel-faithful Next.js breathing exercise (App Router + Tailwind CSS v4 + shadcn/ui + Supabase).

## Package manager

Use **pnpm only**. Do not introduce `package-lock.json` or `yarn.lock`.

```bash
pnpm install
pnpm dev
pnpm test
pnpm test:e2e
pnpm test:db
pnpm lint
pnpm typecheck
pnpm build
```

## Reference HTML

`index.html` at the repo root is the behavioral and visual reference. Keep it until Phase 6 verification passes.

## Docs

- [Architecture boundaries](docs/architecture.md)
- [Parity contract](docs/parity-contract.md)

## Environment

Copy `.env.example` to `.env.local` and fill public Supabase values (project URL and anon/publishable key). Never commit secrets or service-role keys. Enable anonymous sign-ins in the Supabase project. Local schema and RLS tests:

```bash
supabase start
pnpm test:db
```
