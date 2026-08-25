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
  };

  const handleCloseShift = (
    shiftId: string, 
    actualCountedCash: number, 
    notes: string
  ) => {
    setCashShifts(prev => prev.map(s => {
      if (s.id === shiftId) {
        const cashDiff = actualCountedCash - s.expectedCashTotal;
        return {
          ...s,
          status: 'closed' as const,
          closedAt: new Date().toISOString(),
          actualCountedCash,
          difference: cashDiff,
          notes,
          closedByUid: currentUser.uid,
          closedByName: currentUser.displayName
        };
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
  };

  const handleUpdateProduct = (id: string, updated: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated, updatedAt: new Date().toISOString() } : p));
  };

  const handleDeleteProduct = (id: string) => {
    // Delete from Firestore
    deleteProductFromFirestore(id);
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
  };

  const handleDeleteSupplier = (id: string) => {
    // Delete from Firestore
    deleteSupplierFromFirestore(id);
    // Update local state
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  // Sale Handlers
  const handleCompleteSale = (newSale: Sale) => {
    // Update product stock
    newSale.items.forEach(item => {
      setProducts(prev => prev.map(p => {
        if (p.id === item.productId) {
          const newStock = Math.max(0, p.stock - item.quantity);
          return { ...p, stock: newStock, updatedAt: new Date().toISOString() };
        }
        return p;
      }));
    });

    // Update CRM Customer metrics if customer attached
    if (newSale.customerId) {
      setCustomers(prev => prev.map(c => {
        if (c.id === newSale.customerId) {
          return {
            ...c,
            totalPurchasesCount: (c.totalPurchasesCount || 0) + 1,
            totalSpentAmount: (c.totalSpentAmount || 0) + newSale.total,
            updatedAt: new Date().toISOString()
          };
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
          return {
            ...s,
            totalCashSales: s.totalCashSales + cashAdd,
            totalCardSales: s.totalCardSales + cardAdd,
            totalTransferSales: s.totalTransferSales + transAdd,
            expectedCashTotal: s.expectedCashTotal + cashAdd
          };
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
  };

  const handleUpdateRepairStatus = (id: string, newStatus: Repair['status'], diagnosticNotes?: string) => {
    setRepairs(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: newStatus,
          diagnosticNotes: diagnosticNotes || r.diagnosticNotes,
          updatedAt: new Date().toISOString()
        };
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

    // Update active cash shift
    setCashShifts(prev => {
      const openShift = prev.find(s => s.status === 'open');
      if (!openShift) return prev;

      return prev.map(s => {
        if (s.id === openShift.id) {
          return {
            ...s,
            totalRechargesSales: s.totalRechargesSales + newRec.salePrice,
            totalCashSales: s.totalCashSales + newRec.salePrice,
            expectedCashTotal: s.expectedCashTotal + newRec.salePrice
          };
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
  };

  const handleDeletePromotion = (id: string) => {
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
  };

  const handleUpdateCustomer = (id: string, updated: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updated, updatedAt: new Date().toISOString() } : c));
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  // Petty Cash Fund & Expense Handlers
  const handleUpdatePettyCashFundConfig = (initialAmount: number, minThreshold: number) => {
    setPettyCashFund(prev => ({
      ...prev,
      initialAmount,
      minAlertThreshold: minThreshold,
      updatedAt: new Date().toISOString()
    }));
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
    setPettyCashFund(prev => ({
      ...prev,
      injections: [newInj, ...(prev.injections || [])],
      updatedAt: new Date().toISOString()
    }));
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

    // Update open cash shift if linked
    if (expenseData.shiftId) {
      setCashShifts(prev => prev.map(s => {
        if (s.id === expenseData.shiftId) {
          return {
            ...s,
            totalPettyCashOutflows: (s.totalPettyCashOutflows || 0) + expenseData.amount,
            expectedCashTotal: s.expectedCashTotal - expenseData.amount
          };
        }
        return s;
      }));
    }

    return newExpense;
  };

  const handleVoidPettyCashExpense = (expenseId: string, reason: string) => {
    setPettyCashExpenses(prev => prev.map(e => {
      if (e.id === expenseId) {
        return {
          ...e,
          status: 'Anulado' as const,
          voidReason: reason,
          notes: `${e.notes || ''} [ANULADO: ${reason}]`
        };
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
