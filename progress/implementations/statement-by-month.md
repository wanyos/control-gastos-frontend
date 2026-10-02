# Implementación — F19 `statement-by-month` (el extracto, mes a mes)

- **Fecha:** 2026-09-26
- **Agente:** implementer
- **Spec:** `specs/19-statement-by-month/` (aprobado por el humano sin cambios el
  2026-09-26; las 6 🔴 implementadas tal cual)
- **Tasks:** T0–T17 en `[x]`. **T18 no la hace el implementer** (comprobación con el
  humano delante, contra el backend real; queda pendiente y no bloquea el cierre).
- **Estado en `feature_list.json`:** sigue `in_progress` — la cierra el implementer
  después del veredicto del reviewer y de que exista
  `progress/summaries/statement-by-month.md`.

## Qué hace ahora la pantalla

`/movements` deja de ser un placeholder: entra en el **mes natural en curso** sin
tocar nada, pide `GET /api/movements` con `from`/`to` del mes, `page=1`,
`pageSize=200` y **sin `status`** (se ve lo pendiente y lo confirmado), y pinta las
tres cifras del backend (`Money in` / `Money out` / `Difference`), el recuento del
mes y la **nota fija y no cerrable** sobre las sumas infladas. Debajo, la lista
continua con **una cabecera por día**, la marca `Transfer` en los movimientos que el
backend emparejó, `Load more` si un mes se pasara de 200, la frase del mes vacío y el
bloque de error con `Try again`. El mes vive **solo en la URL** (`?month=2026-03`).

**Es de solo lectura, verificado, no afirmado:** ni un `POST`, `PATCH` ni `DELETE` en
`src/features/statement/`, aserciones de «solo `GET`» en el test de vista y en los
cuatro escenarios e2e, y una red de seguridad que aborta cualquier `/api` no prevista
(así que ninguna llamada sale a `:3000` desde los tests).

## Archivos

**Nuevos** (`src/features/statement/`)

| Archivo | Qué contiene |
|---|---|
| `months.ts` | Todo lo puro del mes: `MonthKey`, `STATEMENT_PAGE_SIZE`, `currentMonth`, `monthRange`, `shiftMonth`, `formatMonthLabel`, `isAtOrAfterCurrentMonth`, `monthFromRouteQuery`, `monthToRouteQuery`, `monthQuery`, `groupByDay`, `movementCountLine`, `showingLine`, `emptyMonthLine`, `loadingMonthLine`, `statementErrorMessage` |
| `types.ts` | Re-export de los tipos de `@/shared/movements` + `DayGroup` |
| `store.ts` | `useStatementStore`: `month`, `result`, `extra`, `page`, `isLoading`, `isLoadingMore`, `error`, `days`, `shown`, `hasMore`, `show`, `shift`, `loadMore`; contador `loadRun` |
| `components/MonthNav.vue` | Flechas ‹ ›, etiqueta del mes y selector `type="month"` |
| `components/MonthTotals.vue` | Las tres cifras, el recuento y la nota fija |
| `components/StatementList.vue` | Cabeceras de día sticky, filas, mes vacío y `Load more` |
| `components/StatementRow.vue` | La línea de solo lectura |
| `views/StatementView.vue` | La página de `/movements` |
| `__tests__/` | `fixtures.ts`, `months.spec.ts`, `store.spec.ts`, `MonthNav.spec.ts`, `MonthTotals.spec.ts`, `StatementList.spec.ts`, `StatementRow.spec.ts`, `StatementView.spec.ts` |

**Nuevo también:** `e2e/statement.spec.ts` (4 escenarios).

**Modificados**

- `src/router/index.ts` — `/movements` monta `StatementView`; reescrito el comentario
  que decía que se quedaba placeholder a propósito.
- `src/router/__tests__/router.spec.ts` — el test que afirmaba el placeholder
  (línea 58) **se sustituye**, no se borra: ahora afirma que `/movements` monta
  `StatementView`, que **no** es `ReviewView` y que **no** es `PlaceholderView`. Es la
  única excepción prevista a C4.
- `src/shared/components/BaseInput.vue` — `type?: 'text' | 'date' | 'month'` (una
  palabra; el `input` ya estaba maquetado con los tokens).
