import React, { useState, useMemo, useEffect } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  User, 
  CreditCard, 
  Printer, 
  FileText, 
  RotateCcw, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Package, 
  ChevronDown, 
  ExternalLink,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  X
} from 'lucide-react';
import { Sale, PaymentMethod } from '../../types';
import { TicketPrint } from '../pos/TicketPrint';

interface SalesHistoryModuleProps {
  sales: Sale[];
  initialFilter?: {
    cashierName?: string;
    startDate?: string;
    endDate?: string;
    shiftId?: string;
  } | null;
  onClearInitialFilter?: () => void;
}

type DatePreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'all';

export const SalesHistoryModule: React.FC<SalesHistoryModuleProps> = ({
  sales,
  initialFilter,
  onClearInitialFilter
}) => {
  // Today's date in YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const getDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const getFirstDayOfMonthStr = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [customerSearch, setCustomerSearch] = useState('');

  // Ticket Modal state (reusing existing TicketPrint)
  const [selectedSaleForTicket, setSelectedSaleForTicket] = useState<Sale | null>(null);

  // Apply initial filter if passed from Cash Closure
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.startDate) {
        const startStr = new Date(initialFilter.startDate).toISOString().split('T')[0];
        setStartDate(startStr);
      }
      if (initialFilter.endDate) {
        const endStr = new Date(initialFilter.endDate).toISOString().split('T')[0];
        setEndDate(endStr);
      }
      if (initialFilter.cashierName) {
        setSelectedCashier(initialFilter.cashierName);
      }
      setDatePreset('all');
    }
  }, [initialFilter]);

  // Handle Preset change
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = getTodayStr();

    switch (preset) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'yesterday':
        const yest = getYesterdayStr();
        setStartDate(yest);
        setEndDate(yest);
        break;
      case 'last7':
        setStartDate(getDaysAgoStr(7));
        setEndDate(today);
        break;
      case 'thisMonth':
        setStartDate(getFirstDayOfMonthStr());
        setEndDate(today);
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setDatePreset('today');
    setStartDate(getTodayStr());
    setEndDate(getTodayStr());
    setSearchTerm('');
    setSelectedCashier('all');
    setSelectedPaymentMethod('all');
    setSelectedStatus('all');
    setCustomerSearch('');
    if (onClearInitialFilter) {
      onClearInitialFilter();
    }
  };

  // Unique Cashiers extracted from sales
  const uniqueCashiers = useMemo(() => {
    const names = new Set<string>();
    sales.forEach(s => {
      if (s.cashierName) names.add(s.cashierName);
    });
    return Array.from(names).sort();
  }, [sales]);

  // Filter Sales Logic
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // 1. Date Filter
      const saleDateStr = (s.date || s.createdAt || '').slice(0, 10);
      if (startDate && saleDateStr < startDate) return false;
      if (endDate && saleDateStr > endDate) return false;

      // 2. Ticket / Invoice Search
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchesTicket = (s.ticketNumber || '').toLowerCase().includes(term);
        const matchesId = (s.id || '').toLowerCase().includes(term);
        if (!matchesTicket && !matchesId) return false;
      }

      // 3. Cashier Filter
      if (selectedCashier !== 'all') {
        if (s.cashierName !== selectedCashier) return false;
      }

      // 4. Payment Method Filter
      if (selectedPaymentMethod !== 'all') {
        if (s.paymentMethod !== selectedPaymentMethod) return false;
      }

      // 5. Status Filter
      if (selectedStatus !== 'all') {
        if (s.status !== selectedStatus) return false;
      }

      // 6. Customer Search
      if (customerSearch.trim()) {
        const cTerm = customerSearch.trim().toLowerCase();
        const cName = (s.customerName || '').toLowerCase();
        const cPhone = (s.customerPhone || '').toLowerCase();
        const cDoc = (s.customerDocNumber || '').toLowerCase();
        if (!cName.includes(cTerm) && !cPhone.includes(cTerm) && !cDoc.includes(cTerm)) {
          return false;
        }
      }

      return true;
    });
  }, [sales, startDate, endDate, searchTerm, selectedCashier, selectedPaymentMethod, selectedStatus, customerSearch]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const validSales = filteredSales.filter(s => s.status !== 'Anulada');
    const totalAmount = validSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalDiscounts = validSales.reduce((acc, s) => acc + (s.discountTotal || 0), 0);
    const totalItems = validSales.reduce((acc, s) => {
      const itemsCount = (s.items || []).reduce((subAcc, item) => subAcc + (item.quantity || 0), 0);
      return acc + itemsCount;
    }, 0);
    const averageTicket = validSales.length > 0 ? totalAmount / validSales.length : 0;

    return {
      count: filteredSales.length,
      validCount: validSales.length,
      totalAmount,
      totalDiscounts,
      totalItems,
      averageTicket
    };
  }, [filteredSales]);

  const isFiltered = datePreset !== 'today' || searchTerm !== '' || selectedCashier !== 'all' || selectedPaymentMethod !== 'all' || selectedStatus !== 'all' || customerSearch !== '' || initialFilter !== null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Historial de Ventas</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Módulo Oficial
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulta histórica de comprobantes, tickets emitidos, desglose de productos y métodos de pago.
              </p>
            </div>
          </div>
        </div>

        {initialFilter && (
          <div className="bg-purple-950/40 border border-purple-500/40 rounded-xl px-3.5 py-2 flex items-center gap-3 text-xs text-purple-200">
            <div>
              <span className="font-bold text-purple-300">Filtro Contextual de Turno Activo:</span>
              <p className="text-[11px] text-purple-200/80">
                {initialFilter.cashierName ? `Cajero: ${initialFilter.cashierName} • ` : ''}
                {initialFilter.shiftId ? `ID Turno: ${initialFilter.shiftId.slice(-8)}` : ''}
              </p>
            </div>
            {onClearInitialFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
              >
                Quitar Filtro
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturado */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Facturado</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            ${metrics.totalAmount.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            Ventas completadas en el periodo
          </p>
        </div>

        {/* Cantidad de Ventas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Comprobantes Emitidos</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-400 font-mono">
            {metrics.count}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            {metrics.validCount} completadas • {metrics.count - metrics.validCount} anuladas
          </p>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ticket Promedio</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 font-mono">
            ${metrics.averageTicket.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            Monto medio por operación válida
          </p>
        </div>

        {/* Productos Despachados */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Unidades Vendidas</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono">
            {metrics.totalItems}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            Productos entregados a clientes
          </p>
        </div>
      </div>

      {/* FILTERS & SEARCH CONTROL PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Filtros y Búsqueda de Ventas</span>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] text-slate-400 mr-1 font-medium">Periodo:</span>
            {(
              [
                { id: 'today', label: 'Hoy' },
                { id: 'yesterday', label: 'Ayer' },
                { id: 'last7', label: 'Últimos 7 días' },
                { id: 'thisMonth', label: 'Este mes' },
                { id: 'all', label: 'Todo el Histórico' }
              ] as { id: DatePreset; label: string }[]
            ).map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetChange(preset.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  datePreset === preset.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                }`}
              >
                {preset.label}
              </button>
            ))}

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 ml-1"
                title="Restablecer filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
          {/* Search by Ticket # */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-400">
              Buscar Ticket / Factura
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ej. FAC-507418"
                className="w-full pl-8.5 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Search by Customer */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-400">
              Cliente / Documento
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder="Nombre, teléfono o DUI..."
                className="w-full pl-8.5 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Filter by Cashier */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-400">
              Cajero Responsable
            </label>
            <select
              value={selectedCashier}
              onChange={e => setSelectedCashier(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-hidden focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Todos los cajeros</option>
              {uniqueCashiers.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filter by Payment Method */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-400">
              Método de Pago
            </label>
            <select
              value={selectedPaymentMethod}
              onChange={e => setSelectedPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-hidden focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Todos los métodos</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Mixto">Mixto</option>
            </select>
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-400">
              Fecha Desde
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDatePreset('all');
                }}
                className="w-full pl-8.5 pr-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-hidden focus:border-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-400">
              Fecha Hasta
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDatePreset('all');
                }}
                className="w-full pl-8.5 pr-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-hidden focus:border-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SALES TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Listado de Ventas Registradas
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {filteredSales.length} {filteredSales.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Total Mostrado: <strong className="text-white">${metrics.totalAmount.toFixed(2)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-mono">
                <th className="py-2.5 px-3">Ticket / Folio</th>
                <th className="py-2.5 px-3">Fecha & Hora</th>
                <th className="py-2.5 px-3">Cajero</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Productos Vendidos</th>
                <th className="py-2.5 px-3">Pago</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-center">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-mono space-y-2">
                    <p className="text-sm font-semibold">No se encontraron ventas con los filtros aplicados.</p>
                    <p className="text-xs text-slate-600">Intente ampliando el rango de fechas o limpiando los criterios de búsqueda.</p>
                    {isFiltered && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-2 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Ver Todas las Ventas
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const isVoid = sale.status === 'Anulada';
                  const saleDate = new Date(sale.date || sale.createdAt);

                  return (
                    <tr 
                      key={sale.id} 
                      className={`hover:bg-slate-800/40 transition-colors ${isVoid ? 'opacity-60 bg-red-950/10' : ''}`}
                    >
                      {/* Ticket / Folio */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setSelectedSaleForTicket(sale)}
                          className="group text-left font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Haga clic para ver el ticket original"
                        >
                          <FileText className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                          <span className="underline decoration-dotted underline-offset-2">
                            #{sale.ticketNumber}
                          </span>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                        <div className="mt-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                            isVoid 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {sale.status || 'Completada'}
                          </span>
                        </div>
                      </td>

                      {/* Fecha y Hora */}
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        <div className="text-slate-200 font-semibold">
                          {saleDate.toLocaleDateString('es-SV', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{saleDate.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* Cajero */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[130px]">{sale.cashierName || 'Cajero'}</span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200 truncate max-w-[150px]">
                          {sale.customerName || 'Consumidor Final'}
                        </div>
                        {sale.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {sale.customerPhone}
                          </div>
                        )}
                        {sale.customerDocNumber && (
                          <div className="text-[9.5px] text-slate-500 font-mono">
                            {sale.customerDocType || 'Doc'}: {sale.customerDocNumber}
                          </div>
                        )}
                      </td>

                      {/* Productos Vendidos */}
                      <td className="py-3 px-3">
                        {sale.items && sale.items.length > 0 ? (
                          <div className="space-y-1 max-w-[320px]">
                            {sale.items.map((item, idx) => (
                              <div 
                                key={idx} 
                                className="text-[11px] text-slate-300 flex items-start justify-between gap-2"
                              >
                                <div className="truncate flex items-center gap-1" title={`${item.name} × ${item.quantity}`}>
                                  <span className="text-slate-500 shrink-0">•</span>
                                  <span className="truncate">{item.name}</span>
                                  <span className="text-slate-400 font-mono text-[10px] shrink-0">× {item.quantity}</span>
                                </div>
                                <span className="font-mono text-slate-400 text-[10px] shrink-0">
                                  ${(item.unitPrice || 0).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Sin detalle de productos</span>
                        )}
                      </td>

                      {/* Método de Pago */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          sale.paymentMethod === 'Efectivo' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          sale.paymentMethod === 'Tarjeta' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          sale.paymentMethod === 'Transferencia' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                          'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {sale.paymentMethod}
                        </span>
                      </td>

                      {/* Subtotal & Descuento */}
                      <td className="py-3 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                        <div>${(sale.subtotal || sale.total).toFixed(2)}</div>
                        {sale.discountTotal > 0 && (
                          <div className="text-[10px] text-amber-400">
                            -${sale.discountTotal.toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3 text-right font-mono font-black text-white text-sm whitespace-nowrap">
                        ${(sale.total || 0).toFixed(2)}
                      </td>

                      {/* Acción: Ver Ticket */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedSaleForTicket(sale)}
                          className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                          title="Abrir comprobante / ticket original"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Ticket</span>
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

      {/* REUSED TICKET MODAL: Displays the original ticket with all items, cashier, and totals */}
      {selectedSaleForTicket && (
        <TicketPrint
          sale={selectedSaleForTicket}
          onClose={() => setSelectedSaleForTicket(null)}
        />
      )}
    </div>
  );
};
