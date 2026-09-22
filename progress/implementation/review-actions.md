# Implementación — Feature 16 `review-actions`

> Implementer, 2026-09-20. Spec: `specs/16-review-actions/`
> (`requirements.md` R1–R14 + C1–C6, `design.md`, `tasks.md`, `decisions.md`
> aprobado por el humano el 2026-09-20 tal cual, con el umbral de 20).
> Construida encima de la F15, cerrada.

## Estado de las tareas

`specs/16-review-actions/tasks.md`: **T0.1–T20 marcadas `[x]`**.
**T21 queda pendiente**: escribe en la base de datos real y el humano no dio el
visto bueno en esta sesión (instrucción explícita de no lanzar ningún `PATCH`
contra `:3000`, donde hay 1.607 movimientos pendientes). C6 lo contempla:
se anota y no bloquea el cierre.

> **Actualización 2026-09-22: T21 hecha** contra el backend real con el visto
> bueno del humano; marcada `[x]` en `tasks.md`. Detalle en `progress/current.md`.

### Lo que dejó T0 (riesgos, antes de código de producción)

- **T0.1 — vaciar la última página.** El reintento de la F15 (`store.ts:128`)
  vive dentro de `load()`, que enciende el spinner y borra la lista: no valía
  para el refresco silencioso. Se añadió `refreshAfterAction`
  (`src/features/review/store.ts:226`), que repite la lógica de «página fuera de
  rango → página 1 + aviso» **sin** vaciar `result` ni encender `isLoading`, y
  que ante cualquier otro fallo deja la lista tal y como la dejó la acción en vez
  de dejar la pantalla en blanco. Test:
  `store.spec.ts` → «confirming the last page of the queue falls back to page 1».
- **T0.2 — tope de 200 ids.** Una página simulada de 200 se selecciona entera y
  produce **una** petición; 201 lanzan `ValidationError` local sin tocar `fetch`.
- **T0.3 — iconos y contraste.** `Check`, `Undo2` y `Tag` existen en
  `@lucide/vue` 1.45.0 (comprobado en `lucide-vue.d.ts`). `--brand on
  --surface-sunken` mide **7,44:1** (umbral 3): no hizo falta el plan B del borde
  izquierdo. `--brand on --surface-card >= 4.5` ya estaba medido, así que la
  segunda línea de `design.md` §8 no se duplica.
- **T0.4 — `PATCH` con cuerpo JSON.** `services/http.ts` no se tocó: mezcla
  `init` y cabeceras correctamente. Verificado en `service.spec.ts` (método, ruta,
  `Content-Type: application/json` y claves exactas del cuerpo).

## Archivos

### Nuevos

