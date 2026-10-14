# Resumen — feature 30 `rules-applied-result`

Fecha de cierre: 2026-10-14
Intención original: `feature_list.json` → feature `rules-applied-result`, bloque `intent`
Spec: `specs/30-rules-applied-result/`

## Qué hace ahora la app que antes no

**En `Rules`:** al aplicar las reglas y cerrar la ventana, bajo el título queda un
recuadro: `Rules applied at <hora>: N movements categorized.` (o `no movements were
categorized.`), y debajo cuántos siguen sin regla y cuántos choques hay. Con
`Show the N movements` ves la lista de lo que se acaba de categorizar: fecha, concepto,
el texto de la regla que casó, la categoría que se le puso y el importe. Si hubo choques,
`Show the N conflicts` enseña la misma lista que la ventana.

**En `Review`:** el mismo recuadro bajo el título, y además, sin aplicar nada, una frase
bajo las cifras que dice cuántos pendientes siguen sin categoría
(`… pending movements have no category.`). Se pone al día tras cada acción, cada `Undo` y
cada aplicación de las reglas.

**Qué no hace:**

- El recuadro **no se guarda**: se va con `Dismiss` (de las dos pantallas a la vez), al
  recargar la página o al aplicar otra vez (lo sustituye el nuevo resultado). No se puede
  volver otro día a ver qué hizo la última aplicación.
- **No se puede deshacer** la aplicación, ni cambiar un movimiento desde la lista: es
  solo para mirar; para cambiarlo, búscalo en `Review`.
