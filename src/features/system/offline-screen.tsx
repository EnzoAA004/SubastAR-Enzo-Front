import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button, Card, Screen, StatusPanel } from '@/components/ui/primitives';
import { spacing } from '@/constants/theme';
import { useConnectivity } from '@/providers/connectivity-provider';

export default function OfflineScreen() {
  const router = useRouter();
  const { isRetrying, retryConnection, setOffline } = useConnectivity();
  const [retryFailed, setRetryFailed] = useState(false);

  async function retry() {
    setRetryFailed(false);
    const connected = await retryConnection();
    if (connected) router.replace('/');
    else setRetryFailed(true);
  }

  return (
    <Screen style={styles.screen}>
      <Card style={styles.card}>
        <StatusPanel
          icon="cloud-offline-outline"
          title="Sin conexion a internet"
          message="No pudimos conectarnos con SubastAR. Revisa tu conexion o intenta nuevamente."
          tone="yellow"
        />
        {retryFailed ? <StatusPanel icon="alert-circle-outline" title="Todavia no pudimos reconectar" message="Revisa tu conexion e intenta otra vez." tone="red" /> : null}
        <Button label={isRetrying ? 'Comprobando...' : 'Reintentar conexion'} disabled={isRetrying} onPress={retry} />
        <Button label="Volver al inicio" variant="ghost" onPress={() => {
          setOffline(false);
          router.replace('/');
        }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', paddingTop: spacing.huge },
  card: { gap: spacing.md },
});
