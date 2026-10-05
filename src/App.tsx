import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SystemPauseOverlay } from './components/security/SystemPauseOverlay';
import { LoginScreen } from './components/auth/LoginScreen';
import { RoleSelectionScreen } from './components/auth/RoleSelectionScreen';
import { CelltronicLogo } from './components/common/CelltronicLogo';

import { POSModule } from './components/pos/POSModule';
import { CashClosureModule } from './components/pos/CashClosureModule';
import { SalesHistoryModule } from './components/sales/SalesHistoryModule';
import { InventoryModule } from './components/inventory/InventoryModule';
import { RepairsModule } from './components/repairs/RepairsModule';
import { RechargesModule } from './components/recharges/RechargesModule';
import { PromotionsModule } from './components/promotions/PromotionsModule';
import { KPIsDashboard } from './components/kpis/KPIsDashboard';
import { UsersModule } from './components/users/UsersModule';
import { CustomersModule } from './components/customers/CustomersModule';
import { AIAssistantModal } from './components/ai/AIAssistantModal';
import { PettyCashCEOModule } from './components/petty_cash/PettyCashCEOModule';
import { BackupsModule } from './components/backups/BackupsModule';
import { checkAndRunScheduledBackup, performFirestoreBackup } from './lib/backupService';

import { 
  Product, 
  Supplier, 
  Sale, 
  Repair, 
  Recharge, 
  Promotion, 
  CashShift, 
  Customer, 
  PettyCashFund, 
  PettyCashExpense, 
  PettyCashInjection 
} from './types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_SUPPLIERS, 
  INITIAL_SALES, 
  INITIAL_REPAIRS, 
  INITIAL_RECHARGES, 
  INITIAL_PROMOTIONS, 
  INITIAL_CASH_SHIFTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_PETTY_CASH_FUND, 
  INITIAL_PETTY_CASH_EXPENSES,
  INITIAL_USERS,
  DEFAULT_ROLE_MODULES
} from './lib/sampleData';
import { deleteProductFromFirestore, deleteSupplierFromFirestore } from './lib/firestoreUtils';
import { db } from './lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { sanitizeForFirestore } from './lib/firebaseServices';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

// Application Version Control & Auto-Migration (v2.7)
export const APP_VERSION = 'v2.7';
export const APP_VERSION_STORAGE_KEY = 'celltronic_version';

export function runVersionMigrationCheck(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const savedVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);
    if (savedVersion !== APP_VERSION) {
      console.log(`[VersionCheck] Cache version mismatch (${savedVersion || 'none'} -> ${APP_VERSION}). Updating version stamp.`);
      localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_VERSION);
      return true;
    }
  } catch (err) {
    console.error('[VersionCheck] Error verifying version in localStorage:', err);
  }
  return false;
}

// Execute immediately on initial module evaluation before React states initialize
runVersionMigrationCheck();

