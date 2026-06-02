import type {
  AccountState,
  AssetDetailsInput,
  AssetSubmission,
  AuctionResult,
  Auction,
  Bid,
  Conversation,
  FileUpload,
  InsurancePolicy,
  Lot,
  Message,
  NotificationsSummary,
  OwnedAsset,
  PaymentMethod,
  PaymentMethodCreate,
  Purchase,
  Session,
  UserDetails,
  UserMetrics,
  UserNotification,
} from '@/types/domain';
import { buildCloudinaryDeliveryUrl, uploadImageToCloudinary } from '@/services/cloudinary';
import { apiConfig, apiRoutes, request, requestText } from '@/services/http';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const API_BASE_URL = apiConfig.baseUrl;

type BackendUser = { nombre: string; apellido: string; email: string; categoria: string; estado: string };
type BackendLoginTwoFactorStart = { requires_2fa: boolean; challenge_id: string; email: string; message: string };
type BackendLogin = { access_token: string; token_type: string; usuario: BackendUser };
type VerifyCodeResponse = { message: string; token_verificacion?: string; tokenVerificacion?: string };
type BackendAuction = {
  id: number; nombre: string; direccion: string; fecha_inicio: string; categoria: string; moneda: string;
  estado: string; total_articulos: number; rematador: string;
};
type BackendLot = {
  id: number; numero_pieza?: string; nombre: string; descripcion?: string; precio_base?: number; imagenes?: string[];
  artista?: string; historia?: string; fecha_creacion?: string; dueno_actual?: string; estado?: string;
};
type BackendBid = { id: number; nombre_usuario: string; monto: number; timestamp: string; es_ganadora?: boolean };
type BackendResult = {
  estado: string;
  item_id: number;
  nombre_item: string;
  fue_ganador: boolean;
  monto_final?: number;
  medio_pago?: string;
  fecha?: string;
};
type BackendLive = {
  item_actual?: BackendLot; mejor_oferta?: number; puja_minima?: number; puja_maxima?: number;
  segundos_restantes?: number; historial_pujas?: BackendBid[];
};
type BackendPayment = { id: number; tipo: string; descripcion: string; verificado: boolean; monto_disponible?: number };
type BackendAssetPhoto = {
  codigo_foto: string; nombre_archivo?: string | null; public_id?: string | null; url?: string | null; tipo?: string | null;
};
type BackendAssetDocument = {
  codigo_documento: string; nombre_archivo?: string | null; url?: string | null; tipo?: string | null; content_type?: string | null;
};
type BackendAsset = {
  id: number; nombre: string; tipo?: string | null; estado: string; motivo_rechazo?: string | null; subasta_asignada?: string | null; precio_base?: number | null;
  comision?: number | null; ubicacion_deposito?: string | null; poliza_id?: string | number | null; descripcion_tecnica?: string | null; cantidad_elementos?: number | null;
  informacion_adicional?: string | null; epoca_origen?: string | null; artista_disenador?: string | null; datos_historicos?: string | null;
  precio_base_sugerido?: number | null; divisa_precio_base_sugerido?: string | null;
  fotos_cargadas?: number; documentacion_adjunta?: boolean; fotos?: BackendAssetPhoto[]; documentos?: BackendAssetDocument[];
};
type BackendPurchase = {
  id: number; nombre_item: string; subasta: string; fecha?: string; valor_pujado: number; multa: number;
  estado_pago: string; estado_entrega: string; costo_envio?: number; total?: number; medio_pago?: string;
  direccion_entrega?: string; factura_url?: string; poliza_id?: string | null; numero_poliza?: string | null;
};
type BackendConversation = { tipo: string; titulo: string; subtitulo: string; mensajes_no_leidos: number };
type BackendMessage = { id: number; emisor: string; contenido: string; timestamp: string };
type BackendNotificationsSummary = { total_no_leidas: number; hay_no_leidas: boolean; por_tipo?: Record<string, number> };
type BackendNotification = { id: number; tipo: string; titulo?: string; contenido: string; timestamp: string; leido: boolean };
type BackendProfile = BackendUser & { domicilio?: string; paisOrigen?: string; pais_origen?: string; dni?: string };
type BackendCountry = { numero: number; nombre: string; nombreCorto: string; capital: string; nacionalidad: string; idiomas: string };
type CountryOption = { id: string; code: string; name: string; capital?: string; nationality?: string; languages?: string };
type BackendMetrics = {
  subastas_participadas: number; subastas_ganadas: number; tasa_exito: number; total_ofertado: number; total_pagado: number;
  oferta_promedio: number; oferta_mas_alta: number; oferta_mas_baja: number; ganadas_por_mes: { mes: string; cantidad: number }[];
};
type BackendAccount = { estado: string; multa_pendiente?: number; mensaje?: string };
type BackendPolicy = {
  id?: number; numero_poliza: string; aseguradora: string; beneficiario?: string; valor_asegurado: number;
  vigencia_desde?: string; vigencia_hasta?: string; cobertura?: string; piezas?: string[];
  contacto_aseguradora?: { telefono?: string; email?: string; web?: string };
};
type BackendAssetSubmission = {
  codigo_solicitud: string; tipo: string; estado: string; paso_actual: string; fotos_cargadas: number;
  minimo_fotos_requeridas: number; puede_confirmar: boolean;
};

