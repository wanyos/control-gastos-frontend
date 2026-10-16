# Requirements — F31 `deposit-counted-amount`

Pantallas `Movements` (`src/features/statement/`) y `Review` (`src/features/review/`).
15 requirements. Fuente: el `intent` de la feature 31 y el contrato
`gastos-backend/docs/api-contract.md` → `GET /api/movements`, campo `movements[].deposit`
y §«Movimientos de depósito en las sumas» (feature 57 del backend, commit `f8b2aa0`).

**Definiciones usadas en todo el documento.**

- **Movimiento de depósito:** el que llega de `GET /api/movements` con `deposit` distinto
  de `null`. Lo decide el backend; el frontend no mira la descripción.
- **Apertura o cancelación resuelta:** `deposit.kind` es `opening` o `cancellation` y
  `deposit.ambiguous === false`. Suma `0`.
- **Vencimiento resuelto:** `deposit.kind === 'maturity'` y `deposit.ambiguous === false`.
  Suma `deposit.countedAmount` (su interés).
- **Dudoso:** `deposit.ambiguous === true` (un vencimiento sin capital cierto o una
  cancelación sin apertura). Suma `0` de momento. «Dudoso» es palabra del humano.
- **Lo que esconde la casilla en el navegador:** las aperturas y cancelaciones resueltas.
  Nada más: un vencimiento resuelto y un dudoso nunca.

Los textos exactos de pantalla están en `design.md §4`; los requirements los citan por su
`data-test`.

## Lectura del campo `deposit`

## R1
CUANDO llega una respuesta de `GET /api/movements`, el sistema DEBE leer `deposit` de cada
movimiento como `null` o como un objeto con `kind` (`opening` | `cancellation` |
`maturity`), `principal` (decimal o `null`), `countedAmount` (decimal), `ambiguous`
(booleano), `reason` (`principal_not_found` | `several_principals` | `opening_not_found` |
`null`) y `candidateMovementIds` (lista de enteros), y SI falta la clave o un valor no
cumple eso ENTONCES lanzar `ValidationError` con la ruta del campo
(`GET /api/movements: movements[0].deposit…`).

## R2
CUANDO `Movements` o `Review` sustituyen una línea por el movimiento que devuelve un
`PATCH /api/movements` o `PATCH /api/movements/:id` (que no traen `deposit`), el sistema
DEBE conservar en esa línea el `deposit` que traía la última lectura de ese movimiento.

## La línea de un movimiento de depósito (`Movements`)

## R3
MIENTRAS un movimiento es una apertura o cancelación resuelta, el sistema DEBE pintar su
importe (`statement-row-amount`) con `text-ink-faint` y `line-through`, y su concepto
(`statement-row-description`) con `text-ink-muted`, igual que un movimiento que no cuenta
de la feature 29.

## R4
MIENTRAS un movimiento es de depósito, el sistema DEBE escribir en el segundo renglón,
a continuación de la cuenta, el texto de su clase (`data-test="statement-row-deposit"`):
`Deposit opening`, `Deposit cancellation` o `Deposit maturity · only the interest counts`,
o el texto de dudoso de R7.

## R5
MIENTRAS un movimiento es un vencimiento resuelto, el sistema DEBE pintar el importe del
banco sin `line-through` y con `text-ink-muted`, y debajo, en la misma columna, el texto
`Counts <countedAmount formateado>` con `text-positive`
(`data-test="statement-row-counted"`), p. ej. `Counts 37,07 €`.

## R6
El sistema DEBE pintar en todo movimiento de depósito el importe que dio el banco, con su
signo (`-` si `type` es `expense`), formateado con `formatMoney` desde `amount`, sin
sustituirlo por `countedAmount`.

## R7
MIENTRAS un movimiento es dudoso, el sistema DEBE pintar su importe con `text-ink-faint` y
`line-through`, y en `statement-row-deposit`, con `text-warning`, el texto de dudoso de su
clase y de su `reason` (design §4).

## R8
MIENTRAS un movimiento es de depósito, el sistema NO DEBE pintar las palabras `Transfer`
(`statement-row-transfer`) ni `Not counted` (`statement-row-excluded`), tenga o no
`transferId` o `excludedFromTotals`.

## `Review`

## R9
MIENTRAS un movimiento de depósito está en la lista de `Review`, el sistema DEBE pintar su
línea (`movement-row`) con los mismos textos, colores y tachado de R3 a R8, con los
`data-test` `movement-deposit` y `movement-counted`; las líneas que no son de depósito NO
DEBEN cambiar.

## La nota bajo las cifras

## R10
El sistema DEBE pintar como frase siempre a la vista (`statement-totals-line`)
`These figures leave out the movements labelled "Transfer" or "Not counted", and count a deposit only by its interest.`
y añadir a lo plegado, como sexta frase y antes de la de grupos dudosos de traspasos, la
frase de depósitos de design §4.

