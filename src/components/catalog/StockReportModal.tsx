import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductOrService } from '../../types';
import { formatDate, formatDateTime, formatDualCurrency } from '../../utils/formatters';
import { downloadElementAsPDF } from '../../utils/pdfGenerator';
import { Printer, X, Download, Filter, Package, AlertTriangle, FileText, CheckCircle2, TrendingUp, DollarSign, Loader2 } from 'lucide-react';

interface StockReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockReportModal: React.FC<StockReportModalProps> = ({ isOpen, onClose }) => {
  const { products, settings } = useApp();
  const rate = settings.exchangeRateUSD_CDF || 2850;

  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStockStatus, setFilterStockStatus] = useState<'ALL' | 'LOW' | 'OUT' | 'AVAILABLE'>('ALL');
  const [reportTitle, setReportTitle] = useState<string>("ÉTAT D'INVENTAIRE & GESTION DES STOCKS");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Only products with physical stock (exclude pure intangible services if requested or show clearly)
  const stockProducts = useMemo(() => {
    return products.filter((p) => p.type === 'PRODUCT');
  }, [products]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    stockProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [stockProducts]);

  // Filtered items for report
  const filteredProducts = useMemo(() => {
    return stockProducts.filter((p) => {
      const matchCategory = filterCategory === 'ALL' || p.category === filterCategory;

      let matchStatus = true;
      if (filterStockStatus === 'LOW') {
        matchStatus = p.stockQty > 0 && p.stockQty <= (p.minStockAlert || 5);
      } else if (filterStockStatus === 'OUT') {
        matchStatus = p.stockQty === 0;
      } else if (filterStockStatus === 'AVAILABLE') {
        matchStatus = p.stockQty > (p.minStockAlert || 5);
      }

      return matchCategory && matchStatus;
    });
  }, [stockProducts, filterCategory, filterStockStatus]);

  // Aggregate Metrics
  const totalStockUnits = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.stockQty, 0);
  }, [filteredProducts]);

  const totalCostValueUSD = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.stockQty * (p.costPriceUSD || 0), 0);
  }, [filteredProducts]);

  const totalSalesValueUSD = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.stockQty * (p.priceUSD || 0), 0);
  }, [filteredProducts]);

  const potentialProfitUSD = Math.max(0, totalSalesValueUSD - totalCostValueUSD);
  const potentialMarginPercent = totalSalesValueUSD > 0 ? (potentialProfitUSD / totalSalesValueUSD) * 100 : 0;

  const lowStockCount = useMemo(() => {
    return filteredProducts.filter((p) => p.stockQty > 0 && p.stockQty <= (p.minStockAlert || 5)).length;
  }, [filteredProducts]);

  const outOfStockCount = useMemo(() => {
    return filteredProducts.filter((p) => p.stockQty === 0).length;
  }, [filteredProducts]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const filename = `Etat_Stock_${new Date().toISOString().slice(0, 10)}.pdf`;
      await downloadElementAsPDF(printAreaRef.current, filename, {
        format: 'a4',
        orientation: 'portrait',
        margin: 8,
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-neutral-200 overflow-hidden my-auto flex flex-col max-h-[96vh]">
        {/* Top Action Bar (Hidden during print) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 border-b border-neutral-200 bg-neutral-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-400 text-neutral-950 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base tracking-tight text-white">
                Rapport d'Inventaire & État des Stocks (PDF)
              </h3>
              <p className="text-xs text-neutral-400">
                Génération de document A4 officiel conforme OHADA & DGI RDC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isGeneratingPDF ? 'Création PDF...' : 'Télécharger PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs border border-neutral-700"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls (Hidden during print) */}
        <div className="no-print bg-neutral-50 px-6 py-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Category */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-semibold">Catégorie :</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1 text-xs text-neutral-900 focus:outline-none"
              >
                <option value="ALL">Toutes les catégories ({stockProducts.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Stock Level */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-semibold">État du stock :</span>
              <select
                value={filterStockStatus}
                onChange={(e) => setFilterStockStatus(e.target.value as any)}
                className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1 text-xs text-neutral-900 focus:outline-none"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="AVAILABLE">Stock Normal (&gt; Seuil)</option>
                <option value="LOW">Stock Faible / Alerte</option>
                <option value="OUT">Rupture de Stock (0)</option>
              </select>
            </div>
          </div>

          <div className="text-[11px] text-neutral-600 font-medium font-mono-nums">
            {filteredProducts.length} référence(s) sélectionnée(s) · {totalStockUnits} unités physiques
          </div>
        </div>

        {/* Document Print Container */}
        <div ref={printAreaRef} className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white print:p-0 print:m-0 text-neutral-900">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Document Header with Company info */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-neutral-900">
              <div>
                <h1 className="text-xl font-black tracking-tight text-neutral-950 uppercase">
                  {settings.name}
                </h1>
                <p className="text-xs text-neutral-600 font-medium mt-0.5">
                  {settings.slogan || 'Solutions Informatiques, Électroniques & Prestations Commerciales'}
                </p>
                <div className="text-[11px] text-neutral-500 space-y-0.5 mt-2">
                  <p>{settings.address} · {settings.city} · République Démocratique du Congo</p>
                  <p>Tél : {settings.phone1} {settings.phone2 ? `· ${settings.phone2}` : ''} {settings.email ? `· Email : ${settings.email}` : ''}</p>
                  <p className="font-mono-nums">
                    {settings.nif ? `NIF : ${settings.nif}` : ''} {settings.rccm ? `· RCCM : ${settings.rccm}` : ''} {settings.idNat ? `· ID.NAT : ${settings.idNat}` : ''}
                  </p>
                </div>
              </div>

              {/* Document Meta Box */}
              <div className="sm:text-right bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs w-full sm:w-auto">
                <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">
                  Rapport Officiel de Gestion
                </span>
                <h2 className="text-base font-black text-neutral-900 uppercase mt-0.5">
                  ÉTAT DES STOCKS & VALORISATION
                </h2>
                <div className="text-[11px] text-neutral-600 mt-2 space-y-0.5 font-mono-nums">
                  <p>Date d'édition : <span className="font-bold text-neutral-900">{formatDateTime(new Date().toISOString())}</span></p>
                  <p>Taux de change appliqué : <span className="font-bold text-neutral-900">1$ = {rate.toLocaleString('fr-FR')} FC</span></p>
                  <p>Périmètre : <span className="font-semibold text-neutral-800">{filterCategory === 'ALL' ? 'Inventaire Général' : `Catégorie ${filterCategory}`}</span></p>
                </div>
              </div>
            </div>

            {/* Financial & Quantitative KPI Cards Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Units */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-[10px] font-bold text-neutral-500 uppercase block">Total Articles</span>
                <span className="text-lg font-black text-neutral-900 font-mono-nums block mt-0.5">
                  {totalStockUnits.toLocaleString('fr-FR')} <span className="text-xs font-normal text-neutral-500">unités</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-medium">
                  {filteredProducts.length} références distinctes
                </span>
              </div>

              {/* Total Stock Cost Value (Achat) */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-[10px] font-bold text-neutral-500 uppercase block">Valeur Achat (Coût)</span>
                <span className="text-lg font-black text-neutral-900 font-mono-nums block mt-0.5">
                  ${totalCostValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono-nums">
                  ≈ {Math.round(totalCostValueUSD * rate).toLocaleString('fr-FR')} FC
                </span>
              </div>

              {/* Total Stock Sales Value (Vente) */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Valeur Marchande (Vente)</span>
                <span className="text-lg font-black text-emerald-900 font-mono-nums block mt-0.5">
                  ${totalSalesValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-700 font-mono-nums">
                  ≈ {Math.round(totalSalesValueUSD * rate).toLocaleString('fr-FR')} FC
                </span>
              </div>

              {/* Potential Margin / Alerts */}
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-900 uppercase block">Marge Brute Potentielle</span>
                <span className="text-lg font-black text-amber-950 font-mono-nums block mt-0.5">
                  +${potentialProfitUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-amber-800 font-semibold font-mono-nums">
                  {potentialMarginPercent.toFixed(1)}% de marge prévisionnelle
                </span>
              </div>
            </div>

            {/* Inventory Items Table */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-neutral-900 text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Réf. Code</th>
                    <th className="py-2.5 px-3">Désignation de l'Article</th>
                    <th className="py-2.5 px-3">Catégorie</th>
                    <th className="py-2.5 px-3 text-center">Unité</th>
                    <th className="py-2.5 px-3 text-right">Stock</th>
                    <th className="py-2.5 px-3 text-right">P.U Achat ($)</th>
                    <th className="py-2.5 px-3 text-right">P.U Vente ($)</th>
                    <th className="py-2.5 px-3 text-right">Total Achat ($)</th>
                    <th className="py-2.5 px-3 text-right">Total Vente ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-mono-nums text-[11px]">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-neutral-400 font-sans text-xs">
                        Aucun article ne correspond aux critères sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((item, idx) => {
                      const itemCostTotal = item.stockQty * (item.costPriceUSD || 0);
                      const itemSaleTotal = item.stockQty * (item.priceUSD || 0);
                      const isLow = item.stockQty > 0 && item.stockQty <= (item.minStockAlert || 5);
                      const isOut = item.stockQty === 0;

                      return (
                        <tr
                          key={item.id}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/70'}
                        >
                          {/* Code */}
                          <td className="py-2.5 px-3 font-bold text-neutral-900 whitespace-nowrap">
                            {item.code}
                          </td>

                          {/* Designation */}
                          <td className="py-2.5 px-3 font-sans font-medium text-neutral-900">
                            <div>
                              <span>{item.name}</span>
                              {isOut ? (
                                <span className="ml-1.5 text-[9px] px-1 py-0.2 bg-rose-100 text-rose-800 font-bold rounded uppercase">
                                  Rupture
                                </span>
                              ) : isLow ? (
                                <span className="ml-1.5 text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 font-bold rounded uppercase">
                                  Alerte Stock
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3 font-sans text-neutral-600">
                            {item.category || 'Général'}
                          </td>

                          {/* Unit */}
                          <td className="py-2.5 px-3 text-center font-sans text-neutral-500 text-[10px]">
                            {item.unit}
                          </td>

                          {/* Qty in Stock */}
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              isOut
                                ? 'text-rose-600 font-black'
                                : isLow
                                ? 'text-amber-700 font-black'
                                : 'text-neutral-900'
                            }`}
                          >
                            {item.stockQty}
                          </td>

                          {/* Cost Price */}
                          <td className="py-2.5 px-3 text-right text-neutral-600">
                            ${(item.costPriceUSD || 0).toFixed(2)}
                          </td>

                          {/* Selling Price */}
                          <td className="py-2.5 px-3 text-right font-semibold text-neutral-900">
                            ${item.priceUSD.toFixed(2)}
                          </td>

                          {/* Line Total Cost */}
                          <td className="py-2.5 px-3 text-right text-neutral-700">
                            ${itemCostTotal.toFixed(2)}
                          </td>

                          {/* Line Total Selling */}
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                            ${itemSaleTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-neutral-100 border-t-2 border-neutral-900 font-mono-nums text-xs font-bold">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 uppercase font-sans text-neutral-900">
                      Totaux Généraux ({filteredProducts.length} articles) :
                    </td>
                    <td className="py-3 px-3 text-right text-neutral-950">
                      {totalStockUnits}
                    </td>
                    <td colSpan={2}></td>
                    <td className="py-3 px-3 text-right text-neutral-950">
                      ${totalCostValueUSD.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-900 font-black">
                      ${totalSalesValueUSD.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Out of Stock & Replenishment Needs notice */}
            {(lowStockCount > 0 || outOfStockCount > 0) && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    Points de vigilance sur l'approvisionnement :
                  </span>
                  <span className="text-[11px] text-amber-800">
                    {outOfStockCount > 0 && `${outOfStockCount} article(s) en rupture totale. `}
                    {lowStockCount > 0 && `${lowStockCount} article(s) ont franchi leur seuil critique de sécurité et nécessitent une commande fournisseur.`}
                  </span>
                </div>
              </div>
            )}

            {/* Validation & Signatures Block */}
            <div className="pt-6 border-t border-neutral-300 grid grid-cols-2 gap-8 text-xs font-sans">
              <div className="border border-neutral-200 rounded-xl p-4 min-h-[110px] flex flex-col justify-between">
                <div>
                  <span className="font-bold text-neutral-900 block uppercase text-[10px] tracking-wider">
                    Le Responsable du Stock / Magasinier
                  </span>
                  <span className="text-[10px] text-neutral-500">Visa de vérification physique des casiers</span>
                </div>
                <div className="border-b border-dashed border-neutral-300 pt-8"></div>
              </div>

              <div className="border border-neutral-200 rounded-xl p-4 min-h-[110px] flex flex-col justify-between">
                <div>
                  <span className="font-bold text-neutral-900 block uppercase text-[10px] tracking-wider">
                    La Direction Générale / Gérance
                  </span>
                  <span className="text-[10px] text-neutral-500">Approbation & Valorisation comptable</span>
                </div>
                <div className="border-b border-dashed border-neutral-300 pt-8"></div>
              </div>
            </div>

            {/* Bottom print timestamp footer */}
            <div className="text-center pt-2 text-[10px] text-neutral-400 font-mono-nums border-t border-neutral-100">
              Document généré par {settings.name} le {formatDateTime(new Date().toISOString())} · Logiciel de Gestion Commerciale RDC
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
