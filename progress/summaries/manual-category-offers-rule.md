# Resumen — feature 34 `manual-category-offers-rule`

Fecha de cierre: 2026-10-18
Intención original: `feature_list.json` → feature `manual-category-offers-rule`, bloque `intent`
Spec: `specs/34-manual-category-offers-rule/`

## Qué hace ahora la app que antes no

Cuando cambias a mano la categoría de un movimiento en `Movements` o en `Review`, debajo
de la línea verde del cambio y de su `Undo` sale una pregunta: si pones esa categoría
también en los demás movimientos que contienen un texto. El texto viene ya escrito (el
mismo que propondría la lista de reglas propuestas de `Rules`) y puedes cambiarlo; te
dice cuántos se moverían y, si pulsas `Show the N movements`, cuáles. `Create rule` crea
la regla y la línea verde dice cuántos movió; `No, only this one` la cierra y no envía
nada. Además, un movimiento cuya categoría puso el cierre de la importación lo dice en
gris y pequeño: `Set when the import was closed`. Y `Movements` dice ahora cuántos movió
crear una regla, también desde la ventana de `Create rule` de una línea.

**Qué no hace:**
- No pregunta si ningún otro se movería, si ya hay una regla con ese texto, si el texto
  que sale del concepto tiene menos de 5 letras, si la comprobación falla, si eliges
  `No category`, ni al dar categoría a varias filas a la vez en `Review`.
- Lo que mueve `Create rule` no se deshace desde la aplicación (borrar la regla no lo
  devuelve).
- Al decir que sí, el `Undo` del cambio a mano deja de verse, **en `Review` y también en
  `Movements`** (allí lo tapa la línea de la regla creada). La hoja solo avisaba de
  `Review`.
