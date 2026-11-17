import { prisma } from '@syntaxia/db';
import {
  type RefreshTokenPayload,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './jwt';
import { comparePassword, hashPassword } from './password';

const REFRESH_TOKEN_EXPIRES_DAYS = 7;

export interface RefreshTokenResult {
  refreshToken: string;
  expiresAt: Date;
}

export interface ValidatedRefreshToken {
  userId: string;
  tokenId: string;
  /** Primary key of the RefreshToken row, used to revoke deterministically. */
  recordId: string;
}

export async function createRefreshToken(
  userId: string
): Promise<RefreshTokenResult> {
  const tokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken(
    { userId, email: '', role: '' },
    tokenId
  );

  const tokenHash = await hashPassword(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  return { refreshToken, expiresAt };
}

export async function validateRefreshToken(
  refreshToken: string
): Promise<ValidatedRefreshToken | null> {
  let decoded: RefreshTokenPayload;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return null;
  }

  const storedTokens = await prisma.refreshToken.findMany({
    where: {
      userId: decoded.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  // bcrypt hashes are salted, so the token cannot be looked up by hash.
  // Compare against the user's active tokens instead.
  for (const stored of storedTokens) {
    const isValid = await comparePassword(refreshToken, stored.tokenHash);
    if (isValid) {
      return {
        userId: decoded.userId,
        tokenId: decoded.tokenId,
        recordId: stored.id,
      };
    }
  }

  return null;
}

/**
 * Rotate a refresh token: revoke the stored row and issue a new pair.
 *
 * Revocation is keyed by the row id because bcrypt hashes are salted and a
 * freshly computed hash would never match the stored one.
 */
export async function rotateRefreshToken(oldRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
} | null> {
  const validated = await validateRefreshToken(oldRefreshToken);

  if (!validated) {
    return null;
  }

  // Only one concurrent rotation can win.
  const revoked = await prisma.refreshToken.updateMany({
    where: { id: validated.recordId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (revoked.count === 0) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: validated.userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    return null;
  }

  const newRefreshTokenResult = await createRefreshToken(user.id);
  const newAccessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshTokenResult.refreshToken,
    expiresAt: newRefreshTokenResult.expiresAt,
  };
}

/**
 * Detect replay of an already-rotated refresh token.
 *
 * Invalid/expired JWTs are not treated as reuse (the caller returns 401).
 */
export async function detectReusedRefreshToken(
  refreshToken: string
): Promise<boolean> {
  let decoded: RefreshTokenPayload;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return false;
  }

  const storedTokens = await prisma.refreshToken.findMany({
    where: { userId: decoded.userId },
  });

  for (const stored of storedTokens) {
    if (await comparePassword(refreshToken, stored.tokenHash)) {
      return stored.revokedAt !== null;
    }
  }

  return false;
}

export async function revokeAllUserRefreshTokens(
  userId: string
): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Remove expired rows so the table does not grow forever.
 *
 * Revoked-but-unexpired rows are kept so replay of an old token can still be
 * detected. Intended to be called by a scheduled job (see docs/architecture.md).
 */
export async function cleanupRefreshTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return result.count;
}
