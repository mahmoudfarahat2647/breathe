import { UserId } from "@/domain";

import { PersistenceError, UnauthenticatedError } from "../errors";
import { userIdFromVerifiedClaims, type ClaimsReader } from "./claims";

export type AnonymousAuthClient = ClaimsReader & {
  auth: ClaimsReader["auth"] & {
    signInAnonymously: () => Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };
};

export async function ensureAnonymousSession(
  client: AnonymousAuthClient,
): Promise<string> {
  try {
    return await userIdFromVerifiedClaims(client);
  } catch (error) {
    if (!(error instanceof UnauthenticatedError)) {
      throw error;
    }
  }

  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) {
    throw new PersistenceError(
      error?.message ?? "Anonymous sign-in did not return a user.",
    );
  }

  return UserId.fromDto(data.user.id).toDto();
}
