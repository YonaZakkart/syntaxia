'use client';

import { type AuthUser, decodeAccessToken } from '@/lib/auth-token';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type AuthStatus = 'loading' | 'authenticated' | 'guest';

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name?: string;
  email: string;
  password: string;
};

type AuthResponse = {
  success: boolean;
  data?: {
    accessToken: string;
    user?: AuthUser;
  };
  error?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  authFetch: (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_CACHE_KEY = 'syntaxia.auth.user';

function readCachedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed.id || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return;

  try {
    if (user) {
      window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // Storage can be unavailable in private mode; the in-memory state is enough.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const tokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  const applySession = useCallback(
    (accessToken: string, nextUser?: AuthUser) => {
      tokenRef.current = accessToken;

      const decoded = decodeAccessToken(accessToken);
      const cached = nextUser ?? readCachedUser();

      const resolved: AuthUser | null = decoded
        ? {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            name:
              cached && cached.email === decoded.email
                ? cached.name
                : undefined,
          }
        : (nextUser ?? null);

      if (nextUser) writeCachedUser(nextUser);

      setUser(resolved);
      setStatus(resolved ? 'authenticated' : 'guest');
    },
    []
  );

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    writeCachedUser(null);
    setUser(null);
    setStatus('guest');
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const promise = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          clearSession();
          return false;
        }

        const body = (await response.json()) as AuthResponse;
        const accessToken = body.data?.accessToken;

        if (!body.success || !accessToken) {
          clearSession();
          return false;
        }

        applySession(accessToken);
        return true;
      } catch {
        clearSession();
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, [applySession, clearSession]);

  useEffect(() => {
    const cached = readCachedUser();
    if (cached) setUser(cached);
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const body = (await response
        .json()
        .catch(() => null)) as AuthResponse | null;

      if (!response.ok || !body?.success || !body.data?.accessToken) {
        throw new Error(body?.error ?? 'Unable to sign in');
      }

      applySession(body.data.accessToken, body.data.user);
    },
    [applySession]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const body = (await response
        .json()
        .catch(() => null)) as AuthResponse | null;

      if (!response.ok || !body?.success || !body.data?.accessToken) {
        throw new Error(body?.error ?? 'Unable to create the account');
      }

      applySession(body.data.accessToken, body.data.user);
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      let token = tokenRef.current;

      if (!token) {
        await refresh();
        token = tokenRef.current;
      }

      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } finally {
      clearSession();
    }
  }, [clearSession, refresh]);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = (token: string | null) => {
        const headers = new Headers(init?.headers);
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return fetch(input, { ...init, credentials: 'include', headers });
      };

      let response = await request(tokenRef.current);

      if (response.status === 401) {
        const body = (await response
          .clone()
          .json()
          .catch(() => null)) as { code?: string } | null;

        if (body?.code === 'TOKEN_EXPIRED') {
          const refreshed = await refresh();
          if (refreshed) response = await request(tokenRef.current);
        }
      }

      return response;
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      register,
      logout,
      refresh,
      authFetch,
    }),
    [user, status, login, register, logout, refresh, authFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
