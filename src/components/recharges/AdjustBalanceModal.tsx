import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sliders, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Smartphone, 
  ArrowUpCircle, 
  ArrowDownCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { RechargeBalance, RechargeOperator, RechargeAdjustmentType } from '../../types';
import { 
  ALL_RECHARGE_OPERATORS, 
  executeRechargeBalanceAdjustmentTransaction, 
  dollarsToCents, 
  centsToDollars, 
  formatCents 
} from '../../lib/rechargeServices';

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: Record<string, RechargeBalance>;
  currentUserUid: string;
  currentUserName: string;
  defaultOperator?: RechargeOperator;
  onSuccess?: () => void;
}

const PREDEFINED_REASONS = [
  'Faltante detectado en cuadre de cajero',
  'Diferencia con proveedor',
  'Corrección administrativa',
  'Conciliación de saldo',
  'Error de digitación',
  'Otro'
];

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  isOpen,
  onClose,
  balances,
  currentUserUid,
  currentUserName,
  defaultOperator = 'Claro',
  onSuccess
}) => {
  const [operator, setOperator] = useState<RechargeOperator>(defaultOperator);
  const [adjustmentType, setAdjustmentType] = useState<RechargeAdjustmentType>('DISMINUCION');
  const [amountDollars, setAmountDollars] = useState<string>('5.00');
  const [selectedReasonPreset, setSelectedReasonPreset] = useState<string>(PREDEFINED_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync default operator when modal opens
  useEffect(() => {
    if (isOpen) {
      setOperator(defaultOperator);
      setStep('form');
      setErrorMessage(null);
      setSuccessMessage(null);
      setAmountDollars('5.00');
      setSelectedReasonPreset(PREDEFINED_REASONS[0]);
      setCustomReason('');
    }
  }, [isOpen, defaultOperator]);

  if (!isOpen) return null;

  const currentOpKey = operator.toLowerCase();
  const currentBalanceCents = balances[currentOpKey]?.availableBalanceCents ?? 0;
  const inputAmountCents = dollarsToCents(amountDollars);
  
  const isIncrease = adjustmentType === 'AUMENTO';
  const projectedBalanceCents = isIncrease 
    ? currentBalanceCents + inputAmountCents 
    : currentBalanceCents - inputAmountCents;

  const isNegativeProjected = projectedBalanceCents < 0;

  const finalReason = selectedReasonPreset === 'Otro' 
    ? customReason.trim() 
    : selectedReasonPreset;

  const handleQuickAmount = (val: string) => {
    setAmountDollars(val);
    setErrorMessage(null);
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (inputAmountCents <= 0) {
      setErrorMessage('Por favor ingrese un monto válido mayor a $0.00.');
      return;
    }

    if (isNegativeProjected) {
      setErrorMessage('No es posible realizar el ajuste. El saldo resultante no puede ser negativo.');
      return;
    }

    if (!finalReason) {
      setErrorMessage('Debe especificar un motivo obligatorio para el ajuste.');
      return;
    }

    setStep('confirm');
  };

  const handleExecuteAdjustment = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (inputAmountCents <= 0) {
      setErrorMessage('El monto debe ser mayor a $0.00.');
      setStep('form');
      return;
    }

    if (isNegativeProjected) {
      setErrorMessage('No es posible realizar el ajuste. El saldo resultante no puede ser negativo.');
      setStep('form');
      return;
    }

    if (!finalReason) {
      setErrorMessage('Debe especificar un motivo obligatorio para el ajuste.');
      setStep('form');
      return;
    }

    setIsSubmitting(true);

    try {
      await executeRechargeBalanceAdjustmentTransaction({
        operator,
        type: adjustmentType,
        amountCents: inputAmountCents,
        reason: finalReason,
        userUid: currentUserUid,
        userName: currentUserName
      });

      setSuccessMessage(
        `¡Ajuste de saldo para ${operator} aplicado con éxito! Nuevo saldo disponible: ${formatCents(projectedBalanceCents)}`
      );

      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
        setStep('form');
      }, 1500);
    } catch (err: any) {
      console.error('Error executing balance adjustment:', err);
      setErrorMessage(
        err?.message || 'Ocurrió un error al procesar el ajuste de saldo en la base de datos.'
      );
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Ajustar Saldo de Recargas</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Exclusivo CEO
                </span>
              </div>
              <p className="text-xs text-slate-400">Corrección administrativa manual de saldo por operador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: FORM VIEW */}
        {step === 'form' && (
          <form onSubmit={handleProceedToConfirm} className="p-6 space-y-5">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Operator Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                1. Seleccione la Compañía Telefónica *
              </label>
              <div className="grid grid-cols-5 gap-2">
                {ALL_RECHARGE_OPERATORS.map((op) => {
                  const isSelected = operator === op;
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => {
                        setOperator(op);
                        setErrorMessage(null);
                      }}
                      className={`py-2 px-1.5 rounded-2xl font-bold text-xs border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? op === 'Claro'
                            ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30'
                            : op === 'Tigo'
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                            : op === 'Movistar'
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                            : op === 'Digicel'
                            ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/30'
                            : 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 opacity-80" />
                      <span>{op}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type of Adjustment: Increase or Decrease */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                2. Tipo de Ajuste *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustmentType('AUMENTO');
                    setErrorMessage(null);
                  }}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2.5 ${
                    adjustmentType === 'AUMENTO'
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/30'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>AUMENTAR SALDO (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdjustmentType('DISMINUCION');
                    setErrorMessage(null);
                  }}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2.5 ${
                    adjustmentType === 'DISMINUCION'
                      ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400/30'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>DISMINUIR SALDO (-)</span>
                </button>
              </div>
            </div>

            {/* Amount input with decimals */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                3. Monto del Ajuste (hasta 2 decimales) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountDollars}
                  onChange={(e) => {
                    setAmountDollars(e.target.value);
                    setErrorMessage(null);
                  }}
                  required
                  className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white font-mono text-xl font-bold placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="0.00"
                />
              </div>

              {/* Quick decimal presets */}
              <div className="flex flex-wrap gap-2 mt-2.5">
                {['0.50', '1.00', '1.15', '2.50', '5.00', '10.00', '25.00'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickAmount(preset)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                      amountDollars === preset
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Balance Comparison Card */}
            <div className={`p-4 rounded-2xl border grid grid-cols-3 gap-2 font-mono ${
              isNegativeProjected 
                ? 'bg-red-950/30 border-red-500/40' 
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div>
                <p className="text-[10px] text-slate-400 font-sans font-medium">Saldo Actual</p>
                <p className="text-sm font-bold text-slate-200 mt-0.5">
                  {formatCents(currentBalanceCents)}
                </p>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-sans font-medium">Ajuste</p>
                <p className={`text-sm font-bold mt-0.5 ${
                  isIncrease ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isIncrease ? '+' : '-'}{formatCents(inputAmountCents)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-sans font-medium">Nuevo Saldo</p>
                <p className={`text-sm font-bold mt-0.5 ${
                  isNegativeProjected 
                    ? 'text-red-400 font-black' 
                    : isIncrease 
                    ? 'text-emerald-400' 
                    : 'text-amber-400'
                }`}>
                  {formatCents(projectedBalanceCents)}
                </p>
              </div>

              {isNegativeProjected && (
                <div className="col-span-3 pt-2 mt-1 border-t border-red-500/20 text-[11px] font-sans text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>No es posible realizar el ajuste. El saldo resultante no puede ser negativo.</span>
                </div>
              )}
            </div>

            {/* Mandatory Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                4. Motivo Obligatorio del Ajuste *
              </label>
              <select
                value={selectedReasonPreset}
                onChange={(e) => {
                  setSelectedReasonPreset(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500"
              >
                {PREDEFINED_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {selectedReasonPreset === 'Otro' && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => {
                      setCustomReason(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Escriba la justificación administrativa detallada..."
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Submit to Confirm Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isNegativeProjected || inputAmountCents <= 0 || !finalReason}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Revisar y Confirmar</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: CLEAR CONFIRMATION STEP */}
        {step === 'confirm' && (
          <div className="p-6 space-y-5 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-white">Confirmación de Ajuste Administrativo</p>
                <p className="text-slate-300 mt-1">
                  Esta acción modificará directamente el saldo disponible de {operator} en Firestore de forma atómica y quedará registrada en el historial inmutable de auditoría.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 font-sans">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Compañía:</span>
                <span className="font-bold text-white text-sm">{operator}</span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Saldo actual:</span>
                <span className="font-mono font-bold text-slate-200">
                  {formatCents(currentBalanceCents)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Tipo de operación:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  isIncrease 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {isIncrease ? 'AUMENTO (+)' : 'DISMINUCIÓN (-)'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Monto del ajuste:</span>
                <span className={`font-mono font-extrabold text-sm ${
                  isIncrease ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isIncrease ? '+' : '-'}{formatCents(inputAmountCents)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Nuevo saldo resultante:</span>
                <span className="font-mono font-extrabold text-white text-base">
                  {formatCents(projectedBalanceCents)}
                </span>
              </div>

              <div className="flex justify-between items-start text-xs pt-1">
                <span className="text-slate-400 shrink-0">Motivo:</span>
                <span className="text-amber-300 font-medium text-right ml-4">
                  {finalReason}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('form')}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Volver a Modificar
              </button>

              <button
                type="button"
                onClick={handleExecuteAdjustment}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Aplicando Ajuste Atómico...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Ajuste</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
