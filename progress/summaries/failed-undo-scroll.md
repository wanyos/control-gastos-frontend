# Resumen — cabo suelto 47 de `docs/roadmap.md` (`failed-undo-scroll`)

Fecha de cierre: 2026-11-06
Origen: cabo suelto 47 de `docs/roadmap.md`. No es una feature de `feature_list.json`: no
hay `intent` ni spec.

## Qué hace ahora la app que antes no

En `Movements`, cuando un `Undo` falla (por ejemplo, con un 409), la página se queda donde
estaba. Antes se iba arriba del todo y se perdía la línea. El mes se sigue pidiendo otra vez
para enseñar lo que dice el backend, pero la lista ya no se quita mientras llega la
respuesta. Mientras dura esa petición, `Load more` no pide nada.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| La recarga del mes tras una escritura que falla | [store.ts:218](../../src/features/statement/store.ts#L218) |
| La llama el cambio de categoría que falla | [store.ts:477](../../src/features/statement/store.ts#L477) |
| La llama «excluir de los totales» (y su `Undo`) que falla | [store.ts:597](../../src/features/statement/store.ts#L597) |

## Dónde está el código

### Store del extracto

| Qué hace | Dónde |
| --- | --- |
| Pide el mes; con la lista pintada o quitándola | [store.ts](../../src/features/statement/store.ts) → `load` |
| Sigue siendo la carga normal (quita la lista) | [store.ts](../../src/features/statement/store.ts) → `show` |
| Recarga tras un fallo sin quitar la lista | [store.ts](../../src/features/statement/store.ts) → `reloadAfterFailedWrite` |
| Marca que esa recarga está en marcha | [store.ts](../../src/features/statement/store.ts) → `isReloadingAfterFailure` |
| No pide la página siguiente mientras tanto | [store.ts](../../src/features/statement/store.ts) → `loadMore` |

### Documentos

| Qué dice | Dónde |
| --- | --- |
| La decisión y su porqué | [architecture.md](../../docs/architecture.md) → «Tras una escritura que falla, el mes se vuelve a pedir sin quitar la lista» |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| La lista sigue en pantalla durante la recarga (categoría) | [store.spec.ts](../../src/features/statement/__tests__/store.spec.ts) → `the reload after a failed write keeps the list on screen until the answer arrives` |
| `Load more` no pide nada durante la recarga | [store.spec.ts](../../src/features/statement/__tests__/store.spec.ts) → `Load more does nothing while the month is asked for again after a failed write` |
| Si la recarga también falla, sale el error del mes | [store.spec.ts](../../src/features/statement/__tests__/store.spec.ts) → `a reload after a failed write that fails too paints the failure of the month` |
| La lista sigue en pantalla durante la recarga (exclusión) | [store.spec.ts](../../src/features/statement/__tests__/store.spec.ts) → `the reload after a failed batch keeps the list on screen…` |
| La página no se mueve (navegador, categoría) | [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `an Undo of a category that fails in Movements leaves the page where it was` |
| La página no se mueve (navegador, exclusión) | [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `an Undo of an exclusion that fails in Movements leaves the page where it was` |
| Ayudas de esas pruebas | [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `rejectUndoSlowly`, `watchLowestScroll`, `CONFLICT` |

## Cumplimiento de lo pedido

- ✅ El salto existía y ha desaparecido → medido en Chromium, Firefox y WebKit con
  `page.route`: sin el arreglo `scrollY` acaba en 0; con él, 2630 → 2611. Lo verifican las
  dos pruebas de navegador, que fallan 30 de 30 sin el arreglo.
- ✅ Se sigue recargando tras un fallo y la lista final es la del backend → tests de
  `store.spec.ts` de arriba.
- ✅ El `Undo` que sale bien y `Review` siguen igual → sus pruebas pasan sin tocarlas.
- Sin checks: no es una feature de `feature_list.json`.

## Qué NO se tocó / quedó fuera

- `Review`: su recarga tras un fallo ya no quitaba la lista.
- Las filas que trajo `Load more` se siguen quitando tras un fallo, como antes.

## Notas para el futuro

- Un `Load more` en vuelo cuando falla una escritura deja `isLoadingMore` en `true` (pasaba
  ya antes de este cambio).
- `docs/guia-de-uso.md:859-861` tiene una frase sobre el fallo por red que ya era falsa
  antes de este cambio (lo anota el informe del implementer).
