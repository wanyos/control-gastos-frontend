# Tasks — Feature 26: overview-previous-months

> Cada task referencia los `R<n>` / `C<n>` que cubre. El implementer marca `[x]` al
> completarla. Los nombres de test entre comillas son **literales**: los `checks` de
> `feature_list.json` los buscan por ese nombre. **La T15 no es del implementer.**
>
> Orden: Lote A → (Lote B y Lote C a la vez) → Lote D.

## Lote A — lo puro y la lectura del periodo
Archivos: `src/features/overview/previousMonths.ts`, `src/features/overview/types.ts`, `src/features/overview/service.ts`, `src/features/overview/__tests__/fixtures.ts`, `src/features/overview/__tests__/previousMonths.spec.ts`, `src/features/overview/__tests__/previousMonthsService.spec.ts`
Depende de: —

- [ ] T1 — `types.ts`: añadir `PeriodTotals`, `NetSign` y `MonthRow` (design §3). Nada
  de lo que hay cambia. Cubre: R2, R4, R11.
- [ ] T2 — `service.ts`: añadir `getPeriodTotals`. `previousMonthsService.spec.ts`:
  `getPeriodTotals('2024-10', '2026-08')` pide **exactamente**
  `/api/movements?from=2024-10-01&to=2026-08-31&pageSize=1`, con `GET` y sin cuerpo, y
  devuelve `totals` y `pagination.total`. Cubre: R11, C1.
- [ ] T3 — `fixtures.ts`, solo añadidos (design §7): la clase `period` en `readOf` y su
  respuesta en `mockBackend` (`60135.60` / `80934.73` / `-20799.13`, 863 movimientos
  para `2024-10-01`…`2026-08-31`; cualquier otro rango, rechazado). Lanzar los cuatro
  specs de la F25 sin tocarlos y pegar el resultado en el informe. Cubre: C2.
- [ ] T4 — `previousMonths.ts` completo (design §4). Cubre: R1–R6, R9–R12, C3.
- [ ] T5 — `previousMonths.spec.ts`: (a) `shownMonths('2026-09-11')` son 24, de
  `2026-09` a `2024-10`, y cruza dos cambios de año; `[]` con `null`; (b)
  `summedPeriod`: `2024-10`…`2026-08` con `2026-09-11`, y `2024-10`…`2026-09` con
  `2026-09-30`; (c) `scaleTop` de los 18 meses completos de la fixture es `11527.15`,
  y `null` sin meses; (d) `buildMonthRows` con la fixture y `2026-08` arriba: agosto de
  2026 `225` / `347`, `netSign: 'negative'`, `isShown: true` y solo ella; enero de 2026
  `270` / `164` y `positive`; julio de 2025 `192` / `1000`; septiembre de 2026
  `incomplete` con sus `totals` y anchos y signo `null`; de `2024-10` a `2025-02`
  `empty` con `totals: null`; un mes con movimientos y las tres cifras a `0.00` es
  `complete` con anchos `0` y `zero`; `null` si falta un mes; nunca `number` sobre un
  importe; (e) `periodSentence`, texto literal de los cuatro casos de R11 (el 4 con la
  fixture: `From October 2024 to August 2026, 60.136 € came in and 80.935 € went out:
  you spent 20.799 € more than came in.`); (f) `leftOutLine` y `notShownLine` en sus
  dos sentidos; `dataEndsLine`. Cubre: R1–R6, R9–R12, C3.

## Lote B — el store
Archivos: `src/features/overview/store.ts`, `src/features/overview/__tests__/previousMonthsStore.spec.ts`
Depende de: Lote A

- [ ] T6 — `store.ts` (design §5): lecturas en curso compartidas, `previousLoad`,
  `period`, `periodLoad`, `previousMonths`, `monthRows`, `loadPreviousMonths`, y los
  añadidos de `reset` y `refreshIfLoaded`. `store.spec.ts` pasa **sin tocarse**.
  Cubre: R1, R11, R13, R14, R15, C2, C4.
