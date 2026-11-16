import { Prisma, prisma } from '@syntaxia/db';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt';
import { comparePassword, hashPassword } from './password';

const REFRESH_TOKEN_EXPIRES_DAYS = 7;

export interface RefreshTokenResult {
  refreshToken: string;
  expiresAt: Date;
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
): Promise<{ userId: string; tokenId: string } | null> {
  const decoded = verifyRefreshToken(refreshToken);

  const storedTokens = await prisma.refreshToken.findMany({
    where: {
      userId: decoded.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  for (const stored of storedTokens) {
    const isValid = await comparePassword(refreshToken, stored.tokenHash);
    if (isValid) {
      return { userId: decoded.userId, tokenId: decoded.tokenId };
    }
  }

  return null;
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await prisma.refreshToken
    .update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    })
    .catch(() => {
      // Token might not exist or already revoked
    });
}

export async function revokeAllUserRefreshTokens(
  userId: string
): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function rotateRefreshToken(oldRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
} | null> {
  const validated = await validateRefreshToken(oldRefreshToken);

  if (!validated) {
    return null;
  }

  // Revoke the old token
  const oldTokenHash = await hashPassword(oldRefreshToken);
  await revokeRefreshToken(oldTokenHash);

  // Create new tokens
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

export async function detectReusedRefreshToken(
  refreshToken: string
): Promise<boolean> {
  const decoded = verifyRefreshToken(refreshToken);
  const tokenHash = await hashPassword(refreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { revokedAt: true },
  });

  // If the token exists and is revoked, it was already used (reused)
  return stored !== null && stored.revokedAt !== null;
}
