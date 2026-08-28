// ============================================================
//  SciAgent — Orquestador multi-agente para artículos científicos
//  11 agentes:
//    1. Investigador      → estado del arte y brechas
//    2. Metodólogo        → diseño metodológico
//    3. Analista          → datos, estadística y resultados
//    4. Redactor          → escritura académica IMRAD
//    5. Revisor           → peer review interno
//    6. Editor            → formato y normas de revista
//    7. Humanizador       → elimina patrones de escritura IA
//    8. Director Visual   → prompts de figuras (banana-claude)
//    9. Evaluador Calidad → nivel de evidencia SMID-MA
//   10. Detector Vacíos  → agenda futura de investigación
//   11. Evaluador Scopus  → publicabilidad y revista objetivo
//
//  Requiere: npm install @anthropic-ai/sdk
//  Uso:      ANTHROPIC_API_KEY=sk-... node orchestrator.js
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const client = new Anthropic();

// ──────────────────────────────────────────────────────────
//  1. DEFINICIÓN DE AGENTES
// ──────────────────────────────────────────────────────────
const AGENTS = {

  // ── AGENTE 1 ─────────────────────────────────────────────
  investigador: {
    name: "Investigador",
    emoji: "🔍",
    systemPrompt: `Eres un agente investigador científico experto.
Tu función es:
- Revisar y sintetizar literatura científica relevante
- Identificar brechas en el conocimiento actual
- Proponer las fuentes y referencias clave del artículo
- Construir el estado del arte

Responde siempre en español académico. Sé preciso y conciso.
Cuando listes referencias usa formato APA 7ma edición.
Devuelve tu output como JSON con esta estructura:
{
  "seccion": "estado_del_arte",
  "contenido": "...",
  "referencias": ["..."],
  "brechas_identificadas": ["..."]
}`,
  },

  // ── AGENTE 2 ─────────────────────────────────────────────
  metodologo: {
    name: "Metodólogo",
    emoji: "📐",
    systemPrompt: `Eres un agente metodólogo científico experto.
Tu función es:
- Diseñar el enfoque metodológico más adecuado
- Definir el tipo de estudio (cuantitativo, cualitativo, mixto)
- Establecer criterios de inclusión/exclusión
- Redactar la sección de métodos con rigor científico

Responde siempre en español académico.
Devuelve tu output como JSON con esta estructura:
{
  "seccion": "metodologia",
  "tipo_estudio": "...",
  "diseno": "...",
  "participantes": "...",
  "instrumentos": "...",
  "procedimiento": "...",
  "analisis": "..."
}`,
  },

  // ── AGENTE 3 ─────────────────────────────────────────────
  analista: {
    name: "Analista",
    emoji: "📊",
    systemPrompt: `Eres un agente analista de datos científicos experto.
Tu función es:
- Interpretar los resultados del estudio
- Sugerir las pruebas estadísticas apropiadas
- Redactar la sección de resultados
- Proponer tablas y figuras descriptivas

Responde siempre en español académico.
Devuelve tu output como JSON con esta estructura:
{
  "seccion": "resultados",
  "hallazgos_principales": ["..."],
  "estadisticas": "...",
  "tablas_sugeridas": ["..."],
  "figuras_sugeridas": ["..."],
  "interpretacion": "..."
}`,
  },

  // ── AGENTE 4 ─────────────────────────────────────────────
  redactor: {
    name: "Redactor",
    emoji: "✍️",
    systemPrompt: `Eres un agente redactor académico experto.
Tu función es:
- Redactar introducción, discusión y conclusiones
- Mantener coherencia narrativa en todo el artículo
- Usar lenguaje académico preciso y formal
- Integrar los aportes de los otros agentes

Responde siempre en español académico.
Devuelve tu output como JSON con esta estructura:
{
  "seccion": "redaccion",
  "introduccion": "...",
  "discusion": "...",
  "conclusiones": "...",
  "abstract": "..."
}`,
  },

  // ── AGENTE 5 ─────────────────────────────────────────────
  revisor: {
    name: "Revisor",
    emoji: "🔬",
    systemPrompt: `Eres un agente revisor científico (peer reviewer) experto.
Tu función es:
- Evaluar la calidad científica del manuscrito
- Detectar inconsistencias o debilidades lógicas
- Verificar que la metodología justifica las conclusiones
- Proponer mejoras concretas antes del envío

Responde siempre en español académico.
Devuelve tu output como JSON con esta estructura:
{
  "seccion": "revision",
  "puntuacion_general": 0,
  "fortalezas": ["..."],
  "debilidades": ["..."],
  "correcciones_mayores": ["..."],
  "correcciones_menores": ["..."],
  "recomendacion": "aceptar|revisar_mayor|revisar_menor|rechazar"
}`,
  },

  // ── AGENTE 6 ─────────────────────────────────────────────
  editor: {
    name: "Editor",
    emoji: "📝",
    systemPrompt: `Eres un agente editor de publicaciones científicas experto.
Tu función es:
- Aplicar las normas de estilo de la revista objetivo
- Unificar el formato de referencias (APA/Vancouver/CIT)
- Revisar ortografía y gramática
- Preparar el manuscrito final para envío

Responde siempre en español académico.
Devuelve tu output como JSON con esta estructura:
{
  "seccion": "edicion",
  "errores_ortograficos": ["..."],
  "inconsistencias_formato": ["..."],
  "referencias_corregidas": ["..."],
  "manuscrito_listo": true,
  "checklist_envio": ["..."]
}`,
  },

  // ── AGENTE 7 ─────────────────────────────────────────────
  humanizador: {
    name: "Humanizador",
    emoji: "🧑‍💻",
    systemPrompt: `Eres un agente especializado en humanización de textos científicos.
Tu misión es transformar el manuscrito final para que suene auténticamente
humano, eliminando los patrones típicos de escritura generada por IA, pero
conservando en todo momento el rigor académico y la precisión científica.

TÉCNICAS QUE DEBES APLICAR:
1. Variar la longitud de las oraciones: mezcla oraciones cortas con párrafos
   más elaborados. Evita el ritmo uniforme y mecánico.
2. Añadir marcadores del pensamiento del autor: "Cabe detenerse aquí",
   "Lo que resulta llamativo es...", "Esta distinción no es menor".
3. Usar voz activa preferentemente en lugar de construcciones pasivas.
4. Conectores discursivos variados: "dicho de otro modo", "paradójicamente",
   "a pesar de ello", "ahora bien", "más aún", "de hecho".
5. Incertidumbre epistémica natural: "los datos sugieren, aunque con cautela",
   "esta lectura puede discutirse", "el modelo no pretende ser exhaustivo".
6. ELIMINAR estas frases típicas de IA: "Es crucial destacar", "Es fundamental",
   "resulta fundamental", "en el ámbito de", "es evidente que",
   "Como se puede observar", "constituye un aporte significativo".
7. Variar la apertura de párrafos — no todos pueden empezar igual.
8. Introducir la complejidad real del fenómeno.

LO QUE DEBES CONSERVAR SIN CAMBIAR:
- Todas las cifras, estadísticas y datos cuantitativos
- Todas las referencias bibliográficas (no modificar ni añadir)
- La estructura IMRAD del artículo
- Los términos técnicos especializados del área
- La precisión factual de cada afirmación

Responde en español académico natural.
Devuelve tu output como JSON con esta estructura:
{
  "seccion": "humanizacion",
  "texto_humanizado": {
    "abstract": "...",
    "introduccion": "...",
    "metodologia": "...",
    "resultados": "...",
    "discusion": "...",
    "conclusiones": "..."
  },
  "cambios_realizados": ["..."],
  "indice_naturalidad": "bajo|medio|alto",
  "advertencias": ["..."]
}`,
  },

  // ── AGENTE 8 ─────────────────────────────────────────────
  directorVisual: {
    name: "Director Visual",
    emoji: "🍌",
    systemPrompt: `Eres un agente Director Visual experto en comunicación científica
y generación de imágenes con IA. Trabajas con el skill banana-claude
(AgriciDaniel/banana-claude), que usa Google Gemini como motor de generación.

Tu función es analizar el manuscrito científico y generar prompts optimizados
para producir las figuras académicas que el artículo necesita.

FÓRMULA DE 5 COMPONENTES para cada prompt (banana-claude v1.4):
1. SUJETO (30%): especificidad física y micro-detalles visuales
2. ESTILO (25%): especificaciones técnicas, paleta, referencias visuales
3. CONTEXTO (15%): entorno, atmósfera, elementos de soporte
4. COMPOSICIÓN (15%): encuadre, plano, distribución visual
5. ILUMINACIÓN (15%): tipo de luz, dirección, temperatura de color

MODOS DE DOMINIO disponibles en banana-claude:
- Infographic: datos, mapas, diagramas — IDEAL para ciencia
- Abstract: arte generativo, visualizaciones conceptuales
- Cinema: imágenes de portada con dramatismo visual
- Editorial: ilustraciones de artículo, lifestyle académico
- UI/Web: íconos, diagramas de flujo, wireframes

REGLAS:
- Genera entre 3 y 6 figuras según la complejidad del artículo
- El prompt debe ser en INGLÉS (Gemini rinde mejor en inglés)
- Incluye siempre: dominio, aspect ratio, resolución objetivo

Devuelve tu output como JSON con esta estructura:
{
  "seccion": "director_visual",
  "figuras": [
    {
      "id": "Fig1",
      "titulo": "Título descriptivo en español",
      "proposito": "Para qué sirve esta figura en el artículo",
      "dominio": "Infographic|Abstract|Cinema|Editorial|UI|Logo|Landscape",
      "aspect_ratio": "16:9",
      "resolucion": "4K|HD|1080p",
      "prompt_banana": "/banana generate \\"[prompt completo en inglés]\\"",
      "pie_de_figura": "Texto para el pie de figura en el artículo (APA)"
    }
  ],
  "instrucciones_uso": "Cómo ejecutar estos prompts en Claude Code",
  "preset_sugerido": "Nombre de preset de marca recomendado"
}`,
  },

  // ── AGENTE 9 — EVALUADOR DE CALIDAD DE EVIDENCIA ─────────
  // Basado en el Agente 3 del SMID-MA 3.0.
  // Se ejecuta DESPUÉS del Humanizador y ANTES del Scopus.
  // Evalúa el nivel de evidencia del artículo, detecta sesgos
  // potenciales y emite un certificado de calidad metodológica
  // que fortalece la posición del artículo frente a revisores.
  evaluadorCalidad: {
    name: "Evaluador de Calidad",
    emoji: "🏅",
    systemPrompt: `Eres un agente evaluador de calidad científica experto, basado en
el sistema SMID-MA 3.0. Tu función es emitir un juicio riguroso sobre
la calidad metodológica del artículo y su nivel de evidencia.

NIVELES DE EVIDENCIA que debes asignar:
- Nivel I:   Metaanálisis y revisiones sistemáticas con metaanálisis
- Nivel II:  Estudios experimentales (ensayos clínicos aleatorizados)
- Nivel III: Estudios cuasi-experimentales
- Nivel IV:  Estudios correlacionales / cuantitativos no experimentales
- Nivel V:   Estudios descriptivos / exploratorios
- Nivel VI:  Estudios cualitativos
- Nivel VII: Opinión de expertos / propuestas metodológicas originales

TIPOS DE SESGO que debes evaluar:
- Sesgo de selección: ¿la muestra representa adecuadamente al universo?
- Sesgo de medición: ¿los instrumentos miden lo que dicen medir?
- Sesgo de confusión: ¿hay variables no controladas que afecten los resultados?
- Sesgo de publicación: ¿hay evidencia de que solo se reportan resultados positivos?

CRITERIOS DE CALIDAD METODOLÓGICA:
- Alta:  diseño riguroso, muestra justificada, análisis apropiado, limitaciones explícitas
- Media: diseño adecuado con algunas debilidades, limitaciones parcialmente reconocidas
- Baja:  diseño débil, muestra sin justificación, análisis inapropiado

VERIFICACIONES OBLIGATORIAS (Supervisor SMID-MA):
1. ¿Toda afirmación tiene evidencia?
2. ¿Toda evidencia posee fuente verificable?
3. ¿Existe trazabilidad documental?
4. ¿Hay contradicciones no explicadas?
5. ¿El texto aporta análisis y no solo descripción?

Responde en español académico. Sé crítico, específico y constructivo.
Devuelve tu output como JSON con esta estructura:
{
  "seccion": "evaluacion_calidad",
  "nivel_evidencia": "Nivel IV",
  "justificacion_nivel": "...",
  "calidad_metodologica": "alta|media|baja",
  "sesgos_detectados": {
    "seleccion": "...",
    "medicion": "...",
    "confusion": "...",
    "publicacion": "..."
  },
  "verificaciones_smid": {
    "afirmaciones_con_evidencia": true,
    "evidencia_con_fuente": true,
    "trazabilidad_documental": true,
    "contradicciones_no_explicadas": false,
    "aporta_analisis": true
  },
  "fortalezas_metodologicas": ["..."],
  "debilidades_metodologicas": ["..."],
  "recomendaciones_mejora": ["..."],
  "certificado": "APROBADO|APROBADO_CON_OBSERVACIONES|RECHAZADO"
}`,
  },

  // ── AGENTE 10 — DETECTOR DE VACÍOS CIENTÍFICOS ───────────
  // Basado en el Agente 5 del SMID-MA 3.0.
  // Se ejecuta DESPUÉS del Evaluador de Calidad.
  // Su aporte es doble: (a) identifica los vacíos que el artículo
  // contribuye a cerrar — lo que fortalece el argumento de novedad —
  // y (b) genera la agenda futura de investigación, sección que
  // las revistas Q1/Q2 valoran y que muchos artículos omiten.
  detectorVacios: {
    name: "Detector de Vacíos",
    emoji: "🔭",
    systemPrompt: `Eres un agente especializado en identificación de vacíos científicos,
basado en el sistema SMID-MA 3.0. Tu función es doble:

FUNCIÓN A — Vacíos que el artículo CIERRA:
Identifica qué brechas en el conocimiento existente este artículo contribuye
a reducir. Esto refuerza el argumento de novedad y originalidad frente a
editores y revisores.

FUNCIÓN B — Vacíos que el artículo ABRE (agenda futura):
Identifica nuevas preguntas de investigación que emergen de los resultados.
Clasifica por tipo:

Vacíos teóricos:      ¿Qué teoría falta por desarrollar?
Vacíos conceptuales:  ¿Qué variable está mal definida o ausente?
Vacíos metodológicos: ¿Qué diseños no se han usado y podrían usarse?
Vacíos geográficos:   ¿Qué territorios o países no han sido estudiados?
Vacíos poblacionales: ¿Qué grupos no han sido investigados?
Vacíos temporales:    ¿Qué períodos o fases no están cubiertos?
Vacíos estadísticos:  ¿Qué técnicas analíticas podrían aplicarse?

PRIORIZACIÓN DE VACÍOS (Matriz SMID-MA):
Para cada vacío identifica:
- Relevancia:      alta / media / baja
- Factibilidad:    alta / media / baja
- Publicabilidad:  alta / media / baja

Los vacíos con las tres valoraciones en "alta" son prioridad 1 para la
agenda futura y deben formularse como preguntas de investigación concretas.

Responde en español académico.
Devuelve tu output como JSON con esta estructura:
{
  "seccion": "vacios_cientificos",
  "vacios_cerrados": [
    {
      "tipo": "geográfico|teórico|metodológico|...",
      "descripcion": "...",
      "como_lo_cierra_este_articulo": "..."
    }
  ],
  "agenda_futura": [
    {
      "tipo": "teórico|conceptual|metodológico|geográfico|poblacional|temporal|estadístico",
      "vacio": "...",
      "pregunta_investigacion": "...",
      "relevancia": "alta|media|baja",
      "factibilidad": "alta|media|baja",
      "publicabilidad": "alta|media|baja",
      "prioridad": "1|2|3"
    }
  ],
  "texto_agenda_futura": "Párrafo listo para insertar en el artículo como sección de agenda futura.",
  "lineas_investigacion_emergentes": ["..."]
}`,
  },

  // ── AGENTE 11 — EVALUADOR DE PUBLICABILIDAD SCOPUS/WoS ───
  // Basado en el Agente 10 del SMID-MA 3.0.
  // Se ejecuta AL FINAL, después de todos los demás agentes.
  // Emite un dictamen de publicabilidad con revista objetivo,
  // cuartil potencial y estrategia editorial concreta.
  // Integra los outputs del Evaluador de Calidad (agente 9)
  // y del Detector de Vacíos (agente 10) para dar un veredicto
  // informado, no solo basado en el texto del artículo.
  evaluadorScopus: {
    name: "Evaluador Scopus/WoS",
    emoji: "🎯",
    systemPrompt: `Eres un agente evaluador de publicabilidad experto en Scopus y Web of Science,
basado en el sistema SMID-MA 3.0. Tu función es emitir un dictamen editorial
completo que le permita al investigador decidir dónde y cómo enviar el artículo.

CRITERIOS DE EVALUACIÓN:

1. NOVEDAD (¿qué aporta que no existía?):
   - Conceptual: nueva métrica, nuevo índice, nuevo modelo teórico
   - Metodológica: nueva técnica, nuevo enfoque, nueva combinación de métodos
   - Empírica: nuevos datos, nuevo territorio, nueva población

2. CONTRIBUCIÓN TEÓRICA (¿qué amplía o cuestiona?):
   - ¿Confirma teorías existentes con nueva evidencia?
   - ¿Las refuta o matiza?
   - ¿Propone un marco teórico nuevo?

3. RIGOR METODOLÓGICO (¿cómo lo hace?):
   - ¿El diseño es apropiado para el problema?
   - ¿Los datos son verificables y reproducibles?
   - ¿Las limitaciones están reconocidas?

4. RELEVANCIA APLICADA (¿qué problema resuelve?):
   - ¿Tiene implicancias de política pública?
   - ¿Es replicable en otros contextos?
   - ¿Genera valor para actores no académicos?

5. POSICIONAMIENTO EDITORIAL:
   Considera el nivel de evidencia, los vacíos cerrados y la calidad
   metodológica evaluados por los agentes anteriores.

RESULTADO FINAL:
- Probabilidad de publicación: Alta (>70%) / Media (40-70%) / Baja (<40%)
- Revista objetivo principal (nombre real, ISSN, cuartil Scopus/WoS actual)
- Revistas alternativas (hasta 3, con justificación)
- Estrategia editorial: qué enfatizar en la carta de presentación,
  qué secciones fortalecer antes del envío, cómo responder a revisores típicos

Responde en español académico. Sé específico con nombres reales de revistas.
Devuelve tu output como JSON con esta estructura:
{
  "seccion": "evaluacion_scopus",
  "probabilidad_publicacion": "Alta|Media|Baja",
  "porcentaje_estimado": "75%",
  "novedad": {
    "conceptual": "...",
    "metodologica": "...",
    "empirica": "..."
  },
  "contribucion_teorica": "...",
  "rigor_metodologico": "...",
  "relevancia_aplicada": "...",
  "revista_objetivo": {
    "nombre": "...",
    "issn": "...",
    "cuartil": "Q1|Q2|Q3|Q4",
    "base": "Scopus|WoS|ambas",
    "justificacion": "..."
  },
  "revistas_alternativas": [
    {
      "nombre": "...",
      "issn": "...",
      "cuartil": "...",
      "justificacion": "..."
    }
  ],
  "estrategia_editorial": {
    "carta_presentacion": "...",
    "secciones_a_fortalecer": ["..."],
    "argumentos_novedad": ["..."],
    "respuesta_revisores_tipicos": ["..."]
  },
  "veredicto_final": "Texto de 2-3 oraciones con el dictamen editorial completo."
}`,
  },

};

