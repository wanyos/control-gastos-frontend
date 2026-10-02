# Requirements — Feature 24: transfer-pairs-review (revisar las parejas de traspaso: deshacer las falsas y emparejar las dudosas)

> Derivado del bloque `intent` de la feature 24 en `feature_list.json` (fuente de
> verdad, incluidas sus tres `respuestas_del_humano`) y de sus 9 criterios de
> `acceptance`. EARS estricto según `docs/specs.md`. **Última rodaja de la E7.**
> Es la primera pantalla de la app que **escribe sobre las parejas de traspaso**, y
> lo que escribe mueve las sumas de todo el histórico: deshacer una pareja devuelve
> sus dos movimientos a `income` y `expense`; enlazar dos los saca.
>
> **Tamaño: 15 requirements + 8 restricciones**, en el tope de ~15 (regla 2 de
> `docs/specs.md`). No se parte: el humano pidió expresamente que «emparejar
> dudosos entra en esta feature», y deshacer un emparejamiento hecho a mano es el
> mismo gesto que deshacer una pareja falsa (misma petición, misma lista).
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
>
> - `../../../gastos-backend/docs/api-contract.md`:
>   - §`GET /api/transfers` — `{ pairs: [{ transferId, movements: [expense, income] }] }`,
>     sin paginar, sin filtros; cada pierna es un `Movement` completo (con `account`,
>     `category`, `excludedFromTotals`); **primero el `expense`, después el
>     `income`**; parejas de la más reciente a la más antigua por la `bookingDate`
>     más reciente de sus dos piernas, desempate por `transferId` ascendente.
>     `pairs: []` no es error. Sin errores propios (500 genérico).
>   - §`GET /api/transfers/ambiguous` — `{ ambiguousCount, ambiguous: [{ amount,
>     movements: [{ id, accountId, accountAlias, type, bookingDate, description }] }] }`.
>     **Se calcula en el momento**, no se guarda: tras enlazar o deshacer, la
>     siguiente petición ya lo refleja. Solo lectura. El `amount` es **del grupo**
>     (todos sus movimientos tienen ese importe); los movimientos **no** traen
>     importe propio.
>   - §`POST /api/transfers` — body **exactamente** `{ movementIds: [a, b] }`, dos
>     enteros ≥ 1 distintos; cualquier otra propiedad es 400. Exige importe igual,
>     un `expense` y un `income`, cuentas distintas; **no** exige la ventana de 3
>     días ni consulta la memoria de un deshecho anterior («volver a enlazar a mano
>     una pareja que tú mismo deshiciste es legítimo»). 201 → `{ transferId,
>     movements }`. 400 `VALIDATION_ERROR` · 404 `NOT_FOUND` · 409 `CONFLICT` (una
>     pierna ya tiene `transferId`, o otra escritura llegó antes).
>   - §`DELETE /api/transfers/:transferId` — deshace la pareja (manual o detectada) y
>     apunta en cada pierna la **memoria del enlace deshecho** (`undoneTransferId`,
>     interna, no sale en ningún endpoint): la detección de la siguiente
>     importación **no vuelve a juntar a esas dos**. No cambia nada más, tampoco
>     `excludedFromTotals`. 204 sin cuerpo. 404 si ningún movimiento lleva ese id.
>     Tras deshacer, las dos piernas **vuelven a sumar** salvo que estén marcadas
>     con `excludedFromTotals: true`.
>   - §Errores — cuerpo `{ statusCode, code, message }`; `message` puede cambiar sin
>     aviso y viene en español: no se pinta.
> - **Datos reales, leídos con `GET` contra `http://localhost:3000` el 2026-09-30**
>   (cero escrituras):
>   - `GET /api/transfers` → **38 parejas**, no 40. Las dos multas
>     (`33339`/`24377`, 100,00 €, junio de 2025; `33108`/`24441`, 50,00 €,
>     septiembre de 2024) **ya no están enlazadas**: sus cuatro movimientos tienen
>     `transferId: null` y `updatedAt` `2026-09-28T16:46:01Z`. Alguien las deshizo
>     el 28-09, tras cerrarse la feature 49 del backend (su `📌` le pedía al humano
>     hacerlo con `curl`). El `intent` («ahora mismo hay dos multas…») describe un
>     estado que ya no existe.
>   - Las 38: todas salen de **bankinter** (→ n26, openbank, myinvestor, revolut).
>     Conceptos del gasto: `TRANS INM/ N26`, `TRANSF OTRAS ENTID /Openbank`,
>     `TRANSF /Juan José Romero Ramos`…; del ingreso: `JUAN JOSE ROMERO RAMOS -
>     INGRESO`, `TRANSFERENCIA INMEDIATA DE JUAN JOSE ROMERO RAMOS…`, `INGRESO`,
>     `Pago de JUAN JOSE ROMERO RAMOS`. **Ninguno de los 76 conceptos contiene
>     `bizum`.** Ninguna pierna tiene `excludedFromTotals: true`.
>   - Tres de las 38 son **idénticas** (2026-07-24, 1.000,00 €, bankinter →
>     openbank; movimientos 28351-28353 / 24251-24253). **Corregido por el leader el
>     2026-10-02:** no hay base para llamarlas duplicados. Cada lado entró en una sola
>     importación con `daySequence` distinto (1-2-3 y 2-3-4), y lo traen dos bancos por
>     separado: lo más probable son tres transferencias reales. Están bien emparejadas.
>   - `GET /api/transfers/ambiguous` → `{"ambiguousCount":0,"ambiguous":[]}`.
> - `progress/exploration/ruido-traspasos-backend.md` y
>   `progress/exploration/ruido-traspasos-datos.md` (§2: las dos multas eran las
>   únicas parejas n26 → openbank, y las únicas con un Bizum de otra persona; §5:
>   por qué ninguna señal de concepto es fiable en general).
> - Código: `src/router/index.ts` (las rutas son el modelo de la barra lateral),
>   `src/shared/components/AppSidebar.vue`, `src/shared/movements.ts`
>   (`parseMovement`, `needsReload`), `src/shared/errors.ts`,
>   `src/features/statement/service.ts` (ya lee `GET /api/transfers/ambiguous`
>   para contar), `src/features/statement/components/StatementActionNotice.vue` y
>   `ExcludeConfirmDialog.vue` (la línea de aviso con `Undo` sin cuenta atrás y el
>   diálogo de confirmación), `src/features/import/components/AmbiguousTransferList.vue`
>   (cómo se pinta hoy un grupo dudoso, solo lectura).

