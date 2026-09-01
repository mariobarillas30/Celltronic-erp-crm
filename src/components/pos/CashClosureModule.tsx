import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Coins, 
  CreditCard, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  TrendingUp, 
  FileText, 
  Plus, 
  Calendar,
  User,
  Clock,
  Printer,
  History,
  ShieldCheck,
  DollarSign,
  Receipt,
  Wallet
} from 'lucide-react';
import { CashShift, Sale, Recharge, Repair, PettyCashExpense, Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { PettyCashExpenseModal } from '../petty_cash/PettyCashExpenseModal';

interface CashClosureModuleProps {
  cashShifts: CashShift[];
  sales: Sale[];
  recharges: Recharge[];
  repairs: Repair[];
  pettyCashExpenses?: PettyCashExpense[];
  suppliers?: Supplier[];
  onOpenShift: (initialAmount: number) => void;
  onCloseShift: (shiftId: string, actualCountedCash: number, notes: string) => void;
  onRegisterPettyCashExpense?: (expense: Omit<PettyCashExpense, 'id' | 'voucherNumber' | 'createdAt'>) => Promise<PettyCashExpense> | PettyCashExpense;
}

export const CashClosureModule: React.FC<CashClosureModuleProps> = ({
  cashShifts,
  sales,
  recharges,
  repairs,
  pettyCashExpenses = [],
  suppliers = [],
  onOpenShift,
  onCloseShift,
  onRegisterPettyCashExpense
}) => {
  const { currentUser, role, isCEO, verifySupervisorPin } = useAuth();

  // Supervisor PIN unlock state for Cajero view
  const [isSupervisorUnlocked, setIsSupervisorUnlocked] = useState<boolean>(role !== 'Cajero');
  const [authorizedSupervisor, setAuthorizedSupervisor] = useState<string | null>(null);

  // PIN Authorization Modal State
  const [pinModalPurpose, setPinModalPurpose] = useState<'unlock_view' | 'open_shift' | 'close_shift' | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Open Initial Float state
  const [initialFloatInput, setInitialFloatInput] = useState('50.00');

  // Closing cash count state
  const [countedCashInput, setCountedCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showPettyCashModal, setShowPettyCashModal] = useState(false);

  const isMasked = role === 'Cajero' && !isSupervisorUnlocked;

  const openPinModal = (purpose: 'unlock_view' | 'open_shift' | 'close_shift') => {
    setPinModalPurpose(purpose);
    setPinInput('');
    setPinError(null);
  };

  const closePinModal = () => {
    setPinModalPurpose(null);
    setPinInput('');
    setPinError(null);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifySupervisorPin(pinInput);
    if (!res.valid) {
      setPinError('PIN de Supervisor o CEO incorrecto. Intente de nuevo.');
      return;
    }

    const name = res.authorizedBy || 'Supervisor';
    setAuthorizedSupervisor(name);
    setIsSupervisorUnlocked(true);

    if (pinModalPurpose === 'open_shift') {
      const val = parseFloat(initialFloatInput);
      if (isNaN(val) || val < 0) {
        alert('Por favor ingrese un monto inicial válido.');
      } else {
        onOpenShift(val);
      }
    } else if (pinModalPurpose === 'close_shift') {
      setCountedCashInput(currentShiftMetrics.expectedCashInDrawer.toFixed(2));
      setShowCloseModal(true);
    }

    closePinModal();
  };

  // Active shift lookup
  const activeShift = useMemo(() => {
    return cashShifts.find(s => s.status === 'open') || null;
  }, [cashShifts]);

  // Compute live sales breakdown for active shift
  const currentShiftMetrics = useMemo(() => {
    if (!activeShift) {
      return {
        cashSales: 0,
        cardSales: 0,
        transferSales: 0,
        mixedSales: 0,
        totalSales: 0,
        salesCount: 0,
        rechargesTotal: 0,
        rechargesCount: 0,
        repairsTotal: 0,
        repairsCount: 0,
        expectedCashInDrawer: 0,
        totalRevenue: 0,
        shiftSalesList: [] as Sale[],
        shiftRechargesList: [] as Recharge[],
        shiftRepairsList: [] as Repair[]
      };
    }

    const shiftStartTime = new Date(activeShift.openedAt).getTime();

    // Filter sales during shift
    const shiftSales = sales.filter(s => {
      const saleTime = new Date(s.createdAt || s.date).getTime();
      return saleTime >= shiftStartTime && s.status !== 'Anulada';
    });

    // Filter recharges during shift
    const shiftRecharges = recharges.filter(r => {
      const rechTime = new Date(r.createdAt || r.date).getTime();
      return rechTime >= shiftStartTime && r.status !== 'Anulada';
    });

    // Filter repairs received or advance paid during shift
    const shiftRepairs = repairs.filter(rep => {
      const repTime = new Date(rep.receivedDate).getTime();
      return repTime >= shiftStartTime;
    });

    // Filter petty cash outflows during shift
    const shiftPettyCash = pettyCashExpenses.filter(exp => {
      const expTime = new Date(exp.createdAt || exp.date).getTime();
      return expTime >= shiftStartTime && exp.status !== 'Anulado';
    });

    let cashSales = 0;
    let cardSales = 0;
    let transferSales = 0;
    let mixedSales = 0;

    shiftSales.forEach(s => {
      if (s.paymentMethod === 'Efectivo') cashSales += s.total;
      else if (s.paymentMethod === 'Tarjeta') cardSales += s.total;
      else if (s.paymentMethod === 'Transferencia') transferSales += s.total;
      else if (s.paymentMethod === 'Mixto') mixedSales += s.total;
    });

    const rechargesTotal = shiftRecharges.reduce((acc, r) => acc + r.salePrice, 0);
    const repairsTotal = shiftRepairs.reduce((acc, r) => acc + (r.advancePayment || 0), 0);
    const pettyCashTotal = shiftPettyCash.reduce((acc, e) => acc + e.amount, 0);

    const totalSales = cashSales + cardSales + transferSales + mixedSales;
    // Expected physical cash in drawer = Initial Float + Cash Sales + Cash Recharges + Repair Advances - Petty Cash Outflows
    const expectedCashInDrawer = activeShift.initialAmount + cashSales + rechargesTotal + repairsTotal - pettyCashTotal;
    const totalRevenue = totalSales + rechargesTotal + repairsTotal;

    return {
      cashSales,
      cardSales,
      transferSales,
      mixedSales,
      totalSales,
      salesCount: shiftSales.length,
      rechargesTotal,
      rechargesCount: shiftRecharges.length,
      repairsTotal,
      repairsCount: shiftRepairs.length,
      pettyCashTotal,
      pettyCashCount: shiftPettyCash.length,
      expectedCashInDrawer,
      totalRevenue,
      shiftSalesList: shiftSales,
      shiftRechargesList: shiftRecharges,
      shiftRepairsList: shiftRepairs,
      shiftPettyCashList: shiftPettyCash
    };
  }, [activeShift, sales, recharges, repairs, pettyCashExpenses]);

  // Handle open shift submit
  const handleOpenShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(initialFloatInput);
    if (isNaN(val) || val < 0) {
      alert('Por favor ingrese un monto inicial válido.');
      return;
    }
    openPinModal('open_shift');
  };

  // Handle close shift confirm
  const handleConfirmCloseShift = () => {
    if (!activeShift) return;
    const counted = parseFloat(countedCashInput);
    if (isNaN(counted) || counted < 0) {
      alert('Por favor ingrese la cantidad de efectivo físico contado en caja.');
      return;
    }

    onCloseShift(activeShift.id, counted, closingNotes);
    setShowCloseModal(false);
    setCountedCashInput('');
    setClosingNotes('');
  };

  // Difference calculation in close modal
  const countedNum = parseFloat(countedCashInput) || 0;
  const difference = countedNum - currentShiftMetrics.expectedCashInDrawer;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Arqueo y Cierre de Caja Registradora</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Control de aperturas, cierres de turno, desglose de ventas por medio de pago y arqueo de efectivo en gaveta.
          </p>
        </div>

        {activeShift ? (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-emerald-400">TURNO DE CAJA ACTIVO</span>
            </div>
            <button
              onClick={() => openPinModal('close_shift')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Realizar Arqueo / Cierre de Caja</span>
            </button>
          </div>
        ) : (
          <div className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-amber-400 font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Caja Cerrada (Requiere Apertura)</span>
          </div>
        )}
      </div>

      {/* Cajero Privacy / Restrict Banner */}
      {role === 'Cajero' && !isSupervisorUnlocked && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">Información de Cierre Restringida para Rol Cajero</p>
              <p className="text-[11px] text-amber-200/80">
                Los montos acumulados y el efectivo teórico en gaveta se encuentran ocultos. Requiere PIN de Supervisor para autorizar la revisión.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openPinModal('unlock_view')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shrink-0 flex items-center gap-2 shadow-md cursor-pointer transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Desbloquear Cifras (PIN Supervisor)</span>
          </button>
        </div>
      )}

      {role === 'Cajero' && isSupervisorUnlocked && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Revisión de Caja Autorizada por {authorizedSupervisor || 'Supervisor'}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSupervisorUnlocked(false)}
            className="text-[11px] font-semibold text-emerald-400 hover:text-white underline cursor-pointer"
          >
            Volver a enmascarar cifras
          </button>
        </div>
      )}

      {/* SECTION 1: IF NO ACTIVE SHIFT -> OPEN SHIFT FORM */}
      {!activeShift && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-xl mx-auto space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Apertura de Turno de Caja</h3>
              <p className="text-xs text-slate-400">Registre el monto inicial asignado en efectivo a la gaveta de caja.</p>
            </div>
          </div>

          <form onSubmit={handleOpenShiftSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Cajero Responsable del Turno
              </label>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <span>{currentUser?.displayName || 'Cajero en sesión'} ({role})</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Monto Inicial de Fondo en Caja ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={initialFloatInput}
                  onChange={(e) => setInitialFloatInput(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold text-base focus:outline-hidden focus:border-cyan-500"
                  placeholder="50.00"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Sugerencia por omisión: $50.00 para cambio inicial.
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>La Apertura de Turno de Caja requiere la autorización por PIN de un Supervisor o CEO.</span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Abrir Turno de Caja con ${parseFloat(initialFloatInput || '0').toFixed(2)}</span>
            </button>
          </form>
        </div>
      )}

      {/* SECTION 2: ACTIVE SHIFT METRICS DASHBOARD */}
      {activeShift && (
        <div className="space-y-6">
          {/* Active Shift Details Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Atendido por:</p>
                <p className="text-sm font-bold text-white">{activeShift.cashierName}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400">Inicio de Turno:</span>
                <p className="font-bold text-slate-200">
                  {new Date(activeShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(activeShift.openedAt).toLocaleDateString()})
                </p>
              </div>
              <div>
                <span className="text-slate-400">Fondo Inicial:</span>
                <p className="font-extrabold text-amber-400">
                  {isMasked ? '••••••' : `$${activeShift.initialAmount.toFixed(2)}`}
                </p>
              </div>
              {onRegisterPettyCashExpense && (
                <button
                  type="button"
                  onClick={() => setShowPettyCashModal(true)}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Registrar Salida / Pago Proveedor</span>
                </button>
              )}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Cash Sales */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Ventas en Efectivo</span>
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-400 font-mono">
                {isMasked ? '••••••' : `$${currentShiftMetrics.cashSales.toFixed(2)}`}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">Cobrado en billetes/monedas</p>
            </div>

            {/* Card Sales */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Ventas con Tarjeta</span>
                <CreditCard className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-extrabold text-blue-400 font-mono">
                {isMasked ? '••••••' : `$${currentShiftMetrics.cardSales.toFixed(2)}`}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">Terminal POS / Datafono</p>
            </div>

            {/* Transfer Sales */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Transferencias</span>
                <Send className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold text-indigo-400 font-mono">
                {isMasked ? '••••••' : `$${currentShiftMetrics.transferSales.toFixed(2)}`}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">Banca en línea</p>
            </div>

            {/* Petty Cash Outflows */}
            <div className="bg-slate-900 border border-orange-500/30 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-orange-300 font-semibold">
                <span>Salidas de Caja Chica</span>
                <Receipt className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-2xl font-extrabold text-orange-400 font-mono">
                {isMasked ? '••••••' : `-$${currentShiftMetrics.pettyCashTotal.toFixed(2)}`}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                {currentShiftMetrics.pettyCashCount} vales / pagos registrados
              </p>
            </div>

            {/* Total Physical Cash in Drawer */}
            <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-1 shadow-md sm:col-span-2 lg:col-span-3 xl:col-span-1">
              <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
                <span>EFECTIVO EN GAVETA</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-300 font-mono">
                {isMasked ? '••••••' : `$${currentShiftMetrics.expectedCashInDrawer.toFixed(2)}`}
              </p>
              <p className="text-[10px] text-emerald-400/80 font-mono">
                {isMasked
                  ? '🔒 Protegido: Requiere PIN de Supervisor para revelar desgloses'
                  : `Inicial ($${activeShift.initialAmount.toFixed(2)}) + Efectivo ($${currentShiftMetrics.cashSales.toFixed(2)}) + Recargas ($${currentShiftMetrics.rechargesTotal.toFixed(2)}) + Taller ($${currentShiftMetrics.repairsTotal.toFixed(2)}) - Salidas ($${currentShiftMetrics.pettyCashTotal.toFixed(2)})`
                }
              </p>
            </div>
          </div>

          {/* Breakdown Table for Current Shift Transactions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Desglose de Transacciones del Turno Activo</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Total Transacciones: {currentShiftMetrics.salesCount + currentShiftMetrics.rechargesCount + currentShiftMetrics.repairsCount + currentShiftMetrics.pettyCashCount}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-mono">
                    <th className="py-2.5 px-3">Hora</th>
                    <th className="py-2.5 px-3">Tipo / Folio</th>
                    <th className="py-2.5 px-3">Cliente / Beneficiario</th>
                    <th className="py-2.5 px-3">Método / Categoría</th>
                    <th className="py-2.5 px-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {currentShiftMetrics.shiftSalesList.length === 0 && 
                   currentShiftMetrics.shiftRechargesList.length === 0 && 
                   currentShiftMetrics.shiftRepairsList.length === 0 &&
                   currentShiftMetrics.shiftPettyCashList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-mono">
                        No hay ventas o transacciones registradas en este turno aún.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {currentShiftMetrics.shiftSalesList.map(s => (
                        <tr key={s.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono text-slate-400">
                            {new Date(s.createdAt || s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                            Venta #{s.ticketNumber}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{s.customerName || 'Cliente Contado'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              s.paymentMethod === 'Efectivo' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              s.paymentMethod === 'Tarjeta' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            }`}>
                              {s.paymentMethod}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-white font-mono">
                            {isMasked ? '••••••' : `$${s.total.toFixed(2)}`}
                          </td>
                        </tr>
                      ))}

                      {currentShiftMetrics.shiftRechargesList.map(r => (
                        <tr key={r.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono text-slate-400">
                            {new Date(r.createdAt || r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-purple-400">
                            Recarga {r.operator} ({r.phoneNumber})
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">Prepago {r.operator}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Efectivo
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-white font-mono">
                            {isMasked ? '••••••' : `$${r.salePrice.toFixed(2)}`}
                          </td>
                        </tr>
                      ))}

                      {currentShiftMetrics.shiftRepairsList.map(rep => (
                        <tr key={rep.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono text-slate-400">
                            {new Date(rep.receivedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                            Taller #{rep.ticketNumber} ({rep.deviceBrand})
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{rep.customerName}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Anticipo Efectivo
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-white font-mono">
                            {isMasked ? '••••••' : `$${(rep.advancePayment || 0).toFixed(2)}`}
                          </td>
                        </tr>
                      ))}

                      {currentShiftMetrics.shiftPettyCashList.map(exp => (
                        <tr key={exp.id} className="hover:bg-orange-950/20 bg-orange-950/10">
                          <td className="py-2.5 px-3 font-mono text-orange-300">
                            {new Date(exp.createdAt || exp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-orange-400">
                            Egreso {exp.voucherNumber}
                          </td>
                          <td className="py-2.5 px-3 text-slate-200">
                            <span className="font-semibold">{exp.recipientOrSupplier}</span>
                            <span className="block text-[10px] text-slate-400 truncate max-w-[150px]">{exp.concept}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-orange-400 font-mono">
                            {isMasked ? '••••••' : `-$${exp.amount.toFixed(2)}`}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: SHIFT HISTORY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Historial de Arqueos y Cierres de Turno</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-mono">
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Fecha / Hora Cierre</th>
                <th className="py-2.5 px-3">Cajero</th>
                <th className="py-2.5 px-3 text-right">Fondo Inicial</th>
                <th className="py-2.5 px-3 text-right">Ventas Efectivo</th>
                <th className="py-2.5 px-3 text-right">Teórico Gaveta</th>
                <th className="py-2.5 px-3 text-right">Contado Físico</th>
                <th className="py-2.5 px-3 text-right">Diferencia (Cuadre)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {cashShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500 font-mono">
                    No hay registros anteriores de arqueos de caja.
                  </td>
                </tr>
              ) : (
                cashShifts.map(s => {
                  const isClosed = s.status === 'closed';
                  const diff = s.difference ?? 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          s.status === 'open'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {s.status === 'open' ? 'Activo' : 'Cerrado'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {s.closedAt
                          ? new Date(s.closedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                          : new Date(s.openedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">{s.cashierName}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {isMasked ? '••••••' : `$${s.initialAmount.toFixed(2)}`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                        {isMasked ? '••••••' : `$${s.totalCashSales.toFixed(2)}`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white font-bold">
                        {isMasked ? '••••••' : `$${s.expectedCashTotal.toFixed(2)}`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-cyan-300 font-bold">
                        {isMasked ? '••••••' : (isClosed ? `$${(s.actualCountedCash || 0).toFixed(2)}` : '-')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {isMasked ? (
                          <span className="text-slate-500">••••••</span>
                        ) : !isClosed ? (
                          <span className="text-slate-500">-</span>
                        ) : diff === 0 ? (
                          <span className="text-emerald-400">$0.00 (Cuadrada)</span>
                        ) : diff > 0 ? (
                          <span className="text-blue-400">+${diff.toFixed(2)} (Sobrante)</span>
                        ) : (
                          <span className="text-red-400">-${Math.abs(diff).toFixed(2)} (Faltante)</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUPERVISOR PIN AUTHORIZATION MODAL */}
      {pinModalPurpose && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white pt-2">
                {pinModalPurpose === 'open_shift' && 'Autorización de Apertura de Caja'}
                {pinModalPurpose === 'close_shift' && 'Autorización de Arqueo y Cierre'}
                {pinModalPurpose === 'unlock_view' && 'Desbloquear Cifras de Arqueo'}
              </h3>
              <p className="text-xs text-slate-400">
                Ingrese el PIN de seguridad de 4 dígitos de un Supervisor o CEO.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(null);
                  }}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-500"
                />
                {pinError && (
                  <p className="text-xs text-red-400 text-center font-semibold mt-2">{pinError}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closePinModal}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Validar PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 4: CLOSE CASH REGISTER MODAL (ARQUEO / CUADRE) */}
      {showCloseModal && activeShift && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <Lock className="w-5 h-5" />
                <span>Arqueo y Cierre Definitivo de Caja</span>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Summary Breakdown */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Fondo Inicial de Apertura:</span>
                <span className="font-bold text-white">${activeShift.initialAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Ventas en Efectivo (+ Recargas + Taller):</span>
                <span className="font-bold text-emerald-400">+${(currentShiftMetrics.cashSales + currentShiftMetrics.rechargesTotal + currentShiftMetrics.repairsTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                <span className="font-bold text-slate-200">TOTAL ESPERADO EN CAJA (TEÓRICO):</span>
                <span className="font-extrabold text-white text-sm">${currentShiftMetrics.expectedCashInDrawer.toFixed(2)}</span>
              </div>
            </div>

            {/* Cash Count Input */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-200">
                Ingrese el Efectivo Físico Contado en la Gaveta ($ USD):
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={countedCashInput}
                  onChange={(e) => setCountedCashInput(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-extrabold text-xl focus:outline-hidden focus:border-amber-500"
                  placeholder="0.00"
                />
              </div>

              {/* Real-time Quadre Status Badge */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                difference === 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : difference > 0
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <span>Estado del Cuadre:</span>
                <span className="font-mono text-sm">
                  {difference === 0
                    ? '✓ CAJA CUADRADA ($0.00)'
                    : difference > 0
                    ? `+ $${difference.toFixed(2)} (Sobrante)`
                    : `- $${Math.abs(difference).toFixed(2)} (Faltante)`
                  }
                </span>
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Observaciones / Justificación de Arqueo (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Ej. Se dejó $50 para apertura de mañana, sobrante por propina..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseShift}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Cierre de Caja</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Petty Cash Outflow Modal in Arqueo */}
      {onRegisterPettyCashExpense && (
        <PettyCashExpenseModal
          isOpen={showPettyCashModal}
          onClose={() => setShowPettyCashModal(false)}
          suppliers={suppliers}
          currentShiftId={activeShift?.id}
          onRegisterExpense={onRegisterPettyCashExpense}
        />
      )}
    </div>
  );
};
