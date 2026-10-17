# Design — F32 `monthly-cost`

Una carpeta nueva, `src/features/monthly-cost/`, con la forma de `overview`
(`docs/architecture.md` §Estructura de carpetas): servicio que valida, store que guarda,
funciones puras con todos los textos, componentes tontos y una vista. **Solo lee**: una
petición, `GET /api/recurring-expenses`. No toca el backend ni ninguna otra feature, salvo
el router (la entrada del menú).

## 1. Archivos

| Archivo | Qué |
|---|---|
| `src/features/monthly-cost/types.ts` | Tipos propios (§2) |
| `src/features/monthly-cost/service.ts` | `RECURRING_EXPENSES_PATH`, `parseRecurringExpenses`, `getRecurringExpenses` (§2) |
| `src/features/monthly-cost/texts.ts` | Todo lo puro: textos, `billTitle`, `periodicityLabel`, `usualSuffix`, `changeView`, `splitBills`, `blockSubtotals`, `periodLine`, `increasedLine`, `noChargesSummary`, `chargesHeading`, `monthlyCostErrorMessage` (§3, §4) |
| `src/features/monthly-cost/store.ts` | `useMonthlyCostStore` (§5) |
| `src/features/monthly-cost/components/BillRow.vue` | Una fila de recibo y, abierta, su `ChargeList` |
| `src/features/monthly-cost/components/BillList.vue` | Los recibos con cargos y el `<details>` de los sin cargos |
| `src/features/monthly-cost/components/GroupRow.vue` | Una fila con nombre, cifra al mes y `Show charges`: el grupo de personas y cada categoría |
| `src/features/monthly-cost/components/ChargeList.vue` | La lista de cargos (fecha, importe, descripción) con su encabezado |
| `src/features/monthly-cost/components/BlockHeading.vue` | Cabecera de bloque: título a la izquierda, subtotal a la derecha |
| `src/features/monthly-cost/views/MonthlyCostView.vue` | La pantalla |
| `src/features/monthly-cost/__tests__/*` | `fixtures.ts`, `service.spec.ts`, `texts.spec.ts`, `store.spec.ts`, `BillRow.spec.ts`, `MonthlyCostView.spec.ts` |
| `src/router/index.ts` | Ruta `/monthly-cost`, nombre `monthly-cost`, `meta: { label: 'Monthly cost', icon: ReceiptEuro }`, justo después de `overview` |
| `src/router/__tests__/router.spec.ts` | Las listas de rutas y de entradas pasan de 7 a 8 |
| `e2e/monthly-cost.spec.ts` | La pantalla en un navegador, sin backend |
| `docs/architecture.md`, `docs/stack.md`, `docs/guia-de-uso.md` | Lo que esta feature vuelve falso o incompleto (lote B) |

`AppSidebar.vue` y `AppShell.spec.ts` no cambian: la barra lateral se construye con
`navEntries` del router y el test de `AppShell` compara contra `navEntries`.

## 2. Tipos y servicio

```ts
// types.ts
export type DecimalString = string   // re-export del de net-worth, como hacen las demás
export type DateOnly = string
export type MonthKey = string

export interface Charge { id: number; accountId: number; bookingDate: DateOnly; amount: DecimalString; description: string }

export interface Bill {
  key: string
  name: string
  /** Texto abierto: un valor nuevo del backend no puede dejar la pantalla en blanco (R7). */
  periodicity: string
  usualAmount: DecimalString
  count: number
  lastDate: DateOnly
  previousMonthAmount: DecimalString | null
  change: DecimalString | null
  hasIncreased: boolean
  monthlyCost: DecimalString
  charges: Charge[]
}

export interface ChargeGroup { monthlyCost: DecimalString; charges: Charge[] }
export interface VariableEntry extends ChargeGroup { categoryName: string | null }

export interface MonthlyCost {
  period: { from: DateOnly; to: DateOnly; months: MonthKey[] }
  monthlyTotal: DecimalString
  bills: Bill[]
  people: ChargeGroup
  variable: VariableEntry[]
}

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'
```

- `service.ts` valida con `createValidators('GET /api/recurring-expenses')`
  (`shared/validation.ts`). Campos que se leen y validan: los de los tipos de arriba.
  `lastMonth`, `lastMonthAmount`, `previousMonth`, `transfersToPeople.months`,
  `variable[].months` y `category.id` / `category.parentId` **no se leen** (menos
  superficie que se pueda romper; la pantalla no los usa). `category` es `null` o un
  objeto con `name` de texto no vacío.
- `periodicity` se valida con `asText` (no `asMember`). Las amounts con `asDecimal` /
  `asNullableDecimal`; las fechas con `asDateOnly`; `period.months` como lista de
  `YYYY-MM` (exactamente 12; si no, `ValidationError`).