## Cobertura del intent

| `como_se_que_esta_bien` | Requirements |
|---|---|
| Veo la lista de parejas, con las dos patas de cada una: fecha, cuenta, concepto e importe. | R1, R2, R3 |
| Reconozco de un vistazo las que no cuadran, como las dos multas. | R4 |
| Deshago una pareja y sus dos movimientos vuelven a contar en las sumas. | R5, R6 (+ T final con el humano) |
| Veo los dudosos y, cuando dos son claramente el mismo dinero, los emparejo. | R8, R9, R10, R11, R12 |
| Si me equivoco emparejando, puedo deshacerlo. | R12 (`Undo`), R5, R6 (la pareja nueva sale en la lista y se deshace desde ahí) |
| Nada de esto cambia importes ni fechas. | R15, C1 |

| `que_no_quiero` | Dónde |
|---|---|
| No quiero tocar el backend. | C6 |
| No quiero que se empareje nada solo desde esta pantalla: solo lo que yo diga. | R10, C7 |
| No quiero editar movimientos desde aquí, más allá de enlazar y desenlazar. | R15, C1 |

## R1
El sistema DEBE ofrecer en la barra lateral una entrada `Transfers`, situada
inmediatamente después de `Rules`, que lleve a la ruta `/transfers` y monte la
pantalla de revisión de traspasos.

## R2
CUANDO se abre la pantalla `/transfers`, el sistema DEBE pedir `GET /api/transfers`
una vez y listar **todas** las parejas recibidas, en el orden en que las devuelve el
backend, sin paginar, sin filtrar y sin reordenar.

## R3
El sistema DEBE mostrar en cada pareja sus dos piernas, primero la de gasto y después
la de ingreso, y en cada pierna su fecha contable, el alias de su cuenta, su concepto
tal cual lo da el banco y su importe.

## R4
CUANDO el concepto de al menos una de las dos piernas de una pareja contiene la
secuencia `bizum` (sin distinguir mayúsculas de minúsculas), el sistema DEBE mostrar
en esa pareja una etiqueta `Bizum` en tono de aviso y la frase *«A Bizum usually
comes from another person, not from one of your accounts.»*, sin mover la pareja de
su sitio en la lista ni esconder ninguna otra.

## R5
CUANDO el usuario pulsa `Unlink` en una pareja, el sistema DEBE abrir un diálogo de
confirmación que nombre las dos piernas (fecha, cuenta e importe) y diga cuáles
volverán a contar en las sumas: *«Both movements will count in your totals
again.»*, o, si alguna pierna tiene `excludedFromTotals: true`, que esa seguirá fuera
porque el usuario la marcó como que no cuenta; con `Cancel` con el foco.

