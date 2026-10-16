# Resumen — feature 31 `deposit-counted-amount`

Fecha de cierre: 2026-10-16
Intención original: `feature_list.json` → feature `deposit-counted-amount`, bloque `intent`
Spec: `specs/31-deposit-counted-amount/`

## Qué verás distinto

**En `Movements`:**
- Las aperturas y cancelaciones de depósito salen con el importe tachado y en gris, y bajo
  el concepto `Deposit opening` o `Deposit cancellation`: se ven como lo que no cuenta.
- Un vencimiento conserva el importe del banco (por ejemplo 25.037,07 €), en gris y sin
  tachar, y debajo, en verde, `Counts 37,07 €`. Bajo el concepto:
  `Deposit maturity · only the interest counts`.
- Un depósito dudoso (el de agosto de 2025) sale tachado y con un texto en ámbar que dice
  que es dudoso, por qué, y que de momento no cuenta.
- La frase de debajo de las cifras dice ahora que de un depósito solo cuentan los
  intereses, y el texto plegado tiene una frase más que lo explica.
- La casilla `Hide what does not count` esconde también las aperturas y cancelaciones y las
  suma en `Hiding N`. No esconde un vencimiento ni un dudoso.
- En una línea de depósito ya no salen `Transfer` ni `Not counted`.

**En `Review`:** las líneas de depósito se ven igual que en `Movements`. Si cambias la
categoría de una o la deshaces con `Undo`, sigue diciendo cuánto cuenta.

## Qué no hace

- No cambia las cifras de arriba: siguen siendo las del backend.
- No toca el backend ni permite cambiar desde aquí cuánto cuenta un depósito.
- No cambia el aspecto del resto de movimientos.
- No hay un sitio que junte todos los depósitos dudosos (queda para la idea de mejora 6),
  ni resuelve a mano el dudoso de agosto de 2025.
- Si el backend dejara de mandar el dato de depósito, la pantalla muestra un error en vez
  de pintar el vencimiento como un ingreso entero.
