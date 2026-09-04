import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  runTransaction, 
  setDoc, 
  deleteDoc, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Recharge, 
  RechargeBalance, 
  RechargeBalanceLog, 
  RechargeBalanceAdjustment,
  RechargeAdjustmentType,
  RechargeDenomination, 
  RechargeFinancial, 
  RechargeOperator,
  CashShift
} from '../types';
import { sanitizeForFirestore } from './firebaseServices';

/**
 * Cent-based Money Precision Helpers (Integer Math)
 * Prevents floating point issues (e.g. 0.1 + 0.2 != 0.3)
 */
export const dollarsToCents = (amount: number | string): number => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
};

export const centsToDollars = (cents: number): number => {
  if (isNaN(cents)) return 0;
  return Number((cents / 100).toFixed(2));
};

export const formatCents = (cents: number): string => {
  if (isNaN(cents)) return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
};

export const calculateRealCostCents = (amountCents: number, commissionPercent: number): number => {
  const validPercent = isNaN(commissionPercent) ? 0 : commissionPercent;
  // Formula: Cost = SalePrice * (1 - (Commission / 100))
  return Math.round(amountCents * (1 - (validPercent / 100)));
};

export const calculateProfitCents = (amountCents: number, realCostCents: number): number => {
  return amountCents - realCostCents;
};

export const ALL_RECHARGE_OPERATORS: RechargeOperator[] = ['Claro', 'Tigo', 'Movistar', 'Digicel', 'Otra'];

export const DEFAULT_INITIAL_BALANCES: Record<string, { availableBalanceCents: number; totalPurchasedCents: number; totalSoldCents: number; minAlertThresholdCents: number }> = {
  claro: {
    availableBalanceCents: 10000, // $100.00
    totalPurchasedCents: 10000,
    totalSoldCents: 0,
    minAlertThresholdCents: 1500 // $15.00
  },
  tigo: {
    availableBalanceCents: 7500, // $75.00
    totalPurchasedCents: 7500,
    totalSoldCents: 0,
    minAlertThresholdCents: 1500 // $15.00
  },
  movistar: {
    availableBalanceCents: 5000, // $50.00
    totalPurchasedCents: 5000,
    totalSoldCents: 0,
    minAlertThresholdCents: 1000 // $10.00
  },
  digicel: {
    availableBalanceCents: 2500, // $25.00
    totalPurchasedCents: 2500,
    totalSoldCents: 0,
    minAlertThresholdCents: 500 // $5.00
  },
  otra: {
    availableBalanceCents: 1000, // $10.00
    totalPurchasedCents: 1000,
    totalSoldCents: 0,
    minAlertThresholdCents: 300 // $3.00
  }
};

export const DEFAULT_DENOMINATIONS_DATA: { amountCents: number; label: string; active: boolean; operator: RechargeOperator | 'TODOS'; order: number }[] = [
  { amountCents: 50, label: '$0.50', active: true, operator: 'TODOS', order: 1 },
  { amountCents: 100, label: '$1.00', active: true, operator: 'TODOS', order: 2 },
  { amountCents: 115, label: '$1.15', active: true, operator: 'TODOS', order: 3 },
  { amountCents: 125, label: '$1.25', active: true, operator: 'TODOS', order: 4 },
  { amountCents: 150, label: '$1.50', active: true, operator: 'TODOS', order: 5 },
  { amountCents: 175, label: '$1.75', active: true, operator: 'TODOS', order: 6 },
  { amountCents: 200, label: '$2.00', active: true, operator: 'TODOS', order: 7 },
  { amountCents: 225, label: '$2.25', active: true, operator: 'TODOS', order: 8 },
  { amountCents: 250, label: '$2.50', active: true, operator: 'TODOS', order: 9 },
  { amountCents: 275, label: '$2.75', active: true, operator: 'TODOS', order: 10 },
  { amountCents: 300, label: '$3.00', active: true, operator: 'TODOS', order: 11 },
  { amountCents: 500, label: '$5.00', active: true, operator: 'TODOS', order: 12 },
  { amountCents: 1000, label: '$10.00', active: true, operator: 'TODOS', order: 13 },
  { amountCents: 2500, label: '$25.00', active: true, operator: 'TODOS', order: 14 },
  { amountCents: 5000, label: '$50.00', active: true, operator: 'TODOS', order: 15 }
];

/**
 * 1. Real-time subscription to Operator Balances in Firestore (recharge_balances)
 */
