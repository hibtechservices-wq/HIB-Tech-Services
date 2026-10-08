import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductOrService, ItemType, FiscalTaxGroup } from '../../types';
import { Package, Wrench, X, Check, DollarSign, ShieldCheck } from 'lucide-react';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: ProductOrService | null;
  defaultType?: ItemType;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  itemToEdit,
  defaultType = 'PRODUCT',
}) => {
  const { addProductOrService, updateProductOrService, settings } = useApp();
  const rate = settings.exchangeRateUSD_CDF || 2850;

  const [type, setType] = useState<ItemType>(defaultType);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Matériel & Ventes');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('Pièce');
  const [priceUSD, setPriceUSD] = useState<number>(0);
  const [costPriceUSD, setCostPriceUSD] = useState<number>(0);
  const [stockQty, setStockQty] = useState<number>(10);
  const [minStockAlert, setMinStockAlert] = useState<number>(3);
  const [taxGroup, setTaxGroup] = useState<FiscalTaxGroup>('A');

  useEffect(() => {
    if (itemToEdit) {
      setType(itemToEdit.type);
      setName(itemToEdit.name);
      setCode(itemToEdit.code);
      setBarcode(itemToEdit.barcode || '');
      setCategory(itemToEdit.category);
      setDescription(itemToEdit.description || '');
      setUnit(itemToEdit.unit);
      setPriceUSD(itemToEdit.priceUSD);
      setCostPriceUSD(itemToEdit.costPriceUSD);
      setStockQty(itemToEdit.stockQty);
      setMinStockAlert(itemToEdit.minStockAlert);
      setTaxGroup(itemToEdit.taxGroup || 'A');
    } else {
      setType(defaultType);
      setName('');
      setCode(`ART-${Date.now().toString().slice(-4)}`);
      setBarcode('');
      setCategory(defaultType === 'PRODUCT' ? 'Informatique & Électronique' : 'Support & Maintenance');
      setDescription('');
      setUnit(defaultType === 'PRODUCT' ? 'Pièce' : 'Forfait');
      setPriceUSD(50);
      setCostPriceUSD(35);
      setStockQty(10);
      setMinStockAlert(3);
      setTaxGroup('A');
    }
  }, [itemToEdit, defaultType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (itemToEdit) {
      updateProductOrService(itemToEdit.id, {
        name,
        code,
        barcode: barcode.trim() || undefined,
        type,
        category,
        description: description.trim() || undefined,
        unit,
        priceUSD,
        costPriceUSD,
        stockQty: type === 'PRODUCT' ? stockQty : 0,
        minStockAlert: type === 'PRODUCT' ? minStockAlert : 0,
        taxGroup,
      });
    } else {
      addProductOrService({
        name,
        code,
        barcode: barcode.trim() || undefined,
        type,
        category,
        description: description.trim() || undefined,
        unit,
        priceUSD,
        costPriceUSD,
        stockQty: type === 'PRODUCT' ? stockQty : 0,
        minStockAlert: type === 'PRODUCT' ? minStockAlert : 0,
        taxGroup,
        isActive: true,
      });
    }

    onClose();
  };

  const productUnits = ['Pièce', 'Carton', 'Lot', 'Bobine', 'Mètre', 'Pack', 'Boîte', 'Unité', 'Kg'];
  const serviceUnits = ['Forfait', 'Heure', 'Jour / Homme', 'Mois', 'Point réseau', 'Machine', 'Projet', 'Séance'];

  const productCategories = [
    'Informatique & Ordinateurs',
    'Énergie & Onduleurs',
    'Réseaux & Télécoms',
    'Matériel de Bureau',
    'Sécurité Électronique',
    'Fournitures de Bureau',
    'Quincaillerie & Électrique',
    'Téléphonie & Accessoires',
    'Autre Produit',
  ];

  const serviceCategories = [
    'Prestations Réseau',
    'Sécurité Électronique',
    'Support & Maintenance',
    'Conseil & Audit',
    'Développement & Logiciels',
    'Installation & Câblage',
    'Nettoyage & Entretien',
    'Autre Prestation',
  ];

  const marginUSD = priceUSD - costPriceUSD;
  const marginPercent = priceUSD > 0 ? Math.round((marginUSD / priceUSD) * 100) : 0;
  const priceCDF = Math.round(priceUSD * rate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-neutral-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 text-amber-400 flex items-center justify-center">
              {type === 'PRODUCT' ? <Package className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">
                {itemToEdit
                  ? `Modifier ${type === 'PRODUCT' ? "l'Article" : 'la Prestation'}`
                  : `Ajouter ${type === 'PRODUCT' ? 'un Produit en Vente' : 'une Prestation de Service'}`}
              </h3>
              <p className="text-xs text-neutral-500">
                {type === 'PRODUCT' ? 'Gestion des stocks et prix de vente' : 'Tarification forfaitaire, horaire ou par projet'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Nature de l'Élément
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('PRODUCT');
                  setUnit('Pièce');
                  setCategory(productCategories[0]);
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                  type === 'PRODUCT'
                    ? 'border-amber-600 bg-amber-50 text-neutral-900 font-semibold ring-1 ring-amber-600'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <Package className="w-4 h-4 text-amber-600" />
                <span>Produit Physique (Avec Stock)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('SERVICE');
                  setUnit('Forfait');
                  setCategory(serviceCategories[0]);
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                  type === 'SERVICE'
                    ? 'border-amber-600 bg-amber-50 text-neutral-900 font-semibold ring-1 ring-amber-600'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>Prestation de Service (Sans Stock)</span>
              </button>
            </div>
          </div>

          {/* Name, Reference & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Désignation {type === 'PRODUCT' ? 'du Produit' : 'du Service'} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === 'PRODUCT' ? 'Ex: Onduleur APC 1100VA' : 'Ex: Installation caméras surveillance'}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Code / Réf SKU *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: APC-1100"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900 focus:bg-white font-mono-nums"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Code-barres EAN
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Ex: 6941234567891"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900 focus:bg-white font-mono-nums"
              />
            </div>
          </div>

          {/* Category, Unit & DGI Fiscal Tax Group */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:bg-white"
              >
                {(type === 'PRODUCT' ? productCategories : serviceCategories).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Unité de Facturation
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:bg-white"
              >
                {(type === 'PRODUCT' ? productUnits : serviceUnits).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Groupe Fiscal DGI (TVA)
              </label>
              <select
                value={taxGroup}
                onChange={(e) => setTaxGroup(e.target.value as FiscalTaxGroup)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:bg-white font-semibold"
              >
                <option value="A">Groupe A (16% TVA Standard)</option>
                <option value="B">Groupe B (0% Taux Réduit)</option>
                <option value="C">Groupe C (Exonéré DGI)</option>
                <option value="D">Groupe D (Hors champ TVA)</option>
              </select>
            </div>
          </div>

          {/* Prices & Profit Margin */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Prix de Vente Hors Taxe ($ USD) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={priceUSD}
                    onChange={(e) => setPriceUSD(Number(e.target.value))}
                    className="w-full font-mono-nums font-bold text-base bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                    required
                  />
                  <DollarSign className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] font-mono-nums text-neutral-500 mt-1 block">
                  ≈ {priceCDF.toLocaleString('fr-FR')} FC (Taux 1$={rate} FC)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Coût de Revient / Achat ($ USD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={costPriceUSD}
                    onChange={(e) => setCostPriceUSD(Number(e.target.value))}
                    className="w-full font-mono-nums bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                  <DollarSign className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] font-mono-nums text-emerald-700 font-medium mt-1 block">
                  Marge brute : +${marginUSD.toFixed(2)} ({marginPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Stock fields (Only for Products) */}
          {type === 'PRODUCT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Quantité en Stock Actuel
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockQty}
                  onChange={(e) => setStockQty(Number(e.target.value))}
                  className="w-full font-mono-nums bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Seuil d'Alerte Rupture Stock
                </label>
                <input
                  type="number"
                  min="1"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(Number(e.target.value))}
                  className="w-full font-mono-nums bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Description / Spécifications techniques
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Garantie 1 an, livré avec accessoires, compatible tous réseaux..."
              className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2 text-xs text-neutral-900 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-2 shadow-xs font-bold"
            >
              <Check className="w-4 h-4 text-amber-400" />
              <span>{itemToEdit ? 'Mettre à jour' : 'Enregistrer dans le Catalogue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
