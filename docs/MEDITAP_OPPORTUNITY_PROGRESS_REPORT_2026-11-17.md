# MediTap — Reporte de avance (plan de oportunidades PDF + portal)

**Document type:** Progress report (opportunity plan)  
**Key:** `MT-AG-206`  
**Type:** Product / Status  
**Audience:** Producto, ingeniería y stakeholders  
**Status:** Corte de avance — implementaciones recientes vs plan `MT-AG-202`  
**Date:** 2026-11-17  
**Branch / workspace:** `feature/portal-split` · `/Users/amarquez/Desktop/MediTap`  
**Scope:** Qué se cerró del brief de oportunidades (PDF intake + portal) y qué sigue abierto  
**Plan base:** `docs/MEDITAP_OPPORTUNITY_AREAS_PDF_PORTAL_2026-11-11.md` (`MT-AG-202`)

---

## Register entry

**Type:** Product / Status

**Key:** `MT-AG-206`

**Summary:** Reporte de avance del plan de oportunidades: gaps Athena/Epic, OCR de portada y Results unificados; NextGen y portal P0 aún abiertos.

**What was done:**

- Consolidó el estado Done / Deferred / Open del plan `MT-AG-202` tras `MT-AG-203`–`MT-AG-205`.
- Documentó beneficio al sitio y cómo verificar cada cierre en Tab14.
- Export Markdown + PDF del reporte.

**Outcome:** Stakeholders tienen un corte claro: Sprint A (exactitud PDF) mayormente avanzado; Sprint B (producto intake) empezó con Results; Sprint C (portal) sin iniciar implementación.

**Primary paths:** `docs/MEDITAP_OPPORTUNITY_PROGRESS_REPORT_2026-11-17.md` (+ `.pdf`)  
**Branch:** `feature/portal-split`

---

## 1. Resumen ejecutivo

Del plan de oportunidades (`MT-AG-202`) se **cerraron o mejoraron** cuatro frentes de producto/intake y se **dejó explícitamente en pausa** NextGen (sin PDF de prueba).

| Métrica (plan original) | Estado al 2026-11-17 |
|-------------------------|----------------------|
| Gaps Harold Past Encounters + Epic Payers | **Done** (`MT-AG-203`) |
| OCR portada / leading pages | **Done** (mejora material) (`MT-AG-204`) |
| Unificar Results con cards extendidas | **Done** (`MT-AG-205`) |
| NextGen dialect + fixtures | **Deferred** (sin documento) |
| 3.er Athena / 2.º MEDITECH CCD | **Open** (faltan PDFs) |
| Cola admin review / mensajería / FHIR | Review queue **Done**; mensajería **Done** (`MT-AG-209`); FHIR **Open** |

**Lectura:** el sistema ya importa mejor, Results está unificado, la cola staff de review está viva, y la **mensajería paciente↔clínica** notifica en la campana admin. Lo que falta para “portal completo” es FHIR / auditoría usable / alertas unificadas, más fixtures nuevos (y Document AI opcional).

---

## 2. Completado — detalle por entrega

### 2.1 Plan documentado — `MT-AG-202` (2026-11-11)

- Brief ES/EN de fallas F1–F9, propuestas P0–P2 y tres sprints.
- PDF en Escritorio: *MediTap Opportunity Areas (ES/EN)*.

**Beneficio:** roadmap compartido; cada cierre posterior se mide contra ese documento.

---

### 2.2 Gaps Athena / Epic — `MT-AG-203` (2026-11-15)

| Ítem | Antes | Ahora en el sitio |
|------|--------|-------------------|
| Harold **Past Encounters** | Corpus lo forzaba como gap aunque el parser existía | Athena + Harold → filas Date / Type / Performer / Notes; scorer **filled** |
| Epic Mayo **Payers** | Sin tabla Insurance; sección vacía | Epic + Jane Doe → Payers **FEDERAL BCBS STANDARD** (Primary; Secondary N/A ignorado) |
| NextGen | Stub | Sigue diferido |

**Cómo verificar:** Tab14 → hard-refresh → EHR Athena/Epic → re-subir Harold / Jane Doe → Past Encounters o Payers.

---

### 2.3 OCR de portada — `MT-AG-204` (2026-11-15)

| Cambio | Detalle |
|--------|---------|
| Tope de páginas | 8 → **12** |
| Escala cover | Página 1 a **3.5** (resto 2.75) |
| Detección | Covers “chrome-only” (Mayo / My Health Summary sin demografía) también disparan OCR |
| Post-proceso | Normalización de texto OCR antes de parsers |

**Cómo verificar:** Re-subir PDF Epic/escaneado; Demographics debería llenarse mejor desde portada; avisos OCR de provenance siguen si `usedOcr`.

