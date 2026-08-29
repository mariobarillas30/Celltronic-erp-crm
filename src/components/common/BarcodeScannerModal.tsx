import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertTriangle, CheckCircle2, ScanLine } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
  continuous?: boolean; // if true, stays open after scan (e.g. for POS multi-scan)
}

// Function to play a quick beep upon successful barcode scan
const playScanBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, audioCtx.currentTime); // A6 note
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    // Audio context may be restricted before user gesture, ignore silently
  }
};

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras',
  subtitle = 'Apunte la cámara hacia el código de barra o QR del producto',
  continuous = false,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const scannerContainerId = useRef(`barcode-scanner-${Math.random().toString(36).substring(2, 9)}`).current;

  useEffect(() => {
    if (!isOpen) return;

    setIsInitializing(true);
    setCameraError(null);
    setLastScannedCode(null);

    let isMounted = true;

    const startScanner = async () => {
      // Short delay for modal DOM node to mount
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (!isMounted) return;

      try {
        const scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            const now = Date.now();
            // Debounce identical scans within 1.5 seconds in continuous mode
            if (now - lastScanTimestampRef.current < 1500 && lastScannedCode === decodedText) {
              return;
            }
            lastScanTimestampRef.current = now;
            setLastScannedCode(decodedText);
            playScanBeep();

            onScan(decodedText.trim());

            if (!continuous) {
              // Close after brief visual confirmation
              setTimeout(() => {
                onClose();
              }, 400);
            }
          },
          () => {
            // Frame parse ignore
          }
        );

        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setIsInitializing(false);
          setCameraError(
            err?.message ||
              'No se pudo acceder a la cámara. Asegúrese de otorgar permisos de cámara en su navegador o móvil.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      const currentScanner = scannerRef.current;
      scannerRef.current = null;
      if (currentScanner) {
        try {
          if (currentScanner.isScanning) {
            currentScanner
              .stop()
              .then(() => {
                try {
                  currentScanner.clear();
                } catch {
                  // ignore
                }
              })
              .catch(() => {});
          } else {
            try {
              currentScanner.clear();
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, scannerContainerId, continuous]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport Body */}
        <div className="p-4 flex flex-col items-center justify-center relative bg-slate-950 min-h-[300px]">
          {isInitializing && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-slate-950 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              <span>Iniciando sensor de cámara...</span>
            </div>
          )}

          {cameraError ? (
            <div className="p-5 text-center space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Acceso a Cámara no disponible</h4>
                <p className="text-xs text-red-300/80 leading-relaxed">{cameraError}</p>
              </div>
              <p className="text-[11px] text-slate-400">
                Puede ingresar el código manualmente o utilizar un lector de código de barras físico USB/Bluetooth.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Cerrar y Escribir Manual
              </button>
            </div>
          ) : (
            <div className="w-full relative rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
              <div id={scannerContainerId} className="w-full h-full min-h-[260px]" />
              
              {/* Scan target visual overlay frame */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-36 border-2 border-blue-400/80 rounded-xl relative shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <ScanLine className="w-48 h-6 text-blue-400/70 animate-pulse" />
                  </div>
                  {/* Corner notches */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></div>
                </div>
              </div>
            </div>
          )}

          {/* Scanned code feedback notification */}
          {lastScannedCode && (
            <div className="mt-3 w-full p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-200 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Detectado: <strong className="font-mono text-white">{lastScannedCode}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Instructions */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">Soporta Código de Barras (EAN, UPC, Code128) y QR</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
