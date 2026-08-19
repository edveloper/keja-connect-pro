// src/lib/supabase-errors.ts
//
// One place to turn a Postgres/PostgREST error into something a landlord can
// act on. This previously existed as five slightly different `getErrorMessage`
// functions, one per hook, none of which translated database error codes.

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

function asPostgrestError(error: unknown): PostgrestLikeError | null {
  if (typeof error !== "object" || error === null) return null;
  return error as PostgrestLikeError;
}

/** Postgres error codes worth naming explicitly. */
const CODE_MESSAGES: Record<string, string> = {
  "23505": "That record already exists.",
  "23503": "This is still linked to other records, so it cannot be removed yet.",
  "23514": "That value is outside the allowed range.",
  "22003": "That number is too large.",
  "42501": "You do not have permission to do that.",
  PGRST116: "That record no longer exists.",
};

/** True when the failure was a unique-constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  return asPostgrestError(error)?.code === "23505";
}

/** True when the failure was a check-constraint violation. */
export function isCheckViolation(error: unknown): boolean {
  return asPostgrestError(error)?.code === "23514";
}

/**
 * A human-readable message for an error from Supabase, a thrown `Error`, or
 * anything else. Never returns an empty string.
 */
export function getSupabaseErrorMessage(error: unknown): string {
  const pg = asPostgrestError(error);

  if (pg?.code && CODE_MESSAGES[pg.code]) {
    return CODE_MESSAGES[pg.code];
  }

  // Messages raised by our own RPCs are already written for people.
  if (typeof pg?.message === "string" && pg.message.trim() !== "") {
    const parts = [pg.message, pg.details, pg.hint].filter(
      (part): part is string => typeof part === "string" && part.trim() !== ""
    );
    return parts.join(" ");
  }

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
