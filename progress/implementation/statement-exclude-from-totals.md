# Implementación — Feature 22 `statement-exclude-from-totals`

- **Fecha:** 2026-09-29
- **Agente:** implementer
- **Spec:** `specs/22-statement-exclude-from-totals/` (aprobado por el humano sin
  cambios el 2026-09-29)
- **Tasks:** T0–T22 completadas y marcadas `[x]` en `tasks.md`. **T23 NO ejecutada**
  (escribe en datos reales; requiere visto bueno explícito del humano).
- **Dependencias nuevas:** ninguna. **Backend:** no se toca.

---

## 1. Qué hace

En el extracto aparece un botón `Select movements`. Al pulsarlo cada línea saca una
casilla y, en el hueco que ocupaba el botón, sale una barra con el recuento y las dos
acciones (`Exclude from totals` / `Include in totals`). Lo marcado sigue en la lista,
con una etiqueta gris `Not counted` y el importe atenuado, y **las tres cifras del mes
se vuelven a pedir al backend** tras cada acción, en segundo plano y sin indicador de
carga. Es la primera acción del extracto que mueve las sumas.

---

## 2. Archivos

### Creados

| Archivo | Qué es |
|---|---|
| `src/features/statement/components/StatementSelectionBar.vue` | La barra del modo selección (copia reducida de `ReviewActionBar`). |
| `src/features/statement/components/ExcludeConfirmDialog.vue` | La confirmación a partir de 20 (copia de `BulkConfirmDialog`). |
| `src/features/statement/__tests__/StatementSelectionBar.spec.ts` | 7 casos. |
| `src/features/statement/__tests__/ExcludeConfirmDialog.spec.ts` | 5 casos. |
| `e2e/statement-exclude-from-totals.spec.ts` | Los 6 recorridos de `design.md` §9. |

### Modificados (código)

| Archivo | Cambio |
|---|---|
| `src/shared/movements.ts` | `excludedFromTotals` entra en `Movement`, en `parseMovement` (con `asFlag`, **obligatorio**) y en `MovementChanges`; `changesBody` lo copia **solo** si `typeof === 'boolean'`. Bajan aquí, sin cambiar lógica, el PATCH en bloque (`updateMovements`, `parseBulkResult`, `MAX_IDS`) y los tipos `BulkUpdate` / `BulkResult`. |
| `src/features/review/service.ts` | Ya no implementa el bloque: lo re-exporta desde `shared/`. |
| `src/features/review/actions.ts` | `MAX_IDS` re-exportado desde `shared/`. |
| `src/features/review/types.ts` | `BulkUpdate` / `BulkResult` re-exportados desde `shared/`. |
| `src/features/statement/service.ts` | `setMovementsExcluded(ids, excluded, client?)`: el único camino de escritura del gesto. |
| `src/features/statement/actions.ts` | `STATEMENT_BULK_THRESHOLD = 20`, `countOf`, `exclusionSummary`, `NOTHING_TO_CHANGE`, y `writeErrorMessage(error, gesture)` con las frases del 400 y del 404 en plural. |
| `src/features/statement/store.ts` | `isSelecting`, `selectedIds`, `lastExclusion`, `selectedCount`, `shownMovements`, `canUndo`; `startSelecting` / `stopSelecting` / `toggleSelected` / `selectAllShown` / `clearSelection` / `idsToChange` / `setExcluded` / `undoExclusion` / `undo`. `show()` vacía la selección. |
| `src/features/statement/types.ts` | Re-exporta `BulkResult`. |
| `src/features/statement/components/StatementRow.vue` | Casilla con `selectable`, insignia de categoría **no pulsable** en ese modo, etiqueta `Not counted` junto a `Transfer` e importe en `text-ink-muted`. |
| `src/features/statement/components/StatementList.vue` | Baja `selectable` / `selectedIds`, sube `toggle`. |
| `src/features/statement/views/StatementView.vue` | Botón `Select movements` ↔ barra, el diálogo de confirmación, y el aviso con `Undo` unificado (`store.canUndo` / `store.undo()`). |

### Modificados (tests y fixtures)

