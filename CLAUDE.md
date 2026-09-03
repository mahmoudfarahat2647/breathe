# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md is loaded automatically and takes precedence for Next.js version-specific and agent-skill instructions - read it first.

## Commands

Standard scripts are in `package.json` (`dev`, `build`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `test:all`, `test:db`). Non-obvious invocations:

Run a single Vitest file/test: `pnpm vitest run src/test/domain/phase.test.ts` or `pnpm vitest run -t "test name"`.
Run a single Playwright spec: `pnpm playwright test e2e/parity.spec.ts`.

Package manager is pnpm (`packageManager: pnpm@10.13.1`) - do not use npm/yarn.

## Architecture

This is a Clean Architecture app (Next.js App Router). Dependencies point strictly inward, and this is **enforced by ESLint**, not just convention - `eslint-plugin-boundaries` (`boundaries/dependencies`) plus `no-restricted-imports` in [eslint.config.mjs](eslint.config.mjs) will fail the build on illegal imports (there's also a runtime guardrail test at [src/test/architecture-boundary.test.ts](src/test/architecture-boundary.test.ts)). The layer/path/allowed-dependency matrix lives in that ESLint config; the prose walkthrough is [docs/architecture.md](docs/architecture.md).

Two boundary rules the linter can't fully express:
- Route handlers verify JWT claims via `getClaims()` / `userIdFromVerifiedClaims()` and derive `UserId` server-side; never trust an ownership id from the request body/headers (see [src/app/api/sessions/route.ts](src/app/api/sessions/route.ts) for the pattern: auth -> build DTO from body + server-derived userId -> use case -> mapped response).
- Data crossing a layer boundary is a plain DTO (e.g. `BreathingPreferencesDto`, `BreathingSessionDto`), never a Supabase row or React state object directly.

### Domain model

The breathing cycle has 4 phases in fixed order: **inhale -> hold -> exhale -> rest** (Hold/Rest can be 0s to skip). The engine (`src/domain/breathing-engine.ts`) is timestamp/RAF-driven, not `setInterval`. Stage rendering picks Square (rest > 0) vs Triangle (rest = 0) automatically based on the active preset. Full glossary and terminology (Phase/Preset/Stage/Session/Session Goal/Streak) is in [CONTEXT.md](CONTEXT.md) - use those exact terms, not synonyms it explicitly avoids (e.g. "Pattern" is deprecated in favor of "Preset").

### Reference/parity contract

This app was ported from a static reference implementation; [docs/parity-contract.md](docs/parity-contract.md) enumerates every observable behavior (geometry, phase timing, controls, audio, keyboard, a11y, responsive breakpoints, reduced motion, design tokens, persistence) that must stay bit-for-bit compatible, each tagged automated (A) vs. visual-check (V). Consult it before changing anything visual or behavioral in the Stage/controls - many of these are locked down by tests in `src/test/presentation/` and `e2e/parity.spec.ts`.

## Implementation workflow

- Claude writes and edits code directly in this repo for implementation tasks and prototypes - that's the default.
- `agy-delegate` (Antigravity CLI, Gemini 3.7 Flash High) is a secondary option: reach for it only when explicitly requested, or for a specific sub-agent task that benefits from a second, independent implementer. It never blocks direct code generation and file edits.
- Prefer having a plan or spec before larger changes; use judgment on when a small fix doesn't need one.

## Project docs and workflow

- **Domain glossary / ADRs**: single-context layout - [CONTEXT.md](CONTEXT.md) at repo root, ADRs would live in `docs/adr/`. See [docs/agents/domain.md](docs/agents/domain.md) for how to consume them (use glossary vocabulary, flag ADR conflicts explicitly).
- **Issues**: tracked in GitHub Issues (`mahmoudfarahat2647/breathe`) via the `gh` CLI - see [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) for conventions (creating/reading/labeling issues, PR triage, wayfinder map/child-ticket operations). **Always keep issue status current on GitHub**: when work for an issue lands, close it via `gh issue close <n>` with a comment summarising what shipped and the commit SHA; move it to the right state / labels as work progresses; open a follow-up issue for anything deferred rather than leaving it implicit.
- **Supabase**: schema/RLS in `supabase/migrations/*.sql`; `supabase/tests/breathing_rls_test.sql` run via `pnpm test:db`. Schema-change / mapper-sync rules are in [src/infrastructure/CLAUDE.md](src/infrastructure/CLAUDE.md) - loaded when working in that layer.