- `docs/architecture.md` — `features/statement/` en el árbol + nota de que es de solo
  lectura y no depende de ninguna otra feature; `BaseInput.type` admite `'month'`.
- `docs/stack.md` — el e2e pasa a **seis** specs (con qué intercepta el del extracto);
  la feature **no añade ningún icono** (reutiliza `ChevronLeft`/`ChevronRight` y
  `TriangleAlert`).

**No se ha tocado:** `src/shared/movements.ts`, `features/review`, `import`,
`category-rules`, `net-worth`, `PlaceholderView`, `theme-dark.css`, el backend, y
**ninguna dependencia** (`package.json` intacto).

## Decisiones y diseño

1. **Feature aislada** (`features/statement/`): no importa nada de otra feature y
   nadie la importa salvo el router. Lo común sale de `shared/` (`movements.ts`,
   `money.ts`, `banks.ts`, `components/Base*`).
2. **La fila se copia** de `review/components/MovementRow.vue` sin sus cuatro
   controles que escriben, en vez de meterle un `readonly`: eso habría abierto una
   dependencia `statement → review`. Lo duplicado es maquetación; la lógica (signo
   desde `type`, formato de dinero, nombre del banco) sigue viviendo en `shared/`.
3. **Las sumas nunca se calculan aquí**, ni para comprobar: se pintan tal cual vienen.
   `toCents` se usa solo para el signo del `Difference`. Hay un test que comprueba que
   lo pintado **no** coincide con la suma de los movimientos inyectados.
4. **El mes se construye como texto** (`${month}-01` … `${month}-${últimoDía}`, el
   último día leído en UTC con `Date.UTC(y, m+1, 0)`), así que ningún huso mueve un día
   —febrero de 2024 da `2024-02-29`— y `shiftMonth` es aritmética de enteros de mes.
5. **La URL es la única fuente de verdad del mes**: `MonthNav` no carga nada, emite el
   mes; la vista hace `router.push`; un `watch` sobre `route.query.month` dispara la
   carga. Así recargar, el botón de atrás y un enlace compartido se comportan igual, y
   no hay dos sitios que puedan discrepar.
6. **Última en pedir, última en pintar** (`loadRun`): una respuesta de un mes que ya no
   es el pedido se descarta; la acción del store **nunca lanza**, el fallo vive en
   `error`.
7. **`Load more`, no paginador**: añade al final y no mueve `pagination.total` ni
   `totals`, que son del mes. `page` y `shown` se exponen en el store para saber qué
   página pedir y para el `Showing N of M`.
8. **Errores con frases propias en inglés**, derivadas del patrón de
   `reviewErrorMessage`; el `message` del backend (español, con ids) no se pinta nunca
   y hay un test que lo vigila.

## Trazabilidad `R<n>` → test

