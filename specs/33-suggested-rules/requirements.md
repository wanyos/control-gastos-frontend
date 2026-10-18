# Requirements — F33 `suggested-rules`

Una lista de reglas propuestas dentro de `Rules` (`src/features/category-rules/`), y lo
que hace falta para que el resto de la aplicación deje de decir que crear una regla no
categoriza nada. 16 requirements (uno por encima del tope; la razón está en
`decisions.md`). Fuente: el `intent` de la feature 33 y el contrato
`gastos-backend/docs/api-contract.md` (features 60 y 61 del backend), leído el
2026-10-18: `GET /api/category-rules/suggestions`, `POST /api/category-rules` (con
`categorization`), `PATCH /api/category-rules/:id` (con `categorization`) y
`POST /api/category-rules/apply`.

**Definiciones usadas en todo el documento.**

- **Una propuesta:** un elemento de la respuesta de `GET /api/category-rules/suggestions`
  (`matchText`, `kind`, `movementCount`, `movements`, `manualMatches`).
- **La lista de propuestas:** el bloque nuevo de `RulesView`, `data-test="suggested-rules"`.
- **El recuadro del resultado:** el componente `LastApplyReport` de la feature 30, que
  pintan `Rules` y `Review` (`data-test="last-apply"`).
- **La línea de la regla creada:** el componente `RuleCreatedNotice`
  (`data-test="rule-created-notice"`), dentro de `StickyBelowTopBar` (feature 27).
- **Respuesta con resultado:** una respuesta 201 del `POST` o 200 del `PATCH` cuyo
  `categorization` se ha podido leer.

Los textos exactos de pantalla están en `design.md §5`; aquí se citan por su constante.

## La lista de propuestas

## R1
CUANDO se monta `RulesView`, el sistema DEBE pedir `GET /api/category-rules/suggestions`
y pintar, en la lista de propuestas y en el orden en que llegan, una fila por propuesta
con su `matchText`, si es de gastos o de ingresos (`KIND_LABEL`) y cuántos movimientos
recogería (`movementCount`).

## R2
CUANDO se pulsa el botón `Show the N movements` de una propuesta, el sistema DEBE pintar
debajo de ella sus `movements`, cada uno con fecha, concepto e importe con signo, sin
hacer ninguna petición; un segundo clic (`Hide the movements`) los vuelve a plegar.

## R3
El sistema DEBE ofrecer en cada propuesta un desplegable de categoría con solo las
categorías del `kind` de la propuesta, que empieza en `Choose a category…` sin ninguna
elegida, y un botón `Create rule` apagado mientras no hay categoría elegida.

## R4
CUANDO se pulsa `Create rule` en una propuesta con una categoría elegida, el sistema DEBE
hacer exactamente una petición `POST /api/category-rules` con el cuerpo
`{ matchText: <matchText de la propuesta>, categoryId: <la elegida> }`, y mientras no
responde ningún botón `Create rule` de la pantalla DEBE hacer nada.

## R5
CUANDO un `POST` o un `PATCH` de una regla da una respuesta con resultado, el sistema
DEBE poner en el recuadro del resultado, en `Rules` y en `Review`, una cabecera que dice
la regla, su categoría, si se creó o se cambió, la hora y cuántos movimientos se
categorizaron (`ruleSavedHeadline`), con la lista de esos movimientos y de los choques
como en la feature 30.

## R6
CUANDO un `POST` de una regla da una respuesta con resultado, el sistema DEBE pintar la
línea de la regla creada, en `Rules` y en `Review`, con la regla, su categoría y cuántos
movimientos se categorizaron (`ruleCreatedLine`), a la vista aunque la página esté bajada.

## R7
CUANDO el `POST` de una propuesta da una respuesta con resultado, el sistema DEBE quitar
esa propuesta de la lista en el momento y volver a pedir
`GET /api/category-rules/suggestions` para pintar la lista que devuelva.

## R8
El sistema NO DEBE ofrecer ningún control que descarte o esconda una propuesta: una
propuesta que no se usa sigue en la lista mientras el backend la devuelva.

## R9
DONDE una propuesta trae `manualMatches` mayor que 0, el sistema DEBE pintar en su fila
la frase `manualMatchesLine(manualMatches)`, que dice cuántos movimientos categorizados a
mano contienen el texto y que no se moverán.

## R10
SI el `POST` de una propuesta responde 400, 404 o 409, o no llega al servidor, ENTONCES
el sistema DEBE pintar en la fila de esa propuesta la frase de `ruleErrorMessage`, y
dejar la lista de propuestas, la lista de reglas y el recuadro del resultado como
estaban, sin otra petición que ese `POST`.

## R11
SI una respuesta con resultado trae `categorization.error` ENTONCES el sistema DEBE
añadir la frase `UNFINISHED_MOVE` (no se pudieron mover todos; el resto se moverá al
crear o cambiar otra regla) al recuadro del resultado y, si es un `POST`, también a la
línea de la regla creada.

