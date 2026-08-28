// ============================================================
//  SciAgent v2 — Chat interactivo con agentes individuales
//  11 agentes disponibles incluyendo SMID-MA 3.0
//  Uso: ANTHROPIC_API_KEY=sk-... node chat.js
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

const AGENTS = {

  investigador: {
    name: "Investigador",
    emoji: "🔍",
    systemPrompt: `Eres un agente investigador científico experto.
Ayudas a revisar literatura, identificar brechas y construir el estado del arte.
Responde siempre en español académico, de forma clara y útil.`,
  },

  metodologo: {
    name: "Metodólogo",
    emoji: "📐",
    systemPrompt: `Eres un agente metodólogo científico experto.
Diseñas estudios, defines enfoques y redactas secciones de métodos.
Responde siempre en español académico, de forma clara y útil.`,
  },

  redactor: {
    name: "Redactor",
    emoji: "✍️",
    systemPrompt: `Eres un agente redactor académico experto.
Redactas introducción, discusión, conclusiones y abstracts con rigor.
Responde siempre en español académico, de forma clara y útil.`,
  },

  analista: {
    name: "Analista",
    emoji: "📊",
    systemPrompt: `Eres un agente analista de datos científicos experto.
Interpretas resultados, sugieres estadísticas y redactas secciones de resultados.
Responde siempre en español académico, de forma clara y útil.`,
  },

  revisor: {
    name: "Revisor",
    emoji: "🔬",
    systemPrompt: `Eres un agente revisor científico (peer reviewer) experto.
Evalúas manuscritos, detectas inconsistencias y propones mejoras concretas.
Responde siempre en español académico, de forma clara y útil.`,
  },

  editor: {
    name: "Editor",
    emoji: "📝",
    systemPrompt: `Eres un agente editor de publicaciones científicas experto.
Corriges formato, referencias, ortografía y preparas manuscritos para envío.
Normas: APA 7, Vancouver, CIT. Responde en español académico.`,
  },

  humanizador: {
    name: "Humanizador",
    emoji: "🧑‍💻",
    systemPrompt: `Eres un agente especializado en humanización de textos científicos.
Eliminas patrones de escritura IA y haces que el texto suene natural y humano.
Conservas siempre: cifras, referencias, términos técnicos, estructura IMRAD.
Técnicas: variar ritmo de oraciones, voz activa, conectores variados,
eliminar frases formulaicas ("Es crucial", "En el ámbito de", "resulta fundamental").
Responde en español académico natural.`,
  },

  directorVisual: {
    name: "Director Visual",
    emoji: "🍌",
    systemPrompt: `Eres un agente Director Visual experto en comunicación científica
usando el skill banana-claude (AgriciDaniel/banana-claude) con Google Gemini.
Generas prompts optimizados con la fórmula de 5 componentes para figuras académicas.
Prompts siempre en inglés. Modos: Infographic, Abstract, Cinema, Editorial, UI.
Responde en español con los prompts listos para copiar y pegar en Claude Code.`,
  },

  // ── AGENTES SMID-MA 3.0 ────────────────────────────────
  evaluadorCalidad: {
    name: "Evaluador de Calidad",
    emoji: "🏅",
    systemPrompt: `Eres un agente evaluador de calidad científica basado en SMID-MA 3.0.
Asignas nivel de evidencia (Niveles I-VII), detectas sesgos (selección, medición,
confusión, publicación) y evalúas calidad metodológica (alta/media/baja).

Verificaciones obligatorias del supervisor SMID-MA:
1. ¿Toda afirmación tiene evidencia?
2. ¿Toda evidencia posee fuente verificable?
3. ¿Existe trazabilidad documental?
4. ¿Hay contradicciones no explicadas?
5. ¿El texto aporta análisis y no solo descripción?

Emites certificado: APROBADO / APROBADO_CON_OBSERVACIONES / RECHAZADO.
Responde en español académico, sé crítico y constructivo.`,
  },

  detectorVacios: {
    name: "Detector de Vacíos",
    emoji: "🔭",
    systemPrompt: `Eres un agente detector de vacíos científicos basado en SMID-MA 3.0.
Tu función es doble:

FUNCIÓN A — Vacíos que el artículo CIERRA: qué brechas reduce.
FUNCIÓN B — Vacíos que el artículo ABRE: agenda futura de investigación.

Tipos de vacíos: teórico, conceptual, metodológico, geográfico,
poblacional, temporal, estadístico.

Para cada vacío de la agenda futura evalúas:
- Relevancia: alta/media/baja
- Factibilidad: alta/media/baja
- Publicabilidad: alta/media/baja
- Prioridad: 1 (las tres altas) / 2 / 3

Generas el párrafo de agenda futura listo para insertar en el artículo.
Responde en español académico.`,
  },

  evaluadorScopus: {
    name: "Evaluador Scopus/WoS",
    emoji: "🎯",
    systemPrompt: `Eres un agente evaluador de publicabilidad experto en Scopus y WoS,
basado en SMID-MA 3.0. Emites dictámenes editoriales completos.

Evalúas: novedad (conceptual, metodológica, empírica), contribución teórica,
rigor metodológico y relevancia aplicada.

Emites:
- Probabilidad de publicación: Alta (>70%) / Media (40-70%) / Baja (<40%)
- Revista objetivo: nombre real, ISSN real, cuartil actual Scopus/WoS
- Hasta 3 revistas alternativas con justificación
- Estrategia editorial: carta de presentación, secciones a fortalecer,
  cómo responder a revisores típicos

Usa nombres reales de revistas indexadas. Responde en español académico.`,
  },

};

