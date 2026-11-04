# investments-gains — implementación

## Lote A — implementación

> **Bloqueo: un test fuera de los archivos del lote se ha puesto en rojo.**
> `src/shared/components/__tests__/AppShell.spec.ts`, test
> `renders the routed view inside the shell` (línea 63), busca
> `[data-test="deposits-loading"]` dentro de `investments-view`. Ese `data-test` era de la
> tarjeta `Deposits`, que esta feature borra; el estado de carga de la pantalla es ahora
> `gains-loading` (`design.md §6`). El archivo no está en la cabecera `Archivos:` del lote A,
> así que no lo he tocado. El arreglo es de dos líneas: en la línea 63 cambiar
> `deposits-loading` por `gains-loading`, y en el comentario de las líneas 57-58 decir que
> desde la feature 40 la pantalla pide lo ganado en vez de la tarjeta `Deposits`.
> Por este test, `pnpm test:unit`, `./init.sh` y el check 13 de la feature 40 están en rojo
> (detalle abajo). Todo lo demás está verde. T13 queda sin marcar.
>
> **Líneas de documentos que ahora son falsas y están fuera del lote** (no las he tocado):
> - `docs/roadmap.md:74-78`: dice en presente que `GET /api/investments/deposits` «lo usa la
>   F38 … en la tarjeta Deposits» en `Investments`. Desde la F40 ninguna pantalla lo pide.
> - `docs/roadmap.md:488`, cabo 45 (probar la tarjeta `Deposits` con datos reales): la
>   tarjeta ya no existe. La hoja de decisiones (§📌) dice que lo reescribe el leader al cerrar.

No he escrito nada en la base de datos ni en las carpetas de datos del humano.

### Archivos modificados / creados

Creados:
- `src/features/investments/gains.ts`
- `src/features/investments/components/GainsSummary.vue`
- `src/features/investments/components/GainRow.vue`
- `src/features/investments/components/GainBar.vue`
- `src/features/investments/__tests__/gains.spec.ts`
- `src/features/investments/__tests__/GainsSummary.spec.ts`
- `src/features/investments/__tests__/GainRow.spec.ts`

Reescritos:
- `src/features/investments/types.ts`, `service.ts`, `store.ts`, `views/InvestmentsView.vue`
- `src/features/investments/__tests__/fixtures.ts`, `service.spec.ts`, `store.spec.ts`,
  `InvestmentsView.spec.ts`
- `e2e/investments.spec.ts`

Modificados:
- `src/shared/money.ts` (`formatPercentText`, `formatSignedMoney`) y
  `src/shared/__tests__/money.spec.ts`
- `src/features/import/store.ts` (`refreshDepositsIfLoaded` → `refreshGainsIfLoaded`)
- `src/features/import/__tests__/fixtures.ts` (respuesta `deposits` → `gains`,
  `/api/investments/gains`) y `src/features/import/__tests__/store.spec.ts`
- `docs/architecture.md`, `docs/stack.md`, `docs/guia-de-uso.md`
- `specs/40-investments-gains/tasks.md` (T1-T12 marcadas), `progress/current.md`

Borrados:
- `src/features/investments/deposits.ts`, `components/DepositEarnings.vue`,
  `components/DepositRow.vue`, `__tests__/deposits.spec.ts`, `__tests__/DepositEarnings.spec.ts`

### Decisiones tomadas

- **Un tipo con nombre para el total** (`GainsTotal` en `types.ts`): el design lo escribe
  en línea dentro de `InvestmentGains`; con nombre lo usan `GainsSummary` como prop y el
  service. Misma forma.
- **`formatPercentText` crea su `Intl.NumberFormat` en cada llamada**, con tantos decimales
  como trae el texto (el design lo pide así). No hay caché: son pocas filas.
- **Validación de `uninvestedCash` y `conditions`**: en un fondo, ETF o cartera se exige
  `uninvestedCash` (decimal o `null`) y no se lee `conditions`; en un depósito se exige
  `conditions` y no se lee `uninvestedCash`. Es lo que dice el contrato («un fondo, ETF o
  cartera lleva también `uninvestedCash`… un depósito lleva `conditions`»).
