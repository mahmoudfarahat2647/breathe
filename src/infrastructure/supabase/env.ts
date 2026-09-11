const MODERN_PUBLISHABLE_PREFIX = "sb_publishable_";
const LEGACY_ANON_ROLE = "anon";

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export class PersistenceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersistenceConfigError";
  }
}

export function hasSupabasePublicEnv(
  env: Record<string, string | undefined> = process.env,
): boolean {
  try {
    getSupabasePublicEnv(env);
    return true;
  } catch (error) {
    if (error instanceof PersistenceConfigError) {
      return false;
    }
    throw error;
  }
}

export function getSupabasePublicEnv(
  env: Record<string, string | undefined> = process.env,
): SupabasePublicEnv {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = (
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  ).trim();

  if (!url || !anonKey) {
    throw new PersistenceConfigError(
      "Missing NEXT_PUBLIC_SUPABASE_URL or public anon/publishable key.",
    );
  }

  if (!isPublicSupabaseKey(anonKey)) {
    throw new PersistenceConfigError(
      "Only anon or publishable keys belong in NEXT_PUBLIC_* variables. Service-role keys must not be used in the application client.",
    );
  }

  return { url, anonKey };
}

function isPublicSupabaseKey(key: string): boolean {
  if (key.startsWith(MODERN_PUBLISHABLE_PREFIX)) {
    return true;
  }

  const payload = decodeJwtPayload(key);
  return payload?.role === LEGACY_ANON_ROLE;
}

function decodeJwtPayload(token: string): { role?: string } | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as { role?: string };
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const withPad =
    padded.length % 4 === 0 ? padded : `${padded}${"=".repeat(4 - (padded.length % 4))}`;

  if (typeof atob === "function") {
    return atob(withPad);
  }

  return Buffer.from(withPad, "base64").toString("utf8");
}
