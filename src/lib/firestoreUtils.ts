import { doc, getDocFromServer, getDoc, setDoc, deleteDoc, getFirestore } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppUser, Product, Supplier } from '../types';
import { DEFAULT_ROLE_MODULES } from './sampleData';

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
