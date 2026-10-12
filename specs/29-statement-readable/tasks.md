# Tasks — F29 `statement-readable`

Dos lotes en secuencia. El código y sus tests unitarios van juntos en el lote A porque
`StatementView.spec.ts` comprueba a la vez la línea, la explicación y la lista vacía.

Los nombres de test entre comillas invertidas son **literales**: los `checks` de
`feature_list.json` los buscan con `grep -F` y los filtran con `vitest -t`. No llevan
paréntesis, corchetes ni `? + * | ^ $`. No se cambian.

## Lote A — la pantalla y sus tests unitarios
Archivos: `src/features/statement/components/StatementRow.vue`, `src/features/statement/components/MonthTotals.vue`, `src/features/statement/components/StatementList.vue`, `src/features/statement/views/StatementView.vue`, `src/features/statement/store.ts`, `src/features/statement/filters.ts`, `src/assets/theme-dark.css`, `src/features/statement/__tests__/StatementRow.spec.ts`, `src/features/statement/__tests__/MonthTotals.spec.ts`, `src/features/statement/__tests__/StatementList.spec.ts`, `src/features/statement/__tests__/StatementView.spec.ts`, `src/features/statement/__tests__/store.spec.ts`, `src/features/statement/__tests__/filters.spec.ts`
Depende de: —

- [x] T1 — `StatementRow.vue`: computed `isLeftOut`; importe `text-ink-faint
  line-through` y concepto `text-ink-muted` cuando no cuenta; importe de lo que cuenta
  como hoy (design §2). Cubre: R1, R2, R3.
- [x] T2 — `StatementRow.vue`: `Transfer` y `Not counted` pasan a `<span>` del segundo
  renglón, tras la cuenta, con sus `data-test`, `title`, `aria-label` y condición de
  hoy. Cubre: R5.
- [x] T3 — `StatementRow.vue`: etiqueta de categoría siempre `tone="neutral"`;
  `Uncategorized` como `<span>` local con borde discontinuo y sin fondo. No se toca
  `BaseBadge.vue`. Cubre: R4, R6, R7.
- [x] T4 — `theme-dark.css`: las dos líneas `contrast:` de design §4. Cubre: C2.
- [x] T5 — `StatementRow.spec.ts`, tests nuevos con estos nombres exactos:
  - `crosses out the amount and greys the description of a marked movement and of a paired transfer`
    — monta un movimiento marcado y uno con `transferId`; en los dos, el importe lleva
    `text-ink-faint` y `line-through` y el concepto `text-ink-muted`; un gasto y un
    ingreso que cuentan no llevan `line-through`. Cubre: R1, R2, R3.
  - `never paints the amount of a movement that does not count in green or in white`
    — ingreso marcado e ingreso con `transferId`: sin `text-positive`; gasto marcado y
    gasto con `transferId`: sin `text-ink-strong`. Cubre: R1.
  - `gives every category the same label look for income and for expense`
    — las clases de `statement-row-category` de un ingreso con categoría y de un gasto
    con categoría son idénticas y no contienen `text-brand` ni `bg-brand-subtle`; igual
    con `selectable: true`. Cubre: R6.
  - `draws the Uncategorized label with a dashed outline and no fill`
    — sin categoría: `border-dashed`, `border-line-default`, `text-ink-muted` y ninguna
    clase que empiece por `bg-`; y sus clases son distintas de las de una etiqueta con
    categoría. Cubre: R7.
  - `keeps the category on a movement that does not count`
    — marcado con categoría: `statement-row-category` dice el nombre de la categoría y
    `statement-row-excluded` dice `Not counted`. Cubre: R4.
  - `writes Transfer and Not counted under the description next to the account`
    — los dos `data-test` están dentro del mismo `<p>` que `statement-row-account`, no
    son `BaseBadge`, y conservan su `title`. Cubre: R5.
- [x] T6 — `StatementRow.spec.ts`: corregir los tests que quedan falsos (hoy:
  `greys the amount out without changing it, and adds no other marking (🔴 2)` y
  `greys an income out too, sign and figure untouched`, que esperan `text-ink-muted` y
  que no haya `line-through`). El importe y el signo siguen sin cambiar: esa parte de
  la aserción se conserva. El test `carries the id of its movement so the notice can
  find it` no se toca y sigue en verde (C4). Cubre: R1.
- [x] T7 — `MonthTotals.vue`: frase a la vista, `<details>` cerrado con su `<summary>`,
  las cinco frases y la de los grupos al final (design §3). Cubre: R8, R9, R10, R11.
- [x] T8 — `MonthTotals.spec.ts`: test nuevo
  `shows one sentence and keeps the rest folded until it is opened` — la frase de R8
  está en `statement-totals-line`, palabra por palabra; `statement-totals-more` es un
  `<details>` sin atributo `open`; su `<summary>` dice `More about what counts`; sus
  `<li>` son las cinco frases de R10 en orden; con `ambiguousGroups: 2` hay un sexto
  `<li>` con `statement-ambiguous-note`, y con `null` y con `0` no. Corregir los tests
  del bloque `the permanent note` que citan el texto antiguo; el de «not one digit» se
  conserva sobre el texto fijo nuevo. Cubre: R8, R9, R10, R11.
