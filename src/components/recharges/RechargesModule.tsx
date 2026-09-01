import React, { useState, useEffect, useMemo } from 'react';
import { 
  SmartphoneCharging, 
  DollarSign, 
  Percent, 
  Lock, 
  History, 
  Settings2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Smartphone,
  Wallet,
  PlusCircle,
  Tag,
  Receipt,
  RotateCcw,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  FileSpreadsheet,
  Save,
  Info,
  CheckCircle
} from 'lucide-react';
import { 
  Recharge, 
  RechargeBalance, 
  RechargeBalanceLog, 
  RechargeDenomination, 
  RechargeFinancial, 
  RechargeCommissionSettings, 
  RechargeOperator,
  OperatorCommission,
  CashShift
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  DEFAULT_RECHARGE_COMMISSIONS, 
  subscribeToRechargeCommissions,
  saveRechargeCommissionsToFirestore
} from '../../lib/firestoreUtils';
import { 
  ALL_RECHARGE_OPERATORS,
  calculateProfitCents,
  calculateRealCostCents,
  centsToDollars,
  dollarsToCents,
  executeRechargeSaleTransaction,
  formatCents,
  subscribeToRechargeBalances,
  subscribeToRechargeBalanceLogs,
  subscribeToRechargeDenominations,
  subscribeToRechargeFinancials
} from '../../lib/rechargeServices';
import { RechargeCommissionModal } from './RechargeCommissionModal';
import { AddBalanceModal } from './AddBalanceModal';
import { ManageDenominationsModal } from './ManageDenominationsModal';
import { RechargeTicketModal } from './RechargeTicketModal';

interface RechargesModuleProps {
  recharges: Recharge[];
  activeCashShift?: CashShift;
  onAddRecharge?: (recharge: Omit<Recharge, 'id' | 'createdAt' | 'profit'>) => void;
}

