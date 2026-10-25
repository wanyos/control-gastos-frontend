# Tasks — F37 `expenses-by-category`

Dos lotes en secuencia: la pantalla entera con sus pruebas unitarias, y después el menú,
el borrado de `Monthly cost`, la prueba de navegador y los documentos (la ruta importa la
vista del Lote A).

Los nombres de test van entre comillas invertidas tal cual: los `checks` de
`feature_list.json` los filtran por ese nombre exacto. No los cambies. **Ningún dato de
prueba lleva descripciones de movimientos ni comercios reales**: descripciones como
`RECIBO /ALQUILER FICTICIO` o `COMPRA SIN CATEGORIA INVENTADA` (las del ejemplo del
contrato). Los nombres de categoría pueden ser los del contrato (`Vivienda`,
`Combustible`, `Restaurantes`…). **No apuntes nada en `docs/roadmap.md`**: los cabos
sueltos los apunta el leader.

**No toques `src/features/overview/`** ni `src/shared/`: si crees que hace falta, para y
dilo.

## Lote A — la pantalla, sus datos y sus pruebas unitarias
Archivos: `src/features/expenses-by-category/types.ts`, `src/features/expenses-by-category/service.ts`, `src/features/expenses-by-category/reading.ts`, `src/features/expenses-by-category/store.ts`, `src/features/expenses-by-category/components/PeriodPicker.vue`, `src/features/expenses-by-category/components/CategoryGroup.vue`, `src/features/expenses-by-category/components/CategoryLine.vue`, `src/features/expenses-by-category/components/LineMovements.vue`, `src/features/expenses-by-category/views/ExpensesByCategoryView.vue`, `src/features/expenses-by-category/__tests__/fixtures.ts`, `src/features/expenses-by-category/__tests__/reading.spec.ts`, `src/features/expenses-by-category/__tests__/service.spec.ts`, `src/features/expenses-by-category/__tests__/store.spec.ts`, `src/features/expenses-by-category/__tests__/CategoryLine.spec.ts`, `src/features/expenses-by-category/__tests__/ExpensesByCategoryView.spec.ts`
Depende de: —

- [x] T1 — `types.ts` (design §2) y `__tests__/fixtures.ts`: la respuesta de mes del
  contrato (`?month=2026-09`, una línea fija, tres variables con una `new` sin categoría y
  una `gone`); la misma pasada a año (`?year=2025`, con `monthlyAmount`); una respuesta
  vacía (todo `0.00`, `lines: []`); una sin línea sin categoría; una cuyo `fixed.amount` no
  es la suma de sus líneas; y un cuerpo de error 400 con la forma del contrato. Cubre:
  R3–R16 (soporte).
- [x] T2 — `reading.ts` (design §5 y §6). Tests en `reading.spec.ts`:
  `reads the period from the address and falls back to the current month` (R6),
  `switching mode keeps the year of the month and comes back to the current month` (R4),
  `names a month, a whole year and part of a year` (R7),
  `builds the sentence for a closed period, a period in progress and an empty one` (R7),
  `writes the difference with its sign` (R10),
  `counts the movements with no category and their share of the spending` (R14),
  `says what failed in words` (R16). Cubre: R4, R6, R7, R10, R14, R16.
- [x] T3 — `service.ts` (design §3). Tests en `service.spec.ts`:
  `asks a month with its comparison and a year without one, with no method and no body`
  (R3, R4, R5), `maps every field of the response` (R8–R13),
  `rejects a response whose groups do not add up to the total` (R15),
  `rejects a response that does not have the contract shape` (R15). Cubre: R3, R4, R5,
  R15.
- [x] T4 — `store.ts` (design §4). Tests en `store.spec.ts`:
  `keeps only the answer of the latest load` (R6),
  `keeps a failure in error and Try again asks the same period` (R16). Cubre: R6, R16.
