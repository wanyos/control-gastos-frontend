# Requirements — F36 `own-accounts-table`

Una pantalla nueva, con su entrada en el menú, que enseña la tabla de cuentas propias del
humano y las formas de su nombre, y deja dar de alta una fila, cambiar una fila y cambiar
la lista de formas de su nombre. No borra nada y no enseña qué movimientos cambian al
guardar. 15 requirements.

Fuente: el `intent` de la feature 36 (con sus dos `respuestas_del_humano`),
`../docs/handoff-cuentas-propias.md` y el contrato `gastos-backend/docs/api-contract.md`,
leído el 2026-10-21: modelo `OwnAccount`, `GET` y `POST /api/own-accounts`,
`PATCH /api/own-accounts/:id`, `GET` y `PUT /api/own-accounts/holder-names`, y la sección
«Movimientos entre tus cuentas en las sumas» (cómo se compara un texto y el mínimo de 3
caracteres). La forma de comparar se ha contrastado, solo leyendo, con
`gastos-backend/src/modules/own-accounts/own-accounts.recognition.ts` (`normalizeOwnText`).

**Definiciones usadas en todo el documento.**

- **La pantalla:** `OwnAccountsView`, en la ruta `/own-accounts`.
- **La tabla:** la lista de filas de `GET /api/own-accounts`, en el orden en que llegan.
- **Las formas del nombre:** la lista `names` de `GET /api/own-accounts/holder-names`.
- **La ventana de cuenta:** `OwnAccountDialog`, la misma para dar de alta y para cambiar
  una fila (design §4).
- **La ventana de formas del nombre:** `HolderNamesDialog` (design §4).
- **Un texto comparado:** el resultado de `normalizeOwnText` (design §3), la misma
  transformación que describe el contrato: minúsculas, sin tildes, cada tramo de
  caracteres que no son `a-z` ni cifras cambiado por un espacio, y sin espacios en los
  extremos.
- **Una lectura de la tabla:** la petición `GET /api/own-accounts`.

Los textos exactos de pantalla están en `design.md §6`; aquí se citan por su constante.

## La entrada del menú y la pantalla

## R1
El sistema DEBE tener una entrada `My accounts` en el menú lateral, con el icono
`Landmark`, justo debajo de la entrada `Transfers`, que lleva a la pantalla
(`/own-accounts`), con el título `My accounts` y la frase `INTRO`.

## Ver la tabla

## R2
CUANDO se monta la pantalla, el sistema DEBE hacer una lectura de la tabla y pintar una
fila por cada cuenta, en el orden de la respuesta, con su nombre, su banco, su número de
cuenta, el nombre de su tipo (`TYPE_LABELS`), su fecha de apertura, su fecha de cierre y
todos sus textos tal como llegan; o la frase `NO_ACCOUNTS` si la tabla está vacía.

## R3
MIENTRAS una fila no tenga número de cuenta, fecha de apertura, fecha de cierre o
ningún texto, el sistema DEBE pintar en esa celda `—` (número y fechas) o `NO_TEXTS`
(textos), en lugar de dejarla en blanco.

## R4
SI la lectura de la tabla falla ENTONCES el sistema DEBE pintar, en lugar de la tabla, la
frase de `loadErrorMessage` y un botón `Try again` que repite la lectura.

## Dar de alta y cambiar una fila

## R5
CUANDO se pulsa `Add account`, se rellenan nombre, banco y tipo y se pulsa `Save` en la
ventana de cuenta, el sistema DEBE mandar `POST /api/own-accounts` con `name`, `bank` y
`type` y, solo si están rellenos, `accountNumber`, `openedAt`, `closedAt` y `texts`; y,
con la respuesta 201, cerrar la ventana y hacer una lectura de la tabla.

## R6
CUANDO se pulsa `Edit` en una fila, se cambia algo y se pulsa `Save`, el sistema DEBE
mandar `PATCH /api/own-accounts/:id` con solo los campos que difieren de la fila (con
`null` para un número o una fecha vaciados, y `texts` con la lista entera si cualquiera de
sus textos cambió) y, con la respuesta 200, cerrar la ventana y hacer una lectura de la
tabla.

## R7
CUANDO se pulsa `Save` en la ventana de cuenta abierta con `Edit` sin haber cambiado
nada, el sistema NO DEBE mandar ninguna petición, y DEBE cerrar la ventana.

## R8
MIENTRAS la ventana de cuenta está abierta, el sistema DEBE enseñar cada texto en su
propio campo con un botón `Remove`, un botón `Add text` que añade un campo vacío, y
mandar la lista sin los campos que se quedaron en blanco.

## R9
CUANDO en la ventana abierta con `Edit` se pone una fecha en `Closed on` y se pulsa
`Save`, el sistema DEBE mandar `PATCH /api/own-accounts/:id` con `closedAt` en
`YYYY-MM-DD`, y la fila DEBE enseñar esa fecha tras la lectura de la tabla.

## R10
MIENTRAS en la ventana de cuenta el nombre o el banco estén en blanco, no haya tipo
elegido, un texto rellenado se quede en menos de 3 caracteres como texto comparado, o
`Closed on` sea anterior a `Opened on`, el sistema DEBE dejar `Save` desactivado y decir
junto a ese campo por qué (`FIELD_MESSAGES`), sin mandar ninguna petición.

