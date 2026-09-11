import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import * as application from "@/application/index";
import * as domain from "@/domain/index";
import * as infrastructure from "@/infrastructure/index";

/**
 * Guardrail: domain and application modules must stay free of outer-layer packages.
 * ESLint `no-restricted-imports` and `boundaries/dependencies` enforce this at lint time.
 */
describe("architecture boundary", () => {
  it("domain entry exports an object without pulling React", () => {
    expect(domain).toBeTypeOf("object");
    expect("react" in domain).toBe(false);
  });

  it("application use cases load without pulling React or Next.js", () => {
    expect(application).toBeTypeOf("object");
    expect("react" in application).toBe(false);
    expect("next" in application).toBe(false);
    expect(typeof application.GetSettings).toBe("function");
    expect(typeof application.SaveSettings).toBe("function");
    expect(typeof application.SaveSession).toBe("function");
    expect(typeof application.GetSessionHistory).toBe("function");
    expect(typeof application.ApplyPreset).toBe("function");
  });

  it("presentation never imports infrastructure or Supabase", async () => {
    const presentationDir = join(process.cwd(), "src", "presentation");
    const files = await readdir(presentationDir, { recursive: true });
    for (const file of files) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
      const source = await readFile(join(presentationDir, file), "utf8");
      expect(source, file).not.toMatch(/@\/infrastructure/);
      expect(source, file).not.toMatch(/@supabase\//);
    }
  });

  it("infrastructure adapters are available without presentation imports", () => {
    expect(typeof infrastructure.createSupabaseServerClient).toBe("function");
    expect(typeof infrastructure.SupabaseSettingsRepository).toBe("function");
    expect(typeof infrastructure.SupabaseSessionRepository).toBe("function");
    expect(typeof infrastructure.SupabaseSessionHistoryRepository).toBe("function");
    expect(typeof infrastructure.userIdFromVerifiedClaims).toBe("function");
    expect(typeof infrastructure.ensureAnonymousSession).toBe("function");
  });
});
