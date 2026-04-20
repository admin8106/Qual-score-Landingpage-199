import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { adminAuthApi, type AdminProfileResponse } from '../api/services/adminAuth';
import { getPermissions, type AdminPermissionSet } from './AdminPermissions';

const SESSION_KEY = 'qs_admin_token';

interface AdminAuthState {
  token: string | null;
  profile: AdminProfileResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: AdminPermissionSet;
}

interface AdminAuthActions {
  login: (token: string, profile: AdminProfileResponse) => void;
  logout: () => void;
}

type AdminAuthContextValue = AdminAuthState & AdminAuthActions;

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(SESSION_KEY)
  );
  const [profile, setProfile] = useState<AdminProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setToken(null);
    setProfile(null);
  }, []);

  const login = useCallback((newToken: string, newProfile: AdminProfileResponse) => {
    sessionStorage.setItem(SESSION_KEY, newToken);
    setToken(newToken);
    setProfile(newProfile);
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      logout();
      setIsLoading(false);
    }, 10_000);

    adminAuthApi.me(token).then((result) => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      if (result.ok) {
        setProfile(result.data);
      } else {
        logout();
      }
      setIsLoading(false);
    }).catch(() => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      logout();
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [token, logout]);

  const permissions = useMemo(
    () => getPermissions(profile?.role ?? 'VIEWER'),
    [profile?.role]
  );

  return (
    <AdminAuthContext.Provider
      value={{
        token,
        profile,
        isAuthenticated: !!token && !!profile,
        isLoading,
        permissions,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
