import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Wrench, 
  Copy, 
  Check, 
  RotateCcw, 
  Smartphone, 
  Zap, 
  Droplets, 
  Cpu, 
  RefreshCw 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Product, Repair } from '../../types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  initialContext?: {
    deviceBrand?: string;
    deviceModel?: string;
    issueDescription?: string;
  };
  products?: Product[];
  repairs?: Repair[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  {
    label: 'iPhone no enciende (0.00A)',
    icon: Zap,
    prompt: 'iPhone no enciende y muestra 0.00A en tester USB. ¿Cuál es el procedimiento paso a paso para diagnosticar la falla en placa?'
  },
  {
    label: 'Xiaomi en Bootloop (Reinicio)',
    icon: RefreshCw,
    prompt: 'Xiaomi se reinicia continuamente en el logo y entra en modo Fastboot. ¿Cómo descarto si es falla de hardware (botón/batería/SoC) o firmware?'
  },
  {
    label: 'Samsung pantalla negra con audio',
    icon: Smartphone,
    prompt: 'Samsung Galaxy vibra y reproduce sonidos de notificación pero la pantalla permanece totalmente negra. ¿Cómo descarto circuito de backlight o reemplazo de display AMOLED?'
  },
  {
    label: 'Equipo mojado / Corto VDD_MAIN',
    icon: Droplets,
    prompt: 'Dispositivo móvil con ingreso de líquidos, no enciende y muestra corto total en la línea principal VDD_MAIN al conectar la fuente de poder. ¿Cómo proceder con ultrasonido y localización térmica?'
  },
  {
    label: 'Carga lenta / Falso contacto USB-C',
    icon: Cpu,
    prompt: 'Smartphone Android solo carga a 0.35A de forma intermitente y no reconoce carga rápida. ¿Qué pruebas debo realizar en los pines D+/D-, flex de carga e IC termistor?'
  }
];

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ 
  isOpen, 
  onClose,
  initialPrompt = '',
  initialContext,
  products = [],
  repairs = []
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `### 🛠️ Asistente Técnico & ERP CELLTRONIC (AI 3.7)

¡Hola! Soy tu asistente técnico especializado en **diagnóstico de hardware multimarca** (Apple, Samsung, Xiaomi, Motorola, Huawei, Pixel) y gestión de taller.

**¿En qué puedo ayudarte hoy?**
- Diagnósticos paso a paso por consumo en fuente regulada o tester USB.
- Detección de fallas en circuitos de carga, micro-soldadura, PMIC y backlight.
- Rescate por daño de líquidos (ultrasonido y reconstrucción de pistas).
- Recomendación de repuestos en almacén y accesorios compatibles para el POS.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // If initialPrompt or initialContext changes when opened, set input
  useEffect(() => {
    if (isOpen && initialPrompt) {
      setInput(initialPrompt);
    } else if (isOpen && initialContext?.deviceModel) {
      const autoPrompt = `Diagnóstico para ${initialContext.deviceBrand || ''} ${initialContext.deviceModel}: ${initialContext.issueDescription || 'Falla no especificada'}`;
      setInput(autoPrompt);
    }
  }, [isOpen, initialPrompt, initialContext]);

  if (!isOpen) return null;

  const sendMessage = async (userPrompt: string) => {
    const trimmed = userPrompt.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: trimmed,
          context: {
            ...initialContext,
            inventorySummary: products.slice(0, 15).map(p => ({ name: p.name, category: p.category, stock: p.stock })),
            activeRepairsCount: repairs.length
          }
        })
      });

      const data = await response.json();
      const replyText = data.reply || 'No se pudo obtener una respuesta técnica en este momento.';

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error querying AI assistant:', error);
      const errMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Diagnóstico Rápido de Emergencia:**
1. Conectar a medidor USB y verificar amperaje (0.00A = línea VBUS abierta; >1.0A fijo = posible corto primario).
2. Aislar periféricos (cámaras, sensores) y encender en fuente regulada a 4.0V para medir consumo en reposo.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `### 🛠️ Asistente Técnico & ERP CELLTRONIC (AI 3.7)

Conversación reiniciada. Puedes consultar sobre cualquier modelo (iPhone, Xiaomi, Samsung, Motorola, etc.) y describir la falla técnica o requerimiento de inventario.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full h-[650px] max-h-[92vh] flex flex-col justify-between shadow-2xl text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  CELLTRONIC AI Technical Assistant
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Gemini 3.7
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Diagnóstico Técnico Multimarca • Microelectrónica • ERP & POS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetChat}
              title="Reiniciar conversación"
              className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Wrench className="w-3 h-3 text-purple-400" />
            Consultas Frecuentes:
          </span>
          {QUICK_PROMPTS.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(qp.prompt)}
                disabled={loading}
                className="px-2.5 py-1 bg-slate-800/90 hover:bg-purple-950/50 hover:border-purple-500/40 border border-slate-700/70 rounded-lg text-[11px] text-slate-300 hover:text-purple-200 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Icon className="w-3 h-3 text-purple-400" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>

        {/* Messages Scroll Thread */}
        <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 text-xs scrollbar-thin">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              
              <div
                className={`max-w-[88%] sm:max-w-[82%] p-3.5 rounded-2xl leading-relaxed text-xs shadow-sm relative group ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white font-medium rounded-tr-none'
                    : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-none'
                }`}
              >
                {/* Content Rendering */}
                {m.role === 'assistant' ? (
                  <div className="space-y-2 text-slate-200">
                    <div className="prose prose-invert prose-xs max-w-none [&>h3]:text-purple-300 [&>h3]:font-bold [&>h3]:text-xs [&>h3]:mb-1.5 [&>h3]:mt-2 [&>h4]:text-purple-400 [&>h4]:font-semibold [&>h4]:text-[11px] [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:space-y-1 [&>p]:mb-1.5 [&>p]:leading-relaxed [&>strong]:text-purple-200">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    <div className="pt-2 mt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{m.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(m.id, m.content)}
                        className="flex items-center gap-1 text-slate-400 hover:text-purple-300 px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700 hover:border-purple-500/40 transition-colors cursor-pointer"
                        title="Copiar diagnóstico para notas técnicas"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <span className="block text-[9px] text-blue-200/80 text-right mt-1 font-mono">
                      {m.timestamp}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 p-3 bg-purple-950/20 border border-purple-500/20 rounded-2xl max-w-[80%] text-slate-300 text-xs">
              <div className="w-6 h-6 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
              </div>
              <div className="space-y-0.5">
                <p className="font-semibold text-purple-300">CELLTRONIC AI analizando...</p>
                <p className="text-[10px] text-slate-400">Consultando esquemáticos, consumos y metodología de taller.</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/70 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre cualquier modelo y falla (ej. iPhone 15 no carga, Xiaomi reinicios, etc.)..."
            className="flex-1 px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Consultar</span>
          </button>
        </form>

      </div>
    </div>
  );
};
