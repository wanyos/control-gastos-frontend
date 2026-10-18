# Requirements — F34 `manual-category-offers-rule`

Al cambiar a mano la categoría de un movimiento en `Movements` o en `Review`, la
aplicación pregunta si se pone también en los demás movimientos que contienen un texto,
con lo que respondería `GET /api/category-rules/preview`; si se dice que sí, se crea la
regla con el `POST` de siempre. Además, cada movimiento cuya categoría puso el cierre de
la importación lo dice de forma discreta. 15 requirements.

Fuente: el `intent` de la feature 34 (con sus dos `respuestas_del_humano`) y el contrato
`gastos-backend/docs/api-contract.md`, leído el 2026-10-18: `GET /api/category-rules/preview`,
`POST /api/category-rules`, `GET /api/category-rules/suggestions` (pasos 1 a 5 de «Cómo se
saca el texto propuesto»), `PATCH /api/movements/:id`, `PATCH /api/movements` y el campo
`categorySource` de `Movement`.

**Definiciones usadas en todo el documento.**

- **Un cambio a mano de una fila:** elegir una categoría (no `No category`) en el editor
  de categoría de una línea de `Movements` (`RowCategoryEditor`) o en el desplegable de
  una fila de `Review` (`MovementCategorySelect`), cuando el `PATCH /api/movements/:id`
  responde 200. No lo es la barra de varias filas marcadas de `Review`, ni `Undo`, ni
  `Close everything pending…`.
- **El texto propuesto de una descripción:** el resultado de `suggestionTextOf`
  (design §3), que aplica los pasos 1 a 5 del contrato; `null` si sale con menos de 5
  caracteres.
- **El preview:** la petición `GET /api/category-rules/preview?matchText=…&categoryId=…`.
- **Los movimientos que movería la regla nueva:** los de
  `categorization.categorizedMovements` de la respuesta del preview que llevan
  `"ruleId": null` en `rules`.
- **La pregunta:** el componente nuevo `OtherMovementsQuestion`
  (`data-test="other-movements-question"`), dentro del bloque que se queda bajo la barra
  superior (`StickyBelowTopBar`, feature 27), debajo de la línea de la última acción.
- **La línea de la regla creada:** `RuleCreatedNotice` (feature 33).

Los textos exactos de pantalla están en `design.md §6`; aquí se citan por su constante.

## La pregunta aparece

## R1
CUANDO se hace un cambio a mano de una fila de un movimiento de tipo `expense` o
`income` y su descripción tiene texto propuesto, el sistema DEBE hacer exactamente una
petición del preview con ese texto propuesto como `matchText` y la categoría recién
elegida como `categoryId`.

## R2
El sistema DEBE calcular el texto propuesto de una descripción con los pasos 1 a 5 del
contrato de `GET /api/category-rules/suggestions`, de forma que los cinco ejemplos de su
tabla den exactamente el resultado que dice la tabla (`ABC 1234` → ninguno).

## R3
CUANDO el preview de R1 responde 200 con al menos un movimiento que movería la regla
nueva, el sistema DEBE pintar la pregunta con el nombre de la categoría elegida, el
texto propuesto en un campo editable y cuántos movimientos se moverían
(`otherMovementsLine`), sin enviar ninguna otra petición.

## R4
CUANDO se pulsa `Show the N movements` en la pregunta, el sistema DEBE pintar los
movimientos que movería la regla nueva, cada uno con fecha, concepto e importe con signo,
sin hacer ninguna petición.

## R5
CUANDO se cambia el texto del campo de la pregunta, el sistema DEBE pedir de nuevo el
preview con el texto escrito y la misma categoría, esperando `SEARCH_DEBOUNCE_MS` desde
la última tecla, y pintar el número y la lista de la última respuesta pedida, descartando
cualquier respuesta anterior que llegue después.

## R6
MIENTRAS el texto escrito tiene menos de 3 caracteres normalizado, o el preview de ese
texto está en camino, o ha respondido 409, o ha fallado, el sistema DEBE tener apagado
el botón `Create rule` de la pregunta y decir por qué (`TOO_SHORT`, `QUESTION_CHECKING`,
`QUESTION_TAKEN` o `QUESTION_CHECK_FAILED`).

## R7
CUANDO el preview de un texto escrito en la pregunta responde 200 sin ningún movimiento
que movería la regla nueva, el sistema DEBE decir `QUESTION_NONE` y dejar `Create rule`
encendido.

## No se pregunta

## R8
SI el movimiento no tiene texto propuesto, o el preview de R1 responde 409, responde 200
sin ningún movimiento que movería la regla nueva, o falla de cualquier otra forma,
ENTONCES el sistema NO DEBE pintar la pregunta.

## R9
CUANDO se da una categoría a varias filas a la vez con la barra de filas marcadas de
`Review`, el sistema NO DEBE pedir el preview ni pintar la pregunta.

## Las dos respuestas

## R10
CUANDO se pulsa `Create rule` en la pregunta, el sistema DEBE hacer exactamente una
petición `POST /api/category-rules` con el cuerpo
`{ matchText: <texto del campo>, categoryId: <la categoría elegida> }`, y antes de esa
pulsación NO DEBE haber hecho ninguna escritura salvo el `PATCH` del cambio a mano.

