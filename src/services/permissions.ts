import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export async function requestMediaLibraryPermission() {
  if (Platform.OS === 'web') return true;
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

export async function requestCameraPermission() {
  if (Platform.OS === 'web') return true;
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  return permission.granted;
}

export function explainFileAccess(kind: 'photo' | 'document') {
  if (Platform.OS !== 'web') return;
  console.info(
    kind === 'photo'
      ? '[File access] El navegador abrira el selector de imagenes.'
      : '[File access] El navegador abrira el selector de documentos.',
  );
}

export function permissionDeniedMessage(kind: 'camera' | 'gallery' | 'document') {
  if (kind === 'camera') return 'Necesitamos permiso para usar la camara. Habilitalo desde la configuracion del dispositivo e intenta nuevamente.';
  if (kind === 'gallery') return 'Necesitamos permiso para acceder a tu galeria. Habilitalo desde la configuracion del dispositivo e intenta nuevamente.';
  return 'No pudimos abrir el selector de archivos. Revisa los permisos del dispositivo e intenta nuevamente.';
}
