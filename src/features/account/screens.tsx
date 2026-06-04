import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PaymentMethodCard, PurchaseCard, formatCurrency } from '@/components/domain/cards';
import { ActionRow, Badge, Body, Button, Card, ConfirmationModal, Divider, EmptyState, ErrorState, Header, IconButton, InfoTile, Input, LoadingState, Screen, SectionHeader, SecurityNote, SelectInput, StatusState, Title, UploadBox } from '@/components/ui/primitives';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useSession } from '@/providers/app-provider';
import { assetService, authService, chatService, insuranceService, paymentService, profileService, purchaseService } from '@/services/api';
import { errorToUserMessage } from '@/services/errors';
import { explainFileAccess, permissionDeniedMessage, requestMediaLibraryPermission } from '@/services/permissions';
import type { Country, FileUpload, PaymentMethodKind } from '@/types/domain';

function FilterTabs<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (next: T) => void }) {
  return (
    <View style={styles.filters}>
      {options.map((option) => (
        <Pressable key={option} style={[styles.filter, value === option && styles.filterActive]} onPress={() => onChange(option)}>
          <Text style={[styles.filterText, value === option && styles.filterTextActive]}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function CountryPickerModal({
  visible,
  countries,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  countries: Country[];
  value?: string;
  onClose: () => void;
  onSelect: (country: Country) => void;
}) {
  if (!visible) return null;
  return (
    <View style={styles.overlaySoft}>
      <Card style={styles.countryModal}>
        <View style={styles.countryModalHeader}>
          <View style={styles.countryModalTitleCopy}>
            <Title>Seleccioná tu país</Title>
            <Body muted>Elegí un país de origen desde la lista disponible.</Body>
          </View>
          <IconButton icon="close-outline" accessibilityLabel="Cerrar selector de países" onPress={onClose} />
        </View>
        <ScrollView style={styles.countryList} contentContainerStyle={styles.countryListContent} showsVerticalScrollIndicator={false}>
          {countries.map((country) => {
            const active = value === country.name;
            return (
              <Pressable key={country.id} onPress={() => onSelect(country)} style={[styles.countryRow, active && styles.countryRowActive]}>
                <View style={styles.countryRowCopy}>
                  <Text style={styles.countryRowTitle}>{country.name}</Text>
                  <Body muted>{country.capital ?? 'Capital no informada'}</Body>
                  <Body muted>{country.languages ?? 'Idioma no informado'}</Body>
                </View>
                <View style={styles.countryRowMeta}>
                  <Badge label={country.code} tone={active ? 'purple' : 'dark'} />
                  {active ? <Ionicons name="checkmark-circle" size={20} color={colors.success} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <Button label="Cerrar" variant="ghost" onPress={onClose} />
      </Card>
    </View>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Body muted>{label}</Body>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>{value}</Text>
    </View>
  );
}

function StatusCard({ icon, title, message, tone = 'purple' }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; tone?: 'purple' | 'green' | 'red' | 'yellow' }) {
  return <StatusState icon={icon} title={title} message={message} tone={tone} />;
}

function openExternalUrl(url?: string) {
  if (!url) return;
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url);
}

function AssetField({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.fieldCard}>
      <Body muted>{label}</Body>
      <Text style={styles.fieldValue}>{value || 'No asignado'}</Text>
    </View>
  );
}

function formatAmountWithCurrency(amount: number, currency?: string | null) {
  return `${currency ?? 'ARS'} ${amount.toLocaleString('es-AR')}`;
}

function LoadingOverlay({ visible }: { visible: boolean }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.loadingOverlay}>
        <Card style={styles.loadingOverlayCard}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Title>Actualizando el bien</Title>
          <Body muted>Guardamos tus cambios y refrescamos la información.</Body>
        </Card>
      </View>
    </Modal>
  );
}

function GuestNotice() {
  const router = useRouter();
  return (
    <Card style={styles.notice}>
      <Ionicons name="lock-closed-outline" size={28} color={colors.primary} />
      <Title>Área personal</Title>
      <Body muted>Iniciá sesión para acceder a esta sección.</Body>
      <Button label="Iniciar sesión" onPress={() => router.push('/login')} />
    </Card>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const { data: profile, isLoading, isError, refetch } = useQuery({ queryKey: ['profile'], queryFn: profileService.me, enabled: !!session });
  const { data: accountState } = useQuery({ queryKey: ['account-state'], queryFn: profileService.accountState, enabled: !!session });
  if (!session) return <Screen><Header title="Perfil" /><GuestNotice /></Screen>;
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !profile) return <Screen><Header title="Perfil" /><ErrorState onRetry={() => refetch()} /></Screen>;
  return (
    <Screen>
      <Header title="Perfil" right={<IconButton icon="create-outline" accessibilityLabel="Editar perfil" tone="primary" onPress={() => router.push('/profile/edit')} />} />
      <Card style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{profile.name[0]}</Text></View>
        <Title>{profile.name}</Title>
        <Body muted>{profile.email}</Body>
        <Badge label={`Categoría ${profile.category}`} />
        <View style={styles.tileRow}>
          <InfoTile icon="person-outline" label="Estado" value={accountState?.status ?? profile.status} tone={accountState?.status === 'Regular' ? 'green' : accountState?.status === 'Bloqueado' ? 'red' : 'yellow'} />
          <InfoTile icon="shield-checkmark-outline" label="Categoría" value={profile.category} />
        </View>
        <SecurityNote text="Usamos tus datos para validar pujas, pagos y accesos de forma segura." />
      </Card>
      {accountState?.status === 'Multado' ? (
        <StatusCard icon="warning-outline" title="Multa pendiente de pago" message={accountState.message ?? 'Regularizá tu cuenta para volver a participar en subastas.'} tone="red" />
      ) : null}
      <Card style={styles.menuBlock}>
        <SectionHeader title="Cuenta" subtitle="Accedé a tu información y actividad" />
        <MenuItem icon="person-outline" label="Datos personales" onPress={() => router.push('/profile/edit')} />
        <Divider />
        <MenuItem icon="time-outline" label="Historial" onPress={() => router.push('/profile/history' as Href)} />
        <Divider />
        <MenuItem icon="stats-chart-outline" label="Métricas" onPress={() => router.push('/profile/metrics')} />
        <Divider />
        <MenuItem icon="cube-outline" label="Mis bienes" onPress={() => router.push('/profile/assets')} />
        <Divider />
        <MenuItem icon="bag-check-outline" label="Mis compras" onPress={() => router.push('/purchases')} />
      </Card>
      <Card style={styles.menuBlock}>
        <SectionHeader title="Estado operativo y legal" subtitle="Validaciones para pujas y pagos" />
        <MenuItem icon="card-outline" label="Medios de pago" onPress={() => router.push('/profile/payments')} />
        <Divider />
        <MenuItem icon="warning-outline" label="Multas" onPress={() => router.push('/profile/account-status')} />
      </Card>
      <Card style={styles.menuBlock}>
        <SectionHeader title="Gestión financiera" subtitle="Coberturas y respaldo de tus compras" />
        <MenuItem icon="shield-checkmark-outline" label="Seguros y Pólizas" onPress={() => router.push('/profile/policies' as Href)} />
      </Card>
      <Button label="Cerrar sesión" variant="ghost" onPress={async () => {
        try { await authService.logout(); } finally { await signOut(); router.replace('/welcome'); }
      }} />
    </Screen>
  );
}

function MenuItem({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void }) {
  return <ActionRow icon={icon} label={label} onPress={onPress} />;
}

export function MetricsScreen() {
  const back = useSafeBack();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['metrics'], queryFn: profileService.metrics });
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Métricas" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  return (
    <Screen>
      <Header title="Métricas" onBack={back} />
      <View style={styles.metricGrid}>
        <InfoTile icon="hammer-outline" label="Participadas" value={String(data.participated)} />
        <InfoTile icon="trophy-outline" label="Ganadas" value={String(data.won)} tone="green" />
        <InfoTile icon="stats-chart-outline" label="Tasa de éxito" value={`${Math.round(data.successRate * 100)}%`} />
        <InfoTile icon="cash-outline" label="Total pagado" value={formatCurrency(data.totalPaid)} />
      </View>
      <Card>
        <Title>Ganadas por mes</Title>
        <View style={styles.bars}>
          {data.winsByMonth.map((month) => <View key={month.month} style={[styles.bar, { height: Math.max(10, month.count * 22) }]} />)}
        </View>
        <Body muted>{data.winsByMonth.map((month) => month.month).join('   ') || 'Sin subastas ganadas registradas'}</Body>
      </Card>
    </Screen>
  );
}

export function ParticipationHistoryScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const [filter, setFilter] = useState<'Todas' | 'Ganadas' | 'Perdidas'>('Todas');
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['purchases', 'participation-history'], queryFn: purchaseService.list });
  const visiblePurchases = filter === 'Perdidas' ? [] : data ?? [];
  return (
    <Screen>
      <Header title="Historial de participaciones" onBack={back} />
      <FilterTabs options={['Todas', 'Ganadas', 'Perdidas'] as const} value={filter} onChange={setFilter} />
      {filter === 'Todas' ? <Card style={styles.policy}>
        <Body muted>Por ahora se muestran participaciones ganadas asociadas a tus compras. Las demás estarán disponibles cuando el servidor informe el historial completo.</Body>
      </Card> : filter === 'Perdidas' ? <Card style={styles.policy}>
        <Body muted>Las participaciones no ganadas estarán disponibles cuando el servidor informe su historial.</Body>
      </Card> : null}
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : visiblePurchases.length ? visiblePurchases.map((purchase) => (
        <Card key={purchase.id} style={styles.itemCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderCopy}>
              <Text style={styles.cardTitle}>{purchase.lot.title}</Text>
              <Body muted>{purchase.auctionName ?? 'Subasta'}</Body>
            </View>
            <Badge label="Ganada" tone="green" />
          </View>
          <SummaryRow label="Monto final" value={formatCurrency(purchase.amount)} bold />
          {purchase.date ? <SummaryRow label="Fecha" value={purchase.date} /> : null}
          <Button label="Ver compra" variant="secondary" onPress={() => router.push(`/purchases/${purchase.id}`)} />
        </Card>
      )) : <EmptyState title="Todavía no hay participaciones registradas" message="Cuando participes en subastas, verás tu historial acá." />}
    </Screen>
  );
}

