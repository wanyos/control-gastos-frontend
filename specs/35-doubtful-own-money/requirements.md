# Requirements — F35 `doubtful-own-money`

Pantallas `Transfers` (`src/features/transfers/`), `Movements` (`src/features/statement/`),
el menú lateral (`src/shared/components/AppSidebar.vue`) y el informe de la importación
(`src/features/import/`). 16 requirements (uno por encima del tope orientativo: ver
`decisions.md` §Técnicas). Fuente: el `intent` de la feature 35, sus
`respuestas_del_humano` del 2026-10-21, `../docs/handoff-cuentas-propias.md` y el contrato
`gastos-backend/docs/api-contract.md` → `GET /api/movements` (campo `movements[].ownership`
y parámetro `ownership=doubtful`), §«Movimientos entre tus cuentas en las sumas» y
`PATCH /api/movements/:id` (campo `ownershipDecision`), todo de la feature 62 del backend.

**Definiciones usadas en todo el documento.**

- **Dudoso (de dinero propio):** movimiento con `ownership.status === 'doubtful'`. Sigue
  contando en las sumas hasta que el humano responde. «Dudoso» es palabra del humano.
  **No** es lo mismo que un «grupo dudoso» de traspasos (`GET /api/transfers/ambiguous`,
  sección `Doubtful transfers` de la feature 24), que sigue como está.
- **Entre tus cuentas:** movimiento con `ownership.status` `own` o `mine`. No cuenta en las
  sumas (lo decide el backend).
- **Movimiento de depósito:** `deposit` distinto de `null` (feature 31). Su pintado manda
  sobre el de `ownership`: el contrato dice que suma lo de su regla sea cual sea su
  `ownership`.
- **Responder:** `It's mine` = `PATCH /api/movements/:id` con
  `{ "ownershipDecision": "mine" }`; `Not mine` = lo mismo con `"not_mine"`; deshacer =
  lo mismo con `null`.

Los textos exactos de pantalla están en `design.md §5`; los requirements los citan por su
`data-test`.

## Lectura del campo `ownership`

## R1
CUANDO llega una respuesta de `GET /api/movements`, el sistema DEBE leer `ownership` de
cada movimiento como `null` o como un objeto con `status` (`own` | `doubtful` | `mine` |
`not_mine`), `ownAccountId` (entero o `null`), `ownAccountName` (texto o `null`) y
`matchedText` (texto o `null`), y SI falta la clave o un valor no cumple eso ENTONCES
lanzar `ValidationError` con la ruta del campo (`GET /api/movements: movements[0].ownership…`).
Las respuestas de los `PATCH` y de `/api/transfers`, que no la traen, se siguen leyendo
sin error.

## R2
CUANDO `Movements` sustituye una línea por el movimiento que devuelve un
`PATCH /api/movements` o `PATCH /api/movements/:id`, el sistema DEBE conservar en esa
línea el `ownership` que traía la última lectura de ese movimiento.

## Los dudosos en `Transfers`

## R3
CUANDO se abre `Transfers`, el sistema DEBE pedir `GET /api/movements?ownership=doubtful&page=1&pageSize=200`
y pintar, en una sección propia (`data-test="ownership-section"`) colocada antes de
`Doubtful transfers`, una fila por dudoso (`ownership-row`) con su fecha, su cuenta, su
concepto, su importe con signo y el motivo (`ownership-reason`: qué texto casó y de qué
cuenta propia, sacados de `matchedText` y `ownAccountName`).

## R4
CUANDO la lectura de R3 responde sin ningún movimiento, el sistema DEBE pintar la frase
`ownership-empty` en lugar de la lista.

## R5
SI la lectura de R3 falla ENTONCES el sistema DEBE pintar `ownership-error` con su botón
`Try again` (que repite la lectura), sin cambiar las secciones `Doubtful transfers` ni
`Linked pairs`.

