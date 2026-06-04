import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInUp, ZoomIn, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { z } from 'zod';

import { BrandIcon, BrandLogo, BrandWordmark } from '@/components/brand/logo';
import { ActionRow, Body, Button, Card, Header, IconButton, InfoTile, Input, Screen, SectionLabel, StatusPanel, StepIndicator, Title, UploadBox } from '@/components/ui/primitives';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useSession } from '@/providers/app-provider';
import { authService } from '@/services/api';
import { errorToUserMessage, getServerConnectionMessage } from '@/services/errors';
import { ApiError, ApiNetworkError } from '@/services/http';
import { explainFileAccess, permissionDeniedMessage, requestMediaLibraryPermission } from '@/services/permissions';
import type { FileUpload } from '@/types/domain';

const resendCooldownSeconds = 30;

function ErrorNotice({ message }: { message: string }) {
  return (
    <Card style={styles.errorCard}>
      <Text style={styles.error}>{message}</Text>
    </Card>
  );
}

const loginSchema = z.object({
  email: z.email('Ingresá un correo válido.'),
  password: z.string().min(6, 'Mínimo 6 caracteres.'),
});
const login2faSchema = z.object({
  code: z.string().min(4, 'Ingresá el código recibido.').max(8, 'Código demasiado largo.'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Ingresá tu nombre.'),
  surname: z.string().min(2, 'Ingresá tu apellido.'),
  email: z.email('Correo inválido.'),
  address: z.string().min(5, 'Ingresá tu domicilio.'),
  country: z.string().min(2, 'Ingresá tu país.'),
});

const verifySchema = z.object({ code: z.string().min(4, 'Ingresá el código recibido.') });
const passwordRegex = /^(?![0-9])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
const passwordSchema = z.object({
  password: z.string()
    .min(8, 'La contraseña debe tener mínimo 8 caracteres.')
    .regex(passwordRegex, 'La contraseña no cumple los requisitos de seguridad.'),
  confirmation: z.string().min(8, 'Confirmá tu contraseña.'),
}).refine((values) => values.password === values.confirmation, { path: ['confirmation'], message: 'Las contraseñas no coinciden.' });

const registrationSteps = ['Datos', 'Código', 'Clave', 'Pago'];

const forgotPasswordSchema = z.object({ email: z.email('Ingresá un correo valido.') });
const resetPasswordSchema = z.object({
  code: z.string().min(4, 'Ingresá el código recibido.'),
  password: z.string()
    .min(8, 'La contraseña debe tener mínimo 8 caracteres.')
    .regex(passwordRegex, 'La contraseña no cumple los requisitos de seguridad.'),
  confirmation: z.string().min(8, 'Confirma tu contraseña.'),
}).refine((values) => values.password === values.confirmation, { path: ['confirmation'], message: 'Las contraseñas no coinciden.' });

function getPasswordChecks(password: string) {
  return [
    { label: 'Mínimo 8 caracteres', valid: password.length >= 8 },
    { label: 'Al menos una letra mayúscula', valid: /[A-Z]/.test(password) },
    { label: 'Al menos un número', valid: /[0-9]/.test(password) },
    { label: 'Al menos un carácter especial', valid: /[^a-zA-Z0-9]/.test(password) },
    { label: 'No puede comenzar con un número', valid: password.length === 0 || !/^[0-9]/.test(password) },
  ];
}

function messageForAuthError(error: unknown, fallback: string) {
  if (error instanceof ApiNetworkError) return getServerConnectionMessage();
  return errorToUserMessage(error, fallback);
}

function messageForLoginError(error: unknown) {
  if (error instanceof ApiNetworkError) return getServerConnectionMessage();
  if (error instanceof ApiError && [400, 401, 404].includes(error.status)) return 'Email o contraseña incorrectos.';
  return 'Email o contraseña incorrectos.';
}

function confirmCancelRegistration(onConfirm: () => void) {
  const message = 'Esto eliminara tu registro pendiente y vas a poder registrarte nuevamente. Queres continuar?';
  if (Platform.OS === 'web') {
    if (globalThis.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Cancelar registro', message, [
    { text: 'No', style: 'cancel' },
    { text: 'Si, cancelar', style: 'destructive', onPress: onConfirm },
  ]);
}

export function SplashScreen() {
  const router = useRouter();
  const { loading, session } = useSession();
  const logoScale = useSharedValue(0.86);
  const logoOpacity = useSharedValue(0);
  const progress = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) });
    logoOpacity.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.quad) });
    progress.value = withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) });
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [float, logoOpacity, logoScale, progress]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => router.replace(session ? '/(tabs)' : '/welcome'), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, router, session]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [0, 180]),
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [-8, 8]) },
      { translateX: interpolate(float.value, [0, 1], [-5, 5]) },
      { scale: interpolate(float.value, [0, 1], [0.98, 1.04]) },
    ],
  }));

  return (
    <Screen scroll={false} style={styles.splashScreen}>
      <View style={styles.splashBackground}>
        <Animated.View style={[styles.splashGlow, styles.splashGlowTop, glowAnimatedStyle]} />
        <Animated.View style={[styles.splashGlow, styles.splashGlowBottom, glowAnimatedStyle]} />
        <View style={styles.splashRingOne} />
        <View style={styles.splashRingTwo} />

        <Animated.View entering={ZoomIn.duration(650).easing(Easing.out(Easing.cubic))} style={[styles.splashBrandBlock, logoAnimatedStyle]}>
          <View style={styles.splashLogoCircle}>
            <BrandIcon size={104} />
          </View>
          <View style={styles.splashTitleBlock}>
            <BrandWordmark />
          </View>
        </Animated.View>

        <Animated.View entering={SlideInUp.delay(250).duration(550)} style={styles.splashFeaturePill}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          <Text style={styles.splashFeatureText}>Catálogos verificados · Pujas en vivo</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(420).duration(500)} style={styles.splashProgressBlock}>
          <View style={styles.splashProgressTrack}>
            <Animated.View style={[styles.splashProgressFill, progressAnimatedStyle]} />
          </View>
          <Text style={styles.splashLoadingText}>Cargando experiencia segura...</Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