- **Cuadre (R15):** tras mapear, `sumAmounts` de todos los `monthlyCost` (recibos, grupo,
  variable) se compara con `monthlyTotal` comparando `toCents`. Si difieren:
  `ValidationError('GET /api/recurring-expenses: monthly costs do not add up to monthlyTotal')`.
  El contrato garantiza el cuadre (suma de los ya redondeados), así que con datos buenos
  no salta nunca.
- `getRecurringExpenses(client = http)`: `client<unknown>(RECURRING_EXPENSES_PATH)` sin
  `init`. No acepta método ni cuerpo: no hay forma de escribir desde esta feature (R2).
- **No se usa `transferId`** en ningún sitio (el encargo de
  `../docs/handoff-sin-emparejar-traspasos.md` lo retirará).
- **No se pinta la cuenta de cada cargo.** `accountId` se lee y se valida, pero pintar la
  cuenta exigiría una segunda petición (`GET /api/accounts`) para `accountLabel`
  (`shared/accounts.ts`, feature 28). Si se añade, se hace con esa función.

## 3. Funciones puras (`texts.ts`)

- `billTitle(key)`: primera letra en mayúscula, el resto como viene (`"seguro hogar"` →
  `"Seguro hogar"`). `key` vacía no puede llegar (`asText`).
- `periodicityLabel(p)`: tabla §4; desconocido → `p` tal cual.
- `usualSuffix(p)`: `' a month'` para `twice_monthly` (su `usualAmount` es lo cobrado en un
  mes, dos cargos juntos), `' each time'` para todo lo demás.
- `changeView(bill)`: `{ kind: 'up' | 'down' | 'same' | 'none', text: string, was: string | null }`.
  `up` si `hasIncreased`; si no, por el signo de `change` (`toCents`); `none` si `change`
  es `null`. `was` solo en `up`: `was <formatMoney(previousMonthAmount)>`. `down` usa el
  valor absoluto. No calcula ninguna diferencia: `change` es del backend.
- `splitBills(bills)`: `{ charged: Bill[], uncharged: Bill[] }`, por
  `monthlyCost === '0.00'` comparando `toCents(...) === 0n`; conserva el orden de llegada
  en las dos listas (R9). **No reordena**: el contrato ya ordena por `monthlyCost`
  descendente.
- `blockSubtotals(data)`: `{ bills, people, variable }` con `sumAmounts` (R14).
- `periodLine(period)`, `increasedLine(up, total)`, `noChargesSummary(n, period)`,
  `chargesHeading(kind, n)`, `monthlyCostErrorMessage(error)`: textos §4. Singular y plural
  correctos (`1 bill`, `2 bills`; `1 charge`, `3 charges`).

## 4. Textos de pantalla (inglés; traducción en `decisions.md`)

| Dónde | Texto |
|---|---|
| Título (`h1`) | `Monthly cost` |
| Subtítulo | `What a month of life costs: bills, what you send to people and variable spending.` |
| Etiqueta de la cifra (`StatCard`) | `What a month costs` |
| `periodLine` | `Monthly average of the 12 complete months before this one: October 2025 to September 2026.` |
| `increasedLine` | `8 of 15 bills went up since their previous charge.` · con 0: `No bill went up since its previous charge.` · con 1 de 1: `1 of 1 bill went up since its previous charge.` |
| `LOADING_LINE` | `Reading what a month costs…` |
| `EMPTY_LINE` | `Nothing counts as spending in these 12 months.` |
| Bloques | `Bills` · `Sent to people` · `Variable spending` |
| Fila de categoría sin categoría | `No category` |
| Fila del grupo de personas | `Transfers to people` |
| `noChargesSummary` | `2 bills with no charges between October 2025 and September 2026` |
| Botón de abrir / cerrar | `Show charges` / `Hide charges` |
| `chargesHeading('bill', n)` | `All 2 charges, newest first` (1: `The only charge`) |
| `chargesHeading('period', n)` | `2 charges in these 12 months, newest first` (1: `1 charge in these 12 months`; 0: `No charges in these 12 months`) |
| Columnas de recibos (cabecera visible en `md` y más) | `Bill` · `How often` · `Usual amount` · `Last charge` · `Change` · `Per month` |
| Cambio | `Up 9,92 €` + `was 187,37 €` · `Down 2,00 €` · `Same` · `No earlier charge` |
| Error | red: `Couldn't reach the server.` · ilegible: `The server answered, but the monthly cost couldn't be read.` · otro: `Something went wrong loading the monthly cost.` · botón `Try again` |

Periodicidades:

