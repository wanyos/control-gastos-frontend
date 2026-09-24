# Implementación — Feature 18: `rule-match-preview`

> Implementer, 2026-09-24. Spec: `specs/18-rule-match-preview/`, aprobado por el
> humano sin cambios el 2026-09-24 (5 🔴 tal cual). Tasks **T0–T17 en `[x]`**;
> **T18 no es del implementer** (comprobación con el humano delante).
> Estado en `feature_list.json`: sigue en **`in_progress`** — la cierra el
> implementer *después* del veredicto del reviewer.

## Qué hace

Mientras se escribe el texto de una regla —creándola desde Review o cambiándola
desde Rules— el diálogo dice **a cuántos pendientes sin categoría afecta**, enseña
**hasta 5** de ellos (fecha, concepto, importe), avisa si son **demasiados (>50)** o
**ninguno**, y **nunca impide guardar**. Además la propuesta de texto por defecto
crece ante palabras genéricas y de canal.

**Es una feature de solo lectura.** La única petición que hace es
`GET /api/movements`. Ninguna escritura sale de la previsualización, y eso está
comprobado en tres niveles (store, vistas y e2e).

## Archivos

**Nuevos**

| Archivo | Qué es |
|---|---|
| `src/shared/movements.ts` | La mitad **de lectura** de los movimientos, movida tal cual desde `review/` (design §1) |
| `src/features/category-rules/components/RuleMatchPreview.vue` | El bloque del diálogo: recuento, avisos, ejemplos, spinner, error y la nota de «estimate» |
| `src/features/category-rules/__tests__/preview-rules.spec.ts` | Lógica pura: umbrales, filtro, frases y **la tabla entera de design §7** |
| `src/features/category-rules/__tests__/preview-store.spec.ts` | Estado: filtro exacto, «la última gana», fallos, y que solo hay GETs |
| `src/features/category-rules/__tests__/RuleMatchPreview.spec.ts` | Los cuatro estados del bloque |

**Modificados**

| Archivo | Cambio |
|---|---|
| `src/features/review/{types,service,filters}.ts` | Re-exportan lo movido a `shared/movements.ts`; **ningún test de F15/F16 se tocó** |
| `src/features/category-rules/rules.ts` | `BANK_BOILERPLATE` ampliada (canal), `GENERIC_WORDS`, `MAX_PROPOSAL_WORDS`, nuevo criterio de crecimiento y los helpers de previsualización |
| `src/features/category-rules/types.ts` | `MatchPreview` |
| `src/features/category-rules/store.ts` | `preview`, `previewMatches(text, kind, client?)`, `clearPreview()` y el contador `previewToken` |
| `src/features/category-rules/components/RuleDialog.vue` | Temporizador de 350 ms, emisión `preview`, prop `preview`, bloque bajo el campo |
| `src/features/category-rules/views/RulesView.vue`, `src/features/review/views/ReviewView.vue` | Enganchan `@preview` y pasan `:preview`; `clearPreview()` al cerrar y tras guardar bien |
| `src/features/category-rules/__tests__/{fixtures,RuleDialog.spec,RulesView.spec}.ts`, `src/features/review/__tests__/ReviewView.spec.ts` | Fixtures de movimientos y los tests nuevos de diálogo y de vista |
| `e2e/category-rules.spec.ts` | Escenario nuevo + el fake de `/api/movements` ahora filtra por `q` y respeta `pageSize` |
| `docs/architecture.md` | `shared/movements.ts` en el árbol y la nota de por qué se movió |

**No se tocó:** el backend, `category-rules/service.ts`, `review/store.ts`,
`actions.ts`, `RuleList`, `RuleRow`, `ApplyRulesDialog`, `ApplyResult`, el router,
`theme-dark.css` ni ninguna dependencia (`package.json` intacto).

## Decisiones y hallazgos

- **T0 (a):** `--warning on --surface-card` (≥4,5) y `--warning on --warning-subtle`
  (≥4,5) **ya tienen** su línea `contrast:` en `theme-dark.css` (líneas 35 y 59), y
  también `--border-subtle on --surface-card`, `--ink-body/-muted/-faint on
  --surface-card` y `--negative on --surface-card`. **No hizo falta tocar el tema**;
  `theme-dark.spec.ts` sigue verde.
- **T0 (b):** `buildMovementsQuery` arma `type` y `uncategorized=true` juntos sin
  problema, y nunca junto a `categoryId` (la rama es excluyente). Queda fijado en un
  test que compara el querystring entero:
  `status=pending_review&type=expense&uncategorized=true&q=mercadona&page=1&pageSize=5`.
- **T0 (c):** el patrón de temporizador de `ReviewFilterBar.vue:144` se reproduce en
  `RuleDialog` con `vi.useFakeTimers()` sin sorpresas (ráfaga → una sola emisión).
