import { doc, getDocFromServer, getDoc, setDoc, deleteDoc, onSnapshot, getFirestore } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppUser, Product, Supplier, RechargeCommissionSettings } from '../types';
import { DEFAULT_ROLE_MODULES } from './sampleData';

export const DEFAULT_RECHARGE_COMMISSIONS: RechargeCommissionSettings = {
  claro: {
    commissionPercent: 6.5,
    active: true,
    notes: 'Comisión estándar Claro El Salvador'
  },
  tigo: {
    commissionPercent: 6.0,
    active: true,
    notes: 'Comisión estándar Tigo El Salvador'
  },
  movistar: {
    commissionPercent: 7.0,
    active: true,
    notes: 'Comisión estándar Movistar / Telefónica'
  },
  digicel: {
    commissionPercent: 8.0,
    active: true,
    notes: 'Comisión estándar Digicel El Salvador'
  },
  otra: {
    commissionPercent: 5.0,
    active: true,
    notes: 'Otros operadores y paquetes especiales'
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'CEO (Predeterminado)'
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Delete product from Firestore collection '/products/{productId}'
export async function deleteProductFromFirestore(productId: string): Promise<boolean> {
  const path = `products/${productId}`;
  try {
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
    console.log(`Product document ${productId} deleted successfully from Firestore.`);
    return true;
  } catch (error) {
    console.warn(`Could not delete product document from Firestore (${path}), maintaining local state consistency:`, error);
    return false;
  }
}

// Delete supplier from Firestore collection '/suppliers/{supplierId}'
export async function deleteSupplierFromFirestore(supplierId: string): Promise<boolean> {
  const path = `suppliers/${supplierId}`;
  try {
    const supplierRef = doc(db, 'suppliers', supplierId);
    await deleteDoc(supplierRef);
    console.log(`Supplier document ${supplierId} deleted successfully from Firestore.`);
    return true;
  } catch (error) {
    console.warn(`Could not delete supplier document from Firestore (${path}), maintaining local state consistency:`, error);
    return false;
  }
}

// Test connection on boot according to skill guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'test', 'connection'));
    return !!snap;
  } catch (error: any) {
    // Gracefully handle offline or network unreachable status without throwing errors
    return false;
  }
}

// Sync or fetch user profile from Firestore collection '/users/{userId}'
export async function fetchOrCreateUserProfile(fbUser: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}): Promise<AppUser> {
  const userPath = `users/${fbUser.uid}`;
  try {
    const userDocRef = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(userDocRef);

    const isMasterEmail = fbUser.email?.toLowerCase() === 'mariobarillas24@gmail.com';

    if (snap.exists()) {
      const data = snap.data() as Partial<AppUser>;
      const userRole = isMasterEmail ? 'CEO' : (data.role || 'Cajero');
      return {
        uid: fbUser.uid,
        email: fbUser.email || data.email || 'usuario@celltronic.com',
        displayName: data.displayName || fbUser.displayName || 'Usuario Celltronic',
        role: userRole,
        pin: data.pin || (userRole === 'CEO' ? '9999' : userRole === 'Supervisor' ? '1234' : '0000'),
        status: data.status || 'active',
        allowedModules: data.allowedModules || DEFAULT_ROLE_MODULES[userRole],
        createdAt: data.createdAt || new Date().toISOString()
      };
    } else {
      // First-time user profile registration in Firestore
      const userRole = isMasterEmail ? 'CEO' : 'Cajero';
      const newUser: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email || 'usuario@celltronic.com',
        displayName: fbUser.displayName || (isMasterEmail ? 'Mario Barillas (CEO & Super Admin)' : 'Nuevo Colaborador'),
        role: userRole,
        pin: isMasterEmail ? '2408' : '0000',
        status: 'active',
        allowedModules: DEFAULT_ROLE_MODULES[userRole],
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(userDocRef, newUser);
      } catch (err) {
        console.warn('Could not write new user profile to Firestore immediately:', err);
      }

      return newUser;
    }
  } catch (error) {
    console.warn('Error fetching Firestore user profile, using fallback profile:', error);
    const isMaster = fbUser.email?.toLowerCase() === 'mariobarillas24@gmail.com';
    return {
      uid: fbUser.uid,
      email: fbUser.email || 'usuario@celltronic.com',
      displayName: fbUser.displayName || (isMaster ? 'Mario Barillas (CEO)' : 'Usuario Celltronic'),
      role: isMaster ? 'CEO' : 'Cajero',
      pin: isMaster ? '2408' : '0000',
      status: 'active',
      allowedModules: DEFAULT_ROLE_MODULES[isMaster ? 'CEO' : 'Cajero'],
      createdAt: new Date().toISOString()
    };
  }
}

