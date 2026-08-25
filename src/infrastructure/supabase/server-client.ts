import { createServerClient, type CookieOptions } from "@supabase/ssr";

import type { BreathingSupabaseClient } from "./browser-client";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

export type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export type CookieMethods = {
  getAll: () => { name: string; value: string }[] | null;
  setAll: (
    cookies: CookieToSet[],
    headers: Record<string, string>,
  ) => void;
};

export function createSupabaseServerClient(
  cookies: CookieMethods,
): BreathingSupabaseClient {
  const { url, anonKey } = getSupabasePublicEnv();
  return createServerClient<Database>(url, anonKey, { cookies });
}
