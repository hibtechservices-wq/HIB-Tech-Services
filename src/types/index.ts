export type Currency = 'USD' | 'CDF';

export type PaymentMethod = 
  | 'CASH_USD' 
  | 'CASH_CDF' 
  | 'MPESA' 
  | 'ORANGE_MONEY' 
  | 'AIRTEL_MONEY' 
  | 'AFRIMONEY' 
  | 'BANK_TRANSFER' 
  | 'CREDIT';

export type ItemType = 'PRODUCT' | 'SERVICE';

export type ClientType = 'INDIVIDUAL' | 'COMPANY';

export type SaleStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export type DocumentType = 'INVOICE' | 'QUOTE_PROFORMA' | 'RECEIPT';

export type FiscalTaxGroup = 'A' | 'B' | 'C' | 'D'; 

export type DgiTransmissionStatus = 'TRANSMITTED' | 'PENDING' | 'FAILED' | 'OFFLINE_QUEUED';

export type UserRole = 
  | 'SUPER_ADMIN'     // Gérant / Administrateur Général (Accès complet)
  | 'MANAGER'         // Responsable Commercial / Superviseur
  | 'CASHIER'         // Caissier / Agent de Vente POS (Vente, encaissement, tickets)
  | 'ACCOUNTANT'      // Comptable / Déclarant Fiscal DGI (Factures, TVA, DGI, Dépenses)
  | 'STOCK_MANAGER';  // Magasinier / Gestionnaire de Stock (Inventaire, Réappro)

export interface UserPermissions {
  canAccessDashboard: boolean;
  canAccessPOS: boolean;
  canCreateInvoices: boolean;
  canDeleteInvoices: boolean;
  canManageClients: boolean;
  canAccessDGI: boolean;
  canManageCatalog: boolean;
  canManageExpenses: boolean;
  canManageEquipments?: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canViewProfitMargins: boolean;
  canChangeExchangeRate: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  pinCode: string; // Code PIN à 4 chiffres pour bascule rapide de caisse
  isActive: boolean;
  assignedRegister?: string; // ex: "Caisse 1 - Showroom Gombe"
  permissions: UserPermissions;
  lastLogin?: string;
  createdAt: string;
}

export interface ProductOrService {
  id: string;
  name: string;
  code: string;
  barcode?: string;
  type: ItemType;
  category: string;
  description?: string;
  unit: string;
  priceUSD: number;
  costPriceUSD: number;
  stockQty: number;
  minStockAlert: number;
  taxGroup: FiscalTaxGroup;
  isActive: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  companyName?: string;
  type: ClientType;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city: string;
  commune?: string;
  nif?: string;
  rccmOrNif?: string;
  isVatSubject?: boolean;
  totalSpentUSD: number;
  outstandingDebtUSD: number;
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  itemId: string;
  name: string;
  code: string;
  type: ItemType;
  unit: string;
  quantity: number;
  unitPriceUSD: number;
  unitCostPriceUSD: number;
  subtotalUSD: number;
  taxGroup: FiscalTaxGroup;
  taxRate: number;
  taxAmountUSD: number;
}

export interface PaymentEntry {
  id: string;
  date: string;
  amountUSD: number;
  amountCDF: number;
  method: PaymentMethod;
  reference?: string;
  recordedBy: string;
  notes?: string;
}

export interface VatGroupSummary {
  baseUSD: number;
  rate: number;
  vatUSD: number;
  totalTTC_USD: number;
}

export interface DgiVatBreakdown {
  groupA: VatGroupSummary;
  groupB: VatGroupSummary;
  groupC: VatGroupSummary;
  groupD: VatGroupSummary;
  totalHT_USD: number;
  totalTVA_USD: number;
  totalTTC_USD: number;
  totalHT_CDF: number;
  totalTVA_CDF: number;
  totalTTC_CDF: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  type: DocumentType;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  clientNif?: string;
  items: SaleItem[];
  subtotalUSD: number;
  discountUSD: number;
  taxPercent: number;
  taxAmountUSD: number;
  totalUSD: number;
  exchangeRate: number;
  totalCDF: number;
  amountPaidUSD: number;
  remainingDebtUSD: number;
  paymentStatus: SaleStatus;
  paymentMethod: PaymentMethod;
  dueDate?: string;
  notes?: string;
  cashierName: string;
  createdAt: string;
  paymentHistory: PaymentEntry[];

  // DGI RDC Normalization & Dispositif Électronique Fiscal (DEF)
  isNormalizedDGI: boolean;
  dgiNfu: string;
  dgiSecurityCode: string;
  dgiFiscalCounter: number;
  dgiTerminalId: string;
  dgiQrPayload: string;
  dgiVatBreakdown: DgiVatBreakdown;
  dgiExemptionReason?: string;