function absoluteAsset(uri?: string) {
  if (!uri) return undefined;
  return uri.startsWith('http') ? uri : `${API_BASE_URL}${uri.replace('/api/v1', '')}`;
}

function mapStatus(status: string): Auction['status'] {
  const normalized = status.toLowerCase();
  if (normalized === 'en_vivo' || normalized === 'abierta') return 'En vivo';
  if (normalized === 'finalizada' || normalized === 'cerrada') return 'Finalizada';
  return 'Próximas';
}

function mapAuction(auction: BackendAuction): Auction {
  const normalizedCategory = auction.categoria.toLowerCase();
  return {
    id: String(auction.id),
    name: auction.nombre,
    location: auction.direccion,
    date: auction.fecha_inicio,
    category: normalizedCategory === 'otro' ? 'Otro' : normalizedCategory === 'comun' ? 'Común' : auction.categoria,
    currency: auction.moneda,
    auctioneer: auction.rematador,
    totalLots: auction.total_articulos,
    status: mapStatus(auction.estado),
  };
}

function mapLot(lot: BackendLot, auctionId: string): Lot {
  return {
    id: String(lot.id),
    auctionId,
    lotNumber: lot.numero_pieza ?? String(lot.id),
    title: lot.nombre,
    description: lot.descripcion ?? '',
    basePrice: lot.precio_base ?? 0,
    category: lot.artista ? 'Obra de arte' : 'Objeto',
    artist: lot.artista,
    history: lot.historia,
    creationDate: lot.fecha_creacion,
    owner: lot.dueno_actual,
    status: lot.estado,
    image: absoluteAsset(lot.imagenes?.[0]),
  };
}

function mapPurchase(purchase: BackendPurchase): Purchase {
  return {
    id: String(purchase.id),
    lot: {
      id: String(purchase.id),
      auctionId: '',
      lotNumber: '',
      title: purchase.nombre_item,
      description: '',
      basePrice: purchase.valor_pujado,
      category: '',
    },
    auctionName: purchase.subasta,
    date: purchase.fecha,
    amount: purchase.valor_pujado,
    fee: purchase.multa ?? 0,
    paymentStatus: purchase.estado_pago,
    deliveryStatus: purchase.estado_entrega,
    insuranceId: purchase.poliza_id ?? purchase.numero_poliza ?? undefined,
    insuranceNumber: purchase.numero_poliza ?? purchase.poliza_id ?? undefined,
    shippingCost: purchase.costo_envio,
    total: purchase.total,
    paymentMethod: purchase.medio_pago,
    deliveryAddress: purchase.direccion_entrega,
    invoiceUrl: purchase.factura_url,
  };
}

