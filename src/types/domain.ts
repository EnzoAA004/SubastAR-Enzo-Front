export type AuctionStatus = 'Próximas' | 'En vivo' | 'Finalizada';
export type AccountStatus = 'Regular' | 'Multado' | 'Bloqueado';

export interface Auction {
  id: string;
  name: string;
  date: string;
  location: string;
  category: string;
  currency: string;
  auctioneer: string;
  totalLots: number;
  status: AuctionStatus;
}

export interface Lot {
  id: string;
  auctionId: string;
  lotNumber: string;
  title: string;
  description: string;
  basePrice: number;
  category: string;
  image?: string;
  images?: string[];
  artist?: string;
  history?: string;
  creationDate?: string;
  owner?: string;
  status?: string;
}

export interface Bid {
  id: string;
  bidder: string;
  amount: number;
  timestamp: string;
}

export interface AuctionResult {
  status: string;
  lotId: string;
  lotName: string;
  won: boolean;
  finalAmount?: number;
  paymentMethod?: string;
  date?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'Tarjeta' | 'Cuenta bancaria' | 'Cheque certificado';
  label: string;
  detail: string;
  primary?: boolean;
  verified?: boolean;
  availableAmount?: number;
}

export interface Purchase {
  id: string;
  lot: Lot;
  amount: number;
  fee: number;
  deliveryStatus: string;
  paymentStatus: string;
  insuranceId?: string;
  insuranceNumber?: string;
  auctionName?: string;
  date?: string;
  shippingCost?: number;
  total?: number;
  paymentMethod?: string;
  deliveryAddress?: string;
  invoiceUrl?: string;
}

export interface OwnedAsset {
  id: string;
  title: string;
  category: string;
  status: 'Pendiente' | 'Aceptado' | 'Rechazado';
  detail: string;
  technicalDescription?: string;
  quantity?: number;
  additionalInformation?: string;
  originPeriod?: string;
  artistDesigner?: string;
  historicalData?: string;
  basePrice?: number;
  suggestedBasePrice?: number | null;
  suggestedBasePriceCurrency?: string | null;
  commission?: number;
  assignedAuction?: string;
  depositLocation?: string;
  policyId?: string;
  photosUploaded?: number;
  documentationAttached?: boolean;
  photos?: {
    id: string;
    name?: string;
    publicId?: string;
    url?: string;
    type?: string;
  }[];
  documents?: {
    id: string;
    name?: string;
    url?: string;
    type?: string;
    contentType?: string;
  }[];
}

export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  unread: number;
}

export interface Message {
  id: string;
  author: 'bot' | 'user';
  text: string;
  time: string;
}

export type NotificationsSummary = {
  totalUnread: number;
  hasUnread: boolean;
  byType: Record<string, number>;
};

export type UserNotification = {
  id: string;
  type: string;
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
};

export interface UserProfile {
  name: string;
  email: string;
  category: string;
  status: AccountStatus;
  penalty: number;
}

export interface Session {
  token: string;
  profile: UserProfile;
}

export interface RegistrationDraft {
  email: string;
  verificationToken?: string;
  returnTo?: string;
}

export interface AccountState {
  status: AccountStatus;
  penalty: number;
  message?: string;
}

export interface UserMetrics {
  participated: number;
  won: number;
  successRate: number;
  totalBid: number;
  totalPaid: number;
  averageBid: number;
  highestBid: number;
  lowestBid: number;
  winsByMonth: { month: string; count: number }[];
}

export interface UserDetails extends UserProfile {
  address?: string;
  country?: string;
  dni?: string;
}

export interface Country {
  id: string;
  code: string;
  name: string;
  capital?: string;
  nationality?: string;
  languages?: string;
}

export type PaymentMethodKind = 'cuenta_bancaria' | 'tarjeta_credito' | 'cheque_certificado';

export interface PaymentMethodCreate {
  type: PaymentMethodKind;
  bankName?: string;
  bankCountry?: string;
  cbuIban?: string;
  reservedFunds?: string;
  cardNumber?: string;
  holder?: string;
  expiry?: string;
  securityCode?: string;
  holderDni?: string;
  issuerBank?: string;
  certifiedAmount?: string;
  chequeNumber?: string;
  chequePhoto?: FileUpload;
}

export interface FileUpload {
  uri: string;
  name: string;
  type: string;
  file?: Blob;
}

export interface AssetSubmission {
  code: string;
  type: string;
  status: string;
  currentStep: string;
  photosUploaded: number;
  minimumPhotos: number;
  mayConfirm: boolean;
}

export interface AssetDetailsInput {
  type: string;
  name: string;
  technicalDescription: string;
  amount: number;
  originPeriod?: string;
  artistDesigner?: string;
  creationDate?: string;
  history?: string;
  additionalInformation?: string;
}

export interface InsurancePolicy {
  id?: string;
  number: string;
  company: string;
  beneficiary?: string;
  insuredValue: number;
  validFrom?: string;
  validUntil?: string;
  coverage?: string;
  items: string[];
  contact?: { phone?: string; email?: string; web?: string };
}
