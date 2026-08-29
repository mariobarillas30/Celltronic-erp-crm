import React, { useState } from 'react';
import { 
  X, 
  DollarSign, 
  Receipt, 
  Truck, 
  CheckCircle2, 
  Printer, 
  FileText, 
  AlertCircle,
  Building,
  Tag
} from 'lucide-react';
import { PettyCashExpense, PettyCashExpenseCategory, Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface PettyCashExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  currentShiftId?: string;
  onRegisterExpense: (expense: Omit<PettyCashExpense, 'id' | 'voucherNumber' | 'createdAt'>) => PettyCashExpense;
}

const EXPENSE_CATEGORIES: PettyCashExpenseCategory[] = [
  'Pago a Proveedor',
  'Compra de Mercadería / Repuestos',
  'Servicios Básicos / Local',
  'Insumos de Limpieza / Oficina',
  'Transporte / Flete',
  'Alimentación',
  'Mantenimiento',
  'Otros Gastos Imprevistos'
];

export const PettyCashExpenseModal: React.FC<PettyCashExpenseModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  currentShiftId,
  onRegisterExpense
}) => {
  const { currentUser } = useAuth();

  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<PettyCashExpenseCategory>('Pago a Proveedor');
  const [recipient, setRecipient] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Generated voucher state upon success
  const [generatedExpense, setGeneratedExpense] = useState<PettyCashExpense | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor ingrese un monto válido y mayor a $0.00.');
      return;
    }

    if (!recipient.trim()) {
      setError('Por favor ingrese o seleccione el Proveedor o Beneficiario.');
      return;
    }

    if (!concept.trim()) {
      setError('Por favor detalle el concepto o motivo del gasto.');
      return;
    }

    if (!invoiceNumber.trim()) {
      setError('Por favor ingrese el N° de Comprobante, Factura o Recibo del proveedor.');
      return;
    }

    const created = onRegisterExpense({
      date: new Date().toISOString(),
      cashierUid: currentUser?.uid || 'user-cajero-01',
      cashierName: currentUser?.displayName || 'Cajero en Sesión',
      shiftId: currentShiftId,
      amount: parsedAmount,
      category,
      recipientOrSupplier: recipient.trim(),
      concept: concept.trim(),
      invoiceOrReceiptNumber: invoiceNumber.trim(),
      notes: notes.trim() || undefined,
      status: 'Registrado'
    });

    setGeneratedExpense(created);
  };

  const handleResetAndClose = () => {
    setAmount('');
    setCategory('Pago a Proveedor');
    setRecipient('');
    setConcept('');
    setInvoiceNumber('');
    setNotes('');
    setError('');
    setGeneratedExpense(null);
    onClose();
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {generatedExpense ? (
          /* Success Voucher Confirmation (Invisible to cashier: does NOT show fund total) */
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">¡Salida de Efectivo Registrada!</h3>
                <p className="text-xs text-emerald-300">Comprobante de Caja Chica generado exitosamente</p>
              </div>
            </div>

            {/* Printable Voucher Card */}
            <div
              id="pos-ticket-receipt"
              className="ticket-paper-48mm p-3 bg-white text-black rounded-xl border border-black space-y-2 font-mono text-[10.5px] leading-tight"
            >
              <div className="text-center pb-1 border-b border-dashed border-black">
                <p className="font-extrabold text-[12px] text-black">CELLTRONIC - CAJA CHICA</p>
                <p className="font-extrabold text-[11px] text-black">{generatedExpense.voucherNumber}</p>
                <p className="text-[9.5px] text-black">{new Date(generatedExpense.date).toLocaleDateString('es-SV')} {new Date(generatedExpense.date).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              <div className="space-y-1 pt-0.5 text-[10px]">
                <div className="flex justify-between font-extrabold text-[11px]">
                  <span>MONTO:</span>
                  <span>${generatedExpense.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Destinatario:</span>
                  <span className="font-semibold truncate max-w-[150px]">{generatedExpense.recipientOrSupplier}</span>
                </div>
                <div className="flex justify-between">
                  <span>Categoría:</span>
                  <span>{generatedExpense.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comprobante:</span>
                  <span>{generatedExpense.invoiceOrReceiptNumber}</span>
                </div>
                <div className="pt-0.5">
                  <span className="block font-semibold">Concepto:</span>
                  <span className="text-[9.5px]">{generatedExpense.concept}</span>
                </div>
                {generatedExpense.notes && (
                  <div className="pt-0.5">
                    <span className="block font-semibold">Observación:</span>
                    <span className="text-[9.5px]">{generatedExpense.notes}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-dashed border-black text-[9.5px]">
                  <span>Cajero:</span>
                  <span>{generatedExpense.cashierName}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-black flex justify-between text-[8.5px] text-center">
                <div className="w-1/2 border-t border-black pt-0.5 mx-1 font-semibold">
                  Firma Cajero
                </div>
                <div className="w-1/2 border-t border-black pt-0.5 mx-1 font-semibold">
                  Recibí Conforme
                </div>
              </div>
            </div>

            <div className="no-print flex gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintVoucher}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Vale (48mm)
              </button>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                Aceptar & Continuar
              </button>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Registro de Salida de Efectivo</h3>
                <p className="text-xs text-slate-400">Pago a Proveedores y Gastos con Comprobante</p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monto a Entregar en Efectivo ($) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-emerald-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-base focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoría del Gasto *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PettyCashExpenseCategory)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recipient / Supplier */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Proveedor o Beneficiario que Recibe *</span>
                {suppliers.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-normal">O seleccione de la lista</span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ej. Distribuidora Global Tech / Mensajería Express"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
                {suppliers.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) setRecipient(e.target.value);
                    }}
                    className="px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-hidden max-w-[130px] cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.name}>{sup.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Concept / Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Concepto / Motivo de la Salida *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Ej. Pago contra entrega de 10 cristales templados iPhone 15 y 5 cables tipo C..."
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500 resize-none"
              />
            </div>

            {/* Invoice or Receipt Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  N° Factura / Comprobante / Recibo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. FAC-10928 / TK-3910 / REC-01"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cajero / Emisor
                </label>
                <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 truncate">
                  {currentUser?.displayName || 'Cajero en Sesión'}
                </div>
              </div>
            </div>

            {/* Additional notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Observaciones Adicionales (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Mercadería recibida y verificada con el supervisor."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {/* Informational banner */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>Nota de Control Interno:</strong> Este registro descuenta la salida de efectivo y emite un vale foliado auditado para resguardo en gaveta.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Receipt className="w-4 h-4" />
                Registrar Salida & Generar Vale
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