function mapAsset(asset: BackendAsset): OwnedAsset {
  const normalizedStatus = asset.estado.toLowerCase();
  return {
    id: String(asset.id),
    title: asset.nombre,
    category: asset.tipo ?? asset.subasta_asignada ?? 'Sin asignar',
    status: normalizedStatus === 'aceptado' ? 'Aceptado' : normalizedStatus === 'rechazado' ? 'Rechazado' : 'Pendiente',
    detail: asset.descripcion_tecnica ?? asset.motivo_rechazo ?? asset.subasta_asignada ?? 'En evaluación',
    technicalDescription: asset.descripcion_tecnica ?? undefined,
    quantity: asset.cantidad_elementos ?? undefined,
    additionalInformation: asset.informacion_adicional ?? undefined,
    originPeriod: asset.epoca_origen ?? undefined,
    artistDesigner: asset.artista_disenador ?? undefined,
    historicalData: asset.datos_historicos ?? undefined,
    basePrice: asset.precio_base ?? undefined,
    suggestedBasePrice: asset.precio_base_sugerido,
    suggestedBasePriceCurrency: asset.divisa_precio_base_sugerido ?? null,
    commission: asset.comision ?? undefined,
    assignedAuction: asset.subasta_asignada ?? undefined,
    depositLocation: asset.ubicacion_deposito ?? undefined,
    policyId: asset.poliza_id ? String(asset.poliza_id) : undefined,
    photosUploaded: asset.fotos_cargadas,
    documentationAttached: asset.documentacion_adjunta,
    photos: (asset.fotos ?? []).map((photo) => ({
      id: photo.codigo_foto,
      name: photo.nombre_archivo ?? undefined,
      publicId: photo.public_id ?? undefined,
      url: buildCloudinaryDeliveryUrl(photo.public_id, photo.url),
      type: photo.tipo ?? undefined,
    })),
    documents: (asset.documentos ?? []).map((document) => ({
      id: document.codigo_documento,
      name: document.nombre_archivo ?? undefined,
      url: document.url ?? undefined,
      type: document.tipo ?? undefined,
      contentType: document.content_type ?? undefined,
    })),
  };
}

function appendFile(form: FormData, name: string, file: FileUpload) {
  if (file.file) {
    form.append(name, file.file, file.name || 'archivo');
    return;
  }
  form.append(name, {
    uri: file.uri,
    name: file.name || 'archivo',
    type: file.type || 'application/octet-stream',
  } as unknown as Blob);
}

function titleForNotificationType(type: string) {
  switch (type) {
    case 'compra': return 'Compra';
    case 'multa': return 'Multa';
    case 'bien': return 'Bien';
    case 'poliza': return 'Póliza';
    case 'bot': return 'Aviso';
    default: return 'Notificación';
  }
}

export const authService = {
  async login(email: string, password: string) {
    const response = await request<BackendLoginTwoFactorStart>(apiRoutes.login, { method: 'POST', body: JSON.stringify({ email, password }) });
    return {
      challengeId: response.challenge_id,
      email: response.email,
      message: response.message,
    };
  },
  async verifyLogin2fa(challengeId: string, code: string): Promise<Session> {
    const login = await request<BackendLogin>(apiRoutes.loginVerify2fa, {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, codigo: code }),
    });
    return this.loginFromResponse(login);
  },
  async resendLogin2fa(challengeId: string) {
    const response = await request<BackendLoginTwoFactorStart>(apiRoutes.loginResend2fa, {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId }),
    });
    return {
      challengeId: response.challenge_id,
      email: response.email,
      message: response.message,
    };
  },
  async register(input: { name: string; surname: string; email: string; address: string; country: string; front: FileUpload; back: FileUpload }) {
    const form = new FormData();
    form.append('nombre', input.name);
    form.append('apellido', input.surname);
    form.append('email', input.email);
    form.append('domicilio', input.address);
    form.append('pais_origen', input.country);
    appendFile(form, 'foto_dni_frente', input.front);
    appendFile(form, 'foto_dni_dorso', input.back);
    return request<{ message: string }>(apiRoutes.register, { method: 'POST', body: form });
  },
  async verify(email: string, code: string) {
    const response = await request<VerifyCodeResponse>(apiRoutes.verifyCode, {
      method: 'POST',
      body: JSON.stringify({ email, codigo: code }),
    });
    const token = response.token_verificacion ?? response.tokenVerificacion;
    if (!token) throw new Error('No se recibió token de verificación.');
    return { message: response.message, token_verificacion: token };
  },
  async completeRegistration(token: string, password: string, passwordConfirmation: string) {
    const login = await request<BackendLogin>(apiRoutes.finishRegistration, {
      method: 'POST',
      body: JSON.stringify({ token_verificacion: token, password, password_confirmacion: passwordConfirmation }),
    });
    return this.loginFromResponse(login);
  },
  loginFromResponse(login: BackendLogin): Session {
    return {
      token: login.access_token,
      profile: {
        name: `${login.usuario.nombre} ${login.usuario.apellido}`,
        email: login.usuario.email,
        category: login.usuario.categoria,
        status: login.usuario.estado === 'activo' ? 'Regular' : 'Bloqueado',
        penalty: 0,
      },
    };
  },
  async logout() {
    return request<void>(apiRoutes.logout, { method: 'POST' });
  },
};

