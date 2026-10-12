# Resumen — feature 28 `repeated-labels`

Fecha de cierre: 2026-10-12
Intención original: `feature_list.json` → feature `repeated-labels`, bloque `intent`

## Qué hace ahora la app que antes no

Cada cuenta se lee una sola vez, como el banco y sus cuatro últimos dígitos
(`Bankinter ···6182`), igual en todas las pantallas. Y en los desplegables de
categoría cada categoría sale una sola vez.

### Qué verás distinto en cada pantalla

Los números de los ejemplos son inventados.

| Pantalla | Antes | Ahora |
| --- | --- | --- |
| `Movements`, desplegable `Account` y cada línea | `Bankinter · bankinter ···6182` | `Bankinter ···6182` |
| `Movements`, la frase que resume los filtros | `… · Account bankinter ···6182` | `… · Account Bankinter ···6182` |
| `Review`, desplegable de cuenta y cada fila | `Bankinter · bankinter ···6182` | `Bankinter ···6182` |
| `Transfers`, las dos líneas de cada pareja y el diálogo que pregunta antes de desenlazar | `n26 ···7719` | `N26 ···7719` |
| `Net Worth`, la fila de cada cuenta | el `alias`, y debajo otra vez `···· 1332` | `Bankinter ···1332`; debajo solo el tipo de cuenta y la fecha |
| `Import`, la cuenta que acaba de crear una importación | `bankinter 0236` | `Bankinter ···0236` |
| Los seis desplegables de categoría (línea de `Movements`, filtro `Category` de `Movements`, fila de `Review`, barra de `Review` al marcar varias, filtro de `Review`, diálogo de reglas) | cada categoría dos veces: como título de grupo y como opción | cada categoría una vez, como opción suelta |

### Qué se queda sin cambiar

- En `Transfers`, los movimientos de un grupo dudoso siguen leyéndose con el
  `alias` (`n26 ···7719`, en minúscula). El backend ahí no manda el banco ni el
  IBAN.
- En el informe de `Import`, las listas de saldos que no cuadran y de traspasos
  dudosos siguen con el `alias`, por lo mismo.
- El orden de las categorías, lo que envía cada desplegable y qué categorías se
  ofrecen a cada movimiento.