`src/features/{statement,review,category-rules}/__tests__/fixtures.ts`,
`src/features/statement/__tests__/{service,actions,store,StatementRow,StatementList,StatementView}.spec.ts`,
`src/features/review/__tests__/service.spec.ts`, y los cinco e2e previos que fabrican
movimientos (ver §5, desviaciones).

**`MonthTotals.vue` y `MonthTotals.spec.ts` no se tocan** (T20, C4): verificado con
`git status`, y además hay dos aserciones nuevas de que la nota sigue ahí (una en
`StatementView.spec.ts`, otra en el e2e).

---

## 3. Decisiones de implementación

1. **Un único camino de escritura** (🔴 5, design §2–§3): `setMovementsExcluded`
   construye el cuerpo dentro del servicio a partir de `(ids, excluded)`; el store
   nunca ve `updateMovements`. El cuerpo sale literalmente como
   `{"ids":[…],"excludedFromTotals":true|false}`, y `changesBody` copia la marca solo
   si es un booleano literal, así que `null`, `"true"`, `0` o `1` **no salen del
   frontend**: fallan aquí, antes de la red.
2. **Solo viajan los que cambian** (R2): `idsToChange(excluded)` compara contra el
   `excludedFromTotals` de la fila. Eso hace además que el `Undo` sea exacto.
3. **Refresco siempre, y solo uno** (R12): tras adoptar los movimientos devueltos se
   llama una vez a `refreshQuietly()`, que reutiliza el guarda `loadRun`. Las cifras
   nunca se calculan aquí (C3); hay un test que da cifras incoherentes en la respuesta
   para demostrar que la pantalla pinta las del backend y no una resta propia.
4. **`writeErrorMessage` toma el gesto** en vez de reescribir sus frases: la F21 sigue
   diciendo lo mismo palabra por palabra (`writeErrorMessage(error)` por defecto) y la
   F22 recibe las suyas en plural con `writeErrorMessage(error, 'exclusion')`.
5. **Un solo `Undo` a la vez**: `canUndo` y `undo()` despachan al deshacer de la F21 o
   al de la F22 según cuál fue la última escritura; cada una limpia la otra.
6. **El modo selección sobrevive al cambio de mes**, la selección no (R7): marcar todo
   myinvestor son varias tandas, una por mes, y apagar el modo en cada salto sería
   trabajo de más.
7. **El campo es obligatorio en el parseo** (design §5): una respuesta sin
   `excludedFromTotals` da `ValidationError` nombrándolo, en vez de dar por no marcado
   el mes entero.

---

## 4. Trazabilidad `R<n> → test`