export const auctionService = {
  async list(filters?: { search?: string; status?: string; category?: string; currency?: string }): Promise<Auction[]> {
    const params = new URLSearchParams();
    const statusValue = filters?.status === 'En vivo' ? 'en_vivo' : filters?.status === 'Próximas' ? 'proxima' : filters?.status === 'Finalizada' ? 'finalizada' : undefined;
    const categoryValue = filters?.category === 'Oro'
      ? 'oro'
      : filters?.category === 'Platino'
        ? 'platino'
        : filters?.category === 'Plata'
          ? 'plata'
          : filters?.category === 'Especial'
            ? 'especial'
            : filters?.category === 'Común'
              ? 'comun'
              : filters?.category === 'Otro'
                ? 'otro'
                : undefined;
    if (filters?.search) params.set('busqueda', filters.search);
    if (statusValue) params.set('estado', statusValue);
    if (categoryValue) params.set('categoria', categoryValue);
    if (filters?.currency && filters.currency !== 'Todas') params.set('moneda', filters.currency);
    const query = params.toString();
    return (await request<BackendAuction[]>(query ? `${apiRoutes.auctions}?${query}` : apiRoutes.auctions)).map(mapAuction);
  },
  async get(id: string) {
    return mapAuction(await request<BackendAuction>(apiRoutes.auction(id)));
  },
  async catalog(auctionId: string) {
    return (await request<BackendLot[]>(apiRoutes.catalog(auctionId))).map((lot) => mapLot(lot, auctionId));
  },
  async lot(id: string, auctionId: string) {
    return mapLot(await request<BackendLot>(apiRoutes.catalogItem(auctionId, id)), auctionId);
  },
  async live(auctionId: string) {
    const live = await request<BackendLive>(apiRoutes.liveAuction(auctionId));
    return {
      lot: live.item_actual ? mapLot(live.item_actual, auctionId) : undefined,
      bestBid: live.mejor_oferta ?? 0,
      minBid: live.puja_minima ?? 0,
      maxBid: live.puja_maxima,
      basePrice: live.item_actual?.precio_base ?? 0,
      secondsLeft: live.segundos_restantes,
      history: (live.historial_pujas ?? []).map((bid) => ({ id: String(bid.id), bidder: bid.nombre_usuario, amount: bid.monto, timestamp: bid.timestamp })),
    };
  },
  async bid(auctionId: string, amount: number, paymentId: string): Promise<Bid> {
    const bid = await request<BackendBid>(apiRoutes.bids(auctionId), { method: 'POST', body: JSON.stringify({ monto: amount, medio_pago_id: Number(paymentId) }) });
    return { id: String(bid.id), bidder: bid.nombre_usuario, amount: bid.monto, timestamp: bid.timestamp };
  },
  async bidHistory(auctionId: string, itemId: string): Promise<Bid[]> {
    return (await request<BackendBid[]>(apiRoutes.bidHistory(auctionId, itemId))).map((bid) => ({
      id: String(bid.id), bidder: bid.nombre_usuario, amount: bid.monto, timestamp: bid.timestamp,
    }));
  },
  async result(auctionId: string, itemId: string): Promise<AuctionResult> {
    const value = await request<BackendResult>(apiRoutes.bidResult(auctionId, itemId));
    return {
      status: value.estado, lotId: String(value.item_id), lotName: value.nombre_item,
      won: value.fue_ganador, finalAmount: value.monto_final,
      paymentMethod: value.medio_pago, date: value.fecha,
    };
  },
};

