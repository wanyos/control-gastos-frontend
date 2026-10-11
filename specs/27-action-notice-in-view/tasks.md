# Tasks — Feature 27: action-notice-in-view

> Cada task referencia los `R<n>` / `C<n>` que cubre. El implementer marca `[x]` al
> completarla. Los nombres de test entre comillas son **literales**: los `checks` de
> `feature_list.json` los buscan por ese nombre.
>
> Orden: Lote A → Lote B. Dos lotes y no más: los cambios por pantalla son de pocas
> líneas y los tests de navegador necesitan las tres pantallas ya cambiadas.

## Lote A — el bloque común, las tres pantallas y sus tests unitarios
Archivos: `src/shared/components/StickyBelowTopBar.vue`, `src/shared/components/__tests__/StickyBelowTopBar.spec.ts`, `src/features/review/components/ActionNotice.vue`, `src/features/review/components/MovementRow.vue`, `src/features/review/views/ReviewView.vue`, `src/features/review/__tests__/ActionNotice.spec.ts`, `src/features/review/__tests__/MovementRow.spec.ts`, `src/features/review/__tests__/ReviewView.spec.ts`, `src/features/statement/components/StatementActionNotice.vue`, `src/features/statement/components/StatementRow.vue`, `src/features/statement/views/StatementView.vue`, `src/features/statement/__tests__/StatementActionNotice.spec.ts`, `src/features/statement/__tests__/StatementRow.spec.ts`, `src/features/statement/__tests__/StatementView.spec.ts`, `src/features/transfers/components/TransfersActionNotice.vue`, `src/features/transfers/views/TransfersView.vue`, `src/features/transfers/__tests__/TransfersActionNotice.spec.ts`, `src/features/transfers/__tests__/TransfersView.spec.ts`, `src/assets/theme-dark.css`
Depende de: —

- [x] T1 — `StickyBelowTopBar.vue` (design §3): el `div` con sus clases, el slot y la
  prop `keepClearOf`. Cubre: R1–R5, R9, R10.
- [x] T2 — `StickyBelowTopBar.spec.ts`: (a) **«renders its slot inside a block that
  sticks below the top bar on the page background»**: el slot está dentro y el `div`
  lleva `sticky`, el `top` de la barra superior, el fondo de la página y el nivel
  `--z-sticky`. Las clases se componen en el test, no se escriben literales (el escaneo
  de Tailwind lee los tests, `docs/stack.md`); (b) **«moves the page up by the overlap
  when the row to keep clear is under the block»**: con `getBoundingClientRect` del
  bloque (`top` 60, `bottom` 100) y de la fila (`top` 80, `bottom` 136) sustituidos,
  `window.scrollBy` recibe `{ top: -20 }`, una sola vez; (c) **«leaves the page alone
  when there is nothing to keep clear»**: sin selector, con un selector que no encuentra
  nada, con la fila ya por debajo (`top` 120) y con la fila entera por encima del bloque
  (`bottom` 40), `scrollBy` no se llama; (d) al cambiar `keepClearOf` vuelve a medir.
  Cubre: R9, R10, R11.
- [x] T3 — Los tres `*ActionNotice.vue` (design §5): `Undo` en `secondary`, sin icono,
  sin `import { Undo2 }`; comentario de cabecera al día. Cubre: R8, C4.
- [x] T4 — En **los tres** `*ActionNotice.spec.ts`, un test con este nombre exacto:
  **«the Undo button shows the word Undo with a border and no icon»**: el botón no
  contiene ningún `svg`, su texto es `Undo` y lleva las clases de borde y fondo de la
  variante `secondary`. Los tests que ya hay en esos tres archivos pasan; si alguno
  afirmaba el icono o `ghost`, se corrige y se dice cuál en el informe. Cubre: R8, C4.
- [x] T5 — `MovementRow.vue` y `StatementRow.vue`: `:data-movement-id="movement.id"` en
  el `<li>` raíz. Un test en cada `*Row.spec.ts`: **«carries the id of its movement so
  the notice can find it»**. Cubre: R11.
- [x] T6 — `ReviewView.vue` (design §4): `StickyBelowTopBar` con `v-if="hasNotice"`
  alrededor de los dos avisos, que siguen en `v-if` / `v-else`; `touchedRow`. Cubre:
  R1, R4, R5, R11, R12, C1, C2, C5.
- [x] T7 — `ReviewView.spec.ts`: (a) **«paints no notice block while there is nothing to
  say»**: recién cargada, no existe `[data-test="sticky-below-top-bar"]`; (b) tras
  confirmar una fila, `action-summary` y `action-undo` están dentro del bloque; (c) con
  una regla recién creada, dentro del bloque está `rule-created-notice` y **no**
  `action-summary`; tras una acción de fila es al revés (C5); (d) tras categorizar la
  fila 12, el bloque recibe `keepClearOf` = `[data-movement-id="12"]`; tras una acción
  en bloque, `null`; (e) tras un fallo, `action-error` está dentro del bloque. Los tests
  que ya hay pasan sin tocar sus aserciones. Cubre: R1, R4, R5, R11, R12, C5.