| Req | Test |
|---|---|
| **R1** | `statement/__tests__/service.spec.ts` › *PATCHes the list path with a body that is exactly …* / *sends exactly {"ids":[…],"excludedFromTotals":false}* / *goes through the bulk request even for one single movement*; `store.spec.ts` › *sends ONE request with the two ids…*; e2e › *marks three lines with one request…* |
| **R2** | `store.spec.ts` › *sends only the ids that really change* / *never ticks more than the 200 ids the contract accepts*; `service.spec.ts` › *refuses an empty selection and more than 200 ids before the network* |
| **R3** | `store.spec.ts` › *sends NOTHING when everything ticked is already like that*; `actions.spec.ts` › *NOTHING_TO_CHANGE …*; `StatementView.spec.ts` › *says there is nothing to change instead of writing* |
| **R4** | `StatementRow.spec.ts` › *paints NO checkbox while the mode is off*; `StatementList.spec.ts` › *shows no checkbox at all while the mode is off*; `StatementView.spec.ts` › *shows one button and no checkbox until it is turned on*; e2e › *the checkboxes only show up when they are asked for* |
| **R5** | `StatementRow.spec.ts` › *paints one checkbox per row…*; `StatementSelectionBar.spec.ts` › *says how many rows are ticked* / *offers the two actions*; `StatementView.spec.ts` › *swaps the button for the bar…* |
| **R6** | `StatementRow.spec.ts` › *stops the category badge from being pressable in that mode* / *gives the badge back as a button…*; `store.spec.ts` › *closes the open category editor when it is turned on*; e2e › *the checkboxes only show up when they are asked for* |
| **R7** | `store.spec.ts` › *ticks and unticks a row, and empties the selection when turned off* / *empties the selection when the month changes…* / *empties the selection when a filter changes* / *forgets the Undo when the month changes*; e2e › *changing month empties the selection…* |
| **R8** | `StatementRow.spec.ts` › *carries the `Not counted` badge, with its reason* / *lives next to the Transfer badge* / *greys the amount out without changing it…* |
| **R9** | `StatementList.spec.ts` › *neither hides, nor filters, nor reorders a marked movement*; `store.spec.ts` › *hides, filters and reorders nothing…*; e2e › recuento `24 movements` tras marcar 3 |
| **R10** | `store.spec.ts` › *marks a neutral movement and a transfer leg like any other* |
| **R11** | `store.spec.ts` › *sends ONE request with the two ids…* (filas sustituidas al instante); `StatementView.spec.ts` › *writes the ticked rows with one request and shows what it did* |
| **R12** | `store.spec.ts` › *sends ONE request…* (`api.queries()` = 2) / *a quiet refresh that fails leaves the rows already changed*; e2e › `monthReads` pasa de 1 a 2 y `statement-totals-out` cambia |
| **R13** | `ExcludeConfirmDialog.spec.ts` (5 casos); `StatementView.spec.ts` › *asks first from 20 movements up…* / *sends nothing when the question is cancelled* / *writes the whole batch once the question is answered* / *does not ask for a batch under the threshold*; e2e › *a batch of 24 asks first, and Cancel sends nothing* |
| **R14** | `actions.spec.ts` › *exclusionSummary …*; `store.spec.ts` › *puts back exactly the ids of the last batch…* / *undoes only the ids that changed…*; `StatementView.spec.ts` › *puts the batch back from the Undo of the notice*; e2e › *the Undo puts exactly those three back* |
| **R15** | `actions.spec.ts` › *writeErrorMessage for the exclusion* (5 casos, incluido *never paints the backend sentence*); `store.spec.ts` › *a 400 says so in English…*; e2e › *a 404 reloads the month and says it in English; a 400 does not reload* |
| **R16** | `store.spec.ts` › *a 404 reloads the month before painting the failure* / *a 400 … does NOT reload* / *a network failure … reloads nothing*; e2e (mismo test) |
| **C1** | `service.spec.ts` › *never lets a status or a categoryId travel, whatever the caller hands over* / *never lets a non-boolean mark leave the frontend*; e2e › claves del cuerpo `['ids','excludedFromTotals']` |
| **C2** | No hay ningún escritor automático: toda llamada a `setExcluded` nace de la barra (revisable en `StatementView.vue`); ningún test necesita simular una regla porque no existe. |
| **C3** | `store.spec.ts` › *never computes a figure itself: they are the ones of the last answer* (T14) |
| **C4** | `StatementView.spec.ts` › *leaves the permanent note of the F19 exactly where it was*; `MonthTotals.{vue,spec.ts}` sin diff |
| **C5** | `store.spec.ts` › *ignores a second click while one write is in flight*; `StatementSelectionBar.spec.ts` › *goes entirely dead while a write is in flight*; `StatementRow.spec.ts` › *disables the checkbox while a write is in flight* |
| **C6** | `service.spec.ts` › *validates the answer at the boundary* (×2, uno de ellos el de la T2: un movimiento **sin** el campo falla nombrándolo); todo el texto en inglés; sin dependencias nuevas |
| **C7** | Puerta completa (§6) |
| **C8** | **T23 pendiente**: no se ejecuta sin visto bueno explícito del humano |

---

## 5. Desviaciones respecto del spec

Tres, todas de tipo «fixture / texto», ninguna de conducta:

1. **`writeErrorMessage` recibe el gesto.** `design.md` §7.2 decía que la función
   «gana el matiz del plural para el 400». Reescribir la frase a secas habría cambiado
   el mensaje de la F21 (y su test). Se añade un segundo parámetro opcional
   (`'category' | 'exclusion'`, por defecto `'category'`), así que **las frases de la
   F21 quedan intactas** y hay un test que lo fija.
