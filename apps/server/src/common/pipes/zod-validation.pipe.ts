import {
  ArgumentMetadata,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";
import { ZodError, type ZodSchema } from "zod";
import { AppError } from "../errors/app-error.js";
import { ErrorCode } from "@ordo/shared";

/**
 * Validates incoming payloads against a zod schema (shared from @ordo/shared).
 * On failure, throws a VALIDATION_ERROR with a flattened, human-readable list.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }));
        const message =
          details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message))[0] ??
          "Invalid input";
        throw new AppError(ErrorCode.VALIDATION_ERROR, message, details);
      }
      throw err;
    }
  }
}
