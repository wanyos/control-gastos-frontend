# deposits-to-investments — implementación

Implementer, 2026-11-03. Flujo simple (sin spec). Nada escrito en la base de datos ni en
carpetas de datos del humano: la única lectura real fue un `GET` (ver «Prueba real»). Ningún
dato real en fixtures ni en tests: los de `src/features/investments/__tests__/fixtures.ts`
son los de la F38 (inventados) y los de `e2e/investments.spec.ts` son nuevos e inventados.
No se ha hecho ningún commit.

## Archivos modificados / creados

Movidos (con `git mv`, sin cambios salvo comentarios y una ruta del router de prueba):
- `src/features/net-worth/deposits.ts` → `src/features/investments/deposits.ts` (comentario de cabecera).
- `src/features/net-worth/components/DepositEarnings.vue` → `src/features/investments/components/` (comentario).
- `src/features/net-worth/components/DepositRow.vue` → `src/features/investments/components/` (sin cambios).
- `src/features/net-worth/__tests__/DepositEarnings.spec.ts` → `src/features/investments/__tests__/`
  (el router de prueba arranca en `/investments` en vez de `/net-worth`).
- `src/features/net-worth/__tests__/deposits.spec.ts` → `src/features/investments/__tests__/` (sin cambios).

Nuevos en `src/features/investments/`:
- `types.ts` — `DepositStatus`, `DepositMaturity`, `DepositEarning`, `DepositEarnings` (copiados de
  la F38); `DateOnly` y `DecimalString` vienen de `@/shared/movements`, no de `net-worth`.
- `service.ts` — `DEPOSITS_PATH`, `parseDepositEarnings`, `getDepositEarnings` (copiados de la F38).
- `store.ts` — `useInvestmentsStore`: `deposits`, `depositsLoading`, `depositsError`,
  `loadDeposits()`, `refreshDepositsIfLoaded()`.
- `views/InvestmentsView.vue` — pide los depósitos al montarse y pinta `DepositEarnings` con el
  estado del store.
- `__tests__/fixtures.ts` (`depositEarnings`, `emptyDepositEarnings`, los de la F38),
  `__tests__/service.spec.ts` (los 10 tests de `getDepositEarnings` de la F38, mismos nombres),
  `__tests__/store.spec.ts` (6 tests), `__tests__/InvestmentsView.spec.ts` (6 tests).

`net-worth` vuelve a como estaba antes de la F38 (`git checkout 29eec8d^ --` de `service.ts`,
`store.ts`, `types.ts`, `views/NetWorthView.vue`, `__tests__/fixtures.ts`,
`__tests__/service.spec.ts`, `__tests__/store.spec.ts`, `__tests__/NetWorthView.spec.ts`), más
dos tests nuevos. Comprobado: `git diff 29eec8d^ --stat -- src/features/net-worth` →
solo `NetWorthView.spec.ts | 14 +` y `store.spec.ts | 15 +`.

Otros:
- `src/router/index.ts` — `/investments` monta `InvestmentsView`; fuera el import de
  `PlaceholderView`; comentario de las rutas.
- `src/shared/components/PlaceholderView.vue` — **borrado**: `/investments` era la última ruta
  que lo usaba (`git grep -n PlaceholderView -- src` antes de borrarlo: solo `router/index.ts` y
  `router/__tests__/router.spec.ts`).
- `src/router/__tests__/router.spec.ts` — fuera las dos aserciones `not.toBe(PlaceholderView)`
  (ya comprobaban `toBe(OverviewView)` / `toBe(StatementView)`); test nuevo
  `mounts the investments screen on /investments (feature 39)`.
- `src/shared/components/__tests__/AppShell.spec.ts` — `renders the routed view inside the shell`
  y `moves the active mark and the title when the route changes` miraban
  `[data-test="placeholder"]`; ahora miran `[data-test="investments-view"]`.
- `src/features/import/store.ts` — tras importar, `useInvestmentsStore().refreshDepositsIfLoaded(client)`.
- `src/features/import/__tests__/fixtures.ts` — `mockApi` acepta `deposits` y contesta
  `/api/investments/deposits` con ella (antes esa ruta caía en la respuesta de `netWorth`).
- `src/features/import/__tests__/store.spec.ts` — el test de la F38 pasa a
  `asks the deposits again after an import when they were loaded` (usa el store de investments);
  nuevo `does not ask the deposits after an import when only the net worth was loaded`.
- `e2e/` — los nueve specs que la F38 tocó vuelven a su versión anterior (`git checkout
  29eec8d^ --`; el único commit que los tocó después fue el de la F38): `app-boot`,
  `expenses-by-category`, `import-dialog`, `overview`, `statement-exclude-from-totals`,
  `statement-fix-category`, `statement-noise-toggle`, `statement`, `transfer-pairs-review`.
  Nuevo `e2e/investments.spec.ts`.
- `docs/guia-de-uso.md`, `docs/architecture.md`, `docs/stack.md`, `docs/roadmap.md` (ver abajo).
- `feature_list.json` — F39 `pending` → `in_progress` (nada más; `checks` sin tocar).
- `progress/current.md` — feature en curso y plan.