export function WelcomeScreen() {
  const router = useRouter();
  const { enterAsGuest } = useSession();
  return (
    <Screen style={styles.welcome}>
      <Card style={styles.welcomeHero}>
        <BrandLogo iconSize={88} />
        <View style={styles.centerCopy}>
          <Title>Descubrí objetos únicos</Title>
          <Body muted>Explorá subastas seleccionadas, pujás con respaldo operativo y gestionás tus compras desde un entorno seguro.</Body>
        </View>
        <View style={styles.tileRow}>
          <InfoTile icon="shield-checkmark-outline" label="Cuenta" value="Validación segura" />
          <InfoTile icon="hammer-outline" label="Subastas" value="Pujas en vivo" />
        </View>
      </Card>
      <Card style={styles.actionsCard}>
        <Button label="Iniciar sesión" onPress={() => router.push('/login')} />
        <Button label="Crear cuenta" variant="secondary" onPress={() => router.push('/register')} />
        <Button label="Continuar como invitado" variant="ghost" onPress={() => { enterAsGuest(); router.replace('/(tabs)'); }} />
      </Card>
    </Screen>
  );
}

export function LoginScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { enterAsGuest, signIn } = useSession();
  const [apiError, setApiError] = useState('');
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const submit = handleSubmit(async (values) => {
    try {
      setApiError('');
      const session = await authService.login(values.email, values.password);
      await signIn(session);
      router.replace((returnTo || '/(tabs)') as Href);
    } catch (error) {
      setApiError(messageForLoginError(error));
    }
  });
  return (
    <Screen>
      <Header title="Iniciar sesión" onBack={back} />
      <Card style={styles.formCard}>
        <Title>Bienvenido, qué bueno verte otra vez</Title>
        <StatusPanel icon="lock-closed-outline" title="Acceso seguro" message="Ingresá para pujar, vender bienes, revisar compras y administrar tus medios de pago." />
        <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
          <Input label="Correo electrónico" keyboardType="email-address" autoCapitalize="none" value={value} onChangeText={onChange} error={errors.email?.message} />
        )} />
        <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
          <Input label="Contraseña" secureTextEntry value={value} onChangeText={onChange} error={errors.password?.message} />
        )} />
        {apiError ? <ErrorNotice message={apiError} /> : null}
        <Button label={isSubmitting ? 'Ingresándo...' : 'Iniciar sesión'} disabled={isSubmitting} onPress={submit} />
        <Button label="¿No tienes una cuenta? Regístrate" variant="ghost" onPress={() => router.push({ pathname: '/register', params: { returnTo } })} />
        <Button label="Olvidaste tu contraseña?" variant="ghost" onPress={() => router.push('/forgot-password' as Href)} />
        <View style={styles.centerSeparator}><Body muted>O</Body></View>
        <Button label="Continúa como un invitado" variant="ghost" onPress={() => { enterAsGuest(); router.replace('/(tabs)'); }} />
      </Card>
    </Screen>
  );
}

