import React, { useState } from 'react';
import { ShieldAlert, Lock, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SystemPauseOverlay: React.FC = () => {
  const { toggleSystemPause } = useAuth();
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const res = toggleSystemPause(pinInput);
    if (!res.success) {
      setErrorMsg(res.error || 'PIN o Clave de Proveedor incorrecta');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 text-slate-100">
      <div className="bg-slate-900 border-2 border-red-500/50 rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95">
        
        {/* Urgent Icon */}
        <div className="w-20 h-20 rounded-3xl bg-red-500/20 text-red-500 flex items-center justify-center border-2 border-red-500/40 mx-auto shadow-lg shadow-red-500/20 animate-pulse">
          <ShieldAlert className="w-10 h-10" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" /> Kill Switch Activo
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            ACCESO AL SISTEMA PAUSADO
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            El servicio CELLTRONIC ERP/CRM ha sido pausado temporalmente por el Administrador General / Proveedor de Sistemas (<span className="text-amber-400 font-mono font-bold">mariobarillas24@gmail.com</span>) por mantenimiento o seguridad.
          </p>
        </div>

        {/* Status Info Box */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-left text-xs space-y-1 font-mono text-slate-400">
          <div className="flex justify-between text-slate-300 font-bold">
            <span>Estado:</span>
            <span className="text-red-400 font-bold">BLOQUEADO / PAUSADO</span>
          </div>
          <div className="flex justify-between">
            <span>Autorización requerida:</span>
            <span className="text-slate-200">mariobarillas24@gmail.com</span>
          </div>
          <div className="flex justify-between">
            <span>Modo de Emergencia:</span>
            <span className="text-amber-400">Kill Switch Activo</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-3 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Ingrese PIN de Proveedor / Super Admin (o clave CEO) para reactivar:
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN Maestro o clave mariobarillas24@gmail.com"
                autoFocus
                required
                className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-700 rounded-xl text-center text-white text-base font-mono tracking-widest focus:outline-none focus:border-amber-500"
              />
              <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <CheckCircle2 className="w-5 h-5" /> DESBLOQUEAR Y RESTAURAR SISTEMA
          </button>
        </form>

        <p className="text-[10px] text-slate-500 font-mono">
          CELLTRONIC Security Protocol • Proveedor: Barillas-Servicios IT (mariobarillas24@gmail.com)
        </p>

      </div>
    </div>
  );
};
