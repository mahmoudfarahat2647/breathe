import { createSupabaseBrowserClient } from "@/infrastructure";

export function createAppBrowserClient() {
  return createSupabaseBrowserClient();
}
