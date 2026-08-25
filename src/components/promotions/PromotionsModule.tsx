import React, { useState } from 'react';
import { Tag, Plus, Calendar, CheckCircle2, Trash2, Edit3, X, Percent, DollarSign, Sparkles } from 'lucide-react';
import { Promotion, PromotionType, ProductCategory } from '../../types';

interface PromotionsModuleProps {
  promotions: Promotion[];
  onAddPromotion: (promo: Omit<Promotion, 'id' | 'createdAt'>) => void;
  onDeletePromotion: (id: string) => void;
}

export const PromotionsModule: React.FC<PromotionsModuleProps> = ({
  promotions,
  onAddPromotion,
  onDeletePromotion
}) => {
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PromotionType>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]);
  const [selectedCategories, setSelectedCategories] = useState<ProductCategory[]>(['Fundas', 'Accesorios']);

  const categoriesList: ProductCategory[] = [
    'Accesorios', 'Repuestos', 'Dispositivos', 'Fundas', 'Cargadores', 'Servicios'
  ];

  const handleToggleCategory = (cat: ProductCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPromotion({
      name,
      description,
      type,
      discountValue: parseFloat(discountValue) || 0,
      startDate,
      endDate,
      applicableCategories: selectedCategories,
      status: 'active'
    });

    setShowModal(false);
    setName('');
    setDescription('');
  };

  return (
    <div className="space-y-5 max-w-full">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md max-w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">Campañas de Promoción y Descuentos</h2>
            <p className="text-xs text-slate-400 truncate">Descuentos porcentuales o en dinero para dinamizar inventario regular</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Crear Nueva Campaña
        </button>
      </div>

      {/* Conceptual Difference Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            <Percent className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-amber-300 block mb-0.5">Campañas de Promoción (Este Módulo)</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Aplican descuentos automáticos (% o $) en categorías seleccionadas para incentivar ventas de inventario regular.
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-purple-950/20 border border-purple-800/40 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-purple-300 block mb-0.5">Regalías / Cortesías de Teléfono ($0.00)</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Productos ancla (Chip, Glass, Cover) entregados gratis al vender celulares. Se validan en <strong>Inventario</strong> y se agregan en el <strong>Punto de Venta</strong> con PIN del CEO.
            </p>
          </div>
        </div>
      </div>

      {/* Promotions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-full">
        {promotions.map(promo => (
          <div key={promo.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md text-[10px] font-bold uppercase">
                  {promo.type === 'percentage' ? `${promo.discountValue}% OFF` : `$${promo.discountValue} OFF`}
                </span>
                <h3 className="font-extrabold text-white text-sm mt-1">{promo.name}</h3>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                promo.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {promo.status === 'active' ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">{promo.description}</p>

            <div className="space-y-1 text-[11px] text-slate-400">
              <p className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Válida: {promo.startDate} al {promo.endDate}
              </p>
              {promo.applicableCategories && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {promo.applicableCategories.map(c => (
                    <span key={c} className="px-1.5 py-0.5 bg-slate-800 rounded-md text-[10px] text-slate-300">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => confirm('¿Eliminar esta campaña?') && onDeletePromotion(promo.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> Crear Nueva Campaña Promocional
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre de la Campaña *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Especial Carga Rápida $5.00 OFF"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descripción / Regla</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ej. Aplica en compras superiores a $20.00 en la categoría de cargadores"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tipo de Descuento</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PromotionType)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo ($)</option>
                    <option value="combo">Combo / Paquete</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Valor (% o $)</label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Categorías Aplicables</label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categoriesList.map(cat => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleToggleCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold shadow-md"
                >
                  Activar Campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
