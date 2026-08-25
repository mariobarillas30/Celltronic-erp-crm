import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Eye, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  subLabel?: string;
  value?: string;
  onChange: (base64Url: string) => void;
  required?: boolean;
}

// Automatic image compression helper using Canvas (max 1080px width, 80% JPEG quality)
const compressImage = (imageSource: string | File): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      const maxWidth = 1080;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG with 80% quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.80);
        resolve(compressedBase64);
      } else {
        resolve(typeof imageSource === 'string' ? imageSource : '');
      }
    };

    img.onerror = () => {
      resolve(typeof imageSource === 'string' ? imageSource : '');
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageSource);
    }
  });
};

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  subLabel,
  value,
  onChange,
  required = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressedBase64 = await compressImage(file);
      onChange(compressedBase64);
    } catch {
      alert('Error al comprimir la imagen.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      alert('No se pudo acceder a la cámara. Por favor selecciona una imagen desde tus archivos.');
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const rawBase64 = canvas.toDataURL('image/jpeg', 0.95);
      stopCamera();
      setIsCompressing(true);
      const compressedBase64 = await compressImage(rawBase64);
      onChange(compressedBase64);
      setIsCompressing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {subLabel && <span className="text-xs text-slate-500">{subLabel}</span>}
      </div>

      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-video max-h-48 flex items-center justify-center">
          <img src={value} alt={label} className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-md"
            >
              <Eye className="w-4 h-4" /> Ver
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-md"
            >
              <X className="w-4 h-4" /> Eliminar
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-800/50 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {isCompressing ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-300">Comprimiendo imagen (Max 1080px, 80% calidad)...</p>
            </div>
          ) : isCapturing ? (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-52 mx-auto">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" /> Tomar Foto
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Sube una imagen o toma una foto directamente
              </p>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" /> Subir Archivo
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" /> Usar Cámara
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Preview Modal */}
      {showPreviewModal && value && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl p-4 overflow-hidden shadow-2xl">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-200 hover:text-white rounded-full z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">{label}</h3>
            <img src={value} alt={label} className="max-h-[75vh] w-full object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};