export function LoginTwoFactorScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { challengeId, email, message, returnTo } = useLocalSearchParams<{ challengeId?: string; email?: string; message?: string; returnTo?: string }>();
  const { signIn } = useSession();
  const [currentChallengeId, setCurrentChallengeId] = useState(challengeId ?? '');
  const [currentEmail, setCurrentEmail] = useState(email ?? '');
  const [apiError, setApiError] = useState('');
  const [infoMessage, setInfoMessage] = useState(message ?? '');
  const [isResending, setIsResending] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof login2faSchema>>({
    resolver: zodResolver(login2faSchema),
    defaultValues: { code: '' },
  });
  const submit = handleSubmit(async ({ code }) => {
    if (!currentChallengeId) {
      setApiError('No se encontró el desafío de seguridad. Volvé a iniciar sesión.');
      return;
    }
    try {
      setApiError('');
      const session = await authService.verifyLogin2fa(currentChallengeId, code);
      await signIn(session);
      router.replace((returnTo || '/(tabs)') as Href);
    } catch (error) {
      setApiError(errorToUserMessage(error, 'Código inválido.'));
    }
  });
  async function resend() {
    if (!currentChallengeId) {
      setApiError('No se encontró el desafío de seguridad. Volvé a iniciar sesión.');
      return;
    }
    try {
      setApiError('');
      setIsResending(true);
      const response = await authService.resendLogin2fa(currentChallengeId);
      setCurrentChallengeId(response.challengeId);
      setCurrentEmail(response.email);
      setInfoMessage('Te enviamos un nuevo código. El código anterior ya no es válido.');
    } catch (error) {
      setApiError(errorToUserMessage(error, 'No fue posible reenviar el código.'));
    } finally {
      setIsResending(false);
    }
  }
  return (
    <Screen>
      <Header title="Verificación de acceso" onBack={back} />
      <Card style={styles.formCard}>
        <StatusPanel
          icon="mail-unread-outline"
          title="Revisá tu correo"
          message={`Enviamos un código de seguridad a ${currentEmail || 'tu correo'}. Ingresálo para completar el inicio de sesión.`}
          tone="green"
        />
        <Controller control={control} name="code" render={({ field }) => (
          <Input label="Código de verificación" placeholder="000000" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} error={errors.code?.message} />
        )} />
        {infoMessage ? <Card style={styles.infoCard}><Body>{infoMessage}</Body></Card> : null}
        {apiError ? <ErrorNotice message={apiError} /> : null}
        <Button label={isSubmitting ? 'Verificando...' : 'Verificar código'} disabled={isSubmitting || isResending} onPress={submit} />
        <Button label={isResending ? 'Reenviando...' : 'Reenviar código'} variant="secondary" disabled={isSubmitting || isResending} onPress={resend} />
        <Button label="Volver al login" variant="ghost" onPress={() => router.replace('/login')} />
      </Card>
    </Screen>
  );
}