export const profileService = {
  async countries(): Promise<CountryOption[]> {
    return (await request<BackendCountry[]>(apiRoutes.countries)).map((country) => ({
      id: String(country.numero),
      code: country.nombreCorto,
      name: country.nombre,
      capital: country.capital,
      nationality: country.nacionalidad,
      languages: country.idiomas,
    }));
  },
  async me(): Promise<UserDetails> {
    const value = await request<BackendProfile>(apiRoutes.user);
    return {
      name: `${value.nombre} ${value.apellido}`, email: value.email, category: value.categoria,
      status: value.estado === 'activo' ? 'Regular' : 'Bloqueado', penalty: 0,
      address: value.domicilio, country: value.pais_origen ?? value.paisOrigen, dni: value.dni,
    };
  },
  async update(input: { address?: string; country?: string }) {
    await request<BackendProfile>(apiRoutes.user, { method: 'PATCH', body: JSON.stringify({ domicilio: input.address, pais_origen: input.country }) });
    return this.me();
  },
  async accountState(): Promise<AccountState> {
    const state = await request<BackendAccount>(apiRoutes.accountState);
    return {
      status: state.estado === 'multado' ? 'Multado' : state.estado === 'bloqueado' ? 'Bloqueado' : 'Regular',
      penalty: state.multa_pendiente ?? 0,
      message: state.mensaje,
    };
  },
  async metrics(): Promise<UserMetrics> {
    const value = await request<BackendMetrics>(apiRoutes.metrics);
    return {
      participated: value.subastas_participadas, won: value.subastas_ganadas, successRate: value.tasa_exito,
      totalBid: value.total_ofertado, totalPaid: value.total_pagado, averageBid: value.oferta_promedio,
      highestBid: value.oferta_mas_alta, lowestBid: value.oferta_mas_baja,
      winsByMonth: value.ganadas_por_mes.map((entry) => ({ month: entry.mes, count: entry.cantidad })),
    };
  },
};

export const paymentService = {
  async list(): Promise<PaymentMethod[]> {
    return (await request<BackendPayment[]>(apiRoutes.payments)).map((payment) => ({
      id: String(payment.id),
      type: payment.tipo === 'tarjeta_credito' ? 'Tarjeta' : payment.tipo === 'cuenta_bancaria' ? 'Cuenta bancaria' : 'Cheque certificado',
      label: payment.descripcion,
      detail: payment.verificado ? 'Verificado' : 'Pendiente de verificación',
      verified: payment.verificado,
      availableAmount: payment.monto_disponible,
    }));
  },
  async create(input: PaymentMethodCreate) {
    const form = new FormData();
    form.append('tipo', input.type);
    if (input.bankName) form.append('nombre_banco', input.bankName);
    if (input.bankCountry) form.append('pais_banco', input.bankCountry);
    if (input.cbuIban) form.append('cbu_iban', input.cbuIban);
    if (input.reservedFunds) form.append('fondos_reservados', input.reservedFunds);
    if (input.cardNumber) form.append('numero_tarjeta', input.cardNumber);
    if (input.holder) form.append('titular', input.holder);
    if (input.expiry) form.append('vencimiento', input.expiry);
    if (input.securityCode) form.append('codigo_seguridad', input.securityCode);
    if (input.holderDni) form.append('dni_titular', input.holderDni);
    if (input.issuerBank) form.append('banco_emisor', input.issuerBank);
    if (input.certifiedAmount) form.append('monto_certificado', input.certifiedAmount);
    if (input.chequeNumber) form.append('numero_cheque', input.chequeNumber);
    if (input.chequePhoto) appendFile(form, 'foto_cheque', input.chequePhoto);
    return request<BackendPayment>(apiRoutes.payments, { method: 'POST', body: form });
  },
  async remove(id: string) {
    return request<void>(`${apiRoutes.payments}/${id}`, { method: 'DELETE' });
  },
};