- El backend: no se ha tocado ni se le pide nada nuevo.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| La función que da el nombre de una cuenta | [accounts.ts:34](../../src/shared/accounts.ts#L34) |
| El desplegable `Account` de `Movements` | [StatementFilterBar.vue:147](../../src/features/statement/components/StatementFilterBar.vue#L147) |
| El desplegable de cuenta de `Review` | [ReviewFilterBar.vue:174](../../src/features/review/components/ReviewFilterBar.vue#L174) |
| El desplegable de categoría de una línea de `Movements` | [RowCategoryEditor.vue:19](../../src/features/statement/components/RowCategoryEditor.vue#L19) |
| El desplegable de categoría de una fila de `Review` | [MovementCategorySelect.vue:13](../../src/features/review/components/MovementCategorySelect.vue#L13) |

## Dónde está el código

### El nombre de una cuenta

| Qué hace | Dónde |
| --- | --- |
| Compone banco, `···` y cuatro últimos dígitos; solo el banco si el IBAN no acaba en cuatro dígitos | [accounts.ts](../../src/shared/accounts.ts) → `accountLabel` |
| `Movements`: desplegable `Account` | [StatementFilterBar.vue](../../src/features/statement/components/StatementFilterBar.vue) → `accountOptions` (usa `accountLabel`) |
| `Movements`: cada línea | [StatementRow.vue](../../src/features/statement/components/StatementRow.vue) → `accountName` |
| `Movements`: frase de los filtros activos | [StatementView.vue](../../src/features/statement/views/StatementView.vue) → uso de `accountLabel` |
| `Review`: desplegable de cuenta | [ReviewFilterBar.vue](../../src/features/review/components/ReviewFilterBar.vue) → uso de `accountLabel` |
| `Review`: cada fila | [MovementRow.vue](../../src/features/review/components/MovementRow.vue) → `accountName` |
| `Transfers`: cada pareja | [TransferPairRow.vue](../../src/features/transfers/components/TransferPairRow.vue) → `pair-leg-account` |
| `Transfers`: diálogo antes de desenlazar | [UnlinkConfirmDialog.vue](../../src/features/transfers/components/UnlinkConfirmDialog.vue) → uso de `accountLabel` |
| `Net Worth`: nombre de la fila | [BankCard.vue](../../src/features/net-worth/components/BankCard.vue) → `name: accountLabel(account)` |
| `Net Worth`: fuera la segunda aparición de los dígitos | [AccountCard.vue](../../src/features/net-worth/components/AccountCard.vue) → propiedad `last4`, quitada |
| `Import`: la cuenta recién creada | [details.ts](../../src/features/import/details.ts) → `statementRow`; [ImportedFileList.vue](../../src/features/import/components/ImportedFileList.vue) → `new-account-name` |

### Los desplegables de categoría

En los seis, una categoría sin subcategorías es un `<option>` suelto y una con
subcategorías sigue siendo un `<optgroup>`.

| Qué desplegable | Dónde |
| --- | --- |
| Línea de `Movements` | [RowCategoryEditor.vue](../../src/features/statement/components/RowCategoryEditor.vue) |
| Filtro `Category` de `Movements` | [StatementCategorySelect.vue](../../src/features/statement/components/StatementCategorySelect.vue) |
| Fila de `Review` | [MovementCategorySelect.vue](../../src/features/review/components/MovementCategorySelect.vue) |
| Barra de `Review` al marcar varias | [ReviewActionBar.vue](../../src/features/review/components/ReviewActionBar.vue) |
| Filtro de `Review` | [CategorySelect.vue](../../src/features/review/components/CategorySelect.vue) |
| Diálogo de reglas | [RuleDialog.vue](../../src/features/category-rules/components/RuleDialog.vue) |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| La función: formato, no usa el `alias`, dos cuentas del mismo banco, banco desconocido, IBAN con espacios, IBAN que no acaba en cuatro dígitos | [accounts.spec.ts](../../src/shared/__tests__/accounts.spec.ts) → `accountLabel (feature 28)` |
| Desplegable `Account` de `Movements`, y dos cuentas del mismo banco en él | [StatementFilterBar.spec.ts](../../src/features/statement/__tests__/StatementFilterBar.spec.ts) → `names each account as the bank…`, `tells two accounts of the same bank apart in the select` |
| Línea de `Movements` | [StatementRow.spec.ts](../../src/features/statement/__tests__/StatementRow.spec.ts) → `names the account as the bank…` |
| Frase de los filtros de `Movements` | [StatementView.spec.ts](../../src/features/statement/__tests__/StatementView.spec.ts) |
| Desplegable de cuenta de `Review` | [ReviewFilterBar.spec.ts](../../src/features/review/__tests__/ReviewFilterBar.spec.ts) → `names each account as the bank…` |
| Fila de `Review` | [MovementRow.spec.ts](../../src/features/review/__tests__/MovementRow.spec.ts) → `names the account as the bank…` |
| Pareja de `Transfers` y su diálogo | [TransferPairRow.spec.ts](../../src/features/transfers/__tests__/TransferPairRow.spec.ts), [UnlinkConfirmDialog.spec.ts](../../src/features/transfers/__tests__/UnlinkConfirmDialog.spec.ts), [transfer-pairs-review.spec.ts](../../e2e/transfer-pairs-review.spec.ts) |
| `Net Worth`: nombre, y los dígitos una sola vez | [NetWorthView.spec.ts](../../src/features/net-worth/__tests__/NetWorthView.spec.ts) → `names each account as the bank… (feature 28)`, `shows the last four digits of an account only once in its row (feature 28)` |
| `Import`: la cuenta recién creada | [details.spec.ts](../../src/features/import/__tests__/details.spec.ts), [ImportedFileList.spec.ts](../../src/features/import/__tests__/ImportedFileList.spec.ts) → los dos tests `(feature 28)` |
| Categoría sin subcategorías, una vez | [RowCategoryEditor.spec.ts](../../src/features/statement/__tests__/RowCategoryEditor.spec.ts), [ReviewActionBar.spec.ts](../../src/features/review/__tests__/ReviewActionBar.spec.ts), [MovementCategorySelect.spec.ts](../../src/features/review/__tests__/MovementCategorySelect.spec.ts), [CategorySelect.spec.ts](../../src/features/review/__tests__/CategorySelect.spec.ts), [RuleDialog.spec.ts](../../src/features/category-rules/__tests__/RuleDialog.spec.ts) → `offers a category without subcategories once, with no group title` |
| Categoría con subcategorías, agrupada | [MovementCategorySelect.spec.ts](../../src/features/review/__tests__/MovementCategorySelect.spec.ts) → `groups a category that has subcategories under its name`; [RowCategoryEditor.spec.ts](../../src/features/statement/__tests__/RowCategoryEditor.spec.ts) → `keeps a category with subcategories as a group, itself first (feature 28)` |
| Datos de cuenta de los tests, sustituidos por inventados | [accounts.spec.ts](../../src/shared/__tests__/accounts.spec.ts), [transfers/fixtures.ts](../../src/features/transfers/__tests__/fixtures.ts), [AmbiguousGroupCard.spec.ts](../../src/features/transfers/__tests__/AmbiguousGroupCard.spec.ts), [transfers/service.spec.ts](../../src/features/transfers/__tests__/service.spec.ts), [filters.spec.ts](../../src/features/statement/__tests__/filters.spec.ts), [statement/fixtures.ts](../../src/features/statement/__tests__/fixtures.ts), [statement.spec.ts](../../e2e/statement.spec.ts), [statement-noise-toggle.spec.ts](../../e2e/statement-noise-toggle.spec.ts) |

## Cumplimiento de la intención

Resultado real de `./init.sh --checks 28`, lanzado por el reviewer: 8 de 8 en
verde. Cada test de abajo se comprobó además que falla si se deshace el cambio.

- ✅ "En `Movements`, el desplegable `Account` nombra cada cuenta sin repetir el
  banco." → `StatementFilterBar.spec.ts`. Check 1: ✅
- ✅ "En `Movements`, cada línea de la lista nombra la cuenta sin repetir el
  banco." → `StatementRow.spec.ts`. Check 2: ✅
- ✅ "En `Review`, lo mismo en el desplegable de cuenta y en cada fila." →
  `ReviewFilterBar.spec.ts` y `MovementRow.spec.ts`. Check 3: ✅ (ejecuta los dos)
- ✅ "En cualquier otra pantalla donde salga una cuenta (`Transfers`,
  `Net Worth`), se nombra igual que en estas." → `TransferPairRow.spec.ts` y
  `NetWorthView.spec.ts`. Check 4: ✅ (ejecuta los dos). Excepción: los grupos
  dudosos de `Transfers`, ver «Qué se queda sin cambiar».
- ✅ "Al pulsar la etiqueta de categoría de una línea en `Movements`, cada
  categoría sale una sola vez." → `RowCategoryEditor.spec.ts`. Check 5: ✅
- ✅ "En `Review`, lo mismo en el desplegable de categoría de cada fila y en el
  de la barra que sale al marcar varias." → `MovementCategorySelect.spec.ts` y
  `ReviewActionBar.spec.ts`. Check 6: ✅ (ejecuta los dos)
- ✅ "Sigo distinguiendo dos cuentas del mismo banco, si algún día las tengo." →
  `accounts.spec.ts`. Check 7: ✅
- ✅ "Si algún día una categoría tiene subcategorías, salen agrupadas bajo
  ella." → `MovementCategorySelect.spec.ts`. Check 8: ✅

## Decisiones que se tomaron por ti

- (delegado) La lista de sitios donde se nombra una cuenta: los de la tabla de
  arriba. Además de los que nombraba la feature, se cambiaron la frase de los
  filtros de `Movements`, el diálogo de `Transfers` y la cuenta recién creada de
  `Import`.
- (delegado) Una categoría con subcategorías sigue saliendo como grupo, con ella
  misma primero.
- (añadido) El filtro `Category` de la barra de `Movements`, que no estaba en la
  lista de la feature y repetía igual.
- (añadido) En `Net Worth` se quitó la segunda aparición de los cuatro dígitos
  de cada fila (decisión del leader).
- (añadido) Si el IBAN de una cuenta no acaba en cuatro dígitos, se lee solo el
  banco, sin `···`.
- (añadido) Los números de cuenta, `id` y saldos que había en los tests se
  sustituyeron por inventados.

## Qué NO se tocó / quedó fuera

- Los tres sitios que siguen con el `alias` (grupos dudosos de `Transfers` y dos
  listas del informe de `Import`): para igualarlos hace falta que el backend
  mande el banco y el IBAN ahí.
- No se ha visto en el navegador con los datos reales: está apuntado en
  `docs/roadmap.md`, fila 32 de los cabos sueltos.
- Los números de cuenta que había en el archivo de tests siguen en el histórico
  de git: fila 31 de los cabos sueltos, decisión tuya.

## Notas para el futuro

- `feature_list.json` (líneas 1323 y 1328) conserva en el ejemplo de esta
  feature los cuatro últimos dígitos de una cuenta real.
- `docs/architecture.md` no lista `src/shared/accounts.ts` en el árbol de
  `shared/`.
