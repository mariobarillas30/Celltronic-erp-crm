import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  SmartphoneCharging, 
  DollarSign, 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Printer, 
  Search, 
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  Tag
} from 'lucide-react';
import { Recharge, RechargeOperator } from '../../types';
import { ALL_RECHARGE_OPERATORS, centsToDollars, formatCents } from '../../lib/rechargeServices';

interface RechargesDailyReportProps {
  recharges: Recharge[];
  onOpenTicket?: (recharge: Recharge) => void;
  isCEO?: boolean;
}

type DatePreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'all';
type ViewMode = 'byCompanyAndDay' | 'consolidatedByDay';

export const RechargesDailyReport: React.FC<RechargesDailyReportProps> = ({
  recharges,
  onOpenTicket,
  isCEO = false
}) => {
  // Helper date strings
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

  // Filter states
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('byCompanyAndDay');

  // Expanded row IDs for viewing individual recharge breakdown
  const [expandedRowKeys, setExpandedRowKeys] = useState<Record<string, boolean>>({});

  const toggleRowExpansion = (key: string) => {
    setExpandedRowKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handle Preset changes
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

  const handleResetFilters = () => {
    setDatePreset('today');
    setStartDate(getTodayStr());
    setEndDate(getTodayStr());
    setSelectedOperator('all');
    setSearchTerm('');
  };

  // Safe helper to extract date string YYYY-MM-DD
  const extractDateStr = (dateVal?: string): string => {
    if (!dateVal) return '';
    try {
      if (dateVal.includes('T')) {
        return dateVal.split('T')[0];
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
        return dateVal.slice(0, 10);
      }
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {
      // fallback
    }
    return dateVal.slice(0, 10);
  };

  // Helper to format date for display in Spanish
  const formatDisplayDate = (dateStr: string): string => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        return dateObj.toLocaleDateString('es-SV', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    } catch {
      // ignore
    }
    return dateStr;
  };

  // Filter raw recharges
  const filteredRecharges = useMemo(() => {
    return recharges.filter((r) => {
      // Exclude cancelled/anulada recharges from official report
      if (r.status === 'Anulada') return false;

      // Date filtering
      const rDate = extractDateStr(r.date || r.createdAt);
      if (startDate && rDate < startDate) return false;
      if (endDate && rDate > endDate) return false;

      // Operator filtering
      if (selectedOperator !== 'all' && r.operator !== selectedOperator) {
        return false;
      }

      // Search term (phone number or ticket)
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchesPhone = r.phoneNumber?.toLowerCase().includes(term);
        const matchesTicket = (r.ticketNumber || r.id).toLowerCase().includes(term);
        const matchesCashier = r.cashierName?.toLowerCase().includes(term);
        if (!matchesPhone && !matchesTicket && !matchesCashier) {
          return false;
        }
      }

      return true;
    });
  }, [recharges, startDate, endDate, selectedOperator, searchTerm]);

  // Overall KPI metrics from filtered recharges
  const kpis = useMemo(() => {
    let totalSalesDollars = 0;
    let totalCount = 0;

    const byOp: Record<string, { count: number; totalDollars: number }> = {
      Claro: { count: 0, totalDollars: 0 },
      Tigo: { count: 0, totalDollars: 0 },
      Movistar: { count: 0, totalDollars: 0 },
      Digicel: { count: 0, totalDollars: 0 },
      Otra: { count: 0, totalDollars: 0 }
    };

    filteredRecharges.forEach((r) => {
      const saleDollars = r.amountCents 
        ? centsToDollars(r.amountCents) 
        : (Number(r.salePrice) || 0);

      totalSalesDollars += saleDollars;
      totalCount += 1;

      const op = r.operator || 'Otra';
      if (!byOp[op]) {
        byOp[op] = { count: 0, totalDollars: 0 };
      }
      byOp[op].count += 1;
      byOp[op].totalDollars += saleDollars;
    });

    const averagePerTicket = totalCount > 0 ? totalSalesDollars / totalCount : 0;

    return {
      totalSalesDollars,
      totalCount,
      averagePerTicket,
      byOp
    };
  }, [filteredRecharges]);

  // Grouped rows: By Day AND Company
  interface DailyCompanyRow {
    key: string;
    date: string;
    operator: RechargeOperator;
    count: number;
    totalDollars: number;
    recharges: Recharge[];
  }

  const rowsByCompanyAndDay = useMemo(() => {
    const map = new Map<string, DailyCompanyRow>();

    filteredRecharges.forEach((r) => {
      const dateStr = extractDateStr(r.date || r.createdAt);
      const op = r.operator;
      const key = `${dateStr}__${op}`;

      const saleDollars = r.amountCents 
        ? centsToDollars(r.amountCents) 
        : (Number(r.salePrice) || 0);

      if (!map.has(key)) {
        map.set(key, {
          key,
          date: dateStr,
          operator: op,
          count: 0,
          totalDollars: 0,
          recharges: []
        });
      }

      const item = map.get(key)!;
      item.count += 1;
      item.totalDollars += saleDollars;
      item.recharges.push(r);
    });

    // Sort descending by date, then by operator
    return Array.from(map.values()).sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return a.operator.localeCompare(b.operator);
    });
  }, [filteredRecharges]);

  // Grouped rows: Consolidated by Day (showing summary per operator)
  interface ConsolidatedDayRow {
    date: string;
    totalCount: number;
    totalDollars: number;
    byOperator: Record<string, { count: number; totalDollars: number }>;
    recharges: Recharge[];
  }

  const rowsConsolidatedByDay = useMemo(() => {
    const map = new Map<string, ConsolidatedDayRow>();

    filteredRecharges.forEach((r) => {
      const dateStr = extractDateStr(r.date || r.createdAt);
      const op = r.operator;

      const saleDollars = r.amountCents 
        ? centsToDollars(r.amountCents) 
        : (Number(r.salePrice) || 0);

      if (!map.has(dateStr)) {
        map.set(dateStr, {
          date: dateStr,
          totalCount: 0,
          totalDollars: 0,
          byOperator: {},
          recharges: []
        });
      }

      const dayRow = map.get(dateStr)!;
      dayRow.totalCount += 1;
      dayRow.totalDollars += saleDollars;
      if (!dayRow.byOperator[op]) {
        dayRow.byOperator[op] = { count: 0, totalDollars: 0 };
      }
      dayRow.byOperator[op].count += 1;
      dayRow.byOperator[op].totalDollars += saleDollars;
      dayRow.recharges.push(r);
    });

    // Sort descending by date
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredRecharges]);

  // Helper badge color for company
  const getOperatorBadge = (op: string) => {
    switch (op) {
      case 'Claro':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Tigo':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Movistar':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Digicel':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
  };

  const getOperatorDot = (op: string) => {
    switch (op) {
      case 'Claro':
        return 'bg-red-500';
      case 'Tigo':
        return 'bg-blue-500';
      case 'Movistar':
        return 'bg-emerald-500';
      case 'Digicel':
        return 'bg-amber-500';
      default:
        return 'bg-purple-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Reporte Histórico de Ventas de Recargas
              </h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Por Día y Compañía
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulta diaria de recargas vendidas y total monetario por operadora telefónica
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Print Button */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('byCompanyAndDay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'byCompanyAndDay'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Día × Compañía
            </button>
            <button
              onClick={() => setViewMode('consolidatedByDay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'consolidatedByDay'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Consolidado por Día
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            title="Imprimir reporte"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vendido */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Monto Total Vendido</p>
            <p className="text-2xl font-black text-white font-mono mt-0.5">
              ${kpis.totalSalesDollars.toFixed(2)}
            </p>
            <p className="text-[11px] text-cyan-400 font-semibold mt-0.5">
              En el período seleccionado
            </p>
          </div>
        </div>

        {/* Total Recargas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <SmartphoneCharging className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Recargas Realizadas</p>
            <p className="text-2xl font-black text-white font-mono mt-0.5">
              {kpis.totalCount}
            </p>
            <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
              Transacciones completadas
            </p>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Ticket Promedio</p>
            <p className="text-2xl font-black text-white font-mono mt-0.5">
              ${kpis.averagePerTicket.toFixed(2)}
            </p>
            <p className="text-[11px] text-amber-400 font-semibold mt-0.5">
              Por recarga emitida
            </p>
          </div>
        </div>

        {/* Días con Actividad */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Días con Ventas</p>
            <p className="text-2xl font-black text-white font-mono mt-0.5">
              {rowsConsolidatedByDay.length}
            </p>
            <p className="text-[11px] text-purple-400 font-semibold mt-0.5">
              Jornadas con movimientos
            </p>
          </div>
        </div>
      </div>

      {/* Compañías Breakdown Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {ALL_RECHARGE_OPERATORS.map((op) => {
          const stat = kpis.byOp[op] || { count: 0, totalDollars: 0 };
          const isSelected = selectedOperator === op;

          return (
            <button
              key={op}
              type="button"
              onClick={() => setSelectedOperator(prev => prev === op ? 'all' : op)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800 border-cyan-500 ring-2 ring-cyan-500/40 shadow-lg'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${getOperatorDot(op)}`} />
                  <span className="font-bold text-xs text-white">{op}</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {stat.count} rec.
                </span>
              </div>
              <div className="mt-2.5">
                <p className="text-sm font-black font-mono text-cyan-300">
                  ${stat.totalDollars.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-500">
                  {stat.count === 1 ? '1 venta' : `${stat.count} ventas`}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        {/* Date presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Período:
            </span>
            <button
              type="button"
              onClick={() => handlePresetChange('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'today'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'yesterday'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('last7')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'last7'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Últimos 7 Días
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('thisMonth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'thisMonth'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'all'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todo el Historial
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Filtros</span>
          </button>
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Start Date */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Filter Operator */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Compañía
            </label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Todas las Compañías</option>
              {ALL_RECHARGE_OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

          {/* Search Phone / Ticket */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Buscar Teléfono / Ticket / Cajero
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ej. 7123-4567 o TK-REC"
                className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Table: MODE 1 - By Company and Day */}
      {viewMode === 'byCompanyAndDay' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Ventas Diarias Discriminadas por Compañía</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  {rowsByCompanyAndDay.length} registros
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cada fila refleja el total vendido por operadora en una fecha específica
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-3.5">Fecha</th>
                  <th className="py-3 px-3.5">Compañía</th>
                  <th className="py-3 px-3.5 text-center">Cantidad de Recargas</th>
                  <th className="py-3 px-3.5">Monto Total Vendido</th>
                  <th className="py-3 px-3.5">Ticket Promedio</th>
                  <th className="py-3 px-3.5 text-right">Detalle de Operaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {rowsByCompanyAndDay.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 italic font-sans">
                      No se encontraron ventas de recargas para los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  rowsByCompanyAndDay.map((row) => {
                    const isExpanded = !!expandedRowKeys[row.key];
                    const avg = row.count > 0 ? row.totalDollars / row.count : 0;

                    return (
                      <React.Fragment key={row.key}>
                        <tr className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3.5 font-sans font-semibold text-white">
                            <div>
                              <span>{row.date}</span>
                              <span className="block text-[11px] text-slate-400 font-normal">
                                {formatDisplayDate(row.date)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 font-sans">
                            <span
                              className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 w-fit border ${getOperatorBadge(
                                row.operator
                              )}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${getOperatorDot(row.operator)}`} />
                              {row.operator}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center font-bold text-white text-sm">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                              {row.count} {row.count === 1 ? 'recarga' : 'recargas'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-black text-cyan-300 text-sm">
                            ${row.totalDollars.toFixed(2)}
                          </td>
                          <td className="py-3 px-3.5 text-slate-300 font-semibold">
                            ${avg.toFixed(2)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-sans">
                            <button
                              type="button"
                              onClick={() => toggleRowExpansion(row.key)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>{isExpanded ? 'Ocultar' : 'Ver Desglose'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Collapsible individual recharges list */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80">
                            <td colSpan={6} className="p-4 border-y border-slate-800 font-sans">
                              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                    <SmartphoneCharging className="w-4 h-4 text-cyan-400" />
                                    <span>Recargas del {row.date} — {row.operator}</span>
                                  </h4>
                                  <span className="text-[11px] text-slate-400">
                                    Total: ${row.totalDollars.toFixed(2)} ({row.count} recargas)
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs font-mono text-slate-300">
                                    <thead>
                                      <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-800">
                                        <th className="py-1.5 px-2">Hora</th>
                                        <th className="py-1.5 px-2">Ticket</th>
                                        <th className="py-1.5 px-2">Teléfono</th>
                                        <th className="py-1.5 px-2">Monto</th>
                                        <th className="py-1.5 px-2">Cajero</th>
                                        <th className="py-1.5 px-2 text-right">Comprobante</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/40">
                                      {row.recharges.map((rec) => {
                                        const amountStr = rec.amountCents 
                                          ? formatCents(rec.amountCents) 
                                          : `$${(rec.salePrice || 0).toFixed(2)}`;
                                        const timeStr = new Date(rec.date || rec.createdAt).toLocaleTimeString('es-SV', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        });

                                        return (
                                          <tr key={rec.id} className="hover:bg-slate-800/50">
                                            <td className="py-2 px-2 text-slate-400">{timeStr}</td>
                                            <td className="py-2 px-2 font-bold text-cyan-400">
                                              {rec.ticketNumber || rec.id}
                                            </td>
                                            <td className="py-2 px-2 font-bold text-white">
                                              {rec.phoneNumber}
                                            </td>
                                            <td className="py-2 px-2 font-black text-cyan-300">
                                              {amountStr}
                                            </td>
                                            <td className="py-2 px-2 font-sans text-slate-300">
                                              {rec.cashierName || 'Cajero'}
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                              {onOpenTicket && (
                                                <button
                                                  type="button"
                                                  onClick={() => onOpenTicket(rec)}
                                                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                                                  title="Ver comprobante"
                                                >
                                                  <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {rowsByCompanyAndDay.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-700 bg-slate-950 font-mono text-xs">
                    <td className="py-3 px-3.5 font-sans font-bold text-white" colSpan={2}>
                      GRAN TOTAL DEL PERÍODO
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-emerald-400 text-sm">
                      {kpis.totalCount} recargas
                    </td>
                    <td className="py-3 px-3.5 font-black text-cyan-300 text-base">
                      ${kpis.totalSalesDollars.toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-300">
                      ${kpis.averagePerTicket.toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Main Report Table: MODE 2 - Consolidated by Day */}
      {viewMode === 'consolidatedByDay' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Consolidado Diario con Desglose Horizontal por Compañía</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  {rowsConsolidatedByDay.length} días
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Resumen por fecha con el volumen de ventas por cada operadora
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-3.5">Fecha</th>
                  <th className="py-3 px-3.5">Claro</th>
                  <th className="py-3 px-3.5">Tigo</th>
                  <th className="py-3 px-3.5">Movistar</th>
                  <th className="py-3 px-3.5">Digicel</th>
                  <th className="py-3 px-3.5 text-center">Total Recargas</th>
                  <th className="py-3 px-3.5">Total Vendido ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {rowsConsolidatedByDay.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 italic font-sans">
                      No se encontraron ventas de recargas para los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  rowsConsolidatedByDay.map((row) => {
                    const claro = row.byOperator['Claro'] || { count: 0, totalDollars: 0 };
                    const tigo = row.byOperator['Tigo'] || { count: 0, totalDollars: 0 };
                    const movistar = row.byOperator['Movistar'] || { count: 0, totalDollars: 0 };
                    const digicel = row.byOperator['Digicel'] || { count: 0, totalDollars: 0 };

                    return (
                      <tr key={row.date} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3.5 font-sans font-semibold text-white">
                          <div>
                            <span>{row.date}</span>
                            <span className="block text-[11px] text-slate-400 font-normal">
                              {formatDisplayDate(row.date)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="text-slate-200">
                            <span className="font-bold text-red-400">${claro.totalDollars.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({claro.count})</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="text-slate-200">
                            <span className="font-bold text-blue-400">${tigo.totalDollars.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({tigo.count})</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="text-slate-200">
                            <span className="font-bold text-emerald-400">${movistar.totalDollars.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({movistar.count})</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="text-slate-200">
                            <span className="font-bold text-amber-400">${digicel.totalDollars.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({digicel.count})</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-center font-bold text-white">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                            {row.totalCount} recargas
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-black text-cyan-300 text-sm">
                          ${row.totalDollars.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {rowsConsolidatedByDay.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-700 bg-slate-950 font-mono text-xs">
                    <td className="py-3 px-3.5 font-sans font-bold text-white">
                      TOTALES
                    </td>
                    <td className="py-3 px-3.5 font-bold text-red-400">
                      ${(kpis.byOp['Claro']?.totalDollars || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-blue-400">
                      ${(kpis.byOp['Tigo']?.totalDollars || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-emerald-400">
                      ${(kpis.byOp['Movistar']?.totalDollars || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-amber-400">
                      ${(kpis.byOp['Digicel']?.totalDollars || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-emerald-400 text-sm">
                      {kpis.totalCount} recargas
                    </td>
                    <td className="py-3 px-3.5 font-black text-cyan-300 text-base">
                      ${kpis.totalSalesDollars.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
