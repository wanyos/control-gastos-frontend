# Review — feature 16 `review-actions`

**Veredicto:** APPROVED (con C6 / T21 anotado como pendiente; el propio
`requirements.md` §C6 dice que no bloquea el cierre sin visto bueno humano)

Revisor: reviewer, 2026-09-20. Entradas leídas: `specs/16-review-actions/`
(`requirements`, `design`, `tasks`, `decisions`), los 11 `acceptance` de la
feature 16 en `feature_list.json`, `docs/{specs,verification,conventions,architecture}.md`,
`CHECKPOINTS.md`, `progress/implementation/review-actions.md` y
`../gastos-backend/docs/api-contract.md` (**solo lectura**).

**Ninguna escritura salió de este equipo.** No se lanzó ningún `PATCH` ni `POST`
contra `:3000`; no se paró ni arrancó nada en `:3000`. El e2e reutiliza el dev
server de `5173` si ya está (`playwright.config.ts:119`, `reuseExistingServer`),
que es lo mismo que hace `./init.sh`, y todas sus llamadas están interceptadas
con `page.route`, con un `abort` de `**/api/**` como primera ruta
(`e2e/review-actions.spec.ts:129`).

## Trazabilidad requirements ↔ tests

Leídos los tests, no solo sus nombres. Todos fallarían si se rompiera el
requisito que cubren.

- R1 (selección por fila): [x] `store.spec.ts:342` «ticks a row and unticks it
  again» (compara `selectedIds` y `selection`); `MovementRow.spec.ts:74`
  (exactamente una casilla, con `aria-label` «Select …»); `ReviewView.spec.ts:300`
  y `:316` (`1 selected` / `2 selected`).
- R2 (seleccionar la página, tope, indeterminado): [x] `MovementList.spec.ts:45`
  y `:56` (marcado solo con la página entera, guion en medio);
  `store.spec.ts:356` (`selectPage()` toma exactamente los ids cargados) y
  `:368` (200 ids, sin repetidos).
- R3 (se suelta al cambiar filtro/página/búsqueda): [x] `store.spec.ts:388`
  (tras `goToPage` y tras `apply` la selección queda vacía **y** `lastAction` a
  `null`); `ReviewView.spec.ts:316` (ninguna casilla marcada tras pasar de
  página).
- R4 (categoría de una fila, body solo `categoryId`, filtrado por `kind`,
  `neutral` deshabilitado): [x] `service.spec.ts:242`, `:258`;
  `MovementCategorySelect.spec.ts:24,31,44,53` (texto exacto
  `Neutral movements can't be categorized`); `store.spec.ts:428`.
- R5 (`Confirm` de fila, body solo `status`): [x] `store.spec.ts:410`
  (`{ status: 'confirmed' }`, una sola llamada); `service.spec.ts:266`;
  `MovementRow.spec.ts:95`.
- R6 (barra con el número, un solo `PATCH`): [x] `ReviewActionBar.spec.ts:16,23`;
  `store.spec.ts:464` (1 `PATCH`, `Object.keys` = `['ids','status']`);
  `ReviewView.spec.ts:339` (`Confirm 3 movements`); `e2e:151`.
- R7 (elegibilidad previa, `Applies to N of M selected`, 0 elegibles no envía):
  [x] `actions.spec.ts:34,39,45,49`; `ReviewActionBar.spec.ts:45,52`;
  `store.spec.ts:484` (solo el id `expense` viaja) y `:504` (cero llamadas);
  `ReviewView.spec.ts:463,485`; `e2e:187` (`Applies to 2 of 3 selected`,
  body `{ ids: [10, 12], categoryId: 2 }`).
- R8 (diálogo a partir de 20): [x] `ReviewView.spec.ts:403` (19 → sin diálogo,
  1 `PATCH`), `:418` (20 → `Confirm 20 movements?`, `Cancel` deja 0 llamadas y
  `20 selected`), `:441` (aceptar envía los 20); `BulkConfirmDialog.spec.ts:13,33`.
- R9 (nunca >200, ni repetidos, ni vacío; solo `ids`/`categoryId`/`status`):
  [x] `service.spec.ts:302` (`Object.keys` del body), `:317` (dedupe), `:325`
  (200 justos en una petición), `:336` (201 y 0 lanzan **sin** tocar el cliente),
  `:347`; más los cuerpos exactos de cada acción en `store.spec.ts`.
- R10 (refresco con lo devuelto, contador, repesca de la página): [x]
  `store.spec.ts:410` (`pendingCount` 132 → 131 y la fila sale), `:428` (la fila
  se queda con su categoría nueva), `:448` (exactamente **1** `GET` extra y
  `pagination.total` del backend, no una suma local), `:676` (vaciar la última
  página cae a la 1 con su aviso); `e2e:151` (contador de la sidebar 132 → 131
  sin recargar).