- [ ] T7 — `previousMonthsStore.spec.ts`: (a) **«asks for each month once in a visit,
  whoever asks»**: `show('2026-08')` y `loadPreviousMonths()` lanzados a la vez → 27
  `GET`, ningún mes repetido, 24 filas; luego `show('2026-07')` → 1 petición más (su
  gasto sin categoría); (b) con `2026-09` arriba 27 y con `2026-10` 27; (c) falla un
  mes → `previousLoad: 'error'`, `monthRows` nulo, y la segunda llamada pide solo ese
  mes; (d) falla `latest` → error; (e) falla el periodo → filas listas,
  `periodLoad: 'error'`, y la segunda llamada pide solo el periodo; (f) base vacía
  (`latest` nulo) → `ready`, sin filas y sin pedir ningún mes ni periodo; (g) `reset`
  lo vacía y una respuesta anterior al `reset` no se guarda; (h) `refreshIfLoaded`
  vuelve a leer el bloque si estaba cargado, y no lo lee si no lo estaba; (i) todas las
  peticiones son `GET` a `/api/movements`, sin cuerpo. Cubre: R1, R13, R14, R15, C1, C4.

## Lote C — los dos componentes
Archivos: `src/features/overview/components/PreviousMonths.vue`, `src/features/overview/components/PreviousMonthRow.vue`, `src/features/overview/__tests__/PreviousMonths.spec.ts`, `src/assets/theme-dark.css`
Depende de: Lote A

- [ ] T8 — Comprobación previa, anotada en el informe: qué dos colores `chart-*` se
  usan (distintos de `bg-chart-4`, con su línea `contrast:` sobre `surface-sunken`), y
  que ninguna clase elegida está entre las que vigila `tailwind-sources.spec.ts`.
  `theme-dark.css` solo se edita si aparece un par nuevo. Cubre: C8.
- [ ] T9 — `PreviousMonthRow.vue` y `PreviousMonths.vue` (design §6). Cubre: R1–R6,
  R9–R14, C7, C8.
- [ ] T10 — `PreviousMonths.spec.ts`, con filas construidas por `buildMonthRows` sobre
  la fixture: (a) **«marks the months that spent more than came in»**: las nueve filas
  de `net` negativo llevan `data-net="negative"` y el importe con signo menos; enero de
  2026, `positive`; (b) **«marks an incomplete month as incomplete, with no bars»**:
  septiembre de 2026 con `Incomplete`, sus tres cifras, `Data ends on` con la fecha,
  ninguna barra y sin `data-net`; (c) **«shows a month with no movements as empty, not
  as a zero»**: `No movements`, ningún importe ni barra, y distinto del mes que suma
  `0,00 €`; (d) las cifras son `formatMoney` del string, letra por letra, y los anchos
  `22.5%` / `34.7%` en agosto de 2026; (e) la fila marcada: `aria-current`,
  `Shown above`, y solo una; (f) cargando, error con `Try again` (emite `retry`), error
  del periodo con las filas pintadas, las dos notas; (g) el enlace de cada fila apunta
  a `?month=<mes>`; (h) ningún `data-test` de la parte del mes. Cubre: R2–R6, R9–R14, C7.

## Lote D — la pantalla, el e2e y los documentos
Archivos: `src/features/overview/views/OverviewView.vue`, `src/features/overview/__tests__/OverviewView.spec.ts`, `src/features/overview/__tests__/OverviewPreviousMonths.spec.ts`, `e2e/overview.spec.ts`, `docs/architecture.md`, `docs/stack.md`
Depende de: Lote B, Lote C

- [ ] T11 — `OverviewView.vue` (design §6): el bloque como último hijo, la llamada a
  `loadPreviousMonths` tras `syncFromRoute`, el desplazamiento al pulsar y el reintento.
  `OverviewView.spec.ts`: **solo** las cuatro aserciones de design §7. Cubre: R1, R7,
  R8, R13, C2.