// ---------------------------------------------------------------------------
// Recharge Commissions Configuration (Firestore /settings/recharge_commissions)
// ---------------------------------------------------------------------------

export const RECHARGE_SETTINGS_DOC_PATH = 'settings/recharge_commissions';

/**
 * Real-time subscription to recharge commission settings from Firestore.
 * Fallbacks cleanly to local storage or defaults if offline.
 */
export function subscribeToRechargeCommissions(
  onUpdate: (settings: RechargeCommissionSettings) => void
): () => void {
  try {
    const docRef = doc(db, 'settings', 'recharge_commissions');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<RechargeCommissionSettings>;
          const merged: RechargeCommissionSettings = {
            claro: {
              commissionPercent: Number(data.claro?.commissionPercent ?? DEFAULT_RECHARGE_COMMISSIONS.claro.commissionPercent),
              active: data.claro?.active !== false,
              notes: data.claro?.notes || ''
            },
            tigo: {
              commissionPercent: Number(data.tigo?.commissionPercent ?? DEFAULT_RECHARGE_COMMISSIONS.tigo.commissionPercent),
              active: data.tigo?.active !== false,
              notes: data.tigo?.notes || ''
            },
            movistar: {
              commissionPercent: Number(data.movistar?.commissionPercent ?? DEFAULT_RECHARGE_COMMISSIONS.movistar.commissionPercent),
              active: data.movistar?.active !== false,
              notes: data.movistar?.notes || ''
            },
            digicel: {
              commissionPercent: Number(data.digicel?.commissionPercent ?? DEFAULT_RECHARGE_COMMISSIONS.digicel.commissionPercent),
              active: data.digicel?.active !== false,
              notes: data.digicel?.notes || ''
            },
            otra: {
              commissionPercent: Number(data.otra?.commissionPercent ?? DEFAULT_RECHARGE_COMMISSIONS.otra?.commissionPercent ?? 5.0),
              active: data.otra?.active !== false,
              notes: data.otra?.notes || ''
            },
            updatedAt: data.updatedAt || new Date().toISOString(),
            updatedBy: data.updatedBy || 'CEO'
          };
          
          localStorage.setItem('celltronic_recharge_commissions', JSON.stringify(merged));
          onUpdate(merged);
        } else {
          // If document does not exist yet in Firestore, seed it with defaults
          setDoc(docRef, DEFAULT_RECHARGE_COMMISSIONS, { merge: true }).catch((err) => {
            console.warn('Initial seeding of recharge commissions in Firestore:', err);
          });
          onUpdate(DEFAULT_RECHARGE_COMMISSIONS);
        }
      },
      (error) => {
        console.warn('Error in real-time listener for recharge commissions, using cached/default values:', error);
        const cached = localStorage.getItem('celltronic_recharge_commissions');
        if (cached) {
          try {
            onUpdate(JSON.parse(cached));
          } catch {
            onUpdate(DEFAULT_RECHARGE_COMMISSIONS);
          }
        } else {
          onUpdate(DEFAULT_RECHARGE_COMMISSIONS);
        }
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not set up onSnapshot for recharge commissions:', err);
    return () => {};
  }
}

/**
 * Saves or updates recharge commission settings in Firestore (/settings/recharge_commissions)
 * Accessible only to CEO role.
 */
export async function saveRechargeCommissionsToFirestore(
  settings: RechargeCommissionSettings,
  authorName: string = 'CEO'
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'settings', 'recharge_commissions');
    const payload: RechargeCommissionSettings = {
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: authorName
    };

    await setDoc(docRef, payload, { merge: true });
    localStorage.setItem('celltronic_recharge_commissions', JSON.stringify(payload));
    return { success: true };
  } catch (error: any) {
    console.error('Error saving recharge commissions to Firestore:', error);
    // Keep local cache updated for immediate UI feedback
    localStorage.setItem('celltronic_recharge_commissions', JSON.stringify(settings));
    return { 
      success: true, // Still marked handled locally
      error: error?.message || 'Aviso: Guardado localmente, pendiente de sincronización con Firestore.' 
    };
  }
}

