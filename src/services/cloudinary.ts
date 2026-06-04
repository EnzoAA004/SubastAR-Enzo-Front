import type { FileUpload } from '@/types/domain';

const cloudinaryConfig = {
  cloudName: 'dm1d43fpw',
  unsignedUploadPreset: 'subastar_bienes_unsigned',
};

export function buildCloudinaryDeliveryUrl(publicId?: string | null, url?: string | null) {
  if (url) return url;
  if (!publicId) return undefined;

  return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto/${publicId}`;
}

export type CloudinaryUploadResult = {
  asset_id: string;
  public_id: string;
  version: number;
  version_id?: string;
  signature?: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  type: string;
  etag?: string;
  placeholder?: boolean;
  url?: string;
  secure_url?: string;
  original_filename?: string;
};

function appendCloudinaryFile(form: FormData, file: FileUpload) {
  if (file.file) {
    form.append('file', file.file, file.name || 'archivo');
    return;
  }

  form.append('file', {
    uri: file.uri,
    name: file.name || 'archivo.jpg',
    type: file.type || 'image/jpeg',
  } as unknown as Blob);
}

export async function uploadImageToCloudinary(file: FileUpload): Promise<CloudinaryUploadResult> {
  const { cloudName, unsignedUploadPreset } = cloudinaryConfig;

  if (cloudName.startsWith('REEMPLAZAR_')) throw new Error('Falta configurar cloudinaryConfig.cloudName.');
  if (unsignedUploadPreset.startsWith('REEMPLAZAR_')) throw new Error('Falta configurar cloudinaryConfig.unsignedUploadPreset.');

  const form = new FormData();
  appendCloudinaryFile(form, file);
  form.append('upload_preset', unsignedUploadPreset);
  form.append('folder', 'subastar/bienes');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    if (response.status === 401 && errorText.includes('Unknown API key')) {
      throw new Error(
        `Cloudinary rechazó la configuración. Verificá que el cloud name "${cloudName}" coincida exactamente con Cloudinary Console y que el preset "${unsignedUploadPreset}" exista en ese entorno como Unsigned.`,
      );
    }
    throw new Error(`No pudimos subir la imagen a Cloudinary. Intentá nuevamente.${response.status ? ` Código ${response.status}.` : ''}`);
  }

  return response.json() as Promise<CloudinaryUploadResult>;
}
