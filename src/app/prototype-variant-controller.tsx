"use client";

/**
 * PROTOTYPE (issue #17) — Next.js-coupled wiring for the Control Deck
 * visual-language mockup. Lives in src/app/ deliberately: this is the
 * layer allowed to depend on the framework (next/navigation), keeping
 * src/presentation/ framework-agnostic per the Clean Architecture
 * boundary even for throwaway prototype code.
 *
 * Delete this file, its import in page.tsx, and the variant plumbing in
 * breathe-app.tsx / prototype-switcher.tsx / control-deck.prototype-17.tsx
 * once a direction from #17 is picked and folded into the real code.
 */

import { useRouter, useSearchParams } from "next/navigation";

import { BreatheApp } from "@/presentation/breathe-app";
import { PrototypeSwitcher } from "@/presentation/prototype-switcher";

const VARIANTS = [
  { key: "real", name: "Current (#20/#21)" },
  { key: "a", name: "Tight Stack" },
  { key: "b", name: "Grouped Chips" },
  { key: "c", name: "Merged & Split" },
];

export function PrototypeVariantController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const variantKey = searchParams.get("variant") ?? "real";

  function handleSelect(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", key);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <>
      <BreatheApp variantKey={variantKey} />
      <PrototypeSwitcher
        variants={VARIANTS}
        current={variantKey}
        onSelect={handleSelect}
      />
    </>
  );
}
