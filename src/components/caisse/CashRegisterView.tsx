import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CashRegisterSession, Sale, PaymentMethod } from '../../types';
import { formatDate, formatDateTime, formatDualCurrency, getPaymentMethodLabel } from '../../utils/formatters';
import { downloadElementAsPDF } from '../../utils/pdfGenerator';
import { CashHistoryView } from './CashHistoryView';
import { InvoicesView } from '../invoices/InvoicesView';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  Store,
  DollarSign,
  Receipt,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  RefreshCw,
  Printer,
  Download,
  Eye,
  Lock,
  Unlock,
  ShieldCheck,
  UserCheck,
  Check,
  X,
  Smartphone,
  Building,
  PlusCircle,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';

interface CashRegisterViewProps {
  onOpenCreateInvoiceModal?: () => void;
  defaultSubTab?: 'TRANSACTIONS' | 'ALL_DOCS' | 'BREAKDOWN' | 'HISTORY';
}

export const CashRegisterView: React.FC<CashRegisterViewProps> = ({
  onOpenCreateInvoiceModal,
  defaultSubTab = 'TRANSACTIONS',
}) => {
  const {
    sales,
    settings,
    currentUser,
    users,
    cashSessions,
    currentCashSession,
    openCashSession,
    closeCashSession,
    setActivePrintSale,
    deleteSale,
  } = useApp();

  const rate = settings.exchangeRateUSD_CDF || 2850;

  // View state
  const [activeSubTab, setActiveSubTab] = useState<'TRANSACTIONS' | 'ALL_DOCS' | 'BREAKDOWN' | 'HISTORY'>(defaultSubTab);
  
  // Modals
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [selectedReportSession, setSelectedReportSession] = useState<CashRegisterSession | null>(null);
  const [isGeneratingReportPdf, setIsGeneratingReportPdf] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const reportPrintRef = useRef<HTMLDivElement>(null);

  // Opening form state
  const [openFloatUSD, setOpenFloatUSD] = useState<number>(50);
  const [openFloatCDF, setOpenFloatCDF] = useState<number>(100000);
  const [openCashierName, setOpenCashierName] = useState<string>(currentUser.name || settings.cashierName || 'Caissier Principal');
  const [openSupervisorName, setOpenSupervisorName] = useState<string>('Direction Générale');

  // Closing form state
  const [closingCountedUSD, setClosingCountedUSD] = useState<number>(0);
  const [closingCountedCDF, setClosingCountedCDF] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [closingSupervisor, setClosingSupervisor] = useState<string>('Direction Générale');

  // Session sales calculations
  const sessionSales = useMemo(() => {
    if (!currentCashSession) return [];
    return sales.filter((s) => {
      return s.createdAt >= currentCashSession.openedAt && s.type !== 'QUOTE_PROFORMA';
    });
  }, [sales, currentCashSession]);

  // Live financial metrics for active session
  const sessionMetrics = useMemo(() => {
    const totalUSD = sessionSales.reduce((acc, s) => acc + (s.totalUSD || 0), 0);
    const totalCDF = sessionSales.reduce((acc, s) => acc + (s.totalCDF || 0), 0);
    const totalVatUSD = sessionSales.reduce((acc, s) => acc + (s.taxAmountUSD || 0), 0);

    const cashSalesUSD = sessionSales
      .filter((s) => s.paymentMethod === 'CASH_USD')
      .reduce((acc, s) => acc + (s.amountPaidUSD || 0), 0);

    const cashSalesCDF = sessionSales
      .filter((s) => s.paymentMethod === 'CASH_CDF')
      .reduce((acc, s) => acc + (s.amountPaidUSD * rate || 0), 0);

    const mpesaUSD = sessionSales
      .filter((s) => s.paymentMethod === 'MPESA')
      .reduce((acc, s) => acc + (s.amountPaidUSD || 0), 0);

    const orangeUSD = sessionSales
      .filter((s) => s.paymentMethod === 'ORANGE_MONEY')
      .reduce((acc, s) => acc + (s.amountPaidUSD || 0), 0);

    const airtelUSD = sessionSales
      .filter((s) => s.paymentMethod === 'AIRTEL_MONEY')
      .reduce((acc, s) => acc + (s.amountPaidUSD || 0), 0);

    const afrimoneyUSD = sessionSales
      .filter((s) => s.paymentMethod === 'AFRIMONEY')
      .reduce((acc, s) => acc + (s.amountPaidUSD || 0), 0);

    const bankUSD = sessionSales
      .filter((s) => s.paymentMethod === 'BANK_TRANSFER')
      .reduce((acc, s) => acc + (s.amountPaidUSD || 0), 0);

    const mobileTotalUSD = mpesaUSD + orangeUSD + airtelUSD + afrimoneyUSD;
    const mobileTotalCDF = Math.round(mobileTotalUSD * rate);

    const expectedCashUSD = (currentCashSession?.openingFloatUSD || 0) + cashSalesUSD;
    const expectedCashCDF = (currentCashSession?.openingFloatCDF || 0) + cashSalesCDF;

    return {
      totalUSD,
      totalCDF,
      totalVatUSD,
      cashSalesUSD,
      cashSalesCDF,
      mpesaUSD,
      orangeUSD,
      airtelUSD,
      afrimoneyUSD,
      mobileTotalUSD,
      mobileTotalCDF,
      bankUSD,
      expectedCashUSD,
      expectedCashCDF,
      count: sessionSales.length,
    };
  }, [sessionSales, currentCashSession, rate]);

  // Handle Opening Session
  const handleOpenSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openCashSession({
      openingFloatUSD: openFloatUSD,
      openingFloatCDF: openFloatCDF,
      cashierName: openCashierName,
      supervisorName: openSupervisorName,
    });
    setIsOpeningModalOpen(false);
  };

  // Open Closing Modal with pre-filled theoretical values
  const handlePrepareClosing = () => {
    if (!currentCashSession) return;
    setClosingCountedUSD(sessionMetrics.expectedCashUSD);
    setClosingCountedCDF(sessionMetrics.expectedCashCDF);
    setClosingNotes('');
    setIsClosingModalOpen(true);
  };

  // Handle Closing Session
  const handleCloseSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const closed = closeCashSession({
      countedUSD: Number(closingCountedUSD),
      countedCDF: Number(closingCountedCDF),
      notes: closingNotes,
      supervisorName: closingSupervisor,
    });
    setIsClosingModalOpen(false);
    setSelectedReportSession(closed);
  };

  // Download Z Report as PDF
  const handleDownloadReportPdf = async () => {
    if (!reportPrintRef.current || !selectedReportSession) return;
    setIsGeneratingReportPdf(true);
    try {
      const filename = `Rapport_Z_Caisse_${selectedReportSession.sessionNumber}.pdf`;
      await downloadElementAsPDF(reportPrintRef.current, filename, {
        format: 'a4',
        orientation: 'portrait',
        margin: 6,
        fitToSinglePage: true,
      });
    } finally {
      setIsGeneratingReportPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Status Banner */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                Gestion de Caisse & Clôture Journalière
              </h1>
              {currentCashSession ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  Caisse Ouverte
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <Lock className="w-3 h-3" />
                  Caisse Fermée
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              {currentCashSession ? (
                <>
                  Session active <strong className="text-neutral-900 font-mono">{currentCashSession.sessionNumber}</strong> · 
                  Ouverte par <span className="font-semibold text-neutral-800">{currentCashSession.cashierName}</span> le {formatDateTime(currentCashSession.openedAt)} · 
                  Fond initial : <span className="font-mono-nums font-bold text-neutral-900">${currentCashSession.openingFloatUSD} USD</span> ({currentCashSession.openingFloatCDF.toLocaleString()} FC)
                </>
              ) : (
                'Aucune session de caisse en cours. Veuillez autoriser et ouvrir la caisse pour enregistrer les ventes.'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {currentCashSession ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedReportSession(currentCashSession)}
                className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold transition-colors border border-neutral-300 flex items-center gap-1.5 shadow-2xs"
                title="Prévisualiser le rapport Z de caisse de la session"
              >
                <FileText className="w-4 h-4 text-neutral-600" />
                <span>Rapport Z (En cours)</span>
              </button>

              <button
                type="button"
                onClick={handlePrepareClosing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Lock className="w-4 h-4" />
                <span>Clôturer la Caisse & Ventes</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpeningModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
            >
              <Unlock className="w-4 h-4" />
              <span>Autoriser & Ouvrir la Caisse</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Encaissement Session */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Facturé Session</span>
            <Receipt className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono-nums text-neutral-900">
            ${sessionMetrics.totalUSD.toFixed(2)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1 font-mono">
            {new Intl.NumberFormat('fr-FR').format(sessionMetrics.totalCDF)} FC · {sessionMetrics.count} facture{sessionMetrics.count > 1 ? 's' : ''}
          </p>
        </div>

        {/* Espèces Cash en Tiroir */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Espèces Théoriques</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono-nums text-emerald-700">
            ${sessionMetrics.expectedCashUSD.toFixed(2)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1 font-mono">
            + {new Intl.NumberFormat('fr-FR').format(sessionMetrics.expectedCashCDF)} FC (Fond + Ventes Cash)
          </p>
        </div>

        {/* Mobile Money Encaissé */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Mobile Money</span>
            <Smartphone className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono-nums text-amber-600">
            ${sessionMetrics.mobileTotalUSD.toFixed(2)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1 font-mono">
            M-Pesa, Orange & Airtel Money
          </p>
        </div>

        {/* TVA Collectée */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">TVA DGI Collectée</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono-nums text-blue-700">
            ${sessionMetrics.totalVatUSD.toFixed(2)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1 font-mono">
            {new Intl.NumberFormat('fr-FR').format(Math.round(sessionMetrics.totalVatUSD * rate))} FC (Taux 16%)
          </p>
        </div>
      </div>

      {/* Main Content Area: Subtabs */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50/70 p-2 gap-2 text-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab('TRANSACTIONS')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeSubTab === 'TRANSACTIONS'
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Ventes de la Session ({sessionSales.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ALL_DOCS')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeSubTab === 'ALL_DOCS'
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Toutes les Factures & Devis ({sales.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('BREAKDOWN')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeSubTab === 'BREAKDOWN'
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Ventilation Modes de Règlement</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('HISTORY')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeSubTab === 'HISTORY'
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>Historique & Mois Précédents ({cashSessions.length})</span>
          </button>
        </div>

        {/* Tab: Toutes les Factures & Devis */}
        {activeSubTab === 'ALL_DOCS' && (
          <div className="p-4 sm:p-6">
            <InvoicesView
              hideHeader={true}
              onOpenCreateModal={onOpenCreateInvoiceModal}
            />
          </div>
        )}

        {/* Tab 1: Transactions de la Session en Cours */}
        {activeSubTab === 'TRANSACTIONS' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  Ventes et Encaissements Enregistrés Durant la Session
                </h3>
                <p className="text-xs text-neutral-500">
                  Tickets de caisse, factures et règlements enregistrés depuis l'ouverture
                </p>
              </div>
            </div>

            {sessionSales.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-neutral-300 stroke-1" />
                <p className="font-medium">Aucune vente enregistrée pour cette session de caisse.</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Utilisez la caisse express (POS) ou créez une facture pour enregistrer des encaissements.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3">N° Facture</th>
                      <th className="py-2.5 px-3">Date / Heure</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Règlement</th>
                      <th className="py-2.5 px-3 text-right">Total HT ($)</th>
                      <th className="py-2.5 px-3 text-right">TVA 16% ($)</th>
                      <th className="py-2.5 px-3 text-right">Total TTC ($)</th>
                      <th className="py-2.5 px-3 text-right">Total (CDF)</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-mono-nums">
                    {sessionSales.map((sale) => {
                      const pay = getPaymentMethodLabel(sale.paymentMethod);
                      return (
                        <tr key={sale.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-neutral-900 font-sans flex items-center gap-1.5">
                            <span>{sale.saleNumber}</span>
                            {sale.dgiNfu && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded border border-emerald-200">
                                NFU
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-500 font-sans">
                            {formatDateTime(sale.createdAt)}
                          </td>
                          <td className="py-2.5 px-3 font-sans font-medium text-neutral-800">
                            {sale.clientName}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
                              {pay.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-neutral-600">
                            ${sale.subtotalUSD.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-neutral-600">
                            ${sale.taxAmountUSD.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-neutral-900">
                            ${sale.totalUSD.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-neutral-600">
                            {new Intl.NumberFormat('fr-FR').format(sale.totalCDF)} FC
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setActivePrintSale(sale)}
                                className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-semibold text-[11px] font-sans inline-flex items-center gap-1 transition-colors border border-neutral-300"
                                title="Voir ou imprimer la facture normalisée"
                              >
                                <Eye className="w-3 h-3 text-neutral-600" />
                                <span>Facture</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSaleToDelete(sale)}
                                className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Supprimer définitivement cette facture"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Ventilation & Modes de Règlement */}
        {activeSubTab === 'BREAKDOWN' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div>
              <h3 className="font-bold text-sm text-neutral-900">
                État Détaillé des Encaissements par Mode de Paiement
              </h3>
              <p className="text-xs text-neutral-500">
                Réconciliation financière pour le contrôle du tiroir et des comptes marchands
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Espèces & Tiroir */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Espèces & Tiroir-Caisse Physique</span>
                </div>

                <div className="space-y-2 text-xs font-mono-nums">
                  <div className="flex justify-between text-neutral-600">
                    <span>Fond de caisse initial (USD) :</span>
                    <span className="font-bold text-neutral-900">${currentCashSession?.openingFloatUSD || 0}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Fond de caisse initial (CDF) :</span>
                    <span className="font-bold text-neutral-900">{(currentCashSession?.openingFloatCDF || 0).toLocaleString()} FC</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Ventes Cash (USD) :</span>
                    <span className="font-bold text-emerald-700">+${sessionMetrics.cashSalesUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Ventes Cash (CDF) :</span>
                    <span className="font-bold text-emerald-700">+{new Intl.NumberFormat('fr-FR').format(sessionMetrics.cashSalesCDF)} FC</span>
                  </div>
                  <div className="pt-2 border-t border-neutral-200 flex justify-between font-bold text-sm text-neutral-900">
                    <span>Total Espèces Théorique USD :</span>
                    <span className="text-emerald-800">${sessionMetrics.expectedCashUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-neutral-900">
                    <span>Total Espèces Théorique CDF :</span>
                    <span className="text-emerald-800">{new Intl.NumberFormat('fr-FR').format(sessionMetrics.expectedCashCDF)} FC</span>
                  </div>
                </div>
              </div>

              {/* Mobile Money & Comptes Marchands */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 text-amber-800 font-bold text-xs uppercase tracking-wider">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <span>Mobile Money & Comptes Numériques RDC</span>
                </div>

                <div className="space-y-2 text-xs font-mono-nums">
                  <div className="flex justify-between text-neutral-600">
                    <span>Vodacom M-Pesa :</span>
                    <span className="font-bold text-neutral-900">${sessionMetrics.mpesaUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Orange Money :</span>
                    <span className="font-bold text-neutral-900">${sessionMetrics.orangeUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Airtel Money :</span>
                    <span className="font-bold text-neutral-900">${sessionMetrics.airtelUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Virements Bancaires :</span>
                    <span className="font-bold text-neutral-900">${sessionMetrics.bankUSD.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-neutral-200 flex justify-between font-bold text-sm text-neutral-900">
                    <span>Total Mobile Money & Banques :</span>
                    <span className="text-amber-700">${(sessionMetrics.mobileTotalUSD + sessionMetrics.bankUSD).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Équivalent en Francs :</span>
                    <span>{new Intl.NumberFormat('fr-FR').format((sessionMetrics.mobileTotalUSD + sessionMetrics.bankUSD) * rate)} FC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Historique des Sessions des Mois Précédents & Rapports Z */}
        {activeSubTab === 'HISTORY' && (
          <div className="p-4 sm:p-6 bg-neutral-100/50">
            <CashHistoryView
              onSelectReportSession={(session) => setSelectedReportSession(session)}
            />
          </div>
        )}
      </div>

      {/* ================= MODAL: OUVERTURE & AUTORISATION DE CAISSE ================= */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900">Autorisation & Ouverture de Caisse</h3>
                  <p className="text-xs text-neutral-500">Initialisation du fond de caisse pour la journée</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpeningModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOpenSessionSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1 uppercase tracking-wider text-[10px]">
                    Fond de Caisse ($ USD) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={openFloatUSD}
                      onChange={(e) => setOpenFloatUSD(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 font-mono-nums font-bold text-sm text-neutral-900 focus:bg-white"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1 uppercase tracking-wider text-[10px]">
                    Fond de Caisse (CDF) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={openFloatCDF}
                      onChange={(e) => setOpenFloatCDF(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 font-mono-nums font-bold text-sm text-neutral-900 focus:bg-white"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-[10px]">FC</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1 uppercase tracking-wider text-[10px]">
                  Caissier Assigné *
                </label>
                <input
                  type="text"
                  value={openCashierName}
                  onChange={(e) => setOpenCashierName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 text-neutral-900 font-semibold focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1 uppercase tracking-wider text-[10px]">
                  Autorisé par (Superviseur / Direction) *
                </label>
                <input
                  type="text"
                  value={openSupervisorName}
                  onChange={(e) => setOpenSupervisorName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 text-neutral-900 font-medium focus:bg-white"
                  required
                />
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-[11px] leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  L'ouverture de caisse verrouille le fond initial et horodate l'autorisation. Toutes les ventes de la journée y seront rattachées.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Autoriser & Ouvrir la Caisse</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CLÔTURE DE CAISSE & COMPTAGE ================= */}
      {isClosingModalOpen && currentCashSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900">Clôture de Caisse & Arrêt des Ventes</h3>
                  <p className="text-xs text-neutral-500">Session {currentCashSession.sessionNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClosingModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloseSessionSubmit} className="space-y-4 text-xs">
              {/* Theoretical vs Counted Cash */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Espèces Théoriques USD attendues :</span>
                  <span className="font-bold font-mono text-neutral-900">${sessionMetrics.expectedCashUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Espèces Théoriques CDF attendues :</span>
                  <span className="font-bold font-mono text-neutral-900">{sessionMetrics.expectedCashCDF.toLocaleString()} FC</span>
                </div>
              </div>

              {/* Physical Cash Count Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1 uppercase tracking-wider text-[10px]">
                    Espèces Réelles Comptées ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={closingCountedUSD}
                    onChange={(e) => setClosingCountedUSD(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 font-mono-nums font-bold text-sm text-neutral-900"
                    required
                  />
                  <div className="mt-1 text-[11px] font-mono-nums">
                    {closingCountedUSD - sessionMetrics.expectedCashUSD === 0 ? (
                      <span className="text-emerald-600 font-bold">✓ Écart nul (Parfait)</span>
                    ) : closingCountedUSD - sessionMetrics.expectedCashUSD > 0 ? (
                      <span className="text-emerald-700 font-bold">
                        Excédent : +${(closingCountedUSD - sessionMetrics.expectedCashUSD).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold">
                        Déficit : -${Math.abs(closingCountedUSD - sessionMetrics.expectedCashUSD).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1 uppercase tracking-wider text-[10px]">
                    Espèces Réelles Comptées (CDF) *
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={closingCountedCDF}
                    onChange={(e) => setClosingCountedCDF(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 font-mono-nums font-bold text-sm text-neutral-900"
                    required
                  />
                  <div className="mt-1 text-[11px] font-mono-nums">
                    {closingCountedCDF - sessionMetrics.expectedCashCDF === 0 ? (
                      <span className="text-emerald-600 font-bold">✓ Écart nul</span>
                    ) : closingCountedCDF - sessionMetrics.expectedCashCDF > 0 ? (
                      <span className="text-emerald-700 font-bold">
                        Excédent : +{(closingCountedCDF - sessionMetrics.expectedCashCDF).toLocaleString()} FC
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold">
                        Déficit : -{Math.abs(closingCountedCDF - sessionMetrics.expectedCashCDF).toLocaleString()} FC
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1 uppercase tracking-wider text-[10px]">
                  Visa & Validation Superviseur *
                </label>
                <input
                  type="text"
                  value={closingSupervisor}
                  onChange={(e) => setClosingSupervisor(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 text-neutral-900 font-semibold focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1 uppercase tracking-wider text-[10px]">
                  Observations & Justifications d'Écarts
                </label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Ex: Clôture sans incident. Billets vérifiés au détecteur UV."
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 text-neutral-900 text-xs focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClosingModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Lock className="w-4 h-4" />
                  <span>Clôturer Définitivement & Générer Rapport Z</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RAPPORT JOURNALIER DE CAISSE (RAPPORT Z) ================= */}
      {selectedReportSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden my-auto">
            {/* Top Toolbar */}
            <div className="p-4 border-b border-neutral-200 bg-neutral-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">
                  Rapport Journalier de Caisse (Z) · {selectedReportSession.sessionNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReportPdf}
                  disabled={isGeneratingReportPdf}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isGeneratingReportPdf ? 'Création PDF...' : 'Télécharger PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-900 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedReportSession(null)}
                  className="text-neutral-400 hover:text-white p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Report Document Area */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-neutral-100 flex justify-center">
              <div
                ref={reportPrintRef}
                className="bg-white p-8 w-[640px] shadow-md border border-neutral-300 rounded text-neutral-900 text-xs font-sans leading-normal"
              >
                {/* Header */}
                <div className="text-center pb-4 border-b-2 border-neutral-900 space-y-1">
                  <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
                    {settings.name}
                  </h2>
                  <p className="text-[11px] text-neutral-600">{settings.address}, {settings.city} · Tél: {settings.phone1}</p>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    NIF: {settings.nif} | RCCM: {settings.rccm} | ID.NAT: {settings.idNat}
                  </p>
                  <div className="inline-block mt-2 px-3 py-1 bg-neutral-900 text-white font-bold text-xs uppercase tracking-widest rounded">
                    RAPPORT JOURNALIER DE CLÔTURE DE CAISSE (Z)
                  </div>
                </div>

                {/* Session Details */}
                <div className="grid grid-cols-2 gap-4 py-4 border-b border-neutral-200 text-xs font-mono-nums">
                  <div className="space-y-1">
                    <p><span className="text-neutral-500 font-sans">N° Session :</span> <strong className="text-neutral-900">{selectedReportSession.sessionNumber}</strong></p>
                    <p><span className="text-neutral-500 font-sans">Ouverte le :</span> {formatDateTime(selectedReportSession.openedAt)}</p>
                    <p><span className="text-neutral-500 font-sans">Clôturée le :</span> {selectedReportSession.closedAt ? formatDateTime(selectedReportSession.closedAt) : 'En cours'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p><span className="text-neutral-500 font-sans">Caissier :</span> <strong>{selectedReportSession.cashierName}</strong></p>
                    <p><span className="text-neutral-500 font-sans">Superviseur :</span> {selectedReportSession.supervisorName || 'Direction'}</p>
                    <p><span className="text-neutral-500 font-sans">Taux du jour :</span> 1$ = {rate} FC</p>
                  </div>
                </div>

                {/* Chiffre d'Affaires & TVA */}
                <div className="py-4 border-b border-neutral-200 space-y-2">
                  <h4 className="font-bold uppercase text-[10px] text-neutral-800 tracking-wider">
                    1. Récapitulatif Fiscal des Ventes
                  </h4>
                  <div className="space-y-1 font-mono-nums text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Nombre de Transactions / Factures :</span>
                      <span className="font-bold">{selectedReportSession.totalTransactionsCount || sessionMetrics.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Total Ventes ($ USD) :</span>
                      <span className="font-bold text-sm text-neutral-900">${(selectedReportSession.totalSalesUSD || sessionMetrics.totalUSD).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Total Ventes (CDF) :</span>
                      <span className="font-bold">{new Intl.NumberFormat('fr-FR').format(selectedReportSession.totalSalesCDF || sessionMetrics.totalCDF)} FC</span>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>TVA 16% DGI Collectée :</span>
                      <span className="font-bold">${(selectedReportSession.vatCollectedUSD || sessionMetrics.totalVatUSD).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Ventilation des Encaissements */}
                <div className="py-4 border-b border-neutral-200 space-y-2">
                  <h4 className="font-bold uppercase text-[10px] text-neutral-800 tracking-wider">
                    2. Ventilation par Mode de Règlement
                  </h4>
                  <div className="space-y-1.5 font-mono-nums text-xs">
                    <div className="flex justify-between">
                      <span>Espèces Cash USD :</span>
                      <span className="font-semibold">${(selectedReportSession.cashSalesUSD || sessionMetrics.cashSalesUSD).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Espèces Cash CDF :</span>
                      <span className="font-semibold">{new Intl.NumberFormat('fr-FR').format(selectedReportSession.cashSalesCDF || sessionMetrics.cashSalesCDF)} FC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mobile Money (M-Pesa, Orange, Airtel) :</span>
                      <span className="font-semibold">${(selectedReportSession.mobileMoneyUSD || sessionMetrics.mobileTotalUSD).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Banques / Virements :</span>
                      <span className="font-semibold">${(selectedReportSession.bankSalesUSD || sessionMetrics.bankUSD).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* État du Tiroir-Caisse & Écarts */}
                <div className="py-4 border-b border-neutral-200 space-y-2">
                  <h4 className="font-bold uppercase text-[10px] text-neutral-800 tracking-wider">
                    3. Contrôle du Tiroir-Caisse & Billetage
                  </h4>
                  <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1.5 font-mono-nums text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Fond de caisse initial :</span>
                      <span>${selectedReportSession.openingFloatUSD} + {selectedReportSession.openingFloatCDF.toLocaleString()} FC</span>
                    </div>
                    <div className="flex justify-between font-bold text-neutral-900 border-t border-neutral-200 pt-1">
                      <span>Espèces Théoriques Attendues :</span>
                      <span>${(selectedReportSession.expectedCashInDrawerUSD || sessionMetrics.expectedCashUSD).toFixed(2)} + {new Intl.NumberFormat('fr-FR').format(selectedReportSession.expectedCashInDrawerCDF || sessionMetrics.expectedCashCDF)} FC</span>
                    </div>
                    {selectedReportSession.status === 'CLOSED' && (
                      <>
                        <div className="flex justify-between font-bold text-neutral-900">
                          <span>Espèces Réelles Comptées :</span>
                          <span>${(selectedReportSession.closingCountedUSD || 0).toFixed(2)} + {new Intl.NumberFormat('fr-FR').format(selectedReportSession.closingCountedCDF || 0)} FC</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1 border-t border-neutral-300">
                          <span>Écart de Caisse :</span>
                          <span>
                            {(selectedReportSession.differenceUSD || 0) >= 0 ? (
                              <span className="text-emerald-700">+${(selectedReportSession.differenceUSD || 0).toFixed(2)}</span>
                            ) : (
                              <span className="text-rose-600">-${Math.abs(selectedReportSession.differenceUSD || 0).toFixed(2)}</span>
                            )}
                            {' · '}
                            {(selectedReportSession.differenceCDF || 0) >= 0 ? (
                              <span className="text-emerald-700">+{(selectedReportSession.differenceCDF || 0).toLocaleString()} FC</span>
                            ) : (
                              <span className="text-rose-600">-{(selectedReportSession.differenceCDF || 0).toLocaleString()} FC</span>
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Signatures & Mentions */}
                <div className="pt-6 grid grid-cols-2 text-center text-xs text-neutral-600">
                  <div className="space-y-10">
                    <p className="font-semibold text-neutral-800">Le Caissier</p>
                    <p className="text-[10px] text-neutral-400">Date & Signature</p>
                  </div>
                  <div className="space-y-10">
                    <p className="font-semibold text-neutral-800">Le Superviseur / Direction</p>
                    <p className="text-[10px] text-neutral-400">Visa & Cachet</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal for Session Sales */}
      <ConfirmDeleteModal
        isOpen={Boolean(saleToDelete)}
        title="Supprimer la facture / le ticket de caisse ?"
        message={`Êtes-vous certain de vouloir supprimer définitivement ${saleToDelete?.saleNumber} (${saleToDelete?.clientName}) ? Cette opération réajustera automatiquement les stocks des articles et les totaux de la caisse.`}
        details={saleToDelete ? `Montant total: $${saleToDelete.totalUSD.toFixed(2)} USD (${saleToDelete.totalCDF.toLocaleString('fr-FR')} FC)` : ''}
        confirmText="Supprimer définitivement"
        onConfirm={() => {
          if (saleToDelete) {
            deleteSale(saleToDelete.id);
            setSaleToDelete(null);
          }
        }}
        onCancel={() => setSaleToDelete(null)}
      />
    </div>
  );
};