## La casilla `Hide what does not count`

## R11
MIENTRAS la casilla está puesta, el sistema DEBE quitar de la lista las aperturas y
cancelaciones resueltas, y NO DEBE quitar ningún vencimiento resuelto ni ningún dudoso.

## R12
MIENTRAS la casilla está puesta, el sistema DEBE sumar al número de `Hiding N movements`
las aperturas y cancelaciones resueltas que quitó de la lista.

## R13
MIENTRAS la casilla está puesta, el sistema DEBE usar como número de movimientos del mes
(`statement-totals-count`), para decidir si la lista está vacía y en `Showing x of y` el
`pagination.total` del backend menos las aperturas y cancelaciones resueltas quitadas; un
mes cuyos movimientos son todos quitados DEBE decir
`Nothing left to show in <mes>: everything in this month is hidden.`

## Las cifras

## R14
El sistema DEBE pintar `Money in`, `Money out` y `Difference` tal como vienen en `totals`,
sin sumar, restar ni recalcular nada con `countedAmount`.

## R15
El sistema DEBE declarar y medir en `src/assets/theme-dark.css` la línea
`contrast: --warning on --surface-sunken >= 4.5`, para el texto de dudoso sobre una línea
con el ratón encima.

---

## Procedencia

- R1 — (añadido) Técnico. Sin leer el campo no hay nada que enseñar; obligatorio como
  `excludedFromTotals` (ADR-002, F22 design §5): si el backend dejara de mandarlo, la
  pantalla da error en vez de volver a pintar los vencimientos como ingreso entero.
- R2 — (añadido) Técnico. El contrato dice que los `PATCH` no traen `deposit`; sin esto,
  al cambiar la categoría de un vencimiento se pintaría como ingreso entero hasta recargar.
- R3 — (humano) «las aperturas y cancelaciones de depósito se distinguen a simple vista
  como movimientos que no cuentan». Lenguaje visual de la F29, sin inventar otro.
- R4 — (delegado) «Qué texto exacto lleva cada clase». Decido un texto por clase en el
  segundo renglón, como `Transfer` / `Not counted`. Descartado: una etiqueta junto a la de
  categoría (la F29 dejó la forma de etiqueta solo para la categoría).
- R5 — (humano + delegado) «El vencimiento … dice que solo cuentan 37,07 €»; el humano
  cedió cómo se enseña sin confundirlo con el importe del banco. Decido: importe del banco
  en gris sin tachar (cuenta en parte) y debajo `Counts …` en verde. Descartado: dejar el
  importe en verde y poner el interés solo en el texto del concepto (sigue pareciendo un
  ingreso entero, que es la queja del `por_que`).
- R6 — (humano) «Sigo viendo el importe que dio el banco en cada movimiento».
- R7 — (humano) «El vencimiento de agosto de 2025 se ve como dudoso, con el motivo, y que
  de momento no cuenta» + respuesta del 2026-10-16 (solo en su línea, con su motivo).
  La cancelación dudosa (`opening_not_found`) recibe el mismo trato: (añadido) el humano
  solo habló del vencimiento.
- R8 — (añadido) Desde la F57 la marca y el traspaso no cambian lo que suma un movimiento
  de depósito; enseñar `Not counted` en un vencimiento que sí cuenta su interés sería falso.
  ← REVISAR EN APROBACIÓN.
- R9 — (humano) Respuesta del 2026-10-16: «entra también `Review`, con el mismo aspecto
  que en `Movements`»; «No quiero que cambie nada de cómo se ven los demás movimientos».
- R10 — (humano + delegado) «La frase de debajo de las cifras dice también que los
  depósitos solo cuentan por sus intereses». El texto es mío.
- R11 — (humano + añadido) «La casilla esconde las aperturas y cancelaciones, y no esconde
  un vencimiento que cuenta sus intereses». Añadido: los dudosos tampoco se esconden
  (cuentan 0, pero son justo lo que el humano no quiere perder de vista).
  ← REVISAR EN APROBACIÓN. Se hace en el navegador porque el backend no tiene filtro por
  depósito (leída la tabla de parámetros: `transfer` y `excluded`, nada más).
- R12 — (delegado) «Si la casilla cuenta los movimientos de depósito en su recuento de
  escondidos». Decido que sí: el número dice lo que desaparece. Descartado: no contarlos
  (el número diría menos de lo que se ve desaparecer).
- R13 — (añadido) Consecuencia de R11/R12: sin esto el número de movimientos, la frase de
  mes vacío y `Showing x of y` contarían filas que no están en la lista.
- R14 — (humano) «Las cifras de arriba no cambian: son las del backend».
- R15 — (añadido) Técnico. El ámbar sobre una línea con el ratón encima no está medido hoy
  (sí sobre la tarjeta); la regla del tema oscuro exige medir cada pareja que se usa.
