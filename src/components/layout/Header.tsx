import React, { useState } from 'react';
import { 
  Menu, 
  LogOut, 
  Sparkles, 
  ChevronDown,
  UserCheck,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { CelltronicLogo } from '../common/CelltronicLogo';
import { RoleSwitchModal } from '../auth/RoleSwitchModal';

interface HeaderProps {
  activeTab: string;
  onToggleSidebar: () => void;
  onOpenAIAssistant: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleSidebar,
  onOpenAIAssistant
}) => {
  const { 
    currentUser, 
    gatekeeperUser,
    role, 
    isCEO, 
    logoutRole, 
    fullLogout 
  } = useAuth();
  
  // User Profile Menu Dropdown
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);

  const getModuleTitle = () => {
    switch (activeTab) {
      case 'pos': return 'Caja y Punto de Venta (POS)';
      case 'arqueo': return 'Arqueo & Cierre de Caja';
      case 'inventory': return 'Gestión de Inventario y Proveedores';
      case 'repairs': return 'Taller Técnico y Recepción de Reparaciones';
      case 'customers': return 'Clientes & CRM Fidelización';
      case 'recharges': return 'Venta de Recargas (Cuadre Dual)';
      case 'promotions': return 'Campañas, Promociones y Descuentos';
      case 'kpis': return 'Dashboard Analítico y KPIs';
      case 'petty_cash': return 'Caja Chica & Fondo de Reserva (CEO)';
      case 'users': return 'Administración de Usuarios y Permisos';
      default: return 'CELLTRONIC ERP';
    }
  };

  const getModuleShortTitle = () => {
    switch (activeTab) {
      case 'pos': return 'POS';
      case 'arqueo': return 'Caja';
      case 'inventory': return 'Inventario';
      case 'repairs': return 'Taller';
      case 'customers': return 'CRM';
      case 'recharges': return 'Recargas';
      case 'promotions': return 'Promos';
      case 'kpis': return 'KPIs';
      case 'petty_cash': return 'Caja Chica';
      case 'users': return 'Usuarios';
      default: return 'CELLTRONIC';
    }
  };

  const getRoleBadgeClasses = (userRole: UserRole) => {
    switch (userRole) {
      case 'CEO': return 'bg-amber-500 text-slate-950 border-amber-600';
      case 'Gerente': return 'bg-cyan-600 text-white border-cyan-700';
      case 'Supervisor': return 'bg-indigo-600 text-white border-indigo-700';
      case 'Técnico': return 'bg-purple-600 text-white border-purple-700';
      case 'Cajero':
      default: return 'bg-emerald-600 text-white border-emerald-700';
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between text-slate-800 sticky top-0 z-30 shadow-xs max-w-full">
        {/* Mobile Hamburger & Page Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden focus:outline-hidden shrink-0 cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Celltronic Brand Logo Emblem in Header */}
          <div className="flex items-center gap-2 shrink-0">
            <CelltronicLogo size="xs" variant="emblem" className="w-8 h-8 rounded-lg" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 tracking-tight truncate">
                <span className="sm:hidden">{getModuleShortTitle()}</span>
                <span className="hidden sm:inline">{getModuleTitle()}</span>
              </h2>
              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded-full uppercase tracking-wider hidden lg:inline-flex items-center gap-1 shrink-0 border border-cyan-200">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                Gatekeeper Activo
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block truncate">
              Sucursal Central • CELLTRONIC Servicio Técnico Profesional
            </p>
          </div>
        </div>

        {/* Header Actions: Switch Role, AI Assistant & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Fast Role Switch Trigger */}
          <button
            onClick={() => setShowRoleSwitchModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Cambiar rol operativo con PIN"
          >
            <UserCheck className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
            <span className="hidden md:inline">Cambiar Rol</span>
          </button>

          {/* Gemini AI Trigger */}
          <button
            onClick={onOpenAIAssistant}
            className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
            title="Consultar Asistente IA Diagnóstico"
          >
            <Sparkles className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-purple-600 shrink-0" />
            <span className="hidden sm:inline ml-1.5">Asistente IA</span>
          </button>

          {/* User Account / Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                isCEO ? 'bg-amber-500 text-slate-950' :
                role === 'Supervisor' ? 'bg-indigo-600 text-white' :
                role === 'Gerente' ? 'bg-cyan-600 text-white' :
                role === 'Técnico' ? 'bg-purple-600 text-white' :
                'bg-emerald-600 text-white'
              }`}>
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {currentUser?.displayName || 'Usuario'}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold">
                  {role}
                </p>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3 space-y-3 text-slate-800 animate-scaleUp">
                {/* Active Role Card */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isCEO ? 'bg-amber-500 text-slate-950' : 'bg-cyan-600 text-white'
                    }`}>
                      {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {currentUser?.displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentUser?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px]">
                    <span className="font-semibold text-slate-500">Rol Operativo:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold border ${getRoleBadgeClasses(role)}`}>
                      {role}
                    </span>
                  </div>
                </div>

                {/* Gatekeeper Status Indicator */}
                <div className="p-2.5 bg-cyan-50/70 border border-cyan-100 rounded-xl text-[11px] text-cyan-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-bold truncate">Gatekeeper: {gatekeeperUser?.displayName || gatekeeperUser?.email || 'Propietario'}</p>
                    <p className="text-[10px] text-cyan-700">Enlace de aplicación protegido</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowRoleSwitchModal(true);
                    }}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200"
                  >
                    <UserCheck className="w-4 h-4 text-cyan-600" />
                    <span>Cambiar Rol con PIN</span>
                  </button>

                  {/* Independent Role Logout (Layer 2) */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logoutRole();
                    }}
                    className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-amber-200"
                  >
                    <LogOut className="w-4 h-4 text-amber-600" />
                    <span>Cerrar Sesión del Rol</span>
                  </button>

                  {/* Full Gatekeeper Sign Out (Layer 1) */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      fullLogout();
                    }}
                    className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-rose-200"
                  >
                    <Lock className="w-4 h-4 text-rose-500" />
                    <span>Salir de Gatekeeper (Google)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Role Logout Button */}
          <button
            onClick={logoutRole}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200 text-xs font-semibold cursor-pointer"
            title="Cerrar sesión de rol (mantener Gatekeeper)"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">Cerrar Rol</span>
          </button>
        </div>
      </header>

      {/* Role Switcher Modal */}
      <RoleSwitchModal
        isOpen={showRoleSwitchModal}
        onClose={() => setShowRoleSwitchModal(false)}
      />
    </>
  );
};