- Aplicar **no confirma nada**: sigue siendo una sola petición al backend, la de aplicar.
- Lo que categorizan las reglas **al importar** no sale en el recuadro.
- Si la aplicación falla, no se pinta recuadro (aunque se haya categorizado algo).
- **No se ha probado con tus datos reales**, solo con datos simulados. Está apuntado en
  `docs/roadmap.md`, cabo suelto 32. Ojo: aplicar las reglas escribe en tus datos.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| El recuadro en `Rules` | [RulesView.vue:19](../../src/features/category-rules/views/RulesView.vue#L19) |
| El recuadro en `Review` | [ReviewView.vue:15](../../src/features/review/views/ReviewView.vue#L15) |
| La frase de pendientes sin categoría en `Review` | [ReviewView.vue:10](../../src/features/review/views/ReviewView.vue#L10) |
| Aplicar las reglas y guardar el resultado en memoria | [store.ts:262](../../src/features/category-rules/store.ts#L262) |
| Leer la respuesta de aplicar | [service.ts:124](../../src/features/category-rules/service.ts#L124) |

## Dónde está el código

### Leer la respuesta del backend

| Qué hace | Dónde |
| --- | --- |
| Tipos de la lista nueva y del último resultado | [types.ts](../../src/features/category-rules/types.ts) → `AppliedRule`, `CategorizedMovement`, `LastApply` |
| Valida cada movimiento de la lista y su tamaño | [service.ts](../../src/features/category-rules/service.ts) → `parseCategorized`, `parseApplyResult` |

### El resultado de la última aplicación

| Qué hace | Dónde |
| --- | --- |
| Guarda el último resultado en memoria y lo olvida | [store.ts](../../src/features/category-rules/store.ts) → `lastApply`, `dismissLastApply`, `confirmApply` |
| Los textos del titular, de las cifras y el signo del importe | [rules.ts](../../src/features/category-rules/rules.ts) → `lastApplyHeadline`, `lastApplyFigures`, `signedAmount` |
| La hora del titular | [money.ts](../../src/shared/money.ts) → `formatClock` |
| El recuadro y sus dos botones de mostrar | [LastApplyReport.vue](../../src/features/category-rules/components/LastApplyReport.vue) → `LastApplyReport` |
| La lista de movimientos categorizados | [CategorizedMovementList.vue](../../src/features/category-rules/components/CategorizedMovementList.vue) → `CategorizedMovementList` |
| Solo un comentario actualizado | [ApplyResult.vue](../../src/features/category-rules/components/ApplyResult.vue) |

### Pendientes sin categoría en `Review`

| Qué hace | Dónde |
| --- | --- |
| Pide el número y lo vuelve a pedir tras cada acción | [store.ts](../../src/features/review/store.ts) → `uncategorizedCount`, `refreshUncategorizedCount`, `refreshAfterAction` |
| La frase | [UncategorizedCount.vue](../../src/features/review/components/UncategorizedCount.vue) → `UncategorizedCount` |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| Lectura y rechazo de la respuesta | [service.spec.ts](../../src/features/category-rules/__tests__/service.spec.ts), [import service.spec.ts](../../src/features/import/__tests__/service.spec.ts) |
| Guardar, olvidar y sustituir el resultado; una sola petición | [store.spec.ts](../../src/features/category-rules/__tests__/store.spec.ts) |
| Textos | [rules.spec.ts](../../src/features/category-rules/__tests__/rules.spec.ts), [money.spec.ts](../../src/shared/__tests__/money.spec.ts) |
| El recuadro y la lista | [LastApplyReport.spec.ts](../../src/features/category-rules/__tests__/LastApplyReport.spec.ts), [RulesView.spec.ts](../../src/features/category-rules/__tests__/RulesView.spec.ts) |
| `Review`: recuadro, frase y número | [ReviewView.spec.ts](../../src/features/review/__tests__/ReviewView.spec.ts), [UncategorizedCount.spec.ts](../../src/features/review/__tests__/UncategorizedCount.spec.ts), [review store.spec.ts](../../src/features/review/__tests__/store.spec.ts) |
| Datos de prueba inventados | [category-rules fixtures.ts](../../src/features/category-rules/__tests__/fixtures.ts), [review fixtures.ts](../../src/features/review/__tests__/fixtures.ts) |
| Navegador: de `Rules` a `Review`, igual en las dos, la siguiente lo sustituye | [category-rules.spec.ts](../../e2e/category-rules.spec.ts) → `the result of applying stays in view from Rules to Review`, `the result of applying looks the same on Rules and on Review and the next pass replaces it` |
| Navegador: el aviso de la F27 con el recuadro pintado | [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `the notice leaves the changed row clear with the result of applying the rules … above the list` |

## Cumplimiento de la intención

Resultado real de `./init.sh --checks 30` el 2026-10-14: 9 de 9 en verde.

- ✅ «Aplico las reglas y, al cerrar la ventana, veo cuántos movimientos se han
  categorizado» → en el navegador, `the result of applying stays in view from Rules to
  Review`. Check 1: ✅
- ✅ «Puedo ver la lista, cada uno con la categoría que le han puesto» →
  `lists each categorized movement with the category it was given`. Check 2: ✅
- ✅ «Si no se ha categorizado ninguno, me lo dice con esas palabras» →
  `says no movements were categorized when the pass categorized none`. Check 3: ✅
- ✅ «Sin aplicar nada, en `Review` veo cuántos pendientes siguen sin categoría» →
  `shows how many pending movements have no category without applying anything`.
  Check 4: ✅
- ✅ «Si recargo, no me enseña como recién categorizado algo que ya no lo es» →
  `a new page load starts with no result and writes nothing to the browser storage`.
  Check 5: ✅

## Decisiones que se tomaron por ti

- (delegado) La lista la manda el backend (su feature 56), como preferiste en la hoja.
- (delegado) Se enseña en `Rules` y en `Review`, y dura hasta `Dismiss`, recargar o
  aplicar otra vez.
- (añadido) Si la respuesta no trae la lista o no cuadra con el número, la ventana dice
  que algo falló y no se pinta nada (check 7: ✅).
- (añadido) Aplicar sigue siendo una sola petición y no confirma (check 6: ✅); lo de
  importar queda fuera (check 8: ✅); lo de la F27 en `Review` sigue igual (check 9: ✅).
- Del implementer, no escrito en el spec: con un solo elemento, los botones dicen
  `Show the 1 movement` / `Show the 1 conflict`, en singular.

## Qué NO se tocó / quedó fuera

- El backend, y qué movimientos tocan las reglas.
- Lo que categorizan las reglas al importar.
- Deshacer una aplicación.
