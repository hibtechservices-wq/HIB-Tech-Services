import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  ProductOrService,
  Client,
  Sale,
  SaleStatus,
  Expense,
  CompanySettings,
  Currency,
  PaymentMethod,
  SaleItem,
  DocumentType,
  PaymentEntry,
  DgiVatBreakdown,
  FiscalTaxGroup,
  AppUser,
  UserPermissions,
  UserRole,
  NetworkEquipment,
  CashRegisterSession,
} from '../types';
import {
  initialCompanySettings,
  initialProductsAndServices,
  initialClients,
  initialSales,
  initialExpenses,
  initialCashSessions,
} from '../data/initialData';
import { initialUsers, defaultPermissionsByRole } from '../data/initialUsers';
import { initialEquipments } from '../data/initialEquipments';
import { generateDgiSecurityCode, generateDgiQrPayload } from '../utils/formatters';

interface CartItem extends SaleItem {
  maxStock?: number;
}

interface AppContextType {
  // Data
  products: ProductOrService[];
  clients: Client[];
  sales: Sale[];
  expenses: Expense[];
  settings: CompanySettings;
  users: AppUser[];
  currentUser: AppUser;
  isSessionLocked: boolean;
  
  // User Authentication & Permissions
  setCurrentUser: (user: AppUser) => void;
  switchUserByPin: (pin: string) => { success: boolean; user?: AppUser; message?: string };
  addUser: (userData: Omit<AppUser, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, userData: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  lockSession: () => void;
  logout: () => void;
  unlockSession: (user: AppUser, pin?: string) => { success: boolean; message?: string };

  // Navigation & UI View
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCurrency: Currency;
  setSelectedCurrency: (curr: Currency) => void;
  
  // Rate changer
  updateExchangeRate: (newRate: number) => void;
  updateSettings: (newSettings: CompanySettings) => void;

  // Catalog Actions
  addProductOrService: (item: Omit<ProductOrService, 'id' | 'createdAt'>) => void;
  updateProductOrService: (id: string, item: Partial<ProductOrService>) => void;
  deleteProductOrService: (id: string) => void;
  adjustStock: (id: string, deltaQty: number) => void;

  // Client Actions
  addClient: (client: Omit<Client, 'id' | 'totalSpentUSD' | 'outstandingDebtUSD' | 'createdAt'>) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Sales & Invoices Actions
  createSale: (saleData: {
    type: DocumentType;
    clientId: string;
    items: SaleItem[];
    discountUSD: number;
    taxPercent: number;
    amountPaidUSD: number;
    paymentMethod: PaymentMethod;
    dueDate?: string;
    notes?: string;
    customDate?: string;
    clientNif?: string;
    isNormalizedDGI?: boolean;
    dgiExemptionReason?: string;
  }) => Sale;
  recordPayment: (saleId: string, payment: {
    amountUSD: number;
    method: PaymentMethod;
    reference?: string;
    notes?: string;
  }) => void;
  updateSale: (saleId: string, updatedData: {
    type?: DocumentType;
    clientId?: string;
    items?: SaleItem[];
    discountUSD?: number;
    taxPercent?: number;
    amountPaidUSD?: number;
    paymentMethod?: PaymentMethod;
    dueDate?: string;
    notes?: string;
    clientNif?: string;
    isNormalizedDGI?: boolean;
    dgiExemptionReason?: string;
  }) => void;
  convertQuoteToInvoice: (saleId: string) => void;
  deleteSale: (saleId: string) => void;

  // Expense Actions
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;

  // Equipment & Network Config Actions
  equipments: NetworkEquipment[];
  addEquipment: (equipmentData: Omit<NetworkEquipment, 'id' | 'createdAt' | 'updatedAt'>) => NetworkEquipment;
  updateEquipment: (id: string, equipmentData: Partial<NetworkEquipment>) => void;
  deleteEquipment: (id: string) => void;
  activePrintEquipment: NetworkEquipment | null;
  setActivePrintEquipment: (equipment: NetworkEquipment | null) => void;

  // Print & WhatsApp Modals triggers
  activePrintSale: Sale | null;
  setActivePrintSale: (sale: Sale | null) => void;
  activeWhatsAppClient: { client: Client; sale: Sale | null } | null;
  setActiveWhatsAppClient: (payload: { client: Client; sale: Sale | null } | null) => void;

  // Quick switch modal
  isUserSwitchModalOpen: boolean;
  setIsUserSwitchModalOpen: (open: boolean) => void;

  // Cart / POS state
  cart: CartItem[];
  addToCart: (item: ProductOrService, qty?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;

  // Cash Register Sessions & Closures
  cashSessions: CashRegisterSession[];
  currentCashSession: CashRegisterSession | null;
  openCashSession: (data: {
    openingFloatUSD: number;
    openingFloatCDF: number;
    cashierName?: string;
    supervisorName?: string;
  }) => CashRegisterSession;
  closeCashSession: (data: {
    countedUSD: number;
    countedCDF: number;
    notes?: string;
    supervisorName?: string;
  }) => CashRegisterSession;

  // Backup & Reset
  resetToDemoData: () => void;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonData: string) => boolean;

  // Computed metrics
  metrics: {
    totalRevenueUSD: number;
    totalRevenueCDF: number;
    totalCollectedUSD: number;
    totalDebtsUSD: number;
    totalExpensesUSD: number;
    netProfitUSD: number;
    productsCount: number;
    servicesCount: number;
    lowStockCount: number;
    unpaidInvoicesCount: number;
    totalTvaCollectedUSD: number;
    totalTvaCollectedCDF: number;
    totalTaxableBaseUSD: number;
    normalizedInvoicesCount: number;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PRODUCTS = 'congobiz_products_v4';
const STORAGE_KEY_CLIENTS = 'congobiz_clients_v4';
const STORAGE_KEY_SALES = 'congobiz_sales_v4';
const STORAGE_KEY_EXPENSES = 'congobiz_expenses_v4';
const STORAGE_KEY_SETTINGS = 'congobiz_settings_v4';
const STORAGE_KEY_USERS = 'congobiz_users_v4';
const STORAGE_KEY_CURRENT_USER = 'congobiz_current_user_v4';
const STORAGE_KEY_EQUIPMENTS = 'congobiz_equipments_v4';
const STORAGE_KEY_CASH_SESSIONS = 'congobiz_cash_sessions_v4';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [products, setProducts] = useState<ProductOrService[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return saved ? JSON.parse(saved) : initialProductsAndServices;
  });

  const [equipments, setEquipments] = useState<NetworkEquipment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_EQUIPMENTS);
    return saved ? JSON.parse(saved) : initialEquipments;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CLIENTS);
    return saved ? JSON.parse(saved) : initialClients;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SALES);
    return saved ? JSON.parse(saved) : initialSales;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_EXPENSES);
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  const [settings, setSettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? JSON.parse(saved) : initialCompanySettings;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialUsers[0];
  });

  // Cash Register Sessions
  const [cashSessions, setCashSessions] = useState<CashRegisterSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CASH_SESSIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= initialCashSessions.length) {
          return parsed;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const parsedIds = new Set(parsed.map((p: any) => p.id));
          return [...parsed, ...initialCashSessions.filter(s => !parsedIds.has(s.id))];
        }
      } catch (e) {}
    }
    return initialCashSessions;
  });

  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(settings.displayCurrency || 'USD');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modals controllers
  const [activePrintSale, setActivePrintSale] = useState<Sale | null>(null);
  const [activePrintEquipment, setActivePrintEquipment] = useState<NetworkEquipment | null>(null);
  const [activeWhatsAppClient, setActiveWhatsAppClient] = useState<{ client: Client; sale: Sale | null } | null>(null);
  const [isUserSwitchModalOpen, setIsUserSwitchModalOpen] = useState<boolean>(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EQUIPMENTS, JSON.stringify(equipments));
  }, [equipments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CASH_SESSIONS, JSON.stringify(cashSessions));
  }, [cashSessions]);

  // Permissions check helper
  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return Boolean(currentUser.permissions?.[permission]);
  };

  // Lock and Logout handlers
  const lockSession = () => {
    setIsSessionLocked(true);
  };

  const logout = () => {
    setIsSessionLocked(true);
  };

  const unlockSession = (user: AppUser, pin?: string): { success: boolean; message?: string } => {
    if (!user.isActive) {
      return { success: false, message: 'Ce compte utilisateur est actuellement verrouillé.' };
    }
    if (pin !== undefined && user.pinCode !== pin) {
      return { success: false, message: 'Code PIN incorrect. Veuillez réessayer.' };
    }
    const updatedUser = { ...user, lastLogin: new Date().toISOString() };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    setIsSessionLocked(false);

    if (updatedUser.role === 'CASHIER') {
      setActiveTab('pos');
    } else if (updatedUser.role === 'STOCK_MANAGER') {
      setActiveTab('catalog');
    }

    return { success: true };
  };

  // Switch user by PIN
  const switchUserByPin = (pin: string): { success: boolean; user?: AppUser; message?: string } => {
    const user = users.find(u => u.pinCode === pin && u.isActive);
    if (user) {
      const updatedUser = { ...user, lastLogin: new Date().toISOString() };
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      setIsSessionLocked(false);
      
      // Auto redirect to appropriate view if current tab is not authorized
      if (updatedUser.role === 'CASHIER') {
        setActiveTab('pos');
      } else if (updatedUser.role === 'STOCK_MANAGER') {
        setActiveTab('catalog');
      }

      return { success: true, user: updatedUser };
    }
    return { success: false, message: 'Code PIN incorrect ou utilisateur inactif.' };
  };

  const addUser = (userData: Omit<AppUser, 'id' | 'createdAt'>) => {
    const newUser: AppUser = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      permissions: userData.permissions || defaultPermissionsByRole[userData.role],
    };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (id: string, updated: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updated } : u)));
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updated }));
    }
  };

  const deleteUser = (id: string) => {
    if (users.length <= 1) {
      alert('Impossible de supprimer le seul utilisateur du système.');
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // Update Exchange rate
  const updateExchangeRate = (newRate: number) => {
    if (newRate <= 0) return;
    setSettings(prev => ({
      ...prev,
      exchangeRateUSD_CDF: newRate,
    }));
  };

  const updateSettings = (newSettings: CompanySettings) => {
    setSettings(newSettings);
    if (newSettings.displayCurrency) {
      setSelectedCurrency(newSettings.displayCurrency);
    }
  };

  // Products & Services
  const addProductOrService = (item: Omit<ProductOrService, 'id' | 'createdAt'>) => {
    const newItem: ProductOrService = {
      ...item,
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setProducts(prev => [newItem, ...prev]);
  };

  const updateProductOrService = (id: string, updated: Partial<ProductOrService>) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...updated } : p)));
  };

  const deleteProductOrService = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const adjustStock = (id: string, deltaQty: number) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id && p.type === 'PRODUCT') {
          const newQty = Math.max(0, p.stockQty + deltaQty);
          return { ...p, stockQty: newQty };
        }
        return p;
      })
    );
  };

  // Clients
  const addClient = (clientData: Omit<Client, 'id' | 'totalSpentUSD' | 'outstandingDebtUSD' | 'createdAt'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: `cli-${Date.now()}`,
      totalSpentUSD: 0,
      outstandingDebtUSD: 0,
      createdAt: new Date().toISOString(),
    };
    setClients(prev => [newClient, ...prev]);
    return newClient;
  };

  const updateClient = (id: string, updated: Partial<Client>) => {
    setClients(prev => prev.map(c => (c.id === id ? { ...c, ...updated } : c)));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  // Sales with DGI Normalization Engine & Assigned Cashier
  const createSale = (saleData: {
    type: DocumentType;
    clientId: string;
    items: SaleItem[];
    discountUSD: number;
    taxPercent: number;
    amountPaidUSD: number;
    paymentMethod: PaymentMethod;
    dueDate?: string;
    notes?: string;
    customDate?: string;
    clientNif?: string;
    isNormalizedDGI?: boolean;
    dgiExemptionReason?: string;
  }): Sale => {
    const client = clients.find(c => c.id === saleData.clientId);
    const clientName = client ? (client.companyName ? `${client.name} (${client.companyName})` : client.name) : 'Client Comptoir (Consommateur Final)';
    const clientPhone = client ? client.phone : '';
    const clientAddress = client ? `${client.address || ''} ${client.commune || ''} ${client.city || ''}`.trim() : '';
    const clientNif = saleData.clientNif || client?.nif || client?.rccmOrNif || 'NON-ASSUJETTI';

    const rate = settings.exchangeRateUSD_CDF || 2850;
    const isNormalized = saleData.isNormalizedDGI !== undefined ? saleData.isNormalizedDGI : true;

    const subtotalUSD = saleData.items.reduce((sum, item) => sum + item.subtotalUSD, 0);
    const discount = Math.max(0, saleData.discountUSD || 0);

    let groupABase = 0;
    let groupBBase = 0;
    let groupCBase = 0;
    let groupDBase = 0;

    saleData.items.forEach(item => {
      const itemRatio = subtotalUSD > 0 ? (item.subtotalUSD / subtotalUSD) : 0;
      const netItemSubtotal = Math.max(0, item.subtotalUSD - (discount * itemRatio));

      if (item.taxGroup === 'A') groupABase += netItemSubtotal;
      else if (item.taxGroup === 'B') groupBBase += netItemSubtotal;
      else if (item.taxGroup === 'C') groupCBase += netItemSubtotal;
      else if (item.taxGroup === 'D') groupDBase += netItemSubtotal;
    });

    const isVatActive = saleData.taxPercent > 0 && settings.dgiIsVatSubject;
    const vatGroupARate = isVatActive ? 16 : 0;
    const groupAVatUSD = (groupABase * vatGroupARate) / 100;
    const totalTvaUSD = groupAVatUSD;

    const totalHT_USD = Math.max(0, subtotalUSD - discount);
    const totalTTC_USD = totalHT_USD + totalTvaUSD;
    const totalCDF = Math.round(totalTTC_USD * rate);

    const paidUSD = Math.min(totalTTC_USD, Math.max(0, saleData.amountPaidUSD));
    const remainingDebtUSD = Math.max(0, totalTTC_USD - paidUSD);

    let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
    if (paidUSD >= totalTTC_USD) {
      paymentStatus = 'PAID';
    } else if (paidUSD > 0) {
      paymentStatus = 'PARTIAL';
    }

    const year = new Date().getFullYear();
    const countForType = sales.filter(s => s.type === saleData.type).length + 1;
    const prefix = saleData.type === 'INVOICE' ? 'FAC' : saleData.type === 'QUOTE_PROFORMA' ? 'DEV' : 'REC';
    const saleNumber = `${prefix}-${year}-${String(countForType).padStart(4, '0')}`;

    const lastFiscalCounter = sales.reduce((max, s) => Math.max(max, s.dgiFiscalCounter || 0), settings.dgiFiscalCounterStart || 1000);
    const dgiFiscalCounter = lastFiscalCounter + 1;
    const dgiTerminalId = settings.dgiDefTerminalId || 'DEF-CD-KIN-009482';
    const dgiNfu = `SFN-${year}-${dgiTerminalId.slice(-5)}-${String(dgiFiscalCounter).padStart(6, '0')}`;
    const dateIso = saleData.customDate || new Date().toISOString();

    const dgiSecurityCode = generateDgiSecurityCode(
      settings.nif || 'A2109845B',
      dgiTerminalId,
      dgiFiscalCounter,
      totalTTC_USD,
      dateIso
    );

    const randomDgiReceipt = `REC-DGI-${year}-${Math.floor(100000 + Math.random() * 900000)}`;

    const dgiVatBreakdown: DgiVatBreakdown = {
      groupA: { baseUSD: groupABase, rate: vatGroupARate, vatUSD: groupAVatUSD, totalTTC_USD: groupABase + groupAVatUSD },
      groupB: { baseUSD: groupBBase, rate: 0, vatUSD: 0, totalTTC_USD: groupBBase },
      groupC: { baseUSD: groupCBase, rate: 0, vatUSD: 0, totalTTC_USD: groupCBase },
      groupD: { baseUSD: groupDBase, rate: 0, vatUSD: 0, totalTTC_USD: groupDBase },
      totalHT_USD,
      totalTVA_USD: totalTvaUSD,
      totalTTC_USD,
      totalHT_CDF: Math.round(totalHT_USD * rate),
      totalTVA_CDF: Math.round(totalTvaUSD * rate),
      totalTTC_CDF: totalCDF,
    };

    const cashierName = currentUser?.name || settings.cashierName || 'Responsable Ventes';

    const paymentHistory: PaymentEntry[] = [];
    if (paidUSD > 0) {
      paymentHistory.push({
        id: `pay-${Date.now()}`,
        date: dateIso,
        amountUSD: paidUSD,
        amountCDF: Math.round(paidUSD * rate),
        method: saleData.paymentMethod,
        recordedBy: cashierName,
        notes: paidUSD >= totalTTC_USD ? 'Règlement total' : 'Acompte initial',
      });
    }

    const tempSaleObj: Sale = {
      id: `sale-${Date.now()}`,
      saleNumber,
      type: saleData.type,
      clientId: saleData.clientId,
      clientName,
      clientPhone,
      clientAddress,
      clientNif,
      items: saleData.items,
      subtotalUSD,
      discountUSD: discount,
      taxPercent: isVatActive ? 16 : 0,
      taxAmountUSD: totalTvaUSD,
      totalUSD: totalTTC_USD,
      exchangeRate: rate,
      totalCDF,
      amountPaidUSD: paidUSD,
      remainingDebtUSD,
      paymentStatus,
      paymentMethod: saleData.paymentMethod,
      dueDate: saleData.dueDate,
      notes: saleData.notes,
      cashierName,
      createdAt: dateIso,
      paymentHistory,
      isNormalizedDGI: isNormalized,
      dgiNfu,
      dgiSecurityCode,
      dgiFiscalCounter,
      dgiTerminalId,
      dgiQrPayload: '',
      dgiVatBreakdown,
      dgiExemptionReason: saleData.dgiExemptionReason,
      dgiTransmissionStatus: 'TRANSMITTED',
      dgiReceiptNumber: randomDgiReceipt,
      dgiTransmittedAt: dateIso,
      dgiServerSignature: `DGI-SIG-${dgiSecurityCode.slice(0, 8)}-${Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase()}`,
    };

    tempSaleObj.dgiQrPayload = generateDgiQrPayload(tempSaleObj, settings);

    if (saleData.type === 'INVOICE' || saleData.type === 'RECEIPT') {
      setProducts(prev =>
        prev.map(p => {
          const soldItem = saleData.items.find(it => it.itemId === p.id && it.type === 'PRODUCT');
          if (soldItem) {
            return {
              ...p,
              stockQty: Math.max(0, p.stockQty - soldItem.quantity),
            };
          }
          return p;
        })
      );

      if (client && client.id !== 'comptoir') {
        setClients(prev =>
          prev.map(c => {
            if (c.id === client.id) {
              return {
                ...c,
                totalSpentUSD: c.totalSpentUSD + totalTTC_USD,
                outstandingDebtUSD: c.outstandingDebtUSD + remainingDebtUSD,
              };
            }
            return c;
          })
        );
      }
    }

    setSales(prev => [tempSaleObj, ...prev]);
    return tempSaleObj;
  };

  const recordPayment = (
    saleId: string,
    payment: {
      amountUSD: number;
      method: PaymentMethod;
      reference?: string;
      notes?: string;
    }
  ) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || payment.amountUSD <= 0) return;

    const rate = settings.exchangeRateUSD_CDF || 2850;
    const paymentAmount = Math.min(sale.remainingDebtUSD, payment.amountUSD);
    const newPaidTotal = sale.amountPaidUSD + paymentAmount;
    const newRemainingDebt = Math.max(0, sale.totalUSD - newPaidTotal);
    const newStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = newRemainingDebt <= 0 ? 'PAID' : 'PARTIAL';

    const newPaymentEntry: PaymentEntry = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString(),
      amountUSD: paymentAmount,
      amountCDF: Math.round(paymentAmount * rate),
      method: payment.method,
      reference: payment.reference,
      recordedBy: currentUser?.name || settings.cashierName || 'Responsable Caisse',
      notes: payment.notes,
    };

    setSales(prev =>
      prev.map(s => {
        if (s.id === saleId) {
          return {
            ...s,
            amountPaidUSD: newPaidTotal,
            remainingDebtUSD: newRemainingDebt,
            paymentStatus: newStatus,
            paymentHistory: [newPaymentEntry, ...s.paymentHistory],
          };
        }
        return s;
      })
    );

    if (sale.clientId && sale.clientId !== 'comptoir') {
      setClients(prev =>
        prev.map(c => {
          if (c.id === sale.clientId) {
            return {
              ...c,
              outstandingDebtUSD: Math.max(0, c.outstandingDebtUSD - paymentAmount),
            };
          }
          return c;
        })
      );
    }
  };

  const updateSale = (saleId: string, updatedData: {
    type?: DocumentType;
    clientId?: string;
    items?: SaleItem[];
    discountUSD?: number;
    taxPercent?: number;
    amountPaidUSD?: number;
    paymentMethod?: PaymentMethod;
    dueDate?: string;
    notes?: string;
    clientNif?: string;
    isNormalizedDGI?: boolean;
    dgiExemptionReason?: string;
  }) => {
    const oldSale = sales.find(s => s.id === saleId);
    if (!oldSale) return;

    const rate = settings.exchangeRateUSD_CDF || 2850;
    const newItems = updatedData.items || oldSale.items;
    const newDocType = updatedData.type || oldSale.type;
    const newClientId = updatedData.clientId !== undefined ? updatedData.clientId : oldSale.clientId;
    const newClient = clients.find(c => c.id === newClientId);
    const newClientName = newClient ? newClient.name : oldSale.clientName;
    const newClientPhone = newClient ? newClient.phone : oldSale.clientPhone;
    const newClientNif = updatedData.clientNif !== undefined ? updatedData.clientNif : (newClient?.nif || oldSale.clientNif);
    const newDiscountUSD = updatedData.discountUSD !== undefined ? Math.max(0, updatedData.discountUSD) : oldSale.discountUSD;
    const newTaxPercent = updatedData.taxPercent !== undefined ? Math.max(0, updatedData.taxPercent) : oldSale.taxPercent;
    const newAmountPaidUSD = updatedData.amountPaidUSD !== undefined ? Math.max(0, updatedData.amountPaidUSD) : oldSale.amountPaidUSD;
    const newPaymentMethod = updatedData.paymentMethod || oldSale.paymentMethod;
    const newDueDate = updatedData.dueDate !== undefined ? updatedData.dueDate : oldSale.dueDate;
    const newNotes = updatedData.notes !== undefined ? updatedData.notes : oldSale.notes;

    // Recalculate totals
    const subtotalUSD = newItems.reduce((sum, it) => sum + it.subtotalUSD, 0);
    const taxable = Math.max(0, subtotalUSD - newDiscountUSD);
    const groupABase = newItems.filter(i => i.taxGroup === 'A').reduce((sum, it) => {
      const ratio = subtotalUSD > 0 ? it.subtotalUSD / subtotalUSD : 0;
      return sum + (it.subtotalUSD - (newDiscountUSD * ratio));
    }, 0);
    const taxAmountUSD = newTaxPercent > 0 ? (Math.max(0, groupABase) * (newTaxPercent / 100)) : 0;
    const totalUSD = taxable + taxAmountUSD;
    const totalCDF = Math.round(totalUSD * rate);
    const remainingDebtUSD = Math.max(0, totalUSD - newAmountPaidUSD);
    const paymentStatus: SaleStatus = remainingDebtUSD <= 0 ? 'PAID' : newAmountPaidUSD > 0 ? 'PARTIAL' : 'UNPAID';

    // Stock adjustments: if old was invoice/receipt, restore old items, deduct new items
    if (oldSale.type === 'INVOICE' || oldSale.type === 'RECEIPT') {
      setProducts(prev =>
        prev.map(p => {
          const oldItem = oldSale.items.find(it => it.itemId === p.id && it.type === 'PRODUCT');
          const newItem = newItems.find(it => it.itemId === p.id && it.type === 'PRODUCT');
          let currentStock = p.stockQty;
          if (oldItem) currentStock += oldItem.quantity;
          if (newItem && (newDocType === 'INVOICE' || newDocType === 'RECEIPT')) currentStock -= newItem.quantity;
          return { ...p, stockQty: Math.max(0, currentStock) };
        })
      );
    } else if (newDocType === 'INVOICE' || newDocType === 'RECEIPT') {
      // If converted from quote to invoice
      setProducts(prev =>
        prev.map(p => {
          const newItem = newItems.find(it => it.itemId === p.id && it.type === 'PRODUCT');
          if (newItem) {
            return { ...p, stockQty: Math.max(0, p.stockQty - newItem.quantity) };
          }
          return p;
        })
      );
    }

    // Client debt and spending adjustment
    if (oldSale.clientId && oldSale.clientId !== 'comptoir') {
      setClients(prev =>
        prev.map(c => {
          if (c.id === oldSale.clientId) {
            return {
              ...c,
              totalSpentUSD: Math.max(0, c.totalSpentUSD - oldSale.totalUSD),
              outstandingDebtUSD: Math.max(0, c.outstandingDebtUSD - oldSale.remainingDebtUSD),
            };
          }
          return c;
        })
      );
    }
    if (newClientId && newClientId !== 'comptoir' && (newDocType === 'INVOICE' || newDocType === 'RECEIPT')) {
      setClients(prev =>
        prev.map(c => {
          if (c.id === newClientId) {
            return {
              ...c,
              totalSpentUSD: c.totalSpentUSD + totalUSD,
              outstandingDebtUSD: c.outstandingDebtUSD + remainingDebtUSD,
            };
          }
          return c;
        })
      );
    }

    // Recalculate DGI Vat Breakdown
    const groupBBase = newItems.filter(i => i.taxGroup === 'B').reduce((sum, it) => sum + it.subtotalUSD, 0);
    const groupCBase = newItems.filter(i => i.taxGroup === 'C').reduce((sum, it) => sum + it.subtotalUSD, 0);
    const groupDBase = newItems.filter(i => i.taxGroup === 'D').reduce((sum, it) => sum + it.subtotalUSD, 0);

    const dgiVatBreakdown: DgiVatBreakdown = {
      groupA: { baseUSD: groupABase, rate: newTaxPercent, vatUSD: taxAmountUSD, totalTTC_USD: groupABase + taxAmountUSD },
      groupB: { baseUSD: groupBBase, rate: 0, vatUSD: 0, totalTTC_USD: groupBBase },
      groupC: { baseUSD: groupCBase, rate: 0, vatUSD: 0, totalTTC_USD: groupCBase },
      groupD: { baseUSD: groupDBase, rate: 0, vatUSD: 0, totalTTC_USD: groupDBase },
      totalHT_USD: taxable,
      totalTVA_USD: taxAmountUSD,
      totalTTC_USD: totalUSD,
      totalHT_CDF: Math.round(taxable * rate),
      totalTVA_CDF: Math.round(taxAmountUSD * rate),
      totalTTC_CDF: totalCDF,
    };

    const updatedSaleObj: Sale = {
      ...oldSale,
      type: newDocType,
      clientId: newClientId,
      clientName: newClientName,
      clientPhone: newClientPhone,
      clientNif: newClientNif,
      items: newItems,
      subtotalUSD,
      discountUSD: newDiscountUSD,
      taxPercent: newTaxPercent,
      taxAmountUSD,
      totalUSD,
      exchangeRate: rate,
      totalCDF,
      amountPaidUSD: newAmountPaidUSD,
      remainingDebtUSD,
      paymentMethod: newPaymentMethod,
      paymentStatus,
      dueDate: newDueDate,
      notes: newNotes,
      dgiVatBreakdown,
      isNormalizedDGI: updatedData.isNormalizedDGI !== undefined ? updatedData.isNormalizedDGI : oldSale.isNormalizedDGI,
      dgiExemptionReason: updatedData.dgiExemptionReason || oldSale.dgiExemptionReason,
    };

    if (updatedSaleObj.isNormalizedDGI) {
      updatedSaleObj.dgiQrPayload = generateDgiQrPayload(updatedSaleObj, settings);
    }

    setSales(prev => prev.map(s => s.id === saleId ? updatedSaleObj : s));
  };

  const convertQuoteToInvoice = (saleId: string) => {
    const quote = sales.find(s => s.id === saleId);
    if (!quote || quote.type !== 'QUOTE_PROFORMA') return;

    const year = new Date().getFullYear();
    const invoiceCount = sales.filter(s => s.type === 'INVOICE').length + 1;
    const newInvoiceNumber = `FAC-${year}-${String(invoiceCount).padStart(4, '0')}`;

    setProducts(prev =>
      prev.map(p => {
        const soldItem = quote.items.find(it => it.itemId === p.id && it.type === 'PRODUCT');
        if (soldItem) {
          return {
            ...p,
            stockQty: Math.max(0, p.stockQty - soldItem.quantity),
          };
        }
        return p;
      })
    );

    if (quote.clientId && quote.clientId !== 'comptoir') {
      setClients(prev =>
        prev.map(c => {
          if (c.id === quote.clientId) {
            return {
              ...c,
              totalSpentUSD: c.totalSpentUSD + quote.totalUSD,
              outstandingDebtUSD: c.outstandingDebtUSD + quote.remainingDebtUSD,
            };
          }
          return c;
        })
      );
    }

    setSales(prev =>
      prev.map(s => {
        if (s.id === saleId) {
          return {
            ...s,
            type: 'INVOICE',
            saleNumber: newInvoiceNumber,
            notes: (s.notes ? s.notes + '\n' : '') + `(Converti depuis le Devis Proforma ${quote.saleNumber})`,
          };
        }
        return s;
      })
    );
  };

  const deleteSale = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    if (sale.type === 'INVOICE' || sale.type === 'RECEIPT') {
      setProducts(prev =>
        prev.map(p => {
          const item = sale.items.find(it => it.itemId === p.id && it.type === 'PRODUCT');
          if (item) {
            return {
              ...p,
              stockQty: p.stockQty + item.quantity,
            };
          }
          return p;
        })
      );

      if (sale.clientId && sale.clientId !== 'comptoir') {
        setClients(prev =>
          prev.map(c => {
            if (c.id === sale.clientId) {
              return {
                ...c,
                totalSpentUSD: Math.max(0, c.totalSpentUSD - sale.totalUSD),
                outstandingDebtUSD: Math.max(0, c.outstandingDebtUSD - sale.remainingDebtUSD),
              };
            }
            return c;
          })
        );
      }
    }

    setSales(prev => prev.filter(s => s.id !== saleId));
  };

  const addExpense = (expenseData: Omit<Expense, 'id'>) => {
    const rate = settings.exchangeRateUSD_CDF || 2850;
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      exchangeRate: rate,
      amountCDF: Math.round(expenseData.amountUSD * rate),
      recordedBy: currentUser?.name || 'Responsable',
    };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Equipment CRUD
  const addEquipment = (equipmentData: Omit<NetworkEquipment, 'id' | 'createdAt' | 'updatedAt'>): NetworkEquipment => {
    const now = new Date().toISOString();
    const newEquipment: NetworkEquipment = {
      ...equipmentData,
      id: `eq-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    setEquipments(prev => [newEquipment, ...prev]);
    return newEquipment;
  };

  const updateEquipment = (id: string, updatedData: Partial<NetworkEquipment>) => {
    const now = new Date().toISOString();
    setEquipments(prev =>
      prev.map(eq =>
        eq.id === id
          ? {
              ...eq,
              ...updatedData,
              updatedAt: now,
            }
          : eq
      )
    );
  };

  const deleteEquipment = (id: string) => {
    setEquipments(prev => prev.filter(eq => eq.id !== id));
  };

  const addToCart = (item: ProductOrService, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.itemId === item.id);
      if (existing) {
        const nextQty = existing.quantity + qty;
        return prev.map(i =>
          i.itemId === item.id
            ? {
                ...i,
                quantity: nextQty,
                subtotalUSD: nextQty * i.unitPriceUSD,
              }
            : i
        );
      } else {
        const isTaxed = item.taxGroup === 'A';
        return [
          ...prev,
          {
            itemId: item.id,
            name: item.name,
            code: item.code,
            type: item.type,
            unit: item.unit,
            quantity: qty,
            unitPriceUSD: item.priceUSD,
            unitCostPriceUSD: item.costPriceUSD,
            subtotalUSD: qty * item.priceUSD,
            taxGroup: item.taxGroup || 'A',
            taxRate: isTaxed ? 16 : 0,
            taxAmountUSD: isTaxed ? (qty * item.priceUSD * 0.16) : 0,
            maxStock: item.type === 'PRODUCT' ? item.stockQty : undefined,
          },
        ];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.itemId !== itemId));
  };

  const updateCartQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev =>
      prev.map(i =>
        i.itemId === itemId
          ? {
              ...i,
              quantity: qty,
              subtotalUSD: qty * i.unitPriceUSD,
              taxAmountUSD: i.taxRate > 0 ? (qty * i.unitPriceUSD * (i.taxRate / 100)) : 0,
            }
          : i
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Current active cash session
  const currentCashSession = useMemo(() => {
    return cashSessions.find((s) => s.status === 'OPEN') || null;
  }, [cashSessions]);

  const openCashSession = (data: {
    openingFloatUSD: number;
    openingFloatCDF: number;
    cashierName?: string;
    supervisorName?: string;
  }) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const sessionCount = cashSessions.length + 1;
    const sessionNumber = `CS-${todayStr}-${String(sessionCount).padStart(2, '0')}`;

    const newSession: CashRegisterSession = {
      id: `session-${Date.now()}`,
      sessionNumber,
      cashierId: currentUser.id || 'usr-default',
      cashierName: data.cashierName || currentUser.name || settings.cashierName || 'Caissier Principal',
      supervisorName: data.supervisorName || 'Direction Générale',
      openedAt: now.toISOString(),
      status: 'OPEN',
      openingFloatUSD: Number(data.openingFloatUSD || 0),
      openingFloatCDF: Number(data.openingFloatCDF || 0),
    };

    setCashSessions((prev) => [newSession, ...prev]);
    return newSession;
  };

  const closeCashSession = (data: {
    countedUSD: number;
    countedCDF: number;
    notes?: string;
    supervisorName?: string;
  }) => {
    if (!currentCashSession) {
      throw new Error('Aucune session de caisse ouverte.');
    }

    const rate = settings.exchangeRateUSD_CDF || 2850;
    const sessionStart = currentCashSession.openedAt;
    const now = new Date().toISOString();

    // Find all sales made during this session
    const sessionSales = sales.filter((s) => {
      return s.createdAt >= sessionStart && s.type !== 'QUOTE_PROFORMA';
    });

    const totalSalesUSD = sessionSales.reduce((acc, s) => acc + (s.totalUSD || 0), 0);
    const totalSalesCDF = sessionSales.reduce((acc, s) => acc + (s.totalCDF || 0), 0);
    const vatCollectedUSD = sessionSales.reduce((acc, s) => acc + (s.taxAmountUSD || 0), 0);

    const cashSalesUSD = sessionSales
      .filter((s) => s.paymentMethod === 'CASH_USD')
      .reduce((acc, s) => acc + (s.amountPaidUSD || 0), 0);

    const cashSalesCDF = sessionSales
      .filter((s) => s.paymentMethod === 'CASH_CDF')
      .reduce((acc, s) => acc + (s.amountPaidUSD * rate || 0), 0);

    const mobileMoneyUSD = sessionSales
      .filter((s) => ['MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'AFRIMONEY'].includes(s.paymentMethod))
      .reduce((acc, s) => acc + (s.amountPaidUSD || 0), 0);

    const mobileMoneyCDF = Math.round(mobileMoneyUSD * rate);

    const bankSalesUSD = sessionSales
      .filter((s) => s.paymentMethod === 'BANK_TRANSFER')
      .reduce((acc, s) => acc + (s.amountPaidUSD || 0), 0);

    const bankSalesCDF = Math.round(bankSalesUSD * rate);

    // Expected in drawer = initial float + cash sales
    const expectedCashInDrawerUSD = currentCashSession.openingFloatUSD + cashSalesUSD;
    const expectedCashInDrawerCDF = currentCashSession.openingFloatCDF + cashSalesCDF;

    const countedUSD = Number(data.countedUSD || 0);
    const countedCDF = Number(data.countedCDF || 0);

    const differenceUSD = countedUSD - expectedCashInDrawerUSD;
    const differenceCDF = countedCDF - expectedCashInDrawerCDF;

    const updatedSession: CashRegisterSession = {
      ...currentCashSession,
      status: 'CLOSED',
      closedAt: now,
      closingCountedUSD: countedUSD,
      closingCountedCDF: countedCDF,
      closingNotes: data.notes || '',
      supervisorName: data.supervisorName || currentCashSession.supervisorName || 'Direction Générale',
      totalSalesUSD,
      totalSalesCDF,
      cashSalesUSD,
      cashSalesCDF,
      mobileMoneyUSD,
      mobileMoneyCDF,
      bankSalesUSD,
      bankSalesCDF,
      vatCollectedUSD,
      expectedCashInDrawerUSD,
      expectedCashInDrawerCDF,
      differenceUSD,
      differenceCDF,
      totalTransactionsCount: sessionSales.length,
    };

    setCashSessions((prev) =>
      prev.map((s) => (s.id === currentCashSession.id ? updatedSession : s))
    );

    return updatedSession;
  };

  const resetToDemoData = () => {
    setProducts(initialProductsAndServices);
    setClients(initialClients);
    setSales(initialSales);
    setExpenses(initialExpenses);
    setEquipments(initialEquipments);
    setSettings(initialCompanySettings);
    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    setCart([]);
    localStorage.clear();
  };

  const exportDatabaseJSON = () => {
    const backup = {
      version: '4.0-DGI-RDC-RBAC',
      exportedAt: new Date().toISOString(),
      company: settings,
      users,
      products,
      clients,
      sales,
      expenses,
      equipments,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CongoBiz_DGI_RBAC_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importDatabaseJSON = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      if (data.products && Array.isArray(data.products)) setProducts(data.products);
      if (data.clients && Array.isArray(data.clients)) setClients(data.clients);
      if (data.sales && Array.isArray(data.sales)) setSales(data.sales);
      if (data.expenses && Array.isArray(data.expenses)) setExpenses(data.expenses);
      if (data.equipments && Array.isArray(data.equipments)) setEquipments(data.equipments);
      if (data.users && Array.isArray(data.users)) setUsers(data.users);
      if (data.company && typeof data.company === 'object') setSettings(data.company);
      return true;
    } catch (e) {
      console.error('Failed to import database:', e);
      return false;
    }
  };

  // Computed metrics
  const metrics = useMemo(() => {
    const validSales = sales.filter(s => s.type === 'INVOICE' || s.type === 'RECEIPT');
    const totalRevenueUSD = validSales.reduce((acc, s) => acc + s.totalUSD, 0);
    const totalCollectedUSD = validSales.reduce((acc, s) => acc + s.amountPaidUSD, 0);
    const totalDebtsUSD = validSales.reduce((acc, s) => acc + s.remainingDebtUSD, 0);
    const totalExpensesUSD = expenses.reduce((acc, e) => acc + e.amountUSD, 0);

    const totalTvaCollectedUSD = validSales.reduce((acc, s) => acc + s.taxAmountUSD, 0);
    const rate = settings.exchangeRateUSD_CDF || 2850;
    const totalTvaCollectedCDF = Math.round(totalTvaCollectedUSD * rate);
    const totalTaxableBaseUSD = validSales.reduce((acc, s) => acc + s.subtotalUSD - s.discountUSD, 0);
    const normalizedInvoicesCount = validSales.filter(s => s.isNormalizedDGI).length;

    const totalCOGS = validSales.reduce((acc, s) => {
      const saleCOGS = s.items.reduce((itemAcc, item) => itemAcc + item.unitCostPriceUSD * item.quantity, 0);
      return acc + saleCOGS;
    }, 0);

    const grossMarginUSD = (totalRevenueUSD - totalTvaCollectedUSD) - totalCOGS;
    const netProfitUSD = grossMarginUSD - totalExpensesUSD;
    const totalRevenueCDF = Math.round(totalRevenueUSD * rate);

    const productsCount = products.filter(p => p.type === 'PRODUCT').length;
    const servicesCount = products.filter(p => p.type === 'SERVICE').length;
    const lowStockCount = products.filter(p => p.type === 'PRODUCT' && p.stockQty <= p.minStockAlert).length;
    const unpaidInvoicesCount = validSales.filter(s => s.paymentStatus !== 'PAID').length;

    return {
      totalRevenueUSD,
      totalRevenueCDF,
      totalCollectedUSD,
      totalDebtsUSD,
      totalExpensesUSD,
      netProfitUSD,
      productsCount,
      servicesCount,
      lowStockCount,
      unpaidInvoicesCount,
      totalTvaCollectedUSD,
      totalTvaCollectedCDF,
      totalTaxableBaseUSD,
      normalizedInvoicesCount,
    };
  }, [sales, expenses, products, settings.exchangeRateUSD_CDF]);

  return (
    <AppContext.Provider
      value={{
        products,
        clients,
        sales,
        expenses,
        settings,
        users,
        currentUser,
        isSessionLocked,
        setCurrentUser,
        switchUserByPin,
        addUser,
        updateUser,
        deleteUser,
        hasPermission,
        lockSession,
        logout,
        unlockSession,
        activeTab,
        setActiveTab,
        selectedCurrency,
        setSelectedCurrency,
        updateExchangeRate,
        updateSettings,
        addProductOrService,
        updateProductOrService,
        deleteProductOrService,
        adjustStock,
        addClient,
        updateClient,
        deleteClient,
        createSale,
        updateSale,
        recordPayment,
        convertQuoteToInvoice,
        deleteSale,
        addExpense,
        deleteExpense,
        equipments,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        activePrintEquipment,
        setActivePrintEquipment,
        activePrintSale,
        setActivePrintSale,
        activeWhatsAppClient,
        setActiveWhatsAppClient,
        isUserSwitchModalOpen,
        setIsUserSwitchModalOpen,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cashSessions,
        currentCashSession,
        openCashSession,
        closeCashSession,
        resetToDemoData,
        exportDatabaseJSON,
        importDatabaseJSON,
        metrics,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
