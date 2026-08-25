# Architecture boundaries

Dependencies point **inward**. Outer layers adapt to inner layers. Boundary data uses plain DTOs.

## Layers

| Layer | Path | Responsibility | May depend on |
| --- | --- | --- | --- |
| Domain | `src/domain` | Entities, value objects, pure progression rules | Domain only |
| Application | `src/application` | Use cases and repository ports | Domain, Application |
| Infrastructure | `src/infrastructure` | Supabase clients, repositories, schema adapters | Domain, Application, Infrastructure |
| Presentation | `src/presentation` | React UI, RAF/audio adapters | Domain, Application, Presentation, `components`, `lib` |
| App (composition) | `src/app` | Next.js routes, wiring | All layers |
| UI primitives | `src/components` | shadcn/ui primitives | `lib` |
| Shared utils | `src/lib` | Framework-agnostic helpers (e.g. `cn`) | `lib` |

## Hard rules

1. **Domain and Application** must not import React, Next.js, browser APIs (`window`, `document`, `requestAnimationFrame`, Web Audio), or Supabase.
2. **Domain** must not mention outer-layer names, file paths, or database row shapes.
3. **Presentation** must not import Infrastructure repositories or Supabase clients directly; persistence goes through Application ports composed in App/route handlers.
4. Data crossing boundaries is plain objects / DTOs — not ORM rows or React state objects.

## Enforcement

- ESLint `boundaries/dependencies` (see `eslint.config.mjs`) fails illegal layer imports with `default: "disallow"`.
- `no-restricted-imports` additionally blocks React / Next.js / Supabase packages inside `domain` and `application`.
- Unit and component tests live under `src/test/` (and Playwright under `e2e/`) so test tooling imports do not weaken inner-layer rules.
- Domain/Application unit tests run under Vitest without requiring a browser for core logic.

## Reference HTML

`index.html` at the repository root remains the behavioral and visual reference until Phase 6 verification passes. Do not modify it during feature work.