export function RegisterScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { setRegistration } = useSession();
  const [front, setFront] = useState<FileUpload>();
  const [backImage, setBackImage] = useState<FileUpload>();
  const [apiError, setApiError] = useState('');
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', surname: '', email: '', address: '', country: 'Argentina' },
  });
  async function pick(side: 'front' | 'back') {
    try {
      setApiError('');
      explainFileAccess('photo');
      const granted = await requestMediaLibraryPermission();
      if (!granted) {
        setApiError(permissionDeniedMessage('gallery'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!result.canceled) {
        const asset = result.assets[0];
        const upload: FileUpload = {
          uri: asset.uri,
          name: asset.fileName ?? `dni-${side}-${Date.now()}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
          file: asset.file,
        };
        if (side === 'front') setFront(upload);
        else setBackImage(upload);
      }
    } catch {
      setApiError(permissionDeniedMessage('gallery'));
    }
  }
  const submit = handleSubmit(async (values) => {
    if (!front || !backImage) {
      setApiError('Adjunta frente y dorso del DNI.');
      return;
    }
    try {
      setApiError('');
      await authService.register({ ...values, front, back: backImage });
      setRegistration({ email: values.email, returnTo });
      router.push('/registration-pending' as Href);
    } catch (error) {
      setApiError(messageForAuthError(error, 'No pudimos completar el registro. Revisa tu conexion e intenta nuevamente.'));
    }
  });
  return (
    <Screen>
      <Header title="Crear cuenta" subtitle="Paso 1 de 4" onBack={goBack} />
      <Card style={styles.formCard}>
        <StepIndicator steps={registrationSteps} current={0} />
        <Title>Datos personales</Title>
        <Body muted>Usamos estos datos para validar tu identidad antes de habilitar pujas y operaciones de venta.</Body>
        <Controller control={control} name="name" render={({ field }) => <Input label="Nombre" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
        <Controller control={control} name="surname" render={({ field }) => <Input label="Apellido" value={field.value} onChangeText={field.onChange} error={errors.surname?.message} />} />
        <Controller control={control} name="email" render={({ field }) => <Input label="Mail" value={field.value} onChangeText={field.onChange} keyboardType="email-address" error={errors.email?.message} />} />
        <Controller control={control} name="address" render={({ field }) => <Input label="Domicilio legal" value={field.value} onChangeText={field.onChange} error={errors.address?.message} />} />
        <Controller control={control} name="country" render={({ field }) => <Input label="País de origen" value={field.value} onChangeText={field.onChange} error={errors.country?.message} />} />
        <SectionLabel>Documento de identidad</SectionLabel>
        <Body muted>Necesitamos abrir tu galeria para adjuntar frente y dorso del DNI. En computadora se abrira el selector de archivos.</Body>
        <View style={styles.uploadRow}>
          <UploadAction label="Frente" done={!!front} onPress={() => pick('front')} />
          <UploadAction label="Dorso" done={!!backImage} onPress={() => pick('back')} />
        </View>
        {apiError ? <ErrorNotice message={apiError} /> : null}
        <Button label={isSubmitting ? 'Enviando...' : 'Crear cuenta'} disabled={isSubmitting} onPress={submit} />
        <Button label="¿Ya tienes una cuenta? Iniciá sesión" variant="ghost" onPress={() => router.push({ pathname: '/login', params: { returnTo } })} />
      </Card>
    </Screen>
  );
}

function UploadAction({ label, done, onPress }: { label: string; done: boolean; onPress: () => void }) {
  return <UploadBox label={label} description={done ? 'Imagen cargada' : 'Subir foto'} done={done} icon="camera-outline" onPress={onPress} />;
}

export function RegistrationPendingScreen() {
  const router = useRouter();
  const { registration, setRegistration } = useSession();
  const [apiError, setApiError] = useState('');
  const [isCancelling, setCancelling] = useState(false);
  async function cancelRegistration() {
    if (!registration?.email) {
      setRegistration(null);
      router.replace('/register');
      return;
    }
    try {
      setApiError('');
      setCancelling(true);
      await authService.cancelPendingRegistration(registration.email);
      setRegistration(null);
      router.replace('/register');
    } catch (error) {
      setApiError(messageForAuthError(error, 'No fue posible cancelar el registro pendiente.'));
    } finally {
      setCancelling(false);
    }
  }
  return (
    <Screen style={styles.pending}>
      <Card style={styles.formCard}>
        <StatusPanel icon="mail-unread-outline" title="Solicitud enviada" message="Recibimos tus datos y las imágenes del DNI. Cuando tu cuenta sea aprobada, recibirás el código por correo." tone="green" />
        {registration?.email ? <Text style={styles.pendingEmail}>{registration.email}</Text> : null}
        {apiError ? <ErrorNotice message={apiError} /> : null}
        <Button label="Ya recibí mi código" onPress={() => router.push('/verify')} />
        <Button label={isCancelling ? 'Cancelando...' : 'Cancelar registro y empezar de nuevo'} variant="secondary" disabled={isCancelling} onPress={() => confirmCancelRegistration(cancelRegistration)} />
        <Button label="Volver al acceso" variant="ghost" onPress={() => router.replace('/welcome')} />
      </Card>
    </Screen>
  );
}

export function VerifyScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { registration, setRegistration } = useSession();
  const [apiError, setApiError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isResending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof verifySchema>>({
    resolver: zodResolver(verifySchema), defaultValues: { code: '' },
  });
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const submit = handleSubmit(async ({ code }) => {
    if (!registration?.email) {
      setApiError('Volvé a registro para indicar el correo.');
      return;
    }
    try {
      const response = await authService.verify(registration.email, code);
      setRegistration({ ...registration, verificationToken: response.token_verificacion });
      router.push('/password');
    } catch (error) {
      setApiError(errorToUserMessage(error, 'Código inválido.'));
    }
  });
  return (
    <Screen>
      <Header title="Verifica el código" subtitle="Paso 2 de 4" onBack={back} />
      <Card style={styles.formCard}>
        <StepIndicator steps={registrationSteps} current={1} />
        <StatusPanel icon="mail-outline" title="Código de verificación" message="Ingresá el código enviado por correo para continuar con la creación de tu cuenta." />
        {registration?.email ? <Text style={styles.pendingEmail}>{registration.email}</Text> : null}
        <Controller control={control} name="code" render={({ field }) => <Input label="Código de verificación" placeholder="0000" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} error={errors.code?.message} />} />
        {apiError ? <ErrorNotice message={apiError} /> : null}
        <Body muted>¿No recibiste el código?</Body>
        {infoMessage ? <Card style={styles.infoCard}><Body>{infoMessage}</Body></Card> : null}
        <Button
          label={isResending ? 'Reenviando...' : cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
          variant="secondary"
          disabled={isResending || cooldown > 0}
          onPress={async () => {
            if (!registration?.email) {
              setApiError('Volve a registro para indicar el correo.');
              return;
            }
            try {
              setApiError('');
              setInfoMessage('');
              setResending(true);
              await authService.resendRegistrationCode(registration.email);
              setInfoMessage('Te enviamos un nuevo código. El código anterior ya no es valido.');
              setCooldown(resendCooldownSeconds);
            } catch (error) {
              setApiError(messageForAuthError(error, 'No fue posible reenviar el código.'));
            } finally {
              setResending(false);
            }
          }}
        />
        <Button label={isSubmitting ? 'Verificando...' : 'Verificar'} disabled={isSubmitting || isResending} onPress={submit} />
        <Button label="Cancelar registro y empezar de nuevo" variant="ghost" onPress={() => confirmCancelRegistration(async () => {
          if (!registration?.email) {
            setRegistration(null);
            router.replace('/register');
            return;
          }
          try {
            setApiError('');
            await authService.cancelPendingRegistration(registration.email);
            setRegistration(null);
            router.replace('/register');
          } catch (error) {
            setApiError(messageForAuthError(error, 'No fue posible cancelar el registro pendiente.'));
          }
        })} />
      </Card>
    </Screen>
  );
}

export function PasswordScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { registration, signIn, setRegistration } = useSession();
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema), defaultValues: { password: '', confirmation: '' },
  });
  const currentPassword = watch('password');
  const currentConfirmation = watch('confirmation');
  const passwordChecks = getPasswordChecks(currentPassword);
  const isPasswordValid = passwordRegex.test(currentPassword);
  const passwordsMatch = currentPassword === currentConfirmation;
  const submit = handleSubmit(async (values) => {
    if (!registration?.verificationToken) {
      setApiError('Primero verificá el código de correo.');
      return;
    }
    try {
      const session = await authService.completeRegistration(registration.verificationToken, values.password, values.confirmation);
      await signIn(session);
      setRegistration(null);
      router.push({ pathname: '/onboarding-payment', params: { returnTo: registration.returnTo } });
    } catch (error) {
      const message = errorToUserMessage(error, '');
      const normalizedMessage = message.toLowerCase();
      if (
        (error instanceof ApiError && error.status === 400)
        || normalizedMessage.includes('faltan campos obligatorios')
        || normalizedMessage.includes('contraseña')
        || normalizedMessage.includes('password')
        || normalizedMessage.includes('400')
      ) {
        setApiError('La contraseña no cumple los requisitos de seguridad. Revisá la lista de condiciones debajo.');
        return;
      }
      setApiError(message || 'No fue posible completar el registro.');
    }
  });
  return (
    <Screen>
      <Header title="Seguridad" subtitle="Paso 3 de 4" onBack={back} />
      <Card style={styles.formCard}>
        <StepIndicator steps={registrationSteps} current={2} />
        <Title>Crea tu contraseña</Title>
        <Body muted>Elegí una contraseña segura para proteger tus pujas, compras y documentación.</Body>
        <Controller control={control} name="password" render={({ field }) => (
          <Input
            label="Contraseña"
            secureTextEntry={!showPassword}
            value={field.value}
            onChangeText={field.onChange}
            error={errors.password?.message}
            right={<IconButton icon={showPassword ? 'eye-off-outline' : 'eye-outline'} accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setShowPassword((visible) => !visible)} />}
          />
        )} />
        <Controller control={control} name="confirmation" render={({ field }) => (
          <Input
            label="Confirma tu contraseña"
            secureTextEntry={!showConfirmation}
            value={field.value}
            onChangeText={field.onChange}
            error={errors.confirmation?.message}
            right={<IconButton icon={showConfirmation ? 'eye-off-outline' : 'eye-outline'} accessibilityLabel={showConfirmation ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'} onPress={() => setShowConfirmation((visible) => !visible)} />}
          />
        )} />
        <View style={styles.passwordRulesCard}>
          {currentPassword && !isPasswordValid ? <Text style={styles.passwordRulesError}>La contraseña no cumple los requisitos de seguridad.</Text> : null}
          <Text style={styles.passwordRulesTitle}>Tu contraseña debe cumplir:</Text>
          {passwordChecks.map((rule) => (
            <View key={rule.label} style={styles.passwordRuleRow}>
              <Ionicons name={rule.valid ? 'checkmark-circle-outline' : 'close-circle-outline'} size={17} color={rule.valid ? colors.success : colors.textMuted} />
              <Text style={[styles.passwordRuleText, rule.valid ? styles.passwordRuleValid : styles.passwordRuleInvalid]}>{rule.label}</Text>
            </View>
          ))}
        </View>
        {apiError ? <ErrorNotice message={apiError} /> : null}
        <Button label={isSubmitting ? 'Creando cuenta...' : 'Registrarse'} disabled={!isPasswordValid || !passwordsMatch || isSubmitting} onPress={submit} />
      </Card>
    </Screen>
  );
}

export function ForgotPasswordScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const [apiError, setApiError] = useState('');
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const submit = handleSubmit(async ({ email }) => {
    try {
      setApiError('');
      await authService.requestPasswordReset(email);
      router.push(`/reset-password?email=${encodeURIComponent(email)}` as Href);
    } catch (error) {
      setApiError(messageForAuthError(error, 'No fue posible enviar el código de recuperacion.'));
    }
  });
  return (
    <Screen>
      <Header title="Recuperar contraseña" onBack={back} />
      <Card style={styles.formCard}>
        <StatusPanel icon="mail-outline" title="Código de recuperacion" message="Ingresá tu correo y te enviaremos un código para crear una nueva contraseña." />
        <Controller control={control} name="email" render={({ field }) => (
          <Input label="Correo electronico" keyboardType="email-address" autoCapitalize="none" value={field.value} onChangeText={field.onChange} error={errors.email?.message} />
        )} />
        {apiError ? <ErrorNotice message={apiError} /> : null}
        <Button label={isSubmitting ? 'Enviando...' : 'Enviar código'} disabled={isSubmitting} onPress={submit} />
        <Button label="Volver al login" variant="ghost" onPress={() => router.replace('/login')} />
      </Card>
    </Screen>
  );
}

export function ResetPasswordScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [apiError, setApiError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirmation: '' },
  });
  const currentPassword = watch('password');
  const currentConfirmation = watch('confirmation');
  const passwordChecks = getPasswordChecks(currentPassword);
  const isPasswordValid = passwordRegex.test(currentPassword);
  const passwordsMatch = currentPassword === currentConfirmation;
  const submit = handleSubmit(async ({ code, password, confirmation }) => {
    if (!email) {
      setApiError('Primero indica el correo de la cuenta.');
      return;
    }
    try {
      setApiError('');
      await authService.confirmPasswordReset(email, code, password, confirmation);
      setInfoMessage('Contrasena actualizada. Ya podes iniciar sesion.');
      setTimeout(() => router.replace('/login'), 900);
    } catch (error) {
      const message = errorToUserMessage(error, '');
      if (error instanceof ApiError && error.status === 400 || message.toLowerCase().includes('password') || message.toLowerCase().includes('contras')) {
        setApiError('La contraseña no cumple los requisitos de seguridad.');
        return;
      }
      setApiError(messageForAuthError(error, 'No fue posible actualizar la contraseña.'));
    }
  });
  return (
    <Screen>
      <Header title="Nueva contraseña" onBack={back} />
      <Card style={styles.formCard}>
        <StatusPanel icon="shield-checkmark-outline" title="Completa la recuperacion" message={email ? `Código enviado a ${email}` : 'Ingresá el código recibido y tu nueva contraseña.'} />
        <Controller control={control} name="code" render={({ field }) => (
          <Input label="Código" placeholder="0000" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} error={errors.code?.message} />
        )} />
        <Controller control={control} name="password" render={({ field }) => (
          <Input
            label="Nueva contraseña"
            secureTextEntry={!showPassword}
            value={field.value}
            onChangeText={field.onChange}
            error={errors.password?.message}
            right={<IconButton icon={showPassword ? 'eye-off-outline' : 'eye-outline'} accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setShowPassword((visible) => !visible)} />}
          />
        )} />
        <Controller control={control} name="confirmation" render={({ field }) => (
          <Input
            label="Confirmar contraseña"
            secureTextEntry={!showConfirmation}
            value={field.value}
            onChangeText={field.onChange}
            error={errors.confirmation?.message}
            right={<IconButton icon={showConfirmation ? 'eye-off-outline' : 'eye-outline'} accessibilityLabel={showConfirmation ? 'Ocultar confirmacion' : 'Mostrar confirmacion'} onPress={() => setShowConfirmation((visible) => !visible)} />}
          />
        )} />
        <View style={styles.passwordRulesCard}>
          {currentPassword && !isPasswordValid ? <Text style={styles.passwordRulesError}>La contraseña no cumple los requisitos de seguridad.</Text> : null}
          <Text style={styles.passwordRulesTitle}>Tu contraseña debe cumplir:</Text>
          {passwordChecks.map((rule) => (
            <View key={rule.label} style={styles.passwordRuleRow}>
              <Ionicons name={rule.valid ? 'checkmark-circle-outline' : 'close-circle-outline'} size={17} color={rule.valid ? colors.success : colors.textMuted} />
              <Text style={[styles.passwordRuleText, rule.valid ? styles.passwordRuleValid : styles.passwordRuleInvalid]}>{rule.label}</Text>
            </View>
          ))}
        </View>
        {infoMessage ? <Card style={styles.infoCard}><Body>{infoMessage}</Body></Card> : null}
        {apiError ? <ErrorNotice message={apiError} /> : null}
        <Button label={isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'} disabled={!isPasswordValid || !passwordsMatch || isSubmitting} onPress={submit} />
      </Card>
    </Screen>
  );
}

export function OnboardingPaymentScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  return (
    <Screen>
      <Header title="Seleccioná un medio de pago" subtitle="Paso 4 de 4" onBack={back} />
      <Card style={styles.formCard}>
        <StepIndicator steps={registrationSteps} current={3} />
        <StatusPanel icon="card-outline" title="Medio de pago requerido para pujar" message="Podés explorar subastas, pero para ofertar necesitás al menos un medio aprobado por la empresa." tone="yellow" />
        <SectionLabel>Agregar medio de pago</SectionLabel>
        {[
          { label: 'Cuenta bancaria', type: 'cuenta_bancaria', description: 'Reservá fondos para operar en subastas.' },
          { label: 'Tarjeta de crédito', type: 'tarjeta_credito', description: 'Usá una tarjeta a nombre del titular.' },
          { label: 'Cheque certificado', type: 'cheque_certificado', description: 'Adjuntá el respaldo del cheque para revisión.' },
        ].map((option, index) => (
          <ActionRow key={option.type} icon={index === 0 ? 'business-outline' : index === 1 ? 'card-outline' : 'wallet-outline'} label={option.label} description={option.description} onPress={() => router.push({ pathname: '/profile/payments/add', params: { type: option.type, onboarding: 'true', returnTo } })} />
        ))}
        <Button label="Omitir por ahora" variant="ghost" onPress={() => router.replace((returnTo || '/(tabs)') as Href)} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  splashScreen: { flex: 1, backgroundColor: colors.background },
  splashBackground: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: spacing.xl },
  splashGlow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: colors.primarySoft, opacity: 0.62 },
  splashGlowTop: { top: -110, right: -90 },
  splashGlowBottom: { bottom: -130, left: -100, opacity: 0.45 },
  splashRingOne: { position: 'absolute', width: 420, height: 420, borderRadius: 210, borderWidth: 1, borderColor: colors.primaryBorder, opacity: 0.35, top: -140, left: -150 },
  splashRingTwo: { position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: colors.border, opacity: 0.55, bottom: -120, right: -80 },
  splashBrandBlock: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  splashLogoCircle: {
    width: 156,
    height: 156,
    borderRadius: 78,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  splashTitleBlock: { alignItems: 'center', gap: spacing.xs },
  splashTitle: { fontSize: 34, lineHeight: 40, fontFamily: fonts.black, color: colors.textStrong, textAlign: 'center', letterSpacing: -0.8 },
  splashSubtitle: { fontSize: typography.body, fontFamily: fonts.medium, color: colors.textMuted, textAlign: 'center' },
  splashFeaturePill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primaryBorder },
  splashFeatureText: { color: colors.primary, fontFamily: fonts.medium, fontSize: typography.small },
  splashProgressBlock: { position: 'absolute', bottom: spacing.xl, alignItems: 'center', gap: spacing.sm },
  splashProgressTrack: { width: 180, height: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  splashProgressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  splashLoadingText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: typography.caption },
  welcome: { justifyContent: 'space-between' },
  welcomeHero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.surfaceAlt },
  actionsCard: { gap: spacing.md },
  formCard: { gap: spacing.md },
  centerCopy: { alignItems: 'center', gap: spacing.sm },
  centerSeparator: { alignItems: 'center' },
  tileRow: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  errorCard: { backgroundColor: colors.dangerSoft, borderColor: '#F7C9C9', paddingVertical: spacing.sm },
  infoCard: { backgroundColor: colors.successSoft, borderColor: colors.success },
  error: { color: colors.danger, fontSize: typography.small, fontFamily: fonts.bold, textAlign: 'center' },
  passwordRulesCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  passwordRulesError: { color: colors.danger, fontFamily: fonts.bold, fontSize: typography.label, marginBottom: spacing.xs },
  passwordRulesTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: typography.label, marginBottom: spacing.xs },
  passwordRuleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  passwordRuleText: { fontSize: typography.label, fontFamily: fonts.regular },
  passwordRuleValid: { color: colors.success },
  passwordRuleInvalid: { color: colors.textMuted },
  uploadRow: { flexDirection: 'row', gap: spacing.md },
  pending: { justifyContent: 'center' },
  pendingEmail: { color: colors.primary, fontSize: typography.body, fontFamily: fonts.medium },
});