## R6
CUANDO el usuario confirma el diálogo de R5 y `DELETE /api/transfers/:transferId`
responde 204, el sistema DEBE volver a pedir las dos listas (parejas y dudosos) y
mostrar en la línea de aviso *«Pair unlinked. Its two movements count in your totals
again.»* con un botón `Undo`.

## R7
CUANDO el usuario pulsa el `Undo` de R6, el sistema DEBE enviar
`POST /api/transfers` con `{ "movementIds": [<id del gasto>, <id del ingreso>] }` de
esa misma pareja y, si responde 201, volver a pedir las dos listas y mostrar
*«Pair linked again.»* sin botón `Undo`.

## R8
CUANDO se abre la pantalla `/transfers`, el sistema DEBE pedir
`GET /api/transfers/ambiguous` una vez y mostrar cada grupo dudoso con su importe y
sus movimientos repartidos en dos columnas, `Money out` (los `expense`) y `Money in`
(los `income`), cada movimiento con su fecha, su cuenta y su concepto.

## R9
MIENTRAS una de las dos listas llega vacía y sin error, el sistema DEBE mostrar en su
sección un texto fijo en vez de un hueco: para los dudosos, *«No doubtful transfers.
When an import finds money that looks like a transfer between your accounts but
can't tell which movements go together, the group shows up here.»*; para las parejas,
*«No linked transfers yet.»*

## R10
El sistema DEBE permitir elegir, dentro de un grupo dudoso, como mucho un movimiento
de `Money out` y como mucho uno de `Money in`, sin ninguno elegido de antemano, y
mantener desactivado el botón `Link these two` de ese grupo mientras no haya
exactamente uno elegido en cada columna.

## R11
SI los dos movimientos elegidos en un grupo dudoso pertenecen a la misma cuenta
ENTONCES el sistema DEBE mantener desactivado `Link these two` y mostrar *«Both
movements are in the same account. Pick one from another account.»*, sin enviar
ninguna petición.

## R12
CUANDO el usuario pulsa `Link these two` con una elección válida y
`POST /api/transfers` responde 201, el sistema DEBE volver a pedir las dos listas y
mostrar en la línea de aviso *«Linked as a transfer. These two movements no longer
count in your totals.»* con un botón `Undo` que envía
`DELETE /api/transfers/:transferId` con el `transferId` devuelto por el 201.

## R13
SI una escritura de esta pantalla (`DELETE` o `POST`, incluidas las de `Undo`) falla
ENTONCES el sistema DEBE mostrar en la línea de aviso una frase en inglés escrita en
el cliente, sin el `message` del backend, y volver a pedir las dos listas siempre que
`needsReload` diga que el fallo pudo haber escrito o que lo que se ve ya no es cierto
(404, 409, 5xx, respuesta ilegible).

## R14
SI la carga inicial de una de las dos listas falla ENTONCES el sistema DEBE mostrar en
esa sección un mensaje en inglés con un botón `Try again`, sin afectar a la otra
sección.

## R15
El sistema NO DEBE enviar desde esta pantalla ninguna petición que no sea
`GET /api/transfers`, `GET /api/transfers/ambiguous`, `POST /api/transfers` con un
cuerpo cuyo único campo sea `movementIds`, o `DELETE /api/transfers/:transferId`.

## Restricciones (C)

- **C1 — Solo enlazar y desenlazar.** Ni importes, ni fechas, ni conceptos, ni
  categorías, ni `status`, ni `excludedFromTotals`, ni nota. Ningún `PATCH` sale de
  la feature. El cuerpo del `POST` se construye en **una sola función** del service
  que recibe dos números y escribe el literal `{ movementIds: [a, b] }`.
- **C2 — Todo en inglés** en pantalla; los conceptos del banco se pintan tal cual,
  con `lang="es"`, como ya hace `AmbiguousTransferList.vue`.
- **C3 — Tema oscuro con tokens semánticos** y contraste verificado (4.5:1 texto,
  3:1 bordes e iconos); la etiqueta `Bizum` usa `BaseBadge tone="warning"`, cuyo
  par ya está declarado.
- **C4 — Sin dependencias nuevas.** El icono de la barra es `Link2` de `@lucide/vue`,
  ya instalado, importado por nombre.
- **C5 — Ninguna feature importa de otra.** El aviso con `Undo` y el diálogo se copian
  (como ya hizo el extracto con los de la cola); solo se comparte lo que baja a
  `src/shared/`.
