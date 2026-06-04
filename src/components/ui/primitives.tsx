import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandWordmark } from '@/components/brand/logo';
import { colors, deepShadow, fonts, radius, shadow, spacing, typography, MaxContentWidth } from '@/constants/theme';
import { normalizeServerMessage } from '@/services/errors';

const buttonIconColors = {
  primary: '#FFF',
  secondary: colors.primary,
  ghost: colors.primary,
  danger: '#FFF',
  success: '#FFF',
  dark: '#FFF',
} as const;

export function Screen({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  bottomInset = 0,
}: PropsWithChildren<{ scroll?: boolean; style?: StyleProp<ViewStyle>; contentContainerStyle?: StyleProp<ViewStyle>; bottomInset?: number }>) {
  const content = <View style={[styles.content, style]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xl + bottomInset }, contentContainerStyle]} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Volver">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
      ) : (
        <BrandWordmark compact />
      )}
      <View style={styles.headerCopy}>
        {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtle}>{subtitle}</Text> : null}
      </View>
      {right ?? <View style={styles.headerSpacer} />}
    </View>
  );
}

export function Title({ children }: PropsWithChildren) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) {
  return <Text style={[styles.body, muted && styles.bodyMuted]}>{children}</Text>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        styles[`button_${size}`],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {icon ? <Ionicons name={icon} size={17} color={buttonIconColors[variant]} /> : null}
      <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{label}</Text>
      {iconRight ? <Ionicons name={iconRight} size={17} color={buttonIconColors[variant]} /> : null}
    </Pressable>
  );
}

export function Input({ label, error, style, multiline, right, ...props }: TextInputProps & { label?: string; error?: string; right?: ReactNode }) {
  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      {right ? (
        <View style={[styles.inputWithAction, error && styles.inputError]}>
          <TextInput
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.inputWithActionField, multiline && styles.inputMultiline, style]}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            {...props}
          />
          {right}
        </View>
      ) : (
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, multiline && styles.inputMultiline, error && styles.inputError, style]}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function SelectInput({
  label,
  value,
  placeholder = 'Seleccionar',
  onPress,
  error,
  helperText,
}: {
  label?: string;
  value?: string;
  placeholder?: string;
  onPress?: () => void;
  error?: string;
  helperText?: string;
}) {
  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <Pressable onPress={onPress} style={[styles.selectInput, error && styles.inputError]}>
        <Text style={[styles.selectInputText, !value && styles.selectInputPlaceholder]}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {helperText ? <Text style={styles.selectHelper}>{helperText}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function SearchInput(props: TextInputProps) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={18} color={colors.textMuted} />
      <TextInput placeholderTextColor={colors.textMuted} style={styles.searchField} placeholder="Buscar subastas, lotes, obras..." {...props} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'purple' }: { label: string; tone?: 'purple' | 'green' | 'red' | 'yellow' | 'dark' }) {
  return (
    <View style={[styles.badge, styles[`badge_${tone}`]]}>
      <Text style={[styles.badgeText, styles[`badgeText_${tone}`]]}>{label}</Text>
    </View>
  );
}

export function SectionLabel({ children }: PropsWithChildren) {
  return <Text style={styles.sectionLabelText}>{children}</Text>;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? <Button label={actionLabel} variant="ghost" size="sm" onPress={onAction} /> : null}
    </View>
  );
}

export function IconButton({ icon, onPress, tone = 'neutral', accessibilityLabel }: { icon: keyof typeof Ionicons.glyphMap; onPress?: () => void; tone?: 'neutral' | 'primary' | 'danger'; accessibilityLabel: string }) {
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.iconButton, styles[`iconButton_${tone}`], pressed && styles.pressed]}>
      <Ionicons name={icon} size={18} color={tone === 'primary' ? colors.primary : tone === 'danger' ? colors.danger : colors.text} />
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function SkeletonBlock({ height = 16, width = '100%', radius: borderRadius }: { height?: number; width?: number | `${number}%` | '100%'; radius?: number }) {
  return <View style={[styles.skeleton, { height, width, borderRadius: borderRadius ?? 999 }]} />;
}

