# Revisión — cabo suelto 47: un `Undo` que falla en `Movements` devuelve la página arriba

## Review — 2026-11-06

**Veredicto:** CHANGES_REQUESTED

### Cambios requeridos

1. `src/features/statement/store.ts:236-239` + `:308` — mientras viaja la recarga tras un
   fallo, `isLoading` ya no se pone a `true` y la lista sigue pintada, así que `Load more`
   (`StatementList.vue:63-71`, sin `disabled`) se puede pulsar y `loadMore` no lo para.
   Comprobado con un test temporal (copia del proyecto, ya borrada): mes de 3 páginas
   inventado, página 2 ya cargada, `categorize` contesta 409, `loadMore()` durante la
   recarga, la recarga contesta antes que la página 3. Resultado con el arreglo:
   `page 3`, filas `[10, 12]` + la de la página 3, `shown 3`, `hasMore false`: **las filas
   de la página 2 desaparecen y `Load more` ya no sale**. Con `store.ts` de HEAD, el mismo
   test: `loadMore` no hace nada (`isLoading true`), `page 1`, `hasMore true`. Antes no podía
   pasar. Hay que impedir `Load more` mientras dura esa recarga (o descartar su respuesta)
   y añadir un test de ese orden de respuestas.
2. `e2e/action-notice-in-view.spec.ts:1714-1724` (`watchLowestScroll`) y la prueba de
   `:1725` — **en WebKit la prueba de categoría no falla de forma fiable sin el arreglo.**
   Con `store.ts` de HEAD: `--project=webkit --repeat-each=6` → **1 failed, 5 passed**; en
   otra pasada de Firefox+WebKit ×3, las 3 de WebKit pasaron. El salto sí existe en
   WebKit: midiendo `scrollY` en cada frame (`requestAnimationFrame` + `MutationObserver`),
   sin el arreglo da `min=0`, `after=0` en las dos repeticiones. `watchLowestScroll` solo
   escucha eventos `scroll` y no lo ve. Que mida también en cada frame, y repetir la
   prueba sin el arreglo en los tres navegadores.
   Además, el informe dice «6 failed (las dos en los tres navegadores)» sin el arreglo; en
   mi pasada salió **4 failed, 2 passed** (la de categoría pasó en Firefox y WebKit). Esa
   línea del informe hay que corregirla con lo que salga.

### Comprobado sin hallazgos

- **El salto existía y desaparece** (Chromium; medido también en Firefox y WebKit;
  `page.route`, sin backend). `scrollY` mínimo medido en cada frame, 2 repeticiones:

  | | sin arreglo (antes → mín → final) | con arreglo |
  |---|---|---|
  | categoría, Chromium | 2630 → 0 → 0 (línea a 2706 px) | 2630 → 2578 → 2611 (línea a 95 px) |
  | exclusión, Chromium | 2382 → 0 → 0 (línea de 360 a 2728 px) | 2382 → 2330 → 2369 (línea de 359,7 a 359,3 px) |

  Firefox y WebKit dan las mismas cifras ±1,5 px. Con el arreglo hay un bajón momentáneo de
  52 px antes de quedarse 19 px arriba; el umbral de la prueba es 60.
- **La recarga tras un fallo se mantiene**: `needsReload` no cambia; `write` y
  `applyExclusion` siguen llamando a la recarga (`store.ts:466`, `:586`) y la lista final
  es la respuesta del backend (`result = answer`); si la petición del mes falla, `result
  null` + `error` (test nuevo `a reload after a failed write that fails too…`).
- **`Undo` que sale bien y `Review`**: sin cambios en su código; sus pruebas pasan en la
  suite completa.
- **Unitarios sin el arreglo** (`store.ts` de HEAD en la copia): `npx vitest run
  src/features/statement/__tests__/store.spec.ts` → **2 failed | 87 passed** (los dos «keeps
  the list on screen»). Prueba de exclusión en navegador sin el arreglo: falla en los tres.
- **Ninguna prueba aflojada**: `git diff --numstat` → `store.spec.ts 99 0`,
  `action-notice-in-view.spec.ts 139 0` (solo líneas añadidas).
- Arquitectura y convenciones de `store.ts`; datos de prueba inventados; ningún dato real.
- Documentos: `git grep` de `reloadAfterFailedWrite`, `Reloading the month`, `Loading`, «vuelve
  a pedir el mes» en `docs/`: nada se ha vuelto falso; el párrafo nuevo de
  `docs/architecture.md:509-517` describe el código.
