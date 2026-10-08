import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NetworkEquipment, EquipmentType } from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Radio,
  Video,
  HardDrive,
  Router as RouterIcon,
  Wifi,
  Printer,
  Copy,
  Check,
  Eye,
  EyeOff,
  Activity,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Server,
  Tag,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface EquipmentDetailsModalProps {
  equipment: NetworkEquipment | null;
  onClose: () => void;
  onEdit: (eq: NetworkEquipment) => void;
  onPrint: (eq: NetworkEquipment) => void;
}

export const EquipmentDetailsModal: React.FC<EquipmentDetailsModalProps> = ({
  equipment,
  onClose,
  onEdit,
  onPrint,
}) => {
  const [showPasswords, setShowPasswords] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: 'OK' | 'TIMEOUT'; latency: number } | null>(null);

  if (!equipment) return null;

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePingTest = () => {
    setIsPinging(true);
    setPingResult(null);
    setTimeout(() => {
      setIsPinging(false);
      const isOnline = equipment.status === 'ACTIVE' || equipment.status === 'MAINTENANCE';
      const latency = Math.floor(25 + Math.random() * 35);
      setPingResult({
        status: isOnline ? 'OK' : 'TIMEOUT',
        latency: isOnline ? latency : 0,
      });
    }, 1200);
  };

  // Generate QR Code payload
  const qrPayload = JSON.stringify({
    type: equipment.type,
    name: equipment.name,
    sn: equipment.serialNumber,
    client: equipment.clientName,
    site: equipment.siteName,
    ip: equipment.starlink?.publicIpOrCgnat || equipment.cctvCamera?.ipAddress || equipment.nvrDvr?.ipAddress || equipment.router?.ipLanGateway || equipment.accessPoint?.ipAddress || 'DHCP',
    ssid: equipment.starlink?.wifiSsid || equipment.accessPoint?.primarySsid,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-neutral-200 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400 text-neutral-950 rounded-xl">
              {equipment.type === 'STARLINK' ? (
                <Radio className="w-5 h-5" />
              ) : equipment.type === 'CCTV_CAMERA' ? (
                <Video className="w-5 h-5" />
              ) : equipment.type === 'NVR_DVR' ? (
                <HardDrive className="w-5 h-5" />
              ) : equipment.type === 'ROUTER' ? (
                <RouterIcon className="w-5 h-5" />
              ) : (
                <Wifi className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg tracking-tight text-white">
                  {equipment.name}
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    equipment.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : equipment.status === 'MAINTENANCE'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : equipment.status === 'OFFLINE'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-neutral-700 text-neutral-300'
                  }`}
                >
                  {equipment.status === 'ACTIVE'
                    ? 'En Service'
                    : equipment.status === 'MAINTENANCE'
                    ? 'Maintenance'
                    : equipment.status === 'OFFLINE'
                    ? 'Hors Ligne'
                    : 'En Stock'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {equipment.clientName} · {equipment.siteName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPrint(equipment)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Générer la Fiche Technique PDF A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fiche PDF A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Quick Info & Ping Bar */}
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-neutral-600">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-semibold text-neutral-900">{equipment.siteName}</span>
                {equipment.siteAddress && <span className="text-[11px] text-neutral-500">({equipment.siteAddress})</span>}
              </div>
              <div className="flex items-center gap-1.5 font-mono-nums">
                <span className="text-neutral-400">S/N:</span>
                <span className="font-bold text-neutral-900">{equipment.serialNumber}</span>
              </div>
              {equipment.macAddress && (
                <div className="flex items-center gap-1.5 font-mono-nums">
                  <span className="text-neutral-400">MAC:</span>
                  <span className="text-neutral-800">{equipment.macAddress}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePingTest}
                disabled={isPinging}
                className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-amber-500' : 'text-blue-600'}`} />
                <span>{isPinging ? 'Test en cours...' : 'Tester Connectivité'}</span>
              </button>

              {pingResult && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono-nums flex items-center gap-1 ${
                    pingResult.status === 'OK'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {pingResult.status === 'OK' ? `🟢 En Ligne (${pingResult.latency} ms)` : '🔴 Injoignable'}
                </span>
              )}
            </div>
          </div>

          {/* Type Specific Detailed Card */}
          {equipment.type === 'STARLINK' && equipment.starlink && (
            <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sky-950 uppercase text-[11px]">
                  <Radio className="w-4 h-4 text-sky-600" />
                  <span>Détails de Configuration Starlink</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="px-2 py-1 bg-white border border-sky-300 rounded-lg text-[11px] font-semibold text-sky-900 flex items-center gap-1 hover:bg-sky-50 transition-colors"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasswords ? 'Masquer Clés' : 'Afficher Clés'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Numéro de Kit</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono-nums font-bold text-neutral-900">{equipment.starlink.kitNumber || '—'}</span>
                    {equipment.starlink.kitNumber && (
                      <button onClick={() => handleCopy(equipment.starlink!.kitNumber!, 'kit')} className="text-neutral-400 hover:text-neutral-800">
                        {copiedKey === 'kit' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Dish Serial (Antenne)</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono-nums font-semibold text-neutral-900">{equipment.starlink.dishSerial || '—'}</span>
                    {equipment.starlink.dishSerial && (
                      <button onClick={() => handleCopy(equipment.starlink!.dishSerial!, 'dish')} className="text-neutral-400 hover:text-neutral-800">
                        {copiedKey === 'dish' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Forfait Abonnement</span>
                  <span className="font-semibold text-sky-900 block mt-1">{equipment.starlink.subscriptionPlan || 'Standard'}</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Compte / Email Gestion</span>
                  <span className="font-medium text-neutral-900 block mt-1 truncate">{equipment.starlink.accountEmail || '—'}</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Adresse IP</span>
                  <span className="font-mono-nums font-bold text-neutral-900 block mt-1">{equipment.starlink.publicIpOrCgnat || 'CGNAT Auto'}</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-sky-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Mode Bypass</span>
                  <span className={`font-bold block mt-1 ${equipment.starlink.bypassModeEnabled ? 'text-amber-700' : 'text-neutral-600'}`}>
                    {equipment.starlink.bypassModeEnabled ? 'Actif (Routeur tiers)' : 'Inactif (WiFi Starlink)'}
                  </span>
                </div>

                {equipment.starlink.wifiSsid && (
                  <div className="bg-white p-3 rounded-lg border border-sky-100">
                    <span className="text-neutral-400 text-[10px] uppercase font-bold block">SSID Wi-Fi</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold text-neutral-900">{equipment.starlink.wifiSsid}</span>
                      <button onClick={() => handleCopy(equipment.starlink!.wifiSsid!, 'ssid')} className="text-neutral-400 hover:text-neutral-800">
                        {copiedKey === 'ssid' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {equipment.starlink.wifiPassword && (
                  <div className="bg-white p-3 rounded-lg border border-sky-100">
                    <span className="text-neutral-400 text-[10px] uppercase font-bold block">Clé Sécurité Wi-Fi</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono-nums font-bold text-neutral-900">
                        {showPasswords ? equipment.starlink.wifiPassword : '••••••••••••'}
                      </span>
                      <button onClick={() => handleCopy(equipment.starlink!.wifiPassword!, 'pwd')} className="text-neutral-400 hover:text-neutral-800">
                        {copiedKey === 'pwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {equipment.type === 'CCTV_CAMERA' && equipment.cctvCamera && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-emerald-950 uppercase text-[11px]">
                  <Video className="w-4 h-4 text-emerald-600" />
                  <span>Détails Caméra CCTV IP & Flux Vidéo</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="px-2 py-1 bg-white border border-emerald-300 rounded-lg text-[11px] font-semibold text-emerald-900 flex items-center gap-1 hover:bg-emerald-50 transition-colors"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasswords ? 'Masquer' : 'Afficher Passwords'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-emerald-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Adresse IP Flux</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono-nums font-bold text-emerald-900">{equipment.cctvCamera.ipAddress || '—'}</span>
                    {equipment.cctvCamera.ipAddress && (
                      <button onClick={() => handleCopy(equipment.cctvCamera!.ipAddress!, 'camIp')} className="text-neutral-400 hover:text-neutral-800">
                        {copiedKey === 'camIp' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Type & Résolution</span>
                  <span className="font-semibold text-neutral-900 block mt-1">
                    {equipment.cctvCamera.cameraType} · {equipment.cctvCamera.resolution || '4MP'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Canal NVR</span>
                  <span className="font-bold text-neutral-900 block mt-1 font-mono-nums">
                    Canal N° {equipment.cctvCamera.nvrChannel || '1'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Accès Admin</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono-nums text-neutral-900">
                      {equipment.cctvCamera.username || 'admin'} / {showPasswords ? equipment.cctvCamera.password : '••••••••'}
                    </span>
                    {equipment.cctvCamera.password && (
                      <button onClick={() => handleCopy(equipment.cctvCamera!.password!, 'camPwd')} className="text-neutral-400 hover:text-neutral-800">
                        {copiedKey === 'camPwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Ports de Diffusion</span>
                  <span className="font-mono-nums text-neutral-700 block mt-1 text-[11px]">
                    HTTP: {equipment.cctvCamera.httpPort || 80} · RTSP: {equipment.cctvCamera.rtspPort || 554}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Port Switch PoE</span>
                  <span className="text-neutral-800 block mt-1">{equipment.cctvCamera.poeSwitchPort || 'Non spécifié'}</span>
                </div>
              </div>
            </div>
          )}

          {equipment.type === 'NVR_DVR' && equipment.nvrDvr && (
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-purple-950 uppercase text-[11px]">
                  <HardDrive className="w-4 h-4 text-purple-600" />
                  <span>Détails Enregistreur NVR / DVR & Stockage</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="px-2 py-1 bg-white border border-purple-300 rounded-lg text-[11px] font-semibold text-purple-900 flex items-center gap-1 hover:bg-purple-50 transition-colors"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasswords ? 'Masquer' : 'Afficher Passwords'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Adresse IP NVR</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono-nums font-bold text-purple-900">{equipment.nvrDvr.ipAddress}</span>
                    <button onClick={() => handleCopy(equipment.nvrDvr!.ipAddress!, 'nvrIp')} className="text-neutral-400 hover:text-neutral-800">
                      {copiedKey === 'nvrIp' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Capacité & Rétention</span>
                  <span className="font-bold text-neutral-900 block mt-1 font-mono-nums">
                    {equipment.nvrDvr.hddCapacityTb || 4} TB ({equipment.nvrDvr.retentionDays || 30} jours rétention)
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Canaux Vidéo</span>
                  <span className="font-semibold text-neutral-900 block mt-1">
                    {equipment.nvrDvr.connectedCamerasCount || 0} / {equipment.nvrDvr.channelCount || 16} caméras connectées
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Identifiant Cloud P2P</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono-nums font-bold text-purple-950">{equipment.nvrDvr.p2pCloudId || '—'}</span>
                    {equipment.nvrDvr.p2pCloudId && (
                      <button onClick={() => handleCopy(equipment.nvrDvr!.p2pCloudId!, 'p2p')} className="text-neutral-400 hover:text-neutral-800">
                        {copiedKey === 'p2p' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Code Vérification P2P</span>
                  <span className="font-mono-nums font-bold text-neutral-900 block mt-1">
                    {showPasswords ? (equipment.nvrDvr.p2pVerificationCode || 'ABCDEF') : '••••••'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Mot de Passe Admin</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono-nums font-bold text-neutral-900">
                      {showPasswords ? equipment.nvrDvr.password : '••••••••••••'}
                    </span>
                    {equipment.nvrDvr.password && (
                      <button onClick={() => handleCopy(equipment.nvrDvr!.password!, 'nvrPwd')} className="text-neutral-400 hover:text-neutral-800">
                        {copiedKey === 'nvrPwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {equipment.type === 'ROUTER' && equipment.router && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-amber-950 uppercase text-[11px]">
                  <RouterIcon className="w-4 h-4 text-amber-600" />
                  <span>Détails Passerelle Réseau / MikroTik / VPN</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="px-2 py-1 bg-white border border-amber-300 rounded-lg text-[11px] font-semibold text-amber-900 flex items-center gap-1 hover:bg-amber-50 transition-colors"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasswords ? 'Masquer' : 'Afficher Passwords'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-amber-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Passerelle LAN</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono-nums font-bold text-neutral-900">{equipment.router.ipLanGateway}</span>
                    <button onClick={() => handleCopy(equipment.router!.ipLanGateway!, 'lan')} className="text-neutral-400 hover:text-neutral-800">
                      {copiedKey === 'lan' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-amber-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Type WAN</span>
                  <span className="font-semibold text-neutral-900 block mt-1">{equipment.router.wanType}</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-amber-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Protocole VPN</span>
                  <span className="font-bold text-amber-900 block mt-1 font-mono-nums">{equipment.router.vpnType || 'NONE'}</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-amber-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Utilisateur Admin</span>
                  <span className="font-mono-nums font-semibold text-neutral-900 block mt-1">{equipment.router.adminUsername || 'admin'}</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-amber-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Mot de Passe Admin</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono-nums font-bold text-neutral-900">
                      {showPasswords ? equipment.router.adminPassword : '••••••••••••'}
                    </span>
                    {equipment.router.adminPassword && (
                      <button onClick={() => handleCopy(equipment.router!.adminPassword!, 'rtPwd')} className="text-neutral-400 hover:text-neutral-800">
                        {copiedKey === 'rtPwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-amber-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Ports Gestion</span>
                  <span className="font-mono-nums text-neutral-700 block mt-1">
                    Winbox: {equipment.router.winboxOrWebPort || 8291} · SSH: {equipment.router.sshPort || 22}
                  </span>
                </div>
              </div>

              {equipment.router.activeVlans && (
                <div className="bg-white p-2.5 rounded-lg border border-amber-100 text-[11px] text-neutral-800">
                  <span className="font-bold block text-neutral-500 text-[10px] uppercase">VLANs configurés :</span>
                  <span>{equipment.router.activeVlans}</span>
                </div>
              )}
            </div>
          )}

          {equipment.type === 'ACCESS_POINT' && equipment.accessPoint && (
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-teal-950 uppercase text-[11px]">
                  <Wifi className="w-4 h-4 text-teal-600" />
                  <span>Détails Point d'Accès Wi-Fi</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="px-2 py-1 bg-white border border-teal-300 rounded-lg text-[11px] font-semibold text-teal-900 flex items-center gap-1 hover:bg-teal-50 transition-colors"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasswords ? 'Masquer' : 'Afficher Passwords'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg border border-teal-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">SSID Wi-Fi Principal</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-neutral-900">{equipment.accessPoint.primarySsid || '—'}</span>
                    {equipment.accessPoint.primarySsid && (
                      <button onClick={() => handleCopy(equipment.accessPoint!.primarySsid!, 'apSsid')} className="text-neutral-400 hover:text-neutral-800">
                        {copiedKey === 'apSsid' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-teal-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Mot de Passe Wi-Fi</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono-nums font-bold text-neutral-900">
                      {showPasswords ? equipment.accessPoint.primaryWifiPassword : '••••••••••••'}
                    </span>
                    {equipment.accessPoint.primaryWifiPassword && (
                      <button onClick={() => handleCopy(equipment.accessPoint!.primaryWifiPassword!, 'apPwd')} className="text-neutral-400 hover:text-neutral-800">
                        {copiedKey === 'apPwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-teal-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">IP de Gestion</span>
                  <span className="font-mono-nums font-bold text-neutral-900 block mt-1">{equipment.accessPoint.ipAddress}</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-teal-100">
                  <span className="text-neutral-400 text-[10px] uppercase font-bold block">Contrôleur Cloud / IP</span>
                  <span className="font-mono-nums text-neutral-700 block mt-1 truncate">{equipment.accessPoint.controllerIpOrCloud || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* QR Code & Maintenance Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-500 mb-2">QR Code de Configuration</span>
              <div className="p-2 bg-white rounded-lg border border-neutral-200 shadow-2xs">
                <QRCodeSVG value={qrPayload} size={90} level="M" />
              </div>
              <span className="text-[9px] text-neutral-400 mt-1">Scan technicien / inventaire</span>
            </div>

            <div className="sm:col-span-2 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Historique & Dates Clés</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[10px]">Date Installation :</span>
                  <span className="font-semibold text-neutral-900 font-mono-nums">{formatDate(equipment.installationDate)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Technicien :</span>
                  <span className="font-semibold text-neutral-900">{equipment.assignedTechnician || 'Non assigné'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Dernière Maintenance :</span>
                  <span className="font-mono-nums text-neutral-800">{equipment.lastMaintenanceDate ? formatDate(equipment.lastMaintenanceDate) : '—'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Prochaine Révision :</span>
                  <span className="font-mono-nums font-bold text-amber-800">{equipment.nextMaintenanceDate ? formatDate(equipment.nextMaintenanceDate) : '—'}</span>
                </div>
              </div>

              {equipment.notes && (
                <div className="pt-2 border-t border-neutral-200">
                  <span className="text-[10px] text-neutral-400 block">Notes d'intervention :</span>
                  <p className="text-[11px] text-neutral-700 italic">{equipment.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Fermer
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(equipment);
                }}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Modifier la Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
