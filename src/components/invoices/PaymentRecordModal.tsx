import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale, PaymentMethod } from '../../types';
import { formatDualCurrency, getPaymentMethodLabel } from '../../utils/formatters';
import { CreditCard, X, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PaymentRecordModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const PaymentRecordModal: React.FC<PaymentRecordModalProps> = ({ sale, onClose }) => {
  const { recordPayment, settings } = useApp();
  const [amountUSD, setAmountUSD] = useState<number>(sale ? sale.remainingDebtUSD : 0);
  const [method, setMethod] = useState<PaymentMethod>('MPESA');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!sale) return null;

  const rate = settings.exchangeRateUSD_CDF || 2850;
  const remainingDual = formatDualCurrency(sale.remainingDebtUSD, rate);
  const currentPaymentDual = formatDualCurrency(amountUSD || 0, rate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountUSD <= 0) return;

    recordPayment(sale.id, {
      amountUSD,
      method,
      reference,
      notes,
    });

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
      });
    } catch (err) {
      // ignore
    }

    onClose();
  };

  const paymentMethods: PaymentMethod[] = [
    'MPESA',
    'ORANGE_MONEY',
    'AIRTEL_MONEY',
    'AFRIMONEY',
    'CASH_USD',
    'CASH_CDF',
    'BANK_TRANSFER',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-neutral-900">Enregistrer un Règlement</h3>
              <p className="text-xs text-neutral-500">
                Facture <span className="font-mono-nums font-medium text-neutral-800">{sale.saleNumber}</span> — {sale.clientName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Outstanding Banner */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 flex justify-between items-center text-xs">
            <div>
              <span className="text-amber-800 block font-medium">Solde restant dû :</span>
              <span className="text-xs text-amber-600">Sur un total de ${sale.totalUSD.toFixed(2)}</span>
            </div>
            <div className="text-right font-mono-nums">
              <span className="font-bold text-base text-amber-900">{remainingDual.usd}</span>
              <span className="block text-[11px] text-amber-700">({remainingDual.cdf})</span>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                Montant versé ($ USD)
              </label>
              <button
                type="button"
                onClick={() => setAmountUSD(sale.remainingDebtUSD)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
              >
                Tout solder (${sale.remainingDebtUSD.toFixed(2)})
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0.1"
                max={sale.remainingDebtUSD}
                step="0.01"
                value={amountUSD}
                onChange={(e) => setAmountUSD(Number(e.target.value))}
                className="w-full text-xl font-bold font-mono-nums text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold font-mono-nums text-sm">
                ≈ {currentPaymentDual.cdf}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
              Mode de Règlement RDC
            </label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((m) => {
                const info = getPaymentMethodLabel(m);
                const isSelected = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`px-3 py-2 text-left rounded-lg border text-xs transition-all flex flex-col ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 text-neutral-900 font-semibold ring-1 ring-emerald-600'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <span>{info.label}</span>
                    <span className="text-[10px] text-neutral-400 font-normal">{info.provider}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Référence de transaction (N° M-Pesa, Bordereau banque, etc.)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: MPESA-092837 ou RAW-BORD-89"
              className="w-full text-xs text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-900 focus:bg-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Notes complémentaires
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Reçu par chèque / Espèces guichet"
              className="w-full text-xs text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-900 focus:bg-white"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Valider l'Encaissement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