- [x] T5 — `LineMovements.vue`, `CategoryLine.vue` y `CategoryGroup.vue` (design §5). Tests
  en `CategoryLine.spec.ts`:
  `marks a new category and one that is gone apart from the rest` (R12),
  `draws the bar as the share of the period total` (R10),
  `shows the monthly average only in a year` (R11),
  `opens a category and lists its movements with date, description and amount` (R13),
  `a gone category has no movements to open` (R13). Cubre: R9–R13.
- [x] T6 — `PeriodPicker.vue` (reutiliza `MonthNav` de `features/statement/components`, sin
  cambiarlo) y `ExpensesByCategoryView.vue` (design §5). Tests en
  `ExpensesByCategoryView.spec.ts`, con el router en memoria y el cliente HTTP inyectado:
  `opens on the current month with fixed and variable, the total and the difference with the previous month`
  (R3, R8, R9), `shows the sentence before any figure` (R7),
  `switching to a year shows the year and the monthly average of each category` (R4,
  R11), `asks the same month last year when that comparison is chosen` (R5),
  `expanding a category lists its movements of the period` (R13),
  `says how many movements have no category and how much of the spending they are` (R14),
  `shows the total exactly as the backend sent it` (R8),
  `says the backend failed and asks again on Try again` (R15, R16),
  `says there was no spending in an empty period` (R7, R9). Cubre: R3–R16.

## Lote B — el menú, el borrado de Monthly cost, la prueba de navegador y los documentos
Archivos: `src/router/index.ts`, `src/router/__tests__/router.spec.ts`, `src/features/monthly-cost/` (la carpeta entera, se borra), `e2e/monthly-cost.spec.ts` (se borra), `e2e/expenses-by-category.spec.ts`, `docs/guia-de-uso.md`, `docs/architecture.md`, `docs/stack.md`
Depende de: Lote A

- [x] T7 — `src/router/index.ts` (design §7): fuera `MonthlyCostView`, `ReceiptEuro` y la
  ruta `/monthly-cost`; dentro la ruta `/expenses-by-category` justo después de
  `overview`, con `ChartBar`. Cubre: R1, R2.
- [x] T8 — Borrar `src/features/monthly-cost/` y `e2e/monthly-cost.spec.ts`, después de
  comprobar con `grep -rn "monthly-cost\|MonthlyCost\|recurring-expenses" src e2e` que solo
  quedan referencias en lo que se borra y en el router. Cubre: R2.
- [x] T9 — `router.spec.ts`: cambiar las listas de rutas, nombres y etiquetas, quitar
  `lists Monthly cost in the menu right below Overview` y añadir
  `lists Expenses by category in the menu right below Overview` (R1) y
  `no longer lists Monthly cost and sends its old address to the net worth home` (R2).
  Cubre: R1, R2.
- [x] T10 — `e2e/expenses-by-category.spec.ts`, con el patrón de
  `e2e/own-accounts-table.spec.ts` (una primera ruta que aborta y apunta cualquier `/api`
  no prevista; las del menú se contestan): 
  `reaches Expenses by category from the menu, sees the month and opens a category` (R1,
  R3, R9, R13), `switches to a year and sees the monthly average of each category` (R4,
  R11), `the old Monthly cost address opens the net worth` (R2). Cubre: R1–R4, R9, R11, R13.
- [x] T11 — Documentos (design §8): `docs/guia-de-uso.md` (sección 2b nueva y todas las
  menciones de `Monthly cost`), `docs/architecture.md` (árbol y párrafo) y
  `docs/stack.md` (iconos). Al acabar,
  `grep -n "Monthly cost\|monthly-cost" docs/guia-de-uso.md docs/architecture.md` solo
  puede devolver frases que digan que la pantalla se quitó en la feature 37. Cubre: R1, R2.
- [x] T12 — `pnpm type-check`, `pnpm lint:oxlint:check`, `pnpm format:check`,
  `pnpm test:unit`, `pnpm build-only` y `./init.sh` en verde; `./init.sh --checks 37` en
  verde. Cubre: todos.