- No toca el backend, la ventana de `Create rule` ni la pantalla `Rules`.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| Cambiar la categoría de una fila en `Review` y preguntar | [ReviewView.vue:399](../../src/features/review/views/ReviewView.vue#L399) |
| Cambiar la categoría de una línea en `Movements` y preguntar | [StatementView.vue:313](../../src/features/statement/views/StatementView.vue#L313) |
| Pedir el preview y abrir la pregunta | [store.ts:433](../../src/features/category-rules/store.ts#L433) |
| Decir que sí: crear la regla | [store.ts:495](../../src/features/category-rules/store.ts#L495) |
| `GET /api/category-rules/preview` | [service.ts:346](../../src/features/category-rules/service.ts#L346) |

## Dónde está el código

### La pregunta

| Qué hace | Dónde |
| --- | --- |
| La pregunta en pantalla: campo del texto, número, lista plegada, botones | [OtherMovementsQuestion.vue](../../src/features/category-rules/components/OtherMovementsQuestion.vue) → `OtherMovementsQuestion` |
| Estado de la pregunta: abrir, volver a pedir al editar el texto, sí, no | [store.ts](../../src/features/category-rules/store.ts) → `question`, `offerRule`, `checkQuestionText`, `acceptQuestion`, `dismissQuestion` |
| Leer la respuesta del preview (solo los que movería la regla nueva) | [service.ts](../../src/features/category-rules/service.ts) → `getRulePreview`, `parseRulePreview`, `PREVIEW_PATH` |
| El texto propuesto de un concepto, con los pasos del contrato | [rules.ts](../../src/features/category-rules/rules.ts) → `suggestionTextOf`, `MIN_SUGGESTION_TEXT` |
| Los textos de la pregunta | [rules.ts](../../src/features/category-rules/rules.ts) → `questionHeadline`, `otherMovementsLine`, `QUESTION_HINT`, `QUESTION_NONE`, `QUESTION_CHECKING`, `QUESTION_TAKEN`, `QUESTION_CHECK_FAILED`, `TOO_SHORT` |
| Los tipos | [types.ts](../../src/features/category-rules/types.ts) → `PreviewMovement`, `RulePreview`, `QuestionCheck`, `OtherMovementsQuestionState`, `ManualChange` |
| `TOO_SHORT` pasa a importarse de `rules.ts` | [RuleDialog.vue](../../src/features/category-rules/components/RuleDialog.vue) → `TOO_SHORT` |

### Las dos pantallas

| Qué hace | Dónde |
| --- | --- |
| `Review`: la pregunta en el bloque bajo la barra; se cierra con otra acción, `Undo` o al salir | [ReviewView.vue](../../src/features/review/views/ReviewView.vue) → `onCategorizeOne`, `hasNotice`, `run`, `onConfirmOne`, `onConfirmAll`, `onCreateRule`, `onUndo` |
| `Movements`: la pregunta y la línea de la regla creada en el bloque bajo la barra | [StatementView.vue](../../src/features/statement/views/StatementView.vue) → `onCategorize`, `beforeWrite`, `onUndo`, `hasNotice`, `askOrWrite`, `confirmExclusion` |
| El cambio de una fila devuelve el movimiento que respondió el backend | [review/store.ts](../../src/features/review/store.ts) → `categorizeOne`, `runAction`, `write` |
| Lo mismo en `Movements` | [statement/store.ts](../../src/features/statement/store.ts) → `categorize`, `runWrite`, `write` |

### De dónde salió la categoría

| Qué hace | Dónde |
| --- | --- |
| Leer `categorySource` y el texto gris | [movements.ts](../../src/shared/movements.ts) → `CategorySource`, `parseMovement`, `CLOSING_SOURCE_LABEL`, `closingSourceLine` |
| Pintarlo en `Review` | [MovementRow.vue](../../src/features/review/components/MovementRow.vue) → `closingText` |
| Pintarlo en `Movements` | [StatementRow.vue](../../src/features/statement/components/StatementRow.vue) → `closingText` |

### Pruebas y documentos

| Qué hace | Dónde |
| --- | --- |
| Recorrido en el navegador en `Movements` (sí, no, editar el texto) | [manual-category-offers-rule.spec.ts](../../e2e/manual-category-offers-rule.spec.ts) |
| La pregunta a la vista desde una fila del final de `Review` | [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `the question about other movements sits under the notice and is in view from a low row` |
| Respuesta simulada del preview para las pruebas que ya existían | [statement-fix-category.spec.ts](../../e2e/statement-fix-category.spec.ts), [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `routeReview`, `routeMovements` |
| Pruebas unitarias | [store.spec.ts](../../src/features/category-rules/__tests__/store.spec.ts), [OtherMovementsQuestion.spec.ts](../../src/features/category-rules/__tests__/OtherMovementsQuestion.spec.ts), [rules.spec.ts](../../src/features/category-rules/__tests__/rules.spec.ts), [service.spec.ts](../../src/features/category-rules/__tests__/service.spec.ts), [ReviewView.spec.ts](../../src/features/review/__tests__/ReviewView.spec.ts), [StatementView.spec.ts](../../src/features/statement/__tests__/StatementView.spec.ts), [MovementRow.spec.ts](../../src/features/review/__tests__/MovementRow.spec.ts), [StatementRow.spec.ts](../../src/features/statement/__tests__/StatementRow.spec.ts), [movements.spec.ts](../../src/shared/__tests__/movements.spec.ts), los dos `store.spec.ts` de `review` y `statement`, [review/service.spec.ts](../../src/features/review/__tests__/service.spec.ts) |
| Guía de uso: pasos nuevos en `Movements` (15) y `Review` (3 y 10), y las tablas | [guia-de-uso.md](../../docs/guia-de-uso.md) |
| Mapa del código | [architecture.md](../../docs/architecture.md) |

## Cómo sé que está bien (el `intent`, punto por punto)

| Tu frase | ¿Se cumple? | Test | Check |
| --- | --- | --- | --- |
| Cambio la categoría y me pregunta | Sí | `changing the category of one row in Review opens the question under the notice`, `changing the category of one line in Movements opens the question under the notice` | ✅ |
| Antes del sí, veo cuántos y cuáles | Sí | `shows how many other movements would move and lists them before anything is created` | ✅ |
| Puedo cambiar el texto y se actualiza | Sí | `editing the text asks the preview again and the count follows it` (navegador) | ✅ |
| Si digo que sí, se crea y veo cuántos | Sí | `in Movements saying yes creates the rule and the line says how many movements it moved`, `saying yes in Review creates the rule and the line says how many it moved` | ✅ |
| Si digo que no, solo cambia ese | Sí | `saying no sends nothing after the change of the one movement` | ✅ |
| Si no se movería ninguno, no pregunta o lo dice | Sí | `asks nothing when no other movement would move`, `says no other movement would move and keeps Create rule on` | ✅ |
| No pregunta si ya hay regla con ese texto | Sí | `asks nothing when a rule already uses the suggested text` | ✅ |
| *(añadido)* El texto es el de la lista de propuestas | Sí | `the suggested text of a description follows the five steps of the contract`; con tus datos (solo leyendo): coincide en las 67 propuestas | ✅ |
| *(añadido)* El texto gris solo para el cierre de la importación | Sí | `says the category was set when the import was closed only for that source`; con tus datos, en `Movements`: 148 líneas con el texto, 99 sin él, todas bien | ✅ |
| *(añadido)* Varias filas a la vez: no pregunta | Sí | `giving a category to several rows at once asks nothing` | ✅ |
| *(añadido)* No tapa la línea ni el `Undo` desde una fila del final | Sí | `the question about other movements sits under the notice and is in view from a low row` | ✅ |
| *(añadido)* Si crear falla, lo dice y nada más cambia | Sí | `a rejected create from the question says why and changes nothing else`, `paints the failure of a create inside the question` | ✅ |

`./init.sh --checks 34`: 12 de 12 en verde.

**Te toca a ti (cabo 40 de `docs/roadmap.md`):** probarlo con tus datos cambiando una
categoría. Con tus datos solo se ha mirado sin escribir: hoy `Review` no tiene
pendientes, así que allí no se pudo ver el texto gris.
