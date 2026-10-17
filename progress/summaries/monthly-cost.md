# Resumen — feature 32 `monthly-cost`

Fecha de cierre: 2026-10-17
Intención original: `feature_list.json` → feature `monthly-cost`, bloque `intent`
Spec: `specs/32-monthly-cost/`

## Qué hace ahora la app que antes no

Hay una entrada nueva en el menú, `Monthly cost`, justo debajo de `Overview`. Te dice cuánto
te cuesta un mes de media, calculado con los 12 meses completos anteriores al actual (hoy:
de octubre de 2025 a septiembre de 2026; con tus datos, 2.875,79 €).

Qué verás en la pantalla:

- **Arriba**, la cifra, el periodo del que sale y una línea con cuántos recibos han subido
  (hoy, 8 de 15).
- **`Bills`**: los recibos de más caro a más barato al mes. De cada uno ves el nombre,
  cada cuánto se cobra, lo que se suele cobrar cada vez, el último cargo, si ha subido y
  lo que cuesta al mes. Las subidas llevan una etiqueta roja `Up …` y debajo lo que se
  cobraba antes. Los recibos que no se han cobrado en el periodo van al final, en una
  línea plegada.
- **`Sent to people`**: las transferencias y los Bizum a personas, sumados en una sola
  fila.
- **`Variable spending`**: el resto del gasto, una fila por categoría.
- Cada bloque lleva su subtotal a la derecha. Los tres suman exactamente la cifra de
  arriba.
- `Show charges` abre debajo de cada fila sus cargos, con fecha, importe y concepto.
  Funciona en los recibos, en el grupo de personas y en cada categoría.
- Si el backend falla, la pantalla te lo dice y tienes `Try again`.

Qué **no** hace:

