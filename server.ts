import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

function generateSmartFallback(prompt: string, context?: { products?: any[]; repairs?: any[] }): string {
  const p = prompt.toLowerCase();
  
  // Detect Brand / Model
  let brand = 'Smartphone / Tablet Multimarca';
  if (p.includes('iphone') || p.includes('apple') || p.includes('ipad') || p.includes('ios')) brand = 'Apple iPhone / iPad';
  else if (p.includes('samsung') || p.includes('galaxy')) brand = 'Samsung Galaxy';
  else if (p.includes('xiaomi') || p.includes('redmi') || p.includes('poco')) brand = 'Xiaomi / Redmi / POCO';
  else if (p.includes('motorola') || p.includes('moto')) brand = 'Motorola';
  else if (p.includes('huawei') || p.includes('honor')) brand = 'Huawei / Honor';
  else if (p.includes('pixel') || p.includes('google')) brand = 'Google Pixel';
  else if (p.includes('oppo') || p.includes('realme') || p.includes('vivo') || p.includes('infinix') || p.includes('tecno')) brand = 'Dispositivo Android';

  // 1. No enciende / Apagado / Muerto / Corto
  if (p.includes('no enciende') || p.includes('muerto') || p.includes('apago') || p.includes('apagado') || p.includes('dead') || p.includes('corto') || p.includes('consumo')) {
    return `### Diagnóstico Técnico CELLTRONIC: Falla de Encendido (${brand})

**1. Diagnóstico Nivel 1 (Sin Desarme / Tester USB):**
- Conectar a medidor/amperímetro USB y verificar consumo en reposo:
  - *0.00A fijo:* Línea VBUS abierta, flex de carga desconectado o fusible térmico abierto.
  - *0.01A - 0.05A fijo:* Posible daño en IC de carga / Tristar / Hydra / Tigris (${brand.includes('Apple') ? 'U2/Hydra IC' : 'Sub-PMIC/PMIC'}).
  - *0.45A - 0.60A cíclico:* Modo DFU/Recovery o bucle en SoC.
- Ejecutar combinación de reinicio forzado según modelo.

**2. Diagnóstico Nivel 2 (Fuente Regulada 4.0V):**
- Conectar a conector de batería (SMB/FPC):
  - *Consumo antes de presionar Power:* Corto en línea principal (${brand.includes('Apple') ? 'VDD_MAIN / VBAT' : 'VPH_PWR / VBAT'}). Aplicar método de rocín o cámara térmica para localizar condensador en fuga.
  - *Consumo al presionar Power pero no supera 80mA:* Falla en líneas de encendido PMIC o reloj oscilador de 32kHz.

**3. Repuestos e Insumos Recomendados:**
- Flex de Carga original / Módulo USB-C.
- Batería de reemplazo alta calidad.
- Insumos de laboratorio: Alcohol isopropílico 99.9%, Flux Amtech/Relife, estaño 183°C.`;
  }

  // 2. Carga / Batería
  if (p.includes('carga') || p.includes('cargador') || p.includes('bateria') || p.includes('porcentaje') || p.includes('lenta') || p.includes('no sube')) {
    return `### Diagnóstico Técnico CELLTRONIC: Sistema de Carga & Batería (${brand})

**1. Pruebas Iniciales con Tester USB:**
- Verificar voltaje (5V / 9V PD) y amperaje:
  - *Carga lenta (< 0.40A):* Pines D+ / D- (líneas de datos USB) sucios o dañados. El teléfono no negocia protocolo de carga rápida.
  - *Carga intermitente:* Falso contacto mecánico en el pin central del conector Type-C o sulfatación en pines Lightning.

**2. Revisión de Componentes & Placa:**
- Inspeccionar visualmente el conector de carga bajo microscopio.
- Probar con flex de carga de prueba y batería con voltaje superior a 3.7V.
- Si persiste sin carga o muestra temperatura alta: Revisar termistor de placa inferior (NTC 100k) y diodo TVS de protección contra sobretensión.

**3. Repuestos e Insumos en Tienda:**
- Sub-placa de carga / Flex de pin USB.
- Batería de polímero de litio certificada.
- Accesorios sugeridos para caja: Cable reforzado 60W/100W y cargador de pared con certificación GaN.`;
  }

  // 3. Pantalla / Display / Touch / Backlight
  if (p.includes('pantalla') || p.includes('display') || p.includes('touch') || p.includes('tactil') || p.includes('negra') || p.includes('rayas') || p.includes('vidrio') || p.includes('oled') || p.includes('amoled')) {
    return `### Diagnóstico Técnico CELLTRONIC: Pantalla & Digitalizador (${brand})

**1. Descarte de Módulo vs Circuito de Placa:**
- *Equipo vibra o suena pero no da imagen:*
  - Iluminar el display con linterna a contraluz para descartar falla en circuito de retroiluminación (*Backlight Anode/Cathode o bobina elevadora*).
  - Medir voltajes de alimentación del display en el FPC (+5V / -5V en OLED/AMOLED, o línea VDD_DISPLAY).
- *Touch fantasma o inoperativo:*
  - Desconectar pantalla y verificar si hay condensadores o filtros EMI dañados cerca del conector FPC.

**2. Protocolo de Reemplazo e Instalación:**
- Probar el nuevo repuesto en seco (sin retirar precintos de garantía ni aplicar pegamento).
- Limpiar marco con removedor de adhesivo y alcohol isopropílico.
- Aplicar adhesivo T-7000 (marco negro) o B-7000 (marco transparente) dejando curar con prensas de presión suave por 30-45 minutos.

**3. Accesorios Recomendados en POS:**
- Protector de pantalla de cristal templado 9D / 21D.
- Funda antishock de uso rudo para prevenir futuras caídas.`;
  }

  // 4. Daño por Líquidos / Mojado / Humedad
  if (p.includes('mojado') || p.includes('agua') || p.includes('humedad') || p.includes('liquido') || p.includes('sulfato') || p.includes('corrosion')) {
    return `### Protocolo CELLTRONIC: Rescate por Daño de Líquidos (${brand})

**1. Medidas Inmediatas:**
- **NO encender ni conectar al cargador bajo ninguna circunstancia.**
- Desconectar inmediatamente el flex de batería para detener la electrólisis galvánica.

**2. Proceso Químico de Ultrasonido:**
- Desmontar la placa madre retirando blindajes térmicos.
- Sumergir en tina de ultrasonido con alcohol isopropílico al 99.9% durante 2 ciclos de 5 minutos a 40°C.
- Secar completamente con estación de calor a 100°C con flujo de aire medio.

**3. Revisión de Pistas y Cortos:**
- Inspeccionar bajo microscopio en busca de óxido verde (sulfato de cobre) en conectores FPC y líneas de alimentación.
- Reconstruir micro-pistas dañadas con hilo de cobre esmaltado de 0.02mm y máscara UV curada.`;
  }

  // 5. Reinicios / Loop / Se apaga solo / Logo
  if (p.includes('reinicio') || p.includes('loop') || p.includes('bucle') || p.includes('se apaga') || p.includes('logo') || p.includes('pegado')) {
    return `### Diagnóstico Técnico CELLTRONIC: Bootloop / Reinicios Continuos (${brand})

**1. Diagnóstico Hardware vs Software:**
- *Causas habituales de Hardware:*
  - Botón de encendido (Power Key) en corto o sulfatado en el flex.
  - Batería con fusible térmico descalibrado o resistencia de sensado de batería abierta.
  - ${brand.includes('Apple') ? 'En iPhone: Falla en flex de sensor de proximidad/auricular (línea I2C corrupta) o flex de carga.' : 'En Android: Falla en memoria UFS/eMMC o soldadura fría en SoC/RAM que requiere reballing.'}
- *Prueba de descarte:* Desconectar periféricos (cámaras, sensor de proximidad, flex de huella) y encender solo con pantalla y batería en fuente.

**2. Diagnóstico de Software:**
- Ingresar en modo Recovery / Fastboot / DFU y verificar si el dispositivo se mantiene encendido de forma estable sin reiniciarse.
- Si se mantiene estable en Recovery, proceder con actualización de firmware preservando datos del usuario.`;
  }

  // 6. Audio / Micrófono / Altavoz / Auricular
  if (p.includes('audio') || p.includes('microfono') || p.includes('altavoz') || p.includes('parlante') || p.includes('auricular') || p.includes('llamadas')) {
    return `### Diagnóstico Técnico CELLTRONIC: Sistema de Audio (${brand})

**1. Pruebas Funcionales:**
- Probar grabadora de voz (micrófono inferior) vs grabación de video con cámara frontal/trasera (micrófonos secundarios/cancelación de ruido).
- Probar altavoz multimedia vs auricular de llamadas en modo prueba (ej. *#0*# en Samsung o menú CIT en Xiaomi).

**2. Inspección Física:**
- Limpieza con cepillo antiestático y alcohol isopropílico de las mallas acústicas protectoras (frecuentemente obstruidas por polvo o grasa).
- Verificar continuidad de los contactos de presión del parlante a la placa madre.
- ${brand.includes('Apple') ? 'En iPhone 7/8/X: Revisar IC de Audio (Audio Codec) o pads desprendidos.' : 'En Android: Revisar amplificador de audio / PMIC.'}

**3. Repuestos Recomendados:**
- Módulo de altavoz buzzer original o flex de auricular/sensor.`;
  }

  // 7. General Diagnostic
  return `### Asesoría Técnica Especializada CELLTRONIC (${brand})

**Consulta Técnica:** "${prompt}"

**1. Protocolo de Diagnóstico Recomendado:**
- **Inspección Física y Consumo:** Realizar medición en voltímetro/amperímetro USB y verificar consumo base antes y después de encendido.
- **Aislamiento de Periféricos:** Desconectar periféricos secundarios (cámaras, flex de carga, sensores) para aislar la falla en placa base.
- **Medición de Caída de Tensión (Escala de Diodo):** Medir las líneas de comunicación principales en conectores FPC comparando valores con la placa de referencia.

**2. Buenas Prácticas de Taller:**
- Trabajar sobre tapete antiestático con pulsera aterrizada.
- Aplicar calor controlado (máx 320°C para conectores de plástico y 380°C para desoldar blindajes).
- Documentar el estado inicial en el ticket de taller con fotos del equipo.`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Server-side Gemini AI route for CELLTRONIC Assistant
  app.post('/api/ai-assistant', async (req, res) => {
    try {
      const { prompt, context } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        const smartFallback = generateSmartFallback(prompt, context);
        return res.json({ reply: smartFallback });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `Eres el Asistente Técnico Senior y Maestro de Diagnóstico de Hardware y ERP de CELLTRONIC, una tienda y laboratorio especializado en reparación multimarca de smartphones y tablets (Apple iPhone/iPad, Samsung Galaxy, Xiaomi/Redmi/POCO, Motorola, Huawei, Google Pixel, etc.).

Tu misión es responder con rigor técnico, agilidad y claridad a las consultas de los técnicos de taller y personal de caja/POS.

ESTRUCTURA DE TUS RESPUESTAS:
1. DIAGNÓSTICO PASO A PASO:
   - Nivel 1 (Diagnóstico Rápido / Sin desarmar): Comportamiento en medidor/tester USB (voltaje y consumo en amperios mA), combinaciones de reinicio forzado, inspección visual de conectores y detección en PC.
   - Nivel 2 (Desarme y Banco de Pruebas): Inyección de voltaje con fuente regulada, lectura de consumos en reposo vs tras pulsar Power, localización térmica de cortos en líneas principales (VDD_MAIN / VBAT / VPH_PWR) y secundarias.
   - Nivel 3 (Microelectrónica & Circuitos Específicos): Identifica circuitos integrados pertinentes según la marca y modelo consultado (ej. Tristar/Hydra/Tigris/Chestnut en iPhone; Sub-PMIC, SM5713, BQ25890, PMIC en Samsung y Xiaomi; líneas I2C, bobinas de backlight, diodos ESD).
   - Nivel 4 (Química y Soldadura): Procedimiento con alcohol isopropílico 99.9%, ultrasonido, flujo de aire/temperatura en estación de calor, pegamento B-7000/T-7000.

2. REPUESTOS E INSUMOS RECOMENDADOS:
   - Especifica los repuestos (Pantallas OLED/AMOLED/In-Cell, flex de carga original, baterías certificadas, pasta térmica, hilo de cobre 0.02mm, malla desoldadora).

3. RECOMENDACIÓN DE VENTA / POS (si aplica):
   - Sugiere accesorios complementarios para cotizar al cliente (cargador GaN, cable reforzado, protector de pantalla).

REGLAS CRÍTICAS:
- Adapta tu respuesta exactamente al modelo, síntoma y marca consultada por el usuario. NUNCA respondas con plantillas genéricas fijas ni asumas un modelo fijo (como Samsung A54 o T-54) a menos que el usuario lo haya consultado explícitamente.
- Sé conciso, directo al grano y utiliza formato Markdown profesional con negritas y viñetas ordenadas.`;

      let enrichedPrompt = prompt;
      if (context?.deviceModel) {
        enrichedPrompt = `[Dispositivo: ${context.deviceBrand || ''} ${context.deviceModel}]\n[Problema reportado: ${context.issueDescription || ''}]\n\nConsulta: ${prompt}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: enrichedPrompt,
        config: {
          systemInstruction,
          temperature: 0.3
        }
      });

      const text = response.text || generateSmartFallback(prompt, context);
      return res.json({ reply: text });
    } catch (err: any) {
      console.error('Gemini API Error in /api/ai-assistant:', err);
      const fallback = generateSmartFallback(req.body?.prompt || '', req.body?.context);
      return res.json({ reply: fallback });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CELLTRONIC Server running on http://localhost:${PORT}`);
  });
}

startServer();

