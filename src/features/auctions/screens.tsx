import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuctionCard, formatCurrency, LotCard, PaymentMethodCard } from '@/components/domain/cards';
import { LotImageCarousel } from '@/components/domain/LotImageCarousel';
import { AuthRequiredModal, Badge, Body, Button, Card, Chip, Divider, EmptyState, ErrorState, Header, IconButton, InfoTile, Input, LoadingState, Screen, SearchInput, SectionHeader, SectionLabel, SecurityNote, StatusState, Title } from '@/components/ui/primitives';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useSession } from '@/providers/app-provider';
import { auctionService, paymentService, profileService } from '@/services/api';
import { errorToUserMessage } from '@/services/errors';
import { ApiError } from '@/services/http';

function useId() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return id ?? '';
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowIcon}>
        <Ionicons name={icon} color={colors.primary} size={18} />
      </View>
      <View style={styles.infoRowCopy}>
        <Text style={styles.meta}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatAuctionMoney(value: number, currency?: string) {
  return `${currency ?? 'ARS'} ${new Intl.NumberFormat('es-AR').format(value)}`;
}

function BidHistoryRow({ bidder, amount, timestamp, leader }: { bidder: string; amount: number; timestamp: string; leader?: boolean }) {
  return (
    <View style={styles.bidRow}>
      <View style={styles.bidRowCopy}>
        <Text style={styles.infoValue}>{bidder}</Text>
        <Text style={styles.meta}>{timestamp}</Text>
      </View>
      <View style={styles.bidRowAmount}>
        {leader ? <Badge label="Líder" tone="green" /> : null}
        <Text style={styles.price}>{formatCurrency(amount)}</Text>
      </View>
    </View>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [requiresAuth, setRequiresAuth] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['auctions', 'featured'], queryFn: () => auctionService.list() });
  const { data: accountState } = useQuery({ queryKey: ['account-state'], queryFn: profileService.accountState, enabled: !!session });
  const featured = data?.[0];
  if (accountState?.status === 'Bloqueado') {
    return (
      <Screen>
        <Header title="Inicio bloqueado" />
        <StatusState icon="lock-closed-outline" title="Tu cuenta está bloqueada" message={accountState.message ?? 'No podés operar mientras la cuenta permanezca bloqueada.'} tone="red" actionLabel="Ver estado de cuenta" onAction={() => router.push('/profile/account-status')} />
      </Screen>
    );
  }
  return (
    <Screen>
      <Header title="" right={<Body muted><Text style={{ textAlign: 'right' }}>Bienvenido{session ? `, ${session.profile.name.split(' ')[0]}` : ''}</Text></Body>} />
        <Title>Subastas seleccionadas</Title>
        <Card style={styles.homeHero}>
        <View style={styles.heroHeader}>
          <View style={styles.heroMark}><Ionicons name="hammer-outline" size={20} color={colors.primary} /></View>
          <View style={styles.heroHeaderCopy}>
            <Badge label={session ? 'Cuenta activa' : 'Acceso invitado'} tone={session ? 'green' : 'purple'} />
            <Text style={styles.homeHeroTitle}>Descubrí lotes destacados y pujá con confianza</Text>
            <Text style={styles.homeHeroBody}>Subastas seleccionadas, pagos verificados y seguimiento claro en una experiencia más profesional.</Text>
          </View>
        </View>
        <View style={styles.tileRow}>
          <InfoTile icon="radio-outline" label="En vivo" value="Ofertá en tiempo real" />
          <InfoTile icon="cube-outline" label="Catálogo" value="Lotes verificados" />
        </View>
      </Card>
      <SectionHeader title="Destacada" subtitle="Subasta seleccionada para hoy" />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : featured ? <AuctionCard auction={featured} onPress={() => router.push(`/auction/${featured.id}`)} /> : <EmptyState title="No hay subastas destacadas" message="Volvé a consultar más tarde." />}
      <SectionHeader title="Atajos" subtitle="Acciones rápidas para continuar" />
      <Pressable style={styles.exploreHero} onPress={() => router.push('/(tabs)/auctions')}>
        <Ionicons name="hammer-outline" size={27} color="#FFF" />
        <View style={styles.flex}>
          <Text style={styles.heroTitle}>Explorar subastas</Text>
          <Text style={styles.heroBody}>Ver catálogos y pujar</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#FFF" />
      </Pressable>
      <Pressable style={styles.quickHero} onPress={() => session ? router.push('/sell') : setRequiresAuth(true)}>
        <Ionicons name="add-circle-outline" size={27} color={colors.primary} />
        <View style={styles.flex}>
          <Text style={styles.sellTitle}>Subir bien</Text>
          <Text style={styles.heroBodyDark}>Publicá un bien para subastar</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
      <AuthRequiredModal
        visible={requiresAuth}
        onClose={() => setRequiresAuth(false)}
        onLogin={() => { setRequiresAuth(false); router.push({ pathname: '/login', params: { returnTo: '/sell' } }); }}
        onRegister={() => { setRequiresAuth(false); router.push({ pathname: '/register', params: { returnTo: '/sell' } }); }}
      />
    </Screen>
  );
}