export const purchaseService = {
  async list(): Promise<Purchase[]> {
    return (await request<BackendPurchase[]>(apiRoutes.purchases)).map(mapPurchase);
  },
  async get(id: string) {
    return mapPurchase(await request<BackendPurchase>(apiRoutes.purchase(id)));
  },
  async regularize(id: string, paymentId: string) {
    return mapPurchase(await request<BackendPurchase>(apiRoutes.regularizePurchase(id), {
      method: 'POST', body: JSON.stringify({ medio_pago_id: Number(paymentId) }),
    }));
  },
  async invoice(id: string) {
    return request<{ message: string; url: string }>(apiRoutes.invoice(id));
  },
  async invoiceContent(id: string) {
    return requestText(apiRoutes.invoiceDownload(id));
  },
  async downloadInvoice(id: string) {
    const text = await this.invoiceContent(id);
    const filename = `factura-${id}.txt`;
    if (Platform.OS === 'web') {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return;
    }

    if (!await Sharing.isAvailableAsync()) throw new Error('No es posible guardar la factura en este dispositivo.');
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(text);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Guardar factura TXT', UTI: 'public.plain-text' });
  },
};

export const insuranceService = {
  async get(id: string): Promise<InsurancePolicy> {
    const policy = await request<BackendPolicy>(apiRoutes.insurance(id));
    return {
      id: policy.numero_poliza, number: policy.numero_poliza, company: policy.aseguradora,
      beneficiary: policy.beneficiario, insuredValue: policy.valor_asegurado, validFrom: policy.vigencia_desde,
      validUntil: policy.vigencia_hasta, coverage: policy.cobertura, items: policy.piezas ?? [],
      contact: policy.contacto_aseguradora ? {
        phone: policy.contacto_aseguradora.telefono, email: policy.contacto_aseguradora.email, web: policy.contacto_aseguradora.web,
      } : undefined,
    };
  },
  async extend(id: string, value: number) {
    await request<BackendPolicy>(apiRoutes.extendInsurance(id), { method: 'POST', body: JSON.stringify({ nuevo_valor_asegurado: value }) });
    return this.get(id);
  },
};

