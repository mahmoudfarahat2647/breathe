import { GetSettings, SaveSettings } from "@/application";
import {
  SupabaseSettingsRepository,
  jsonResponse,
  preferencesFromRequestBody,
  toErrorResponse,
  userIdFromVerifiedClaims,
} from "@/infrastructure";
import { createAppServerClient } from "@/app/supabase/server";

async function composeSettings() {
  const supabase = await createAppServerClient();
  const userId = await userIdFromVerifiedClaims(supabase);
  const repository = new SupabaseSettingsRepository(supabase);
  return { userId, getSettings: new GetSettings(repository), saveSettings: new SaveSettings(repository) };
}

export async function GET() {
  try {
    const { userId, getSettings } = await composeSettings();
    const settings = await getSettings.execute(userId);
    return jsonResponse(settings);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, getSettings, saveSettings } = await composeSettings();
    const body: unknown = await request.json();
    const existing = await getSettings.execute(userId);
    const preferences = await saveSettings.execute(
      userId,
      preferencesFromRequestBody(body, existing?.goal ?? null, existing?.ramp ?? null),
    );
    return jsonResponse(preferences);
  } catch (error) {
    return toErrorResponse(error);
  }
}
