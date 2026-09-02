"use client";

/**
 * PROTOTYPE (mockup restyle) — Next.js-coupled wiring for the redesign mockup.
 * Lives in src/app/ deliberately: this is the layer allowed to depend on the
 * framework (next/navigation), keeping src/presentation/ framework-agnostic per
 * the Clean Architecture boundary even for throwaway prototype code.
 *
 * The `variant` / `fixture` values are read from the query string by the server
 * component (src/app/page.tsx) and passed in as plain props, so nothing here
 * calls useSearchParams and no Suspense boundary is needed.
 *
 * Delete this file, its import in page.tsx, and the `mockup-variant` plumbing in
 * src/presentation/ once the redesign is folded into the real code.
 */

import { useRouter } from "next/navigation";

import { BreatheApp } from "@/presentation/breathe-app";
import { BreatheAppMockup } from "@/presentation/breathe-app.mockup";
import { createMockupFixturePersistence } from "@/presentation/mockup-fixture";
import { MockupSwitcher } from "@/presentation/mockup-switcher";

export function MockupVariantController({
  variant,
  fixture,
}: {
  variant: string;
  fixture: boolean;
}) {
  const router = useRouter();
  const isMockup = variant === "mockup";

  function handleSelect(key: "real" | "mockup") {
    if (key === "mockup") {
      router.replace(fixture ? "/?variant=mockup&fixture=1" : "/?variant=mockup", {
        scroll: false,
      });
    } else {
      router.replace("/", { scroll: false });
    }
  }

  return (
    <>
      {isMockup ? (
        <BreatheAppMockup
          persistence={
            fixture ? createMockupFixturePersistence() : undefined
          }
        />
      ) : (
        <BreatheApp />
      )}
      <MockupSwitcher current={isMockup ? "mockup" : "real"} onSelect={handleSelect} />
    </>
  );
}
