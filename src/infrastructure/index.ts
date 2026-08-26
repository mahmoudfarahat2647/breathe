/**
 * Infrastructure layer — Supabase clients, repositories, and DB adapters.
 * Maps outer data to inner DTOs at the boundary.
 */

export {
  PersistenceError,
  UnauthenticatedError,
} from "./errors";
export {
  ensureAnonymousSession,
  type AnonymousAuthClient,
} from "./auth/anonymous-session";
export {
  userIdFromVerifiedClaims,
  type ClaimsReader,
} from "./auth/claims";
export { jsonResponse, toErrorResponse } from "./http/error-response";
export {
  preferencesFromRequestBody,
  sessionFromRequestBody,
  settingsFromRequestBody,
} from "./http/request-body";
export { sessionDtoToRow, sessionRowToDto, sessionRowToHistoryRecord, type SessionHistoryRow } from "./mappers/session-row";
export { settingsDtoToRow, settingsRowToDto } from "./mappers/settings-row";
export { SupabaseSessionHistoryRepository } from "./repositories/supabase-session-history-repository";
export { SupabaseSessionRepository } from "./repositories/supabase-session-repository";
export { SupabaseSettingsRepository } from "./repositories/supabase-settings-repository";
export {
  assertIanaTimeZone,
  calendarDayFromIso,
  isValidIanaTimeZone,
  resolveTimeZoneFromRequest,
  todayInTimeZone,
} from "./time/timezone";
export {
  createSupabaseServerClient,
  type BreathingSupabaseClient,
  type CookieMethods,
  type CookieToSet,
} from "./supabase/server-client";
export type { Database } from "./supabase/database.types";
export {
  PersistenceConfigError,
  getSupabasePublicEnv,
  hasSupabasePublicEnv,
} from "./supabase/env";
