# MediTap — Áreas de oportunidad (PDF intake + portal)

**Document type:** Product / planning (opportunity areas)  
**Key:** `MT-AG-202`  
**Type:** Product / Planning  
**Audience:** Producto, ingeniería y stakeholders clínicos  
**Status:** Brief de oportunidades — priorizado; no implementado en este documento  
**Date:** 2026-11-11  
**Branch / workspace:** `feature/portal-split` · `/Users/amarquez/Desktop/MediTap`  
**Scope:** Fallas y mejoras del reconocimiento de PDF (Tab14) y funciones del sitio/portal para hacerlo más competitivo y completo  
**Out of scope:** Implementación de vendors de seguridad (ver `MT-AG-200` / `MT-AG-201`); cambios de código en esta entrega

**Related:** `docs/ATHENA_INTAKE_TRAINING.md`, `docs/MEDITAP_AGENT_HANDOFF.md`, pipeline Tab14 (`tab14DocumentParse.ts`, dialectos Athena / Epic / MEDITECH)

---

## Register entry

**Type:** Product / Planning

**Key:** `MT-AG-202`

**Summary:** Documentar áreas de oportunidad del reconocimiento PDF y del portal MediTap, con beneficio al sitio y priorización en tres sprints.

**What was done:**

- Inventario de fallas reales del intake PDF (dialectos, OCR, NextGen stub, Results legacy, scores engañosos).
- Propuestas P0–P2 para PDF y para portal (mensajería, FHIR, cola de revisión, auditoría).
- Empaquetado en tres sprints con beneficio de negocio / competitividad por cada área.
- Export Word/PDF del brief para revisión de stakeholders.

**Outcome:** Roadmap claro: cerrar gaps de corpus y OCR primero; unificar Results + review queue; luego mensajería y FHIR. El motor dialectal actual se trata como activo, no como reemplazo.

**Primary paths:** `docs/MEDITAP_OPPORTUNITY_AREAS_PDF_PORTAL_2026-11-11.md` (+ `.docx` / `.pdf`)  
**Branch:** `feature/portal-split`

---

## 1. Resumen ejecutivo

MediTap ya tiene un **activo diferenciador**: intake por PDF en Tab14 con dialectos Athena, Epic y MEDITECH, OCR de respaldo, warnings de procedencia y persistencia en API. Eso no es trivial frente a portales que solo piden “sube tu PDF” sin estructura clínica.

Lo que falta para verse **completo y competitivo** (nivel MyChart / import clínico serio) no es reescribir el motor, sino:

1. **Subir la exactitud** donde el corpus y el OCR todavía fallan.  
2. **Cerrar promesas de producto** (NextGen en el selector, Results de segunda clase).  
3. **Añadir capacidades de portal** que el PDF solo no resuelve: mensajería, sync FHIR, cola de revisión staff y auditoría usable.

| Pregunta | Respuesta corta |
|----------|-----------------|
| ¿El PDF intake es débil? | No — es fuerte en Athena/Epic/MEDITECH; frágil en bordes (OCR cover, gaps, NextGen). |
| ¿Qué beneficia más al sitio? | Exactitud percibida + confianza staff + flujo paciente (mensaje / citas / labs). |
| ¿Qué no hacer primero? | IA genérica sin humano en el loop, ni rewrite del parser dialectal. |

---

## 2. Estado actual (activo)

| Capacidad | Estado |
|-----------|--------|
| Extracto pdf.js + OCR Tesseract (páginas sparsas) | En producción local / pipeline Tab14 |
| Dialectos Athena Data Portability, Epic My Health / Mayo, MEDITECH CCD | Maduros con corpora y tests |
| NextGen en selector EHR | **Stub** — cae a extract genérico |
| Warnings Accept/Reject + Save API | Hecho |
| Appointments / chronic / labs / incidents con API + quick-pick | Hecho (Sprint B/C) |
| Mensajería paciente–clínica | No |
| FHIR write-back producción | No (sandbox / roadmap) |
| Validación RxNorm / SNOMED / LOINC | No (solo hints / texto libre) |

