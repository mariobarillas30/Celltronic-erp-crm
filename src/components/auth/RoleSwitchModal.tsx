import React, { useState } from 'react';
import { 
  X, 
  KeyRound, 
  Crown, 
  ShieldCheck, 
  ShoppingBag, 
  Wrench, 
  AlertCircle, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface RoleSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES: { role: UserRole; title: string; hint: string; icon: React.ElementType; color: string }[] = [
  { role: 'CEO', title: 'CEO / Propietario', hint: 'PIN de CEO', icon: Crown, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { role: 'Supervisor', title: 'Supervisor / Gerente', hint: 'PIN de Supervisor', icon: ShieldCheck, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { role: 'Cajero', title: 'Cajero / POS', hint: 'PIN de Cajero', icon: ShoppingBag, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  { role: 'Técnico', title: 'Técnico Taller', hint: 'PIN de Técnico', icon: Wrench, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
];

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({ isOpen, onClose }) => {
  const { role: currentRole, switchRoleWithPin } = useAuth();
  const [targetRole, setTargetRole] = useState<UserRole>(currentRole);
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setErrorMessage('Ingresa el PIN de autorización para cambiar de rol');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await switchRoleWithPin(targetRole, pin);
    setIsSubmitting(false);

    if (result.success) {
      setPin('');
      onClose();
    } else {
      setErrorMessage(result.error || 'PIN incorrecto para autorizar este rol.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Cambiar Rol Operativo</h3>
            <p className="text-xs text-slate-400">
              Rol actual: <strong className="text-cyan-400">{currentRole}</strong>
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              1. Selecciona el nuevo rol
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {ROLES.map((r) => {
                const isSelected = targetRole === r.role;
                const Icon = r.icon;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => {
                      setTargetRole(r.role);
                      setErrorMessage(null);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-slate-950 shadow-md'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${r.color} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-white truncate">{r.role}</h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{r.hint}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              2. Introduce el PIN de autorización ({targetRole})
            </label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                maxLength={8}
                autoFocus
                className="w-full text-center tracking-[0.3em] font-mono text-xl py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <KeyRound className="w-4 h-4 text-slate-600 absolute left-4 top-4" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !pin}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Autorizar y Cambiar Rol</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
