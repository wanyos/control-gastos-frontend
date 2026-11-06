# Review — hide-not-counted-param (cabo 37 b, parte del frontend)

## Review 2026-11-06

**Veredicto:** CHANGES_REQUESTED

### Cambios requeridos

1. `src/features/statement/store.ts:387` — `adoptUpdated` sigue aplicando en el
   navegador la regla vieja de la casilla: con la casilla puesta, una fila que queda
   `excludedFromTotals` o con `transferId` se quita de la lista, **sin la excepción del
   contrato** para los movimientos de depósito que suman algo (`deposit.countedAmount`
   distinto de `"0.00"`). Es justo el caso del cabo 37 (b). Desde la pantalla se llega:
   `StatementRow.vue:9-17` deja seleccionar cualquier fila, también un vencimiento, y
   `Exclude from totals` lo marca.
   Lo comprobé con un test temporal (borrado después; `git status` sin rastro) sobre
   `fakeMonth([DEPOSIT_MATURITY, EXPENSE])`, `show('2026-10', EMPTY_FILTERS, true)`,
   seleccionar el vencimiento (id 52) y `setExcluded(true)`:
   - con la recarga posterior bien: `{"before":[52,10],"after":[52,10],…}`. Vuelve,
     pero solo porque `refreshQuietly` repinta la página 1; entre la respuesta del
     PATCH y la recarga, la fila desaparece de la lista;
   - con la recarga posterior fallando (`networkDown` después del PATCH):
     `{"after":[10],"maturityId":52,"markedInBackend":true,…}`. El vencimiento
     **desaparece** y no vuelve hasta la siguiente carga, aunque el backend lo seguiría
     listando con `hideNotCounted=true`.
   Qué hacer: que el criterio `gone` de la casilla deje en la lista un movimiento de
   depósito con `countedAmount` distinto de `"0.00"` (la misma regla del contrato y del
   backend falso de `fixtures.ts:489-496`), y un test en `store.spec.ts` que marque un
   vencimiento que suma con la casilla puesta y compruebe que sigue en
   `shownMovements` **también** cuando la recarga posterior falla.
2. `src/features/statement/store.ts:382-384` — el comentario dice que la fila sale
   «when what was just marked is exactly what the switch promises to hide»; con
   `hideNotCounted` ya no es así para un vencimiento que suma. Ajustarlo junto con el
   punto 1.

### Comprobado sin hallazgos

- **`./init.sh`**: primera pasada `EXIT=1`, solo por el E2E: 18 fallos, 17 con
  `net::ERR_CONNECTION_REFUSED` en `http://localhost:5173` (el servidor de desarrollo
  dejó de responder a mitad) y uno (`action-notice-in-view.spec.ts:1112`) esperando
  filas que no llegaron. Ninguno del código tocado. Relanzado: `EXIT=0`, `Test Files
  133 passed (133)`, `Tests 2159 passed | 1 expected fail (2160)`, `E2E smoke verde
  (chromium)`, `Entorno listo`.
- **E2E afectados**: `pnpm test:e2e --project=chromium e2e/statement-noise-toggle.spec.ts
  e2e/statement.spec.ts e2e/statement-exclude-from-totals.spec.ts
  e2e/doubtful-own-money.spec.ts` → `23 passed (9.7s)`.
- **Los tests atrapan la vuelta a los parámetros viejos.** Copia de `filters.ts`
  (sha1 `223f9735…`) y del `git diff` completo; `filters.ts:80` cambiado por
  `if (hideNoise) { query.excluded = 'none'; query.transfer = 'none' }`.
  `pnpm exec vitest run src/features/statement` → `Failed Tests 16` (entre ellos
  `no longer sends excluded=none nor transfer=none with the switch on`, `on, keeps a
  marked and paired maturity that adds its interest, and counts the rest`, `turning it
  on writes hide=true…`). `pnpm test:e2e --project=chromium
  e2e/statement-noise-toggle.spec.ts` → `4 failed, 2 passed`. Restaurado desde la copia
  (no con `git restore`, que habría borrado el cambio sin commitear): mismo sha1, `git
  diff` idéntico al guardado, `vitest run src/features/statement src/shared` →
  `589 passed (589)`.
