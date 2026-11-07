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
import { fileURLToPath } from "url";

const client = new Anthropic();

// ──────────────────────────────────────────────────────────
//  1. DEFINICIÓN DE AGENTES
// ──────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
//  CONTEXTO SELECTIVO: cada agente declara qué resultados
//  previos necesita. Reduce tokens enviados en ~50%.
//  TOKENS: cada agente declara su max_tokens según necesidad.
// ──────────────────────────────────────────────────────────

const AGENTS = {

  // ── AGENTE 0 — VERIFICADOR PREVIO ────────────────────────
  // Checklist obligatorio antes de ejecutar el pipeline.
  // Detecta problemas en el brief del usuario (tema vago,
  // datos faltantes, objetivos contradictorios) que harían
  // fallar o degradar la calidad de los agentes siguientes.
  // Si el brief no pasa, el pipeline no se ejecuta.
  verificadorPrevio: {
    name: "Verificador Previo",
    emoji: "🛡️",
    maxTokens: 1500,
    necesita: [],
    systemPrompt: `Eres el Agente 0 del sistema SciAgent v3: el Verificador Previo.
Tu función es evaluar si el brief del investigador es suficientemente claro y
completo para que el pipeline de 11 agentes produzca resultados de calidad.

CHECKLIST QUE DEBES VERIFICAR:

1. CLARIDAD DEL TEMA
   - ¿El tema está delimitado (no es "educación" sino "uso de TIC en educación rural en Perú")?
   - ¿Contiene una variable dependiente e independiente identificables?
   - ¿El alcance geográfico y/o poblacional está implícito o explícito?

2. VIABILIDAD METODOLÓGICA
   - ¿El tema permite un diseño de investigación concreto?
   - ¿Existen datos o evidencias accesibles sobre el tema?
   - ¿Es un tema con literatura científica indexada suficiente?

3. ORIGINALIDAD MÍNIMA
   - ¿El tema aporta algo diferente a lo que ya existe (territorio, población, método)?
   - ¿No es una replicación exacta sin valor agregado?

4. DATOS ADICIONALES ÚTILES (no obligatorios, pero mejoran el resultado)
   - ¿El investigador indicó la disciplina o área del conocimiento?
   - ¿Indicó la revista objetivo o tipo de publicación?
   - ¿Indicó el tipo de estudio preferido (cuantitativo, cualitativo, mixto)?
   - ¿Hay datos propios o fuentes específicas disponibles?

RESULTADO:
- Si el tema pasa el checklist: APROBADO — el pipeline puede ejecutarse.
- Si el tema tiene problemas críticos: RECHAZADO — devuelve preguntas concretas al investigador.
- Si el tema es mejorable: APROBADO_CON_SUGERENCIAS — aprueba pero recomienda ajustes.

Devuelve tu output como JSON:
{
  "seccion": "verificador_previo",
  "veredicto": "APROBADO|APROBADO_CON_SUGERENCIAS|RECHAZADO",
  "tema_reformulado": "Versión mejorada del tema si detectas cómo clarificarlo (o null)",
  "checklist": {
    "claridad_tema": true,
    "viabilidad_metodologica": true,
    "originalidad_minima": true
  },
  "datos_adicionales_detectados": {
    "disciplina": "...",
    "revista_objetivo": null,
    "tipo_estudio": null,
    "datos_propios": false
  },
  "problemas_criticos": ["..."],
  "sugerencias_mejora": ["..."],
  "preguntas_al_investigador": ["..."],
  "mensaje_consola": "Texto breve (1-2 líneas) que se mostrará al investigador antes de arrancar el pipeline."
}`,
  },

  // ── AGENTE 1 ─────────────────────────────────────────────
  investigador: {
    name: "Investigador",
    emoji: "🔍",
    maxTokens: 2000,
    necesita: [],  // primer agente, no necesita contexto previo
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
    maxTokens: 2000,
    necesita: ["investigacion"],
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
    maxTokens: 2000,
    necesita: ["investigacion", "metodologia"],
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
    maxTokens: 4000,  // necesita espacio para intro + discusión + conclusiones completas
    necesita: ["investigacion", "metodologia", "resultados"],
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
    maxTokens: 2000,
    necesita: ["metodologia", "resultados", "redaccion"],
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
    maxTokens: 2000,
    necesita: ["redaccion", "revision"],
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
    maxTokens: 4000,  // recibe texto completo de 6 secciones, necesita espacio para devolver todo
    necesita: ["redaccion", "revision", "edicion"],
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
    maxTokens: 2000,
    necesita: ["redaccion", "resultados"],  // solo necesita el texto y los resultados, no la evaluación
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
    maxTokens: 2500,
    necesita: ["investigacion", "metodologia", "resultados", "redaccion", "humanizacion"],
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
    maxTokens: 2500,
    necesita: ["investigacion", "redaccion", "evaluacionCalidad"],
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
    maxTokens: 2500,
    necesita: ["redaccion", "humanizacion", "evaluacionCalidad", "vacios"],  // solo lo que realmente necesita para el dictamen
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
//  2. PARSER JSON ROBUSTO — 3 estrategias en cascada
// ──────────────────────────────────────────────────────────
function parseJSON(rawText, agentKey) {
  // Estrategia 1: bloque ```json ... ``` explícito
  const fenced = rawText.match(/```json\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch (_) {}
  }

  // Estrategia 2: buscar el primer { que abre y su cierre balanceado
  // (evita capturar texto antes/después del JSON)
  const start = rawText.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    for (let i = start; i < rawText.length; i++) {
      if (rawText[i] === "{") depth++;
      else if (rawText[i] === "}") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(rawText.slice(start, i + 1)); } catch (_) { break; }
        }
      }
    }
  }

  // Estrategia 3: fallback — devolver texto plano como campo contenido
  console.warn(`  ⚠️  [${agentKey}] no devolvió JSON válido — guardando texto plano`);
  return { seccion: agentKey, contenido: rawText };
}

// ──────────────────────────────────────────────────────────
//  3. CONSTRUCCIÓN DE CONTEXTO SELECTIVO
//  Cada agente solo recibe los resultados que necesita,
//  reduciendo el costo por pipeline en ~50%.
// ──────────────────────────────────────────────────────────
function buildContext(agentKey, tema, resultados) {
  const agent = AGENTS[agentKey];
  const claves = agent.necesita || [];

  if (claves.length === 0) return "";  // primer agente: no necesita contexto

  const partes = [`Tema del artículo: ${tema}\n`];
  for (const clave of claves) {
    if (resultados[clave]) {
      const label = clave.toUpperCase();
      partes.push(`[${label}]\n${JSON.stringify(resultados[clave], null, 2)}`);
    }
  }
  return partes.join("\n\n");
}

// ──────────────────────────────────────────────────────────
//  4. FUNCIÓN BASE — Llamada a un agente individual
// ──────────────────────────────────────────────────────────
async function callAgent(agentKey, userMessage, context = "") {
  const agent = AGENTS[agentKey];
  console.log(`\n${agent.emoji}  [${agent.name}] procesando...`);

  const messages = [];

  if (context) {
    messages.push({
      role: "user",
      content: `Contexto del proceso:\n${context}`,
    });
    messages.push({
      role: "assistant",
      content: "Entendido. Tengo en cuenta el trabajo previo.",
    });
  }

  messages.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: agent.maxTokens || 2000,
    system: agent.systemPrompt,
    messages,
  });

  const rawText = response.content[0].text;
  return parseJSON(rawText, agentKey);
}

// ──────────────────────────────────────────────────────────
//  5. PIPELINE PRINCIPAL — 11 agentes
// ──────────────────────────────────────────────────────────
async function runPipeline(tema) {
  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║  SciAgent v3 — Pipeline de 12 agentes         ║");
  console.log("║  Agente 0 + Agentes 1–8 + SMID-MA 3.0 (9–11) ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log(`\nTema: "${tema}"\n`);

  const resultados = {};

  // ── PASO 0: Verificador Previo ──────────────────────────
  // Evalúa si el brief es suficiente antes de gastar tokens
  // en los 11 agentes. Si falla, detiene el pipeline.
  resultados.verificacion = await callAgent(
    "verificadorPrevio",
    `Evalúa si el siguiente tema de investigación es suficientemente claro
     y viable para ejecutar el pipeline científico completo:
     "${tema}"
     Verifica el checklist completo y emite tu veredicto.`,
    buildContext("verificadorPrevio", tema, resultados)
  );

  const veredicto = resultados.verificacion?.veredicto;
  const msgConsola = resultados.verificacion?.mensaje_consola || "";

  if (veredicto === "RECHAZADO") {
    console.log("\n🛡️  [Verificador Previo] RECHAZADO — Pipeline detenido.");
    console.log(`\n${msgConsola}\n`);
    const preguntas = resultados.verificacion?.preguntas_al_investigador || [];
    if (preguntas.length) {
      console.log("Responde estas preguntas antes de continuar:");
      preguntas.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    }
    // Guardar el dictamen de rechazo para que el investigador lo revise
    const outputDir = "./output";
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    fs.writeFileSync(
      path.join(outputDir, "verificacion_previa.json"),
      JSON.stringify(resultados.verificacion, null, 2), "utf8"
    );
    console.log("\n✓ Detalle guardado en: ./output/verificacion_previa.json");
    return resultados;
  }

  if (veredicto === "APROBADO_CON_SUGERENCIAS") {
    console.log(`\n🛡️  [Verificador Previo] APROBADO CON SUGERENCIAS`);
    console.log(`   ${msgConsola}`);
    // Si el agente propone un tema reformulado, usarlo
    if (resultados.verificacion?.tema_reformulado) {
      console.log(`\n   📝 Tema reformulado: "${resultados.verificacion.tema_reformulado}"`);
      tema = resultados.verificacion.tema_reformulado;
    }
    console.log("");
  } else {
    console.log(`\n🛡️  [Verificador Previo] APROBADO — ${msgConsola}\n`);
  }

  // ── PASO 1: Investigador ────────────────────────────────
  resultados.investigacion = await callAgent(
    "investigador",
    `Realiza una revisión de la literatura sobre: "${tema}".
     Identifica las principales fuentes, el estado del arte y las brechas existentes.`,
    buildContext("investigador", tema, resultados)
  );

  // ── PASO 2: Metodólogo ──────────────────────────────────
  resultados.metodologia = await callAgent(
    "metodologo",
    `Basándote en el estado del arte identificado, diseña la metodología del artículo sobre: "${tema}".`,
    buildContext("metodologo", tema, resultados)
  );

  // ── PASO 3: Analista ────────────────────────────────────
  resultados.resultados = await callAgent(
    "analista",
    `Con base en la metodología propuesta, describe cómo se analizarían
     los resultados del estudio sobre: "${tema}".`,
    buildContext("analista", tema, resultados)
  );

  // ── PASO 4: Redactor ────────────────────────────────────
  resultados.redaccion = await callAgent(
    "redactor",
    `Redacta la introducción, discusión y conclusiones del artículo sobre: "${tema}",
     integrando el trabajo de los otros agentes.`,
    buildContext("redactor", tema, resultados)
  );

  // ── PASO 5: Revisor ─────────────────────────────────────
  resultados.revision = await callAgent(
    "revisor",
    `Evalúa el manuscrito completo sobre: "${tema}" y proporciona tu revisión crítica.`,
    buildContext("revisor", tema, resultados)
  );

  // ── PASO 6: Editor ──────────────────────────────────────
  resultados.edicion = await callAgent(
    "editor",
    `Realiza la edición final del manuscrito sobre: "${tema}".
     Prepáralo para envío a revista científica indexada.`,
    buildContext("editor", tema, resultados)
  );

  // ── PASO 7: Humanizador ─────────────────────────────────
  resultados.humanizacion = await callAgent(
    "humanizador",
    `Humaniza el manuscrito completo sobre: "${tema}".
     Aplica todas tus técnicas para eliminar patrones de escritura IA
     conservando rigurosamente el contenido científico, los datos y las referencias.`,
    buildContext("humanizador", tema, resultados)
  );

  // ── PASO 8: Director Visual ─────────────────────────────
  resultados.directorVisual = await callAgent(
    "directorVisual",
    `Analiza el manuscrito científico completo sobre: "${tema}" y genera
     los prompts optimizados para banana-claude que producirán las figuras
     académicas necesarias. Usa la fórmula de 5 componentes y selecciona
     el modo de dominio correcto para cada figura.`,
    buildContext("directorVisual", tema, resultados)
  );

  // ── PASO 9: Evaluador de Calidad (SMID-MA) ──────────────
  resultados.evaluacionCalidad = await callAgent(
    "evaluadorCalidad",
    `Evalúa la calidad científica y el nivel de evidencia del artículo completo
     sobre: "${tema}". Verifica las 5 condiciones del supervisor SMID-MA.
     Detecta todos los sesgos potenciales y emite el certificado de calidad.`,
    buildContext("evaluadorCalidad", tema, resultados)
  );

  // ── PASO 10: Detector de Vacíos (SMID-MA) ───────────────
  resultados.vacios = await callAgent(
    "detectorVacios",
    `Analiza el artículo sobre: "${tema}" e identifica:
     (A) Los vacíos científicos que este artículo contribuye a cerrar.
     (B) Los nuevos vacíos que abre — la agenda futura de investigación.
     Usa la matriz de priorización SMID-MA para cada vacío.
     Genera el párrafo de agenda futura listo para insertar en el artículo.`,
    buildContext("detectorVacios", tema, resultados)
  );

  // ── PASO 11: Evaluador Scopus/WoS (SMID-MA) ─────────────
  resultados.evaluacionScopus = await callAgent(
    "evaluadorScopus",
    `Emite el dictamen editorial completo del artículo sobre: "${tema}".
     Integra la evaluación de calidad (agente 9) y los vacíos identificados (agente 10).
     Determina la probabilidad de publicación, la revista objetivo con cuartil real,
     hasta 3 revistas alternativas, y la estrategia editorial concreta para el envío.`,
    buildContext("evaluadorScopus", tema, resultados)
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
//  6. MODO CHAT — Consultar a un agente específico
// ──────────────────────────────────────────────────────────
export async function askAgent(agentKey, pregunta) {
  return await callAgent(agentKey, pregunta);
}

// ──────────────────────────────────────────────────────────
//  7. EJECUCIÓN — solo cuando se llama directamente
//  (node orchestrator.js), no cuando se importa como módulo.
//  Cambia TEMA_EJEMPLO por tu tema de investigación.
// ──────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
const TEMA_EJEMPLO =
  "Efectividad de las intervenciones basadas en mindfulness para reducir el burnout en profesionales de la salud";

const resultados = await runPipeline(TEMA_EJEMPLO);

console.log("\n╔═══════════════════════════════════════════════╗");
console.log("║  Pipeline completado — 12 agentes             ║");
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
} // fin guarda ejecución directa