- Un mes de más de 200 movimientos daría un `Hiding N` corto hasta pulsar `Load more`.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| Lectura del dato de depósito que manda `GET /api/movements` | [movements.ts:234](../../src/shared/movements.ts#L234) |
| Texto bajo el concepto de una línea de depósito | [deposits.ts:34](../../src/shared/deposits.ts#L34) |
| `Counts …` de un vencimiento | [deposits.ts:45](../../src/shared/deposits.ts#L45) |
| Qué esconde la casilla en `Movements` | [store.ts:139](../../src/features/statement/store.ts#L139) |

## Dónde está el código

### Común a `Movements` y `Review`

| Qué hace | Dónde |
| --- | --- |
| Tipo del dato de depósito y su lectura | [movements.ts](../../src/shared/movements.ts) → `MovementDeposit`, `parseDeposit`, `parseMovement` |
| Qué esconde la casilla, qué cuenta 0, los textos, conservar el dato tras un PATCH | [deposits.ts](../../src/shared/deposits.ts) → `hiddenWhenHiding`, `depositCountsNothing`, `depositLine`, `countedLine`, `withKnownDeposit` |
| Contraste del ámbar sobre el fondo de la línea con el ratón encima | [theme-dark.css](../../src/assets/theme-dark.css) → comentario `contrast: --warning on --surface-sunken` |

### `Movements`

| Qué hace | Dónde |
| --- | --- |
| Lista visible, recuento y `Hiding N`, conservar el dato tras cambiar la categoría | [store.ts](../../src/features/statement/store.ts) → `visibleMovements`, `visibleTotal`, `hiddenCount`, `adoptUpdated` |
| Aspecto de la línea | [StatementRow.vue](../../src/features/statement/components/StatementRow.vue) → `depositText`, `counted`, `isDoubtful`, `isLeftOut` |
| Frase de debajo de las cifras | [MonthTotals.vue](../../src/features/statement/components/MonthTotals.vue) → `FIGURES_LINE`, `MORE_LINES` |
| Recuento `Showing …` sin lo escondido | [StatementList.vue](../../src/features/statement/components/StatementList.vue) → `total` (prop `visibleTotal`) |
| Pasa el recuento a la tarjeta y a la lista | [StatementView.vue](../../src/features/statement/views/StatementView.vue) → `store.visibleTotal` |

### `Review`

| Qué hace | Dónde |
| --- | --- |
| Aspecto de la línea | [MovementRow.vue](../../src/features/review/components/MovementRow.vue) → `depositText`, `counted`, `countsNothing` |
| Conservar el dato tras un PATCH o un `Undo` | [store.ts](../../src/features/review/store.ts) → `knownDeposits`, `adoptPage` |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| Lectura del dato y error si falta | [movements.spec.ts](../../src/shared/__tests__/movements.spec.ts) → `reads the deposit of every movement and rejects a missing one` |
| Textos y conservar el dato | [deposits.spec.ts](../../src/shared/__tests__/deposits.spec.ts) |
| Aspecto de cada línea en `Movements` | [StatementRow.spec.ts](../../src/features/statement/__tests__/StatementRow.spec.ts) |
| Frase de las cifras | [MonthTotals.spec.ts](../../src/features/statement/__tests__/MonthTotals.spec.ts) |
| Casilla, `Hiding N`, cifras del backend | [StatementView.spec.ts](../../src/features/statement/__tests__/StatementView.spec.ts) |
| Cambio de categoría en `Movements` / `Undo` en `Review` | [statement store.spec.ts](../../src/features/statement/__tests__/store.spec.ts), [review store.spec.ts](../../src/features/review/__tests__/store.spec.ts) |
| Aspecto en `Review` | [MovementRow.spec.ts](../../src/features/review/__tests__/MovementRow.spec.ts) |
| Datos de prueba con `deposit` | los `fixtures.ts` de `statement`, `review`, `overview`, `category-rules` y los `e2e/*.spec.ts` |

## Cumplimiento de la intención

Resultado real de `./init.sh --checks 31`: 10 de 10 en verde.

- ✅ Octubre de 2026, aperturas y cancelaciones se distinguen → `crosses out a deposit opening and a deposit cancellation and greys their description`. Si se ve «a simple vista» lo juzgas tú.
- ✅ El vencimiento dice que solo cuentan 37,07 € → `shows on a deposit maturity the bank amount and under it only the interest that counts`.
- ✅ Sigo viendo el importe del banco → `keeps the bank amount and its sign on every deposit movement`.
- ✅ Agosto de 2025, dudoso con motivo y sin contar → `shows a doubtful deposit with its reason and its amount crossed out`.
- ✅ La frase dice lo de los intereses → `says under the figures that a deposit counts only by its interest`.
- ✅ La casilla esconde aperturas y cancelaciones, no el vencimiento → `the checkbox hides deposit openings and cancellations and keeps a maturity that counts its interest`.
- ✅ Las cifras no cambian → `paints the backend totals untouched in a month with deposit movements`.
- ✅ (añadido) `Review` igual que `Movements` → `paints a deposit line in Review the same way as in Movements`.
- ✅ (añadido) `Hiding N` cuenta lo escondido → `counts the hidden deposit openings and cancellations in Hiding`.
- ✅ (añadido) El ámbar se lee con el ratón encima → `theme-dark.spec.ts`.

## Decisiones que se tomaron por ti

Las de la hoja de decisiones, que aprobaste: cómo se enseña el vencimiento, los textos, el
ámbar del dudoso, que la casilla no esconda un dudoso y que en una línea de depósito no
salgan `Transfer` ni `Not counted`.

## Notas para el futuro

- `docs/guia-de-uso.md` ya no pide marcar como `Not counted` los depósitos nuevos.
- `docs/roadmap.md` (líneas 46, 231 y 287) lleva una nota del 2026-10-16: los apuntes
  de depósito ya no están marcados desde la feature 57 del backend.
