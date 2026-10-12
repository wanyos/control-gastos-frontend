# Requirements — F30 `rules-applied-result`

Pantallas `Rules` (`src/features/category-rules/`) y `Review` (`src/features/review/`).
15 requirements y 3 restricciones. No se toca el backend.

## Definiciones usadas en todo el documento

- **Pendiente sin categoría:** movimiento con `status: 'pending_review'` y
  `categoryId: null`.
- **Leer todas las páginas de una consulta:** pedir `GET /api/movements` con esa
  consulta, `page=1` y `pageSize=200`, y después las páginas `2 … totalPages` con la
  misma consulta y el mismo `pageSize`. La lectura **es válida** solo si todas las
  páginas traen el mismo `pagination.total` y el número de `id` distintos reunidos es
  igual a ese `total`. Si una petición falla o la lectura no es válida, la lectura
  entera **ha fallado** (no se usa ninguna página suelta).
- **Resultado de la última aplicación:** lo que el store de reglas guarda en memoria
  cuando `POST /api/category-rules/apply` termina sin `error`: la hora, la respuesta
  (`categorized`, `unmatched`, `conflictCount`, `conflicts`) y la lista de movimientos
  categorizados, o el motivo por el que no hay lista.
- **El bloque del resultado:** el componente `LastApplyReport.vue`
  (`data-test="last-apply"`), que se pinta en `Rules` y en `Review`.

## Saber cuáles se categorizaron (store de reglas)

## R1
CUANDO el usuario confirma la aplicación de las reglas, el sistema DEBE leer todas las
páginas de `status=pending_review&uncategorized=true` antes de enviar
`POST /api/category-rules/apply`.

## R2
SI la lectura de R1 falla ENTONCES el sistema DEBE dejar la ventana en el paso `failed`
con el mensaje `Couldn't read your pending movements, so the rules were not applied.
Nothing changed. Try again.`, sin haber enviado el `POST` y sin incrementar `applyRun`.

## R3
CUANDO el `POST` responde sin `error` y con `categorized` mayor que 0, el sistema DEBE
leer todas las páginas de `status=pending_review` y guardar como lista de categorizados
los movimientos de esa lectura cuyo `id` estaba en la lectura de R1 y cuyo `categoryId`
ya no es `null`, en el orden en que los devuelve la API.

## R4
SI la lectura de R3 falla, o el número de movimientos de la lista no es igual a
`categorized`, ENTONCES el sistema DEBE guardar el resultado sin lista y con su motivo
(`read-failed` o `count-mismatch`), de modo que el bloque pinte en
`data-test="last-apply-list-unavailable"` la frase de ese motivo en lugar del botón de
la lista:
- `read-failed`: `The list of these movements could not be loaded. The numbers come
  from the server and are right.`
- `count-mismatch`: `The list is not shown: it did not add up to the number the server
  gave, so something else changed your movements at the same time.`

## El bloque del resultado (`LastApplyReport.vue`, en `Rules` y en `Review`)

## R5
MIENTRAS hay un resultado de la última aplicación guardado, el sistema DEBE pintar el
bloque del resultado en `Rules` y en `Review`, debajo del título de la pantalla, con el
titular (`data-test="last-apply-headline"`) `Rules applied at <HH:MM>: <N> movements
categorized.` (`1 movement categorized.` en singular) y, debajo
(`data-test="last-apply-figures"`), `<unmatched> still without a matching rule ·
<conflictCount> conflicts` (`1 conflict` en singular).

## R6
SI `categorized` es 0 ENTONCES el sistema DEBE pintar como titular `Rules applied at
<HH:MM>: no movements were categorized.`, sin botón de lista y sin haber hecho la
lectura de R3.

## R7
CUANDO el usuario pulsa `Show the <N> movements`
(`data-test="last-apply-show-movements"`), el sistema DEBE pintar una fila
(`data-test="last-apply-movement"`) por cada movimiento de la lista de categorizados,
con su fecha, su concepto, su importe y el nombre de la categoría que tiene ahora
(`data-test="last-apply-movement-category"`).

## R8
MIENTRAS el resultado guardado trae choques (`conflicts` no vacío), el sistema DEBE
ofrecer en el bloque el botón `Show the <N> conflicts`
(`data-test="last-apply-show-conflicts"`, `<N>` = `conflictCount`) que despliega la
misma lista de choques que enseña la ventana `Rules applied` (`RuleConflictList`).

## R9
CUANDO el usuario pulsa `Dismiss` (`data-test="last-apply-dismiss"`), el sistema DEBE
borrar el resultado guardado, de modo que el bloque deja de pintarse en las dos
pantallas.

## R10
CUANDO el usuario confirma otra aplicación de las reglas, el sistema DEBE borrar el
resultado guardado antes de hacer la lectura de R1.

## R11
El sistema NO DEBE guardar el resultado de la última aplicación fuera de la memoria de
la página (ni `localStorage`, ni `sessionStorage`, ni la URL): un store recién creado
no tiene resultado y el bloque no se pinta.

## R12
SI el `POST` falla o responde con `error` ENTONCES el sistema NO DEBE guardar ningún
resultado (la ventana enseña el mensaje de fallo de hoy y el bloque no se pinta).

## Cuántos pendientes siguen sin categoría (`Review`)

