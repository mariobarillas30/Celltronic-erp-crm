import React from 'react';
import logoImage from '../../assets/images/celltronic_logo_1786725587026.jpg';

interface CelltronicLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'emblem' | 'header' | 'sidebar';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const CelltronicLogo: React.FC<CelltronicLogoProps> = ({
  size = 'md',
  variant = 'full',
  showSubtitle = true,
  className = '',
  onClick
}) => {
  // Dimension styles based on size
  const getImageDimensions = () => {
    switch (size) {
      case 'xs':
        return 'w-8 h-8';
      case 'sm':
        return 'w-9 h-9';
      case 'md':
        return 'w-11 h-11';
      case 'lg':
        return 'w-16 h-16 sm:w-20 sm:h-20';
      case 'xl':
        return 'w-24 h-24 sm:w-32 sm:h-32';
      default:
        return 'w-11 h-11';
    }
  };

  if (variant === 'emblem') {
    return (
      <div 
        className={`inline-flex items-center justify-center rounded-xl overflow-hidden bg-black p-0.5 border border-lime-500/30 shadow-md shadow-lime-950/20 shrink-0 ${getImageDimensions()} ${className}`}
        onClick={onClick}
      >
        <img 
          src={logoImage} 
          alt="CELLTRONIC Logo" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain rounded-lg" 
        />
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div 
        className={`flex items-center gap-2.5 sm:gap-3 ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
        onClick={onClick}
      >
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-black p-0.5 border border-lime-500/40 shadow-sm shrink-0 flex items-center justify-center">
          <img 
            src={logoImage} 
            alt="CELLTRONIC Logo" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain rounded-lg" 
          />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 font-sans">
              CELLTRONIC
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-lime-500/15 text-lime-700 border border-lime-500/30 uppercase tracking-wide">
              ERP
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 tracking-wide uppercase truncate">
              Servicio Técnico Profesional
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div 
        className={`flex items-center gap-3 ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
        onClick={onClick}
      >
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-black p-0.5 border border-lime-500/40 shadow-lg shadow-lime-950/40 shrink-0 flex items-center justify-center">
          <img 
            src={logoImage} 
            alt="CELLTRONIC Logo" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain rounded-lg" 
          />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-base text-white tracking-tight font-sans">
              CELLTRONIC
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-lime-500/20 text-lime-400 border border-lime-500/30">
              ERP
            </span>
          </div>
          <span className="text-[10px] font-semibold text-lime-400/90 tracking-wider uppercase">
            Servicio Técnico Profesional
          </span>
        </div>
      </div>
    );
  }

  // Default 'full' variant
  return (
    <div 
      className={`flex flex-col items-center text-center ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
      onClick={onClick}
    >
      <div className={`rounded-2xl overflow-hidden bg-black p-1 border-2 border-lime-500/40 shadow-2xl shadow-lime-950/50 flex items-center justify-center shrink-0 ${getImageDimensions()}`}>
        <img 
          src={logoImage} 
          alt="CELLTRONIC Logo" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain rounded-xl" 
        />
      </div>
      {showSubtitle && (
        <div className="mt-3 flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
              CELLTRONIC
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-400 border border-lime-500/40">
              ERP v2.6
            </span>
          </div>
          <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase mt-0.5">
            Servicio Técnico Profesional
          </span>
        </div>
      )}
    </div>
  );
};