## R6
CUANDO el humano pulsa `It's mine` (`ownership-mine`) en una fila, el sistema DEBE enviar
exactamente `PATCH /api/movements/<id>` con el cuerpo `{"ownershipDecision":"mine"}`,
pintar en la línea de aviso de la pantalla el texto de «marcado como tuyo» con `Undo`, y
volver a pedir la lista de dudosos.

## R7
CUANDO el humano pulsa `Not mine` (`ownership-not-mine`) en una fila, el sistema DEBE
enviar exactamente `PATCH /api/movements/<id>` con el cuerpo
`{"ownershipDecision":"not_mine"}`, pintar en la línea de aviso el texto de «marcado como
no tuyo» con `Undo`, y volver a pedir la lista de dudosos.

## R8
CUANDO el humano pulsa `Undo` en la línea de aviso tras R6 o R7, el sistema DEBE enviar
exactamente `PATCH /api/movements/<el mismo id>` con `{"ownershipDecision":null}`, pintar
`Answer undone.` sin `Undo`, y volver a pedir la lista de dudosos.

## R9
SI el `PATCH` de R6, R7 o R8 falla ENTONCES el sistema DEBE pintar en la línea de aviso
la frase de error de ese fallo (`design.md §5`) sin `Undo`, y DEBE dejar la lista como
estaba cuando la respuesta es un `400` (que prueba que no se escribió nada); con cualquier
otro fallo vuelve a pedir la lista para enseñar lo que de verdad quedó.

## R10
MIENTRAS una escritura de la pantalla `Transfers` está en curso, el sistema DEBE tener
desactivados los botones `It's mine` y `Not mine` de todas las filas y NO DEBE enviar
otra escritura. Ninguna lectura ni apertura de pantalla envía una respuesta: solo un clic
del humano en `It's mine`, `Not mine` o `Undo`, y siempre de un movimiento cada vez.

## Enterarse sin buscarlos

## R11
MIENTRAS el número de dudosos conocido es mayor que 0, el sistema DEBE pintar ese número
junto a la entrada `Transfers` del menú lateral (`data-test="transfers-doubtful-count"`),
con el mismo aspecto que el número de `Review`; con 0, o si la lectura falló, NO DEBE
pintar nada.

## R12
El sistema DEBE actualizar el número de R11 al montarse el menú (con
`GET /api/movements?ownership=doubtful&page=1&pageSize=1`, leyendo `pagination.total`),
cada vez que se lee la lista de R3, y al acabar cada importación.

## R13
CUANDO una importación acaba con informe y entre los dudosos de justo después hay alguno
que no estaba entre los de justo antes, el sistema DEBE pintar en el informe la línea
`import-new-doubtful` con cuántos son; SI no hay ninguno nuevo o alguna de las dos
lecturas falló ENTONCES NO DEBE pintar esa línea.

## Cómo se ven en `Movements`

## R14
CUANDO `Movements` pinta un movimiento que no es de depósito con `ownership.status` `own`
o `mine`, el sistema DEBE pintar su importe tachado y en gris y su concepto en gris, como
lo que no cuenta desde la feature 29, y el texto `Between your accounts`
(`statement-row-ownership`) junto a la cuenta.

## R15
CUANDO `Movements` pinta un movimiento que no es de depósito con `ownership.status`
`doubtful`, el sistema DEBE pintar junto a la cuenta el texto que empieza por `Doubtful`
(`statement-row-ownership`) en ámbar (`text-warning`), como los depósitos dudosos, con su
importe sin tachar y con el color de siempre.

## R16
MIENTRAS la casilla `Hide what does not count` está marcada, el sistema DEBE quitar de la
lista los movimientos que no son de depósito con `ownership.status` `own` o `mine`,
calculándolo en la pantalla, y DEBE sumarlos al número de `Hiding`; un dudoso NO DEBE
esconderse.

## Procedencia

