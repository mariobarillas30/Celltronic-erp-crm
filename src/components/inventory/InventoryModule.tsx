import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  Package, 
  Users, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Gift,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { Product, Supplier, ProductCategory } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface InventoryModuleProps {
  products: Product[];
  suppliers: Supplier[];
  onAddProduct: (prod: Omit<Product, 'id' | 'updatedAt'>) => void;
  onUpdateProduct: (id: string, prod: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onAddSupplier: (sup: Omit<Supplier, 'id' | 'createdAt'>) => void;
  onDeleteSupplier?: (id: string) => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  products,
  suppliers,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddSupplier,
  onDeleteSupplier
}) => {
  const { isCEO } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'suppliers'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');

  // Modals State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Deletion Confirmation Modal States (exclusivo para CEO con alta fidelidad y seguridad)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Product Form State
  const [prodCode, setProdCode] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState<ProductCategory>('Accesorios');
  const [prodBrand, setProdBrand] = useState('');
  const [prodModel, setProdModel] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodSale, setProdSale] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodMinStock, setProdMinStock] = useState('5');
  const [prodSupplierId, setProdSupplierId] = useState('');
  const [prodIsPromotional, setProdIsPromotional] = useState(false);
  const [prodPromoDescription, setProdPromoDescription] = useState('');

  // Supplier Form State
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

  const categories: ProductCategory[] = [
    'Accesorios', 'Repuestos', 'Dispositivos', 'Fundas', 'Cargadores', 'Servicios', 'Promocionales', 'Regalía', 'Otros'
  ];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProductId(product.id);
      setProdCode(product.code);
      setProdName(product.name);
      setProdCategory(product.category);
      setProdBrand(product.brand);
      setProdModel(product.model);
      setProdCost(product.costPrice.toString());
      setProdSale(product.salePrice.toString());
      setProdStock(product.stock.toString());
      setProdMinStock(product.minStock.toString());
      setProdSupplierId(product.supplierId || '');
      setProdIsPromotional(product.isPromotional || product.isPromotionalGift || product.category === 'Promocionales' || product.category === 'Regalía');
      setProdPromoDescription(product.promoDescription || '');
    } else {
      setEditingProductId(null);
      setProdCode(`750${Math.floor(1000 + Math.random() * 9000)}`);
      setProdName('');
      setProdCategory('Accesorios');
      setProdBrand('');
      setProdModel('');
      setProdCost('');
      setProdSale('');
      setProdStock('10');
      setProdMinStock('5');
      setProdSupplierId(suppliers[0]?.id || '');
      setProdIsPromotional(false);
      setProdPromoDescription('');
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const costNum = parseFloat(prodCost) || 0;
    const isPromo = prodIsPromotional || prodCategory === 'Promocionales' || prodCategory === 'Regalía';
    const saleNum = isPromo ? (parseFloat(prodSale) || 0) : (parseFloat(prodSale) || 0);
    const stockNum = parseInt(prodStock, 10) || 0;
    const minStockNum = parseInt(prodMinStock, 10) || 3;
    const supplierObj = suppliers.find(s => s.id === prodSupplierId);

    if (editingProductId) {
      onUpdateProduct(editingProductId, {
        code: prodCode,
        name: prodName,
        category: prodCategory,
        brand: prodBrand,
        model: prodModel,
        costPrice: costNum,
        salePrice: saleNum,
        stock: stockNum,
        minStock: minStockNum,
        supplierId: prodSupplierId,
        supplierName: supplierObj?.name || '',
        isPromotional: isPromo,
        isPromotionalGift: isPromo,
        promoDescription: prodPromoDescription,
        updatedAt: new Date().toISOString()
      });
    } else {
      onAddProduct({
        code: prodCode,
        name: prodName,
        category: prodCategory,
        brand: prodBrand,
        model: prodModel,
        costPrice: costNum,
        salePrice: saleNum,
        stock: stockNum,
        minStock: minStockNum,
        supplierId: prodSupplierId,
        supplierName: supplierObj?.name || '',
        isPromotional: isPromo,
        isPromotionalGift: isPromo,
        promoDescription: prodPromoDescription
      });
    }

    setShowProductModal(false);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSupplier({
      name: supName,
      contactPerson: supContact,
      phone: supPhone,
      email: supEmail,
      address: supAddress
    });
    setSupName('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setShowSupplierModal(false);
  };

  // Product Delete Handler (Exclusive to CEO)
  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    onDeleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  // Supplier Delete Handler (Exclusive to CEO)
  const handleConfirmDeleteSupplier = () => {
    if (!supplierToDelete) return;
    if (onDeleteSupplier) {
      onDeleteSupplier(supplierToDelete.id);
    }
    setSupplierToDelete(null);
  };

  return (
    <div className="space-y-5 max-w-full">
      {/* Top Banner Stats & Tab Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-md max-w-full">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 max-w-full">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 max-w-full overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('products')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'products'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Productos ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'suppliers'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Proveedores ({suppliers.length})
            </button>
          </div>

          {lowStockCount > 0 && activeTab === 'products' && (
            <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" /> {lowStockCount} Bajo Stock
            </span>
          )}

          {isCEO && (
            <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Permisos CEO Activos (Eliminación Habilitada)
            </span>
          )}
        </div>

        <div className="w-full sm:w-auto">
          {activeTab === 'products' ? (
            <button
              onClick={() => handleOpenProductModal()}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto / Repuesto
            </button>
          ) : (
            <button
              onClick={() => setShowSupplierModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Registrar Proveedor
            </button>
          )}
        </div>
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar inventario por nombre, código o marca..."
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
            >
              <option value="Todos">Todas las Categorías</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Producto / Descripción</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">P. Costo ($)</th>
                  <th className="py-3 px-3">P. Venta ($)</th>
                  <th className="py-3 px-3">Stock Actual</th>
                  <th className="py-3 px-3">Proveedor</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.map(p => {
                  const isLow = p.stock <= p.minStock;
                  const isPromo = p.category === 'Promocionales' || p.category === 'Regalía' || p.isPromotional || p.isPromotionalGift;
                  return (
                    <tr key={p.id} className={`hover:bg-slate-800/40 transition-colors ${isPromo ? 'bg-purple-950/20' : ''}`}>
                      <td className="py-2.5 px-3 font-mono text-slate-400 font-semibold">{p.code}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {isPromo && <Gift className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                          <p className="font-bold text-white">{p.name}</p>
                        </div>
                        <p className="text-[10px] text-slate-400">{p.brand} {p.model} {p.promoDescription ? `• ${p.promoDescription}` : ''}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                          isPromo 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">${p.costPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-mono font-extrabold">
                        {isPromo ? (
                          <span className="text-purple-400 font-bold bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-500/30 text-[11px]">
                            $0.00 (Regalo)
                          </span>
                        ) : (
                          <span className="text-emerald-400">${p.salePrice.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.stock <= 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          isLow ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {p.stock} unidades {isLow && '(Bajo)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{p.supplierName || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenProductModal(p)}
                            title="Editar producto"
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Trash button exclusively rendered and enabled for CEO */}
                          {isCEO && (
                            <button
                              type="button"
                              onClick={() => setProductToDelete(p)}
                              title="Eliminar producto (Exclusivo CEO)"
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-sm">{s.name}</h3>
                    <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20 mt-1 inline-block">
                      Proveedor
                    </span>
                  </div>
                  
                  {/* Delete button exclusively visible for CEO */}
                  {isCEO && (
                    <button
                      type="button"
                      onClick={() => setSupplierToDelete(s)}
                      title="Eliminar proveedor (Exclusivo CEO)"
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-1.5 text-xs text-slate-300">
                  <p className="flex items-center gap-2 text-slate-400">
                    <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" /> 
                    <span className="truncate">{s.contactPerson || 'Sin contacto asignado'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 
                    <span>{s.phone || 'Sin teléfono'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" /> 
                    <span className="truncate">{s.email || 'Sin correo'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" /> 
                    <span className="truncate">{s.address || 'Sin dirección registrada'}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Deleting Product (Exclusivo CEO) */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-red-800/60 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Confirmar Eliminación
                  <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                    Rol CEO
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  ¿Estás seguro de que deseas eliminar <strong className="text-white">"{productToDelete.name}"</strong>? Esta acción borrará el registro de la base de datos de Firestore.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Código:</span>
                <span className="font-mono text-slate-200">{productToDelete.code}</span>
              </div>
              <div className="flex justify-between">
                <span>Stock actual:</span>
                <span className="font-bold text-amber-300">{productToDelete.stock} unidades</span>
              </div>
              <div className="flex justify-between">
                <span>Categoría:</span>
                <span className="text-slate-200">{productToDelete.category}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer transition-all"
              >
                <Trash2 className="w-4 h-4" /> Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Supplier (Exclusivo CEO) */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-red-800/60 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Eliminar Proveedor
                  <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                    Rol CEO
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  ¿Deseas eliminar al proveedor <strong className="text-white">"{supplierToDelete.name}"</strong>? Esta acción borrará el registro de la base de datos de Firestore.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Contacto:</span>
                <span className="text-slate-200">{supplierToDelete.contactPerson || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Teléfono:</span>
                <span className="text-slate-200">{supplierToDelete.phone || 'N/A'}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSupplierToDelete(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSupplier}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer transition-all"
              >
                <Trash2 className="w-4 h-4" /> Eliminar Proveedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingProductId ? 'Editar Producto / Repuesto' : 'Agregar Nuevo Producto'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Código / Código Barras</label>
                  <input
                    type="text"
                    value={prodCode}
                    onChange={(e) => setProdCode(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Categoría</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre o Descripción del Producto</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="ej. Funda Silicona iPhone 15 Pro Max"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Marca</label>
                  <input
                    type="text"
                    value={prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    placeholder="ej. Apple / CasePro"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Modelo Compatible</label>
                  <input
                    type="text"
                    value={prodModel}
                    onChange={(e) => setProdModel(e.target.value)}
                    placeholder="ej. iPhone 15"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Precio Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Precio Venta Final ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodSale}
                    onChange={(e) => setProdSale(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-purple-950/30 border border-purple-800/40 rounded-xl space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-purple-200 font-bold">
                  <input
                    type="checkbox"
                    checked={prodIsPromotional || prodCategory === 'Promocionales' || prodCategory === 'Regalía'}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setProdIsPromotional(checked);
                      if (checked) {
                        if (prodCategory !== 'Promocionales' && prodCategory !== 'Regalía') {
                          setProdCategory('Regalía');
                        }
                        setProdSale('0.00');
                      }
                    }}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-800 cursor-pointer"
                  />
                  <span className="flex items-center gap-2 text-xs text-white">
                    <Gift className="w-4 h-4 text-purple-400" />
                    Habilitar como Regalía/Cortesía en POS
                  </span>
                </label>
                <p className="text-[10px] text-purple-300/80 leading-relaxed pl-6.5">
                  Al marcar esta casilla, el producto aparecerá automáticamente en el catálogo dinámico de Regalías/Cortesías del Punto de Venta (POS) para entregarse a <strong>$0.00 al cliente</strong> y descontar stock real de inventario bajo autorización del CEO.
                </p>
                {(prodIsPromotional || prodCategory === 'Promocionales' || prodCategory === 'Regalía') && (
                  <div className="pt-1.5 pl-6.5">
                    <label className="block text-[11px] font-semibold text-purple-300 mb-1">
                      Descripción u ocasión de la regalía (Opcional):
                    </label>
                    <input
                      type="text"
                      value={prodPromoDescription}
                      onChange={(e) => setProdPromoDescription(e.target.value)}
                      placeholder="ej. Chip SIM, Cover o Mica de regalo por compra de celular"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-purple-700/50 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-hidden focus:border-purple-400"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Proveedor Asociado</label>
                <select
                  value={prodSupplierId}
                  onChange={(e) => setProdSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                >
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Registrar Nuevo Proveedor</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre Comercial de la Empresa</label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  required
                  placeholder="ej. Global Parts El Salvador"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Persona de Contacto</label>
                <input
                  type="text"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  placeholder="ej. Roberto Fernández"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+503 7000-0000"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="contacto@empresa.com"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Dirección Físicas</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="ej. Zona Industrial, Local 4"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
