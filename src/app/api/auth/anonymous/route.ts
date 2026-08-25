import { ensureAnonymousSession, jsonResponse, toErrorResponse } from "@/infrastructure";
import { createAppServerClient } from "@/app/supabase/server";

export async function POST() {
  try {
    const supabase = await createAppServerClient();
    const userId = await ensureAnonymousSession(supabase);
    return jsonResponse({ userId });
  } catch (error) {
    return toErrorResponse(error);
  }
}
