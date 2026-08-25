import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/infrastructure";

export async function createAppServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        // Called from a Server Component. The proxy refreshes cookies.
      }
    },
  });
}
