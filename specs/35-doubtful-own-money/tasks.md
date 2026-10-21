# Tasks — F35 `doubtful-own-money`

Dos lotes en secuencia. Todo el código y todas las pruebas van en el Lote A a propósito:
hacer obligatorio `ownership` en la lectura (R1) rompe las respuestas simuladas de
`GET /api/movements` de muchas pruebas hasta que se les añade `ownership: null`, y el
número nuevo del menú hace una petición más en todas las pantallas de `e2e/`; nada de eso
acaba en verde por separado (lo que pasó en las features 31, 33 y 34).

Los nombres de test van entre comillas invertidas tal cual: los `checks` de
`feature_list.json` los filtran por ese nombre exacto. No los cambies.

Reglas para los archivos de otras features de la cabecera: solo se añade `ownership: null`
a los movimientos crudos de `GET /api/movements`, se quita `ownership` en las respuestas
simuladas de `PATCH` (como ya se quita `deposit`), y en `e2e/` se aplica design §9. Si un
número esperado de peticiones cambia por las lecturas nuevas, se cambia el número con un
comentario de por qué; **ningún test se renombra** y ninguna aserción cambia lo que
comprueba. Si alguno de la cabecera no necesita nada, se deja sin tocar. Si hace falta
tocar un archivo que **no** está en la cabecera, para y repórtalo.

## Lote A — leer `ownership`, la sección de `Transfers`, el número, la línea del informe y `Movements`
Archivos: `src/shared/movements.ts`, `src/shared/ownership.ts`, `src/shared/__tests__/movements.spec.ts`, `src/shared/__tests__/ownership.spec.ts`, `src/shared/__tests__/deposits.spec.ts`, `src/shared/components/AppSidebar.vue`, `src/shared/components/__tests__/AppShell.spec.ts`, `src/features/statement/components/StatementRow.vue`, `src/features/statement/store.ts`, `src/features/statement/__tests__/fixtures.ts`, `src/features/statement/__tests__/StatementRow.spec.ts`, `src/features/statement/__tests__/StatementView.spec.ts`, `src/features/statement/__tests__/StatementList.spec.ts`, `src/features/statement/__tests__/MonthTotals.spec.ts`, `src/features/statement/__tests__/store.spec.ts`, `src/features/statement/__tests__/service.spec.ts`, `src/features/review/__tests__/fixtures.ts`, `src/features/review/__tests__/service.spec.ts`, `src/features/review/__tests__/store.spec.ts`, `src/features/review/__tests__/MovementRow.spec.ts`, `src/features/review/__tests__/ReviewView.spec.ts`, `src/features/overview/__tests__/fixtures.ts`, `src/features/category-rules/__tests__/fixtures.ts`, `src/features/transfers/service.ts`, `src/features/transfers/types.ts`, `src/features/transfers/pairs.ts`, `src/features/transfers/store.ts`, `src/features/transfers/views/TransfersView.vue`, `src/features/transfers/components/DoubtfulOwnershipList.vue`, `src/features/transfers/components/DoubtfulOwnershipRow.vue`, `src/features/transfers/components/DoubtfulOwnershipCountBadge.vue`, `src/features/transfers/__tests__/fixtures.ts`, `src/features/transfers/__tests__/service.spec.ts`, `src/features/transfers/__tests__/store.spec.ts`, `src/features/transfers/__tests__/TransfersView.spec.ts`, `src/features/transfers/__tests__/DoubtfulOwnershipRow.spec.ts`, `src/features/transfers/__tests__/DoubtfulOwnershipCountBadge.spec.ts`, `src/features/import/service.ts`, `src/features/import/store.ts`, `src/features/import/summary.ts`, `src/features/import/components/ImportDialog.vue`, `src/features/import/__tests__/fixtures.ts`, `src/features/import/__tests__/store.spec.ts`, `src/features/import/__tests__/ImportDialog.spec.ts`, `src/features/import/__tests__/summary.spec.ts`, `e2e/doubtful-own-money.spec.ts`, `e2e/action-notice-in-view.spec.ts`, `e2e/app-boot.spec.ts`, `e2e/category-rules.spec.ts`, `e2e/import-dialog.spec.ts`, `e2e/manual-category-offers-rule.spec.ts`, `e2e/monthly-cost.spec.ts`, `e2e/overview.spec.ts`, `e2e/review-actions.spec.ts`, `e2e/review-queue.spec.ts`, `e2e/statement-exclude-from-totals.spec.ts`, `e2e/statement-fix-category.spec.ts`, `e2e/statement-noise-toggle.spec.ts`, `e2e/statement.spec.ts`, `e2e/transfer-pairs-review.spec.ts`
Depende de: —

