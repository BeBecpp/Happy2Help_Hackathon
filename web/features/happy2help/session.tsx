"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "./types";

export interface PersonaOption {
  key: string;
  kind: "staff" | "student";
  label: string;
  subtitle: string;
  school: string;
}

export interface SessionState {
  loading: boolean;
  mode: "gateway" | "dev-direct";
  session: Session | null;
  personas: PersonaOption[];
  error: string | null;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<SessionState, "refresh" | "signOut">>({
    loading: true,
    mode: "dev-direct",
    session: null,
    personas: [],
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
      const json = (await res.json()) as { mode: "gateway" | "dev-direct"; session: Session | null; personas: PersonaOption[]; error?: string };
      setState({ loading: false, mode: json.mode, session: json.session, personas: json.personas ?? [], error: json.error ?? null });
    } catch {
      setState((s) => ({ ...s, loading: false, session: null, error: "TEMPORARY_FAILURE" }));
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setState((s) => ({ ...s, session: null }));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ ...state, refresh, signOut }), [state, refresh, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
