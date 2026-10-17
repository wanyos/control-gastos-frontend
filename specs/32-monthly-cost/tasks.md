# Tasks — F32 `monthly-cost`

Dos lotes en secuencia: el código entero en uno (la vista no se prueba sin el servicio, el
store y los componentes, y el router monta la vista) y los documentos después, cuando ya se
sabe qué quedó.

Los nombres de test van entre comillas invertidas tal cual: los `checks` de
`feature_list.json` los filtran por ese nombre exacto. No los cambies.

## Lote A — la pantalla y su entrada en el menú
Archivos: `src/features/monthly-cost/types.ts`, `src/features/monthly-cost/service.ts`, `src/features/monthly-cost/texts.ts`, `src/features/monthly-cost/store.ts`, `src/features/monthly-cost/components/BillRow.vue`, `src/features/monthly-cost/components/BillList.vue`, `src/features/monthly-cost/components/GroupRow.vue`, `src/features/monthly-cost/components/ChargeList.vue`, `src/features/monthly-cost/components/BlockHeading.vue`, `src/features/monthly-cost/views/MonthlyCostView.vue`, `src/features/monthly-cost/__tests__/fixtures.ts`, `src/features/monthly-cost/__tests__/service.spec.ts`, `src/features/monthly-cost/__tests__/texts.spec.ts`, `src/features/monthly-cost/__tests__/store.spec.ts`, `src/features/monthly-cost/__tests__/BillRow.spec.ts`, `src/features/monthly-cost/__tests__/MonthlyCostView.spec.ts`, `src/router/index.ts`, `src/router/__tests__/router.spec.ts`, `e2e/monthly-cost.spec.ts`
Depende de: —

- [x] T1 — `types.ts` y `fixtures.ts` (design §2 y §6): la respuesta cruda inventada que
  cuadra (`monthlyTotal` `356.05`) y la vacía del contrato. Sin nombres de personas, de
  comercios reales ni números de cuenta reales. Cubre: R4–R17 (soporte).
- [x] T2 — `service.ts`: `RECURRING_EXPENSES_PATH`, `parseRecurringExpenses`,
  `getRecurringExpenses` (design §2). Tests en `service.spec.ts`:
  `reads the recurring expenses response of the contract`,
  `asks the recurring expenses path with no method and no body`,
  `reads an unknown periodicity as text`,
  `rejects a response whose monthly costs do not add up to the monthly total`
  (cambia un `monthlyCost` de la fixture y espera `ValidationError` con
  `monthly costs do not add up to monthlyTotal`). Cubre: R2, R7, R15.
- [x] T3 — `texts.ts` (design §3 y §4, textos exactos). Tests en `texts.spec.ts`:
  `names each periodicity in words and leaves an unknown one as it comes`,
  `splits the bills with no charges in the period and keeps the order`,
  `adds up each block in exact cents`,
  `writes singular and plural in every counted line`,
  `tells the change of a bill without computing it`. Cubre: R5, R7, R8, R9, R14.
- [x] T4 — `store.ts` (design §5). Tests en `store.spec.ts`:
  `keeps only the answer of the latest load`, `keeps the error and never throws`.
  Cubre: R2, R16.
- [x] T5 — `ChargeList.vue`, `BillRow.vue`, `BillList.vue`, `GroupRow.vue`,
  `BlockHeading.vue` (design §5). Tests en `BillRow.spec.ts`:
  `shows a bill with its name, monthly cost, periodicity, last charge and increase`,
  `marks a bill that went up apart from one that went down or stayed the same`
  (solo la subida lleva el badge de tono `negative`; bajada, igual y sin cargo anterior,
  texto atenuado y sin badge),
  `shows an annual bill as yearly with its usual amount each time`,
  `opens a bill and lists its charges with date and amount`
  (`Show charges` → lista con `formatDate` y `formatMoney` de cada cargo, botón
  `Hide charges`, `aria-expanded`; otro clic la cierra). Cubre: R6, R7, R8, R10.
