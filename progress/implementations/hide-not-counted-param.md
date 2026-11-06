# hide-not-counted-param — implementación

Parte del frontend del cabo 37 (b) de `docs/roadmap.md`. Cambio fuera de
`feature_list.json` (sin spec ni `checks`). Fuente de verdad:
`../gastos-backend/docs/api-contract.md`, fila `hideNotCounted` de la tabla de
parámetros de `GET /api/movements` y sección «Esconder lo que no cuenta» (feature 68
del backend).

No se ha escrito nada en la base de datos ni en carpetas de datos del humano. Ningún
test usa el backend real.

## Archivos modificados / creados

Código:
- `src/shared/movements.ts`: `MovementQuery` gana `hideNotCounted?: true`;
  `buildMovementsQuery` lo escribe como `hideNotCounted=true` (detrás de `ownership`,
  delante de `page`). `excluded` y `transfer` siguen existiendo: los usa
  `src/features/overview/service.ts`, que no se ha tocado.
- `src/features/statement/filters.ts`: `monthQuery` con la casilla puesta pone
  `query.hideNotCounted = true` en lugar de `excluded = 'none'` y `transfer = 'none'`.
  `hiddenCountQuery` no cambia (llama a `monthQuery(..., false)` con `pageSize: 1`).

Tests:
- `src/shared/__tests__/movements.spec.ts`: el bloque de la casilla pasa a
  `hideNotCounted`: sin casilla no va ninguna de las tres claves; con casilla va
  `hideNotCounted=true` y ni `excluded` ni `transfer`; junto a los demás filtros; un
  `@ts-expect-error` para `hideNotCounted: false`; se conserva un test de
  `excluded=none&transfer=none` porque la pantalla de resumen los sigue mandando.
- `src/features/statement/__tests__/filters.spec.ts`: `monthQuery` con casilla da
  `hideNotCounted: true`; test nuevo `no longer sends excluded=none nor transfer=none
  with the switch on (roadmap 37 b)`, que además fija la URL completa con
  `buildMovementsQuery`; el conteo no lleva `hideNotCounted`.
- `src/features/statement/__tests__/fixtures.ts`: el backend falso de `fakeMonth`
  responde a `hideNotCounted=true` con la regla del contrato (fuera lo marcado o
  emparejado salvo un movimiento de depósito con `countedAmount` distinto de `"0.00"`)
  y **no** esconde nada con `excluded=none&transfer=none`.
- `src/features/statement/__tests__/store.spec.ts` y `StatementView.spec.ts`: las URLs
  fijadas pasan a `hideNotCounted=true`; los mocks que elegían la página escondida por
  `excluded === 'none'` la eligen por `hideNotCounted === 'true'`; en `StatementView`
  se comprueba que ninguna lectura lleva `excluded=` ni `transfer=`. Test nuevo en el
  store: `on, keeps a marked and paired maturity that adds its interest, and counts the
  rest` (vencimiento marcado y emparejado que suma interés → sigue en la lista;
  vencimiento dudoso marcado → lo esconde el backend; apertura sin marcar → la quita el
  navegador; `hiddenCount` = 2).
- `e2e/statement-noise-toggle.spec.ts`: el mock de `**/api/movements*` esconde con
  `hideNotCounted=true`; las aserciones de URL esperan `hideNotCounted=true` y que no
  aparezcan `excluded=` ni `transfer=`; el conteo no lleva `hideNotCounted`.

Documentos: `docs/architecture.md` (ver abajo). `progress/current.md`: una línea con
el cambio en curso.

## Decisiones tomadas

- `hideNotCounted` se tipa como `true` (no `boolean`), igual que `uncategorized`: el
  contrato dice que `false` es lo mismo que no mandarlo, así que no hay nada que
  escribir con `false`.
- **El conteo `Hiding N` sigue cuadrando, comprobado contra el contrato:** la petición
  de conteo es el mismo mes y filtros sin el parámetro (`pageSize=1`), y el número es
  `total sin parámetro − total con parámetro` + lo que el navegador quita de lo ya
  cargado. El contrato dice que `pagination` se calcula sobre lo que deja el filtro,
  así que la resta es exactamente lo que esconde el backend. Lo que quita el navegador
  (`hiddenWhenHiding`: aperturas y cancelaciones resueltas; `isBetweenOwnAccounts`:
  dinero entre tus cuentas que no es de depósito) solo se aplica a filas que el backend
  **sí** devolvió, así que no se cuenta dos veces. Ninguno de los dos quita un
  vencimiento, así que un vencimiento que suma y que el backend ahora deja pasar se
  queda en pantalla. Lo demuestra el test nuevo del store.
- Los `totals` no cambian de lectura: el contrato dice que con `hideNotCounted=true`
  son los mismos que sin él.
- A la vista no cambia nada (ni textos ni componentes).

## Documentos actualizados

`git grep -n -E "excluded=none|transfer=none|excluded: *'none'|transfer: *'none'|hideNotCounted|hiddenCount" -- ':!progress' ':!specs'`
y después `git grep -n -i "excluded=none|transfer=none|two scopes|both scopes" -- ':!progress' ':!specs' ':!src/features/overview'`:

- `docs/architecture.md:161-163` (árbol de `filters.ts`): ahora dice
  `hideNotCounted=true` en la API desde el 2026-11-06, antes `excluded=none` y
  `transfer=none`.
