import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Client } from '../../types';
import { formatDate, formatDateTime, formatDualCurrency } from '../../utils/formatters';
import { downloadElementAsPDF } from '../../utils/pdfGenerator';
import { Printer, Download, Filter, Users, X, AlertTriangle, Loader2 } from 'lucide-react';

interface ClientsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClientsReportModal: React.FC<ClientsReportModalProps> = ({ isOpen, onClose }) => {
  const { clients, settings } = useApp();
  const rate = settings.exchangeRateUSD_CDF || 2850;

  const [filterType, setFilterType] = useState<string>('ALL');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (filterType === 'DEBTORS') return c.outstandingDebtUSD > 0;
      if (filterType === 'COMPANIES') return c.type === 'COMPANY';
      if (filterType === 'INDIVIDUALS') return c.type === 'INDIVIDUAL';
      return true;
    });
  }, [clients, filterType]);

  const summary = useMemo(() => {
    let totalDebtUSD = 0;
    let totalSpentUSD = 0;
    let debtorsCount = 0;

    clients.forEach((c) => {
      totalDebtUSD += c.outstandingDebtUSD;
      totalSpentUSD += c.totalSpentUSD;
      if (c.outstandingDebtUSD > 0) debtorsCount++;
    });

    return {
      totalClients: clients.length,
      debtorsCount,
      totalDebtUSD,
      totalSpentUSD,
    };
  }, [clients]);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const filename = `Releve_Comptes_Clients_${new Date().toISOString().slice(0, 10)}.pdf`;
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
        {/* Modal Header */}
        <div className="print:hidden p-4 border-b border-neutral-200 bg-neutral-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-800 text-amber-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">État & Relevé des Comptes Clients (PDF)</h2>
              <p className="text-xs text-neutral-400">Relevé des créances clients, coordonnées et historique d'achats</p>
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
        <div className="print:hidden p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-700">Filtrer l'état :</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-800 font-medium"
            >
              <option value="ALL">Tous les clients ({clients.length})</option>
              <option value="DEBTORS">Clients avec Créances / Soldes dus ({summary.debtorsCount})</option>
              <option value="COMPANIES">Entreprises / Sociétés</option>
              <option value="INDIVIDUALS">Particuliers</option>
            </select>
          </div>
          <span className="text-neutral-500">{filteredClients.length} client(s) affiché(s)</span>
        </div>

        {/* PDF Print Content */}
        <div ref={printAreaRef} className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-neutral-900 print:p-0">
          <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-6 mb-6">
            <div>
              <h1 className="text-xl font-black text-neutral-950 uppercase tracking-tight">{settings.name}</h1>
              <p className="text-xs text-neutral-600 font-medium">{settings.slogan}</p>
              <p className="text-xs text-neutral-600 mt-1">{settings.address}, {settings.city} - RDC</p>
              <p className="text-xs text-neutral-600">Tél: {settings.phone1} | Email: {settings.email}</p>
              <div className="text-[11px] text-neutral-500 font-mono mt-1">
                NIF: {settings.nif} | RCCM: {settings.rccm}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-neutral-900 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2">
                RELEVÉ DES CRÉANCES & CLIENTS
              </div>
              <p className="text-xs text-neutral-500">Date d'édition : {formatDateTime(new Date().toISOString())}</p>
              <p className="text-xs font-semibold text-neutral-800 mt-1">Taux : 1 USD = {rate.toLocaleString('fr-FR')} CDF</p>
            </div>
          </div>

          {/* Metric Boxes */}
          <div className="grid grid-cols-4 gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl mb-6 text-center text-xs">
            <div>
              <p className="text-neutral-500">Clients Enregistrés</p>
              <p className="text-base font-bold text-neutral-900">{summary.totalClients}</p>
            </div>
            <div>
              <p className="text-neutral-500">Comptes Débiteurs</p>
              <p className="text-base font-bold text-rose-700">{summary.debtorsCount}</p>
            </div>
            <div>
              <p className="text-neutral-500">Volume Total Acheté</p>
              <p className="text-base font-bold text-neutral-900">${summary.totalSpentUSD.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Total Créances Globales</p>
              <p className="text-base font-bold text-rose-700">${summary.totalDebtUSD.toFixed(2)}</p>
              <p className="text-[10px] text-neutral-400">({(summary.totalDebtUSD * rate).toLocaleString('fr-FR')} FC)</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-300 bg-neutral-100 text-neutral-700 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Nom & Société</th>
                <th className="py-2.5 px-3">Téléphone & WhatsApp</th>
                <th className="py-2.5 px-3">Ville / Commune</th>
                <th className="py-2.5 px-3 text-right">Volume Achat</th>
                <th className="py-2.5 px-3 text-right">Créance Dûe (USD)</th>
                <th className="py-2.5 px-3 text-right">Créance Dûe (CDF)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredClients.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="py-2 px-3">
                    <p className="font-bold text-neutral-900">{c.name}</p>
                    {c.companyName && <p className="text-[11px] text-neutral-500">{c.companyName}</p>}
                  </td>
                  <td className="py-2 px-3 text-neutral-700 font-mono text-[11px]">{c.phone}</td>
                  <td className="py-2 px-3 text-neutral-600">
                    {c.city} {c.commune ? `(${c.commune})` : ''}
                  </td>
                  <td className="py-2 px-3 text-right text-neutral-800">${c.totalSpentUSD.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-bold text-rose-700">
                    {c.outstandingDebtUSD > 0 ? `$${c.outstandingDebtUSD.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-2 px-3 text-right text-neutral-500 font-mono text-[11px]">
                    {c.outstandingDebtUSD > 0 ? `${(c.outstandingDebtUSD * rate).toLocaleString('fr-FR')} FC` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 pt-4 border-t border-neutral-200 flex justify-between text-[11px] text-neutral-500">
            <span>Rapport certifié édité par le module CRM de {settings.name}</span>
            <span>Document confidentiel</span>
          </div>
        </div>
      </div>
    </div>
  );
};