| Archivo | Qué es |
|---|---|
| `src/features/review/actions.ts` | Lógica pura: `findCategory:11`, `MAX_IDS:22`, `BULK_CONFIRM_THRESHOLD:25`, `eligibleForCategory:34`, `undoPlan:52`, `countOf:65`, `actionSummary:69`, `actionErrorMessage:96`, `needsReload:113`, `UNDO_PARTIAL:121`. |
| `src/features/review/components/MovementCategorySelect.vue` | Selector de categoría de una fila: solo el `kind` que casa, `No category`, `neutral` deshabilitado con su texto. |
| `src/features/review/components/ReviewActionBar.vue` | Barra de la selección: recuento, selector, `Applies to N of M selected`, `Apply category`, `Confirm N movements`, `Clear selection`. |
| `src/features/review/components/ActionNotice.vue` | Aviso de resultado con `Undo`, o el mensaje de error de acción. Nunca los dos. |
| `src/features/review/components/BulkConfirmDialog.vue` | Confirmación previa a partir de 20 (título con acción y número, `Cancel` con `data-autofocus`). |
| Tests | `src/features/review/__tests__/{actions,MovementCategorySelect,ReviewActionBar,ActionNotice,BulkConfirmDialog}.spec.ts`, `e2e/review-actions.spec.ts`. |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/features/review/types.ts:75-100` | `MovementChanges`, `BulkUpdate`, `BulkResult`, `UndoGroup`, `LastAction`. |
| `src/features/review/service.ts:1-4` | Cabecera: deja de ser «read only». |
| `src/features/review/service.ts:104` | `parseMovement` pasa a exportarse. |
| `src/features/review/service.ts:208,213` | `parseUpdatedMovement`, `parseBulkResult`. |
| `src/features/review/service.ts:224-270` | `changesBody` (campo a campo), `patch()` (método + `Content-Type` + `JSON.stringify`), `updateMovement:244`, `updateMovements:261` (dedupe + guarda de 1..200). |
| `src/features/review/store.ts:85-92` | `selectedIds`, `isActing`, `actionError`, `actionMessage`, `lastAction`. |
| `src/features/review/store.ts:99,131` | `adoptPage` extraído de `fetchPage`; `load()` suelta selección y aviso (R3). |
| `src/features/review/store.ts:181-204` | `toggleSelection`, `selectPage`, `clearSelection`, `selection`. |
| `src/features/review/store.ts:214-265` | `refreshQuietly`, `refreshAfterAction`, `applyUpdated`. |
| `src/features/review/store.ts:265-410` | `runAction`, `reportFailure`, `write`, `categorizeOne:313`, `confirmOne:330`, `confirmSelected:343`, `categorizeSelected:362`, `undoLast:384`. |
| `src/features/review/components/MovementRow.vue` | Casilla en el hueco reservado, `MovementCategorySelect`, botón `Confirm`, estilo de fila seleccionada. Sigue sin tocar importe, fecha ni descripción. |
| `src/features/review/components/MovementList.vue` | Cabecera con «Select all» (indeterminado) y recuento; pasa selección y eventos a cada fila. |
| `src/features/review/views/ReviewView.vue:167-210` | `choice`, `pending`, `eligibleCount`, `askOrRun` (umbral de 20), y el montaje de la barra, el aviso y el diálogo. |
| `src/shared/components/BaseSelect.vue` | Prop `labelHidden` (etiqueta `sr-only`, mismo `for`/`id`). |
| `src/shared/components/BaseCheckbox.vue` | Props `indeterminate` (propiedad del DOM, `watchEffect` con `flush: 'post'`), `disabled` y `ariaLabel`. |
| `src/assets/theme-dark.css:24,25,45` | Tres líneas `contrast:` nuevas (abajo). |
| `docs/architecture.md` | `features/review/` deja de ser de solo lectura; árbol de componentes al día. |
| Tests de la F15 | Los tres de `design.md` §9, **sustituidos** (abajo). Fixtures ampliadas (`fakeQueue`, cuerpos y `contentType` de los `PATCH`). |

No se tocó: `package.json` (**ninguna dependencia nueva**), `src/assets/styles/`,
`design-system/`, `src/services/http.ts`, `src/features/{net-worth,import}/`,
`../gastos-backend/`.

## Trazabilidad `R<n>` → test

| Req | Test |
|---|---|
| R1 | `store.spec.ts` «ticks a row and unticks it again»; `MovementRow.spec.ts` «offers exactly one tick box…» (`aria-label`) y «tells its parent what was ticked…»; `ReviewView.spec.ts` «counts the rows you tick…» (`2 selected`). |
| R2 | `MovementList.spec.ts` «takes the whole page with one tick…», «is ticked only with the whole page taken, and shows a dash in between»; `store.spec.ts` «selectPage() takes exactly the loaded page…» y «a full page still fits in one request: 200 ids is the cap». |
| R3 | `store.spec.ts` «lets go of the selection and of the last action when the page or the filters change»; `ReviewView.spec.ts` «counts the rows you tick, and clears them when you change page». |
| R4 | `service.spec.ts` «PATCHes the movement path with a JSON body and nothing but categoryId» y «sends categoryId: null…»; `MovementCategorySelect.spec.ts` (los 7 casos: filtrado por `kind`, `No category`, `neutral` deshabilitado con su texto); `store.spec.ts` «categorizeOne() sends only the category…». |
| R5 | `store.spec.ts` «confirmOne() sends one PATCH with only the status…»; `service.spec.ts` «sends only the status when only the status changes»; `MovementRow.spec.ts` «tells its parent…». |
| R6 | `ReviewActionBar.spec.ts` «counts what is selected and carries the number inside the button» y «says one movement in singular»; `store.spec.ts` «confirmSelected() sends one PATCH with the ids and nothing else»; `ReviewView.spec.ts` «confirms the whole page in one request…»; `e2e/review-actions.spec.ts` «confirming a row empties it from the queue…». |
| R7 | `actions.spec.ts` (`eligibleForCategory`, 4 casos); `ReviewActionBar.spec.ts` «says how many de la selección…» y «refuses to send an action that would reach nobody»; `store.spec.ts` «categorizeSelected() sends only the movements that accept that category» y «sends nothing at all when no selected movement accepts the category»; `e2e` «a category only travels to the movements that accept it» (`Applies to 2 of 3 selected`). |
| R8 | `ReviewView.spec.ts` «sends 19 movements straight away, without a dialog», «asks first from 20 up, and cancelling sends nothing and keeps the selection», «goes ahead when the dialog is accepted»; `BulkConfirmDialog.spec.ts` (título con acción y número, foco en `Cancel`). |
| R9 | `service.spec.ts` «PATCHes the collection once with ids and status, and nothing else» (`Object.keys`), «deduplicates the ids…», «refuses more than the cap, and an empty selection, without touching the network», «refuses a body with neither categoryId nor status»; `store.spec.ts` (cuerpos exactos de cada acción). |
| R10 | `store.spec.ts` «confirmOne() … the row leaves the queue» (`pendingCount` 132→131), «asks for the page again after the change…», «confirming the last page of the queue falls back to page 1»; `e2e` (la fila desaparece sin recargar y el contador de la barra lateral baja a 131). |
| R11 | `store.spec.ts` «a second click while the first is in flight does not send a second request»; `ReviewActionBar.spec.ts` «shows the action running and refuses a second click» (`aria-busy`); `MovementRow.spec.ts` «waits for the action in flight…». |
| R12 | `actions.spec.ts` (los cinco textos + «never carries the backend message» + `needsReload`); `store.spec.ts` «keeps the list and the selection after a 400, and does not reload», «reloads the list after a 404», «reloads the list when the answer cannot be read», «says nothing changed when the server is unreachable»; `ReviewView.spec.ts` «says in English that nothing changed…»; `e2e` «a rejected change leaves the list exactly as it was». |
| R13 | `actions.spec.ts` (`undoPlan`, 4 casos; `actionSummary`, 3); `store.spec.ts` «puts a confirmation back with one PATCH…» y «puts a categorization back with one PATCH per previous category»; `ReviewView.spec.ts` «undoes the last action and brings the rows back»; `e2e` «Undo sends the opposite change…»; `ActionNotice.spec.ts`. |
| R14 | `store.spec.ts` «stops at the group that failed, says so and reloads» (3 `PATCH`, 1 `GET`, `Reloading the list`). |
| C1 | `package.json` sin cambios (`git diff` vacío); `store.spec.ts` «only ever talks to the two read endpoints» y `ReviewView.spec.ts` «only ever GETs the two read endpoints» (conservados); las únicas rutas del código son `/api/movements`, `/api/movements/:id` y `/api/categories`. |
| C2 | `theme-dark.spec.ts` (161 casos, incluidas las 3 líneas nuevas y «has no raw colors» sobre cada `.vue`); `ReviewView.spec.ts` «writes every word in English». |
| C3 | La suite de la F15 entera en verde; los tres tests de `design.md` §9 sustituidos, no borrados; `e2e/review-queue.spec.ts` y `e2e/app-boot.spec.ts` sin tocar y verdes. |
| C4 | `MovementRow.spec.ts` «never lets the banking fact be edited…»; `service.spec.ts` (claves exactas del cuerpo). |
| C5 | Ver *Verificación*. |
| C6 | **Pendiente** (T21). |

## Decisiones tomadas dentro del spec

1. **`refreshAfterAction` propio en vez de reutilizar `load()`** (T0.1): el
   refresco tras una acción no debe vaciar la lista ni parpadear, y si el propio
   refresco falla se conserva lo que la acción ya dejó coherente en pantalla.
2. **`actionMessage` además de `actionError`** en el store: R14 exige un texto
   distinto del de `actionErrorMessage` cuando el deshacer se queda a medias.
   El store guarda el `AppError` (para los tests) y la frase ya construida
   (lo único que pinta la vista); el `message` del backend no se muestra nunca.
3. **La selección se poda sola** (`store.ts:259`): tras aplicar la respuesta,
   los ids que ya no están en la lista dejan de estar marcados. Así
   «confirmar la selección» la vacía, y «categorizar la selección» la conserva
   (las filas siguen en la cola), que es el encadenado natural
   categorizar → confirmar. Con un fallo, la selección se mantiene intacta (R12).
4. **`MAX_IDS` vive en `actions.ts`** (puro) y `service.ts` lo reexporta:
   `design.md` lo listaba en los dos sitios y duplicarlo era pedir que se
   desincronizaran.
5. **Fixture `fakeQueue`** (`__tests__/fixtures.ts`): un backend de cola de
   juguete (el `GET` devuelve lo que sigue pendiente, el `PATCH` aplica el
   cambio). Sin él, el refresco silencioso resucitaba en los tests la fila que
   se acababa de confirmar y las aserciones no medían nada real.

## Desviación del diseño (una, documentada)

**`CategorySelect.vue` no se tocó.** `design.md` §1/§5 preveía añadirle
`placeholder` y `kind` para reutilizarlo en la barra de acciones. La barra
necesita **tres** estados —nada elegido / una categoría / quitar la categoría— y
el `modelValue: number | null` del selector de filtro solo expresa dos: `null`
sería a la vez «no he elegido» y «quitar categoría». En vez de ensanchar el tipo
del componente de la F15 con un valor centinela, `ReviewActionBar.vue` monta su
propio `BaseSelect` con las opciones que necesita (`Choose a category…`,
`Remove category` y el árbol). Consecuencias: el filtro de la F15 queda
exactamente igual (C3 más barato de sostener) y la duplicación es un `optgroup`
de seis líneas. El `kind` tampoco se usa: la selección puede mezclar gastos e
ingresos, y quien explica la mezcla es `Applies to N of M selected`.

## Contraste (C2)

Líneas nuevas en `src/assets/theme-dark.css`, todas medidas por
`theme-dark.spec.ts`:

```
contrast: --positive on --surface-app >= 4.5 (review: what the last action did)   → 5,54
contrast: --negative on --surface-app >= 4.5 (review: why an action failed)       → 4,69
contrast: --brand on --surface-sunken >= 3 (left edge of a selected review row)   → 7,44
```

## Verificación

Todo en verde, en este orden (2026-09-20):

```
pnpm type-check   → vue-tsc --build, sin errores
pnpm lint         → oxlint . --fix, sin errores
pnpm test:unit    → 56 archivos, 793 tests (F15: 691 → +102)
pnpm build        → dist/assets/index-*.js 195,18 kB (66,03 kB gzip), 833 ms
pnpm test:e2e --project=chromium → 12 tests (4 nuevos), todos pasan
./init.sh         → [OK] Entorno listo. Puedes empezar a trabajar.
```

**Ninguna petición salió a un backend real.** Los tests unitarios mockean
`fetch`; el e2e intercepta con `page.route` y su primera ruta aborta cualquier
`/api` no prevista. No se lanzó ningún `PATCH` ni `POST /api/import` contra
`:3000`, ni se paró nada en `:3000` ni en `:5173`.

## Lo que NO queda probado

- **C6 / T21: contra el backend real.** Sin visto bueno del humano, no se
  confirmó ni categorizó ningún movimiento de verdad. Lo que eso deja sin
  comprobar: que el backend acepta exactamente estos cuerpos y que la respuesta
  real encaja con `parseBulkResult`. El riesgo es bajo (los cuerpos y las formas
  salen del contrato leído esta sesión), pero es real.
- **El caso «de 200 ids» solo está simulado**: `pageSize` es 100 y la selección
  nunca pasa de una página, así que el tope no se alcanza en la app.
- **Sin cobertura de teclado ni de lector de pantalla más allá de los atributos**
  (`aria-label`, `aria-busy`, `sr-only`, foco inicial del diálogo).
- **Firefox y WebKit**: el e2e nuevo solo se ejecutó en chromium, como la puerta.

## Sugerencias fuera de alcance (NO aplicadas)

1. **Selección con Shift para marcar un rango** de filas: con 1.607 pendientes
   ahorraría muchos clics, y la casilla por fila ya deja el hueco.
2. **Recordar la última categoría aplicada** en la barra para repetirla en la
   siguiente tanda (la cola se limpia por conceptos parecidos).
3. **Un atajo «categorizar y confirmar» en la misma acción** para quien ya sabe
   lo que quiere: el humano eligió a propósito dos gestos (🔴 2), pero con la
   barra montada sería un botón más.
4. **`pendingCount` podría quedar desfasado** si se actúa con filtros activos y
   el refresco silencioso falla: hoy vale el decremento local. Con un endpoint
   de recuento real dejaría de ser una estimación.
5. **La feature de reglas de categorización** que el humano ya acordó para
   después de esta: categorizar a mano no enseña nada al sistema.
