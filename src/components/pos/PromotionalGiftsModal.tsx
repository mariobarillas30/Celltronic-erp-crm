import React, { useState, useMemo, useEffect } from 'react';
import { 
  Gift, 
  X, 
  CheckCircle, 
  ShieldAlert, 
  ShieldCheck, 
  Plus, 
  Minus, 
  Package, 
  Lock, 
  ShoppingBag,
  Search,
  Sparkles,
  Layers,
  Check
} from 'lucide-react';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface PromotionalGiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddPromotionalGifts: (
    items: { product: Product; quantity: number }[],
    authorizedBy: string
  ) => void;
  currentAuthorizedBy?: string | null;
}

export const PromotionalGiftsModal: React.FC<PromotionalGiftsModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddPromotionalGifts,
  currentAuthorizedBy
}) => {
  const { isCEO, isSupervisor, isGerente, verifyCeoPin, verifyCeoOrGerentePin, verifySupervisorPin } = useAuth();

  // CEO / Supervisor PIN Authorization state
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState<string | null>(
    currentAuthorizedBy || (isCEO ? 'CEO' : isGerente ? 'Gerente' : null)
  );

  // Tab filter / view mode: 'suggested' (chips, covers, micas, audífonos, etc.) or 'all' (todo el inventario general)
  const [activeTab, setActiveTab] = useState<'suggested' | 'all'>('suggested');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected items: { [productId]: { product, quantity } }
  const [selectedPromos, setSelectedPromos] = useState<Record<string, { product: Product; quantity: number }>>({});

  // Synchronize authorization state
  useEffect(() => {
    if (currentAuthorizedBy) {
      setAuthorizedBy(currentAuthorizedBy);
    } else if (isCEO) {
      setAuthorizedBy('CEO');
    }
  }, [currentAuthorizedBy, isCEO, isOpen]);

  // Reset selection and inputs on modal open
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setPinError('');
      setSearchTerm('');
      setSelectedCategory('all');
      setSelectedPromos({});
    }
  }, [isOpen]);

  // Classification logic for Smart Suggestions based on existing general inventory
  const isCandidateForGift = (p: Product) => {
    // Flagged explicitly or categorized as gift/promo
    if (p.isPromotionalGift || p.isPromotional || p.category === 'Regalía' || p.category === 'Promocionales') {
      return true;
    }
    
    // Category match
    const cat = (p.category || '').toLowerCase();
    if (cat === 'accesorios' || cat === 'fundas' || cat === 'cargadores' || cat === 'servicios') {
      return true;
    }

    // Name keyword match for typical gifts
    const name = (p.name || '').toLowerCase();
    const keywords = [
      'chip', 'sim', 'tigo', 'claro', 'movistar', 'digicel',
      'cover', 'funda', 'case', 'silicon', 'silicona',
      'glass', 'vidrio', 'mica', 'templado', 'protector',
      'cargador', 'cable', 'audifono', 'audífono', 'auricular',
      'holder', 'soporte', 'pop', 'llavero', 'strap', 'regalo', 'cortesia', 'cortesía'
    ];
    return keywords.some(kw => name.includes(kw));
  };

  // Extract all categories present in the general inventory for filtering
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Suggested Gift Products from General Inventory
  const suggestedProducts = useMemo(() => {
    return products.filter(isCandidateForGift);
  }, [products]);

  // Base list depending on active tab
  const baseProducts = useMemo(() => {
    return activeTab === 'suggested' ? suggestedProducts : products;
  }, [activeTab, suggestedProducts, products]);

  // Filtered by category and search term
  const filteredProducts = useMemo(() => {
    return baseProducts.filter(p => {
      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches = 
          (p.name || '').toLowerCase().includes(term) ||
          (p.code || '').toLowerCase().includes(term) ||
          (p.brand || '').toLowerCase().includes(term) ||
          (p.model || '').toLowerCase().includes(term) ||
          (p.category || '').toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [baseProducts, selectedCategory, searchTerm]);

  if (!isOpen) return null;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (!pin.trim()) {
      setPinError('Ingrese el PIN de autorización del CEO o Supervisor.');
      return;
    }

    const res = verifyCeoPin(pin) || verifyCeoOrGerentePin(pin) || verifySupervisorPin(pin);
    if (res.valid) {
      setAuthorizedBy(res.authorizedBy || 'CEO');
      setPin('');
      setPinError('');
    } else {
      setPinError('❌ PIN de Autorización incorrecto. Ingrese el PIN de CEO o Supervisor registrado en Firestore.');
    }
  };

  // Reactive quantity modification (+ / -)
  const handleQuantityChange = (product: Product, delta: number) => {
    setSelectedPromos(prev => {
      const existing = prev[product.id];
      const currentQty = existing ? existing.quantity : 0;
      const targetQty = currentQty + delta;

      if (targetQty > product.stock) {
        alert(`⚠️ Stock máximo en inventario para "${product.name}" es de ${product.stock} unidades.`);
        return prev;
      }

      const updated = { ...prev };
      if (targetQty <= 0) {
        delete updated[product.id];
      } else {
        updated[product.id] = { product, quantity: targetQty };
      }
      return updated;
    });
  };

  // Add all selected gifts to the POS cart
  const handleConfirmAndAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const itemsToAdd = Object.values(selectedPromos).filter(
      (item): item is { product: Product; quantity: number } => item.quantity > 0 && !!item.product
    );

    if (itemsToAdd.length === 0) {
      alert('⚠️ Seleccione al menos un artículo del inventario para entregar como regalía.');
      return;
    }

    // Require authorization PIN if not yet authorized and not CEO
    if (!authorizedBy && !isCEO) {
      if (!pin.trim()) {
        setPinError('Debe ingresar el PIN de autorización del CEO o Supervisor registrado en Firestore.');
        return;
      }

      const res = verifyCeoPin(pin) || verifyCeoOrGerentePin(pin) || verifySupervisorPin(pin);
      if (res.valid) {
        const authName = res.authorizedBy || 'CEO';
        setAuthorizedBy(authName);
        onAddPromotionalGifts(itemsToAdd, authName);
        setSelectedPromos({});
        setPin('');
        onClose();
        return;
      }

      setPinError('❌ PIN de Autorización incorrecto. Verifique el PIN del CEO o Supervisor registrado en Firestore.');
      return;
    }

    // Push dynamic items to cart
    onAddPromotionalGifts(itemsToAdd, authorizedBy || (isCEO ? 'CEO' : 'Supervisor'));
    setSelectedPromos({});
    onClose();
  };

  // Counts & summaries
  const totalSelectedUnits = Object.values(selectedPromos).reduce((sum, item) => sum + (item?.quantity || 0), 0);
  const selectedList = Object.values(selectedPromos).filter(i => i.quantity > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-purple-800/60 rounded-2xl max-w-3xl w-full p-5 sm:p-6 text-slate-100 space-y-4 shadow-2xl max-h-[92vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Escoger Regalías del Inventario
                <span className="text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  $0.00 en POS
                </span>
              </h3>
              <p className="text-xs text-purple-300/80">
                Selecciona cualquier producto existente en bodega para entregarlo de cortesía y descontar su stock real
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          
          {/* Authorization Section */}
          {!authorizedBy ? (
            <div className="bg-purple-950/40 border border-purple-800/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Requiere Autorización del CEO</h4>
                  <p className="text-[11px] text-purple-200/80 leading-relaxed">
                    Para entregar artículos a $0.00 que descuenten stock del inventario general, ingresa el PIN del CEO.
                  </p>
                </div>
              </div>

              {pinError && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
                  {pinError}
                </div>
              )}

              <form onSubmit={handleVerifyPin} className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="relative flex-1">
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-purple-700/60 rounded-xl text-xs text-white font-mono tracking-widest text-center focus:outline-hidden focus:border-purple-400"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <ShieldCheck className="w-4 h-4" /> Autorizar Regalías
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Autorizado por: <strong className="text-white font-bold">{authorizedBy}</strong>
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                Permiso Activo
              </span>
            </div>
          )}

          {/* Navigation Tabs: Sugeridos (Chips, Covers, Glass, etc.) vs Todo el Inventario */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('suggested')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'suggested'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Sugeridos para Regalía ({suggestedProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Todo el Inventario ({products.length})
              </button>
            </div>

            {/* Category dropdown filter */}
            {availableCategories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-purple-200 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-purple-500"
              >
                <option value="all">Todas las categorías ({availableCategories.length})</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre (ej. Chip Claro, Cover iPhone, Vidrio 9D, Cable USB, Audífonos)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
            />
          </div>

          {/* Products List */}
          <div className="border border-slate-800 rounded-xl divide-y divide-slate-800/80 bg-slate-950/60 overflow-hidden max-h-72 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Package className="w-8 h-8 text-purple-400 mx-auto opacity-50" />
                <p className="text-xs font-semibold text-slate-300">
                  No se encontraron productos en esta categoría o búsqueda.
                </p>
                <p className="text-[11px] text-slate-500">
                  Cambia de pestaña a <strong>"Todo el Inventario"</strong> o ajusta el término de búsqueda.
                </p>
              </div>
            ) : (
              filteredProducts.map(product => {
                const isOutOfStock = product.stock <= 0;
                const selectedQty = selectedPromos[product.id]?.quantity || 0;
                const isSuggested = isCandidateForGift(product);

                return (
                  <div 
                    key={product.id}
                    className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                      selectedQty > 0 ? 'bg-purple-950/30 border-l-4 border-purple-500' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-white truncate">{product.name}</p>
                        <span className="text-[9px] bg-slate-800 text-purple-300 px-1.5 py-0.2 rounded font-mono font-semibold">
                          {product.code}
                        </span>
                        {product.category && (
                          <span className="text-[9px] bg-slate-800/80 text-slate-300 border border-slate-700/60 px-1.5 py-0.2 rounded">
                            {product.category}
                          </span>
                        )}
                        {isSuggested && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5 text-amber-300" /> Sugerido
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                        <span>
                          Stock en inventario: <strong className={isOutOfStock ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{product.stock} unids</strong>
                        </span>
                        <span>• Precio regular: ${product.salePrice?.toFixed(2) || '0.00'}</span>
                        <span className="text-purple-300 font-bold">• Precio Regalía: $0.00</span>
                      </div>
                    </div>

                    {/* Quantity Selector (+ / -) */}
                    <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 shrink-0">
                      <button
                        type="button"
                        disabled={selectedQty <= 0}
                        onClick={() => handleQuantityChange(product, -1)}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title="Restar unidad"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className={`w-7 text-center font-bold text-xs font-mono ${selectedQty > 0 ? 'text-purple-300 font-extrabold' : 'text-slate-400'}`}>
                        {selectedQty}
                      </span>
                      <button
                        type="button"
                        disabled={isOutOfStock || selectedQty >= product.stock}
                        onClick={() => handleQuantityChange(product, 1)}
                        className="p-1 text-slate-400 hover:text-purple-300 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title="Sumar unidad"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Active Selections Summary Tag List */}
          {selectedList.length > 0 && (
            <div className="p-3 bg-purple-950/30 border border-purple-800/50 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                Artículos seleccionados del inventario general para entregar ($0.00):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedList.map(item => (
                  <span 
                    key={item.product.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-900/70 border border-purple-700/60 text-white text-[11px] font-medium shadow-xs"
                  >
                    <strong className="text-purple-200">{item.quantity}x</strong> {item.product.name}
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(item.product, -item.quantity)}
                      className="ml-0.5 text-purple-300 hover:text-red-300 cursor-pointer"
                      title="Quitar artículo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Real Inventory Discount Notice */}
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Descuento de Stock Real:</strong> Cada producto seleccionado se restará directamente del inventario general de la empresa (chips, fundas, micas, etc.) al procesar la venta y se registrará a <strong>$0.00</strong> en el ticket.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-300">
            <span>Total a entregar: </span>
            <strong className="text-purple-300 font-bold text-sm">
              {totalSelectedUnits} {totalSelectedUnits === 1 ? 'unidad' : 'unidades'}
            </strong>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={totalSelectedUnits === 0}
              onClick={handleConfirmAndAdd}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 cursor-pointer transition-all"
            >
              <Gift className="w-4 h-4" /> Agregar al Carrito ($0.00)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
