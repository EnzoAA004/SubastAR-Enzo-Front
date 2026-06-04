import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { DateInput } from '@/components/ui/date-input';
import { Badge, Body, Button, Card, Divider, Header, IconButton, InfoTile, Input, Screen, SectionHeader, SectionLabel, SecurityNote, StatusState, StepIndicator, Title, UploadBox } from '@/components/ui/primitives';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useSafeBack } from '@/hooks/use-safe-back';
import { assetService } from '@/services/api';
import { errorToUserMessage } from '@/services/errors';
import { explainFileAccess, permissionDeniedMessage, requestMediaLibraryPermission } from '@/services/permissions';
import type { FileUpload } from '@/types/domain';

const steps = ['Datos', 'Fotos', 'Documentos', 'Confirmar'];
const categoryOptions = [
  { value: 'obra_arte', label: 'Obras de arte', description: 'Pinturas, esculturas y diseños autorales', icon: 'color-palette-outline' as const },
  { value: 'objeto_disenador', label: 'Objetos de diseñador', description: 'Muebles, accesorios y piezas exclusivas', icon: 'diamond-outline' as const },
  { value: 'otro', label: 'Otros', description: 'Juegos, sets, joyas y más', icon: 'cube-outline' as const },
] as const;

function WizardHeader({ current }: { current: number }) {
  return (
    <Card style={styles.wizardCard}>
      <View style={styles.wizardHeader}>
        <View style={styles.wizardHeaderCopy}>
          <Badge label={`Paso ${current + 1} de ${steps.length}`} tone="purple" />
          <Text style={styles.wizardTitle}>{steps[current]}</Text>
        </View>
        <IconButton icon="information-circle-outline" accessibilityLabel="Información del paso" tone="primary" />
      </View>
      <StepIndicator steps={steps} current={current} />
    </Card>
  );
}

function CategoryCard({
  label,
  description,
  icon,
  active,
  onPress,
}: {
  label: string;
  description: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.categoryCard, active && styles.categoryCardActive, pressed && styles.pressed]}>
      <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
        <IconButton icon={icon} accessibilityLabel={label} tone={active ? 'primary' : 'neutral'} />
      </View>
      <View style={styles.categoryCopy}>
        <Text style={styles.categoryText}>{label}</Text>
        <Text style={styles.categoryDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={active ? colors.primary : colors.textMuted} />
    </Pressable>
  );
}

