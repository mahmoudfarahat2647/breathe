# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md is loaded automatically and takes precedence for Next.js version-specific and agent-skill instructions — read it first.

## Commands

```
pnpm dev                # start dev server
pnpm build               # production build
pnpm lint                # eslint . (includes boundaries/dependencies layer check)
pnpm typecheck            # tsc --noEmit
pnpm test                 # vitest run (unit/component)
pnpm test:watch           # vitest watch mode
pnpm test:e2e              # playwright test
pnpm test:all               # pnpm test && pnpm test:e2e
pnpm test:db                # supabase test db (runs supabase/tests/*.sql)
```

Run a single Vitest file/test: `pnpm vitest run src/test/domain/phase.test.ts` or `pnpm vitest run -t "test name"`.
Run a single Playwright spec: `pnpm playwright test e2e/parity.spec.ts`.

Package manager is pnpm (`packageManager: pnpm@10.13.1`) — do not use npm/yarn.

## Architecture

This is a Clean Architecture app (Next.js App Router). Dependencies point strictly inward, and this is **enforced by ESLint**, not just convention — `eslint-plugin-boundaries` (`boundaries/dependencies`) plus `no-restricted-imports` in [eslint.config.mjs](eslint.config.mjs) will fail the build on illegal imports. There's also a runtime guardrail test at [src/test/architecture-boundary.test.ts](src/test/architecture-boundary.test.ts).

| Layer | Path | May depend on |
| --- | --- | --- |
| Domain | `src/domain` | Domain only — no React, Next.js, browser APIs, or Supabase |
| Application | `src/application` | Domain, Application — use cases + repository ports (`ports.ts`) |
| Infrastructure | `src/infrastructure` | Domain, Application, Infrastructure, `@supabase/*` — Supabase clients, repositories, schema mappers |
| Presentation | `src/presentation` | Domain, Application, Presentation, `components`, `lib`, React — **never** Infrastructure or Supabase directly |
| App | `src/app` | All layers — Next.js routes, composition/wiring only |
| `src/components` | shadcn/ui primitives | `components`, `lib` |
| `src/lib` | Framework-agnostic helpers (`cn`, etc.) | `lib` only |

Key implications when writing code:
- Persistence from Presentation always goes through an Application use case/port, composed in an `src/app` route handler — never call an Infrastructure repository from a component.
- Route handlers verify JWT claims via `getClaims()` / `userIdFromVerifiedClaims()` and derive `UserId` server-side; never trust an ownership id from the request body/headers (see [src/app/api/sessions/route.ts](src/app/api/sessions/route.ts) for the pattern: auth → build DTO from body + server-derived userId → use case → mapped response).
- Data crossing a layer boundary is a plain DTO (e.g. `BreathingPreferencesDto`, `BreathingSessionDto`), never a Supabase row or React state object directly.
- Each layer has a barrel `index.ts` (`src/domain/index.ts`, `src/application/index.ts`, `src/infrastructure/index.ts`, `src/presentation/index.ts`) — import from the barrel, not deep paths, when consuming another layer.
- Full rules: [docs/architecture.md](docs/architecture.md).

### Domain model

The breathing cycle has 4 phases in fixed order: **inhale → hold → exhale → rest** (Hold/Rest can be 0s to skip). The engine (`src/domain/breathing-engine.ts`) is timestamp/RAF-driven, not `setInterval`. Stage rendering picks Square (rest > 0) vs Triangle (rest = 0) automatically based on the active preset. Full glossary and terminology (Phase/Preset/Stage/Session/Session Goal/Streak) is in [CONTEXT.md](CONTEXT.md) — use those exact terms, not synonyms it explicitly avoids (e.g. "Pattern" is deprecated in favor of "Preset").

### Reference/parity contract

This app was ported from a static reference implementation; [docs/parity-contract.md](docs/parity-contract.md) enumerates every observable behavior (geometry, phase timing, controls, audio, keyboard, a11y, responsive breakpoints, reduced motion, design tokens, persistence) that must stay bit-for-bit compatible, each tagged automated (A) vs. visual-check (V). Consult it before changing anything visual or behavioral in the Stage/controls — many of these are locked down by tests in `src/test/presentation/` and `e2e/parity.spec.ts`.

## Implementation workflow policy

- **All implementation work is delegated via the `agy-delegate` skill**, driving Antigravity CLI configured for **Gemini 3.7 Flash High**. Claude acts as reviewer/orchestrator: hand the task to `agy-delegate`, then review its diff and land it — do not write implementation code directly.
- **Never implement without an approved plan or spec.** If asked to build/fix/change something and no plan or spec exists yet for it, stop and notify the user instead of proceeding — do not delegate to `agy-delegate` or write code until a plan/spec is in place.

## Project docs and workflow

- **Domain glossary / ADRs**: single-context layout — [CONTEXT.md](CONTEXT.md) at repo root, ADRs would live in `docs/adr/`. See [docs/agents/domain.md](docs/agents/domain.md) for how to consume them (use glossary vocabulary, flag ADR conflicts explicitly).
- **Issues**: tracked in GitHub Issues (`mahmoudfarahat2647/breathe`) via the `gh` CLI — see [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) for conventions (creating/reading/labeling issues, PR triage, wayfinder map/child-ticket operations).
- **Supabase**: schema/RLS in `supabase/migrations/*.sql`; `supabase/tests/breathing_rls_test.sql` run via `pnpm test:db`. Schema changes must keep [src/infrastructure/supabase/database.types.ts](src/infrastructure/supabase/database.types.ts) and the mappers in `src/infrastructure/mappers/` in sync — there's a `schema-contract.test.ts` guarding this.
