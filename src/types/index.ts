export type UserRole = 'CEO' | 'Gerente' | 'Supervisor' | 'Cajero' | 'Técnico';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  pin?: string; // 4-digit PIN for supervisor/CEO authorization
  status: 'active' | 'inactive';
  allowedModules?: string[]; // Dynamic permissions e.g. ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges', 'promotions', 'kpis', 'users']
  createdAt?: string;
}

export type ProductCategory = 
  | 'Accesorios' 
  | 'Repuestos' 
  | 'Dispositivos' 
  | 'Fundas' 
  | 'Cargadores' 
  | 'Recargas' 
  | 'Servicios'
  | 'Promocionales'
  | 'Regalía'
  | 'Otros';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: ProductCategory;
  brand: string;
  model: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  supplierId?: string;
  supplierName?: string;
  isPromotional?: boolean; // Articulo promocional / regalo de cortesía
  isPromotionalGift?: boolean; // Habilitado como Regalía / Cortesía en POS
  promoDescription?: string; // Descripción del promocional
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercentage: number;
  discountAmount: number;
  unitPrice: number;
  subtotal: number;
  isPromotionalGift?: boolean; // Cortesía autorizada por CEO ($0.00 al cliente, descuenta stock)
  promotionalAuthorizedBy?: string; // Nombre del CEO/Supervisor que autorizó el regalo
}

export type CustomerType = 'Regular' | 'VIP' | 'Mayorista' | 'Lead/Prospecto';
export type DocumentType = 'DUI' | 'NIT' | 'NRC' | 'Otro';

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  docType: DocumentType;
  docNumber: string; // DUI, NIT or NRC number
  razonSocial?: string; // Nombre fiscal/empresa
  address?: string;
  giro?: string; // Giro comercial
  type: CustomerType;
  notes?: string;
  totalPurchasesCount?: number;
  totalSpentAmount?: number;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Mixto';

export interface Sale {
  id: string;
  ticketNumber: string;
  date: string; // ISO string
  cashierUid: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerDocType?: DocumentType;
  customerDocNumber?: string;
  customerRazonSocial?: string;
  customerAddress?: string;
  customerGiro?: string;
  items: {
    productId: string;
    code: string;
    name: string;
    category: ProductCategory;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    discountAmount: number;
    subtotal: number;
    isPromotionalGift?: boolean;
    promotionalAuthorizedBy?: string;
  }[];
  subtotal: number;
  discountTotal: number;
  discountAuthorizedBy?: string; // Supervisor/CEO name or UID
  promotionalAuthorizedBy?: string; // CEO authorization for gift items
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid?: number;
  changeGiven?: number;
  status: 'Completada' | 'Anulada';
  createdAt: string;
}

export type RepairStatus = 
  | 'Recibido' 
  | 'En Diagnóstico' 
  | 'Esperando Repuesto' 
  | 'En Reparación' 
  | 'Listo para Entregar' 
  | 'Entregado' 
  | 'Cancelado';

export interface Repair {
  id: string;
  ticketNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerDocumentId: string; // Cédula / DUI / NIT
  customerDocType?: DocumentType;
  customerRazonSocial?: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  issueDescription: string;
  diagnosticNotes?: string;
  status: RepairStatus;
  estimatedCost: number;
  advancePayment?: number;
  technicianNotes?: string;
  technicianAssigned?: string;
  devicePhotoUrl?: string; // Base64 or URL photo of device condition
  documentPhotoUrl?: string; // Base64 or URL photo of customer ID document
  receivedDate: string;
  updatedAt: string;
}

export type RechargeOperator = 'Claro' | 'Tigo' | 'Movistar' | 'Digicel' | 'Otra';

export interface OperatorCommission {
  commissionPercent: number; // Porcentaje de ganancia/comisión (ej: 6.5 para 6.5%)
  active: boolean;
  notes?: string;
}

export interface RechargeCommissionSettings {
  claro: OperatorCommission;
  tigo: OperatorCommission;
  movistar: OperatorCommission;
  digicel: OperatorCommission;
  otra?: OperatorCommission;
  updatedAt?: string;
  updatedBy?: string;
}

export interface RechargeBalance {
  operator: RechargeOperator;
  availableBalanceCents: number; // Saldo disponible en centavos (ej: 10000 = $100.00)
  totalPurchasedCents: number;   // Total comprado histórico en centavos
  totalSoldCents: number;        // Total vendido histórico en centavos
  minAlertThresholdCents: number;// Umbral de alerta de saldo bajo (ej: 1000 = $10.00)
  updatedAt: string;
  updatedBy: string;
}

export type RechargeBalanceLogType = 'COMPRA_SALDO' | 'VENTA_RECARGA' | 'AJUSTE_SALDO';