function PhotoPreview({ file, onRemove }: { file: FileUpload; onRemove: () => void }) {
  return (
    <View style={styles.previewWrap}>
      <Image source={{ uri: file.uri }} style={styles.preview} />
      <Pressable style={styles.removePhoto} onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Eliminar ${file.name}`}>
        <Ionicons name="close" size={16} color="#FFF" />
      </Pressable>
    </View>
  );
}

export function SellStartScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('1');
  const [artist, setArtist] = useState('');
  const [date, setDate] = useState('');
  const [period, setPeriod] = useState('');
  const [history, setHistory] = useState('');
  const [additional, setAdditional] = useState('');
  const save = useMutation({
    mutationFn: async () => {
      const request = await assetService.start(category);
      await assetService.saveDetails(request.code, {
        type: category, name, technicalDescription: description, amount: Number(amount), artistDesigner: artist || undefined,
        originPeriod: period || undefined, creationDate: date || undefined, history: history || undefined,
        additionalInformation: additional || undefined,
      });
      return request.code;
    },
    onSuccess: (code) => router.push({ pathname: '/sell/photos', params: { code, name, type: category, amount } }),
  });
  return (
    <Screen>
      <Header title="Subir bien" onBack={back} right={<IconButton icon="help-circle-outline" accessibilityLabel="Ayuda" tone="primary" />} />
      <Card style={styles.heroCard}>
        <Badge label="Carga formal" tone="purple" />
        <Title>Publicá un bien con datos claros y revisión ordenada</Title>
        <Body muted>Completá la información con precisión para que la empresa pueda revisar documentación, fotos y condiciones de subasta.</Body>
        <SecurityNote text="La solicitud quedará pendiente de revisión formal antes de ser publicada en SubastAR." />
      </Card>
      <SectionHeader title="Categoría del bien" subtitle="Elegí el tipo de pieza antes de continuar" />
      <View style={styles.categories}>
        {categoryOptions.map((item) => <CategoryCard key={item.value} label={item.label} description={item.description} icon={item.icon} active={item.value === category} onPress={() => setCategory(item.value)} />)}
      </View>
      {category ? <>
        <WizardHeader current={0} />
        <SectionHeader title="Información operativa" subtitle="Completá los campos principales para iniciar la solicitud" />
        <Input label="Nombre del bien" placeholder="Ej. Retrato en óleo" value={name} onChangeText={setName} />
        <Input label="Descripción técnica" placeholder="Materiales, medidas y estado" multiline value={description} onChangeText={setDescription} />
        <Input label="Cantidad de elementos *" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
        {category === 'obra_arte' ? <>
          <Input label="Artista" value={artist} onChangeText={setArtist} />
          <DateInput label="Fecha de creación (AAAA-MM-DD)" value={date} onChangeText={setDate} />
          <Input label="Época u origen" value={period} onChangeText={setPeriod} />
          <Input label="Historia y procedencia" multiline value={history} onChangeText={setHistory} />
        </> : null}
        {category === 'objeto_disenador' ? <>
          <Input label="Diseñador" value={artist} onChangeText={setArtist} />
          <DateInput label="Fecha de creación (AAAA-MM-DD)" value={date} onChangeText={setDate} />
        </> : null}
        {category === 'otro' ? <Input label="Información adicional" value={additional} onChangeText={setAdditional} /> : null}
        <Divider />
        <Button label={save.isPending ? 'Guardando...' : 'Continuar con fotografías'} disabled={!name || !description || Number(amount) <= 0 || save.isPending} onPress={() => save.mutate()} />
        {save.isError ? <Body muted>{errorToUserMessage(save.error, 'No fue posible iniciar la solicitud.')}</Body> : null}
      </> : null}
    </Screen>
  );
}

export function SellPhotosScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const { amount, code, name, type } = useLocalSearchParams<{ amount: string; code: string; name: string; type: string }>();
  const [photos, setPhotos] = useState<FileUpload[]>([]);
  const [apiError, setApiError] = useState('');
  const upload = useMutation({
    mutationFn: () => assetService.uploadPhotos(code ?? '', photos),
    onSuccess: () => router.push({ pathname: '/sell/documents', params: { amount, code, name, type, photos: String(photos.length) } }),
  });
  async function addPhoto() {
    try {
      setApiError('');
      explainFileAccess('photo');
      const granted = await requestMediaLibraryPermission();
      if (!granted) {
        setApiError(permissionDeniedMessage('gallery'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.7 });
      if (!result.canceled) setPhotos((current) => [...current, ...result.assets.map((asset, index) => ({
        uri: asset.uri, name: asset.fileName ?? `bien-${Date.now()}-${index}.jpg`, type: asset.mimeType ?? 'image/jpeg', file: asset.file,
      }))].slice(0, 8));
    } catch {
      setApiError(permissionDeniedMessage('gallery'));
    }
  }
  return (
    <Screen>
      <Header title="Fotografías" onBack={back} />
      <Card style={styles.heroCard}>
        <Badge label="Paso 2 - Fotos" tone="purple" />
        <Title>Cargá imágenes nítidas y completas</Title>
        <Body muted>Mostrá el bien desde varios ángulos. Necesitás entre 6 y 8 fotos para seguir.</Body>
      </Card>
      <WizardHeader current={1} />
      <View style={styles.tileRow}>
        <InfoTile icon="camera-outline" label="Mínimo" value="6 fotos" tone={photos.length >= 6 ? 'green' : 'yellow'} />
        <InfoTile icon="images-outline" label="Máximo" value="8 fotos" />
      </View>
      <Card style={styles.dropzoneCard}>
        <Body muted>Para cargar fotos necesitamos abrir tu galeria. En computadora se abrira el selector de archivos.</Body>
        <UploadBox label="Agregar fotos" description="JPG o PNG" icon="camera-outline" onPress={addPhoto} />
        <Body muted>Podés seleccionar varias imágenes a la vez. Si no cumplen el mínimo, no podrás avanzar.</Body>
      </Card>
      {apiError ? <StatusState icon="alert-circle-outline" title="No pudimos acceder a tus fotos" message={apiError} tone="red" /> : null}
      <View style={styles.gallery}>
        {photos.map((file) => <PhotoPreview key={file.uri} file={file} onRemove={() => setPhotos((current) => current.filter((photo) => photo.uri !== file.uri))} />)}
      </View>
      <Badge label={`${photos.length} de 8 fotos cargadas`} tone={photos.length >= 6 ? 'green' : 'yellow'} />
      <Button label={upload.isPending ? 'Subiendo...' : 'Continuar'} disabled={photos.length < 6 || upload.isPending} onPress={() => upload.mutate()} />
      {upload.isError ? <Body muted>{errorToUserMessage(upload.error, 'No fue posible subir las fotos.')}</Body> : null}
    </Screen>
  );
}

export function SellDocumentsScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const params = useLocalSearchParams<{ amount: string; code: string; name: string; type: string; photos: string }>();
  const [documents, setDocuments] = useState<FileUpload[]>([]);
  const [declaration, setDeclaration] = useState(false);
  const [apiError, setApiError] = useState('');
  const upload = useMutation({
    mutationFn: () => assetService.uploadDocuments(params.code ?? '', declaration, documents),
    onSuccess: () => router.push({ pathname: '/sell/review', params: { ...params, documents: String(documents.length) } }),
  });
  async function addDocument() {
    try {
      setApiError('');
      explainFileAccess('document');
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true, copyToCacheDirectory: true });
      if (!result.canceled) setDocuments(result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.name || `documento-${Date.now()}-${index}.pdf`,
        type: asset.mimeType ?? 'application/pdf',
        file: asset.file,
      })));
    } catch {
      setApiError(permissionDeniedMessage('document'));
    }
  }
  return (
    <Screen>
      <Header title="Documentación" onBack={back} />
      <Card style={styles.heroCard}>
        <Badge label="Paso 3 - Documentos" tone="purple" />
        <Title>Validá la propiedad y adjuntá respaldo</Title>
        <Body muted>La declaración es obligatoria. También podés adjuntar comprobantes para acelerar la revisión.</Body>
      </Card>
      <WizardHeader current={2} />
      <SectionHeader title="Declaración de propiedad" subtitle="Confirmación obligatoria para avanzar" />
      <Pressable onPress={() => setDeclaration((current) => !current)}>
        <Card style={[styles.declaration, declaration && styles.declarationActive]}>
          <Ionicons name={declaration ? 'checkmark-circle' : 'ellipse-outline'} color={declaration ? colors.success : colors.primary} size={22} />
          <Body>Declaro que el bien ofrecido para subasta es de mi exclusiva propiedad y que no se encuentra sujeto a ningún impedimento legal que restrinja su disposición.</Body>
        </Card>
      </Pressable>
      <SectionLabel>Documentación preventiva opcional</SectionLabel>
      <Card style={styles.dropzoneCard}>
        <Body muted>Al tocar adjuntar se abrira el selector de archivos del dispositivo. Podes elegir PDF o imagenes.</Body>
        <UploadBox label="Adjuntar comprobantes" description="PDF o imagen, hasta 10 MB" icon="document-attach-outline" done={documents.length > 0} onPress={addDocument} />
        <Body muted>Pueden ser certificados, respaldos o imágenes adicionales que ayuden a la revisión.</Body>
      </Card>
      {apiError ? <StatusState icon="alert-circle-outline" title="No pudimos abrir tus documentos" message={apiError} tone="red" /> : null}
      {documents.map((document) => (
        <Card key={document.uri} style={styles.documentRow}>
          <View style={styles.documentRowCopy}>
            <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
            <Body>{document.name}</Body>
          </View>
          <Pressable onPress={() => setDocuments((current) => current.filter((file) => file.uri !== document.uri))}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </Card>
      ))}
      <Divider />
      <Button label={upload.isPending ? 'Guardando...' : 'Siguiente'} disabled={!declaration || upload.isPending} onPress={() => upload.mutate()} />
      {upload.isError ? <Body muted>{errorToUserMessage(upload.error, 'No fue posible cargar documentación.')}</Body> : null}
    </Screen>
  );
}

export function SellReviewScreen() {
  const router = useRouter();
  const back = useSafeBack();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ amount: string; code: string; name: string; type: string; photos: string; documents: string }>();
  const confirm = useMutation({
    mutationFn: () => assetService.confirm(params.code ?? ''),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      router.replace({ pathname: '/sell/success', params: { code: response.codigo_solicitud, status: response.estado } });
    },
  });
  return (
    <Screen>
      <Header title="Confirmar" onBack={back} />
      <Card style={styles.heroCard}>
        <Badge label="Paso 4 - Revisión" tone="purple" />
        <Title>Revisá todo antes de enviar la solicitud</Title>
        <Body muted>Esta es la última instancia para confirmar que los datos, fotos y documentos estén correctos.</Body>
      </Card>
      <WizardHeader current={3} />
      <SectionHeader title="Resumen final" subtitle="Verificá categoría, cantidad y adjuntos" />
      <Card style={styles.summaryCard}>
        <Badge label={params.type === 'obra_arte' ? 'Obra de arte' : params.type === 'objeto_disenador' ? 'Objeto de diseñador' : 'Otro'} />
        <Title>{params.name}</Title>
        <Summary label="Cantidad de elementos" value={params.amount ?? '-'} />
        <Summary label="Fotos cargadas" value={`${params.photos} archivos`} />
        <Summary label="Documentación" value={`${params.documents} adjuntos`} />
        <Summary label="Declaración de propiedad" value="Aceptada" />
      </Card>
      <StatusState icon="document-text-outline" title="Revisión final" message="Al confirmar, la solicitud pasa a revisión de la empresa y queda pendiente de inspección." tone="yellow" />
      <Button label={confirm.isPending ? 'Enviando...' : 'Confirmar'} disabled={confirm.isPending} onPress={() => confirm.mutate()} />
      {confirm.isError ? <Body muted>{errorToUserMessage(confirm.error, 'No fue posible enviar la solicitud.')}</Body> : null}
      <Button label="Editar bien" variant="secondary" onPress={back} />
      <Button label="Cancelar" variant="ghost" onPress={() => router.replace('/(tabs)')} />
    </Screen>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <View style={styles.summary}><Body muted>{label}</Body><Text style={styles.summaryValue}>{value}</Text></View>;
}

export function SellSuccessScreen() {
  const router = useRouter();
  const { code, status } = useLocalSearchParams<{ code: string; status: string }>();
  return (
    <Screen style={styles.success}>
      <StatusState icon="checkmark-circle-outline" title="Solicitud enviada exitosamente" message="Tu bien fue enviado para revisión. Te notificaremos cuando la empresa complete la inspección e informe fecha, valor base y comisiones." tone="green" />
      <Card style={styles.fullWidth}>
        <Summary label="Código de solicitud" value={code ?? '-'} />
        <Summary label="Estado" value={status ?? 'Pendiente de revisión'} />
      </Card>
      <Button label="Agregar otro bien" onPress={() => router.replace('/sell')} />
      <Button label="Ver mis bienes" variant="secondary" onPress={() => router.replace('/profile/assets')} />
      <Button label="Volver al inicio" variant="ghost" onPress={() => router.replace('/(tabs)')} />
    </Screen>
  );
}

const platformShadow = {
  shadowColor: '#302477',
  shadowOpacity: 0.08,
  shadowOffset: { width: 0, height: 6 },
  shadowRadius: 16,
  elevation: 3,
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.78 },
  heroCard: { backgroundColor: colors.surfaceAlt, borderColor: colors.primaryBorder, gap: spacing.sm },
  wizardCard: { backgroundColor: colors.surface, gap: spacing.md },
  wizardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  wizardHeaderCopy: { flex: 1, gap: spacing.xs },
  wizardTitle: { color: colors.textStrong, fontSize: typography.headline, lineHeight: 28, fontFamily: fonts.black },
  categories: { gap: spacing.sm },
  categoryCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md, backgroundColor: colors.surface, ...platformShadow },
  categoryCardActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  categoryIcon: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  categoryIconActive: { backgroundColor: colors.primarySoft },
  categoryCopy: { flex: 1, gap: spacing.xs },
  categoryText: { color: colors.textStrong, fontSize: typography.body, fontFamily: fonts.bold },
  categoryDescription: { color: colors.textMuted, fontSize: typography.bodySmall, fontFamily: fonts.regular },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  dropzoneCard: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, gap: spacing.sm },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  previewWrap: { position: 'relative' },
  preview: { height: 94, width: 94, borderRadius: radius.md },
  removePhoto: { position: 'absolute', right: -5, top: -5, height: 23, width: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger },
  declaration: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border },
  declarationActive: { backgroundColor: colors.successSoft, borderColor: '#C9EED5' },
  documentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  documentRowCopy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  summaryCard: { gap: spacing.md, backgroundColor: colors.surface },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryValue: { color: colors.textStrong, fontFamily: fonts.bold, fontSize: typography.body },
  success: { paddingTop: 75, alignItems: 'center' },
  fullWidth: { width: '100%' },
});


