import bcrypt from "bcryptjs";
import {
  DELETE_ACCOUNT_CONFIRMATION,
  DeleteAccountSchema,
  ErrorCode,
} from "@ordo/shared";
import { AuthService } from "./auth.service.js";

describe("AuthService account deletion", () => {
  const createService = (passwordHash: string) => {
    const findUnique = jest.fn().mockResolvedValue({
      id: "user-1",
      passwordHash,
    });
    const deleteUser = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { user: { findUnique, deleteMany: deleteUser } };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, deleteUser };
  };

  it("requires the exact confirmation phrase", () => {
    expect(DeleteAccountSchema.safeParse({
      currentPassword: "password123",
      confirmation: DELETE_ACCOUNT_CONFIRMATION,
    }).success).toBe(true);
    expect(DeleteAccountSchema.safeParse({
      currentPassword: "password123",
      confirmation: "delete my account",
    }).success).toBe(false);
  });

  it("rejects an incorrect password without deleting the user", async () => {
    const passwordHash = await bcrypt.hash("password123", 4);
    const { service, deleteUser } = createService(passwordHash);

    await expect(service.deleteAccount("user-1", "incorrect123")).rejects.toMatchObject({
      code: ErrorCode.INVALID_CREDENTIALS,
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes the user after verifying the password", async () => {
    const passwordHash = await bcrypt.hash("password123", 4);
    const { service, deleteUser } = createService(passwordHash);

    await service.deleteAccount("user-1", "password123");

    expect(deleteUser).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });
});
