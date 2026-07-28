import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Enter a valid email" })
  .max(254);
const password = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(256);

export const RegisterSchema = z.object({
  email,
  password,
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email,
  password,
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshInput = z.infer<typeof RefreshSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