| Req | Test que lo demuestra |
|---|---|
| **R1** (mes en curso, mes entero, sin `status`) | `months.spec.ts` → «asks for the whole month, page 1, at the contract maximum» + «never carries a status: the statement shows pending and confirmed alike»; `store.spec.ts` → «asks for the whole month, with no status filter (R1)»; `StatementView.spec.ts` → «opens on the current month with one request, and shows it (R1)» |
| **R2** (flechas y selector cargan ese mes) | `MonthNav.spec.ts` → «the arrows emit the neighbouring month, crossing the year» + «jumps to the month chosen in the picker»; `store.spec.ts` → «replaces the month on screen when another one is shown (R2)»; `StatementView.spec.ts` → «writes the month in the URL and loads it from there (R2, R3)»; `e2e/statement.spec.ts` → «the back arrow changes the month, the URL and the figures, and a reload stays» |
| **R3** (el mes en la URL; recarga y atrás) | `months.spec.ts` → «reads back what it writes»; `StatementView.spec.ts` → «opens on the month the URL carries (R3)», «writes the month in the URL…», «going back in history goes back to the month before (R3)»; e2e → mismo escenario con `reload()` y `goBack()` |
| **R4** (URL inválida → mes en curso, sin error) | `months.spec.ts` → «falls back to the current month with no error: %s» (5 casos) + «falls back when the key is missing or repeated as an array»; `StatementView.spec.ts` → «falls back to the current month with no error when the URL says %s (R4)» (3 casos) |
| **R5** (las tres cifras son las del backend) | `MonthTotals.spec.ts` → «paints the three figures exactly as the backend sent them», «does not recompute anything: the figures do not match the movements it was given», «labels them neutrally, and says how many movements the month has»; `store.spec.ts` → `result.totals` intacto tras `loadMore` |
| **R6** (nota permanente, sin cerrar) | `MonthTotals.spec.ts` → describe «the permanent note (R6)»: «says the four things, with July 2026 as the example», «cannot be dismissed: no close button anywhere in the block», «is shown with the month, not behind a hover or a tooltip»; `StatementView.spec.ts` → la nota está al montar; e2e → «…its note…» |
| **R7** (ni `spent`, ni `earned`, ni `savings`) | `MonthTotals.spec.ts` → «never calls these figures spending, earnings or savings (R7)» |
| **R8** (lista continua, cabecera por día, sin reordenar) | `months.spec.ts` → describe «grouping by day (R8)» (4 tests, incluido «never re-sorts»); `StatementList.spec.ts` → «opens one day header per day, in the order the API sent them» + «shows every movement of the month under its day»; `StatementRow.spec.ts` → «does not repeat the date…» |
| **R9** (los cuatro datos, signo desde `type`, sin saldo) | `StatementRow.spec.ts` → «shows the description, the account, the category and the amount», «takes the sign from `type`, not from the amount», «says Uncategorized when the movement has no category», «never paints the balance after the movement, even when the file brings it»; `StatementView.spec.ts` → «shows no figure and no balance column of its own (R9)» |
| **R10** (marca `Transfer`) | `StatementRow.spec.ts` → «marks a paired transfer, and only a paired transfer»; e2e → `statement-row-transfer` con recuento 1 |
| **R11** (mes vacío con su frase y sin tabla) | `StatementList.spec.ts` → «an empty month says so and paints no list and no day header (R11)»; `store.spec.ts` → «keeps an empty month as a plain answer, not as a failure (R11)»; `StatementView.spec.ts` → «says an empty month in its own words, not as a failure (R11)»; e2e → «a month with nothing in it says so…» |
| **R12** (fallo con frase propia y reintentar) | `months.spec.ts` → «tells a load failure in English, never with the backend message» + «never leaks the backend sentence into any message»; `store.spec.ts` → describe «a failure never throws (R12)» (4 tests); `StatementView.spec.ts` → «tells it in English and offers to try again» + «never paints the backend sentence, which comes in Spanish» |
| **R13** (`Load more` del mismo mes, sumas quietas) | `store.spec.ts` → describe «Load more inside the month (R13)» (4 tests); `StatementList.spec.ts` → «offers Load more only when the month does not fit in one page (R13)» + «asks for the rest of the month when Load more is clicked» |
| **R14** (indicador de carga, no media lista) | `store.spec.ts` → «shows the loading flag while the month is in flight (R14)»; `StatementView.spec.ts` → «shows the loading line instead of half a list (R14)» |
| **R15** (respuesta vieja descartada) | `store.spec.ts` → «discards a late answer of a month that is no longer the one asked for (R15)» |

### Restricciones

| C | Evidencia |
|---|---|
| **C1** solo lectura | `StatementRow.spec.ts` «carries no control»; `StatementList.spec.ts` «has no control that writes a movement»; `StatementView.spec.ts` «only ever reads: no request of the whole screen uses another method (C1)»; los 4 escenarios e2e afirman `method() === 'GET'` sobre **todas** las peticiones `/api`; grep: en `src/features/statement/` no aparece `POST`, `PATCH` ni `DELETE` |
| **C2** frontera | El store llama a `getMovements`/`parseMovementPage` de `shared/movements.ts`; `types.ts` solo re-exporta. `store.spec.ts` «keeps a response that breaks the contract in `error`» demuestra que la guarda compartida es la que salta |
| **C3** una sola dirección | Grep de cierre: `src/features/statement/` no importa `features/review|import|category-rules|net-worth`, y nadie importa `statement` salvo el router |
| **C4** F15–F18 intactas | Suite completa verde (1060 tests) sin tocar sus specs; el único test cambiado es `router.spec.ts:58`, sustituido, no borrado |
| **C5** sin dependencias, inglés, tema oscuro | `package.json` sin cambios; ningún color crudo en la carpeta (grep de hex / `rgb(` / paleta de Tailwind); `theme-dark.css` **no se toca**: los pares `--warning on --surface-card` y `--warning on --warning-subtle` ya tenían su línea `contrast:` (T0) y `theme-dark.spec.ts` sigue verde |
| **C6** puerta | Ver abajo |
| **C7** comprobación final | **Pendiente**: es la T18, del leader con el humano |

