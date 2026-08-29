import React from 'react';
import { Printer, X } from 'lucide-react';
import { Sale } from '../../types';

interface TicketPrintProps {
  sale: Sale;
  paperWidth?: '48mm' | '58mm' | '80mm';
  onClose: () => void;
  onPrint?: () => void;
}

export const TicketPrint: React.FC<TicketPrintProps> = ({
  sale,
  paperWidth = '48mm',
  onClose,
  onPrint,
}) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 print-modal-overlay">
      <div
        id="pos-ticket-receipt"
        className={`bg-white text-black rounded-xl shadow-2xl space-y-2 font-mono transition-all box-border border border-slate-200 ${
          paperWidth === '80mm'
            ? 'ticket-paper-80mm max-w-[340px] w-full p-4 text-xs'
            : 'ticket-paper-48mm max-w-[384px] w-[48mm] p-2 text-[10.5px] leading-tight'
        }`}
        style={{
          width: paperWidth === '80mm' ? '80mm' : '48mm',
          maxWidth: paperWidth === '80mm' ? '80mm' : '384px',
          margin: '0 auto',
          padding: paperWidth === '80mm' ? '4mm' : '1mm 0mm',
          fontSize: '10.5px',
          lineHeight: '1.25',
          wordBreak: 'break-word',
        }}
      >
        {/* Paper Controls (Hidden in print) */}
        <div className="no-print bg-slate-100 p-2 rounded-lg flex items-center justify-between text-[11px] font-sans border border-slate-300 mb-2">
          <span className="font-bold text-slate-800 flex items-center gap-1">
            <Printer className="w-3.5 h-3.5 text-cyan-600" />
            <span>Ticket Térmico (48mm/58mm)</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 p-1 rounded-md"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ticket Header */}
        <div className="text-center border-b border-dashed border-black pb-1.5 space-y-0.5">
          <h2 className="font-extrabold text-[12px] tracking-wider text-black">
            CELLTRONIC STORE
          </h2>
          <p className="text-[10px] text-black font-semibold">Venta y Reparación Móvil</p>
          <p className="text-[9.5px] text-black">SUCURSAL CENTRAL • TEL: +503 2222-0000</p>
          <p className="text-[10.5px] font-extrabold text-black mt-0.5">
            COMPROBANTE #{sale.ticketNumber}
          </p>
        </div>

        {/* Sale Metadata */}
        <div className="space-y-0.5 border-b border-dashed border-black pb-1.5 text-[10px] text-black">
          <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{new Date(sale.date).toLocaleDateString('es-SV')} {new Date(sale.date).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Cliente:</span>
            <span className="text-right truncate max-w-[180px]">{sale.customerName}</span>
          </div>
          {sale.customerPhone && (
            <div className="flex justify-between">
              <span>Tel:</span>
              <span>{sale.customerPhone}</span>
            </div>
          )}
          {sale.customerDocNumber && (
            <div className="flex justify-between font-semibold">
              <span>{sale.customerDocType || 'DUI/NIT'}:</span>
              <span>{sale.customerDocNumber}</span>
            </div>
          )}
          {sale.customerRazonSocial && sale.customerRazonSocial !== sale.customerName && (
            <div className="flex justify-between text-[9.5px]">
              <span>Razón Soc:</span>
              <span className="truncate max-w-[170px]">{sale.customerRazonSocial}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Cajero:</span>
            <span>{sale.cashierName}</span>
          </div>
          {sale.discountAuthorizedBy && (
            <div className="flex justify-between text-black font-semibold">
              <span>Dscto. Autorizado:</span>
              <span>{sale.discountAuthorizedBy}</span>
            </div>
          )}
          {sale.promotionalAuthorizedBy && (
            <div className="flex justify-between text-black font-semibold">
              <span>Regalías Autorizadas:</span>
              <span>{sale.promotionalAuthorizedBy}</span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="space-y-1 py-1">
          <div className="flex justify-between font-bold border-b border-dashed border-black pb-0.5 text-[10.5px]">
            <span>DESCRIPCIÓN</span>
            <span>TOTAL</span>
          </div>
          {sale.items.map((item, idx) => (
            <div key={idx} className="space-y-0.5 text-[10px]">
              <div className="flex justify-between items-start gap-1">
                <span className="font-semibold text-black leading-tight flex-1">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-bold text-black shrink-0">
                  {item.isPromotionalGift ? '$0.00' : `$${item.subtotal.toFixed(2)}`}
                </span>
              </div>
              {item.isPromotionalGift && (
                <span className="block text-[9px] font-bold text-black italic">
                  * CORTESÍA / REGALÍA ($0.00)
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Totals Section */}
        <div className="border-t border-dashed border-black pt-1.5 space-y-0.5 text-[10.5px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${sale.subtotal.toFixed(2)}</span>
          </div>
          {sale.discountTotal > 0 && (
            <div className="flex justify-between font-semibold">
              <span>Descuento:</span>
              <span>-${sale.discountTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-[12px] border-t border-b border-black py-1 my-0.5">
            <span>TOTAL:</span>
            <span>${sale.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span>Forma de Pago:</span>
            <span className="font-semibold">{sale.paymentMethod}</span>
          </div>
          {sale.paymentMethod === 'Efectivo' && (
            <div className="flex justify-between text-[9.5px]">
              <span>Cambio entregado:</span>
              <span>${(sale.changeGiven || 0).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Footer Guarantee */}
        <div className="text-center pt-1.5 text-[9.5px] border-t border-dashed border-black leading-tight space-y-0.5">
          <p className="font-bold">¡GRACIAS POR SU COMPRA!</p>
          <p>Garantía en accesorios: 30 días con este comprobante.</p>
          <p className="text-[8.5px]">Emitido por CELLTRONIC ERP POS</p>
        </div>

        {/* Print Buttons (Hidden in print) */}
        <div className="no-print flex gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" /> Imprimir Ticket (48mm)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold text-center cursor-pointer shadow-md"
          >
            Nueva Venta
          </button>
        </div>
      </div>
    </div>
  );
};
