# Tasks — Feature 25: month-at-a-glance

> Orden de ejecución. Cada task referencia los `R<n>` / `C<n>` que cubre. El
> implementer marca `[x]` al completarla. **La T19 no es del implementer.**

## Preparación

- [ ] T0 — Comprobaciones previas, anotadas en
  `progress/implementation/month-at-a-glance.md`: (a) que `Intl.NumberFormat` con
  `maximumFractionDigits: 0` formatea `"4003.89"` como `4.004 €` desde el string, sin
  pasar por `number`; (b) qué color `chart-*` de `ShareBar` tiene ya su línea
  `contrast:` sobre `surface-sunken`; (c) que `LayoutDashboard` sigue siendo el icono
  de la ruta `overview`. Cubre: C2, C8.

## Lo compartido

- [ ] T1 — `src/shared/money.ts`: añadir `formatMoneyWhole` y sus tests en el spec
  existente de `money` (`"4003.89"` → `4.004 €`, `"161.82"` → `162 €`, `"0.00"` →
  `0 €`, `"1413.63"` → `1.414 €`, agrupación de 4 cifras, U+00A0 generado). Ninguna
  función existente cambia. Cubre: R4, C2, C5.

## La frontera

- [ ] T2 — `src/features/overview/types.ts` y `service.ts`: `getMonthFigures`,
  `getUncategorizedSpending`, `getLatestBookingDate` (design §4). Cubre: R5, R8, R12, C1.
- [ ] T3 — `__tests__/service.spec.ts`: (a) `getMonthFigures('2026-08')` pide
  **exactamente** `/api/movements?from=2026-08-01&to=2026-08-31&pageSize=1` (mismos
  parámetros, ninguno más) y devuelve `totals` y `pagination.total`; (b) la de sin
  categoría lleva `type=expense`, `uncategorized=true`, `transfer=none`,
  `excluded=none`; (c) `getLatestBookingDate` devuelve la fecha del primero y `null`
  con lista vacía; (d) todas las peticiones son `GET`. Cubre: R5, R8, R12, C1.

## Lo puro

- [ ] T4 — `reading.ts` completo (design §5). Cubre: R4, R6–R12, R13, R14, C2.
- [ ] T5 — `__tests__/reading.spec.ts`, la frase, con las cifras reales de las
  fixtures y el texto literal de cada caso de R4: agosto de 2026 (caso 8, `2.590 €`,
  `4.004 €`, `1.414 €`), enero de 2026 (caso 6, `39,2 %`), septiembre de 2026 con
  último dato `2026-09-11` (caso 3), octubre de 2026 (caso 1), diciembre de 2023
  (caso 2), y fabricados para los casos 4, 5 y 7. Cubre: R4.
- [ ] T6 — `__tests__/reading.spec.ts`, estado y cifras: `monthState` (vacío;
  incompleto con el último dato un día antes del fin de mes; completo con el último
  dato **el** último día y con uno posterior; febrero bisiesto); `savingsRatePermille`
  (positiva, negativa `-546` para agosto de 2026, `null` sin ingresos). Cubre: R6, R7, R8.
- [ ] T7 — `__tests__/reading.spec.ts`, la comparación: `priorMonths('2026-01')` cruza
  el año; `medianAmount` con 12 valores reales (los centrales `2819.35` y `3115.81` →
  `2967.58`), con 5 (el central, sin tocar), con 2, con 1, con dos centrales que dan
  medio céntimo, con la entrada desordenada y sin mutarla, `[]` → `null`, nunca
  `number`; `buildComparison` de agosto de 2026 contra sus doce reales (gasto `more`,
  +34,9 % sobre `2967.58`; entrada `usual`, −12,2 % sobre `2950.00`) y de marzo de 2026
  (gasto `usual`, −6,1 %); el borde exacto del 25 % es `usual` y un céntimo más es `more`; febrero de
  2024 compara con 1 mes y enero de 2024 con 0; `comparisonCaption` con 12, 5, 1 y 0;
  `usualLineText` por arriba, por abajo e igual. Cubre: R10, R11, C2.
- [ ] T8 — `__tests__/reading.spec.ts`, honestidad y errores: `uncategorizedLine` con
  agosto de 2026 (`3.036,33 €`, `4.003,89 €`, `75,8 %`, `48 movements`), con 1
  movimiento y con importe 0; `overviewErrorMessage` para red, `ValidationError`, 400 y
  500, sin rastro del `message` del backend. Cubre: R12, R13.

## El store

- [ ] T9 — `store.ts` (design §6). Cubre: R2, R8, R9, R10, R13, R14, C3, C4.
- [ ] T10 — `__tests__/store.spec.ts`: (a) mes completo → 15 `GET` y `comparison`
  lista; retroceder un mes → **solo 2** peticiones nuevas; (b) mes incompleto → no se
  pide ningún mes anterior; (c) mes vacío → solo el núcleo; (d) falla el núcleo →
  `core: 'error'`, y `retry` lo repite; (e) falla 1 de los 12 → cifras del mes
  intactas, `comparison` nula, `retryComparison` pide solo el que faltaba; (f) falla
  lo de sin categoría → todo lo demás listo; (g) dos `show` seguidos: la respuesta del
  primero no pinta; (h) `reset` vacía, `refreshIfLoaded` no pide nada si nunca se
  cargó y recarga si sí; (i) **ninguna petición usa un método distinto de `GET` ni
  otra ruta que `/api/movements`** (espía sobre el cliente). Cubre: R8, R9, R10, R13,
  R14, C1, C3, C4.