## Puerta (T17)

Todo ejecutado en este orden, todo en verde:

| Comando | Resultado |
|---|---|
| `pnpm type-check` | OK (`vue-tsc --build`, sin errores) |
| `pnpm lint` | OK (`oxlint . --fix`, sin hallazgos) |
| `pnpm test:unit` | **74 ficheros, 1060 tests, 0 fallos** (antes de la feature: 67 y 973 → **+7 ficheros y +87 tests**) |
| `pnpm build` | OK — `dist/assets/index-*.js` 231,55 kB (75,49 kB gzip), CSS 31,70 kB (7,26 kB gzip) |
| `pnpm test:e2e --project=chromium` | **21 tests, 21 pasan** (los 17 anteriores sin tocarlos + 4 nuevos del extracto) |
| `./init.sh` | `[OK] Entorno listo. Puedes empezar a trabajar.` (type-check + 1060 tests + e2e smoke chromium) |

Salida final de `./init.sh` (cola):

```
── 5. Ejecutando tests ─────────────────────────────────
 Test Files  74 passed (74)
      Tests  1060 passed (1060)
[OK]    Todos los tests pasan

── 6. E2E smoke (chromium) ─────────────────────────────
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

## Desviaciones respecto al spec (todas menores, ninguna toca una 🔴)

1. **Cabecera de día: `bg-surface-card`, no `bg-surface-app/95`** (design §7). La
   cabecera sticky vive **dentro** de la `BaseCard`, así que el fondo de la tarjeta es
   el que la hace opaca sin una banda de otro color; y con `surface-card` **todos** los
   pares de color ya están medidos en `theme-dark.css`, así que la feature no toca el
   tema (que es justo lo que T0 quería confirmar). Con `surface-app/95` habría que
   añadir líneas `contrast:` nuevas para una diferencia visual mínima.
2. **T0(b) se comprobó en el navegador dentro del e2e**, no a mano en `pnpm dev`:
   `e2e/statement.spec.ts` → «the month picker reads legibly with the design system
   tokens» lee los estilos computados del `input type="month"` real (tokens aplicados,
   texto y fondo distintos, `color-scheme: dark` heredado). **No hizo falta el plan B**
   del `BaseSelect` de 12 meses.
3. **Dos textos más en `months.ts`** de los que nombra design §3: `loadingMonthLine` y
   `showingLine`. Los dos textos sí están en la tabla de design §6; solo faltaba su
   firma.
4. **La nota fija de R6 es una constante dentro de `MonthTotals.vue`**, no de
   `months.ts`: design §6 deja los «rótulos fijos» en el componente, y la nota no la
   usa nadie más.
5. **El store expone `page` y `shown`** además de lo listado en design §3: hacen falta
   para saber qué página pide `Load more` y para el `Showing N of M`.
6. **Un `Load more` fallido deja la lista puesta** y pinta el bloque de error encima
   (con `Try again`, que recarga el mes). El spec solo pedía que el store no lanzara;
   blanquear un mes entero porque falló la página 2 habría sido peor.
7. **`docs/stack.md` tocado además de `docs/architecture.md`** (T16 solo pedía el
   segundo): el doc afirmaba «los cinco specs de `e2e/`» y que la #15 fue la última en
   añadir iconos. Son dos líneas de exactitud, sin decisiones nuevas.

## Sugerencias fuera de scope (NO aplicadas)

- **Filtros, búsqueda e interruptor del ruido**: son las tres rodajas siguientes de la
  E7, tal como dice el `intent`.
- **Corregir la categoría desde el extracto**: feature posterior
  (`respuestas_del_humano` 4).
- El aviso de `vitest` sobre `pool: 'vmThreads'` (jsdom creado 74 veces, ~105 s) sigue
  ahí y ya es el 72 % del tiempo de la suite; es una mejora de tooling que merece su
  propia tarea de higiene, no esta feature.
- `docs/roadmap.md` no se ha tocado: el estado de la etapa E7 se actualiza al cerrar la
  sesión, después del reviewer.