export function ListItem({ icon, title, description, right, onPress }: { icon?: keyof typeof Ionicons.glyphMap; title: string; description?: string; right?: ReactNode; onPress?: () => void }) {
  const content = (
    <>
      {icon ? <View style={styles.listItemIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View> : null}
      <View style={styles.listItemCopy}>
        <Text style={styles.listItemTitle}>{title}</Text>
        {description ? <Text style={styles.listItemDescription}>{description}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.listItem, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.listItem}>{content}</View>;
}

export function SecurityNote({ text }: { text: string }) {
  return (
    <View style={styles.securityNote}>
      <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
      <Text style={styles.securityNoteText}>{text}</Text>
    </View>
  );
}

export function InfoTile({ icon, label, value, tone = 'purple' }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone?: 'purple' | 'green' | 'red' | 'yellow' }) {
  return (
    <View style={[styles.infoTile, styles[`infoTile_${tone}`]]}>
      <Ionicons name={icon} size={19} color={tone === 'green' ? colors.success : tone === 'red' ? colors.danger : tone === 'yellow' ? colors.warning : colors.primary} />
      <View style={styles.infoTileCopy}>
        <Text style={styles.infoTileLabel}>{label}</Text>
        <Text style={styles.infoTileValue}>{value}</Text>
      </View>
    </View>
  );
}

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={styles.stepWrap}>
      {steps.map((step, index) => {
        const active = index <= current;
        return (
          <View style={styles.stepItem} key={step}>
            <View style={[styles.stepDot, active && styles.stepDotActive]}>
              <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{index + 1}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.stepLabel, active && styles.stepLabelActive]}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function UploadBox({ label, description, done, icon = 'cloud-upload-outline', onPress }: { label: string; description?: string; done?: boolean; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.uploadBox, done && styles.uploadBoxDone]}>
      <Ionicons name={done ? 'checkmark-circle' : icon} size={24} color={done ? colors.success : colors.primary} />
      <Text style={styles.uploadBoxTitle}>{label}</Text>
      {description ? <Text style={styles.uploadBoxDescription}>{description}</Text> : null}
    </Pressable>
  );
}

export function StatusPanel({ icon, title, message, tone = 'purple' }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; tone?: 'purple' | 'green' | 'red' | 'yellow' }) {
  return (
    <Card style={[styles.statusPanel, styles[`statusState_${tone}`]]}>
      <View style={[styles.stateIcon, tone === 'red' && styles.errorIcon, tone === 'green' && styles.successIcon, tone === 'yellow' && styles.warningIcon]}>
        <Ionicons name={icon} size={25} color={tone === 'green' ? colors.success : tone === 'red' ? colors.danger : tone === 'yellow' ? colors.warning : colors.primary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Body muted>{message}</Body>
    </Card>
  );
}

export function ActionRow({ icon, label, description, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; description?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.actionRow}>
        <View style={styles.actionIcon}><Ionicons name={icon} size={22} color={colors.primary} /></View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionLabel}>{label}</Text>
          {description ? <Text style={styles.actionDescription}>{description}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

export function LoadingState() {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} />
      <Body muted>Cargando información...</Body>
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <Card style={styles.state}>
      <View style={styles.stateIcon}>
        <Ionicons name="albums-outline" size={24} color={colors.primary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Body muted>{message}</Body>
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Card style={styles.state}>
      <View style={[styles.stateIcon, styles.errorIcon]}>
        <Ionicons name="cloud-offline-outline" size={25} color={colors.danger} />
      </View>
      <Text style={styles.sectionTitle}>No pudimos cargar la información</Text>
      <Body muted>{normalizeServerMessage(message ?? 'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá nuevamente.')}</Body>
      {onRetry ? <Button label="Reintentar" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

export function StatusState({ icon, title, message, tone = 'purple', actionLabel, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; tone?: 'purple' | 'green' | 'red' | 'yellow'; actionLabel?: string; onAction?: () => void }) {
  return (
    <Card style={[styles.statusState, styles[`statusState_${tone}`]]}>
      <View style={[styles.stateIcon, styles[`stateIcon_${tone}`]]}>
        <Ionicons name={icon} size={25} color={tone === 'green' ? colors.success : tone === 'red' ? colors.danger : tone === 'yellow' ? colors.warning : colors.primary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Body muted>{message}</Body>
      {actionLabel ? <Button label={actionLabel} variant={tone === 'red' ? 'danger' : 'secondary'} onPress={onAction} /> : null}
    </Card>
  );
}

export function AuthRequiredModal({ visible, onClose, onLogin, onRegister }: { visible: boolean; onClose: () => void; onLogin: () => void; onRegister: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Card style={styles.modalCard}>
          <Ionicons name="lock-closed-outline" size={30} color={colors.primary} />
          <Title>Iniciá sesión</Title>
          <Body muted>Necesitas una cuenta para pujar, vender productos o gestionar compras.</Body>
          <Button label="Iniciar sesión" onPress={onLogin} />
          <Button label="Crear cuenta" variant="secondary" onPress={onRegister} />
          <Button label="Ahora no" variant="ghost" onPress={onClose} />
        </Card>
      </View>
    </Modal>
  );
}

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  pending,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  pending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Card style={styles.modalCard}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.primary} />
          <Title>{title}</Title>
          <Body muted>{message}</Body>
          <Button label={pending ? 'Procesando...' : confirmLabel} variant="danger" disabled={pending} onPress={onConfirm} />
          <Button label="Cancelar" variant="ghost" disabled={pending} onPress={onClose} />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, alignItems: 'center' },
  content: { flex: 1, width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: spacing.md },
  iconButton: { height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow },
  iconButton_neutral: {},
  iconButton_primary: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  iconButton_danger: { backgroundColor: colors.dangerSoft, borderColor: '#F7C9C9' },
  headerCopy: { flex: 1, gap: 2 },
  headerSpacer: { width: 40 },
  headerTitle: { fontSize: typography.heading, fontFamily: fonts.black, color: colors.textStrong },
  title: { color: colors.textStrong, fontSize: typography.title, lineHeight: 32, fontFamily: fonts.black },
  body: { fontSize: typography.body, lineHeight: 24, color: colors.textVariant, fontFamily: fonts.regular },
  bodyMuted: { color: colors.textMuted },
  subtle: { color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow },
  button: { minHeight: 48, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, overflow: 'hidden' },
  button_primary: { backgroundColor: colors.primary, ...deepShadow },
  button_secondary: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder },
  button_ghost: { backgroundColor: 'transparent' },
  button_danger: { backgroundColor: colors.danger },
  button_success: { backgroundColor: colors.success },
  button_dark: { backgroundColor: colors.primaryDark, ...deepShadow },
  button_sm: { minHeight: 40, paddingHorizontal: spacing.md },
  button_md: { minHeight: 48 },
  button_lg: { minHeight: 56, paddingHorizontal: spacing.xl },
  buttonText: { fontSize: typography.label, fontFamily: fonts.bold },
  buttonText_primary: { color: '#FFF' },
  buttonText_secondary: { color: colors.primary },
  buttonText_ghost: { color: colors.primary },
  buttonText_danger: { color: '#FFF' },
  buttonText_success: { color: '#FFF' },
  buttonText_dark: { color: '#FFF' },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.45 },
  inputWrap: { gap: spacing.xs },
  inputLabel: { fontSize: typography.label, color: colors.textMuted, fontFamily: fonts.bold },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.surface, fontFamily: fonts.regular },
  inputWithAction: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingRight: spacing.xs, backgroundColor: colors.surface },
  inputWithActionField: { flex: 1, borderWidth: 0, backgroundColor: 'transparent' },
  inputMultiline: { minHeight: 110, paddingTop: spacing.md },
  inputError: { borderColor: colors.danger },
  selectInput: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  selectInputText: { flex: 1, color: colors.text, fontFamily: fonts.regular },
  selectInputPlaceholder: { color: colors.textMuted },
  selectHelper: { color: colors.textMuted, fontSize: typography.caption, fontFamily: fonts.regular },
  errorText: { color: colors.danger, fontSize: typography.label, fontFamily: fonts.regular },
  search: { backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, minHeight: 56, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadow },
  searchField: { flex: 1, color: colors.text, fontFamily: fonts.regular },
  chip: { borderRadius: radius.pill, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  chipText: { fontSize: typography.bodySmall, color: colors.textMuted, fontFamily: fonts.medium },
  chipTextActive: { color: colors.primary },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: 'transparent' },
  badge_purple: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  badge_green: { backgroundColor: colors.successSoft, borderColor: '#C9EED5' },
  badge_red: { backgroundColor: colors.dangerSoft, borderColor: '#F7C9C9' },
  badge_yellow: { backgroundColor: colors.warningSoft, borderColor: '#F1DBA8' },
  badge_dark: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  badgeText: { fontSize: typography.caption, fontFamily: fonts.bold },
  badgeText_purple: { color: colors.primary },
  badgeText_green: { color: colors.success },
  badgeText_red: { color: colors.danger },
  badgeText_yellow: { color: colors.warning },
  badgeText_dark: { color: '#FFF' },
  sectionLabelText: { color: colors.textMuted, fontSize: typography.label, fontFamily: fonts.black, textTransform: 'uppercase', marginTop: spacing.xs, letterSpacing: 0.6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  sectionHeaderCopy: { flex: 1, gap: 2 },
  sectionHeaderTitle: { color: colors.textStrong, fontSize: typography.headline, lineHeight: 28, fontFamily: fonts.black },
  sectionHeaderSubtitle: { color: colors.textMuted, fontSize: typography.bodySmall, lineHeight: 20, fontFamily: fonts.regular },
  infoTile: { flex: 1, minWidth: '47%', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  infoTile_purple: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  infoTile_green: { backgroundColor: colors.successSoft, borderColor: '#C9EED5' },
  infoTile_red: { backgroundColor: colors.dangerSoft, borderColor: '#F7C9C9' },
  infoTile_yellow: { backgroundColor: colors.warningSoft, borderColor: '#F1DBA8' },
  infoTileCopy: { flex: 1, gap: 2 },
  infoTileLabel: { color: colors.textMuted, fontSize: typography.caption, fontFamily: fonts.medium },
  infoTileValue: { color: colors.textStrong, fontSize: typography.bodySmall, fontFamily: fonts.bold },
  stepWrap: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  stepItem: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  stepDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  stepDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepNumber: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: typography.small },
  stepNumberActive: { color: '#FFF' },
  stepLabel: { color: colors.textMuted, fontSize: typography.caption, fontFamily: fonts.regular },
  stepLabelActive: { color: colors.primary, fontFamily: fonts.bold },
  uploadBox: { flex: 1, minHeight: 110, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primaryBorder, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.md },
  uploadBoxDone: { backgroundColor: colors.successSoft, borderColor: '#C9EED5', borderStyle: 'solid' },
  uploadBoxTitle: { color: colors.textStrong, fontFamily: fonts.bold, fontSize: typography.bodySmall, textAlign: 'center' },
  uploadBoxDescription: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: typography.caption, textAlign: 'center' },
  statusPanel: { alignItems: 'center', textAlign: 'center' },
  statusState: { alignItems: 'center', textAlign: 'center' },
  statusState_purple: { backgroundColor: colors.surface },
  statusState_green: { backgroundColor: colors.successSoft, borderColor: '#C9EED5' },
  statusState_red: { backgroundColor: colors.dangerSoft, borderColor: '#F7C9C9' },
  statusState_yellow: { backgroundColor: colors.warningSoft, borderColor: '#F1DBA8' },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  actionIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, gap: spacing.xs },
  actionLabel: { color: colors.textStrong, fontSize: typography.body, fontFamily: fonts.bold },
  actionDescription: { color: colors.textMuted, fontSize: typography.bodySmall, fontFamily: fonts.regular },
  state: { alignItems: 'center', justifyContent: 'center', minHeight: 170, gap: spacing.sm },
  stateIcon: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stateIcon_purple: { backgroundColor: colors.primarySoft },
  stateIcon_green: { backgroundColor: colors.successSoft },
  stateIcon_red: { backgroundColor: colors.dangerSoft },
  stateIcon_yellow: { backgroundColor: colors.warningSoft },
  errorIcon: { backgroundColor: colors.dangerSoft },
  successIcon: { backgroundColor: colors.successSoft },
  warningIcon: { backgroundColor: colors.warningSoft },
  sectionTitle: { color: colors.textStrong, fontSize: typography.heading, fontFamily: fonts.bold, textAlign: 'center' },
  divider: { height: 1, width: '100%', backgroundColor: colors.border },
  skeleton: { backgroundColor: colors.surfaceContainerHigh },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, ...shadow },
  listItemIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  listItemCopy: { flex: 1, gap: 2 },
  listItemTitle: { color: colors.textStrong, fontSize: typography.body, fontFamily: fonts.bold },
  listItemDescription: { color: colors.textMuted, fontSize: typography.bodySmall, fontFamily: fonts.regular },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder },
  securityNoteText: { flex: 1, color: colors.textVariant, fontSize: typography.bodySmall, lineHeight: 20, fontFamily: fonts.regular },
  overlay: { flex: 1, backgroundColor: 'rgba(17,17,23,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalCard: { width: '100%', maxWidth: 360, alignItems: 'center', gap: spacing.md },
});