- [x] T1 — `src/shared/movements.ts`: tipos `OwnershipStatus`, `MovementOwnership`;
  `Movement.ownership?`; `parseOwnership`; `parseMovement` lo exige con `'required'`;
  `MovementQuery.ownership` y `buildMovementsQuery` (design §2). Tests en
  `src/shared/__tests__/movements.spec.ts`:
  `reads the ownership of every movement and rejects a missing one` (lee `null` y los dos
  ejemplos del contrato; sin la clave → `ValidationError` con `movements[0].ownership`;
  `status` fuera de los cuatro → `ValidationError`; un `PATCH` sin la clave se lee sin
  error) y `asks only the doubtful movements when the ownership filter is set`
  (`ownership=doubtful` en la petición; sin pedirlo, no viaja). Cubre: R1.
- [x] T2 — Añadir `ownership: null` a los movimientos crudos de `GET /api/movements` de los
  fixtures y specs de `statement`, `review`, `overview`, `category-rules` e `import` de la
  cabecera, y quitar `ownership` en las respuestas simuladas de `PATCH` de los fixtures
  de `statement` y `review` (junto a donde se quita `deposit`). Toda la suite unitaria en
  verde tras T1 + T2. Cubre: R1 (soporte).
- [x] T3 — `src/shared/ownership.ts` con `isBetweenOwnAccounts`, `isDoubtfulOwnership`,
  `ownershipLine`, `withKnownOwnership` y los textos de design §5. Tests en
  `src/shared/__tests__/ownership.spec.ts`:
  `writes the line of each ownership status and nothing on a deposit` y
  `keeps the ownership a PATCH answer does not carry`. Cubre: R2, R14, R15.
- [x] T4 — Fixtures inventados en `src/features/statement/__tests__/fixtures.ts`: un
  movimiento `own` (casó una forma del nombre: `ownAccountId` null), uno `mine`, uno
  `doubtful` de gasto (`matchedText: "Banco Ficticio Norte"`, `ownAccountName:
  "Cartera inventada"`), uno `not_mine`, y un movimiento de depósito con `ownership`
  `own`. Sin nombres de personas reales, comercios reales ni números de cuenta reales.
  Cubre: R14–R16 (soporte).
- [x] T5 — `StatementRow.vue` según design §3. Tests en
  `src/features/statement/__tests__/StatementRow.spec.ts`:
  `crosses out money between your accounts and says so next to the account` (con `own` y
  con `mine`: importe `text-ink-faint line-through`, concepto `text-ink-muted`,
  `Between your accounts`),
  `paints a doubtful movement of own money with Doubtful in amber and its amount not crossed out`
  (texto que empieza por `Doubtful`, `text-warning`, importe sin `line-through`), y
  `leaves a deposit movement and a not mine movement painted as before` (el depósito con
  `own` se pinta como en la F31; `not_mine` como uno normal). Los tests de las features
  29, 31 y 34 siguen pasando sin tocarlos. Cubre: R14, R15.
- [x] T6 — `statement/store.ts` según design §6. Tests:
  `keeps the ownership of a line after changing its category` en
  `src/features/statement/__tests__/store.spec.ts`;
  `the checkbox hides money between your accounts and keeps a doubtful one` y
  `counts the hidden movements between your accounts in Hiding` en
  `src/features/statement/__tests__/StatementView.spec.ts`. Cubre: R2, R16.
- [x] T7 — `transfers/types.ts`, `transfers/service.ts` y textos de `transfers/pairs.ts`
  (design §4, §5). Tests en `src/features/transfers/__tests__/service.spec.ts`:
  `asks the doubtful movements with the ownership filter and 200 per page` y
  `sends only the ownership decision of one movement` (los tres cuerpos exactos:
  `{"ownershipDecision":"mine"}`, `"not_mine"` y `null`). Cubre: R3, R6, R7, R8.
- [x] T8 — `transfers/store.ts` (design §4). Amplía `mockApi` de
  `src/features/transfers/__tests__/fixtures.ts` con el `GET` de dudosos y el `PATCH`
  de un movimiento, y dos dudosos inventados. Los tests existentes que cuentan lecturas
  (`BOTH_READS`, `toHaveLength(2)`) pasan a contar tres, con comentario. Tests en
  `src/features/transfers/__tests__/store.spec.ts`:
  `answering it is mine sends mine for that movement and reloads the doubtful list`,
  `answering not mine sends not_mine for that movement and reloads the doubtful list`,
  `undo sends a null decision for the same movement and reloads`,
  `a rejected answer says why and leaves the list as it was` (400: texto de design §5, sin
  `Undo`, sin recargar),
  `a network failure on an answer says so and reloads`,
  `a second answer while one is in flight sends nothing`,
  `loading and reloading the screen send no answer`,
  `the doubtful count follows the last read of the list`,
  `a failed count leaves the number unknown`. Cubre: R6, R7, R8, R9, R10, R11, R12.