- **El traslado a `shared/` respeta el sentido de la dependencia (C2):** se movió
  solo la lectura; los dos `PATCH` se quedan en `review/service.ts`. `grep` de cierre:
  `category-rules/` no importa nada de `review/` ni de `import/`.
- **«La última gana» es explícito:** `previewToken` sube con cada consulta **y con
  cada `clearPreview()`**, así que una respuesta vieja —o una que llega después de
  cerrar el diálogo— se descarta sin tocar el estado.
- **El botón de guardar no mira nunca al `preview`** (R7, R9): sigue dependiendo solo
  de `isTooShort` y de la categoría elegida.
- **El `preview` es opcional en el diálogo** (`preview?: MatchPreview | null`): sin
  él, el bloque no se pinta. Por eso los tests de la F17 siguen valiendo tal cual.

### Desviación documentada (una)

`RulesView.spec.ts:97` afirmaba `api.touchedMovements()` → `false` en «cambiar una
regla no toca ningún movimiento». Desde esta feature el diálogo **lee**
`GET /api/movements` para contar, así que esa aserción se cambió a
`api.wroteMovements()` → `false` (mismo espíritu, medido por método y no por ruta) con
un comentario que lo explica. Es el **único** test de la F17 que cambió de contenido;
el resto de suites de F15/F16/F17 pasan sin tocarse. Se añadieron al helper
`mockFetch` una respuesta opcional `movements` y los lectores `wroteMovements()` /
`movements()`.

### Verificación del 🔴 4 (la tabla de design §7)

Comprobada entera, casos nuevos y **regresión de los cuatro que ya salían bien**:

| Concepto | Propuesta |
|---|---|
| `AB Servicios Selecta E` | `servicios selecta` ✔ nuevo |
| `JUAN JOSE ROMERO RAMOS - INGRESO` | `juan jose romero` ✔ nuevo |
| `TPV VIRTUAL 1234 AMAZON MARKETPLACE` | `amazon` ✔ nuevo |
| `TPV VIRTUAL` | `tpv virtual` (sin nada más en el concepto) |
| `RECIB /IBERDROLA CLIENTES, S.A` | `iberdrola` ✔ igual que hoy |
| `COMPRA TARJ. MERCADONA` | `mercadona` ✔ igual que hoy |
| `MEGA DEPORTES` | `mega deportes` ✔ igual que hoy |
| `TULOTERO` | `tulotero` ✔ igual que hoy |

Los ocho están en `preview-rules.spec.ts` como `it.each`, más la invariante de que
**toda propuesta sigue contenida en el concepto normalizado**. Los tests antiguos de
`proposeMatchText` en `rules.spec.ts` (`bar - pepe`, `bar`, `recibo 12/08`, `almacen`,
`cafe nandu`, el barrido de `BANK_BOILERPLATE`…) **pasan sin tocarse**.

## Trazabilidad `R<n> → test`

| R | Dónde se comprueba |
|---|---|
| **R1** | `preview-rules.spec.ts` › *previewQuery (R1)* (4 tests) · `preview-store.spec.ts` › «asks for exactly the filter of R1, and for nothing else» · `RuleDialog.spec.ts` › «asks once for a burst of keystrokes…» y «waits the same 350 ms the review search waits» · `ReviewView.spec.ts` › «asks for the count as soon as the dialog opens» |
| **R2** | `preview-rules.spec.ts` › *canPreview (R2)* (2 tests) · `preview-store.spec.ts` › «sends nothing below the floor or above the ceiling…» y «forgets a count that no longer applies…» · `RuleDialog.spec.ts` › «asks for nothing below the floor…» y «…above the ceiling of `q` either» |
| **R3** | `preview-rules.spec.ts` › *matchCountLine (R3)* · `preview-store.spec.ts` › «keeps the total of the pagination…» · `RuleMatchPreview.spec.ts` › «reads the count in a sentence about what is pending and uncategorized» · e2e «the dialog says how many movements a text would match…» |
| **R4** | `RuleMatchPreview.spec.ts` › «shows each example with its date, its description and its amount» y «never shows more than five examples» · `RuleDialog.spec.ts` › «shows the count and the examples inside the dialog itself» · e2e (1 ejemplo con concepto e importe) |
| **R5** | `preview-rules.spec.ts` › *matchWarning* «warns above the broad limit and says nothing just below it» · `RuleMatchPreview.spec.ts` › «warns when the text matches too many…» y «says nothing about breadth just below the limit» |
| **R6** | `preview-rules.spec.ts` › *matchWarning* «says so when nothing matches» · `RuleMatchPreview.spec.ts` › «says clearly when nothing matches» · e2e (aviso de «nothing pending…») |
| **R7** | `RuleDialog.spec.ts` › «keeps the save button enabled while the text matches too many» y «…when nothing matches, and when the count fails» · e2e (`rule-save` `toBeEnabled` con 0 coincidencias) |
| **R8** | `preview-store.spec.ts` › «drops the answer of a query that is no longer the last one» y «drops an answer still in flight when the preview is cleared» |
| **R9** | `preview-store.spec.ts` › «says it is counting while the answer is on its way» · `RuleMatchPreview.spec.ts` › «says it is counting, without hiding anything else» · `RuleDialog.spec.ts` › «leaves the field, the selector and the save button usable while counting» |
| **R10** | `preview-rules.spec.ts` › *previewErrorMessage (R10)* (4 casos + «never paints the message of the backend») · `preview-store.spec.ts` › «never throws when the count fails…» y «…when the answer does not follow the contract» · `RuleMatchPreview.spec.ts` › «shows the English sentence of a failed count, and no number» |
| **R11** | `RuleDialog.spec.ts` › «asks for the count as soon as it opens, without a keystroke» · `RulesView.spec.ts` › «asks for the count as soon as an existing rule is opened» y «counts with the kind of the category of the rule» · `ReviewView.spec.ts` › «asks for the count as soon as the dialog opens…» y «counts against the kind of the movement…» · e2e |
| **R12** | `ReviewView.spec.ts` › «never sends anything but a GET of the movements while it counts» y «forgets the count when the dialog is closed» · `RulesView.spec.ts` › «writes nothing while the dialog is open, and forgets the count on close» · `preview-store.spec.ts` › «only ever reads: every call it makes is a GET…» · e2e (`writes(watch)` vacío) |
| **R13** | `preview-rules.spec.ts` › tabla §7 (`TPV VIRTUAL 1234 AMAZON MARKETPLACE` → `amazon`) y «skips the channel words and keeps the shop behind them» |
| **R14** | `preview-rules.spec.ts` › tabla §7 (`servicios selecta`, `juan jose romero`), «grows past a generic word even when it is already long enough» y «stops at four words, however generic the description is» |
| **R15** | `preview-rules.spec.ts` › tabla §7 (las cuatro filas «igual que hoy») + toda la sección `proposeMatchText` de `rules.spec.ts`, **sin tocar** |