- [ ] T12 — `OverviewPreviousMonths.spec.ts`, montando `OverviewView`: (a) **«shows
  the 24 months below the month, each with what came in and what went out»**: con
  `2026-08` arriba, `previous-months` es el último hijo, tiene 24 filas de `2026-09` a
  `2024-10` y agosto de 2026 enseña `2.590,26 €` y `4.003,89 €`; (b) **«marks the month
  shown above, and only that one»**, y con `2026-10` y con `2024-03` arriba ninguna y
  el texto de R6; (c) **«pressing another month puts it above, through the URL»**:
  pulsar enero de 2026 hace `push`, la URL es `/overview?month=2026-01`, la frase de
  arriba es la de enero, la fila marcada es enero, las 24 filas son las mismas, se llamó
  a `scrollIntoView`, y «atrás» vuelve a agosto; (d) **«a row shows the same figures as
  the month does when it is above»**: para agosto y enero de 2026, las tres cifras de
  la fila son las de `overview-in`, `overview-out` y `overview-net`; (e) **«says what
  was saved over the complete months, with the totals of the backend»**: la frase de la
  fixture, antes de las filas, `September 2026 is left out: it is incomplete.`, y la
  petición del periodo es `from=2024-10-01&to=2026-08-31`; (f) con el mes de arriba
  vacío o con el núcleo en error el bloque se sigue viendo; (g) la parte del mes es
  letra por letra la de antes (frase, cuatro tarjetas, leyenda, línea sin categoría y
  enlace de agosto de 2026); (h) una visita entera solo manda `GET` a
  `/api/movements`. Cubre: R1, R5–R8, R11, R12, R15, C1, C2.
- [ ] T13 — `e2e/overview.spec.ts`: la rama del periodo y los cinco meses en `MONTHS`
  (design §7), la aserción `2` → `27`, y un test nuevo, **«reads the previous months
  below the month and moves on a click»**: abrir `/overview?month=2026-08`, leer la
  frase del periodo, contar 24 filas, ver agosto marcado, septiembre `Incomplete` y una
  fila `No movements`; pulsar enero de 2026 y comprobar la URL, la frase de arriba, que
  la navegación de mes está a la vista y que «atrás» vuelve; la lista de llamadas
  paradas acaba vacía y todos los métodos son `GET`. Cubre: R1, R5, R7–R12, C1.
- [ ] T14 — `docs/architecture.md` y `docs/stack.md` (design §8). Trazabilidad
  `R1…R15 → test` en `progress/implementations/overview-previous-months.md`. Puerta:
  `pnpm type-check`, `pnpm build`, `./init.sh` y `./init.sh --checks 26`, con la salida
  pegada. Cubre: todos, C9.
- [ ] T15 — *(NO es del implementer: la hace el leader con el humano delante. **Solo
  lectura:** únicamente `GET`.)* Con el backend real en `:3000`:
  1. `GET /api/movements?pageSize=1`: apuntar la fecha del último dato y deducir los 24
     meses y el periodo.
  2. Pedir con `curl` las cifras de cuatro meses (el de arriba, uno con ahorro, uno de
     2024-10 a 2025-02 y el incompleto) y comprobar su fila céntimo a céntimo; abrir
     cada uno arriba y comprobar que enseña lo mismo.
  3. Pedir el periodo (`from` y `to` del paso 1) y comparar con la frase. Sumar aparte
     los `net` de los meses completos y comprobar que dan el `net` del periodo.
  4. La barra más larga es la de la cifra más alta de los meses completos; apuntar cuál
     es, y si de 2024-10 a 2025-02 hay alguna mayor que 11.527,15 €.
  5. Abrir `/overview` sin mes (octubre de 2026): ninguna fila marcada y el texto de R6.
  6. Pulsar un mes, «atrás», recargar. En la pestaña de red: solo `GET`, y 29 al entrar
     a agosto de 2026 (27 de la pantalla y 2 de las barras de la aplicación).
  Cubre: R1–R12, R15, C1, C3 contra datos reales.