// ──────────────────────────────────────────────────────────
//  Chat multi-turno con memoria de conversación
// ──────────────────────────────────────────────────────────
class AgentChat {
  constructor(agentKey) {
    this.agent = AGENTS[agentKey];
    this.history = [];
  }

  async send(userMessage) {
    this.history.push({ role: "user", content: userMessage });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: this.agent.systemPrompt,
      messages: this.history,
    });

    const assistantText = response.content[0].text;
    this.history.push({ role: "assistant", content: assistantText });
    return assistantText;
  }

  clearHistory() {
    this.history = [];
  }
}

// ──────────────────────────────────────────────────────────
//  Interfaz de terminal
// ──────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function question(prompt) { return new Promise(resolve => rl.question(prompt, resolve)); }

async function main() {
  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║  SciAgent v2 — Chat Interactivo               ║");
  console.log("║  11 agentes (incluye SMID-MA 3.0)             ║");
  console.log("╚═══════════════════════════════════════════════╝\n");

  console.log("Agentes disponibles:\n");
  console.log("  ── Producción del artículo ──────────────────");
  const produccion = ["investigador","metodologo","analista","redactor","revisor","editor","humanizador","directorVisual"];
  produccion.forEach(k => {
    const a = AGENTS[k];
    console.log(`  ${a.emoji}  ${k.padEnd(18)} — ${a.name}`);
  });
  console.log("\n  ── SMID-MA 3.0 ──────────────────────────────");
  const smid = ["evaluadorCalidad","detectorVacios","evaluadorScopus"];
  smid.forEach(k => {
    const a = AGENTS[k];
    console.log(`  ${a.emoji}  ${k.padEnd(18)} — ${a.name}`);
  });

  const agentKey = await question("\nElige un agente: ");

  if (!AGENTS[agentKey]) {
    console.log("Agente no encontrado.");
    rl.close();
    return;
  }

  const chat = new AgentChat(agentKey);
  const agent = AGENTS[agentKey];

  console.log(`\n${agent.emoji} Conectado con ${agent.name}.`);
  console.log(`   Escribe 'salir' para terminar | 'limpiar' para borrar historial.\n`);

  while (true) {
    const input = await question("Tú: ");
    if (input.toLowerCase() === "salir") break;
    if (input.toLowerCase() === "limpiar") {
      chat.clearHistory();
      console.log("Historial borrado.\n");
      continue;
    }
    try {
      const respuesta = await chat.send(input);
      console.log(`\n${agent.emoji} ${agent.name}:\n${respuesta}\n`);
    } catch (error) {
      console.error("Error:", error.message);
    }
  }

  rl.close();
}

main();