Restricciones: **C1** (solo lectura) en `preview-store.spec.ts`, las dos vistas y el
e2e, más el grep de cierre; **C2** grep de imports (limpio); **C3** sin dependencias
nuevas, todo en inglés, solo alias semánticos (`theme-dark.spec.ts` verde); **C4** las
suites de F15/F16/F17 verdes (la única aserción adaptada queda explicada arriba);
**C5** puerta completa abajo; **C6** es la T18, del humano.

## Puerta (T17)

| Comando | Resultado |
|---|---|
| `pnpm type-check` | ✅ `vue-tsc --build` sin errores |
| `pnpm lint` | ✅ `oxlint . --fix` sin avisos |
| `pnpm test:unit` | ✅ **973 tests / 67 ficheros** (antes: 905 / 64 → **+68**) |
| `pnpm build` | ✅ `2009 modules`, `index-xSdWw4O5.js` 221,21 kB (72,76 kB gzip), CSS 31,43 kB |
| `pnpm test:e2e --project=chromium` | ✅ **17 tests** (16 antes + el nuevo) |
| `./init.sh` | ✅ «Entorno listo. Puedes empezar a trabajar.» |

Salida final de `./init.sh`:

```
── 5. Ejecutando tests ─────────────────────────────────
 Test Files  67 passed (67)
      Tests  973 passed (973)
[OK]    Todos los tests pasan

── 6. E2E smoke (chromium) ─────────────────────────────
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Nada salió a `:3000`:** los tests unitarios inyectan un cliente falso o interceptan
`fetch`, y el e2e monta primero la red de seguridad
`page.route('**/api/**', route => route.abort())` y declara encima sus rutas.

## Pendiente

- **T18**, la comprobación con el humano delante contra el backend real (solo
  lectura). No la hace el implementer.
- Cierre a `done` en `feature_list.json` + entrada en `progress/history.md`: **después**
  del veredicto del reviewer y de que exista `progress/summaries/rule-match-preview.md`.

## Sugerencias fuera de scope (no aplicadas)

1. `review/filters.ts` mantiene `SEARCH_MAX = 100` y `category-rules/rules.ts` declara
   `MAX_PREVIEW_TEXT = 100`: el mismo tope del contrato escrito en dos sitios. El
   sitio natural sería `shared/movements.ts`, junto a `SEARCH_DEBOUNCE_MS`. No se
   toca porque cambiaría la F15 sin que esta feature lo pida.
2. El `mockFetch` de los tests de reglas y el `mockApi` de los de review hacen lo
   mismo con formas distintas; unificarlos ahorraría fixtures, pero es refactor de
   tests de tres features.
3. La lista `GENERIC_WORDS` está escrita a mano y sin mirar extractos reales (igual
   que `BANK_BOILERPLATE`). La T18 es justo el momento de corregirla con conceptos
   del humano.
