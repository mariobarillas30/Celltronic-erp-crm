import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  Percent, 
  Save, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle, 
  RotateCcw,
  Info
} from 'lucide-react';
import { RechargeCommissionSettings } from '../../types';
import { 
  DEFAULT_RECHARGE_COMMISSIONS, 
  saveRechargeCommissionsToFirestore 
} from '../../lib/firestoreUtils';

interface RechargeCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: RechargeCommissionSettings;
  authorName?: string;
  onSavedSuccessfully?: (updated: RechargeCommissionSettings) => void;
}

export const RechargeCommissionModal: React.FC<RechargeCommissionModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  authorName = 'CEO / Propietario',
  onSavedSuccessfully
}) => {
  const [formData, setFormData] = useState<RechargeCommissionSettings>(currentSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state whenever modal opens or props update
  useEffect(() => {
    if (isOpen) {
      setFormData(currentSettings);
      setStatusMessage(null);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handlePercentChange = (
    key: keyof Omit<RechargeCommissionSettings, 'updatedAt' | 'updatedBy'>,
    value: string
  ) => {
    const num = parseFloat(value);
    const validNum = isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
    
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { active: true, notes: '' }),
        commissionPercent: validNum
      }
    }));
  };

  const handleNotesChange = (
    key: keyof Omit<RechargeCommissionSettings, 'updatedAt' | 'updatedBy'>,
    notes: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { commissionPercent: 5.0, active: true }),
        notes
      }
    }));
  };

  const handleResetToDefaults = () => {
    if (window.confirm('¿Desea restablecer todos los porcentajes a los valores recomendados por defecto?')) {
      setFormData(DEFAULT_RECHARGE_COMMISSIONS);
      setStatusMessage({ type: 'success', text: 'Valores restablecidos a predeterminados. Haga clic en Guardar para aplicar en Firestore.' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const result = await saveRechargeCommissionsToFirestore(formData, authorName);
      if (result.success) {
        setStatusMessage({ 
          type: 'success', 
          text: '¡Configuración de comisiones actualizada y sincronizada en tiempo real con Firestore!' 
        });
        if (onSavedSuccessfully) {
          onSavedSuccessfully({
            ...formData,
            updatedAt: new Date().toISOString(),
            updatedBy: authorName
          });
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: result.error || 'Ocurrió un error al guardar en Firestore.' 
        });
      }
    } catch (err: any) {
      setStatusMessage({ 
        type: 'error', 
        text: err?.message || 'Error inesperado al guardar la configuración.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const operatorsConfig: {
    key: 'claro' | 'tigo' | 'movistar' | 'digicel' | 'otra';
    name: string;
    badgeColor: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    accentColor: string;
  }[] = [
    {
      key: 'claro',
      name: 'CLARO',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
      bgColor: 'bg-red-500/5',
      borderColor: 'border-red-500/30 focus-within:border-red-500',
      textColor: 'text-red-400',
      accentColor: 'text-red-300'
    },
    {
      key: 'tigo',
      name: 'TIGO',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      bgColor: 'bg-blue-500/5',
      borderColor: 'border-blue-500/30 focus-within:border-blue-500',
      textColor: 'text-blue-400',
      accentColor: 'text-blue-300'
    },
    {
      key: 'movistar',
      name: 'MOVISTAR',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      bgColor: 'bg-emerald-500/5',
      borderColor: 'border-emerald-500/30 focus-within:border-emerald-500',
      textColor: 'text-emerald-400',
      accentColor: 'text-emerald-300'
    },
    {
      key: 'digicel',
      name: 'DIGICEL',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      bgColor: 'bg-amber-500/5',
      borderColor: 'border-amber-500/30 focus-within:border-amber-500',
      textColor: 'text-amber-400',
      accentColor: 'text-amber-300'
    },
    {
      key: 'otra',
      name: 'OTRAS COMPAÑÍAS / PAQUETES',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      bgColor: 'bg-purple-500/5',
      borderColor: 'border-purple-500/30 focus-within:border-purple-500',
      textColor: 'text-purple-400',
      accentColor: 'text-purple-300'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Comisiones de Recargas (Firestore)
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Solo CEO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configuración en tiempo real del margen y porcentaje de ganancia por compañía
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Scroll Area */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Info Card */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-start gap-3 text-cyan-300 text-xs">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-cyan-200">
                Cálculo Automático del Cuadre Dual
              </p>
              <p className="text-cyan-300/80 leading-relaxed">
                Al ingresar el precio de venta en el POS de recargas, el sistema calculará automáticamente el <strong>Costo Real Privado</strong>: <code className="text-white bg-slate-950/60 px-1.5 py-0.5 rounded text-[11px] font-mono">Costo = Venta × (1 - Comisión%)</code>. 
                Los cajeros nunca verán este margen.
              </p>
            </div>
          </div>

          {/* Status Message Alert */}
          {statusMessage && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Operator Commissions Grid */}
          <div className="space-y-3.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Porcentajes de Ganancia / Comisión por Operador
            </label>

            {operatorsConfig.map((op) => {
              const currentOpData = formData[op.key] || { commissionPercent: 5.0, active: true, notes: '' };
              const percentVal = currentOpData.commissionPercent;
              
              // Example calculation with $10.00
              const sampleSale = 10;
              const sampleGain = (sampleSale * percentVal) / 100;
              const sampleCost = sampleSale - sampleGain;

              return (
                <div 
                  key={op.key}
                  className={`p-4 rounded-2xl border transition-all ${op.bgColor} ${op.borderColor} ${
                    !currentOpData.active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Operator Label & Status */}
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${op.badgeColor}`}>
                        {op.name}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-white">
                          Comisión Ganancia: <strong className={`font-mono text-sm ${op.textColor}`}>{percentVal.toFixed(1)}%</strong>
                        </span>
                        <p className="text-[11px] text-slate-400">
                          Ejemplo en $10.00: Costo <strong>${sampleCost.toFixed(2)}</strong> | Ganancia <strong className="text-emerald-400">+${sampleGain.toFixed(2)}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Numeric Input & Quick Percentages */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={percentVal}
                          onChange={(e) => handlePercentChange(op.key, e.target.value)}
                          className="w-24 pl-3 pr-7 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                        <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Notes / Description */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-3 text-[11px]">
                    <input
                      type="text"
                      value={currentOpData.notes || ''}
                      onChange={(e) => handleNotesChange(op.key, e.target.value)}
                      placeholder="Nota descriptiva (opcional, ej. Recargas electrónicas prepago)..."
                      className="w-full bg-transparent border-none text-slate-300 placeholder-slate-600 focus:outline-none text-[11px]"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      {[5.0, 6.0, 6.5, 7.0, 8.0, 10.0].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handlePercentChange(op.key, String(preset))}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                            percentVal === preset
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sync Metadata */}
          {formData.updatedAt && (
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800">
              <span>Última modificación: {new Date(formData.updatedAt).toLocaleString()}</span>
              <span>Modificado por: {formData.updatedBy || 'CEO'}</span>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Predeterminados</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Guardando en Firestore...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