- R11 (un solo carril): [x] `store.spec.ts:522` (segunda llamada en vuelo → 1
  `PATCH`); `ReviewActionBar.spec.ts:73` (`aria-busy`); `MovementRow.spec.ts:122`.
- R12 (mensajes por tipo de fallo, sin el `message` del backend): [x]
  `actions.spec.ts:115,121,127,133,139,145,153`; `store.spec.ts:552` (400: lista
  y selección intactas, **0** `GET` de refresco), `:566` (404: 1 `GET`, el texto
  no contiene «cuenta»), `:576` (respuesta ilegible: 1 `GET`), `:585` (red: 0
  `GET`, selección intacta); `ReviewView.spec.ts:377`; `e2e:207`.
- R13 (aviso + `Undo` que devuelve estado y categoría): [x] `actions.spec.ts:55,63,78,89`
  (un grupo para la confirmación, dos para categorías previas distintas);
  `store.spec.ts:597` (2º body `{ ids:[10,11,12], status:'pending_review' }`,
  `pendingCount` vuelve a 132, `lastAction` a `null`) y `:616` (tres bodies
  exactos, uno por categoría previa); `ReviewView.spec.ts:358`;
  `ActionNotice.spec.ts:9,24,37`; `e2e:171`.
- R14 (deshacer a medias: para, avisa y recarga): [x] `store.spec.ts:643`
  (3 `PATCH`, **no** un cuarto; 1 `GET`; el texto contiene `Reloading the list`).

## Tasks completas

- T0.1–T20: [x] todas marcadas en `specs/16-review-actions/tasks.md` y
  verificadas en el código (T0.1 → `store.ts:226 refreshAfterAction`; T0.3 → las
  tres líneas `contrast:`; T19 → nota nueva en `docs/architecture.md:110-114`).
- T21: [ ] pendiente, **con justificación documentada** en
  `progress/implementation/review-actions.md` §«Lo que NO queda probado» y en
  `tasks.md:101-103`. `requirements.md` §C6 lo contempla explícitamente: sin
  visto bueno del humano se anota y no bloquea. No es motivo de rechazo.

## Criterios de aceptación (los 11 de feature_list.json)

- [x] 1 — PATCH individual de categoría y estado → `service.spec.ts:242,258,266`,
  `store.spec.ts:410,428`.
- [x] 2 — bloque con tope de 200 sin repetir → `service.spec.ts:302,317,325,336`.
- [x] 3 — marcar la página nunca supera el tope (`PAGE_SIZE` 100, `selectPage`
  solo toma `result.movements`) → `store.spec.ts:356,368`.
- [x] 4 — explícita y con el número: el botón lleva `Confirm N movements`, el
  texto `Applies to N of M selected` y, desde 20, el diálogo → `ReviewView.spec.ts:403,418`.
- [x] 5 — todo o nada, en inglés, sin el `message` del backend →
  `actions.spec.ts:112-152`, `store.spec.ts:552-593`, `e2e:207`.
- [x] 6 — lista y contador con los movimientos devueltos, sin recargar →
  `store.ts:239 applyUpdated`, `store.spec.ts:410,448`, `e2e:151`.
- [x] 7 — volver atrás → `store.ts:384 undoLast`, `store.spec.ts:597,616`.
- [x] 8 — nada fuera de `ids`, `categoryId`, `status` → `service.ts:229 changesBody`
  (campo a campo, sin spread de la vista) + `Object.keys` en los tests.
- [x] 9 — inglés, oscuro, contraste medido, **cero dependencias nuevas**
  (`git diff package.json` vacío) → `theme-dark.spec.ts` (139 casos) en verde.
- [x] 10 — la F15 sigue funcionando: su suite entera pasa, los tres tests que
  negaban la existencia de esto están **sustituidos**, no borrados
  (`MovementRow.spec.ts:73`, `ReviewView.spec.ts:299` llevan el comentario
  «Replaces the F15 test…»; `ReviewFilterBar.spec.ts:131` se conserva porque
  sigue siendo cierto: las acciones no viven en la barra de filtros). Los dos
  tests «only ever GETs» (`store.spec.ts:713`, `ReviewView.spec.ts:282`) siguen
  intactos, y `e2e/review-queue.spec.ts` y `e2e/app-boot.spec.ts` no se tocaron.
- [x] 11 — la puerta completa en verde (abajo).

## Contrato (`../gastos-backend/docs/api-contract.md`)

- [x] `ids` de 1 a 200 y sin repetidos: dedupe con `Set` y guarda local que
  **lanza antes de tocar la red** (`service.ts:265-268`). Con `PAGE_SIZE` 100 no
  se llega nunca, y aun así la barrera existe.