- **C6 — No se toca el backend** ni `../gastos-backend/docs/api-contract.md`.
- **C7 — Nada se enlaza ni se desenlaza solo.** Ni al cargar, ni por la etiqueta
  `Bizum`, ni eligiendo de antemano en un grupo; cada escritura sale de un clic del
  usuario (y deshacer, además, de una confirmación).
- **C8 — Puerta verde:** `./init.sh` (type-check, lint, formato, unit, e2e) y
  `pnpm build`. Los e2e interceptan `/api/transfers*` y ninguna petición sale a
  `:3000`.

## Procedencia

- R1 — (humano) «Pantalla propia, una entrada más en el menú junto a Rules». El
  **nombre** `Transfers` y la posición **justo debajo** de `Rules` son (delegado):
  el menú está en inglés y las demás entradas son una palabra.
- R2 — (humano) «Ver todas las parejas, para poder juzgar si se emparejaron bien».
  Mantener el orden del backend es (delegado): así nada se reordena por sospecha.
- R3 — (humano) «con las dos patas de cada una: fecha, cuenta, concepto e importe».
- R4 — (delegado) «Cómo se ayuda a reconocer una pareja sospechosa sin esconder las
  demás». Decido **una sola señal, nombrada por lo que es**: un Bizum en alguna
  pierna. Medido sobre las 38 parejas reales: **0 falsos positivos**; sobre las dos
  multas: **2 de 2**. La etiqueta dice el hecho (`Bizum`), no el veredicto
  («sospechosa»). Descartadas: la ruta rara (n26 → openbank solo la tenían las dos
  multas: acierta por casualidad, no por razón), la distancia de fechas (daría 6
  falsos positivos: 5 parejas buenas a 3 días y 1 a 2) y «ninguna pierna nombra al
  titular ni a un banco propio» (0 falsos positivos hoy, pero exige clavar el nombre
  del humano en el código). ← REVISAR EN APROBACIÓN.
- R5 — (humano) el `acceptance` pide confirmación. **El texto que dice qué vuelve a
  contar, incluida la excepción de lo marcado**, es (añadido): el contrato dice que
  una pierna marcada no vuelve a sumar, y un diálogo que prometa lo contrario
  mentiría. Hoy ninguna de las 76 piernas está marcada.
- R6 — (humano) «Deshago una pareja y sus dos movimientos vuelven a contar». Volver a
  pedir también los dudosos es (añadido): la pareja deshecha puede pasar a formar
  grupo con otros movimientos.
- R7 — (añadido) **`Undo` tras deshacer una pareja.** El humano no lo pidió. Motivo:
  tras el `DELETE` la memoria del backend impide que la detección vuelva a unirlas y
  esa pareja **no volverá a salir como dudosa**, así que sin este `Undo` un clic
  equivocado no se arregla desde la web. El contrato lo permite. ← REVISAR.
- R8 — (humano) «Veo los dudosos». Las dos columnas `Money out` / `Money in` son
  (delegado): «cómo se enseña un grupo de tres o más, donde hay que elegir dos».
- R9 — (delegado) «Qué se enseña cuando no hay ningún grupo dudoso, que hoy es el
  caso». El texto de las parejas vacías es (añadido), por simetría: con sus datos no
  saldrá nunca.
- R10 — (humano) «cuando dos son claramente el mismo dinero, los emparejo» + «no
  quiero que se empareje nada solo». Una columna por lado hace imposible elegir dos
  del mismo tipo: la mitad de lo que el contrato rechaza con 400 no llega a poder
  pedirse.
- R11 — (delegado) validar en el cliente lo que el contrato exige
  (`acceptance`: «antes de mandar nada»). El importe no se valida porque es del grupo
  y es el mismo para todos sus movimientos. ← REVISAR.
- R12 — (humano) «Si me equivoco emparejando, puedo deshacerlo». Que **enlazar no
  pida confirmación** y lleve `Undo` es (delegado). ← REVISAR.
- R13 — (humano) `acceptance`: «errores en inglés sin pintar el mensaje del backend, y
  ante un fallo que pudiera haber escrito se recarga». Reutiliza `needsReload` de
  `src/shared/movements.ts` (400 y fallo de red = no se escribió; el resto, recarga).
- R14 — (añadido) una sección que falla no tumba la otra: son dos peticiones
  independientes.
- R15 — (humano) «No quiero editar movimientos desde aquí, más allá de enlazar y
  desenlazar» + `acceptance` «No se escribe nada fuera de enlazar y desenlazar».
- C1–C8 — (humano) `acceptance` y `que_no_quiero`; C5 sale de
  `docs/architecture.md`.
