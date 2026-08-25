import React, { useState } from 'react';
import { 
  SmartphoneCharging, 
  Eye, 
  EyeOff, 
  Plus, 
  ShieldAlert, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Lock,
  AlertCircle
} from 'lucide-react';
import { Recharge } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface RechargesModuleProps {
  recharges: Recharge[];
  onAddRecharge: (recharge: Omit<Recharge, 'id' | 'createdAt' | 'profit'>) => void;
}

export const RechargesModule: React.FC<RechargesModuleProps> = ({
  recharges,
  onAddRecharge
}) => {
  const { isCEO, role, currentUser } = useAuth();

  // Form State
  const [operator, setOperator] = useState<'Claro' | 'Tigo' | 'Movistar' | 'Digicel' | 'Otra'>('Claro');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [notes, setNotes] = useState('');

  // Cuadre calculations
  const totalSaleVolume = recharges.reduce((sum, r) => sum + r.salePrice, 0);
  const totalRealCost = recharges.reduce((sum, r) => sum + r.costPrice, 0);
  const totalNetProfit = totalSaleVolume - totalRealCost;

  const handleSubmitRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    const costNum = parseFloat(costPrice) || 0;
    const saleNum = parseFloat(salePrice) || 0;

    if (saleNum <= 0) {
      alert('Ingrese un precio de venta final válido');
      return;
    }

    onAddRecharge({
      date: new Date().toISOString(),
      cashierUid: currentUser?.uid || 'cajero-pos',
      cashierName: currentUser?.displayName || role,
      operator,
      phoneNumber,
      costPrice: costNum,
      salePrice: saleNum,
      notes: notes || 'Recarga saldo directa',
      status: 'Completada'
    });

    // Reset form
    setPhoneNumber('');
    setCostPrice('');
    setSalePrice('');
    setNotes('');
  };

  return (
    <div className="space-y-5">
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
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <SmartphoneCharging className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Ingreso de Recarga de Saldo</h3>
              <p className="text-[11px] text-slate-400">Registro manual con cuadre dual</p>
            </div>
          </div>

          <form onSubmit={handleSubmitRecharge} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Operador Telefónico *</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Claro', 'Tigo', 'Movistar', 'Digicel'] as const).map(op => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperator(op)}
                    className={`py-2 px-1 rounded-xl font-bold border text-center transition-all ${
                      operator === op
                        ? op === 'Claro' ? 'bg-red-600 border-red-500 text-white' :
                          op === 'Tigo' ? 'bg-blue-600 border-blue-500 text-white' :
                          op === 'Movistar' ? 'bg-emerald-600 border-emerald-500 text-white' :
                          'bg-amber-600 border-amber-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {op}
                  </button>
                ))}
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
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  <span>Costo Real ($)</span>
                  <span className="text-[10px] text-amber-400 font-normal">(Oculto CEO)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="ej. 4.60"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Precio Venta Final ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="ej. 5.00"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Notas / Paquete Especial</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ej. Paquete Todo Incluido 5 Días"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
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
            <h3 className="text-sm font-bold text-white">Historial de Recargas del Día</h3>
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
                {recharges.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        r.operator === 'Claro' ? 'bg-red-500/20 text-red-400' :
                        r.operator === 'Tigo' ? 'bg-blue-500/20 text-blue-400' :
                        r.operator === 'Movistar' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-amber-500/20 text-amber-400'
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