- [x] T9 — `store.ts`: `totalWithoutHiding` (design §5). `store.spec.ts`: test
  `keeps the total of the month without hiding from the read it already makes` — con la
  casilla puesta vale el `pagination.total` de la segunda respuesta; `null` con la
  casilla sin poner, tras un fallo de esa lectura y al cambiar de mes. Cubre: R12, R13,
  R14.
- [x] T10 — `filters.ts`: `nothingShownLine`; `filters.spec.ts`: test
  `names the month and the checkbox when nothing is shown and the reason is unknown`.
  Cubre: R14.
- [x] T11 — `StatementList.vue`: `emptyState: 'unknown'` con
  `statement-nothing-shown` y `Show everything`; `StatementList.spec.ts`: test
  `says nothing is shown and offers Show everything while the reason is unknown`.
  Cubre: R14.
- [x] T12 — `StatementView.vue`: `emptyState` nuevo y `hidden-count` a `null` cuando el
  mes no tiene nada (design §5). Cubre: R12, R13, R14, R15.
- [x] T13 — `StatementView.spec.ts`, tests nuevos con estos nombres exactos:
  - `an empty month opened with the checkbox on says it has no movements`
    — `/movements?month=2026-10&hide=true`, las dos respuestas con `total: 0`: existe
    `statement-empty` con `No movements in October 2026.`; **no** existen
    `statement-nothing-left`, `statement-nothing-shown`, `statement-show-everything` ni
    `statement-hidden-count`. Cubre: R12, R15.
  - `a month whose movements are all hidden says so and offers Show everything`
    — misma URL, el mes con `total: 0` y la lectura sin esconder con `total: 3`: existe
    `statement-nothing-left` con `everything in this month is hidden`, existe
    `statement-show-everything`, y al pulsarlo la URL pierde `hide`. Cubre: R13.
  - `with filters and the checkbox on a month where nothing matches blames the filters`
    — filtros activos y las dos respuestas con `total: 0`: `statement-no-matches` con
    `Clear filters`, sin `Show everything`. Cubre: R12.
  - `says nothing is shown without blaming the checkbox when the second read fails`
    — la lectura sin esconder falla: `statement-nothing-shown` con la frase de R14 y
    `Show everything`. Cubre: R14.
  - `asks the backend for nothing new to tell an empty month from a hidden one`
    — con la casilla puesta, cargar el mes vacío hace exactamente dos
    `GET /api/movements`; sin la casilla, una. Cubre: C1.
  Corregir los tests existentes que citan `These figures already leave out what does
  not count` (líneas 302–303 y 985 de hoy) y revisar los del bloque de
  `statement-nothing-left`. El test `paints no notice block while there is nothing to
  say` no se toca y sigue en verde (C4).
- [x] T14 — `pnpm exec vitest run src/features/statement src/assets` y
  `pnpm type-check` en verde. Pegar la salida en el informe.

## Lote B — pruebas de navegador y guía de uso
Archivos: `e2e/statement.spec.ts`, `e2e/statement-noise-toggle.spec.ts`, `e2e/statement-exclude-from-totals.spec.ts`, `e2e/statement-fix-category.spec.ts`, `e2e/action-notice-in-view.spec.ts`, `docs/guia-de-uso.md`
Depende de: Lote A

- [x] T15 — En los cuatro `e2e/statement*.spec.ts`, la constante `NOTE_START` pasa a
  `These figures leave out the movements labelled`, y las pruebas de
  `statement-noise-toggle.spec.ts` que leen `statement-totals-note` (líneas 308 y 328
  de hoy) se ajustan a la estructura nueva. Cubre: R8, R9.
- [x] T16 — `e2e/statement-noise-toggle.spec.ts`: prueba nueva
  `an empty month with the checkbox on says it has no movements` (dos respuestas
  imitadas con `total: 0`; se ve `No movements in`, no se ve `Show everything` ni
  `Hiding`). Comprobar que la prueba existente de `statement-nothing-left` (línea 289
  de hoy) imita la lectura sin esconder con `total` mayor que 0; si no, corregir la
  imitación. Cubre: R12, R13, R15.
- [x] T17 — Lanzar las cinco pruebas de navegador de la cabecera
  (`pnpm test:e2e --project=chromium <archivos>`) y corregir las que fallen por el
  cambio de sitio de `Transfer` / `Not counted` o por el aspecto del importe. En
  `e2e/action-notice-in-view.spec.ts` no se cambia ninguna aserción sobre el aviso de
  la última acción (C4). Cubre: R1, R5.
- [x] T18 — `docs/guia-de-uso.md`: corregir lo que queda falso, sin borrar ni mover las
  anotaciones del humano (las líneas que empiezan por `--`): el paso 4 de `Movements`
  y los pasos que dicen «importe en gris» (hoy líneas 347, 441–442) pasan a «importe
  tachado y en gris»; donde se describe la nota gris, la frase nueva y que el resto se
  abre pulsando `More about what counts`; el «Fallo conocido» del mes vacío con la
  casilla puesta (hoy líneas 505–511) se sustituye por lo que hace ahora. Cubre: —
  (documento que la feature vuelve falso).