## R13
CUANDO se abre `Review`, el sistema DEBE pedir
`status=pending_review&uncategorized=true&page=1&pageSize=1` y pintar en la cabecera
(`data-test="review-uncategorized-count"`) la frase con su `pagination.total`:
`<N> pending movements have no category.`, `1 pending movement has no category.` o, con
0, `Every pending movement has a category.`

## R14
CUANDO el store de `Review` vuelve a pedir su página después de una acción, de un
`Undo` o de una aplicación de las reglas (`refreshAfterAction`), el sistema DEBE volver
a hacer la petición de R13.

## R15
SI la petición de R13 falla ENTONCES el sistema NO DEBE pintar la frase (ni un número
anterior ni un error).

## Restricciones (lo que no cambia; cada una con su test)

- **C1** — Aplicar las reglas manda exactamente un `POST /api/category-rules/apply`
  sin cuerpo y ninguna otra escritura: todo lo demás que sale del store de reglas al
  aplicar son `GET /api/movements`. No viaja ningún `PATCH`, así que nada se confirma.
- **C2** — Lo que dejó la feature 27 en `Review` no cambia: el bloque del resultado se
  pinta **fuera** de `StickyBelowTopBar`; `hasNotice` sigue dependiendo de las mismas
  tres fuentes; el aviso de regla creada y el de la última acción siguen sin salir a la
  vez; y una aplicación de las reglas sigue borrando el `Undo` y las casillas marcadas.
- **C3** — La ventana `Rules applied` (paso `done` de `ApplyRulesDialog`) sigue
  enseñando las tres cifras y la lista de choques de hoy, sin cambios.

## Cobertura de `como_se_que_esta_bien`

| Frase del humano | Requirements |
|---|---|
| Aplico las reglas y, al cerrar la ventana, veo cuántos se han categorizado | R5 |
| Desde ahí puedo ver la lista, cada uno con su categoría | R1, R3, R7 |
| Si no se ha categorizado ninguno, me lo dice con esas palabras | R6 |
| Sin aplicar nada, en `Review` veo cuántos pendientes siguen sin categoría | R13, R14 |
| Si recargo la página, lo que veo sigue siendo verdad | R4, R11, R13, R15 |

## Procedencia

- R1 — (delegado) «De dónde sale la lista». Decido que el frontend lee los
  identificadores de los pendientes sin categoría antes de aplicar. Alternativa
  descartada: que el backend devuelva la lista en la respuesta de aplicar (exacta y con
  una sola petición, pero es tocar el backend).
- R2 — (añadido) El humano no dijo qué pasa si esa lectura previa falla. Propongo no
  aplicar: aplicar no se deshace y sin esa lectura no habría lista. ← REVISAR EN
  APROBACIÓN.
- R3 — (delegado) «De dónde sale la lista». La lista sale de comparar la lectura de
  antes con una lectura de todos los pendientes después. Se leen todos los pendientes y
  no solo los que siguen sin categoría porque hace falta la categoría que recibió cada
  uno, y el contrato no tiene otra consulta que la dé.
- R4 — (añadido) El humano no dijo qué pasa si la lista no se puede obtener o no cuadra
  con el número del backend. Propongo no enseñarla y decir por qué; sale de su frase
  «lo que veo sigue siendo verdad». ← REVISAR EN APROBACIÓN.
- R5 — (humano) «al cerrar la ventana, veo cuántos movimientos se han categorizado sin
  tener que acordarme del número». (delegado) «Dónde se enseña»: en `Rules` y en
  `Review`, el mismo bloque. La hora en el titular es (añadido): hace que la frase siga
  siendo cierta aunque pase el tiempo.
- R6 — (humano) «Si no se ha categorizado ninguno, me lo dice con esas palabras.»
- R7 — (humano) «puedo ver la lista de los movimientos que se acaban de categorizar,
  cada uno con la categoría que le han puesto». Que la lista esté plegada tras un botón
  es (delegado), parte de «dónde se enseña».
- R8 — (humano) Respuesta del 2026-10-12: «la lista de choques sigue a la vista igual
  que la de lo categorizado».
- R9 — (delegado) «Cuánto tiempo sigue a la vista»: hasta que lo quita él con
  `Dismiss`. Alternativa descartada: quitarlo solo al primer cambio hecho en `Review`.
- R10 — (delegado) «Cuánto tiempo sigue a la vista»: hasta la siguiente aplicación.
- R11 — (delegado/añadido) Su frase «si recargo la página, lo que veo sigue siendo
  verdad» y su respuesta «le basta con verlo justo después de aplicar». Decido que tras
  recargar no se ve nada del resultado. ← REVISAR EN APROBACIÓN.
- R12 — (añadido) El humano no habló de una aplicación que falla. Se deja como hoy,
  sin bloque: no hay un número fiable del backend con el que comprobar una lista.
- R13 — (humano) «Sin aplicar nada, en `Review` veo cuántos pendientes siguen sin
  categoría.» El texto exacto y que cueste una petición más son (añadido).
- R14 — (añadido) Para que el número de R13 no quede viejo tras una acción; sale de «lo
  que veo sigue siendo verdad».
- R15 — (añadido) Mismo criterio que el número del menú: si no se sabe, no se pinta.
- C1 — (humano) «No quiero que aplicar las reglas confirme nada.»
- C2 — (añadido) Protege lo que cerró la feature 27; lo pidió el leader al encargar el
  spec.
- C3 — (añadido) El humano no pidió cambiar la ventana.
