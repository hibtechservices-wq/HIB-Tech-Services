import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RateChangerModal } from './RateChangerModal';
import { RefreshCw, AlertTriangle, User, Lock } from 'lucide-react';
import { getRoleBadgeInfo } from '../../data/initialUsers';

export const Header: React.FC = () => {
  const {
    settings,
    selectedCurrency,
    setSelectedCurrency,
    setActiveTab,
    metrics,
    currentUser,
    setIsUserSwitchModalOpen,
    lockSession,
  } = useApp();

  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const rate = settings.exchangeRateUSD_CDF || 2850;
  const roleBadge = getRoleBadgeInfo(currentUser.role);
  const userInitials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <>
      <header className="no-print h-16 border-b border-neutral-200 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Left: Brand title & Location */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            title="Aller à la Caisse Express"
          >
            <div className="w-9 h-9 rounded-lg bg-neutral-900 text-amber-400 flex items-center justify-center font-bold text-lg shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <span className="text-emerald-400">C</span>
              <span className="text-amber-400">B</span>
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold tracking-tight text-neutral-900 block leading-tight">
                {settings.name.split(' ')[0]} <span className="text-amber-600 font-semibold">{settings.name.split(' ').slice(1, 3).join(' ')}</span>
              </span>
              <span className="text-[11px] text-neutral-500 hidden sm:block">
                {settings.city} · RDC
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right Actions - Perfectly aligned with uniform h-9 height */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Notification Alerts Pill if stock is low */}
          {metrics.lowStockCount > 0 && (
            <button
              onClick={() => setActiveTab('catalog')}
              className="h-9 inline-flex items-center justify-center gap-1.5 text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 rounded-lg transition-colors font-medium shrink-0 shadow-2xs"
              title="Consulter les articles en alerte stock"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden md:inline font-semibold">{metrics.lowStockCount} stock(s) faible(s)</span>
              <span className="md:hidden font-semibold">{metrics.lowStockCount} alertes</span>
            </button>
          )}

          {/* Live Exchange Rate Button */}
          <button
            onClick={() => setIsRateModalOpen(true)}
            className="h-9 inline-flex items-center justify-center gap-1.5 px-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 rounded-lg text-xs transition-colors group shadow-2xs shrink-0"
            title="Cliquez pour modifier le taux de change USD / CDF"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-180 transition-transform duration-300 shrink-0" />
            <span className="text-neutral-500 hidden sm:inline font-medium">Taux :</span>
            <span className="font-bold text-neutral-900 font-mono-nums">1$ = {rate.toLocaleString('fr-FR')} FC</span>
          </button>

          {/* Currency Display Switcher */}
          <div className="h-9 inline-flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs shrink-0">
            <button
              onClick={() => setSelectedCurrency('USD')}
              className={`h-full px-2.5 sm:px-3 rounded-md font-semibold transition-all inline-flex items-center justify-center ${
                selectedCurrency === 'USD'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              $ USD
            </button>
            <button
              onClick={() => setSelectedCurrency('CDF')}
              className={`h-full px-2.5 sm:px-3 rounded-md font-semibold transition-all inline-flex items-center justify-center ${
                selectedCurrency === 'CDF'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              FC (CDF)
            </button>
          </div>

          {/* User Profile / Switcher button */}
          <button
            onClick={() => setIsUserSwitchModalOpen(true)}
            className="h-9 inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-800 transition-colors shadow-2xs shrink-0"
            title={`Session active : ${currentUser.name} (${roleBadge.label}) - Cliquez pour changer`}
          >
            <div className="w-5 h-5 rounded-full bg-neutral-900 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0">
              {userInitials}
            </div>
            <span className="hidden lg:inline text-neutral-900 max-w-[100px] truncate">{currentUser.name.split(' ')[0]}</span>
            <span className={`hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono ${roleBadge.badgeClass}`}>
              {roleBadge.label}
            </span>
          </button>

          {/* Lock Screen Button */}
          <button
            onClick={lockSession}
            className="h-9 w-9 inline-flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-600 hover:text-neutral-900 transition-colors shadow-2xs shrink-0"
            title="Verrouiller la session (Écran de veille)"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Rate Changer Modal */}
      <RateChangerModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
      />
    </>
  );
};
