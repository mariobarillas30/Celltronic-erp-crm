import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight, 
  KeyRound, 
  AlertCircle, 
  HelpCircle,
  X,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CelltronicLogo } from '../common/CelltronicLogo';

export const LoginScreen: React.FC = () => {
  const { 
    loginWithGoogleGatekeeper, 
    loginWithEmailGatekeeper,
    requestPasswordRecovery,
    isLoadingAuth 
  } = useAuth();
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);

  const handleGoogleLogin = async () => {
    setLoginError(null);
    setIsGoogleSubmitting(true);
    const result = await loginWithGoogleGatekeeper();
    setIsGoogleSubmitting(false);

    if (!result.success) {
      setLoginError(result.error || 'Error al autenticar con cuenta Google.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!email || !password) {
      setLoginError('Por favor ingrese correo electrónico y contraseña.');
      return;
    }

    setIsSubmitting(true);
    const result = await loginWithEmailGatekeeper(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setLoginError(result.error || 'Acceso denegado. Credenciales de acceso no válidas.');
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;
    setRecoveryError(null);
    setIsSendingRecovery(true);
    const result = await requestPasswordRecovery(recoveryEmail);
    setIsSendingRecovery(false);
    if (result.success) {
      setRecoveryMessage(result.message);
    } else {
      setRecoveryError(result.message || 'Error al procesar la solicitud de recuperación.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-white">
      {/* Background Decorative Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-lime-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top System Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <CelltronicLogo size="sm" variant="emblem" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg sm:text-xl tracking-tight text-white font-sans">CELLTRONIC</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-400 font-bold border border-lime-500/30">
                ERP v2.7
              </span>
            </div>
            <p className="text-xs text-slate-400">Servicio Técnico Profesional • POS & CRM</p>
          </div>
        </div>

        {/* Security & Firebase Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">Capa 1: Gatekeeper Activo (Shield)</span>
        </div>
      </header>

      {/* Main Authentication Card Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-4xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Brand & Security Overview */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between">
            <div>
              {/* Brand Logo Hero */}
              <div className="mb-6 flex justify-center lg:justify-start">
                <CelltronicLogo size="lg" variant="emblem" className="ring-2 ring-lime-500/30" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-4">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Capa 1 • Gatekeeper de Seguridad</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                CELLTRONIC ERP
              </h2>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
                Servicio Técnico Profesional
              </p>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Este enlace está protegido por una doble capa de autenticación. Inicia sesión con la cuenta autorizada de Google para desbloquear el acceso a la terminal operativa.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">1. Gatekeeper (Enlace Seguro)</h4>
                    <p className="text-[11px] text-slate-400">Protege el link de accesos no autorizados mediante Gmail.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">2. Selección de Rol & PIN</h4>
                    <p className="text-[11px] text-slate-400">Luego seleccionas quién va a operar con su PIN interno.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>Admin: mariobarillas24@gmail.com</span>
              <span className="font-mono text-[10px] text-cyan-400">FIREBASE AUTH TLS</span>
            </div>
          </div>

          {/* Right Column: Gatekeeper Login Flow */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold rounded-md uppercase">
                    Paso 1 de 2
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Validación de Enlace</span>
                </div>
                <h3 className="text-xl font-black text-white">Acceso al Sistema</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Autentica tu cuenta para desbloquear el panel y seleccionar tu perfil de trabajo.
                </p>
              </div>

              {loginError && (
                <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex flex-col gap-2 animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span className="font-medium leading-relaxed">{loginError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="self-start px-3 py-1.5 bg-cyan-600/80 hover:bg-cyan-600 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                  >
                    Reintentar / Acceso Directo Propietario
                  </button>
                </div>
              )}

              {/* Primary 1-Click Google Sign-In Button (Gatekeeper Layer 1) */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleSubmitting || isLoadingAuth}
                  className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-bold text-sm shadow-xl shadow-cyan-500/10 flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50 border border-slate-200 active:scale-[0.99]"
                >
                  {isGoogleSubmitting ? (
                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {/* Official Google 'G' Icon */}
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>Continuar con Google (Gatekeeper)</span>
                      <ArrowRight className="w-4 h-4 ml-auto text-slate-500" />
                    </>
                  )}
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-4 text-[11px] text-slate-400 uppercase tracking-widest font-bold">
                    O con correo corporativo
                  </span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                {!showEmailForm ? (
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>Ingresar con Correo Electrónico y Contraseña</span>
                  </button>
                ) : (
                  <form onSubmit={handleEmailLogin} className="space-y-3.5 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="mariobarillas24@gmail.com"
                          autoComplete="username email"
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                          required
                        />
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          Contraseña
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setRecoveryEmail(email);
                            setShowRecoveryModal(true);
                            setRecoveryMessage(null);
                            setRecoveryError(null);
                          }}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                          required
                        />
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                          title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isSubmitting || isLoadingAuth}
                        className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Validar Gatekeeper</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEmailForm(false)}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Volver
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Bottom Help Note */}
            <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-400">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                Soporte TI / Propietario
              </span>
              <span className="text-slate-400">CELLTRONIC Mobile Store</span>
            </div>
          </div>
        </div>
      </main>

      {/* Password Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => setShowRecoveryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Recuperar Contraseña</h3>
                <p className="text-xs text-slate-400">Restablecimiento seguro vía Firebase Auth</p>
              </div>
            </div>

            {recoveryMessage ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs leading-relaxed flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{recoveryMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Entendido / Volver
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ingresa tu correo electrónico registrado. Te enviaremos un enlace oficial de Firebase Auth para que puedas crear una nueva contraseña de forma segura.
                </p>

                {recoveryError && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="usuario@celltronic.com"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingRecovery}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingRecovery ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 gap-2">
        <div>© 2026 CELLTRONIC Mobile Store & ERP. Todos los derechos reservados.</div>
        <div className="flex items-center gap-4">
          <span>Gatekeeper: Activo</span>
          <span>Base de Datos: Firestore Cloud</span>
          <span>Cifrado: TLS 1.3</span>
        </div>
      </footer>
    </div>
  );
};