- R1 — (añadido) Técnico. Sin leer `ownership` no se puede pintar R14 ni R15. Obligatorio
  en `GET /api/movements` como `deposit` (feature 31): si el backend dejara de mandarlo,
  la pantalla da error en vez de pintar como si nada fuera dinero propio. Alternativa
  descartada: leerlo como optativo (como `categorySource` en la F34), que ahorra tocar
  las respuestas simuladas de 25 archivos de prueba pero calla un fallo del backend.
- R2 — (añadido) Técnico. Los `PATCH` no traen `ownership` (contrato); sin esto, cambiar
  la categoría de un movimiento entre tus cuentas lo pintaría como si contara hasta la
  siguiente lectura. Mismo arreglo que la feature 31 para `deposit`.
- R3 — (humano) «Ver los movimientos dudosos, cada uno con su concepto, su importe, su
  fecha y por qué es dudoso (qué banco lo nombra)» + respuesta del 2026-10-21 «viven en
  la pantalla `Transfers`». (delegado) Cómo se dibuja: sección propia arriba del todo,
  una fila por dudoso; la cuenta se añade porque sin ella dos dudosos iguales no se
  distinguen. Hasta 200: el humano dijo que son pocos (ver design §4).
- R4 — (humano) «Si no hay ninguno, me lo dice.»
- R5 — (humano) «Si falla, me lo dice y no ha cambiado nada», aplicado a la lectura.
- R6 — (humano) «Digo «es mío» y deja de contar en las sumas.» Que deje de contar lo hace
  el backend; aquí se comprueba que se envía exactamente esa respuesta y que el
  movimiento sale de la lista.
- R7 — (humano) «digo «no es mío» y cuenta y deja de salir como dudoso».
- R8 — (humano) «Puedo deshacer lo que acabo de decidir.» (delegado) Con la línea de
  aviso y su `Undo`, como enlazar y desenlazar en esta misma pantalla. Solo la última
  respuesta: el backend no deja pedir «los que ya resolví». ← REVISAR EN APROBACIÓN.
- R9 — (humano) «Si falla, me lo dice y no ha cambiado nada.» Con un fallo de red no se
  puede saber si se escribió: se recarga para no mentir (mismo criterio que las
  features 21 y 24).
- R10 — (humano) «No quiero resolver varios a la vez» y «No quiero que se resuelva
  ninguno sin que yo lo diga.»
- R11 — (humano) Respuesta del 2026-10-21: «un número junto a la entrada del menú (como
  el de `Review`, solo si hay alguno)». (añadido) Cuenta solo los dudosos de dinero
  propio, no los grupos de `Doubtful transfers`. ← REVISAR EN APROBACIÓN.
- R12 — (humano) Misma respuesta: para que el número sea verdad hay que leerlo. Los tres
  momentos copian los del número de `Review` (feature 15).
- R13 — (humano) Respuesta del 2026-10-21: «una línea en el informe de la importación si
  han entrado dudosos nuevos». (delegado) El informe de `POST /api/import` no dice nada
  de dudosos: la aplicación lee los dudosos justo antes y justo después y cuenta los
  que no estaban. ← REVISAR EN APROBACIÓN.
- R14 — (humano) Respuesta del 2026-10-21: «sale como lo que no cuenta desde la feature
  29 (tachado y en gris), con un texto que diga que es entre sus cuentas».
  (añadido) `mine` se pinta igual que `own`; un movimiento de depósito no cambia.
- R15 — (humano) Misma respuesta: «los dudosos, con `Doubtful` en ámbar, como los
  depósitos dudosos». (añadido) El importe no se tacha porque un dudoso sí cuenta (al
  revés que un depósito dudoso).
- R16 — (delegado) El leader pidió decidir qué hace la casilla con `own` y con los
  dudosos. Decido: esconde los de entre tus cuentas, calculándolo en la pantalla como
  la feature 31 con los depósitos, y no esconde los dudosos porque cuentan. Alternativa
  descartada: no tocar la casilla (dejaría a la vista líneas que no cuentan con la
  casilla que promete esconderlas). ← REVISAR EN APROBACIÓN.
