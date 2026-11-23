export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
};

type AccessTokenPayload = {
  userId: string;
  email: string;
  role: string;
};

/**
 * Read the signed access token payload for UI state.
 *
 * Authorization decisions still happen on the API; this only avoids a
 * round-trip when restoring the session after a page reload.
 */
export function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const parsed = JSON.parse(atob(padded)) as Partial<AccessTokenPayload>;

    if (!parsed.userId || !parsed.email || !parsed.role) return null;

    return {
      userId: parsed.userId,
      email: parsed.email,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}
