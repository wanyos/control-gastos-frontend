# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** 17 — category-rules (implementación)
- **Inicio:** 2026-09-22
- **Agente:** leader (Claude Code) → implementer

## Plan

Reglas de categorización (F17): crear una regla desde una fila de Review, verlas,
cambiarlas y borrarlas en la pantalla nueva `Rules`, y pasarlas sobre lo pendiente
con `POST /api/category-rules/apply` bajo confirmación. Las tasks T0–T21 de
`specs/17-category-rules/tasks.md`; la T22 (backend real) queda para el humano.

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
- 2026-09-22 — F16 en `done` (implementer; init.sh verde). F15 y F16 en un solo
  commit (f427175): la F16 amplió los mismos archivos que creó la F15 sin
  commitear, así que partirlo no daba dos estados reales. Feature de reglas: a la
  espera del `intent` del humano (se le pasó un borrador).
- 2026-09-22 — Spec de la F17 escrito (`specs/17-category-rules/`, 14 requisitos y
  6 decisiones 🔴: pantalla `Rules` propia, texto propuesto = primera palabra con
  sentido, aplicar como gesto aparte, confirmación siempre, la regla no categoriza su
  movimiento, todos los conflictos a la vista); feature en `spec_ready`, a la espera
  de la puerta humana.
- 2026-09-22 — El humano aprueba el spec de la F17 tal cual, las 6 🔴 incluidas
  (pantalla propia Rules, texto propuesto por palabra con sentido, aplicar aparte
  y con confirmación, no categorizar el movimiento de origen, todos los
  conflictos). F17 pasa a `in_progress`.

- 2026-09-22 — implementer arranca la F17. Plan: las tasks T0..T21 de
  `specs/17-category-rules/tasks.md` (la T22, contra el backend real, queda fuera:
  necesita el visto bueno del humano). T0 cerrado sin sorpresas: `http.ts` manda un
  `POST` con `init = { method: 'POST' }` sin `Content-Type` y devuelve `undefined`
  en un 204; un `watch` de un store de Pinia sobre un ref de otro se dispara en los
  tests (no hace falta `$onAction`); la normalización copia la del backend (`Café` →
  `cafe`, espacios interiores intactos); y las parejas de color de §9 ya tienen su
  línea `contrast:` (no se toca `theme-dark.css`).
- 2026-09-22 — T1: las categorías (`Category`, `CategoryKind`, `parseCategories`,
  `getCategories`, `CATEGORIES_PATH`) se mueven a `src/shared/categories.ts`;
  `review/types.ts` y `review/service.ts` las re-exportan y la suite de `review`
  pasa sin tocarla (229 tests).

- 2026-09-22 — F17 implementada: T0–T21 de `tasks.md` en `[x]`, 14 requisitos con
  test, +108 tests unitarios (901 en total) y 4 escenarios e2e nuevos con todas las
  llamadas interceptadas y red de seguridad. Pantalla `Rules` en `/rules`, botón
  `Create rule` en la fila de Review, aviso con `Apply rules now` y diálogo de
  aplicar con confirmación siempre. Las categorías viven ahora en
  `src/shared/categories.ts` (las usan `review` y `category-rules`); el sentido de
  dependencia es único, `review` → `category-rules`. Puerta completa en verde
  (`type-check`, `lint`, `test:unit`, `build`, e2e chromium, `./init.sh`).
  **Una desviación documentada**: `isMatchTextTooShort('á b')` es `false`, no `true`
  como decía la nota de verificación de R4 — el backend cuenta los espacios
  interiores del texto normalizado y lo acepta; se eligió la paridad con el contrato
  (detalle en el informe). **T22 pendiente**: la prueba contra el backend real de
  `:3000` necesita el visto bueno del humano y no se hizo (ninguna petición salió de
  los mocks). Informe en `progress/implementation/category-rules.md`. Falta el reviewer.
- 2026-09-22 — reviewer aprueba la F17 sin cambios (901 tests, 16 e2e, puerta
  repetida por él). Corregido el ejemplo de la nota de R4 en requirements.md.
