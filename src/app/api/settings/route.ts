import { GetSettings, SaveSettings } from "@/application";
import {
  SupabaseSettingsRepository,
  jsonResponse,
  settingsFromRequestBody,
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
    const { userId, saveSettings } = await composeSettings();
    const body: unknown = await request.json();
    const settings = await saveSettings.execute(
      userId,
      settingsFromRequestBody(body),
    );
    return jsonResponse(settings);
  } catch (error) {
    return toErrorResponse(error);
  }
}