export const RechargesModule: React.FC<RechargesModuleProps> = ({
  recharges,
  activeCashShift,
  onAddRecharge
}) => {
  const { currentUser, isCEO, role } = useAuth();

  // Active view tab for CEO (Terminal de Venta, Cuadre/Inventario, % de Ganancia, Auditoría de Saldo, Historial Financiero)
  const [ceoActiveView, setCeoActiveView] = useState<'terminal' | 'balances' | 'commissions' | 'logs' | 'history'>('terminal');

  // Form states
  const [operator, setOperator] = useState<RechargeOperator>('Claro');
  const [selectedDenominationCents, setSelectedDenominationCents] = useState<number>(115);
  const [customAmountDollars, setCustomAmountDollars] = useState<string>('1.15');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [saleSuccess, setSaleSuccess] = useState<string | null>(null);

  // Modals state
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [isAddBalanceModalOpen, setIsAddBalanceModalOpen] = useState(false);
  const [isManageDenominationsOpen, setIsManageDenominationsOpen] = useState(false);
  const [selectedTicketRecharge, setSelectedTicketRecharge] = useState<Recharge | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Inline Commission Form State for CEO
  const [inlineCommissions, setInlineCommissions] = useState<RechargeCommissionSettings>(DEFAULT_RECHARGE_COMMISSIONS);
  const [isSavingCommissions, setIsSavingCommissions] = useState(false);
  const [commissionSaveStatus, setCommissionSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Firestore Real-Time Subscribed States
  const [commissions, setCommissions] = useState<RechargeCommissionSettings>(DEFAULT_RECHARGE_COMMISSIONS);
  const [balances, setBalances] = useState<Record<string, RechargeBalance>>({});
  const [denominations, setDenominations] = useState<RechargeDenomination[]>([]);
  const [balanceLogs, setBalanceLogs] = useState<RechargeBalanceLog[]>([]);
  const [financials, setFinancials] = useState<Record<string, RechargeFinancial>>({});

  // 1. Strict Role-Based Firestore Subscriptions
  useEffect(() => {
    // Both CEO and Cashier subscribe to authorized fast-sale denominations (sales catalog)
    const unsubDenominations = subscribeToRechargeDenominations((updated) => {
      setDenominations(updated);
      if (updated.length > 0 && !selectedDenominationCents) {
        const firstActive = updated.find(d => d.active);
        if (firstActive) {
          setSelectedDenominationCents(firstActive.amountCents);
          setCustomAmountDollars(centsToDollars(firstActive.amountCents).toFixed(2));
        }
      }
    });

    let unsubCommissions = () => {};
    let unsubBalances = () => {};
    let unsubLogs = () => {};
    let unsubFinancials = () => {};

    // STRICT SECURITY: Only subscribe to financial, commission, log and balance collections if user is CEO
    if (isCEO) {
      unsubCommissions = subscribeToRechargeCommissions((updated) => {
        setCommissions(updated);
        setInlineCommissions(updated);
      });

      unsubBalances = subscribeToRechargeBalances((updated) => {
        setBalances(updated);
      });

      unsubLogs = subscribeToRechargeBalanceLogs((updated) => {
        setBalanceLogs(updated);
      });

      unsubFinancials = subscribeToRechargeFinancials((updated) => {
        setFinancials(updated);
      });
    }

    return () => {
      unsubDenominations();
      unsubCommissions();
      unsubBalances();
      unsubLogs();
      unsubFinancials();
    };
  }, [isCEO]);

  // Helper for current commission rate (CEO only)
  const getOperatorCommission = (op: RechargeOperator): number => {
    const key = op.toLowerCase() as 'claro' | 'tigo' | 'movistar' | 'digicel' | 'otra';
    const item = commissions[key];
    if (item && typeof item === 'object' && 'commissionPercent' in item) {
      return (item as OperatorCommission).commissionPercent;
    }
    const def = DEFAULT_RECHARGE_COMMISSIONS[key];
    return def && typeof def === 'object' && 'commissionPercent' in def ? def.commissionPercent : 5.0;
  };

  const currentPercent = getOperatorCommission(operator);

  // Active operator balance info (CEO only)
  const currentOpKey = operator.toLowerCase();
  const currentOpBalance = balances[currentOpKey] || {
    operator,
    availableBalanceCents: 0,
    totalPurchasedCents: 0,
    totalSoldCents: 0,
    minAlertThresholdCents: 1000,
    updatedAt: '',
    updatedBy: ''
  };

  const availableBalanceCents = currentOpBalance.availableBalanceCents ?? 0;
  const isBalanceLow = availableBalanceCents <= (currentOpBalance.minAlertThresholdCents ?? 1000);
  const isBalanceZero = availableBalanceCents <= 0;

  // Filter denominations available for current operator
  const availableDenominations = useMemo(() => {
    return denominations.filter(
      (d) => d.active && (d.operator === 'TODOS' || d.operator === operator)
    );
  }, [denominations, operator]);

  // Handle denomination selection
  const handleSelectDenomination = (cents: number) => {
    setSelectedDenominationCents(cents);
    setCustomAmountDollars(centsToDollars(cents).toFixed(2));
    setSaleError(null);
  };

  // Handle Inline Commission Change (CEO only)
  const handleInlineCommissionChange = (key: 'claro' | 'tigo' | 'movistar' | 'digicel' | 'otra', value: string) => {
    const num = parseFloat(value);
    const validNum = isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
    setInlineCommissions(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { active: true, notes: '' }),
        commissionPercent: validNum
      }
    }));
  };

  // Save Inline Commissions to Firestore (CEO only)
  const handleSaveInlineCommissions = async () => {
    setIsSavingCommissions(true);
    setCommissionSaveStatus(null);
    try {
      const author = currentUser?.displayName || 'Mario Barillas (CEO)';
      const result = await saveRechargeCommissionsToFirestore(inlineCommissions, author);
      if (result.success) {
        setCommissionSaveStatus({
          type: 'success',
          text: '¡Porcentajes de ganancia actualizados exitosamente en Firestore! Todas las nuevas ventas utilizarán estos valores.'
        });
        setCommissions(inlineCommissions);
      } else {
        setCommissionSaveStatus({
          type: 'error',
          text: result.error || 'Error al guardar comisiones en Firestore.'
        });
      }
    } catch (err: any) {
      setCommissionSaveStatus({
        type: 'error',
        text: err?.message || 'Error inesperado al guardar.'
      });
    } finally {
      setIsSavingCommissions(false);
    }
  };

  // Process Recharge Sale Transaction
  const handleProcessSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError(null);
    setSaleSuccess(null);

    const amountCents = selectedDenominationCents > 0 
      ? selectedDenominationCents 
      : dollarsToCents(customAmountDollars);

    if (amountCents <= 0) {
      setSaleError('Seleccione o ingrese un monto de recarga válido.');
      return;
    }

    if (!phoneNumber || phoneNumber.trim().length < 4) {
      setSaleError('Ingrese un número de teléfono válido.');
      return;
    }

    // Client-side precheck for CEO only
    if (isCEO && availableBalanceCents < amountCents) {
      setSaleError('Saldo insuficiente para realizar esta recarga.');
      return;
    }

    setIsProcessingSale(true);

    try {
      const result = await executeRechargeSaleTransaction({
        operator,
        amountCents,
        phoneNumber: phoneNumber.trim(),
        cashierUid: currentUser?.uid || 'user-cajero-01',
        cashierName: currentUser?.displayName || 'Cajero de Turno',
        shiftId: activeCashShift?.id,
        notes: notes.trim(),
        commissionPercent: isCEO ? currentPercent : 0
      });

      setSaleSuccess(`¡Recarga de ${formatCents(amountCents)} al número ${phoneNumber} procesada exitosamente!`);
      
      // Open Printable Ticket
      setSelectedTicketRecharge(result.recharge);
      setIsTicketModalOpen(true);

      // Reset form
      setPhoneNumber('');
      setNotes('');
    } catch (err: any) {
      console.error('Error al vender recarga:', err);
      // Ensure error message does not leak balance details
      const rawMsg = err?.message || '';
      const safeMsg = rawMsg.includes('Saldo insuficiente') 
        ? 'Saldo insuficiente para realizar esta recarga.' 
        : rawMsg || 'Error al procesar la venta de recarga.';
      setSaleError(safeMsg);
    } finally {
      setIsProcessingSale(false);
    }
  };

  // CEO KPI Totals (Calculated strictly for CEO)
  const ceoTotals = useMemo(() => {
    if (!isCEO) return {
      totalPurchasedDollars: 0,
      totalSoldDollars: 0,
      totalAvailableDollars: 0,
      totalNominalSold: 0,
      totalRealCost: 0,
      totalProfit: 0,
      salesCount: 0
    };

    let totalPurchasedAllCents = 0;
    let totalSoldAllCents = 0;
    let totalAvailableAllCents = 0;

    for (const opKey of Object.keys(balances)) {
      const b = balances[opKey];
      if (b) {
        totalPurchasedAllCents += b.totalPurchasedCents ?? 0;
        totalSoldAllCents += b.totalSoldCents ?? 0;
        totalAvailableAllCents += b.availableBalanceCents ?? 0;
      }
    }

    let totalNominalSold = 0;
    let totalRealCost = 0;
    let totalProfit = 0;

    recharges.forEach((r) => {
      if (r.status !== 'Anulada') {
        const fin = financials[r.id];
        const nominal = r.salePrice || (r.amountCents ? centsToDollars(r.amountCents) : 0);
        totalNominalSold += nominal;

        if (fin) {
          totalRealCost += centsToDollars(fin.realCostCents);
          totalProfit += centsToDollars(fin.profitCents);
        } else {
          const cost = r.costPrice || (nominal * 0.94);
          totalRealCost += cost;
          totalProfit += (nominal - cost);
        }
      }
    });

    return {
      totalPurchasedDollars: centsToDollars(totalPurchasedAllCents),
      totalSoldDollars: centsToDollars(totalSoldAllCents),
      totalAvailableDollars: centsToDollars(totalAvailableAllCents),
      totalNominalSold,
      totalRealCost,
      totalProfit,
      salesCount: recharges.filter(r => r.status !== 'Anulada').length
    };
  }, [isCEO, balances, recharges, financials]);

  // Cuadre breakdown per operator for CEO
  const operatorCuadre = useMemo(() => {
    if (!isCEO) return {};

    const map: Record<string, {
      operator: RechargeOperator;
      purchasedCents: number;
      soldCents: number;
      availableCents: number;
      minAlertThresholdCents: number;
      nominalSalesDollars: number;
      realCostDollars: number;
      profitDollars: number;
      salesCount: number;
      currentPercent: number;
    }> = {};

    for (const op of ALL_RECHARGE_OPERATORS) {
      const key = op.toLowerCase();
      const b = balances[key] || {
        operator: op,
        availableBalanceCents: 0,
        totalPurchasedCents: 0,
        totalSoldCents: 0,
        minAlertThresholdCents: 1000,
        updatedAt: '',
        updatedBy: ''
      };
      map[key] = {
        operator: op,
        purchasedCents: b.totalPurchasedCents ?? 0,
        soldCents: b.totalSoldCents ?? 0,
        availableCents: b.availableBalanceCents ?? 0,
        minAlertThresholdCents: b.minAlertThresholdCents ?? 1000,
        nominalSalesDollars: 0,
        realCostDollars: 0,
        profitDollars: 0,
        salesCount: 0,
        currentPercent: getOperatorCommission(op)
      };
    }

    recharges.forEach((r) => {
      if (r.status !== 'Anulada') {
        const key = r.operator.toLowerCase();
        if (map[key]) {
          const fin = financials[r.id];
          const nominal = r.salePrice || (r.amountCents ? centsToDollars(r.amountCents) : 0);
          map[key].nominalSalesDollars += nominal;
          map[key].salesCount += 1;

          if (fin) {
            map[key].realCostDollars += centsToDollars(fin.realCostCents);
            map[key].profitDollars += centsToDollars(fin.profitCents);
          } else {
            const cost = r.costPrice || (nominal * 0.94);
            map[key].realCostDollars += cost;
            map[key].profitDollars += (nominal - cost);
          }
        }
      }
    });

    return map;
  }, [isCEO, balances, recharges, financials, commissions]);

  // ==========================================
  // VIEW: CASHIER (TERMINAL DE VENTA ONLY)
  // ==========================================
  if (!isCEO) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Cashier Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <SmartphoneCharging className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Venta de Recargas
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Terminal de Venta
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Seleccione compañía y denominación
              </p>
            </div>
          </div>
        </div>

        {/* Cashier Dedicated Sales Terminal Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <SmartphoneCharging className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Vender Recarga Telefónica</h3>
              <p className="text-xs text-slate-400">Complete los datos de la recarga solicitada por el cliente</p>
            </div>
          </div>

          {saleError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{saleError}</span>
            </div>
          )}

          {saleSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{saleSuccess}</span>
            </div>
          )}

          <form onSubmit={handleProcessSale} className="space-y-6 text-xs">
            {/* 1. Operator Selection */}
            <div>
              <label className="block text-slate-300 font-bold mb-2">
                1. Compañía Telefónica *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {ALL_RECHARGE_OPERATORS.map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => {
                      setOperator(op);
                      setSaleError(null);
                    }}
                    className={`py-3 px-2 rounded-2xl font-bold border text-center transition-all cursor-pointer text-xs flex flex-col items-center justify-center gap-1 ${
                      operator === op
                        ? op === 'Claro'
                          ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-400/50'
                          : op === 'Tigo'
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/50'
                          : op === 'Movistar'
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                          : op === 'Digicel'
                          ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/30 ring-2 ring-amber-400/50'
                          : 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/50'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-extrabold">{op}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Fast Denominations Selection */}
            <div>
              <label className="block text-slate-300 font-bold mb-2">
                2. Monto de Recarga (Denominaciones Autorizadas) *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {availableDenominations.map((d) => {
                  const isSelected = selectedDenominationCents === d.amountCents;

                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSelectDenomination(d.amountCents)}
                      className={`py-2.5 px-2 rounded-xl font-mono font-bold text-center border transition-all cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.03] ring-2 ring-cyan-400/50'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {formatCents(d.amountCents)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Customer Phone Number */}
            <div>
              <label className="block text-slate-300 font-bold mb-2">
                3. Número de Teléfono del Cliente *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="ej. 7123-4567"
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white font-mono text-lg font-bold placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                {phoneNumber && (
                  <button
                    type="button"
                    onClick={() => setPhoneNumber('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-lg font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* 4. Notes / Package */}
            <div>
              <label className="block text-slate-400 font-semibold mb-2">
                Notas / Paquete Opcional
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ej. Paquete Todo Incluido 5 Días"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>

            {/* Submit Sale Button */}
            <button
              type="submit"
              disabled={isProcessingSale || selectedDenominationCents <= 0 || !phoneNumber.trim()}
              className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessingSale ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              <span>
                {selectedDenominationCents > 0
                  ? `Vender Recarga ${formatCents(selectedDenominationCents)}`
                  : 'Seleccione un Monto para Vender'}
              </span>
            </button>
          </form>
        </div>

        {/* Printable Ticket Receipt Modal */}
        <RechargeTicketModal
          isOpen={isTicketModalOpen}
          onClose={() => {
            setIsTicketModalOpen(false);
            setSelectedTicketRecharge(null);
          }}
          recharge={selectedTicketRecharge}
        />
      </div>
    );
  }

  // ==========================================
  // VIEW: CEO (FULL ADMINISTRATIVE SUITE)
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Top Header Banner & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <SmartphoneCharging className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Inventario de Saldo para Recargas
              </h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Panel CEO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inventario de saldo independiente en tiempo real con cálculo y deducción por valor nominal
            </p>
          </div>
        </div>

        {/* CEO Management Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddBalanceModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Recargar Saldo</span>
          </button>

          <button
            onClick={() => setIsManageDenominationsOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Tag className="w-4 h-4 text-cyan-400" />
            <span>Denominaciones</span>
          </button>

          <button
            onClick={() => setCeoActiveView('commissions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              ceoActiveView === 'commissions'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Percent className="w-4 h-4 text-amber-400" />
            <span>Configurar % Ganancia</span>
          </button>
        </div>
      </div>

      {/* CEO Multi-View Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setCeoActiveView('terminal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            ceoActiveView === 'terminal'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Terminal de Venta</span>
        </button>

        <button
          onClick={() => setCeoActiveView('balances')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            ceoActiveView === 'balances'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Inventario & Cuadre por Compañía</span>
        </button>

        <button
          onClick={() => setCeoActiveView('commissions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            ceoActiveView === 'commissions'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>% de Ganancia por Compañía</span>
        </button>

        <button
          onClick={() => setCeoActiveView('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            ceoActiveView === 'logs'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Auditoría de Movimientos ({balanceLogs.length})</span>
        </button>

        <button
          onClick={() => setCeoActiveView('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            ceoActiveView === 'history'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Historial Financiero ({recharges.length})</span>
        </button>
      </div>

      {/* Operator Balances Grid (Shown to CEO) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Estado de Saldo Disponible por Compañía</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            Sincronizado en tiempo real vía Firestore
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {ALL_RECHARGE_OPERATORS.map((op) => {
            const key = op.toLowerCase();
            const b = balances[key] || {
              operator: op,
              availableBalanceCents: 0,
              totalPurchasedCents: 0,
              totalSoldCents: 0,
              minAlertThresholdCents: 1000,
              updatedAt: '',
              updatedBy: ''
            };
            const opPercent = getOperatorCommission(op);
            const isSelected = operator === op;
            const opLow = (b.availableBalanceCents ?? 0) <= (b.minAlertThresholdCents ?? 1000);
            const opZero = (b.availableBalanceCents ?? 0) <= 0;

            return (
              <div
                key={op}
                onClick={() => setOperator(op)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? op === 'Claro'
                      ? 'bg-red-950/40 border-red-500/80 shadow-lg shadow-red-500/10'
                      : op === 'Tigo'
                      ? 'bg-blue-950/40 border-blue-500/80 shadow-lg shadow-blue-500/10'
                      : op === 'Movistar'
                      ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
                      : op === 'Digicel'
                      ? 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-500/10'
                      : 'bg-purple-950/40 border-purple-500/80 shadow-lg shadow-purple-500/10'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                        op === 'Claro'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : op === 'Tigo'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : op === 'Movistar'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : op === 'Digicel'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}
                    >
                      {op}
                    </span>

                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      {opPercent}%
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 font-medium">Saldo Disponible</p>
                  <p
                    className={`text-xl font-mono font-black mt-0.5 ${
                      opZero
                        ? 'text-red-400'
                        : opLow
                        ? 'text-amber-400'
                        : 'text-white'
                    }`}
                  >
                    {formatCents(b.availableBalanceCents ?? 0)}
                  </p>
                </div>

                {/* CEO detailed breakdown inside card */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] space-y-1 font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Comprado:</span>
                    <span className="text-slate-200">{formatCents(b.totalPurchasedCents ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Vendido:</span>
                    <span className="text-emerald-400">-{formatCents(b.totalSoldCents ?? 0)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: TERMINAL DE VENTA (CEO View with margins & audit) */}
      {ceoActiveView === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Quick Sale Form (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <SmartphoneCharging className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Vender Recarga Telefónica</h3>
                  <p className="text-[11px] text-slate-400">Seleccione compañía y denominación</p>
                </div>
              </div>

              {isBalanceLow && !isBalanceZero && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Saldo Bajo ({formatCents(availableBalanceCents)})
                </span>
              )}
            </div>

            {saleError && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saleError}</span>
              </div>
            )}

            {saleSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saleSuccess}</span>
              </div>
            )}

            <form onSubmit={handleProcessSale} className="space-y-4 text-xs">
              {/* 1. Operator Selection */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">
                  1. Compañía Telefónica *
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ALL_RECHARGE_OPERATORS.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOperator(op)}
                      className={`py-2 px-1 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                        operator === op
                          ? op === 'Claro'
                            ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30'
                            : op === 'Tigo'
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                            : op === 'Movistar'
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                            : op === 'Digicel'
                            ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/30'
                            : 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Fast Denominations Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-400 font-semibold">
                    2. Monto de Recarga (Denominaciones Autorizadas) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManageDenominationsOpen(true)}
                    className="text-[10px] text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" /> Editar
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                  {availableDenominations.map((d) => {
                    const isSelected = selectedDenominationCents === d.amountCents;
                    const canAfford = availableBalanceCents >= d.amountCents;

                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelectDenomination(d.amountCents)}
                        disabled={!canAfford}
                        className={`py-2 px-1 rounded-xl font-mono font-bold text-center border transition-all cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]'
                            : canAfford
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                            : 'bg-slate-900/60 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {formatCents(d.amountCents)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Customer Phone Number */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">
                  3. Número de Teléfono del Cliente *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="ej. 7123-4567"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-base font-bold placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  {phoneNumber && (
                    <button
                      type="button"
                      onClick={() => setPhoneNumber('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Notes / Package */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">
                  Notas / Paquete Opcional
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ej. Paquete Todo Incluido 5 Días"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              {/* Live Margin Calculation (Visible ONLY to CEO) */}
              {selectedDenominationCents > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Costo Real Privado ({currentPercent}% com.):</span>
                    <span className="text-amber-400 font-bold">
                      {formatCents(calculateRealCostCents(selectedDenominationCents, currentPercent))}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Ganancia Neta:</span>
                    <span className="text-emerald-400 font-bold">
                      +{formatCents(calculateProfitCents(
                        selectedDenominationCents,
                        calculateRealCostCents(selectedDenominationCents, currentPercent)
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Sale Button */}
              <button
                type="submit"
                disabled={isProcessingSale || isBalanceZero || availableBalanceCents < selectedDenominationCents}
                className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessingSale ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                <span>
                  {isBalanceZero
                    ? `Saldo Agotado en ${operator}`
                    : `Vender Recarga ${formatCents(selectedDenominationCents)}`}
                </span>
              </button>
            </form>
          </div>

          {/* Right Column: Recent Recharges Table (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Historial de Recargas Recientes</h3>
                <p className="text-[11px] text-slate-400">
                  Auditoría completa con desglose financiero
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
                {recharges.length} ventas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Hora</th>
                    <th className="py-2.5 px-3">Compañía</th>
                    <th className="py-2.5 px-3">Teléfono</th>
                    <th className="py-2.5 px-3">Monto Venta</th>
                    <th className="py-2.5 px-3">Costo Real</th>
                    <th className="py-2.5 px-3">Ganancia</th>
                    <th className="py-2.5 px-3 text-right">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {recharges.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                        No hay recargas registradas todavía
                      </td>
                    </tr>
                  ) : (
                    recharges.map((r) => {
                      const fin = financials[r.id];
                      const costDisplay = fin 
                        ? formatCents(fin.realCostCents) 
                        : (r.costPrice ? `$${r.costPrice.toFixed(2)}` : '••••••');
                      const profitDisplay = fin 
                        ? formatCents(fin.profitCents) 
                        : (r.profit ? `$${r.profit.toFixed(2)}` : '••••••');

                      return (
                        <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400">
                            {new Date(r.date || r.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                r.operator === 'Claro'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : r.operator === 'Tigo'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : r.operator === 'Movistar'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : r.operator === 'Digicel'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              }`}
                            >
                              {r.operator}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white">{r.phoneNumber}</td>
                          <td className="py-2.5 px-3 font-extrabold text-cyan-400">
                            {r.amountCents ? formatCents(r.amountCents) : `$${r.salePrice.toFixed(2)}`}
                          </td>
                          <td className="py-2.5 px-3 text-amber-400 font-bold">
                            {costDisplay}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">
                            {profitDisplay}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedTicketRecharge(r);
                                setIsTicketModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Ver / Imprimir Ticket"
                            >
                              <Receipt className="w-4 h-4 text-cyan-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CEO INVENTARIO & CUADRE POR COMPAÑÍA */}
      {ceoActiveView === 'balances' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-xs text-slate-400 font-medium">Saldo Total Comprado</span>
              <p className="text-2xl font-mono font-black text-white mt-1">
                ${ceoTotals.totalPurchasedDollars.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Inversión acumulada en saldo mayorista</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-xs text-slate-400 font-medium">Saldo Total Disponible</span>
              <p className="text-2xl font-mono font-black text-cyan-400 mt-1">
                ${ceoTotals.totalAvailableDollars.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Existencia real en operadores</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-xs text-slate-400 font-medium">Ventas Nominales Totales</span>
              <p className="text-2xl font-mono font-black text-emerald-400 mt-1">
                ${ceoTotals.totalNominalSold.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">{ceoTotals.salesCount} recargas vendidas</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-xs text-slate-400 font-medium">Ganancia Neta Acumulada</span>
              <p className="text-2xl font-mono font-black text-amber-400 mt-1">
                +${ceoTotals.totalProfit.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Márgenes netos congelados por venta</p>
            </div>
          </div>

          {/* Cuadre Table per Operator */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Cuadre de Inventario y Finanzas por Compañía</h3>
                <p className="text-xs text-slate-400">
                  Fórmula de saldo: Saldo Comprado - Saldo Vendido = Saldo Disponible (Deducción Nominal)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCeoActiveView('commissions')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Percent className="w-4 h-4" />
                  <span>Ajustar %</span>
                </button>
                <button
                  onClick={() => setIsAddBalanceModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Comprar Saldo</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-3.5">Compañía</th>
                    <th className="py-3 px-3.5">% Ganancia</th>
                    <th className="py-3 px-3.5">Saldo Comprado</th>
                    <th className="py-3 px-3.5">Saldo Vendido</th>
                    <th className="py-3 px-3.5">Saldo Disponible</th>
                    <th className="py-3 px-3.5">Ventas Nominales</th>
                    <th className="py-3 px-3.5">Costo Real</th>
                    <th className="py-3 px-3.5">Ganancia Neta</th>
                    <th className="py-3 px-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {ALL_RECHARGE_OPERATORS.map((op) => {
                    const key = op.toLowerCase();
                    const item = operatorCuadre[key];
                    if (!item) return null;
                    const isLow = item.availableCents <= item.minAlertThresholdCents;

                    return (
                      <tr key={op} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3.5 font-sans font-bold text-white flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              op === 'Claro'
                                ? 'bg-red-500'
                                : op === 'Tigo'
                                ? 'bg-blue-500'
                                : op === 'Movistar'
                                ? 'bg-emerald-500'
                                : op === 'Digicel'
                                ? 'bg-amber-500'
                                : 'bg-purple-500'
                            }`}
                          />
                          <span>{op}</span>
                        </td>
                        <td className="py-3 px-3.5 text-amber-400 font-bold">
                          {item.currentPercent.toFixed(2)}%
                        </td>
                        <td className="py-3 px-3.5 text-slate-200">
                          {formatCents(item.purchasedCents)}
                        </td>
                        <td className="py-3 px-3.5 text-cyan-400">
                          {formatCents(item.soldCents)}
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`font-bold px-2 py-1 rounded-lg ${
                              isLow
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'text-emerald-400'
                            }`}
                          >
                            {formatCents(item.availableCents)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-cyan-300 font-bold">
                          ${item.nominalSalesDollars.toFixed(2)}
                        </td>
                        <td className="py-3 px-3.5 text-slate-400">
                          ${item.realCostDollars.toFixed(2)}
                        </td>
                        <td className="py-3 px-3.5 text-emerald-400 font-bold">
                          +${item.profitDollars.toFixed(2)}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setOperator(op);
                                setIsAddBalanceModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Comprar saldo"
                            >
                              + Recargar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CEO CONFIGURACIÓN DE % DE GANANCIA POR COMPAÑÍA */}
      {ceoActiveView === 'commissions' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Configuración de Porcentaje de Ganancia por Compañía
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Exclusivo CEO
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Defina el porcentaje (%) de ganancia de cada operador. Se sincroniza en Firestore y calcula automáticamente el costo real de cada venta.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Desea restablecer los porcentajes a los valores por defecto?')) {
                      setInlineCommissions(DEFAULT_RECHARGE_COMMISSIONS);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Valores por Defecto</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveInlineCommissions}
                  disabled={isSavingCommissions}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingCommissions ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Guardando en Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar en Firestore</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status Alert */}
            {commissionSaveStatus && (
              <div className={`mt-4 p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold ${
                commissionSaveStatus.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {commissionSaveStatus.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{commissionSaveStatus.text}</span>
              </div>
            )}

            {/* Financial Formula Explanatory Card */}
            <div className="mt-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-start gap-3 text-cyan-300 text-xs">
              <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 leading-relaxed">
                <p className="font-bold text-cyan-200">
                  Reglas de Negocio y Preservación Histórica:
                </p>
                <ul className="list-disc list-inside space-y-1 text-cyan-300/90">
                  <li>
                    <strong>Fórmula Contable:</strong> <code className="bg-slate-950/60 px-1.5 py-0.5 rounded text-[11px] font-mono text-white">Costo Real = Valor Nominal × (1 - (% Ganancia / 100))</code> y <code className="bg-slate-950/60 px-1.5 py-0.5 rounded text-[11px] font-mono text-white">Ganancia = Valor Nominal × (% Ganancia / 100)</code>.
                  </li>
                  <li>
                    <strong>Deducción de Inventario Nominal:</strong> El saldo del inventario se descuenta <strong>SIEMPRE por el valor nominal</strong> de la recarga (ej. Saldo $100.00 - Venta $1.15 = Nuevo Saldo $98.85). El costo real y ganancia son contables.
                  </li>
                  <li>
                    <strong>Inmutabilidad Histórica:</strong> Al modificar un porcentaje hoy, solo aplicará para las nuevas ventas. Las ventas anteriores conservan de forma permanente su porcentaje original y ganancia calculada.
                  </li>
                  <li>
                    <strong>Privacidad del Cajero:</strong> Los cajeros/vendedores nunca tienen acceso a los costos reales ni porcentajes de ganancia.
                  </li>
                </ul>
              </div>
            </div>

            {/* Operator Commission Inputs Grid */}
            <div className="mt-6 space-y-4">
              {[
                {
                  key: 'claro' as const,
                  name: 'CLARO',
                  badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
                  bgColor: 'bg-red-500/5',
                  borderColor: 'border-red-500/30 focus-within:border-red-500',
                  textColor: 'text-red-400'
                },
                {
                  key: 'tigo' as const,
                  name: 'TIGO',
                  badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
                  bgColor: 'bg-blue-500/5',
                  borderColor: 'border-blue-500/30 focus-within:border-blue-500',
                  textColor: 'text-blue-400'
                },
                {
                  key: 'movistar' as const,
                  name: 'MOVISTAR',
                  badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
                  bgColor: 'bg-emerald-500/5',
                  borderColor: 'border-emerald-500/30 focus-within:border-emerald-500',
                  textColor: 'text-emerald-400'
                },
                {
                  key: 'digicel' as const,
                  name: 'DIGICEL',
                  badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
                  bgColor: 'bg-amber-500/5',
                  borderColor: 'border-amber-500/30 focus-within:border-amber-500',
                  textColor: 'text-amber-400'
                },
                {
                  key: 'otra' as const,
                  name: 'OTRA (Otras compañías / Paquetes especiales)',
                  badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
                  bgColor: 'bg-purple-500/5',
                  borderColor: 'border-purple-500/30 focus-within:border-purple-500',
                  textColor: 'text-purple-400'
                }
              ].map((item) => {
                const currentData = inlineCommissions[item.key] || { commissionPercent: 5.0, active: true, notes: '' };
                const pct = currentData.commissionPercent;
                const sampleSale115 = 1.15;
                const sampleGain115 = (sampleSale115 * pct) / 100;
                const sampleCost115 = sampleSale115 - sampleGain115;

                return (
                  <div
                    key={item.key}
                    className={`p-5 rounded-2xl border transition-all ${item.bgColor} ${item.borderColor}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${item.badgeColor}`}>
                          {item.name}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>Porcentaje de Ganancia Vigente:</span>
                            <strong className={`font-mono text-base ${item.textColor}`}>{pct.toFixed(2)}%</strong>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Recarga $1.15 → Costo: <strong className="text-slate-200">${sampleCost115.toFixed(2)}</strong> | Ganancia: <strong className="text-emerald-400">+${sampleGain115.toFixed(2)}</strong> (Desc. Saldo: <strong className="text-cyan-400">$1.15</strong>)
                          </p>
                        </div>
                      </div>

                      {/* Manual Editable Numeric Input */}
                      <div className="flex items-center gap-2.5">
                        <label className="text-xs text-slate-400 font-semibold">
                          Porcentaje %:
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={pct}
                            onChange={(e) => handleInlineCommissionChange(item.key, e.target.value)}
                            className="w-28 pl-3 pr-7 py-2 bg-slate-950/90 border border-slate-700 rounded-xl text-white font-mono font-extrabold text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                          />
                          <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                        </div>
                        <div className="flex items-center gap-1">
                          {[5.0, 6.0, 6.5, 7.0, 8.0].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleInlineCommissionChange(item.key, String(preset))}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                                pct === preset
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: CEO BALANCE AUDIT MOVEMENT LOGS */}
      {ceoActiveView === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Auditoría de Movimientos de Saldo</h3>
              <p className="text-xs text-slate-400">
                Registro inmutable de compras, ventas y ajustes de saldo
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
              {balanceLogs.length} movimientos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Fecha / Hora</th>
                  <th className="py-2.5 px-3">Tipo Movimiento</th>
                  <th className="py-2.5 px-3">Compañía</th>
                  <th className="py-2.5 px-3">Monto</th>
                  <th className="py-2.5 px-3">Saldo Anterior</th>
                  <th className="py-2.5 px-3">Nuevo Saldo</th>
                  <th className="py-2.5 px-3">Usuario / Cajero</th>
                  <th className="py-2.5 px-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {balanceLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                      No hay registros de movimientos en la base de datos
                    </td>
                  </tr>
                ) : (
                  balanceLogs.map((log) => {
                    const isPurchase = log.type === 'COMPRA_SALDO';
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(log.createdAt).toLocaleString('es-SV', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 w-fit ${
                              isPurchase
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            }`}
                          >
                            {isPurchase ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {log.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans font-bold text-white">
                          {log.operator}
                        </td>
                        <td
                          className={`py-2.5 px-3 font-extrabold ${
                            isPurchase ? 'text-emerald-400' : 'text-cyan-400'
                          }`}
                        >
                          {isPurchase ? '+' : '-'}
                          {formatCents(log.amountCents)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {formatCents(log.previousBalanceCents)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {formatCents(log.newBalanceCents)}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-300">
                          {log.userName}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400 truncate max-w-xs">
                          {log.notes || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: CEO HISTORIAL FINANCIERO COMPLETO */}
      {ceoActiveView === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Historial de Ventas con Desglose Financiero</h3>
              <p className="text-xs text-slate-400">
                Auditoría confidencial de márgenes reales y comisiones congeladas por venta
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
              {recharges.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">N° Ticket</th>
                  <th className="py-2.5 px-3">Compañía</th>
                  <th className="py-2.5 px-3">Teléfono</th>
                  <th className="py-2.5 px-3">Venta Nominal</th>
                  <th className="py-2.5 px-3">Comisión</th>
                  <th className="py-2.5 px-3">Costo Real</th>
                  <th className="py-2.5 px-3">Ganancia Neta</th>
                  <th className="py-2.5 px-3">Cajero</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {recharges.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500 italic">
                      No hay recargas registradas
                    </td>
                  </tr>
                ) : (
                  recharges.map((r) => {
                    const fin = financials[r.id];
                    const nominal = r.amountCents 
                      ? formatCents(r.amountCents) 
                      : `$${r.salePrice.toFixed(2)}`;
                    const cost = fin 
                      ? formatCents(fin.realCostCents) 
                      : (r.costPrice ? `$${r.costPrice.toFixed(2)}` : '••••••');
                    const profit = fin 
                      ? formatCents(fin.profitCents) 
                      : (r.profit ? `$${r.profit.toFixed(2)}` : '••••••');
                    const commission = fin 
                      ? `${fin.commissionPercent}%` 
                      : `${getOperatorCommission(r.operator)}%`;

                    return (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(r.date || r.createdAt).toLocaleString('es-SV', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-bold text-cyan-400">
                          {r.ticketNumber || r.id}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              r.operator === 'Claro'
                                ? 'bg-red-500/20 text-red-400'
                                : r.operator === 'Tigo'
                                ? 'bg-blue-500/20 text-blue-400'
                                : r.operator === 'Movistar'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : r.operator === 'Digicel'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-purple-500/20 text-purple-400'
                            }`}
                          >
                            {r.operator}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">{r.phoneNumber}</td>
                        <td className="py-2.5 px-3 font-extrabold text-cyan-400">{nominal}</td>
                        <td className="py-2.5 px-3 text-amber-400 font-bold">{commission}</td>
                        <td className="py-2.5 px-3 text-slate-300">{cost}</td>
                        <td className="py-2.5 px-3 font-extrabold text-emerald-400">+{profit}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-400">{r.cashierName}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedTicketRecharge(r);
                              setIsTicketModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Receipt className="w-4 h-4 text-cyan-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CEO Modal: Add / Top-up Balance */}
      <AddBalanceModal
        isOpen={isAddBalanceModalOpen}
        onClose={() => setIsAddBalanceModalOpen(false)}
        balances={balances}
        currentUserUid={currentUser?.uid || 'ceo-uid'}
        currentUserName={currentUser?.displayName || 'Mario Barillas (CEO)'}
        defaultOperator={operator}
      />

      {/* CEO Modal: Manage Denominations */}
      <ManageDenominationsModal
        isOpen={isManageDenominationsOpen}
        onClose={() => setIsManageDenominationsOpen(false)}
        denominations={denominations}
      />

      {/* CEO Modal: Recharge Commissions */}
      <RechargeCommissionModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
        currentSettings={commissions}
        authorName={currentUser?.displayName || 'Mario Barillas (CEO)'}
        onSavedSuccessfully={(updated) => {
          setCommissions(updated);
          setInlineCommissions(updated);
        }}
      />

      {/* Ticket Modal (Printable) */}
      <RechargeTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setSelectedTicketRecharge(null);
        }}
        recharge={selectedTicketRecharge}
      />
    </div>
  );
};
