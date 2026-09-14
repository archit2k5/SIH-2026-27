import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AuthAPI, apiErrorMessage, getToken, setToken } from "../lib/api";
import type { User } from "../types";

interface MfaChallenge {
  mfaToken: string;
  demoOtp?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  mfaChallenge: MfaChallenge | null;
  login: (email: string, password: string) => Promise<{ requiresMfa: boolean }>;
  verifyMfa: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  cancelMfa: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    AuthAPI.me()
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await AuthAPI.login(email, password);
    if (res.requiresMfa && res.mfaToken) {
      setMfaChallenge({ mfaToken: res.mfaToken, demoOtp: res.demoOtp });
      return { requiresMfa: true };
    }
    if (res.accessToken && res.user) {
      setToken(res.accessToken);
      setUser(res.user);
    }
    return { requiresMfa: false };
  }, []);

  const verifyMfa = useCallback(
    async (otp: string) => {
      if (!mfaChallenge) throw new Error("No pending MFA challenge.");
      const res = await AuthAPI.verifyMfa(mfaChallenge.mfaToken, otp);
      setToken(res.accessToken);
      setUser(res.user);
      setMfaChallenge(null);
    },
    [mfaChallenge]
  );

  const cancelMfa = useCallback(() => setMfaChallenge(null), []);

  const logout = useCallback(async () => {
    try {
      await AuthAPI.logout();
    } catch {
      // ignore — clear local session regardless
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, mfaChallenge, login, verifyMfa, logout, cancelMfa }),
    [user, loading, mfaChallenge, login, verifyMfa, logout, cancelMfa]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { apiErrorMessage };