## R11
SI el `POST` o el `PATCH` de una fila falla ENTONCES el sistema DEBE dejar la ventana
abierta con lo escrito y pintar en ella la frase de `saveErrorMessage`; y, si el fallo no
es un 400 ni un 404, hacer además una lectura de la tabla, porque el contrato solo
garantiza en esos dos que no se escribió nada.

## Las formas del nombre

## R12
CUANDO se monta la pantalla, el sistema DEBE pedir `GET /api/own-accounts/holder-names`
y pintar, en un bloque propio encima de la tabla con el título `NAMES_TITLE`, cada forma
en el orden en que llega, o la frase `NO_NAMES` si no hay ninguna; si esa lectura falla,
DEBE decirlo en ese bloque con `Try again`, sin afectar a la tabla.

## R13
CUANDO se pulsa `Edit` en el bloque de las formas del nombre, se cambia la lista y se
pulsa `Save`, el sistema DEBE mandar `PUT /api/own-accounts/holder-names` con
`{ names }` igual a la lista entera sin los campos en blanco, y pintar la lista de la
respuesta 200; con `Save` desactivado y sin petición mientras una forma rellenada se quede
en menos de 3 caracteres como texto comparado.

## R14
SI el `PUT` de las formas del nombre falla ENTONCES el sistema DEBE dejar la ventana de
formas del nombre abierta con lo escrito, pintar en ella la frase de
`namesSaveErrorMessage` y dejar el bloque con la lista anterior; y, si el fallo no es un
400, volver a pedir `GET /api/own-accounts/holder-names`.

## Lo que no hace

## R15
El sistema NO DEBE ofrecer ningún control para borrar una fila de la tabla ni mandar
ninguna petición `DELETE` a `/api/own-accounts`.

---

## Procedencia

- R1 — (humano) + (añadido) Sale de la respuesta «la tabla vive en una entrada nueva del
  menú». **(añadido)** el nombre `My accounts`, el sitio (debajo de `Transfers`), el icono
  `Landmark`, la ruta `/own-accounts` y la frase `INTRO`. El leader sugirió `Accounts`;
  propongo `My accounts` porque `All accounts` ya es el filtro de las cuentas importadas
  en `Movements` y `Review`, y esta tabla incluye productos que no se importan. ←
  REVISAR EN APROBACIÓN (🔴 1).
- R2 — (humano) «Ver todas mis cuentas y productos de la tabla, con su banco, número,
  tipo, fechas de apertura y cierre y los textos» y «Veo las 12 filas de la tabla con
  todos sus datos». **(añadido)** la frase de tabla vacía.
- R3 — (delegado) «Cómo se dibuja la tabla». Varias filas tienen 0 textos con los datos
  reales: `NO_TEXTS` lo dice en vez de una celda vacía. Una cuenta cerrada se pinta igual
  que una abierta, con su fecha. ← REVISAR (🔴 6).
- R4 — (humano) «Si algo falla, me lo dice».
- R5 — (humano) «Doy de alta una cuenta nueva y aparece». (delegado) en una ventana.
  **(añadido)** volver a leer la tabla en vez de insertar la fila a mano: así queda en el
  orden del backend y con los textos tal como los guardó (dos iguales una vez comparados
  se guardan una vez).
- R6 — (humano) «cambiar una existente, sobre todo sus textos» y «Cambio los textos de
  una cuenta y se guardan». (delegado) en una ventana, la misma que la de alta. ←
  REVISAR (🔴 2).
- R7 — (añadido) Guardar sin cambios no manda nada: el contrato responde 400 a un body
  vacío.
- R8 — (delegado) «cómo se edita»: un campo por texto, con `Remove` y `Add text`.
- R9 — (humano) «Cierro una cuenta poniéndole fecha de cierre».
- R10 — (añadido) Comprobar antes de mandar lo que el contrato rechazaría con 400
  (nombre o banco en blanco, sin tipo, texto de menos de 3 caracteres comparado, cierre
  anterior a la apertura). ← REVISAR (🔴 4).
- R11 — (humano) «Si algo falla, me lo dice y no ha cambiado nada». **(añadido)** la
  lectura de la tabla tras un fallo que pudo haber escrito (red, 5xx, respuesta
  ilegible), para que la tabla enseñe lo que de verdad hay.
- R12 — (humano) «Veo y cambio las formas de mi nombre». (delegado) el bloque va encima
  de la tabla, en la misma pantalla. **(añadido)** que su fallo no tumbe la tabla.
- R13 — (humano) «Veo y cambio las formas de mi nombre». (delegado) en una ventana con la
  lista entera. **(añadido)** guardar una lista vacía las borra todas sin pregunta extra,
  como dice el contrato. ← REVISAR (🔴 5).
- R14 — (humano) «Si algo falla, me lo dice y no ha cambiado nada». El contrato dice que
  con 400 la lista anterior queda intacta; para el resto se vuelve a pedir (añadido).
- R15 — (humano) «No quiero borrar filas».

No hay requirement para «qué movimientos cambian al guardar»: el humano lo dejó fuera.
Tampoco para recargar otras pantallas tras guardar: todas vuelven a pedir sus datos al
entrar (design §7). ← REVISAR (🔴 3).