  // DGI Direct Teletransmission & Server receipt
  dgiTransmissionStatus: DgiTransmissionStatus;
  dgiReceiptNumber?: string;
  dgiTransmittedAt?: string;
  dgiServerSignature?: string;
}

export type ExpenseCategory = 
  | 'LOYER' 
  | 'TRANSPORT' 
  | 'ELECTRICITE_CARBURANT' 
  | 'COMMUNICATION' 
  | 'SALAIRES' 
  | 'FOURNITURES' 
  | 'IMPOTS_TAXES' 
  | 'MAINTENANCE' 
  | 'AUTRES';

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amountUSD: number;
  amountCDF: number;
  exchangeRate: number;
  paymentMethod: PaymentMethod;
  date: string;
  beneficiary?: string;
  recordedBy: string;
  receiptRef?: string;
}

export interface DgiApiConfig {
  environment: 'PRODUCTION' | 'SANDBOX';
  endpointUrl: string;
  dgiAccountEmail: string;
  apiKey: string;
  apiSecret: string;
  certificateNumber: string;
  autoTransmitOnIssue: boolean;
  isConnected: boolean;
  lastSyncTimestamp?: string;
  lastPingLatencyMs?: number;
}

export interface CompanySettings {
  name: string;
  slogan: string;
  activityDescription: string;
  rccm: string;
  idNat: string;
  nif: string;
  phone1: string;
  phone2?: string;
  email: string;
  address: string;
  city: string;
  country: string;
  exchangeRateUSD_CDF: number;
  displayCurrency: Currency;
  
  // DGI Fiscal Configuration
  dgiCenter: string;
  dgiRegime: string;
  dgiIsVatSubject: boolean;
  dgiDefTerminalId: string;
  dgiExemptionReason?: string;
  dgiFiscalCounterStart: number;
  dgiApiConfig: DgiApiConfig;
  
  enableTaxByDefault: boolean;
  taxPercent: number;
  mpesaNumber: string;
  mpesaName: string;
  orangeMoneyNumber: string;
  orangeMoneyName: string;
  airtelMoneyNumber: string;
  airtelMoneyName: string;
  afrimoneyNumber?: string;
  bankDetails: string;
  invoiceFooterNotes: string;
  cashierName: string;

  // Document, Invoicing & Visual Identity
  logoUrl?: string;
  showLogoOnInvoices?: boolean;
  signatureUrl?: string;
  stampUrl?: string;
  signatoryTitle?: string;
  signatoryName?: string;
  includeSignatureOnInvoicesByDefault?: boolean;
  includeStampOnInvoicesByDefault?: boolean;
}

// ----------------------------------------------------
// EQUIPMENT & NETWORK CONFIGURATIONS MANAGEMENT
// ----------------------------------------------------

export type EquipmentType = 
  | 'STARLINK'
  | 'CCTV_CAMERA'
  | 'NVR_DVR'
  | 'ROUTER'
  | 'ACCESS_POINT'
  | 'SWITCH_OTHER';

export type EquipmentStatus = 
  | 'ACTIVE'           // En Service / Opérationnel
  | 'MAINTENANCE'      // En Maintenance / Test
  | 'OFFLINE'          // Hors-Ligne / Incident
  | 'IN_STOCK';        // En Stock / Prêt pour Déploiement

export interface StarlinkSpecifics {
  kitNumber?: string;
  dishSerial?: string;
  terminalId?: string;
  accountEmail?: string;
  subscriptionPlan?: string; // ex: Standard Résidentiel, Mobile / Itinérance, Priorité Entreprise
  publicIpOrCgnat?: string;
  bypassModeEnabled?: boolean;
  routerModel?: string; // ex: Starlink Gen 2, Starlink Gen 3 WiFi 6, Starlink Mini
  wifiSsid?: string;
  wifiPassword?: string;
  gpsCoordinates?: string;
  obstructionPercentage?: number;
  averageLatencyMs?: number;
}

export interface CctvCameraSpecifics {
  brand?: string; // ex: Hikvision, Dahua, Uniview, TP-Link VIGI, Axis
  model?: string;
  cameraType?: 'DOME' | 'BULLET' | 'PTZ' | 'EYEBALL' | 'PANORAMIC';
  ipAddress?: string;
  httpPort?: number;
  rtspPort?: number;
  onvifPort?: number;
  username?: string;
  password?: string;
  resolution?: string; // ex: 2MP (1080p), 4MP (2K), 8MP (4K)
  codec?: string; // H.264 / H.265+
  lensSize?: string; // 2.8mm, 4mm, Varifocal 2.8-12mm
  hasAudio?: boolean;
  poeSwitchPort?: string;
  nvrChannel?: number;
  installedLocation?: string; // ex: Entrée Principale, Caisse, Parking, Entrepôt
}