- `docs/architecture.md:478-483` (párrafo «El interruptor del ruido no escribe»): ahora
  dice que hasta el 2026-11-06 eran los dos parámetros y desde entonces
  `hideNotCounted=true`, y por qué.
- `docs/guia-de-uso.md` y `docs/related-projects.md`: no nombran los parámetros de la
  casilla (`grep -n -i "excluded|transfer|feature 49|feature 68"`); lo que describen
  a la vista no cambia. Sin tocar.

Líneas que siguen diciendo lo viejo y **no he tocado** (para el leader):
- `docs/roadmap.md:312`: el apunte de cierre de la F23 (2026-09-30) cuenta que la
  casilla pide `excluded=none&transfer=none`. Es una entrada fechada; el roadmap lo
  lleva el leader.
- `docs/roadmap.md:457`: el propio cabo 37 (b), que el leader marca.
- `feature_list.json:993`: `acceptance` de una feature cerrada («El extracto puede
  pedir la lista con excluded=none y/o transfer=none…»). Es histórico de esa feature.
- `src/features/overview/service.ts` y su test: fuera del alcance por encargo.

## Prueba real

No aplica: el cambio no lee datos nuevos de fuera; solo cambia un parámetro de la
petición. No se ha probado contra el backend real (el encargo lo excluye).

## Comprobación de que los tests atrapan la vuelta atrás

Se puso temporalmente `filters.ts` como estaba (`excluded = 'none'`,
`transfer = 'none'`), se lanzó `pnpm exec vitest run src/features/statement` y se
restauró:

```
Tests  16 failed | 407 passed (423)
```

Fallan, entre otros, `filters.spec.ts › no longer sends excluded=none nor
transfer=none with the switch on (roadmap 37 b)`, `store.spec.ts › on, keeps a marked
and paired maturity that adds its interest, and counts the rest` y
`StatementView.spec.ts › turning it on writes hide=true and keeps every other key of
the URL (R4)`.

## Último ./init.sh

`./init.sh` → `EXIT=0`. Una primera pasada salió con `EXIT=1` por
`pnpm format:check` en `fixtures.ts`; se pasó `prettier --write` y se relanzó:

```
[OK]    feature_list.json válido (40 features)
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  133 passed (133)
      Tests  2159 passed | 1 expected fail (2160)
[OK]    Todos los tests pasan
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

E2E afectados:
`pnpm test:e2e --project=chromium e2e/statement-noise-toggle.spec.ts e2e/statement.spec.ts e2e/statement-exclude-from-totals.spec.ts e2e/doubtful-own-money.spec.ts`
→ `23 passed (9.6s)`. Ningún otro spec de `e2e/` elige respuesta según `excluded` o
`transfer` (buscado con `git grep`).

## Último ./init.sh --checks

No aplica: cambio fuera de `feature_list.json`, sin `checks`.

## Sugerencias fuera de scope (NO aplicadas)

- `src/features/overview/service.ts` sigue mandando `excluded=none&transfer=none`; si
  esa pantalla quisiera la misma regla para los vencimientos, sería otro cambio.

## Corrección tras la revisión (progress/reviews/hide-not-counted-param.md)

### Archivos modificados
- `src/features/statement/store.ts`, `adoptUpdated`: con la casilla puesta, una fila
  que queda marcada o emparejada solo sale de la lista si **no** es un movimiento de
  depósito que suma algo (`deposit` no nulo y `countedAmount` distinto de `"0.00"`), la
  misma regla del contrato y del backend falso de `fixtures.ts`. La comprobación se ha
  escrito dentro de `store.ts` (`addsSomething`) para no tocar otros archivos. El
  `deposit` de la fila viene de la última lectura (`withKnownDeposit`), porque la
  respuesta del PATCH no lo trae.
- Mismo archivo, comentario encima de `gone`: ya no dice que la casilla quita «exactly
  what the switch promises to hide»; dice que quita lo marcado o emparejado que no es un
  movimiento de depósito que suma algo, con la referencia a `hideNotCounted=true` y al
  cabo 37 (b).
- `src/features/statement/__tests__/store.spec.ts`: test nuevo con dos casos,
  `on, marking a maturity that adds its interest keeps it on the list (the reload after
  it works)` y `(… the reload after it fails)`: `fakeMonth([DEPOSIT_MATURITY, EXPENSE])`,
  casilla puesta en octubre de 2026, seleccionar el vencimiento, `setExcluded(true)`; el
  vencimiento sigue en `shownMovements`, ya marcado. En el segundo caso, toda lectura de
  `GET /api/movements` posterior al PATCH responde `networkDown`.

### Comprobación de que el test atrapa el fallo
Se quitó temporalmente la excepción (`!addsSomething` → `true`) y se lanzó
`pnpm exec vitest run src/features/statement/__tests__/store.spec.ts -t "maturity that adds its interest"`:

```
FAIL  … on, marking a maturity that adds its interest keeps it on the list (the reload after it fails)
Tests  1 failed | 2 passed | 90 skipped (93)
```

El caso con recarga correcta pasa también sin el arreglo, porque la recarga repinta la
página 1 (lo que ya decía el reviewer). Se restauró el archivo y el mismo comando dio
`Tests  3 passed | 90 skipped (93)`.

### Último ./init.sh (tras la corrección)
`./init.sh` → `EXIT=0`:

```
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  133 passed (133)
      Tests  2161 passed | 1 expected fail (2162)
[OK]    Todos los tests pasan
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```
