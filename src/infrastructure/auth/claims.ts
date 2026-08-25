import { UserId } from "@/domain";

import { UnauthenticatedError } from "../errors";

export type ClaimsReader = {
  auth: {
    getClaims: () => Promise<{
      data: { claims: { sub?: unknown } | null } | null;
      error: { message: string } | null;
    }>;
  };
};

export async function userIdFromVerifiedClaims(
  client: ClaimsReader,
): Promise<string> {
  const { data, error } = await client.auth.getClaims();
  if (error) {
    throw new UnauthenticatedError(error.message);
  }

  const sub = data?.claims?.sub;
  if (typeof sub !== "string" || sub.length === 0) {
    throw new UnauthenticatedError();
  }

  return UserId.fromDto(sub).toDto();
}