- 2026-09-22 — **T22 hecha** con el visto bueno del humano («aplicar y dejar lo que
  salga»). Regla `tulotero` → Ocio creada desde la fila de Review y aplicada desde
  el aviso: la pantalla dijo «5 movements categorized · 1372 still without a
  matching rule · 1 conflict» y la API confirma exactamente esos 5 (TULOTERO,
  ids 21750, 33099, 33260, 33371 y 42521). Cero errores de consola; solo dos
  escrituras: POST /api/category-rules y POST /api/category-rules/apply sin body.
  Antes, probando, se creó la regla `mega` (propuesta por defecto), se corrigió a
  `mega deportes` desde Rules (PATCH) y una llamada directa a apply categorizó el
  movimiento 42520 como Salud y deporte. Estado final: 63 reglas, 1.373 pendientes
  sin categoría.
- 2026-09-22 — Dos cosas para decidir: (1) el texto propuesto puede quedar
  demasiado corto (`mega` casaba también con ACADEMIA OMEGA); (2) `data-test` no
  llega a BaseDialog (raíz Teleport, Vue avisa) y el test que comprueba
  `rule-dialog` en RulesView.spec.ts:96 pasa siempre.
- 2026-09-22 — Las dos corregidas (encargo acotado, sin reabrir la feature ni tocar
  las 6 🔴): (1) `proposeMatchText` alarga la propuesta con las palabras siguientes
  del concepto, cortando verbatim, mientras no llegue a `MIN_PROPOSAL_LENGTH = 6`
  («MEGA DEPORTES» → `mega deportes`, `iberdrola` igual que antes); R2 y design §6
  actualizados con la nota de T22. (2) `BaseDialog` pasa a `inheritAttrs: false` y
  lleva los atributos al panel `role="dialog"`: el aviso de Vue desaparece y el
  `data-test` del llamante llega al DOM; `RulesView.spec.ts` prueba ahora las dos
  caras (abierto y cerrado) y `RuleDialog.spec.ts` + el e2e del 409 nombran el
  diálogo concreto. Puerta completa verde: 905 tests, 16 e2e, build e `init.sh`.
- 2026-09-22 — Correcciones hechas y puerta repetida por el leader (init.sh:
  «Entorno listo»). F17 en `done`, E6 cerrada, entrada de historial escrita.
- 2026-09-23 — Higiene (sin feature, sin dependencias): (1) `pnpm format` pasa de
  cubrir solo `src/` a una lista explícita de rutas de código (`src/`, `e2e/`,
  configs de raíz, `index.html`, `tsconfig*.json`, `.oxlintrc.json`); reformateó
  `e2e/category-rules.spec.ts`, `index.html`, `playwright.config.ts`,
  `tsconfig.node.json` y `vite.config.ts`. Se deja fuera a propósito el estado del
  harness (`feature_list.json`, `progress/`, `specs/`, `docs/`). (2) `e2e/app-boot.spec.ts`
  estrena la red de seguridad `page.route('**/api/**', route => route.abort())`
  como el resto de specs: **no apareció ninguna llamada nueva**, sus tres rutas ya
  cubrían todo. Comprobado que la red no es decorativa: quitando `**/api/movements*`
  el smoke se pone rojo por la llamada abortada, no por el 502 del proxy. `docs/stack.md`
  gana una sección *Formato (Prettier)* y la convención de red de seguridad en e2e.
  Puerta completa verde: type-check, lint, 905 tests, build, 16 e2e chromium e `init.sh`.

- 2026-09-24 — Spec de la F18 escrito (`specs/18-rule-match-preview/`, 15 requisitos y
  5 decisiones 🔴: aviso de «demasiado amplio» por encima de 50 movimientos sin
  bloquear el guardado, 5 ejemplos —los más recientes— dentro del diálogo, 350 ms
  desde la última tecla reutilizando la espera de Review, propuesta de texto que crece
  mientras la última palabra sea genérica (`servicios selecta`, `juan jose romero`,
  `amazon`) sin tocar `iberdrola`/`mercadona`/`mega deportes`/`tulotero`, y consulta
  fallida que avisa sin impedir guardar). Feature en `spec_ready`, a la espera de la
  puerta humana.

- 2026-09-24 — El humano aprueba el spec de la F18 tal cual, las 5 🔴 incluidas
  (aviso a partir de 50, 5 ejemplos recientes en el diálogo, 350 ms de espera,
  propuesta que crece ante palabras genéricas y de canal, y fallo del recuento que
  no bloquea el guardado). F18 pasa a `in_progress`.

## Próximo paso

Implementar la F18 siguiendo `specs/18-rule-match-preview/tasks.md` y pasarla por
el reviewer. La T18 es una comprobación con el humano delante, de solo lectura.
