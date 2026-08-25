import { SaveSession } from "@/application";
import {
  SupabaseSessionRepository,
  jsonResponse,
  sessionFromRequestBody,
  toErrorResponse,
  userIdFromVerifiedClaims,
} from "@/infrastructure";
import { createAppServerClient } from "@/app/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createAppServerClient();
    const userId = await userIdFromVerifiedClaims(supabase);
    const body: unknown = await request.json();
    const result = await new SaveSession(
      new SupabaseSessionRepository(supabase),
    ).execute(sessionFromRequestBody(body, userId));

    if (result.outcome === "skipped") {
      return jsonResponse(result, 202);
    }

    return jsonResponse(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
