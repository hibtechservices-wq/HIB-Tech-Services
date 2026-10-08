import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { NetworkEquipment, EquipmentType, EquipmentStatus } from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { downloadElementAsPDF } from '../../utils/pdfGenerator';
import { Printer, Download, Filter, Radio, Video, HardDrive, Router as RouterIcon, Wifi, X, Shield, Loader2 } from 'lucide-react';

interface EquipmentsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EquipmentsReportModal: React.FC<EquipmentsReportModalProps> = ({ isOpen, onClose }) => {
  const { equipments, settings } = useApp();

  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const filteredEquipments = useMemo(() => {
    return equipments.filter((eq) => {
      if (selectedType !== 'ALL' && eq.type !== selectedType) return false;
      if (selectedStatus !== 'ALL' && eq.status !== selectedStatus) return false;
      return true;
    });
  }, [equipments, selectedType, selectedStatus]);

  const summary = useMemo(() => {
    const starlinkCount = equipments.filter((e) => e.type === 'STARLINK').length;
    const cctvCount = equipments.filter((e) => e.type === 'CCTV_CAMERA').length;
    const nvrCount = equipments.filter((e) => e.type === 'NVR_DVR').length;
    const routerCount = equipments.filter((e) => e.type === 'ROUTER').length;
    const apCount = equipments.filter((e) => e.type === 'ACCESS_POINT').length;
    const activeCount = equipments.filter((e) => e.status === 'ACTIVE').length;

    return {
      total: equipments.length,
      starlinkCount,
      cctvCount,
      nvrCount,
      routerCount,
      apCount,
      activeCount,
    };
  }, [equipments]);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const filename = `Inventaire_Parc_Equipements_${new Date().toISOString().slice(0, 10)}.pdf`;
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
        {/* Modal Controls */}
        <div className="print:hidden p-4 border-b border-neutral-200 bg-neutral-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-800 text-sky-400 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Inventaire & État du Parc Équipements (PDF)</h2>
              <p className="text-xs text-neutral-400">Rapport technique Starlink, Caméras CCTV, NVR, Routeurs et Bornes AP</p>
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

        {/* Filters Bar */}
        <div className="print:hidden p-4 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-700">Type :</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800"
            >
              <option value="ALL">Tous les types ({equipments.length})</option>
              <option value="STARLINK">Starlink ({summary.starlinkCount})</option>
              <option value="CCTV_CAMERA">Caméras CCTV ({summary.cctvCount})</option>
              <option value="NVR_DVR">NVR / Enregistreurs ({summary.nvrCount})</option>
              <option value="ROUTER">Routeurs / Firewalls ({summary.routerCount})</option>
              <option value="ACCESS_POINT">Bornes WiFi AP ({summary.apCount})</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-700">Statut :</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIVE">En service (Actif)</option>
              <option value="MAINTENANCE">En Maintenance</option>
              <option value="OFFLINE">Hors-ligne</option>
            </select>
          </div>

          <span className="text-neutral-500 ml-auto">{filteredEquipments.length} équipement(s) listé(s)</span>
        </div>

        {/* Print Content */}
        <div ref={printAreaRef} className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-neutral-900 print:p-0">
          <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-6 mb-6">
            <div>
              <h1 className="text-xl font-black text-neutral-950 uppercase tracking-tight">{settings.name}</h1>
              <p className="text-xs text-neutral-600 font-medium">{settings.slogan}</p>
              <p className="text-xs text-neutral-600 mt-1">{settings.address}, {settings.city} - RDC</p>
              <div className="text-[11px] text-neutral-500 font-mono mt-1">
                Département Télécoms, Réseaux & Sécurité Électronique
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-neutral-900 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2">
                ÉTAT DU PARC ÉQUIPEMENTS
              </div>
              <p className="text-xs text-neutral-500">Date d'édition : {formatDateTime(new Date().toISOString())}</p>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-6 gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl mb-6 text-center text-xs">
            <div>
              <p className="text-neutral-500 text-[10px]">Total Parc</p>
              <p className="text-sm font-bold text-neutral-900">{summary.total}</p>
            </div>
            <div>
              <p className="text-sky-700 text-[10px]">Starlink</p>
              <p className="text-sm font-bold text-sky-700">{summary.starlinkCount}</p>
            </div>
            <div>
              <p className="text-emerald-700 text-[10px]">Caméras</p>
              <p className="text-sm font-bold text-emerald-700">{summary.cctvCount}</p>
            </div>
            <div>
              <p className="text-purple-700 text-[10px]">NVR/DVR</p>
              <p className="text-sm font-bold text-purple-700">{summary.nvrCount}</p>
            </div>
            <div>
              <p className="text-amber-700 text-[10px]">Routeurs</p>
              <p className="text-sm font-bold text-amber-700">{summary.routerCount}</p>
            </div>
            <div>
              <p className="text-blue-700 text-[10px]">Bornes AP</p>
              <p className="text-sm font-bold text-blue-700">{summary.apCount}</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-300 bg-neutral-100 text-neutral-700 font-bold uppercase text-[10px]">
                <th className="py-2 px-3">Équipement</th>
                <th className="py-2 px-3">Client & Site</th>
                <th className="py-2 px-3">N° Série / MAC</th>
                <th className="py-2 px-3">Paramètre IP / SSID</th>
                <th className="py-2 px-3">Date Inst.</th>
                <th className="py-2 px-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredEquipments.map((eq) => {
                const ipOrSsid =
                  eq.starlink?.publicIpOrCgnat ||
                  eq.cctvCamera?.ipAddress ||
                  eq.nvrDvr?.ipAddress ||
                  eq.router?.ipLanGateway ||
                  eq.accessPoint?.ipAddress ||
                  'DHCP';
                return (
                  <tr key={eq.id} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-neutral-900">{eq.name}</p>
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase">{eq.type}</span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-800">
                      <p className="font-medium">{eq.clientName}</p>
                      <p className="text-[11px] text-neutral-500">{eq.siteName}</p>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-700">
                      <p>{eq.serialNumber}</p>
                      {eq.macAddress && <p className="text-[10px] text-neutral-400">{eq.macAddress}</p>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-800">
                      <p className="font-semibold text-sky-800">{ipOrSsid}</p>
                      {(eq.starlink?.wifiSsid || eq.accessPoint?.primarySsid) && (
                        <p className="text-[10px] text-neutral-500">SSID: {eq.starlink?.wifiSsid || eq.accessPoint?.primarySsid}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600 text-[11px]">{formatDate(eq.installationDate)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        eq.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : eq.status === 'MAINTENANCE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {eq.status === 'ACTIVE' ? 'EN SERVICE' : eq.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'HORS-LIGNE'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-8 pt-4 border-t border-neutral-200 flex justify-between text-[11px] text-neutral-500">
            <span>Rapport d'inventaire technique de {settings.name}</span>
            <span>Document confidentiel d'administration réseau</span>
          </div>
        </div>
      </div>
    </div>
  );
};
