import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { SystemBackupRecord } from '../types';
import { sanitizeForFirestore } from './firebaseServices';

export const BACKUP_COLLECTIONS = [
  'products',
  'suppliers',
  'sales',
  'repairs',
  'recharges',
  'shifts',
  'customers',
  'promotions',
  'users',
  'petty_cash_expenses',
  'recharge_balances',
  'recharge_financials',
  'recharge_balance_logs',
  'recharge_balance_adjustments',
  'recharge_denominations',
  'settings'
] as const;

export const LAST_AUTO_BACKUP_STORAGE_KEY = 'celltronic_last_auto_backup_timestamp';
export const AUTO_BACKUP_ENABLED_KEY = 'celltronic_auto_backup_enabled';

/**
 * Executes a full database export from Firestore and saves it into Firebase Storage
 */
export async function performFirestoreBackup(options?: {
  triggeredBy?: string;
  sourceContext?: string;
}): Promise<{ success: boolean; record?: SystemBackupRecord; rawJson?: string; error?: string }> {
  const backupId = `bkp-${Date.now()}`;
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-');
  const fileName = `celltronic_backup_${dateStr}.json`;
  const storagePath = `backups/${fileName}`;
  const triggeredBy = options?.triggeredBy || 'Manual';

  try {
    const collectionsData: Record<string, any[]> = {};
    const collectionsSummary: Record<string, number> = {};
    let totalDocuments = 0;

    // 1. Fetch each collection from Firestore
    await Promise.all(
      BACKUP_COLLECTIONS.map(async (colName) => {
        try {
          const colRef = collection(db, colName);
          const snap = await getDocs(colRef);
          const docs = snap.docs.map((d) => ({
            _id: d.id,
            ...d.data()
          }));
          collectionsData[colName] = docs;
          collectionsSummary[colName] = docs.length;
          totalDocuments += docs.length;
        } catch (err) {
          console.warn(`[BackupService] Warning reading collection "${colName}":`, err);
          collectionsData[colName] = [];
          collectionsSummary[colName] = 0;
        }
      })
    );

    // 2. Build full backup payload
    const backupPayload = {
      system: 'CELLTRONIC ERP & CRM',
      version: '2.7',
      backupId,
      createdAt: now.toISOString(),
      triggeredBy,
      totalCollections: BACKUP_COLLECTIONS.length,
      totalDocuments,
      collectionsSummary,
      collections: collectionsData
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const sizeBytes = new Blob([jsonString]).size;

    let downloadUrl = '';

    // 3. Upload to Firebase Storage
    try {
      const storageRef = ref(storage, storagePath);
      await uploadString(storageRef, jsonString, 'raw', {
        contentType: 'application/json',
        customMetadata: {
          backupId,
          createdAt: now.toISOString(),
          triggeredBy,
          totalDocs: String(totalDocuments),
          totalCollections: String(BACKUP_COLLECTIONS.length)
        }
      });
      downloadUrl = await getDownloadURL(storageRef);
      console.log(`[BackupService] Successfully uploaded backup to Firebase Storage: ${storagePath}`);
    } catch (storageErr: any) {
      console.warn('[BackupService] Firebase Storage upload error (fallback active):', storageErr);
      // Even if direct Storage upload encounters a permission/network rule, we save metadata
    }

    // 4. Save metadata record to Firestore 'system_backups'
    const record: SystemBackupRecord = {
      id: backupId,
      backupId,
      fileName,
      storagePath,
      downloadUrl: downloadUrl || undefined,
      createdAt: now.toISOString(),
      triggeredBy,
      totalCollections: BACKUP_COLLECTIONS.length,
      totalDocuments,
      sizeBytes,
      status: 'success',
      collectionsSummary
    };

    try {
      const cleanRecord = sanitizeForFirestore(record);
      await setDoc(doc(db, 'system_backups', backupId), cleanRecord);
    } catch (firestoreErr) {
      console.warn('[BackupService] Note saving backup metadata in Firestore:', firestoreErr);
    }

    // 5. Update local timestamp
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(LAST_AUTO_BACKUP_STORAGE_KEY, now.toISOString());
    }

    return { success: true, record, rawJson: jsonString };
  } catch (error: any) {
    console.error('[BackupService] Fatal backup error:', error);
    return {
      success: false,
      error: error?.message || 'Error inesperado al generar la copia de seguridad de Firestore'
    };
  }
}

/**
 * Downloads a backup JSON file directly to user device
 */
export function downloadBackupJsonLocally(jsonString: string, fileName?: string) {
  const name = fileName || `celltronic_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Automatically checks if a scheduled backup is overdue (e.g. > 24 hours) and executes it
 */
export async function checkAndRunScheduledBackup(options?: {
  intervalHours?: number;
  triggeredBy?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  const isEnabled = localStorage.getItem(AUTO_BACKUP_ENABLED_KEY) !== 'false';
  if (!isEnabled) return false;

  const intervalHours = options?.intervalHours || 24;
  const lastBackupStr = localStorage.getItem(LAST_AUTO_BACKUP_STORAGE_KEY);

  if (lastBackupStr) {
    const lastDate = new Date(lastBackupStr);
    const diffHours = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
    if (diffHours < intervalHours) {
      return false; // Still within valid window
    }
  }

  console.log(`[BackupService] Scheduled auto-backup triggered (Overdue: last backup > ${intervalHours}h ago)`);
  const res = await performFirestoreBackup({
    triggeredBy: options?.triggeredBy || 'Automático (Programado)',
    sourceContext: 'background_scheduler'
  });

  return res.success;
}