export function subscribeToRechargeBalances(
  onUpdate: (balances: Record<string, RechargeBalance>) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'recharge_balances');
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const balancesMap: Record<string, RechargeBalance> = {};
      
      if (snapshot.empty) {
        // Automatically seed default balances if empty
        const initialDate = new Date().toISOString();
        for (const opKey of Object.keys(DEFAULT_INITIAL_BALANCES)) {
          const capitalizedOp = (opKey.charAt(0).toUpperCase() + opKey.slice(1)) as RechargeOperator;
          const defData = DEFAULT_INITIAL_BALANCES[opKey];
          const newDoc: RechargeBalance = {
            operator: capitalizedOp,
            availableBalanceCents: defData.availableBalanceCents,
            totalPurchasedCents: defData.totalPurchasedCents,
            totalSoldCents: defData.totalSoldCents,
            minAlertThresholdCents: defData.minAlertThresholdCents,
            updatedAt: initialDate,
            updatedBy: 'Sistema (Inicialización)'
          };
          balancesMap[opKey] = newDoc;
          setDoc(doc(db, 'recharge_balances', opKey), sanitizeForFirestore(newDoc)).catch(e => console.warn('Auto-seed balance error:', e));
        }
      } else {
        snapshot.forEach((d) => {
          const data = d.data() as RechargeBalance;
          const key = (data.operator || d.id).toLowerCase();
          balancesMap[key] = {
            operator: data.operator || (d.id.charAt(0).toUpperCase() + d.id.slice(1)) as RechargeOperator,
            availableBalanceCents: Number(data.availableBalanceCents ?? 0),
            totalPurchasedCents: Number(data.totalPurchasedCents ?? 0),
            totalSoldCents: Number(data.totalSoldCents ?? 0),
            minAlertThresholdCents: Number(data.minAlertThresholdCents ?? 1000),
            updatedAt: data.updatedAt || new Date().toISOString(),
            updatedBy: data.updatedBy || 'Sistema'
          };
        });

        // Ensure all primary operators exist in the map
        for (const op of ALL_RECHARGE_OPERATORS) {
          const key = op.toLowerCase();
          if (!balancesMap[key]) {
            const defData = DEFAULT_INITIAL_BALANCES[key] || {
              availableBalanceCents: 5000,
              totalPurchasedCents: 5000,
              totalSoldCents: 0,
              minAlertThresholdCents: 1000
            };
            const newDoc: RechargeBalance = {
              operator: op,
              availableBalanceCents: defData.availableBalanceCents,
              totalPurchasedCents: defData.totalPurchasedCents,
              totalSoldCents: defData.totalSoldCents,
              minAlertThresholdCents: defData.minAlertThresholdCents,
              updatedAt: new Date().toISOString(),
              updatedBy: 'Sistema'
            };
            balancesMap[key] = newDoc;
            setDoc(doc(db, 'recharge_balances', key), sanitizeForFirestore(newDoc)).catch(() => {});
          }
        }
      }

      onUpdate(balancesMap);
    },
    (err) => {
      console.error('Error in subscribeToRechargeBalances:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * 2. Real-time subscription to Recharge Denominations (recharge_denominations)
 */
export function subscribeToRechargeDenominations(
  onUpdate: (denominations: RechargeDenomination[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'recharge_denominations');
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed default denominations
        const seededList: RechargeDenomination[] = [];
        for (const d of DEFAULT_DENOMINATIONS_DATA) {
          const id = `denom-${d.amountCents}`;
          const denomItem: RechargeDenomination = {
            id,
            amountCents: d.amountCents,
            label: d.label,
            active: d.active,
            operator: d.operator,
            order: d.order,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          seededList.push(denomItem);
          setDoc(doc(db, 'recharge_denominations', id), sanitizeForFirestore(denomItem)).catch(e => console.warn('Auto-seed denomination error:', e));
        }
        seededList.sort((a, b) => a.amountCents - b.amountCents);
        onUpdate(seededList);
      } else {
        const list: RechargeDenomination[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<RechargeDenomination, 'id'>) });
        });
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.amountCents - b.amountCents);
        onUpdate(list);
      }
    },
    (err) => {
      console.error('Error in subscribeToRechargeDenominations:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * 3. Real-time subscription to Balance Audit Logs (recharge_balance_logs)
 */
export function subscribeToRechargeBalanceLogs(
  onUpdate: (logs: RechargeBalanceLog[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'recharge_balance_logs');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: RechargeBalanceLog[] = [];
      snapshot.forEach((d) => {
        logs.push({ id: d.id, ...(d.data() as Omit<RechargeBalanceLog, 'id'>) });
      });
      onUpdate(logs);
    },
    (err) => {
      console.error('Error in subscribeToRechargeBalanceLogs:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * 4. Real-time subscription to Sensitive Financial Records (recharge_financials - CEO Only)
 */
export function subscribeToRechargeFinancials(
  onUpdate: (financials: Record<string, RechargeFinancial>) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'recharge_financials');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const finMap: Record<string, RechargeFinancial> = {};
      snapshot.forEach((d) => {
        finMap[d.id] = { id: d.id, ...(d.data() as Omit<RechargeFinancial, 'id'>) };
      });
      onUpdate(finMap);
    },
    (err) => {
      console.error('Error in subscribeToRechargeFinancials:', err);
      if (onError) onError(err);
    }
  );
}

export interface ProcessRechargeSaleParams {
  operator: RechargeOperator;
  amountCents: number;
  phoneNumber: string;
  cashierUid: string;
  cashierName: string;
  shiftId?: string;
  notes?: string;
  commissionPercent: number;
}

export interface ProcessRechargeSaleResult {
  saleId: string;
  ticketNumber: string;
  recharge: Recharge;
  financial: RechargeFinancial;
}

/**
 * 5. ATOMIC RECHARGE SALE TRANSACTION (runTransaction)
 * Concurrency protected: Guarantees balance never goes below zero and all records are atomic.
 */
export async function executeRechargeSaleTransaction(
  params: ProcessRechargeSaleParams
): Promise<ProcessRechargeSaleResult> {
  const {
    operator,
    amountCents,
    phoneNumber,
    cashierUid,
    cashierName,
    shiftId,
    notes,
    commissionPercent
  } = params;

  if (!amountCents || amountCents <= 0) {
    throw new Error('El monto de la recarga debe ser mayor a $0.00.');
  }

  const opKey = operator.toLowerCase();
  const balanceDocRef = doc(db, 'recharge_balances', opKey);
  const now = new Date();
  const nowIso = now.toISOString();
  const timestamp = Date.now();
  const saleId = `rech-${timestamp}`;
  const logId = `rlog-${timestamp}`;
  const ticketNumber = `TK-REC-${String(timestamp).slice(-6)}`;

  const rechargeDocRef = doc(db, 'recharges', saleId);
  const financialDocRef = doc(db, 'recharge_financials', saleId);
  const logDocRef = doc(db, 'recharge_balance_logs', logId);
  const shiftDocRef = shiftId ? doc(db, 'shifts', shiftId) : null;

  const result = await runTransaction(db, async (transaction) => {
    // 1. ALL READS FIRST (Strict Firestore rule)
    const balanceSnap = await transaction.get(balanceDocRef);
    const shiftSnap = shiftDocRef ? await transaction.get(shiftDocRef) : null;
    const commDocRef = doc(db, 'settings', 'recharge_commissions');
    const commSnap = await transaction.get(commDocRef);

    let availableBalanceCents = 0;
    let totalPurchasedCents = 0;
    let totalSoldCents = 0;
    let minAlertThresholdCents = 1000;

    if (balanceSnap.exists()) {
      const data = balanceSnap.data() as RechargeBalance;
      availableBalanceCents = Number(data.availableBalanceCents ?? 0);
      totalPurchasedCents = Number(data.totalPurchasedCents ?? 0);
      totalSoldCents = Number(data.totalSoldCents ?? 0);
      minAlertThresholdCents = Number(data.minAlertThresholdCents ?? 1000);
    } else {
      // Default fallback if document is missing
      const def = DEFAULT_INITIAL_BALANCES[opKey] || {
        availableBalanceCents: 5000,
        totalPurchasedCents: 5000,
        totalSoldCents: 0,
        minAlertThresholdCents: 1000
      };
      availableBalanceCents = def.availableBalanceCents;
      totalPurchasedCents = def.totalPurchasedCents;
      totalSoldCents = def.totalSoldCents;
      minAlertThresholdCents = def.minAlertThresholdCents;
    }

    // 2. Concurrency check: Ensure sufficient carrier balance (strictly opaque message for security)
    if (availableBalanceCents < amountCents) {
      throw new Error('Saldo insuficiente para realizar esta recarga.');
    }

    // Resolve Commission % from Firestore settings or default fallback
    let resolvedCommissionPercent = 5.0;
    if (commSnap.exists()) {
      const commData = commSnap.data();
      const opKeyLower = opKey as 'claro' | 'tigo' | 'movistar' | 'digicel' | 'otra';
      if (commData[opKeyLower]?.commissionPercent !== undefined) {
        resolvedCommissionPercent = Number(commData[opKeyLower].commissionPercent);
      }
    } else if (commissionPercent !== undefined && commissionPercent > 0) {
      resolvedCommissionPercent = commissionPercent;
    }

    // 3. Integer Math Calculations
    const newAvailableBalanceCents = availableBalanceCents - amountCents;
    const newTotalSoldCents = totalSoldCents + amountCents;
    
    // Financial margins (recorded only in confidential recharge_financials)
    const realCostCents = calculateRealCostCents(amountCents, resolvedCommissionPercent);
    const profitCents = calculateProfitCents(amountCents, realCostCents);

    const salePrice = centsToDollars(amountCents);

    // 4. WRITE OPERATIONS
    // a) Update operator balance
    transaction.set(
      balanceDocRef,
      sanitizeForFirestore({
        operator,
        availableBalanceCents: newAvailableBalanceCents,
        totalPurchasedCents,
        totalSoldCents: newTotalSoldCents,
        minAlertThresholdCents,
        updatedAt: nowIso,
        updatedBy: cashierName
      }),
      { merge: true }
    );

    // b) Operational Recharge Document (Strictly Operational Data - NO financial fields)
    const rechargeDocData: Recharge = {
      id: saleId,
      ticketNumber,
      date: nowIso,
      cashierUid,
      cashierName,
      operator,
      phoneNumber: phoneNumber.trim(),
      amountCents,
      salePrice,
      notes: notes ? notes.trim() : '',
      status: 'Completada',
      shiftId: shiftId || undefined,
      createdAt: nowIso
    };
    transaction.set(rechargeDocRef, sanitizeForFirestore(rechargeDocData));

    // c) Confidential Financial Document (Restricted to CEO)
    const financialDocData: RechargeFinancial = {
      id: saleId,
      saleId,
      operator,
      amountCents,
      realCostCents,
      commissionPercent: resolvedCommissionPercent,
      profitCents,
      cashierUid,
      createdAt: nowIso
    };
    transaction.set(financialDocRef, sanitizeForFirestore(financialDocData));

    // d) Audit Balance Movement Log
    const logDocData: RechargeBalanceLog = {
      id: logId,
      operator,
      type: 'VENTA_RECARGA',
      amountCents,
      previousBalanceCents: availableBalanceCents,
      newBalanceCents: newAvailableBalanceCents,
      userUid: cashierUid,
      userName: cashierName,
      notes: `Venta recarga telefónica ${phoneNumber} (${ticketNumber})`,
      saleId,
      createdAt: nowIso
    };
    transaction.set(logDocRef, sanitizeForFirestore(logDocData));

    // e) If cash shift is active, atomically increment sales & cash totals
    if (shiftSnap && shiftSnap.exists()) {
      const shiftData = shiftSnap.data() as CashShift;
      const prevRecharges = shiftData.totalRechargesSales || 0;
      const prevCash = shiftData.totalCashSales || 0;
      const prevExpected = shiftData.expectedCashTotal || 0;

      transaction.update(shiftDocRef!, {
        totalRechargesSales: prevRecharges + salePrice,
        totalCashSales: prevCash + salePrice,
        expectedCashTotal: prevExpected + salePrice
      });
    }

    return {
      saleId,
      ticketNumber,
      recharge: rechargeDocData,
      financial: financialDocData
    };
  });

  return result;
}

export interface AddRechargeBalanceParams {
  operator: RechargeOperator;
  amountCents: number; // e.g. 10000 for $100.00
  userUid: string;
  userName: string;
  notes?: string;
}

/**
 * 6. ATOMIC BALANCE PURCHASE / TOP-UP TRANSACTION (CEO Only)
 */
export async function addRechargeBalanceTransaction(
  params: AddRechargeBalanceParams
): Promise<{ previousBalanceCents: number; newBalanceCents: number }> {
  const { operator, amountCents, userUid, userName, notes } = params;

  if (!amountCents || amountCents <= 0) {
    throw new Error('El monto a recargar debe ser mayor a $0.00.');
  }

  const opKey = operator.toLowerCase();
  const balanceDocRef = doc(db, 'recharge_balances', opKey);
  const timestamp = Date.now();
  const logId = `rlog-${timestamp}`;
  const logDocRef = doc(db, 'recharge_balance_logs', logId);
  const nowIso = new Date().toISOString();

  const result = await runTransaction(db, async (transaction) => {
    const balanceSnap = await transaction.get(balanceDocRef);

    let prevAvailable = 0;
    let prevPurchased = 0;
    let prevSold = 0;
    let minThreshold = 1000;

    if (balanceSnap.exists()) {
      const data = balanceSnap.data() as RechargeBalance;
      prevAvailable = Number(data.availableBalanceCents ?? 0);
      prevPurchased = Number(data.totalPurchasedCents ?? 0);
      prevSold = Number(data.totalSoldCents ?? 0);
      minThreshold = Number(data.minAlertThresholdCents ?? 1000);
    } else {
      const def = DEFAULT_INITIAL_BALANCES[opKey] || {
        availableBalanceCents: 0,
        totalPurchasedCents: 0,
        totalSoldCents: 0,
        minAlertThresholdCents: 1000
      };
      prevAvailable = def.availableBalanceCents;
      prevPurchased = def.totalPurchasedCents;
      prevSold = def.totalSoldCents;
      minThreshold = def.minAlertThresholdCents;
    }

    const newAvailable = prevAvailable + amountCents;
    const newPurchased = prevPurchased + amountCents;

    // Write updated balance
    transaction.set(
      balanceDocRef,
      sanitizeForFirestore({
        operator,
        availableBalanceCents: newAvailable,
        totalPurchasedCents: newPurchased,
        totalSoldCents: prevSold,
        minAlertThresholdCents: minThreshold,
        updatedAt: nowIso,
        updatedBy: userName
      }),
      { merge: true }
    );

    // Write audit log
    const logDocData: RechargeBalanceLog = {
      id: logId,
      operator,
      type: 'COMPRA_SALDO',
      amountCents,
      previousBalanceCents: prevAvailable,
      newBalanceCents: newAvailable,
      userUid,
      userName,
      notes: notes ? notes.trim() : 'Compra / Inyección de saldo autorizada por CEO',
      createdAt: nowIso
    };
    transaction.set(logDocRef, sanitizeForFirestore(logDocData));

    return {
      previousBalanceCents: prevAvailable,
      newBalanceCents: newAvailable
    };
  });

  return result;
}

/**
 * 7. Update Low Balance Alert Threshold (CEO Only)
 */
export async function updateOperatorMinThreshold(
  operator: RechargeOperator,
  minThresholdCents: number
): Promise<void> {
  const opKey = operator.toLowerCase();
  const balanceDocRef = doc(db, 'recharge_balances', opKey);
  await setDoc(
    balanceDocRef,
    sanitizeForFirestore({
      minAlertThresholdCents: Math.max(0, minThresholdCents),
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );
}

/**
 * 8. Save or Update Fast-Sale Denomination (CEO Only)
 */
export async function saveRechargeDenomination(
  denomination: Omit<RechargeDenomination, 'id'> & { id?: string }
): Promise<string> {
  const id = denomination.id || `denom-${denomination.amountCents}-${Date.now()}`;
  const docRef = doc(db, 'recharge_denominations', id);
  const payload: RechargeDenomination = {
    id,
    amountCents: denomination.amountCents,
    label: denomination.label || formatCents(denomination.amountCents),
    active: denomination.active !== false,
    operator: denomination.operator || 'TODOS',
    order: denomination.order ?? 0,
    updatedAt: new Date().toISOString(),
    createdAt: denomination.createdAt || new Date().toISOString()
  };
  await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });
  return id;
}

/**
 * 9. Delete Denomination (CEO Only)
 */
export async function deleteRechargeDenomination(id: string): Promise<void> {
  await deleteDoc(doc(db, 'recharge_denominations', id));
}

/**
 * 10. Real-time subscription to Recharge Balance Adjustments (recharge_balance_adjustments - CEO Only)
 */
export function subscribeToRechargeAdjustments(
  onUpdate: (adjustments: RechargeBalanceAdjustment[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'recharge_balance_adjustments');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: RechargeBalanceAdjustment[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<RechargeBalanceAdjustment, 'id'>) });
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Error in subscribeToRechargeAdjustments:', err);
      if (onError) onError(err);
    }
  );
}

