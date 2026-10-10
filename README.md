# SciAgent v3 — De usuario a arquitecto

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23285905.svg)](https://doi.org/10.5281/zenodo.23285905)

> *"Cómo un investigador social usa la IA para producir, auditar y validar artículos científicos sin saber programar"*
>
> Manuel J. Sotomayor-Fernández — ORCID: [0000-0002-7105-620X](https://orcid.org/0000-0002-7105-620X)
> Universidad Tecnológica del Perú, Sede Piura

---

## ¿Qué es SciAgent?

SciAgent v3 es un sistema de **12 agentes especializados** de inteligencia artificial diseñado para asistir al investigador académico en la **producción, revisión y validación** de artículos científicos. Fue construido usando la API de Anthropic (Claude) por un investigador social sin formación en programación, aplicando el principio de aprendizaje situado.

El sistema no reemplaza al investigador. Lo amplifica. El investigador es el guía del proceso — la IA es la herramienta.

---

## Arquitectura — 12 agentes en 3 capas

### Capa 0 — Verificación previa
| Agente | Función |
|--------|---------|
| Agente 0: Verificador Previo | Checklist de insumos antes de activar el pipeline |

### Capa 1 — Pipeline de producción (8 agentes)
| Agente | Función |
|--------|---------|
| Agente 1: Investigador | Búsqueda y síntesis de literatura |
| Agente 2: Metodólogo | Marco metodológico |
| Agente 3: Analista | Procesamiento de datos |
| Agente 4: Redactor | Escritura académica IMRAD |
| Agente 5: Revisor | Coherencia interna |
| Agente 6: Editor | Formato de revista objetivo |
| Agente 7: Humanizador | Eliminación de patrones artificiales |
| Agente 8: Director Visual | Tablas, figuras y presentación |

### Capa 2 — SMID-MA 3.0 (3 agentes de evaluación académica)
| Agente | Función |
|--------|---------|
| Agente 9: Evaluador de Calidad | Rigor metodológico según estándares Scopus/WoS |
| Agente 10: Detector de Vacíos | Vacíos teóricos, metodológicos y geográficos |
| Agente 11: Evaluador Scopus/WoS | Probabilidad de aceptación en revistas indexadas |

---

## Instalación

```bash
npm install
```

Configura tu API key de Anthropic:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

---

## Uso

### Pipeline completo (12 agentes)

```bash
node orchestrator_v3.js
```

### Interfaz de chat

```bash
node chat.js
```

---

## Resultados — cinco casos reales

| Trabajo | Disciplina | Estado |
|---------|-----------|--------|
| Índice de Curvatura Social (ICS) — 33 distritos de Piura | Sociología algorítmica | En revisión — Formación Universitaria (Q2 Scopus) |
| Planeamiento estratégico regional — PDC Piura 2022-2030 | Gestión pública territorial | En revisión y validación |
| Estado, nación y desafíos estructurales en el Perú (1821-2024) | Historia política | **Validado — listo para publicación** |
| Tesis sobre estrategias didácticas y EVA | Educación superior | Proceso de revisión, validación y corrección completado |
| Unidad Regional de Prospectiva — GORE Piura (S/ 1,298,250) | Prospectiva regional | En validación institucional |

---

## Documentación narrativa

El proceso completo de diseño, implementación y aprendizaje está documentado en el libro:

**"De usuario a arquitecto: cómo un investigador social usa la IA para producir, auditar y validar artículos científicos sin saber programar"**

→ Disponible en este repositorio: [`libro_completo.docx`](./libro_completo.docx)

El artículo académico sobre el sistema:

**"SciAgent v3: arquitectura multiagente para la producción, revisión y validación de artículos científicos asistida por inteligencia artificial"**

→ Disponible en este repositorio: [`paper_sciagent_v3.docx`](./paper_sciagent_v3.docx)

---

## Principio central

> *El sistema agrega valor en proporción directa al conocimiento que el investigador aporta. No es un atajo para quien no sabe. Es un amplificador para quien ya sabe.*

---

## Licencia

- **Código:** MIT License
- **Libro y paper:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

---

## Cita

```
Sotomayor-Fernández, M. J. (2026). SciAgent v3: arquitectura multiagente para la
producción, revisión y validación de artículos científicos asistida por inteligencia
artificial. GitHub. https://github.com/msotomayorf-code/sciagent
```

---

*Desarrollado en Piura, Perú — Universidad Tecnológica del Perú*
