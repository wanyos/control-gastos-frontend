# Resumen — feature 40 `investments-gains`

Fecha de cierre: 2026-11-04
Intención original: `feature_list.json` → feature `investments-gains`, bloque `intent`
Spec: `specs/40-investments-gains/` (hoja aprobada sin cambios el 2026-11-04)

## Qué hace ahora la app que antes no

`Investments` enseña lo que gana o pierde cada inversión desde que se abrió (fondos, ETF, carteras
y depósitos) y, arriba, la cifra grande con el total de las vivas en € y en %. Las filas van de la
que más gana a la que más pierde, cada una con su barra. Las cerradas salen aparte, en gris y sin
sumar. Antes la pantalla solo tenía la tarjeta `Deposits`, que ya no existe: cada depósito es
ahora una fila más.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| Ruta `/investments`: monta la pantalla | [router/index.ts:106](../../src/router/index.ts#L106) |
| Al abrir la pantalla, pide lo ganado | [InvestmentsView.vue:95](../../src/features/investments/views/InvestmentsView.vue#L95) |
| Pide `GET /api/investments/gains` y guarda los datos, la carga y el error | [investments/store.ts:18](../../src/features/investments/store.ts#L18) |
| Lee y comprueba la respuesta | [service.ts:145](../../src/features/investments/service.ts#L145) |
| Tras una importación, lo vuelve a pedir si ya estaba leído | [import/store.ts:107](../../src/features/import/store.ts#L107) |

## Dónde está el código

### Pantalla y componentes (`src/features/investments/`)

| Qué hace | Dónde |
| --- | --- |
| La pantalla: cargando, error con `Try again`, vacío, la cifra grande, `Your investments` y `Closed` | [InvestmentsView.vue](../../src/features/investments/views/InvestmentsView.vue) → `InvestmentsView` |
| La cifra grande: total en € y %, `on … put in`, `Not included: …` | [GainsSummary.vue](../../src/features/investments/components/GainsSummary.vue) → `GainsSummary` |
| Una fila, viva (en color y con barra) o cerrada (en gris) | [GainRow.vue](../../src/features/investments/components/GainRow.vue) → `GainRow` |
| La barra a los dos lados de una línea central | [GainBar.vue](../../src/features/investments/components/GainBar.vue) → `GainBar` |

### Lógica sin efectos, solo calcula y escribe textos (`gains.ts`)

| Qué hace | Dónde |
| --- | --- |
| Orden de las vivas en euros, las que no tienen cifra al final | [gains.ts](../../src/features/investments/gains.ts) → `sortLive` |
| Lado y largo de la barra, a escala de la mayor ganancia o pérdida | [gains.ts](../../src/features/investments/gains.ts) → `barOf` |
| Color según el signo | [gains.ts](../../src/features/investments/gains.ts) → `toneOf` |
| Textos de cada fila: `Started`, `Put in`, `Worth … today / on …`, `Closed` | [gains.ts](../../src/features/investments/gains.ts) → `liveFacts`, `closedFacts` |
| Depósito vivo (`Counted day by day: …`) y depósito cancelado | [gains.ts](../../src/features/investments/gains.ts) → `depositLine`, `cancelledLine` |
| Motivo de una cifra que falta y la línea de los que no suman | [gains.ts](../../src/features/investments/gains.ts) → `reasonText`, `reasonLine`, `excludedLine` |
| Nombre de cada tipo, signo y `—` | [gains.ts](../../src/features/investments/gains.ts) → `typeLabel`, `signedPercent`, `signedMoneyOrDash`, `signedPercentOrDash`, `moneyOrDash`, `dateOrDash`, `MISSING` |

### Datos

| Qué hace | Dónde |
| --- | --- |
| Estado de lo ganado y recarga tras importar | [store.ts](../../src/features/investments/store.ts) → `useInvestmentsStore`, `loadGains`, `refreshGainsIfLoaded` |
| Lectura y comprobación: tipos permitidos, motivos, importes, %, `closedOn`, `conditions` y total igual a la suma de las vivas | [service.ts](../../src/features/investments/service.ts) → `GAINS_PATH`, `parseInvestmentGains`, `getInvestmentGains` |
| Tipos propios del contrato | [types.ts](../../src/features/investments/types.ts) → `InvestmentType`, `GainsReason`, `GainsProduct`, `ClosedGainsProduct`, `GainsTotal`, `InvestmentGains` |
| Formato de un % tal como llega y de un importe con signo | [money.ts](../../src/shared/money.ts) → `formatPercentText`, `formatSignedMoney` |
| La recarga tras importar llama a la de esta pantalla | [import/store.ts](../../src/features/import/store.ts) → `refreshGainsIfLoaded` |

### Lo que se borró

`src/features/investments/deposits.ts`, `components/DepositEarnings.vue`, `components/DepositRow.vue`
y sus tests (`deposits.spec.ts`, `DepositEarnings.spec.ts`): la tarjeta `Deposits` de las features 38 y 39.

### Tests

| Qué cubre | Dónde |
| --- | --- |
| La pantalla entera, entrando por la ruta | [InvestmentsView.spec.ts](../../src/features/investments/__tests__/InvestmentsView.spec.ts) |
| La cifra grande: verde, rojo, cero y la línea `Not included` | [GainsSummary.spec.ts](../../src/features/investments/__tests__/GainsSummary.spec.ts) |
| Una fila: barra, colores, depósito vivo, hueco, fecha del dato, cerrada | [GainRow.spec.ts](../../src/features/investments/__tests__/GainRow.spec.ts) |
| Orden, barra y textos | [gains.spec.ts](../../src/features/investments/__tests__/gains.spec.ts) |
| La respuesta: el ejemplo del contrato y cada caso que se rechaza | [service.spec.ts](../../src/features/investments/__tests__/service.spec.ts) |
| Carga, error y recarga | [store.spec.ts](../../src/features/investments/__tests__/store.spec.ts) |
| Recarga tras importar | [import/store.spec.ts](../../src/features/import/__tests__/store.spec.ts) → `asks the gains again after an import when they were loaded`, `does not ask the gains after an import when they were never loaded` |
| Formato de % e importe con signo | [money.spec.ts](../../src/shared/__tests__/money.spec.ts) → `formatPercentText (feature 40)`, `formatSignedMoney (feature 40)` |
| En el navegador, entrando por el menú | [e2e/investments.spec.ts](../../e2e/investments.spec.ts) → `opens investments and sees the gain of each product and the total` |
| Datos de prueba inventados | [fixtures.ts](../../src/features/investments/__tests__/fixtures.ts) → `investmentGains`, `emptyInvestmentGains`, `onlyClosedGains` |
| El menú monta la pantalla | [AppShell.spec.ts](../../src/shared/components/__tests__/AppShell.spec.ts) → `renders the routed view inside the shell` |

## Cumplimiento de la intención

Resultados reales de `./init.sh --checks 40` (2026-11-04): 18 de 18 en verde.

- ✅ "Arriba, una cifra grande … en verde si gano y en rojo si pierdo" → se cumple;
  `shows the total of the live investments in euros and percent, green when it gains` y
  `paints the total red when it loses`. Check: ✅ ✅.
- ✅ "Veo cada producto con su fecha de inicio, lo invertido, lo que vale ahora y lo que gana o
  pierde" → `shows one row per live investment with its start date, put in, worth and gain`.
  Check: ✅.
- ✅ "Ordenados de lo que más gana a lo que más pierde, con una barra horizontal" →
  `sorts live products by gain in euros, with the ones without a figure at the end`,
  `orders the live investments from the one that gains most to the one that loses most`,
  `draws a green bar to the right for a gain and a red one to the left for a loss`. Check: ✅ ✅ ✅.
- ✅ "Los cerrados aparte, con otro tono, sin sumar" →
  `shows the closed investments apart, in grey, with their gain and close date, outside the total`.
  Check: ✅.
- ✅ "Ninguna cuenta, ni la remunerada" → `rejects a product whose type is not an investment`.
  Check: ✅.
- ✅ "Los depósitos siguen viéndose con lo que ganó cada uno" →
  `shows the deposits inside the lists and no Deposits card`,
  `shows a live deposit counting its expected gain day by day`. Check: ✅ ✅.
- ✅ "Hueco y motivo, nunca cero; dice que no entra en el total" →
  `shows a gap and its reason for a figure that cannot be obtained, never a zero`,
  `lists the live investments left out of the total with their reason`. Check: ✅ ✅.
- ✅ "Textos en inglés, en oscuro, y type-check, lint, test:unit, build e ./init.sh en verde" →
  check 13 ✅. Revisado a mano: todos los textos en inglés, colores con alias del tema oscuro.
- ✅ (añadido) Solo lee, pide una vez y no enseña un total que no cuadra →
  `asks the gains once on mount, only with GET`,
  `rejects a response whose total gain is not the sum of the live gains`. Check: ✅ ✅.
- ✅ (añadido) Fallo con `Try again` → `says the investments could not be loaded and offers Try again`. Check: ✅.
- ✅ (añadido) Recarga tras importar → `asks the gains again after an import when they were loaded`. Check: ✅.
- ✅ (añadido) Prueba en el navegador por el menú → `opens investments and sees the gain of each product and the total`. Check: ✅.

## Decisiones que se tomaron por ti

- (delegado) Los depósitos van en las mismas listas y la tarjeta `Deposits` desaparece. Se
  pierden el enlace `See in Movements` y, en los depósitos dudosos, el número de cobros posibles
  o lo que devolvieron. Queda el motivo.
- (delegado) Orden y barra en euros, no en %.
- (delegado) Un depósito vivo enseña lo ganado hasta hoy y la línea `Counted day by day: …`.
- (delegado) Los cerrados van en gris, sin barra y sin `Put in`/`Worth`.
- (añadido) `Worth … on <fecha>` cuando la valoración no es de hoy.
- (añadido) La línea `on … put in`, y el color normal para una ganancia de 0.
- (añadido) `Cancelled before it matured` en un depósito cancelado.
- (añadido) Si el total no es la suma de las filas, la pantalla dice que no se pudo leer.
- (añadido) Recarga tras importar, error con `Try again`, y los estados de carga y de vacío.

## Qué NO se tocó / quedó fuera

- `Net Worth`, el router, `src/assets/` y el backend.
- El efectivo sin invertir de un fondo (`uninvestedCash`): se lee y se comprueba, pero no se enseña.
- No hay prueba con tus datos reales: el backend no estaba en marcha. Es tu parte de la hoja
  (abrir `Investments` con tus datos y comparar con MyInvestor).

## Notas para el futuro

- Los `checks` de las features 38 y 39 están en rojo porque comprueban la tarjeta borrada: hay
  que vaciarlos al cerrar.
- `e2e/category-rules.spec.ts:779` falla de vez en cuando por el color de fondo de un botón. Ya
  pasaba antes de esta feature: 3 de 15 en HEAD y 4 de 15 ahora. Puede poner en rojo `./init.sh`
  sin que tenga que ver con la feature que se esté cerrando.