---

## 3. Fallas y áreas de oportunidad — reconocimiento PDF

### 3.1 Inventario de fallas

| # | Falla | Impacto en el sitio |
|---|--------|---------------------|
| F1 | Gaps de dialecto (p. ej. Harold `pastEncounters`; Epic **Payers**) — **cerrados `MT-AG-203`** | Staff ve secciones vacías tras un “parse exitoso”; pierde confianza |
| F2 | Corpus de entrenamiento fino (pocos PDFs por vendor) | Cada clínica nueva reabre regresiones |
| F3 | **NextGen** anunciado pero no implementado | Promesa de producto rota en el selector |
| F4 | OCR frágil en portadas escaneadas; tope ~8 páginas — **mejorado `MT-AG-204`** (12 págs, escala cover 3.5, chrome-only) | Demografía Epic/Mayo incompleta o con teléfonos “sucios” |
| F5 | Bleed / filas basura (meds wrap, imaging junk) si vendor/Auto falla | Datos clínicos contaminados en chart |
| F6 | **Results** en UI legacy vs cards extendidas — **cerrado `MT-AG-205`** | Labs se sienten de segunda clase frente al resto del intake |
| F7 | Score “100% core” con Care Team vacío | Métrica engañosa para producto y demos |
| F8 | Sin fallback Document AI / LLM con umbral + revisión humana | PDFs “raros” no recuperables sin ingeniería de reglas |
| F9 | Sin write-back EHR | MediTap importa; no cierra el ciclo con el EHR de la clínica |

### 3.2 Propuestas PDF y beneficio

| Prioridad | Propuesta | Beneficio al sitio |
|-----------|-----------|--------------------|
| **P0** | ~~Cerrar gaps Athena/Epic~~ Harold Past Encounters + Epic Payers (`MT-AG-203`). Restan 3.er PDF Athena + 2.º CCD MEDITECH | Más % de secciones llenas en demos y clínicas reales → menos “el PDF no sirvió” |
| **P0** | Dialect NextGen + fixtures — **diferido** (sin PDF de prueba) | El selector cumple; se puede vender multi-EHR con honestidad |
| **P0** | ~~OCR más fuerte~~ (`MT-AG-204`) — quedan DPI adaptativo fino / Document AI | Demografía usable en exports escaneados (caso Epic frecuente) |
| **P1** | Fallback LLM/Document AI si score dialecto &lt; umbral + review humano | Competitivo vs import “mágico” sin perder control clínico |
| **P1** | Validación RxNorm / SNOMED / LOINC | Diferenciador clínico; menos texto libre ambiguo |
| **P1** | ~~Unificar Results con extended cards~~ (`MT-AG-205`); confianza por campo aún abierta | Una sola experiencia de intake; labs al mismo nivel |
| **P2** | Auto-vendor más robusto + reporte “extraído / faltante” por sección | Staff entrena corpus más rápido; menos tickets |
| **P2** | Merge multi-PDF del mismo paciente (dedupe) | Caso real: varios exports en una visita |

---

## 4. Áreas de oportunidad — portal / sitio

| Prioridad | Qué falta | Beneficio al sitio |
|-----------|-----------|--------------------|
| **P0** | **Mensajería** paciente ↔ clínica | Paridad con portales competidores; retención y soporte |
| **P0** | Cola **admin review** de intake PDF (escala Accept/Reject) | Ya hay provenance; falta producto de trabajo diario del staff |
| **P1** | Sync **FHIR** lectura/escritura con gate humano | Del “héroe PDF” al “chart conectado” con hospitales |
| **P1** | Auditoría HIPAA usable (quién vio/editó PHI) | Confianza B2B / compliance; más que un activity trail |
| **P1** | Una verdad de alertas (citas, labs, incidentes) en Dashboard + Quick Status | Menos demos fragmentadas; workflow clínico claro |
| **P2** | Portal paciente view-only (sin chrome de staff) | Claridad y trust para el usuario final |
| **P2** | Notificaciones (lab nuevo, cita, documento listo) | Engagement sin depender solo del login |
| **P2** | Export CCD/FHIR + narrativa de seguridad (vendors) | Conversación hospital / partner más seria |