- **`excluded[].reason`** se valida contra la misma lista cerrada de motivos (no admite
  `null`: el contrato dice que cada uno lleva su `reason`).
- **`Worth` sin fecha** cuando `valuedAt` es `null` (`Worth —`): el design dice que un
  importe o fecha `null` se pinta `—`; no añado `today` ni `on —`.
- **Colores**: el motivo de una cifra que falta va en `text-ink-muted` (el design no fija
  color; `--ink-muted` sobre `--surface-card` ya está medido). Una cifra que falta (`—`) en
  una fila viva también va en `text-ink-muted`, no en el color neutro de una cifra cero.
- **La barra no se pinta** en una fila viva sin `gain`; con `gain` cero se pinta la pista y
  la línea central sin relleno (R6: «sin relleno si es cero»).
- **Ancho del relleno**: `permille / 20` % del ancho total (= `permille / 10 / 2`, design §6).
- **Nombres de tipo** (`Fund`, `ETF`, …) repetidos en `gains.ts`, no importados de
  `net-worth/issues.ts`: `investments` no conoce `net-worth` (`docs/architecture.md`).
- **Test añadido fuera de la lista de tasks** en `InvestmentsView.spec.ts`:
  `shows an answer that breaks the contract as the error, with no figure of it` (R11 y R14
  en pantalla) y `shows the total of the live investments at the top` (R2 en pantalla).

### Trazabilidad

- R1 → `asks the gains once on mount, only with GET` (InvestmentsView.spec),
  `asks the gains path with no method, body or query` (service.spec),
  `loadGains() asks the gains once, with GET, and keeps them` (store.spec), y el E2E
  `opens investments and sees the gain of each product and the total`
- R2 → `shows the total of the live investments in euros and percent, green when it gains`,
  `paints the total red when it loses`,
  `paints a total of exactly zero in the neutral colour and a missing percent as a gap`
  (GainsSummary.spec); `shows the total of the live investments at the top`,
  `says there are no live investments when only closed ones come` (InvestmentsView.spec);
  `formats a percent string as it comes, with a comma and no invented digits` (money.spec)
- R3 → `lists the live investments left out of the total with their reason`
  (GainsSummary.spec); `lists the products left out of the total in their order, or nothing`
  (gains.spec)
- R4 → `shows one row per live investment with its start date, put in, worth and gain`
  (InvestmentsView.spec); `says when the value of a product is not from today`,
  `paints the figures of a live row green when it gains and red when it loses` (GainRow.spec)
- R5 → `sorts live products by gain in euros, with the ones without a figure at the end`,
  `compares euros, not percents, and keeps the arrival order at equal gain` (gains.spec);
  `orders the live investments from the one that gains most to the one that loses most`
  (InvestmentsView.spec)
- R6 → `draws a green bar to the right for a gain and a red one to the left for a loss`
  (GainRow.spec); `scales each bar to the biggest gain or loss of the live products`,
  `lets a loss be the biggest one and draws nothing for a zero` (gains.spec)
- R7 → `shows a live deposit counting its expected gain day by day` (GainRow.spec);
  `writes the day by day line only on a live deposit with its figures` (gains.spec)
- R8 → `shows a gap and its reason for a figure that cannot be obtained, never a zero`
  (GainRow.spec); `names the reason of each figure that cannot be obtained` (gains.spec)
- R9 → `shows the closed investments apart, in grey, with their gain and close date, outside the total`
  (InvestmentsView.spec); `shows a closed row all in grey, without a bar, and a cancelled deposit as such`
  (GainRow.spec)
- R10 → `says a closed deposit was cancelled only when it closed before its maturity date`
  (gains.spec)
- R11 → `rejects a product whose type is not an investment`,
  `rejects a response whose total gain is not the sum of the live gains` (service.spec);
  `shows an answer that breaks the contract as the error, with no figure of it`
  (InvestmentsView.spec)
- R12 → `shows the deposits inside the lists and no Deposits card` (InvestmentsView.spec);
  el E2E comprueba que no hay `deposit-earnings` ni `GET /api/investments/deposits`
