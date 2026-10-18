# Resumen — feature 33 `suggested-rules`

Fecha de cierre: 2026-10-18
Lo que pediste: `feature_list.json` → feature `suggested-rules`, bloque `intent`
Spec: `specs/33-suggested-rules/`

## Qué verás en `Rules`

- Arriba, una lista de **reglas propuestas** por el backend, de la que más movimientos
  recoge a la que menos. Cada una dice su texto, si es de gastos o de ingresos y cuántos
  movimientos recogería; puedes desplegar esos movimientos antes de decidir.
- En cada propuesta eliges una categoría (el desplegable empieza vacío y solo ofrece las del
  mismo tipo) y pulsas `Create rule`. Hasta que no eliges, el botón está apagado.
- Al crearla: sale una línea verde con cuántos movimientos ha movido, el recuadro del
  resultado lista cuáles, y esa propuesta desaparece de la lista. Las demás se quedan.
- Si la propuesta casa también con movimientos que categorizaste tú a mano, te lo dice y esos
  no se mueven.
- Si falla, te lo dice en la fila de esa propuesta y no cambia nada.
- Debajo sigue la lista de tus reglas (`Your rules`) como antes.

Cambia también, fuera de las propuestas: **crear o cambiar cualquier regla** (también desde
`Review` o `Movements`) ya mueve los movimientos en el acto, así que el aviso
`Apply rules now` ha desaparecido. Tras crear o cambiar una regla, `Review` y `Movements` se
ponen al día solos, y se pierden el `Undo` y las casillas marcadas de `Review`.

## Qué no hace

- No te propone la categoría ni crea ninguna regla sin que la elijas.
- No deja descartar una propuesta: la que no uses sigue saliendo.
- No deja cambiar el texto de la propuesta antes de crearla.
- No toca el backend.
- **No se ha probado con tus datos reales** crear una regla desde una propuesta ni `Edit` →
  `Save`: está apuntado como cabo suelto 39 en `docs/roadmap.md`. La lectura de la lista de
  propuestas sí se pasó con tus datos en la primera revisión.

## Por dónde se toca

| Cómo se usa | Código |
| --- | --- |
| La lista de propuestas en la pantalla `Rules` | [RulesView.vue:28](../../src/features/category-rules/views/RulesView.vue#L28) |
| Pedir las propuestas al backend | [store.ts:341](../../src/features/category-rules/store.ts#L341) |
| Crear una regla desde una propuesta | [store.ts:371](../../src/features/category-rules/store.ts#L371) |
| `GET /api/category-rules/suggestions` | [service.ts:245](../../src/features/category-rules/service.ts#L245) |

## Dónde está el código

| Qué hace | Dónde |
| --- | --- |
| Fila de una propuesta (categoría, `Create rule`, movimientos, aviso de los puestos a mano) | [SuggestedRuleRow.vue](../../src/features/category-rules/components/SuggestedRuleRow.vue) |
| La lista, con carga, fallo y lista vacía | [SuggestedRuleList.vue](../../src/features/category-rules/components/SuggestedRuleList.vue) |
| Línea verde de la regla creada, sin `Apply rules now` | [RuleCreatedNotice.vue](../../src/features/category-rules/components/RuleCreatedNotice.vue) |
| Cabecera del recuadro según venga de crear, cambiar o aplicar | [LastApplyReport.vue](../../src/features/category-rules/components/LastApplyReport.vue) |
| Nota nueva de la ventana de crear/editar regla | [RuleMatchPreview.vue](../../src/features/category-rules/components/RuleMatchPreview.vue) |
| Texto de la lista de reglas vacía | [RuleList.vue](../../src/features/category-rules/components/RuleList.vue) |
| Lectura de propuestas y de lo que movió una regla | [service.ts](../../src/features/category-rules/service.ts) → `parseSuggestions`, `parseSavedRule`, `parseCategorization` |
| Estado de propuestas; crear y cambiar dejan su resultado | [store.ts](../../src/features/category-rules/store.ts) → `loadSuggestions`, `createFromSuggestion` |
| Textos de pantalla y qué errores no escribieron nada | [rules.ts](../../src/features/category-rules/rules.ts) → `ruleCreatedLine`, `manualMatchesLine`, `wroteNothing` |
| Tipos | [types.ts](../../src/features/category-rules/types.ts) → `SuggestedRule`, `SavedRule` |
| `Movements` se pone al día tras crear o cambiar una regla | [statement/store.ts](../../src/features/statement/store.ts) → vigila `applyRun` |
| `Review` sin `Apply rules now` | [ReviewView.vue](../../src/features/review/views/ReviewView.vue) |
| Pruebas | `SuggestedRuleRow.spec.ts`, `RuleCreatedNotice.spec.ts`, `store.spec.ts`, `RulesView.spec.ts`, `service.spec.ts`, `rules.spec.ts` y otras en `src/features/*/__tests__/`; en el navegador, [e2e/category-rules.spec.ts](../../e2e/category-rules.spec.ts) y [e2e/action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) |

## Lo que pediste, punto por punto

Resultado real de `./init.sh --checks 33`: 11 de 11 en verde.

- ✅ Veo la lista de propuestas con su texto y cuántos recogería.
- ✅ Puedo ver los movimientos de una propuesta antes de decidir.
- ✅ Elijo categoría, se crea la regla y veo cuántos y cuáles movió (probado de punta a punta
  en el navegador, con el backend simulado).
- ✅ La propuesta usada desaparece.
- ✅ Las que no uso se quedan; no hay forma de descartarlas.
- ✅ Me avisa de los movimientos puestos a mano, que no se mueven.
- ✅ Si falla, me lo dice y no cambia nada.
- ✅ (añadido) Si la regla se crea pero no termina de mover todo, lo dice; el resto se moverá
  al crear o cambiar otra regla.

## Decisiones que se tomaron por ti

- (delegado) Lista dentro de `Rules`, por encima de tus reglas, con un desplegable de
  categoría por fila.
- (delegado) El texto de la propuesta no se puede cambiar antes de crearla.
- (añadido) Se quitó `Apply rules now` (respuesta tuya del 2026-10-18: «lo que creas que es
  mejor»); el botón `Apply rules` de la pantalla se queda.
- (añadido) `Review` y `Movements` se ponen al día solos tras crear o cambiar una regla.
