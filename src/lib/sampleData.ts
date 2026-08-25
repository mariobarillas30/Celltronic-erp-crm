import { Product, Supplier, Repair, Recharge, Promotion, AppUser, UserRole, Sale, CashShift, Customer, PettyCashFund, PettyCashExpense } from '../types';

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-01',
    fullName: 'María Fernanda López',
    phone: '+503 7654-3210',
    email: 'maria.lopez@gmail.com',
    docType: 'DUI',
    docNumber: '04859302-8',
    razonSocial: 'María Fernanda López',
    address: 'Col. Escalón, Pje. 4 #122, San Salvador',
    giro: 'Servicios Profesionales',
    type: 'VIP',
    notes: 'Cliente recurrente de reparaciones de iPhone y accesorios de alta gama.',
    totalPurchasesCount: 6,
    totalSpentAmount: 380.50,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString()
  },
  {
    id: 'cust-02',
    fullName: 'Distribuidora Tecnológica El Salvador S.A. de C.V.',
    phone: '+503 2288-9900',
    email: 'compras@distecsal.com',
    docType: 'NIT',
    docNumber: '0614-150820-102-3',
    razonSocial: 'Distribuidora Tecnológica El Salvador S.A. de C.V.',
    address: 'Zona Industrial Merliot, Av. El Espino #45, Antiguo Cuscatlán',
    giro: 'Venta al por mayor de equipos de telecomunicaciones',
    type: 'Mayorista',
    notes: 'Comprador al por mayor de cargadores y cristales templados.',
    totalPurchasesCount: 14,
    totalSpentAmount: 1450.00,
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString()
  },
  {
    id: 'cust-03',
    fullName: 'Josué Alexander Castillo',
    phone: '+503 7123-8899',
    email: 'jcastillo2026@outlook.com',
    docType: 'DUI',
    docNumber: '01928374-1',
    razonSocial: 'Josué Alexander Castillo',
    address: 'Urbanización Lourdes, Blq. C #18, Colón',
    giro: 'Comercio Minorista',
    type: 'Regular',
    notes: 'Reparación de Samsung Galaxy A54.',
    totalPurchasesCount: 2,
    totalSpentAmount: 52.50,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString()
  },
  {
    id: 'cust-04',
    fullName: 'Inversiones Globales Rivas & Cía',
    phone: '+503 7890-4411',
    email: 'contacto@inversionesrivas.sv',
    docType: 'NRC',
    docNumber: '198234-5',
    razonSocial: 'Inversiones Globales Rivas S.A.',
    address: 'Centro Comercial Galerías, Nivel 3, San Salvador',
    giro: 'Servicios de Consultoría',
    type: 'Lead/Prospecto',
    notes: 'Interesado en flotilla de 10 teléfonos Xiaomi Redmi Note 13.',
    totalPurchasesCount: 0,
    totalSpentAmount: 0.00,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

export const ALL_SYSTEM_MODULES = [
  { id: 'pos', name: 'Ventas (POS)' },
  { id: 'arqueo', name: 'Arqueo & Cierre de Caja' },
  { id: 'inventory', name: 'Inventario & Proveedores' },
  { id: 'repairs', name: 'Taller / Reparaciones' },
  { id: 'customers', name: 'Clientes / CRM' },
  { id: 'recharges', name: 'Recargas (Cuadre Dual)' },
  { id: 'promotions', name: 'Promociones & Descuentos' },
  { id: 'kpis', name: 'Dashboard KPIs' },
  { id: 'users', name: 'Gestión Usuarios & Permisos' },
  { id: 'petty_cash', name: 'Caja Chica & Fondo Reserva (CEO)' }
];

export const DEFAULT_ROLE_MODULES: Record<UserRole, string[]> = {
  'CEO': ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges', 'promotions', 'kpis', 'users', 'petty_cash'],
  'Gerente': ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges', 'promotions', 'kpis'],
  'Supervisor': ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges', 'promotions', 'kpis'],
  'Cajero': ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges'],
  'Técnico': ['repairs', 'inventory', 'customers']
};

export const INITIAL_USERS: AppUser[] = [
  {
    uid: 'user-provider-01',
    email: 'mariobarillas24@gmail.com',
    displayName: 'Mario Barillas (CEO / Super Admin)',
    role: 'CEO',
    pin: '9999',
    status: 'active',
    allowedModules: ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges', 'promotions', 'kpis', 'users', 'petty_cash'],
    createdAt: new Date().toISOString()
  },
  {
    uid: 'user-ceo-01',
    email: 'ceo@celltronic.com',
    displayName: 'Carlos Mendoza (CEO)',
    role: 'CEO',
    pin: '9999',
    status: 'active',
    allowedModules: ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges', 'promotions', 'kpis', 'users', 'petty_cash'],
    createdAt: new Date().toISOString()
  },
  {
    uid: 'user-gerente-01',
    email: 'gerente@celltronic.com',
    displayName: 'Roberto Sánchez (Gerente)',
    role: 'Gerente',
    pin: '5555',
    status: 'active',
    allowedModules: ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges', 'promotions', 'kpis'],
    createdAt: new Date().toISOString()
  },
  {
    uid: 'user-super-01',
    email: 'supervisor@celltronic.com',
    displayName: 'Valeria Gómez (Supervisor)',
    role: 'Supervisor',
    pin: '1234',
    status: 'active',
    allowedModules: ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges', 'promotions', 'kpis'],
    createdAt: new Date().toISOString()
  },
  {
    uid: 'user-cajero-01',
    email: 'cajero@celltronic.com',
    displayName: 'Luis Morales (Cajero)',
    role: 'Cajero',
    pin: '0000',
    status: 'active',
    allowedModules: ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges'],
    createdAt: new Date().toISOString()
  },
  {
    uid: 'user-tecnico-01',
    email: 'tecnico@celltronic.com',
    displayName: 'Pedro Ramírez (Técnico)',
    role: 'Técnico',
    pin: '7777',
    status: 'active',
    allowedModules: ['repairs', 'inventory', 'customers'],
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-01',
    name: 'Global Tech Distribution',
    contactPerson: 'Roberto Fernández',
    phone: '+503 7890-1234',
    email: 'ventas@globaltech.com',
    address: 'Av. Las Magnolias #450, San Salvador',
    notes: 'Proveedor principal de repuestos pantalla iPhone y Samsung',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup-02',
    name: 'Importadora Celular S.A.',
    contactPerson: 'Ana Lucia Rivas',
    phone: '+503 2244-5566',
    email: 'contacto@importadoracelular.com',
    address: 'Zona Industrial Merliot, Bodega B-12',
    notes: 'Distribuidor de cargadores rápidos, fundas de uso rudo y accesorios',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup-03',
    name: 'ServiParts Express',
    contactPerson: 'Jorge Molina',
    phone: '+503 7112-9988',
    email: 'pedidos@servipartsexpress.com',
    address: 'Centro Comercial Galerías, Local 201',
    notes: 'Baterías originales y conectores de carga',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-promo-01',
    code: 'PROM-001',
    name: 'Chip / SIM Claro 4G LTE Prepago (Promocional)',
    category: 'Promocionales',
    brand: 'Claro',
    model: 'SIM 4G',
    costPrice: 0.50,
    salePrice: 0.00,
    stock: 50,
    minStock: 10,
    supplierId: 'sup-02',
    supplierName: 'Importadora Celular S.A.',
    isPromotional: true,
    promoDescription: 'Chip Claro de regalo por compra de teléfono o recarga',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-promo-02',
    code: 'PROM-002',
    name: 'Chip / SIM Tigo 4G LTE Prepago (Promocional)',
    category: 'Promocionales',
    brand: 'Tigo',
    model: 'SIM 4G',
    costPrice: 0.50,
    salePrice: 0.00,
    stock: 45,
    minStock: 10,
    supplierId: 'sup-02',
    supplierName: 'Importadora Celular S.A.',
    isPromotional: true,
    promoDescription: 'Chip Tigo de regalo por compra de smartphone',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-promo-03',
    code: 'PROM-003',
    name: 'Funda Cover Silicona Flexible (Cortesía)',
    category: 'Promocionales',
    brand: 'CasePro',
    model: 'Universal',
    costPrice: 1.20,
    salePrice: 0.00,
    stock: 35,
    minStock: 8,
    supplierId: 'sup-02',
    supplierName: 'Importadora Celular S.A.',
    isPromotional: true,
    promoDescription: 'Funda protectora de regalo en compra de equipo',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-promo-04',
    code: 'PROM-004',
    name: 'Cristal Templado 9H HD Glass (Cortesía)',
    category: 'Promocionales',
    brand: 'GlassArmor',
    model: 'Universal',
    costPrice: 0.80,
    salePrice: 0.00,
    stock: 40,
    minStock: 10,
    supplierId: 'sup-02',
    supplierName: 'Importadora Celular S.A.',
    isPromotional: true,
    promoDescription: 'Protector de pantalla 9H de regalo en venta de teléfono',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-promo-05',
    code: 'PROM-005',
    name: 'Sujetador PopSocket / Ring Holder (Cortesía)',
    category: 'Promocionales',
    brand: 'CellGrip',
    model: 'Universal',
    costPrice: 0.35,
    salePrice: 0.00,
    stock: 60,
    minStock: 15,
    supplierId: 'sup-02',
    supplierName: 'Importadora Celular S.A.',
    isPromotional: true,
    promoDescription: 'Sujetador adhesivo de regalo para teléfono',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-01',
    code: '7501001',
    name: 'Funda Silicona Antigolpes iPhone 14 / 15',
    category: 'Fundas',
    brand: 'CasePro',
    model: 'iPhone 14/15',
    costPrice: 2.50,
    salePrice: 12.00,
    stock: 28,
    minStock: 5,
    supplierId: 'sup-02',
    supplierName: 'Importadora Celular S.A.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-02',
    code: '7501002',
    name: 'Cristal Templado 9H Mate Anti-Espía',
    category: 'Accesorios',
    brand: 'GlassArmor',
    model: 'Universal 6.5"',
    costPrice: 1.20,
    salePrice: 8.00,
    stock: 45,
    minStock: 10,
    supplierId: 'sup-02',
    supplierName: 'Importadora Celular S.A.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-03',
    code: '7501003',
    name: 'Cargador Carga Rápida 20W USB-C con Cable Lightning',
    category: 'Cargadores',
    brand: 'AnkerTech',
    model: 'PowerPort III',
    costPrice: 6.80,
    salePrice: 22.50,
    stock: 14,
    minStock: 4,
    supplierId: 'sup-02',
    supplierName: 'Importadora Celular S.A.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-04',
    code: '7501004',
    name: 'Pantalla OLED Display + Touch iPhone 13 Original',
    category: 'Repuestos',
    brand: 'Apple Refurbished',
    model: 'iPhone 13',
    costPrice: 65.00,
    salePrice: 125.00,
    stock: 6,
    minStock: 2,
    supplierId: 'sup-01',
    supplierName: 'Global Tech Distribution',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-05',
    code: '7501005',
    name: 'Modulo Pantalla AMOLED Samsung Galaxy A54 5G',
    category: 'Repuestos',
    brand: 'Samsung OEM',
    model: 'Galaxy A54',
    costPrice: 42.00,
    salePrice: 85.00,
    stock: 3,
    minStock: 3,
    supplierId: 'sup-01',
    supplierName: 'Global Tech Distribution',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-06',
    code: '7501006',
    name: 'Batería de Alto Rendimiento iPhone 11 (3110 mAh)',
    category: 'Repuestos',
    brand: 'PowerCell',
    model: 'iPhone 11',
    costPrice: 11.50,
    salePrice: 35.00,
    stock: 9,
    minStock: 3,
    supplierId: 'sup-03',
    supplierName: 'ServiParts Express',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-07',
    code: '7501007',
    name: 'Xiaomi Redmi Note 13 Pro 256GB 8GB RAM',
    category: 'Dispositivos',
    brand: 'Xiaomi',
    model: 'Redmi Note 13 Pro',
    costPrice: 195.00,
    salePrice: 265.00,
    stock: 4,
    minStock: 2,
    supplierId: 'sup-01',
    supplierName: 'Global Tech Distribution',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-08',
    code: '7501008',
    name: 'Servicio Técnico Cambio de Pin de Carga Tipo-C',
    category: 'Servicios',
    brand: 'Genérico',
    model: 'Universal Android',
    costPrice: 4.00,
    salePrice: 20.00,
    stock: 999,
    minStock: 1,
    supplierId: 'sup-03',
    supplierName: 'ServiParts Express',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-09',
    code: '7501009',
    name: 'Audífonos Inalámbricos Bluetooth TWS i12 Pro',
    category: 'Accesorios',
    brand: 'TWS Sound',
    model: 'i12 Pro',
    costPrice: 4.50,
    salePrice: 16.00,
    stock: 2, // Low stock demo!
    minStock: 5,
    supplierId: 'sup-02',
    supplierName: 'Importadora Celular S.A.',
    updatedAt: new Date().toISOString()
  }
];

// Placeholder sample photos encoded as clear SVGs to allow instant display without external HTTP broken links
const PLACEHOLDER_DEVICE_PHOTO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><rect x="120" y="40" width="160" height="220" rx="16" fill="%230f172a" stroke="%2338bdf8" stroke-width="4"/><circle cx="200" cy="60" r="4" fill="%2394a3b8"/><rect x="135" y="80" width="130" height="150" fill="%23334155"/><path d="M150 180 L180 140 L210 170 L230 150 L250 180 Z" fill="%230284c7"/><text x="200" y="210" fill="%23f8fafc" font-size="12" font-family="sans-serif" text-anchor="middle">Estado del Equipo: Pantalla fisurada</text></svg>';

const PLACEHOLDER_DOC_PHOTO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><rect width="400" height="260" fill="%230f172a" rx="12" stroke="%2364748b" stroke-width="2"/><rect x="20" y="20" width="360" height="220" fill="%231e293b" rx="8"/><circle cx="80" cy="100" r="30" fill="%23475569"/><rect x="130" y="70" width="220" height="12" rx="4" fill="%23e2e8f0"/><rect x="130" y="95" width="180" height="10" rx="4" fill="%2394a3b8"/><rect x="130" y="115" width="150" height="10" rx="4" fill="%2394a3b8"/><text x="200" y="210" fill="%2338bdf8" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle">DOCUMENTO DE IDENTIDAD (DUI/CÉDULA)</text></svg>';

export const INITIAL_REPAIRS: Repair[] = [
  {
    id: 'rep-01',
    ticketNumber: 'REP-2026-001',
    customerName: 'María Fernanda López',
    customerPhone: '+503 7654-3210',
    customerDocumentId: '04859302-8',
    deviceBrand: 'Apple',
    deviceModel: 'iPhone 13',
    serialNumber: 'F2LXK982N0Q',
    issueDescription: 'El teléfono sufrió una caída. La pantalla se ve negra con rayas verdes pero vibra al cargar.',
    diagnosticNotes: 'Display destruido internamente. Placa madre e IC de touch intactos. Se requiere reemplazo de módulo OLED.',
    status: 'En Reparación',
    estimatedCost: 125.00,
    advancePayment: 50.00,
    technicianNotes: 'Pieza recibida de almacén. En proceso de ensamble y sellado contra polvo.',
    technicianAssigned: 'Técnico Pedro Ramírez',
    devicePhotoUrl: PLACEHOLDER_DEVICE_PHOTO,
    documentPhotoUrl: PLACEHOLDER_DOC_PHOTO,
    receivedDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rep-02',
    ticketNumber: 'REP-2026-002',
    customerName: 'Josué Alexander Castillo',
    customerPhone: '+503 7123-8899',
    customerDocumentId: '01928374-1',
    deviceBrand: 'Samsung',
    deviceModel: 'Galaxy A54 5G',
    serialNumber: 'R58T304921M',
    issueDescription: 'No detecta el cargador. A veces sale aviso de humedad en el puerto USB.',
    diagnosticNotes: 'Pines sulfatados por sulfatación ligera. Módulo flex de carga requiere cambio.',
    status: 'Esperando Repuesto',
    estimatedCost: 35.00,
    advancePayment: 15.00,
    technicianNotes: 'Repuesto solicitado a ServiParts Express, arribo estimado hoy tarde.',
    technicianAssigned: 'Técnico Pedro Ramírez',
    devicePhotoUrl: PLACEHOLDER_DEVICE_PHOTO,
    documentPhotoUrl: PLACEHOLDER_DOC_PHOTO,
    receivedDate: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rep-03',
    ticketNumber: 'REP-2026-003',
    customerName: 'Elena Beatriz Vasquez',
    customerPhone: '+503 7990-1122',
    customerDocumentId: '05671234-9',
    deviceBrand: 'Xiaomi',
    deviceModel: 'Redmi Note 11',
    serialNumber: '28912/4819203',
    issueDescription: 'Batería hinchada, levanta la tapa trasera y se apaga al 30%.',
    diagnosticNotes: 'Batería degradada al 62% con deformación física. Riesgo de perforación.',
    status: 'Listo para Entregar',
    estimatedCost: 40.00,
    advancePayment: 40.00,
    technicianNotes: 'Batería cambiada con éxito. Pruebas de carga sostenida durante 3 horas aprobadas.',
    technicianAssigned: 'Técnico Carlos Mendoza',
    devicePhotoUrl: PLACEHOLDER_DEVICE_PHOTO,
    documentPhotoUrl: PLACEHOLDER_DOC_PHOTO,
    receivedDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const INITIAL_RECHARGES: Recharge[] = [
  {
    id: 'rech-01',
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
    cashierUid: 'user-cajero-01',
    cashierName: 'Luis Morales (Cajero)',
    operator: 'Claro',
    phoneNumber: '7845-9012',
    costPrice: 4.60, // Real private cost
    salePrice: 5.00, // Final customer price
    profit: 0.40,
    notes: 'Recarga saldo paquete Todo Incluido 5D',
    status: 'Completada',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'rech-02',
    date: new Date(Date.now() - 3600000 * 4).toISOString(),
    cashierUid: 'user-cajero-01',
    cashierName: 'Luis Morales (Cajero)',
    operator: 'Tigo',
    phoneNumber: '7190-3344',
    costPrice: 9.15, // Real private cost
    salePrice: 10.00, // Final customer price
    profit: 0.85,
    notes: 'Paquetigo ilimitado',
    status: 'Completada',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'rech-03',
    date: new Date(Date.now() - 3600000 * 7).toISOString(),
    cashierUid: 'user-cajero-01',
    cashierName: 'Luis Morales (Cajero)',
    operator: 'Movistar',
    phoneNumber: '7301-8822',
    costPrice: 2.80, // Real private cost
    salePrice: 3.00, // Final customer price
    profit: 0.20,
    notes: 'Recarga directa $3.00',
    status: 'Completada',
    createdAt: new Date(Date.now() - 3600000 * 7).toISOString()
  }
];

export const INITIAL_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-01',
    name: 'Protección Total - 15% Descuento',
    description: '15% de descuento en la categoría de Fundas al llevar 2 o más unidades',
    type: 'percentage',
    discountValue: 15,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    applicableCategories: ['Fundas', 'Accesorios'],
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'promo-02',
    name: 'Combo Carga Rápida $5.00 OFF',
    description: 'Descuento fijo de $5.00 en la compra de cargadores rápidos superiores a $20.00',
    type: 'fixed',
    discountValue: 5.00,
    startDate: '2026-08-10',
    endDate: '2026-08-25',
    applicableCategories: ['Cargadores'],
    minPurchaseAmount: 20.00,
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-01',
    ticketNumber: 'FAC-001045',
    date: new Date(Date.now() - 86400000).toISOString(),
    cashierUid: 'user-cajero-01',
    cashierName: 'Luis Morales (Cajero)',
    customerName: 'Cliente Contado',
    items: [
      {
        productId: 'prod-01',
        code: '7501001',
        name: 'Funda Silicona Antigolpes iPhone 14 / 15',
        category: 'Fundas',
        quantity: 1,
        unitCost: 2.50,
        unitPrice: 12.00,
        discountAmount: 1.80,
        subtotal: 10.20
      },
      {
        productId: 'prod-02',
        code: '7501002',
        name: 'Cristal Templado 9H Mate Anti-Espía',
        category: 'Accesorios',
        quantity: 1,
        unitCost: 1.20,
        unitPrice: 8.00,
        discountAmount: 0.00,
        subtotal: 8.00
      }
    ],
    subtotal: 20.00,
    discountTotal: 1.80,
    total: 18.20,
    paymentMethod: 'Efectivo',
    amountPaid: 20.00,
    changeGiven: 1.80,
    status: 'Completada',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'sale-02',
    ticketNumber: 'FAC-001046',
    date: new Date(Date.now() - 3600000 * 5).toISOString(),
    cashierUid: 'user-cajero-01',
    cashierName: 'Luis Morales (Cajero)',
    customerName: 'Kevin Guardado',
    customerPhone: '+503 7234-5678',
    items: [
      {
        productId: 'prod-03',
        code: '7501003',
        name: 'Cargador Carga Rápida 20W USB-C con Cable Lightning',
        category: 'Cargadores',
        quantity: 1,
        unitCost: 6.80,
        unitPrice: 22.50,
        discountAmount: 5.00,
        subtotal: 17.50
      }
    ],
    subtotal: 22.50,
    discountTotal: 5.00,
    total: 17.50,
    paymentMethod: 'Tarjeta',
    amountPaid: 17.50,
    changeGiven: 0.00,
    status: 'Completada',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  }
];

export const INITIAL_CASH_SHIFTS: CashShift[] = [
  {
    id: 'shift-001',
    status: 'open',
    openedAt: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
    cashierUid: 'user-cajero-01',
    cashierName: 'Luis Morales (Cajero)',
    initialAmount: 50.00,
    totalCashSales: 18.20,
    totalCardSales: 17.50,
    totalTransferSales: 0.00,
    totalMixedSales: 0.00,
    totalRechargesSales: 10.00,
    totalRepairsSales: 0.00,
    totalPettyCashOutflows: 15.00,
    expectedCashTotal: 53.20
  }
];

export const INITIAL_PETTY_CASH_FUND: PettyCashFund = {
  initialAmount: 350.00, // Fondo base fijado por el CEO
  minAlertThreshold: 60.00, // Límite mínimo para advertencia visual
  injections: [
    {
      id: 'inj-01',
      date: new Date(Date.now() - 86400000 * 5).toISOString(),
      amount: 100.00,
      authorizedBy: 'Mario Barillas (CEO)',
      concept: 'Inyección para compras de repuestos urgentes',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
    }
  ],
  updatedAt: new Date().toISOString()
};

export const INITIAL_PETTY_CASH_EXPENSES: PettyCashExpense[] = [
  {
    id: 'exp-01',
    voucherNumber: 'CC-2026-001',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    cashierUid: 'user-cajero-01',
    cashierName: 'Luis Morales (Cajero)',
    shiftId: 'shift-prev-01',
    amount: 35.00,
    category: 'Pago a Proveedor',
    recipientOrSupplier: 'Distribuidora Global Tech',
    concept: 'Pago contra entrega de 10 micas de vidrio templado iPhone 15',
    invoiceOrReceiptNumber: 'FAC-88492',
    notes: 'Entregado por repartidor motorizado con factura sellada.',
    status: 'Registrado',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'exp-02',
    voucherNumber: 'CC-2026-002',
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
    cashierUid: 'user-cajero-01',
    cashierName: 'Luis Morales (Cajero)',
    shiftId: 'shift-prev-02',
    amount: 18.50,
    category: 'Insumos de Limpieza / Oficina',
    recipientOrSupplier: 'Supermercado La Despensa',
    concept: 'Rollos de papel térmico para impresoras POS y alcohol isopropílico para taller',
    invoiceOrReceiptNumber: 'TK-49102',
    notes: 'Compra para mantenimiento de estación de caja y taller.',
    status: 'Registrado',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'exp-03',
    voucherNumber: 'CC-2026-003',
    date: new Date().toISOString(),
    cashierUid: 'user-cajero-01',
    cashierName: 'Luis Morales (Cajero)',
    shiftId: 'shift-001',
    amount: 15.00,
    category: 'Transporte / Flete',
    recipientOrSupplier: 'Mensajería Express El Salvador',
    concept: 'Flete urgente para traer pantalla OLED Samsung S23 desde bodega central',
    invoiceOrReceiptNumber: 'ENV-3910',
    notes: 'Requerido para reparación express cliente VIP.',
    status: 'Registrado',
    createdAt: new Date().toISOString()
  }
];