export function AccountStatusScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['account-state'], queryFn: profileService.accountState });
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Estado de cuenta" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  const regular = data.status === 'Regular';
  const blocked = data.status === 'Bloqueado';
  const title = regular ? 'Estado de cuenta regular' : blocked ? 'Cuenta bloqueada' : 'Cuenta multada';
  const description = regular
    ? 'No posees multas pendientes. Podés participar normalmente en subastas.'
    : blocked
      ? 'No podés operar mientras la cuenta permanezca bloqueada.'
      : 'Tenés multas pendientes. Debés regularizarlas antes de participar en otra subasta.';
  return (
    <Screen>
      <Header title="Estado de cuenta" onBack={back} />
      <StatusCard icon={regular ? 'checkmark-circle-outline' : blocked ? 'lock-closed-outline' : 'alert-circle-outline'} title={title} message={data.message ? `${description} ${data.message}` : description} tone={regular ? 'green' : 'red'} />
      {data.penalty > 0 ? <Card style={styles.penaltyCard}><Body muted>Importe pendiente</Body><Text style={styles.penalty}>{formatCurrency(data.penalty)}</Text></Card> : null}
      {!regular ? <Button label="Ver compras pendientes" onPress={() => router.push('/purchases')} /> : null}
    </Screen>
  );
}

export function PaymentsScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const queryClient = useQueryClient();
  const [selectedForRemoval, setSelectedForRemoval] = useState<string>();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['payments'], queryFn: paymentService.list });
  const remove = useMutation({
    mutationFn: paymentService.remove,
    onSuccess: () => {
      setSelectedForRemoval(undefined);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
  return (
    <Screen>
      <Header title="Medios de pago" onBack={back} />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : data?.length ? data.map((payment) => (
        <Card key={payment.id} style={styles.itemCard}>
          <PaymentMethodCard payment={payment} selected={payment.verified} />
          <Divider />
          <View style={styles.cardActionsRow}>
            <Button label="Eliminar" variant="ghost" onPress={() => setSelectedForRemoval(payment.id)} />
          </View>
        </Card>
      )) : <EmptyState title="Sin medios de pago" message="Agregá uno para participar de una puja." />}
      <SectionHeader title="Agregar medio" subtitle="Elegí el tipo de validación que necesites" />
      <ActionRow icon="card-outline" label="Tarjeta de crédito" description="Alta rápida para pagos y pujas." onPress={() => router.push({ pathname: '/profile/payments/add', params: { type: 'tarjeta_credito' } })} />
      <ActionRow icon="business-outline" label="Cuenta bancaria" description="Reservá fondos para operar." onPress={() => router.push({ pathname: '/profile/payments/add', params: { type: 'cuenta_bancaria' } })} />
      <ActionRow icon="wallet-outline" label="Cheque certificado" description="Requiere documentación para revisión." onPress={() => router.push({ pathname: '/profile/payments/add', params: { type: 'cheque_certificado' } })} />
      <ConfirmationModal
        visible={!!selectedForRemoval}
        title="Eliminar medio de pago"
        message="Este medio dejará de estar disponible para futuras pujas y pagos pendientes."
        confirmLabel="Eliminar"
        pending={remove.isPending}
        onClose={() => setSelectedForRemoval(undefined)}
        onConfirm={() => selectedForRemoval && remove.mutate(selectedForRemoval)}
      />
    </Screen>
  );
}

export function AssetsScreen() {
  const router = useRouter();
  const back = () => router.replace('/(tabs)');
  const [status, setStatus] = useState('Todos');
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['assets', status], queryFn: () => assetService.list(status) });
  return (
    <Screen>
      <Header title="Mis bienes" onBack={back} />
      <SectionHeader title="Estado de solicitud" subtitle="Filtrá tus bienes por su revisión actual" />
      <FilterTabs options={['Todos', 'Pendiente', 'Aceptado', 'Rechazado'] as const} value={status} onChange={setStatus} />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : data?.length ? data.map((asset) => (
        <Card key={asset.id} style={styles.itemCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderCopy}>
              <Text style={styles.cardTitle}>{asset.title}</Text>
              <Body muted>{asset.category}</Body>
            </View>
            <Badge label={asset.status} tone={asset.status === 'Aceptado' ? 'green' : asset.status === 'Rechazado' ? 'red' : 'yellow'} />
          </View>
          <Body muted>{asset.detail}</Body>
          <Button label="Ver detalle" variant="secondary" onPress={() => router.push({ pathname: '/profile/assets/[id]', params: { id: asset.id } })} />
        </Card>
      )) : <EmptyState title="Sin bienes en este estado" message="Tus solicitudes aparecerán acá al ser registradas." />}
      <Button label="Subir un producto" onPress={() => router.push('/sell')} />
    </Screen>
  );
}

