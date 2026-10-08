import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { NetworkEquipment } from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { downloadElementAsPDF } from '../../utils/pdfGenerator';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, ShieldCheck, Radio, Video, HardDrive, Router as RouterIcon, Wifi, CheckCircle2, Download, Loader2 } from 'lucide-react';

interface EquipmentPrintModalProps {
  equipment: NetworkEquipment | null;
  onClose: () => void;
}

export const EquipmentPrintModal: React.FC<EquipmentPrintModalProps> = ({ equipment, onClose }) => {
  const { settings } = useApp();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!equipment) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const filename = `Fiche_Technique_${equipment.type}_${equipment.serialNumber}.pdf`;
      await downloadElementAsPDF(printAreaRef.current, filename, {
        format: 'a4',
        orientation: 'portrait',
        margin: 8,
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const qrPayload = `EQUIPMENT-CONF:${equipment.serialNumber}|${equipment.type}|${equipment.name}|${equipment.clientName}|IP:${equipment.starlink?.publicIpOrCgnat || equipment.cctvCamera?.ipAddress || equipment.nvrDvr?.ipAddress || equipment.router?.ipLanGateway || equipment.accessPoint?.ipAddress || 'N/A'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-neutral-200 overflow-hidden my-auto flex flex-col max-h-[96vh]">
        {/* Top bar (Hidden during print) */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-b border-neutral-200 bg-neutral-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">
              Fiche Technique d'Installation Réseau & Télécom : <span className="font-mono-nums text-amber-400">{equipment.serialNumber}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct PDF Download */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isGeneratingPDF ? 'Création PDF...' : 'Télécharger PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs border border-neutral-700"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document A4 Container */}
        <div ref={printAreaRef} className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white print:p-0 print:m-0 text-neutral-900">
          <div className="max-w-3xl mx-auto space-y-6 text-xs">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-neutral-900">
              <div>
                <h1 className="text-xl font-black uppercase text-neutral-950 tracking-tight">
                  {settings.name}
                </h1>
                <p className="text-xs text-neutral-600 font-medium mt-0.5">
                  {settings.slogan || 'Ingénierie Réseaux, Télécoms, Sécurité Électronique & Starlink RDC'}
                </p>
                <div className="text-[11px] text-neutral-500 space-y-0.5 mt-2">
                  <p>{settings.address} · {settings.city} · République Démocratique du Congo</p>
                  <p>Tél : {settings.phone1} {settings.phone2 ? `· ${settings.phone2}` : ''} {settings.email ? `· Email : ${settings.email}` : ''}</p>
                  <p className="font-mono-nums">
                    {settings.nif ? `NIF : ${settings.nif}` : ''} {settings.rccm ? `· RCCM : ${settings.rccm}` : ''}
                  </p>
                </div>
              </div>

              <div className="text-right bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">
                  Document Technique Officiel
                </span>
                <h2 className="text-sm font-black text-neutral-900 uppercase mt-0.5">
                  FICHE D'INSTALLATION & CONFIGURATION
                </h2>
                <div className="text-[11px] text-neutral-600 mt-2 space-y-0.5 font-mono-nums">
                  <p>Réf. Matériel : <span className="font-bold text-neutral-900">{equipment.serialNumber}</span></p>
                  <p>Date d'édition : <span className="font-semibold text-neutral-900">{formatDate(new Date().toISOString())}</span></p>
                </div>
              </div>
            </div>

            {/* Client & Site Info Box */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Bénéficiaire / Client :</span>
                <span className="font-bold text-neutral-900 text-sm block mt-0.5">{equipment.clientName}</span>
                <span className="text-neutral-600 block mt-1">Site : {equipment.siteName}</span>
                {equipment.siteAddress && <span className="text-neutral-500 block text-[11px]">{equipment.siteAddress}</span>}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Détails d'Intervention :</span>
                <p className="mt-0.5"><span className="text-neutral-500">Date Installation :</span> <span className="font-bold font-mono-nums">{formatDate(equipment.installationDate)}</span></p>
                <p><span className="text-neutral-500">Technicien en Charge :</span> <span className="font-semibold">{equipment.assignedTechnician || 'Équipe Technique HibTech'}</span></p>
                <p><span className="text-neutral-500">Statut Opérationnel :</span> <span className="font-bold text-emerald-800">CONFORME / EN SERVICE</span></p>
              </div>
            </div>

            {/* Equipment Main Specs Table */}
            <div>
              <h3 className="font-bold text-neutral-900 uppercase text-xs pb-1.5 border-b border-neutral-300 flex items-center gap-2">
                <span>1. Identification & Paramètres Matériels</span>
              </h3>

              <div className="mt-2 border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <tbody className="divide-y divide-neutral-200">
                    <tr className="bg-neutral-50">
                      <td className="py-2 px-3 font-semibold text-neutral-600 w-1/3">Désignation de l'Équipement</td>
                      <td className="py-2 px-3 font-bold text-neutral-900">{equipment.name}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-neutral-600">Catégorie Technique</td>
                      <td className="py-2 px-3 font-bold">
                        {equipment.type === 'STARLINK' ? 'Kit Satellite Starlink Haut Débit' :
                         equipment.type === 'CCTV_CAMERA' ? 'Caméra de Surveillance Vidéo IP' :
                         equipment.type === 'NVR_DVR' ? 'Enregistreur Vidéo Numérique (NVR/DVR)' :
                         equipment.type === 'ROUTER' ? 'Routeur & Pare-feu Réseau' :
                         equipment.type === 'ACCESS_POINT' ? 'Point d\'Accès Wi-Fi Professionnel' : 'Switch Réseau'}
                      </td>
                    </tr>
                    <tr className="bg-neutral-50">
                      <td className="py-2 px-3 font-semibold text-neutral-600">Numéro de Série (S/N)</td>
                      <td className="py-2 px-3 font-mono-nums font-bold text-neutral-900">{equipment.serialNumber}</td>
                    </tr>
                    {equipment.macAddress && (
                      <tr>
                        <td className="py-2 px-3 font-semibold text-neutral-600">Adresse MAC Physique</td>
                        <td className="py-2 px-3 font-mono-nums">{equipment.macAddress}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Type Specific Technical Sheet */}
            {equipment.type === 'STARLINK' && equipment.starlink && (
              <div>
                <h3 className="font-bold text-neutral-900 uppercase text-xs pb-1.5 border-b border-neutral-300">
                  2. Paramètres Réseau & Forfait Starlink
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-3 p-3.5 bg-sky-50/50 rounded-xl border border-sky-200">
                  <p><span className="text-neutral-500">Kit Number :</span> <span className="font-mono-nums font-bold">{equipment.starlink.kitNumber || '—'}</span></p>
                  <p><span className="text-neutral-500">Antenne Serial :</span> <span className="font-mono-nums">{equipment.starlink.dishSerial || '—'}</span></p>
                  <p><span className="text-neutral-500">Forfait Starlink :</span> <span className="font-semibold text-sky-950">{equipment.starlink.subscriptionPlan}</span></p>
                  <p><span className="text-neutral-500">Compte Email :</span> <span className="font-mono-nums">{equipment.starlink.accountEmail}</span></p>
                  <p><span className="text-neutral-500">Mode Bypass (Routeur Tiers) :</span> <span className="font-bold">{equipment.starlink.bypassModeEnabled ? 'OUI (Actif)' : 'NON (Router Starlink)'}</span></p>
                  <p><span className="text-neutral-500">Adresse IP :</span> <span className="font-mono-nums font-bold">{equipment.starlink.publicIpOrCgnat || 'CGNAT Auto'}</span></p>
                  {equipment.starlink.wifiSsid && (
                    <p><span className="text-neutral-500">SSID Wi-Fi :</span> <span className="font-bold">{equipment.starlink.wifiSsid}</span></p>
                  )}
                  {equipment.starlink.wifiPassword && (
                    <p><span className="text-neutral-500">Clé Wi-Fi :</span> <span className="font-mono-nums font-bold">{equipment.starlink.wifiPassword}</span></p>
                  )}
                </div>
              </div>
            )}

            {equipment.type === 'CCTV_CAMERA' && equipment.cctvCamera && (
              <div>
                <h3 className="font-bold text-neutral-900 uppercase text-xs pb-1.5 border-b border-neutral-300">
                  2. Configuration Flux Vidéo & Accès Caméra
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-3 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200">
                  <p><span className="text-neutral-500">Adresse IP Fixe :</span> <span className="font-mono-nums font-bold text-emerald-950">{equipment.cctvCamera.ipAddress}</span></p>
                  <p><span className="text-neutral-500">Type & Résolution :</span> <span className="font-semibold">{equipment.cctvCamera.cameraType} · {equipment.cctvCamera.resolution}</span></p>
                  <p><span className="text-neutral-500">Canal NVR :</span> <span className="font-mono-nums font-bold">Canal N° {equipment.cctvCamera.nvrChannel}</span></p>
                  <p><span className="text-neutral-500">Emplacement :</span> <span className="font-semibold">{equipment.cctvCamera.installedLocation || 'Site'}</span></p>
                  <p><span className="text-neutral-500">Identifiant :</span> <span className="font-mono-nums font-bold">{equipment.cctvCamera.username || 'admin'}</span></p>
                  <p><span className="text-neutral-500">Mot de Passe :</span> <span className="font-mono-nums font-bold">{equipment.cctvCamera.password}</span></p>
                  <p><span className="text-neutral-500">Port HTTP / RTSP :</span> <span className="font-mono-nums">{equipment.cctvCamera.httpPort || 80} / {equipment.cctvCamera.rtspPort || 554}</span></p>
                  <p><span className="text-neutral-500">Port Switch PoE :</span> <span>{equipment.cctvCamera.poeSwitchPort || 'PoE'}</span></p>
                </div>
              </div>
            )}

            {equipment.type === 'NVR_DVR' && equipment.nvrDvr && (
              <div>
                <h3 className="font-bold text-neutral-900 uppercase text-xs pb-1.5 border-b border-neutral-300">
                  2. Configuration Enregistreur & Accès Cloud P2P
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-3 p-3.5 bg-purple-50/50 rounded-xl border border-purple-200">
                  <p><span className="text-neutral-500">Adresse IP LAN :</span> <span className="font-mono-nums font-bold text-purple-950">{equipment.nvrDvr.ipAddress}</span></p>
                  <p><span className="text-neutral-500">Capacité Disques Durs :</span> <span className="font-mono-nums font-bold">{equipment.nvrDvr.hddCapacityTb || 4} TB ({equipment.nvrDvr.retentionDays} jours)</span></p>
                  <p><span className="text-neutral-500">Nombre de Canaux :</span> <span className="font-semibold">{equipment.nvrDvr.connectedCamerasCount} / {equipment.nvrDvr.channelCount} canaux</span></p>
                  <p><span className="text-neutral-500">Identifiant Cloud P2P :</span> <span className="font-mono-nums font-bold text-purple-900">{equipment.nvrDvr.p2pCloudId || '—'}</span></p>
                  <p><span className="text-neutral-500">Utilisateur Admin :</span> <span className="font-mono-nums font-bold">{equipment.nvrDvr.username || 'admin'}</span></p>
                  <p><span className="text-neutral-500">Mot de Passe :</span> <span className="font-mono-nums font-bold">{equipment.nvrDvr.password}</span></p>
                </div>
              </div>
            )}

            {equipment.type === 'ROUTER' && equipment.router && (
              <div>
                <h3 className="font-bold text-neutral-900 uppercase text-xs pb-1.5 border-b border-neutral-300">
                  2. Configuration Routage, Passerelle & Sécurité
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-3 p-3.5 bg-amber-50/50 rounded-xl border border-amber-200">
                  <p><span className="text-neutral-500">Passerelle LAN :</span> <span className="font-mono-nums font-bold text-amber-950">{equipment.router.ipLanGateway}</span></p>
                  <p><span className="text-neutral-500">Mode WAN :</span> <span className="font-semibold">{equipment.router.wanType}</span></p>
                  <p><span className="text-neutral-500">Plage DHCP :</span> <span className="font-mono-nums">{equipment.router.dhcpPoolRange}</span></p>
                  <p><span className="text-neutral-500">Protocole VPN :</span> <span className="font-mono-nums font-bold">{equipment.router.vpnType}</span></p>
                  <p><span className="text-neutral-500">Identifiant Admin :</span> <span className="font-mono-nums font-bold">{equipment.router.adminUsername}</span></p>
                  <p><span className="text-neutral-500">Mot de Passe :</span> <span className="font-mono-nums font-bold">{equipment.router.adminPassword}</span></p>
                </div>
              </div>
            )}

            {equipment.type === 'ACCESS_POINT' && equipment.accessPoint && (
              <div>
                <h3 className="font-bold text-neutral-900 uppercase text-xs pb-1.5 border-b border-neutral-300">
                  2. Configuration Réseau Wi-Fi & Sécurité
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-3 p-3.5 bg-teal-50/50 rounded-xl border border-teal-200">
                  <p><span className="text-neutral-500">SSID Principal :</span> <span className="font-bold text-teal-950">{equipment.accessPoint.primarySsid}</span></p>
                  <p><span className="text-neutral-500">Clé de Sécurité Wi-Fi :</span> <span className="font-mono-nums font-bold">{equipment.accessPoint.primaryWifiPassword}</span></p>
                  <p><span className="text-neutral-500">IP de Gestion :</span> <span className="font-mono-nums">{equipment.accessPoint.ipAddress}</span></p>
                  <p><span className="text-neutral-500">Contrôleur :</span> <span className="font-mono-nums">{equipment.accessPoint.controllerIpOrCloud || 'Cloud'}</span></p>
                </div>
              </div>
            )}

            {/* Notes and QR Code Scan */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="col-span-2 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Consignes & Recommandations de Sécurité</span>
                <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                  Conserver ce document en lieu sûr. Toute modification des mots de passe administrateurs ou du plan d'adressage IP doit être signalée au support technique HibTech pour mise à jour du dossier client.
                </p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col items-center justify-center text-center">
                <QRCodeSVG value={qrPayload} size={70} level="M" />
                <span className="text-[9px] text-neutral-400 font-mono-nums mt-1">Scan Inventaire</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-8 border-t border-neutral-300 grid grid-cols-2 gap-8 text-xs font-sans">
              <div className="border border-neutral-200 rounded-xl p-4 min-h-[110px] flex flex-col justify-between">
                <div>
                  <span className="font-bold text-neutral-900 block uppercase text-[10px] tracking-wider">
                    L'Ingénieur Réseau / Technicien
                  </span>
                  <span className="text-[10px] text-neutral-500">Certification de bon fonctionnement</span>
                </div>
                <div className="border-b border-dashed border-neutral-300 pt-8"></div>
              </div>

              <div className="border border-neutral-200 rounded-xl p-4 min-h-[110px] flex flex-col justify-between">
                <div>
                  <span className="font-bold text-neutral-900 block uppercase text-[10px] tracking-wider">
                    Le Responsable Client / Réceptionnaire
                  </span>
                  <span className="text-[10px] text-neutral-500">Réception conforme des accès</span>
                </div>
                <div className="border-b border-dashed border-neutral-300 pt-8"></div>
              </div>
            </div>

            {/* Print Footer */}
            <div className="text-center pt-2 text-[10px] text-neutral-400 font-mono-nums border-t border-neutral-100">
              Fiche technique générée par {settings.name} le {formatDateTime(new Date().toISOString())}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
