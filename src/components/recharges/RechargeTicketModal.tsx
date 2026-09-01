import React from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  Smartphone, 
  Calendar, 
  User, 
  FileText,
  Share2
} from 'lucide-react';
import { Recharge } from '../../types';
import { formatCents } from '../../lib/rechargeServices';

interface RechargeTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  recharge: Recharge | null;
}

export const RechargeTicketModal: React.FC<RechargeTicketModalProps> = ({
  isOpen,
  onClose,
  recharge
}) => {
  if (!isOpen || !recharge) return null;

  const handlePrint = () => {
    window.print();
  };

  const amountDisplay = recharge.amountCents 
    ? formatCents(recharge.amountCents) 
    : `$${recharge.salePrice.toFixed(2)}`;

  const formattedDate = new Date(recharge.date || recharge.createdAt).toLocaleString('es-SV', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 print:shadow-none print:border-none print:m-0 print:w-full">
        {/* Ticket Header Actions (hidden on print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">Comprobante de Recarga</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Ticket Receipt Area */}
        <div className="p-6 font-mono text-xs space-y-4 print:p-2">
          {/* Brand Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="text-base font-black tracking-wider text-slate-950 font-sans uppercase">
              CELLTRONIC
            </h2>
            <p className="text-[10px] text-slate-500 font-sans">
              Servicio Técnico & Telecomunicaciones
            </p>
            <p className="text-[10px] text-slate-500 font-sans">
              San Salvador, El Salvador
            </p>
            <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 font-sans">
              COMPROBANTE DE RECARGA
            </div>
          </div>

          {/* Ticket Information */}
          <div className="space-y-1.5 text-[11px] text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">N° Ticket:</span>
              <span className="font-bold text-slate-900">{recharge.ticketNumber || recharge.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fecha y Hora:</span>
              <span className="text-slate-800">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cajero:</span>
              <span className="text-slate-800">{recharge.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estado:</span>
              <span className="font-bold text-emerald-600">EXITOSA</span>
            </div>
          </div>

          {/* Core Recharge Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-sans">
              COMPAÑÍA {recharge.operator}
            </p>
            <div className="text-2xl font-black text-slate-900">
              {amountDisplay}
            </div>
            <div className="text-sm font-bold text-cyan-700 font-sans pt-1">
              Tel: {recharge.phoneNumber}
            </div>
            {recharge.notes && (
              <p className="text-[10px] text-slate-500 pt-1 italic font-sans">
                {recharge.notes}
              </p>
            )}
          </div>

          {/* Footer Notice */}
          <div className="text-center pt-2 border-t border-dashed border-slate-300 space-y-1">
            <p className="text-[10px] text-slate-500 font-sans">
              ¡Gracias por preferir CELLTRONIC!
            </p>
            <p className="text-[9px] text-slate-400 font-sans">
              Guarde este comprobante para cualquier consulta.
            </p>
          </div>
        </div>

        {/* Action Buttons (hidden on print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