| Valor | Texto |
|---|---|
| `monthly` | `Monthly` |
| `twice_monthly` | `Twice a month` |
| `every_two_months` | `Every 2 months` |
| `every_three_months` | `Every 3 months` |
| `every_six_months` | `Every 6 months` |
| `annual` | `Yearly` |
| `once` | `Once` |

Los importes, siempre con `formatMoney` (céntimos, `1.234,56 €`), en `font-mono
tabular-nums`; las fechas, con `formatDate` (`3 Nov 2025`); los meses, con
`formatMonthLabel` de `features/statement/months.ts` (`October 2025`). Ningún formato nuevo.

## 5. Store y vista

- `useMonthlyCostStore` (setup store): `data: MonthlyCost | null`, `load: LoadState`,
  `error: AppError | null`. **Lo que está abierto es estado de la vista**, no del store
  (un `ref<Set<string>>` en la vista con claves `bill:<key>`, `people`, `variable:<i>`). Acción `load()`: pone `loading`, llama al servicio, guarda o guarda el
  error con `toAppError`; nunca lanza. Una respuesta que llega después de otra `load()`
  más reciente se descarta (contador, como `run` en `overview/store.ts`).
- La vista llama a `store.load()` en `onMounted` (cada vez que se entra: datos frescos,
  sin caché entre visitas). `Try again` llama a `store.load()`.
- Orden en la vista: cabecera → (cargando | error | contenido). Contenido: `StatCard` con
  la cifra, frase del periodo, `increasedLine` (si hay recibos); después, si no está
  vacía, los tres bloques en `BaseCard`, cada uno con `BlockHeading` (título y subtotal).
- Recibos: filas en rejilla (columnas de §4 desde `md`; debajo de `md`, nombre y cifra
  arriba y el resto en una segunda línea). El badge `Up …` es `BaseBadge` tono
  `negative`, tamaño `sm`. El resto de textos del cambio, `text-ink-muted`.
- `Show charges` es `BaseButton` variante `secondary`, tamaño `sm`, con `aria-expanded`.
  La lista se pinta justo debajo de su fila; varias pueden estar abiertas a la vez.
- Los recibos sin cargos: `<details>` nativo (como `FileIssueList.vue`), cerrado al cargar.
- Nada de colores fuera de los tokens (`docs/conventions.md` §Estilos). Iconos: solo
  `ReceiptEuro` en el router.

## 6. Pruebas

- **Fixtures** (`__tests__/fixtures.ts`): una respuesta cruda con la forma del contrato,
  todo inventado (sin nombres de personas, comercios reales ni números de cuenta reales).
  Propuesta que cuadra: recibos `comunidad vecinos` mensual 147.00 subido 3.41, `seguro
  hogar` anual 16.44 subido 9.92 (`previousMonthAmount` 187.37), `gimnasio inventado`
  `twice_monthly` 26.90 bajado −2.00, `telefonia ficticia` mensual 37.68 igual 0.00,
  `academia idiomas` `once` 0.00 con `change` `null`; personas 118.50; variable
  `Combustible` 8.33 y `null` 1.20; `monthlyTotal` `356.05` (subtotales 228.02 / 118.50 /
  9.53). Y una respuesta vacía como la del contrato.
- **Prueba de navegador** (`e2e/monthly-cost.spec.ts`): mismo patrón que
  `e2e/overview.spec.ts` (aborta y apunta toda petición no prevista; al final, lista vacía
  y solo `GET`). Responde `/api/recurring-expenses` con la fixture y las peticiones que
  hace la carcasa al arrancar (pendientes, recuento de `Review`…). **Si responde
  `GET /api/movements`, cada movimiento lleva `deposit: null`** (obligatorio desde la
  feature 31). Recorre: entrar por el menú, ver la cifra, abrir un recibo y el plegado.

## 7. Alternativas descartadas

- **Cargos en una ventana (`BaseDialog`)** en vez de desplegados: tapa la lista y no deja
  comparar dos recibos; desplegado es un clic y se ve en su sitio.
- **Reordenar los recibos en el cliente:** el contrato ya los manda de más caro a más
  barato; reordenar aquí abriría la puerta a dos órdenes distintos.
- **`asMember` para `periodicity`:** un valor nuevo del backend dejaría toda la pantalla en
  error. Se enseña tal cual.
- **No validar el cuadre:** la frase «la suma da la cifra de arriba» quedaría sin nada que
  la garantice si el backend cambiara cómo redondea.
- **Recargar tras una importación** (como `import` → `overview`): ataría `import` a una
  feature más por un caso raro (el periodo no incluye el mes en curso). Al volver a entrar
  se lee de nuevo.
