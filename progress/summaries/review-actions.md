# Resumen — feature 16 `review-actions`

Fecha de cierre: 2026-09-20
Intención original: `feature_list.json` → feature `review-actions`, bloque `intent`
Spec: `specs/16-review-actions/`

## Qué hace ahora la app que antes no

La pantalla **Review** ya no solo mira: **escribe**. Puedes ponerle categoría a un
movimiento y darlo por revisado, de uno en uno o marcando varios —hasta la página
entera— y resolviéndolos de un golpe. Lo confirmado desaparece de la cola al
instante y el número de la barra lateral baja solo. Y si te equivocas, hay un
**Undo** de la última acción que devuelve categoría y estado a como estaban.

Es la primera pantalla de la web que modifica la base de datos. El hecho bancario
—importe, fecha, descripción— sigue siendo intocable.

## Por dónde se usa (puntos de entrada)

- `/review` → casilla en cada fila para marcarla; casilla de cabecera para tomar
  la página entera (queda a medias con un guion cuando solo hay algunas).
- En la fila: un desplegable de categoría que **se guarda solo** al elegir (sin
  botón de guardar) y un botón `Confirm` aparte.
- Al marcar algo aparece una barra bajo los filtros: `N selected`,
  `Choose a category…` + `Apply category`, `Confirm N movements` y
  `Clear selection`.
- A partir de **20** movimientos, la acción en bloque pregunta antes en una
  ventanita que dice cuántos son.
- Sobre la lista, una línea del tipo `3 movements confirmed · Undo` (sin cuenta
  atrás: dura hasta la siguiente acción o hasta que te vas), o el motivo en
  inglés si algo falló.

Contra la API, solo dos escrituras, las del contrato:
`PATCH /api/movements/:id` (un movimiento) y `PATCH /api/movements` (varios,
máximo 200 ids sin repetir, todo o nada).

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Quién admite una categoría (cruza `type` con el `kind` del árbol) | `src/features/review/actions.ts:34` |
| Plan de deshacer (un `PATCH` por grupo con el mismo valor previo) | `src/features/review/actions.ts:52` |
| Los cinco textos de error, en inglés y sin el mensaje del backend | `src/features/review/actions.ts:96` |
| Cuándo hay que recargar porque el cambio pudo colarse | `src/features/review/actions.ts:113` |
| El umbral de 20 | `src/features/review/actions.ts:25` |
| Cuerpo del PATCH, campo a campo (nada más puede viajar) | `src/features/review/service.ts:229` |
| `PATCH` de un movimiento | `src/features/review/service.ts:244` |
| `PATCH` de varios: dedupe + barrera de 1..200 antes de la red | `src/features/review/service.ts:261` |
| Selección (marcar, página entera, soltar) | `src/features/review/store.ts:181` |
| Aplicar lo que devuelve la API a la lista y al contador | `src/features/review/store.ts:239` |
| Un solo carril: el doble clic no manda dos peticiones | `src/features/review/store.ts:265` |
| Las cuatro acciones | `src/features/review/store.ts:313, 330, 343, 362` |
| Deshacer (para en el primer fallo y recarga) | `src/features/review/store.ts:384` |
| Refresco silencioso, y caída a la página 1 si la vacías | `src/features/review/store.ts:214, 226` |
| Barra de acciones | `src/features/review/components/ReviewActionBar.vue` |
| Selector de categoría de la fila | `src/features/review/components/MovementCategorySelect.vue` |
| Aviso con `Undo` / mensaje de error | `src/features/review/components/ActionNotice.vue` |
| Ventanita de confirmación previa | `src/features/review/components/BulkConfirmDialog.vue` |
| Casilla y `Confirm` en la fila | `src/features/review/components/MovementRow.vue:7, 52` |
| Casilla «seleccionar todo» con el guion | `src/features/review/components/MovementList.vue:24` |
| Quién decide si pregunta antes | `src/features/review/views/ReviewView.vue:190` |
| Tests principales | `src/features/review/__tests__/store.spec.ts:341-724`, `actions.spec.ts`, `service.spec.ts:235-373`, `ReviewView.spec.ts:299-500`, `e2e/review-actions.spec.ts` |
| Contraste del tema oscuro | `src/assets/theme-dark.css:24, 25, 45` |

## Cumplimiento de la intención

- ✅ «Le pongo categoría a un movimiento y lo confirmo, desaparece de la cola y
  el contador baja» → se cumple. `store.ts:239` quita de la lista lo que ya no
  está pendiente y resta del contador; verificado en `store.spec.ts:410`
  (`pendingCount` 132 → 131) y en `e2e/review-actions.spec.ts:151`, que lo
  comprueba en un navegador de verdad, sin recargar.