export interface RechargeBalanceLog {
  id: string;
  operator: RechargeOperator;
  type: RechargeBalanceLogType;
  amountCents: number;           // Monto del movimiento en centavos
  previousBalanceCents: number;  // Saldo antes del movimiento
  newBalanceCents: number;       // Saldo después del movimiento
  userUid: string;
  userName: string;
  notes?: string;
  saleId?: string;               // ID de la venta si es VENTA_RECARGA
  createdAt: string;
}

export interface RechargeDenomination {
  id: string;
  amountCents: number;           // Valor en centavos (ej. 115 para $1.15, 250 para $2.50)
  label: string;                 // ej "$1.15" o "$2.50"
  active: boolean;               // Habilitada para venta rápida
  operator?: RechargeOperator | 'TODOS'; // Operador específico o TODOS
  order?: number;                // Orden de despliegue
  createdAt?: string;
  updatedAt?: string;
}

// Operational recharge document (safe for Cashier)
export interface Recharge {
  id: string;
  ticketNumber?: string;
  date: string;
  cashierUid: string;
  cashierName: string;
  operator: RechargeOperator;
  phoneNumber: string;
  amountCents?: number;          // Monto nominal en centavos
  costPrice?: number;            // Para compatibilidad y vistas del CEO
  salePrice: number;             // Precio venta al cliente ($)
  profit?: number;               // Margen neto para vistas CEO
  notes?: string;
  status: 'Completada' | 'Anulada';
  shiftId?: string;
  createdAt: string;
}

// Sensitive Financial Record (Restricted to CEO)
export interface RechargeFinancial {
  id: string;
  saleId: string;
  operator: RechargeOperator;
  amountCents: number;           // Monto nominal en centavos
  realCostCents: number;         // Costo real en centavos calculado con la comisión vigente
  commissionPercent: number;     // Comisión fijada al momento de la venta
  profitCents: number;           // Margen neto en centavos
  cashierUid?: string;
  createdAt: string;
}

export type PromotionType = 'percentage' | 'fixed' | 'combo';

export interface Promotion {
  id: string;
  name: string;
  description: string;
  type: PromotionType;
  discountValue: number; // e.g. 15 for 15% or $5 for $5 off
  startDate: string;
  endDate: string;
  applicableCategories?: ProductCategory[];
  applicableProductIds?: string[];
  minPurchaseAmount?: number;
  status: 'active' | 'inactive' | 'scheduled';
  createdAt: string;
}

export interface SystemSettings {
  maxSupervisorDiscountPercent: number; // Default 10%
  requireSupervisorPinForDiscount: boolean;
  storeName: string;
  storePhone: string;
  storeAddress: string;
  storeRuc: string;
}

export interface CashShift {
  id: string;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
  cashierUid: string;
  cashierName: string;
  initialAmount: number; // Monto inicial de apertura (e.g. $50.00)
  totalCashSales: number;
  totalCardSales: number;
  totalTransferSales: number;
  totalMixedSales: number;
  totalRechargesSales: number;
  totalRepairsSales: number;
  totalPettyCashOutflows?: number; // Salidas de caja chica registradas en el turno
  expectedCashTotal: number; // initialAmount + totalCashSales - totalPettyCashOutflows (if from drawer)
  actualCountedCash?: number; // Monto físico contado al cerrar
  difference?: number; // actualCountedCash - expectedCashTotal
  notes?: string;
  closedByUid?: string;
  closedByName?: string;
}

export type PettyCashExpenseCategory = 
  | 'Pago a Proveedor' 
  | 'Compra de Mercadería / Repuestos' 
  | 'Servicios Básicos / Local' 
  | 'Insumos de Limpieza / Oficina' 
  | 'Transporte / Flete' 
  | 'Alimentación' 
  | 'Mantenimiento' 
  | 'Otros Gastos Imprevistos';

export interface PettyCashExpense {
  id: string;
  voucherNumber: string; // e.g. "CC-2026-001"
  date: string; // ISO string
  cashierUid: string;
  cashierName: string;
  shiftId?: string;
  amount: number;
  category: PettyCashExpenseCategory;
  recipientOrSupplier: string; // Proveedor / Beneficiario
  concept: string; // Concepto detallado del gasto
  invoiceOrReceiptNumber: string; // N° de Factura / Comprobante / Recibo
  receiptPhotoUrl?: string; // Optional image / photo of receipt
  notes?: string;
  status: 'Registrado' | 'Anulado';
  voidReason?: string;
  createdAt: string;
}

export interface PettyCashInjection {
  id: string;
  date: string;
  amount: number;
  authorizedBy: string;
  concept: string;
  createdAt: string;
}

export interface PettyCashFund {
  initialAmount: number; // Fondo inicial base fijado por el CEO
  minAlertThreshold: number; // Límite mínimo de alerta (e.g. $50.00)
  injections: PettyCashInjection[];
  updatedAt: string;
}

