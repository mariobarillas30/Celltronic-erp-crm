import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  DollarSign, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Smartphone,
  Wallet
} from 'lucide-react';
import { RechargeBalance, RechargeOperator } from '../../types';
import { 
  ALL_RECHARGE_OPERATORS, 
  addRechargeBalanceTransaction, 
  dollarsToCents, 
  formatCents 
} from '../../lib/rechargeServices';

interface AddBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: Record<string, RechargeBalance>;
  currentUserUid: string;
  currentUserName: string;
  defaultOperator?: RechargeOperator;
  onSuccess?: () => void;
}

export const AddBalanceModal: React.FC<AddBalanceModalProps> = ({
  isOpen,
  onClose,
  balances,
  currentUserUid,
  currentUserName,
  defaultOperator = 'Claro',
  onSuccess
}) => {
  const [operator, setOperator] = useState<RechargeOperator>(defaultOperator);
  const [amountDollars, setAmountDollars] = useState<string>('50.00');
  const [notes, setNotes] = useState<string>('Compra / Inyección de saldo para ventas');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOpKey = operator.toLowerCase();
  const currentBalance = balances[currentOpKey]?.availableBalanceCents ?? 0;
  const inputAmountCents = dollarsToCents(amountDollars);
  const previewNewBalanceCents = currentBalance + inputAmountCents;

  const handleQuickAmount = (val: string) => {
    setAmountDollars(val);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (inputAmountCents <= 0) {
      setErrorMessage('Por favor ingrese un monto válido mayor a $0.00');
      return;
    }

    setIsSubmitting(true);

    try {
      await addRechargeBalanceTransaction({
        operator,
        amountCents: inputAmountCents,
        userUid: currentUserUid,
        userName: currentUserName,
        notes
      });

      setSuccessMessage(`¡Saldo de ${operator} recargado con éxito! Nuevo saldo: ${formatCents(previewNewBalanceCents)}`);
      
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
        setAmountDollars('50.00');
      }, 1500);
    } catch (err: any) {
      console.error('Error adding balance:', err);
      setErrorMessage(err?.message || 'Ocurrió un error al registrar la recarga de saldo.');
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
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Comprar / Recargar Saldo</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Solo CEO
                </span>
              </div>
              <p className="text-xs text-slate-400">Inyección de saldo independiente por compañía</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Operator Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Seleccione la Compañía Telefónica *
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ALL_RECHARGE_OPERATORS.map((op) => {
                const isSelected = operator === op;
                return (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperator(op)}
                    className={`py-2.5 px-2 rounded-2xl font-bold text-xs border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
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

          {/* Current vs Projected Balance Card */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Saldo Disponible Actual</p>
              <p className="text-lg font-mono font-bold text-slate-200 mt-0.5">
                {formatCents(currentBalance)}
              </p>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <p className="text-[11px] text-emerald-400 font-medium">Saldo Proyectado</p>
              <p className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                {formatCents(previewNewBalanceCents)}
              </p>
            </div>
          </div>

          {/* Amount input & Quick Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Monto a Comprar ($ USD) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0.50"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                placeholder="ej. 100.00"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-800/90 border border-slate-700 rounded-2xl text-white font-mono font-bold text-lg placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {['25.00', '50.00', '75.00', '100.00', '150.00', '200.00', '300.00'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleQuickAmount(chip)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-mono font-semibold transition-all cursor-pointer ${
                    amountDollars === chip
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  +${chip}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Concepto / Referencia de Compra (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ej. Compra directa mayorista depósito bancario"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              <span>Confirmar Inyección de Saldo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
