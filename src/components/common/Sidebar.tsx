import React from 'react';
import { useApp } from '../../context/AppContext';
import { getRoleBadgeInfo } from '../../data/initialUsers';
import {
  Store,
  FileText,
  Users,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  Database,
  UserCheck,
  KeyRound,
  LogOut,
  Radio,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    metrics,
    settings,
    exportDatabaseJSON,
    users,
    equipments,
    currentUser,
    setIsUserSwitchModalOpen,
    logout,
    currentCashSession,
  } = useApp();

  const currentRoleInfo = getRoleBadgeInfo(currentUser.role);

  const navigationItems = [
    {
      id: 'pos',
      label: 'Caisse Express (POS)',
      icon: Store,
      badge: null,
      highlight: true,
    },
    {
      id: 'caisse',
      label: 'Gestion de Caisse',
      icon: Receipt,
      badge: currentCashSession ? 'Active' : (metrics.unpaidInvoicesCount > 0 ? `${metrics.unpaidInvoicesCount} impayé(s)` : 'Fermée'),
      badgeColor: currentCashSession ? 'text-emerald-700 bg-emerald-100 font-semibold' : 'text-neutral-600 bg-neutral-100',
    },
    {
      id: 'dgi',
      label: 'Conformité DGI & TVA',
      icon: ShieldCheck,
      badge: 'DEF RDC',
      badgeColor: 'text-emerald-700 bg-emerald-100 font-mono',
    },
    {
      id: 'clients',
      label: 'Clients & Créances',
      icon: Users,
      badge: metrics.totalDebtsUSD > 0 ? `$${Math.round(metrics.totalDebtsUSD)}` : null,
      badgeColor: 'text-rose-700 bg-rose-100',
    },
    {
      id: 'catalog',
      label: 'Catalogue & Stocks',
      icon: Package,
      badge: metrics.lowStockCount > 0 ? `${metrics.lowStockCount} alerte` : null,
      badgeColor: 'text-amber-700 bg-amber-100',
    },
    {
      id: 'equipments',
      label: 'Parc & Réseaux',
      icon: Radio,
      badge: equipments.length > 0 ? `${equipments.length}` : null,
      badgeColor: 'text-sky-700 bg-sky-100 font-mono-nums',
    },
    {
      id: 'expenses',
      label: 'Dépenses & Charges',
      icon: Receipt,
      badge: null,
    },
    {
      id: 'users',
      label: 'Utilisateurs & Droits',
      icon: UserCheck,
      badge: `${users.length}`,
      badgeColor: 'text-purple-700 bg-purple-100 font-mono-nums',
    },
    {
      id: 'settings',
      label: 'Paramètres & Taux',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="no-print w-64 border-r border-neutral-200 bg-white flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Navigation List */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
          Menu Principal
        </div>

        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-amber-400'
                        : item.id === 'dgi'
                        ? 'text-emerald-600'
                        : item.id === 'users'
                        ? 'text-purple-600'
                        : item.highlight
                        ? 'text-emerald-600'
                        : 'text-neutral-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-mono-nums px-1.5 py-0.5 rounded font-semibold ${
                      isActive ? 'bg-neutral-800 text-amber-300' : item.badgeColor || 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* DGI Fiscal Certification Box */}
        <div className="pt-2 px-3">
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Norme DGI RDC</span>
              </span>
              <span className="text-[9px] bg-emerald-600 text-white px-1 py-0.2 rounded">DEF ACTIF</span>
            </div>
            <p className="text-[10px] text-emerald-800 leading-tight">
              Facturation certifiée avec NFU, Sceau SHA-256 et QR Code DGI.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Profile & Active Session Info */}
      <div className="p-3 border-t border-neutral-200 bg-neutral-50/70 space-y-2">
        <div className="p-2 bg-white rounded-xl border border-neutral-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="truncate">
                <span className="block text-xs font-bold text-neutral-900 truncate">
                  {currentUser.name}
                </span>
                <span className="block text-[10px] text-neutral-500 truncate">
                  {currentRoleInfo.label.split('/')[0]}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsUserSwitchModalOpen(true)}
                className="p-1.5 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Changer d'utilisateur / Saisir code PIN"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={logout}
                className="p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Se déconnecter / Verrouiller la session"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 text-[10px] text-neutral-500">
          <span>NIF : {settings.nif || 'A2109845B'}</span>
          <button
            onClick={exportDatabaseJSON}
            className="p-1 text-neutral-400 hover:text-neutral-900 rounded transition-colors"
            title="Exporter une sauvegarde JSON"
          >
            <Database className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
