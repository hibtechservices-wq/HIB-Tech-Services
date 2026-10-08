import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductOrService, ItemType } from '../../types';
import { formatDualCurrency } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelUtils';
import { ItemModal } from './ItemModal';
import { StockReportModal } from './StockReportModal';
import { ExcelImportModal } from '../common/ExcelImportModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  Search,
  Plus,
  Package,
  Wrench,
  Edit2,
  Trash2,
  Upload,
  AlertTriangle,
  ArrowUpDown,
  Check,
  TrendingUp,
  Printer,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';

export const CatalogView: React.FC = () => {
  const { products, deleteProductOrService, adjustStock, settings } = useApp();
  const rate = settings.exchangeRateUSD_CDF || 2850;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockReportModalOpen, setIsStockReportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ProductOrService | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ProductOrService | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<ItemType>('PRODUCT');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return products.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = selectedType === 'ALL' || item.type === selectedType;
      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

      return matchSearch && matchType && matchCategory;
    });
  }, [products, searchQuery, selectedType, selectedCategory]);

  const handleExportExcel = () => {
    const data = filteredItems.map((p) => ({
      Reference: p.code,
      Designation: p.name,
      Type: p.type,
      Categorie: p.category,
      Unite: p.unit,
      PrixVenteUSD: p.priceUSD,
      PrixVenteCDF: Math.round(p.priceUSD * rate),
      CoutAchatUSD: p.costPriceUSD,
      StockActuel: p.type === 'PRODUCT' ? p.stockQty : 'N/A (Service)',
      SeuilAlerte: p.type === 'PRODUCT' ? p.minStockAlert : 'N/A',
      GroupeTVA: p.taxGroup,
      Description: p.description || '',
    }));
    exportToExcel(`CongoBiz_Articles_Stock_${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { sheetName: 'Articles_Stock', data },
    ]);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Catalogue & Gestion des Stocks
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Inventaire des marchandises, tarification des prestations et valorisation comptable du stock.
          </p>
        </div>

        {/* Action Buttons on single line under the title */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* PDF Stock Report Button */}
          <button
            onClick={() => setIsStockReportModalOpen(true)}
            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            title="Générer et télécharger l'état officiel des stocks en PDF"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-200" />
            <span>État Stock (PDF)</span>
          </button>

          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            className="h-8 px-3 bg-white hover:bg-emerald-50 border border-neutral-300 hover:border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            title="Exporter tout le catalogue vers un fichier Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Excel Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="h-8 px-3 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            title="Importer des articles ou services depuis un fichier Excel (.xlsx, .xls)"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-600" />
            <span>Importer Excel</span>
          </button>
          
          <button
            onClick={() => {
              setItemToEdit(null);
              setModalDefaultType('PRODUCT');
              setIsModalOpen(true);
            }}
            className="h-8 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Produit</span>
          </button>
          <button
            onClick={() => {
              setItemToEdit(null);
              setModalDefaultType('SERVICE');
              setIsModalOpen(true);
            }}
            className="h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>+ Service</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex bg-neutral-100 p-0.5 rounded-lg text-xs w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                selectedType === 'ALL'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Tous ({products.length})
            </button>
            <button
              onClick={() => setSelectedType('PRODUCT')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                selectedType === 'PRODUCT'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span>Articles en Stock ({products.filter((p) => p.type === 'PRODUCT').length})</span>
            </button>
            <button
              onClick={() => setSelectedType('SERVICE')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                selectedType === 'SERVICE'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              <span>Prestations Services ({products.filter((p) => p.type === 'SERVICE').length})</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Rechercher désignation, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-none focus:bg-white"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Category Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-neutral-100 text-xs">
            <span className="text-neutral-400 text-[11px] font-medium shrink-0">Catégories :</span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-neutral-900 text-white font-medium'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Toutes
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white font-medium'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50 text-neutral-700 uppercase font-semibold text-[10px] border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Désignation</th>
                <th className="py-3 px-4">Type / Catégorie</th>
                <th className="py-3 px-4 text-right">Prix de Vente</th>
                <th className="py-3 px-4 text-right">Coût d'Achat</th>
                <th className="py-3 px-4 text-center">Niveau de Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono-nums">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400 font-sans text-xs">
                    Aucun article ou service ne correspond à vos critères.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const dualPrice = formatDualCurrency(item.priceUSD, rate);
                  const isLowStock = item.type === 'PRODUCT' && item.stockQty <= (item.minStockAlert || 5) && item.stockQty > 0;
                  const isOutOfStock = item.type === 'PRODUCT' && item.stockQty === 0;

                  return (
                    <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4 font-bold text-neutral-900">
                        {item.code}
                      </td>

                      {/* Name & Desc */}
                      <td className="py-3.5 px-4 font-sans font-medium text-neutral-900">
                        <div>
                          <span>{item.name}</span>
                          {item.description && (
                            <p className="text-[11px] text-neutral-400 font-normal truncate max-w-xs">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Type / Category */}
                      <td className="py-3.5 px-4 font-sans text-neutral-600">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                              item.type === 'PRODUCT'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {item.type === 'PRODUCT' ? 'Produit' : 'Service'}
                          </span>
                          {item.category && (
                            <span className="text-neutral-500 text-xs">
                              · {item.category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-bold text-neutral-900">
                        <div>
                          <span>${item.priceUSD.toFixed(2)}</span>
                          <span className="block text-[10px] font-normal text-neutral-400">
                            {dualPrice.cdf}
                          </span>
                        </div>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3.5 px-4 text-right text-neutral-500 font-medium">
                        {item.costPriceUSD ? `$${item.costPriceUSD.toFixed(2)}` : '—'}
                      </td>

                      {/* Stock Adjuster / Level */}
                      <td className="py-3.5 px-4 text-center">
                        {item.type === 'PRODUCT' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => adjustStock(item.id, -1)}
                              className="w-5 h-5 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-bold"
                              title="-1 unité"
                            >
                              -
                            </button>

                            <span
                              className={`font-mono-nums font-bold px-2 py-0.5 rounded text-xs ${
                                isOutOfStock
                                  ? 'bg-rose-100 text-rose-700'
                                  : isLowStock
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-neutral-100 text-neutral-900'
                              }`}
                            >
                              {item.stockQty} {item.unit}
                            </span>

                            <button
                              onClick={() => adjustStock(item.id, 1)}
                              className="w-5 h-5 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-bold"
                              title="+1 unité"
                            >
                              +
                            </button>
                            <button
                              onClick={() => adjustStock(item.id, 5)}
                              className="px-1.5 py-0.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded text-[10px] font-mono-nums"
                              title="+5 unités"
                            >
                              +5
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-medium font-sans">
                            Illimité ({item.unit})
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setItemToEdit(item);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(item)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal Add/Edit Item */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setItemToEdit(null);
        }}
        itemToEdit={itemToEdit}
        defaultType={modalDefaultType}
      />

      {/* Modal Stock Report PDF */}
      <StockReportModal
        isOpen={isStockReportModalOpen}
        onClose={() => setIsStockReportModalOpen(false)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(itemToDelete)}
        title={`Supprimer ${itemToDelete?.type === 'SERVICE' ? 'le service' : "l'article"} ?`}
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${itemToDelete?.name}" du catalogue ?`}
        details={itemToDelete ? `Code: ${itemToDelete.code} · Prix: $${itemToDelete.priceUSD.toFixed(2)} USD` : ''}
        confirmText="Supprimer"
        onConfirm={() => {
          if (itemToDelete) {
            deleteProductOrService(itemToDelete.id);
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Excel & CSV Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        moduleType="PRODUCTS"
        title="Importer Articles & Prestations de Services"
      />
    </div>
  );
};