- [x] T8 — `StatementView.vue` y `StatementView.spec.ts`: lo mismo que T6 y T7 (a), (b),
  (d) y (e) con `statement-action-summary`, `statement-action-undo` y
  `statement-action-error`; el test (a) lleva el mismo nombre literal. Además: el bloque
  es hermano anterior de `statement-selection-bar` / `statement-start-selecting`, que no
  cambian (C6). Cubre: R2, R5, R11, R12, C6.
- [x] T9 — `TransfersView.vue` y `TransfersView.spec.ts`: lo mismo que T7 (a), (b) y (e)
  con `transfers-action-*`; el test (a) lleva el mismo nombre literal; el bloque no
  recibe `keepClearOf`. Cubre: R3, R5, R12.
- [x] T10 — `pnpm test:unit` entero y `pnpm type-check`. Si `theme-dark.spec.ts` pide un
  par de colores sin medir, añadir su línea `contrast:` en `theme-dark.css`; si no, ese
  archivo no se toca. Pegar las dos salidas en el informe. Cubre: C4, C8.

## Lote B — los tests de navegador y los documentos
Archivos: `e2e/action-notice-in-view.spec.ts`, `docs/architecture.md`, `docs/stack.md`
Depende de: Lote A

- [x] T11 — `e2e/action-notice-in-view.spec.ts`: red de seguridad (`**/api/**` abortado
  y apuntado en una lista que debe acabar vacía), respuestas imitadas con listas largas
  (≥ 60 filas en `Review` y en `Movements`, ≥ 20 parejas en `Transfers`) y la función
  `expectInView` de design §7. Antes de cada acción «desde abajo» el test baja hasta el
  final y afirma que `window.scrollY` es mayor que 0. Cubre: R1–R7.
- [x] T12 — Tests de `Review`, con estos nombres exactos: **«Review keeps the summary and
  its Undo in view after confirming the last row»** (`1 movement confirmed` y
  `action-undo`, los dos con `expectInView`); **«Review keeps the summary and its Undo in
  view after giving a category to the last row»**; **«Review keeps the rule notice and
  Apply rules now in view from the bottom of the list»** (crear la regla desde la última
  fila). Cubre: R1, R4.
- [x] T13 — Tests de `Movements`: **«Movements keeps the summary and its Undo in view
  after changing the category of the last line»**; **«Movements keeps the summary and its
  Undo in view at the end of the month after excluding a line»** (activar la selección,
  marcar la última línea, pulsar `Exclude from totals`, volver a bajar hasta el final:
  `1 movement excluded from totals` y `statement-action-undo` con `expectInView`).
  Cubre: R2, C6.
- [x] T14 — **«Transfers keeps the summary and its Undo in view after unlinking the last
  pair»**. Cubre: R3.
- [x] T15 — **«at the top of the page the notice sits between the same blocks as
  before»**: en las tres pantallas, con `scrollY` 0 y tras una acción sobre la primera
  fila, el aviso está por debajo del bloque que hoy tiene encima (`ReviewFilterBar` o
  `ReviewActionBar`; `MonthTotals`; el título `Transfers`) y por encima del que tiene
  debajo, sin solaparse con ninguno, y su borde superior queda **por debajo** de los
  60 px (no está pegado). Cubre: R6.
- [x] T16 — **«Undo pressed from the bottom of the list puts the row back»**: en `Review`
  (confirmar la última fila, `Undo`, la fila vuelve y el cuerpo del `PATCH` es el
  contrario) y en `Movements` (categoría de la última línea, `Undo`, vuelve la de
  antes); tras el `Undo`, `scrollY` sigue siendo mayor que 0. Cubre: R7, C1.
- [x] T17 — **«a failed action shows its error in view from the bottom of the list»**: el
  `PATCH` (y el `DELETE` de `Transfers`) responde con error; `action-error`,
  `statement-action-error` y `transfers-action-error` con `expectInView`. Cubre: R5.
- [x] T18 — **«the notice does not cover the row that was just changed»**: en `Review` y
  en `Movements`, bajar hasta dejar el borde superior de una fila a la altura del borde
  inferior de la barra superior, cambiarle la categoría y afirmar que el borde superior
  de esa fila queda ≥ el borde inferior del aviso. Cubre: R9, R11.
- [x] T19 — **«an open dialog paints over the notice»**: con un aviso pegado en `Review`,
  abrir el diálogo de nueva regla desde una fila; `document.elementFromPoint` en el
  centro del aviso no devuelve un elemento del aviso. Cubre: R10.
- [x] T20 — `pnpm test:e2e --project=chromium` entero: los once archivos que ya había
  pasan **sin tocarlos**. Pegar la salida en el informe. Cubre: C1, C4.
- [x] T21 — `docs/architecture.md` y `docs/stack.md` (design §8). Cubre: C8.
- [x] T22 — `./init.sh` completo y `./init.sh --checks 27`. Pegar las dos salidas.