export function AuctionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string; category?: string; currency?: string }>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.status ?? 'Todas');
  const category = params.category ?? 'Todas';
  const currency = params.currency ?? 'Todas';
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['auctions', search, status, category, currency],
    queryFn: () => auctionService.list({ search, status, category, currency }),
  });
  return (
    <Screen>
      <Header title="Subastas" right={<IconButton icon="options-outline" accessibilityLabel="Filtros" tone="primary" onPress={() => router.push('/auction-filters')} />} />
      <SearchInput value={search} onChangeText={setSearch} placeholder="Buscar subasta" />
      <SectionHeader title="Estado de subasta" subtitle="Filtrá por disponibilidad y contexto" actionLabel="Filtros" onAction={() => router.push('/auction-filters')} />
      <View style={styles.chips}>
        {['Todas', 'En vivo', 'Próximas', 'Finalizada'].map((item) => (
          <Chip label={item} active={item === status} onPress={() => setStatus(item)} key={item} />
        ))}
      </View>
      <SecurityNote text="Los lotes y estados se muestran según la información disponible de la subasta y tu sesión." />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : data?.length ? data.map((auction) => (
        <AuctionCard key={auction.id} auction={auction} onPress={() => router.push(`/auction/${auction.id}`)} />
      )) : <EmptyState title="Sin resultados" message="Proba con otros filtros o palabras clave." />}
    </Screen>
  );
}

export function AuctionDetailScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const id = useId();
  const { data: auction, isLoading, isError, refetch } = useQuery({ queryKey: ['auction', id], queryFn: () => auctionService.get(id), enabled: !!id });
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !auction) return <Screen><Header title="Datos subasta" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  return (
    <Screen>
      <Header title="Datos subasta" onBack={back} />
      <Card style={styles.detailHero}>
        <View style={styles.detailHeroTop}>
          <Badge label={auction.status} tone={auction.status === 'En vivo' ? 'green' : auction.status === 'Finalizada' ? 'red' : 'purple'} />
          <Title>{auction.name}</Title>
          <Body muted>{auction.category}</Body>
        </View>
        <View style={styles.tileRow}>
          <InfoTile icon="calendar-outline" label="Fecha y hora" value={auction.date} />
          <InfoTile icon="cash-outline" label="Moneda" value={auction.currency} />
        </View>
        <Divider />
        <InfoRow icon="location-outline" label="Lugar" value={auction.location} />
        <InfoRow icon="person-outline" label="Rematador" value={auction.auctioneer} />
      </Card>
      <Card style={styles.metricCard}>
        <Body muted>Cantidad de lotes disponibles</Body>
        <Text style={styles.bigNumber}>{auction.totalLots}</Text>
      </Card>
      <Button label="Ver catálogo" onPress={() => router.push(`/auction/${id}/catalog`)} />
      {auction.status === 'En vivo' ? <>
        <Button label="Ir a pujar" onPress={() => router.push(`/live/${id}`)} />
        <Button label="Ver Streaming" variant="secondary" icon="radio-outline" onPress={() => router.push(`/live/${id}`)} />
      </> : null}
    </Screen>
  );
}