---

### 2.4 Results = cards extendidas — `MT-AG-205` (2026-11-15)

| Antes | Ahora |
|-------|--------|
| Formulario legacy de labs (segunda clase) | Accordion cards como Imaging / PoT |
| UI distinta al resto del intake | Date / Panel / Status / Detail (+ category / code) |
| — | Bridge a `labPanels` → Save / Tab7 intactos |

**Cómo verificar:** Tab14 → **Results** → `1# SureSwab · fecha · Final` (u otros paneles). Analitos finos en Tab7.

---

## 3. Tablero del plan (Done / Deferred / Open)

### Fallas del brief

| ID | Tema | Estado |
|----|------|--------|
| F1 | Gaps dialecto Harold / Epic Payers | **Done** |
| F2 | Corpus fino (3.er Athena, 2.º MEDITECH) | **Open** |
| F3 | NextGen stub | **Deferred** |
| F4 | OCR frágil | **Improved** (DPI fino / Document AI aún open) |
| F5 | Bleed / junk rows | **Open** (mitigado; no cerrado) |
| F6 | Results legacy | **Done** |
| F7 | Score engañoso | **Open** (parcial: gaps reales ya no se esconden) |
| F8 | Document AI / LLM fallback | **Open** |
| F9 | EHR write-back | **Open** |

### Propuestas priorizadas

| Prioridad | Propuesta | Estado |
|-----------|-----------|--------|
| P0 | Gaps Athena/Epic conocidos | **Done** (restan fixtures nuevos) |
| P0 | NextGen | **Deferred** |
| P0 | OCR más fuerte | **Done** (base); refinamientos open |
| P1 | Results unificados | **Done** |
| P1 | Confianza por campo / terminología | **Improved** (chips low/medium en review queue; catálogo terminología previo) |
| P1 | LLM fallback con review humano | **Open** |
| P0 portal | Mensajería | **Done** (`MT-AG-209`, in-app bell; no email/push yet) |
| P0 portal | Cola admin review | **Done** (`MT-AG-208`) |
| P1 portal | FHIR / auditoría HIPAA usable | **Open** |

### Sprints del brief

| Sprint | Enfoque | Avance |
|--------|---------|--------|
| **A** Exactitud PDF | Gaps + OCR (+ NextGen cuando haya PDF) | **~70%** — gaps + OCR hechos; NextGen/fixtures nuevos pendientes |
| **B** Producto intake | Results + review queue + terminología | **~85%** — Results + review queue + confidence chips; terminología plena / Document AI open |
| **C** Portal completo | Mensajes, FHIR, audit, alertas | **~25%** — mensajería v1; FHIR/audit/alertas unificadas open |

---

## 4. Beneficio acumulado al sitio

1. **Menos “parse exitoso / sección vacía”** en demos Harold y Jane Doe.  
2. **Demografía usable** en exports escaneados / portada Epic.  
3. **Intake visualmente coherente** — Results al mismo nivel que el resto del menú.  
4. **Regresión bloqueada** en corpora Athena/Epic (tests verdes).  
5. **NextGen no se vende como listo** hasta tener fixture (honestidad de producto).

---

## 5. Siguiente paso recomendado

**Mensajería** cerrada (`MT-AG-209`). Siguiente producto del brief:

1. **FHIR / auditoría HIPAA usable** (Sprint C P1), o  
2. Fixtures nuevos (3.er Athena / 2.º MEDITECH / NextGen) cuando existan PDFs, o  
3. Document AI / LLM fallback con gate humano (F8) / notificaciones push-email.

---

## 6. Registro relacionado

| Entry | Key | Título corto |
|------:|-----|--------------|
| 206 | `MT-AG-202` | Brief de oportunidades |
| 207 | `MT-AG-203` | Harold encounters + Epic Payers |
| 208 | `MT-AG-204` | OCR cover más fuerte |
| 209 | `MT-AG-205` | Results extended cards |
| 210 | `MT-AG-206` | Este reporte de avance |
| 211 | `MT-AG-207` | Detalle de entregas completadas |
| 212 | `MT-AG-208` | Staff intake review queue |
| 213 | `MT-AG-209` | Portal messaging + admin bell |

**Próximo trabajo de producto:** entry **214** / `MT-AG-210` (FHIR/audit o fixtures / Document AI).

---

## 7. Referencias

- Plan: `docs/MEDITAP_OPPORTUNITY_AREAS_PDF_PORTAL_2026-11-11.md`  
- Training Athena/Epic: `docs/ATHENA_INTAKE_TRAINING.md`  
- Changelog: `docs/AGENT_SESSION_CHANGELOG.md` (entries 206–209)  
- Checkpoint: `meditap-app/REGISTER_CHECKPOINT.md`
