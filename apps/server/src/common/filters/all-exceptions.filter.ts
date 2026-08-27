import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AppError, type AppErrorPayload } from "../errors/app-error.js";
import { ErrorCode, type ApiError } from "@ordo/shared";

/** Global filter — every response uses the `{ error: ApiError }` envelope. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exception");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const path = req.method + " " + req.url;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: ApiError;

    if (exception instanceof AppError) {
      const body = exception.getResponse() as AppErrorPayload;
      status = exception.getStatus();
      payload = {
        code: body.code,
        message: body.message,
        ...(body.details !== undefined ? { details: body.details } : {}),
      };
    } else if (isMulterTooLarge(exception)) {
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      payload = {
        code: ErrorCode.AVATAR_TOO_LARGE,
        message: "This image is too large",
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      payload = this.fromHttpException(body, status);
    } else {
      this.logger.error(`Unhandled error at ${path}`, (exception as Error)?.stack ?? exception);
      payload = {
        code: ErrorCode.INTERNAL_ERROR,
        message: "Something went wrong on our end",
      };
    }

    if (status >= 500) {
      this.logger.error(`${payload.code} ${status} at ${path}: ${payload.message}`);
    } else {
      this.logger.warn(`${payload.code} ${status} at ${path}: ${payload.message}`);
    }

    const retryAfter = retryAfterSecondsOf(payload.details);
    if (status === HttpStatus.TOO_MANY_REQUESTS && retryAfter !== null) {
      res.setHeader("Retry-After", String(retryAfter));
    }

    res.status(status).json({ error: payload });
  }

  private fromHttpException(body: unknown, status: HttpStatus): ApiError {
    if (typeof body === "string") {
      return { code: ErrorCode.INTERNAL_ERROR, message: body };
    }
    const obj = (body ?? {}) as Record<string, unknown>;

    // class-validator / express default validation errors
    if (Array.isArray(obj.message)) {
      const messages = (obj.message as Array<{ message?: string; property?: string }>).map(
        (m) => (typeof m === "object" && m?.message) || "Invalid input",
      );
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: messages[0] ?? "Invalid input",
        details: messages,
      };
    }

    const message =
      typeof obj.message === "string"
        ? obj.message
        : typeof obj.message === "object"
          ? "Invalid input"
          : HttpStatus[status] ?? "Error";

    return {
      code: ErrorCode.INTERNAL_ERROR,
      message,
    };
  }
}

function retryAfterSecondsOf(details: unknown): number | null {
  if (!details || typeof details !== "object") return null;
  const n = (details as { retryAfterSeconds?: unknown }).retryAfterSeconds;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return Math.ceil(n);
}

function isMulterTooLarge(exception: unknown): boolean {
  return (
    typeof exception === "object" &&
    exception !== null &&
    "code" in exception &&
    (exception as { code?: string }).code === "LIMIT_FILE_SIZE"
  );
}