export function PurchasesScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['purchases'], queryFn: purchaseService.list });
  const sections = data ? [
    { label: 'Pendientes', items: data.filter((purchase) => purchase.paymentStatus.toLowerCase() !== 'pagado') },
    { label: 'En proceso de entrega', items: data.filter((purchase) => purchase.paymentStatus.toLowerCase() === 'pagado' && !['entregado', 'listo_para_retirar'].includes(purchase.deliveryStatus.toLowerCase())) },
    { label: 'Entregadas o listas para retiro', items: data.filter((purchase) => ['entregado', 'listo_para_retirar'].includes(purchase.deliveryStatus.toLowerCase())) },
  ] : [];
  return (
    <Screen>
      <Header title="Mis compras" onBack={back} />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : data?.length ? sections.map((section) => section.items.length ? (
        <View key={section.label} style={styles.purchaseSection}>
          <SectionHeader title={section.label} subtitle="Agrupadas por estado de pago y entrega" />
          {section.items.map((purchase) => (
            <PurchaseCard key={purchase.id} purchase={purchase} onPress={() => router.push(`/purchases/${purchase.id}`)} />
          ))}
        </View>
      ) : null) : <EmptyState title="Todavía no hay compras" message="Los lotes ganados aparecerán acá." />}
    </Screen>
  );
}

export function PoliciesScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['purchases', 'policies'], queryFn: purchaseService.list });
  const insuredPurchases = (data ?? []).filter((purchase) => !!purchase.insuranceId)
    .filter((purchase, index, purchases) => purchases.findIndex((item) => item.insuranceId === purchase.insuranceId) === index);
  return (
    <Screen>
      <Header title="Seguros y Pólizas" onBack={back} />
      <StatusCard icon="shield-checkmark-outline" title="Cobertura de bienes" message="Tus pólizas asociadas a compras aparecerán acá cuando el servidor informe el vínculo." tone="green" />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : insuredPurchases.length ? insuredPurchases.map((purchase) => (
        <Card key={purchase.insuranceId} style={styles.itemCard}>
          <Badge label="Póliza activa" tone="green" />
          <Title>{purchase.insuranceNumber ?? purchase.insuranceId}</Title>
          <Body muted>{purchase.lot.title}</Body>
          <Body muted>{purchase.auctionName ?? 'Compra asegurada'}</Body>
          <Button label="Ver póliza de seguro" onPress={() => router.push(`/policy/${purchase.insuranceId}`)} />
        </Card>
      )) : <EmptyState title="Sin pólizas asociadas" message="Tus pólizas asociadas a compras y bienes aparecerán acá." />}
    </Screen>
  );
}

export function PurchaseDetailScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['purchase', id], queryFn: () => purchaseService.get(id ?? '') });
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Detalle de compra" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  return (
    <Screen>
      <Header title="Detalle de compra" onBack={back} />
      <Card style={styles.itemCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderCopy}>
            <Title>{data.lot.title}</Title>
            <Body muted>{data.auctionName}</Body>
          </View>
          <Badge label={data.paymentStatus} tone={data.paymentStatus.toLowerCase() === 'pagado' ? 'green' : 'yellow'} />
        </View>
        <View style={styles.tileRow}>
          <InfoTile icon="card-outline" label="Pago" value={data.paymentStatus} tone={data.paymentStatus.toLowerCase() === 'pagado' ? 'green' : 'yellow'} />
          <InfoTile icon="cube-outline" label="Entrega" value={data.deliveryStatus} />
        </View>
        <Divider />
        <SummaryRow label="Valor pujado" value={formatCurrency(data.amount)} />
        <SummaryRow label="Cargos y comisión" value={formatCurrency(data.fee)} />
        {data.shippingCost != null ? <SummaryRow label="Envío" value={formatCurrency(data.shippingCost)} /> : null}
        <SummaryRow label="Total" value={formatCurrency(data.total ?? data.amount + data.fee)} bold />
      </Card>
      <Card style={styles.itemCard}>
        <Badge label={data.deliveryStatus} tone="green" />
        <Title>Coordinación de entrega</Title>
        <Body muted>{data.deliveryAddress ?? 'La dirección de entrega se informará cuando esté coordinada.'}</Body>
        <Button label="Ver seguimiento de entrega" variant="secondary" onPress={() => router.push(`/purchases/${id}/delivery`)} />
        <Button label="Coordinar por Chat" variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.push('/chat/soporte')} />
      </Card>
      {data.paymentStatus.toLowerCase() !== 'pagado' ? <Button label="Regularizar pago" onPress={() => router.push(`/purchases/${id}/payment`)} /> : null}
      <Button label="Ver factura" variant="secondary" icon="document-text-outline" onPress={() => router.push(`/purchases/${id}/invoice`)} />
      {data.insuranceId ? (
        <Card style={styles.policy}>
          <Badge label="Póliza asociada" tone="green" />
          <Body muted>Esta compra tiene una póliza disponible para consultar o ampliar.</Body>
          {data.insuranceNumber ? <SummaryRow label="Número de póliza" value={data.insuranceNumber} /> : null}
          <Button label="Ver póliza de seguro" onPress={() => router.push(`/policy/${data.insuranceId}`)} />
        </Card>
      ) : null}
    </Screen>
  );
}

export function PurchasePaymentScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [paymentId, setPaymentId] = useState('');
  const { data: purchase, isLoading: loadingPurchase, isError: purchaseError } = useQuery({ queryKey: ['purchase', id], queryFn: () => purchaseService.get(id ?? '') });
  const { data: payments, isLoading: loadingPayments, isError: paymentsError } = useQuery({ queryKey: ['payments'], queryFn: paymentService.list });
  const usablePayments = payments?.filter((payment) => payment.verified) ?? [];
  const pay = useMutation({
    mutationFn: () => purchaseService.regularize(id ?? '', paymentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase', id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      router.replace(`/purchases/${id}`);
    },
  });
  if (loadingPurchase || loadingPayments) return <Screen><LoadingState /></Screen>;
  if (purchaseError || paymentsError || !purchase) return <Screen><Header title="Regularizar pago" onBack={back} /><ErrorState /></Screen>;
  return (
    <Screen>
      <Header title="Regularizar pago" onBack={back} />
      <Card style={styles.itemCard}>
        <Title>{purchase.lot.title}</Title>
        <SummaryRow label="Monto a regularizar" value={formatCurrency(purchase.total ?? purchase.amount + purchase.fee)} bold />
        <Body muted>Seleccioná un medio verificado para confirmar el pago pendiente.</Body>
      </Card>
      <SectionHeader title="Medios verificados" subtitle="Usá un medio aprobado para completar el pago" />
      {usablePayments.length ? usablePayments.map((payment) => (
        <Pressable key={payment.id} onPress={() => setPaymentId(payment.id)}>
          <PaymentMethodCard payment={payment} selected={paymentId === payment.id} />
        </Pressable>
      )) : (
        <EmptyState title="Sin medios habilitados" message="Agregá o verificá un medio de pago antes de regularizar la compra." />
      )}
      <Button label={pay.isPending ? 'Confirmando pago...' : 'Confirmar pago'} disabled={!paymentId || pay.isPending} onPress={() => pay.mutate()} />
      {!usablePayments.length ? <Button label="Agregar medio de pago" variant="secondary" onPress={() => router.push('/profile/payments')} /> : null}
      {pay.isError ? <Body muted>{errorToUserMessage(pay.error, 'No fue posible regularizar el pago.')}</Body> : null}
    </Screen>
  );
}

export function DeliveryScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['purchase', id], queryFn: () => purchaseService.get(id ?? '') });
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Entrega" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  const status = data.deliveryStatus.toLowerCase();
  const ready = status === 'listo_para_retirar';
  const moving = status === 'en_camino';
  const delivered = status === 'entregado';
  const title = ready ? 'Listo para retirar' : moving ? 'Envío en camino' : delivered ? 'Entrega completada' : 'Coordinación de entrega';
  const text = ready
    ? data.deliveryAddress ?? 'Acercate al depósito indicado con tu comprobante de compra.'
    : moving
      ? 'Tu lote se encuentra en traslado. Recibirás novedades cuando llegue a destino.'
      : delivered
        ? 'La entrega fue registrada correctamente.'
        : data.deliveryAddress ?? 'Estamos coordinando la dirección y modalidad de entrega.';
  return (
    <Screen>
      <Header title="Entrega" onBack={back} />
      <StatusCard icon={ready ? 'location-outline' : moving ? 'car-outline' : delivered ? 'checkmark-circle-outline' : 'time-outline'} title={title} message={text} tone={delivered || ready ? 'green' : 'purple'} />
      {data.insuranceId ? (
        <Card style={styles.itemCard}>
          <Badge label="Póliza asociada" tone="green" />
          <Body muted>La cobertura asociada al lote acompaña esta entrega.</Body>
          <Button label="Ver póliza" variant="secondary" onPress={() => router.push(`/policy/${data.insuranceId}`)} />
        </Card>
      ) : null}
      <Button label="Coordinar por Chat" variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.push('/chat/soporte')} />
      <Button label="Volver al detalle" onPress={back} />
    </Screen>
  );
}