- **Conteo `Hiding N movements` contra el contrato** (`api-contract.md`, «Esconder lo
  que no cuenta», «Cuántos esconde»: misma petición sin `hideNotCounted`, se restan los
  dos `pagination.total`). `hiddenCountQuery` (`filters.ts:100`) es `monthQuery(…,
  false)` con `pageSize: 1`, sin el parámetro (lo fija `filters.spec.ts` y las URLs de
  `store.spec.ts`/`StatementView.spec.ts`); `store.ts:179-182` resta los dos totales y
  suma lo que quita el navegador. Lo que quita el navegador (`hiddenWhenHiding`:
  depósitos que no son vencimiento; `isBetweenOwnAccounts`: no de depósito) nunca quita
  un vencimiento, así que no se cuenta dos veces. El test nuevo del store da
  `hiddenCount` 2 y pasa.
- **Backend falso** de `fixtures.ts:489-496`: misma regla que la fila `hideNotCounted`
  del contrato, y no esconde nada con `excluded=none&transfer=none`.
- **`src/features/overview/`**: `git diff --stat` vacío, no se ha tocado.
- **Documentos**: `git grep` de `excluded=none|transfer=none|two scopes|both scopes`
  fuera de `progress/`, `specs/` y `overview/`. `docs/architecture.md:161-163` y
  `:478-483` al día. Quedan con lo viejo, como entradas fechadas o históricas:
  `docs/roadmap.md:312` (cierre de la F23), `docs/roadmap.md:457` (el propio cabo 37,
  que cierra el leader) y `feature_list.json:993` (`acceptance` de una feature
  cerrada).
- Tipado `hideNotCounted?: true` y su `@ts-expect-error`, convenciones, sin datos
  reales en fixtures, vocabulario del informe.
- Fuera del alcance de este cambio, sin juzgar: el diff trae además
  `docs/roadmap.md:452` (cabo 5 cerrado), que el informe del implementer no menciona.

## Review 2 — 2026-11-06

**Veredicto:** APPROVED

Los dos puntos de la Review 1 están resueltos (`store.ts:382-392`: `addsSomething` y
comentario nuevo).

### Comprobado sin hallazgos

- **Mi escenario, repetido** con un test temporal (borrado; `git status` sin rastro):
  `fakeMonth([DEPOSIT_MATURITY, EXPENSE])`, casilla puesta, marcar el vencimiento 52.
  La lista se apunta también en el momento en que sale la recarga posterior:
  - recarga bien: `{"before":[52,10],"duringReload":[52,10],"after":[52,10],"maturityMarked":true,"hidden":0}`
  - recarga fallando: `{"before":[52,10],"duringReload":[52,10],"after":[52,10],"maturityMarked":true,"hidden":0}`
  El vencimiento ya no desaparece, ni un momento ni con la recarga fallando.
- **El test nuevo atrapa el fallo.** Copia de `store.ts` (sha1 `66ef9b89…`) y del `git
  diff`; `!addsSomething` cambiado por `true`; `pnpm exec vitest run
  src/features/statement/__tests__/store.spec.ts -t "maturity that adds its interest"`
  → `FAIL … keeps it on the list (the reload after it fails)`, `Tests 1 failed | 2
  passed | 90 skipped (93)`. Restaurado desde la copia: mismo sha1, `git diff`
  idéntico, mismo comando → `Tests 3 passed | 90 skipped (93)`. El caso con la recarga
  bien no atrapa el fallo por sí solo (la recarga repinta la página 1); el caso con la
  recarga fallando sí, y basta.
- **`./init.sh`** → `EXIT=0`: `Test Files 133 passed (133)`, `Tests 2161 passed | 1
  expected fail (2162)`, `pnpm type-check` OK, `E2E smoke verde (chromium)`, `Entorno
  listo`.
- **E2E afectados** (`statement-noise-toggle`, `statement`,
  `statement-exclude-from-totals`, `doubtful-own-money`) → `23 passed (9.7s)`.
- Lo comprobado en la Review 1 (vuelta a los parámetros viejos, conteo contra el
  contrato, `overview/` sin tocar, documentos) sigue igual: el único archivo nuevo en el
  diff es `src/features/statement/store.ts`.

Sin resumen de cierre en `progress/summaries/`: el cambio está fuera de
`feature_list.json` y no tiene feature a la que colgarlo.
