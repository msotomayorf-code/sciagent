# SciAgent v2 — Sistema multi-agente para artículos científicos

Sistema de **11 agentes especializados** construido con la API de Anthropic (Claude).
Integra el pipeline de producción científica original con tres agentes del
**Sistema Maestro de Investigación Doctoral Multiagente (SMID-MA 3.0)**.

---

## Instalación

```bash
npm install
```

Configura tu API key de Anthropic:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Skills opcionales (Claude Code)

```bash
# Humanizador — blader/humanizer
mkdir -p ~/.claude/skills
git clone https://github.com/blader/humanizer.git ~/.claude/skills/humanizer

# Director Visual — banana-claude (requiere API key de Google AI Studio)
git clone --depth 1 https://github.com/AgriciDaniel/banana-claude.git
cd banana-claude && ./install.sh --with-mcp TU_GOOGLE_API_KEY
```

---

## Uso rápido

### Pipeline completo (11 agentes en secuencia)

```bash
npm run pipeline
```

Genera cuatro archivos en `./output/`:

| Archivo | Contenido |
|---|---|
| `pipeline_resultado.json` | Output JSON completo de los 11 agentes |
| `banana_prompts.txt` | Prompts `/banana generate` listos para Claude Code |
| `agenda_futura.txt` | Párrafo de agenda futura listo para insertar en el artículo |
| `dictamen_editorial.txt` | Dictamen editorial con revista objetivo y estrategia de envío |

### Chat interactivo con un agente

```bash
npm run chat
```

---

## Arquitectura — 11 agentes

```
Tu tema de investigación
         │
         ▼
  ┌─────────────┐
  │ Orquestador │  ← orchestrator.js
  └──────┬──────┘
         │ pasa contexto acumulado a cada agente
         ▼
  ┌──────────────────────────────────────────────────────────┐
  │  PIPELINE DE PRODUCCIÓN                                  │
  │  1. 🔍 Investigador      → estado del arte y brechas    │
  │  2. 📐 Metodólogo        → diseño metodológico          │
  │  3. 📊 Analista          → resultados y estadística     │
  │  4. ✍️  Redactor         → texto IMRAD completo         │
  │  5. 🔬 Revisor           → peer review interno          │
  │  6. 📝 Editor            → formato y normas revista     │
  │  7. 🧑‍💻 Humanizador      → elimina patrones IA          │
  │  8. 🍌 Director Visual   → prompts para figuras         │
  ├──────────────────────────────────────────────────────────┤
  │  SMID-MA 3.0 (Sistema Maestro de Investigación Doctoral) │
  │  9.  🏅 Evaluador Calidad → nivel de evidencia + sesgos │
  │  10. 🔭 Detector Vacíos  → agenda futura PRIORIZADA     │
  │  11. 🎯 Evaluador Scopus → dictamen editorial completo  │
  └──────────────────────────────────────────────────────────┘
         │
         ├── output/pipeline_resultado.json
         ├── output/banana_prompts.txt
         ├── output/agenda_futura.txt
         └── output/dictamen_editorial.txt
```

---

## Los 11 agentes en detalle

### Pipeline de producción (agentes 1-8)

#### 1. 🔍 Investigador
Busca y sintetiza literatura científica. Identifica brechas y construye
el estado del arte con referencias en APA 7ma edición.

#### 2. 📐 Metodólogo
Diseña el enfoque metodológico: tipo de estudio, criterios de inclusión/exclusión,
instrumentos y procedimiento. Garantiza el rigor científico del diseño.

#### 3. 📊 Analista
Interpreta resultados, sugiere pruebas estadísticas, elabora tablas y figuras
y redacta la sección de resultados con intervalos de confianza.

#### 4. ✍️ Redactor
Redacta introducción, discusión, conclusiones y abstract integrando el trabajo
de los agentes anteriores. Cuida la coherencia narrativa y el lenguaje académico.

#### 5. 🔬 Revisor
Evalúa el manuscrito como árbitro externo. Puntúa de 0 a 10, detecta
inconsistencias lógicas y recomienda: aceptar / revisar / rechazar.

