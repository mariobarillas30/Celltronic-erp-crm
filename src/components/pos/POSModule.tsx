import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Tag, 
  CheckCircle, 
  ShieldAlert, 
  ShieldCheck,
  Percent,
  TrendingUp,
  AlertTriangle,
  Lock,
  Unlock,
  Printer, 
  DollarSign, 
  CreditCard, 
  ArrowRight,
  Sparkles,
  Smartphone,
  Loader2,
  Camera,
  ScanLine,
  X,
  AlertCircle,
  UserCheck,
  UserPlus,
  Building,
  FileText,
  User,
  Check,
  Gift
} from 'lucide-react';
import { doc, runTransaction, collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sanitizeForFirestore } from '../../lib/firebaseServices';
import { Product, CartItem, Sale, PaymentMethod, Promotion, CashShift, Customer, DocumentType, CustomerType, Supplier, PettyCashExpense } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { PettyCashExpenseModal } from '../petty_cash/PettyCashExpenseModal';
import { PromotionalGiftsModal } from './PromotionalGiftsModal';
import { TicketPrint } from './TicketPrint';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';

interface POSModuleProps {
  products: Product[];
  promotions: Promotion[];
  customers?: Customer[];
  suppliers?: Supplier[];
  onCompleteSale: (sale: Sale) => void;
  onAddCustomer?: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  onRegisterPettyCashExpense?: (expense: Omit<PettyCashExpense, 'id' | 'voucherNumber' | 'createdAt'>) => Promise<PettyCashExpense> | PettyCashExpense;
  activeCashShift?: CashShift | null;
  onGoToArqueo?: () => void;
}

