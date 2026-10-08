import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate, formatDateTime, getPaymentMethodLabel, getStatusBadge } from '../../utils/formatters';
import { downloadElementAsPDF } from '../../utils/pdfGenerator';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  X,
  FileText,
  Receipt,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Download,
  Loader2,
  Stamp,
  PenTool,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

export const InvoicePrintModal: React.FC = () => {
  const { activePrintSale, setActivePrintSale, settings, setActiveWhatsAppClient, clients } = useApp();
  const [printFormat, setPrintFormat] = useState<'A4' | 'THERMAL'>('A4');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Document visa & branding options
  const [includeSignature, setIncludeSignature] = useState<boolean>(settings.includeSignatureOnInvoicesByDefault !== false);
  const [includeStamp, setIncludeStamp] = useState<boolean>(settings.includeStampOnInvoicesByDefault !== false);
  const [includeLogo, setIncludeLogo] = useState<boolean>(settings.showLogoOnInvoices !== false);
  const [showPdfOptionsDialog, setShowPdfOptionsDialog] = useState<boolean>(false);

  if (!activePrintSale) return null;

  const sale = activePrintSale;
  const client = clients.find(c => c.id === sale.clientId) || {
    id: sale.clientId,
    name: sale.clientName,
    phone: sale.clientPhone,
    address: sale.clientAddress,
    type: 'INDIVIDUAL' as const,
    totalSpentUSD: 0,
    outstandingDebtUSD: 0,
    city: 'Kinshasa',
    createdAt: '',
  };

  const handlePrint = () => {
    window.print();
  };

  const executeDownloadPDF = async () => {
    setShowPdfOptionsDialog(false);
    if (!printContainerRef.current) return;
    setIsGeneratingPDF(true);
    // Give React 60ms to commit DOM changes if toggles were adjusted
    await new Promise((r) => setTimeout(r, 60));
    try {
      const filename = `${sale.type === 'QUOTE_PROFORMA' ? 'Devis' : 'Facture'}_${sale.saleNumber}_${sale.clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      await downloadElementAsPDF(printContainerRef.current, filename, {
        format: printFormat === 'A4' ? 'a4' : [80, 297],
        orientation: 'portrait',
        margin: printFormat === 'A4' ? 6 : 2,
        fitToSinglePage: printFormat === 'A4', // Guarantees 20+ items fit 100% on 1 single page!
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = () => {
    if (printFormat === 'A4') {
      setShowPdfOptionsDialog(true);
    } else {
      executeDownloadPDF();
    }
  };

  const isQuote = sale.type === 'QUOTE_PROFORMA';
  const isReceipt = sale.type === 'RECEIPT';
  const paymentInfo = getPaymentMethodLabel(sale.paymentMethod);
  const statusBadge = getStatusBadge(sale.paymentStatus);
  const rate = sale.exchangeRate || settings.exchangeRateUSD_CDF || 2850;

  // Dynamic density calculation to fit 20+ items seamlessly on 1 page
  const itemCount = sale.items.length;
  const isCompact = itemCount >= 7;
  const isUltraCompact = itemCount >= 14;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-neutral-200 overflow-hidden my-auto flex flex-col max-h-[96vh]">
        {/* Top bar (Hidden during print) */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-b border-neutral-200 bg-neutral-900 text-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-sm">
                {isQuote ? 'Devis Proforma' : 'Facture'} : <span className="font-mono-nums text-amber-400">{sale.saleNumber}</span>
              </span>
            </div>
            {/* 1-Page Guarantee Badge */}
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded font-medium">
              📄 1 Page Garantie ({itemCount} articles)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick toggles for Visa (Signature & Sceau) */}
            {printFormat === 'A4' && (
              <div className="hidden lg:flex items-center gap-1 bg-neutral-800 p-0.5 rounded-lg border border-neutral-700 text-xs">
                <button
                  type="button"
                  onClick={() => setIncludeSignature(!includeSignature)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    includeSignature ? 'bg-blue-900/80 text-blue-200 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Activer ou désactiver la signature sur le visa Congo Tech"
                >
                  <PenTool className="w-3 h-3" />
                  <span>Signature: {includeSignature ? 'OUI' : 'NON'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIncludeStamp(!includeStamp)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    includeStamp ? 'bg-emerald-900/80 text-emerald-200 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Activer ou désactiver le sceau officiel sur le visa Congo Tech"
                >
                  <Stamp className="w-3 h-3" />
                  <span>Sceau: {includeStamp ? 'OUI' : 'NON'}</span>
                </button>
              </div>
            )}

            {/* Format selector */}
            <div className="flex items-center bg-neutral-800 p-0.5 rounded-lg border border-neutral-700 text-xs">
              <button
                onClick={() => setPrintFormat('A4')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  printFormat === 'A4' ? 'bg-neutral-950 text-amber-400 shadow-xs' : 'text-neutral-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Format A4</span>
              </button>
              <button
                onClick={() => setPrintFormat('THERMAL')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  printFormat === 'THERMAL' ? 'bg-neutral-950 text-amber-400 shadow-xs' : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Ticket (80mm)</span>
              </button>
            </div>

            <button
              onClick={() => {
                setActiveWhatsAppClient({ client, sale });
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              title="Envoyer la facture via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Direct PDF Download Button with confirmation dialog */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 font-bold shadow-xs"
              title="Télécharger directement le fichier PDF sur votre appareil"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-200" />
              )}
              <span>{isGeneratingPDF ? 'Création PDF...' : 'Télécharger PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 font-bold shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>

            <button
              onClick={() => setActivePrintSale(null)}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Preview Container */}
        <div className="p-4 sm:p-8 overflow-auto bg-neutral-100 flex justify-center flex-1">
          {printFormat === 'A4' ? (
            /* ================= FORMAT A4 FACTURE ================= */
            <div
              ref={printContainerRef}
              className={`print-page bg-white w-[794px] min-w-[794px] ${isUltraCompact ? 'p-5 text-[11px]' : isCompact ? 'p-6 text-xs' : 'p-8 text-xs'} shadow-md rounded-lg border border-neutral-300/80 text-neutral-900 leading-normal shrink-0`}
            >
              
              {/* Entête Entreprise avec Logo si présent */}
              <div className={`border-b-2 border-neutral-900 ${isUltraCompact ? 'pb-2 mb-2' : isCompact ? 'pb-3 mb-3' : 'pb-4 mb-4'}`}>
                <div className="flex flex-row justify-between items-start gap-4">
                  <div className="flex items-start gap-3">
                    {includeLogo && settings.logoUrl && (
                      <div className="shrink-0 bg-white p-1 rounded border border-neutral-200 shadow-2xs">
                        <img
                          src={settings.logoUrl}
                          alt={settings.name}
                          className={`${isUltraCompact ? 'h-10 max-w-[80px]' : isCompact ? 'h-12 max-w-[100px]' : 'h-14 max-w-[120px]'} object-contain`}
                        />
                      </div>
                    )}
                    <div>
                      <h1 className={`${isUltraCompact ? 'text-lg font-extrabold' : isCompact ? 'text-xl font-bold' : 'text-xl sm:text-2xl font-bold'} tracking-tight text-neutral-900 uppercase`}>
                        {settings.name}
                      </h1>
                      <p className="text-xs text-neutral-600 font-medium mt-0.5">
                        {settings.slogan}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {settings.address}, {settings.city} · Tél: <span className="font-mono-nums">{settings.phone1}</span> {settings.phone2 ? `| ${settings.phone2}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Document Title & Reference */}
                  <div className="text-right w-auto shrink-0">
                    <div className={`inline-block ${isUltraCompact ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'} bg-neutral-900 text-amber-400 font-bold uppercase tracking-wider rounded`}>
                      {isQuote ? 'DEVIS PROFORMA' : isReceipt ? 'REÇU DE PAIEMENT' : 'FACTURE'}
                    </div>
                    <div className="mt-1 space-y-0.5 font-mono-nums text-xs">
                      <p className="font-bold text-sm text-neutral-900">{sale.saleNumber}</p>
                      {sale.dgiNfu && (
                        <p className="text-[11px] text-neutral-600 font-medium">
                          Réf. : <span className="font-bold text-neutral-900">{sale.dgiNfu}</span>
                        </p>
                      )}
                      <p className="text-neutral-500 text-[11px]">Date : {formatDateTime(sale.createdAt)}</p>
                      {sale.dueDate && (
                        <p className="text-rose-600 font-medium text-[11px]">Échéance : {formatDate(sale.dueDate)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cadres Identifiants Émetteur & Client */}
              <div className={`grid grid-cols-2 gap-3 ${isUltraCompact ? 'my-2 p-2.5 text-[10px]' : isCompact ? 'my-2.5 p-3 text-xs' : 'my-4 p-4 text-xs'} bg-neutral-50 rounded-lg border border-neutral-200`}>
                {/* Émetteur Fiscale */}
                <div className="space-y-0.5">
                  <span className="font-bold text-neutral-800 uppercase tracking-wider block text-[9px] pb-0.5 border-b border-neutral-200">
                    Identifiants de l'Émetteur
                  </span>
                  <p><span className="text-neutral-500">NIF :</span> <span className="font-mono-nums font-bold text-neutral-900">{settings.nif || 'NIF-NON-DEFINI'}</span> | <span className="text-neutral-500">RCCM :</span> <span className="font-mono-nums font-semibold">{settings.rccm}</span></p>
                  <p><span className="text-neutral-500">Id. Nat :</span> <span className="font-mono-nums font-semibold">{settings.idNat}</span> | <span className="text-neutral-500">Régime :</span> <span className="font-medium text-neutral-800">{settings.dgiRegime || 'Régime Général'}</span></p>
                  {sale.dgiTerminalId && <p><span className="text-neutral-500">N° Terminal :</span> <span className="font-mono-nums font-semibold text-neutral-700">{sale.dgiTerminalId}</span></p>}
                </div>

                {/* Client Box */}
                <div className="space-y-0.5 border-l border-neutral-300 pl-3">
                  <span className="font-bold text-neutral-800 uppercase tracking-wider block text-[9px] pb-0.5 border-b border-neutral-200">
                    Facturé au Client (Acheteur)
                  </span>
                  <p className="font-bold text-neutral-900 text-xs">{sale.clientName}</p>
                  <p><span className="text-neutral-500">NIF / ID :</span> <span className="font-mono-nums font-semibold text-neutral-900">{sale.clientNif || client.nif || client.rccmOrNif || 'Consommateur final'}</span> {sale.clientPhone ? `· Tél: ${sale.clientPhone}` : ''}</p>
                  {sale.clientAddress && <p className="text-neutral-600 truncate"><span className="text-neutral-500">Adresse :</span> {sale.clientAddress}</p>}
                </div>
              </div>

              {/* Tableau des Articles & Prestations */}
              <div className={`overflow-x-auto ${isUltraCompact ? 'my-1.5' : isCompact ? 'my-2.5' : 'my-4'}`}>
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className={`border-b-2 border-neutral-800 bg-neutral-100 text-neutral-800 uppercase font-semibold ${isUltraCompact ? 'text-[9px]' : 'text-[10px]'}`}>
                      <th className={`${isUltraCompact ? 'py-1 px-2' : isCompact ? 'py-1.5 px-2.5' : 'py-2.5 px-3'}`}>Réf / Désignation</th>
                      <th className={`${isUltraCompact ? 'py-1 px-1.5' : isCompact ? 'py-1.5 px-2' : 'py-2.5 px-2'} text-center`}>Gr. TVA</th>
                      <th className={`${isUltraCompact ? 'py-1 px-2' : isCompact ? 'py-1.5 px-2.5' : 'py-2.5 px-3'} text-right`}>Qté</th>
                      <th className={`${isUltraCompact ? 'py-1 px-2' : isCompact ? 'py-1.5 px-2.5' : 'py-2.5 px-3'} text-right`}>Prix Unit. HT ($)</th>
                      <th className={`${isUltraCompact ? 'py-1 px-2' : isCompact ? 'py-1.5 px-2.5' : 'py-2.5 px-3'} text-right`}>Total HT ($)</th>
                      <th className={`${isUltraCompact ? 'py-1 px-2' : isCompact ? 'py-1.5 px-2.5' : 'py-2.5 px-3'} text-right`}>
                        {sale.taxPercent > 0 ? `TVA ${sale.taxPercent}% ($)` : 'TVA ($)'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-mono-nums">
                    {sale.items.map((item, idx) => {
                      const itemTaxAmount = item.taxGroup === 'A' && sale.taxPercent > 0 ? (item.subtotalUSD * 0.16) : 0;
                      return (
                        <tr key={idx} className="hover:bg-neutral-50/50">
                          <td className={`${isUltraCompact ? 'py-0.5 px-2 text-[10px]' : isCompact ? 'py-1 px-2.5 text-[11px]' : 'py-2 px-3 text-xs'} font-sans`}>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-neutral-900 leading-tight">{item.name}</span>
                              {item.code && <span className="text-[9px] text-neutral-400 font-mono">({item.code})</span>}
                            </div>
                          </td>
                          <td className={`${isUltraCompact ? 'py-0.5 px-1.5 text-[9px]' : isCompact ? 'py-1 px-2 text-[10px]' : 'py-2 px-2 text-[11px]'} text-center`}>
                            <span className="font-semibold text-neutral-800 bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">
                              {item.taxGroup || 'A'}
                            </span>
                          </td>
                          <td className={`${isUltraCompact ? 'py-0.5 px-2 text-[10px]' : isCompact ? 'py-1 px-2.5 text-[11px]' : 'py-2 px-3 text-xs'} text-right font-medium`}>
                            {item.quantity} {item.unit}
                          </td>
                          <td className={`${isUltraCompact ? 'py-0.5 px-2 text-[10px]' : isCompact ? 'py-1 px-2.5 text-[11px]' : 'py-2 px-3 text-xs'} text-right`}>
                            ${item.unitPriceUSD.toFixed(2)}
                          </td>
                          <td className={`${isUltraCompact ? 'py-0.5 px-2 text-[10px]' : isCompact ? 'py-1 px-2.5 text-[11px]' : 'py-2 px-3 text-xs'} text-right font-semibold text-neutral-900`}>
                            ${item.subtotalUSD.toFixed(2)}
                          </td>
                          <td className={`${isUltraCompact ? 'py-0.5 px-2 text-[10px]' : isCompact ? 'py-1 px-2.5 text-[11px]' : 'py-2 px-3 text-xs'} text-right text-neutral-600`}>
                            ${itemTaxAmount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tableau de Ventilation Fiscale (Tableau des Taxes) */}
              <div className={`${isUltraCompact ? 'my-1.5 p-2 text-[10px]' : isCompact ? 'my-2 p-2.5 text-[11px]' : 'my-3 p-3 text-xs'} bg-neutral-50 rounded-lg border border-neutral-200`}>
                <span className="font-bold text-neutral-800 uppercase tracking-wider block text-[9px] mb-1">
                  Ventilation de la TVA
                </span>
                <table className="w-full text-[10px] font-mono-nums border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-300 text-neutral-600 uppercase text-[8px]">
                      <th className="text-left pb-0.5">Groupe</th>
                      <th className="text-right pb-0.5">Base HT ($)</th>
                      <th className="text-right pb-0.5">Taux</th>
                      <th className="text-right pb-0.5">Montant TVA ($)</th>
                      <th className="text-right pb-0.5">Total TTC ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="py-0.5 font-sans font-medium text-neutral-800">
                        {sale.taxPercent > 0 ? `Groupe A : Taux Standard TVA ${sale.taxPercent}%` : 'Vente Hors TVA / Non-assujetti (0%)'}
                      </td>
                      <td className="py-0.5 text-right">${(sale.dgiVatBreakdown?.groupA?.baseUSD || sale.subtotalUSD).toFixed(2)}</td>
                      <td className="py-0.5 text-right">{sale.taxPercent}%</td>
                      <td className="py-0.5 text-right font-semibold text-neutral-900">${sale.taxAmountUSD.toFixed(2)}</td>
                      <td className="py-0.5 text-right font-bold">${sale.totalUSD.toFixed(2)}</td>
                    </tr>
                    {sale.dgiVatBreakdown?.groupC?.baseUSD > 0 && (
                      <tr>
                        <td className="py-0.5 font-sans text-neutral-600">Groupe C : Exonéré</td>
                        <td className="py-0.5 text-right">${sale.dgiVatBreakdown.groupC.baseUSD.toFixed(2)}</td>
                        <td className="py-0.5 text-right">0%</td>
                        <td className="py-0.5 text-right">$0.00</td>
                        <td className="py-0.5 text-right">${sale.dgiVatBreakdown.groupC.baseUSD.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totaux & Dispositif d'Authentification / QR Code */}
              <div className={`grid grid-cols-12 gap-4 ${isUltraCompact ? 'pt-1.5' : 'pt-3'} border-t-2 border-neutral-900 items-start`}>
                {/* Bloc Sceau & QR Code (7 Cols) */}
                <div className={`col-span-7 flex gap-3 ${isUltraCompact ? 'p-2' : 'p-3'} bg-neutral-50 rounded-lg border border-neutral-200`}>
                  <div className="shrink-0 bg-white p-1.5 rounded border border-neutral-300 shadow-2xs">
                    <QRCodeSVG
                      value={sale.dgiQrPayload || `DOC-RDC|${sale.saleNumber}|${sale.totalUSD}|${sale.dgiSecurityCode}`}
                      size={isUltraCompact ? 64 : isCompact ? 76 : 92}
                      level="M"
                    />
                    <span className="block text-[7px] font-bold text-center mt-0.5 text-neutral-600 font-mono">
                      SCAN QR
                    </span>
                  </div>

                  <div className="space-y-0.5 text-[10px] font-mono-nums text-neutral-700">
                    <div className="flex items-center gap-1 text-emerald-800 font-sans font-bold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Sceau d'Authentification</span>
                    </div>
                    <p><span className="text-neutral-500 font-sans">Réf. :</span> <span className="font-bold text-neutral-900">{sale.dgiNfu || 'SFN-00000'}</span></p>
                    <p><span className="text-neutral-500 font-sans">CS :</span> <span className="font-bold text-neutral-900">{sale.dgiSecurityCode}</span></p>
                    <p><span className="text-neutral-500 font-sans">N° Trans :</span> <span className="font-bold text-emerald-800">{sale.dgiReceiptNumber || 'REC-2026-0049281'}</span></p>
                    <p><span className="text-neutral-500 font-sans">Compteur :</span> #{sale.dgiFiscalCounter || 1001}</p>
                    <p><span className="text-neutral-500 font-sans">Taux du jour :</span> 1$ = {rate} FC</p>
                  </div>
                </div>

                {/* Totaux Financiers (5 Cols) */}
                <div className={`col-span-5 ${isUltraCompact ? 'space-y-1 p-2 text-[11px]' : 'space-y-1.5 p-3 text-xs'} font-mono-nums bg-neutral-50 rounded-lg border border-neutral-200`}>
                  <div className="flex justify-between text-neutral-600">
                    <span>Total HT :</span>
                    <span>${sale.subtotalUSD.toFixed(2)}</span>
                  </div>

                  {sale.discountUSD > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Remise :</span>
                      <span>-${sale.discountUSD.toFixed(2)}</span>
                    </div>
                  )}

                  {sale.taxPercent > 0 ? (
                    <div className="flex justify-between text-neutral-700">
                      <span>TVA ({sale.taxPercent}%) :</span>
                      <span>+${sale.taxAmountUSD.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-neutral-500 text-[11px] italic">
                      <span>TVA :</span>
                      <span>0.00 $ (Non applicable / Exonéré)</span>
                    </div>
                  )}

                  <div className="border-t-2 border-neutral-900 pt-1 mt-1 flex justify-between font-bold text-sm text-neutral-900">
                    <span>TOTAL TTC ($) :</span>
                    <span>${sale.totalUSD.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between font-bold text-neutral-900 bg-amber-100/80 px-2 py-0.5 rounded text-xs">
                    <span>TOTAL (CDF) :</span>
                    <span>{new Intl.NumberFormat('fr-FR').format(sale.totalCDF)} FC</span>
                  </div>

                  <div className="border-t border-neutral-200 pt-1 text-[10px] space-y-0.5">
                    <div className="flex justify-between text-neutral-600">
                      <span>Payé :</span>
                      <span className="font-semibold text-emerald-700">${sale.amountPaidUSD.toFixed(2)}</span>
                    </div>
                    {sale.remainingDebtUSD > 0 && (
                      <div className="flex justify-between font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                        <span>SOLDE RESTANT :</span>
                        <span>${sale.remainingDebtUSD.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Règlement Mobile Money & Banques RDC */}
              <div className={`mt-2 ${isUltraCompact ? 'p-1.5 text-[9px]' : 'p-2.5 text-[10px]'} bg-neutral-50 rounded-lg border border-neutral-200`}>
                <span className="font-bold text-neutral-800 uppercase block mb-0.5 text-[9px]">
                  Paiements Directs Autorisés
                </span>
                <div className="grid grid-cols-2 gap-2 text-neutral-600">
                  <div>
                    {settings.mpesaNumber && <p>• <span className="font-semibold text-neutral-900">M-Pesa :</span> {settings.mpesaNumber} ({settings.mpesaName})</p>}
                    {settings.orangeMoneyNumber && <p>• <span className="font-semibold text-neutral-900">Orange Money :</span> {settings.orangeMoneyNumber}</p>}
                    {settings.airtelMoneyNumber && <p>• <span className="font-semibold text-neutral-900">Airtel Money :</span> {settings.airtelMoneyNumber}</p>}
                  </div>
                  <div>
                    {settings.bankDetails && <p>• <span className="font-semibold text-neutral-900">Banque :</span> {settings.bankDetails}</p>}
                  </div>
                </div>
              </div>

              {/* Signatures & Visa Entreprise */}
              <div className={`mt-2.5 ${isUltraCompact ? 'pt-1.5' : 'pt-2.5'} border-t border-neutral-200 grid grid-cols-2 text-center text-xs text-neutral-600 items-start`}>
                {/* Client / Réceptionnaire */}
                <div className="flex flex-col items-center">
                  <p className={`font-semibold text-neutral-800 ${isUltraCompact ? 'mb-2' : isCompact ? 'mb-3' : 'mb-6'}`}>
                    Visa du Client / Réceptionnaire
                  </p>
                  <div className={`${isUltraCompact ? 'h-10' : 'h-14'} flex items-end justify-center`}>
                    <p className="text-[9px] text-neutral-400">Date & Signature</p>
                  </div>
                </div>

                {/* Visa Entreprise (Pour Congo Tech / Entreprise) */}
                <div className="flex flex-col items-center relative">
                  <p className={`font-semibold text-neutral-800 ${isUltraCompact ? 'mb-1' : 'mb-1.5'}`}>
                    {settings.signatoryTitle || `Pour ${settings.name}`}
                  </p>

                  {/* Container for Stamp & Signature */}
                  <div className={`relative ${isUltraCompact ? 'h-14' : isCompact ? 'h-16' : 'h-20'} w-full flex items-center justify-center`}>
                    {/* Sceau / Cachet Officiel */}
                    {includeStamp && settings.stampUrl && (
                      <img
                        src={settings.stampUrl}
                        alt="Sceau officiel"
                        className={`absolute ${isUltraCompact ? 'w-14 h-14' : isCompact ? 'w-16 h-16' : 'w-20 h-20'} object-contain -rotate-6 pointer-events-none select-none`}
                        style={{ mixBlendMode: 'multiply' }}
                      />
                    )}

                    {/* Signature Autorisée */}
                    {includeSignature && settings.signatureUrl && (
                      <img
                        src={settings.signatureUrl}
                        alt="Signature autorisée"
                        className={`relative z-10 ${isUltraCompact ? 'h-10 max-w-[130px]' : isCompact ? 'h-12 max-w-[150px]' : 'h-14 max-w-[180px]'} object-contain pointer-events-none select-none`}
                      />
                    )}

                    {!includeStamp && !includeSignature && (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[9px] text-neutral-400 italic">
                          (Cachet & Signature Autorisée)
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[9px] text-neutral-500 font-medium mt-0.5">
                    {settings.signatoryName || 'Cachet & Signature Autorisée'}
                  </p>
                </div>
              </div>

              {/* Mentions de bas de page */}
              <div className={`mt-2 text-center ${isUltraCompact ? 'text-[8px] pt-1' : 'text-[9px] pt-1.5'} text-neutral-500 border-t border-neutral-100 leading-tight`}>
                {settings.invoiceFooterNotes || 'Merci pour votre confiance. Pour toute question ou assistance, veuillez contacter notre service client.'}
              </div>
            </div>
          ) : (
            /* ================= FORMAT TICKET DE CAISSE THERMIQUE 80MM ================= */
            <div ref={printContainerRef} className="print-page bg-white w-80 p-5 shadow-md rounded border border-neutral-300 font-mono text-[11px] leading-tight text-neutral-900">
              <div className="text-center pb-2.5 border-b border-dashed border-neutral-400">
                <p className="font-bold text-xs uppercase text-neutral-800">TICKET DE CAISSE</p>
                <p className="font-bold text-sm tracking-tight uppercase mt-1">{settings.name}</p>
                <p className="text-[10px]">{settings.address}, {settings.city}</p>
                <p className="text-[10px]">Tél : {settings.phone1}</p>
                {settings.nif && <p className="text-[10px] font-bold">NIF : {settings.nif} | RCCM : {settings.rccm}</p>}
              </div>

              <div className="py-2 border-b border-dashed border-neutral-400 text-[10px]">
                <div className="flex justify-between">
                  <span>FAC: {sale.saleNumber}</span>
                  <span>{formatDate(sale.createdAt)}</span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="font-bold">NFU: {sale.dgiNfu || 'SFN-00000'}</span>
                  <span>#{sale.dgiFiscalCounter || 1001}</span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span>Client: {sale.clientName.substring(0, 16)}</span>
                  <span>NIF: {sale.clientNif ? sale.clientNif.substring(0, 10) : 'NON-ASSUJ.'}</span>
                </div>
              </div>

              {/* Items */}
              <div className="py-2 border-b border-dashed border-neutral-400 space-y-1.5">
                {sale.items.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between font-semibold">
                      <span className="truncate pr-1">[Gr.{item.taxGroup}] {item.name}</span>
                      <span>${item.subtotalUSD.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-neutral-600 flex justify-between">
                      <span>{item.quantity} {item.unit} x ${item.unitPriceUSD.toFixed(2)}</span>
                      <span>{item.taxGroup === 'A' ? 'TVA 16%' : 'Exonéré'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totaux & Ventilation */}
              <div className="py-2 border-b border-dashed border-neutral-400 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>TOTAL HT :</span>
                  <span>${sale.subtotalUSD.toFixed(2)}</span>
                </div>
                {sale.taxAmountUSD > 0 && (
                  <div className="flex justify-between text-neutral-700">
                    <span>TVA RDC (16%) :</span>
                    <span>+${sale.taxAmountUSD.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-neutral-300">
                  <span>TOTAL TTC ($) :</span>
                  <span>${sale.totalUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>TOTAL TTC (CDF) :</span>
                  <span>{new Intl.NumberFormat('fr-FR').format(sale.totalCDF)} FC</span>
                </div>
                <div className="text-[10px] text-neutral-500">Taux BCC : 1$ = {rate} FC</div>
                <div className="flex justify-between pt-1 text-neutral-700">
                  <span>Payé ({paymentInfo.label}) :</span>
                  <span>${sale.amountPaidUSD.toFixed(2)}</span>
                </div>
                {sale.remainingDebtUSD > 0 && (
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>SOLDE DÛ :</span>
                    <span>${sale.remainingDebtUSD.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* QR Code & Digital Signature */}
              <div className="pt-2.5 pb-2 text-center flex flex-col items-center justify-center space-y-1 border-b border-dashed border-neutral-400">
                <QRCodeSVG
                  value={sale.dgiQrPayload || `DOC-RDC|${sale.saleNumber}|${sale.totalUSD}|${sale.dgiSecurityCode}`}
                  size={84}
                  level="M"
                />
                <span className="text-[9px] font-bold">CS: {sale.dgiSecurityCode}</span>
                <span className="text-[8px] text-emerald-700 font-bold">{sale.dgiReceiptNumber || 'REC-2026-0049281'}</span>
                <span className="text-[8px] text-neutral-500">CODE D'AUTHENTIFICATION</span>
              </div>

              <div className="pt-2 text-center text-[9px] text-neutral-600 space-y-0.5">
                <p className="font-semibold">*** MERCI POUR VOTRE ACHAT ***</p>
                <p>Conservez ce ticket pour tout échange ou réclamation.</p>
              </div>
            </div>
          )}
        </div>

        {/* PDF Export & Visa Options Dialog Box */}
        {showPdfOptionsDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">Génération du Document PDF</h3>
                    <p className="text-[11px] text-neutral-500">Options du visa officiel pour Congo Tech</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPdfOptionsDialog(false)}
                  className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                Voulez-vous apposer la <strong>signature</strong> et le <strong>sceau officiel</strong> sur la facture au niveau du visa pour <strong className="text-neutral-900">{settings.name}</strong> ?
              </p>

              <div className="space-y-2.5 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs">
                {/* Option 1: Signature */}
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-neutral-200 hover:border-blue-400 transition-colors cursor-pointer shadow-2xs">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeSignature}
                      onChange={(e) => setIncludeSignature(e.target.checked)}
                      className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-blue-600" />
                        Apposer la Signature Autorisée
                      </span>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        {settings.signatureUrl ? 'Signature configurée active' : 'Signature type activée'}
                      </span>
                    </div>
                  </div>
                  {settings.signatureUrl && (
                    <img
                      src={settings.signatureUrl}
                      alt="Signature"
                      className="h-7 max-w-[64px] object-contain p-0.5 border border-neutral-200 rounded bg-white"
                    />
                  )}
                </label>

                {/* Option 2: Sceau / Cachet */}
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-neutral-200 hover:border-emerald-400 transition-colors cursor-pointer shadow-2xs">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeStamp}
                      onChange={(e) => setIncludeStamp(e.target.checked)}
                      className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                        <Stamp className="w-3.5 h-3.5 text-emerald-600" />
                        Apposer le Sceau / Cachet Officiel
                      </span>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        {settings.stampUrl ? 'Cachet officiel prêt' : 'Sceau standard actif'}
                      </span>
                    </div>
                  </div>
                  {settings.stampUrl && (
                    <img
                      src={settings.stampUrl}
                      alt="Sceau"
                      className="h-7 w-7 object-contain p-0.5 border border-neutral-200 rounded bg-white"
                    />
                  )}
                </label>

                {/* Option 3: Logo */}
                {settings.logoUrl && (
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-neutral-200 hover:border-amber-400 transition-colors cursor-pointer shadow-2xs">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={includeLogo}
                        onChange={(e) => setIncludeLogo(e.target.checked)}
                        className="rounded border-neutral-300 text-amber-500 focus:ring-amber-400 w-4 h-4"
                      />
                      <div>
                        <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                          Afficher le Logo d'Entreprise
                        </span>
                        <span className="text-[10px] text-neutral-500 block mt-0.5">
                          En-tête de la facture
                        </span>
                      </div>
                    </div>
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="h-7 max-w-[64px] object-contain p-0.5 border border-neutral-200 rounded bg-white"
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPdfOptionsDialog(false)}
                  className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={executeDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>Télécharger le PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
