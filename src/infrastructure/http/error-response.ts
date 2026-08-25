import { DomainValidationError } from "@/domain";

import { PersistenceError, UnauthenticatedError } from "../errors";
import { PersistenceConfigError } from "../supabase/env";

export const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: PRIVATE_CACHE_HEADERS });
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof UnauthenticatedError) {
    return jsonResponse({ error: error.message }, 401);
  }
  if (error instanceof DomainValidationError) {
    return jsonResponse({ error: error.message }, 400);
  }
  if (error instanceof SyntaxError) {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  if (
    error instanceof PersistenceError ||
    error instanceof PersistenceConfigError
  ) {
    return jsonResponse({ error: error.message }, 503);
  }

  return jsonResponse({ error: "Unexpected persistence error." }, 500);
}