#### 6. 📝 Editor
Aplica normas APA/Vancouver/CIT, unifica referencias, revisa ortografía
y prepara el manuscrito para envío. Genera checklist de envío.

#### 7. 🧑‍💻 Humanizador
Basado en [blader/humanizer](https://github.com/blader/humanizer).
Aplica 29 patrones anti-IA: varía el ritmo, usa voz activa, elimina frases
formulaicas ("Es crucial", "resulta fundamental"), añade perspectiva del autor.
Conserva sin tocar: cifras, referencias, términos técnicos, estructura IMRAD.

#### 8. 🍌 Director Visual
Basado en [banana-claude](https://github.com/AgriciDaniel/banana-claude).
Genera prompts con la fórmula de 5 componentes para producir figuras científicas
con `/banana generate` en Claude Code (motor: Google Gemini, hasta 4K).

---

### SMID-MA 3.0 (agentes 9-11)

Estos tres agentes están basados en el **Sistema Maestro de Investigación
Doctoral Multiagente (SMID-MA 3.0)** y se ejecutan después del pipeline
de producción para agregar una capa de evaluación científica rigurosa.

#### 9. 🏅 Evaluador de Calidad
Asigna el **nivel de evidencia** (I-VII según la escala SMID-MA),
detecta cuatro tipos de **sesgos** (selección, medición, confusión, publicación),
evalúa la **calidad metodológica** (alta/media/baja) y ejecuta las
**5 verificaciones del supervisor SMID-MA**:

| # | Verificación |
|---|---|
| 1 | ¿Toda afirmación tiene evidencia? |
| 2 | ¿Toda evidencia posee fuente verificable? |
| 3 | ¿Existe trazabilidad documental? |
| 4 | ¿Hay contradicciones no explicadas? |
| 5 | ¿El texto aporta análisis y no solo descripción? |

Emite certificado: `APROBADO` / `APROBADO_CON_OBSERVACIONES` / `RECHAZADO`.

#### 10. 🔭 Detector de Vacíos
Función doble basada en el Agente 5 del SMID-MA 3.0:

**A — Vacíos que el artículo CIERRA:** refuerza el argumento de novedad
frente a editores y revisores.

**B — Vacíos que el artículo ABRE:** genera la **agenda futura de investigación**
clasificada por tipo (teórico, conceptual, metodológico, geográfico, poblacional,
temporal, estadístico) y priorizada con la **Matriz SMID-MA**:

| Prioridad | Relevancia | Factibilidad | Publicabilidad |
|---|---|---|---|
| 1 | Alta | Alta | Alta |
| 2 | Alta | Alta | Media |
| 3 | Cualquier combinación inferior |

Genera el párrafo de agenda futura **listo para insertar** en el artículo.

#### 11. 🎯 Evaluador Scopus/WoS
Basado en el Agente 10 del SMID-MA 3.0. Emite el **dictamen editorial completo**:

- **Probabilidad de publicación:** Alta (>70%) / Media (40-70%) / Baja (<40%)
- **Revista objetivo:** nombre real, ISSN real, cuartil actual Scopus/WoS
- **Hasta 3 revistas alternativas** con justificación
- **Estrategia editorial:** qué enfatizar en la carta de presentación,
  qué secciones fortalecer antes del envío, cómo responder a revisores típicos

Integra los outputs del Evaluador de Calidad (agente 9) y del Detector
de Vacíos (agente 10) para un veredicto informado, no solo basado en el texto.

---

## Cómo funciona el contexto acumulado

Cada agente recibe **todo lo que generaron los agentes anteriores** como contexto.
El Evaluador Scopus, por ejemplo, ya conoce el certificado de calidad del agente 9
y la agenda futura del agente 10 antes de emitir su dictamen.

```js
let ctx = `Tema: ${tema}\n`;

resultados.investigacion = await callAgent("investigador", prompt, ctx);
ctx += `\n[INVESTIGADOR]\n${JSON.stringify(resultados.investigacion)}\n`;

// ...cada agente ve todo lo anterior...

resultados.evaluacionScopus = await callAgent("evaluadorScopus", prompt, ctx);
// El agente 11 tiene el contexto completo de los 10 anteriores
```

---

## Flujo completo con banana-claude

```bash
# 1. Correr el pipeline completo
ANTHROPIC_API_KEY=sk-ant-... npm run pipeline

# 2. Revisar el dictamen editorial
cat output/dictamen_editorial.txt

# 3. Ver la agenda futura generada
cat output/agenda_futura.txt

# 4. Abrir Claude Code y generar figuras
claude
/banana generate "..."

# 5. Si necesitas evaluación independiente de un texto
npm run chat
# Elige: evaluadorCalidad / detectorVacios / evaluadorScopus
# Pega tu texto y recibe el análisis
```

---

## Personalización

### Cambiar el tema del pipeline

```js
// En orchestrator.js, al final del archivo:
const TEMA_EJEMPLO = "Tu tema de investigación aquí";
```

### Cambiar el modelo

```js
model: "claude-sonnet-4-5",       // balance calidad/velocidad (actual)
model: "claude-opus-4-5",         // máxima capacidad, más lento
model: "claude-haiku-4-5-20251001", // más rápido y económico
```

### Agregar un nuevo agente

1. Agrega una entrada al objeto `AGENTS` con `name`, `emoji` y `systemPrompt`
2. Añade un paso en `runPipeline()` con `await callAgent("nombre", prompt, ctx)`
3. Actualiza `ctx` con el output del nuevo agente
4. Agrega el agente al menú de `chat.js`

---

## Estructura de archivos

```
sciagent/
├── package.json              ← dependencias (@anthropic-ai/sdk)
├── orchestrator.js           ← pipeline completo (11 agentes)
├── chat.js                   ← chat interactivo con agente individual
├── README.md                 ← esta documentación
└── output/                   ← generado al correr el pipeline
    ├── pipeline_resultado.json    ← output JSON de los 11 agentes
    ├── banana_prompts.txt         ← prompts /banana listos para usar
    ├── agenda_futura.txt          ← agenda futura de investigación
    └── dictamen_editorial.txt     ← dictamen editorial completo
```

---

## Ejemplo de output — Agente 11 (Evaluador Scopus)

```
DICTAMEN EDITORIAL — SciAgent v2 + SMID-MA 3.0
══════════════════════════════════════════════════

── CALIDAD METODOLÓGICA (Agente 9) ─────────────────
Nivel de evidencia:    Nivel IV (cuantitativo no experimental)
Calidad metodológica:  alta
Certificado:           APROBADO_CON_OBSERVACIONES

── PUBLICABILIDAD (Agente 11) ───────────────────────
Probabilidad:          Alta (72%)
Revista objetivo:      Formación Universitaria
ISSN:                  0718-5006
Cuartil:               Q2
Base:                  Scopus

── REVISTAS ALTERNATIVAS ────────────────────────────
• Revista CEPAL (Q2) — enfoque en políticas públicas latinoamericanas
• Perfiles Latinoamericanos (Q3) — ciencias sociales aplicadas
• Latin American Research Review (Q2) — investigación regional

── VEREDICTO FINAL ──────────────────────────────────
El artículo tiene una contribución metodológica original y datos
empíricos verificables. Con las correcciones del agente 9 y la
sección de agenda futura del agente 10, la probabilidad de aceptación
en Formación Universitaria supera el 70%.
```

---

## Skills externos requeridos

| Skill | Repositorio | Para qué |
|---|---|---|
| blader/humanizer | github.com/blader/humanizer | Agente 7 — humanización |
| banana-claude | github.com/AgriciDaniel/banana-claude | Agente 8 — figuras |

## Créditos del sistema

- **Agentes 1-8:** SciAgent (diseño propio, UTP Piura)
- **Agentes 9-11:** adaptados del SMID-MA 3.0 (Sistema Maestro de Investigación Doctoral Multiagente)
- **Motor de lenguaje:** Claude (Anthropic) — modelo claude-sonnet-4-5
- **Motor de imágenes:** Google Gemini via banana-claude