export function CatalogScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const id = useId();
  const [filter, setFilter] = useState('Todas');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['catalog', id],
    queryFn: () => auctionService.catalog(id),
    enabled: !!id,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const { data: auction } = useQuery({ queryKey: ['auction', id], queryFn: () => auctionService.get(id), enabled: !!id });
  const lots = data?.filter((lot) => {
    const status = lot.status?.toLowerCase();
    if (filter === 'Todas') return true;
    const sold = status === 'vendido' || status === 'subastado';
    const closedWithoutBid = status === 'sin_puja';
    return filter === 'Vendidos' ? sold || closedWithoutBid : !sold && !closedWithoutBid;
  });
  return (
    <Screen>
      <Header title="Catálogo" subtitle={auction?.name} onBack={back} right={<IconButton icon="refresh-outline" accessibilityLabel="Actualizar catálogo" onPress={() => refetch()} />} />
      <SectionHeader title="Estado de lotes" subtitle="Ordená por disponibilidad para encontrar piezas activas" />
      <View style={styles.chips}>
        {['Todas', 'Disponibles', 'Vendidos'].map((item) => <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />)}
      </View>
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : (
        <View style={styles.grid}>
          {lots?.map((lot) => <LotCard lot={lot} key={lot.id} onPress={() => router.push({ pathname: '/lot/[id]', params: { id: lot.id, auctionId: id } })} />)}
          {!lots?.length ? <EmptyState title="No hay lotes" message="No encontramos piezas para este estado." /> : null}
        </View>
      )}
    </Screen>
  );
}

export function LotDetailScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const id = useId();
  const { auctionId } = useLocalSearchParams<{ auctionId?: string }>();
  const canLoadLot = !!id && !!auctionId;
  const [authModal, setAuthModal] = useState(false);
  const { session } = useSession();
  const { data: lot, isLoading, isError, refetch } = useQuery({ queryKey: ['lot', id, auctionId], queryFn: () => auctionService.lot(id, auctionId ?? ''), enabled: canLoadLot });
  if (!auctionId) return <Screen><Header title="Detalle del lote" onBack={back} /><EmptyState title="No se encontró la subasta del lote" message="Volvé al catálogo para abrir esta pieza nuevamente." /></Screen>;
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !lot) return <Screen><Header title="Detalle del lote" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  const joinLive = () => session ? router.push(`/live/${lot.auctionId}`) : setAuthModal(true);
  return (
    <Screen>
      <Header title={`Lote ${lot.lotNumber}`} onBack={back} />
      <LotImageCarousel images={lot.images?.length ? lot.images : lot.image ? [lot.image] : undefined} title={lot.title} height={340} />
      <Card style={styles.detailHero}>
        <Badge label={`Lote ${lot.lotNumber}`} tone="purple" />
        <Title>{lot.title}</Title>
        <Body>{lot.description}</Body>
      </Card>
      {lot.artist ? <Card>
        <SectionHeader title="Detalles del lote" subtitle="Información complementaria disponible" />
        <InfoRow icon="color-palette-outline" label="Artista" value={lot.artist} />
        {lot.creationDate ? <InfoRow icon="calendar-outline" label="Fecha de creación" value={lot.creationDate} /> : null}
        {lot.owner ? <InfoRow icon="document-text-outline" label="Procedencia" value={lot.owner} /> : null}
        {lot.history ? <>
          <Divider />
          <Body muted>{lot.history}</Body>
        </> : null}
      </Card> : null}
      <Card style={styles.priceCard}>
        <Body muted>Precio base</Body>
        <Text style={styles.price}>{formatCurrency(lot.basePrice)}</Text>
      </Card>
      <Button label="Ir a pujar" onPress={joinLive} />
      <AuthRequiredModal
        visible={authModal}
        onClose={() => setAuthModal(false)}
        onLogin={() => { setAuthModal(false); router.push({ pathname: '/login', params: { returnTo: `/live/${lot.auctionId}` } }); }}
        onRegister={() => { setAuthModal(false); router.push({ pathname: '/register', params: { returnTo: `/live/${lot.auctionId}` } }); }}
      />
    </Screen>
  );
}

