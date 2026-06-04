import { getToken } from '@/services/session-storage';
let unauthorizedHandler: undefined | (() => void | Promise<void>);
let networkErrorHandler: undefined | (() => void | Promise<void>);

export function setUnauthorizedHandler(handler?: () => void | Promise<void>) {
  unauthorizedHandler = handler;
}

export function setNetworkErrorHandler(handler?: () => void | Promise<void>) {
  networkErrorHandler = handler;
}

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:8080/api/v1',
};

export const apiRoutes = {
  login: '/auth/login',
  loginVerify2fa: '/auth/login/verificar-2fa',
  loginResend2fa: '/auth/login/reenviar-2fa',
  healthPing: '/health/ping',
  register: '/auth/registro',
  registerResendCode: '/auth/registro/reenviar-codigo',
  cancelPendingRegistration: '/auth/registro-pendiente/cancelar',
  verifyCode: '/auth/verificar-codigo',
  finishRegistration: '/auth/completar-registro',
  requestPasswordReset: '/auth/recuperar-password',
  confirmPasswordReset: '/auth/recuperar-password/confirmar',
  logout: '/auth/logout',
  countries: '/paises',
  auctions: '/subastas',
  auction: (id: string) => `/subastas/${id}`,
  catalog: (id: string) => `/subastas/${id}/catalogo`,
  catalogItem: (auctionId: string, itemId: string) => `/subastas/${auctionId}/catalogo/${itemId}`,
  liveAuction: (id: string) => `/subastas/${id}/en-vivo`,
  bids: (id: string) => `/subastas/${id}/pujas`,
  bidHistory: (auctionId: string, itemId: string) => `/subastas/${auctionId}/pujas/${itemId}`,
  bidResult: (auctionId: string, itemId: string) => `/subastas/${auctionId}/resultado/${itemId}`,
  payments: '/usuarios/me/medios-pago',
  assets: '/bienes/mis-bienes',
  asset: (id: string) => `/bienes/mis-bienes/${id}`,
  assetRequest: '/bienes/solicitudes',
  assetRequestData: (code: string) => `/bienes/solicitudes/${code}/datos`,
  assetRequestPhotos: (code: string) => `/bienes/solicitudes/${code}/fotos`,
  assetRequestDocuments: (code: string) => `/bienes/solicitudes/${code}/documentos`,
  assetRequestConfirm: (code: string) => `/bienes/solicitudes/${code}/confirmar`,
  assetConditions: (id: string) => `/bienes/mis-bienes/${id}/aceptar-condiciones`,
  purchases: '/compras',
  purchase: (id: string) => `/compras/${id}`,
  regularizePurchase: (id: string) => `/compras/${id}/regularizar-pago`,
  invoice: (id: string) => `/compras/${id}/factura`,
  invoiceDownload: (id: string) => `/compras/${id}/factura/download`,
  user: '/usuarios/me',
  accountState: '/usuarios/me/estado-cuenta',
  metrics: '/usuarios/me/metricas',
  insurance: (id: string) => `/seguros/${id}`,
  extendInsurance: (id: string) => `/seguros/${id}/ampliar`,
  conversations: '/chat/conversaciones',
  notificationsSummary: '/chat/notificaciones/resumen',
  notifications: '/chat/notificaciones',
  markNotificationsRead: '/chat/notificaciones/marcar-leidas',
  messages: (type: string) => `/chat/conversaciones/${type}`,
  sendMessage: (type: string) => `/chat/conversaciones/${type}/mensajes`,
} as const;

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiNetworkError extends Error {
  constructor(message = 'Sin conexión a internet o con el servidor.') {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  const fallback = 'Error de servidor.';
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    return text.trim() || fallback;
  }

  const payload = await response.json().catch(() => undefined) as
    | Record<string, unknown>
    | undefined;
  if (!payload) return fallback;

  for (const key of ['message', 'error', 'detail']) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  for (const key of ['errors', 'errores']) {
    const value = payload[key];
    if (Array.isArray(value)) {
      const messages = value.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'message' in item && typeof item.message === 'string') return item.message;
        return JSON.stringify(item);
      }).filter(Boolean);
      if (messages.length) return messages.join('\n');
    }
  }

  const fieldMessages = Object.entries(payload)
    .filter(([, value]) => typeof value === 'string')
    .map(([field, value]) => `${field}: ${value}`);
  if (fieldMessages.length) return fieldMessages.join('\n');

  return fallback;
}

export async function request<T>(route: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers = new Headers(options?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options?.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${apiConfig.baseUrl}${route}`, { ...options, headers });
  } catch {
    await networkErrorHandler?.();
    throw new ApiNetworkError();
  }
  if (!response.ok) {
    const message = await extractErrorMessage(response);
    if (response.status === 401 && unauthorizedHandler) await unauthorizedHandler();
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function requestText(route: string, options?: RequestInit): Promise<string> {
  const token = await getToken();
  const headers = new Headers(options?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${apiConfig.baseUrl}${route}`, { ...options, headers });
  } catch {
    await networkErrorHandler?.();
    throw new ApiNetworkError();
  }
  if (!response.ok) {
    const message = await extractErrorMessage(response);
    if (response.status === 401 && unauthorizedHandler) await unauthorizedHandler();
    throw new ApiError(message, response.status);
  }
  return response.text();
}