export function InvoiceScreen() {
  const back = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: content, isLoading: loadingContent, isError: contentError, refetch: refetchContent } = useQuery({
    queryKey: ['invoice-content', id],
    queryFn: () => purchaseService.invoiceContent(id ?? ''),
  });
  const { data: purchase, isLoading: loadingPurchase, isError: purchaseError, refetch: refetchPurchase } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => purchaseService.get(id ?? ''),
  });
  const download = useMutation({ mutationFn: () => purchaseService.downloadInvoice(id ?? '') });
  const [copied, setCopied] = useState(false);
  async function copyContent() {
    if (!content || Platform.OS !== 'web' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
  }
  if (loadingContent || loadingPurchase) return <Screen><LoadingState /></Screen>;
  if (contentError || purchaseError || !content || !purchase) return <Screen><Header title="Factura" onBack={back} /><ErrorState onRetry={() => { refetchContent(); refetchPurchase(); }} /></Screen>;
  return (
    <Screen>
      <Header title="Factura" onBack={back} />
      <Card style={styles.invoiceHero}>
        <View style={styles.invoiceHeroHeader}>
          <View style={styles.invoiceIcon}><Ionicons name="document-text-outline" size={28} color={colors.primary} /></View>
          <Badge label={purchase.paymentStatus} tone={purchase.paymentStatus.toLowerCase() === 'pagado' ? 'green' : 'yellow'} />
        </View>
        <View style={styles.invoiceHeroCopy}>
          <Title>Comprobante de compra</Title>
          <Body muted>Factura emitida por SubastAR</Body>
        </View>
      </Card>
      <View style={styles.invoiceMetaGrid}>
        <InfoTile icon="cube-outline" label="Item" value={purchase.lot.title} />
        <InfoTile icon="cash-outline" label="Total" value={formatCurrency(purchase.total ?? purchase.amount)} />
        <InfoTile icon="card-outline" label="Pago" value={purchase.paymentStatus} tone={purchase.paymentStatus.toLowerCase() === 'pagado' ? 'green' : 'yellow'} />
        <InfoTile icon="car-outline" label="Entrega" value={purchase.deliveryStatus} />
      </View>
      <Card style={styles.itemCard}>
        <SectionHeader title="Exportar comprobante" subtitle="Descargá el archivo .txt o guardalo desde el menú de tu celular" />
        <View style={styles.invoiceActions}>
          <Button label={download.isPending ? 'Descargando...' : 'Descargar TXT'} icon="download-outline" disabled={download.isPending} onPress={() => download.mutate()} />
          {Platform.OS === 'web' && navigator.clipboard ? <Button label={copied ? 'Contenido copiado' : 'Copiar contenido'} variant="secondary" icon="copy-outline" onPress={copyContent} /> : null}
        </View>
        {download.isError ? <Body muted>No fue posible descargar la factura.</Body> : null}
      </Card>
      <Card style={styles.itemCard}>
        <SectionHeader title="Vista previa" subtitle="Contenido completo de la factura" />
        <View style={styles.invoicePaper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.invoiceText}>{content}</Text>
          </ScrollView>
        </View>
      </Card>
    </Screen>
  );
}

export function PolicyScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['policy', id], queryFn: () => insuranceService.get(id ?? '') });
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Póliza de seguro" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  return (
    <Screen>
      <Header title="Póliza de seguro" onBack={back} />
      <StatusCard icon="shield-checkmark-outline" title={data.company} message={`Póliza ${data.number} - Vigente hasta ${data.validUntil ?? 'sin fecha informada'}`} tone="green" />
      <Card style={styles.itemCard}>
        <Title>{data.company}</Title>
        <View style={styles.tileRow}>
          <InfoTile icon="cash-outline" label="Valor asegurado" value={formatCurrency(data.insuredValue)} />
          <InfoTile icon="checkmark-circle-outline" label="Estado" value="Activa" tone="green" />
        </View>
        <Divider />
        <SummaryRow label="Valor asegurado" value={formatCurrency(data.insuredValue)} bold />
        <SummaryRow label="Cobertura" value={data.coverage ?? 'Sin detalle'} />
      </Card>
      <Card style={styles.itemCard}>
        <Text style={styles.cardTitle}>Piezas cubiertas</Text>
        {data.items.length ? data.items.map((item) => <Body key={item} muted>{item}</Body>) : <Body muted>No hay detalle de piezas informado.</Body>}
      </Card>
      <Card style={styles.itemCard}>
        <Text style={styles.cardTitle}>Contacto aseguradora</Text>
        <Body muted>{data.contact?.phone ?? 'Teléfono no informado'}</Body>
        <Body muted>{data.contact?.email ?? 'Correo no informado'}</Body>
      </Card>
      <Button label="Ampliar cobertura" onPress={() => router.push(`/policy/${id}/extend` as Href)} />
      <Button label="Ver contacto completo" variant="secondary" onPress={() => router.push(`/policy/${id}/contact` as Href)} />
    </Screen>
  );
}

export function ExtendPolicyScreen() {
  const back = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [newValue, setNewValue] = useState('');
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['policy', id], queryFn: () => insuranceService.get(id ?? '') });
  const extend = useMutation({
    mutationFn: () => insuranceService.extend(id ?? '', Number(newValue)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policy', id] }),
  });
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Ampliar póliza" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  return (
    <Screen>
      <Header title="Ampliar póliza" onBack={back} />
      <Card style={styles.itemCard}>
        <Title>Solicitar mayor cobertura</Title>
        <SummaryRow label="Cobertura actual" value={formatCurrency(data.insuredValue)} bold />
        <Body muted>Ingresá un valor superior al actual para solicitar la ampliación.</Body>
      </Card>
      <Input label="Nuevo valor asegurado" keyboardType="number-pad" value={newValue} onChangeText={setNewValue} />
      <Button label={extend.isPending ? 'Solicitando...' : 'Confirmar solicitud'} disabled={!newValue || Number(newValue) <= data.insuredValue || extend.isPending} onPress={() => extend.mutate()} />
      {extend.isSuccess ? <StatusCard icon="checkmark-circle-outline" title="Solicitud registrada" message="La nueva cobertura fue actualizada correctamente." tone="green" /> : null}
      {extend.isError ? <Body muted>{errorToUserMessage(extend.error, 'No fue posible ampliar la cobertura.')}</Body> : null}
    </Screen>
  );
}

export function PolicyContactScreen() {
  const back = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['policy', id], queryFn: () => insuranceService.get(id ?? '') });
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Contacto compañía" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  return (
    <Screen>
      <Header title="Contacto compañía" onBack={back} />
      <StatusCard icon="shield-checkmark-outline" title={data.company} message={`Póliza ${data.number}`} tone="green" />
      <Card style={styles.itemCard}>
        <SummaryRow label="Teléfono" value={data.contact?.phone ?? 'No informado'} />
        <SummaryRow label="Correo" value={data.contact?.email ?? 'No informado'} />
        <SummaryRow label="Web" value={data.contact?.web ?? 'No informada'} />
      </Card>
      <Button label="Volver a la póliza" onPress={back} />
    </Screen>
  );
}

