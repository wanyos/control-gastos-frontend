# Resumen — feature 37 `expenses-by-category`

Fecha de cierre: 2026-10-25
Intención original: `feature_list.json` → feature `expenses-by-category`, bloque `intent`
Spec (SDD): `specs/37-expenses-by-category/`

## Qué hace ahora la app que antes no

Hay una pantalla nueva, `Expenses by category`, justo debajo de `Overview` en el menú.
Enseña lo gastado en un mes o en un año natural, categoría por categoría, separado en
gasto fijo y gasto variable y comparado con el periodo anterior (en un mes también se
puede comparar con el mismo mes del año pasado). Cada categoría se abre para ver sus
movimientos. La pantalla `Monthly cost` ya no existe: se quitó del menú y del código, y
su dirección lleva a `Net Worth`.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| La ruta `/expenses-by-category` y su entrada del menú | [index.ts:94](../../src/router/index.ts#L94) |
| La pantalla lee el periodo de la dirección y pide los datos | [ExpensesByCategoryView.vue:113](../../src/features/expenses-by-category/views/ExpensesByCategoryView.vue#L113) |
| Cómo se lee el periodo de la dirección (`?month=…&compare=…` o `?year=…`) | [reading.ts:85](../../src/features/expenses-by-category/reading.ts#L85) |
| La consulta `GET /api/expenses-by-category` | [service.ts:158](../../src/features/expenses-by-category/service.ts#L158) |
| Comprobación de que la respuesta tiene la forma del contrato y cuadra | [service.ts:134](../../src/features/expenses-by-category/service.ts#L134) |

## Dónde está el código

### Datos: tipos, consulta y estado

| Qué hace | Dónde |
| --- | --- |
| Los tipos del frontend leídos del contrato | [types.ts](../../src/features/expenses-by-category/types.ts) → `PeriodQuery`, `ExpenseLine`, `ExpenseGroup`, `ExpensesByCategory` |
| Arma la querystring (`compare` solo con `month`) | [service.ts](../../src/features/expenses-by-category/service.ts) → `expensesQueryString` |
| Valida, mapea y rechaza una respuesta cuyas sumas no cuadran | [service.ts](../../src/features/expenses-by-category/service.ts) → `parseExpensesByCategory`, `parseGroup` |
| Pide los datos | [service.ts](../../src/features/expenses-by-category/service.ts) → `getExpensesByCategory` |
| Guarda lo leído, el fallo y el último periodo; `Try again` repite el mismo | [store.ts](../../src/features/expenses-by-category/store.ts) → `useExpensesByCategoryStore` (`load`, `retry`) |

### Lógica sin estado y textos

| Qué hace | Dónde |
| --- | --- |
| Todos los textos de la pantalla | [reading.ts](../../src/features/expenses-by-category/reading.ts) → `TITLE`, `SUBTITLE`, `NO_CATEGORY`, `NEW_BADGE`, `GONE_BADGE`, … |
| Leer y escribir el periodo en la dirección | [reading.ts](../../src/features/expenses-by-category/reading.ts) → `periodFromRouteQuery`, `periodToRouteQuery`, `defaultPeriod` |
| Pasar de mes a año y de año a mes | [reading.ts](../../src/features/expenses-by-category/reading.ts) → `switchMode` |
| El nombre de un periodo (`September 2026`, `2025`, `January – October 2026`) | [reading.ts](../../src/features/expenses-by-category/reading.ts) → `periodLabel` |
| La frase de arriba y la del periodo vacío | [reading.ts](../../src/features/expenses-by-category/reading.ts) → `periodSentence`, `emptySentence` |
| La línea de lo que no tiene categoría | [reading.ts](../../src/features/expenses-by-category/reading.ts) → `uncategorizedText`, `uncategorizedLine` |
| La diferencia con signo y su color | [reading.ts](../../src/features/expenses-by-category/reading.ts) → `formatDifference`, `differenceTone`, `DIFFERENCE_CLASSES` |
| La parte de cada barra y la línea bajo el total | [reading.ts](../../src/features/expenses-by-category/reading.ts) → `barPermille`, `comparedCaption` |
| Las columnas de cada fila | [reading.ts](../../src/features/expenses-by-category/reading.ts) → `LINE_COLUMNS` |
| El mensaje de error | [reading.ts](../../src/features/expenses-by-category/reading.ts) → `expensesErrorMessage` |

### La pantalla y sus componentes

| Qué hace | Dónde |
| --- | --- |
| La pantalla: frase, total, lo sin categoría, `Fixed` y `Variable`, error con `Try again` | [ExpensesByCategoryView.vue](../../src/features/expenses-by-category/views/ExpensesByCategoryView.vue) → `ExpensesByCategoryView` |
| `Month`/`Year`, `Compare with`, las flechas del mes (`MonthNav` de statement) o del año | [PeriodPicker.vue](../../src/features/expenses-by-category/components/PeriodPicker.vue) → `PeriodPicker` |
| Un bloque, `Fixed` o `Variable`, con su suma y sus filas | [CategoryGroup.vue](../../src/features/expenses-by-category/components/CategoryGroup.vue) → `CategoryGroup` |
| Una fila: nombre, `New`/`Gone`, barra, cifras, `A month` y `Show movements` | [CategoryLine.vue](../../src/features/expenses-by-category/components/CategoryLine.vue) → `CategoryLine` |
| Los movimientos de una fila abierta | [LineMovements.vue](../../src/features/expenses-by-category/components/LineMovements.vue) → `LineMovements` |

### Menú y lo que se quitó

| Qué hace | Dónde |
| --- | --- |
| La ruta nueva, con el icono `ChartBar`; fuera `/monthly-cost` y `ReceiptEuro` | [index.ts](../../src/router/index.ts) → `routes` |
| Borrados: `src/features/monthly-cost/` entera y `e2e/monthly-cost.spec.ts` | — |

### Documentos

| Qué cambió | Dónde |
| --- | --- |
| Sección 2b nueva y todas las menciones de `Monthly cost` | [guia-de-uso.md](../../docs/guia-de-uso.md) → `## 2b. Expenses by category` |
| Árbol de carpetas y párrafo de la feature | [architecture.md](../../docs/architecture.md) → `expenses-by-category/` |
| Icono del menú | [stack.md](../../docs/stack.md) → `Feature #37` |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| Datos inventados con la forma del contrato | [fixtures.ts](../../src/features/expenses-by-category/__tests__/fixtures.ts) → `rawMonth`, `rawYear`, `rawEmpty`, `rawAllCategorized`, `rawFixedNotAddingUp`, `mockBackend` |
| Periodo en la dirección, cambio de modo, nombres, frase, signo, lo sin categoría, errores | [reading.spec.ts](../../src/features/expenses-by-category/__tests__/reading.spec.ts) |
| Querystring, solo `GET`, mapeo, sumas que no cuadran, forma del contrato | [service.spec.ts](../../src/features/expenses-by-category/__tests__/service.spec.ts) |
| Solo cuenta la última carga; fallo y `Try again` | [store.spec.ts](../../src/features/expenses-by-category/__tests__/store.spec.ts) |
| Etiquetas, barra, `A month`, abrir movimientos, `Gone` sin botón | [CategoryLine.spec.ts](../../src/features/expenses-by-category/__tests__/CategoryLine.spec.ts) |
| La pantalla entera con router en memoria | [ExpensesByCategoryView.spec.ts](../../src/features/expenses-by-category/__tests__/ExpensesByCategoryView.spec.ts) |
| Menú: entrada nueva y dirección vieja | [router.spec.ts](../../src/router/__tests__/router.spec.ts) → `lists Expenses by category in the menu right below Overview`, `no longer lists Monthly cost and sends its old address to the net worth home` |
| En navegador: desde el menú, el año y la dirección vieja | [expenses-by-category.spec.ts](../../e2e/expenses-by-category.spec.ts) |

## Cumplimiento de la intención

Resultado real de `./init.sh --checks 37` del 2026-10-25: 14 de 14 en verde.

- ✅ "Cuando abro la pantalla, veo lo gastado en un mes por categoría, en fijo y variable, con el total y la diferencia frente al mes anterior." → `opens on the current month with fixed and variable, the total and the difference with the previous month` y el e2e `reaches Expenses by category from the menu, sees the month and opens a category`. Check: ✅
- ✅ "Cuando cambio a un año, veo lo mismo para el año y, además, la media mensual de cada categoría." → `switching to a year shows the year and the monthly average of each category`, `shows the monthly average only in a year` y el e2e `switches to a year and sees the monthly average of each category`. Check: ✅
- ✅ "Cuando despliego una categoría, veo sus movimientos del periodo." → `expanding a category lists its movements of the period`, `opens a category and lists its movements with date, description and amount`, `a gone category has no movements to open`. Check: ✅
- ✅ "Una categoría nueva o que ya no está se distingue de las demás." → `marks a new category and one that is gone apart from the rest`. Check: ✅
- ✅ "Los gastos sin categoría salen en su propia línea y la pantalla dice cuánto pesan sobre el total." → `says how many movements have no category and how much of the spending they are`. Check: ✅
- ✅ "El total del mes coincide con el gasto de Overview de ese mes." → `shows the total exactly as the backend sent it` y `rejects a response whose groups do not add up to the total`. Check: ✅. Además, el reviewer pidió al backend real (solo `GET`) los meses 2026-08 y 2026-09: el total coincide con el `Money out` de `Overview` en los dos. Sigue en pie la comprobación tuya en la pantalla (📌 de la hoja).
- ✅ "Monthly cost ya no está en el menú ni se puede abrir por su dirección." → `no longer lists Monthly cost and sends its old address to the net worth home` y el e2e `the old Monthly cost address opens the net worth`. Check: ✅
- ✅ "Textos en inglés, en oscuro, y pnpm type-check, lint, test:unit, build e ./init.sh en verde." → los comandos, lanzados por el reviewer, salen con 0. Revisado a mano: todos los textos en inglés; colores solo con los nombres de color del tema (`bg-chart-1/3/4`, `text-positive`, `text-negative`, `text-ink-*`), ningún hex ni color de serie de Tailwind. Check: ✅
- ✅ (añadido) Entrada `Expenses by category` justo debajo de `Overview` → `lists Expenses by category in the menu right below Overview`. Check: ✅
- ✅ (añadido) La frase antes de cualquier cifra → `shows the sentence before any figure`. Check: ✅
- ✅ (añadido) Comparar con el mismo mes del año pasado → `asks the same month last year when that comparison is chosen`. Check: ✅
- ✅ (añadido) Solo lee → `asks a month with its comparison and a year without one, with no method and no body`. Check: ✅
- ✅ (añadido) Fallo con `Try again` → `says the backend failed and asks again on Try again`. Check: ✅
- ✅ (añadido) El código de `Monthly cost` ya no existe → `! test -e src/features/monthly-cost && ! test -e e2e/monthly-cost.spec.ts`. Check: ✅

## Decisiones que se tomaron por ti

- (añadido) El nombre `Expenses by category`, su sitio en el menú y el icono `ChartBar` (hoja 🔴 2).
- (delegado) Abre en el mes en curso contra el mes anterior entero; selector `Month`/`Year` y desplegable `Compare with` (hoja 🔴 3).
- (añadido) La frase de arriba y su texto (hoja 🔴 4).
- (delegado) Barra = parte del total del periodo, con la cifra; columna `A month` en año; etiquetas `New`/`Gone` (hoja 🔴 5).
- (añadido) Una respuesta cuyas sumas no cuadran no se enseña: sale `The server answered, but the spending couldn't be read.`
- (añadido) Si el backend falla, el mensaje con `Try again`.
- El periodo va en la dirección, así que recargar o ir atrás enseña el mismo.

## Qué NO se tocó / quedó fuera

- `Overview`, `src/shared/`, `src/assets/`, `package.json` (ninguna dependencia nueva) y el backend.
- La marca de gasto fijo de cada categoría no se cambia desde esta pantalla.
- Los movimientos no dicen de qué cuenta son, y una subcategoría sale sin el nombre de su madre.
- No vuelve a pedir los datos tras una importación con la pantalla abierta.

## Notas para el futuro

- Con tus datos de hoy no hay ninguna línea sin categoría: ese caso solo está probado con datos inventados.
- Al cerrar quedan por actualizar `docs/roadmap.md` (líneas 54 y 379), `../docs/ideas.md` y los `checks` de la F32 (ver `progress/reviews/expenses-by-category.md`).
- Avisar a la sesión del backend de que ya puede retirar `GET /api/recurring-expenses`.
