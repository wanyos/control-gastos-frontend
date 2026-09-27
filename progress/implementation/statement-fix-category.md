# Informe de implementación — F21 `statement-fix-category`

- **Feature:** 21 — `statement-fix-category` (tercera rodaja de la E7; **la primera vez
  que el extracto escribe**)
- **Spec:** `specs/21-statement-fix-category/` (17 requisitos, 22 tasks), aprobado por el
  humano sin cambios el 2026-09-27, las 5 🔴 tal cual.
- **Fecha:** 2026-09-27
- **Tasks:** **T0–T21 en `[x]`**. **T22 pendiente**: escribe en datos reales y necesita el
  visto bueno explícito del humano; la hará el leader con él delante. Ninguna petición de
  esta sesión salió a `:3000`.
- **Dependencias nuevas:** ninguna. `theme-dark.css` no se tocó.

---

## 1. Qué hace ahora la pantalla

En `/movements`, la etiqueta de categoría de cada línea es **un botón**. Al pulsarla (con
ratón o teclado) se convierte **en su sitio** en el selector de esa línea, con el foco ya
puesto; se elige y **se guarda solo**, esté el movimiento pendiente o confirmado. Del
mismo editor cuelgan `Create rule` (diálogo de la F17 con la previsualización de la F18) y
`Close` (también `Esc`). Sobre la lista y bajo las cifras hay una línea fija con lo que
hizo la última corrección y su `Undo` **sin cuenta atrás**. Solo un editor abierto y un
`PATCH` en vuelo a la vez.

Lo que **no** cambió: el estado de un movimiento, el importe, la fecha, el concepto, las
acciones en bloque (no hay), el sitio de las cifras y **la nota permanente de la F19**, que
sigue palabra por palabra y sin poder cerrarse.

## 2. Archivos

### Nuevos (8)