export const POSModule: React.FC<POSModuleProps> = ({
  products,
  promotions,
  customers = [],
  suppliers = [],
  onCompleteSale,
  onAddCustomer,
  onRegisterPettyCashExpense,
  activeCashShift,
  onGoToArqueo
}) => {
  const { role, isCEO, isGerente, isSupervisor, verifySupervisorPin, verifyCeoOrGerentePin, verifyCeoPin, supervisorPinCap, currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPettyCashModal, setShowPettyCashModal] = useState(false);

  // Promotional Gifts & CEO Authorization State
  const [showPromoGiftModal, setShowPromoGiftModal] = useState(false);
  const [promotionalAuthorizedBy, setPromotionalAuthorizedBy] = useState<string | null>(null);

  // Detect whether the cart includes phone/device to proactively suggest promotional gifts
  const hasDeviceInCart = useMemo(() => {
    return cart.some(i => (i.product.category === 'Dispositivos' || i.product.name.toLowerCase().includes('phone') || i.product.name.toLowerCase().includes('celular')) && !i.isPromotionalGift);
  }, [cart]);

  // Customer Selection & CRM State in POS
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerName, setCustomerName] = useState('Cliente Contado');
  const [customerPhone, setCustomerPhone] = useState('');

  // Quick Customer Creation Modal State
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [quickFullName, setQuickFullName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickDocType, setQuickDocType] = useState<DocumentType>('DUI');
  const [quickDocNumber, setQuickDocNumber] = useState('');
  const [quickRazonSocial, setQuickRazonSocial] = useState('');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickGiro, setQuickGiro] = useState('');
  const [quickType, setQuickType] = useState<CustomerType>('Regular');

  // Filter customers for dropdown search
  const filteredCustomersForPOS = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 5);
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(c => 
      c.fullName.toLowerCase().includes(q) ||
      (c.razonSocial && c.razonSocial.toLowerCase().includes(q)) ||
      c.phone.toLowerCase().includes(q) ||
      c.docNumber.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [customers, customerSearchQuery]);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerName(c.fullName);
    setCustomerPhone(c.phone);
    setIsCustomerDropdownOpen(false);
    setCustomerSearchQuery('');
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('Cliente Contado');
    setCustomerPhone('');
  };

  const handleCreateQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFullName.trim() || !quickPhone.trim() || !quickDocNumber.trim()) {
      alert('Por favor complete Nombre, Teléfono y Número de Documento');
      return;
    }

    const newCust: Omit<Customer, 'id' | 'createdAt'> = {
      fullName: quickFullName.trim(),
      phone: quickPhone.trim(),
      email: quickEmail.trim() || undefined,
      docType: quickDocType,
      docNumber: quickDocNumber.trim(),
      razonSocial: quickRazonSocial.trim() || quickFullName.trim(),
      address: quickAddress.trim() || undefined,
      giro: quickGiro.trim() || undefined,
      type: quickType,
      totalPurchasesCount: 0,
      totalSpentAmount: 0.00
    };

    if (onAddCustomer) {
      onAddCustomer(newCust);
    }

    // Auto-select the newly created customer
    const createdCustomerObj: Customer = {
      ...newCust,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    handleSelectCustomer(createdCustomerObj);
    setShowQuickCustomerModal(false);

    // Reset quick form
    setQuickFullName('');
    setQuickPhone('');
    setQuickEmail('');
    setQuickDocType('DUI');
    setQuickDocNumber('');
    setQuickRazonSocial('');
    setQuickAddress('');
    setQuickGiro('');
    setQuickType('Regular');
  };

  // Processing state for atomic transaction
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Discount State (Supports % Percentage and $ Fixed Dollars with Profit Margin Protection)
  const [manualDiscountMode, setManualDiscountMode] = useState<'percentage' | 'fixed'>('percentage');
  const [manualDiscountValue, setManualDiscountValue] = useState<number>(0);
  const [customDiscountInput, setCustomDiscountInput] = useState<string>('');
  const [authorizedSupervisor, setAuthorizedSupervisor] = useState<string | null>(null);
  const [profitOverrideAuthorizedBy, setProfitOverrideAuthorizedBy] = useState<string | null>(null);
  const [pendingDiscount, setPendingDiscount] = useState<{ mode: 'percentage' | 'fixed'; value: number } | null>(null);

  // Discount Supervisor PIN Modal State
  const [showPinModal, setShowPinModal] = useState(false);
  const [supervisorPin, setSupervisorPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Profit Protection Override Modal State (for discounts > 50% of real profit requiring CEO / Gerente)
  const [showProfitOverrideModal, setShowProfitOverrideModal] = useState(false);
  const [overridePin, setOverridePin] = useState('');
  const [overridePinError, setOverridePinError] = useState('');

  // Regalía ($0.00) / Promotional Gifts PIN Authorization Modal State
  const [showRegaliaPinModal, setShowRegaliaPinModal] = useState(false);
  const [regaliaPin, setRegaliaPin] = useState('');
  const [regaliaPinError, setRegaliaPinError] = useState('');
  const [pendingRegaliaProductId, setPendingRegaliaProductId] = useState<string | null>(null);
  const [pendingGiftProduct, setPendingGiftProduct] = useState<Product | null>(null);

  // Checkout Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [amountPaid, setAmountPaid] = useState<string>('');

  // Thermal Receipt Paper Format (80mm default or 58mm mobile/Bluetooth)
  const [printPaperWidth, setPrintPaperWidth] = useState<'80mm' | '58mm'>(() => {
    return (localStorage.getItem('celltronic_ticket_paper_width') as '80mm' | '58mm') || '80mm';
  });

  const togglePaperWidth = (width: '80mm' | '58mm') => {
    setPrintPaperWidth(width);
    localStorage.setItem('celltronic_ticket_paper_width', width);
  };

  // Barcode Camera Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);

  const handleBarcodeScanned = (decodedText: string) => {
    const cleanCode = decodedText.trim().toLowerCase();
    const found =
      products.find(
        (p) => p.code.toLowerCase() === cleanCode || p.id.toLowerCase() === cleanCode
      ) ||
      products.find((p) => p.code.toLowerCase().includes(cleanCode));

    if (found) {
      if (found.stock <= 0) {
        setScannedFeedback(`⚠️ "${found.name}" no tiene stock disponible`);
        setTimeout(() => setScannedFeedback(null), 3000);
      } else {
        addToCart(found);
        setScannedFeedback(`✅ "${found.name}" agregado al carrito ($${found.salePrice.toFixed(2)})`);
        setTimeout(() => setScannedFeedback(null), 3000);
      }
    } else {
      setScannedFeedback(`⚠️ No se encontró producto con código "${decodedText}"`);
      setTimeout(() => setScannedFeedback(null), 3500);
    }
  };
  
  // Completed Sale Ticket Modal State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const categories = ['Todos', 'Dispositivos', 'Accesorios', 'Fundas', 'Cargadores', 'Repuestos', 'Servicios', 'Promocionales', 'Regalía'];

  // Filter products by search and category (Excluding Recargas category from POS grid)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.category === 'Recargas') return false; // Handled in Recargas module
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Check active auto-promotions for a given product
  const getAutoPromotionForProduct = (product: Product): Promotion | null => {
    const activePromos = promotions.filter(p => p.status === 'active');
    for (const promo of activePromos) {
      if (promo.applicableCategories?.includes(product.category)) {
        return promo;
      }
    }
    return null;
  };

  // Atomic Firestore Transaction helper to prevent concurrency issues & overselling
  const processAtomicSaleInFirestore = async (sale: Sale): Promise<{ success: boolean; error?: string }> => {
    try {
      await runTransaction(db, async (transaction) => {
        // Step 1: Read Phase - Read all product references first (Mandatory Firestore rule: reads before writes)
        const productReads = await Promise.all(
          sale.items.map(async (item) => {
            const prodRef = doc(db, 'products', item.productId);
            const snap = await transaction.get(prodRef);
            return { item, ref: prodRef, snap };
          })
        );

        // Step 2: Atomic Concurrency & Stock Validation Phase
        for (const { item, snap } of productReads) {
          let availableStock = 0;
          if (snap.exists()) {
            availableStock = snap.data().stock ?? 0;
          } else {
            const localProd = products.find(p => p.id === item.productId);
            availableStock = localProd ? localProd.stock : 0;
          }

          if (availableStock < item.quantity) {
            throw new Error(`¡Conflicto de Concurrencia! El producto "${item.name}" ya no tiene suficiente stock disponible. (Stock real en servidor: ${availableStock}, solicitado: ${item.quantity}).`);
          }
        }

        // Step 3: Write Phase - Deduct product stock atomically
        for (const { item, ref, snap } of productReads) {
          if (snap.exists()) {
            const currentStock = snap.data().stock ?? 0;
            transaction.update(ref, {
              stock: Math.max(0, currentStock - item.quantity),
              updatedAt: new Date().toISOString()
            });
          } else {
            const localProd = products.find(p => p.id === item.productId);
            const currentStock = localProd ? localProd.stock : item.quantity;
            const fallbackProdData = sanitizeForFirestore({
              ...(localProd || {}),
              id: item.productId,
              name: item.name,
              code: item.code,
              category: item.category,
              stock: Math.max(0, currentStock - item.quantity),
              updatedAt: new Date().toISOString()
            });
            transaction.set(ref, fallbackProdData);
          }
        }

        // Step 4: Write sale record atomically (ensuring no undefined fields)
        const saleRef = doc(collection(db, 'sales'), sale.id);
        const cleanSaleData = sanitizeForFirestore(sale);
        transaction.set(saleRef, cleanSaleData);
      });

      return { success: true };
    } catch (err: any) {
      console.error('Firestore Atomic Transaction Error:', err);
      return { success: false, error: err.message || 'Error al procesar la transacción atómica en Firebase' };
    }
  };

  // Add product to cart with strict stock & quantity checks
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`⚠️ El producto ${product.name} está agotado y no tiene stock disponible.`);
      return;
    }

    // Intercept Promotional & Regalía Category products: require CEO / Supervisor Authorization modal or add as gift
    const isGiftProduct = 
      product.category === 'Regalía' || 
      product.category === 'Promocionales' || 
      product.isPromotional === true || 
      product.isPromotionalGift === true || 
      product.salePrice === 0;

    if (isGiftProduct) {
      if (!promotionalAuthorizedBy && !isCEO) {
        setPendingGiftProduct(product);
        setRegaliaPin('');
        setRegaliaPinError('');
        setShowRegaliaPinModal(true);
        return;
      } else {
        handleAddPromotionalGifts([{ product, quantity: 1 }], promotionalAuthorizedBy || (isCEO ? 'CEO' : 'Supervisor'));
        return;
      }
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && !item.isPromotionalGift);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`⚠️ Stock máximo alcanzado (${product.stock} unidades disponibles en inventario).`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id && !item.isPromotionalGift
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice }
            : item
        );
      } else {
        // Auto apply promo if eligible
        const promo = getAutoPromotionForProduct(product);
        let discountPct = 0;
        let unitP = product.salePrice;

        if (promo) {
          if (promo.type === 'percentage') {
            discountPct = promo.discountValue;
          } else if (promo.type === 'fixed') {
            unitP = Math.max(0, product.salePrice - promo.discountValue);
          }
        }

        const initialSubtotal = unitP * (1 - discountPct / 100);

        return [
          ...prev,
          {
            product,
            quantity: 1,
            discountPercentage: discountPct,
            discountAmount: product.salePrice - initialSubtotal,
            unitPrice: product.salePrice,
            subtotal: initialSubtotal
          }
        ];
      }
    });
  };

  // Add promotional gifts with $0.00 customer cost and CEO authorization tag
  const handleAddPromotionalGifts = (
    items: { product: Product; quantity: number }[],
    authorizedBy: string
  ) => {
    setPromotionalAuthorizedBy(authorizedBy);
    setCart(prev => {
      let updated = [...prev];
      for (const { product, quantity } of items) {
        const existingIndex = updated.findIndex(
          i => i.product.id === product.id && i.isPromotionalGift
        );
        if (existingIndex >= 0) {
          const existing = updated[existingIndex];
          const newQty = Math.min(product.stock, existing.quantity + quantity);
          updated[existingIndex] = {
            ...existing,
            quantity: newQty,
            unitPrice: 0,
            subtotal: 0,
            discountPercentage: 100,
            discountAmount: 0,
            isPromotionalGift: true,
            promotionalAuthorizedBy: authorizedBy
          };
        } else {
          updated.push({
            product,
            quantity: Math.min(product.stock, quantity),
            discountPercentage: 100,
            discountAmount: 0,
            unitPrice: 0,
            subtotal: 0,
            isPromotionalGift: true,
            promotionalAuthorizedBy: authorizedBy
          });
        }
      }
      return updated;
    });
  };

  // Quantity button delta handler (+1 / -1)
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) {
              alert(`⚠️ Stock máximo disponible para "${item.product.name}" es ${item.product.stock} unidades.`);
              return item;
            }
            const unitFinal = item.isPromotionalGift ? 0 : item.unitPrice * (1 - item.discountPercentage / 100);
            return {
              ...item,
              quantity: newQty,
              subtotal: unitFinal * newQty
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Direct quantity input change handler (Strict: positive integers only, no decimals, no letters, no negatives, <= stock)
  const handleQuantityInputChange = (productId: string, rawVal: string) => {
    // Strip non-digits (disallows negative signs, decimals '.', ',', letters, 'e')
    const cleanDigits = rawVal.replace(/[^0-9]/g, '');

    if (cleanDigits === '') {
      setCart(prev =>
        prev.map(item =>
          item.product.id === productId
            ? { ...item, quantity: 1, subtotal: item.isPromotionalGift ? 0 : item.unitPrice * (1 - item.discountPercentage / 100) }
            : item
        )
      );
      return;
    }

    let parsedQty = parseInt(cleanDigits, 10);
    if (isNaN(parsedQty) || parsedQty < 1) {
      parsedQty = 1;
    }

    const cartItem = cart.find(i => i.product.id === productId);
    if (cartItem && parsedQty > cartItem.product.stock) {
      alert(`⚠️ Exceso de stock: La cantidad máxima en inventario para "${cartItem.product.name}" es de ${cartItem.product.stock} unidades.`);
      parsedQty = cartItem.product.stock;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const unitFinal = item.isPromotionalGift ? 0 : item.unitPrice * (1 - item.discountPercentage / 100);
          return {
            ...item,
            quantity: parsedQty,
            subtotal: unitFinal * parsedQty
          };
        }
        return item;
      })
    );
  };

  // Prevent invalid keys in numeric quantity inputs
  const preventNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['.', ',', '-', '+', 'e', 'E'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const remaining = prev.filter(item => item.product.id !== productId);
      if (remaining.length === 0) {
        // Expire PIN permission and reset discount when cart is emptied
        setManualDiscountValue(0);
        setCustomDiscountInput('');
        setAuthorizedSupervisor(null);
        setProfitOverrideAuthorizedBy(null);
        setPromotionalAuthorizedBy(null);
      } else {
        const hasGifts = remaining.some(i => i.isPromotionalGift);
        if (!hasGifts) setPromotionalAuthorizedBy(null);
      }
      return remaining;
    });
  };

  const handleClearCart = () => {
    setCart([]);
    setManualDiscountValue(0);
    setCustomDiscountInput('');
    setAuthorizedSupervisor(null);
    setProfitOverrideAuthorizedBy(null);
    setPromotionalAuthorizedBy(null);
    setCustomerName('Cliente Contado');
    setCustomerPhone('');
  };

  // 1. Cart Gross Subtotal (Precio de Venta Regular)
  const rawSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [cart]);

  // 2. Real Merchandise Cost (Costo Real de Inventario)
  const totalCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((item.product.costPrice ?? 0) * item.quantity), 0);
  }, [cart]);

  // 3. Real Gross Profit (Ganancia Real = Venta - Costo)
  const realGrossProfit = useMemo(() => {
    return Math.max(0, rawSubtotal - totalCost);
  }, [rawSubtotal, totalCost]);

  // 4. Gross Margin Percentage
  const grossMarginPercent = useMemo(() => {
    return rawSubtotal > 0 ? (realGrossProfit / rawSubtotal) * 100 : 0;
  }, [rawSubtotal, realGrossProfit]);

  // 5. Max Safe Discount Threshold (Regla de Oro: Máximo 50% de la Ganancia Real)
  const maxProfitSafeDiscount = useMemo(() => {
    return realGrossProfit * 0.50;
  }, [realGrossProfit]);

  // 6. Automatic Promo Discounts
  const autoDiscountTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.discountAmount * item.quantity), 0);
  }, [cart]);

  // 7. Manual Discount in Dollars ($)
  const manualDiscountAmount = useMemo(() => {
    const availableBase = Math.max(0, rawSubtotal - autoDiscountTotal);
    if (manualDiscountMode === 'percentage') {
      const pct = Math.min(100, Math.max(0, manualDiscountValue || 0));
      return (availableBase * pct) / 100;
    } else {
      return Math.min(availableBase, Math.max(0, manualDiscountValue || 0));
    }
  }, [rawSubtotal, autoDiscountTotal, manualDiscountMode, manualDiscountValue]);

  // 8. Manual Discount Percentage Equivalent
  const manualDiscountPercent = useMemo(() => {
    const availableBase = Math.max(0, rawSubtotal - autoDiscountTotal);
    if (availableBase <= 0) return 0;
    return (manualDiscountAmount / availableBase) * 100;
  }, [manualDiscountAmount, rawSubtotal, autoDiscountTotal]);

  // 9. Total Combined Discount ($)
  const totalDiscount = useMemo(() => {
    return autoDiscountTotal + manualDiscountAmount;
  }, [autoDiscountTotal, manualDiscountAmount]);

  // 10. Grand Total to Pay
  const grandTotal = useMemo(() => {
    return Math.max(0, rawSubtotal - totalDiscount);
  }, [rawSubtotal, totalDiscount]);

  // 11. Net Profit Remaining after Discounts
  const netProfitAfterDiscount = useMemo(() => {
    return realGrossProfit - totalDiscount;
  }, [realGrossProfit, totalDiscount]);

  // 12. Percentage of Real Profit Consumed by Manual Discount
  const profitConsumedPercent = useMemo(() => {
    if (realGrossProfit <= 0) return manualDiscountAmount > 0 ? 100 : 0;
    return (manualDiscountAmount / realGrossProfit) * 100;
  }, [manualDiscountAmount, realGrossProfit]);

  // 13. Percentage of Allowed Safe Discount Budget Used (Cashier-safe metric)
  const safeLimitUsedPercent = useMemo(() => {
    if (maxProfitSafeDiscount <= 0) return manualDiscountAmount > 0 ? 100 : 0;
    return (manualDiscountAmount / maxProfitSafeDiscount) * 100;
  }, [manualDiscountAmount, maxProfitSafeDiscount]);

  // 14. Discount Protection Rule Validation (Threshold: > 50% of real profit)
  const isExceedingProfitThreshold = useMemo(() => {
    return manualDiscountAmount > (maxProfitSafeDiscount + 0.001) && manualDiscountAmount > 0;
  }, [manualDiscountAmount, maxProfitSafeDiscount]);

  // 14. Active Lock Flag (Blocked unless CEO or Gerente unlocks with authorization PIN)
  const isDiscountProfitBlocked = useMemo(() => {
    return isExceedingProfitThreshold && !profitOverrideAuthorizedBy && !isCEO;
  }, [isExceedingProfitThreshold, profitOverrideAuthorizedBy, isCEO]);

  // Handle Standard Supervisor PIN Verification (for standard discounts <= 50% profit)
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (!supervisorPin.trim()) {
      setPinError('Ingrese el PIN de autorización de 4 dígitos.');
      return;
    }

    const clean = supervisorPin.trim();
    let authRes: { valid: boolean; authorizedBy?: string } = { valid: false };

    // Direct Firestore validation against 'users' collection
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((d) => {
        const u = d.data();
        if (
          (u.role === 'CEO' || u.role === 'Supervisor' || u.role === 'Gerente') &&
          u.status !== 'inactive' &&
          u.pin &&
          String(u.pin).trim() === clean
        ) {
          authRes = { valid: true, authorizedBy: `${u.displayName || u.role} (${u.role})` };
        }
      });
    } catch (err) {
      console.warn('Firestore PIN check note:', err);
    }

    // AuthContext fallback
    if (!authRes.valid) {
      const supCheck = verifySupervisorPin(clean);
      if (supCheck.valid) {
        authRes = { valid: true, authorizedBy: supCheck.authorizedBy || 'Supervisor' };
      } else {
        const ceoCheck = verifyCeoPin(clean);
        if (ceoCheck.valid) {
          authRes = { valid: true, authorizedBy: ceoCheck.authorizedBy || 'CEO' };
        }
      }
    }

    if (authRes.valid) {
      const authName = authRes.authorizedBy || 'Supervisor';
      setAuthorizedSupervisor(authName);
      if (pendingDiscount) {
        setManualDiscountMode(pendingDiscount.mode);
        setManualDiscountValue(pendingDiscount.value);
        setCustomDiscountInput(pendingDiscount.value > 0 ? String(pendingDiscount.value) : '');
        setPendingDiscount(null);
      }
      setShowPinModal(false);
      setSupervisorPin('');
      setPinError('');
    } else {
      setPinError('❌ PIN de Supervisor o CEO incorrecto. Verifique el PIN registrado en Firestore.');
      // Revert/block discount
      setPendingDiscount(null);
      setManualDiscountValue(0);
      setCustomDiscountInput('');
    }
  };

  const handleClosePinModal = () => {
    setShowPinModal(false);
    setSupervisorPin('');
    setPinError('');
    setPendingDiscount(null);
    if (!authorizedSupervisor) {
      setManualDiscountValue(0);
      setCustomDiscountInput('');
    }
  };

  // Handle CEO / Gerente Profit Protection Override PIN Verification (for discounts > 50% profit)
  const handleVerifyOverridePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOverridePinError('');

    if (!overridePin.trim()) {
      setOverridePinError('Ingrese el PIN de autorización de CEO o Gerente.');
      return;
    }

    const clean = overridePin.trim();
    let authRes: { valid: boolean; authorizedBy?: string } = { valid: false };

    // Direct Firestore validation against 'users' collection
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((d) => {
        const u = d.data();
        if (
          (u.role === 'CEO' || u.role === 'Gerente') &&
          u.status !== 'inactive' &&
          u.pin &&
          String(u.pin).trim() === clean
        ) {
          authRes = { valid: true, authorizedBy: `${u.displayName || u.role} (${u.role})` };
        }
      });
    } catch (err) {
      console.warn('Firestore Override PIN check note:', err);
    }

    // AuthContext fallback
    if (!authRes.valid) {
      const ceoCheck = verifyCeoPin(clean);
      if (ceoCheck.valid) {
        authRes = { valid: true, authorizedBy: ceoCheck.authorizedBy || 'CEO' };
      } else {
        const mgrCheck = verifyCeoOrGerentePin(clean);
        if (mgrCheck.valid) {
          authRes = { valid: true, authorizedBy: mgrCheck.authorizedBy || 'Gerente' };
        }
      }
    }

    if (authRes.valid) {
      const authName = authRes.authorizedBy || 'CEO / Gerente';
      setProfitOverrideAuthorizedBy(authName);
      setAuthorizedSupervisor(authName);
      if (pendingDiscount) {
        setManualDiscountMode(pendingDiscount.mode);
        setManualDiscountValue(pendingDiscount.value);
        setCustomDiscountInput(pendingDiscount.value > 0 ? String(pendingDiscount.value) : '');
        setPendingDiscount(null);
      }
      setShowProfitOverrideModal(false);
      setOverridePin('');
      setOverridePinError('');
    } else {
      setOverridePinError('❌ PIN inválido. Solo un usuario con rol de CEO o Gerente registrado en Firestore puede autorizar un descuento que sobrepase el límite seguro.');
      // Revert/block discount
      setPendingDiscount(null);
      setManualDiscountValue(0);
      setCustomDiscountInput('');
    }
  };

  const handleCloseProfitOverrideModal = () => {
    setShowProfitOverrideModal(false);
    setOverridePin('');
    setOverridePinError('');
    setPendingDiscount(null);
    if (!profitOverrideAuthorizedBy) {
      setManualDiscountValue(0);
      setCustomDiscountInput('');
    }
  };

  // Regalía ($0.00) Toggle & PIN Authorization Handlers
  const handleToggleItemRegalia = (item: CartItem) => {
    if (item.isPromotionalGift) {
      // Revert to standard price
      setCart(prev => {
        const next = prev.map(i =>
          i.product.id === item.product.id
            ? {
                ...i,
                unitPrice: i.product.salePrice,
                subtotal: i.product.salePrice * i.quantity,
                discountPercentage: 0,
                discountAmount: 0,
                isPromotionalGift: false,
                promotionalAuthorizedBy: undefined
              }
            : i
        );
        if (!next.some(x => x.isPromotionalGift) && !isCEO) {
          setPromotionalAuthorizedBy(null);
        }
        return next;
      });
    } else {
      // Check authorization to make it $0.00 Regalía
      if (isCEO || promotionalAuthorizedBy) {
        const authName = promotionalAuthorizedBy || (isCEO ? 'CEO' : 'Supervisor');
        if (!promotionalAuthorizedBy) setPromotionalAuthorizedBy(authName);
        setCart(prev =>
          prev.map(i =>
            i.product.id === item.product.id
              ? {
                  ...i,
                  unitPrice: 0,
                  subtotal: 0,
                  discountPercentage: 100,
                  discountAmount: 0,
                  isPromotionalGift: true,
                  promotionalAuthorizedBy: authName
                }
              : i
          )
        );
      } else {
        // Block and request PIN
        setPendingRegaliaProductId(item.product.id);
        setRegaliaPin('');
        setRegaliaPinError('');
        setShowRegaliaPinModal(true);
      }
    }
  };

  const handleVerifyRegaliaPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegaliaPinError('');

    if (!regaliaPin.trim()) {
      setRegaliaPinError('Ingrese el PIN de autorización de 4 dígitos.');
      return;
    }

    const clean = regaliaPin.trim();
    let authRes: { valid: boolean; authorizedBy?: string } = { valid: false };

    // 1. Direct Firestore validation against 'users' collection
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((d) => {
        const u = d.data();
        if (
          (u.role === 'CEO' || u.role === 'Supervisor' || u.role === 'Gerente') &&
          u.status !== 'inactive' &&
          u.pin &&
          String(u.pin).trim() === clean
        ) {
          authRes = { valid: true, authorizedBy: `${u.displayName || u.role} (${u.role})` };
        }
      });
    } catch (err) {
      console.warn('Firestore Regalía PIN check note:', err);
    }

    // 2. AuthContext fallback
    if (!authRes.valid) {
      const ceoCheck = verifyCeoPin(clean);
      if (ceoCheck.valid) {
        authRes = { valid: true, authorizedBy: ceoCheck.authorizedBy || 'CEO' };
      } else {
        const mgrCheck = verifyCeoOrGerentePin(clean);
        if (mgrCheck.valid) {
          authRes = { valid: true, authorizedBy: mgrCheck.authorizedBy || 'Gerente' };
        } else {
          const supCheck = verifySupervisorPin(clean);
          if (supCheck.valid) {
            authRes = { valid: true, authorizedBy: supCheck.authorizedBy || 'Supervisor' };
          }
        }
      }
    }

    if (authRes.valid) {
      const authName = authRes.authorizedBy || 'CEO';
      setPromotionalAuthorizedBy(authName);

      if (pendingRegaliaProductId) {
        setCart(prev =>
          prev.map(i =>
            i.product.id === pendingRegaliaProductId
              ? {
                  ...i,
                  unitPrice: 0,
                  subtotal: 0,
                  discountPercentage: 100,
                  discountAmount: 0,
                  isPromotionalGift: true,
                  promotionalAuthorizedBy: authName
                }
              : i
          )
        );
        setPendingRegaliaProductId(null);
      }

      if (pendingGiftProduct) {
        handleAddPromotionalGifts([{ product: pendingGiftProduct, quantity: 1 }], authName);
        setPendingGiftProduct(null);
      }

      setShowRegaliaPinModal(false);
      setRegaliaPin('');
      setRegaliaPinError('');
    } else {
      setRegaliaPinError('❌ PIN de autorización incorrecto. Verifique el PIN de CEO o Supervisor registrado en Firestore.');
      setPendingRegaliaProductId(null);
      setPendingGiftProduct(null);
    }
  };

  const handleCloseRegaliaPinModal = () => {
    setShowRegaliaPinModal(false);
    setRegaliaPin('');
    setRegaliaPinError('');
    setPendingRegaliaProductId(null);
    setPendingGiftProduct(null);
  };

  // Manual Discount Selector Handler with dynamic Profit Protection trigger
  const handleApplyDiscount = (mode: 'percentage' | 'fixed', val: number) => {
    if (cart.length === 0) {
      alert('⚠️ El carrito está vacío. Agregue productos antes de aplicar un descuento.');
      return;
    }

    // If clearing discount
    if (val === 0) {
      setManualDiscountMode(mode);
      setManualDiscountValue(0);
      setCustomDiscountInput('');
      setPendingDiscount(null);
      return;
    }

    // Calculate would-be dollar discount
    const availableBase = Math.max(0, rawSubtotal - autoDiscountTotal);
    const targetDiscountDollar = mode === 'percentage' 
      ? (availableBase * val) / 100 
      : Math.min(availableBase, val);

    // If current logged in user is CEO, they have direct authority
    if (isCEO) {
      setManualDiscountMode(mode);
      setManualDiscountValue(val);
      setCustomDiscountInput(val > 0 ? String(val) : '');
      setAuthorizedSupervisor('CEO');
      setProfitOverrideAuthorizedBy('CEO');
      return;
    }

    // Profit Protection Check (> 50% of real profit or exceeds safe cap)
    const isExceeding = targetDiscountDollar > (maxProfitSafeDiscount + 0.001);

    if (isExceeding) {
      if (profitOverrideAuthorizedBy) {
        // Already authorized by CEO/Gerente
        setManualDiscountMode(mode);
        setManualDiscountValue(val);
        setCustomDiscountInput(val > 0 ? String(val) : '');
      } else {
        // Block and prompt CEO / Gerente Override PIN modal
        setPendingDiscount({ mode, value: val });
        setOverridePin('');
        setOverridePinError('');
        setShowProfitOverrideModal(true);
      }
      return;
    }

    // Standard discount within safe limit
    if (authorizedSupervisor || isSupervisor) {
      setManualDiscountMode(mode);
      setManualDiscountValue(val);
      setCustomDiscountInput(val > 0 ? String(val) : '');
    } else {
      // Cashier requires Supervisor PIN
      setPendingDiscount({ mode, value: val });
      setSupervisorPin('');
      setPinError('');
      setShowPinModal(true);
    }
  };

  const handleProcessCheckout = () => {
    if (cart.length === 0) return;

    if (!activeCashShift) {
      alert('⚠️ Control de Caja: Debe realizar la Apertura de Caja Registradora con el fondo inicial antes de procesar cobros.');
      if (onGoToArqueo) onGoToArqueo();
      return;
    }

    // Profit Protection Lock: If discount exceeds 50% profit without CEO / Gerente approval
    if (isDiscountProfitBlocked) {
      setShowProfitOverrideModal(true);
      return;
    }

    // Standard PIN check: manual discount MUST have PIN authorization flag
    if (manualDiscountAmount > 0 && !authorizedSupervisor && !isSupervisor && !isCEO) {
      alert('🔒 Validación Requerida: El descuento manual aplicado requiere la validación con PIN de Supervisor o Gerente.');
      setShowPinModal(true);
      return;
    }

    // Regalía check: If any gift item in cart without authorization flag
    const hasGifts = cart.some(i => i.isPromotionalGift || i.unitPrice === 0 || i.product.category === 'Regalía');
    if (hasGifts && !promotionalAuthorizedBy && !isCEO) {
      alert('🔒 Validación Requerida: Los artículos marcados como Regalía ($0.00) requieren autorización con PIN de CEO o Supervisor.');
      setShowRegaliaPinModal(true);
      return;
    }

    setAmountPaid(grandTotal.toFixed(2));
    setShowPaymentModal(true);
  };

  const handleFinalizeSale = async () => {
    // Re-verify Profit Protection Lock before finalizing
    if (isDiscountProfitBlocked) {
      setShowPaymentModal(false);
      setShowProfitOverrideModal(true);
      return;
    }

    // Re-verify standard supervisor requirement
    if (manualDiscountAmount > 0 && !authorizedSupervisor && !isSupervisor && !isCEO) {
      alert('🔒 Transacción Rechazada: El descuento manual requiere autorización con PIN antes de finalizar el cobro.');
      setShowPaymentModal(false);
      setShowPinModal(true);
      return;
    }

    // Re-verify regalía authorization before saving to Firestore
    const hasGifts = cart.some(i => i.isPromotionalGift || i.unitPrice === 0 || i.product.category === 'Regalía');
    if (hasGifts && !promotionalAuthorizedBy && !isCEO) {
      alert('🔒 Transacción Rechazada: Los artículos de Regalía ($0.00) requieren autorización con PIN de CEO o Supervisor antes de guardar la venta.');
      setShowPaymentModal(false);
      setShowRegaliaPinModal(true);
      return;
    }

    const paidNum = parseFloat(amountPaid) || grandTotal;
    const change = Math.max(0, paidNum - grandTotal);

    const cleanCustomerName = selectedCustomer ? selectedCustomer.fullName : (customerName.trim() || 'Cliente Contado');
    const cleanCustomerPhone = selectedCustomer ? selectedCustomer.phone : customerPhone.trim();
    const discountAuth = profitOverrideAuthorizedBy || authorizedSupervisor || (isCEO ? 'CEO' : '');

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      ticketNumber: `FAC-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString(),
      cashierUid: currentUser?.uid || 'cajero-pos',
      cashierName: currentUser?.displayName || role || 'Cajero',
      ...(selectedCustomer?.id ? { customerId: selectedCustomer.id } : {}),
      ...(cleanCustomerName ? { customerName: cleanCustomerName } : {}),
      ...(cleanCustomerPhone ? { customerPhone: cleanCustomerPhone } : {}),
      ...(selectedCustomer?.docType ? { customerDocType: selectedCustomer.docType } : {}),
      ...(selectedCustomer?.docNumber ? { customerDocNumber: selectedCustomer.docNumber } : {}),
      ...(selectedCustomer?.razonSocial ? { customerRazonSocial: selectedCustomer.razonSocial } : {}),
      ...(selectedCustomer?.address ? { customerAddress: selectedCustomer.address } : {}),
      ...(selectedCustomer?.giro ? { customerGiro: selectedCustomer.giro } : {}),
      items: cart.map(item => {
        const itemObj: Sale['items'][0] = {
          productId: item.product.id,
          code: item.product.code,
          name: item.product.name,
          category: item.product.category,
          quantity: item.quantity,
          unitCost: item.product.costPrice,
          unitPrice: item.isPromotionalGift ? 0 : item.unitPrice,
          discountAmount: item.isPromotionalGift ? 0 : (item.discountAmount + ((item.subtotal * manualDiscountPercent) / 100)),
          subtotal: item.isPromotionalGift ? 0 : (item.subtotal * (1 - manualDiscountPercent / 100)),
          ...(item.isPromotionalGift ? { isPromotionalGift: true } : {}),
          ...(item.promotionalAuthorizedBy ? { promotionalAuthorizedBy: item.promotionalAuthorizedBy } : {})
        };
        return itemObj;
      }),
      subtotal: rawSubtotal,
      discountTotal: totalDiscount,
      ...(discountAuth ? { discountAuthorizedBy: discountAuth } : {}),
      ...(promotionalAuthorizedBy ? { promotionalAuthorizedBy } : {}),
      total: grandTotal,
      paymentMethod,
      amountPaid: paidNum,
      changeGiven: change,
      status: 'Completada',
      createdAt: new Date().toISOString()
    };

    setIsProcessingSale(true);

    // Execute atomic transaction in Firebase
    const txRes = await processAtomicSaleInFirestore(newSale);
    if (!txRes.success) {
      alert(`❌ Error al procesar la venta en Firestore:\n${txRes.error || 'No se pudo registrar la venta en la base de datos central.'}`);
      setIsProcessingSale(false);
      return;
    }

    onCompleteSale(newSale);
    setIsProcessingSale(false);
    setShowPaymentModal(false);
    setCompletedSale(newSale);
    
    // Reset cart state
    setCart([]);
    setManualDiscountValue(0);
    setCustomDiscountInput('');
    setAuthorizedSupervisor(null);
    setProfitOverrideAuthorizedBy(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 h-full max-w-full">
      {/* Left Column: Product Selection Grid (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col gap-4 max-w-full">
        {/* Cash Shift Status Banner */}
        <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
          activeCashShift
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${activeCashShift ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="font-bold">
              {activeCashShift
                ? `Caja Abierta (${activeCashShift.cashierName}) • Fondo Inicial: $${activeCashShift.initialAmount.toFixed(2)}`
                : 'Caja Cerrada • Se requiere apertura de turno para registrar cobros'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onRegisterPettyCashExpense && (
              <button
                type="button"
                onClick={() => setShowPettyCashModal(true)}
                className="px-3 py-1.5 rounded-xl font-bold text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Registrar pago a proveedor o salida de efectivo"
              >
                <span>💸 Salida / Pago Proveedor</span>
              </button>
            )}

            <button
              onClick={onGoToArqueo}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer ${
                activeCashShift
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
              }`}
            >
              {activeCashShift ? 'Arqueo de Caja' : 'Abrir Caja'}
            </button>
          </div>
        </div>

        {/* Search & Categories Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-md max-w-full">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const term = searchTerm.trim().toLowerCase();
                    if (!term) return;

                    const found =
                      products.find(
                        (p) => p.code.toLowerCase() === term || p.id.toLowerCase() === term
                      ) ||
                      (filteredProducts.length === 1 ? filteredProducts[0] : null) ||
                      products.find((p) => p.code.toLowerCase().includes(term));

                    if (found) {
                      if (found.stock <= 0) {
                        setScannedFeedback(`⚠️ "${found.name}" está agotado (Stock 0)`);
                        setTimeout(() => setScannedFeedback(null), 3500);
                      } else {
                        addToCart(found);
                        setScannedFeedback(`✅ "${found.name}" agregado al carrito ($${found.salePrice.toFixed(2)})`);
                        setSearchTerm('');
                        setTimeout(() => setScannedFeedback(null), 3000);
                      }
                    } else {
                      setScannedFeedback(`⚠️ No se encontró producto con código "${searchTerm}"`);
                      setTimeout(() => setScannedFeedback(null), 3500);
                    }
                  }
                }}
                placeholder="Escanee con pistola de código de barras o busque por nombre/marca..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500 transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              title="Escanear Código de Barras con Cámara del Dispositivo"
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-md shadow-blue-600/20 shrink-0 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Escanear Cámara</span>
            </button>
          </div>

          {/* Feedback banner for barcode scans */}
          {scannedFeedback && (
            <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-1 ${
              scannedFeedback.startsWith('✅') 
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
            }`}>
              <span>{scannedFeedback}</span>
              <button 
                type="button" 
                onClick={() => setScannedFeedback(null)} 
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none touch-pan-x max-w-full whitespace-nowrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
          {filteredProducts.map(product => {
            const promo = getAutoPromotionForProduct(product);
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= product.minStock;

            return (
              <div
                key={product.id}
                className={`group relative bg-slate-900 border rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 ${
                  isOutOfStock 
                    ? 'opacity-50 border-slate-800 bg-slate-950/40 cursor-not-allowed'
                    : 'border-slate-800 hover:border-blue-500/80 hover:shadow-lg hover:shadow-blue-500/10'
                }`}
              >
                {/* Promo Badge */}
                {promo && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Tag className="w-3 h-3" /> PROMO
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 mb-1">
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded-md">{product.category}</span>
                    <span className="truncate">{product.brand}</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">Cód: {product.code}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-emerald-400">
                      ${product.salePrice.toFixed(2)}
                    </p>
                    {promo?.type === 'percentage' && (
                      <p className="text-[10px] text-amber-400 font-semibold line-through">
                        ${(product.salePrice / (1 - promo.discountValue / 100)).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(product)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 ${
                      isOutOfStock
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer'
                    }`}
                  >
                    {isOutOfStock ? (
                      'Agotado'
                    ) : (
                      <>
                        <Plus className="w-3 h-3" /> Agregar ({product.stock})
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Shopping Cart & Billing Panel (5 Cols) */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
        <div className="space-y-4">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Carrito de Facturación</h3>
            </div>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                  title="Vaciar carrito y reiniciar permisos de transacción"
                >
                  Vaciar
                </button>
              )}
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} ítems
              </span>
            </div>
          </div>

          {/* Customer & CRM Selector Section */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Cliente / Facturación Electrónica
              </span>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(true)}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded-lg border border-cyan-500/30 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Nuevo Cliente
              </button>
            </div>

            {selectedCustomer ? (
              <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate">{selectedCustomer.fullName}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                      selectedCustomer.type === 'VIP' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                      selectedCustomer.type === 'Mayorista' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                      selectedCustomer.type === 'Lead/Prospecto' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {selectedCustomer.type}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-cyan-300 font-bold">{selectedCustomer.docType}: {selectedCustomer.docNumber}</span>
                    <span>• {selectedCustomer.phone}</span>
                  </div>
                  {selectedCustomer.razonSocial && selectedCustomer.razonSocial !== selectedCustomer.fullName && (
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      Razón Social: {selectedCustomer.razonSocial}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleClearSelectedCustomer}
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                  title="Desvincular cliente"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setIsCustomerDropdownOpen(true);
                        setCustomerName(e.target.value || 'Cliente Contado');
                      }}
                      placeholder="Buscar cliente por Nombre, Teléfono o DUI/NIT..."
                      className="w-full pl-2.5 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Dropdown Menu */}
                {isCustomerDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-800">
                    <div className="p-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between items-center">
                      <span>Seleccionar Cliente Registrado:</span>
                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen(false)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        Cerrar
                      </button>
                    </div>

                    {filteredCustomersForPOS.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No se encontró ningún cliente.
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomerDropdownOpen(false);
                            setShowQuickCustomerModal(true);
                          }}
                          className="block mx-auto mt-1 text-cyan-400 font-bold underline"
                        >
                          + Crear "{customerSearchQuery}"
                        </button>
                      </div>
                    ) : (
                      filteredCustomersForPOS.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full text-left p-2 hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-xs text-white">{c.fullName}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span className="font-mono text-cyan-400">{c.docType}: {c.docNumber}</span>
                              <span>• {c.phone}</span>
                            </div>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            c.type === 'VIP' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                            c.type === 'Mayorista' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {c.type}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Promotional Gifts Space & Smartphone Suggestion Banner */}
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-purple-950/30 border border-purple-800/40 rounded-xl p-2.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Gift className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-purple-200 block">Regalías y Cortesías</span>
                  <span className="text-[10px] text-purple-300/70">Artículos a $0.00 autorizados por CEO</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPromoGiftModal(true)}
                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5" /> Regalías ($0.00)
              </button>
            </div>

            {hasDeviceInCart && (
              <div className="p-2.5 bg-gradient-to-r from-purple-950/60 to-blue-950/60 border border-purple-600/40 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="text-[11px]">
                    <span className="font-bold text-white block">📱 Venta de Teléfono Detectada</span>
                    <span className="text-[10px] text-purple-200">¿Deseas incluir regalías o cortesías autorizadas?</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPromoGiftModal(true)}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer shadow-xs shrink-0 flex items-center gap-1"
                >
                  <Gift className="w-3 h-3" /> Añadir Regalía
                </button>
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                El carrito está vacío. Haz clic en un producto para agregarlo.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className={`border rounded-xl p-2.5 flex items-center justify-between gap-2 transition-all ${
                    item.isPromotionalGift
                      ? 'bg-purple-950/30 border-purple-800/60 shadow-xs'
                      : 'bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <div className="overflow-hidden flex-1">
                    {item.isPromotionalGift ? (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] font-extrabold flex items-center gap-1">
                            <Gift className="w-2.5 h-2.5" /> REGALO $0.00
                          </span>
                          <p className="text-xs font-bold text-purple-100 truncate">{item.product.name}</p>
                        </div>
                        <p className="text-[10px] text-purple-300 font-semibold mt-0.5">
                          $0.00 (Gratis) • <span className="text-slate-400">Aut. CEO: {item.promotionalAuthorizedBy || 'CEO'}</span>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-100 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-emerald-400 font-mono font-semibold">
                          ${item.unitPrice.toFixed(2)} c/u
                          {item.discountAmount > 0 && (
                            <span className="text-amber-400 ml-1">(-${item.discountAmount.toFixed(2)})</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Strict Quantity Controls (Numeric Input + Delta Buttons) */}
                  <div className={`flex items-center gap-1 bg-slate-900 px-1.5 py-1 rounded-lg border ${
                    item.isPromotionalGift ? 'border-purple-800/60' : 'border-slate-700'
                  }`}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      disabled={item.quantity <= 1}
                      className="p-1 hover:text-white text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Disminuir cantidad"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity}
                      onChange={(e) => handleQuantityInputChange(item.product.id, e.target.value)}
                      onKeyDown={preventNonNumericKeys}
                      className={`w-9 text-center font-bold text-xs bg-slate-800 border text-white rounded py-0.5 focus:outline-hidden ${
                        item.isPromotionalGift ? 'border-purple-700/60 focus:border-purple-500' : 'border-slate-700 focus:border-blue-500'
                      }`}
                      title={item.isPromotionalGift ? 'Cantidad de cortesía' : 'Cantidad'}
                    />

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-1 hover:text-white text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Aumentar cantidad"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right min-w-16">
                    <p className={`text-xs font-extrabold ${item.isPromotionalGift ? 'text-purple-300' : 'text-white'}`}>
                      ${(item.subtotal).toFixed(2)}
                    </p>
                    {item.isPromotionalGift && (
                      <span className="text-[9px] text-slate-400 block font-mono">Stock: {item.product.stock}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleItemRegalia(item)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        item.isPromotionalGift
                          ? 'bg-purple-600 text-white border-purple-500 hover:bg-purple-500 shadow-xs'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-purple-300 hover:border-purple-500/50'
                      }`}
                      title={item.isPromotionalGift ? 'Quitar condición de Regalía (Volver a precio de lista)' : 'Convertir en Regalía ($0.00)'}
                    >
                      <Gift className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 cursor-pointer"
                      title="Eliminar del carrito"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Totals & Supervisor Manual Discount Section with Profit Protection */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          {/* Manual Discount Authorization & Margin Health Widget */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Descuento & Protección de Margen</span>
              </div>

              {/* Mode Toggle: % vs $ */}
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setManualDiscountMode('percentage');
                    setManualDiscountValue(0);
                    setCustomDiscountInput('');
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    manualDiscountMode === 'percentage'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  % Porcentaje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualDiscountMode('fixed');
                    setManualDiscountValue(0);
                    setCustomDiscountInput('');
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    manualDiscountMode === 'fixed'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  $ Monto Fijo
                </button>
              </div>
            </div>

            {/* Safe Discount Limit & Status Bar (Cashier-Safe: Hides Cost & Real Profit) */}
            <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Límite Máx. Descuento Permitido:</span>
                <span className="font-bold text-cyan-400 font-mono text-xs">
                  ${maxProfitSafeDiscount.toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-500 block">Límite seguro de caja</span>
              </div>
              <div className="text-right flex flex-col justify-between items-end">
                <span className="text-slate-400 block text-[10px]">Estado de Descuento:</span>
                {manualDiscountAmount === 0 ? (
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                    Sin Descuento
                  </span>
                ) : !isExceedingProfitThreshold ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Dentro de Límite
                  </span>
                ) : profitOverrideAuthorizedBy || isCEO ? (
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-400" /> Autorizado
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" /> Requiere PIN Gerente
                  </span>
                )}
              </div>
            </div>

            {/* Confidential Management Pill: Visible ONLY to CEO / Gerente */}
            {(isCEO || isGerente) && (
              <div className="px-2.5 py-1 bg-slate-950/80 rounded-lg border border-slate-800/90 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1 text-slate-400">
                  <Lock className="w-3 h-3 text-slate-500" /> Vista Gerencial:
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  Margen: ${realGrossProfit.toFixed(2)} ({grossMarginPercent.toFixed(1)}%) • Costo: ${totalCost.toFixed(2)}
                </span>
              </div>
            )}

            {/* Quick Discount Selector Chips */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {manualDiscountMode === 'percentage' ? 'Seleccionar % Descuento:' : 'Seleccionar Monto ($):'}
                </span>
                {authorizedSupervisor || isCEO || profitOverrideAuthorizedBy ? (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {profitOverrideAuthorizedBy 
                      ? `🔓 Anulado por: ${profitOverrideAuthorizedBy}` 
                      : isCEO 
                        ? '✅ Autorizado (CEO)' 
                        : `✅ Autorizado por ${authorizedSupervisor}`}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPinModal(true)}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Ingresar PIN Supervisor
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(manualDiscountMode === 'percentage' ? [0, 5, 10, 15, 20] : [0, 2, 5, 10, 20]).map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleApplyDiscount(manualDiscountMode, val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      manualDiscountValue === val
                        ? isExceedingProfitThreshold
                          ? 'bg-red-500 text-white shadow-xs'
                          : 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {manualDiscountMode === 'percentage' ? `${val}%` : `$${val}`}
                  </button>
                ))}

                {/* Custom Input */}
                <div className="flex items-center gap-1 ml-auto">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={manualDiscountMode === 'percentage' ? 'Otro %' : 'Otro $'}
                    value={customDiscountInput}
                    onChange={(e) => {
                      const str = e.target.value;
                      setCustomDiscountInput(str);
                      const num = parseFloat(str) || 0;
                      handleApplyDiscount(manualDiscountMode, num);
                    }}
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white text-center focus:outline-hidden focus:border-amber-500"
                  />
                  {manualDiscountValue > 0 && (
                    <button
                      type="button"
                      onClick={() => handleApplyDiscount(manualDiscountMode, 0)}
                      className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                      title="Quitar descuento"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Safe Discount Usage Progress Bar (Cashier-Friendly) */}
            {maxProfitSafeDiscount > 0 && manualDiscountAmount > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">Uso del Límite de Descuento:</span>
                  <span className={`font-mono font-bold ${
                    safeLimitUsedPercent > 100 ? 'text-red-400' : safeLimitUsedPercent > 80 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {safeLimitUsedPercent.toFixed(1)}% (${manualDiscountAmount.toFixed(2)} de ${maxProfitSafeDiscount.toFixed(2)})
                  </span>
                </div>
                
                {/* Visual Bar with 100% Threshold marker */}
                <div className="relative w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      safeLimitUsedPercent > 100 
                        ? 'bg-red-500' 
                        : safeLimitUsedPercent > 80 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, safeLimitUsedPercent)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Profit Protection Blocking Warning Banner (Cashier Safe) */}
            {isExceedingProfitThreshold && (
              <div className={`p-2.5 rounded-xl border text-xs space-y-2 ${
                profitOverrideAuthorizedBy || isCEO
                  ? 'bg-purple-950/40 border-purple-800/60 text-purple-300'
                  : 'bg-red-950/50 border-red-800/80 text-red-300'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                    profitOverrideAuthorizedBy || isCEO ? 'text-purple-400' : 'text-red-400'
                  }`} />
                  <div>
                    <p className="font-bold text-[11px]">
                      {profitOverrideAuthorizedBy || isCEO
                        ? '🔓 Descuento Especial Autorizado por Gerencia'
                        : '⚠️ BLOQUEO: Descuento supera el límite seguro de caja'}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      Descuento aplicado: <span className="font-mono font-bold text-amber-300">${manualDiscountAmount.toFixed(2)}</span> (Límite seguro permitido: ${maxProfitSafeDiscount.toFixed(2)}). 
                      {!profitOverrideAuthorizedBy && !isCEO && (
                        <span className="text-red-300 block mt-0.5 font-medium">
                          Para aplicar descuentos superiores al límite permitido se requiere autorización con PIN de Gerencia o CEO.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {!profitOverrideAuthorizedBy && !isCEO && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowProfitOverrideModal(true)}
                      className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs shadow-red-600/30"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Autorizar Descuento con PIN de CEO / Gerente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subtotal & Total Breakdown */}
          <div className="space-y-1.5 text-xs text-slate-300 font-medium">
            <div className="flex justify-between">
              <span>Subtotal Bruto:</span>
              <span>${rawSubtotal.toFixed(2)}</span>
            </div>
            {autoDiscountTotal > 0 && (
              <div className="flex justify-between text-amber-400 font-semibold">
                <span>Promociones Automáticas:</span>
                <span>-${autoDiscountTotal.toFixed(2)}</span>
              </div>
            )}
            {manualDiscountAmount > 0 && (
              <div className="flex justify-between text-amber-400 font-semibold">
                <span>Descuento Manual ({manualDiscountMode === 'percentage' ? `${manualDiscountValue}%` : `$${manualDiscountValue.toFixed(2)}`}):</span>
                <span>-${manualDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
              <span>TOTAL A PAGAR:</span>
              <span className="text-emerald-400 text-lg">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            disabled={cart.length === 0 || isProcessingSale}
            onClick={handleProcessCheckout}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
              isDiscountProfitBlocked
                ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-emerald-600/20'
            }`}
          >
            {isProcessingSale ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando Transacción Atómica...</span>
              </>
            ) : isDiscountProfitBlocked ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Desbloquear Descuento con PIN para Cobrar</span>
              </>
            ) : (
              <>
                <span>Cobrar y Generar Factura</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* CEO / Gerente Profit Protection Override Modal */}
      {showProfitOverrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Autorización de Descuento Excepcional</h3>
                <p className="text-xs text-amber-400 font-semibold">El descuento supera el límite estándar de caja</p>
              </div>
            </div>

            {/* Diagnostic Financial Breakdown - Role-Adaptive */}
            {(isCEO || isGerente) ? (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal Venta:</span>
                  <span className="font-mono font-bold text-white">${rawSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Costo Total Mercadería:</span>
                  <span className="font-mono">${totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-semibold pt-1 border-t border-slate-800">
                  <span>Ganancia Bruta Real:</span>
                  <span className="font-mono">${realGrossProfit.toFixed(2)} ({grossMarginPercent.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between text-cyan-400 font-semibold">
                  <span>Límite Estándar Permitido (50% ganancia):</span>
                  <span className="font-mono">${maxProfitSafeDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold pt-1 border-t border-slate-800">
                  <span>Descuento Solicitado:</span>
                  <span className="font-mono">-${manualDiscountAmount.toFixed(2)} ({profitConsumedPercent.toFixed(1)}% de la ganancia)</span>
                </div>
                <div className="flex justify-between text-white font-extrabold pt-1 border-t border-slate-800">
                  <span>Ganancia Neta Restante:</span>
                  <span className={`font-mono ${netProfitAfterDiscount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ${netProfitAfterDiscount.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal Venta:</span>
                  <span className="font-mono font-bold text-white">${rawSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-cyan-400 font-semibold">
                  <span>Límite Máximo Permitido en Caja:</span>
                  <span className="font-mono">${maxProfitSafeDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold pt-1 border-t border-slate-800">
                  <span>Descuento Solicitado:</span>
                  <span className="font-mono">-${manualDiscountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-400 font-bold">
                  <span>Exceso sobre Límite Permitido:</span>
                  <span className="font-mono">+${Math.max(0, manualDiscountAmount - maxProfitSafeDiscount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-extrabold pt-1 border-t border-slate-800">
                  <span>Total Resultante a Cobrar:</span>
                  <span className="font-mono text-emerald-400">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed">
              Para procesar un descuento superior al límite estándar autorizado en caja, se requiere obligatoriamente la autorización explícita de un <strong>CEO</strong> o <strong>Gerente</strong> con su PIN.
            </p>

            {overridePinError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{overridePinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOverridePin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  PIN de Autorización de CEO o Gerente *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={overridePin}
                  onChange={(e) => setOverridePin(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  required
                  className="w-full text-center text-xl font-mono tracking-widest px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-red-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfitOverrideModal(false);
                    setOverridePin('');
                    setOverridePinError('');
                  }}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!overridePin.trim()}
                  className="w-2/3 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  Autorizar Descuento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CEO / Supervisor Regalía PIN Authorization Modal */}
      {showRegaliaPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Autorización de Regalía / Obsequio</h3>
                <p className="text-xs text-purple-300 font-semibold">Salida de producto a $0.00 de inventario central</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Operación:</span>
                <span className="font-bold text-purple-300">Entrega de Artículo en Regalía ($0.00)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Para marcar o agregar productos en condición de <strong>Regalía</strong> con precio de venta en cero y salida de inventario, se requiere validación obligatoria con el <strong>PIN de CEO o Supervisor</strong> registrado en Firestore.
              </p>
            </div>

            {regaliaPinError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regaliaPinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyRegaliaPin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  PIN de Autorización de CEO / Supervisor *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={regaliaPin}
                  onChange={(e) => setRegaliaPin(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  required
                  className="w-full text-center text-xl font-mono tracking-widest px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseRegaliaPinModal}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!regaliaPin.trim()}
                  className="w-2/3 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  Autorizar Regalía
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standard Supervisor PIN Authorization Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Autorización de Descuento Manual</h3>
                <p className="text-xs text-slate-400">Requiere PIN de Supervisor, Gerente o CEO</p>
              </div>
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {pinError}
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">PIN de Autorización</label>
                <input
                  type="password"
                  maxLength={6}
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  required
                  className="w-full text-center text-lg font-mono tracking-widest px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!supervisorPin.trim()}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Validar PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Procesar Pago de Factura
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
              <span className="text-xs font-medium text-slate-400">Total a Cobrar:</span>
              <span className="text-xl font-extrabold text-emerald-400">${grandTotal.toFixed(2)}</span>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Efectivo', 'Tarjeta', 'Transferencia'] as PaymentMethod[]).map(pm => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      paymentMethod === pm
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {pm === 'Efectivo' ? <DollarSign className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    <span>{pm}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Paid and Change */}
            {paymentMethod === 'Efectivo' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monto Recibido ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-400">Cambio / Vuelto:</span>
                  <span className="text-base font-bold text-amber-400">
                    ${Math.max(0, (parseFloat(amountPaid) || 0) - grandTotal).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFinalizeSale}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
              >
                <CheckCircle className="w-4 h-4" /> Completar Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt / Invoice Ticket Modal */}
      {completedSale && (
        <TicketPrint
          sale={completedSale}
          paperWidth={printPaperWidth as '48mm' | '58mm' | '80mm'}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* BARCODE SCANNER MODAL (Camera) */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        continuous={true}
        title="Lector de Códigos de Barras (POS)"
        subtitle="Apunte la cámara al código de barra; se agregará automáticamente al carrito"
      />

      {/* QUICK CUSTOMER CREATION MODAL IN POS */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 text-slate-100 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Registro Rápido de Cliente (POS)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Completo / Nombre Comercial *</label>
                <input
                  type="text"
                  value={quickFullName}
                  onChange={(e) => setQuickFullName(e.target.value)}
                  placeholder="ej. Juan Carlos Pérez"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Teléfono / WhatsApp *</label>
                  <input
                    type="text"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="ej. +503 7000-1122"
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={quickEmail}
                    onChange={(e) => setQuickEmail(e.target.value)}
                    placeholder="ej. juan@correo.com"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo Documento *</label>
                  <select
                    value={quickDocType}
                    onChange={(e) => setQuickDocType(e.target.value as DocumentType)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                  >
                    <option value="DUI">DUI</option>
                    <option value="NIT">NIT</option>
                    <option value="NRC">NRC</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Número de Documento *</label>
                  <input
                    type="text"
                    value={quickDocNumber}
                    onChange={(e) => setQuickDocNumber(e.target.value)}
                    placeholder="ej. 01234567-8"
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Razón Social Fiscal (Opcional)</label>
                <input
                  type="text"
                  value={quickRazonSocial}
                  onChange={(e) => setQuickRazonSocial(e.target.value)}
                  placeholder="ej. Juan Pérez S.A. de C.V."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Dirección Fiscal</label>
                  <input
                    type="text"
                    value={quickAddress}
                    onChange={(e) => setQuickAddress(e.target.value)}
                    placeholder="ej. San Salvador"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Cliente CRM</label>
                  <select
                    value={quickType}
                    onChange={(e) => setQuickType(e.target.value as CustomerType)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-cyan-500"
                  >
                    <option value="Regular">Regular</option>
                    <option value="VIP">VIP</option>
                    <option value="Mayorista">Mayorista</option>
                    <option value="Lead/Prospecto">Lead/Prospecto</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-md shadow-cyan-600/20 cursor-pointer"
                >
                  Guardar y Vincular a Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Petty Cash Outflow / Supplier Expense Modal */}
      {onRegisterPettyCashExpense && (
        <PettyCashExpenseModal
          isOpen={showPettyCashModal}
          onClose={() => setShowPettyCashModal(false)}
          suppliers={suppliers}
          currentShiftId={activeCashShift?.id}
          onRegisterExpense={onRegisterPettyCashExpense}
        />
      )}

      {/* Promotional Gifts & Cortesías Modal */}
      <PromotionalGiftsModal
        isOpen={showPromoGiftModal}
        onClose={() => setShowPromoGiftModal(false)}
        products={products}
        onAddPromotionalGifts={handleAddPromotionalGifts}
        currentAuthorizedBy={promotionalAuthorizedBy}
      />
    </div>
  );
};
