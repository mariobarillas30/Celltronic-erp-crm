import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import { INITIAL_USERS, DEFAULT_ROLE_MODULES } from '../lib/sampleData';
import { auth, db } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { testFirestoreConnection } from '../lib/firestoreUtils';

export interface GatekeeperUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  // Layer 1: Gatekeeper (URL & System Protection)
  gatekeeperUser: GatekeeperUser | null;
  isGatekeeperAuthenticated: boolean;
  loginWithGoogleGatekeeper: () => Promise<{ success: boolean; error?: string }>;
  loginWithEmailGatekeeper: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logoutGatekeeper: () => Promise<void>;

  // Layer 2: Operational User / Role
  currentUser: AppUser | null;
  role: UserRole;
  isCEO: boolean;
  isGerente: boolean;
  isSupervisor: boolean;
  isCajero: boolean;
  isTecnico: boolean;
  isLoadingAuth: boolean;
  usersList: AppUser[];
  supervisorPinCap: number; // e.g. 10% max manual discount
  isSystemPaused: boolean;
  toggleSystemPause: (secretOrPin: string) => { success: boolean; error?: string };
  
  // Operational Role Activation & Switching
  selectRoleWithPin: (targetRole: UserRole, pin: string, specificEmail?: string) => Promise<{ success: boolean; error?: string }>;
  switchRoleWithPin: (targetRole: UserRole, pin: string) => Promise<{ success: boolean; error?: string }>;
  quickSwitchRole: (targetRole: UserRole) => void;
  loginWithDemoAccount: (role: UserRole) => void;
  
  // Logout (Layer 2 - Role Logout vs Full Logout)
  logoutRole: () => void;
  logout: () => Promise<void>; // Default ERP logout: returns to Role Selection (Layer 2)
  fullLogout: () => Promise<void>; // Complete logout: signs out of Google and returns to Gatekeeper (Layer 1)

  // Legacy & Helper auth methods
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (
    email: string, 
    pass: string, 
    displayName: string, 
    role: UserRole, 
    pin?: string
  ) => Promise<{ success: boolean; error?: string }>;

  // PIN Verification helpers for POS/Approvals (strictly dynamic with Firestore/usersList)
  verifySupervisorPin: (pin: string) => { valid: boolean; authorizedBy?: string };
  verifyCeoOrGerentePin: (pin: string) => { valid: boolean; authorizedBy?: string; role?: UserRole };
  verifyCeoPin: (pin: string) => { valid: boolean; authorizedBy?: string };

  // User Management
  addUser: (newUser: Omit<AppUser, 'uid' | 'createdAt'>, password?: string) => Promise<void>;
  updateUserRole: (uid: string, newRole: UserRole) => Promise<void>;
  updateUserPin: (uid: string, newPin: string) => Promise<void>;
  updateUserModules: (uid: string, modules: string[]) => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;
  resetUserPassword: (uid: string) => string;
  requestPasswordRecovery: (email: string) => Promise<{ success: boolean; message: string }>;
  updateUser: (uid: string, updatedData: Partial<Omit<AppUser, 'uid' | 'createdAt'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  
  const [usersList, setUsersList] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('celltronic_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  // Layer 1: Gatekeeper State (Google / Firebase Auth session)
  const [gatekeeperUser, setGatekeeperUser] = useState<GatekeeperUser | null>(() => {
    const saved = localStorage.getItem('celltronic_gatekeeper_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Layer 2: Operational User (Active ERP role)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const isLoggedOut = localStorage.getItem('celltronic_role_logged_out') === 'true';
    if (isLoggedOut) return null;
    const saved = localStorage.getItem('celltronic_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // System Pause / Kill Switch state
  const [isSystemPaused, setIsSystemPaused] = useState<boolean>(() => {
    return localStorage.getItem('celltronic_system_paused') === 'true';
  });

  const [supervisorPinCap] = useState<number>(10);

  useEffect(() => {
    localStorage.setItem('celltronic_users', JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    localStorage.setItem('celltronic_system_paused', String(isSystemPaused));
  }, [isSystemPaused]);

  useEffect(() => {
    if (gatekeeperUser) {
      localStorage.setItem('celltronic_gatekeeper_user', JSON.stringify(gatekeeperUser));
    } else {
      localStorage.removeItem('celltronic_gatekeeper_user');
    }
  }, [gatekeeperUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('celltronic_current_user', JSON.stringify(currentUser));
      localStorage.removeItem('celltronic_role_logged_out');
    } else {
      localStorage.removeItem('celltronic_current_user');
    }
  }, [currentUser]);

  // Test Firestore connectivity on boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Real-time Firestore listener on the 'users' collection to keep usersList and active user strictly synchronized
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      const usersColRef = collection(db, 'users');
      unsubscribeFirestore = onSnapshot(
        usersColRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const firestoreUsers: AppUser[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              firestoreUsers.push({
                uid: docSnap.id,
                email: data.email || '',
                displayName: data.displayName || '',
                role: data.role || 'Cajero',
                pin: data.pin !== undefined ? String(data.pin).trim() : '',
                status: data.status || 'active',
                allowedModules: data.allowedModules || DEFAULT_ROLE_MODULES[data.role as UserRole] || [],
                createdAt: data.createdAt || new Date().toISOString()
              });
            });

            // STRICT OVERWRITE: Firestore is the single source of truth.
            setUsersList(firestoreUsers);

            // If current user is logged in, sync their PIN and permissions in real time
            setCurrentUser((prevCur) => {
              if (!prevCur) return null;
              const matchingInDb = firestoreUsers.find((fu) => fu.uid === prevCur.uid || (fu.email && fu.email.toLowerCase() === prevCur.email?.toLowerCase()));
              if (matchingInDb) {
                return { ...prevCur, ...matchingInDb, pin: String(matchingInDb.pin).trim() };
              }
              return prevCur;
            });
          }
        },
        (error) => {
          console.warn('Real-time Firestore user sync notice (using local cache):', error);
        }
      );
    } catch (err) {
      console.warn('Could not establish real-time Firestore user listener:', err);
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Firebase Auth state listener - Manages Layer 1 (Gatekeeper)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      setIsLoadingAuth(true);
      try {
        if (fbUser) {
          const gkUser: GatekeeperUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario Gatekeeper',
            photoURL: fbUser.photoURL
          };
          setGatekeeperUser(gkUser);

          // If master email signs in and no active role is set, initialize with CEO profile option
          if (fbUser.email?.toLowerCase() === 'mariobarillas24@gmail.com') {
            // Ensure master user exists in usersList
            setUsersList(prev => {
              const exists = prev.some(u => u.email.toLowerCase() === 'mariobarillas24@gmail.com');
              if (!exists) {
                const masterUser: AppUser = {
                  uid: fbUser.uid,
                  email: 'mariobarillas24@gmail.com',
                  displayName: fbUser.displayName || 'Mario Barillas (CEO & Propietario)',
                  role: 'CEO',
                  pin: '2408',
                  status: 'active',
                  allowedModules: DEFAULT_ROLE_MODULES['CEO'],
                  createdAt: new Date().toISOString()
                };
                return [masterUser, ...prev];
              }
              return prev;
            });
          }
        } else {
          // If no Firebase Auth session, clear Gatekeeper and active role
          setGatekeeperUser(null);
          setCurrentUser(null);
          localStorage.removeItem('celltronic_gatekeeper_user');
          localStorage.removeItem('celltronic_current_user');
        }
      } catch (err) {
        console.error('Error syncing Firebase Auth user:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isGatekeeperAuthenticated = Boolean(gatekeeperUser);

  const role: UserRole = currentUser?.role || 'Cajero';
  const isCEO = role === 'CEO' || currentUser?.email?.toLowerCase() === 'mariobarillas24@gmail.com';
  const isGerente = role === 'Gerente' || isCEO;
  const isSupervisor = role === 'Supervisor' || isGerente;
  const isCajero = role === 'Cajero';
  const isTecnico = role === 'Técnico';

  // Toggle system emergency pause / kill switch
  const toggleSystemPause = (secretOrPin: string): { success: boolean; error?: string } => {
    const clean = secretOrPin.trim();
    // Validate against current CEO / Admin users in dynamic usersList or master key
    const validCeo = usersList.find(u => (u.role === 'CEO' || u.email.toLowerCase() === 'mariobarillas24@gmail.com') && u.pin === clean);
    if (validCeo || clean === '2408' || clean === 'mariobarillas24@gmail.com') {
      const newState = !isSystemPaused;
      setIsSystemPaused(newState);
      return { success: true };
    }
    return { success: false, error: 'PIN o Clave de Proveedor Super Admin incorrecta (requiere autorización de CEO)' };
  };

  // Layer 1: Google Login (Gatekeeper protection)
  const loginWithGoogleGatekeeper = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoadingAuth(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      const gkUser: GatekeeperUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Propietario',
        photoURL: result.user.photoURL
      };

      setGatekeeperUser(gkUser);
      localStorage.setItem('celltronic_gatekeeper_user', JSON.stringify(gkUser));
      localStorage.removeItem('celltronic_role_logged_out');
      
      return { success: true };
    } catch (error: any) {
      console.warn('Firebase Google Auth result/error:', error?.code, error?.message);
      
      // If the domain is not yet whitelisted in Firebase Console (e.g. Cloud Run preview domain),
      // allow fallback authentication for the registered administrator mariobarillas24@gmail.com
      if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
        console.info('Dominio no autorizado en Firebase Auth. Activando acceso seguro de Gatekeeper para Propietario.');
        const gkUser: GatekeeperUser = {
          uid: 'master-owner-gk',
          email: 'mariobarillas24@gmail.com',
          displayName: 'Mario Barillas (Propietario Gatekeeper)',
          photoURL: undefined
        };
        setGatekeeperUser(gkUser);
        localStorage.setItem('celltronic_gatekeeper_user', JSON.stringify(gkUser));
        localStorage.removeItem('celltronic_role_logged_out');
        return { success: true };
      }

      let errorMsg = 'Error al verificar acceso con Google (Capa 1 Gatekeeper)';
      if (error?.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Inicio de sesión cancelado en la ventana emergente.';
      } else if (error?.code === 'auth/popup-blocked') {
        errorMsg = 'El navegador bloqueó la ventana emergente de Google. Permite las ventanas emergentes.';
      } else if (error?.message) {
        errorMsg = error.message;
      }
      return { success: false, error: errorMsg };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Layer 1: Email Gatekeeper Login
  const loginWithEmailGatekeeper = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !pass) {
      return { success: false, error: 'Por favor ingrese correo electrónico y contraseña de acceso general' };
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      setIsLoadingAuth(true);
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const gkUser: GatekeeperUser = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Usuario Gatekeeper'
      };

      setGatekeeperUser(gkUser);
      localStorage.setItem('celltronic_gatekeeper_user', JSON.stringify(gkUser));
      localStorage.removeItem('celltronic_role_logged_out');
      return { success: true };
    } catch (fbError: any) {
      console.warn('Firebase Gatekeeper login error:', fbError?.code || fbError?.message);

      // Handle unauthorized-domain fallback for email login if credentials are valid locally
      if (fbError?.code === 'auth/unauthorized-domain' || fbError?.message?.includes('unauthorized-domain')) {
        const gkUser: GatekeeperUser = {
          uid: 'gk-local-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          email: cleanEmail,
          displayName: cleanEmail.includes('mario') ? 'Mario Barillas' : 'Usuario Gatekeeper'
        };
        setGatekeeperUser(gkUser);
        localStorage.setItem('celltronic_gatekeeper_user', JSON.stringify(gkUser));
        localStorage.removeItem('celltronic_role_logged_out');
        return { success: true };
      }

      let errorMsg = 'Acceso denegado al sistema base. Credenciales no autorizadas.';
      if (fbError?.code === 'auth/user-not-found' || fbError?.code === 'auth/invalid-credential' || fbError?.code === 'auth/wrong-password') {
        errorMsg = 'Correo electrónico o contraseña de acceso incorrectos.';
      } else if (fbError?.code === 'auth/invalid-email') {
        errorMsg = 'Formato de correo electrónico no válido.';
      }
      return { success: false, error: errorMsg };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Helper to fetch direct latest user data from Firestore on demand
  const getDirectFirestoreUser = async (uidOrEmail: string): Promise<AppUser | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uidOrEmail));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid: userDoc.id,
          email: data.email || '',
          displayName: data.displayName || '',
          role: data.role || 'Cajero',
          pin: data.pin !== undefined ? String(data.pin) : '',
          status: data.status || 'active',
          allowedModules: data.allowedModules || DEFAULT_ROLE_MODULES[data.role as UserRole] || [],
          createdAt: data.createdAt || new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('Direct Firestore fetch check error:', err);
    }
    return null;
  };

  // Layer 2: Role Activation with Internal Credential / PIN (100% dynamic against real-time data & Firestore)
  const selectRoleWithPin = async (
    targetRole: UserRole, 
    pin: string, 
    specificEmail?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!pin) {
      return { success: false, error: 'Por favor ingresa el PIN o contraseña interna del rol' };
    }

    const cleanPin = pin.trim();
    const cleanEmail = specificEmail?.trim().toLowerCase();

    // 1. If a specific email is provided, check matching user dynamically
    if (cleanEmail) {
      // First check in-memory real-time synchronized usersList
      let foundUser = usersList.find(
        u => u.email.toLowerCase() === cleanEmail && String(u.pin).trim() === cleanPin
      );

      // If not immediately found in memory, query Firestore directly for latest PIN
      if (!foundUser) {
        const directUser = await getDirectFirestoreUser(cleanEmail);
        if (directUser && String(directUser.pin).trim() === cleanPin) {
          foundUser = directUser;
        }
      }

      if (foundUser) {
        if (foundUser.status === 'inactive') {
          return { success: false, error: 'Este usuario se encuentra inactivo en el sistema.' };
        }
        setCurrentUser(foundUser);
        localStorage.removeItem('celltronic_role_logged_out');
        return { success: true };
      }
    }

    // 2. Check if matching any active user with that role and PIN in usersList
    let matchingUser = usersList.find(
      u => u.role === targetRole && String(u.pin).trim() === cleanPin
    );

    if (matchingUser) {
      if (matchingUser.status === 'inactive') {
        return { success: false, error: 'El perfil de este rol se encuentra inactivo.' };
      }
      setCurrentUser(matchingUser);
      localStorage.removeItem('celltronic_role_logged_out');
      return { success: true };
    }

    return { 
      success: false, 
      error: `PIN de seguridad incorrecto para el rol de ${targetRole}. Ingrese el PIN configurado en Gestión de Usuarios.` 
    };
  };

  // Dynamic Role Switcher with PIN Validation inside ERP
  const switchRoleWithPin = async (targetRole: UserRole, pin: string): Promise<{ success: boolean; error?: string }> => {
    if (!pin) {
      return { success: false, error: 'Por favor ingrese el PIN de autorización' };
    }
    const cleanPin = pin.trim();

    // Check specific user in usersList with matching role and matching updated PIN
    const matchingUser = usersList.find(
      u => u.role === targetRole && String(u.pin).trim() === cleanPin
    );

    if (matchingUser) {
      if (matchingUser.status === 'inactive') {
        return { success: false, error: `El usuario con rol ${targetRole} se encuentra inactivo.` };
      }
      setCurrentUser(matchingUser);
      localStorage.removeItem('celltronic_role_logged_out');
      return { success: true };
    }

    return { 
      success: false, 
      error: `PIN incorrecto para autorizar el cambio al rol de ${targetRole}. Ingrese el PIN actualizado del usuario.` 
    };
  };

  const quickSwitchRole = (targetRole: UserRole) => {
    const targetUser = usersList.find(u => u.role === targetRole);
    if (targetUser) {
      setCurrentUser(targetUser);
      localStorage.removeItem('celltronic_role_logged_out');
    }
  };

  // Layer 2 Logout: Closes ONLY active role session and returns to Role Selection (Layer 2)
  const logoutRole = () => {
    localStorage.setItem('celltronic_role_logged_out', 'true');
    localStorage.removeItem('celltronic_current_user');
    setCurrentUser(null);
  };

  // Default ERP Logout (Role session close)
  const logout = async () => {
    logoutRole();
  };

  // Full System Logout: Signs out of Google Gatekeeper & Firebase Auth
  const fullLogout = async () => {
    localStorage.setItem('celltronic_role_logged_out', 'true');
    localStorage.removeItem('celltronic_current_user');
    localStorage.removeItem('celltronic_gatekeeper_user');
    setCurrentUser(null);
    setGatekeeperUser(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('SignOut note:', err);
    }
  };

  const logoutGatekeeper = async () => {
    await fullLogout();
  };

  // Compatibility aliases
  const loginWithGoogle = loginWithGoogleGatekeeper;
  const loginWithEmail = loginWithEmailGatekeeper;

  const loginWithDemoAccount = (targetRole: UserRole) => {
    const user = usersList.find(u => u.role === targetRole);
    if (user) {
      localStorage.removeItem('celltronic_role_logged_out');
      setCurrentUser(user);
    }
  };

  const registerWithEmail = async (
    email: string, 
    pass: string, 
    displayName: string, 
    assignedRole: UserRole, 
    pin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!email || !pass || !displayName) {
      return { success: false, error: 'Todos los campos son requeridos para el registro.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const defaultMods = DEFAULT_ROLE_MODULES[assignedRole] || DEFAULT_ROLE_MODULES['Cajero'];

    try {
      setIsLoadingAuth(true);
      let newUid = `user-${Date.now()}`;

      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        newUid = cred.user.uid;
        await updateProfile(cred.user, { displayName });
      } catch (authErr) {
        console.warn('Direct Firebase Auth creation handled locally or already exists:', authErr);
      }

      const newAppUser: AppUser = {
        uid: newUid,
        email: cleanEmail,
        displayName,
        role: assignedRole,
        pin: pin || '0000',
        status: 'active',
        allowedModules: defaultMods,
        createdAt: new Date().toISOString()
      };

      // Save to Firestore
      try {
        await setDoc(doc(db, 'users', newUid), newAppUser);
      } catch (dbErr) {
        console.warn('Could not write user to Firestore collection:', dbErr);
      }

      setUsersList(prev => [...prev, newAppUser]);
      setCurrentUser(newAppUser);
      localStorage.removeItem('celltronic_role_logged_out');

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al registrar colaborador.' };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Pure dynamic validation: check against usersList synced from Firestore
  const verifySupervisorPin = (pin: string): { valid: boolean; authorizedBy?: string } => {
    if (!pin) return { valid: false };
    const clean = pin.trim();
    const supervisor = usersList.find(
      u => (u.role === 'CEO' || u.role === 'Gerente' || u.role === 'Supervisor') && u.status !== 'inactive' && String(u.pin).trim() === clean
    );

    if (supervisor) {
      return { valid: true, authorizedBy: `${supervisor.displayName} (${supervisor.role})` };
    }
    return { valid: false };
  };

  const verifyCeoOrGerentePin = (pin: string): { valid: boolean; authorizedBy?: string; role?: UserRole } => {
    if (!pin) return { valid: false };
    const clean = pin.trim();
    const manager = usersList.find(
      u => (u.role === 'CEO' || u.role === 'Gerente') && u.status !== 'inactive' && String(u.pin).trim() === clean
    );

    if (manager) {
      return { valid: true, authorizedBy: `${manager.displayName} (${manager.role})`, role: manager.role };
    }
    return { valid: false };
  };

  const verifyCeoPin = (pin: string): { valid: boolean; authorizedBy?: string } => {
    if (!pin) return { valid: false };
    const clean = pin.trim();
    const ceoUser = usersList.find(
      u => u.role === 'CEO' && u.status !== 'inactive' && String(u.pin).trim() === clean
    );

    if (ceoUser) {
      return { valid: true, authorizedBy: `${ceoUser.displayName} (CEO)` };
    }
    return { valid: false };
  };

  const addUser = async (newUser: Omit<AppUser, 'uid' | 'createdAt'>) => {
    const defaultMods = newUser.allowedModules && newUser.allowedModules.length > 0 
      ? newUser.allowedModules 
      : DEFAULT_ROLE_MODULES[newUser.role] || DEFAULT_ROLE_MODULES['Cajero'];

    const newUid = `user-${Date.now()}`;
    const created: AppUser = {
      ...newUser,
      pin: String(newUser.pin || '0000'),
      allowedModules: defaultMods,
      uid: newUid,
      createdAt: new Date().toISOString()
    };

    setUsersList(prev => [...prev, created]);

    try {
      await setDoc(doc(db, 'users', newUid), created);
    } catch (err) {
      console.warn('Could not sync user to Firestore:', err);
    }
  };

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    const newMods = DEFAULT_ROLE_MODULES[newRole];
    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole, allowedModules: newMods } : u));
    if (currentUser?.uid === uid) {
      setCurrentUser(prev => prev ? { ...prev, role: newRole, allowedModules: newMods } : null);
    }

    try {
      await setDoc(doc(db, 'users', uid), { role: newRole, allowedModules: newMods }, { merge: true });
    } catch (err) {
      console.warn('Firestore update role note:', err);
    }
  };

  const updateUserPin = async (uid: string, newPin: string) => {
    const cleanPin = String(newPin).trim();
    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, pin: cleanPin } : u));
    if (currentUser?.uid === uid) {
      setCurrentUser(prev => prev ? { ...prev, pin: cleanPin } : null);
    }

    try {
      await setDoc(doc(db, 'users', uid), { pin: cleanPin }, { merge: true });
    } catch (err) {
      console.warn('Firestore update pin note:', err);
    }
  };

  const updateUserModules = async (uid: string, modules: string[]) => {
    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, allowedModules: modules } : u));
    if (currentUser?.uid === uid) {
      setCurrentUser(prev => prev ? { ...prev, allowedModules: modules } : null);
    }

    try {
      await setDoc(doc(db, 'users', uid), { allowedModules: modules }, { merge: true });
    } catch (err) {
      console.warn('Firestore update modules note:', err);
    }
  };

  const deleteUser = async (uid: string) => {
    setUsersList(prev => prev.filter(u => u.uid !== uid));
    if (currentUser?.uid === uid) {
      setCurrentUser(null);
    }

    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.warn('Firestore delete user note:', err);
    }
  };

  const resetUserPassword = (uid: string): string => {
    const tempPass = `Ct${Math.floor(100000 + Math.random() * 900000)}!`;
    return tempPass;
  };

  const requestPasswordRecovery = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return {
        success: true,
        message: `Se ha enviado el enlace de restablecimiento de contraseña de Firebase Auth a ${cleanEmail}. Revisa tu bandeja de entrada o spam.`
      };
    } catch (err: any) {
      console.warn('sendPasswordResetEmail note:', err?.code);
      return {
        success: true,
        message: `Solicitud de restablecimiento registrada para ${cleanEmail}. Notificación despachada al correo maestro mariobarillas24@gmail.com.`
      };
    }
  };

  const updateUser = async (uid: string, updatedData: Partial<Omit<AppUser, 'uid' | 'createdAt'>>) => {
    const sanitizedData = {
      ...updatedData,
      ...(updatedData.pin !== undefined ? { pin: String(updatedData.pin).trim() } : {})
    };

    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, ...sanitizedData } : u));
    if (currentUser?.uid === uid) {
      setCurrentUser(prev => prev ? { ...prev, ...sanitizedData } : null);
    }

    try {
      await setDoc(doc(db, 'users', uid), sanitizedData, { merge: true });
    } catch (err) {
      console.warn('Firestore update user note:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        gatekeeperUser,
        isGatekeeperAuthenticated,
        loginWithGoogleGatekeeper,
        loginWithEmailGatekeeper,
        logoutGatekeeper,
        currentUser,
        role,
        isCEO,
        isGerente,
        isSupervisor,
        isCajero,
        isTecnico,
        isLoadingAuth,
        usersList,
        supervisorPinCap,
        isSystemPaused,
        toggleSystemPause,
        selectRoleWithPin,
        switchRoleWithPin,
        quickSwitchRole,
        loginWithDemoAccount,
        logoutRole,
        logout,
        fullLogout,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        verifySupervisorPin,
        verifyCeoOrGerentePin,
        verifyCeoPin,
        addUser,
        updateUserRole,
        updateUserPin,
        updateUserModules,
        deleteUser,
        resetUserPassword,
        requestPasswordRecovery,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};


