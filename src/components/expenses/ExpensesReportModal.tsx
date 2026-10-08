import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Expense, ExpenseCategory } from '../../types';
import { formatDate, formatDateTime, formatDualCurrency, getPaymentMethodLabel } from '../../utils/formatters';
import { downloadElementAsPDF } from '../../utils/pdfGenerator';
import { Printer, Download, Filter, Tag, X, Loader2 } from 'lucide-react';

interface ExpensesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpensesReportModal: React.FC<ExpensesReportModalProps> = ({ isOpen, onClose }) => {
  const { expenses, settings } = useApp();
  const rate = settings.exchangeRateUSD_CDF || 2850;

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;
      if (startDate && new Date(e.date) < new Date(startDate)) return false;
      if (endDate && new Date(e.date) > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  }, [expenses, selectedCategory, startDate, endDate]);

  const summary = useMemo(() => {
    let totalUSD = 0;
    const categoryTotals: Record<string, number> = {};

    filteredExpenses.forEach((e) => {
      totalUSD += e.amountUSD;
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amountUSD;
    });

    return {
      count: filteredExpenses.length,
      totalUSD,
      totalCDF: Math.round(totalUSD * rate),
      categoryTotals,
    };
  }, [filteredExpenses, rate]);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const filename = `Etat_Depenses_${new Date().toISOString().slice(0, 10)}.pdf`;
      await downloadElementAsPDF(printAreaRef.current, filename, {
        format: 'a4',
        orientation: 'portrait',
        margin: 8,
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[96vh]">
        {/* Modal Controls */}
        <div className="print:hidden p-4 border-b border-neutral-200 bg-neutral-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-800 text-amber-400 rounded-lg">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">État Récapitulatif des Dépenses & Charges (PDF)</h2>
              <p className="text-xs text-neutral-400">Rapport financier des dépenses d'exploitation en USD / CDF</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct PDF Download */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isGeneratingPDF ? 'Création PDF...' : 'Télécharger PDF'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs border border-neutral-700"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="print:hidden p-4 bg-neutral-50 border-b border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Catégorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800"
            >
              <option value="ALL">Toutes les catégories</option>
              <option value="ELECTRICITE_CARBURANT">Groupe Électrogène & Énergie</option>
              <option value="LOYER">Loyer Bureau / Dépôt</option>
              <option value="COMMUNICATION">Internet, Télécoms & Starlink</option>
              <option value="TRANSPORT">Transport, Logistique & Douane</option>
              <option value="SALAIRES">Salaires & Avances Personnel</option>
              <option value="FOURNITURES">Fournitures & Outillage</option>
              <option value="IMPOTS_TAXES">Impôts & Taxes RDC</option>
              <option value="MAINTENANCE">Maintenance & Réparations</option>
              <option value="AUTRE">Autres Charges</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Date Début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Date Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800"
            />
          </div>
        </div>

        {/* Print Content */}
        <div ref={printAreaRef} className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-neutral-900 print:p-0">
          <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-6 mb-6">
            <div>
              <h1 className="text-xl font-black text-neutral-950 uppercase tracking-tight">{settings.name}</h1>
              <p className="text-xs text-neutral-600 font-medium">{settings.slogan}</p>
              <p className="text-xs text-neutral-600 mt-1">{settings.address}, {settings.city} - RDC</p>
              <div className="text-[11px] text-neutral-500 font-mono mt-1">
                NIF: {settings.nif} | RCCM: {settings.rccm}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-neutral-900 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2">
                ÉTAT DES DÉPENSES
              </div>
              <p className="text-xs text-neutral-500">Édité le : {formatDateTime(new Date().toISOString())}</p>
              <p className="text-xs font-semibold text-neutral-800 mt-1">Taux : 1 USD = {rate.toLocaleString('fr-FR')} CDF</p>
            </div>
          </div>

          {/* Metric Summary */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl mb-6 text-center text-xs">
            <div>
              <p className="text-neutral-500">Lignes de Dépenses</p>
              <p className="text-base font-bold text-neutral-900">{summary.count}</p>
            </div>
            <div>
              <p className="text-neutral-500">Total Dépensé (USD)</p>
              <p className="text-base font-bold text-rose-700">${summary.totalUSD.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Contre-valeur (CDF)</p>
              <p className="text-base font-bold text-neutral-900">{summary.totalCDF.toLocaleString('fr-FR')} FC</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-300 bg-neutral-100 text-neutral-700 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Motif & Description</th>
                <th className="py-2.5 px-3">Catégorie</th>
                <th className="py-2.5 px-3">Bénéficiaire / Pièce</th>
                <th className="py-2.5 px-3 text-right">Montant USD</th>
                <th className="py-2.5 px-3 text-right">Montant CDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-neutral-50">
                  <td className="py-2 px-3 text-neutral-600">{formatDate(e.date)}</td>
                  <td className="py-2 px-3 font-semibold text-neutral-900">{e.description}</td>
                  <td className="py-2 px-3 text-neutral-600">{e.category}</td>
                  <td className="py-2 px-3 text-neutral-500 text-[11px]">
                    {e.beneficiary || '-'} {e.receiptRef ? `(Réf: ${e.receiptRef})` : ''}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-rose-700">${e.amountUSD.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono text-neutral-600 text-[11px]">
                    {e.amountCDF.toLocaleString('fr-FR')} FC
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 pt-4 border-t border-neutral-200 flex justify-between text-[11px] text-neutral-500">
            <span>Rapport comptable édité par {settings.name}</span>
            <span>Trésorerie & Contrôle de gestion</span>
          </div>
        </div>
      </div>
    </div>
  );
};
