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
import { InventoryModule } from './components/inventory/InventoryModule';
import { RepairsModule } from './components/repairs/RepairsModule';
import { RechargesModule } from './components/recharges/RechargesModule';
import { PromotionsModule } from './components/promotions/PromotionsModule';
import { KPIsDashboard } from './components/kpis/KPIsDashboard';
import { UsersModule } from './components/users/UsersModule';
import { CustomersModule } from './components/customers/CustomersModule';
import { AIAssistantModal } from './components/ai/AIAssistantModal';
import { PettyCashCEOModule } from './components/petty_cash/PettyCashCEOModule';

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
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

// Application Version Control & Auto-Migration (v2.7)
export const APP_VERSION = 'v2.7';
export const APP_VERSION_STORAGE_KEY = 'celltronic_version';

export function runVersionMigrationCheck(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const savedVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);
    if (savedVersion !== APP_VERSION) {
      console.log(`[VersionCheck] Cache version mismatch (${savedVersion || 'none'} -> ${APP_VERSION}). Executing localStorage.clear() and initializing defaults.`);
      localStorage.clear();
      localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_VERSION);
      localStorage.setItem('celltronic_users', JSON.stringify(INITIAL_USERS));
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

  // Persistent State Engine
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('celltronic_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('celltronic_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('celltronic_sales');
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [repairs, setRepairs] = useState<Repair[]>(() => {
    const saved = localStorage.getItem('celltronic_repairs');
    return saved ? JSON.parse(saved) : INITIAL_REPAIRS;
  });

  const [recharges, setRecharges] = useState<Recharge[]>(() => {
    const saved = localStorage.getItem('celltronic_recharges');
    return saved ? JSON.parse(saved) : INITIAL_RECHARGES;
  });

  const [promotions, setPromotions] = useState<Promotion[]>(() => {
    const saved = localStorage.getItem('celltronic_promotions');
    return saved ? JSON.parse(saved) : INITIAL_PROMOTIONS;
  });

  const [cashShifts, setCashShifts] = useState<CashShift[]>(() => {
    const saved = localStorage.getItem('celltronic_cash_shifts');
    return saved ? JSON.parse(saved) : INITIAL_CASH_SHIFTS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('celltronic_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [pettyCashFund, setPettyCashFund] = useState<PettyCashFund>(() => {
    const saved = localStorage.getItem('celltronic_petty_cash_fund');
    return saved ? JSON.parse(saved) : INITIAL_PETTY_CASH_FUND;
  });

  const [pettyCashExpenses, setPettyCashExpenses] = useState<PettyCashExpense[]>(() => {
    const saved = localStorage.getItem('celltronic_petty_cash_expenses');
    return saved ? JSON.parse(saved) : INITIAL_PETTY_CASH_EXPENSES;
  });

  // LocalStorage Synchro Effects
  useEffect(() => {
    localStorage.setItem('celltronic_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('celltronic_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('celltronic_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('celltronic_repairs', JSON.stringify(repairs));
  }, [repairs]);

  useEffect(() => {
    localStorage.setItem('celltronic_recharges', JSON.stringify(recharges));
  }, [recharges]);

  useEffect(() => {
    localStorage.setItem('celltronic_promotions', JSON.stringify(promotions));
  }, [promotions]);

  useEffect(() => {
    localStorage.setItem('celltronic_cash_shifts', JSON.stringify(cashShifts));
  }, [cashShifts]);

  useEffect(() => {
    localStorage.setItem('celltronic_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('celltronic_petty_cash_fund', JSON.stringify(pettyCashFund));
  }, [pettyCashFund]);

  useEffect(() => {
    localStorage.setItem('celltronic_petty_cash_expenses', JSON.stringify(pettyCashExpenses));
  }, [pettyCashExpenses]);

  // Real-time Firestore Sync Engine (onSnapshot for Sales, Products, Repairs, Shifts, etc.)
  useEffect(() => {
    // 1. Products Listener
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteProducts: Product[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Product) }));
        setProducts(remoteProducts);
      }
    }, (err) => console.warn('Firestore Products onSnapshot notice:', err));

    // 2. Sales Listener
    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteSales: Sale[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Sale) }));
        remoteSales.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
        setSales(remoteSales);
      }
    }, (err) => console.warn('Firestore Sales onSnapshot notice:', err));

    // 3. Repairs / Technical Service Listener
    const unsubRepairs = onSnapshot(collection(db, 'repairs'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteRepairs: Repair[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Repair) }));
        remoteRepairs.sort((a, b) => new Date(b.receivedDate || 0).getTime() - new Date(a.receivedDate || 0).getTime());
        setRepairs(remoteRepairs);
      }
    }, (err) => console.warn('Firestore Repairs onSnapshot notice:', err));

    // 4. Cash Shifts Listener
    const unsubShifts = onSnapshot(collection(db, 'shifts'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteShifts: CashShift[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as CashShift) }));
        remoteShifts.sort((a, b) => new Date(b.openedAt || 0).getTime() - new Date(a.openedAt || 0).getTime());
        setCashShifts(remoteShifts);
      }
    }, (err) => console.warn('Firestore Shifts onSnapshot notice:', err));

    // 5. Recharges Listener
    const unsubRecharges = onSnapshot(collection(db, 'recharges'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteRecharges: Recharge[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Recharge) }));
        remoteRecharges.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setRecharges(remoteRecharges);
      }
    }, (err) => console.warn('Firestore Recharges onSnapshot notice:', err));

    // 6. Customers Listener
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteCustomers: Customer[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Customer) }));
        setCustomers(remoteCustomers);
      }
    }, (err) => console.warn('Firestore Customers onSnapshot notice:', err));

    // 7. Promotions Listener
    const unsubPromotions = onSnapshot(collection(db, 'promotions'), (snapshot) => {
      if (!snapshot.empty) {
        const remotePromotions: Promotion[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Promotion) }));
        setPromotions(remotePromotions);
      }
    }, (err) => console.warn('Firestore Promotions onSnapshot notice:', err));

    // 8. Suppliers Listener
    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteSuppliers: Supplier[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Supplier) }));
        setSuppliers(remoteSuppliers);
      }
    }, (err) => console.warn('Firestore Suppliers onSnapshot notice:', err));

    // 9. Petty Cash Expenses Listener
    const unsubPettyExpenses = onSnapshot(collection(db, 'petty_cash_expenses'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteExpenses: PettyCashExpense[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as PettyCashExpense) }));
        remoteExpenses.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setPettyCashExpenses(remoteExpenses);
      }
    }, (err) => console.warn('Firestore Petty Cash onSnapshot notice:', err));

    return () => {
      unsubProducts();
      unsubSales();
      unsubRepairs();
      unsubShifts();
      unsubRecharges();
      unsubCustomers();
      unsubPromotions();
      unsubSuppliers();
      unsubPettyExpenses();
    };
  }, []);

  // Route & RBAC Permission Guard
  useEffect(() => {
    if (!currentUser) return;
    const allowed = currentUser.allowedModules || DEFAULT_ROLE_MODULES[role] || ['pos'];

    // If current tab is not allowed for active role, redirect to first allowed tab
    if (!allowed.includes(activeTab)) {
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
  const isTabAllowed = allowedList.includes(activeTab);

  // Cash Shift Handlers
  const handleOpenShift = (initialAmount: number) => {
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
    setCashShifts(prev => [newShift, ...prev]);
    setDoc(doc(db, 'shifts', newShift.id), newShift).catch(e => console.warn('Firestore shift write:', e));
  };

  const handleCloseShift = (
    shiftId: string, 
    actualCountedCash: number, 
    notes: string
  ) => {
    setCashShifts(prev => prev.map(s => {
      if (s.id === shiftId) {
        const cashDiff = actualCountedCash - s.expectedCashTotal;
        const updated = {
          ...s,
          status: 'closed' as const,
          closedAt: new Date().toISOString(),
          actualCountedCash,
          difference: cashDiff,
          notes,
          closedByUid: currentUser.uid,
          closedByName: currentUser.displayName
        };
        setDoc(doc(db, 'shifts', s.id), updated, { merge: true }).catch(e => console.warn('Firestore shift close:', e));
        return updated;
      }
      return s;
    }));
  };

  // Product Handlers
  const handleAddProduct = (newProd: Omit<Product, 'id' | 'updatedAt'>) => {
    const created: Product = {
      ...newProd,
      id: `prod-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    setProducts(prev => [created, ...prev]);
    setDoc(doc(db, 'products', created.id), created).catch(e => console.warn('Firestore product write:', e));
  };

  const handleUpdateProduct = (id: string, updated: Partial<Product>) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const up = { ...p, ...updated, updatedAt: new Date().toISOString() };
        setDoc(doc(db, 'products', id), up, { merge: true }).catch(e => console.warn('Firestore product update:', e));
        return up;
      }
      return p;
    }));
  };

  const handleDeleteProduct = (id: string) => {
    // Delete from Firestore
    deleteProductFromFirestore(id);
    deleteDoc(doc(db, 'products', id)).catch(e => console.warn('Firestore delete:', e));
    // Update local state
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // Supplier Handlers
  const handleAddSupplier = (newSup: Omit<Supplier, 'id' | 'createdAt'>) => {
    const created: Supplier = {
      ...newSup,
      id: `sup-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setSuppliers(prev => [created, ...prev]);
    setDoc(doc(db, 'suppliers', created.id), created).catch(e => console.warn('Firestore supplier write:', e));
  };

  const handleDeleteSupplier = (id: string) => {
    // Delete from Firestore
    deleteSupplierFromFirestore(id);
    deleteDoc(doc(db, 'suppliers', id)).catch(e => console.warn('Firestore delete supplier:', e));
    // Update local state
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  // Sale Handlers
  const handleCompleteSale = (newSale: Sale) => {
    // Write sale to Firestore
    setDoc(doc(db, 'sales', newSale.id), newSale).catch(e => console.warn('Firestore sale write:', e));

    // Update product stock
    newSale.items.forEach(item => {
      setProducts(prev => prev.map(p => {
        if (p.id === item.productId) {
          const newStock = Math.max(0, p.stock - item.quantity);
          const updatedProd = { ...p, stock: newStock, updatedAt: new Date().toISOString() };
          setDoc(doc(db, 'products', p.id), updatedProd, { merge: true }).catch(e => console.warn('Firestore prod stock update:', e));
          return updatedProd;
        }
        return p;
      }));
    });

    // Update CRM Customer metrics if customer attached
    if (newSale.customerId) {
      setCustomers(prev => prev.map(c => {
        if (c.id === newSale.customerId) {
          const upCust = {
            ...c,
            totalPurchasesCount: (c.totalPurchasesCount || 0) + 1,
            totalSpentAmount: (c.totalSpentAmount || 0) + newSale.total,
            updatedAt: new Date().toISOString()
          };
          setDoc(doc(db, 'customers', c.id), upCust, { merge: true }).catch(e => console.warn('Firestore customer update:', e));
          return upCust;
        }
        return c;
      }));
    }

    // Update active cash shift
    setCashShifts(prev => {
      const openShift = prev.find(s => s.status === 'open');
      if (!openShift) return prev;

      let cashAdd = 0;
      let cardAdd = 0;
      let transAdd = 0;

      if (newSale.paymentMethod === 'Efectivo') cashAdd = newSale.total;
      else if (newSale.paymentMethod === 'Tarjeta') cardAdd = newSale.total;
      else if (newSale.paymentMethod === 'Transferencia') transAdd = newSale.total;
      else if (newSale.paymentMethod === 'Mixto') {
        cashAdd = newSale.amountPaid || newSale.total;
      }

      return prev.map(s => {
        if (s.id === openShift.id) {
          const upShift = {
            ...s,
            totalCashSales: s.totalCashSales + cashAdd,
            totalCardSales: s.totalCardSales + cardAdd,
            totalTransferSales: s.totalTransferSales + transAdd,
            expectedCashTotal: s.expectedCashTotal + cashAdd
          };
          setDoc(doc(db, 'shifts', s.id), upShift, { merge: true }).catch(e => console.warn('Firestore shift update:', e));
          return upShift;
        }
        return s;
      });
    });

    setSales(prev => [newSale, ...prev]);
  };

  // Repair Handlers
  const handleAddRepair = (newRep: Omit<Repair, 'id' | 'ticketNumber' | 'receivedDate' | 'updatedAt'>) => {
    const ticketNumber = `REP-${Math.floor(1000 + Math.random() * 9000)}`;
    const created: Repair = {
      ...newRep,
      id: `rep-${Date.now()}`,
      ticketNumber,
      receivedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setRepairs(prev => [created, ...prev]);
    setDoc(doc(db, 'repairs', created.id), created).catch(e => console.warn('Firestore repair write:', e));
  };

  const handleUpdateRepairStatus = (id: string, newStatus: Repair['status'], diagnosticNotes?: string) => {
    setRepairs(prev => prev.map(r => {
      if (r.id === id) {
        const up = {
          ...r,
          status: newStatus,
          diagnosticNotes: diagnosticNotes || r.diagnosticNotes,
          updatedAt: new Date().toISOString()
        };
        setDoc(doc(db, 'repairs', id), up, { merge: true }).catch(e => console.warn('Firestore repair status update:', e));
        return up;
      }
      return r;
    }));
  };

  // Recharge Handlers
  const handleAddRecharge = (newRec: Omit<Recharge, 'id' | 'createdAt' | 'profit'>) => {
    const profit = newRec.salePrice - newRec.costPrice;
    const created: Recharge = {
      ...newRec,
      profit,
      id: `rec-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    setDoc(doc(db, 'recharges', created.id), created).catch(e => console.warn('Firestore recharge write:', e));

    // Update active cash shift
    setCashShifts(prev => {
      const openShift = prev.find(s => s.status === 'open');
      if (!openShift) return prev;

      return prev.map(s => {
        if (s.id === openShift.id) {
          const upShift = {
            ...s,
            totalRechargesSales: s.totalRechargesSales + newRec.salePrice,
            totalCashSales: s.totalCashSales + newRec.salePrice,
            expectedCashTotal: s.expectedCashTotal + newRec.salePrice
          };
          setDoc(doc(db, 'shifts', s.id), upShift, { merge: true }).catch(e => console.warn('Firestore shift update:', e));
          return upShift;
        }
        return s;
      });
    });

    setRecharges(prev => [created, ...prev]);
  };

  // Promotion Handlers
  const handleAddPromotion = (newPromo: Omit<Promotion, 'id' | 'createdAt'>) => {
    const created: Promotion = {
      ...newPromo,
      id: `promo-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setPromotions(prev => [created, ...prev]);
    setDoc(doc(db, 'promotions', created.id), created).catch(e => console.warn('Firestore promo write:', e));
  };

  const handleDeletePromotion = (id: string) => {
    deleteDoc(doc(db, 'promotions', id)).catch(e => console.warn('Firestore promo delete:', e));
    setPromotions(prev => prev.filter(p => p.id !== id));
  };

  // Customer Handlers
  const handleAddCustomer = (newCust: Omit<Customer, 'id' | 'createdAt'>) => {
    const created: Customer = {
      ...newCust,
      id: `cust-${Date.now()}`,
      totalPurchasesCount: 0,
      totalSpentAmount: 0,
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [created, ...prev]);
    setDoc(doc(db, 'customers', created.id), created).catch(e => console.warn('Firestore customer write:', e));
  };

  const handleUpdateCustomer = (id: string, updated: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const up = { ...c, ...updated, updatedAt: new Date().toISOString() };
        setDoc(doc(db, 'customers', id), up, { merge: true }).catch(e => console.warn('Firestore customer update:', e));
        return up;
      }
      return c;
    }));
  };

  const handleDeleteCustomer = (id: string) => {
    deleteDoc(doc(db, 'customers', id)).catch(e => console.warn('Firestore customer delete:', e));
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  // Petty Cash Fund & Expense Handlers
  const handleUpdatePettyCashFundConfig = (initialAmount: number, minThreshold: number) => {
    const upFund = {
      ...pettyCashFund,
      initialAmount,
      minAlertThreshold: minThreshold,
      updatedAt: new Date().toISOString()
    };
    setPettyCashFund(upFund);
    setDoc(doc(db, 'settings', 'petty_cash_fund'), upFund, { merge: true }).catch(e => console.warn('Firestore petty cash fund config:', e));
  };

  const handleAddPettyCashInjection = (amount: number, concept: string) => {
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
    setPettyCashFund(upFund);
    setDoc(doc(db, 'settings', 'petty_cash_fund'), upFund, { merge: true }).catch(e => console.warn('Firestore petty cash injection:', e));
  };

  const handleRegisterPettyCashExpense = (expenseData: Omit<PettyCashExpense, 'id' | 'voucherNumber' | 'createdAt'>): PettyCashExpense => {
    const voucherNumber = `CC-2026-${String(pettyCashExpenses.length + 1).padStart(3, '0')}`;
    const newExpense: PettyCashExpense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      voucherNumber,
      createdAt: new Date().toISOString()
    };

    setPettyCashExpenses(prev => [newExpense, ...prev]);
    setDoc(doc(db, 'petty_cash_expenses', newExpense.id), newExpense).catch(e => console.warn('Firestore expense write:', e));

    // Update open cash shift if linked
    if (expenseData.shiftId) {
      setCashShifts(prev => prev.map(s => {
        if (s.id === expenseData.shiftId) {
          const upShift = {
            ...s,
            totalPettyCashOutflows: (s.totalPettyCashOutflows || 0) + expenseData.amount,
            expectedCashTotal: s.expectedCashTotal - expenseData.amount
          };
          setDoc(doc(db, 'shifts', s.id), upShift, { merge: true }).catch(e => console.warn('Firestore shift expense update:', e));
          return upShift;
        }
        return s;
      }));
    }

    return newExpense;
  };

  const handleVoidPettyCashExpense = (expenseId: string, reason: string) => {
    setPettyCashExpenses(prev => prev.map(e => {
      if (e.id === expenseId) {
        const upExp = {
          ...e,
          status: 'Anulado' as const,
          voidReason: reason,
          notes: `${e.notes || ''} [ANULADO: ${reason}]`
        };
        setDoc(doc(db, 'petty_cash_expenses', e.id), upExp, { merge: true }).catch(err => console.warn('Firestore expense void:', err));
        return upExp;
      }
      return e;
    }));
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
