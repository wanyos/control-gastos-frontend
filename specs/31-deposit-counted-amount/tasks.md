# Tasks — F31 `deposit-counted-amount`

Dos lotes en secuencia. El código va en un solo lote a propósito: hacer obligatorio
`deposit` en la lectura (R1) rompe los fixtures de `statement` y `review` hasta que se les
añade `deposit: null`, así que `shared/`, `statement` y `review` no pueden acabar en verde
por separado.

Los nombres de test van entre comillas invertidas tal cual: los `checks` de
`feature_list.json` los filtran por ese nombre exacto. No los cambies.

## Lote A — leer `deposit` y pintarlo en `Movements` y `Review`
Archivos: `src/shared/movements.ts`, `src/shared/deposits.ts`, `src/shared/__tests__/movements.spec.ts`, `src/shared/__tests__/deposits.spec.ts`, `src/assets/theme-dark.css`, `src/features/statement/components/StatementRow.vue`, `src/features/statement/components/MonthTotals.vue`, `src/features/statement/components/StatementList.vue`, `src/features/statement/store.ts`, `src/features/statement/views/StatementView.vue`, `src/features/statement/__tests__/fixtures.ts`, `src/features/statement/__tests__/StatementRow.spec.ts`, `src/features/statement/__tests__/MonthTotals.spec.ts`, `src/features/statement/__tests__/StatementList.spec.ts`, `src/features/statement/__tests__/StatementView.spec.ts`, `src/features/statement/__tests__/store.spec.ts`, `src/features/statement/__tests__/service.spec.ts`, `src/features/review/components/MovementRow.vue`, `src/features/review/store.ts`, `src/features/review/__tests__/fixtures.ts`, `src/features/review/__tests__/MovementRow.spec.ts`, `src/features/review/__tests__/store.spec.ts`, `src/features/review/__tests__/service.spec.ts`, `src/features/review/__tests__/ReviewView.spec.ts`, `src/features/overview/__tests__/fixtures.ts`, `src/features/category-rules/__tests__/fixtures.ts`, `src/features/import/__tests__/fixtures.ts`, `e2e/action-notice-in-view.spec.ts`, `e2e/category-rules.spec.ts`, `e2e/overview.spec.ts`, `e2e/review-actions.spec.ts`, `e2e/review-queue.spec.ts`, `e2e/statement-exclude-from-totals.spec.ts`, `e2e/statement-fix-category.spec.ts`, `e2e/statement-noise-toggle.spec.ts`, `e2e/statement.spec.ts`
> **Corrección del leader (2026-10-16):** se añaden a esta cabecera los nueve archivos de `e2e/` cuyas respuestas simuladas de `GET /api/movements` no traen `deposit`. Desde R1 la pantalla da error si falta, y design §2 ya pedía añadir `deposit: null` a los movimientos de prueba. Solo se les añade ese campo; ninguna aserción cambia.
Depende de: —

- [x] T1 — `src/shared/movements.ts`: tipos `DepositKind`, `DepositReason`,
  `MovementDeposit`; `Movement.deposit?`; `parseDeposit`; cuarto argumento de
  `parseMovement` (`'required' | 'absent'`), `'required'` solo desde `parseMovementPage`
  (design §2). Test en `movements.spec.ts`:
  `reads the deposit of every movement and rejects a missing one` (lee los cuatro ejemplos
  del contrato y `null`; falta la clave → `ValidationError` con `movements[0].deposit`;
  `kind` o `reason` fuera de la enumeración → `ValidationError`; un PATCH sin la clave se
  lee sin error). Cubre: R1.
- [x] T2 — Añadir `deposit: null` a los movimientos crudos de `GET /api/movements` en los
  fixtures de `statement`, `review`, `overview`, `category-rules` e `import` (y en las
  respuestas crudas escritas dentro de los specs de la cabecera, si las hay). Nada más en
  esos archivos de otras features. Toda la suite en verde tras T1 + T2. Cubre: R1.
- [x] T3 — `src/shared/deposits.ts` con `hiddenWhenHiding`, `depositCountsNothing`,
  `depositLine`, `countedLine`, `withKnownDeposit` y los textos de design §4. Tests en
  `deposits.spec.ts`: `writes the line of each kind of deposit movement and of each doubtful reason`
  y `keeps the deposit a PATCH answer does not carry`. Cubre: R2, R4, R5, R7.
- [x] T4 — `src/assets/theme-dark.css`: línea
  `contrast: --warning on --surface-sunken >= 4.5 (deposit: doubtful text on a hovered row)`.
  `theme-dark.spec.ts` la mide sin tocarlo; si no llega a 4.5, para y repórtalo (no cambies
  colores del tema). Cubre: R15.
