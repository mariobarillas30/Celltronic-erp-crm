import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  UserCheck, 
  ArrowRight, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ShoppingBag, 
  Wrench, 
  Crown, 
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { CelltronicLogo } from '../common/CelltronicLogo';

interface RoleOption {
  role: UserRole;
  title: string;
  subtitle: string;
  defaultEmail: string;
  icon: React.ElementType;
  accentColor: string;
  badgeColor: string;
  description: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'CEO',
    title: 'CEO / Dueño del Sistema',
    subtitle: 'Administración & Control Total',
    defaultEmail: 'ceo@celltronic.com',
    icon: Crown,
    accentColor: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 hover:border-amber-500/60 text-amber-400',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Acceso irrestricto a finanzas, costos reales, márgenes de ganancia, compras, usuarios y configuración.'
  },
  {
    role: 'Supervisor',
    title: 'Supervisor / Gerente',
    subtitle: 'Auditoría & Aprobaciones',
    defaultEmail: 'supervisor@celltronic.com',
    icon: ShieldCheck,
    accentColor: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 hover:border-purple-500/60 text-purple-400',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Autorización de descuentos, control de inventario, auditoría de cajas y supervisión de sucursal.'
  },
  {
    role: 'Cajero',
    title: 'Cajero / Punto de Venta',
    subtitle: 'Operación POS & Facturación',
    defaultEmail: 'cajero@celltronic.com',
    icon: ShoppingBag,
    accentColor: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    description: 'Ventas de mostrador, cobros, emisión de comprobantes y recepción de equipos (sin visibilidad de márgenes).'
  },
  {
    role: 'Técnico',
    title: 'Técnico Especialista',
    subtitle: 'Taller & Reparaciones',
    defaultEmail: 'tecnico@celltronic.com',
    icon: Wrench,
    accentColor: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'Órdenes de servicio técnico, cambios de estado, diagnósticos guiados por IA y solicitud de repuestos.'
  }
];

export const RoleSelectionScreen: React.FC = () => {
  const { 
    gatekeeperUser, 
    logoutGatekeeper, 
    selectRoleWithPin, 
    usersList 
  } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [pin, setPin] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [customUserMode, setCustomUserMode] = useState(false);

  const handleRoleCardClick = (option: RoleOption) => {
    setSelectedRole(option.role);
    setCustomEmail(option.defaultEmail);
    setPin('');
    setErrorMessage(null);
  };

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedRole) {
      setErrorMessage('Por favor selecciona un rol primero.');
      return;
    }
    if (!pin) {
      setErrorMessage('Por favor introduce el PIN o contraseña interna del rol.');
      return;
    }

    setErrorMessage(null);
    setIsAuthenticating(true);

    const result = await selectRoleWithPin(selectedRole, pin, customEmail);
    setIsAuthenticating(false);

    if (!result.success) {
      setErrorMessage(result.error || 'PIN incorrecto. Intenta de nuevo.');
      setPin('');
    }
  };

  const handleKeypadPress = (val: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + val);
      setErrorMessage(null);
    }
  };

  const handleKeypadBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setPin('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-10 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header with Gatekeeper Session Info */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <CelltronicLogo size="sm" variant="emblem" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg sm:text-xl tracking-tight text-white font-sans">CELLTRONIC</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30">
                Capa 2: Roles
              </span>
            </div>
            <p className="text-xs text-slate-400">Servicio Técnico Profesional • Terminal de Roles</p>
          </div>
        </div>

        {/* Gatekeeper Status & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium truncate max-w-[200px]">
              Gatekeeper: <strong className="text-white">{gatekeeperUser?.displayName || gatekeeperUser?.email || 'Propietario'}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={logoutGatekeeper}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Cerrar sesión de Google / Gatekeeper"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Salir de Gatekeeper</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-center">
        
        {/* Title Section */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3 uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Selección de Rol Operativo</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            ¿Quién va a operar en esta estación?
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Selecciona el rol con el que vas a trabajar e introduce tu PIN interno o contraseña de autorización.
          </p>
        </div>

        {/* Role Cards & PIN Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Role Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROLE_OPTIONS.map((opt) => {
              const isCurrentSelected = selectedRole === opt.role;
              const IconComponent = opt.icon;

              return (
                <div
                  key={opt.role}
                  id={`role-card-${opt.role.toLowerCase()}`}
                  onClick={() => handleRoleCardClick(opt)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer bg-gradient-to-br backdrop-blur-sm relative overflow-hidden group ${
                    isCurrentSelected
                      ? 'border-cyan-400 ring-2 ring-cyan-500/30 shadow-xl shadow-cyan-500/10 bg-slate-900'
                      : `${opt.accentColor} bg-slate-900/60`
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${opt.badgeColor} border`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${opt.badgeColor}`}>
                      {opt.role}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {opt.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mb-2.5">
                    {opt.subtitle}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    {opt.description}
                  </p>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] text-slate-400">
                      PIN Requerido
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                      {isCurrentSelected ? 'Seleccionado' : 'Seleccionar'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: PIN Authorization Pad / Form */}
          <div className="lg:col-span-5 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl">
            {selectedRole ? (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Validar Rol: {selectedRole}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">{customEmail}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomUserMode(!customUserMode)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  >
                    {customUserMode ? 'Rol Rápido' : 'Usuario Específico'}
                  </button>
                </div>

                {errorMessage && (
                  <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="font-medium">{errorMessage}</span>
                  </div>
                )}

                {customUserMode && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Correo Interno de Usuario
                    </label>
                    <select
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      {usersList
                        .filter(u => u.role === selectedRole)
                        .map(u => (
                          <option key={u.uid} value={u.email}>
                            {u.displayName} ({u.email})
                          </option>
                        ))}
                      <option value={`${selectedRole.toLowerCase()}@celltronic.com`}>
                        {selectedRole.toLowerCase()}@celltronic.com (Por Defecto)
                      </option>
                    </select>
                  </div>
                )}

                {/* PIN Input Display */}
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        PIN / Contraseña de Acceso Interno
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPin ? 'Ocultar' : 'Mostrar'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="••••"
                        maxLength={10}
                        autoFocus
                        className="w-full text-center tracking-[0.3em] font-mono text-xl sm:text-2xl py-3 bg-slate-950 border-2 border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                      <KeyRound className="w-5 h-5 text-slate-600 absolute left-4 top-4" />
                    </div>
                  </div>

                  {/* Touchscreen PIN Keypad for quick POS / Tablet operation */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          if (k === 'C') handleKeypadClear();
                          else if (k === '⌫') handleKeypadBackspace();
                          else handleKeypadPress(k);
                        }}
                        className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800/80 text-white font-bold text-base transition-colors active:scale-95 cursor-pointer"
                      >
                        {k}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthenticating || !pin}
                    className="w-full py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {isAuthenticating ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Activar Rol {selectedRole}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-center py-12 px-4 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
                  <UserCheck className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Selecciona una estación a la izquierda
                </h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Haz clic en CEO, Supervisor, Cajero o Técnico para ingresar tu PIN y desbloquear los módulos asignados.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-center text-xs text-slate-400 border-t border-slate-800/80 gap-2 text-center">
        <div className="font-medium text-slate-300">
          CELLTRONIC ERP v2.7 • Doble Capa de Seguridad (Gatekeeper + PIN)
        </div>
      </footer>
    </div>
  );
};