---

## 5. Cómo esto hace el sitio más competitivo

| Frente | Hoy | Con las propuestas |
|--------|-----|---------------------|
| **Import clínico** | Fuerte en 3 vendors; bordes rotos | Multi-EHR creíble + OCR/IA con humano |
| **Confianza staff** | Warnings campo a campo | Cola de revisión + reporte por sección + terminología |
| **Experiencia paciente** | Chart + status + citas | + mensajes + notificaciones + vista limpia |
| **Historia B2B** | PDF + JWT + hardening local | + FHIR + audit + validación de código clínico |
| **Demo comercial** | Antonio fixtures / Diana / Jane Doe | Menos gaps visibles; Results al mismo nivel visual |

**Mensaje de producto:** MediTap no compite solo como “otra app de citas”. Compite como **capa de portabilidad clínica** (PDF → chart estructurado → portal). Las oportunidades de este brief refuerzan esa tesis: exactitud del import, operaciones staff, y conexión al ecosistema EHR.

---

## 6. Empaque en tres sprints (recomendado)

### Sprint A — Exactitud PDF (P0)

- Cerrar gaps dialectales conocidos.  
- NextGen real o quitar del selector hasta tener fixtures.  
- Mejorar OCR de cover / demografía.

**Beneficio:** cada upload “falla menos” en la primera impresión — la métrica que más duele en demos.

### Sprint B — Producto de intake (P1 PDF)

- Results unificados.  
- Cola de revisión staff.  
- Terminología (inicio RxNorm/SNOMED/LOINC).  
- Opcional: umbral → Document AI con Accept/Reject obligatorio.

**Beneficio:** el intake deja de ser “parser + formulario” y se vuelve **flujo de trabajo clínico**.

### Sprint C — Portal completo (P0–P1 sitio)

- Mensajería.  
- FHIR read (luego write-back con gate).  
- Pack de auditoría.  
- Unificación de alertas Dashboard / Quick Status.

**Beneficio:** el sitio se siente producto de cuidado continuo, no solo importador de PDF.

---

## 7. Lo que este documento no incluye

- Código nuevo de parsers o UI.  
- Compromisos de fechas o precios de vendors.  
- Afirmación de exactitud clínica porcentual (hoy el bar es *section completeness*, no “% diagnóstico correcto”).  
- Sustitución del motor dialectal por solo LLM.

---

## 8. Próximas acciones

| # | Acción | Dueño sugerido |
|---|--------|----------------|
| 1 | Elegir Sprint A: gaps Athena/Epic **o** NextGen **o** OCR cover | Producto + ingeniería |
| 2 | Mantener corpora (`ATHENA_INTAKE_TRAINING.md`) como puerta de calidad | Ingeniería |
| 3 | Definir si NextGen se implementa o se oculta del selector hasta fixtures | Producto |
| 4 | Diseñar cola de review (reutilizando provenance UI) | Producto + UX |
| 5 | Seguir track de validación de seguridad en paralelo (`MT-AG-200`) | Ops / compliance |

---

## 9. Referencias internas

- Handoff y backlog: `docs/MEDITAP_AGENT_HANDOFF.md`  
- Training Athena / gaps: `docs/ATHENA_INTAKE_TRAINING.md`  
- Router parse: `meditap-app/src/intake/tab14DocumentParse.ts`  
- OCR: `meditap-app/src/intake/documentTextExtraction.ts`  
- Nav portability: `meditap-app/src/intake/tab14PortabilitySections.ts`  
- Seguridad vendors: `docs/MEDITAP_SECURITY_VALIDATION_OPTIONS_2026-11-05.md`
