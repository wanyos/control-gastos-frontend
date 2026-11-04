# Requirements — F40 `investments-gains`

Fuente de verdad del QUÉ: el bloque `intent` de la feature 40 en `feature_list.json`.
Fuente de verdad de la API: `../gastos-backend/docs/api-contract.md`, sección
«`GET /api/investments/gains`» (feature 67 del backend, 2026-11-04). Sin parámetros.
Devuelve `asOf`, `total` (`gain`, `invested`, `gainPercent`, `excluded`), `live` y
`closed`. Tipos que salen: `fund`, `etf`, `managed_portfolio`, `deposit`. Motivos de
una cifra `null` (`reason`): `no_photo`, `gain_not_reported`,
`gain_percent_not_reported`, `maturity_not_found`, `ambiguous`, `below_principal`,
`missing_conditions`.

«La pantalla» = `/investments` (`InvestmentsView`).
«La cifra grande» = el resumen de arriba con el total de los productos vivos.
«Un producto vivo / cerrado» = una entrada de `live` / de `closed`.
Los textos exactos de pantalla están en `design.md §4`; los requirements los citan.

## R1
CUANDO se monta la pantalla, el sistema DEBE pedir `GET /api/investments/gains`
exactamente una vez, con método `GET`, sin cuerpo y sin querystring.

## R2
CUANDO llega la respuesta y `live` no está vacío, el sistema DEBE enseñar arriba, con la
etiqueta `Gain or loss on live investments`, `total.gain` y `total.gainPercent` tal como
llegan (con signo `+` si son mayores que cero; `—` si `total.gainPercent` es `null`) y
la línea `on <total.invested> put in`, con la cifra y el porcentaje en verde si
`total.gain` es mayor que cero, en rojo si es menor y en el color neutro si es cero.

## R3
CUANDO `total.excluded` no está vacío, el sistema DEBE enseñar bajo la cifra grande la
línea `Not included: <name> (<motivo>)`, con todos los productos de `total.excluded`
en su orden, separados por `, `, y el motivo de `design.md §4`.

## R4
El sistema DEBE pintar, en la tarjeta `Your investments`, una fila por cada producto
vivo con: nombre, tipo (`design.md §4`), banco (`bankLabel`), `Started <openedAt>`,
`Put in <invested>`, `Worth <currentValue> today` si `valuedAt` es `asOf` o
`Worth <currentValue> on <valuedAt>` si no, y a la derecha `gain` y `gainPercent`
formateados, en verde si `gain` es mayor que cero, en rojo si es menor y neutros si es
cero.

## R5
El sistema DEBE ordenar las filas de productos vivos de mayor a menor `gain` en euros,
con las filas de `gain` `null` al final y, a igualdad, en el orden en que llegan.

## R6
El sistema DEBE pintar en cada fila de producto vivo con `gain` no nulo una barra
horizontal que sale de una línea central: hacia la derecha y en verde si `gain` es mayor
que cero, hacia la izquierda y en rojo si es menor, sin relleno si es cero, con una
longitud proporcional a `|gain|` respecto al mayor `|gain|` de los productos vivos.

## R7
CUANDO un producto vivo es un depósito con cifras (`reason` `null`), el sistema DEBE
enseñar en su fila la línea
`Counted day by day: <conditions.expectedGain> when it matures on <conditions.maturityDate>`.

## R8
CUANDO un producto trae una cifra `null`, el sistema DEBE pintar `—` en su lugar (nunca
`0,00 €` ni `0 %`) y la línea con el motivo de su `reason` (`design.md §4`), seguida de
`· Not in the total` si el producto es vivo y su `gain` es `null`.

## R9
CUANDO `closed` no está vacío, el sistema DEBE pintar, debajo de `Your investments`, la
tarjeta `Closed` con la frase de `design.md §4` que dice que no suman en el total y una
fila por producto cerrado en el orden en que llegan, toda en gris, sin barra, con:
nombre, tipo, banco, `Started <openedAt>`, `Closed <closedOn>`, y `gain` y
`gainPercent` con su signo.

## R10
CUANDO un producto cerrado es un depósito cuyo `closedOn` es anterior a
`conditions.maturityDate`, el sistema DEBE enseñar en su fila la línea
`Cancelled before it matured`.

## R11
SI la respuesta trae en `live` o en `closed` un producto con un `type` que no es `fund`,
`etf`, `managed_portfolio` ni `deposit`, o su `total.gain` no es la suma de los `gain`
no nulos de `live`, ENTONCES el sistema DEBE rechazarla como respuesta que no cumple el
contrato y no pintar ninguna cifra de ella.

## R12
El sistema NO DEBE montar la tarjeta `Deposits` (`DepositEarnings`) ni pedir
`GET /api/investments/deposits` desde ninguna pantalla.

## R13
CUANDO termina una importación y la pantalla ya había leído lo ganado, el sistema DEBE
volver a pedir `GET /api/investments/gains`.

## R14
SI la petición falla o su respuesta no cumple el contrato ENTONCES el sistema DEBE
pintar la tarjeta `Couldn't load your investments` con el mensaje del error y el botón
`Try again`, que vuelve a pedir `GET /api/investments/gains`.

## R15
MIENTRAS la petición está en curso, el sistema DEBE pintar `Loading your investments…`;
y CUANDO llega con `live` y `closed` vacíos, el sistema DEBE pintar
`You have no investments yet.` en lugar de la cifra grande y de las dos tarjetas.

