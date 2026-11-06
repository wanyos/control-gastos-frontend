# Resumen — cabo 30 de `docs/roadmap.md`: la página se movía antes de que cambiara el aviso

Fecha de cierre: 2026-11-04
Origen: cabo 30 de `docs/roadmap.md`, restos de la F27 (no es una feature de
`feature_list.json`). Informe: `progress/implementations/notice-page-jump.md`. Revisión:
`progress/reviews/notice-page-jump.md`.

## Qué hace ahora la app que antes no

En `Review` y `Movements`, si la fila que acabas de tocar está en parte detrás del aviso
de la última acción:

- Al pulsar `Undo`, la página ya no sube de golpe al pulsar. Se mueve una sola vez, cuando
  llega la respuesta, y solo lo justo: la fila queda a menos de 1 px bajo el aviso, o no
  se mueve si el aviso desaparece.
- Abrir el diálogo de `Create rule`, cancelarlo o intentar guardar una regla que falla
  ya no mueve la página.
- Guardar una regla que sale bien sigue dejando la fila justo debajo del aviso, como
  pide la F27.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| La medida que decide si sube la página y cuánto | [StickyBelowTopBar.vue:53](../../src/shared/components/StickyBelowTopBar.vue#L53) |
| `Review` le pasa la fila y si hay una acción en marcha | [ReviewView.vue:64](../../src/features/review/views/ReviewView.vue#L64) |
| `Movements` lo mismo | [StatementView.vue:42](../../src/features/statement/views/StatementView.vue#L42) |
| La fila de la regla, que se nombra solo cuando la regla se ha guardado | [ReviewView.vue:388](../../src/features/review/views/ReviewView.vue#L388), [StatementView.vue:375](../../src/features/statement/views/StatementView.vue#L375) |

## Dónde está el código

### Aplicación

| Qué hace | Dónde |
| --- | --- |
| Prop `busy`: no mide mientras hay una acción o un guardado de regla en marcha, y mide al acabar | [StickyBelowTopBar.vue](../../src/shared/components/StickyBelowTopBar.vue) → `busy`, `keepRowClear`, `watch` de `busy` |
| No mueve la página si ni la fila ni el texto del aviso han cambiado desde la última medida | [StickyBelowTopBar.vue](../../src/shared/components/StickyBelowTopBar.vue) → `lastSeen` |
| Abrir el diálogo ya no nombra la fila; guardar con éxito, sí | [ReviewView.vue](../../src/features/review/views/ReviewView.vue) → `onCreateRule`, `onSaveRule`; [StatementView.vue](../../src/features/statement/views/StatementView.vue) → `onCreateRule`, `onSaveRule` |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| No mide mientras hay una acción en marcha, y mide al acabar | [StickyBelowTopBar.spec.ts](../../src/shared/components/__tests__/StickyBelowTopBar.spec.ts) → `does not measure while an action is in flight, and measures once it is over`, `does not measure when it appears while an action is still in flight` |
| Una acción que acaba sin cambiar el aviso no mueve la página | [StickyBelowTopBar.spec.ts](../../src/shared/components/__tests__/StickyBelowTopBar.spec.ts) → `does not measure when an action ends without changing the row or the text` |
| La fila de la regla se nombra al guardar con éxito, no al abrir ni al fallar | [ReviewView.spec.ts](../../src/features/review/__tests__/ReviewView.spec.ts) → `names the row of a rule when the rule is saved, not when its dialog opens`, `does not name the row of a rule that failed to save` |
| `Undo` en `Movements` y en `Review`, desde una fila en parte detrás del aviso | [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `Undo in Movements, from a row partly behind the notice, …`, `Undo of a category in Review, from a row partly behind the notice, …` |
| Abrir el diálogo de regla no mueve la página (`Review` y `Movements`) | [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `opening the rule dialog in Review …`, `opening the rule dialog in Movements …` |
| Una regla que no se guarda no mueve la página (`Review` y `Movements`) | [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `a rule that fails to save, …` (las dos) |
| Funciones de apoyo de esas pruebas | [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `twoFrames`, `gapUnderNotice`, `leavePartlyUnderNotice`, `rejectRuleSlowly` |

### Documentos

| Qué dice | Dónde |
| --- | --- |
| Cuándo mide el componente, la prop `busy`, y cuándo se escribe la fila de la regla | [architecture.md](../../docs/architecture.md) → párrafo de `StickyBelowTopBar` |

## Cumplimiento de lo pedido

- ✅ El salto existía y ha desaparecido → lo medí en Chromium, con HEAD y con el arreglo
  (tabla en la revisión). Lo comprueban las 6 pruebas de navegador nuevas, que fallan sin
  el arreglo.
- ✅ Lo que exige la F27 sigue igual → la suite entera pasa en los tres navegadores
  (270 de 270). Guardar una regla con éxito deja la fila a 0,06 px bajo el aviso, igual
  que en HEAD.
- ✅ Ninguna prueba aflojada → el diff solo añade pruebas.
- ✅ No cambia nada visible aparte del salto → también medidos cancelar el diálogo, una
  regla que falla y un `Undo` que falla. Ninguno se mueve más que antes.

## Qué NO se tocó / quedó fuera

- `Transfers` y `Rules`: no pasan fila al componente.
- En `Movements`, un `Undo` que falla recarga el mes y la página vuelve arriba. Pasa igual
  en HEAD; no es de este arreglo.
- La subida de 563 px que vio el implementer, 2 de 30 veces, en `Movements`: pasa igual
  sin el arreglo y no se ha buscado la causa.