## R11
CUANDO el `POST` de R10 da una respuesta con resultado, el sistema DEBE cerrar la
pregunta y pintar la línea de la regla creada, con cuántos movimientos se categorizaron,
en el bloque bajo la barra superior de la pantalla donde se hizo el cambio (`Movements`
o `Review`).

## R12
SI el `POST` de R10 se rechaza (400, 404, 409) o no llega al servidor, ENTONCES el
sistema DEBE dejar la pregunta abierta con la frase de `ruleErrorMessage` y no hacer
ninguna otra petición.

## R13
CUANDO se pulsa `No, only this one`, o se hace otra acción de escritura en la pantalla,
o se pulsa `Undo`, o se sale de la pantalla, el sistema DEBE cerrar la pregunta sin
enviar ninguna petición.

## Dónde se ve

## R14
MIENTRAS la pregunta está abierta, el sistema DEBE pintarla dentro del bloque que se
queda bajo la barra superior, debajo de la línea de la última acción y de su `Undo`, de
forma que esa línea, el `Undo` y la pregunta queden a la vista y sin taparse aunque el
cambio se haya hecho en una fila del final de la lista.

## De dónde salió la categoría

## R15
El sistema DEBE pintar `CLOSING_SOURCE_LABEL` en la línea pequeña bajo la descripción de
cada fila de `Movements` y de `Review` cuyo `categorySource` es `closing`, y NO DEBE pintar
nada sobre el origen de la categoría cuando es `manual`, `rule` o `null`.

## Procedencia

- R1 — (humano) Sale de «cuando cambio a mano la categoría de un movimiento, en
  `Movements` o en `Review`, que la aplicación me pregunte…» y de «diciéndome cuántos y
  cuáles serían». Se pregunta al backend con el preview porque su número es el que mueve
  la regla (garantía del contrato).
- R2 — (humano) Respuesta del 2026-10-18: «el texto que se ofrece por defecto es el mismo
  que propondría la lista de reglas propuestas para ese concepto». **Cómo se obtiene es
  decisión mía:** el backend no da ese texto para un movimiento suelto (`suggestions`
  solo lista conceptos con 3 o más movimientos que no están puestos a mano, y tras el
  cambio el movimiento ya es `manual`), así que se calcula en el navegador con los pasos
  del contrato. ← REVISAR EN APROBACIÓN (riesgo de que no coincida; alternativa: pedir un
  campo al backend).
- R3 — (humano) «Cambio la categoría de un movimiento y la aplicación me pregunta…» y
  «antes de decir que sí, veo cuántos movimientos se moverían».
- R4 — (humano) «…y cuáles». Plegados detrás de un botón, como en la lista de propuestas
  de la feature 33 (decisión mía de forma, no de alcance).
- R5 — (humano) «Puedo cambiar el texto antes de decidir, y lo que se movería se
  actualiza».
- R6 — (añadido) El humano no dijo qué pasa con un texto que el backend rechazaría o que
  no se ha podido comprobar. Propongo: no se puede crear la regla hasta que el número que
  se ve es el de ese texto. ← REVISAR EN APROBACIÓN.
- R7 — (humano) «…o me dice que no hay ninguno», para el texto que él escribe. `Create
  rule` sigue encendido: la regla sirve para lo que se importe después. ← REVISAR.
- R8 — (humano) «Si no hay ningún otro movimiento que se movería, no me pregunta» (elijo
  la primera de sus dos opciones) y «no quiero que me pregunte cuando ya existe una regla
  para ese texto» (el preview da 409). (añadido) Tampoco se pregunta si el texto propuesto
  sale con menos de 5 caracteres (la lista de propuestas tampoco lo propondría) ni si el
  preview falla. ← REVISAR EN APROBACIÓN.
- R9 — (añadido) El leader me pidió decidir si la pregunta sale al poner categoría a
  varias filas a la vez. Decido que no: cada fila puede dar un texto distinto. Alternativa
  descartada: preguntar si todas las marcadas dan el mismo texto. ← REVISAR.
- R10 — (humano) «Si digo que sí, se crea la regla» y «no quiero que se cree ninguna
  regla sin que yo diga que sí».
- R11 — (humano) «…y veo cuántos se han movido». En `Movements` la línea de la regla
  creada no existía (incoherencia apuntada en la feature 33): se añade.
- R12 — (añadido) Qué pasa si crear la regla falla: lo mismo que en la feature 33, la
  frase en el sitio de la pregunta y nada más cambia.
- R13 — (humano) «Si digo que no, solo cambia ese movimiento, como ahora». (añadido) Que
  otra acción, `Undo` o salir de la pantalla también la cierren: la pregunta habla de un
  cambio que ya no es el último.
- R14 — (delegado) El humano cedió «cómo se hace la pregunta: en la propia línea, o en una
  ventana». Decido: en el bloque que ya se queda bajo la barra superior, debajo de la línea
  del cambio y su `Undo`. Alternativas descartadas: debajo de la fila (desaparece si la
  fila sale de la lista por un filtro) y una ventana (tapa la línea y el `Undo` de la
  feature 27).
- R15 — (humano) Respuesta del 2026-10-18: «de dónde salió la categoría se enseña de forma
  discreta solo cuando la puso el cierre de la importación; cuando la puso él o una
  regla, no se enseña». El texto y el sitio son decisión mía.
