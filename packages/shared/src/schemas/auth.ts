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
const username = z
  .string()
  .trim()
  .min(2, { message: "Username must be at least 2 characters" })
  .max(32, { message: "Username must be 32 characters or fewer" })
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Use only letters, numbers, underscores and hyphens",
  });

export const RegisterSchema = z.object({
  username,
  email,
  password,
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

const loginIdentifier = z.string().trim().min(1, { message: "Enter your email or username" }).max(254);
export const LoginSchema = z
  .union([
    z.object({ identifier: loginIdentifier, password }),
    // Keep accepting the original payload while installed clients update.
    z.object({ email, password }),
  ])
  .transform((input) => ({
    identifier: "identifier" in input ? input.identifier : input.email,
    password: input.password,
  }));
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshInput = z.infer<typeof RefreshSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

export const ChangeUsernameSchema = z.object({
  newUsername: username,
});
export type ChangeUsernameInput = z.infer<typeof ChangeUsernameSchema>;

export const ChangeEmailSchema = z.object({
  currentPassword: password,
  newEmail: email,
});
export type ChangeEmailInput = z.infer<typeof ChangeEmailSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: password,
  newPassword: password,
})
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const DELETE_ACCOUNT_CONFIRMATION = "DELETE MY ACCOUNT";
export const DeleteAccountSchema = z.object({
  currentPassword: password,
  confirmation: z.string().refine((value) => value === DELETE_ACCOUNT_CONFIRMATION, {
    message: `Type ${DELETE_ACCOUNT_CONFIRMATION} exactly`,
  }),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;

export const VerifyEmailChangeSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailChangeInput = z.infer<typeof VerifyEmailChangeSchema>;
