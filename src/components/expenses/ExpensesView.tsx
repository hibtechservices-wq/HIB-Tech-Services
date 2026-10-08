import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory, Expense } from '../../types';
import { formatDate, formatDualCurrency, getPaymentMethodLabel } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelUtils';
import { ExpenseModal } from './ExpenseModal';
import { ExpensesReportModal } from './ExpensesReportModal';
import { ExcelImportModal } from '../common/ExcelImportModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  Search,
  Plus,
  Receipt,
  Upload,
  Printer,
  Trash2,
  Tag,
  Zap,
  Building,
  Wifi,
  Truck,
  Users,
  Briefcase,
  FileSpreadsheet,
} from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { expenses, deleteExpense, settings, metrics } = useApp();
  const rate = settings.exchangeRateUSD_CDF || 2850;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.beneficiary && e.beneficiary.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.receiptRef && e.receiptRef.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = selectedCategory === 'ALL' || e.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [expenses, searchQuery, selectedCategory]);

  const handleExportExcel = () => {
    const data = filteredExpenses.map((e) => ({
      Description: e.description,
      Categorie: e.category,
      MontantUSD: e.amountUSD,
      MontantCDF: e.amountCDF,
      Date: e.date,
      ModePaiement: e.paymentMethod,
      Beneficiaire: e.beneficiary || '',
      PieceJustificative: e.receiptRef || '',
    }));
    exportToExcel(`CongoBiz_Depenses_${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { sheetName: 'Depenses_Charges', data },
    ]);
  };

  const getCategoryLabel = (cat: ExpenseCategory): string => {
    switch (cat) {
      case 'ELECTRICITE_CARBURANT':
        return 'Groupe & Énergie';
      case 'LOYER':
        return 'Loyer Bureau';
      case 'COMMUNICATION':
        return 'Internet & Télécoms';
      case 'TRANSPORT':
        return 'Transport & Douane';
      case 'SALAIRES':
        return 'Salaires & Rémunérations';
      case 'FOURNITURES':
        return 'Fournitures';
      case 'IMPOTS_TAXES':
        return 'Impôts & Taxes RDC';
      case 'MAINTENANCE':
        return 'Entretien';
      default:
        return 'Autres Charges';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Dépenses & Charges d'Exploitation
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Suivi des coûts d'activité (carburant groupe, loyer, internet, salaires) et impact sur le bénéfice net.
          </p>
        </div>

        {/* Action Buttons on single line under the title */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* PDF Report Button */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            title="Générer et télécharger l'état des dépenses et charges d'exploitation en PDF"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-200" />
            <span>État Dépenses (PDF)</span>
          </button>

          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            className="h-8 px-3 bg-white hover:bg-emerald-50 border border-neutral-300 hover:border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            title="Exporter toutes les dépenses vers Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Excel Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="h-8 px-3 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            title="Importer des dépenses depuis un fichier Excel (.xlsx, .xls)"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-600" />
            <span>Importer Excel</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="h-8 px-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Enregistrer une Dépense</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
          <span className="text-xs text-neutral-500 block">Total Dépenses Enregistrées</span>
          <span className="text-xl font-bold font-mono-nums text-neutral-900 block mt-1">
            ${metrics.totalExpensesUSD.toFixed(2)} USD
          </span>
          <span className="text-[11px] font-mono-nums text-neutral-400 block mt-0.5">
            ≈ {new Intl.NumberFormat('fr-FR').format(Math.round(metrics.totalExpensesUSD * rate))} FC
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
          <span className="text-xs text-neutral-500 block">Nombre d'opérations</span>
          <span className="text-xl font-bold font-mono-nums text-neutral-900 block mt-1">
            {expenses.length} dépenses
          </span>
          <span className="text-[11px] text-neutral-400 block mt-0.5">
            Moyenne : ${(metrics.totalExpensesUSD / (expenses.length || 1)).toFixed(2)} / charge
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
          <span className="text-xs text-neutral-500 block">Bénéfice Net Actuel</span>
          <span className={`text-xl font-bold font-mono-nums block mt-1 ${metrics.netProfitUSD >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            ${metrics.netProfitUSD.toFixed(2)} USD
          </span>
          <span className="text-[11px] text-neutral-500 block mt-0.5">
            Chiffre d'affaires − Achats − Dépenses
          </span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex bg-neutral-100 p-0.5 rounded-lg text-xs w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                selectedCategory === 'ALL' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Toutes les Dépenses ({expenses.length})
            </button>
            <button
              onClick={() => setSelectedCategory('ELECTRICITE_CARBURANT')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                selectedCategory === 'ELECTRICITE_CARBURANT' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Groupe / Carburant
            </button>
            <button
              onClick={() => setSelectedCategory('LOYER')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                selectedCategory === 'LOYER' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Loyer
            </button>
            <button
              onClick={() => setSelectedCategory('COMMUNICATION')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                selectedCategory === 'COMMUNICATION' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600'
              }`}
            >
              Internet & Télécoms
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Rechercher motif, bénéficiaire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50 text-neutral-700 uppercase font-semibold text-[11px] border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description / Motif</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Bénéficiaire</th>
                <th className="py-3 px-4">Mode Paiement</th>
                <th className="py-3 px-4 text-right">Montant ($ USD)</th>
                <th className="py-3 px-4 text-right">Montant (CDF)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400 text-xs">
                    Aucune dépense enregistrée.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const paymentInfo = getPaymentMethodLabel(exp.paymentMethod);
                  const dual = formatDualCurrency(exp.amountUSD, exp.exchangeRate);

                  return (
                    <tr key={exp.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                        {formatDate(exp.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-neutral-900 block">{exp.description}</span>
                        {exp.receiptRef && (
                          <span className="text-[10px] text-neutral-500 font-mono-nums">
                            Réf: {exp.receiptRef}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                          {getCategoryLabel(exp.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">
                        {exp.beneficiary || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-medium text-neutral-700">
                          {paymentInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-nums font-bold text-rose-700">
                        -${exp.amountUSD.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-nums text-neutral-500 text-[11px]">
                        {dual.cdf}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(expenseToDelete)}
        title="Supprimer cette dépense ?"
        message={`Êtes-vous certain de vouloir supprimer l'enregistrement de dépense "${expenseToDelete?.description}" ?`}
        details={expenseToDelete ? `Montant : $${expenseToDelete.amountUSD.toFixed(2)} USD (${expenseToDelete.category})` : ''}
        confirmText="Supprimer"
        onConfirm={() => {
          if (expenseToDelete) {
            deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }
        }}
        onCancel={() => setExpenseToDelete(null)}
      />

      {/* Expenses Report PDF Modal */}
      <ExpensesReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        moduleType="EXPENSES"
        title="Importer des Dépenses & Charges depuis Excel / CSV"
      />
    </div>
  );
};