export interface NvrDvrSpecifics {
  brand?: string; // Hikvision, Dahua, Uniview, Tiandy
  model?: string;
  channelCount?: number; // 4, 8, 16, 32, 64
  connectedCamerasCount?: number;
  ipAddress?: string;
  httpPort?: number;
  serverPort?: number;
  rtspPort?: number;
  username?: string;
  password?: string;
  p2pCloudId?: string; // Hik-Connect / DMSS / EZView
  p2pVerificationCode?: string;
  hddCapacityTb?: number; // ex: 4TB, 8TB, 16TB
  hddCount?: number;
  retentionDays?: number; // ex: 30 jours
  firmwareVersion?: string;
}

export interface RouterSpecifics {
  brand?: string; // MikroTik, Cisco, Ubiquiti, TP-Link, pfSense, Fortinet
  model?: string; // ex: CCR2004, RB5009, hEX S, ER-X, UDM Pro
  firmwareOrOs?: string; // RouterOS v7.14, UniFi OS 3.2, pfSense 2.7
  ipWan?: string;
  wanType?: 'STATIC' | 'DHCP' | 'PPPOE' | 'STARLINK_BYPASS' | 'LTE_BACKUP';
  ipLanGateway?: string; // ex: 192.168.88.1/24
  dhcpPoolRange?: string; // ex: 192.168.88.10-192.168.88.250
  dnsServers?: string; // 1.1.1.1, 8.8.8.8
  adminUsername?: string;
  adminPassword?: string;
  winboxOrWebPort?: number;
  sshPort?: number;
  vpnType?: 'WIREGUARD' | 'OPENVPN' | 'L2TP_IPSEC' | 'TAILSCALE' | 'NONE';
  vpnConfigDetails?: string;
  activeVlans?: string; // ex: VLAN 10 (Admin), VLAN 20 (Caméras), VLAN 30 (Invités)
  backupConfigScript?: string;
}

export interface AccessPointSpecifics {
  brand?: string; // Ubiquiti UniFi, MikroTik, TP-Link Omada, Ruijie, Aruba
  model?: string; // ex: UniFi U6 Pro, UniFi U6+, EAP650, cAP ax
  ipAddress?: string;
  macAddress?: string;
  controllerIpOrCloud?: string; // ex: https://unifi.ui.com ou 192.168.88.2:8443
  primarySsid?: string;
  primaryWifiPassword?: string;
  guestSsid?: string;
  guestWifiPassword?: string;
  frequencyBands?: string; // 2.4GHz / 5GHz / WiFi 6
  channel24G?: string; // Auto, 1, 6, 11
  channel5G?: string; // Auto, 36, 48, 149
  powerPoeRequirement?: string; // 802.3af PoE (15.4W), 802.3at PoE+ (30W)
  adminUsername?: string;
  adminPassword?: string;
}

export interface NetworkEquipment {
  id: string;
  name: string;
  type: EquipmentType;
  clientId: string;
  clientName: string;
  siteName: string;
  siteAddress?: string;
  serialNumber: string;
  macAddress?: string;
  status: EquipmentStatus;
  installationDate: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  assignedTechnician?: string;
  notes?: string;
  
  starlink?: StarlinkSpecifics;
  cctvCamera?: CctvCameraSpecifics;
  nvrDvr?: NvrDvrSpecifics;
  router?: RouterSpecifics;
  accessPoint?: AccessPointSpecifics;
  
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------
// GESTION DE CAISSE, AUTORISATION & CLÔTURE DE VENTE
// ----------------------------------------------------

export interface CashRegisterSession {
  id: string;
  sessionNumber: string;
  cashierId: string;
  cashierName: string;
  supervisorName?: string;
  openedAt: string;
  closedAt?: string;
  status: 'OPEN' | 'CLOSED';
  openingFloatUSD: number;
  openingFloatCDF: number;
  closingCountedUSD?: number;
  closingCountedCDF?: number;
  closingNotes?: string;
  
  // Computed totals for reporting (Rapport Z Journalier)
  totalSalesUSD?: number;
  totalSalesCDF?: number;
  cashSalesUSD?: number;
  cashSalesCDF?: number;
  mobileMoneyUSD?: number;
  mobileMoneyCDF?: number;
  bankSalesUSD?: number;
  bankSalesCDF?: number;
  vatCollectedUSD?: number;
  expectedCashInDrawerUSD?: number;
  expectedCashInDrawerCDF?: number;
  differenceUSD?: number;
  differenceCDF?: number;
  totalTransactionsCount?: number;
}

