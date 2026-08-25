import React, { useState } from 'react';
import { 
  Users, 
  Shield, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  UserCheck, 
  X, 
  Lock, 
  Eye, 
  EyeOff, 
  Pencil, 
  Power, 
  ShieldAlert, 
  Sliders,
  Check,
  AlertTriangle,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, AppUser } from '../../types';
import { ALL_SYSTEM_MODULES, DEFAULT_ROLE_MODULES } from '../../lib/sampleData';

export const UsersModule: React.FC = () => {
  const { 
    usersList, 
    role, 
    isCEO, 
    addUser, 
    updateUserRole, 
    updateUserPin, 
    updateUserModules,
    deleteUser,
    resetUserPassword,
    updateUser,
    isSystemPaused,
    toggleSystemPause
  } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Cajero');
  const [newPin, setNewPin] = useState('1234');
  const [newSelectedModules, setNewSelectedModules] = useState<string[]>(DEFAULT_ROLE_MODULES['Cajero']);
  const [tempPassAlert, setTempPassAlert] = useState<string | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Cajero');
  const [editPin, setEditPin] = useState('');
  const [editSelectedModules, setEditSelectedModules] = useState<string[]>([]);
  const [showEditPin, setShowEditPin] = useState(false);

  // Delete User Confirmation Modal State
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null);

  // Kill Switch Provider Pin Modal State
  const [showKillSwitchModal, setShowKillSwitchModal] = useState(false);
  const [killSwitchPin, setKillSwitchPin] = useState('');
  const [killSwitchError, setKillSwitchError] = useState('');

  // Toggle state to reveal/mask PIN per user ID
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [showNewPin, setShowNewPin] = useState(false);

  // Active sub-tab in Users Module: 'users' or 'permissions_matrix'
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'matrix'>('users');

  const togglePinVisibility = (uid: string) => {
    setVisiblePins(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const handleRoleChangeForNew = (r: UserRole) => {
    setNewRole(r);
    setNewSelectedModules(DEFAULT_ROLE_MODULES[r] || []);
  };

  const handleRoleChangeForEdit = (r: UserRole) => {
    setEditRole(r);
    setEditSelectedModules(DEFAULT_ROLE_MODULES[r] || []);
  };

  const handleOpenEditModal = (u: AppUser) => {
    setEditingUser(u);
    setEditName(u.displayName);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPin(u.pin || '1234');
    setEditSelectedModules(u.allowedModules || DEFAULT_ROLE_MODULES[u.role] || []);
    setShowEditPin(false);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateUser(editingUser.uid, {
      displayName: editName.trim(),
      email: editEmail.trim(),
      role: editRole,
      pin: editPin.trim(),
      allowedModules: editSelectedModules
    });
    setEditingUser(null);
  };

  const handleDeleteConfirm = () => {
    if (!deletingUser) return;
    deleteUser(deletingUser.uid);
    setDeletingUser(null);
  };

  const handleToggleModuleForUser = (user: AppUser, moduleId: string) => {
    const currentMods = user.allowedModules || DEFAULT_ROLE_MODULES[user.role] || [];
    const updated = currentMods.includes(moduleId)
      ? currentMods.filter(m => m !== moduleId)
      : [...currentMods, moduleId];
    
    updateUserModules(user.uid, updated);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    addUser({
      email: newEmail.trim(),
      displayName: newName.trim(),
      role: newRole,
      pin: newPin.trim(),
      allowedModules: newSelectedModules,
      status: 'active'
    });
    setShowAddModal(false);
    setNewEmail('');
    setNewName('');
    setNewPin('1234');
  };

  const handleResetPass = (uid: string, name: string) => {
    const generated = resetUserPassword(uid);
    setTempPassAlert(`Contraseña temporal generada para ${name}: ${generated}`);
  };

  const handleExecuteKillSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    setKillSwitchError('');
    const res = toggleSystemPause(killSwitchPin);
    if (res.success) {
      setShowKillSwitchModal(false);
      setKillSwitchPin('');
    } else {
      setKillSwitchError(res.error || 'PIN de autorización incorrecto');
    }
  };

  if (!isCEO) {
    return (
      <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl max-w-md mx-auto my-10 space-y-3">
        <Lock className="w-10 h-10 text-red-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Acceso Restringido</h3>
        <p className="text-xs text-slate-400">
          Únicamente el perfil con rol <strong>CEO</strong> o el correo maestro de soporte (<strong className="text-amber-400">mariobarillas24@gmail.com</strong>) tienen permisos para administrar usuarios, autorizar PINs y gestionar accesos en CELLTRONIC.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* Top Banner with Provider Security Badge */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                Gestión de Usuarios, Permisos y Seguridad
              </h2>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30 uppercase hidden sm:inline-block">
                CEO / Proveedor Panel
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              Control dinámico de módulos en tiempo real • Super Admin: <span className="text-amber-400 font-mono font-semibold">mariobarillas24@gmail.com</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          {/* Kill Switch Toggle Button */}
          <button
            onClick={() => {
              setKillSwitchError('');
              setKillSwitchPin('');
              setShowKillSwitchModal(true);
            }}
            className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-lg ${
              isSystemPaused
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-400 shadow-red-500/20 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-amber-500/30'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isSystemPaused ? 'SISTEMA PAUSADO (Pulsar para Desbloquear)' : 'Kill Switch Proveedor (Pausar App)'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 lg:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Usuario</span>
          </button>
        </div>
      </div>

      {/* Temp Password Alert Banner */}
      {tempPassAlert && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <span>{tempPassAlert}</span>
          <button onClick={() => setTempPassAlert(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Module View Tabs: Users List vs Dynamic Permission Matrix */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'users'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Directorio de Usuarios ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'matrix'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Matriz de Permisos Dinámicos (Checkboxes Módulos)</span>
        </button>
      </div>

      {/* SUBTAB 1: DIRECTORY & USER LIST */}
      {activeSubTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-3">Usuario / Nombre</th>
                  <th className="py-3 px-3">Correo Electrónico</th>
                  <th className="py-3 px-3">Rol Asignado</th>
                  <th className="py-3 px-3">PIN Autorización</th>
                  <th className="py-3 px-3">Módulos Permitidos</th>
                  <th className="py-3 px-3 text-right">Acciones CEO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map(u => {
                  const modsCount = (u.allowedModules || DEFAULT_ROLE_MODULES[u.role] || []).length;
                  return (
                    <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                          u.role === 'CEO' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          u.role === 'Gerente' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          u.role === 'Supervisor' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                          u.role === 'Técnico' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {u.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-slate-100 font-bold">{u.displayName}</p>
                          {u.email === 'mariobarillas24@gmail.com' && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-mono font-bold">
                              Proveedor Master
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">{u.email}</td>
                      <td className="py-3 px-3">
                        <select
                          value={u.role}
                          onChange={(e) => updateUserRole(u.uid, e.target.value as UserRole)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                            u.role === 'CEO' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            u.role === 'Gerente' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                            u.role === 'Supervisor' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                            u.role === 'Técnico' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                            'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          <option value="CEO">CEO</option>
                          <option value="Gerente">Gerente</option>
                          <option value="Supervisor">Supervisor</option>
                          <option value="Cajero">Cajero</option>
                          <option value="Técnico">Técnico</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type={visiblePins[u.uid] ? "text" : "password"}
                            maxLength={6}
                            key={`${u.uid}-${u.pin}`}
                            defaultValue={u.pin || ''}
                            onBlur={(e) => updateUserPin(u.uid, e.target.value)}
                            className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-center font-mono text-white text-xs tracking-wider"
                          />
                          <button
                            type="button"
                            onClick={() => togglePinVisibility(u.uid)}
                            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                            title={visiblePins[u.uid] ? "Ocultar PIN" : "Revelar PIN"}
                          >
                            {visiblePins[u.uid] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-semibold text-slate-300">
                          {modsCount} de {ALL_SYSTEM_MODULES.length} Módulos
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(u)}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                          title="Editar usuario y permisos"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleResetPass(u.uid, u.displayName)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                          title="Generar contraseña temporal"
                        >
                          Restablecer Clave
                        </button>
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Borrar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: DYNAMIC PERMISSION MATRIX (CHECKBOXES PER MODULE IN REAL-TIME) */}
      {activeSubTab === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" /> Matriz de Accesos por Módulo (Checkboxes Dinámicos)
              </h3>
              <p className="text-xs text-slate-400">
                Active o desactive mediante los cuadros de selección los módulos a los que tiene acceso cada usuario. Los cambios se reflejan inmediatamente en el menú lateral.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-3 min-w-[180px]">Usuario / Rol</th>
                  {ALL_SYSTEM_MODULES.map(m => (
                    <th key={m.id} className="py-3 px-2 text-center min-w-[90px]">
                      <span className="block text-[10px] text-slate-300 font-bold">{m.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map(u => {
                  const userMods = u.allowedModules || DEFAULT_ROLE_MODULES[u.role] || [];
                  return (
                    <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-white">
                        <div className="font-bold text-slate-100">{u.displayName}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Rol: {u.role}</div>
                      </td>
                      {ALL_SYSTEM_MODULES.map(m => {
                        const isChecked = userMods.includes(m.id);
                        return (
                          <td key={m.id} className="py-3 px-2 text-center">
                            <label className="inline-flex items-center justify-center cursor-pointer p-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleModuleForUser(u, m.id)}
                                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" /> Crear Nuevo Usuario y Configurar Permisos
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ej. Roberto Sánchez"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ej. roberto@celltronic.com"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Rol Asignado</label>
                  <select
                    value={newRole}
                    onChange={(e) => handleRoleChangeForNew(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Cajero">Cajero</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Técnico">Técnico</option>
                    <option value="CEO">CEO / Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">PIN Autorización</label>
                  <div className="relative">
                    <input
                      type={showNewPin ? "text" : "password"}
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="1234"
                      className="w-full pl-3 pr-9 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-center focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                      title={showNewPin ? "Ocultar PIN" : "Mostrar PIN"}
                    >
                      {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Module Checkboxes Selection */}
              <div>
                <label className="block text-slate-400 font-semibold mb-2">
                  Módulos y Permisos Habilitados (Checkboxes)
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800 max-h-40 overflow-y-auto">
                  {ALL_SYSTEM_MODULES.map(m => {
                    const checked = newSelectedModules.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setNewSelectedModules(prev => prev.filter(x => x !== m.id));
                            } else {
                              setNewSelectedModules(prev => [...prev, m.id]);
                            }
                          }}
                          className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
                        />
                        <span className="text-[11px] font-medium">{m.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" /> Editar Usuario y Permisos Dinámicos
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingUser(null)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="ej. Roberto Sánchez"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="ej. roberto@celltronic.com"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Rol Asignado</label>
                  <select
                    value={editRole}
                    onChange={(e) => handleRoleChangeForEdit(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Cajero">Cajero</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Técnico">Técnico</option>
                    <option value="CEO">CEO / Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">PIN Autorización</label>
                  <div className="relative">
                    <input
                      type={showEditPin ? "text" : "password"}
                      maxLength={6}
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value)}
                      placeholder="1234"
                      className="w-full pl-3 pr-9 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-center focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPin(!showEditPin)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                      title={showEditPin ? "Ocultar PIN" : "Mostrar PIN"}
                    >
                      {showEditPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Module Checkboxes Selection */}
              <div>
                <label className="block text-slate-400 font-semibold mb-2">
                  Módulos y Permisos Habilitados (Checkboxes)
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800 max-h-40 overflow-y-auto">
                  {ALL_SYSTEM_MODULES.map(m => {
                    const checked = editSelectedModules.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setEditSelectedModules(prev => prev.filter(x => x !== m.id));
                            } else {
                              setEditSelectedModules(prev => [...prev, m.id]);
                            }
                          }}
                          className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
                        />
                        <span className="text-[11px] font-medium">{m.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">¿Eliminar Usuario del Sistema?</h3>
              <p className="text-xs text-slate-400">
                Está a punto de borrar a <strong className="text-white">{deletingUser.displayName}</strong> ({deletingUser.email}). Esta acción revocará todos sus accesos de forma permanente.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Confirmar Borrado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KILL SWITCH PROVEDOR AUTHORIZATION MODAL */}
      {showKillSwitchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" /> Control Kill Switch del Proveedor
              </h3>
              <button onClick={() => setShowKillSwitchModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isSystemPaused 
                ? 'El sistema se encuentra actualmente PAUSADO. Ingrese el PIN de Super Admin para desbloquearlo.'
                : 'Esta función pausará y bloqueará el acceso general a la app CELLTRONIC ERP/CRM en caso de mantenimiento o emergencia.'}
            </p>

            {killSwitchError && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold">
                {killSwitchError}
              </div>
            )}

            <form onSubmit={handleExecuteKillSwitch} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  PIN o Clave de Proveedor Super Admin *
                </label>
                <input
                  type="password"
                  value={killSwitchPin}
                  onChange={(e) => setKillSwitchPin(e.target.value)}
                  placeholder="PIN Maestro o clave mariobarillas24@gmail.com"
                  autoFocus
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-center tracking-widest focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKillSwitchModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSystemPaused
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{isSystemPaused ? 'Reactivar App' : 'Pausar/Bloquear App'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
