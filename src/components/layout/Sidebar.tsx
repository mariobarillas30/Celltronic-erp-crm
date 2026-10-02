import React from 'react';
import { 
  ShoppingCart, 
  Package, 
  Wrench, 
  SmartphoneCharging, 
  Tag, 
  BarChart3, 
  Users, 
  UserCheck,
  Bot, 
  X,
  ShieldCheck,
  Calculator,
  Wallet,
  Shield,
  Layers,
  CloudUpload
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { CelltronicLogo } from '../common/CelltronicLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenAIAssistant: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  onOpenAIAssistant
}) => {
  const { role, isCEO, currentUser } = useAuth();

  const navItems = [
    { id: 'pos', label: 'Ventas (POS)', icon: ShoppingCart },
    { id: 'arqueo', label: 'Arqueo & Cierre de Caja', icon: Calculator },
    { id: 'inventory', label: 'Inventario & Proveedores', icon: Package },
    { id: 'repairs', label: 'Taller / Reparaciones', icon: Wrench },
    { id: 'customers', label: 'Clientes / CRM', icon: UserCheck },
    { id: 'recharges', label: 'Recargas (Cuadre Dual)', icon: SmartphoneCharging },
    { id: 'promotions', label: 'Promociones & Descuentos', icon: Tag },
    { id: 'kpis', label: 'Dashboard KPIs', icon: BarChart3 },
    { id: 'petty_cash', label: 'Caja Chica & Reserva (CEO)', icon: Wallet },
    { id: 'users', label: 'Gestión Usuarios & Permisos', icon: Users },
    { id: 'backups', label: 'Copias de Seguridad (Cloud)', icon: CloudUpload },
  ];

  // Dynamic Filtering: If user has explicit allowedModules defined, respect those in real-time
  const allowedModulesList = currentUser?.allowedModules || (
    isCEO ? ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges', 'promotions', 'kpis', 'petty_cash', 'users', 'backups'] :
    role === 'Gerente' || role === 'Supervisor' ? ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges', 'promotions', 'kpis', 'backups'] :
    role === 'Técnico' ? ['repairs', 'inventory', 'customers'] :
    ['pos', 'arqueo', 'inventory', 'repairs', 'customers', 'recharges']
  );

  const allowedNavItems = navItems.filter(item => {
    if (item.id === 'petty_cash') {
      return isCEO || allowedModulesList.includes('petty_cash');
    }
    if (item.id === 'users') {
      return isCEO || allowedModulesList.includes('users');
    }
    if (item.id === 'backups') {
      return isCEO || allowedModulesList.includes('backups');
    }
    return allowedModulesList.includes(item.id);
  });

  const getRoleTheme = (userRole: UserRole) => {
    switch (userRole) {
      case 'CEO': 
        return {
          badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          text: 'text-amber-400',
          icon: ShieldCheck
        };
      case 'Gerente':
        return {
          badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
          text: 'text-cyan-400',
          icon: Shield
        };
      case 'Supervisor':
        return {
          badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
          text: 'text-indigo-400',
          icon: Users
        };
      case 'Técnico':
        return {
          badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          text: 'text-purple-400',
          icon: Wrench
        };
      case 'Cajero':
      default:
        return {
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          text: 'text-emerald-400',
          icon: ShoppingCart
        };
    }
  };

  const roleTheme = getRoleTheme(role);
  const RoleIcon = roleTheme.icon;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 text-slate-100 flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <CelltronicLogo variant="sidebar" />
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Role Pill */}
        <div className="px-3.5 py-2.5 bg-slate-950/80 mx-3 my-2 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border ${roleTheme.badge} shrink-0`}>
              <RoleIcon className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{currentUser?.displayName || 'Usuario'}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Rol: <span className={roleTheme.text}>{role}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {allowedNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white rounded-lg font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Gemini AI Assistant Button & Footer */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <button
            onClick={onOpenAIAssistant}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/40 hover:to-blue-600/40 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-200 transition-all shadow-xs cursor-pointer"
          >
            <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>Asistente IA Diagnóstico</span>
          </button>

          <div className="text-[10px] text-center text-slate-500 py-1 font-mono">
            CELLTRONIC v2.7 • Barillas IT Services
          </div>
        </div>
      </aside>
    </>
  );
};
