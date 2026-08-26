# Breathe

A pixel-faithful, accessible, and resilient breathing exercise application built with Next.js App Router, Tailwind CSS v4, shadcn/ui, and Supabase.

---

## 🌟 Overview

Breathe delivers an immersive square breathing experience (Inhale → Hold → Exhale → Rest) with English labels, precision SVG animation, Web Audio synthesis, full keyboard controls, responsive layouts, reduced-motion adaptations, and resilient anonymous Supabase persistence.

The codebase strictly follows **Clean Architecture** with inward-pointing dependencies and automated layer boundary enforcement.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router with Turbopack) & React 19
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS v4 (`@theme` design tokens) & `tw-animate-css`
- **UI Components:** shadcn/ui primitives (`Button`, `Switch`, `Card`, `@base-ui/react`)
- **Persistence & Auth:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`, Row Level Security, Anonymous Auth)
- **Audio:** Web Audio API (synthesized tone oscillators)
- **Testing:** Vitest (unit/component), Testing Library, Playwright (desktop, mobile, short viewport, reduced motion), and pgTAP (Supabase RLS tests)
- **Package Manager:** **pnpm only** (v10+)

---

## 🏗️ Architecture & Boundaries

The codebase is organized into strict Clean Architecture layers:

```
src/
├── domain/            # Core business entities, value objects & pure progression engine (no React, Next.js, or Supabase)
├── application/       # Use cases (GetSettings, SaveSettings, SaveSession) & repository port interfaces
├── infrastructure/    # Supabase adapters, server/browser clients, auth mappers, and claim verifiers
├── presentation/      # React UI components, requestAnimationFrame engine adapter, Web Audio synthesizer
├── app/               # Next.js App Router pages, layout, route handlers (/api/*), and proxy/middleware
├── components/        # shadcn/ui shared primitives
└── lib/               # Shared utility functions (e.g. cn)
```

### Boundary Rules

1. **Inward Dependencies:** Domain and Application never import React, Next.js, browser APIs (`window`, `document`, Web Audio, `requestAnimationFrame`), or Supabase.
2. **DTO Isolation:** Data crossing boundaries consists strictly of simple DTOs.
3. **Presentation Isolation:** Presentation components never import Infrastructure or Supabase directly; all persistence flows through Application ports and Next.js route handlers.
4. **Server Claim Verification:** Route handlers derive user ownership server-side using verified JWT claims (`getClaims()`) and never trust client-provided IDs.
5. **Enforcement:** Enforced via `eslint-plugin-boundaries` and `no-restricted-imports` on every lint and build.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** `>= 20.x`
- **pnpm:** `>= 10.x` (Use `pnpm` exclusively; do not create `package-lock.json` or `yarn.lock`)

### 1. Clone & Install

```bash
git clone <repo-url>
cd Breath
pnpm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your Supabase project credentials in `.env.local`:

```env
# Public Supabase project URL (safe for the browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Public anon / publishable key (safe for the browser; RLS enforces access)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

> **Security Note:** Never add `service_role` keys or private secrets to `NEXT_PUBLIC_*` variables. The application uses anonymous sign-in and Row Level Security (RLS) policies to protect data.

### 3. Supabase Setup & Anonymous Auth

1. **Enable Anonymous Sign-ins:** In the Supabase dashboard, navigate to **Authentication → Providers → Anonymous Sign-In** and toggle it **ON**.
2. **Apply Migrations:**
   - **Remote:** Run the migration script in `supabase/migrations/` via the Supabase SQL Editor or Supabase CLI (`supabase db push`).
   - **Local Development:**
     ```bash
     supabase start
     supabase db reset
     ```

---

## 📋 Available Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Starts the Next.js development server at `http://localhost:3000` |
| `pnpm build` | Generates the optimized production build |
| `pnpm start` | Runs the Next.js production server |
| `pnpm lint` | Runs ESLint and validates architectural import boundaries |
| `pnpm typecheck` | Runs the TypeScript compiler (`tsc --noEmit`) to verify types |
| `pnpm test` | Runs all Vitest unit and component tests |
| `pnpm test:watch` | Runs Vitest in interactive watch mode |
| `pnpm test:e2e` | Runs Playwright end-to-end and parity verification tests |
| `pnpm test:all` | Runs both unit and e2e test suites |
| `pnpm test:db` | Runs pgTAP tests against local Supabase database for RLS policy verification |

---

## 🎯 Verification & Parity Matrix

All features have been verified against the parity specification:

- **SVG Square Geometry:** Exact coordinates (`M40,360 L40,40 L360,40 L360,360 Z`), phase side paths, stroke dash-offset interpolation, and progress dot positioning.
- **Timestamp Engine:** Pure timestamp-driven progression using `requestAnimationFrame` with background tab delta clamping (1s cap) and multi-phase overflow handling.
- **Controls & Accessibility:**
  - Transport buttons: Start, Pause, Resume, Reset.
  - English phase labels: Inhale, Hold, Exhale, Rest.
  - Duration steppers: Inhale (2-15s), Hold (1-15s), Exhale (2-15s), Rest (1-15s), Use 4-4-6-2.
  - ARIA Live announcer (`aria-live="polite"`), focus management, and keyboard controls (`Space` to toggle, `R` to reset).
- **Responsive Design:** Optimized for Desktop, Mobile (`< 480px`), and Short Viewports (`< 640px` height).
- **Reduced Motion:** Respects `prefers-reduced-motion: reduce` by disabling blob drift and pulsing animations.
- **Resilient Persistence:**
  - Client-side UUID generation for idempotent session snapshot saves on Reset (≥ 1 full cycle).
  - Debounced (800ms) settings persistence with fallback to 4-4-6-2 defaults.
  - Non-blocking offline/API error recovery.

---

## 🔒 Security Model

- **No Exposed Secrets:** `.env.example` contains parameter names only. No credentials, tokens, or service-role keys are tracked in git.
- **Row Level Security (RLS):** Both `breathing_settings` and `breathing_sessions` enforce RLS using `auth.uid() = user_id`.
- **Server-Side Identity:** Route handlers verify JWT claims via `@supabase/ssr` `getClaims()` and map to `UserId` server-side, ignoring client-submitted user IDs.