- No escribe nada.
- No se recarga sola si importas estando en ella: sal y vuelve a entrar.
- No dice de qué cuenta es cada cargo.
- No tiene presupuestos ni avisos.
- No deja marcar a mano qué es recurrente.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| La ruta `/monthly-cost` y su entrada del menú | [index.ts:83](../../src/router/index.ts#L83) |
| La pantalla pide los datos al entrar | [MonthlyCostView.vue:139](../../src/features/monthly-cost/views/MonthlyCostView.vue#L139) |
| La lectura de `GET /api/recurring-expenses` | [service.ts:127](../../src/features/monthly-cost/service.ts#L127) |
| La validación, que también comprueba que la suma cuadre | [service.ts:103](../../src/features/monthly-cost/service.ts#L103) |
| La carga (también la usa `Try again`) | [store.ts:24](../../src/features/monthly-cost/store.ts#L24) |

## Dónde está el código

### Datos

| Qué hace | Dónde |
| --- | --- |
| Tipos de la respuesta | [types.ts](../../src/features/monthly-cost/types.ts) → `Bill`, `Charge`, `ChargeGroup`, `VariableEntry`, `MonthlyCost` |
| Valida y comprueba que la suma cuadre | [service.ts](../../src/features/monthly-cost/service.ts) → `parseRecurringExpenses` |
| Hace la petición | [service.ts](../../src/features/monthly-cost/service.ts) → `getRecurringExpenses` |
| Guarda los datos, el estado de carga y el error | [store.ts](../../src/features/monthly-cost/store.ts) → `useMonthlyCostStore` |

### Textos y cuentas

| Qué hace | Dónde |
| --- | --- |
| Todos los textos de la pantalla | [texts.ts](../../src/features/monthly-cost/texts.ts) → constantes, `periodLine`, `increasedLine`, `noChargesSummary`, `chargesHeading`, `monthlyCostErrorMessage` |
| Nombre de cada periodicidad y el «each time» / «a month» | [texts.ts](../../src/features/monthly-cost/texts.ts) → `periodicityLabel`, `usualSuffix` |
| Subida, bajada, igual o sin cargo anterior | [texts.ts](../../src/features/monthly-cost/texts.ts) → `changeView` |
| Separa los recibos con y sin cargos en el periodo | [texts.ts](../../src/features/monthly-cost/texts.ts) → `splitBills` |
| Subtotales de los bloques, en céntimos | [texts.ts](../../src/features/monthly-cost/texts.ts) → `blockSubtotals`, `isEmpty` |

### Pantalla

| Qué hace | Dónde |
| --- | --- |
| La pantalla entera y qué filas están abiertas | [MonthlyCostView.vue](../../src/features/monthly-cost/views/MonthlyCostView.vue) |
| Una fila de recibo | [BillRow.vue](../../src/features/monthly-cost/components/BillRow.vue) |
| La lista de recibos y el desplegable de los que no tienen cargos | [BillList.vue](../../src/features/monthly-cost/components/BillList.vue) |
| Fila del grupo de personas y de cada categoría | [GroupRow.vue](../../src/features/monthly-cost/components/GroupRow.vue) |
| Lista de cargos | [ChargeList.vue](../../src/features/monthly-cost/components/ChargeList.vue) |
| Título y subtotal de cada bloque | [BlockHeading.vue](../../src/features/monthly-cost/components/BlockHeading.vue) |
| Entrada del menú | [index.ts](../../src/router/index.ts) → `routes` (`monthly-cost`) |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| Datos inventados con la forma del contrato | [fixtures.ts](../../src/features/monthly-cost/__tests__/fixtures.ts) |
| Lectura, una sola petición `GET`, suma que no cuadra | [service.spec.ts](../../src/features/monthly-cost/__tests__/service.spec.ts) |
| Textos, subtotales, cambios | [texts.spec.ts](../../src/features/monthly-cost/__tests__/texts.spec.ts) |
| Carga, error y que solo cuente la última respuesta | [store.spec.ts](../../src/features/monthly-cost/__tests__/store.spec.ts) |
| Fila de recibo | [BillRow.spec.ts](../../src/features/monthly-cost/__tests__/BillRow.spec.ts) |
| La pantalla entera | [MonthlyCostView.spec.ts](../../src/features/monthly-cost/__tests__/MonthlyCostView.spec.ts) |
| Menú | [router.spec.ts](../../src/router/__tests__/router.spec.ts) → `lists Monthly cost in the menu right below Overview` |
| En un navegador | [monthly-cost.spec.ts](../../e2e/monthly-cost.spec.ts) |

## Cumplimiento de la intención

- ✅ «Veo arriba lo que me cuesta un mes, y el periodo del que sale» → `shows the monthly total and the period it comes from at the top`. Check ✅
- ✅ «Veo cada recibo con su nombre, lo que cuesta al mes, cada cuánto se cobra, cuándo fue el último cargo, y si ha subido, cuánto» → `shows a bill with its name, monthly cost, periodicity, last charge and increase`. Check ✅
- ✅ «Distingo de un vistazo los recibos que han subido» → `marks a bill that went up apart from one that went down or stayed the same`. Check ✅. Si se ve de un vistazo lo decides tú.
- ✅ «Un recibo anual se lee como anual» → `shows an annual bill as yearly with its usual amount each time`. Check ✅
- ✅ «Puedo abrir un recibo y ver sus cargos, con su fecha y su importe» → `opens a bill and lists its charges with date and amount`. Check ✅
- ✅ «Veo lo que envío a personas como un grupo aparte» → `shows what is sent to people as a group apart with its monthly cost`. Check ✅
- ✅ «Veo el gasto variable por categoría» → `shows the variable spending by category with the monthly cost of each`. Check ✅
- ✅ «La suma de lo que veo da la cifra de arriba» → `shows block subtotals that add up to the figure at the top` y `rejects a response whose monthly costs do not add up to the monthly total`. Checks ✅ ✅. Con tus datos: 1.017,57 + 1.332,04 + 526,18 = 2.875,79 €.
- ✅ «Si el backend falla, me lo dice y puedo volver a intentarlo» → `says the backend failed and asks again on Try again`. Check ✅
- ✅ Tus respuestas (la entrada del menú, el orden de más caro a más barato y los recibos sin cargos al final y plegados) y «no escribe» → un check cada una, los cuatro ✅

`./init.sh --checks 32`: 14 de 14 en verde.

## Decisiones que se tomaron por ti

- (delegado) Bloques con subtotal y recibos en filas con columnas.
- (delegado) El nombre de cada recibo lleva la primera letra en mayúscula y, debajo, el
  concepto del banco.
- (delegado) Los cargos se despliegan debajo de la fila, y puede haber varios abiertos.
- (añadido, lo aprobaste) La columna de lo que se cobra cada vez, poder abrir también el
  grupo de personas y cada categoría, y la línea de cuántos recibos han subido.

## Qué NO se tocó / quedó fuera

- No se tocó el backend.
- No se tocó ninguna otra pantalla, salvo la entrada nueva del menú.
- La guía de uso tiene una sección nueva, la 2b. Tus notas no se tocaron.