export const assetService = {
  async list(status?: string): Promise<OwnedAsset[]> {
    const statusMap: Record<string, string> = {
      Pendiente: 'en_revision',
      Aceptado: 'aceptado',
      Rechazado: 'rechazado',
    };
    const backendStatus = status ? statusMap[status] : undefined;
    const route = backendStatus ? `${apiRoutes.assets}?estado=${backendStatus}` : apiRoutes.assets;
    return (await request<BackendAsset[]>(route)).map(mapAsset);
  },
  async get(id: string): Promise<OwnedAsset> {
    return mapAsset(await request<BackendAsset>(apiRoutes.asset(id)));
  },
  async update(id: string | number, input: { additionalInformation?: string; suggestedBasePrice?: number; suggestedBasePriceCurrency?: string }): Promise<OwnedAsset> {
    return mapAsset(await request<BackendAsset>(apiRoutes.asset(String(id)), {
      method: 'PATCH',
      body: JSON.stringify({
        informacion_adicional: input.additionalInformation,
        precio_base_sugerido: input.suggestedBasePrice,
        divisa_precio_base_sugerido: input.suggestedBasePriceCurrency,
      }),
    }));
  },
  async start(type: string) {
    const value = await request<BackendAssetSubmission>(apiRoutes.assetRequest, { method: 'POST', body: JSON.stringify({ tipo: type }) });
    return { code: value.codigo_solicitud, type: value.tipo, status: value.estado, currentStep: value.paso_actual, photosUploaded: value.fotos_cargadas, minimumPhotos: value.minimo_fotos_requeridas, mayConfirm: value.puede_confirmar } satisfies AssetSubmission;
  },
  async saveDetails(code: string, input: AssetDetailsInput) {
    return request<BackendAssetSubmission>(apiRoutes.assetRequestData(code), {
      method: 'PUT',
      body: JSON.stringify({
        tipo: input.type, nombre: input.name, descripcion_tecnica: input.technicalDescription, cantidad_elementos: input.amount,
        epoca_origen: input.originPeriod, artista_disenador: input.artistDesigner, fecha_creacion: input.creationDate,
        datos_historicos: input.history, informacion_adicional: input.additionalInformation,
      }),
    });
  },
  async uploadPhotos(code: string, files: FileUpload[]) {
    const uploaded = await Promise.all(files.map(uploadImageToCloudinary));
    return request<BackendAssetSubmission>(apiRoutes.assetRequestPhotos(code), {
      method: 'POST',
      body: JSON.stringify({
        fotos: uploaded.map((asset) => ({
          asset_id: asset.asset_id,
          public_id: asset.public_id,
          version: asset.version,
          format: asset.format,
          resource_type: asset.resource_type,
          bytes: asset.bytes,
          width: asset.width,
          height: asset.height,
          original_filename: asset.original_filename,
          secure_url: asset.secure_url,
        })),
      }),
    });
  },
  async uploadDocuments(code: string, declaration: boolean, files: FileUpload[]) {
    const form = new FormData();
    form.append('declara_propiedad', String(declaration));
    files.forEach((file) => appendFile(form, 'documentos', file));
    return request<BackendAssetSubmission>(apiRoutes.assetRequestDocuments(code), { method: 'POST', body: form });
  },
  async confirm(code: string) {
    return request<{ codigo_solicitud: string; codigo_bien: string; estado: string; message: string }>(apiRoutes.assetRequestConfirm(code), { method: 'POST' });
  },
  async acceptConditions(id: string, accepted: boolean) {
    return request<{ message: string }>(apiRoutes.assetConditions(id), { method: 'POST', body: JSON.stringify({ acepta: accepted }) });
  },
};

export const chatService = {
  async conversations(): Promise<Conversation[]> {
    return (await request<BackendConversation[]>(apiRoutes.conversations)).map((conversation) => ({
      id: conversation.tipo, name: conversation.titulo, lastMessage: conversation.subtitulo, unread: conversation.mensajes_no_leidos,
    }));
  },
  async messages(type: string): Promise<Message[]> {
    return (await request<BackendMessage[]>(apiRoutes.messages(type))).map((message) => ({
      id: String(message.id), author: message.emisor.toLowerCase() === 'cliente' ? 'user' : 'bot', text: message.contenido, time: message.timestamp,
    }));
  },
  async send(type: string, content: string): Promise<Message> {
    const message = await request<BackendMessage>(apiRoutes.sendMessage(type), { method: 'POST', body: JSON.stringify({ contenido: content }) });
    return { id: String(message.id), author: 'user', text: message.contenido, time: message.timestamp };
  },
  async notificationsSummary(): Promise<NotificationsSummary> {
    const summary = await request<BackendNotificationsSummary>(apiRoutes.notificationsSummary);
    return { totalUnread: summary.total_no_leidas, hasUnread: summary.hay_no_leidas, byType: summary.por_tipo ?? {} };
  },
  async notifications(): Promise<UserNotification[]> {
    return (await request<BackendNotification[]>(apiRoutes.notifications)).map((notification) => ({
      id: String(notification.id),
      type: notification.tipo,
      title: notification.titulo ?? titleForNotificationType(notification.tipo),
      content: notification.contenido,
      timestamp: notification.timestamp,
      read: notification.leido,
    }));
  },
  async markNotificationsRead(types?: string[]) {
    return request<void>(apiRoutes.markNotificationsRead, { method: 'POST', body: JSON.stringify({ tipos: types }) });
  },
};