- ✅ «Marco varios y pulso confirmar, se confirman todos de una vez» → se cumple:
  **una sola** petición con todos los ids. Verificado en `store.spec.ts:464` y
  `ReviewView.spec.ts:339`.
- ✅ «Marco todos los de la página y los categorizo, se aplica a todos los que la
  admiten» → se cumple; los que no la admiten se quedan fuera **antes** de
  enviar. Verificado en `store.spec.ts:484` (de tres marcados solo viaja el que
  encaja) y en `e2e/review-actions.spec.ts:187` (`Applies to 2 of 3 selected`).
- ✅ «Si algo de lo que he marcado no se puede cambiar, me lo dice y no se cambia
  nada a medias» → se cumple por partida doble: lo incompatible ni se manda
  (`actions.ts:34`), y si aun así el backend rechaza, la pantalla dice en inglés
  que no cambió nada y te deja lo marcado. Verificado en `store.spec.ts:552` y
  `e2e/review-actions.spec.ts:207`.
- ✅ «Puedo deshacer: volver a dejar un movimiento pendiente o quitarle la
  categoría» → se cumple. Verificado en `store.spec.ts:597` (vuelve a
  `pending_review` y el contador sube) y `:616` (devuelve a cada uno **su**
  categoría anterior, no una común).
- ✅ «No se me queda la pantalla desactualizada» → se cumple: se aplica al
  instante lo que devuelve la respuesta y, justo después, se vuelve a pedir la
  página en segundo plano para que los totales y el «N movements» sigan siendo
  los del backend. Verificado en `store.spec.ts:448`.

## Decisiones que se tomaron por ti

Lo que en el spec iba marcado `(delegado)` o `(añadido)` y aprobaste el
2026-09-20:

- (delegado) **Se marca con casillas y lo marcado se suelta** al cambiar de
  página, de filtro o al buscar (`store.ts:131`). Evita pasarte de los 200 del
  contrato y confirmar a ciegas cosas que ya no ves.
- (añadido) **La categoría se guarda sola** al elegirla, sin botón de guardar
  (`MovementCategorySelect.vue`), y el selector solo ofrece las que el
  movimiento admite.
- (añadido) **El umbral de 20** para la ventanita de confirmación
  (`actions.ts:25`). Es el único número inventado de la hoja; cambiarlo es tocar
  esa línea.
- (añadido) **Las filas confirmadas desaparecen** en vez de quedarse tachadas
  (`store.ts:239`).
- (delegado) **Undo sin temporizador**, vivo hasta la siguiente acción o hasta
  que te vas (`ActionNotice.vue`).
- (delegado) **Los no elegibles se filtran antes de enviar** en vez de enseñarte
  el error del backend (`actions.ts:34`).
- (añadido) **Respuesta ilegible o fallo raro → se recarga la lista** en vez de
  afirmar que no pasó nada, porque el cambio pudo colarse (`actions.ts:113`).
- (añadido) **Si el propio Undo falla a medias**, para ahí, te avisa y recarga
  (`store.ts:384`).

Una desviación respecto al diseño, revisada y aceptada: la barra de acciones
monta su propio desplegable en vez de reutilizar el del filtro, porque necesita
tres estados (nada elegido / una categoría / quitar la categoría) y el del filtro
solo expresa dos. Lo duplicado son seis líneas de plantilla; ninguna lógica.

## Qué NO se tocó / quedó fuera

- **El backend**: ni una línea. Cero dependencias nuevas.
- Importe, fecha y descripción siguen sin poder editarse.
- Traspasos ambiguos y reglas de categorías: fuera, como pediste. (La feature de
  reglas ya está acordada para después de esta.)
- La F15 (filtros, búsqueda, paginación, totales, URL, contador) no cambia de
  comportamiento.
- **`Movements` sigue siendo una página vacía**: un movimiento ya confirmado deja
  de verse desde aquí, así que si te arrepientes después de hacer otra cosa, el
  `Undo` ya no está y no hay dónde encontrarlo hasta la E7.

## Notas para el futuro

- **Prueba contra tu backend real hecha el 2026-09-22** (C6 / T21), con tu visto
  bueno y sobre un solo movimiento (42368): categorizar → Undo y confirmar → Undo
  desde la pantalla. El backend aceptó los cuatro cuerpos, la cola bajó de 1.607 a
  1.606 y volvió, y el movimiento quedó idéntico salvo `updatedAt`.
- Si actúas con filtros puestos y el refresco de fondo falla, el número de la
  barra lateral puede quedar un poco desfasado hasta la siguiente carga: hoy es
  una estimación local.
- Sugerencias que quedaron anotadas y no se hicieron: marcar un rango con Shift,
  recordar la última categoría aplicada y un atajo «categorizar y confirmar» en
  el mismo clic.
- El e2e nuevo solo corre en chromium, como el resto de la puerta.
