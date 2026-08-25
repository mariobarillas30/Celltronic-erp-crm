import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Plus, 
  Settings, 
  Search, 
  Filter, 
  Printer, 
  FileText, 
  Receipt, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  User, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  Wallet,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { PettyCashFund, PettyCashExpense, PettyCashExpenseCategory, PettyCashInjection, Supplier, CashShift } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { PettyCashExpenseModal } from './PettyCashExpenseModal';

interface PettyCashCEOModuleProps {
  fund: PettyCashFund;
  expenses: PettyCashExpense[];
  suppliers: Supplier[];
  cashShifts?: CashShift[];
  onUpdateFundConfig: (initialAmount: number, minAlertThreshold: number) => void;
  onAddFundInjection: (amount: number, concept: string) => void;
  onRegisterExpense: (expense: Omit<PettyCashExpense, 'id' | 'voucherNumber' | 'createdAt'>) => PettyCashExpense;
  onVoidExpense: (expenseId: string, reason: string) => void;
}

export const PettyCashCEOModule: React.FC<PettyCashCEOModuleProps> = ({
  fund,
  expenses,
  suppliers,
  onUpdateFundConfig,
  onAddFundInjection,
  onRegisterExpense,
  onVoidExpense
}) => {
  const { isCEO, role, currentUser } = useAuth();

  // Navigation Subtabs
  const [activeSubtab, setActiveSubtab] = useState<'expenses' | 'injections' | 'analytics'>('expenses');

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showInjectionModal, setShowInjectionModal] = useState(false);
  const [showDirectExpenseModal, setShowDirectExpenseModal] = useState(false);
  const [selectedVoucherForView, setSelectedVoucherForView] = useState<PettyCashExpense | null>(null);
  const [expenseToVoid, setExpenseToVoid] = useState<PettyCashExpense | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Config Form State
  const [configInitialAmount, setConfigInitialAmount] = useState(fund.initialAmount.toString());
  const [configMinAlert, setConfigMinAlert] = useState(fund.minAlertThreshold.toString());

  // Injection Form State
  const [injectionAmount, setInjectionAmount] = useState('');
  const [injectionConcept, setInjectionConcept] = useState('');

  // 1. Calculations: Total Injections
  const totalInjections = useMemo(() => {
    return (fund.injections || []).reduce((sum, inj) => sum + inj.amount, 0);
  }, [fund.injections]);

  // 2. Total Registered Expenses (excluding voided ones)
  const validExpenses = useMemo(() => {
    return expenses.filter(exp => exp.status !== 'Anulado');
  }, [expenses]);

  const totalExpenseAmount = useMemo(() => {
    return validExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [validExpenses]);

  // 3. Real-time Current Balance
  const currentBalance = useMemo(() => {
    return fund.initialAmount + totalInjections - totalExpenseAmount;
  }, [fund.initialAmount, totalInjections, totalExpenseAmount]);

  // 4. Alert status
  const isCriticalLow = currentBalance <= fund.minAlertThreshold;
  const isDepleted = currentBalance <= 0;

  // 5. Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = 
        exp.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.recipientOrSupplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.invoiceOrReceiptNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = selectedCategory === 'Todos' || exp.category === selectedCategory;
      const matchesStatus = selectedStatus === 'Todos' || exp.status === selectedStatus;

      let matchesDate = true;
      const expDate = new Date(exp.date).getTime();
      const now = Date.now();

      if (dateFilter === 'today') {
        const startOfDay = new Date().setHours(0, 0, 0, 0);
        matchesDate = expDate >= startOfDay;
      } else if (dateFilter === 'week') {
        matchesDate = expDate >= (now - 7 * 86400000);
      } else if (dateFilter === 'month') {
        matchesDate = expDate >= (now - 30 * 86400000);
      }

      return matchesSearch && matchesCat && matchesStatus && matchesDate;
    });
  }, [expenses, searchTerm, selectedCategory, selectedStatus, dateFilter]);

  // Expenses by Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    validExpenses.forEach(exp => {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [validExpenses]);

  // Handle Fund Config Submit
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const initial = parseFloat(configInitialAmount);
    const minAlert = parseFloat(configMinAlert);

    if (isNaN(initial) || initial < 0 || isNaN(minAlert) || minAlert < 0) {
      alert('Por favor ingrese valores numéricos válidos.');
      return;
    }

    onUpdateFundConfig(initial, minAlert);
    setShowConfigModal(false);
  };

  // Handle Injection Submit
  const handleSaveInjection = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(injectionAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Por favor ingrese un monto de inyección válido mayor a $0.');
      return;
    }
    if (!injectionConcept.trim()) {
      alert('Por favor detalle el concepto o motivo del reabastecimiento.');
      return;
    }

    onAddFundInjection(amt, injectionConcept.trim());
    setInjectionAmount('');
    setInjectionConcept('');
    setShowInjectionModal(false);
  };

  // Handle Void Expense Submit
  const handleConfirmVoid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseToVoid) return;
    if (!voidReason.trim()) {
      alert('Por favor ingrese el motivo de anulación.');
      return;
    }

    onVoidExpense(expenseToVoid.id, voidReason.trim());
    setExpenseToVoid(null);
    setVoidReason('');
  };

  const handlePrintAuditReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Caja Chica & Fondo de Reserva</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Panel Exclusivo CEO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Control centralizado de fondos para gastos imprevistos, pagos a proveedores y compras operativas rápidas.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setConfigInitialAmount(fund.initialAmount.toString());
              setConfigMinAlert(fund.minAlertThreshold.toString());
              setShowConfigModal(true);
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Ajustar Fondo & Umbral</span>
          </button>

          <button
            onClick={() => setShowInjectionModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Reabastecer / Inyectar $</span>
          </button>

          <button
            onClick={() => setShowDirectExpenseModal(true)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Salida</span>
          </button>

          <button
            onClick={handlePrintAuditReport}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="Imprimir Reporte de Caja Chica"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Critical Alert Warning Banner if balance is low */}
      {isCriticalLow && (
        <div className={`p-4 rounded-2xl border flex items-start justify-between gap-4 shadow-lg transition-all ${
          isDepleted 
            ? 'bg-red-950/80 border-red-500/80 text-red-100 shadow-red-950/50' 
            : 'bg-amber-950/70 border-amber-500/70 text-amber-100 shadow-amber-950/50'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${isDepleted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}`}>
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                {isDepleted 
                  ? '🚨 FONDO DE CAJA CHICA AGOTADO' 
                  : '⚠️ ALERTA DE FONDO DE RESERVA CRÍTICO'}
              </h4>
              <p className="text-xs mt-1 text-slate-200 leading-relaxed">
                El saldo actual disponible (<strong className="font-mono text-white">${currentBalance.toFixed(2)}</strong>) ha caído por debajo del umbral mínimo de seguridad de <strong className="font-mono text-white">${fund.minAlertThreshold.toFixed(2)}</strong>. 
                Los cajeros podrían no disponer de efectivo para salidas operativas o fletes urgentes.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInjectionModal(true)}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-950 rounded-xl text-xs font-extrabold shadow-md shrink-0 transition-all cursor-pointer"
          >
            Inyectar Fondos Ahora
          </button>
        </div>
      )}

      {/* Executive Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Disponible Actual */}
        <div className={`rounded-2xl p-5 border text-white relative overflow-hidden transition-all ${
          isDepleted 
            ? 'bg-gradient-to-br from-red-950 to-slate-900 border-red-800/80' 
            : isCriticalLow
              ? 'bg-gradient-to-br from-amber-950 to-slate-900 border-amber-700/70'
              : 'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Saldo Real Disponible</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isDepleted 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : isCriticalLow 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {isDepleted ? 'Agotado' : isCriticalLow ? 'Crítico' : 'Saludable'}
            </span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${
              isDepleted ? 'text-red-400' : isCriticalLow ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              ${currentBalance.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Fondo Base + Inyecciones - Egresos
            </p>
          </div>
          {/* Progress Bar vs Total Capacity */}
          <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                isDepleted ? 'bg-red-500' : isCriticalLow ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, (currentBalance / (fund.initialAmount + totalInjections || 1)) * 100))}%` }}
            />
          </div>
        </div>

        {/* Card 2: Fondo Base Inicial */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Fondo Inicial CEO</span>
            <button 
              onClick={() => setShowConfigModal(true)}
              className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
            >
              Editar
            </button>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              ${fund.initialAmount.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Umbral Alerta:</span>
              <strong className="text-amber-400 font-mono">${fund.minAlertThreshold.toFixed(2)}</strong>
            </p>
          </div>
        </div>

        {/* Card 3: Inyecciones de Capital */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Inyecciones Totales</span>
            <span className="text-xs text-blue-400 font-bold font-mono">
              {(fund.injections || []).length} registros
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-blue-400">
              +${totalInjections.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Reabastecimientos ingresados
            </p>
          </div>
        </div>

        {/* Card 4: Total Egresos Realizados */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Egresos Pagados</span>
            <span className="text-xs text-orange-400 font-bold font-mono">
              {validExpenses.length} vales
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-orange-400">
              -${totalExpenseAmount.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Descontados automáticamente
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubtab('expenses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubtab === 'expenses'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Historial de Egresos & Vales ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubtab('injections')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubtab === 'injections'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Inyecciones de Fondo ({(fund.injections || []).length})</span>
        </button>

        <button
          onClick={() => setActiveSubtab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubtab === 'analytics'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Distribución por Categorías</span>
        </button>
      </div>

      {/* Subtab 1: Expenses Audit Table */}
      {activeSubtab === 'expenses' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-slate-100">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar vale, proveedor, concepto, cajero..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            {/* Category and Status Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-cyan-500 cursor-pointer"
              >
                <option value="Todos">Todas las Categorías</option>
                <option value="Pago a Proveedor">Pago a Proveedor</option>
                <option value="Compra de Mercadería / Repuestos">Compra de Mercadería / Repuestos</option>
                <option value="Servicios Básicos / Local">Servicios Básicos / Local</option>
                <option value="Insumos de Limpieza / Oficina">Insumos de Limpieza / Oficina</option>
                <option value="Transporte / Flete">Transporte / Flete</option>
                <option value="Alimentación">Alimentación</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Otros Gastos Imprevistos">Otros Gastos Imprevistos</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-cyan-500 cursor-pointer"
              >
                <option value="Todos">Todos los Estados</option>
                <option value="Registrado">Registrados (Válidos)</option>
                <option value="Anulado">Anulados</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">Todas las Fechas</option>
                <option value="today">Hoy</option>
                <option value="week">Últimos 7 días</option>
                <option value="month">Últimos 30 días</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Vale / Folio</th>
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Cajero / Turno</th>
                    <th className="py-3 px-4">Proveedor / Destinatario</th>
                    <th className="py-3 px-4">Concepto del Gasto</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">N° Factura / Doc</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-500">
                        No se encontraron registros de salidas con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(exp => (
                      <tr 
                        key={exp.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          exp.status === 'Anulado' ? 'opacity-50 bg-red-950/10' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                          {exp.voucherNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(exp.date).toLocaleDateString()} <span className="text-[10px] text-slate-500">{new Date(exp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="py-3.5 px-4 text-white font-medium">
                          {exp.cashierName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-200 font-semibold max-w-[150px] truncate">
                          {exp.recipientOrSupplier}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 max-w-[200px] truncate" title={exp.concept}>
                          {exp.concept}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-400">
                          {exp.invoiceOrReceiptNumber}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
                          ${exp.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            exp.status === 'Registrado'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}>
                            {exp.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedVoucherForView(exp)}
                              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Ver Vale y Comprobante"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            {exp.status === 'Registrado' && isCEO && (
                              <button
                                onClick={() => {
                                  setExpenseToVoid(exp);
                                  setVoidReason('');
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Anular este Egreso (Reintegrar a Fondo)"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Injections History */}
      {activeSubtab === 'injections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Historial de Reabastecimientos e Inyecciones de Capital</h3>
            <button
              onClick={() => setShowInjectionModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Inyección</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Autorizado / Ingresado Por</th>
                  <th className="py-3 px-4">Concepto / Motivo de Reabastecimiento</th>
                  <th className="py-3 px-4 text-right">Monto Inyectado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(fund.injections || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500">
                      No hay inyecciones adicionales registradas. El fondo opera con el monto inicial.
                    </td>
                  </tr>
                ) : (
                  fund.injections.map(inj => (
                    <tr key={inj.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {new Date(inj.date).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-white font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        {inj.authorizedBy}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {inj.concept}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-blue-400 text-sm">
                        +${inj.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Category Analytics */}
      {activeSubtab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-orange-400" />
              Gastos por Categoría
            </h3>

            <div className="space-y-3">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No hay gastos para clasificar.</p>
              ) : (
                categoryBreakdown.map(([cat, amt]) => {
                  const pct = totalExpenseAmount > 0 ? (amt / totalExpenseAmount) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-200">{cat}</span>
                        <span className="font-mono font-bold text-amber-400">
                          ${amt.toFixed(2)} <span className="text-[10px] text-slate-400">({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Políticas de Control Interno CEO
            </h3>

            <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Invisibilidad para Cajeros:</strong> Los cajeros registran egresos pero no tienen acceso a ver el saldo total acumulado de la Caja Chica para proteger la discreción operativa.
                </span>
              </li>
              <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Descuento Automático:</strong> Cada salida registrada reduce en tiempo real el balance de reserva y genera un vale foliado listo para resguardo físico en caja.
                </span>
              </li>
              <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Alertas de Umbral Mínimo:</strong> Se envía una advertencia visual inmediata al panel del CEO cuando el saldo cae por debajo de <strong className="text-amber-400 font-mono">${fund.minAlertThreshold.toFixed(2)}</strong>.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Modal 1: Config Initial Fund & Alert Threshold */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Configurar Fondo Inicial & Umbral</h3>
                <p className="text-xs text-slate-400">Ajustes directos de Caja Chica (Exclusivo CEO)</p>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Fondo Inicial Base ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-emerald-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={configInitialAmount}
                    onChange={(e) => setConfigInitialAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-base focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Monto base permanente con el que abre el fondo de reserva.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Límite Mínimo para Alerta Crítica ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={configMinAlert}
                    onChange={(e) => setConfigMinAlert(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-base focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">El sistema alertará en rojo cuando el saldo caiga debajo de esta cantidad.</p>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/30 cursor-pointer"
                >
                  Guardar Configuración
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Inyectar / Reabastecer Fondo */}
      {showInjectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reabastecer / Inyectar Efectivo</h3>
                <p className="text-xs text-slate-400">Incrementar el saldo disponible de Caja Chica</p>
              </div>
            </div>

            <form onSubmit={handleSaveInjection} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monto a Inyectar ($) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-blue-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={injectionAmount}
                    onChange={(e) => setInjectionAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-base focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Concepto / Motivo de la Inyección *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Reposición de fondo semanal / Compras de repuestos"
                  value={injectionConcept}
                  onChange={(e) => setInjectionConcept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <span>Autorizado por: </span>
                <strong className="text-white">{currentUser?.displayName || 'CEO'}</strong>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInjectionModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  Confirmar Inyección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Direct Expense Modal (uses reusable component) */}
      <PettyCashExpenseModal
        isOpen={showDirectExpenseModal}
        onClose={() => setShowDirectExpenseModal(false)}
        suppliers={suppliers}
        onRegisterExpense={onRegisterExpense}
      />

      {/* Modal 4: View / Print Individual Voucher */}
      {selectedVoucherForView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Detalle de Vale de Caja Chica</h3>
              </div>
              <button
                onClick={() => setSelectedVoucherForView(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 font-mono text-xs text-slate-300">
              <div className="text-center pb-2 border-b border-slate-800">
                <p className="font-bold text-white text-sm">CELLTRONIC ERP - COMPROBANTE DE EGRESO</p>
                <p className="text-amber-400 font-bold">{selectedVoucherForView.voucherNumber}</p>
                <p className="text-[10px] text-slate-400">{new Date(selectedVoucherForView.date).toLocaleString()}</p>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Monto:</span>
                  <span className="text-emerald-400 font-bold text-sm">${selectedVoucherForView.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Proveedor/Destinatario:</span>
                  <span className="font-semibold text-white">{selectedVoucherForView.recipientOrSupplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Categoría:</span>
                  <span className="text-cyan-300">{selectedVoucherForView.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">N° Factura/Recibo:</span>
                  <span className="text-amber-300">{selectedVoucherForView.invoiceOrReceiptNumber}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400 block">Concepto:</span>
                  <span className="text-slate-200 font-sans">{selectedVoucherForView.concept}</span>
                </div>
                {selectedVoucherForView.notes && (
                  <div className="pt-1">
                    <span className="text-slate-400 block">Observaciones:</span>
                    <span className="text-slate-300 font-sans">{selectedVoucherForView.notes}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-400">Cajero Emisor:</span>
                  <span className="text-slate-200">{selectedVoucherForView.cashierName}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Estado:</span>
                  <span className={selectedVoucherForView.status === 'Registrado' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {selectedVoucherForView.status}
                  </span>
                </div>
                {selectedVoucherForView.voidReason && (
                  <div className="pt-1 text-red-400 text-[11px]">
                    <span>Motivo de Anulación: </span>
                    <span>{selectedVoucherForView.voidReason}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Vale
              </button>
              <button
                type="button"
                onClick={() => setSelectedVoucherForView(null)}
                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Anular Egreso */}
      {expenseToVoid && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Anular Egreso de Caja Chica</h3>
                <p className="text-xs text-red-400 font-semibold">{expenseToVoid.voucherNumber} - ${expenseToVoid.amount.toFixed(2)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Al anular este egreso, el monto de <strong>${expenseToVoid.amount.toFixed(2)}</strong> será devuelto al balance disponible de la Caja Chica. Se requiere justificación de control interno.
            </p>

            <form onSubmit={handleConfirmVoid} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo de Anulación *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ej. Comprobante duplicado / Operación cancelada por el proveedor..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseToVoid(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  Confirmar Anulación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