| Archivo | Qué es |
|---|---|
| `src/features/statement/service.ts` | La **única** escritura del extracto: `setMovementCategory(id, categoryId, client?)`. |
| `src/features/statement/actions.ts` | Puro: `hasCategoryFilter`, `matchesCategoryFilter`, `findCategoryName`, `actionSummary`, `UNDONE_SUMMARY`, `writeErrorMessage`. |
| `src/features/statement/components/RowCategoryEditor.vue` | El selector de una línea + `Create rule` + `Close`. |
| `src/features/statement/components/StatementActionNotice.vue` | La línea con el `Undo`. |
| `src/features/statement/__tests__/service.spec.ts` | El cuerpo exacto del `PATCH` (5 tests). |
| `src/features/statement/__tests__/actions.spec.ts` | Frases y filtro de categoría (15 tests). |
| `src/features/statement/__tests__/RowCategoryEditor.spec.ts` | 13 tests. |
| `src/features/statement/__tests__/StatementActionNotice.spec.ts` | 6 tests. |
| `e2e/statement-fix-category.spec.ts` | Los 5 recorridos de `design.md` §9. |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/shared/movements.ts` | Recibe la mitad de escritura de **un** movimiento: `MovementChanges`, `changesBody`, `patch`, `parseUpdatedMovement`, `updateMovement` y `needsReload`. |
| `src/features/review/service.ts` | Re-exporta lo mudado; deja de definirlo. `updateMovements` (bloque) se queda. |
| `src/features/review/actions.ts` | Re-exporta `needsReload`. |
| `src/features/review/types.ts` | Re-exporta `MovementChanges` (ver desviación 1). |
| `src/features/statement/store.ts` | `editingId`, `isActing`, `actionError`, `actionMessage`, `lastAction`, `actionNotice`; `openEditor`, `closeEditor`, `adoptUpdated`, `refreshQuietly`, `categorize`, `undoLast`; `show` lo olvida todo. |
| `src/features/statement/components/StatementRow.vue` | La insignia pasa a `<button>` y se sustituye por el editor. |
| `src/features/statement/components/StatementList.vue` | Pasa `categories`, `editingId`, `busy`; sube `edit`, `categorize`, `create-rule`, `close-editor`. |
| `src/features/statement/views/StatementView.vue` | Monta el aviso entre cifras y lista, y el `RuleDialog` de la F17. `findCategoryName` sale de la vista a `actions.ts`. |
| `docs/architecture.md` | T20: el extracto deja de ser de solo lectura y gana la dependencia `statement → category-rules`; mapa de carpetas al día. |
| `src/features/statement/__tests__/{fixtures,store,StatementRow,StatementList,StatementView}.spec.ts` | Casos nuevos y el soporte de `PATCH` / `POST /api/category-rules` en `mockApi`. |

## 3. Decisiones de implementación que conviene saber

1. **La barrera del cuerpo.** `statement/service.ts` es la única puerta de escritura y
   escribe el literal `{ categoryId }` dentro. El store **no importa `updateMovement`**.
   `service.spec.ts` lee el cuerpo enviado letra por letra (`{"categoryId":2}` /
   `{"categoryId":null}`), incluido un caso con campos **de contrabando** (`status`,
   `amount`) que no llegan a viajar, y el e2e comprueba lo mismo en un navegador real
   sobre un movimiento **confirmado**.
2. **Qué se repide y qué no (🔴 5).** `categorize` llama a `refreshQuietly()` **solo** si
   `hasCategoryFilter(filters)`. Sin filtro de categoría el store no manda ni una petición
   más: hay test unitario y aserción e2e de que el número de lecturas del mes no se mueve.
3. **Desaparecer al momento (🔴 3).** `adoptUpdated` quita la fila si el movimiento
   devuelto ya no cumple el filtro de categoría, **antes** de cualquier refresco; el test
   lo prueba con el refresco fallando a propósito, para que la desaparición no pueda
   atribuirse al `GET` posterior. `totals` y `pagination` no se tocan nunca (R10).
4. **Un `ref` más de lo que decía el diseño: `actionNotice`.** El diseño pedía
   `lastAction = null` tras deshacer **y** la frase `Change undone` en pantalla; con un
   único `lastAction` las dos cosas no caben (o no hay frase, o el `Undo` rehace). La frase
   vive en `actionNotice` y el botón depende de `lastAction !== null`: tras deshacer queda
   la frase, sin botón, y nada se rehace.
5. **El fallo se pinta después de recargar.** En un fallo que obliga a recargar (R15) el
   orden es `show(...)` y **luego** `actionMessage`: `show` olvida la última acción (R13),
   así que ponerlo antes borraba la frase. El test del 404 lo fija.
6. **El nombre de la categoría del aviso** sale del movimiento que devuelve la API (trae
   su `category` embebida); el árbol es solo el respaldo.
7. **Copiado, no compartido** (como manda el diseño): `RowCategoryEditor` (de
   `MovementCategorySelect`) y `StatementActionNotice` (de `ActionNotice`). El extracto
   sigue sin importar nada de `review`.

## 4. Trazabilidad `R<n>` → test

| R | Dónde se prueba |
|---|---|
| **R1** | `service.spec.ts` «PATCHes the movement path with a body that is exactly {"categoryId":N}», «sends exactly {"categoryId":null}», «never lets a status travel»; `store.spec.ts` «sends one PATCH with only the category and adopts the answer»; e2e «the body of a write never carries a status…». |
| **R2** | `StatementRow.spec.ts` «shows the category as a pressable badge, with no selector in the line»; `StatementList.spec.ts` «has no control that writes a movement but the category badges»; `StatementView.spec.ts` «shows no selector until the badge is pressed, and then only one». |
| **R3** | `StatementRow.spec.ts` «asks to be edited when the badge is pressed…» y «replaces the badge by the editor in its own place…»; `RowCategoryEditor.spec.ts` «closes with the button and with Esc…»; `store.spec.ts` «opens one editor at a time…»; `StatementList.spec.ts` «says which row wants to be edited». |
| **R4** | `RowCategoryEditor.spec.ts` «offers only the categories whose kind matches an expense, plus No category» y «offers only income categories for an income». |
| **R5** | `RowCategoryEditor.spec.ts` «keeps a neutral movement uncategorizable, with its own sentence»; `StatementRow.spec.ts` «a neutral movement keeps a plain badge, not a button». |
| **R6** | `store.spec.ts` «works the same on a confirmed movement, and no status moves»; `StatementRow.spec.ts` «is the same control on a confirmed movement as on a pending one»; e2e «the body of a write never carries a status, on a confirmed movement either». |
| **R7** | `store.spec.ts` «sends one PATCH with only the category and adopts the answer» y «a row brought by `Load more` is replaced where it is»; `StatementView.spec.ts` «writes the chosen category and paints the answer…». |
| **R8** | `actions.spec.ts` (`matchesCategoryFilter`, tres casos); `store.spec.ts` «with `uncategorized` on, the row goes at once…» y «filtering by one category, a row given another one also goes»; e2e «with the uncategorized filter on, the line goes…». |
| **R9** | `actions.spec.ts` (`hasCategoryFilter`); `store.spec.ts` «asks for nothing else when no category filter is on» y «with `uncategorized` on … the figures come again»; `StatementView.spec.ts` «…with no month reload»; e2e «changes the category of a line and does not ask for the figures again». |
| **R10** | `store.spec.ts` «never recomputes the figures of the month in the client»; e2e «…las cifras y el recuento son los del backend» (aserciones de `statement-totals-*` y `statement-totals-count`); `MonthTotals.spec.ts` sigue verde sin tocarlo. |
| **R11** | `StatementActionNotice.spec.ts` «says what the last write did and offers Undo with no countdown»; `StatementView.spec.ts` «mounts the notice between the figures and the list». |
| **R12** | `store.spec.ts` «the undo sends the previous category and leaves nothing to put back»; `StatementView.spec.ts` «undoes the last change from the notice»; e2e «undoes the last change with one write of the previous category». |
| **R13** | `store.spec.ts` «forgets the editor and the undo when the month or a filter changes»; `StatementView.spec.ts` «changing the month forgets the editor and the undo». |
| **R14** | `actions.spec.ts` (`writeErrorMessage`, las cinco frases y «never paints the backend sentence»); `store.spec.ts` (400, red, 404); `StatementView.spec.ts` «a rejected change says it in English…»; e2e «a rejected write says it in English…». |
| **R15** | `actions.spec.ts` «only a 400 and a network failure are sure nothing was written»; `store.spec.ts` «a 400 … does NOT reload», «a network failure … does NOT reload», «a 404 reloads the month…»; e2e (el 400 no recarga). |
| **R16** | `RowCategoryEditor.spec.ts` «asks for the rule dialog without writing anything»; `StatementView.spec.ts` «opens the rule dialog of the F17 from the editor, with its preview». |
| **R17** | `StatementView.spec.ts` «creating the rule writes nothing on the movement it was born from» (la única escritura es `POST /api/category-rules`, sin `PATCH` y sin `/apply`). |

| C | Dónde se prueba |
|---|---|
| **C1** | `service.spec.ts` «writes once per call and touches no other path»; `StatementView.spec.ts` «the only write of the whole screen is that PATCH» (`['GET','PATCH']`); `RowCategoryEditor.spec.ts` y `StatementList.spec.ts`, sin controles de estado/importe. |
| **C2** | `store.spec.ts` «a second click while one write is in flight starts nothing»; `StatementActionNotice.spec.ts` «the Undo waits…»; `RowCategoryEditor.spec.ts` «waits while a write is in flight». |
| **C3** | `MonthTotals.spec.ts` (sin tocar) + `StatementView.spec.ts` y el e2e comprueban que la nota sigue visible tras escribir. |
| **C4** | `service.spec.ts` «validates the answer at the boundary: an id that is not an integer fails». |
| **C5** | Todo en inglés; sin colores crudos (lo vigila `theme-dark.spec.ts`, verde); sin dependencias nuevas. |
| **C6** | Las suites de `review` (240) y `category-rules` pasan **sin tocar ni un test**; 28 e2e verdes sin tocar los specs existentes. Ver desviaciones 2 y 3. |
| **C7** | §5. |
| **C8** | T22, no ejecutada: sin visto bueno explícito. |

## 5. Puerta (T21)

| Comando | Resultado |
|---|---|
| `pnpm type-check` | verde |
| `pnpm lint` | verde (oxlint, sin avisos) |
| `pnpm test:unit` | **82 ficheros, 1.212 tests** (línea base: 78 / 1.135 → **+4 ficheros, +77 tests**) |
| `pnpm build` | verde (246,97 kB JS / 78,50 kB gzip; CSS 31,80 kB) |
| `pnpm test:e2e --project=chromium` | **28 tests** (23 antes → **+5**) |
| `./init.sh` | «Entorno listo. Puedes empezar a trabajar.» |

Salida final de `./init.sh` (secciones 5 a 7):

```
── 5. Ejecutando tests ─────────────────────────────────
 Test Files  82 passed (82)
      Tests  1212 passed (1212)