> Nota sobre R15: junta dos estados de la pantalla (cargando y vacío) en un solo
> requirement para no pasar del tope de 15. Se prueba con dos tests distintos
> (`tasks.md`). El caso «`live` vacío y `closed` con algo» lo cubre `design.md §4`
> (`No live investments right now.` en lugar de la cifra grande) dentro de R2.

## Procedencia

- R1 — (añadido) El humano no dijo cómo se pide. Decido una sola petición al abrir la
  pantalla, solo `GET`: es el contrato del backend y cumple «No poder editar productos
  desde aquí» (`que_no_quiero`).
- R2 — (humano) «Arriba, una cifra grande con lo que gano o pierdo en total con las
  inversiones que siguen vivas, en euros y en porcentaje, en verde si gano y en rojo si
  pierdo». El % es el del backend tal cual (delegado: «ya lo decidió el backend»). La
  línea `on … put in` y el color neutro para el cero son (añadido) ← REVISAR EN
  APROBACIÓN. `No live investments right now.` con `live` vacío es (añadido): pintar
  `0,00 €` sería un total de nada.
- R3 — (humano, frase marcada «[añadido por el leader]» y aprobada) «la pantalla dice
  que no entra en el total». Los textos de los motivos son (delegado, textos).
- R4 — (humano) «Veo cada producto con su fecha de inicio, lo invertido, lo que vale
  ahora y lo que gana o pierde en euros y en porcentaje». Que `Worth` diga la fecha del
  dato cuando no es de hoy es (añadido): la foto de un fondo puede ser de hace meses y
  sin fecha parecería de hoy ← REVISAR EN APROBACIÓN. El color de la ganancia de la
  fila es (añadido), el mismo criterio que la cifra grande.
- R5 — (humano + delegado) «ordenados de lo que más gana a lo que más pierde». Elijo
  ordenar por euros, no por %: es lo que suma en la cifra grande ← REVISAR EN
  APROBACIÓN.
- R6 — (humano + delegado) «una barra horizontal que enseña de un vistazo cuáles suman y
  cuáles restan». Decido barra a dos lados de una línea central, escalada al mayor
  `|gain|` ← REVISAR EN APROBACIÓN.
- R7 — (delegado) Decisión del humano del 2026-11-04: «un depósito vivo suma su ganancia
  esperada repartida por días hasta hoy». Cómo se enseña lo cedió en el encargo de esta
  hoja. Decido la línea con lo que ganará y cuándo; la cifra de la fila ya es lo
  acumulado hasta hoy ← REVISAR EN APROBACIÓN.
- R8 — (humano, frase marcada «[añadido por el leader]» y aprobada) «Un producto del que
  no hay dato para calcular lo ganado se ve con el hueco y el motivo, y la pantalla dice
  que no entra en el total; nunca se pinta como cero». Que `gain_percent_not_reported`
  no diga `Not in the total` es lo que manda el contrato (ese producto sí suma).
- R9 — (humano) «Los productos ya cerrados … se ven aparte, como referencia, con otro
  tono de color, lo que ganaron o perdieron y que ya se cerraron. No suman en el total».
  Que el tono sea gris sin verde ni rojo, sin barra y sin `Put in`/`Worth` es (delegado,
  cómo se enseña) ← REVISAR EN APROBACIÓN.
- R10 — (añadido) El humano decidió que un cancelado pasa a cerrados con 0; sin la línea,
  un `+0,00 €` no se entiende. Sale de comparar dos fechas del contrato, no de un
  cálculo ← REVISAR EN APROBACIÓN.
- R11 — (humano) «En esta pantalla no sale ninguna cuenta, ni la remunerada». El backend
  ya las deja fuera; el frontend rechaza la respuesta si llegara una. La comprobación del
  total es (añadido), la misma regla de la F38: una cifra que no cuadra no se enseña.
- R12 — (delegado) «Si los depósitos van en la misma lista que el resto o en su tarjeta
  debajo». Decido la misma lista: `gains` ya trae cada depósito con lo que ganó, y con la
  tarjeta un depósito vivo saldría dos veces con dos cifras distintas (`Not earned yet`
  en la tarjeta, lo acumulado en la lista). Cubre «Los depósitos siguen viéndose en esta
  pantalla con lo que ganó cada uno» ← REVISAR EN APROBACIÓN.
- R13 — (añadido) Sustituye a la recarga de depósitos tras importar (decisión 6 de la
  F38, mantenida en la F39): tras importar puede aparecer el cobro de un depósito.
- R14 — (añadido) El humano no dijo qué pasa si falla. Igual que el resto de pantallas.
- R15 — (añadido) Estados de carga y vacío, como en la F38.
- «Textos en inglés, en oscuro, y pnpm type-check, lint, test:unit, build e ./init.sh en
  verde» (humano, frase «[añadido por el leader]» aprobada): no es un `R<n>` propio. Los
  textos están fijados en `design.md §4`; los colores son alias ya medidos en
  `src/assets/theme-dark.css` (`--positive`, `--negative`, `--ink-muted` sobre
  `--surface-card`; `--positive` y `--chart-6`, que es `--negative`, sobre
  `--surface-sunken`); los comandos son un check.
- «Que lo ganado con las inversiones se sume al patrimonio de Net Worth» y «No cambiar
  Net Worth» (`que_no_quiero`): la feature no toca `src/features/net-worth/`. Lo siguen
  vigilando los tests que ya existen de `NetWorthView` y de su store.
