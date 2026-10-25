# Requirements — F37 `expenses-by-category`

Una pantalla nueva, de solo lectura, que enseña lo gastado por categoría en un mes o en un
año natural, separado en gasto fijo y gasto variable, comparado con el periodo anterior y
con los movimientos de cada categoría desplegables. Sustituye a `Monthly cost` (F32): su
entrada del menú, su ruta y su código se quitan en esta misma feature. 16 requirements
(uno por encima del tope de ~15; la razón está en `decisions.md`, bloque técnico).

Fuente: el `intent` de la feature 37 (con sus cinco `respuestas_del_humano` y los puntos
`[añadido por el leader]`), el contrato `gastos-backend/docs/api-contract.md` leído el
2026-10-25 (`GET /api/expenses-by-category`, modelo `Category` con `isFixed`, y
`GET /api/overview` para la igualdad del total), y `../docs/ideas.md` (bloque «Decisiones
concretas» y el refinamiento de Recurrentes del 2026-10-18).

**Definiciones usadas en todo el documento.**

- **La pantalla:** `ExpensesByCategoryView`, en la ruta `/expenses-by-category`.
- **La consulta:** `GET /api/expenses-by-category` con su querystring.
- **El periodo pedido** y **el periodo comparado:** `period` y `compared` de la respuesta.
- **Una línea:** un elemento de `fixed.lines` o de `variable.lines`.
- **La línea sin categoría:** la línea con `category: null` (siempre en `variable`).
- **El modo:** `month` (la querystring lleva `month`) o `year` (lleva `year`).

Los textos exactos de pantalla están en `design.md §6`; aquí se citan por su constante.

## El menú y la pantalla que se quita

## R1
El sistema DEBE tener una entrada `Expenses by category` en el menú lateral, con el icono
`ChartBar`, justo debajo de la entrada `Overview`, que lleva a la pantalla
(`/expenses-by-category`).

## R2
CUANDO se navega a `/monthly-cost`, el sistema DEBE llevar a la pantalla de inicio
(`Net Worth`), igual que con cualquier dirección desconocida, sin ninguna entrada
`Monthly cost` en el menú.

## Qué se pide

## R3
CUANDO se abre la pantalla sin periodo en la dirección, el sistema DEBE pedir una sola vez
la consulta con `month=<mes en curso>&compare=previous-month`, con método `GET` y sin
cuerpo.

## R4
CUANDO el humano elige `Year` en el selector de modo, el sistema DEBE pedir la consulta
con `year=<año del mes que se estaba viendo>` y sin `compare`.

## R5
CUANDO, en modo `month`, el humano elige `Same month last year` en `Compare with`, el
sistema DEBE pedir la consulta del mismo mes con `compare=same-month-last-year`.

## R6
El sistema DEBE leer el periodo de la dirección (`?month=YYYY-MM&compare=…` o
`?year=YYYY`) y escribirlo en ella al cambiarlo, de modo que recargar o volver atrás
enseñe el mismo periodo, y leyendo como «mes en curso contra el mes anterior» cualquier
valor que no se entienda.

## Qué se ve

## R7
CUANDO la consulta responde, el sistema DEBE enseñar, antes que cualquier cifra o barra,
una frase (`periodSentence`, design §6) con el periodo pedido, el `amount` de la raíz y su
`difference` frente al periodo comparado, nombrado.

## R8
CUANDO la consulta responde, el sistema DEBE enseñar el total del periodo con el `amount`,
el `comparedAmount` y la `difference` de la raíz tal como los manda el backend, sin
recalcularlos.

## R9
CUANDO la consulta responde, el sistema DEBE enseñar dos bloques, `Fixed` y después
`Variable`, cada uno con su `amount`, `comparedAmount` y `difference` del backend y sus
líneas en el orden en que llegan.

## R10
El sistema DEBE pintar cada línea con el nombre de su categoría (`NO_CATEGORY` para la
línea sin categoría), una barra horizontal cuya longitud es la parte que su `amount` es
del `amount` de la raíz, ese porcentaje en cifra, su `amount`, su `comparedAmount` y su
`difference` con signo.

## R11
MIENTRAS el modo es `year`, el sistema DEBE pintar en cada línea, además, su
`monthlyAmount` en una columna `A month`.

## R12
El sistema DEBE marcar con la etiqueta `New` la línea con `change: "new"` y con la
etiqueta `Gone` la línea con `change: "gone"`, y con ninguna etiqueta las demás.

## R13
CUANDO el humano pulsa `Show movements` en una línea que tiene movimientos, el sistema
DEBE enseñar debajo de ella sus `movements` (fecha, descripción e importe) en el orden en
que llegan; una línea sin movimientos (`"gone"`) no lleva ese botón.

## R14
CUANDO la consulta responde, el sistema DEBE enseñar, encima de los bloques, cuántos
movimientos tiene la línea sin categoría y qué porcentaje es su `amount` del `amount` de
la raíz (`uncategorizedLine`, design §6), o `ALL_CATEGORIZED` si no hay línea sin
categoría con gasto en el periodo pedido.

