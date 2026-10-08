import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductOrService } from '../../types';
import {
  Camera,
  X,
  ScanLine,
  Zap,
  Package,
  AlertCircle,
  CheckCircle2,
  Volume2,
  RefreshCw,
} from 'lucide-react';

interface PosBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (product: ProductOrService) => void;
}

export const PosBarcodeScannerModal: React.FC<PosBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const { products } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);

  // Available products with barcode or code for quick test simulator
  const scannableProducts = products.filter(
    (p) => p.isActive && p.type === 'PRODUCT'
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detectorInterval: any = null;

    if (isOpen) {
      // Try to open camera if available
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'environment' } })
          .then((mediaStream) => {
            stream = mediaStream;
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              videoRef.current.play().catch(() => {});
              setCameraActive(true);
            }

            // Check if BarcodeDetector is supported
            if ('BarcodeDetector' in window) {
              try {
                const detector = new (window as any).BarcodeDetector({
                  formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a'],
                });

                detectorInterval = setInterval(async () => {
                  if (videoRef.current && videoRef.current.readyState === 4) {
                    try {
                      const barcodes = await detector.detect(videoRef.current);
                      if (barcodes.length > 0) {
                        const rawValue = barcodes[0].rawValue;
                        handleMatchedCode(rawValue);
                      }
                    } catch (e) {
                      // ignore frame error
                    }
                  }
                }, 400);
              } catch (e) {
                // detector not supported
              }
            }
          })
          .catch((err) => {
            setCameraError(
              "Caméra non accessible ou autorisations requises. Utilisez la douchette USB ou le simulateur de codes ci-dessous."
            );
            setCameraActive(false);
          });
      } else {
        setCameraError(
          "Navigateur sans support de caméra directe. Utilisez la douchette code-barres USB ou les boutons de test."
        );
      }
    }

    return () => {
      if (detectorInterval) clearInterval(detectorInterval);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const handleMatchedCode = (codeText: string) => {
    const clean = codeText.trim().toLowerCase();
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        p.code.toLowerCase() === clean
    );

    if (found) {
      setLastScannedText(`${found.name} (${found.code})`);
      onScanSuccess(found);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-neutral-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <ScanLine className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Scanner de Codes-Barres</h3>
              <p className="text-[11px] text-neutral-400">
                Caméra vidéo & Banc de test rapide d'articles
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-4 bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px]">
          {cameraActive ? (
            <div className="relative w-full max-w-sm aspect-video rounded-xl overflow-hidden border-2 border-emerald-500/50 shadow-inner">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Laser scan line overlay */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-mono">
                Centrez le code-barres ici
              </div>
            </div>
          ) : (
            <div className="text-center p-6 text-neutral-400 space-y-2 max-w-sm">
              <Camera className="w-10 h-10 text-neutral-600 mx-auto stroke-1" />
              <p className="text-xs text-neutral-300">
                {cameraError || "Initialisation de la caméra..."}
              </p>
              <p className="text-[11px] text-neutral-500">
                Astuce : Vous pouvez aussi scanner avec votre douchette USB directement dans le champ de recherche de la caisse.
              </p>
            </div>
          )}

          {lastScannedText && (
            <div className="mt-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Dernier article scanné : <strong>{lastScannedText}</strong></span>
            </div>
          )}
        </div>

        {/* Instant Test Simulator Bank */}
        <div className="p-4 overflow-y-auto flex-1 bg-neutral-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Simuler un scan de produit (1-Clic)
            </span>
            <span className="text-[11px] text-neutral-500">
              Cliquez pour tester l'ajout immédiat au panier
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {scannableProducts.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleMatchedCode(p.barcode || p.code)}
                className="p-2.5 bg-white border border-neutral-200 hover:border-amber-400 hover:bg-amber-50/40 rounded-xl text-left transition-all flex items-center justify-between gap-2 group shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-xs text-neutral-900 block truncate group-hover:text-amber-900">
                    {p.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-500 font-mono-nums">
                    <span className="bg-neutral-100 px-1 rounded">Réf: {p.code}</span>
                    {p.barcode && <span className="text-blue-600">EAN: {p.barcode}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-xs text-neutral-900 block font-mono-nums">
                    ${p.priceUSD.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold block">
                    + Scanné
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white border-t border-neutral-200 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">
            Émet un bip sonore et ajoute directement l'article au panier
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            Fermer le Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
