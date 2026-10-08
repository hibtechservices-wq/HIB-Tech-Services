/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { PosView } from './components/pos/PosView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { ClientsView } from './components/clients/ClientsView';
import { CatalogView } from './components/catalog/CatalogView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { SettingsView } from './components/settings/SettingsView';
import { DgiComplianceView } from './components/dgi/DgiComplianceView';
import { UsersView } from './components/users/UsersView';
import { EquipmentsView } from './components/equipments/EquipmentsView';
import { CashRegisterView } from './components/caisse/CashRegisterView';
import { InvoiceCreateModal } from './components/invoices/InvoiceCreateModal';
import { InvoicePrintModal } from './components/invoices/InvoicePrintModal';
import { WhatsAppReminderModal } from './components/whatsapp/WhatsAppReminderModal';
import { UserSwitchModal } from './components/users/UserSwitchModal';
import { LockScreen } from './components/auth/LockScreen';

const MainLayout: React.FC = () => {
  const { activeTab, isSessionLocked } = useApp();
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);

  if (isSessionLocked) {
    return <LockScreen />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'pos':
        return <PosView />;
      case 'caisse':
        return <CashRegisterView onOpenCreateInvoiceModal={() => setIsNewInvoiceModalOpen(true)} />;
      case 'invoices':
        return <CashRegisterView defaultSubTab="ALL_DOCS" onOpenCreateInvoiceModal={() => setIsNewInvoiceModalOpen(true)} />;
      case 'dgi':
        return <DgiComplianceView />;
      case 'clients':
        return <ClientsView />;
      case 'catalog':
        return <CatalogView />;
      case 'equipments':
        return <EquipmentsView />;
      case 'expenses':
        return <ExpensesView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <PosView />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans text-neutral-900">
      {/* Top Header */}
      <Header />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Modals */}
      <InvoiceCreateModal
        isOpen={isNewInvoiceModalOpen}
        onClose={() => setIsNewInvoiceModalOpen(false)}
      />

      <InvoicePrintModal />

      <WhatsAppReminderModal />

      <UserSwitchModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