[OK]    Todos los tests pasan

── 6. E2E smoke (chromium) ─────────────────────────────
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Ninguna llamada real salió a `:3000`:** los tests unitarios mockean `fetch` y los seis
specs de `e2e/` (siete con el nuevo) montan primero la red de seguridad
`page.route('**/api/**', route => route.abort())`. El nuevo spec intercepta además
`**/api/movements/*` y **aborta cualquier método que no sea `PATCH`** en esa ruta.

## 6. Desviaciones declaradas

1. **`MovementChanges` se mudó también a `shared/movements.ts`** (no lo decía la T1).
   `updateMovement` la usa en su firma, así que no podía quedarse en `review/types.ts`
   sin un import cruzado al revés. `review/types.ts` la re-exporta y ningún llamante
   cambió; `BulkUpdate` sigue en `review`.
2. **Dos aserciones de tests de la F19/F20 cambiaron de contenido**, porque afirmaban
   justo lo que esta feature deroga:
   - `StatementRow.spec.ts` «carries no control: this row writes nothing (C1)» → ahora
     «carries no control but the category…»: comprueba que el **único** botón de la fila
     es `statement-row-category-button` y que sigue sin haber `input`, `select` ni
     `Confirm`.
   - `StatementList.spec.ts` «has no control that writes a movement (C1)» → ahora
     «…but the category badges»: cero `select` mientras no se pida un editor, y las 4
     insignias pulsables (la neutral no lo es).
   Son los mismos tests reforzados, no debilitados: el resto de casos de esos ficheros
   no se tocó. **Ningún test de las F15–F18 cambió** (`git diff` no toca
   `features/review/__tests__` ni `features/category-rules/__tests__`).