- [x] T5 — Fixtures de depósito en `src/features/statement/__tests__/fixtures.ts`: una
  apertura de 25000.00, una cancelación, un vencimiento resuelto de 25037.07 con
  `countedAmount` 37.07 y un vencimiento dudoso `principal_not_found`, en octubre de 2026,
  con descripciones inventadas del estilo `APERTURA DEP. 000001` (sin números de cuenta
  reales). Mismos cuatro en `src/features/review/__tests__/fixtures.ts`, `status`
  `pending_review`. Cubre: R3–R9 (soporte).
- [x] T6 — `StatementRow.vue`: R3–R8 según design §3. Tests en `StatementRow.spec.ts`:
  `crosses out a deposit opening and a deposit cancellation and greys their description`,
  `writes the kind of deposit movement under the description next to the account`,
  `shows on a deposit maturity the bank amount and under it only the interest that counts`
  (espera `25.037,07 €` sin tachar y `Counts 37,07 €` en `text-positive`),
  `keeps the bank amount and its sign on every deposit movement`,
  `shows a doubtful deposit with its reason and its amount crossed out`,
  `never writes Transfer or Not counted on a deposit movement` (con `transferId` y
  `excludedFromTotals: true` puestos en el fixture). Los tests de la F29 siguen pasando
  sin tocarlos. Cubre: R3, R4, R5, R6, R7, R8.
- [x] T7 — `MovementRow.vue` de `Review`: mismas reglas con `deposit.ts`. Tests en
  `src/features/review/__tests__/MovementRow.spec.ts`:
  `paints a deposit line in Review the same way as in Movements` y
  `leaves the lines of Review that are not deposits as they were`. Cubre: R9.
- [x] T8 — `MonthTotals.vue`: `FIGURES_LINE` nueva y sexta frase plegada (design §4).
  En `MonthTotals.spec.ts` actualiza el texto esperado y el número de frases (5 → 6) del
  test de la F29 `shows one sentence and keeps the rest folded until it is opened` **sin
  renombrarlo**, y añade `says under the figures that a deposit counts only by its interest`.
  Cubre: R10.
- [x] T9 — `statement/store.ts`, `StatementList.vue`, `StatementView.vue`: design §5
  (`visibleMovements`, `hiddenInBrowser`, `visibleTotal`, `hiddenCount` computed, `gone`
  de `adoptUpdated`). Tests en `StatementView.spec.ts`:
  `the checkbox hides deposit openings and cancellations and keeps a maturity that counts its interest`
  (y el dudoso sigue en la lista),
  `counts the hidden deposit openings and cancellations in Hiding`,
  `a month whose movements are all deposit openings says everything is hidden`
  (con el número de movimientos de la tarjeta igual a las filas visibles). Cubre: R11, R12, R13.
- [x] T10 — `adoptUpdated` conserva `deposit` (design §5) y `review/store.ts` guarda el mapa
  y lo aplica en `applyUpdated` (design §6). Tests:
  `keeps the deposit of a line after changing its category` en
  `src/features/statement/__tests__/store.spec.ts` y
  `keeps the deposit of a line that comes back with Undo` en
  `src/features/review/__tests__/store.spec.ts`. Cubre: R2.
- [x] T11 — Test en `StatementView.spec.ts`:
  `paints the backend totals untouched in a month with deposit movements` (respuesta con
  `income` 203.92 y las cuatro filas de depósito; la tarjeta enseña 203,92 € y nada sumado
  en el navegador). Cubre: R14.
- [x] T12 — `./init.sh` en verde y `./init.sh --checks 31` en verde. Cubre: todos.

## Lote B — documentos que esta feature vuelve falsos
Archivos: `docs/guia-de-uso.md`, `docs/architecture.md`
Depende de: Lote A

- [x] T13 — `docs/guia-de-uso.md`, apartados de `Movements` y `Review`: el paso 4 (los
  apuntes de depósito ya no están marcados), el paso 5 (la casilla quita también aperturas
  y cancelaciones), el paso 13 (la frase nueva y seis frases plegadas), «Nada se marca
  solo» (los depósitos ya no hay que marcarlos), y un paso nuevo para ver octubre de 2026
  (aperturas, cancelaciones, el vencimiento con `Counts 37,07 €`) y el dudoso de agosto de
  2025. **El archivo contiene notas del humano: las líneas que empiezan por `--` y los
  bloques «Mis notas de esta prueba». No se tocan, ni se mueven, ni se reescriben.**
  Cubre: R3, R5, R7, R10, R11.
- [x] T14 — `docs/architecture.md`: añadir `shared/deposits.ts` a la estructura de
  carpetas, con una línea de por qué vive en `shared/` (lo usan `statement` y `review`).
  Cubre: R9.