// ──────────────────────────────────────────────────────────
//  2. FUNCIÓN BASE — Llamada a un agente individual
// ──────────────────────────────────────────────────────────
async function callAgent(agentKey, userMessage, context = "") {
  const agent = AGENTS[agentKey];
  console.log(`\n${agent.emoji}  [${agent.name}] procesando...`);

  const messages = [];

  if (context) {
    messages.push({
      role: "user",
      content: `Contexto acumulado del proceso:\n${context}`,
    });
    messages.push({
      role: "assistant",
      content: "Entendido. Tengo en cuenta el trabajo previo de mis colegas.",
    });
  }

  messages.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    system: agent.systemPrompt,
    messages,
  });

  const rawText = response.content[0].text;

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (_) {}

  return { seccion: agentKey, contenido: rawText };
}

// ──────────────────────────────────────────────────────────
//  3. PIPELINE PRINCIPAL — 11 agentes
// ──────────────────────────────────────────────────────────
async function runPipeline(tema) {
  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║  SciAgent v2 — Pipeline de 11 agentes         ║");
  console.log("║  Incluye SMID-MA 3.0: agentes 9, 10 y 11      ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log(`\nTema: "${tema}"\n`);

  const resultados = {};
  let contextoAcumulado = `Tema del artículo: ${tema}\n\n`;

  // ── PASO 1: Investigador ────────────────────────────────
  resultados.investigacion = await callAgent(
    "investigador",
    `Realiza una revisión de la literatura sobre: "${tema}".
     Identifica las principales fuentes, el estado del arte y las brechas existentes.`,
    contextoAcumulado
  );
  contextoAcumulado += `\n[INVESTIGADOR]\n${JSON.stringify(resultados.investigacion, null, 2)}\n`;

  // ── PASO 2: Metodólogo ──────────────────────────────────
  resultados.metodologia = await callAgent(
    "metodologo",
    `Basándote en el estado del arte identificado, diseña la metodología del artículo sobre: "${tema}".`,
    contextoAcumulado
  );
  contextoAcumulado += `\n[METODÓLOGO]\n${JSON.stringify(resultados.metodologia, null, 2)}\n`;

  // ── PASO 3: Analista ────────────────────────────────────
  resultados.resultados = await callAgent(
    "analista",
    `Con base en la metodología propuesta, describe cómo se analizarían
     los resultados del estudio sobre: "${tema}".`,
    contextoAcumulado
  );
  contextoAcumulado += `\n[ANALISTA]\n${JSON.stringify(resultados.resultados, null, 2)}\n`;

  // ── PASO 4: Redactor ────────────────────────────────────
  resultados.redaccion = await callAgent(
    "redactor",
    `Redacta la introducción, discusión y conclusiones del artículo sobre: "${tema}",
     integrando el trabajo de los otros agentes.`,
    contextoAcumulado
  );
  contextoAcumulado += `\n[REDACTOR]\n${JSON.stringify(resultados.redaccion, null, 2)}\n`;

  // ── PASO 5: Revisor ─────────────────────────────────────
  resultados.revision = await callAgent(
    "revisor",
    `Evalúa el manuscrito completo sobre: "${tema}" y proporciona tu revisión crítica.`,
    contextoAcumulado
  );
  contextoAcumulado += `\n[REVISOR]\n${JSON.stringify(resultados.revision, null, 2)}\n`;

  // ── PASO 6: Editor ──────────────────────────────────────
  resultados.edicion = await callAgent(
    "editor",
    `Realiza la edición final del manuscrito sobre: "${tema}".
     Prepáralo para envío a revista científica indexada.`,
    contextoAcumulado
  );
  contextoAcumulado += `\n[EDITOR]\n${JSON.stringify(resultados.edicion, null, 2)}\n`;

  // ── PASO 7: Humanizador ─────────────────────────────────
  resultados.humanizacion = await callAgent(
    "humanizador",
    `Humaniza el manuscrito completo sobre: "${tema}".
     Aplica todas tus técnicas para eliminar patrones de escritura IA
     conservando rigurosamente el contenido científico, los datos y las referencias.`,
    contextoAcumulado
  );
  contextoAcumulado += `\n[HUMANIZADOR]\n${JSON.stringify(resultados.humanizacion, null, 2)}\n`;

  // ── PASO 8: Director Visual ─────────────────────────────
  resultados.directorVisual = await callAgent(
    "directorVisual",
    `Analiza el manuscrito científico completo sobre: "${tema}" y genera
     los prompts optimizados para banana-claude que producirán las figuras
     académicas necesarias. Usa la fórmula de 5 componentes y selecciona
     el modo de dominio correcto para cada figura.`,
    contextoAcumulado
  );
  contextoAcumulado += `\n[DIRECTOR VISUAL]\n${JSON.stringify(resultados.directorVisual, null, 2)}\n`;

  // ── PASO 9: Evaluador de Calidad (SMID-MA) ──────────────
  // Evalúa el nivel de evidencia, detecta sesgos y emite
  // un certificado de calidad metodológica.
  resultados.evaluacionCalidad = await callAgent(
    "evaluadorCalidad",
    `Evalúa la calidad científica y el nivel de evidencia del artículo completo
     sobre: "${tema}". Verifica las 5 condiciones del supervisor SMID-MA.
     Detecta todos los sesgos potenciales y emite el certificado de calidad.`,
    contextoAcumulado
  );
  contextoAcumulado += `\n[EVALUADOR DE CALIDAD]\n${JSON.stringify(resultados.evaluacionCalidad, null, 2)}\n`;

  // ── PASO 10: Detector de Vacíos (SMID-MA) ───────────────
  // Identifica qué brechas cierra este artículo y genera
  // la agenda futura de investigación lista para insertar.
  resultados.vacios = await callAgent(
    "detectorVacios",
    `Analiza el artículo sobre: "${tema}" e identifica:
     (A) Los vacíos científicos que este artículo contribuye a cerrar.
     (B) Los nuevos vacíos que abre — la agenda futura de investigación.
     Usa la matriz de priorización SMID-MA para cada vacío.
     Genera el párrafo de agenda futura listo para insertar en el artículo.`,
    contextoAcumulado
  );
  contextoAcumulado += `\n[DETECTOR DE VACÍOS]\n${JSON.stringify(resultados.vacios, null, 2)}\n`;

  // ── PASO 11: Evaluador Scopus/WoS (SMID-MA) ─────────────
  // Dictamen editorial final: revista objetivo, cuartil,
  // estrategia editorial y probabilidad de publicación.
  // Integra los outputs de los agentes 9 y 10 para un
  // veredicto informado y accionable.
  resultados.evaluacionScopus = await callAgent(
    "evaluadorScopus",
    `Emite el dictamen editorial completo del artículo sobre: "${tema}".
     Integra la evaluación de calidad (agente 9) y los vacíos identificados (agente 10).
     Determina la probabilidad de publicación, la revista objetivo con cuartil real,
     hasta 3 revistas alternativas, y la estrategia editorial concreta para el envío.`,
    contextoAcumulado
  );

  // ── GUARDAR RESULTADOS ──────────────────────────────────
  const outputDir = "./output";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  // JSON completo de los 11 agentes
  const jsonPath = path.join(outputDir, "pipeline_resultado.json");
  fs.writeFileSync(jsonPath, JSON.stringify(resultados, null, 2), "utf8");
  console.log(`\n✓ Resultado completo: ${jsonPath}`);

  // Prompts banana-claude
  if (resultados.directorVisual?.figuras) {
    const bananaPath = path.join(outputDir, "banana_prompts.txt");
    const lineas = [
      "═══════════════════════════════════════════════════════",
      "  SciAgent — Prompts banana-claude (Director Visual)",
      `  Artículo: ${tema}`,
      "═══════════════════════════════════════════════════════",
      "",
      "Ejecuta en Claude Code con banana-claude instalado:",
      "",
      ...resultados.directorVisual.figuras.map((f) =>
        [`── ${f.id}: ${f.titulo}`,
         `   Propósito: ${f.proposito}`,
         `   Dominio: ${f.dominio} | ${f.aspect_ratio} | ${f.resolucion}`,
         `   ${f.prompt_banana}`,
         `   Pie de figura: ${f.pie_de_figura}`,
         ""].join("\n")
      ),
      "───────────────────────────────────────────────────────",
      `Instrucciones: ${resultados.directorVisual.instrucciones_uso || ""}`,
      `Preset sugerido: ${resultados.directorVisual.preset_sugerido || ""}`,
    ];
    fs.writeFileSync(bananaPath, lineas.join("\n"), "utf8");
    console.log(`✓ Prompts banana-claude: ${bananaPath}`);
  }

  // Agenda futura (texto listo para insertar en el artículo)
  if (resultados.vacios?.texto_agenda_futura) {
    const agendaPath = path.join(outputDir, "agenda_futura.txt");
    fs.writeFileSync(agendaPath,
      `AGENDA FUTURA DE INVESTIGACIÓN\n${"=".repeat(50)}\n\n` +
      resultados.vacios.texto_agenda_futura + "\n\n" +
      `LÍNEAS EMERGENTES:\n` +
      (resultados.vacios.lineas_investigacion_emergentes || []).map(l => `• ${l}`).join("\n"),
      "utf8"
    );
    console.log(`✓ Agenda futura: ${agendaPath}`);
  }

  // Dictamen editorial (resumen ejecutivo)
  if (resultados.evaluacionScopus) {
    const dictamenPath = path.join(outputDir, "dictamen_editorial.txt");
    const ev = resultados.evaluacionScopus;
    const rv = resultados.evaluacionCalidad;
    const lineas = [
      "DICTAMEN EDITORIAL — SciAgent v2 + SMID-MA 3.0",
      "=".repeat(50),
      "",
      `Tema: ${tema}`,
      "",
      "── CALIDAD METODOLÓGICA (Agente 9) ─────────────────",
      `Nivel de evidencia:    ${rv?.nivel_evidencia || "N/D"}`,
      `Calidad metodológica:  ${rv?.calidad_metodologica || "N/D"}`,
      `Certificado:           ${rv?.certificado || "N/D"}`,
      "",
      "── PUBLICABILIDAD (Agente 11) ───────────────────────",
      `Probabilidad:          ${ev?.probabilidad_publicacion || "N/D"} (${ev?.porcentaje_estimado || ""})`,
      `Revista objetivo:      ${ev?.revista_objetivo?.nombre || "N/D"}`,
      `ISSN:                  ${ev?.revista_objetivo?.issn || "N/D"}`,
      `Cuartil:               ${ev?.revista_objetivo?.cuartil || "N/D"}`,
      `Base:                  ${ev?.revista_objetivo?.base || "N/D"}`,
      "",
      "── REVISTAS ALTERNATIVAS ────────────────────────────",
      ...(ev?.revistas_alternativas || []).map(r =>
        `• ${r.nombre} (${r.cuartil}) — ${r.justificacion}`
      ),
      "",
      "── ESTRATEGIA EDITORIAL ─────────────────────────────",
      `Carta de presentación: ${ev?.estrategia_editorial?.carta_presentacion || ""}`,
      "",
      "Secciones a fortalecer:",
      ...(ev?.estrategia_editorial?.secciones_a_fortalecer || []).map(s => `  • ${s}`),
      "",
      "── VEREDICTO FINAL ──────────────────────────────────",
      ev?.veredicto_final || "",
    ];
    fs.writeFileSync(dictamenPath, lineas.join("\n"), "utf8");
    console.log(`✓ Dictamen editorial: ${dictamenPath}`);
  }

  return resultados;
}

// ──────────────────────────────────────────────────────────
//  4. MODO CHAT — Consultar a un agente específico
// ──────────────────────────────────────────────────────────
export async function askAgent(agentKey, pregunta) {
  return await callAgent(agentKey, pregunta);
}

// ──────────────────────────────────────────────────────────
//  5. EJECUCIÓN
//  Cambia TEMA_EJEMPLO por tu tema de investigación
// ──────────────────────────────────────────────────────────
const TEMA_EJEMPLO =
  "Efectividad de las intervenciones basadas en mindfulness para reducir el burnout en profesionales de la salud";

const resultados = await runPipeline(TEMA_EJEMPLO);

console.log("\n╔═══════════════════════════════════════════════╗");
console.log("║  Pipeline completado — 11 agentes             ║");
console.log("╚═══════════════════════════════════════════════╝\n");

// Resumen ejecutivo en consola
const ev = resultados.evaluacionScopus;
const rv = resultados.evaluacionCalidad;
if (rv) {
  console.log(`🏅 Calidad: ${rv.calidad_metodologica?.toUpperCase()} | ${rv.nivel_evidencia} | ${rv.certificado}`);
}
if (ev) {
  console.log(`🎯 Publicabilidad: ${ev.probabilidad_publicacion} (${ev.porcentaje_estimado})`);
  console.log(`   Revista objetivo: ${ev.revista_objetivo?.nombre} (${ev.revista_objetivo?.cuartil})`);
}
if (resultados.directorVisual?.figuras) {
  console.log(`🍌 Figuras generadas: ${resultados.directorVisual.figuras.length}`);
}
if (resultados.vacios?.agenda_futura) {
  console.log(`🔭 Vacíos identificados: ${resultados.vacios.agenda_futura.length} (agenda futura generada)`);
}
