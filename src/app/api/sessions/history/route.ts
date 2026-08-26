import { GetSessionHistory } from "@/application";
import {
  SupabaseSessionHistoryRepository,
  jsonResponse,
  resolveTimeZoneFromRequest,
  todayInTimeZone,
  toErrorResponse,
  userIdFromVerifiedClaims,
} from "@/infrastructure";
import { createAppServerClient } from "@/app/supabase/server";

export async function GET(request: Request) {
  try {
    const timeZone = resolveTimeZoneFromRequest(request);
    const supabase = await createAppServerClient();
    const userId = await userIdFromVerifiedClaims(supabase);
    const today = todayInTimeZone(timeZone);
    const result = await new GetSessionHistory(
      new SupabaseSessionHistoryRepository(supabase, timeZone),
    ).execute(userId, today);

    return jsonResponse(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
