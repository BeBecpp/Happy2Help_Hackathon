import { GraphQLError } from "graphql";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "ZONE_UNAVAILABLE"
  | "INCIDENT_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "TEMPORARY_FAILURE"
  | "RATE_LIMITED"
  | "AI_UNAVAILABLE";

/** Stable error codes for the client; messages are Mongolian end-user copy. */
export function fail(code: ErrorCode, message: string): never {
  throw new GraphQLError(message, { extensions: { code, service: "happy2help" } });
}
