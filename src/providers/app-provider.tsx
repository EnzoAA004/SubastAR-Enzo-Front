import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname, useRouter } from 'expo-router';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { ConnectivityProvider } from '@/providers/connectivity-provider';
import type { RegistrationDraft, Session } from '@/types/domain';
import { setUnauthorizedHandler } from '@/services/http';
import { readSession, storeSession } from '@/services/session-storage';
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

type SessionValue = {
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  registration: RegistrationDraft | null;
  setRegistration: (draft: RegistrationDraft | null) => void;
  signIn: (session: Session) => Promise<void>;
  enterAsGuest: () => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setGuest] = useState(false);
  const [registration, setRegistration] = useState<RegistrationDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readSession()
      .then((stored) => stored && setSession(stored))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      setSession(null);
      setGuest(false);
      await storeSession(null);
      queryClient.clear();
      router.replace('/');
    });
    return () => setUnauthorizedHandler(undefined);
  }, [pathname, router]);

  const value = useMemo<SessionValue>(() => ({
    session,
    isGuest,
    registration,
    setRegistration,
    loading,
    async signIn(nextSession) {
      setSession(nextSession);
      setGuest(false);
      await storeSession(nextSession);
    },
    enterAsGuest() {
      setGuest(true);
    },
    async signOut() {
      setSession(null);
      setGuest(false);
      await storeSession(null);
      queryClient.clear();
    },
  }), [isGuest, loading, registration, session]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectivityProvider>
        <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
      </ConnectivityProvider>
    </QueryClientProvider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within AppProvider');
  return context;
}