- [ ] T11 — `src/features/import/store.ts`: la llamada a `refreshIfLoaded` en el
  `finally` de `start`, y un test en el spec del store de `import` que la comprueba
  (cargado → recarga; no cargado → nada). Cubre: C3, C5.

## La pantalla

- [ ] T12 — `components/MonthSentence.vue`, `MonthFiguresGrid.vue`, `UsualLine.vue`
  y `UncategorizedLine.vue`. Cubre: R4–R8, R10, R12, C7, C8.
- [ ] T13 — `views/OverviewView.vue` (design §7): navegación, frase, cifras, leyenda,
  línea de honestidad, enlace, estados de carga y de error. Cubre: R2, R3, R4, R9,
  R11, R13, R14, R15, C6.
- [ ] T14 — `src/router/index.ts` + `router.spec.ts`: `/overview` monta
  `OverviewView`; `/` sigue yendo a `net-worth`; las listas de rutas y etiquetas no
  cambian. Cubre: R1, C5.
- [ ] T15 — Tests de componentes y de la vista: (a) la frase es el primer contenido
  tras la navegación y va antes que cualquier `StatCard`; (b) las tres cifras salen
  con `formatMoney` del string del backend, letra por letra; (c) mes incompleto:
  `Savings rate` es `—` con su texto y aparece `No comparison for an incomplete
  month.`; (d) sin ingresos: `—` y su texto; (e) mes vacío: ni tarjetas, ni leyenda, ni
  línea, ni enlace; (f) las tres etiquetas y la leyenda con 12 y con 5; (g) error del
  núcleo con `Try again`; error de la comparación con el resto pintado; (h) sin
  `month` o con `2026-13` se muestra el mes en curso; cambiar de mes hace `push`;
  (i) el enlace lleva a `/movements?month=<mes>`; (j) no hay nada pintado debajo del
  bloque del mes. Cubre: R2–R15, C6.

## Extremo a extremo

- [ ] T16 — `e2e/overview.spec.ts` con la red de seguridad y `**/api/movements*`
  respondido según la query (cifras reales de las fixtures): (a) entrar por la barra
  lateral a `Overview`, ir a agosto de 2026 y leer la frase, las cuatro tarjetas, las
  dos etiquetas y la línea de sin categoría; (b) `Next` a septiembre: frase de
  incompleto y `—`; (c) recargar conserva el mes; atrás vuelve a agosto; (d) el enlace
  abre el extracto de agosto y sus `Money in` / `Money out` son las mismas cifras;
  (e) la red de seguridad no paró ninguna llamada y **todos** los métodos de la sesión
  son `GET`. Cubre: R1–R6, R8, R10, R12, R15, C1.

## Cierre

- [ ] T17 — `docs/architecture.md` (carpeta `features/overview/`, las dependencias
  `overview` → `statement` e `import` → `overview`, y la nota de que la mediana es la
  única cifra que calcula el cliente) y `docs/stack.md` (el e2e nuevo en la lista).
  Cubre: C2, C5.
- [ ] T18 — Trazabilidad `R1…R15 → test` en
  `progress/implementation/month-at-a-glance.md`, y puerta: `pnpm type-check`,
  `pnpm build` y `./init.sh` en verde. Cubre: todos, C9.
- [ ] T19 — *(NO es del implementer: la hace el leader con el humano delante. **Solo
  lectura:** únicamente `GET`, no hace falta foto previa ni visto bueno para escribir,
  porque no se escribe nada.)* Con el backend real en `:3000`:
  1. Para cada mes de la lista, pedir con `curl`
     `GET /api/movements?from=<día 1>&to=<último día>&pageSize=1` y apuntar `totals` y
     `pagination.total`: **2026-08** (déficit), **2026-01** (ahorro), **2026-09**
     (incompleto), **2026-10** (vacío), **2024-02** (un solo mes anterior) y
     **2024-01** (ninguno).
  2. Abrir `/overview?month=<mes>` y comprobar que `Money in`, `Money out` y `Savings`
     son esas tres cifras, céntimo a céntimo. Esperado el 2026-10-02: agosto
     2.590,26 / 4.003,89 / −1.413,63 y tasa −54,6 %; enero 3.114,10 / 1.892,53 /
     1.221,57 y tasa 39,2 %.
  3. Pulsar `See the movements of …` y comprobar que el extracto del mismo mes, sin
     filtros y con el interruptor del ruido apagado, enseña las mismas tres cifras.
  4. Septiembre: la frase dice que está incompleto y que los datos acaban el 11 Sept
     2026; `Savings rate` es `—`; no hay comparación. Comprobar la fecha contra
     `GET /api/movements?pageSize=1`.
  5. Octubre de 2026: solo la frase de «sin movimientos», con la fecha del último dato.
  6. La mediana: para agosto de 2026, pedir con `curl` los doce meses anteriores,
     ordenar los doce gastos, hacer la media de los dos del centro y compararla con la
     que enseña la pantalla (2.967,58 €, `More than usual`, 34,9 % por encima); lo
     mismo con lo que entró (2.950,00 €, `About usual`, 12,2 % por debajo).
     Febrero de 2024 dice `1 previous month with data`; enero de 2024, que no hay con
     qué comparar.
  7. Sin categoría de agosto: comparar la línea con
     `GET /api/movements?from=2026-08-01&to=2026-08-31&type=expense&uncategorized=true&transfer=none&excluded=none&pageSize=1`
     (esperado: 3.036,33 €, 48 movimientos, 75,8 %).
  8. En las herramientas del navegador, pestaña de red: en toda la visita solo hay
     `GET`.
  Cubre: R4, R5, R6, R8, R10, R11, R12, R15, C1, C2 contra datos reales.