- [x] Body solo con `ids`, `categoryId` y `status`: `changesBody`
  (`service.ts:229`) copia campo a campo; `categoryId` viaja cuando la clave
  está presente, así `null` («quitar categoría») sí llega. Nunca un spread de un
  objeto de la vista.
- [x] Se aprovechan los `movements` devueltos: `parseBulkResult`
  (`service.ts:213`) → `applyUpdated` (`store.ts:239`), y solo después un `GET`
  silencioso para que `pagination` y `totals` sigan siendo los del backend. Nada
  se recalcula en el cliente.
- [x] Ningún `PATCH` que el backend vaya a rechazar por `kind` o por `neutral`:
  la elegibilidad se calcula cruzando `movement.type` con el `kind` de
  `GET /api/categories` (`actions.ts:34`), tanto en bloque
  (`store.ts:362 categorizeSelected`) como por fila
  (`MovementCategorySelect.vue:50`, que además deshabilita el `neutral`).
  `categoryId: null` también excluye los `neutral`, el lado seguro del contrato.
- [x] Solo se usan los cuatro endpoints previstos; ni `/api/category-rules` ni
  `/api/transfers`.

## R12 — qué afirma la pantalla en cada fallo

`actions.ts:113 needsReload` es explícito y está medido: recarga en 404,
`ValidationError` y fallo desconocido; **no** recarga en 400 ni en fallo de red,
los dos únicos casos donde el todo-o-nada del contrato garantiza que no se
escribió. Los cuatro caminos están verificados con el número exacto de `GET` de
refresco (`store.spec.ts:552,566,576,585`). El mensaje del 404 dice a la vez
«Nothing changed» —lo que el contrato garantiza para un 404— y «Reloading the
list», que es lo que hace. Correcto.

## Arquitectura (docs/architecture.md)

- [x] Organización por feature: todo lo nuevo en `src/features/review/`; lo único
  que sale son `BaseSelect.labelHidden` y las props de `BaseCheckbox`, que son
  piezas genuinamente transversales.
- [x] La UI no habla con la API: ningún `fetch(` en un `.vue`; las vistas van al
  store y el store al service.
- [x] El store guarda estado, el service trae datos: `service.ts` no guarda nada
  y mapea en frontera con `createValidators` (ADR-002).
- [x] Tipos propios derivados del contrato (`types.ts:75-100`).
- [x] Estado mínimo: la selección vive en el store de la F15, no en uno nuevo que
  tendría que espiar su `result` (justificado en `design.md` §4).
- [x] Componentes tontos: `ReviewActionBar`, `BulkConfirmDialog`, `ActionNotice`
  y `MovementCategorySelect` son props + emits; quien decide es la vista/el store.
- [x] `docs/architecture.md` actualizado: `features/review/` deja de ser de solo
  lectura y el árbol de componentes está al día.

## Convenciones (docs/conventions.md)

- [x] Inglés en identificadores, comentarios y texto de usuario; español solo en
  docs y `specs/`. Orden de imports (vendor → `@/` → relativos) respetado en
  `actions.ts`, `store.ts`, `service.ts` y los cuatro `.vue` nuevos.
- [x] `import type` donde toca (`verbatimModuleSyntax`). Orden de bloques del SFC
  (`<template>` → `<script setup>`), sin `<style>` nuevos, sin `@apply`.
- [x] Solo alias semánticos: grep de hex y de la paleta de serie de Tailwind en
  los componentes nuevos → **cero coincidencias**. Iconos importados por nombre
  (`Check`, `Tag`, `Undo2`), color heredado por `currentColor`.
- [x] Errores: el service lanza `ApiError`/`ValidationError`, el store los guarda
  y la vista los pinta; nunca se muestra el `message` del backend. Ni un
  `console.log`, ni un `TODO`, ni un `debugger` en lo nuevo.

## Verificación (docs/verification.md)

- [x] Recursos reales sobre mocks: la frontera HTTP es lo único mockeado, y
  `fixtures.ts:297 fakeQueue` es una cola de juguete que aplica de verdad el
  `PATCH` y responde el `GET` con lo que sigue pendiente. Sin ella, el refresco
  silencioso resucitaba la fila recién confirmada y las aserciones no medían
  nada — decisión acertada y documentada.
- [x] Los tests comprueban salida concreta: cuerpos exactos, `Object.keys`,
  número de llamadas, `pendingCount`, textos literales. Ninguno se limita a «no
  lanza».
- [x] Caminos de error de sobra: 400, 404, respuesta ilegible, red caída, doble
  clic, 0 elegibles, 201 ids, cancelar el diálogo, deshacer a medias, vaciar la
  última página.