function MainAppContent() {
  const { 
    currentUser, 
    gatekeeperUser,
    isGatekeeperAuthenticated,
    role, 
    isCEO, 
    isLoadingAuth, 
    isSystemPaused 
  } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [aiAssistantContext, setAiAssistantContext] = useState<{
    deviceBrand?: string;
    deviceModel?: string;
    issueDescription?: string;
  } | undefined>(undefined);

  // Persistent State Engine (Synchronized in real-time from Firestore)
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [recharges, setRecharges] = useState<Recharge[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [cashShifts, setCashShifts] = useState<CashShift[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pettyCashFund, setPettyCashFund] = useState<PettyCashFund>(INITIAL_PETTY_CASH_FUND);
  const [pettyCashExpenses, setPettyCashExpenses] = useState<PettyCashExpense[]>([]);

  // Sales History contextual filter (e.g. from cash closure)
  const [salesHistoryFilter, setSalesHistoryFilter] = useState<{
    cashierName?: string;
    startDate?: string;
    endDate?: string;
    shiftId?: string;
  } | null>(null);

  // Automated Daily Backup Check (Periodical 24h & Shift Closure Consistency)
  useEffect(() => {
    checkAndRunScheduledBackup({ intervalHours: 24, triggeredBy: 'Automático (Programado)' }).catch(e => {
      console.warn('Auto backup check note:', e);
    });
  }, []);

  // Real-time Firestore Sync Engine (onSnapshot for all business entities)
  useEffect(() => {
    // 1. Products Listener
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const remoteProducts: Product[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Product) }));
      setProducts(remoteProducts);
    }, (err) => console.error('Firestore Products onSnapshot error:', err));

    // 2. Sales Listener
    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const remoteSales: Sale[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Sale) }));
      remoteSales.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
      setSales(remoteSales);
    }, (err) => console.error('Firestore Sales onSnapshot error:', err));

    // 3. Repairs / Technical Service Listener
    const unsubRepairs = onSnapshot(collection(db, 'repairs'), (snapshot) => {
      const remoteRepairs: Repair[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Repair) }));
      remoteRepairs.sort((a, b) => new Date(b.receivedDate || 0).getTime() - new Date(a.receivedDate || 0).getTime());
      setRepairs(remoteRepairs);
    }, (err) => console.error('Firestore Repairs onSnapshot error:', err));

    // 4. Cash Shifts Listener
    const unsubShifts = onSnapshot(collection(db, 'shifts'), (snapshot) => {
      const remoteShifts: CashShift[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as CashShift) }));
      remoteShifts.sort((a, b) => new Date(b.openedAt || 0).getTime() - new Date(a.openedAt || 0).getTime());
      setCashShifts(remoteShifts);
    }, (err) => console.error('Firestore Shifts onSnapshot error:', err));

    // 5. Recharges Listener
    const unsubRecharges = onSnapshot(collection(db, 'recharges'), (snapshot) => {
      const remoteRecharges: Recharge[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Recharge) }));
      remoteRecharges.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setRecharges(remoteRecharges);
    }, (err) => console.error('Firestore Recharges onSnapshot error:', err));

    // 6. Customers Listener
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const remoteCustomers: Customer[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Customer) }));
      setCustomers(remoteCustomers);
    }, (err) => console.error('Firestore Customers onSnapshot error:', err));

    // 7. Promotions Listener
    const unsubPromotions = onSnapshot(collection(db, 'promotions'), (snapshot) => {
      const remotePromotions: Promotion[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Promotion) }));
      setPromotions(remotePromotions);
    }, (err) => console.error('Firestore Promotions onSnapshot error:', err));

    // 8. Suppliers Listener
    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      const remoteSuppliers: Supplier[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Supplier) }));
      setSuppliers(remoteSuppliers);
    }, (err) => console.error('Firestore Suppliers onSnapshot error:', err));

    // 9. Petty Cash Fund Listener
    const unsubPettyFund = onSnapshot(doc(db, 'settings', 'petty_cash_fund'), (docSnap) => {
      if (docSnap.exists()) {
        setPettyCashFund(docSnap.data() as PettyCashFund);
      }
    }, (err) => console.error('Firestore Petty Cash Fund onSnapshot error:', err));

    // 10. Petty Cash Expenses Listener
    const unsubPettyExpenses = onSnapshot(collection(db, 'petty_cash_expenses'), (snapshot) => {
      const remoteExpenses: PettyCashExpense[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as PettyCashExpense) }));
      remoteExpenses.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setPettyCashExpenses(remoteExpenses);
    }, (err) => console.error('Firestore Petty Cash Expenses onSnapshot error:', err));

    return () => {
      unsubProducts();
      unsubSales();
      unsubRepairs();
      unsubShifts();
      unsubRecharges();
      unsubCustomers();
      unsubPromotions();
      unsubSuppliers();
      unsubPettyFund();
      unsubPettyExpenses();
    };
  }, []);

  // Route & RBAC Permission Guard
  useEffect(() => {
    if (!currentUser) return;
    const allowed = currentUser.allowedModules || DEFAULT_ROLE_MODULES[role] || ['pos'];
    const isAllowed = allowed.includes(activeTab) || (activeTab === 'sales_history' && (allowed.includes('pos') || allowed.includes('arqueo')));

    // If current tab is not allowed for active role, redirect to first allowed tab
    if (!isAllowed) {
      const defaultTarget = allowed.includes('repairs') && role === 'Técnico' ? 'repairs' : allowed[0] || 'pos';
      setActiveTab(defaultTarget);
    }
  }, [currentUser, role, activeTab]);

  // If Auth is loading and no Gatekeeper session cached, show modern loading screen
  if (isLoadingAuth && !isGatekeeperAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans p-4">
        <div className="mb-6 animate-pulse">
          <CelltronicLogo size="lg" variant="emblem" />
        </div>
        <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold tracking-tight text-white font-sans">Iniciando CELLTRONIC ERP...</p>
        <p className="text-xs text-cyan-400/80 mt-1 font-medium">Servicio Técnico Profesional • Verificando Capa 1 Gatekeeper</p>
      </div>
    );
  }

  // Capa 1: If Gatekeeper is not authenticated (no Google/Firebase Auth session), render Gatekeeper Login Screen
  if (!isGatekeeperAuthenticated) {
    return <LoginScreen />;
  }

  // Capa 2: If Gatekeeper is authenticated but no operational role has been activated with PIN, render Role Selection Screen
  if (!currentUser) {
    return <RoleSelectionScreen />;
  }

  // Check if current active tab is strictly allowed
  const allowedList = currentUser.allowedModules || DEFAULT_ROLE_MODULES[role] || ['pos'];
  const isTabAllowed = allowedList.includes(activeTab) || (activeTab === 'sales_history' && (allowedList.includes('pos') || allowedList.includes('arqueo')));

  // Cash Shift Handlers
  const handleOpenShift = async (initialAmount: number) => {
    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      status: 'open',
      openedAt: new Date().toISOString(),
      cashierUid: currentUser?.uid || 'user-01',
      cashierName: currentUser?.displayName || 'Cajero de Turno',
      initialAmount,
      totalCashSales: 0,
      totalCardSales: 0,
      totalTransferSales: 0,
      totalMixedSales: 0,
      totalRechargesSales: 0,
      totalRepairsSales: 0,
      totalPettyCashOutflows: 0,
      expectedCashTotal: initialAmount
    };
    try {
      await setDoc(doc(db, 'shifts', newShift.id), newShift);
    } catch (e: any) {
      console.error('Error opening shift in Firestore:', e);
      alert(`❌ Error al abrir turno en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  const handleCloseShift = async (
    shiftId: string, 
    actualCountedCash: number, 
    notes: string
  ) => {
    const targetShift = cashShifts.find(s => s.id === shiftId);
    if (!targetShift) return;
    const cashDiff = actualCountedCash - targetShift.expectedCashTotal;
    const updated: Partial<CashShift> = {
      status: 'closed',
      closedAt: new Date().toISOString(),
      actualCountedCash,
      difference: cashDiff,
      notes,
      closedByUid: currentUser?.uid || '',
      closedByName: currentUser?.displayName || ''
    };
    try {
      await setDoc(doc(db, 'shifts', shiftId), updated, { merge: true });
      // Trigger automatic consistent backup on shift closure in background
      performFirestoreBackup({ triggeredBy: `Cierre de Turno (${targetShift.cashierName})` }).catch(bErr => {
        console.warn('Shift closure auto-backup note:', bErr);
      });
    } catch (e: any) {
      console.error('Error closing shift in Firestore:', e);
      alert(`❌ Error al cerrar turno en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  // Product Handlers
  const handleAddProduct = async (newProd: Omit<Product, 'id' | 'updatedAt'>) => {
    const created: Product = {
      ...newProd,
      id: `prod-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    try {
      const cleanData = sanitizeForFirestore(created);
      await setDoc(doc(db, 'products', created.id), cleanData);
    } catch (e: any) {
      console.error('Error creating product in Firestore:', e);
      alert(`❌ Error al crear producto en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  const handleUpdateProduct = async (id: string, updated: Partial<Product>) => {
    try {
      const up = sanitizeForFirestore({ ...updated, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'products', id), up, { merge: true });
    } catch (e: any) {
      console.error('Error updating product in Firestore:', e);
      alert(`❌ Error al actualizar producto en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e: any) {
      console.error('Error deleting product from Firestore:', e);
      alert(`❌ Error al eliminar producto en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  // Supplier Handlers
  const handleAddSupplier = async (newSup: Omit<Supplier, 'id' | 'createdAt'>) => {
    const created: Supplier = {
      ...newSup,
      id: `sup-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    try {
      const cleanData = sanitizeForFirestore(created);
      await setDoc(doc(db, 'suppliers', created.id), cleanData);
    } catch (e: any) {
      console.error('Error creating supplier in Firestore:', e);
      alert(`❌ Error al crear proveedor en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'suppliers', id));
    } catch (e: any) {
      console.error('Error deleting supplier from Firestore:', e);
      alert(`❌ Error al eliminar proveedor en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  // Sale Handlers: Note that POSModule's processAtomicSaleInFirestore executes runTransaction for sale creation and atomic stock updates.
  // App.tsx handleCompleteSale only manages secondary customer metric increments and shift cash totals in Firestore.
  const handleCompleteSale = (newSale: Sale) => {
    // Update CRM Customer metrics in Firestore if customer attached
    if (newSale.customerId) {
      const targetCustomer = customers.find(c => c.id === newSale.customerId);
      const currentPurchases = targetCustomer?.totalPurchasesCount || 0;
      const currentSpent = targetCustomer?.totalSpentAmount || 0;
      setDoc(doc(db, 'customers', newSale.customerId), {
        totalPurchasesCount: currentPurchases + 1,
        totalSpentAmount: currentSpent + newSale.total,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(e => console.error('Firestore customer update error:', e));
    }

    // Update active cash shift in Firestore
    const openShift = cashShifts.find(s => s.status === 'open');
    if (openShift) {
      let cashAdd = 0;
      let cardAdd = 0;
      let transAdd = 0;

      if (newSale.paymentMethod === 'Efectivo') cashAdd = newSale.total;
      else if (newSale.paymentMethod === 'Tarjeta') cardAdd = newSale.total;
      else if (newSale.paymentMethod === 'Transferencia') transAdd = newSale.total;
      else if (newSale.paymentMethod === 'Mixto') {
        cashAdd = newSale.amountPaid || newSale.total;
      }

      const upShift = {
        totalCashSales: (openShift.totalCashSales || 0) + cashAdd,
        totalCardSales: (openShift.totalCardSales || 0) + cardAdd,
        totalTransferSales: (openShift.totalTransferSales || 0) + transAdd,
        expectedCashTotal: (openShift.expectedCashTotal || 0) + cashAdd
      };
      setDoc(doc(db, 'shifts', openShift.id), upShift, { merge: true }).catch(e => console.error('Firestore shift update error:', e));
    }
  };

  // Repair Handlers
  const handleAddRepair = async (newRep: Omit<Repair, 'id' | 'ticketNumber' | 'receivedDate' | 'updatedAt'>) => {
    const ticketNumber = (newRep as any).ticketNumber || `REP-${Math.floor(1000 + Math.random() * 9000)}`;
    const created: Repair = {
      ...newRep,
      id: `rep-${Date.now()}`,
      ticketNumber,
      receivedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      const cleanData = sanitizeForFirestore(created);
      await setDoc(doc(db, 'repairs', created.id), cleanData);
    } catch (e: any) {
      console.error('Error creating repair in Firestore:', e);
      alert(`❌ Error al registrar reparación en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  const handleUpdateRepairStatus = async (id: string, newStatus: Repair['status'], diagnosticNotes?: string) => {
    try {
      const up: Partial<Repair> = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      if (diagnosticNotes !== undefined && diagnosticNotes.trim() !== '') {
        up.diagnosticNotes = diagnosticNotes.trim();
      }
      const cleanUp = sanitizeForFirestore(up);
      await setDoc(doc(db, 'repairs', id), cleanUp, { merge: true });
    } catch (e: any) {
      console.error('Error updating repair in Firestore:', e);
      alert(`❌ Error al actualizar reparación en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  // Recharge Handlers
  const handleAddRecharge = async (newRec: Omit<Recharge, 'id' | 'createdAt' | 'profit'>) => {
    const profit = newRec.salePrice - newRec.costPrice;
    const created: Recharge = {
      ...newRec,
      profit,
      id: `rec-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    try {
      const cleanRec = sanitizeForFirestore(created);
      await setDoc(doc(db, 'recharges', created.id), cleanRec);

      // Update active cash shift
      const openShift = cashShifts.find(s => s.status === 'open');
      if (openShift) {
        const upShift = sanitizeForFirestore({
          totalRechargesSales: (openShift.totalRechargesSales || 0) + newRec.salePrice,
          totalCashSales: (openShift.totalCashSales || 0) + newRec.salePrice,
          expectedCashTotal: (openShift.expectedCashTotal || 0) + newRec.salePrice
        });
        await setDoc(doc(db, 'shifts', openShift.id), upShift, { merge: true });
      }
    } catch (e: any) {
      console.error('Error adding recharge in Firestore:', e);
      alert(`❌ Error al registrar recarga en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  // Promotion Handlers
  const handleAddPromotion = async (newPromo: Omit<Promotion, 'id' | 'createdAt'>) => {
    const created: Promotion = {
      ...newPromo,
      id: `promo-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    try {
      const cleanPromo = sanitizeForFirestore(created);
      await setDoc(doc(db, 'promotions', created.id), cleanPromo);
    } catch (e: any) {
      console.error('Error creating promotion in Firestore:', e);
      alert(`❌ Error al crear promoción en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  const handleDeletePromotion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'promotions', id));
    } catch (e: any) {
      console.error('Error deleting promotion from Firestore:', e);
      alert(`❌ Error al eliminar promoción en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  // Customer Handlers
  const handleAddCustomer = async (newCust: Omit<Customer, 'id' | 'createdAt'>) => {
    const created: Customer = {
      ...newCust,
      id: `cust-${Date.now()}`,
      totalPurchasesCount: 0,
      totalSpentAmount: 0,
      createdAt: new Date().toISOString()
    };
    try {
      const cleanCust = sanitizeForFirestore(created);
      await setDoc(doc(db, 'customers', created.id), cleanCust);
    } catch (e: any) {
      console.error('Error creating customer in Firestore:', e);
      alert(`❌ Error al registrar cliente en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  const handleUpdateCustomer = async (id: string, updated: Partial<Customer>) => {
    try {
      const up = sanitizeForFirestore({ ...updated, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'customers', id), up, { merge: true });
    } catch (e: any) {
      console.error('Error updating customer in Firestore:', e);
      alert(`❌ Error al actualizar cliente en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (e: any) {
      console.error('Error deleting customer from Firestore:', e);
      alert(`❌ Error al eliminar cliente en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  // Petty Cash Fund & Expense Handlers
  const handleUpdatePettyCashFundConfig = async (initialAmount: number, minThreshold: number) => {
    const upFund = {
      ...pettyCashFund,
      initialAmount,
      minAlertThreshold: minThreshold,
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'settings', 'petty_cash_fund'), upFund, { merge: true });
    } catch (e: any) {
      console.error('Error updating petty cash config in Firestore:', e);
      alert(`❌ Error al actualizar caja chica en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  const handleAddPettyCashInjection = async (amount: number, concept: string) => {
    const newInj: PettyCashInjection = {
      id: `inj-${Date.now()}`,
      date: new Date().toISOString(),
      amount,
      authorizedBy: currentUser?.displayName || 'Mario Barillas (CEO)',
      concept,
      createdAt: new Date().toISOString()
    };
    const upFund = {
      ...pettyCashFund,
      injections: [newInj, ...(pettyCashFund.injections || [])],
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'settings', 'petty_cash_fund'), upFund, { merge: true });
    } catch (e: any) {
      console.error('Error adding petty cash injection in Firestore:', e);
      alert(`❌ Error al registrar inyección de caja chica en Firestore: ${e?.message || 'Error de conexión'}`);
    }
  };

  const handleRegisterPettyCashExpense = async (
    expenseData: Omit<PettyCashExpense, 'id' | 'voucherNumber' | 'createdAt'>
  ): Promise<PettyCashExpense> => {
    const expenseId = `exp-${Date.now()}`;
    const voucherNumber = `CC-2026-${String(pettyCashExpenses.length + 1).padStart(3, '0')}`;
    
    // Construct the clean expense object with NO undefined fields
    const newExpense: PettyCashExpense = {
      id: expenseId,
      voucherNumber,
      date: expenseData.date || new Date().toISOString(),
      cashierUid: expenseData.cashierUid || currentUser?.uid || 'user-cajero-01',
      cashierName: expenseData.cashierName || currentUser?.displayName || 'Cajero en Sesión',
      ...(expenseData.shiftId ? { shiftId: expenseData.shiftId } : {}),
      amount: expenseData.amount,
      category: expenseData.category,
      recipientOrSupplier: expenseData.recipientOrSupplier,
      concept: expenseData.concept,
      invoiceOrReceiptNumber: expenseData.invoiceOrReceiptNumber,
      ...(expenseData.notes ? { notes: expenseData.notes } : {}),
      ...(expenseData.receiptPhotoUrl ? { receiptPhotoUrl: expenseData.receiptPhotoUrl } : {}),
      status: expenseData.status || 'Registrado',
      createdAt: new Date().toISOString()
    };

    const cleanExpenseData = sanitizeForFirestore(newExpense);

    try {
      if (expenseData.shiftId) {
        // Atomic Transaction: Create expense AND update cash shift simultaneously
        const shiftRef = doc(db, 'shifts', expenseData.shiftId);
        const expenseRef = doc(collection(db, 'petty_cash_expenses'), expenseId);

        await runTransaction(db, async (transaction) => {
          const shiftSnap = await transaction.get(shiftRef);
          
          // Write the expense in Firestore
          transaction.set(expenseRef, cleanExpenseData);

          if (shiftSnap.exists()) {
            const shiftData = shiftSnap.data() as CashShift;
            const prevOutflows = shiftData.totalPettyCashOutflows || 0;
            const prevExpected = shiftData.expectedCashTotal || 0;
            transaction.update(shiftRef, {
              totalPettyCashOutflows: prevOutflows + expenseData.amount,
              expectedCashTotal: prevExpected - expenseData.amount
            });
          }
        });
      } else {
        // Direct expense with no shiftId (e.g. CEO direct operational cost)
        const expenseRef = doc(collection(db, 'petty_cash_expenses'), expenseId);
        await setDoc(expenseRef, cleanExpenseData);
      }

      return newExpense;
    } catch (e: any) {
      console.error('Error registrando salida de efectivo en Firestore:', e);
      throw new Error(`Error en Firestore al registrar salida: ${e?.message || 'Error de conexión'}`);
    }
  };

  const handleVoidPettyCashExpense = async (expenseId: string, reason: string) => {
    const target = pettyCashExpenses.find(e => e.id === expenseId);
    if (!target) return;
    const upExp = sanitizeForFirestore({
      status: 'Anulado' as const,
      voidReason: reason,
      notes: `${target.notes || ''} [ANULADO: ${reason}]`.trim(),
      updatedAt: new Date().toISOString()
    });
    try {
      await setDoc(doc(db, 'petty_cash_expenses', expenseId), upExp, { merge: true });
    } catch (err: any) {
      console.error('Firestore expense void error:', err);
      alert(`❌ Error al anular gasto en Firestore: ${err?.message || 'Error de conexión'}`);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans selection:bg-cyan-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-64">
        {/* Top Sticky Header */}
        <Header
          activeTab={activeTab}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        />

        {/* Dynamic Route View with RBAC Protection */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50 relative">
          {!isTabAllowed ? (
            <div className="max-w-md mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-xl text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Acceso Restringido</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Tu rol actual (<span className="font-bold text-slate-800">{role}</span>) no cuenta con los permisos necesarios para acceder a este módulo.
              </p>
              <button
                onClick={() => setActiveTab(allowedList[0] || 'pos')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a Módulo Autorizado</span>
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'pos' && (
                <POSModule
                  products={products}
                  promotions={promotions}
                  customers={customers}
                  suppliers={suppliers}
                  activeCashShift={cashShifts.find(s => s.status === 'open')}
                  onCompleteSale={handleCompleteSale}
                  onAddCustomer={handleAddCustomer}
                  onGoToArqueo={() => setActiveTab('arqueo')}
                  onRegisterPettyCashExpense={handleRegisterPettyCashExpense}
                />
              )}

              {activeTab === 'customers' && (
                <CustomersModule
                  customers={customers}
                  onAddCustomer={handleAddCustomer}
                  onUpdateCustomer={handleUpdateCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                />
              )}

              {activeTab === 'sales_history' && (
                <SalesHistoryModule
                  sales={sales}
                  initialFilter={salesHistoryFilter}
                  onClearInitialFilter={() => setSalesHistoryFilter(null)}
                />
              )}

              {activeTab === 'arqueo' && (
                <CashClosureModule
                  cashShifts={cashShifts}
                  sales={sales}
                  recharges={recharges}
                  repairs={repairs}
                  pettyCashExpenses={pettyCashExpenses}
                  suppliers={suppliers}
                  onOpenShift={handleOpenShift}
                  onCloseShift={handleCloseShift}
                  onRegisterPettyCashExpense={handleRegisterPettyCashExpense}
                  onNavigateToSalesHistory={(filter) => {
                    setSalesHistoryFilter(filter);
                    setActiveTab('sales_history');
                  }}
                />
              )}

              {activeTab === 'petty_cash' && (
                <PettyCashCEOModule
                  fund={pettyCashFund}
                  expenses={pettyCashExpenses}
                  suppliers={suppliers}
                  cashShifts={cashShifts}
                  onUpdateFundConfig={handleUpdatePettyCashFundConfig}
                  onAddFundInjection={handleAddPettyCashInjection}
                  onRegisterExpense={handleRegisterPettyCashExpense}
                  onVoidExpense={handleVoidPettyCashExpense}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryModule
                  products={products}
                  suppliers={suppliers}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onAddSupplier={handleAddSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                />
              )}

              {activeTab === 'repairs' && (
                <RepairsModule
                  repairs={repairs}
                  customers={customers}
                  onAddRepair={handleAddRepair}
                  onUpdateRepairStatus={handleUpdateRepairStatus}
                  onConsultAI={(brand, model, issue) => {
                    setAiAssistantContext({
                      deviceBrand: brand,
                      deviceModel: model,
                      issueDescription: issue
                    });
                    setIsAIAssistantOpen(true);
                  }}
                />
              )}

              {activeTab === 'recharges' && (
                <RechargesModule
                  recharges={recharges}
                  activeCashShift={cashShifts.find(s => s.status === 'open')}
                  onAddRecharge={handleAddRecharge}
                />
              )}

              {activeTab === 'promotions' && (
                <PromotionsModule
                  promotions={promotions}
                  onAddPromotion={handleAddPromotion}
                  onDeletePromotion={handleDeletePromotion}
                />
              )}

              {activeTab === 'kpis' && (
                <KPIsDashboard
                  sales={sales}
                  repairs={repairs}
                  recharges={recharges}
                  products={products}
                />
              )}

              {activeTab === 'users' && (
                <UsersModule />
              )}

              {activeTab === 'backups' && (
                <BackupsModule />
              )}
            </>
          )}
        </main>
      </div>

      {/* Gemini AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIAssistantOpen}
        onClose={() => {
          setIsAIAssistantOpen(false);
          setAiAssistantContext(undefined);
        }}
        initialContext={aiAssistantContext}
        products={products}
        repairs={repairs}
      />

      {/* Kill Switch System Pause Overlay */}
      {isSystemPaused && <SystemPauseOverlay />}
    </div>
  );
}

export default function App() {
  useEffect(() => {
    runVersionMigrationCheck();
  }, []);

  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
