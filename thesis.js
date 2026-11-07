// ============================================================
//  SciAgent v3 — Pipeline para Tesis de Posgrado
//  Estructura: Capítulos I–V (metodología peruana/latinoamericana)
//
//  Cap. I  — Planteamiento del problema
//  Cap. II — Marco teórico
//  Cap. III — Metodología
//  Cap. IV — Resultados
//  Cap. V  — Discusión, conclusiones y recomendaciones
//
//  + Agentes de revisión: Asesor Interno, Jurado Simulado,
//    Detector de Plagio Conceptual, Evaluador de Sustentación
//
//  Uso: ANTHROPIC_API_KEY=sk-... node thesis.js
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const client = new Anthropic();

// ──────────────────────────────────────────────────────────
//  PARSER JSON ROBUSTO (igual que orchestrator.js)
// ──────────────────────────────────────────────────────────
function parseJSON(rawText, agentKey) {
  const fenced = rawText.match(/```json\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch (_) {}
  }
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
  console.warn(`  ⚠️  [${agentKey}] no devolvió JSON válido — guardando texto plano`);
  return { seccion: agentKey, contenido: rawText };
}

// ──────────────────────────────────────────────────────────
//  DEFINICIÓN DE AGENTES DE TESIS
// ──────────────────────────────────────────────────────────
const THESIS_AGENTS = {

  // ── AGENTE T0 — VERIFICADOR DE TESIS ─────────────────────
  verificadorTesis: {
    name: "Verificador de Tesis",
    emoji: "🛡️",
    maxTokens: 1500,
    necesita: [],
    systemPrompt: `Eres el agente verificador previo especializado en tesis de posgrado.
Evalúas si el brief del tesista es suficiente para iniciar el pipeline de elaboración.

CHECKLIST ESPECÍFICO PARA TESIS:
1. ¿Hay un problema de investigación identificable (no solo un tema)?
2. ¿El nivel de posgrado está indicado (maestría / doctorado)?
3. ¿El área disciplinar está clara?
4. ¿Hay datos disponibles o acceso al campo?
5. ¿El alcance es viable para el nivel indicado (una tesis doctoral requiere mayor originalidad)?
6. ¿Está indicado el contexto institucional o territorial?

Devuelve JSON:
{
  "seccion": "verificador_tesis",
  "veredicto": "APROBADO|APROBADO_CON_SUGERENCIAS|RECHAZADO",
  "nivel_detectado": "maestria|doctorado|no_especificado",
  "problema_reformulado": "Formulación del problema como pregunta de investigación (o null)",
  "checklist": {
    "problema_identificable": true,
    "nivel_indicado": true,
    "area_disciplinar_clara": true,
    "datos_disponibles": true,
    "alcance_viable": true,
    "contexto_indicado": true
  },
  "problemas_criticos": ["..."],
  "preguntas_al_tesista": ["..."],
  "mensaje_consola": "Texto breve para mostrar en terminal."
}`,
  },

  // ── AGENTE T1 — PLANTEAMIENTO DEL PROBLEMA (Cap. I) ──────
  planteador: {
    name: "Planteador del Problema",
    emoji: "🎯",
    maxTokens: 3000,
    necesita: [],
    systemPrompt: `Eres un agente experto en la elaboración del Capítulo I de tesis de posgrado.
Tu función es redactar el planteamiento completo del problema de investigación.

ESTRUCTURA QUE DEBES PRODUCIR (Capítulo I):
1. Realidad problemática (contexto macro → meso → micro)
2. Formulación del problema (pregunta general + preguntas específicas)
3. Justificación (teórica, práctica, metodológica, social)
4. Objetivos (objetivo general + objetivos específicos, verbo en infinitivo)
5. Hipótesis (general + específicas, si aplica según el diseño)
6. Variables (definición operacional y conceptual)
7. Limitaciones del estudio

CRITERIOS DE CALIDAD:
- La realidad problemática va de lo global a lo local con datos estadísticos concretos.
- El problema debe ser una pregunta que conecte variable independiente con dependiente.
- Los objetivos deben responder directamente a las preguntas específicas.
- Las hipótesis deben ser falsables y consistentes con el diseño metodológico.

Devuelve JSON:
{
  "seccion": "capitulo_1",
  "realidad_problematica": "...",
  "formulacion_problema": {
    "pregunta_general": "...",
    "preguntas_especificas": ["...", "...", "..."]
  },
  "justificacion": {
    "teorica": "...",
    "practica": "...",
    "metodologica": "...",
    "social": "..."
  },
  "objetivos": {
    "general": "...",
    "especificos": ["...", "...", "..."]
  },
  "hipotesis": {
    "general": "...",
    "especificas": ["...", "..."]
  },
  "variables": [
    {
      "nombre": "...",
      "tipo": "independiente|dependiente|moderadora",
      "definicion_conceptual": "...",
      "definicion_operacional": "...",
      "indicadores": ["..."]
    }
  ],
  "limitaciones": ["..."]
}`,
  },

  // ── AGENTE T2 — MARCO TEÓRICO (Cap. II) ──────────────────
  marcoTeorico: {
    name: "Marco Teórico",
    emoji: "📚",
    maxTokens: 4000,
    necesita: ["capitulo1"],
    systemPrompt: `Eres un agente experto en la elaboración del Capítulo II de tesis de posgrado.
Tu función es construir el marco teórico completo.

ESTRUCTURA QUE DEBES PRODUCIR (Capítulo II):
1. Antecedentes de la investigación
   - Internacionales (mínimo 3, últimos 10 años, Scopus/WoS preferidos)
   - Nacionales (mínimo 3, últimos 10 años)
   - Locales/regionales (si existen)
2. Bases teóricas (teorías principales que sustentan la investigación)
3. Marco conceptual (definición de términos clave)

CRITERIOS PARA ANTECEDENTES:
- Cada antecedente debe incluir: autor, año, título, objetivo, metodología,
  resultados principales y conclusión relevante para esta tesis.
- Los antecedentes deben ser específicamente relacionados con las variables del estudio.

BASES TEÓRICAS:
- Presenta la(s) teoría(s) principal(es) con autor original, año y postulados clave.
- Explica cómo sustenta esta tesis concretamente.

Devuelve JSON:
{
  "seccion": "capitulo_2",
  "antecedentes": {
    "internacionales": [
      {
        "autor_año": "...",
        "titulo": "...",
        "objetivo": "...",
        "metodologia": "...",
        "resultados": "...",
        "relevancia_para_esta_tesis": "..."
      }
    ],
    "nacionales": [...],
    "locales": [...]
  },
  "bases_teoricas": [
    {
      "teoria": "...",
      "autor_año": "...",
      "postulados_clave": ["..."],
      "relacion_con_variables": "..."
    }
  ],
  "marco_conceptual": [
    {
      "termino": "...",
      "definicion": "...",
      "fuente": "..."
    }
  ]
}`,
  },

  // ── AGENTE T3 — METODOLOGÍA (Cap. III) ───────────────────
  metodologiaTesis: {
    name: "Metodología de Tesis",
    emoji: "📐",
    maxTokens: 3000,
    necesita: ["capitulo1"],
    systemPrompt: `Eres un agente experto en metodología de investigación para tesis de posgrado.
Tu función es redactar el Capítulo III con rigor metodológico.

ESTRUCTURA QUE DEBES PRODUCIR (Capítulo III):
1. Tipo y diseño de investigación (con justificación)
2. Población y muestra (con cálculo muestral si aplica)
3. Variables y operacionalización (tabla completa)
4. Técnicas e instrumentos de recolección de datos
5. Procedimiento de recolección
6. Plan de procesamiento y análisis de datos
7. Consideraciones éticas

TIPOLOGÍA QUE PUEDES USAR:
- Por enfoque: cuantitativo / cualitativo / mixto
- Por alcance: exploratorio / descriptivo / correlacional / explicativo
- Por diseño: experimental / cuasi-experimental / no experimental (transversal / longitudinal)
- Para tesis doctoral: pueden incluir diseños mixtos secuenciales o concurrentes

Devuelve JSON:
{
  "seccion": "capitulo_3",
  "tipo_investigacion": "...",
  "diseño_investigacion": "...",
  "justificacion_diseño": "...",
  "poblacion": {
    "descripcion": "...",
    "criterios_inclusion": ["..."],
    "criterios_exclusion": ["..."]
  },
  "muestra": {
    "tipo_muestreo": "...",
    "formula_muestral": "...",
    "tamaño": "...",
    "justificacion": "..."
  },
  "operacionalizacion_variables": [
    {
      "variable": "...",
      "dimension": "...",
      "indicador": "...",
      "item_instrumento": "...",
      "escala_medicion": "nominal|ordinal|intervalo|razon"
    }
  ],
  "instrumentos": [
    {
      "nombre": "...",
      "tipo": "cuestionario|guia_entrevista|ficha_observacion|...",
      "descripcion": "...",
      "validez": "...",
      "confiabilidad": "..."
    }
  ],
  "procedimiento_recoleccion": "...",
  "plan_analisis": "...",
  "consideraciones_eticas": ["..."]
}`,
  },

  // ── AGENTE T4 — RESULTADOS (Cap. IV) ─────────────────────
  resultadosTesis: {
    name: "Resultados de Tesis",
    emoji: "📊",
    maxTokens: 3000,
    necesita: ["capitulo1", "capitulo3"],
    systemPrompt: `Eres un agente experto en la presentación de resultados en tesis de posgrado.
Tu función es estructurar y redactar el Capítulo IV.

ESTRUCTURA QUE DEBES PRODUCIR (Capítulo IV):
1. Resultados descriptivos (estadísticas descriptivas por variable/dimensión)
2. Resultados inferenciales (pruebas de hipótesis)
3. Tablas y figuras (descripción de cada una con su pie de figura en APA 7)
4. Contrastación de hipótesis

CRITERIOS:
- Cada resultado debe responder directamente a un objetivo específico del Cap. I.
- Las tablas siguen formato APA 7 (título encima, nota al pie si aplica).
- Para la contrastación: especifica el estadístico usado, p-valor, decisión
  (rechazar/no rechazar H0) y conclusión en lenguaje no técnico.
- Si el estudio es cualitativo: organiza por categorías y subcategorías emergentes.

Devuelve JSON:
{
  "seccion": "capitulo_4",
  "resultados_descriptivos": [
    {
      "objetivo_especifico": "...",
      "descripcion": "...",
      "tabla_sugerida": "...",
      "figura_sugerida": "..."
    }
  ],
  "contrastacion_hipotesis": [
    {
      "hipotesis": "...",
      "prueba_estadistica": "...",
      "valor_estadistico": "...",
      "p_valor": "...",
      "decision": "Se rechaza H0|No se rechaza H0",
      "conclusion": "..."
    }
  ],
  "tablas_apa": [
    {
      "numero": "Tabla 1",
      "titulo": "...",
      "nota": "..."
    }
  ],
  "figuras_apa": [
    {
      "numero": "Figura 1",
      "titulo": "...",
      "nota": "..."
    }
  ]
}`,
  },

  // ── AGENTE T5 — DISCUSIÓN Y CONCLUSIONES (Cap. V) ────────
  discusionTesis: {
    name: "Discusión y Conclusiones",
    emoji: "🔎",
    maxTokens: 3500,
    necesita: ["capitulo1", "capitulo2", "capitulo4"],
    systemPrompt: `Eres un agente experto en la elaboración del Capítulo V de tesis de posgrado.
Tu función es redactar la discusión, conclusiones y recomendaciones.

ESTRUCTURA QUE DEBES PRODUCIR (Capítulo V):
1. Discusión
   - Confrontar cada resultado con los antecedentes del Cap. II
   - Interpretar a la luz de las bases teóricas del Cap. II
   - Explicar convergencias y divergencias con literatura existente
2. Conclusiones (una por objetivo específico + una conclusión general)
3. Recomendaciones (para: la institución, futuros investigadores, políticas públicas)

CRITERIOS:
- La discusión NO repite resultados; los interpreta y contrasta.
- Cada conclusión debe ser verificable a partir de los resultados del Cap. IV.
- Las recomendaciones deben ser concretas, no genéricas.
- Incluir las limitaciones del estudio y cómo afectan la generalización.

Devuelve JSON:
{
  "seccion": "capitulo_5",
  "discusion": [
    {
      "resultado_clave": "...",
      "contraste_antecedentes": "...",
      "interpretacion_teorica": "...",
      "convergencias": ["..."],
      "divergencias": ["..."]
    }
  ],
  "conclusiones": {
    "por_objetivo": ["...", "...", "..."],
    "conclusion_general": "..."
  },
  "recomendaciones": {
    "para_la_institucion": ["..."],
    "para_futuros_investigadores": ["..."],
    "para_politicas_publicas": ["..."]
  },
  "limitaciones_del_estudio": ["..."]
}`,
  },

  // ── AGENTE T6 — ASESOR INTERNO ───────────────────────────
  asesorInterno: {
    name: "Asesor Interno",
    emoji: "👨‍🏫",
    maxTokens: 2500,
    necesita: ["capitulo1", "capitulo2", "capitulo3", "capitulo4", "capitulo5"],
    systemPrompt: `Eres un agente que simula a un asesor de tesis de posgrado experimentado.
Tu función es revisar la consistencia interna de toda la tesis y detectar
los problemas que un asesor real señalaría antes de la sustentación.

VERIFICACIONES OBLIGATORIAS:
1. Coherencia metodológica: ¿los objetivos, hipótesis, variables e instrumentos son consistentes?
2. Consistencia IMRD-tesis: ¿los resultados responden exactamente a los objetivos del Cap. I?
3. Calidad de antecedentes: ¿son recientes, relevantes e indexados?
4. Profundidad teórica: ¿las bases teóricas justifican adecuadamente la investigación?
5. Redacción académica: ¿hay ambigüedades, contradicciones o afirmaciones sin respaldo?
6. Formato APA 7: ¿citas y referencias son consistentes?

Devuelve JSON:
{
  "seccion": "asesor_interno",
  "dictamen": "APROBADO_PARA_SUSTENTACION|REQUIERE_CORRECCIONES_MAYORES|REQUIERE_CORRECCIONES_MENORES",
  "coherencia_metodologica": "alta|media|baja",
  "consistencia_objetivo_resultado": true,
  "observaciones_por_capitulo": {
    "capitulo_1": ["..."],
    "capitulo_2": ["..."],
    "capitulo_3": ["..."],
    "capitulo_4": ["..."],
    "capitulo_5": ["..."]
  },
  "correcciones_urgentes": ["..."],
  "correcciones_menores": ["..."],
  "fortalezas_tesis": ["..."],
  "mensaje_al_tesista": "Párrafo de retroalimentación constructiva."
}`,
  },

  // ── AGENTE T7 — JURADO SIMULADO ──────────────────────────
  juradoSimulado: {
    name: "Jurado Simulado",
    emoji: "⚖️",
    maxTokens: 2500,
    necesita: ["capitulo1", "capitulo3", "capitulo4", "capitulo5", "asesorInterno"],
    systemPrompt: `Eres un agente que simula a un jurado evaluador de tesis de posgrado.
Tu función es anticipar las preguntas y objeciones que el jurado real haría
durante la sustentación, para que el tesista se prepare adecuadamente.

PERSPECTIVAS DEL JURADO:
1. Presidente del jurado: evalúa la contribución al conocimiento y la originalidad.
2. Secretario: revisa el rigor metodológico y la validez interna.
3. Vocal: evalúa la coherencia teórica y la pertinencia de los resultados.

Para cada perspectiva genera:
- 3 preguntas que probablemente se harán en la sustentación
- La respuesta recomendada para cada pregunta
- El punto débil más probable que será atacado

Devuelve JSON:
{
  "seccion": "jurado_simulado",
  "presidente": {
    "preguntas": ["...", "...", "..."],
    "respuestas_recomendadas": ["...", "...", "..."],
    "punto_debil_principal": "..."
  },
  "secretario": {
    "preguntas": ["...", "...", "..."],
    "respuestas_recomendadas": ["...", "...", "..."],
    "punto_debil_principal": "..."
  },
  "vocal": {
    "preguntas": ["...", "...", "..."],
    "respuestas_recomendadas": ["...", "...", "..."],
    "punto_debil_principal": "..."
  },
  "pregunta_mas_probable": "La pregunta que con mayor probabilidad abrirá la sustentación.",
  "recomendacion_sustentacion": "Consejo estratégico para la presentación oral."
}`,
  },

};

// ──────────────────────────────────────────────────────────
//  CONTEXTO SELECTIVO PARA TESIS
// ──────────────────────────────────────────────────────────
function buildThesisContext(agentKey, tema, nivel, resultados) {
  const agent = THESIS_AGENTS[agentKey];
  const claves = agent.necesita || [];
  if (claves.length === 0) return "";

  const partes = [`Tema de tesis: ${tema}\nNivel: ${nivel}\n`];
  for (const clave of claves) {
    if (resultados[clave]) {
      partes.push(`[${clave.toUpperCase()}]\n${JSON.stringify(resultados[clave], null, 2)}`);
    }
  }
  return partes.join("\n\n");
}

// ──────────────────────────────────────────────────────────
//  LLAMADA A AGENTE DE TESIS
// ──────────────────────────────────────────────────────────
async function callThesisAgent(agentKey, userMessage, context = "") {
  const agent = THESIS_AGENTS[agentKey];
  console.log(`\n${agent.emoji}  [${agent.name}] procesando...`);

  const messages = [];
  if (context) {
    messages.push({ role: "user", content: `Contexto del proyecto:\n${context}` });
    messages.push({ role: "assistant", content: "Entendido. Tengo en cuenta el trabajo previo." });
  }
  messages.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: agent.maxTokens || 2000,
    system: agent.systemPrompt,
    messages,
  });

  return parseJSON(response.content[0].text, agentKey);
}

// ──────────────────────────────────────────────────────────
//  PIPELINE DE TESIS
// ──────────────────────────────────────────────────────────
async function runThesisPipeline(tema, nivel = "maestria") {
  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║  SciAgent v3 — Pipeline de Tesis              ║");
  console.log("║  7 agentes: T0–T5 + Asesor + Jurado Simulado  ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log(`\nTema: "${tema}"`);
  console.log(`Nivel: ${nivel.toUpperCase()}\n`);

  const r = {};  // resultados

  // ── T0: Verificador de Tesis ────────────────────────────
  r.verificacion = await callThesisAgent(
    "verificadorTesis",
    `Evalúa si este brief es suficiente para elaborar una tesis de ${nivel}:
     "${tema}"
     Verifica el checklist completo y emite tu veredicto.`,
    ""
  );

  if (r.verificacion?.veredicto === "RECHAZADO") {
    console.log("\n🛡️  RECHAZADO — Pipeline detenido.");
    const preguntas = r.verificacion?.preguntas_al_tesista || [];
    if (preguntas.length) {
      console.log("Responde estas preguntas antes de continuar:");
      preguntas.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    }
    const outputDir = "./output";
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    fs.writeFileSync(path.join(outputDir, "verificacion_tesis.json"),
      JSON.stringify(r.verificacion, null, 2), "utf8");
    return r;
  }

  if (r.verificacion?.problema_reformulado) {
    console.log(`\n🛡️  Problema reformulado: "${r.verificacion.problema_reformulado}"\n`);
    tema = r.verificacion.problema_reformulado;
  }

  // ── T1: Planteamiento del Problema (Cap. I) ─────────────
  r.capitulo1 = await callThesisAgent(
    "planteador",
    `Elabora el Capítulo I completo para la tesis de ${nivel} sobre:
     "${tema}"
     Incluye realidad problemática, formulación, justificación, objetivos,
     hipótesis, variables y limitaciones.`,
    buildThesisContext("planteador", tema, nivel, r)
  );

  // ── T2: Marco Teórico (Cap. II) ─────────────────────────
  r.capitulo2 = await callThesisAgent(
    "marcoTeorico",
    `Elabora el Capítulo II (Marco Teórico) para la tesis sobre: "${tema}".
     Incluye antecedentes internacionales, nacionales y locales,
     bases teóricas y marco conceptual. Los antecedentes deben ser
     de los últimos 10 años y preferiblemente indexados en Scopus o WoS.`,
    buildThesisContext("marcoTeorico", tema, nivel, r)
  );

  // ── T3: Metodología (Cap. III) ──────────────────────────
  r.capitulo3 = await callThesisAgent(
    "metodologiaTesis",
    `Elabora el Capítulo III (Metodología) para la tesis de ${nivel} sobre: "${tema}".
     Define tipo, diseño, población, muestra, operacionalización de variables,
     instrumentos y plan de análisis. Justifica cada decisión metodológica.`,
    buildThesisContext("metodologiaTesis", tema, nivel, r)
  );

  // ── T4: Resultados (Cap. IV) ────────────────────────────
  r.capitulo4 = await callThesisAgent(
    "resultadosTesis",
    `Elabora el Capítulo IV (Resultados) para la tesis sobre: "${tema}".
     Presenta resultados descriptivos e inferenciales respondiendo
     a cada objetivo específico. Incluye contrastación de hipótesis.`,
    buildThesisContext("resultadosTesis", tema, nivel, r)
  );

  // ── T5: Discusión y Conclusiones (Cap. V) ───────────────
  r.capitulo5 = await callThesisAgent(
    "discusionTesis",
    `Elabora el Capítulo V (Discusión, Conclusiones y Recomendaciones)
     para la tesis sobre: "${tema}".
     Contrasta con antecedentes, interpreta a la luz del marco teórico,
     formula conclusiones por objetivo y recomendaciones concretas.`,
    buildThesisContext("discusionTesis", tema, nivel, r)
  );

  // ── T6: Asesor Interno ──────────────────────────────────
  r.asesorInterno = await callThesisAgent(
    "asesorInterno",
    `Revisa la coherencia y calidad de toda la tesis sobre: "${tema}".
     Emite tu dictamen como asesor y señala las correcciones necesarias
     antes de la sustentación.`,
    buildThesisContext("asesorInterno", tema, nivel, r)
  );

  // ── T7: Jurado Simulado ─────────────────────────────────
  r.juradoSimulado = await callThesisAgent(
    "juradoSimulado",
    `Simula el jurado evaluador de la tesis sobre: "${tema}" a nivel ${nivel}.
     Genera las preguntas probables desde cada perspectiva del jurado
     y las respuestas recomendadas para preparar al tesista.`,
    buildThesisContext("juradoSimulado", tema, nivel, r)
  );

  // ── GUARDAR RESULTADOS ──────────────────────────────────
  const outputDir = "./output";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  // JSON completo
  fs.writeFileSync(
    path.join(outputDir, "tesis_resultado.json"),
    JSON.stringify(r, null, 2), "utf8"
  );
  console.log(`\n✓ Tesis completa: ./output/tesis_resultado.json`);

  // Dictamen del asesor
  if (r.asesorInterno) {
    const a = r.asesorInterno;
    const lineas = [
      "DICTAMEN DEL ASESOR INTERNO — SciAgent v3",
      "=".repeat(50),
      "",
      `Tema: ${tema}  |  Nivel: ${nivel.toUpperCase()}`,
      "",
      `Dictamen:              ${a.dictamen || "N/D"}`,
      `Coherencia metodol.:   ${a.coherencia_metodologica || "N/D"}`,
      "",
      "── CORRECCIONES URGENTES ────────────────────────────",
      ...(a.correcciones_urgentes || []).map(c => `• ${c}`),
      "",
      "── CORRECCIONES MENORES ─────────────────────────────",
      ...(a.correcciones_menores || []).map(c => `• ${c}`),
      "",
      "── FORTALEZAS ───────────────────────────────────────",
      ...(a.fortalezas_tesis || []).map(f => `• ${f}`),
      "",
      "── MENSAJE AL TESISTA ───────────────────────────────",
      a.mensaje_al_tesista || "",
    ];
    fs.writeFileSync(path.join(outputDir, "dictamen_asesor.txt"),
      lineas.join("\n"), "utf8");
    console.log(`✓ Dictamen del asesor: ./output/dictamen_asesor.txt`);
  }

  // Preguntas del jurado
  if (r.juradoSimulado) {
    const j = r.juradoSimulado;
    const lineas = [
      "PREGUNTAS PROBABLES DEL JURADO — SciAgent v3",
      "=".repeat(50),
      "",
      `Pregunta más probable: ${j.pregunta_mas_probable || ""}`,
      `Recomendación oral:    ${j.recomendacion_sustentacion || ""}`,
      "",
      "── PRESIDENTE ───────────────────────────────────────",
      ...(j.presidente?.preguntas || []).map((p, i) =>
        `P${i+1}: ${p}\n    → ${j.presidente.respuestas_recomendadas?.[i] || ""}`),
      `\nPunto débil: ${j.presidente?.punto_debil_principal || ""}`,
      "",
      "── SECRETARIO ───────────────────────────────────────",
      ...(j.secretario?.preguntas || []).map((p, i) =>
        `P${i+1}: ${p}\n    → ${j.secretario.respuestas_recomendadas?.[i] || ""}`),
      `\nPunto débil: ${j.secretario?.punto_debil_principal || ""}`,
      "",
      "── VOCAL ────────────────────────────────────────────",
      ...(j.vocal?.preguntas || []).map((p, i) =>
        `P${i+1}: ${p}\n    → ${j.vocal.respuestas_recomendadas?.[i] || ""}`),
      `\nPunto débil: ${j.vocal?.punto_debil_principal || ""}`,
    ];
    fs.writeFileSync(path.join(outputDir, "preguntas_jurado.txt"),
      lineas.join("\n"), "utf8");
    console.log(`✓ Preguntas del jurado: ./output/preguntas_jurado.txt`);
  }

  return r;
}

// ──────────────────────────────────────────────────────────
//  EJECUCIÓN DIRECTA
// ──────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const TEMA_TESIS =
    "Influencia de la gestión por competencias en el desempeño laboral de los servidores públicos del Gobierno Regional de Piura, 2024";
  const NIVEL = "maestria"; // "maestria" o "doctorado"

  const r = await runThesisPipeline(TEMA_TESIS, NIVEL);

  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║  Tesis completada — 7 agentes                 ║");
  console.log("╚═══════════════════════════════════════════════╝\n");

  if (r.asesorInterno) {
    console.log(`👨‍🏫 Dictamen asesor: ${r.asesorInterno.dictamen}`);
    console.log(`   Coherencia:      ${r.asesorInterno.coherencia_metodologica}`);
  }
  if (r.juradoSimulado) {
    console.log(`⚖️  Pregunta más probable en sustentación:`);
    console.log(`   "${r.juradoSimulado.pregunta_mas_probable}"`);
  }
}

export { runThesisPipeline, callThesisAgent, THESIS_AGENTS };