2. **Un test de `review` cambia de contenido: `review/__tests__/service.spec.ts` ›
   *keeps the whole movement, not only the painted fields*.** Es una igualdad
   exhaustiva (`toEqual`) del movimiento ya parseado, así que al añadir el campo
   obligatorio hay que declararlo en la expectativa: **una línea**,
   `excludedFromTotals: false`. No cambia ninguna aserción de conducta. El resto de las
   suites de `review` y de `category-rules` pasan sin tocar nada (T4).
3. **Los cinco e2e anteriores que fabrican movimientos ganan el campo en su
   constructor** (`category-rules`, `review-actions`, `review-queue`,
   `statement-fix-category`, `statement`): una línea de datos cada uno. La T21 pedía
   que siguieran verdes «sin tocarlos», pero con `excludedFromTotals` obligatorio en el
   parseo de frontera (design §5) sus payloads dejaban la lista vacía. La alternativa
   —hacer el campo opcional con `false` por defecto— contradice el design, que lo pide
   obligatorio a propósito. **Ninguna aserción de esos ficheros cambia.**

Cambio menor adicional, dentro de la T2: `mockApi().queries()` de
`statement/__tests__/fixtures.ts` ahora filtra por `method === 'GET'`. El PATCH en
bloque comparte ruta con el listado y si no, cada escritura contaba como una lectura.
Ningún test anterior cambia de resultado (antes solo había GET en esa ruta).

También se ajustó el mensaje de rechazo de `updateMovements` /`updateMovement`
(`'a change of categoryId, status or excludedFromTotals'`): es un texto de
`ValidationError`, no lógica, y ningún test lo afirmaba.

## 6. Sugerencias fuera de scope (NO aplicadas)

- `BULK_CONFIRM_THRESHOLD` (F16) y `STATEMENT_BULK_THRESHOLD` (F22) valen 20 los dos y
  viven en sitios distintos a propósito (design §4). Si una tercera pantalla necesita
  el mismo umbral, ahí sí tocará bajarlo a `shared/`.
- El aviso `Nothing to change` se pinta en la línea verde de `StatementActionNotice`.
  Cuando llegue el interruptor del ruido (F23) puede merecer un tono neutro propio.

---

## 7. Puerta (última ejecución, 2026-09-29)

| Comando | Resultado |
|---|---|
| `pnpm type-check` | ✅ `vue-tsc --build` sin errores |
| `pnpm lint` | ✅ `oxlint . --fix` sin hallazgos |
| `pnpm test:unit` | ✅ **84 ficheros, 1292 tests** (antes: 82 / 1212) |
| `pnpm build` | ✅ `dist/assets/index-C0l2mQ5d.js` 254,14 kB (80,43 kB gzip), CSS 31,85 kB |
| `pnpm test:e2e --project=chromium` | ✅ **34 tests** (6 nuevos), 10,9 s |
| `./init.sh` | ✅ verde de punta a punta |

Salida final de `./init.sh`:

```
── 5. Ejecutando tests ─────────────────────────────────
[INFO]  Ejecutando: pnpm test:unit
 Test Files  84 passed (84)
      Tests  1292 passed (1292)
[OK]    Todos los tests pasan

── 6. E2E smoke (chromium) ─────────────────────────────
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Ninguna llamada real sale a `:3000`**: los tests unitarios mockean `fetch` y cada
spec e2e monta primero la red de seguridad (`page.route('**/api/**', abort)`) antes de
declarar las rutas que sí espera. El e2e nuevo además comprueba que en toda la sesión
solo hay métodos `GET` y `PATCH`.

---

## 8. Estado

- `feature_list.json`: la feature 22 sigue en **`in_progress`**. El implementer **no la
  marca `done`**: falta el veredicto del `reviewer` y su
  `progress/summaries/statement-exclude-from-totals.md`.
- **T23 pendiente** y sin ejecutar: escribe en datos reales y necesita el visto bueno
  explícito del humano (C8).
