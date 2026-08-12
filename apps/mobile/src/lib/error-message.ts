/**
 * Map an error to a human-readable message. Never leaks raw error objects.
 */
import { ApiClientError } from "./api/client";
import { ErrorCode } from "@ordo/shared";

const FRIENDLY: Record<string, string> = {
  [ErrorCode.INVALID_CREDENTIALS]: "Incorrect email, username or password",
  [ErrorCode.EMAIL_ALREADY_EXISTS]: "An account with this email already exists.",
  [ErrorCode.EMAIL_NOT_VERIFIED]: "Please verify your email before signing in.",
  [ErrorCode.INVALID_VERIFICATION_TOKEN]: "This verification link is invalid or has expired.",
  [ErrorCode.REGISTRATION_DISABLED]: "This server isn't accepting new sign-ups.",
  [ErrorCode.SESSION_REVOKED]: "Your session has ended. Please sign in again.",
  [ErrorCode.TOKEN_EXPIRED]: "Your session has expired.",
  [ErrorCode.UNAUTHORIZED]: "You need to sign in to do that.",
  [ErrorCode.FOLDER_NOT_FOUND]: "This folder no longer exists.",
  [ErrorCode.FOLDER_PROTECTED]: "This folder is locked.",
  [ErrorCode.INVALID_FOLDER_PASSWORD]: "That password is incorrect.",
  [ErrorCode.DEFAULT_FOLDER_IMMUTABLE]: "The default folder can't be deleted.",
  [ErrorCode.FOLDER_NOT_EMPTY]: "Empty the folder before deleting it.",
  [ErrorCode.BOOKMARK_NOT_FOUND]: "This bookmark no longer exists.",
  [ErrorCode.VALIDATION_ERROR]: "Please check your input and try again.",
  [ErrorCode.RATE_LIMITED]: "Too many requests. Please wait a moment.",
  [ErrorCode.INTERNAL_ERROR]: "Something went wrong on the server.",
};

export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiClientError) {
    if (err.status === 0 || err.code === "network_error") {
      return "Couldn't reach the server. Check your connection.";
    }
    return FRIENDLY[err.code] || err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** True if the error is a folder-protection signal requiring an unlock prompt. */
export function isFolderProtected(err: unknown): boolean {
  return err instanceof ApiClientError && err.code === ErrorCode.FOLDER_PROTECTED;
}