## Decisiones tomadas

- **«Ya estaban cargados» = `deposits !== null`.** `refreshDepositsIfLoaded` vuelve a pedir solo
  si hay depósitos leídos, igual que `import` hace con el patrimonio (`netWorth !== null`). Si la
  última lectura falló, no se vuelve a pedir tras importar; se vuelve a pedir al abrir la pantalla.
- **`InvestmentsView` no tiene título propio**: el título lo pone la barra superior
  (`Investments`), igual que en `Net Worth`. La tarjeta no cambia: mismos textos, incluida la
  frase «This figure is not part of your net worth…».
- **`InvestmentsView` pide los depósitos cada vez que se monta**, como `NetWorthView` con el
  patrimonio.
- **Se borra `PlaceholderView.vue`**: ya no la usa ninguna ruta (regla de `AGENTS.md` de quitar lo
  viejo en la misma sesión). Si el leader prefiere conservarla, basta con restaurarla; nada más
  depende de ella.
- `InvestmentsView.spec.ts` monta la pantalla a través de las rutas reales (`routes` de
  `@/router`, en `/investments`), así el test de la tarjeta prueba también que la ruta la monta.
- El e2e nuevo entra por la home, comprueba que `Net Worth` no pinta la tarjeta ni pide los
  depósitos, pulsa `Investments` en el menú y lee la tarjeta (nombres, etiquetas, columna de lo
  ganado y total). Comprueba que todas las peticiones son `GET`, que no se cortó ninguna llamada
  no prevista y que no hubo errores de consola ni de página.

## Comprobación de que los tests nuevos detectan el fallo

- Metí a mano en `net-worth/store.ts` una petición de depósitos y en `NetWorthView.vue` una
  `<section data-test="deposit-earnings" />`; `pnpm exec vitest run
  src/features/net-worth/__tests__/NetWorthView.spec.ts src/features/net-worth/__tests__/store.spec.ts
  -t "does not"` → `Tests 2 failed | 3 passed | 25 skipped (30)` (fallan
  `does not show the deposits card` y `does not ask for the deposits`). Restaurados; `git diff
  29eec8d^` de esos dos archivos, vacío.
- Quité a mano la línea `refreshDepositsIfLoaded` de `import/store.ts`; `pnpm exec vitest run
  src/features/import/__tests__/store.spec.ts -t "deposits"` → `× asks the deposits again after an
  import when they were loaded`, `Tests 1 failed | 1 passed`. Restaurada.

## Documentos actualizados

Búsqueda lanzada:

```
git grep -n -i -e "investments/deposits" -e "PlaceholderView" -e "not built yet" -e "pantalla vacía" \
  -e "Investments.*vac" -e "DepositEarnings" -e "deposit-earnings" -- . ':!progress' ':!specs' \
  ':!feature_list.json' ':!design-system'
```

y antes `git grep -n -i -e "investments/deposits" -e "deposit" -e "depósito" -e "PlaceholderView"
-e "placeholder" -- docs README.md CHECKPOINTS.md`.

Corregidas:
- `docs/guia-de-uso.md` — fila `Investments` del mapa («Nada todavía: pantalla vacía» → lo que
  ganaron tus depósitos; solo mira). Los pasos 8 a 11 de `Net Worth` y sus dos líneas de «Lo que
  no hace» pasan a la sección `3. Investments` (pasos 1 a 5 y su «Lo que no hace», con una línea
  más: solo los depósitos, los demás productos siguen en `Net Worth`). El paso que decía «solo la
  tarjeta lo dice y el resto de `Net Worth` se sigue viendo» dice ahora que la tarjeta lo dice en
  vez de quedarse en blanco. Las notas del humano no se han tocado.
