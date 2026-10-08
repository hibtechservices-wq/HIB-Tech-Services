import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser } from '../../types';
import { getRoleBadgeInfo } from '../../data/initialUsers';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Building,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Store,
} from 'lucide-react';

export const LockScreen: React.FC = () => {
  const {
    users,
    currentUser,
    unlockSession,
    settings,
  } = useApp();

  const [selectedUser, setSelectedUser] = useState<AppUser>(currentUser);
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update selected user if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setSelectedUser(currentUser);
    }
  }, [currentUser]);

  // Physical keyboard support for fast PIN entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        setEnteredPin((prev) => prev.slice(0, -1));
        setErrorMessage('');
      } else if (e.key === 'Escape') {
        setEnteredPin('');
        setErrorMessage('');
      } else if (e.key === 'Enter') {
        if (enteredPin.length >= 4) {
          submitPin(enteredPin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enteredPin, selectedUser]);

  const handleDigit = (digit: string) => {
    if (enteredPin.length < 6) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      setErrorMessage('');

      if (nextPin.length === 4) {
        submitPin(nextPin);
      }
    }
  };

  const submitPin = (pinToSubmit: string) => {
    const res = unlockSession(selectedUser, pinToSubmit);
    if (!res.success) {
      setErrorMessage(res.message || 'Code PIN incorrect.');
      setEnteredPin('');
    } else {
      setEnteredPin('');
      setErrorMessage('');
    }
  };

  const handleDirectDemoUnlock = (userToUnlock: AppUser) => {
    const res = unlockSession(userToUnlock, userToUnlock.pinCode);
    if (!res.success) {
      setErrorMessage(res.message || 'Impossible de déverrouiller.');
    }
  };

  const activeUsers = users.filter((u) => u.isActive);
  const selectedRoleInfo = getRoleBadgeInfo(selectedUser.role);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 text-white flex flex-col justify-between overflow-y-auto selection:bg-amber-400 selection:text-neutral-950 font-sans">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Top Bar */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900/50 backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 text-amber-400 flex items-center justify-center font-bold text-lg shadow-inner">
            <span className="text-emerald-400">C</span>
            <span className="text-amber-400">B</span>
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
              {settings.name}
            </h1>
            <p className="text-[11px] text-neutral-400">
              {settings.city} · République Démocratique du Congo
            </p>
          </div>
        </div>

        {/* Live Clock & Rate in DRC */}
        <div className="flex items-center gap-4 text-xs font-mono-nums">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-800/60 rounded-lg border border-neutral-700/60 text-neutral-300">
            <span className="text-amber-400 font-bold">1$ USD = {settings.exchangeRateUSD_CDF?.toLocaleString('fr-FR') || 2850} FC</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800/80 rounded-lg border border-neutral-700 text-neutral-200">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">
              {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      {/* Main Center Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-xl bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Header icon & title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 text-amber-400 mb-1 shadow-inner">
              <Lock className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Session Verrouillée
            </h2>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Sélectionnez votre profil opérateur et saisissez votre <strong>Code PIN à 4 chiffres</strong> pour déverrouiller la caisse et la gestion commerciale.
            </p>
          </div>

          {/* User selector cards */}
          <div className="space-y-2">
            <span className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider text-center">
              Choisir l'Opérateur / Caissier :
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {activeUsers.map((user) => {
                const isSelected = selectedUser.id === user.id;
                const roleBadge = getRoleBadgeInfo(user.role);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(user);
                      setEnteredPin('');
                      setErrorMessage('');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/10 text-white ring-1 ring-amber-400 shadow-md scale-[1.02]'
                        : 'border-neutral-800 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center mb-2 bg-neutral-800 border border-neutral-700 text-amber-400">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-xs block truncate text-white">
                        {user.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-neutral-400 block truncate">
                        {roleBadge.label.split('/')[0]}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono-nums text-neutral-500 mt-2 block">
                      PIN: <span className="font-bold text-neutral-300">{user.pinCode}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected user highlighted badge */}
          <div className="p-3 bg-neutral-800/60 rounded-xl border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 border border-neutral-700">
                {selectedUser.name.charAt(0)}
              </div>
              <div className="truncate">
                <span className="block text-xs font-bold text-white truncate">
                  {selectedUser.name}
                </span>
                <span className="block text-[10px] text-neutral-400 truncate">
                  {selectedRoleInfo.label} · {selectedUser.assignedRegister || 'Administration'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDirectDemoUnlock(selectedUser)}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 shadow-xs"
              title="Connexion immédiate avec le code PIN démo de cet utilisateur"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Déverrouiller</span>
            </button>
          </div>

          {/* PIN Display bullets */}
          <div className="text-center space-y-3">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center font-mono-nums text-xl font-bold transition-all ${
                    enteredPin.length > idx
                      ? 'border-amber-400 bg-amber-400/20 text-amber-400 shadow-sm scale-105'
                      : 'border-neutral-700 bg-neutral-800/60 text-neutral-500'
                  }`}
                >
                  {enteredPin.length > idx ? '●' : ''}
                </div>
              ))}
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-400 font-semibold animate-shake">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Touch numeric keypad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'C') {
                    setEnteredPin('');
                    setErrorMessage('');
                  } else if (k === 'OK') {
                    if (enteredPin.length >= 4) {
                      submitPin(enteredPin);
                    }
                  } else {
                    handleDigit(k);
                  }
                }}
                className={`py-3.5 rounded-2xl font-bold font-mono-nums text-base transition-all active:scale-95 ${
                  k === 'OK'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    : k === 'C'
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-rose-400'
                    : 'bg-neutral-800/80 hover:bg-neutral-700 text-white border border-neutral-700/60'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Footer with DGI & Security Mention */}
      <footer className="relative z-10 px-6 py-3 border-t border-neutral-800/80 bg-neutral-900/50 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-neutral-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Plateforme Certifiée Norme DGI RDC · Dispositif Électronique Fiscal (DEF)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>NIF : <strong className="text-neutral-200">{settings.nif || 'A2109845B'}</strong></span>
          <span>•</span>
          <span>Terminal DEF : <strong className="text-neutral-200">{settings.dgiDefTerminalId || 'DEF-KIN-001'}</strong></span>
        </div>
      </footer>
    </div>
  );
};
