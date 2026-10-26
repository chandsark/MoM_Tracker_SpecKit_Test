import type { LoginRequest, RegisterRequest, UserResponse } from '@mom/shared';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { ApiError, apiFetch } from '../api/client';

interface AuthState {
  user: UserResponse | null;
  loading: boolean;
  login(input: LoginRequest): Promise<UserResponse>;
  register(input: RegisterRequest): Promise<UserResponse>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const ME_KEY = ['auth', 'me'];

/** Drop cached data from a previous session, keeping the auth query itself. */
function resetOtherQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
}

async function fetchMe(): Promise<UserResponse | null> {
  try {
    return await apiFetch<UserResponse>('/auth/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: Infinity });

  const login = useCallback(
    async (input: LoginRequest) => {
      const user = await apiFetch<UserResponse>('/auth/login', { method: 'POST', body: input });
      resetOtherQueries(queryClient);
      queryClient.setQueryData(ME_KEY, user);
      return user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (input: RegisterRequest) => {
      const user = await apiFetch<UserResponse>('/auth/register', { method: 'POST', body: input });
      resetOtherQueries(queryClient);
      queryClient.setQueryData(ME_KEY, user);
      return user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await apiFetch<undefined>('/auth/logout', { method: 'POST' });
    resetOtherQueries(queryClient);
    queryClient.setQueryData(ME_KEY, null);
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({ user: me.data ?? null, loading: me.isPending, login, register, logout }),
    [me.data, me.isPending, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Only same-site relative paths are allowed as a post-login redirect target. */
export function safeRedirect(target: string | null): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return '/';
  }
  return target;
}