3. **La T3 decía «casos del `PATCH` movidos a `src/shared/__tests__/movements.spec.ts`» y
   no se movieron.** Choca con C6 y con la propia T3 («sin tocar ni un test»): mover los
   casos es tocarlos. Los de `updateMovement` / `parseUpdatedMovement` siguen en
   `review/__tests__/service.spec.ts`, donde ya ejercitan la implementación compartida a
   través de la re-exportación, y el cuerpo exacto del extracto se prueba aparte en
   `statement/__tests__/service.spec.ts`. Ese fichero `shared/__tests__/movements.spec.ts`
   **no existe** hoy (la mitad de lectura de la F18 tampoco lo creó), así que la mudanza
   habría movido cobertura en vez de añadirla.
4. **`e2e/statement-fix-category.spec.ts` es nuevo, pero el recorrido 2 no puede
   comprobar el `status` en pantalla** (el extracto no lo pinta). Se comprueba en dos
   frentes: el cuerpo interceptado (`['categoryId']` y sin `status`, letra por letra) y el
   store (`store.spec.ts` verifica que el `status` de la fila del confirmado y del
   pendiente sigue siendo el suyo tras escribir).
5. **Añadido de estado no previsto:** `actionNotice` (apartado 3.4), para que puedan
   coexistir la frase `Change undone` y «no se rehace nada».
6. **Un cambio de comodidad no pedido:** `findCategoryName` sale de `StatementView.vue`
   (donde estaba escrito a mano) a `actions.ts`, con test propio. No cambia
   comportamiento; era el mismo recorrido del árbol que necesita el aviso.

### Sugerencias fuera de scope (NO aplicadas)

- Tras una escritura fallida el editor **se queda abierto** con el valor anterior (para
  reintentar). Es coherente, pero no está escrito en el spec; si se quiere lo contrario,
  es una línea.
- El aviso `RuleCreatedNotice` de la F17 (con su «Apply rules now») **no** se monta en el
  extracto: el spec no lo pide. Hoy, quien crea una regla desde aquí tiene que ir a
  `Rules` para aplicarla. Candidato claro a una rodaja futura.
- `e2e/statement.spec.ts` y el nuevo spec repiten ~100 líneas de datos de muestra
  (cuentas, categorías, movimiento). Unificarlas en un helper de `e2e/` es higiene, no
  esta feature.

## 7. Lo que queda (no es del implementer)

- **T22** — prueba contra el backend real de `:3000`, que **escribe**: foto con `curl` de
  uno o dos movimientos, cambiar y deshacer desde la pantalla, foto después y comprobar
  que `categoryId` vuelve y que **`status` no se movió**. Sin visto bueno explícito del
  humano, no se ejecuta.
- **Reviewer** — verificar trazabilidad y tasks; la feature sigue en `in_progress` y
  **no** se marcó `done`. Sin commits.
