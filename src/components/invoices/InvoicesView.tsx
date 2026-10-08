import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale, SaleStatus, DocumentType } from '../../types';
import {
  formatDate,
  formatDateTime,
  formatDualCurrency,
  getPaymentMethodLabel,
  getStatusBadge,
  getDocumentTypeLabel,
} from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelUtils';
import { PaymentRecordModal } from './PaymentRecordModal';
import { InvoiceEditModal } from './InvoiceEditModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { SalesReportModal } from './SalesReportModal';
import {
  Search,
  Plus,
  Printer,
  MessageSquare,
  CreditCard,
  FileCheck,
  Trash2,
  Filter,
  ArrowRight,
  FileText,
  Receipt,
  FileCode,
  Edit2,
  FileSpreadsheet,
} from 'lucide-react';

interface InvoicesViewProps {
  onOpenCreateModal?: () => void;
  hideHeader?: boolean;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ onOpenCreateModal, hideHeader = false }) => {
  const {
    sales,
    clients,
    deleteSale,
    convertQuoteToInvoice,
    setActivePrintSale,
    setActiveWhatsAppClient,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'INVOICE' | 'QUOTE_PROFORMA' | 'UNPAID'>('ALL');
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<Sale | null>(null);
  const [selectedSaleToEdit, setSelectedSaleToEdit] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Search
      const matchSearch =
        sale.saleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.clientPhone.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      // Tab filter
      if (selectedTab === 'INVOICE') {
        return sale.type === 'INVOICE' || sale.type === 'RECEIPT';
      }
      if (selectedTab === 'QUOTE_PROFORMA') {
        return sale.type === 'QUOTE_PROFORMA';
      }
      if (selectedTab === 'UNPAID') {
        return (sale.type === 'INVOICE' || sale.type === 'RECEIPT') && sale.paymentStatus !== 'PAID';
      }

      return true;
    });
  }, [sales, searchQuery, selectedTab]);

  const handleExportExcel = () => {
    const facturesData = filteredSales.map((s) => ({
      Numero: s.saleNumber,
      Type: s.type,
      Client: s.clientName,
      Telephone: s.clientPhone,
      Date: s.createdAt,
      TotalUSD: s.totalUSD,
      TotalCDF: s.totalCDF,
      TVA_USD: s.taxAmountUSD,
      PayeUSD: s.amountPaidUSD,
      SoldeUSD: s.remainingDebtUSD,
      Statut: s.paymentStatus,
      ModePaiement: s.paymentMethod,
      NFU_DGI: s.dgiNfu || '',
      CodeSecurite: s.dgiSecurityCode || '',
    }));

    const articlesData: any[] = [];
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        articlesData.push({
          NumeroFacture: s.saleNumber,
          Client: s.clientName,
          Date: s.createdAt,
          CodeArticle: it.code,
          Article: it.name,
          GroupeTVA: it.taxGroup,
          Quantite: it.quantity,
          Unite: it.unit,
          PrixUnitaireUSD: it.unitPriceUSD,
          TotalLigneUSD: it.subtotalUSD,
        });
      });
    });

    exportToExcel(`CongoBiz_Factures_${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { sheetName: 'Factures_Synthese', data: facturesData },
      { sheetName: 'Lignes_Articles', data: articlesData },
    ]);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header (hidden if embedded) */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              Facturation & Devis Proforma
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Émission, modification et suivi des factures normalisées, devis proforma et encaissements.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons on single line under the title */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 no-scrollbar">
            <div className="flex items-center gap-2">
              {/* PDF Report Button */}
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
                title="Générer et télécharger le rapport PDF des factures et créances"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-200" />
                <span>Rapport PDF</span>
              </button>

              {/* Excel Export Button */}
              <button
                onClick={handleExportExcel}
                className="h-8 px-3 bg-white hover:bg-emerald-50 border border-neutral-300 hover:border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
                title="Exporter vers Microsoft Excel (.xlsx) avec détails des articles"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel (.xlsx)</span>
              </button>
            </div>

            <button
              onClick={onOpenCreateModal}
              className="h-8 px-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Nouvelle Facture / Devis</span>
            </button>
          </div>

          {/* Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              {[
                { id: 'ALL', label: 'Tous les documents', count: sales.length },
                {
                  id: 'INVOICE',
                  label: 'Factures',
                  count: sales.filter((s) => s.type === 'INVOICE' || s.type === 'RECEIPT').length,
                },
                {
                  id: 'QUOTE_PROFORMA',
                  label: 'Devis Proforma',
                  count: sales.filter((s) => s.type === 'QUOTE_PROFORMA').length,
                },
                {
                  id: 'UNPAID',
                  label: 'Impayés / En Attente',
                  count: sales.filter((s) => (s.type === 'INVOICE' || s.type === 'RECEIPT') && s.paymentStatus !== 'PAID').length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    selectedTab === tab.id
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-nums ${
                      selectedTab === tab.id
                        ? 'bg-neutral-800 text-amber-400'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Rechercher facture, client, tél..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-none focus:bg-white"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50 text-neutral-700 uppercase font-semibold text-[10px] border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">N° Document</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-right">Montant Total</th>
                <th className="py-3 px-4 text-right">Payé</th>
                <th className="py-3 px-4 text-right">Reste Dû</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono-nums">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400 font-sans text-xs">
                    Aucun document ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const isQuote = sale.type === 'QUOTE_PROFORMA';
                  const statusInfo = getStatusBadge(sale.paymentStatus);
                  const client = clients.find((c) => c.id === sale.clientId);

                  return (
                    <tr key={sale.id} className="hover:bg-neutral-50/70 transition-colors">
                      {/* Sale Number */}
                      <td className="py-3.5 px-4 font-bold text-neutral-900">
                        <div className="flex items-center gap-1.5">
                          <span>{sale.saleNumber}</span>
                          {sale.isNormalizedDGI && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                              title="Facture Normalisée DGI DEF"
                            ></span>
                          )}
                        </div>
                      </td>

                      {/* Doc Type */}
                      <td className="py-3.5 px-4 font-sans">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            sale.type === 'INVOICE'
                              ? 'bg-neutral-900 text-white'
                              : sale.type === 'QUOTE_PROFORMA'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {getDocumentTypeLabel(sale.type)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-neutral-600">
                        {formatDate(sale.createdAt)}
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4 font-sans font-medium text-neutral-900 truncate max-w-[180px]">
                        <div>
                          <span className="block truncate">{sale.clientName}</span>
                          {sale.clientNif && (
                            <span className="text-[10px] text-neutral-400 font-mono-nums block truncate">
                              NIF : {sale.clientNif}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-bold text-neutral-900">
                        <div>
                          <span>${sale.totalUSD.toFixed(2)}</span>
                          <span className="block text-[10px] font-normal text-neutral-400">
                            {new Intl.NumberFormat('fr-FR').format(sale.totalCDF)} FC
                          </span>
                        </div>
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 px-4 text-right font-mono-nums text-emerald-700 font-medium">
                        ${sale.amountPaidUSD.toFixed(2)}
                      </td>

                      {/* Remaining Debt */}
                      <td className="py-3.5 px-4 text-right font-mono-nums">
                        {sale.remainingDebtUSD > 0 ? (
                          <span className="font-bold text-rose-600">
                            ${sale.remainingDebtUSD.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center font-sans">
                        {isQuote ? (
                          <span className="text-[11px] px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 font-medium">
                            En Attente Accord
                          </span>
                        ) : (
                          <span className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${statusInfo.class}`}>
                            {statusInfo.label}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1">
                          {/* Convert Proforma if quote */}
                          {isQuote && (
                            <button
                              onClick={() => convertQuoteToInvoice(sale.id)}
                              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                              title="Convertir ce devis en facture ferme"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>Convertir</span>
                            </button>
                          )}

                          {/* Record payment if debt exists */}
                          {!isQuote && sale.remainingDebtUSD > 0 && (
                            <button
                              onClick={() => setSelectedSaleForPayment(sale)}
                              className="p-1.5 text-neutral-700 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              title="Enregistrer un versement / règlement"
                            >
                              <CreditCard className="w-4 h-4 text-emerald-600" />
                            </button>
                          )}

                          {/* Modify / Edit */}
                          <button
                            onClick={() => setSelectedSaleToEdit(sale)}
                            className="p-1.5 text-neutral-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                            title={isQuote ? 'Modifier ce devis proforma' : 'Modifier cette facture'}
                          >
                            <Edit2 className="w-4 h-4 text-amber-600" />
                          </button>

                          {/* WhatsApp */}
                          {client && (
                            <button
                              onClick={() => setActiveWhatsAppClient({ client, sale })}
                              className="p-1.5 text-neutral-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              title="Partager par WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                          {/* Print */}
                          <button
                            onClick={() => setActivePrintSale(sale)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                            title="Imprimer Facture A4 ou Ticket"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setSaleToDelete(sale)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Recording Modal */}
      {selectedSaleForPayment && (
        <PaymentRecordModal
          sale={selectedSaleForPayment}
          onClose={() => setSelectedSaleForPayment(null)}
        />
      )}

      {/* Invoice / Quote Edit Modal */}
      <InvoiceEditModal
        isOpen={Boolean(selectedSaleToEdit)}
        saleToEdit={selectedSaleToEdit}
        onClose={() => setSelectedSaleToEdit(null)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(saleToDelete)}
        title={saleToDelete?.type === 'QUOTE_PROFORMA' ? 'Supprimer le devis proforma ?' : 'Supprimer la facture / reçu ?'}
        message={`Êtes-vous certain de vouloir supprimer définitivement ${saleToDelete?.saleNumber} (${saleToDelete?.clientName}) ? Cette opération réajustera automatiquement les stocks des articles et les créances associées.`}
        details={saleToDelete ? `Montant total: $${saleToDelete.totalUSD.toFixed(2)} USD · Solde: $${saleToDelete.remainingDebtUSD.toFixed(2)} USD` : ''}
        confirmText="Supprimer"
        onConfirm={() => {
          if (saleToDelete) {
            deleteSale(saleToDelete.id);
            setSaleToDelete(null);
          }
        }}
        onCancel={() => setSaleToDelete(null)}
      />

      {/* Global Sales PDF Report Modal */}
      <SalesReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};
