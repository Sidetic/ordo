import { SetMetadata } from "@nestjs/common";

export const ALLOW_WITHOUT_MFA_KEY = "ordo:allowWithoutMfa";

/** Session is enough; TOTP enrollment is not required even when MFA_REQUIRED. */
export const AllowWithoutMfa = () => SetMetadata(ALLOW_WITHOUT_MFA_KEY, true);