- Vocabulario: sin términos nuevos.
- `npx playwright test` (tres navegadores, `timeout 580`): 1.ª pasada **278 passed, 1
  failed** (`[firefox] e2e/statement.spec.ts:415 the month picker reads legibly…`, no toca
  este cambio; repetida ×3 en los tres navegadores → 9 passed; no he comprobado la causa);
  2.ª pasada completa → **279 passed**, exit 0.
- `./init.sh` (`timeout 590`) → exit 0: `Type check OK`, `OK: pnpm lint:oxlint:check`, `OK:
  pnpm format:check`, `Test Files 133 passed (133)`, `Tests 2154 passed | 1 expected fail
  (2155)`, `OK: pnpm type-check`, `E2E smoke verde (chromium)`, `Entorno listo`.
- Checks: sin checks (no es una feature de `feature_list.json`).
- Copia temporal y sus pruebas de medida borradas; ningún servidor sigue escuchando en 5173.

## Segunda revisión — 2026-11-06

**Veredicto:** APPROVED
Comprobado: los dos cambios pedidos, el salto, la recarga tras un fallo, `Undo` que sale
bien, `Load more` sin recarga, acciones y cambio de mes durante la recarga, arquitectura,
convenciones, documentos, verificación. Checks: sin checks (no es una feature de
`feature_list.json`). Sin hallazgos que bloqueen.
Resumen de cierre: `progress/summaries/failed-undo-scroll.md`.

Cómo se comprobó (copia temporal del proyecto, ya borrada; `store.ts` de la primera vuelta
rehecho aplicando su diff a HEAD: da el blob `ba071e6`, el mismo que el `index` de aquel diff):

- **Cambio 1, `Load more` durante la recarga.** Mi caso (3 páginas, página 2 cargada, 409,
  `loadMore()` durante la recarga, la recarga contesta antes que la página 3): ahora `page 1`,
  filas `[10, 12]`, `hasMore true`; primera vuelta `page 3`, `[10, 12, 40]`, `hasMore false`.
  `store.spec.ts` con el `store.ts` de la primera vuelta → **1 failed | 89 passed** (el test
  nuevo `Load more does nothing while…`); con HEAD → 2 failed | 88 passed; con el actual → 90
  passed.
- **Cambio 2, prueba de navegador sin el arreglo** (`store.ts` de HEAD): `-g "fails in Movements
  leaves" --repeat-each=5` → **30 de 30 failed** (5 × 2 pruebas × 3 navegadores); y solo WebKit
  `--repeat-each=10` → **20 de 20 failed**, todos con `Received: 0`.
- **El salto sigue arreglado** (medido en cada frame, 2 repeticiones): Chromium categoría 2630
  → mín 2578 → final 2611, línea a 95 px; Firefox y WebKit iguales ±1,5 px.
- **Mismo tipo de problema, probado con tests temporales** contra el actual, la primera
  vuelta y HEAD:
  - cambio de mes durante la recarga y luego `Load more`: igual en los tres (mes nuevo, página 2
    traída). La frase del fallo queda sobre el mes nuevo, también en HEAD.
  - un `refreshQuietly` (regla aplicada, `rulesStore.applyRun`) durante la recarga: después
    `Load more` no hace nada hasta el siguiente cambio de mes o filtro (`isReloadingAfterFailure`
    se queda en `true`). En HEAD el mismo caso deja `isLoading` en `true` (lista quitada), peor.
    No he encontrado un camino desde la pantalla: el diálogo de reglas tapa el `Undo` mientras
    guarda. No lo he comprobado en navegador. No es regresión.
  - un `Load more` en vuelo cuando falla una escritura: `isLoadingMore` se queda en `true` igual
    en los tres; lo apunta ya el informe del implementer. No es regresión.
- `Undo` que sale bien, `Review` y `Load more` sin recarga: sus pruebas (`store.spec.ts`,
  `StatementList.spec.ts`, `StatementView.spec.ts`, `action-notice-in-view.spec.ts`) pasan;
  `npx vitest run src/features/statement` → 421 passed.
- Ninguna prueba aflojada: `git diff --numstat` → `store.spec.ts 160 0`,
  `action-notice-in-view.spec.ts 152 0`.
- `docs/architecture.md:509-520` describe el código actual, también lo de `Load more`.
- `npx playwright test` (tres navegadores, `timeout 580`) → **279 passed**, exit 0.
- `./init.sh` (`timeout 590`) → exit 0: `Type check OK`, `OK: pnpm lint:oxlint:check`, `OK:
  pnpm format:check`, `Test Files 133 passed (133)`, `Tests 2155 passed | 1 expected fail
  (2156)`, `OK: pnpm type-check`, `E2E smoke verde (chromium)`, `Entorno listo`.
- Copia y archivos temporales borrados; nada escuchando en 5173 al acabar.