- [x] T9 — `DoubtfulOwnershipRow.vue`, `DoubtfulOwnershipList.vue` y la sección nueva de
  `TransfersView.vue` (design §4). Tests:
  `shows the date, account, description, signed amount and reason of a doubtful movement`
  y `disables both answers while a write is in flight` en
  `src/features/transfers/__tests__/DoubtfulOwnershipRow.spec.ts`;
  `lists the doubtful movements of own money above the doubtful transfers`,
  `says there are no doubtful movements when the list is empty` y
  `a failed read of the doubtful movements offers Try again and leaves the other sections alone`
  en `src/features/transfers/__tests__/TransfersView.spec.ts`. Los tests de la feature 24
  siguen pasando. Cubre: R3, R4, R5, R10.
- [x] T10 — `DoubtfulOwnershipCountBadge.vue` y la línea de `AppSidebar.vue` **exactamente
  como dice design §8** (no se toca `src/router/index.ts`). Tests:
  `shows the number of doubtful movements only when there are some` en
  `src/features/transfers/__tests__/DoubtfulOwnershipCountBadge.spec.ts` (con 3 sale `3`;
  con 0 y con `null`, nada); `puts the doubtful count next to Transfers and nowhere else`
  en `src/shared/components/__tests__/AppShell.spec.ts`. Cubre: R11, R12.
- [x] T11 — La línea del informe (design §7): `import/service.ts`, `import/store.ts`,
  `import/summary.ts`, `ImportDialog.vue`. Tests:
  `counts the doubtful movements that were not there before the import`,
  `leaves no new doubtful count when a read of the doubtful movements fails` y
  `refreshes the doubtful count after an import` en
  `src/features/import/__tests__/store.spec.ts`;
  `writes the line of new doubtful movements in singular and plural` en
  `src/features/import/__tests__/summary.spec.ts`;
  `says how many new doubtful movements the import brought` en
  `src/features/import/__tests__/ImportDialog.spec.ts` (con 0 nuevos no sale). Ajusta los
  números de `GET /api/movements` que cuentan los tests existentes del store de
  importación. Cubre: R12, R13.
- [x] T12 — `e2e/`: los 14 archivos de la cabecera según design §9 (`ownership: null` y la
  petición `ownership=doubtful` contestada vacía y fuera de lo que vigila cada prueba).
  Los tests con nombre en los `checks` de las features 24 a 34 conservan su nombre y
  pasan. Cubre: R1, R12 (soporte).
- [x] T13 — `e2e/doubtful-own-money.spec.ts` (nuevo, design §9). Tests:
  `answering it is mine sends one PATCH with mine and the movement leaves the list`
  (las escrituras son exactamente ese `PATCH`),
  `answering not mine and then undo puts the movement back in the list` (dos `PATCH`:
  `not_mine` y `null`), y
  `the number next to Transfers says how many doubtful movements there are` (2, y 1 tras
  responder uno). Cubre: R3, R6, R7, R8, R11.
- [x] T14 — `./init.sh` en verde y `./init.sh --checks 35` en verde; `./init.sh --checks`
  de las features 27 a 34 sigue en verde. Cubre: todos.

## Lote B — documentos que esta feature vuelve falsos
Archivos: `docs/guia-de-uso.md`, `docs/architecture.md`
Depende de: Lote A

- [x] T15 — `docs/guia-de-uso.md`: en «Mapa de la aplicación», la fila de `Transfers`
  (también responde a los dudosos de dinero propio) y la del botón `Import` (la línea
  nueva); en `7. Transfers`, el paso 1 deja de ser verdad (ahora son tres secciones) y
  se añaden pasos nuevos para la sección de dudosos (verla, el texto si no hay ninguno,
  `It's mine`, `Not mine`, `Undo`) y para el número junto a `Transfers`; en
  `4. Movements`, un paso para `Between your accounts` y `Doubtful`, y en el paso de la
  casilla `Hide what does not count`, que esconde también lo de entre tus cuentas; en
  `8. El botón Import`, la línea de dudosos nuevos. Hoy hay 0 dudosos: los pasos lo
  dicen. **El archivo tiene notas del humano** (líneas que empiezan por `--` y bloques
  «Mis notas de esta prueba»): no se tocan, ni se mueven, ni se reescriben, y no se
  reescribe el texto de un paso que ya tenga debajo una nota suya. El texto nuevo de un
  paso ya probado (como el 1 de `Transfers`) va en un párrafo aparte **debajo de su
  nota**. Cubre: — (documento).
- [x] T16 — `docs/architecture.md`: `shared/ownership.ts` en la estructura de carpetas (lo
  usa `statement`; vive en `shared/` como `deposits.ts`), los tres componentes nuevos de
  `transfers`, y que `AppSidebar.vue` pinta un segundo número (el de `Transfers`), como
  ya hace con el de `Review`. Cubre: — (documento).