export interface ExecuteBalanceAdjustmentParams {
  operator: RechargeOperator;
  type: RechargeAdjustmentType; // 'AUMENTO' | 'DISMINUCION'
  amountCents: number;
  reason: string;
  userUid: string;
  userName: string;
}

export interface ExecuteBalanceAdjustmentResult {
  adjustmentId: string;
  adjustment: RechargeBalanceAdjustment;
  previousBalanceCents: number;
  newBalanceCents: number;
}

/**
 * 11. ATOMIC RECHARGE BALANCE ADJUSTMENT (CEO Only)
 * Increases or decreases operator available balance with strict validation.
 * NEVER allows negative balance.
 * Does NOT modify totalSoldCents or totalPurchasedCents.
 * Concurrency protected via runTransaction().
 */
export async function executeRechargeBalanceAdjustmentTransaction(
  params: ExecuteBalanceAdjustmentParams
): Promise<ExecuteBalanceAdjustmentResult> {
  const { operator, type, amountCents, reason, userUid, userName } = params;

  if (!amountCents || amountCents <= 0) {
    throw new Error('El monto del ajuste debe ser mayor a $0.00.');
  }

  const trimmedReason = reason?.trim();
  if (!trimmedReason) {
    throw new Error('Debe especificar un motivo obligatorio para el ajuste.');
  }

  const opKey = operator.toLowerCase();
  const balanceDocRef = doc(db, 'recharge_balances', opKey);
  const timestamp = Date.now();
  const adjustmentId = `adj-${timestamp}`;
  const adjDocRef = doc(db, 'recharge_balance_adjustments', adjustmentId);
  const logId = `rlog-${timestamp}`;
  const logDocRef = doc(db, 'recharge_balance_logs', logId);
  const nowIso = new Date().toISOString();

  const result = await runTransaction(db, async (transaction) => {
    const balanceSnap = await transaction.get(balanceDocRef);

    let prevAvailable = 0;
    let prevPurchased = 0;
    let prevSold = 0;
    let minThreshold = 1000;

    if (balanceSnap.exists()) {
      const data = balanceSnap.data() as RechargeBalance;
      prevAvailable = Number(data.availableBalanceCents ?? 0);
      prevPurchased = Number(data.totalPurchasedCents ?? 0);
      prevSold = Number(data.totalSoldCents ?? 0);
      minThreshold = Number(data.minAlertThresholdCents ?? 1000);
    } else {
      const def = DEFAULT_INITIAL_BALANCES[opKey] || {
        availableBalanceCents: 0,
        totalPurchasedCents: 0,
        totalSoldCents: 0,
        minAlertThresholdCents: 1000
      };
      prevAvailable = def.availableBalanceCents;
      prevPurchased = def.totalPurchasedCents;
      prevSold = def.totalSoldCents;
      minThreshold = def.minAlertThresholdCents;
    }

    const isIncrease = type === 'AUMENTO';
    const newAvailable = isIncrease 
      ? prevAvailable + amountCents 
      : prevAvailable - amountCents;

    // Strict validation: NEVER permit negative balance
    if (newAvailable < 0) {
      throw new Error(
        'No es posible realizar el ajuste. El saldo resultante no puede ser negativo.'
      );
    }

    // Update ONLY availableBalanceCents (totalPurchasedCents and totalSoldCents remain untouched!)
    transaction.set(
      balanceDocRef,
      sanitizeForFirestore({
        operator,
        availableBalanceCents: newAvailable,
        totalPurchasedCents: prevPurchased,
        totalSoldCents: prevSold,
        minAlertThresholdCents: minThreshold,
        updatedAt: nowIso,
        updatedBy: userName
      }),
      { merge: true }
    );

    // Record adjustment in dedicated recharge_balance_adjustments collection
    const adjustmentData: RechargeBalanceAdjustment = {
      id: adjustmentId,
      operator,
      type,
      amountCents,
      previousBalanceCents: prevAvailable,
      newBalanceCents: newAvailable,
      reason: trimmedReason,
      createdAt: nowIso,
      createdBy: userUid,
      createdByName: userName
    };
    transaction.set(adjDocRef, sanitizeForFirestore(adjustmentData));

    // Also write to audit logs so movement timeline reflects the adjustment
    const logDocData: RechargeBalanceLog = {
      id: logId,
      operator,
      type: 'AJUSTE_SALDO',
      amountCents,
      previousBalanceCents: prevAvailable,
      newBalanceCents: newAvailable,
      userUid,
      userName,
      notes: `Ajuste administrativo (${type}): ${trimmedReason}`,
      createdAt: nowIso
    };
    transaction.set(logDocRef, sanitizeForFirestore(logDocData));

    return {
      adjustmentId,
      adjustment: adjustmentData,
      previousBalanceCents: prevAvailable,
      newBalanceCents: newAvailable
    };
  });

  return result;
}