## R12
MIENTRAS la petición de propuestas no ha respondido, ha fallado o devuelve `[]`, el
sistema DEBE pintar en la lista de propuestas `SUGGESTIONS_LOADING`, la frase de
`suggestionsErrorMessage` con un botón `Try again`, o `NO_SUGGESTIONS`, respectivamente;
una respuesta que no cumple el contrato (falta un campo, o `movementCount` distinto de
la longitud de `movements`) DEBE tratarse como un fallo.

## Lo que deja de ser verdad en lo que ya existe

## R13
El sistema NO DEBE pintar el botón `Apply rules now` en la línea de la regla creada, ni
en `Review` ni en ningún otro sitio; el botón `Apply rules` de la cabecera de `Rules`
DEBE seguir igual.

## R14
CUANDO un `POST` o un `PATCH` de una regla termina con cualquier respuesta que no sea
400, 404 o 409 (con resultado, sin poderse leer, o un fallo del servidor), el sistema DEBE
hacer que `Review` y `Movements` vuelvan a pedir lo que enseñan, como hacen tras aplicar
las reglas.

## R15
CUANDO termina el `PATCH` o el `DELETE` de una regla, o una aplicación de las reglas,
con cualquier respuesta que no sea 400, 404 o 409, el sistema DEBE volver a pedir
`GET /api/category-rules/suggestions` si la lista de propuestas ya se había pedido.

## R16
El sistema DEBE pintar, en lugar de la frase de la cabecera de `Rules` y de la nota del
recuento de la ventana de crear o cambiar una regla, los textos `RULES_INTRO` y
`PREVIEW_NOTE`, que dicen que crear o cambiar una regla también mueve los movimientos
cuya categoría se puso al cerrar la importación y que el recuento no los cuenta.

## Procedencia

- R1 — (humano) «Veo la lista de propuestas, cada una con su texto y cuántos movimientos
  recogería» y «de la que más movimientos recoge a la que menos» (el orden lo da el
  backend). La etiqueta de gastos/ingresos es (delegado: «cómo se dibuja la lista»): sin
  ella, dos propuestas de distinto tipo no se distinguen.
- R2 — (humano) «Puedo ver los movimientos de una propuesta antes de decidir». (delegado)
  plegados por defecto: con 67 propuestas, desplegados harían una página de cientos de
  filas. Alternativa descartada: una ventana por propuesta.
- R3 — (humano) «En cada una elijo la categoría» + que_no_quiero «que se cree ninguna
  regla sin que yo elija la categoría» y «que la aplicación me proponga la categoría».
  (delegado) un desplegable en la propia fila; descartado abrir la ventana de crear regla
  por cada propuesta (dos clics más por decisión, sesenta veces).
- R4 — (humano) «se crea la regla». (delegado) el texto de la propuesta **no se puede
  editar** aquí: es el único con el que el número que se ve es el que se mueve (contrato,
  «El número es el que mueve la regla»). Alternativa descartada: editable con
  `GET /api/category-rules/preview` recalculando; lo construye la feature 34.
- R5 — (humano) «veo cuántos movimientos ha movido y cuáles». Reutiliza el recuadro de la
  feature 30, como pidió el leader. Extenderlo al `PATCH` es (añadido): cambiar una regla
  también mueve movimientos desde la feature 60 del backend, y sin esto lo haría callado.
- R6 — (añadido) que el número se vea aunque la fila usada esté abajo en la lista: el
  recuadro está arriba de la página. Reutiliza la línea que la feature 27 deja a la vista.
- R7 — (humano) «La propuesta que acabo de usar desaparece de la lista». Volver a pedir
  la lista es (delegado): otras propuestas pueden cambiar al moverse movimientos.
- R8 — (humano) «Si una propuesta no me interesa, la dejo y sigo» + respuesta del
  2026-10-18: no se pueden descartar.
- R9 — (humano) «Si la propuesta casa también con movimientos que categoricé yo a mano,
  me lo dice, y esos no se mueven».
- R10 — (humano) «Si falla, me lo dice y no ha cambiado nada», en los casos en que el
  contrato garantiza que no se escribió nada.
- R11 — (añadido) El contrato dice que, si la pasada falla a mitad, la regla queda creada
  y lo ya movido se queda: ahí «no ha cambiado nada» no se puede cumplir, y se dice.
- R12 — (añadido) Estados de carga, fallo y lista vacía; no los dijo el humano.
- R13 — (delegado al leader por el humano, respuesta del 2026-10-18) se quita
  `Apply rules now`; el botón `Apply rules` se queda.
- R14 — (añadido) Sin esto, `Review` y `Movements` enseñarían categorías que ya no son
  las de la base tras crear o cambiar una regla. Mismo mecanismo que tras aplicar.
- R15 — (añadido) Cambiar o borrar una regla, o aplicarlas, puede cambiar qué se propone
  (el contrato saca las propuestas de lo que ninguna regla reconoce).
- R16 — (añadido) El encargo del leader: textos que daban por hecho que crear una regla
  no categoriza nada.
