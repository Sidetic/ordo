import { Injectable } from "@nestjs/common";
import { TOKEN_TTL } from "@ordo/shared";
import { generateToken, hashToken } from "../common/utils/tokens.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessHash: string;
  refreshHash: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  /** Access-token lifetime in seconds (for clients to schedule refresh). */
  expiresIn: number;
}

/** Creates opaque random-byte token pairs and hashes for storage. */
@Injectable()
export class TokenService {
  generatePair(): TokenPair {
    const accessToken = generateToken(32);
    const refreshToken = generateToken(48);
    const now = Date.now();
    const accessTokenExpiresAt = new Date(now + TOKEN_TTL.ACCESS_MS);
    const refreshTokenExpiresAt = new Date(now + TOKEN_TTL.REFRESH_MS);
    return {
      accessToken,
      refreshToken,
      accessHash: hashToken(accessToken),
      refreshHash: hashToken(refreshToken),
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      expiresIn: Math.round(TOKEN_TTL.ACCESS_MS / 1000),
    };
  }

  generateFolderToken(): { token: string; hash: string } {
    const token = generateToken(32);
    return { token, hash: hashToken(token) };
  }

  generateVerificationToken(): string {
    return generateToken(32);
  }

  hash(token: string): string {
    return hashToken(token);
  }
}