export function LiveAuctionScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const id = useId();
  const [amount, setAmount] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [lastLotId, setLastLotId] = useState<string>();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['live', id],
    queryFn: () => auctionService.live(id),
    enabled: !!id,
    refetchInterval: 5000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const { data: paymentData } = useQuery({ queryKey: ['payments'], queryFn: paymentService.list });
  const { data: auction } = useQuery({ queryKey: ['auction', id], queryFn: () => auctionService.get(id), enabled: !!id });
  const usablePayments = paymentData?.filter((payment) => payment.verified) ?? [];
  useEffect(() => {
    if (data?.lot?.id) setLastLotId(data.lot.id);
  }, [data?.lot?.id]);
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Subasta en vivo" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  if (!data.lot) return (
    <Screen>
      <Header title="Subasta en vivo" onBack={back} />
      <EmptyState title="No hay lote activo" message="El lote finalizó o aún no comenzó." />
      <Button label="Actualizar estado" variant="ghost" onPress={() => refetch()} />
      {lastLotId ? <Button label="Consultar resultado del lote" onPress={() => router.push({ pathname: '/result/[id]', params: { id, itemId: lastLotId } })} /> : null}
    </Screen>
  );
  const currency = auction?.currency ?? 'ARS';
  const quickAmounts = [
    { label: 'Mínima', value: data.minBid },
    { label: '+1%', value: Math.max(data.minBid, data.bestBid > 0 ? data.bestBid + data.lot.basePrice * 0.01 : data.minBid) },
    { label: '+5%', value: Math.max(data.minBid, (data.bestBid || data.lot.basePrice) + data.lot.basePrice * 0.05) },
    { label: '+10%', value: Math.max(data.minBid, (data.bestBid || data.lot.basePrice) + data.lot.basePrice * 0.1) },
  ];
  const amountValue = Number(amount);
  const hasInvalidAmount = !!amount && !Number.isFinite(amountValue);
  const isBelowMinimum = !!amount && Number.isFinite(amountValue) && amountValue < data.minBid;
  const isAboveMaximum = !!amount && data.maxBid != null && amountValue > data.maxBid;
  return (
    <Screen>
      <Header title="Subasta en vivo" subtitle={auction?.name} onBack={back} />
      <Card style={styles.liveBannerCard}>
        <View style={styles.liveBanner}><View style={styles.liveDot} /><Text style={styles.liveText}>EN VIVO</Text><Text style={styles.timer}>00:{data.secondsLeft != null ? String(data.secondsLeft).padStart(2, '0') : '--'}</Text></View>
        <Text style={styles.liveTitle}>{data.lot.title}</Text>
        <Body muted>{auction?.location ?? 'Subasta activa'}</Body>
      </Card>
      <LotImageCarousel images={data.lot.images?.length ? data.lot.images : data.lot.image ? [data.lot.image] : undefined} title={data.lot.title} height={300} />
      <Card style={styles.bidPanel}>
        <SectionHeader title="Consola de puja" subtitle="Elegí un monto rápido o ingresalo manualmente" />
        <Body muted>Mejor oferta actual</Body>
        <Text style={styles.offer}>{data.bestBid > 0 ? formatAuctionMoney(data.bestBid, currency) : 'Sin ofertas todavía'}</Text>
        {data.bestBid <= 0 ? <Body muted>Precio base: {formatAuctionMoney(data.lot.basePrice, currency)}</Body> : null}
        <View style={styles.tileRow}>
          <InfoTile icon="trending-up-outline" label="Puja mínima" value={formatAuctionMoney(data.minBid, currency)} />
          <InfoTile icon="shield-checkmark-outline" label="Puja máxima" value={data.maxBid != null ? formatAuctionMoney(data.maxBid, currency) : 'Sin tope'} />
        </View>
        <View style={styles.quickBids}>
          {quickAmounts.map((item) => (
            <Pressable key={item.label} style={styles.quickBid} onPress={() => setAmount(String(Math.round(item.value)))}>
              <Text style={styles.quickBidLabel}>{item.label}</Text>
              <Text style={styles.quickBidValue}>{formatAuctionMoney(item.value, currency)}</Text>
            </Pressable>
          ))}
        </View>
        <Input label="Tu oferta" value={amount} keyboardType="number-pad" onChangeText={setAmount} />
        {hasInvalidAmount ? <Body muted>Ingresá un monto numérico válido.</Body> : null}
        {isBelowMinimum ? <Body muted>La puja mínima es {formatAuctionMoney(data.minBid, currency)}.</Body> : null}
        {isAboveMaximum ? <Body muted>El monto supera el máximo general. Si tu categoría lo permite, el sistema validará la operación.</Body> : null}
        {usablePayments.length ? usablePayments.map((payment) => (
          <Pressable key={payment.id} onPress={() => setPaymentId(payment.id)}>
            <PaymentMethodCard payment={payment} selected={paymentId === payment.id} />
          </Pressable>
        )) : (
          <>
            <StatusState icon="card-outline" title="Medio de pago pendiente" message="No podés pujar hasta contar con un medio aprobado para operar." tone="yellow" actionLabel="Agregar medio de pago" onAction={() => router.push('/profile/payments')} />
          </>
        )}
        <Button
          label="Pujar ahora"
          disabled={!paymentId || !amount.trim() || !Number.isFinite(amountValue) || amountValue < data.minBid}
          onPress={() => router.push(`/live/${id}/confirm?amount=${encodeURIComponent(amount)}&paymentId=${encodeURIComponent(paymentId)}&itemId=${data.lot?.id}`)}
        />
      </Card>
      <SectionHeader title="Historial de pujas" subtitle="Últimas ofertas registradas" />
      <Card style={styles.historyCard}>
        {data.history.map((bid, index) => (
          <BidHistoryRow key={bid.id} bidder={bid.bidder} amount={bid.amount} timestamp={bid.timestamp} leader={index === 0} />
        ))}
      </Card>
      <Button label="Ver historial completo" variant="ghost" onPress={() => router.push(`/live/${id}/history?itemId=${data.lot?.id}`)} />
      <Button label="Actualizar estado" variant="ghost" onPress={() => refetch()} />
    </Screen>
  );
}

