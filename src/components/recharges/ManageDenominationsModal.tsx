import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign,
  Tag,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { RechargeDenomination, RechargeOperator } from '../../types';
import { 
  ALL_RECHARGE_OPERATORS, 
  deleteRechargeDenomination, 
  dollarsToCents, 
  formatCents, 
  saveRechargeDenomination 
} from '../../lib/rechargeServices';

interface ManageDenominationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  denominations: RechargeDenomination[];
}

export const ManageDenominationsModal: React.FC<ManageDenominationsModalProps> = ({
  isOpen,
  onClose,
  denominations
}) => {
  const [amountInput, setAmountInput] = useState<string>('1.15');
  const [operatorTarget, setOperatorTarget] = useState<RechargeOperator | 'TODOS'>('TODOS');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleAddDenomination = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cents = dollarsToCents(amountInput);
    if (cents <= 0) {
      setStatusMessage({ type: 'error', text: 'Ingrese un monto válido mayor a $0.00' });
      return;
    }

    // Check if already exists for this operator
    const exists = denominations.some(
      (d) => d.amountCents === cents && (d.operator === operatorTarget || operatorTarget === 'TODOS')
    );

    if (exists) {
      setStatusMessage({ 
        type: 'error', 
        text: `Ya existe una denominación de ${formatCents(cents)} para ${operatorTarget}.` 
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveRechargeDenomination({
        amountCents: cents,
        label: formatCents(cents),
        active: true,
        operator: operatorTarget,
        order: cents
      });

      setStatusMessage({ 
        type: 'success', 
        text: `¡Denominación ${formatCents(cents)} agregada correctamente!` 
      });
      setAmountInput('');
    } catch (err: any) {
      console.error('Error adding denomination:', err);
      setStatusMessage({ type: 'error', text: err?.message || 'Error al guardar denominación.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (denom: RechargeDenomination) => {
    try {
      await saveRechargeDenomination({
        ...denom,
        active: !denom.active
      });
    } catch (err: any) {
      console.error('Error toggling denomination:', err);
      alert(`Error al actualizar denominación: ${err?.message || 'Error de conexión'}`);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (window.confirm(`¿Está seguro de eliminar la denominación ${label}?`)) {
      try {
        await deleteRechargeDenomination(id);
      } catch (err: any) {
        console.error('Error deleting denomination:', err);
        alert(`Error al eliminar: ${err?.message}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Denominaciones Autorizadas</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Solo CEO
                </span>
              </div>
              <p className="text-xs text-slate-400">Montos rápidos de venta para cajeros (admite decimales)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Add New Denomination Form */}
          <form
            onSubmit={handleAddDenomination}
            className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3"
          >
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Agregar Nueva Denominación
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Monto ($ Decimales ej: 1.15, 2.50) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="ej. 1.15"
                    required
                    className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Compañía
                </label>
                <select
                  value={operatorTarget}
                  onChange={(e) => setOperatorTarget(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-cyan-500"
                >
                  <option value="TODOS">TODAS (General)</option>
                  {ALL_RECHARGE_OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>
          </form>

          {/* Current Denominations List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-300">
                Denominaciones Activas ({denominations.length})
              </h4>
              <p className="text-[11px] text-slate-500">
                El cajero solo verá las opciones marcadas como activas
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {denominations.map((d) => {
                return (
                  <div
                    key={d.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      d.active
                        ? 'bg-slate-800/80 border-slate-700/90 text-white'
                        : 'bg-slate-900/40 border-slate-800/60 text-slate-500 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="text-base font-mono font-bold tracking-tight">
                        {formatCents(d.amountCents)}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        {d.operator || 'TODOS'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(d)}
                        title={d.active ? 'Desactivar para cajero' : 'Activar para cajero'}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          d.active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-800'
                        }`}
                      >
                        {d.active ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(d.id, d.label)}
                        title="Eliminar denominación"
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