- R13 → `asks the gains again after an import when they were loaded`,
  `does not ask the gains after an import when they were never loaded` (import store.spec);
  `refreshGainsIfLoaded() asks again when the gains were loaded` /
  `… asks nothing when the gains were never loaded` (investments store.spec)
- R14 → `says the investments could not be loaded and offers Try again`
  (InvestmentsView.spec); `keeps a failed gains request in gainsError and never rethrows`,
  `clears the previous error when the gains are asked again` (store.spec)
- R15 → `says it is loading the investments`, `says there are no investments yet`
  (InvestmentsView.spec)

### Documentos actualizados

Comando lanzado (fuera de `progress/`, `specs/` y `feature_list.json`):

```
git grep -n -i "investments/deposits\|DepositEarnings\|DepositRow\|deposits\.ts\|refreshDepositsIfLoaded\|loadDeposits\|tarjeta \`Deposits\`\|Deposits\` \|ganó cada depósito"
git grep -n "Deposits\b\|deposit-earnings\|Earned by your deposits"
```

Corregido:
- `docs/architecture.md`: árbol de `investments/` (componentes, vista, store, service,
  `gains.ts`, tipos) y el párrafo «Lo que ganó cada depósito vive en `investments`», que
  pasa a «Lo que gana cada inversión vive en `investments` (features #38, #39 y #40)».
- `docs/stack.md`: el párrafo de los E2E pasa de `GET /api/investments/deposits` a
  `GET /api/investments/gains`, con la historia de la #38 y #39 en pasado.
- `docs/guia-de-uso.md`: la fila de `Investments` en la tabla de pantallas y la §3 entera
  (qué probar y lo que no hace).

Quedan con la palabra, y siguen siendo verdad:
- `src/router/index.ts:46`, `src/router/__tests__/router.spec.ts:151` y
  `src/features/net-worth/__tests__/NetWorthView.spec.ts:342-350`,
  `src/features/net-worth/__tests__/store.spec.ts:103`: cuentan lo que hizo la feature 39 o
  comprueban que `Net Worth` no tiene la tarjeta ni pide los depósitos.
- `docs/stack.md:511` y `docs/architecture.md:265,584`: mencionan la tarjeta en pasado.

Falsas y fuera del lote: las del bloqueo de arriba (`AppShell.spec.ts:57-63`,
`docs/roadmap.md:74-78` y `:488`).

Comprobación de T9:

```
grep -rn "investments/deposits\|DepositEarnings\|DepositRow" src e2e
```
→ solo `src/features/net-worth/__tests__/store.spec.ts:103` (comprueba que no se pide) y las
líneas de `e2e/investments.spec.ts` que comprueban que no se pide.

### Prueba real

No se ha podido hacer. El backend no estaba en marcha:
`curl -s -m 5 -o /dev/null -w "%{http_code}" http://localhost:3000/api/investments/gains`
→ `000`, exit 7 (no se pudo conectar). La pantalla no se ha pasado con datos reales; queda
como el deber del humano de la hoja (§📌: abrir `Investments` con el backend en marcha).

### Comandos y resultados

- `pnpm type-check` → exit 0 (la primera pasada dio un error de tipos en
  `asNullablePercent` de `service.ts`; corregido).
- `pnpm lint:oxlint:check` → exit 0.
- `pnpm format:check` → exit 0 («All matched files use Prettier code style!»).
- `pnpm test:unit` → **exit 1**: `Test Files 1 failed | 131 passed (132)`,
  `Tests 1 failed | 2138 passed (2139)`. El único rojo:
  `src/shared/components/__tests__/AppShell.spec.ts > AppShell > renders the routed view inside the shell`
  (`AssertionError: expected false to be true`), el del bloqueo.
- `pnpm build-only` → exit 0.
- `pnpm exec playwright test e2e/investments.spec.ts --project=chromium` → `1 passed`.

### Último ./init.sh

`./init.sh` → **exit 1**. Verde: estructura, `feature_list.json` válido (40 features), specs
presentes, tipos, `pnpm lint:oxlint:check`, `pnpm format:check`, cabeceras `Archivos:`,
`pnpm type-check` y «E2E smoke verde (chromium)». Rojo: «Hay tests rotos», por el mismo
test de `AppShell.spec.ts` (`Test Files 1 failed | 131 passed (132)`).

### Último ./init.sh --checks (feature 40)

`./init.sh --checks 40` → **exit 1**, «Checks: 17 de 18 en verde». El único en rojo es el 13
(`pnpm type-check && pnpm lint:oxlint:check && pnpm format:check && pnpm test:unit && pnpm build-only && ./init.sh`),
por el test de `AppShell.spec.ts`. Los otros 17 (incluido el E2E con
`-g "opens investments and sees the gain of each product and the total"`) salen con exit 0.

### Checks de las features 38 y 39 (previsto en la hoja: comprueban la tarjeta borrada)

No los he tocado.

- `./init.sh --checks 38` → exit 1, «Checks: 1 de 13 en verde». En verde solo el 9
  (`does not ask for the deposits` en `net-worth/__tests__/store.spec.ts`). En rojo: los que
  buscan `DepositEarnings.spec.ts` (borrado), el de `service.spec.ts` sobre el total de los
  vencidos, el de `InvestmentsView.spec.ts` sobre la tarjeta, el de la recarga de depósitos
  en `import/__tests__/store.spec.ts`, y el 10 (pasada completa), que caería además por el
  test de `AppShell.spec.ts`.
- `./init.sh --checks 39` → exit 1, «Checks: 2 de 7 en verde». En verde el 2 y el 3
  (`Net Worth` no enseña la tarjeta ni pide los depósitos). En rojo el 1 y el 4 (tests de la
  tarjeta en `InvestmentsView.spec.ts`), el 5 (recarga de depósitos tras importar), el 6
  (E2E `opens investments and sees the deposits card`) y el 7 (pasada completa).

### Sugerencias fuera de scope (NO aplicadas)

- Arreglar `src/shared/components/__tests__/AppShell.spec.ts:57-63` (ver bloqueo).
- Vaciar los `checks` de las features 38 y 39 y reescribir `docs/roadmap.md:74-78` y el
  cabo 45, como dice la hoja.

## Lote A — ampliación autorizada por el leader (2026-11-04)

El leader autorizó ampliar el lote A con `src/shared/components/__tests__/AppShell.spec.ts`,
solo para las líneas 57-63. Lo he añadido a la cabecera `Archivos:` del lote A en
`specs/40-investments-gains/tasks.md`, con la nota de que lo autorizó el leader el
2026-11-04 porque el spec lo había dejado fuera. Con esto queda resuelto el bloqueo de arriba.

Cambio: la línea 63 busca ahora `[data-test="gains-loading"]` (antes `deposits-loading`), y
el comentario de las líneas 57-58 dice que desde la feature 40 la pantalla enseña lo que gana
cada inversión (antes, la tarjeta `Deposits` de la feature 39). No he tocado
`docs/roadmap.md` ni los checks de las features 38 y 39. T13 marcada.

### Comandos y resultados, otra vez

- `pnpm test:unit` → exit 0: `Test Files 132 passed (132)`, `Tests 2139 passed (2139)`.
- `./init.sh` (primera vez) → **exit 1**. Unitarios, tipos, lint y formato en verde; el
  rojo fue «E2E smoke rojo (chromium)»: `1 failed`, `83 passed`. El que falló es
  `e2e/category-rules.spec.ts:779` (`the result of applying looks the same on Rules and on Review and the next pass replaces it`),
  que esta feature no toca. Falló la comparación del fondo del botón `showMovements`:
  esperaba `rgb(34, 43, 52)` y salió `rgb(20, 27, 34)`. La causa no la he comprobado. En la
  pasada completa anterior (la de mi primer informe) y dentro de `./init.sh --checks 40`
  ese test pasó.
- `./init.sh --checks 40` → exit 0, «Checks: 18 de 18 en verde» (el check 13 lanza la pasada
  completa con `./init.sh`, y esa vez salió verde).
- `./init.sh` (segunda vez, sin cambiar nada) → exit 0: `Test Files 132 passed (132)`,
  `Tests 2139 passed (2139)`, «E2E smoke verde (chromium)», «Entorno listo».
