import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Body, Card } from '@/components/ui/primitives';
import { LotImageCarousel } from '@/components/domain/LotImageCarousel';
import { colors, fonts, radius, shadow, spacing, typography } from '@/constants/theme';
import type { Auction, Lot, PaymentMethod, Purchase } from '@/types/domain';

const formatMoney = (value: number) => `USD ${value.toLocaleString('es-AR')}`;

export function AuctionCard({ auction, onPress }: { auction: Auction; onPress: () => void }) {
  const tone = auction.status === 'En vivo' ? 'green' : auction.status === 'Finalizada' ? 'red' : 'purple';
  return (
    <Pressable onPress={onPress}>
      <Card style={[styles.card, auction.status === 'En vivo' && styles.liveCard]}>
        <View style={styles.cardHero}>
          <View style={styles.heroIcon}><Ionicons name="hammer-outline" size={24} color={colors.primary} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{auction.category}</Text>
            <Text style={styles.cardTitle}>{auction.name}</Text>
            <Text style={styles.meta}>{auction.auctioneer}</Text>
          </View>
          <Badge label={auction.status} tone={tone} />
        </View>
        <View style={styles.auctionMetaGrid}>
          <MetaPill icon="calendar-outline" value={auction.date} />
          <MetaPill icon="location-outline" value={auction.location} />
          <MetaPill icon="cash-outline" value={auction.currency} />
          <MetaPill icon="albums-outline" value={`${auction.totalLots} lotes`} />
        </View>
        {auction.status === 'En vivo' ? <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>Pujando ahora</Text></View> : null}
        <View style={styles.cardFooter}>
          <Text style={styles.meta}>{auction.status === 'En vivo' ? 'Participá en tiempo real' : 'Ver detalle de la subasta'}</Text>
          <View style={styles.forward}>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function MetaPill({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={styles.meta} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function LotCard({ lot, onPress }: { lot: Lot; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.lotCard}>
      <View style={styles.lotMedia}>
        <LotImageCarousel images={lot.images?.length ? lot.images : lot.image ? [lot.image] : undefined} title={lot.title} height={180} />
        <View style={styles.lotBadgeWrap}><Badge label={`Lote ${lot.lotNumber}`} tone={lot.status?.toLowerCase() === 'vendido' || lot.status?.toLowerCase() === 'subastado' ? 'red' : 'purple'} /></View>
      </View>
      <View style={styles.lotCopy}>
        <Text numberOfLines={2} style={styles.lotTitle}>{lot.title}</Text>
        <Text numberOfLines={2} style={styles.meta}>{lot.description}</Text>
        <Text style={styles.meta}>Estado: {lot.status ?? 'disponible'}</Text>
        <Text style={styles.price}>{formatMoney(lot.basePrice)}</Text>
      </View>
    </Pressable>
  );
}

export function PaymentMethodCard({ payment, selected }: { payment: PaymentMethod; selected?: boolean }) {
  return (
    <Card style={[styles.payment, selected && styles.selected]}>
      <View style={styles.paymentIcon}>
        <Ionicons name={payment.type === 'Tarjeta' ? 'card-outline' : 'wallet-outline'} size={22} color={colors.primary} />
      </View>
      <View style={styles.grow}>
        <Text style={styles.cardTitle}>{payment.label}</Text>
        <Text style={styles.meta}>{payment.detail}</Text>
        {payment.availableAmount != null ? <Text style={styles.priceSmall}>{formatMoney(payment.availableAmount)}</Text> : null}
      </View>
      <View style={styles.paymentStatus}>
        <Badge label={payment.verified ? 'Verificado' : 'Pendiente'} tone={payment.verified ? 'green' : 'yellow'} />
        {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
      </View>
    </Card>
  );
}

export function PurchaseCard({ purchase, onPress }: { purchase: Purchase; onPress: () => void }) {
  const paymentTone = purchase.paymentStatus.toLowerCase() === 'pagado' ? 'green' : 'yellow';
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.purchaseCard}>
        <View style={styles.rowBetween}>
          <View style={styles.grow}>
            <Text style={styles.cardTitle}>{purchase.lot.title}</Text>
            <Text style={styles.meta}>{purchase.auctionName ?? 'Subasta'}</Text>
          </View>
          <Badge label={purchase.paymentStatus} tone={paymentTone} />
        </View>
        <Text style={styles.price}>{formatMoney(purchase.total ?? purchase.amount + purchase.fee)}</Text>
        <View style={styles.purchaseSummary}>
          <MetaPill icon="cash-outline" value={formatMoney(purchase.amount)} />
          <MetaPill icon="receipt-outline" value={formatMoney(purchase.fee)} />
        </View>
        <View style={styles.cardFooter}>
          <Body muted>{purchase.deliveryStatus}</Body>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </Card>
    </Pressable>
  );
}

export function formatCurrency(amount: number) {
  return formatMoney(amount);
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  liveCard: { borderColor: colors.primaryBorder, backgroundColor: colors.surface },
  cardHero: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroIcon: { width: 46, height: 46, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, gap: 2 },
  eyebrow: { color: colors.primary, fontSize: typography.caption, fontFamily: fonts.black, textTransform: 'uppercase' },
  cardTitle: { fontSize: typography.heading, lineHeight: 23, fontFamily: fonts.bold, color: colors.textStrong, flexShrink: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  auctionMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaPill: { maxWidth: '48%', minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meta: { color: colors.textMuted, fontSize: typography.bodySmall, fontFamily: fonts.regular },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  forward: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  lotCard: { flex: 1, minWidth: '46%', overflow: 'hidden', borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface, ...shadow },
  lotMedia: { position: 'relative' },
  lotBadgeWrap: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  lotCopy: { padding: spacing.md, gap: spacing.xs },
  lotTitle: { fontSize: typography.body, lineHeight: 20, color: colors.textStrong, fontFamily: fonts.bold },
  price: { fontSize: typography.body, fontFamily: fonts.black, color: colors.primaryDark },
  priceSmall: { fontSize: typography.caption, fontFamily: fonts.bold, color: colors.primaryDark },
  payment: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  paymentStatus: { alignItems: 'flex-end', gap: spacing.xs },
  purchaseCard: { gap: spacing.md },
  purchaseSummary: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  paymentIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: spacing.xs },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: '#F7C9C9' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  liveText: { color: colors.danger, fontSize: typography.caption, fontFamily: fonts.black },
});
