import { useQueryClient } from '@tanstack/react-query';
import { type Href, usePathname, useRouter } from 'expo-router';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { connectivityService } from '@/services/connectivity';
import { setNetworkErrorHandler } from '@/services/http';

type ConnectivityValue = {
  isOffline: boolean;
  isRetrying: boolean;
  retryConnection: () => Promise<boolean>;
  setOffline: (offline: boolean) => void;
};

const ConnectivityContext = createContext<ConnectivityValue | undefined>(undefined);

export function ConnectivityProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOffline, setOffline] = useState(false);
  const [isRetrying, setRetrying] = useState(false);

  useEffect(() => {
    setNetworkErrorHandler(() => setOffline(true));
    return () => setNetworkErrorHandler(undefined);
  }, []);

  useEffect(() => {
    if (isOffline && pathname !== '/offline') router.replace('/offline' as Href);
  }, [isOffline, pathname, router]);

  const value = useMemo<ConnectivityValue>(() => ({
    isOffline,
    isRetrying,
    setOffline,
    async retryConnection() {
      setRetrying(true);
      try {
        const connected = await connectivityService.ping();
        setOffline(!connected);
        if (connected) await queryClient.invalidateQueries();
        return connected;
      } catch {
        setOffline(true);
        return false;
      } finally {
        setRetrying(false);
      }
    },
  }), [isOffline, isRetrying, queryClient]);

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext);
  if (!context) throw new Error('useConnectivity must be used within ConnectivityProvider');
  return context;
}
