import React, { useState, useRef } from 'react';
import {
  parseExcelOrCSVFile,
  downloadExcelTemplate,
  mapRowsToProducts,
  mapRowsToClients,
  mapRowsToExpenses,
  mapRowsToEquipments,
} from '../../utils/excelUtils';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileCheck,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

export type ImportModuleType = 'PRODUCTS' | 'CLIENTS' | 'EXPENSES' | 'EQUIPMENTS';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleType: ImportModuleType;
  title: string;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  moduleType,
  title,
}) => {
  const {
    addProductOrService,
    addClient,
    addExpense,
    addEquipment,
    settings,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [importedCount, setImportedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsLoading(true);
    setErrorMessage('');
    setImportStatus('IDLE');

    try {
      const rawRows = await parseExcelOrCSVFile(file);
      if (!rawRows || rawRows.length === 0) {
        setErrorMessage('Le fichier importé est vide ou ne contient aucune ligne de données.');
        setIsLoading(false);
        return;
      }

      setParsedRows(rawRows);

      // Convert rows depending on module type
      let converted: any[] = [];
      if (moduleType === 'PRODUCTS') {
        converted = mapRowsToProducts(rawRows);
      } else if (moduleType === 'CLIENTS') {
        converted = mapRowsToClients(rawRows);
      } else if (moduleType === 'EXPENSES') {
        converted = mapRowsToExpenses(rawRows, settings.exchangeRateUSD_CDF || 2850);
      } else if (moduleType === 'EQUIPMENTS') {
        converted = mapRowsToEquipments(rawRows);
      }

      setPreviewItems(converted);
      setIsLoading(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Erreur lors de la lecture du fichier Excel/CSV : " + (err.message || 'Format invalide.'));
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleCommitImport = () => {
    if (!previewItems.length) return;

    try {
      let count = 0;
      if (moduleType === 'PRODUCTS') {
        previewItems.forEach((item) => {
          addProductOrService(item);
          count++;
        });
      } else if (moduleType === 'CLIENTS') {
        previewItems.forEach((item) => {
          addClient(item);
          count++;
        });
      } else if (moduleType === 'EXPENSES') {
        previewItems.forEach((item) => {
          addExpense(item);
          count++;
        });
      } else if (moduleType === 'EQUIPMENTS') {
        previewItems.forEach((item) => {
          addEquipment(item);
          count++;
        });
      }

      setImportedCount(count);
      setImportStatus('SUCCESS');
      setTimeout(() => {
        onClose();
        resetModal();
      }, 1800);
    } catch (err: any) {
      setErrorMessage("Erreur lors de l'enregistrement des données : " + err.message);
      setImportStatus('ERROR');
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setPreviewItems([]);
    setImportStatus('IDLE');
    setErrorMessage('');
    setImportedCount(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">{title}</h2>
              <p className="text-xs text-neutral-500">
                Importation directe de fichiers Excel (.xlsx, .xls) ou CSV avec détection automatique
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetModal();
              onClose();
            }}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Template Download Banner */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100/70 text-emerald-800 rounded-lg shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Télécharger le modèle Excel officiel (.xlsx)</h4>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Utilisez notre canevas préformaté avec colonnes et exemples pour un import parfait sans erreur.
                </p>
              </div>
            </div>
            <button
              onClick={() => downloadExcelTemplate(moduleType)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Modèle .XLSX</span>
            </button>
          </div>

          {/* Drag & Drop Upload Zone */}
          {!selectedFile && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 hover:border-emerald-500 bg-neutral-50/50 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-neutral-100 group-hover:bg-emerald-100 text-neutral-500 group-hover:text-emerald-700 flex items-center justify-center mx-auto mb-3 transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-neutral-800">
                Cliquez pour choisir un fichier ou glissez-déposez ici
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Formats acceptés : Microsoft Excel (.xlsx, .xls) ou Valeurs séparées par virgule (.csv)
              </p>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-neutral-600">Lecture et analyse des lignes Excel en cours...</p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-bold">Erreur de traitement</p>
                <p className="text-[11px] mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {importStatus === 'SUCCESS' && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold">Importation réussie avec succès !</h3>
              <p className="text-xs text-emerald-700">
                {importedCount} élément(s) ont été ajoutés instantanément à votre base de données.
              </p>
            </div>
          )}

          {/* Preview Table */}
          {selectedFile && !isLoading && previewItems.length > 0 && importStatus !== 'SUCCESS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-neutral-800">
                    Fichier : {selectedFile.name} ({previewItems.length} ligne(s) détectée(s))
                  </span>
                </div>
                <button
                  onClick={resetModal}
                  className="text-xs text-neutral-500 hover:text-neutral-800 underline"
                >
                  Changer de fichier
                </button>
              </div>

              <div className="border border-neutral-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto text-xs bg-white">
                <table className="w-full text-left">
                  <thead className="bg-neutral-100 text-neutral-600 uppercase font-semibold text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Désignation / Nom</th>
                      <th className="py-2 px-3">Type / Catégorie</th>
                      <th className="py-2 px-3">Détail clé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {previewItems.slice(0, 10).map((item, i) => (
                      <tr key={i} className="hover:bg-neutral-50/50">
                        <td className="py-2 px-3 font-mono text-neutral-400">{i + 1}</td>
                        <td className="py-2 px-3 font-medium text-neutral-900">{item.name || item.description || item.clientName}</td>
                        <td className="py-2 px-3 text-neutral-600">{item.type || item.category || 'Standard'}</td>
                        <td className="py-2 px-3 text-neutral-600">
                          {item.sellingPriceUSD !== undefined
                            ? `$${item.sellingPriceUSD} (Stock: ${item.stockQty ?? 0})`
                            : item.phone
                            ? item.phone
                            : item.amountUSD
                            ? `$${item.amountUSD}`
                            : item.serialNumber || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewItems.length > 10 && (
                  <div className="p-2 text-center text-[11px] text-neutral-400 bg-neutral-50 border-t border-neutral-100">
                    + {previewItems.length - 10} autre(s) ligne(s) prête(s) à être importée(s)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
            <span>Les doublons ou références identiques seront ajoutés sans écraser les données existantes.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetModal();
                onClose();
              }}
              className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Annuler
            </button>

            {selectedFile && previewItems.length > 0 && importStatus !== 'SUCCESS' && (
              <button
                onClick={handleCommitImport}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Confirmer l'Import ({previewItems.length} lignes)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