- [x] Nivel 2 (e2e) cubierto con cuatro escenarios reales en chromium.

## Puerta ejecutada por el revisor (2026-09-20)

    pnpm type-check                    → OK, sin errores
    npx oxlint .                       → OK (SIN --fix: cero avisos igualmente)
    pnpm test:unit                     → 56 archivos, 793 tests, todos pasan
    pnpm build                         → 195,18 kB (66,03 kB gzip), sin avisos
    pnpm test:e2e --project=chromium   → 12 tests, todos pasan
    ./init.sh                          → [OK] Entorno listo (exit 0)

## CHECKPOINTS.md

- [x] C1 — Arnés completo; `./init.sh` exit 0.
- [x] C2 — Estado coherente: solo la 16 en `in_progress`; `progress/current.md`
      describe esta sesión y nada más.
- [x] C3 — Arquitectura, sin dependencias nuevas, sin logs ni TODOs sueltos.
- [x] C4 — Verificación real: +102 tests unitarios y 4 e2e, con caminos de error.
- [x] C5 — Nada sospechoso sin trackear (todo es código, specs o progress de la
      F15/F16, aún sin commitear). `progress/history.md` cierra la sesión de la
      F15; la entrada de la F16 le toca al leader al cerrar y commitear.
- [x] C6 — Coherencia con el backend: el contrato es **solo lectura** y no se
      tocó; ningún endpoint ni campo inventado.
- [x] C7 — SDD: los 4 archivos existen; `decisions.md` cabe en una página con
      **exactamente 6** puntos 🔴, cada uno con su alternativa concreta; 14
      requirements (≤15); EARS estricto; procedencia completa y clasificada
      (`humano` / `delegado` / `añadido`, con los `← REVISAR EN APROBACIÓN`
      marcados); cada `R<n>` con test.
- [x] C8 — Resumen de cierre escrito en `progress/summaries/review-actions.md`.

## Juicio sobre la desviación declarada (CategorySelect)

**Justificada.** `CategorySelect.vue` es el selector del filtro de la F15 y su
`modelValue: number | null` solo expresa dos estados; la barra de acciones
necesita tres (nada elegido / una categoría / quitar la categoría), y `null`
sería a la vez «no he elegido» y «quitar». Ensanchar el tipo del componente de
la F15 con un centinela habría metido ruido en el filtro justo cuando C3 exige
que la F15 no cambie de comportamiento. Lo duplicado son **seis líneas de
`optgroup`** en el `<template>` (`ReviewActionBar.vue:21-26` vs
`CategorySelect.vue:11-16`), no lógica: el mapeo `''`/`'none'`/id y la
elegibilidad viven en `ReviewView.vue:171-187` y en `actions.ts`, sin copia.
No bloqueante. Si aparece un tercer consumidor del árbol de categorías, ahí sí
conviene extraer un componente de opciones compartido.

## Tema oscuro (C2)

- [x] Las tres líneas nuevas existen y están **medidas** por
      `src/assets/__tests__/theme-dark.spec.ts`, que lee los `contrast:` del
      propio CSS (`:133`, `:201`) y exige que no sobre ni falte ninguna:
      `--positive on --surface-app >= 4.5` (5,54), `--negative on --surface-app >= 4.5`
      (4,69) y `--brand on --surface-sunken >= 3` (7,44). No hizo falta el plan B
      del borde izquierdo.
- [x] `theme-dark.spec.ts` **no se ha tocado** (`git status` lo confirma: en
      `src/assets/` solo cambió el `.css`), así que no se pudo debilitar. 139
      casos en verde.
- [x] Sin colores crudos y sin dependencias nuevas.

## Resumen de cierre

- Escrito en `progress/summaries/review-actions.md` → sí.

## Cambios requeridos

Ninguno bloqueante.

## Notas no bloqueantes

1. `progress/implementation/review-actions.md` dice «`theme-dark.spec.ts` (161
   casos)»; son **139**. Dato del informe, no del código.
2. El mismo informe apunta «`pnpm lint → oxlint . --fix`»: el script del
   `package.json` lleva `--fix`, así que la puerta del implementer podía arreglar
   sola lo que iba a reportar. Ejecutado aquí sin `--fix` y también sale limpio,
   pero conviene que `lint` no autoarregle en la puerta (asunto del harness, no
   de esta feature).
3. C6 / T21 sigue pendiente: falta la única comprobación que ata que el backend
   real acepta exactamente estos cuerpos y que su respuesta encaja con
   `parseBulkResult`. Riesgo bajo (todo sale del contrato leído esta sesión), y
   `requirements.md` §C6 lo permite. **Recomendación: hacerla con el humano
   delante antes de usar la pantalla en serio sobre los 1.607 pendientes**, con
   un movimiento y deshaciéndolo a continuación.
