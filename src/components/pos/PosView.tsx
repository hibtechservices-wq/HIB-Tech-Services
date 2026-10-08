import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductOrService, PaymentMethod } from '../../types';
import { formatMoney, formatDualCurrency, getPaymentMethodLabel } from '../../utils/formatters';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  User,
  Package,
  Wrench,
  DollarSign,
  Receipt,
  RotateCcw,
  ShieldCheck,
  BarChart2,
  ScanLine,
  Camera,
  FileText,
  Zap,
  Volume2,
  VolumeX,
  UserPlus,
  Pause,
  Play,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Percent,
  Ban,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PosSalesChart } from './PosSalesChart';
import { PosProformaModal } from './PosProformaModal';
import { PosBarcodeScannerModal } from './PosBarcodeScannerModal';
import { PosQuickClientModal } from './PosQuickClientModal';

export const PosView: React.FC = () => {
  const {
    products,
    clients,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    createSale,
    settings,
    selectedCurrency,
    setActivePrintSale,
  } = useApp();

  const rate = settings.exchangeRateUSD_CDF || 2850;

  // Scanner & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerFocused, setIsScannerFocused] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scanNotification, setScanNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isProformaModalOpen, setIsProformaModalOpen] = useState<boolean>(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState<boolean>(false);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState<boolean>(false);

  // Held carts feature (Mettre en attente / Rappeler)
  const [heldCarts, setHeldCarts] = useState<
    Array<{ id: string; date: string; items: any[]; clientName: string }>
  >([]);

  // Catalog filters & view options
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');
  const [showSalesChart, setShowSalesChart] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Checkout drawer state
  const [selectedClientId, setSelectedClientId] = useState<string>('comptoir');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MPESA');
  const [amountGivenUSD, setAmountGivenUSD] = useState<number>(0);
  const [discountUSD, setDiscountUSD] = useState<number>(0);
  const [posNotes, setPosNotes] = useState<string>('');

  // TVA state for POS cart (allows deactivating TVA on-the-fly or inheriting from settings)
  const [isVatEnabled, setIsVatEnabled] = useState<boolean>(
    Boolean(settings.dgiIsVatSubject && settings.enableTaxByDefault)
  );

  useEffect(() => {
    setIsVatEnabled(Boolean(settings.dgiIsVatSubject && settings.enableTaxByDefault));
  }, [settings.dgiIsVatSubject, settings.enableTaxByDefault]);

  // Auto-focus scanner input when component mounts or on key press
  useEffect(() => {
    if (isScannerFocused && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [isScannerFocused]);

  // Audio synthesizer beep for barcode scan feedback
  const playBeep = (isSuccess = true) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isSuccess) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      }
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  };

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setScanNotification({ message, type });
    setTimeout(() => {
      setScanNotification(null);
    }, 2800);
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Handle Barcode Scan / Fast Product Lookup
  const handleScannerSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    // 1. Check exact match by barcode or SKU code
    const exactMatch = products.find(
      (p) =>
        p.isActive &&
        ((p.barcode && p.barcode.toLowerCase() === query) ||
          p.code.toLowerCase() === query)
    );

    if (exactMatch) {
      if (exactMatch.type === 'PRODUCT' && exactMatch.stockQty <= 0) {
        playBeep(false);
        showToast(`Stock épuisé pour "${exactMatch.name}" !`, 'warning');
      } else {
        addToCart(exactMatch, 1);
        playBeep(true);
        showToast(`✓ Scanné : ${exactMatch.name} (+1)`, 'success');
      }
      setSearchQuery('');
      if (scannerInputRef.current) scannerInputRef.current.focus();
      return;
    }

    // 2. Partial match if single hit
    const partialMatches = products.filter(
      (p) =>
        p.isActive &&
        (p.name.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query) ||
          (p.barcode && p.barcode.toLowerCase().includes(query)))
    );

    if (partialMatches.length === 1) {
      const match = partialMatches[0];
      if (match.type === 'PRODUCT' && match.stockQty <= 0) {
        playBeep(false);
        showToast(`Stock épuisé pour "${match.name}" !`, 'warning');
      } else {
        addToCart(match, 1);
        playBeep(true);
        showToast(`✓ Ajouté : ${match.name} (+1)`, 'success');
      }
      setSearchQuery('');
      if (scannerInputRef.current) scannerInputRef.current.focus();
      return;
    }

    if (partialMatches.length === 0) {
      playBeep(false);
      showToast(`Aucun article trouvé pour le code "${query}"`, 'warning');
    }
  };

  // Quick scan simulation from test buttons or camera
  const handleDirectScanProduct = (product: ProductOrService) => {
    if (product.type === 'PRODUCT' && product.stockQty <= 0) {
      playBeep(false);
      showToast(`Stock épuisé pour "${product.name}" !`, 'warning');
      return;
    }
    addToCart(product, 1);
    playBeep(true);
    showToast(`✓ Scanné : ${product.name} (+1)`, 'success');
    if (scannerInputRef.current) scannerInputRef.current.focus();
  };

  // Predictive search suggestions when typing in the scanner input
  const liveScanSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter(
        (p) =>
          p.isActive &&
          (p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)))
      )
      .slice(0, 5);
  }, [products, searchQuery]);

  // Catalog items filtered for the visual grid
  const catalogItems = useMemo(() => {
    return products.filter((item) => {
      if (!item.isActive) return false;
      const matchSearch =
        catalogSearch === '' ||
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.code.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(catalogSearch.toLowerCase()));

      const matchType = selectedType === 'ALL' || item.type === selectedType;
      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

      return matchSearch && matchType && matchCategory;
    });
  }, [products, catalogSearch, selectedType, selectedCategory]);

  // Cart calculations with VAT (supports disabling VAT on-the-fly or by default)
  const cartSubtotalUSD = cart.reduce((sum, it) => sum + it.subtotalUSD, 0);
  const cartTaxPercent = isVatEnabled ? (settings.taxPercent || 16) : 0;
  const cartTaxAmountUSD = isVatEnabled
    ? cart.filter((i) => i.taxGroup === 'A').reduce((sum, it) => sum + it.subtotalUSD * (cartTaxPercent / 100), 0)
    : 0;

  const cartTotalUSD = Math.max(0, cartSubtotalUSD - discountUSD) + cartTaxAmountUSD;
  const cartTotalCDF = Math.round(cartTotalUSD * rate);
  const dualTotal = formatDualCurrency(cartTotalUSD, rate);

  // Checkout for immediate sale (Receipt / Invoice)
  const handleCheckout = (isFullPaid = true) => {
    if (cart.length === 0) return;

    const paidUSD = isFullPaid ? cartTotalUSD : Math.min(cartTotalUSD, amountGivenUSD);

    const sale = createSale({
      type: 'RECEIPT',
      clientId: selectedClientId,
      items: cart.map((i) => ({
        itemId: i.itemId,
        name: i.name,
        code: i.code,
        type: i.type,
        unit: i.unit,
        quantity: i.quantity,
        unitPriceUSD: i.unitPriceUSD,
        unitCostPriceUSD: i.unitCostPriceUSD,
        subtotalUSD: i.subtotalUSD,
        taxGroup: i.taxGroup || 'A',
        taxRate: isVatEnabled ? (i.taxRate || cartTaxPercent) : 0,
        taxAmountUSD: isVatEnabled ? (i.taxAmountUSD || (i.subtotalUSD * (cartTaxPercent / 100))) : 0,
      })),
      discountUSD,
      taxPercent: cartTaxPercent,
      amountPaidUSD: paidUSD,
      paymentMethod,
      notes: posNotes.trim() || undefined,
      isNormalizedDGI: true,
    });

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}

    clearCart();
    setDiscountUSD(0);
    setAmountGivenUSD(0);
    setPosNotes('');

    // Open ticket modal immediately for printing
    setActivePrintSale(sale);
  };

  // Hold current cart
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const client = clients.find((c) => c.id === selectedClientId);
    const clientName = client ? client.name : 'Client Comptoir';
    const held = {
      id: `hold-${Date.now()}`,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: [...cart],
      clientName,
    };
    setHeldCarts((prev) => [held, ...prev]);
    clearCart();
    showToast(`Panier mis en attente (${held.clientName})`, 'info');
  };

  // Restore held cart
  const handleRestoreCart = (heldId: string) => {
    const target = heldCarts.find((h) => h.id === heldId);
    if (!target) return;
    target.items.forEach((it) => {
      const prod = products.find((p) => p.id === it.itemId);
      if (prod) {
        addToCart(prod, it.quantity);
      }
    });
    setHeldCarts((prev) => prev.filter((h) => h.id !== heldId));
    showToast('Panier rappelé avec succès', 'success');
  };

  const paymentOptions: PaymentMethod[] = [
    'MPESA',
    'ORANGE_MONEY',
    'AIRTEL_MONEY',
    'AFRIMONEY',
    'CASH_USD',
    'CASH_CDF',
    'BANK_TRANSFER',
    'CREDIT',
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-6rem)]">
      {/* ============================================================== */}
      {/* COLONNE PRINCIPALE DE CAISSE (Recherche/Scan en haut + Panier en dessous) */}
      {/* ============================================================== */}
      <div className="w-full lg:w-[58%] xl:w-[60%] flex flex-col gap-4">
        {/* ------------------------------------------------------------ */}
        {/* SECTION 1 : RECHERCHE DE PRODUIT & SCANNER CODE-BARRES       */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs p-4 space-y-3 relative overflow-visible">
          {/* Top Bar: Title & Scanner Controls */}
          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-amber-400 flex items-center justify-center shadow-2xs">
                <ScanLine className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <span>Recherche & Scanner Code-Barres</span>
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Douchette Prête
                  </span>
                </h2>
                <p className="text-[11px] text-neutral-500 hidden sm:block">
                  Scannez avec votre lecteur USB/Bluetooth ou saisissez un nom/référence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Camera Scanner Button */}
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-200/70"
                title="Scanner avec la caméra vidéo ou tester un code"
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Caméra</span>
              </button>

              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  soundEnabled
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                }`}
                title={soundEnabled ? 'Bip sonore activé' : 'Bip sonore coupé'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Barcode Search Form & Fast Enter Handler */}
          <form onSubmit={handleScannerSubmit} className="relative">
            <div className="relative flex items-center">
              <input
                ref={scannerInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scanner code-barres (douchette) ou saisir nom, référence SKU..."
                className="w-full pl-10 pr-24 py-2.5 bg-neutral-50 hover:bg-white focus:bg-white border-2 border-neutral-300 focus:border-neutral-900 rounded-xl text-xs sm:text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all shadow-inner"
              />
              <ScanLine className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-neutral-400 hover:text-neutral-600 text-xs"
                  >
                    Effacer
                  </button>
                )}
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {/* Predictive Dropdown Suggestions */}
            {liveScanSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 divide-y divide-neutral-100 overflow-hidden">
                <div className="px-3 py-1.5 bg-neutral-50 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Résultats correspondants ({liveScanSuggestions.length})</span>
                  <span>Appuyez sur Entrée ou cliquez pour ajouter</span>
                </div>
                {liveScanSuggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleDirectScanProduct(item)}
                    className="p-2.5 hover:bg-amber-50/50 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.type === 'PRODUCT' ? (
                          <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                        <span className="font-bold text-xs text-neutral-900 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-500 font-mono-nums">
                        <span>Réf: {item.code}</span>
                        {item.barcode && <span className="text-blue-700">EAN: {item.barcode}</span>}
                        {item.type === 'PRODUCT' && (
                          <span
                            className={item.stockQty <= 0 ? 'text-rose-600 font-semibold' : 'text-neutral-600'}
                          >
                            Stock: {item.stockQty}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="font-bold text-xs text-neutral-900 font-mono-nums">
                        ${item.priceUSD.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-1 bg-neutral-900 text-amber-400 hover:bg-neutral-800 rounded-md text-[11px] font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Panier</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* Quick Simulation Chips / Common Test Barcodes */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            <span className="text-neutral-400 text-[10px] uppercase font-semibold shrink-0 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Scans Rapides :
            </span>
            {products
              .filter((p) => p.isActive && p.type === 'PRODUCT')
              .slice(0, 4)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleDirectScanProduct(p)}
                  className="px-2.5 py-1 bg-neutral-100 hover:bg-amber-100 hover:text-amber-900 text-neutral-700 rounded-lg shrink-0 font-medium transition-colors flex items-center gap-1 border border-neutral-200/70"
                >
                  <span className="truncate max-w-[120px]">{p.name.split('(')[0]}</span>
                  <span className="font-mono-nums font-bold text-neutral-900">${p.priceUSD}</span>
                </button>
              ))}
          </div>

          {/* Scan Toast notification */}
          {scanNotification && (
            <div
              className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                scanNotification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : scanNotification.type === 'warning'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">{scanNotification.message}</span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------ */}
        {/* SECTION 2 : LE PANIER (CART) DIRECTEMENT EN-DESSOUS         */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs flex-1 flex flex-col overflow-hidden">
          {/* Cart Header */}
          <div className="p-3.5 sm:p-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 text-amber-400 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                  <span>Panier Express Caisse</span>
                  <span className="bg-amber-400 text-neutral-900 px-2 py-0.5 rounded-full text-[10px] font-mono-nums font-extrabold">
                    {cart.reduce((s, i) => s + i.quantity, 0)} articles
                  </span>
                </h3>
                <p className="text-[11px] text-neutral-400 hidden sm:block">
                  Articles scannés prêts pour encaissement ou devis proforma
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Held Carts Recall */}
              {heldCarts.length > 0 && (
                <div className="relative group">
                  <button
                    type="button"
                    className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1"
                    title="Paniers en attente"
                  >
                    <Layers className="w-3 h-3" />
                    <span>En attente ({heldCarts.length})</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white text-neutral-900 border border-neutral-200 rounded-xl shadow-xl p-2 w-64 z-20 hidden group-hover:block divide-y divide-neutral-100">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase px-2 py-1 block">
                      Rappeler un panier mis en attente :
                    </span>
                    {heldCarts.map((h) => (
                      <div
                        key={h.id}
                        onClick={() => handleRestoreCart(h.id)}
                        className="p-2 hover:bg-neutral-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold block truncate">{h.clientName}</span>
                          <span className="text-[10px] text-neutral-400">{h.date} · {h.items.length} lignes</span>
                        </div>
                        <span className="text-blue-600 font-semibold text-[11px]">Rappeler</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cart.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleHoldCart}
                    className="text-[11px] text-neutral-300 hover:text-white px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1 border border-neutral-700"
                    title="Mettre ce panier en attente pour servir un autre client"
                  >
                    <Pause className="w-3 h-3" />
                    <span className="hidden sm:inline">En attente</span>
                  </button>

                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-950/40 transition-colors flex items-center gap-1"
                    title="Vider le panier"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Vider</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Cart Items Table / List */}
          <div className="p-3 overflow-y-auto max-h-[340px] flex-1 divide-y divide-neutral-100">
            {cart.length === 0 ? (
              <div className="h-44 sm:h-52 flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                  <ShoppingCart className="w-6 h-6 stroke-1" />
                </div>
                <div>
                  <p className="font-semibold text-xs sm:text-sm text-neutral-700">Le panier est vide</p>
                  <p className="text-[11px] text-neutral-400 max-w-sm mt-0.5">
                    Scannez un code-barres avec la douchette ou cliquez sur les produits dans le catalogue à droite pour les ajouter directement.
                  </p>
                </div>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.itemId}
                  className="py-2.5 px-1 flex items-center justify-between gap-2.5 text-xs hover:bg-neutral-50/70 transition-colors rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-900 block truncate">{item.name}</span>
                      <span className="text-[10px] font-mono-nums px-1.5 py-0.2 bg-neutral-100 text-neutral-600 rounded shrink-0">
                        Gr. {item.taxGroup}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono-nums mt-0.5">
                      <span>${item.unitPriceUSD.toFixed(2)} / {item.unit}</span>
                      <span>·</span>
                      <span className="text-neutral-400">{item.code}</span>
                    </div>
                  </div>

                  {/* Quantity modifier (+ / -) */}
                  <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.itemId, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:bg-white rounded transition-colors"
                      title="Diminuer la quantité"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-mono-nums font-bold text-neutral-900 text-xs">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.itemId, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:bg-white rounded transition-colors"
                      title="Augmenter la quantité"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Subtotal */}
                  <div className="text-right w-20 shrink-0 font-mono-nums">
                    <span className="font-bold text-neutral-900 block text-xs sm:text-sm">
                      ${item.subtotalUSD.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-neutral-400 block">
                      {Math.round(item.subtotalUSD * rate).toLocaleString()} FC
                    </span>
                  </div>

                  {/* Trash Item */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.itemId)}
                    className="text-neutral-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                    title="Supprimer la ligne"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer: Client, Mode, Totals & Action Buttons (Proforma & Checkout) */}
          {cart.length > 0 && (
            <div className="p-4 bg-neutral-50/90 border-t border-neutral-200 space-y-3.5">
              {/* Row 1: Client Selector & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Client Assign */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3 h-3 text-neutral-500" />
                      Client
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickClientOpen(true)}
                      className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-0.5"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>+ Nouveau</span>
                    </button>
                  </div>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  >
                    <option value="comptoir">Client Comptoir (Consommateur Final)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Mode de Règlement RDC
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  >
                    {paymentOptions.map((opt) => {
                      const info = getPaymentMethodLabel(opt);
                      return (
                        <option key={opt} value={opt}>
                          {info.label} ({info.provider})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Row 1.5: TVA Toggle (Activer / Désactiver la TVA pour ce panier) */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      isVatEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-800 block">
                      TVA ({settings.taxPercent || 16}%)
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {isVatEnabled
                        ? 'TVA 16% active pour ce panier'
                        : 'TVA désactivée (0% Hors Taxe / Exonéré)'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !isVatEnabled;
                    setIsVatEnabled(next);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                    isVatEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-neutral-300 hover:bg-neutral-400 text-neutral-800'
                  }`}
                  title={isVatEnabled ? 'Cliquez pour désactiver la TVA sur ce panier' : 'Cliquez pour activer la TVA sur ce panier'}
                >
                  {isVatEnabled ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Active (16%)</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Désactivée (0%)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Row 2: Totals Display with Dual Currency & VAT */}
              <div className="bg-white p-3 rounded-xl border border-neutral-200/90 space-y-1.5 font-mono-nums text-xs shadow-2xs">
                <div className="flex justify-between text-neutral-600 text-[11px]">
                  <span>Total HT :</span>
                  <span>${cartSubtotalUSD.toFixed(2)}</span>
                </div>
                {isVatEnabled ? (
                  <div className="flex justify-between text-neutral-600 text-[11px]">
                    <span>TVA RDC ({settings.taxPercent || 16}%) DGI :</span>
                    <span className="text-emerald-700 font-semibold">+${cartTaxAmountUSD.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-neutral-500 text-[11px] italic">
                    <span>TVA :</span>
                    <span className="bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded text-[10px] font-sans not-italic font-medium">
                      Désactivée (0% Exonéré)
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-neutral-900 pt-1 border-t border-neutral-100">
                  <span>TOTAL TTC ($ USD) :</span>
                  <span className="text-neutral-950 font-black">{dualTotal.usd}</span>
                </div>
                <div className="flex justify-between font-bold text-neutral-900 bg-amber-100/70 px-2.5 py-1 rounded-lg text-xs">
                  <span>TOTAL TTC (Franc Congolais CDF) :</span>
                  <span className="font-extrabold">{dualTotal.cdf}</span>
                </div>
              </div>

              {/* Row 3: Action Buttons (INCLUDING PROFORMA INVOICE!) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Facture Proforma Button (Requested Feature) */}
                <button
                  type="button"
                  onClick={() => setIsProformaModalOpen(true)}
                  className="py-2.5 px-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow-md order-2 sm:order-1"
                  title="Générer une offre de prix officielle / Facture Proforma pour ce panier"
                >
                  <FileText className="w-4 h-4 text-amber-300" />
                  <span>Facture Proforma</span>
                </button>

                {/* 2. Payer & Ticket DEF */}
                <button
                  type="button"
                  onClick={() => handleCheckout(true)}
                  className="py-2.5 px-3 bg-neutral-950 hover:bg-neutral-800 text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow-md order-1 sm:order-2"
                  title="Paiement immédiat et ticket normalisé DGI"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Payer & Ticket DEF</span>
                </button>

                {/* 3. Vente à Crédit */}
                <button
                  type="button"
                  onClick={() => handleCheckout(false)}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs order-3"
                  title="Enregistrer comme vente à crédit / créance client"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Vente à Crédit</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* COLONNE SECONDAIRE : CATALOGUE VISUEL & TOUCHES RAPIDES       */}
      {/* ============================================================== */}
      <div className="w-full lg:w-[42%] xl:w-[40%] bg-white rounded-2xl border border-neutral-200/90 shadow-xs flex flex-col overflow-hidden">
        {/* Catalog Header & Filters */}
        <div className="p-3.5 sm:p-4 border-b border-neutral-200 bg-neutral-50/70 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                Catalogue Visuel & Favoris
              </h3>
            </div>

            {/* Toggle 7-Day Chart Button */}
            <button
              type="button"
              onClick={() => setShowSalesChart(!showSalesChart)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-2xs ${
                showSalesChart
                  ? 'bg-amber-400 text-neutral-900 border-amber-500 font-bold'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
              }`}
              title="Afficher les statistiques de vente sur 7 jours"
            >
              <BarChart2 className="w-3.5 h-3.5 text-neutral-900" />
              <span>Ventes 7J</span>
            </button>
          </div>

          {/* Catalog Search & Type Selectors */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Filtrer catalogue..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex bg-neutral-200 p-0.5 rounded-lg text-[11px] shrink-0">
              <button
                type="button"
                onClick={() => setSelectedType('ALL')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  selectedType === 'ALL' ? 'bg-white text-neutral-900 font-bold shadow-2xs' : 'text-neutral-600'
                }`}
              >
                Tout
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('PRODUCT')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  selectedType === 'PRODUCT' ? 'bg-white text-neutral-900 font-bold shadow-2xs' : 'text-neutral-600'
                }`}
              >
                Articles
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('SERVICE')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  selectedType === 'SERVICE' ? 'bg-white text-neutral-900 font-bold shadow-2xs' : 'text-neutral-600'
                }`}
              >
                Services
              </button>
            </div>
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-full shrink-0 font-medium transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-200/70 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Toutes Catégories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full shrink-0 font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-200/70 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Items Grid */}
        <div className="p-3.5 overflow-y-auto flex-1 space-y-3">
          {showSalesChart && (
            <div className="w-full shrink-0">
              <PosSalesChart />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 auto-rows-max">
            {catalogItems.length === 0 ? (
              <div className="col-span-full text-center py-12 text-neutral-400 text-xs">
                Aucun produit ou service trouvé dans cette sélection.
              </div>
            ) : (
              catalogItems.map((item) => {
                const inCart = cart.find((i) => i.itemId === item.id);
                const isOutOfStock = item.type === 'PRODUCT' && item.stockQty <= 0;
                const isLowStock =
                  item.type === 'PRODUCT' && item.stockQty <= item.minStockAlert && !isOutOfStock;

                return (
                  <div
                    key={item.id}
                    onClick={() => !isOutOfStock && handleDirectScanProduct(item)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative group ${
                      isOutOfStock
                        ? 'bg-neutral-100 border-neutral-200 opacity-60 cursor-not-allowed'
                        : inCart
                        ? 'bg-amber-50/60 border-amber-400 ring-1 ring-amber-400 shadow-2xs'
                        : 'bg-white border-neutral-200 hover:border-neutral-400 hover:shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 text-[10px] uppercase font-semibold text-neutral-400">
                          {item.type === 'PRODUCT' ? (
                            <Package className="w-3 h-3 text-blue-600 shrink-0" />
                          ) : (
                            <Wrench className="w-3 h-3 text-amber-600 shrink-0" />
                          )}
                          <span>{item.type === 'PRODUCT' ? 'Produit' : 'Service'}</span>
                        </div>

                        {item.type === 'PRODUCT' && (
                          <span
                            className={`text-[9px] font-mono-nums font-semibold px-1 rounded ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            Stock: {item.stockQty}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-snug">
                        {item.name}
                      </h4>
                      <span className="text-[10px] text-neutral-400 font-mono-nums block mt-0.5">
                        {item.code} {item.barcode ? `· EAN: ${item.barcode}` : ''}
                      </span>
                    </div>

                    <div className="pt-2 mt-2 border-t border-neutral-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold font-mono-nums text-neutral-900 block leading-none">
                          ${item.priceUSD.toFixed(2)}
                        </span>
                        <span className="text-[9px] font-mono-nums text-neutral-500 block mt-0.5">
                          {Math.round(item.priceUSD * rate).toLocaleString()} FC
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                          inCart
                            ? 'bg-neutral-900 text-amber-400 font-bold'
                            : 'bg-neutral-100 text-neutral-700 group-hover:bg-neutral-900 group-hover:text-white'
                        }`}
                      >
                        {inCart ? (
                          <span className="font-mono-nums text-[11px]">{inCart.quantity}</span>
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODALS : PROFORMA, CAMERA BARCODE SCANNER, QUICK CLIENT        */}
      {/* ============================================================== */}
      <PosProformaModal
        isOpen={isProformaModalOpen}
        onClose={() => setIsProformaModalOpen(false)}
        cartItems={cart}
        cartSubtotalUSD={cartSubtotalUSD}
        cartTaxAmountUSD={cartTaxAmountUSD}
        cartTotalUSD={cartTotalUSD}
        initialClientId={selectedClientId}
        initialVatEnabled={isVatEnabled}
        onSuccess={() => {
          clearCart();
          showToast('Facture Proforma émise avec succès !', 'success');
        }}
      />

      <PosBarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={(prod) => {
          handleDirectScanProduct(prod);
        }}
      />

      <PosQuickClientModal
        isOpen={isQuickClientOpen}
        onClose={() => setIsQuickClientOpen(false)}
        onClientCreated={(newId) => {
          setSelectedClientId(newId);
          showToast('Client créé et assigné au panier', 'success');
        }}
      />
    </div>
  );
};
