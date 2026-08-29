import React, { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  X, 
  Printer, 
  Edit3, 
  Eye, 
  Camera,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Customer } from '../../types';
import { Repair, RepairStatus } from '../../types';
import { ImageUpload } from '../common/ImageUpload';

interface RepairsModuleProps {
  repairs: Repair[];
  customers?: Customer[];
  onAddRepair: (repair: Omit<Repair, 'id' | 'receivedDate' | 'updatedAt'>) => void;
  onUpdateRepairStatus: (id: string, newStatus: RepairStatus, techNotes?: string) => void;
  onConsultAI?: (brand: string, model: string, issue: string) => void;
}

export const RepairsModule: React.FC<RepairsModuleProps> = ({
  repairs,
  customers = [],
  onAddRepair,
  onUpdateRepairStatus,
  onConsultAI
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Printable Ticket Paper Format (80mm default or 58mm mobile/Bluetooth)
  const [printPaperWidth, setPrintPaperWidth] = useState<'80mm' | '58mm'>(() => {
    return (localStorage.getItem('celltronic_ticket_paper_width') as '80mm' | '58mm') || '80mm';
  });

  const togglePaperWidth = (width: '80mm' | '58mm') => {
    setPrintPaperWidth(width);
    localStorage.setItem('celltronic_ticket_paper_width', width);
  };
  // Modals State
  const [showNewRepairModal, setShowNewRepairModal] = useState(false);
  const [selectedRepairDetail, setSelectedRepairDetail] = useState<Repair | null>(null);
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState<Repair | null>(null);
  const [showPrintTicketModal, setShowPrintTicketModal] = useState<Repair | null>(null);

  // New Repair Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerDocumentId, setCustomerDocumentId] = useState('');
  const [deviceBrand, setDeviceBrand] = useState('iPhone');
  const [deviceModel, setDeviceModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('25.00');
  const [advancePayment, setAdvancePayment] = useState('0.00');
  const [devicePhotoUrl, setDevicePhotoUrl] = useState('');
  const [documentPhotoUrl, setDocumentPhotoUrl] = useState('');

  // Status Update State
  const [nextStatus, setNextStatus] = useState<RepairStatus>('En Diagnóstico');
  const [technicianNotes, setTechnicianNotes] = useState('');

  const statuses: RepairStatus[] = [
    'Recibido',
    'En Diagnóstico',
    'Esperando Repuesto',
    'En Reparación',
    'Listo para Entregar',
    'Entregado',
    'Cancelado'
  ];

  const filteredRepairs = repairs.filter(r => {
    const matchesSearch = r.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.deviceModel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'Todos' || r.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: RepairStatus) => {
    switch (status) {
      case 'Recibido': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'En Diagnóstico': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Esperando Repuesto': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'En Reparación': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'Listo para Entregar': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Entregado': return 'bg-slate-700 text-slate-300 border-slate-600';
      case 'Cancelado': return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  const handleCreateRepair = (e: React.FormEvent) => {
    e.preventDefault();
    const newTicketNumber = `REP-2026-${Math.floor(100 + Math.random() * 900)}`;

    onAddRepair({
      ticketNumber: newTicketNumber,
      customerId: selectedCustomerId,
      customerName,
      customerPhone,
      customerDocumentId,
      deviceBrand,
      deviceModel,
      serialNumber,
      issueDescription,
      status: 'Recibido',
      estimatedCost: parseFloat(estimatedCost) || 0,
      advancePayment: parseFloat(advancePayment) || 0,
      devicePhotoUrl,
      documentPhotoUrl,
      technicianNotes: 'Dispositivo ingresado a recepción. Pendiente de diagnóstico.'
    });

    setShowNewRepairModal(false);
    // Reset form
    setSelectedCustomerId(undefined);
    setCustomerSearchQuery('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerDocumentId('');
    setDeviceBrand('iPhone');
    setDeviceModel('');
    setSerialNumber('');
    setIssueDescription('');
    setDevicePhotoUrl('');
    setDocumentPhotoUrl('');
  };

  const handleSaveStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (showStatusUpdateModal) {
      onUpdateRepairStatus(showStatusUpdateModal.id, nextStatus, technicianNotes);
      setShowStatusUpdateModal(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & New Repair Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md max-w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">Recepción y Servicio Técnico de Equipos</h2>
            <p className="text-xs text-slate-400 truncate">Total de tickets registrados: {repairs.length}</p>
          </div>
        </div>

        <button
          onClick={() => setShowNewRepairModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> Ingresar Nuevo Equipo
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xl max-w-full">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, modelo o número de ticket (ej. REP-2026-001)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-purple-500"
          />
        </div>

        {/* Status Pipeline Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none touch-pan-x max-w-full whitespace-nowrap">
          <button
            onClick={() => setSelectedStatus('Todos')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedStatus === 'Todos'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todos ({repairs.length})
          </button>
          {statuses.map(st => {
            const count = repairs.filter(r => r.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                  selectedStatus === st
                    ? 'bg-purple-600 text-white border-purple-500 shadow-xs font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Repairs Ticket Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-full">
        {filteredRepairs.map(r => (
          <div
            key={r.id}
            className="bg-slate-900 border border-slate-800 hover:border-purple-500/60 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg transition-all max-w-full overflow-hidden"
          >
            {/* Ticket Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-xs font-bold text-purple-400">{r.ticketNumber}</span>
                <h3 className="font-extrabold text-white text-sm mt-0.5 truncate">{r.deviceBrand} {r.deviceModel}</h3>
                <p className="text-[11px] text-slate-400 truncate">Cliente: {r.customerName}</p>
              </div>

              <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(r.status)}`}>
                {r.status}
              </span>
            </div>

            {/* Issue Description */}
            <p className="text-xs text-slate-300 line-clamp-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              {r.issueDescription}
            </p>

            {/* Photos Thumbnails Indicator */}
            <div className="flex items-center gap-2 pt-1">
              {r.devicePhotoUrl ? (
                <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-700 bg-black">
                  <img src={r.devicePhotoUrl} alt="Estado" className="w-full h-full object-cover" />
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 italic">Sin foto equipo</span>
              )}

              {r.documentPhotoUrl ? (
                <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-700 bg-black">
                  <img src={r.documentPhotoUrl} alt="Documento" className="w-full h-full object-cover" />
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 italic">Sin foto doc</span>
              )}
            </div>

            {/* Actions Bar */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2">
              <div>
                <p className="text-[10px] text-slate-400">Presupuesto Estimado:</p>
                <p className="font-extrabold text-emerald-400">${r.estimatedCost.toFixed(2)}</p>
              </div>

              <div className="flex items-center gap-1.5">
                {onConsultAI && (
                  <button
                    onClick={() => onConsultAI(r.deviceBrand, r.deviceModel, r.issueDescription)}
                    className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg transition-colors cursor-pointer"
                    title="Consultar diagnóstico con IA para este equipo"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedRepairDetail(r)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                  title="Ver detalle completo"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setShowStatusUpdateModal(r);
                    setNextStatus(r.status);
                    setTechnicianNotes(r.technicianNotes || '');
                  }}
                  className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg cursor-pointer"
                  title="Actualizar estado del taller"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowPrintTicketModal(r)}
                  className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg cursor-pointer"
                  title="Imprimir ticket de recepción"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Repair Registration Modal with Photos */}
      {showNewRepairModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-100 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-purple-400" />
                Recepción de Dispositivo para Servicio Técnico
              </h3>
              <button onClick={() => setShowNewRepairModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRepair} className="space-y-4 text-xs">
              {/* Customer Info with CRM lookup */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">
                    1. Datos del Propietario / Cliente
                  </h4>
                  {selectedCustomerId && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      ✓ Cliente Registrado CRM
                    </span>
                  )}
                </div>

                {/* CRM Customer Autocomplete Dropdown */}
                {customers.length > 0 && (
                  <div className="relative">
                    <label className="block text-slate-400 font-semibold mb-1">Buscar en Base de Clientes (Opcional):</label>
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setIsCustomerDropdownOpen(true);
                        setCustomerName(e.target.value);
                      }}
                      placeholder="Escriba nombre, teléfono o DUI/NIT para vincular cliente..."
                      className="w-full px-3 py-2 bg-slate-800 border border-purple-500/30 rounded-xl text-white placeholder-slate-500"
                    />

                    {isCustomerDropdownOpen && customerSearchQuery.trim() && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-40 overflow-y-auto divide-y divide-slate-800">
                        {customers.filter(c => 
                          c.fullName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                          c.phone.includes(customerSearchQuery) ||
                          c.docNumber.includes(customerSearchQuery)
                        ).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setCustomerName(c.fullName);
                              setCustomerPhone(c.phone);
                              setCustomerDocumentId(c.docNumber);
                              setCustomerSearchQuery(c.fullName);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className="w-full text-left p-2.5 hover:bg-slate-800 transition-colors flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold text-white text-xs">{c.fullName}</div>
                              <div className="text-[10px] text-slate-400">{c.docType}: {c.docNumber} • Tel: {c.phone}</div>
                            </div>
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">
                              {c.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="ej. María López"
                      required
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Teléfono Móvil *</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+503 7654-3210"
                      required
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Documento ID (DUI/NIT/NRC)</label>
                    <input
                      type="text"
                      value={customerDocumentId}
                      onChange={(e) => setCustomerDocumentId(e.target.value)}
                      placeholder="04859302-8"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Device Details */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
                <h4 className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">
                  2. Especificaciones del Dispositivo
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Marca</label>
                    <select
                      value={deviceBrand}
                      onChange={(e) => setDeviceBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    >
                      <option value="Apple">Apple</option>
                      <option value="Samsung">Samsung</option>
                      <option value="Xiaomi">Xiaomi</option>
                      <option value="Motorola">Motorola</option>
                      <option value="Huawei">Huawei</option>
                      <option value="Honor">Honor</option>
                      <option value="Otra">Otra Marca</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Modelo Exacto *</label>
                    <input
                      type="text"
                      value={deviceModel}
                      onChange={(e) => setDeviceModel(e.target.value)}
                      placeholder="ej. iPhone 13 / Galaxy A54"
                      required
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Serie / IMEI (Opcional)</label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="3582910482019"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Falla / Motivo de Ingreso *</label>
                  <textarea
                    rows={2}
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Describa detalle del problema expresado por el cliente..."
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Costo Estimado Repuesto + Servicio ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Abono / Anticipo ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={advancePayment}
                      onChange={(e) => setAdvancePayment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
                <h4 className="font-bold text-purple-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-400" />
                  3. Registro Fotográfico (Estado del Equipo & Documento ID)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ImageUpload
                    label="Foto Estado del Equipo"
                    subLabel="Rayones, pantalla o fisuras iniciales"
                    value={devicePhotoUrl}
                    onChange={setDevicePhotoUrl}
                  />

                  <ImageUpload
                    label="Foto Documento de Identidad"
                    subLabel="DUI / Cédula del cliente"
                    value={documentPhotoUrl}
                    onChange={setDocumentPhotoUrl}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRepairModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                >
                  <CheckCircle2 className="w-4 h-4" /> Registrar e Imprimir Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repair Detail View Modal */}
      {selectedRepairDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs text-purple-400 font-bold">{selectedRepairDetail.ticketNumber}</span>
                <h3 className="text-base font-bold text-white">{selectedRepairDetail.deviceBrand} {selectedRepairDetail.deviceModel}</h3>
              </div>
              <button onClick={() => setSelectedRepairDetail(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl">
                <div>
                  <p className="text-slate-400 text-[10px] font-semibold">Cliente:</p>
                  <p className="font-bold text-white">{selectedRepairDetail.customerName}</p>
                  <p className="text-slate-400">{selectedRepairDetail.customerPhone}</p>
                  <p className="text-slate-400 font-mono">DUI: {selectedRepairDetail.customerDocumentId || 'No registrado'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-semibold">Estado Actual:</p>
                  <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(selectedRepairDetail.status)}`}>
                    {selectedRepairDetail.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-semibold mb-1">Descripción de la Falla:</p>
                <p className="bg-slate-800 p-2.5 rounded-xl text-slate-200">{selectedRepairDetail.issueDescription}</p>
              </div>

              {selectedRepairDetail.technicianNotes && (
                <div>
                  <p className="text-purple-300 font-semibold mb-1">Notas del Técnico:</p>
                  <p className="bg-purple-950/40 border border-purple-500/30 p-2.5 rounded-xl text-purple-200">
                    {selectedRepairDetail.technicianNotes}
                  </p>
                </div>
              )}

              {/* Photos Gallery */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Estado del Equipo</p>
                  {selectedRepairDetail.devicePhotoUrl ? (
                    <img src={selectedRepairDetail.devicePhotoUrl} alt="Estado Equipo" className="w-full h-32 object-contain bg-black rounded-xl border border-slate-700" />
                  ) : (
                    <div className="h-32 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-[11px]">Sin foto</div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Documento de Identidad</p>
                  {selectedRepairDetail.documentPhotoUrl ? (
                    <img src={selectedRepairDetail.documentPhotoUrl} alt="Documento ID" className="w-full h-32 object-contain bg-black rounded-xl border border-slate-700" />
                  ) : (
                    <div className="h-32 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-[11px]">Sin foto</div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              {onConsultAI ? (
                <button
                  type="button"
                  onClick={() => {
                    const brand = selectedRepairDetail.deviceBrand;
                    const model = selectedRepairDetail.deviceModel;
                    const issue = selectedRepairDetail.issueDescription;
                    setSelectedRepairDetail(null);
                    onConsultAI(brand, model, issue);
                  }}
                  className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Diagnosticar Falla con IA</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setSelectedRepairDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusUpdateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Cambiar Estado del Taller Técnico
            </h3>

            <form onSubmit={handleSaveStatusUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nuevo Estado</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as RepairStatus)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold"
                >
                  {statuses.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notas del Técnico / Diagnóstico</label>
                <textarea
                  rows={3}
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder="Detalle de avance, repuesto instalado o resultado de pruebas..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusUpdateModal(null)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-md"
                >
                  Actualizar Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Ticket Receipt for Customer */}
      {showPrintTicketModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 print-modal-overlay">
          <div
            id="pos-ticket-receipt"
            className={`bg-white text-black rounded-xl shadow-2xl space-y-2 font-mono transition-all box-border border border-slate-200 ${
              printPaperWidth === '80mm'
                ? 'ticket-paper-80mm max-w-[340px] w-full p-4 text-xs'
                : 'ticket-paper-48mm max-w-[384px] w-[48mm] p-2 text-[10.5px] leading-tight'
            }`}
            style={{
              width: printPaperWidth === '80mm' ? '80mm' : '48mm',
              maxWidth: printPaperWidth === '80mm' ? '80mm' : '384px',
              margin: '0 auto',
              padding: printPaperWidth === '80mm' ? '4mm' : '1mm 0mm',
              fontSize: '10.5px',
              lineHeight: '1.25',
              wordBreak: 'break-word',
            }}
          >
            {/* Paper Width Config Selector (Hidden during print) */}
            <div className="no-print bg-slate-100 p-2 rounded-lg flex items-center justify-between text-[11px] font-sans border border-slate-300 mb-1">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Printer className="w-3.5 h-3.5 text-purple-600" />
                Ticket Térmico (48mm/58mm)
              </span>
              <button
                type="button"
                onClick={() => setShowPrintTicketModal(null)}
                className="text-slate-500 hover:text-slate-900 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center border-b border-dashed border-black pb-1 space-y-0.5">
              <h2 className="font-extrabold text-[12px] tracking-wider text-black">
                CELLTRONIC TALLER TÉCNICO
              </h2>
              <p className="text-[10px] text-black">Recepción de Dispositivos</p>
              <p className="font-extrabold text-[11px] text-black mt-0.5">
                {showPrintTicketModal.ticketNumber}
              </p>
            </div>

            <div className="space-y-0.5 border-b border-dashed border-black pb-1 text-[10px] text-black">
              <div className="flex justify-between">
                <span>Fecha Ingreso:</span>
                <span>{new Date(showPrintTicketModal.receivedDate).toLocaleDateString('es-SV')}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Cliente:</span>
                <span className="truncate max-w-[170px]">{showPrintTicketModal.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Teléfono:</span>
                <span>{showPrintTicketModal.customerPhone}</span>
              </div>
              {showPrintTicketModal.customerDocumentId && (
                <div className="flex justify-between">
                  <span>DUI/DNI:</span>
                  <span>{showPrintTicketModal.customerDocumentId}</span>
                </div>
              )}
            </div>

            <div className="space-y-0.5 border-b border-dashed border-black pb-1 text-[10px] text-black">
              <p className="font-bold">Equipo: {showPrintTicketModal.deviceBrand} {showPrintTicketModal.deviceModel}</p>
              <p className="text-[9.5px]">IMEI/Serie: {showPrintTicketModal.serialNumber || 'No especificado'}</p>
              <p className="text-[9.5px]">Falla: {showPrintTicketModal.issueDescription}</p>
            </div>

            <div className="space-y-0.5 text-[10.5px] border-b border-dashed border-black pb-1">
              <div className="flex justify-between font-extrabold">
                <span>Presupuesto:</span>
                <span>${showPrintTicketModal.estimatedCost.toFixed(2)}</span>
              </div>

              {showPrintTicketModal.advancePayment && showPrintTicketModal.advancePayment > 0 ? (
                <div className="flex justify-between font-semibold text-[10px]">
                  <span>Anticipo Pagado:</span>
                  <span>-${showPrintTicketModal.advancePayment.toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            <div className="text-[9px] text-black leading-tight border-b border-dashed border-black pb-1">
              <strong>TÉRMINOS:</strong> Presentar este ticket para retirar el equipo. CELLTRONIC no se responsabiliza por equipos no retirados tras 30 días del aviso.
            </div>

            {/* Print Action Buttons (Hidden during print) */}
            <div className="no-print flex gap-2 pt-1 border-t border-slate-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" /> Imprimir (48mm)
              </button>
              <button
                type="button"
                onClick={() => setShowPrintTicketModal(null)}
                className="py-2 px-3 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold text-center cursor-pointer shadow-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