- `docs/architecture.md` — entrada `investments/` en el árbol de carpetas; la línea de
  `shared/components` dice que `PlaceholderView` se quitó en la #39; el párrafo «La segunda
  petición de `net-worth` (feature #38)» se sustituye por «Lo que ganó cada depósito vive en
  `investments` (features #38 y #39)», con la dependencia `import` → `investments`.
- `docs/stack.md` — el párrafo de la #38 sobre la home y los e2e dice ahora que la petición la hace
  `Investments` y solo la responde `e2e/investments.spec.ts`. «La cumplen los **doce** specs de
  `e2e/`» → «diecisiete»: ya eran 16 antes de esta feature (`git ls-tree HEAD e2e/ | grep -c
  spec.ts` → 16) y ahora 17; `grep -L "'**/api/**'" e2e/*.spec.ts` no devuelve ninguno.
- `docs/roadmap.md` — tres líneas que decían que los depósitos están en `Net Worth`: la de
  `GET /api/investments/deposits` (línea ~74), el punto 3 del plan de la E8 (decía «en revisión»;
  ahora «F38 cerrada… la F39 la lleva a `Investments` (en curso)») y el cabo 45 (ahora dice abrir
  `Investments`). El cierre de la etapa y el resto los decide el leader.

Siguen saliendo y son verdad: `docs/roadmap.md:356` (histórico), los comentarios de
`router.spec.ts` sobre las features 19 y 25, y las líneas de `src/features/investments/`.

Fuera del proyecto, no tocado: `../docs/ideas.md` (lo señalaba ya la hoja de la F38).

## Prueba real

El backend estaba arrancado: `curl -s -m 5 -o /dev/null -w "%{http_code}"
http://localhost:3000/api/investments/deposits` → `200`. Un solo `GET`, guardado en una carpeta
temporal fuera del repo y borrado después:

- Forma: claves `asOf, deposits, total`; **5 depósitos**: 1 `active`, 3 `matured`,
  1 `maturity_not_found`. La suma de los `earned` es igual al `total`.
- Pasada por `parseDepositEarnings` (un test temporal en `src/features/investments/__tests__/`
  que leía el archivo temporal y esperaba 5 depósitos): `Test Files 1 passed (1)`. El test se
  borró en el mismo comando (`ls` posterior: no está).

No he abierto `Investments` con `pnpm dev` contra el backend real: lo que se ve en pantalla con
esos datos lo tiene que mirar el humano (cabo 45 del roadmap).

## Último ./init.sh

`./init.sh` → **exit 0**:

```
[OK]    feature_list.json válido (40 features)
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  131 passed (131)
      Tests  2121 passed (2121)
[OK]    Todos los tests pasan
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Antes, por separado: `pnpm type-check` (`$ vue-tsc --build`, sin errores), `pnpm
lint:oxlint:check` (`$ oxlint .`, sin avisos), `pnpm format:check` (`All matched files use
Prettier code style!`).

## Último ./init.sh --checks

`./init.sh --checks 39` → **exit 0, `Checks: 7 de 7 en verde.`**

```
[1] … InvestmentsView.spec.ts -t "shows the deposits card on the investments page"        [OK] exit 0
[2] … NetWorthView.spec.ts -t "does not show the deposits card"                            [OK] exit 0
[3] … net-worth store.spec.ts -t "does not ask for the deposits"                           [OK] exit 0
[4] … InvestmentsView.spec.ts -t "says the deposits could not be read instead of staying blank" [OK] exit 0
[5] … import store.spec.ts -t "asks the deposits again after an import when they were loaded"   [OK] exit 0
[6] … ! grep -lF "api/investments/deposits" e2e/app-boot… overview… statement… && pnpm exec playwright test e2e/investments.spec.ts
                                                                                            [OK] exit 0 — 3 passed (chromium, firefox, webkit)
[7] pnpm type-check && … && pnpm build-only && ./init.sh                                   [OK] exit 0 — Entorno listo.
```

### Los checks de la F38 dejan de pasar (consecuencia del traslado; no los he tocado)

`./init.sh --checks 38` → **exit 1, `Checks: 0 de 13 en verde.`**
- Los checks 1–8 y 12 apuntan a `src/features/net-worth/__tests__/DepositEarnings.spec.ts` o a
  tests de `net-worth/__tests__/service.spec.ts` / `NetWorthView.spec.ts` que esta feature mueve
  o quita (el `grep` sale con 2, archivo no encontrado, o con 1, nombre no encontrado). Los tests
  movidos existen con el mismo nombre en `src/features/investments/__tests__/`, salvo
  `keeps every net worth figure as the backend sends it when deposits earned something` y
  `keeps the rest of the screen when the deposits request fails`, que ya no tienen sentido en
  `Net Worth` y no se han trasladado.
- El 13 busca `asks the deposits again after an import when the net worth was loaded`, que pasa a
  llamarse como pide el check 5 de la F39.
- El 10 (el mismo comando que el check 7 de la F39) salió en rojo en esa pasada por **un e2e que
  no tiene que ver con depósitos**: `e2e/category-rules.spec.ts:779` («the result of applying
  looks the same on Rules and on Review…»), un color de fondo `rgb(21, 28, 35)` esperado frente a
  `rgb(20, 27, 34)` recibido en el botón de mostrar movimientos. Relanzado solo, tres veces
  seguidas: `10 passed` las tres. En `./init.sh` y en el check 7 de la F39 el e2e salió verde.
  **No he comprobado la causa** (parece que depende del momento en que se mide el color).

Es el caso de la lección 3 de `docs/lessons.md`: unos checks cerrados que dejan de pasar porque
otra feature cambia los archivos. Qué hacer con los `checks` de la F38 lo decide el leader / el
humano.

## Sugerencias fuera de scope (NO aplicadas)

- Los `checks` de la F38 podrían apuntar a las nuevas rutas de `src/features/investments/__tests__/`
  (o retirarse los que ya no aplican). No los he tocado: el campo `checks` no se edita.
- `e2e/category-rules.spec.ts:779` falló en una de las pasadas (un color de fondo con un punto
  de diferencia) y pasó en las otras cinco que lo incluían; podría apuntarse como cabo suelto si
  vuelve a pasar.
