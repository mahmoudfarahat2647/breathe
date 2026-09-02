// PROTOTYPE (mockup restyle): routed through the variant controller so the
// redesign candidate can be viewed at `/?variant=mockup` (add `&fixture=1` for
// a deterministic capture state) while `/` with no query renders the current
// production screen unchanged. Revert to:
//
//   import { BreatheApp } from "@/presentation/breathe-app";
//   export default function Home() {
//     return <BreatheApp />;
//   }
//
// and delete mockup-variant-controller.tsx plus the `mockup-variant` plumbing in
// src/presentation/ once the redesign is folded into the real code.
import { MockupVariantController } from "./mockup-variant-controller";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const variant = typeof params.variant === "string" ? params.variant : "real";
  const fixture = params.fixture === "1";
  return <MockupVariantController variant={variant} fixture={fixture} />;
}