export function ChatsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['chats'], queryFn: chatService.conversations, enabled: !!session });
  const { data: notificationsSummary } = useQuery({ queryKey: ['notifications-summary'], queryFn: chatService.notificationsSummary, enabled: !!session });
  const notificationChats = data?.filter((chat) => chat.id === 'bot' || chat.id === 'notificaciones') ?? [];
  const regularChats = data?.filter((chat) => chat.id !== 'bot' && chat.id !== 'notificaciones') ?? [];
  const botNotifications = {
    id: 'bot',
    name: 'Bot - Notificaciones',
    lastMessage: notificationChats.find((chat) => chat.id === 'notificaciones')?.lastMessage
      || notificationChats.find((chat) => chat.id === 'bot')?.lastMessage
      || 'Avisos sobre compras, pujas, bienes, pagos y multas',
    unread: Math.max(
      notificationChats.reduce((total, chat) => total + chat.unread, 0),
      notificationsSummary?.totalUnread ?? 0,
    ),
  };
  const visibleChats = data ? [botNotifications, ...regularChats] : [];
  return (
    <Screen>
      <Header title="Chats" />
      {!session ? <GuestNotice /> : isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : visibleChats.length ? visibleChats.map((chat) => {
        const isBotNotifications = chat.id === 'bot';
        return (
        <Pressable key={chat.id} onPress={() => router.push(isBotNotifications ? '/chat/notificaciones' : `/chat/${chat.id}`)}>
          <Card style={[styles.chatRow, isBotNotifications && styles.botNotificationsRow]}>
            <View style={[styles.chatIcon, isBotNotifications && styles.botNotificationsIcon]}>
              <Ionicons name={isBotNotifications ? 'notifications-outline' : chatIcon(chat.id)} size={20} color={colors.primary} />
              {isBotNotifications && chat.unread > 0 ? <View style={styles.notificationDot} /> : null}
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{chat.name}</Text>
              <Body muted>{chat.lastMessage}</Body>
            </View>
            {chat.unread ? <Badge label={String(chat.unread)} tone="red" /> : null}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </Pressable>
      )}) : <EmptyState title="Sin conversaciones" message="Tus consultas aparecerán acá." />}
    </Screen>
  );
}

function chatIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'soporte': return 'chatbubble-ellipses-outline';
    case 'poliza': return 'shield-checkmark-outline';
    default: return 'chatbubble-outline';
  }
}

export function ConversationScreen() {
  const back = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['messages', id], queryFn: () => chatService.messages(id ?? 'bot') });
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const send = useMutation({
    mutationFn: () => chatService.send(id ?? 'bot', message),
    onSuccess: () => { setMessage(''); queryClient.invalidateQueries({ queryKey: ['messages', id] }); },
  });
  const isBotNotifications = id === 'bot' || id === 'notificaciones';
  const title = id === 'soporte' ? 'Soporte SubastAR' : id === 'poliza' ? 'Póliza de seguro' : isBotNotifications ? 'Bot - Notificaciones' : 'Asistente SubastAR';
  useEffect(() => {
    if (!isBotNotifications) return;
    chatService.markNotificationsRead()
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['chats'] });
      })
      .catch(() => undefined);
  }, [isBotNotifications, queryClient]);
  return (
    <Screen>
      <Header title={title} onBack={back} />
      <StatusCard
        icon={isBotNotifications ? 'hardware-chip-outline' : 'chatbubble-ellipses-outline'}
        title={isBotNotifications ? 'Centro de avisos de SubastAR' : 'Canal de consulta'}
        message={isBotNotifications ? 'Avisos sobre compras, pujas, bienes, pagos y multas.' : 'Usá este espacio para coordinar soporte, entregas o consultas de póliza.'}
        tone="purple"
      />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : data?.map((message) => (
        <View key={message.id} style={[styles.bubble, message.author === 'user' && styles.userBubble]}>
          <Text style={[styles.message, message.author === 'user' && styles.userMessage]}>{message.text}</Text>
          <Text style={[styles.time, message.author === 'user' && styles.userTime]}>{message.time}</Text>
        </View>
      ))}
      <View style={styles.compose}>
        <Input placeholder="Escribí tu consulta..." value={message} onChangeText={setMessage} />
        <Button label={send.isPending ? 'Enviando...' : 'Enviar'} disabled={!message.trim() || send.isPending} onPress={() => send.mutate()} />
      </View>
      {send.isError ? <Body muted>{errorToUserMessage(send.error, 'No fue posible enviar el mensaje.')}</Body> : null}
    </Screen>
  );
}

function notificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'compra': return 'bag-check-outline';
    case 'multa': return 'warning-outline';
    case 'bien': return 'cube-outline';
    case 'poliza': return 'shield-checkmark-outline';
    default: return 'notifications-outline';
  }
}

export function NotificationCenterScreen() {
  const back = useSafeBack();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['notifications'], queryFn: chatService.notifications });
  const markRead = useMutation({
    mutationFn: () => chatService.markNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  const hasUnreadNotifications = data?.some((notification) => !notification.read) ?? false;

  useEffect(() => {
    if (hasUnreadNotifications && !markRead.isPending) markRead.mutate();
  }, [hasUnreadNotifications, markRead]);

  return (
    <Screen>
      <Header title="Bot - Notificaciones" onBack={back} />
      <StatusCard icon="hardware-chip-outline" title="Centro de avisos de SubastAR" message="Acá vas a encontrar avisos sobre compras, pujas, bienes, pagos y multas." tone="purple" />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : data?.length ? data.map((notification) => (
        <Card key={notification.id} style={styles.notificationCard}>
          <View style={styles.notificationIconWrap}>
            <Ionicons name={notificationIcon(notification.type)} size={22} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <View style={styles.notificationTitleRow}>
              <Text style={styles.cardTitle}>{notification.title}</Text>
              {!notification.read ? <Badge label="Nuevo" tone="red" /> : null}
            </View>
            <Body muted>{notification.content}</Body>
            <Text style={styles.time}>{notification.timestamp}</Text>
          </View>
        </Card>
      )) : <EmptyState title="Sin notificaciones" message="Los avisos importantes aparecerán acá." />}
    </Screen>
  );
}

export function EditProfileScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['profile'], queryFn: profileService.me });
  const { data: countries = [], isLoading: loadingCountries, isError: countriesError } = useQuery({ queryKey: ['countries'], queryFn: profileService.countries });
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const save = useMutation({
    mutationFn: () => profileService.update({ address: address || data?.address, country: country || data?.country }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); router.replace('/profile'); },
  });
  const selectedCountry = useMemo(() => countries.find((item) => item.name === (country || data?.country)), [countries, country, data?.country]);
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Datos personales" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  return (
    <Screen>
      <Header title="Datos personales" onBack={back} />
      <Card style={styles.itemCard}>
        <Input label="Nombre y apellido" value={data.name} editable={false} />
        <Input label="Email" value={data.email} editable={false} />
        <Input label="DNI" value={data.dni ?? ''} editable={false} />
        <Input label="Categoría" value={data.category ?? ''} editable={false} />
      </Card>
      <Input label="Dirección" value={address || (data.address ?? '')} onChangeText={setAddress} />
      <SelectInput
        label="País de origen"
        value={selectedCountry ? `${selectedCountry.name} (${selectedCountry.code})` : country || data.country}
        placeholder={loadingCountries ? 'Cargando países...' : 'Seleccionar país'}
        helperText={countriesError ? 'No se pudieron cargar los países. Podés reintentar más tarde.' : 'Mostramos el listado recibido por el servidor.'}
        onPress={() => setCountryPickerVisible(true)}
      />
      <CountryPickerModal
        visible={countryPickerVisible}
        countries={countries}
        value={country || data.country}
        onClose={() => setCountryPickerVisible(false)}
        onSelect={(selected) => {
          setCountry(selected.name);
          setCountryPickerVisible(false);
        }}
      />
      <Button label={save.isPending ? 'Guardando...' : 'Guardar cambios'} disabled={save.isPending} onPress={() => save.mutate()} />
      {save.isError ? <Body muted>{errorToUserMessage(save.error, 'No fue posible guardar.')}</Body> : null}
    </Screen>
  );
}

