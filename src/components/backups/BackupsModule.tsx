import React, { useState, useEffect } from 'react';
import { 
  CloudUpload, 
  Download, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  HardDrive, 
  Calendar, 
  FileText, 
  Server, 
  Settings, 
  ToggleLeft, 
  ToggleRight,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  performFirestoreBackup, 
  downloadBackupJsonLocally, 
  BACKUP_COLLECTIONS,
  LAST_AUTO_BACKUP_STORAGE_KEY,
  AUTO_BACKUP_ENABLED_KEY 
} from '../../lib/backupService';
import { SystemBackupRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const BackupsModule: React.FC = () => {
  const { currentUser, role, isCEO } = useAuth();
  const [backups, setBackups] = useState<SystemBackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoEnabled, setIsAutoEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(AUTO_BACKUP_ENABLED_KEY) !== 'false';
    }
    return true;
  });
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(LAST_AUTO_BACKUP_STORAGE_KEY);
    }
    return null;
  });
  const [lastExportedJson, setLastExportedJson] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Subscribe to real-time backup history from Firestore 'system_backups'
  useEffect(() => {
    try {
      const q = query(collection(db, 'system_backups'), orderBy('createdAt', 'desc'), limit(30));
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: SystemBackupRecord[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as SystemBackupRecord)
          }));
          setBackups(list);
          if (list.length > 0 && !lastBackupTime) {
            setLastBackupTime(list[0].createdAt);
          }
        },
        (err) => {
          console.warn('[BackupsModule] Real-time backup listener note:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('[BackupsModule] Error subscribing to system_backups:', e);
    }
  }, []);

  const handleToggleAutoBackup = () => {
    const nextState = !isAutoEnabled;
    setIsAutoEnabled(nextState);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(AUTO_BACKUP_ENABLED_KEY, String(nextState));
    }
    setStatusMessage({
      type: 'info',
      text: nextState
        ? 'Backup Automático activado: Se ejecutará periódicamente y al cierre de turnos.'
        : 'Backup Automático pausado: Solo se generarán copias manuales.'
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleRunManualBackup = async () => {
    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Extrayendo colecciones de Firestore y empaquetando JSON...' });

    try {
      const res = await performFirestoreBackup({
        triggeredBy: currentUser?.displayName ? `${currentUser.displayName} (${role})` : `CEO (${role})`,
        sourceContext: 'manual_ui_trigger'
      });

      if (res.success && res.record) {
        setLastBackupTime(res.record.createdAt);
        if (res.rawJson) {
          setLastExportedJson(res.rawJson);
        }
        setStatusMessage({
          type: 'success',
          text: `¡Backup completado con éxito! Se respaldaron ${res.record.totalDocuments} documentos en ${res.record.totalCollections} colecciones y se guardó en Firebase Storage.`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Ocurrió un error al procesar el respaldo.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error inesperado durante la ejecución del backup.'
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(null), 7000);
    }
  };

  const handleDownloadLatestJson = () => {
    if (lastExportedJson) {
      downloadBackupJsonLocally(lastExportedJson);
    } else if (backups.length > 0 && backups[0].downloadUrl) {
      window.open(backups[0].downloadUrl, '_blank');
    } else {
      // Trigger a quick backup to download immediately
      handleRunManualBackup();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-5 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
            <CloudUpload className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white tracking-wide">
                Respaldos en la Nube (Firebase Storage)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Firestore Consistente
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Exportación íntegra en formato JSON de todas las colecciones del sistema alojadas directamente en tu bucket de Firebase Storage.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleToggleAutoBackup}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
              isAutoEnabled
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Activar o pausar la ejecución automática periódica"
          >
            {isAutoEnabled ? (
              <>
                <ToggleRight className="w-5 h-5 text-emerald-400" />
                <span>Auto-Backup: ACTIVO</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-slate-500" />
                <span>Auto-Backup: PAUSADO</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleRunManualBackup}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-600/20 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Generando Copia...' : 'Generar Backup Ahora'}</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all shadow-md ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-red-950/60 border-red-500/40 text-red-300'
              : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
          {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Metrics & Architecture Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Storage Target */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              Destino en la Nube
            </span>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded font-mono">
              Firebase Storage
            </span>
          </div>
          <p className="text-sm font-bold text-white truncate" title="celltronic-erp.firebasestorage.app">
            celltronic-erp
          </p>
          <p className="text-[10px] text-slate-500 truncate">
            Directorio: /backups/*.json
          </p>
        </div>

        {/* Card 2: Last Backup */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Último Respaldo
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded">
              {lastBackupTime ? 'Registrado' : 'Pendiente'}
            </span>
          </div>
          <p className="text-sm font-bold text-white">
            {lastBackupTime ? new Date(lastBackupTime).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Sin registros'}
          </p>
          <p className="text-[10px] text-slate-500">
            {lastBackupTime ? new Date(lastBackupTime).toLocaleDateString('es-SV') : 'Ejecuta tu primer respaldo'}
          </p>
        </div>

        {/* Card 3: Scope */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Alcance de Colecciones
            </span>
            <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.2 rounded font-mono">
              100% Total
            </span>
          </div>
          <p className="text-sm font-bold text-white">
            {BACKUP_COLLECTIONS.length} Colecciones
          </p>
          <p className="text-[10px] text-slate-500">
            Ventas, Clientes, Inventario, Caja, etc.
          </p>
        </div>

        {/* Card 4: Local Download */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              Copia Local en PC
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded">
              Descarga JSON
            </span>
          </div>
          <button
            type="button"
            onClick={handleDownloadLatestJson}
            className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700 hover:border-slate-600 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Descargar JSON</span>
          </button>
        </div>
      </div>

      {/* Collections Covered Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Colecciones Respaldadas en Cada Exportación</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Formato: JSON UTF-8</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {BACKUP_COLLECTIONS.map((col) => (
            <div
              key={col}
              className="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 shadow-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>{col}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Backups History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Historial de Copias de Seguridad Generadas
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Registro histórico de copias sincronizadas en Firebase Storage disponibles para auditoría y restauración.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300">
            {backups.length} {backups.length === 1 ? 'copia' : 'copias'}
          </span>
        </div>

        {backups.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl space-y-3">
            <CloudUpload className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">
              Aún no se han generado copias de seguridad en el sistema.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Haz clic en el botón <strong>"Generar Backup Ahora"</strong> para realizar la primera exportación de todas las colecciones a Firebase Storage.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Nombre del Archivo</th>
                  <th className="py-2.5 px-3 text-center">Documentos</th>
                  <th className="py-2.5 px-3 text-center">Tamaño</th>
                  <th className="py-2.5 px-3">Disparador</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {backups.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                      <div>
                        {new Date(item.createdAt).toLocaleDateString('es-SV', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString('es-SV')}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-cyan-300 max-w-xs truncate" title={item.fileName}>
                      {item.fileName}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-white font-mono">
                      {item.totalDocuments.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300 font-mono">
                      {formatFileSize(item.sizeBytes)}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {item.triggeredBy || 'Automático'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" /> Exitoso
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.downloadUrl ? (
                        <a
                          href={item.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-white rounded-lg text-[11px] font-bold border border-cyan-500/30 transition-all cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> Descargar
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">Almacenado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
