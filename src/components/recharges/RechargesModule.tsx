import React, { useState, useEffect } from 'react';
import { 
  SmartphoneCharging, 
  ShieldAlert, 
  CheckCircle2, 
  Lock,
  Settings2,
  Percent,
  Radio
} from 'lucide-react';
import { Recharge, RechargeCommissionSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  DEFAULT_RECHARGE_COMMISSIONS, 
  subscribeToRechargeCommissions 
} from '../../lib/firestoreUtils';
import { RechargeCommissionModal } from './RechargeCommissionModal';

interface RechargesModuleProps {
  recharges: Recharge[];
  onAddRecharge: (recharge: Omit<Recharge, 'id' | 'createdAt' | 'profit'>) => void;
}

export const RechargesModule: React.FC<RechargesModuleProps> = ({
  recharges,
  onAddRecharge
}) => {
  const { isCEO, role, currentUser } = useAuth();

  // Firestore Commissions State
  const [commissions, setCommissions] = useState<RechargeCommissionSettings>(() => {
    const cached = localStorage.getItem('celltronic_recharge_commissions');
    return cached ? JSON.parse(cached) : DEFAULT_RECHARGE_COMMISSIONS;
  });
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);

  // Form State
  const [operator, setOperator] = useState<'Claro' | 'Tigo' | 'Movistar' | 'Digicel' | 'Otra'>('Claro');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [isManualCostOverride, setIsManualCostOverride] = useState(false);
  const [notes, setNotes] = useState('');

  // Subscribe to real-time changes in Firestore recharge commissions
  useEffect(() => {
    const unsubscribe = subscribeToRechargeCommissions((updated) => {
      setCommissions(updated);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Helper to get active commission percentage for the selected operator
  const getOperatorCommission = (op: 'Claro' | 'Tigo' | 'Movistar' | 'Digicel' | 'Otra'): number => {
    switch (op) {
      case 'Claro':
        return commissions.claro?.commissionPercent ?? DEFAULT_RECHARGE_COMMISSIONS.claro.commissionPercent;
      case 'Tigo':
        return commissions.tigo?.commissionPercent ?? DEFAULT_RECHARGE_COMMISSIONS.tigo.commissionPercent;
      case 'Movistar':
        return commissions.movistar?.commissionPercent ?? DEFAULT_RECHARGE_COMMISSIONS.movistar.commissionPercent;
      case 'Digicel':
        return commissions.digicel?.commissionPercent ?? DEFAULT_RECHARGE_COMMISSIONS.digicel.commissionPercent;
      case 'Otra':
        return commissions.otra?.commissionPercent ?? DEFAULT_RECHARGE_COMMISSIONS.otra?.commissionPercent ?? 5.0;
      default:
        return 6.0;
    }
  };

  const currentPercent = getOperatorCommission(operator);

  // Automatically recalculate cost price when sale price or operator changes (unless manually overridden by CEO)
  useEffect(() => {
    if (!isManualCostOverride) {
      const saleNum = parseFloat(salePrice);
      if (!isNaN(saleNum) && saleNum > 0) {
        const commissionRate = currentPercent / 100;
        const calculatedCost = saleNum * (1 - commissionRate);
        setCostPrice(calculatedCost.toFixed(2));
      } else {
        setCostPrice('');
      }
    }
  }, [salePrice, operator, currentPercent, isManualCostOverride]);

  // Cuadre calculations
  const totalSaleVolume = recharges.reduce((sum, r) => sum + r.salePrice, 0);
  const totalRealCost = recharges.reduce((sum, r) => sum + r.costPrice, 0);
  const totalNetProfit = totalSaleVolume - totalRealCost;

  const handleSubmitRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    const saleNum = parseFloat(salePrice) || 0;
    let costNum = parseFloat(costPrice);

    if (saleNum <= 0) {
      alert('Ingrese un precio de venta final válido');
      return;
    }

    // Auto-fallback if cost was empty or invalid
    if (isNaN(costNum) || costNum <= 0) {
      const commissionRate = currentPercent / 100;
      costNum = saleNum * (1 - commissionRate);
    }

    onAddRecharge({
      date: new Date().toISOString(),
      cashierUid: currentUser?.uid || 'cajero-pos',
      cashierName: currentUser?.displayName || role,
      operator,
      phoneNumber,
      costPrice: costNum,
      salePrice: saleNum,
      notes: notes || `Recarga saldo (${currentPercent}% margen)`,
      status: 'Completada'
    });

    // Reset form
    setPhoneNumber('');
    setSalePrice('');
    setCostPrice('');
    setIsManualCostOverride(false);
    setNotes('');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & CEO Config Quick Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
            <SmartphoneCharging className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Venta de Recargas y Cuadre Dual
              </h2>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> Sincronizado con Firestore
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Registro con cálculo de costo automático basado en los porcentajes de comisión por compañía.
            </p>
          </div>
        </div>

        {/* CEO Commission Settings Button */}
        {isCEO && (
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => setIsCommissionModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer group"
            >
              <Settings2 className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
              <span>Ajustar Comisiones (CEO)</span>
            </button>
          </div>
        )}
      </div>

      {/* Strict Policy Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-300 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-200">CATEGORÍA ESPECIAL: RECARGAS Y CUADRE DUAL</h4>
          <p className="mt-0.5 text-amber-300/90 leading-relaxed">
            Las recargas de saldo no admiten ningún tipo de promoción automática ni descuento manual. El módulo opera bajo un esquema de <strong>Cuadre Dual</strong> registrando el costo real (secreto) y la venta final.
          </p>
        </div>
      </div>

      {/* Live Commission Rates Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-semibold">
          <Percent className="w-3.5 h-3.5 text-cyan-400" />
          <span>Comisiones activas en Firestore:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 font-mono font-bold text-[11px] flex items-center gap-1.5">
            CLARO: <strong className="text-white">{commissions.claro?.commissionPercent?.toFixed(1) || '6.5'}%</strong>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono font-bold text-[11px] flex items-center gap-1.5">
            TIGO: <strong className="text-white">{commissions.tigo?.commissionPercent?.toFixed(1) || '6.0'}%</strong>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[11px] flex items-center gap-1.5">
            MOVISTAR: <strong className="text-white">{commissions.movistar?.commissionPercent?.toFixed(1) || '7.0'}%</strong>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-[11px] flex items-center gap-1.5">
            DIGICEL: <strong className="text-white">{commissions.digicel?.commissionPercent?.toFixed(1) || '8.0'}%</strong>
          </span>
          {isCEO && (
            <button
              type="button"
              onClick={() => setIsCommissionModalOpen(true)}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold ml-1 cursor-pointer"
            >
              Editar valores
            </button>
          )}
        </div>
      </div>

      {/* Top Cuadre Dual Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Venta Card (Public) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Ventas Facturadas</p>
          <p className="text-2xl font-extrabold text-emerald-400">${totalSaleVolume.toFixed(2)}</p>
          <p className="text-[11px] text-slate-500">{recharges.length} recargas registradas</p>
        </div>

        {/* Total Costo Real Card (CEO ONLY) */}
        <div className={`bg-slate-900 border rounded-2xl p-4 space-y-1 shadow-md ${
          isCEO ? 'border-amber-500/30' : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Costo Real (Privado)</p>
            {!isCEO && <Lock className="w-3.5 h-3.5 text-amber-400" />}
          </div>

          {isCEO ? (
            <p className="text-2xl font-extrabold text-amber-400">${totalRealCost.toFixed(2)}</p>
          ) : (
            <p className="text-lg font-mono font-bold text-slate-500 py-1">•••••• [Solo CEO]</p>
          )}

          <p className="text-[11px] text-slate-500">Monto real desembolsado</p>
        </div>

        {/* Total Ganancia Real Card (CEO ONLY) */}
        <div className={`bg-slate-900 border rounded-2xl p-4 space-y-1 shadow-md ${
          isCEO ? 'border-blue-500/30' : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ganancia Neta Real</p>
            {!isCEO && <Lock className="w-3.5 h-3.5 text-blue-400" />}
          </div>

          {isCEO ? (
            <p className="text-2xl font-extrabold text-blue-400">${totalNetProfit.toFixed(2)}</p>
          ) : (
            <p className="text-lg font-mono font-bold text-slate-500 py-1">•••••• [Solo CEO]</p>
          )}

          <p className="text-[11px] text-slate-500">Diferencia neta positiva</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Register New Recharge Form (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <SmartphoneCharging className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ingreso de Recarga de Saldo</h3>
                <p className="text-[11px] text-slate-400">Cálculo dinámico con comisión Firestore</p>
              </div>
            </div>

            <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
              {operator}: {currentPercent}%
            </span>
          </div>

          <form onSubmit={handleSubmitRecharge} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Operador Telefónico *</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Claro', 'Tigo', 'Movistar', 'Digicel'] as const).map(op => {
                  const opPercent = getOperatorCommission(op);
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOperator(op)}
                      className={`py-2 px-1 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                        operator === op
                          ? op === 'Claro' ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30' :
                            op === 'Tigo' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30' :
                            op === 'Movistar' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30' :
                            'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/30'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>{op}</div>
                      <div className="text-[9px] font-mono opacity-80 mt-0.5">{opPercent}%</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Número de Teléfono a Recargar *</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="ej. 7845-9012"
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Precio Venta Final ($) *</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.01"
                    min="0.50"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="ej. 5.00"
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-base"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold flex items-center gap-1">
                    <span>Costo Real ($)</span>
                    <span className="text-[10px] text-amber-400 font-normal">({isCEO ? 'CEO' : 'Oculto'})</span>
                  </label>
                  {isCEO && (
                    <button
                      type="button"
                      onClick={() => setIsManualCostOverride(!isManualCostOverride)}
                      className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      {isManualCostOverride ? 'Auto' : 'Manual'}
                    </button>
                  )}
                </div>

                {isCEO ? (
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    readOnly={!isManualCostOverride}
                    onChange={(e) => {
                      setIsManualCostOverride(true);
                      setCostPrice(e.target.value);
                    }}
                    placeholder="ej. 4.67"
                    required
                    className={`w-full px-3 py-2 border rounded-xl text-amber-300 font-mono font-bold focus:outline-none ${
                      isManualCostOverride 
                        ? 'bg-amber-950/40 border-amber-500/50' 
                        : 'bg-slate-800/80 border-slate-700'
                    }`}
                  />
                ) : (
                  <div className="w-full px-3 py-2 bg-slate-800 border border-slate-700/60 rounded-xl text-slate-500 font-mono text-xs flex items-center justify-between">
                    <span>••••••</span>
                    <Lock className="w-3 h-3 text-slate-600" />
                  </div>
                )}
              </div>
            </div>

            {/* Live Profit Preview for CEO */}
            {isCEO && salePrice && (
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Comisión Firestore ({currentPercent}%):</span>
                <span className="font-mono font-bold text-emerald-400">
                  +${((parseFloat(salePrice) || 0) - (parseFloat(costPrice) || 0)).toFixed(2)} ganancia
                </span>
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Notas / Paquete Especial</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ej. Paquete Todo Incluido 5 Días"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Registrar Recarga
            </button>
          </form>
        </div>

        {/* Right Column: Recharges History Table (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Historial de Recargas del Día</h3>
              <p className="text-[11px] text-slate-400">Auditoría con desglose de márgenes</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
              {recharges.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3">Operador</th>
                  <th className="py-2.5 px-3">Teléfono</th>
                  <th className="py-2.5 px-3">Venta Final</th>
                  <th className="py-2.5 px-3">Costo Real</th>
                  <th className="py-2.5 px-3">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recharges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                      No hay recargas registradas en esta sesión
                    </td>
                  </tr>
                ) : (
                  recharges.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          r.operator === 'Claro' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          r.operator === 'Tigo' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          r.operator === 'Movistar' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {r.operator}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-white">{r.phoneNumber}</td>
                      <td className="py-2.5 px-3 font-mono font-extrabold text-emerald-400">
                        ${r.salePrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {isCEO ? (
                          <span className="text-amber-400 font-bold">${r.costPrice.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-500 font-mono">••••••</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {isCEO ? (
                          <span className="text-blue-400 font-bold">${r.profit.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-500 font-mono">••••••</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CEO Recharge Commission Settings Modal */}
      {isCEO && (
        <RechargeCommissionModal
          isOpen={isCommissionModalOpen}
          onClose={() => setIsCommissionModalOpen(false)}
          currentSettings={commissions}
          authorName={currentUser?.displayName || 'Mario Barillas (CEO)'}
          onSavedSuccessfully={(updated) => {
            setCommissions(updated);
          }}
        />
      )}
    </div>
  );
};