- [x] T6 — `MonthlyCostView.vue`. Tests en `MonthlyCostView.spec.ts`:
  `shows the monthly total and the period it comes from at the top`,
  `says how many bills went up under the total`,
  `keeps the bills from most to least expensive a month`,
  `puts the bills with no charges in the period at the end and folded`
  (`<details>` sin `open` tras cargar, con su `summary`, después de la última fila con
  cargos),
  `shows what is sent to people as a group apart with its monthly cost`,
  `shows the variable spending by category with the monthly cost of each`
  (incluida la fila `No category`),
  `opens the group sent to people and a category to list their charges`,
  `shows block subtotals that add up to the figure at the top`
  (los tres `block-subtotal` y `monthlyTotal`, tal cual de la fixture; cada entrada de la
  respuesta tiene su fila, también las plegadas),
  `shows a loading line and no figures until the answer arrives`,
  `says the backend failed and asks again on Try again`
  (primera respuesta 500 → mensaje y botón; clic → segunda petición, que responde bien y
  pinta las cifras),
  `shows the figure and one sentence when nothing counts`.
  Cubre: R3, R4, R5, R9, R11, R12, R13, R14, R16, R17.
- [x] T7 — `src/router/index.ts`: ruta `/monthly-cost` justo después de `overview`, con
  `ReceiptEuro`. En `router.spec.ts`, añade `/monthly-cost` y `Monthly cost` a las listas
  existentes (renombra `declares the seven navigable routes with English paths` a
  `declares the eight navigable routes with English paths`) y añade
  `lists Monthly cost in the menu right below Overview` (monta `MonthlyCostView`, etiqueta
  e icono). Cubre: R1.
- [x] T8 — `e2e/monthly-cost.spec.ts` (design §6):
  `reads the monthly cost from the menu, opens a bill and the folded ones, and only reads`.
  Las respuestas simuladas de `GET /api/movements`, si hay, llevan `deposit: null` en cada
  movimiento. Al final, ninguna petición no prevista y solo `GET`. Cubre: R1, R2, R9, R10.
- [x] T9 — `./init.sh` en verde y `./init.sh --checks 32` en verde. Cubre: —.

## Lote B — los documentos que esta feature vuelve incompletos
Archivos: `docs/architecture.md`, `docs/stack.md`, `docs/guia-de-uso.md`
Depende de: Lote A

- [x] T10 — `docs/architecture.md`: en el árbol de §Estructura de carpetas, la carpeta
  `monthly-cost/` con lo que hay en cada archivo (como `overview/`), y un párrafo corto:
  solo lee, una petición, las cifras son del backend salvo los subtotales de cada bloque
  (suma en céntimos de cifras ya redondeadas, y el servicio rechaza una respuesta que no
  cuadra), no depende de ninguna otra feature salvo `statement/months.ts`
  (`formatMonthLabel`). Cubre: —.
- [x] T11 — `docs/stack.md` §Iconos (Lucide): línea `Feature #32: ReceiptEuro, la entrada
  Monthly cost del menú.` Cubre: —.
- [x] T12 — `docs/guia-de-uso.md`: una fila nueva en «Mapa de la aplicación» y una sección
  nueva `## 2b. \`Monthly cost\` — solo mira` justo después del bloque «Mis notas de esta
  prueba» de la sección 2 (sin renumerar las demás), con «Para qué sirve», «Qué probar»,
  «Lo que no hace o hace a medias» (no recarga tras importar mientras estás en ella; la
  cuenta de cada cargo no sale) y un bloque «Mis notas de esta prueba» vacío como los
  demás. **La guía tiene notas del humano**: las líneas que empiezan por `--` y los bloques
  «Mis notas de esta prueba» no se tocan, y no se pone texto nuevo encima de un `-- ok`
  suyo. Fecha las cifras que cites (`medido el …`). Cubre: —.