## Lo que no cuadra y lo que falla

## R15
SI la respuesta no tiene la forma del contrato, o el `amount` de la raíz no es la suma de
los de `fixed` y `variable`, o el `amount` de un bloque no es la suma de los de sus
líneas, ENTONCES el sistema DEBE tratarla como un fallo de la consulta (R16) y no enseñar
ninguna de sus cifras.

## R16
SI la consulta falla (red, respuesta no-2xx o R15) ENTONCES el sistema DEBE enseñar
`expensesErrorMessage` (design §6) con un botón `Try again` que repite la misma consulta.

> El periodo sin ningún gasto en los dos lados no es un requirement aparte: R7 lo cubre con
> su frase de periodo vacío (`EMPTY_SENTENCE`), y R9 con los dos bloques sin líneas, que
> dicen `NO_LINES` (design §6). Tiene su test (T6).
>
> La frase «Textos en inglés, en oscuro, y pnpm type-check, lint, test:unit, build e
> ./init.sh en verde» no tiene requirement propio: la cumplen los textos de design §6 (en
> inglés), los tokens de design §5 (solo alias del tema oscuro) y los `checks`.

## Procedencia

- R1 — (añadido) El humano pidió una pantalla nueva que sustituye a `Monthly cost`, pero no
  su nombre ni su sitio. Propongo `Expenses by category`, en el hueco que deja `Monthly
  cost` (justo debajo de `Overview`), con el icono `ChartBar`. ← REVISAR EN APROBACIÓN
  (hoja 🔴 2).
- R2 — (humano) «Monthly cost ya no está en el menú ni se puede abrir por su dirección» y
  la respuesta del 2026-10-23 «quitar Monthly cost del menú ya». Que la dirección vieja
  lleve a `Net Worth` es lo que ya hace el router con toda dirección desconocida.
- R3 — (delegado) «qué periodo sale por defecto»: el mes en curso contra el mes anterior,
  como abre `Overview`. Alternativa en la hoja 🔴 3. Lo de «solo `GET`» sale del contrato
  (solo existe el `GET`) y de «No tocar el backend».
- R4 — (humano) «Cuando cambio a un año, veo lo mismo para el año». Que el año sea el del
  mes que se veía es (delegado) «cómo elegir mes o año».
- R5 — (delegado) «con qué se compara (mes anterior / mismo mes del año pasado)». Las dos
  opciones del contrato, en un desplegable, por defecto el mes anterior.
- R6 — (delegado) «cómo elegir mes o año». Guardar el periodo en la dirección es lo que ya
  hacen `Overview` y `Movements`.
- R7 — (añadido) Sale de `../docs/ideas.md`, «Lo primero que se lee es una frase, no un
  gráfico», no del `intent`. El texto concreto de la frase es mío. ← REVISAR EN
  APROBACIÓN (hoja 🔴 4).
- R8 — (humano) «con el total y la diferencia frente al mes anterior».
- R9 — (humano) «separado en gasto fijo y gasto variable». El orden `Fixed` y después
  `Variable` es (delegado) «cómo se ven fijo y variable».
- R10 — (delegado) «las barras por categoría (barras horizontales)». La longitud como parte
  del total del periodo y el porcentaje en cifra son míos (hoja 🔴 5). El nombre
  `No category` de la línea sin categoría sale del punto «[añadido por el leader]» sobre
  los gastos sin categoría.
- R11 — (humano, punto «[añadido por el leader]» aprobado el 2026-10-25) «y, además, la
  media mensual de cada categoría». El nombre de la columna, `A month`, es mío.
- R12 — (humano, punto «[añadido por el leader]») «Una categoría nueva o que ya no está se
  distingue de las demás». Las palabras `New` y `Gone` son mías.
- R13 — (humano) «los movimientos de cada categoría desplegables debajo de su línea» y la
  respuesta del 2026-10-23. Que la línea `"gone"` no tenga botón es (añadido): no tiene
  movimientos en el periodo pedido (contrato).
- R14 — (humano, punto «[añadido por el leader]») «Los gastos sin categoría salen en su
  propia línea y la pantalla dice cuánto pesan sobre el total», con el formato de
  `../docs/ideas.md` («N movimientos sin categoría — X % del gasto»). La frase cuando no hay
  ninguno (`ALL_CATEGORIZED`) es (añadido).
- R15 — (añadido) Para que el total que se enseña no pueda contradecir a los bloques ni a
  las líneas de debajo, como hizo `Monthly cost` (F32). Apoya la frase «El total del mes
  coincide con el gasto de Overview de ese mes», que garantiza el contrato: el frontend
  enseña el `amount` del backend sin tocarlo (R8).
- R16 — (añadido) El `intent` no habla de fallos. Es lo que hacen todas las pantallas de la
  aplicación (`Try again`).
