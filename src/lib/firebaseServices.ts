import { 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 'CEO' | 'Gerente' | 'Supervisor' | 'Cajero' | 'Técnico';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'active' | 'inactive';
  allowedModules: string[];
  pin?: string; // PIN opcional para autorizaciones en caja / POS
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface CreateEmployeeDTO {
  uid?: string;
  email: string;
  displayName: string;
  role: UserRole;
  allowedModules: string[];
  pin?: string;
}

/**
 * 1. Iniciar sesión principal con Email y Contraseña (Firebase Auth)
 */
export const loginWithEmailPassword = async (email: string, pass: string): Promise<FirebaseUser> => {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  return credential.user;
};

/**
 * 2. Cerrar sesión en Firebase Auth
 */
export const logoutAuth = async (): Promise<void> => {
  await signOut(auth);
};

/**
 * 3. Enviar correo de restablecimiento de contraseña
 */
export const sendResetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
};

/**
 * 4. Obtener documento de perfil desde Firestore (doc: users/{uid})
 */
export const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    
    if (!snap.exists()) {
      return null;
    }
    
    return { ...snap.data(), uid: snap.id } as UserProfile;
  } catch (error) {
    console.error('[fetchUserProfile] Error leyendo documento del usuario:', error);
    return null;
  }
};

/**
 * 5. Escuchar lista de usuarios en tiempo real con onSnapshot (Exclusivo CEO)
 */
export const subscribeToUsersList = (
  onSuccess: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        users.push({
          uid: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || 'Sin Nombre',
          role: (data.role as UserRole) || 'Cajero',
          status: data.status === 'inactive' ? 'inactive' : 'active',
          allowedModules: Array.isArray(data.allowedModules) ? data.allowedModules : [],
          pin: data.pin,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      onSuccess(users);
    },
    (error) => {
      console.error('[subscribeToUsersList] Error escuchando colección users:', error);
      if (onError) onError(error);
    }
  );
};

/**
 * 6. Actualizar campos de un usuario (role, displayName, pin, status, allowedModules) con updateDoc
 */
export const updateUserProfileDoc = async (
  uid: string, 
  data: Partial<Omit<UserProfile, 'uid'>>
): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

/**
 * 7. Crear nuevo empleado en Firestore con estructura estandarizada
 */
export const registerEmployeeProfile = async (data: CreateEmployeeDTO): Promise<string> => {
  const userDocRef = data.uid ? doc(db, 'users', data.uid) : doc(collection(db, 'users'));
  const userUid = userDocRef.id;

  const newUserDoc: UserProfile = {
    uid: userUid,
    email: data.email.trim().toLowerCase(),
    displayName: data.displayName.trim(),
    role: data.role,
    status: 'active',
    allowedModules: data.allowedModules,
    ...(data.pin ? { pin: data.pin.trim() } : {}),
    createdAt: new Date().toISOString()
  };

  await setDoc(userDocRef, {
    ...newUserDoc,
    createdAt: serverTimestamp()
  });

  return userUid;
};

/**
 * 8. Limpieza de Datos de Prueba (Exclusivo CEO / Super Admin)
 * Ejecuta un borrado en lote (writeBatch) de las colecciones de prueba:
 * sales, products, inventory, repairs, petty_cash, petty_cash_expenses, shifts y cash_shifts.
 * IMPORTANTE: Protege y NUNCA borra la colección 'users' ni 'settings' para preservar cuentas y accesos.
 */
export const clearTestData = async (): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
  try {
    const testCollections = [
      'sales',
      'products',
      'inventory',
      'repairs',
      'petty_cash',
      'petty_cash_expenses',
      'shifts',
      'cash_shifts',
      'recharges',
      'promotions',
      'customers',
      'suppliers'
    ];

    let totalDeleted = 0;

    for (const collName of testCollections) {
      try {
        const collRef = collection(db, collName);
        const snapshot = await getDocs(collRef);

        if (!snapshot.empty) {
          let batch = writeBatch(db);
          let count = 0;

          for (const docSnap of snapshot.docs) {
            batch.delete(docSnap.ref);
            count++;
            totalDeleted++;

            // Firestore batch limit is 500 operations
            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }

          if (count > 0) {
            await batch.commit();
          }
        }
      } catch (collErr) {
        console.warn(`[clearTestData] Warning clearing collection ${collName}:`, collErr);
      }
    }

    // Clear local storage cache for operational data while keeping user and auth sessions intact
    const localKeys = [
      'celltronic_sales',
      'celltronic_products',
      'celltronic_inventory',
      'celltronic_repairs',
      'celltronic_petty_cash_fund',
      'celltronic_petty_cash_expenses',
      'celltronic_cash_shifts',
      'celltronic_recharges',
      'celltronic_promotions',
      'celltronic_customers',
      'celltronic_suppliers'
    ];

    localKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // ignore
      }
    });

    return { success: true, deletedCount: totalDeleted };
  } catch (error: any) {
    console.error('[clearTestData] Critical error during batch deletion:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error?.message || 'Error al eliminar datos de prueba'
    };
  }
};

/**
 * Recursively removes undefined fields and cleans objects before sending to Firestore
 */
export const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): T => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => (typeof item === 'object' && item !== null ? sanitizeForFirestore(item) : item)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !(value instanceof Date) && !(value instanceof Timestamp)) {
        clean[key] = sanitizeForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean as T;
};


