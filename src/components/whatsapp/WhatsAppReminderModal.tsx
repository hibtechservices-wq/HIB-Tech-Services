import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { generateWhatsAppDebtMessage, generateWhatsAppReceiptMessage, cleanPhoneNumber, formatDualCurrency } from '../../utils/formatters';
import { MessageSquare, Copy, Check, ExternalLink, X, Send } from 'lucide-react';

export const WhatsAppReminderModal: React.FC = () => {
  const { activeWhatsAppClient, setActiveWhatsAppClient, settings } = useApp();
  const [customMessage, setCustomMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (activeWhatsAppClient) {
      const { client, sale } = activeWhatsAppClient;
      let msg = '';
      if (sale && sale.paymentStatus === 'PAID') {
        msg = generateWhatsAppReceiptMessage(sale, settings);
      } else {
        msg = generateWhatsAppDebtMessage(client, sale, settings, settings.exchangeRateUSD_CDF || 2850);
      }
      setCustomMessage(msg);
    }
  }, [activeWhatsAppClient, settings]);

  if (!activeWhatsAppClient) return null;

  const { client, sale } = activeWhatsAppClient;
  const phoneNumber = cleanPhoneNumber(client.whatsapp || client.phone || '');
  const rate = settings.exchangeRateUSD_CDF || 2850;
  const debtAmountUSD = sale ? sale.remainingDebtUSD : client.outstandingDebtUSD;
  const dualDebt = formatDualCurrency(debtAmountUSD, rate);

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(customMessage);
    const url = phoneNumber ? `https://wa.me/${phoneNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-emerald-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">
                {sale && sale.paymentStatus === 'PAID' ? 'Envoyer le Reçu par WhatsApp' : 'Relance WhatsApp Client'}
              </h3>
              <p className="text-xs text-neutral-500">
                Destinataire : <span className="font-medium text-neutral-800">{client.name}</span> {phoneNumber ? `(+${phoneNumber})` : '(Numéro à spécifier)'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveWhatsAppClient(null)}
            className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Quick Info Box */}
          <div className="bg-neutral-50 border border-neutral-200/80 rounded-lg p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-neutral-500 block">Créance en cours / Montant</span>
              <span className="font-bold text-base text-neutral-900 font-mono-nums">
                {dualDebt.usd} <span className="text-neutral-500 font-normal text-xs">({dualDebt.cdf})</span>
              </span>
            </div>
            {sale && (
              <div className="text-right">
                <span className="text-neutral-500 block">Document</span>
                <span className="font-semibold text-neutral-800">{sale.saleNumber}</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                Message pré-rédigé (Modifiable)
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié !' : 'Copier le texte'}
              </button>
            </div>
            <textarea
              rows={9}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full text-xs font-mono text-neutral-800 bg-neutral-50 border border-neutral-300 rounded-lg p-3 leading-relaxed focus:outline-none focus:border-emerald-600 focus:bg-white transition-all resize-y"
            />
          </div>

          <div className="text-xs text-neutral-500 bg-neutral-50 p-2.5 rounded-md border border-neutral-200">
            💡 <span className="font-medium">Astuce :</span> Vos numéros marchands (M-Pesa, Orange Money, Airtel Money) et coordonnées bancaires sont automatiquement inclus pour faciliter le règlement direct par le client.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-neutral-50/60 border-t border-neutral-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveWhatsAppClient(null)}
            className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-200/60 rounded-lg transition-colors"
          >
            Fermer
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Copy className="w-4 h-4" />
              <span>Copier</span>
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Ouvrir dans WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
