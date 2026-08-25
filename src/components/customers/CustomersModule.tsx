import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  UserCheck, 
  Building, 
  Mail, 
  Phone, 
  FileText, 
  Tag, 
  Pencil, 
  Trash2, 
  X, 
  Star, 
  ShoppingBag, 
  MapPin, 
  Briefcase, 
  BadgeDollarSign, 
  UserPlus, 
  Sparkles,
  Info
} from 'lucide-react';
import { Customer, CustomerType, DocumentType } from '../../types';

interface CustomersModuleProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  onUpdateCustomer: (id: string, updatedData: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
}

export const CustomersModule: React.FC<CustomersModuleProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('Todos');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [docType, setDocType] = useState<DocumentType>('DUI');
  const [docNumber, setDocNumber] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [address, setAddress] = useState('');
  const [giro, setGiro] = useState('');
  const [type, setType] = useState<CustomerType>('Regular');
  const [notes, setNotes] = useState('');

  // Selected Detail View Modal
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setDocType('DUI');
    setDocNumber('');
    setRazonSocial('');
    setAddress('');
    setGiro('');
    setType('Regular');
    setNotes('');
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFullName(c.fullName);
    setPhone(c.phone);
    setEmail(c.email || '');
    setDocType(c.docType || 'DUI');
    setDocNumber(c.docNumber || '');
    setRazonSocial(c.razonSocial || '');
    setAddress(c.address || '');
    setGiro(c.giro || '');
    setType(c.type || 'Regular');
    setNotes(c.notes || '');
    setShowModal(true);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !docNumber.trim()) {
      alert('Por favor completa los campos obligatorios (*)');
      return;
    }

    if (editingCustomer) {
      onUpdateCustomer(editingCustomer.id, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        docType,
        docNumber: docNumber.trim(),
        razonSocial: razonSocial.trim() || fullName.trim(),
        address: address.trim() || undefined,
        giro: giro.trim() || undefined,
        type,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString()
      });
    } else {
      onAddCustomer({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        docType,
        docNumber: docNumber.trim(),
        razonSocial: razonSocial.trim() || fullName.trim(),
        address: address.trim() || undefined,
        giro: giro.trim() || undefined,
        type,
        notes: notes.trim() || undefined,
        totalPurchasesCount: 0,
        totalSpentAmount: 0.00
      });
    }

    setShowModal(false);
  };

  // Confirm Delete Handler
  const handleDelete = (c: Customer) => {
    if (confirm(`¿Estás seguro de eliminar al cliente "${c.fullName}"?`)) {
      onDeleteCustomer(c.id);
      if (detailCustomer?.id === c.id) setDetailCustomer(null);
    }
  };

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.razonSocial && c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = 
        selectedTypeFilter === 'Todos' || c.type === selectedTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [customers, searchTerm, selectedTypeFilter]);

  // Stats Counters
  const stats = useMemo(() => {
    const total = customers.length;
    const vip = customers.filter(c => c.type === 'VIP').length;
    const mayorista = customers.filter(c => c.type === 'Mayorista').length;
    const leads = customers.filter(c => c.type === 'Lead/Prospecto').length;
    return { total, vip, mayorista, leads };
  }, [customers]);

  // Helper badge color
  const getTypeBadge = (type: CustomerType) => {
    switch (type) {
      case 'VIP':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Mayorista':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Lead/Prospecto':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md max-w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">Gestión de Clientes & CRM</h2>
            <p className="text-xs text-slate-400 truncate">Directorio de clientes, facturación electrónica (DUI/NIT/NRC) y prospectos</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-md shadow-cyan-600/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Cliente / Lead</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-1 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Clientes</span>
          <p className="text-xl sm:text-2xl font-extrabold text-white font-mono">{stats.total}</p>
          <p className="text-[10px] text-slate-400">Registrados en sistema</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-1 shadow-md">
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block flex items-center gap-1">
            <Star className="w-3 h-3 text-purple-400" /> Clientes VIP
          </span>
          <p className="text-xl sm:text-2xl font-extrabold text-purple-300 font-mono">{stats.vip}</p>
          <p className="text-[10px] text-purple-400/80">Alto volumen y frecuencia</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-1 shadow-md">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block flex items-center gap-1">
            <Building className="w-3 h-3 text-blue-400" /> Mayoristas
          </span>
          <p className="text-xl sm:text-2xl font-extrabold text-blue-300 font-mono">{stats.mayorista}</p>
          <p className="text-[10px] text-blue-400/80">Compradores corporativos</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-1 shadow-md">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1">
            <UserPlus className="w-3 h-3 text-amber-400" /> Leads / Prospectos
          </span>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-300 font-mono">{stats.leads}</p>
          <p className="text-[10px] text-amber-400/80">Oportunidades comerciales</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, teléfono, correo o documento (DUI / NIT / NRC)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 transition-all"
            />
          </div>

          {/* CRM Type Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['Todos', 'Regular', 'VIP', 'Mayorista', 'Lead/Prospecto'].map(filterType => (
              <button
                key={filterType}
                type="button"
                onClick={() => setSelectedTypeFilter(filterType)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTypeFilter === filterType
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {filterType}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers Table / Directory */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Cliente / Razón Social</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Documento Fiscal</th>
                <th className="py-3 px-4">Clasificación CRM</th>
                <th className="py-3 px-4 text-right">Compras / Gasto Total</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-xs">No se encontraron clientes con el criterio de búsqueda.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                    {/* Customer Name & Business Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-xs">{c.fullName}</div>
                      {c.razonSocial && c.razonSocial !== c.fullName && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[200px]">{c.razonSocial}</span>
                        </div>
                      )}
                    </td>

                    {/* Contact Info */}
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="font-mono">{c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[180px]">{c.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Fiscal Document */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 font-bold rounded text-[10px] border border-slate-700 uppercase">
                          {c.docType}
                        </span>
                        <span className="font-mono font-semibold text-white">{c.docNumber}</span>
                      </div>
                      {c.giro && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                          {c.giro}
                        </p>
                      )}
                    </td>

                    {/* CRM Classification */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border inline-block ${getTypeBadge(c.type)}`}>
                        {c.type}
                      </span>
                    </td>

                    {/* Spending & Purchases */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-extrabold text-emerald-400 font-mono text-xs">
                        ${(c.totalSpentAmount || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {c.totalPurchasesCount || 0} compras
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailCustomer(c)}
                          title="Ver ficha completa"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg transition-all cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          title="Editar cliente"
                          className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg transition-all cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          title="Eliminar cliente"
                          className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 text-slate-100 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingCustomer ? 'Editar Cliente / Prospecto' : 'Nuevo Cliente / Registro Fiscal'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* SECTION 1: Personal & Contact Data */}
              <div className="space-y-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <h4 className="font-bold text-cyan-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Datos Personales y de Contacto
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">Nombre Completo / Nombre Comercial *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="ej. María Fernanda López"
                      required
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Teléfono / WhatsApp *</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="ej. +503 7654-3210"
                      required
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ej. cliente@correo.com"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Fiscal Data (Electronic Invoicing) */}
              <div className="space-y-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Datos Fiscales (Facturación Electrónica)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Tipo Documento *</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as DocumentType)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                    >
                      <option value="DUI">DUI (Persona Natural)</option>
                      <option value="NIT">NIT (Empresa / Persona)</option>
                      <option value="NRC">NRC (Contribuyente)</option>
                      <option value="Otro">Otro Documento</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">Número de Documento *</label>
                    <input
                      type="text"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      placeholder="ej. 04859302-8 o 0614-150820-102-3"
                      required
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-slate-300 font-semibold mb-1">Razón Social (Nombre en Comprobante Fiscal)</label>
                    <input
                      type="text"
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(e.target.value)}
                      placeholder="ej. Distribuidora Tecnológica El Salvador S.A. de C.V."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">Dirección Fiscal / Residencia</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="ej. Col. Escalón, Pje. 4 #122, San Salvador"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Giro Comercial / Actividad</label>
                    <input
                      type="text"
                      value={giro}
                      onChange={(e) => setGiro(e.target.value)}
                      placeholder="ej. Servicios Profesionales"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: CRM Classification */}
              <div className="space-y-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Clasificación CRM y Preferencias
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Tipo de Cliente (Segmentación)</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as CustomerType)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                    >
                      <option value="Regular">Regular (Consumidor Final)</option>
                      <option value="VIP">VIP (Cliente Recurrente)</option>
                      <option value="Mayorista">Mayorista (Precios de Mayoreo)</option>
                      <option value="Lead/Prospecto">Lead / Prospecto Comercial</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">Notas u Observaciones CRM</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas del cliente, gustos, historial previo o cotizaciones pendientes..."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit / Cancel buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
                >
                  {editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {detailCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getTypeBadge(detailCustomer.type)}`}>
                  {detailCustomer.type}
                </span>
                <h3 className="text-base font-bold text-white truncate max-w-[280px]">
                  {detailCustomer.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailCustomer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Razón Social Fiscal:</span>
                  <strong className="text-white font-mono">{detailCustomer.razonSocial || detailCustomer.fullName}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Documento ({detailCustomer.docType}):</span>
                  <strong className="text-cyan-400 font-mono">{detailCustomer.docNumber}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Teléfono / WhatsApp:</span>
                  <strong className="text-white font-mono">{detailCustomer.phone}</strong>
                </div>
                {detailCustomer.email && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Correo Electrónico:</span>
                    <strong className="text-white">{detailCustomer.email}</strong>
                  </div>
                )}
                {detailCustomer.address && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Dirección Fiscal:</span>
                    <strong className="text-slate-200 text-right">{detailCustomer.address}</strong>
                  </div>
                )}
                {detailCustomer.giro && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Giro Comercial:</span>
                    <strong className="text-slate-200">{detailCustomer.giro}</strong>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Compras Realizadas</span>
                  <p className="text-lg font-extrabold text-white font-mono">{detailCustomer.totalPurchasesCount || 0}</p>
                </div>
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Gasto Acumulado</span>
                  <p className="text-lg font-extrabold text-emerald-400 font-mono">${(detailCustomer.totalSpentAmount || 0).toFixed(2)}</p>
                </div>
              </div>

              {detailCustomer.notes && (
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-amber-400 font-bold uppercase block mb-1">Observaciones CRM:</span>
                  <p className="text-slate-300 italic">{detailCustomer.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setDetailCustomer(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