export function PaymentAddScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const queryClient = useQueryClient();
  const { type, onboarding, returnTo } = useLocalSearchParams<{ type?: PaymentMethodKind; onboarding?: string; returnTo?: string }>();
  const kind = type ?? 'tarjeta_credito';
  const [bank, setBank] = useState('');
  const [country, setCountry] = useState('Argentina');
  const [identifier, setIdentifier] = useState('');
  const [amount, setAmount] = useState('');
  const [holder, setHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [security, setSecurity] = useState('');
  const [dni, setDni] = useState('');
  const [photo, setPhoto] = useState<FileUpload>();
  const [pickerError, setPickerError] = useState('');
  const save = useMutation({
    mutationFn: () => paymentService.create({
      type: kind, bankName: bank, bankCountry: country, cbuIban: kind === 'cuenta_bancaria' ? identifier : undefined,
      reservedFunds: amount, cardNumber: kind === 'tarjeta_credito' ? identifier : undefined, holder, expiry,
      securityCode: security, holderDni: dni, issuerBank: bank, certifiedAmount: amount,
      chequeNumber: kind === 'cheque_certificado' ? identifier : undefined, chequePhoto: photo,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      router.replace({ pathname: '/payment-success', params: { returnTo, type: kind, onboarding: onboarding ?? 'false' } });
    },
  });
  async function pickCheque() {
    try {
      setPickerError('');
      explainFileAccess('photo');
      const granted = await requestMediaLibraryPermission();
      if (!granted) {
        setPickerError(permissionDeniedMessage('gallery'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!result.canceled) {
        const asset = result.assets[0];
        setPhoto({ uri: asset.uri, name: asset.fileName ?? `cheque-${Date.now()}.jpg`, type: asset.mimeType ?? 'image/jpeg', file: asset.file });
      }
    } catch {
      setPickerError(permissionDeniedMessage('gallery'));
    }
  }
  const label = kind === 'tarjeta_credito' ? 'Tarjeta de crédito' : kind === 'cuenta_bancaria' ? 'Cuenta bancaria' : 'Cheque certificado';
  const submitLabel = kind === 'cuenta_bancaria' ? 'Agregar cuenta' : kind === 'tarjeta_credito' ? 'Agregar tarjeta' : 'Agregar cheque';
  const canSave = kind === 'tarjeta_credito'
    ? !!identifier && !!holder && !!dni && !!expiry && !!security
    : kind === 'cuenta_bancaria'
      ? !!bank && !!country && !!identifier && Number(amount) > 0
      : !!bank && !!identifier && Number(amount) > 0 && !!photo;
  return (
    <Screen>
      <Header title={label} onBack={back} />
      <Card style={styles.itemCard}>
        <Badge label="Alta de medio" tone="purple" />
        <Title>Agregar {label.toLowerCase()}</Title>
        <Body muted>La empresa puede revisar los datos antes de habilitarlo para pujas y pagos pendientes.</Body>
      </Card>
      <StatusCard icon="lock-closed-outline" title="Validación del medio" message="La empresa puede revisar los datos antes de habilitarlo para pujas y pagos pendientes." tone="yellow" />
      {onboarding === 'true' ? <Button label="Omitir por ahora" variant="ghost" onPress={() => router.replace((returnTo || '/(tabs)') as Href)} /> : null}
      {kind !== 'tarjeta_credito' ? <Input label="Nombre del banco" value={bank} onChangeText={setBank} /> : null}
      {kind === 'cuenta_bancaria' ? <Input label="País del banco" value={country} onChangeText={setCountry} /> : null}
      {kind === 'tarjeta_credito' ? <>
        <Input label="Número de tarjeta" value={identifier} onChangeText={setIdentifier} />
        <Input label="Titular" value={holder} onChangeText={setHolder} />
        <Input label="DNI titular" value={dni} onChangeText={setDni} />
        <Input label="Vencimiento" value={expiry} onChangeText={setExpiry} />
        <Input label="Código de seguridad" secureTextEntry value={security} onChangeText={setSecurity} />
      </> : kind === 'cuenta_bancaria' ? <>
        <Input label="Fondos reservados para subasta" value={amount} keyboardType="number-pad" onChangeText={setAmount} />
        <Input label="CBU/IBAN/Número de cuenta" value={identifier} onChangeText={setIdentifier} />
      </> : <>
        <Input label="Número de cheque" value={identifier} onChangeText={setIdentifier} />
        <Input label="Monto certificado" value={amount} keyboardType="number-pad" onChangeText={setAmount} />
      </>}
      {kind === 'cheque_certificado' ? <>
        <Body muted>Necesitamos abrir tu galeria para adjuntar la imagen del cheque. En computadora se abrira el selector de archivos.</Body>
        <UploadBox label={photo ? 'Foto cargada' : 'Subir foto del cheque'} description="Imagen del respaldo certificado" done={!!photo} icon="camera-outline" onPress={pickCheque} />
        {pickerError ? <StatusState icon="alert-circle-outline" title="No pudimos acceder a la foto" message={pickerError} tone="red" /> : null}
      </> : null}
      <Button label={save.isPending ? 'Guardando...' : submitLabel} disabled={!canSave || save.isPending} onPress={() => save.mutate()} />
      {save.isError ? <Body muted>{errorToUserMessage(save.error, 'No fue posible agregar el medio.')}</Body> : null}
    </Screen>
  );
}

export function PaymentSuccessScreen() {
  const router = useRouter();
  const { onboarding, returnTo, type } = useLocalSearchParams<{ onboarding?: string; returnTo?: string; type?: PaymentMethodKind }>();
  const chequePending = type === 'cheque_certificado';
  return (
    <Screen style={styles.successScreen}>
      <StatusCard icon={chequePending ? 'time-outline' : 'checkmark-circle-outline'} title={chequePending ? 'Cheque enviado a revisión' : '¡Se agregó el medio de pago exitosamente!'} message={chequePending ? 'Validaremos la documentación. El cheque se habilitará para pujas cuando sea aprobado.' : 'Ya podés utilizarlo para participar en las subastas disponibles.'} tone={chequePending ? 'yellow' : 'green'} />
      <Button
        label="Agregar otro medio de pago"
        onPress={() => router.replace(onboarding === 'true' ? { pathname: '/onboarding-payment', params: { returnTo } } : '/profile/payments')}
      />
      <Button label="Volver" variant="secondary" onPress={() => router.replace((returnTo || '/(tabs)') as Href)} />
    </Screen>
  );
}

export function AssetDetailScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['asset', id], queryFn: () => assetService.get(id ?? '') });
  const accept = useMutation({
    mutationFn: (accepted: boolean) => assetService.acceptConditions(id ?? '', accepted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Detalle del bien" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  return (
    <Screen>
      <Header title="Detalle del bien" onBack={back} />
      <Card style={[styles.itemCard, styles.assetHeroCard]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderCopy}>
            <Badge label={data.status} tone={data.status === 'Aceptado' ? 'green' : data.status === 'Rechazado' ? 'red' : 'yellow'} />
            <Title>{data.title}</Title>
            <Body muted>{data.category}</Body>
          </View>
          <View style={styles.assetHeroIcon}><Ionicons name="cube-outline" size={24} color={colors.primary} /></View>
        </View>
        <Body>{data.detail}</Body>
        <View style={styles.tileRow}>
          <InfoTile icon="albums-outline" label="Fotos" value={data.photosUploaded != null ? String(data.photosUploaded) : 'No asignado'} />
          <InfoTile icon="document-text-outline" label="Documentos" value={data.documentationAttached ? 'Adjunta' : 'No asignado'} tone={data.documentationAttached ? 'green' : 'yellow'} />
        </View>
        <Divider />
        <SummaryRow label="Precio base" value={data.basePrice != null ? formatCurrency(data.basePrice) : 'No asignado'} />
        <SummaryRow label="Comisión" value={data.commission != null ? formatCurrency(data.commission) : 'No asignado'} />
        <SummaryRow label="Depósito" value={data.depositLocation ?? 'No asignado'} />
      </Card>
      <Button label="Ver detalle completo" variant="secondary" icon="open-outline" onPress={() => router.push({ pathname: '/profile/assets/[id]/full', params: { id: data.id } })} />
      {data.status === 'Aceptado' ? <>
        <Button label="Aceptar condiciones" onPress={() => accept.mutate(true)} />
        <Button label="Rechazar condiciones" variant="secondary" onPress={() => accept.mutate(false)} />
      </> : null}
      {accept.isSuccess ? <StatusCard icon="checkmark-circle-outline" title="Respuesta enviada" message="Registramos tu decisión sobre las condiciones del bien." tone="green" /> : null}
      {accept.isError ? <Body muted>{errorToUserMessage(accept.error, 'No fue posible registrar la decisión.')}</Body> : null}
    </Screen>
  );
}

export function AssetFullDetailScreen() {
  const back = useSafeBack();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['asset', id], queryFn: () => assetService.get(id ?? '') });
  const [photoIndex, setPhotoIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [additionalInformation, setAdditionalInformation] = useState('');
  const [suggestedBasePrice, setSuggestedBasePrice] = useState('');
  const [suggestedBasePriceCurrency, setSuggestedBasePriceCurrency] = useState('ARS');
  const photos = data?.photos?.filter((photo) => photo.url) ?? [];
  const selectedPhoto = photos[photoIndex];
  const numericSuggestedBasePrice = suggestedBasePrice ? Number(suggestedBasePrice) : undefined;
  const invalidSuggestedBasePrice = numericSuggestedBasePrice != null && (!Number.isFinite(numericSuggestedBasePrice) || numericSuggestedBasePrice <= 0);
  const updateAsset = useMutation({
    mutationFn: async () => {
      await assetService.update(id ?? '', {
        additionalInformation,
        suggestedBasePrice: numericSuggestedBasePrice,
        suggestedBasePriceCurrency: suggestedBasePriceCurrency || undefined,
      });
      return assetService.get(id ?? '');
    },
    onSuccess: (updatedAsset) => {
      queryClient.setQueryData(['asset', id], updatedAsset);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setEditing(false);
    },
  });

  useEffect(() => {
    if (!editing && data) {
      setAdditionalInformation(data.additionalInformation ?? '');
      setSuggestedBasePrice(data.suggestedBasePrice != null ? String(data.suggestedBasePrice) : '');
      setSuggestedBasePriceCurrency(data.suggestedBasePriceCurrency ?? 'ARS');
    }
  }, [data, editing]);

  useEffect(() => {
    if (photos.length <= 1) return;
    const intervalId = setInterval(() => setPhotoIndex((current) => (current + 1) % photos.length), 4000);
    return () => clearInterval(intervalId);
  }, [photos.length]);

  useEffect(() => {
    if (photoIndex >= photos.length) setPhotoIndex(0);
  }, [photoIndex, photos.length]);

  function goPrev() {
    if (!photos.length) return;
    setPhotoIndex((current) => current === 0 ? photos.length - 1 : current - 1);
  }

  function goNext() {
    if (!photos.length) return;
    setPhotoIndex((current) => (current + 1) % photos.length);
  }

  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Detalle completo del bien" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;

  return (
    <Screen>
      <Header title="Detalle completo del bien" subtitle={data.title} onBack={back} />
      <Card style={[styles.itemCard, styles.assetHeroCard]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderCopy}>
            <Badge label={data.status} tone={data.status === 'Aceptado' ? 'green' : data.status === 'Rechazado' ? 'red' : 'yellow'} />
            <Title>{data.title}</Title>
            <Body muted>{data.category}</Body>
          </View>
          <View style={styles.assetHeroIcon}><Ionicons name="analytics-outline" size={24} color={colors.primary} /></View>
        </View>
        <Body>{data.detail}</Body>
      </Card>
      <Card style={styles.assetGalleryCard}>
        <SectionHeader title="Galería del bien" subtitle={`${photos.length} imágenes cargadas`} />
        {selectedPhoto?.url ? (
          <View style={styles.carouselFrame}>
            <Image source={{ uri: selectedPhoto.url }} style={styles.assetMainPhoto} resizeMode="cover" />
            {photos.length > 1 ? (
              <>
                <Pressable style={[styles.carouselButton, styles.carouselButtonLeft]} onPress={goPrev}>
                  <Ionicons name="chevron-back" size={22} color="#FFF" />
                </Pressable>
                <Pressable style={[styles.carouselButton, styles.carouselButtonRight]} onPress={goNext}>
                  <Ionicons name="chevron-forward" size={22} color="#FFF" />
                </Pressable>
                <View style={styles.carouselDots}>
                  {photos.map((photo, index) => (
                    <Pressable key={photo.id} onPress={() => setPhotoIndex(index)} style={[styles.carouselDot, index === photoIndex && styles.carouselDotActive]} />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : (
          <EmptyState title="Sin fotos disponibles" message="Las fotos cargadas aparecerán acá." />
        )}
        {photos.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assetThumbRow}>
            {photos.map((photo, index) => (
              <Pressable
                key={photo.id}
                style={[styles.assetThumbButton, index === photoIndex && styles.assetThumbButtonActive]}
                onPress={() => setPhotoIndex(index)}>
                <Image source={{ uri: photo.url }} style={styles.assetThumb} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </Card>
      <Card style={styles.itemCard}>
        <SectionHeader title="Información declarada" subtitle="Datos informados al iniciar la solicitud" />
        <View style={styles.fieldGrid}>
          <AssetField label="Descripción técnica" value={data.technicalDescription} />
          <AssetField label="Cantidad de elementos" value={data.quantity != null ? String(data.quantity) : undefined} />
          <AssetField label="Información adicional" value={data.additionalInformation} />
          {data.originPeriod ? <AssetField label="Época u origen" value={data.originPeriod} /> : null}
          {data.artistDesigner ? <AssetField label="Artista o diseñador" value={data.artistDesigner} /> : null}
          {data.historicalData ? <AssetField label="Datos históricos" value={data.historicalData} /> : null}
        </View>
      </Card>
      <Card style={styles.itemCard}>
        <SectionHeader title="Condiciones de subasta" subtitle="Valores y asignaciones definidos para el bien" />
        <View style={styles.fieldGrid}>
          <AssetField label="Precio base asignado" value={data.basePrice != null ? formatCurrency(data.basePrice) : undefined} />
          <AssetField label="Precio base sugerido" value={data.suggestedBasePrice != null ? formatAmountWithCurrency(data.suggestedBasePrice, data.suggestedBasePriceCurrency) : undefined} />
          <AssetField label="Comisión" value={data.commission != null ? formatCurrency(data.commission) : undefined} />
          <AssetField label="Subasta asignada" value={data.assignedAuction} />
          <AssetField label="Depósito" value={data.depositLocation} />
          <AssetField label="Póliza" value={data.policyId} />
        </View>
        <SecurityNote text="El precio base sugerido puede ser revisado por la empresa antes de asignar el bien a una subasta." />
      </Card>
      <Card style={styles.itemCard}>
        <SectionHeader title="Documentación adjunta" subtitle={data.documents?.length ? `${data.documents.length} archivo(s)` : 'Sin archivos disponibles'} />
        {data.documents?.length ? data.documents.map((document) => (
          <View key={document.id} style={styles.documentRow}>
            <View style={styles.documentIcon}>
              <Ionicons name={document.contentType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={22} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{document.name ?? 'Documento adjunto'}</Text>
              <Body muted>{document.contentType ?? document.type ?? 'Archivo'}</Body>
            </View>
            <Button label="Ver" variant="secondary" size="sm" disabled={!document.url} onPress={() => openExternalUrl(document.url)} />
          </View>
        )) : (
          <EmptyState title="Sin documentación visible" message="Cuando haya documentos adjuntos aparecerán en esta sección." />
        )}
      </Card>
      <Card style={styles.itemCard}>
        <SectionHeader title="Editar datos del bien" subtitle="Podés ajustar información visible para la revisión de la empresa" />
        {!editing ? (
          <>
            <Body muted>Estos datos ayudan a la empresa a preparar la futura subasta del bien.</Body>
            <Button label="Editar información" variant="secondary" onPress={() => setEditing(true)} />
          </>
        ) : (
          <>
            <Input label="Información adicional" value={additionalInformation} onChangeText={setAdditionalInformation} multiline />
            <Input label="Precio base sugerido" value={suggestedBasePrice} onChangeText={setSuggestedBasePrice} keyboardType="number-pad" />
            <Body muted>Divisa del precio sugerido</Body>
            <View style={styles.currencyToggle}>
              {['ARS', 'USD'].map((currency) => (
                <Pressable key={currency} onPress={() => setSuggestedBasePriceCurrency(currency)} style={[styles.currencyOption, suggestedBasePriceCurrency === currency && styles.currencyOptionActive]}>
                  <Text style={[styles.currencyOptionText, suggestedBasePriceCurrency === currency && styles.currencyOptionTextActive]}>{currency}</Text>
                </Pressable>
              ))}
            </View>
            <Body muted>El precio base sugerido no abre la subasta automáticamente. La empresa puede revisarlo antes de asignar el bien.</Body>
            <View style={styles.editActionsRow}>
              <Button label={updateAsset.isPending ? 'Guardando...' : 'Guardar cambios'} disabled={updateAsset.isPending || invalidSuggestedBasePrice || (!!suggestedBasePrice && !suggestedBasePriceCurrency)} onPress={() => updateAsset.mutate()} />
              <Button label="Cancelar" variant="secondary" disabled={updateAsset.isPending} onPress={() => setEditing(false)} />
            </View>
            {updateAsset.isError ? <Body muted>{errorToUserMessage(updateAsset.error, 'No fue posible guardar los cambios.')}</Body> : null}
          </>
        )}
      </Card>
      <LoadingOverlay visible={updateAsset.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { alignItems: 'center', marginTop: spacing.huge },
  noticeIcon: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  profileCard: { alignItems: 'center', backgroundColor: colors.surfaceAlt },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignSelf: 'stretch' },
  menuBlock: { gap: spacing.sm },
  avatar: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  avatarText: { fontFamily: fonts.black, fontSize: 28, color: colors.primary },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metricChartCard: { gap: spacing.md },
  bars: { height: 105, flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end', justifyContent: 'center' },
  bar: { width: 22, borderRadius: radius.sm, backgroundColor: colors.primary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  summaryValue: { color: colors.text, fontSize: typography.body, fontFamily: fonts.regular },
  summaryValueBold: { fontFamily: fonts.black, color: colors.primaryDark },
  itemCard: { gap: spacing.md },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  cardHeaderCopy: { flex: 1, gap: 2 },
  assetHeroCard: { gap: spacing.md, backgroundColor: colors.surfaceAlt },
  assetHeroIcon: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  assetGalleryCard: { gap: spacing.md },
  carouselFrame: { position: 'relative', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  carouselButton: { position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,23,0.55)' },
  carouselButtonLeft: { left: spacing.md },
  carouselButtonRight: { right: spacing.md },
  carouselDots: { position: 'absolute', left: 0, right: 0, bottom: spacing.md, flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  carouselDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  carouselDotActive: { width: 22, backgroundColor: '#FFF' },
  assetMainPhoto: { width: '100%', height: 320, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  assetThumbRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  assetThumbButton: { borderWidth: 2, borderColor: 'transparent', borderRadius: radius.md, padding: 2 },
  assetThumbButtonActive: { borderColor: colors.primary },
  assetThumb: { width: 84, height: 84, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  documentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  documentIcon: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  editActionsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  fieldGrid: { gap: spacing.sm },
  fieldCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  fieldValue: { color: colors.textStrong, fontSize: typography.body, fontFamily: fonts.medium },
  currencyToggle: { flexDirection: 'row', gap: spacing.sm },
  currencyOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  currencyOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  currencyOptionText: { color: colors.textMuted, fontFamily: fonts.medium },
  currencyOptionTextActive: { color: colors.primary, fontFamily: fonts.bold },
  loadingOverlay: { flex: 1, backgroundColor: 'rgba(17,17,23,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingOverlayCard: { width: '100%', maxWidth: 360, alignItems: 'center', gap: spacing.md },
  cardActionsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  penaltyCard: { alignItems: 'center', backgroundColor: colors.dangerSoft },
  penalty: { color: colors.danger, fontSize: typography.title, fontFamily: fonts.black },
  cardTitle: { color: colors.text, fontSize: typography.body, fontFamily: fonts.bold },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  value: { color: colors.text, fontSize: typography.body, fontFamily: fonts.regular },
  valueBold: { fontFamily: fonts.black, color: colors.primaryDark },
  policy: { backgroundColor: colors.primarySoft },
  invoiceHero: { alignItems: 'stretch', gap: spacing.md, backgroundColor: colors.surface },
  invoiceHeroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invoiceHeroCopy: { alignItems: 'center', gap: spacing.xs },
  invoiceIcon: { width: 56, height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  invoiceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  invoicePaper: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  invoiceText: { fontFamily: Platform.OS === 'web' ? 'monospace' : fonts.regular, color: colors.text, fontSize: typography.body, lineHeight: 24 },
  invoiceMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surfaceAlt },
  filterActive: { backgroundColor: colors.primarySoft },
  filterText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: typography.small },
  filterTextActive: { color: colors.primary },
  purchaseSection: { gap: spacing.md },
  chatRow: { flexDirection: 'row', alignItems: 'center' },
  paymentRow: { gap: spacing.xs },
  chatIcon: { width: 42, height: 42, backgroundColor: colors.primarySoft, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  botNotificationsRow: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  botNotificationsIcon: { borderWidth: 1, borderColor: colors.primaryBorder },
  notificationCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  notificationIconWrap: { position: 'relative', width: 42, height: 42, backgroundColor: colors.primarySoft, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', right: 1, top: 1, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.surface },
  notificationTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  bubble: { maxWidth: '84%', alignSelf: 'flex-start', padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, gap: spacing.xs },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  message: { color: colors.text, fontSize: typography.body, fontFamily: fonts.regular },
  userMessage: { color: '#FFF' },
  time: { color: colors.textMuted, fontSize: typography.caption, fontFamily: fonts.regular },
  userTime: { color: '#DED9FF' },
  compose: { marginTop: spacing.lg, gap: spacing.sm },
  successScreen: { alignItems: 'center', paddingTop: 70 },
  overlaySoft: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(17,17,23,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, zIndex: 20 },
  countryModal: { width: '100%', maxHeight: '82%', gap: spacing.md },
  countryModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  countryModalTitleCopy: { flex: 1, gap: spacing.xs },
  countryList: { maxHeight: 420 },
  countryListContent: { gap: spacing.sm, paddingBottom: spacing.sm },
  countryRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  countryRowActive: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  countryRowCopy: { flex: 1, gap: 2 },
  countryRowTitle: { color: colors.textStrong, fontSize: typography.body, fontFamily: fonts.bold },
  countryRowMeta: { alignItems: 'flex-end', gap: spacing.xs },
});