export function BidHistoryScreen() {
  const back = useSafeBack();
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId?: string }>();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bid-history', id, itemId],
    queryFn: () => auctionService.bidHistory(id, itemId ?? ''),
    enabled: !!itemId,
  });
  return (
    <Screen>
      <Header title="Historial de pujas" onBack={back} />
      {!itemId ? <EmptyState title="Sin lote seleccionado" message="Ingresa desde una subasta en vivo para consultar su historial." /> :
        isLoading ? <LoadingState /> :
          isError ? <ErrorState onRetry={() => refetch()} /> :
            data?.length ? data.map((bid, index) => (
              <Card key={bid.id} style={styles.historyCard}>
                <Badge label={index === 0 ? 'Oferta líder' : `Oferta ${index + 1}`} tone={index === 0 ? 'green' : 'purple'} />
                <Text style={styles.offer}>{formatCurrency(bid.amount)}</Text>
                <Body muted>{bid.bidder} - {bid.timestamp}</Body>
              </Card>
            )) : <EmptyState title="Sin pujas registradas" message="Todavía no se realizaron ofertas para este lote." />}
    </Screen>
  );
}

export function ConfirmBidScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const queryClient = useQueryClient();
  const { id, amount, paymentId, itemId } = useLocalSearchParams<{ id: string; amount?: string; paymentId?: string; itemId?: string }>();
  const { data: payments, isLoading } = useQuery({ queryKey: ['payments'], queryFn: paymentService.list });
  const { data: auction, isLoading: loadingAuction } = useQuery({ queryKey: ['auction', id], queryFn: () => auctionService.get(id), enabled: !!id });
  const { data: live, isLoading: loadingLive } = useQuery({ queryKey: ['live', id], queryFn: () => auctionService.live(id), enabled: !!id });
  const [accepted, setAccepted] = useState(false);
  const payment = payments?.find((method) => method.id === paymentId);
  const amountValue = Number(amount);
  const hasInvalidAmount = !Number.isFinite(amountValue);
  const belowCurrentMinimum = live ? amountValue < live.minBid : false;
  const currency = auction?.currency ?? 'ARS';
  const mutation = useMutation({
    mutationFn: () => auctionService.bid(id, Number(amount), paymentId ?? ''),
    onSuccess: () => {
      setAccepted(true);
      queryClient.invalidateQueries({ queryKey: ['live', id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
  if (isLoading || loadingAuction || loadingLive) return <Screen><LoadingState /></Screen>;
  if (!amount || !paymentId || !payment) return <Screen><Header title="Confirmar puja" onBack={back} /><EmptyState title="Puja incompleta" message="Seleccioná monto y medio de pago desde la subasta en vivo." /></Screen>;
  const bidError = mutation.error instanceof ApiError ? mutation.error : undefined;
  const restricted = bidError?.status === 403;
  const restrictionMessage = bidError?.message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';
  const insufficientCategory = restricted && restrictionMessage.includes('categoria');
  return (
    <Screen>
      <Header title="Confirmar puja" onBack={back} />
      <Title>{accepted ? 'Puja aceptada' : 'Revisa tu oferta'}</Title>
      <Card style={accepted ? styles.bidAccepted : styles.bidPanel}>
        <StatusState
          icon={accepted ? 'checkmark-circle-outline' : 'warning-outline'}
          title={accepted ? 'Oferta confirmada' : 'Estás por confirmar una puja'}
          message={accepted ? 'La puja quedó registrada correctamente.' : 'Revisá monto y medio de pago antes de enviar.'}
          tone={accepted ? 'green' : 'purple'}
        />
        <Body muted>Monto de tu oferta</Body>
        <Text style={styles.offer}>{formatAuctionMoney(amountValue, currency)}</Text>
        {belowCurrentMinimum ? <Body muted>La puja mínima actual es {formatAuctionMoney(live?.minBid ?? 0, currency)}. Volvé a la subasta en vivo para elegir otro monto.</Body> : null}
        <PaymentMethodCard payment={payment} selected />
        <Divider />
        <SecurityNote text="Confirmar una puja genera una obligación de compra según las condiciones de la subasta." />
      </Card>
      {mutation.isError ? (
        <StatusState
          icon="alert-circle-outline"
          title={insufficientCategory ? 'No podés pujar' : restricted ? 'No podés ofertar en este lote' : 'No pudimos registrar la oferta'}
          message={insufficientCategory ? 'Todavía no contás con una categoría suficiente para participar en esta subasta.' : errorToUserMessage(mutation.error, 'La puja fue rechazada.')}
          tone="red"
          actionLabel={restricted && !insufficientCategory ? 'Ver estado de cuenta' : undefined}
          onAction={() => router.push('/profile/account-status')}
        />
      ) : null}
      {!accepted ? <Button label={mutation.isPending ? 'Enviando...' : 'Confirmar puja'} disabled={mutation.isPending || hasInvalidAmount || belowCurrentMinimum} onPress={() => mutation.mutate()} /> : (
        <>
          <Button label="Volver a la subasta en vivo" onPress={() => router.replace(`/live/${id}`)} />
          {itemId ? <Button label="Consultar resultado luego" variant="secondary" onPress={() => router.push({ pathname: '/result/[id]', params: { id, itemId } })} /> : null}
        </>
      )}
    </Screen>
  );
}

export function ResultScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId?: string }>();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['result', id, itemId], queryFn: () => auctionService.result(id, itemId ?? ''), enabled: !!itemId });
  if (!itemId) return <Screen><Header title="Resultado" onBack={back} /><EmptyState title="Resultado no disponible" message="Abrí el resultado desde una subasta finalizada." /></Screen>;
  if (isLoading) return <Screen><LoadingState /></Screen>;
  if (isError || !data) return <Screen><Header title="Resultado" onBack={back} /><ErrorState onRetry={() => refetch()} /></Screen>;
  if (data.status === 'en_curso') return <Screen><Header title="Resultado" onBack={back} /><EmptyState title="Subasta en curso" message="Todavía no se declaró un resultado para este lote." /></Screen>;
  return (
    <Screen style={styles.result}>
      <StatusState
        icon={data.won ? 'trophy-outline' : 'time-outline'}
        title={data.won ? 'Ganaste la subasta' : 'La subasta finalizó'}
        message={data.won ? 'Consulta el pago y la entrega en Mis compras.' : 'Tu oferta no resultó ganadora.'}
        tone={data.won ? 'green' : 'purple'}
      />
      <Body muted>{data.lotName}</Body>
      {data.won ? <Card style={styles.total}>
        <ResultLine label="Monto abonado" value={data.finalAmount != null ? formatCurrency(data.finalAmount) : 'A confirmar'} />
        <ResultLine label="Medio de pago" value={data.paymentMethod ?? 'Ver en Mis compras'} />
        <ResultLine label="Fecha" value={data.date ?? 'A confirmar'} />
      </Card> : data.finalAmount != null ? <Text style={styles.resultItem}>{formatCurrency(data.finalAmount)}</Text> : null}
      {data.won ? <Button label="Ir a Mis compras" onPress={() => router.push('/purchases')} /> : null}
      <Button label="Seguir participando en la subasta" variant="secondary" onPress={() => router.replace(`/live/${id}`)} />
    </Screen>
  );
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultLine}>
      <Body muted>{label}</Body>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

export function AuctionFiltersScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const [status, setStatus] = useState('Todas');
  const [category, setCategory] = useState('Todas');
  const [currency, setCurrency] = useState('Todas');
  return (
    <Screen>
      <Header title="Filtros" onBack={back} />
      <Title>Filtrar subastas</Title>
      <Body muted>Seleccioná estado, categoría y moneda para encontrar subastas disponibles.</Body>
      <SectionLabel>Estado</SectionLabel>
      <View style={styles.chips}>{['Todas', 'En vivo', 'Próximas'].map((item) => <Chip key={item} label={item} active={status === item} onPress={() => setStatus(item)} />)}</View>
      <SectionLabel>Categoría</SectionLabel>
      <View style={styles.chips}>{['Todas', 'Oro', 'Platino', 'Plata', 'Especial', 'Común', 'Otro'].map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</View>
      <SectionLabel>Moneda</SectionLabel>
      <View style={styles.chips}>{['USD', 'ARS'].map((item) => <Chip key={item} label={item} active={currency === item} onPress={() => setCurrency(item)} />)}</View>
      <Button label="Aplicar filtros" onPress={() => router.replace({ pathname: '/(tabs)/auctions', params: { status, category, currency } })} />
      <Button label="Limpiar todo" variant="ghost" onPress={() => { setStatus('Todas'); setCategory('Todas'); setCurrency('Todas'); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  homeHero: { gap: spacing.lg, backgroundColor: colors.surfaceAlt, borderColor: colors.primaryBorder },
  heroHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  heroMark: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroHeaderCopy: { flex: 1, gap: spacing.xs },
  homeHeroTitle: { color: colors.textStrong, fontSize: typography.headline, lineHeight: 28, fontFamily: fonts.black },
  homeHeroBody: { color: colors.textMuted, fontSize: typography.bodySmall, lineHeight: 20, fontFamily: fonts.regular },
  exploreHero: { minHeight: 96, borderRadius: radius.lg, padding: spacing.lg, backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroTitle: { fontSize: typography.heading, color: '#FFF', fontFamily: fonts.bold },
  heroBody: { fontSize: typography.small, color: '#D7D0FF', fontFamily: fonts.regular },
  quickHero: { minHeight: 92, borderRadius: radius.lg, padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primaryBorder, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sellTitle: { fontSize: typography.heading, color: colors.text, fontFamily: fonts.bold },
  heroBodyDark: { fontSize: typography.small, color: colors.textMuted, fontFamily: fonts.regular },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detailHero: { backgroundColor: colors.surface, borderColor: colors.primaryBorder },
  detailHeroTop: { gap: spacing.xs },
  infoRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  infoRowIcon: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  infoRowCopy: { flex: 1 },
  meta: { color: colors.textMuted, fontSize: typography.caption, fontFamily: fonts.regular },
  infoValue: { color: colors.text, fontSize: typography.body, fontFamily: fonts.medium },
  bigNumber: { color: colors.primary, fontSize: 28, fontFamily: fonts.black },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  priceCard: { backgroundColor: colors.primarySoft },
  metricCard: { backgroundColor: colors.surfaceAlt },
  price: { fontSize: typography.body, color: colors.text, fontFamily: fonts.black },
  priceSmall: { fontSize: typography.caption, color: colors.primaryDark, fontFamily: fonts.bold },
  liveBannerCard: { backgroundColor: colors.surface, borderColor: colors.dangerSoft },
  liveBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#F7C9C9' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  liveText: { color: colors.danger, fontFamily: fonts.black, flex: 1 },
  timer: { color: colors.danger, fontFamily: fonts.black },
  liveTitle: { color: colors.textStrong, fontSize: typography.heading, fontFamily: fonts.black },
  bidPanel: { backgroundColor: colors.surface, borderColor: colors.primaryBorder },
  restricted: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  bidAccepted: { backgroundColor: colors.successSoft, alignItems: 'center' },
  historyCard: { gap: spacing.sm },
  offer: { color: colors.primaryDark, fontFamily: fonts.black, fontSize: typography.title },
  sectionHeading: { color: colors.text, fontFamily: fonts.bold, fontSize: typography.heading },
  bidRow: { borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  bidRowCopy: { flex: 1, gap: 2 },
  bidRowAmount: { alignItems: 'flex-end', gap: spacing.xs },
  result: { alignItems: 'center', paddingTop: 54 },
  congrats: { color: colors.text, fontFamily: fonts.black, fontSize: 28, textAlign: 'center' },
  resultItem: { color: colors.primary, fontFamily: fonts.bold, fontSize: typography.heading },
  total: { alignSelf: 'stretch' },
  resultLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  resultValue: { color: colors.text, fontFamily: fonts.bold, fontSize: typography.body, textAlign: 'right' },
  quickBids: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickBid: { minWidth: '46%', flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder },
  quickBidLabel: { color: colors.primary, fontFamily: fonts.black, fontSize: typography.caption },
  quickBidValue: { color: colors.primaryDark, fontFamily: fonts.bold, fontSize: 10 },
});



