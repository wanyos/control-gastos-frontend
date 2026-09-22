# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** 16 — review-actions (implementación)
- **Inicio:** 2026-09-20
- **Agente:** leader (Claude Code) → implementer

## Plan

Segunda mitad de la E6: desde la cola de `/review` (F15, cerrada), poder
categorizar y confirmar, uno a uno con `PATCH /api/movements/:id` y en bloque con
`PATCH /api/movements` (hasta 200 ids, todo o nada). Spec → puerta humana →
implementer → reviewer.

## Bitácora

- 2026-09-20 — F15 cerrada tras superar la prueba contra el backend real. Roadmap
  E6 a medias e historial al día. Se lanza el spec_author de la F16.
- 2026-09-20 — Spec de la F16 escrito (`specs/16-review-actions/`, 14 requisitos y
  6 decisiones 🔴); feature en `spec_ready`, a la espera de la puerta humana.

- 2026-09-20 — Spec de la F16 aprobado por el humano tal cual (6 🔴: selección
  por página que se suelta al cambiar de filtro, categorizar y confirmar como
  gestos distintos, confirmación a partir de 20, la fila desaparece al
  confirmar, Undo sin cuenta atrás, y filtrado previo de los no elegibles).
  F16 pasa a `in_progress`.
- 2026-09-20 — Acordado con el humano: **después de la F16 se redacta una feature
  de reglas de categorización** (crear regla desde un movimiento, listarlas,
  borrarlas y aplicarlas con `POST /api/category-rules/apply`). Motivo:
  categorizar un movimiento no enseña nada al sistema; lo que se hereda entre
  importaciones son las reglas. El backend ya tiene los endpoints.

- 2026-09-20 — implementer arranca la F16. Plan: las tasks T0..T21 de
  `specs/16-review-actions/tasks.md`. T0 cerrado sin sorpresas: iconos `Check`,
  `Undo2` y `Tag` existen en `@lucide/vue` 1.45.0, y `--brand on --surface-sunken`
  mide 7,44:1 (umbral 3), así que no hace falta el plan B del borde izquierdo.

- 2026-09-20 — F16 implementada: T0.1–T20 de `tasks.md` en `[x]`, 14 requisitos
  con test, +102 tests unitarios (793 en total) y 4 escenarios e2e nuevos con
  todas las llamadas interceptadas. Puerta completa en verde (`type-check`,
  `lint`, `test:unit`, `build`, `./init.sh`, e2e chromium). **T21 pendiente**:
  la comprobación contra el backend real de `:3000` necesita el visto bueno del
  humano y no se hizo (ningún `PATCH` salió de los mocks). Informe en
  `progress/implementation/review-actions.md`. Falta el reviewer.

- 2026-09-22 — reviewer aprueba la F16 sin cambios (793 tests, 12 e2e, build e
  init.sh verificados por él; las 6 🔴 tal cual; la repetición del selector de
  categoría aceptada como maquetado, no lógica).
- 2026-09-22 — **T21 hecha** con el visto bueno del humano, contra el backend real
  y pulsando en la interfaz (Playwright sin interceptar), sobre un solo movimiento:
  42368 (IBERDROLA, 96,29 €, pendiente, Suministros). Categorizar a Vivienda → Undo
  → vuelve a Suministros; Confirm → la fila sale y la cola baja de 1607 a 1606 →
  Undo → vuelve a pendiente y a 1607. Antes/después idénticos salvo `updatedAt`.
  4 PATCH, solo `categoryId`/`status`/`ids`; cero errores de consola.

## Próximo paso

Commitear F15 y F16 (dos commits, uno por feature). Después, alta de la feature
de reglas de categorización.
