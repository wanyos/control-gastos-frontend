# Requirements — Feature 22: statement-exclude-from-totals (marcar movimientos como que no cuentan en mis sumas)

> Derivado del bloque `intent` de la feature 22 en `feature_list.json` (fuente de
> verdad, incluidas sus `respuestas_del_humano`) y de sus 12 criterios de
> `acceptance`. EARS estricto según `docs/specs.md`. **Cuarta rodaja de la E7** y la
> primera acción del extracto que **mueve las cifras del mes**.
>
> **Tamaño: 16 requirements**, uno por encima del tope blando de ~15 (regla 2 de
> `docs/specs.md`). No se parte la feature porque el gesto es uno solo —escribir
> `excludedFromTotals` sobre una selección— y las mitades que se podrían separar
> (marcar / desmarcar, o marcar / refrescar las cifras) dejarían la pantalla
> mintiendo a medias: marcar sin que las sumas se muevan es exactamente el problema
> que esta rodaja viene a resolver. Doce de los dieciséis son la conducta del gesto;
> los cuatro restantes (R13–R16) son el aviso, el deshacer y los dos casos de error,
> copiados de la F16 y la F21.
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
>
> - `../../../gastos-backend/docs/api-contract.md` → §`Movement`, campo
>   **`excludedFromTotals`** (feature 49 del backend, 2026-09-27): booleano;
>   `true` = el movimiento **no cuenta** en `income` ni en `expense` de los `totals`
>   de `GET /api/movements` ni de `period.totals` de `GET /api/overview`. **No cambia
>   el importe ni el saldo**: `amount`, `type`, fechas, descripción, `balanceAfter` y
>   el `balance` de la cuenta en `GET /api/accounts` siguen iguales. Todo movimiento
>   nace con `false`. **Lo escribe solo el humano**, con `PATCH /api/movements/:id` o
>   `PATCH /api/movements`, y se deshace escribiendo `false`. Es **independiente de
>   `transferId`**: se puede marcar una pierna de traspaso.
> - Mismo fichero → §`PATCH /api/movements`: body `{ ids, … }` con **al menos una** de
>   `categoryId`, `status`, `excludedFromTotals`; `ids` de **1 a 200, sin repetidos**,
>   todos existentes; **cualquier otra propiedad → 400 `VALIDATION_ERROR`**;
>   `excludedFromTotals` **solo booleano literal**: `null`, `"true"`, `"false"`, `0` o
>   `1` → **400**, sin escribir nada. **Es todo o nada** (transacción). Respuesta 200 =
>   `{ updated, movements }` con los movimientos **ya cambiados**, con la misma forma
>   que en la lista. `404 NOT_FOUND` si algún id no existe. Se puede marcar un
>   `neutral` y una pierna de traspaso.
> - Mismo fichero → §`PATCH /api/movements/:id`: los mismos tres campos para un solo
>   movimiento; `{ "excludedFromTotals": true }`; mismo trato del booleano literal.
> - Mismo fichero → §`GET /api/movements`: los `totals` se calculan **sobre todas las
>   coincidencias del filtro**, y quedan fuera de ellos los `neutral`, las dos piernas
>   de un traspaso, las aportaciones a producto y, desde la feature 49, **los marcados
>   con `excludedFromTotals: true`**; quitar la marca los devuelve exactamente como
>   estaban. Filtros nuevos `excluded=only|none` y `transfer=only|none` (**esta feature
>   no los usa**: son del interruptor, la rodaja siguiente) y, con `excluded=only`, los
>   tres `totals` salen siempre a `"0.00"`.
> - Código real de la F16: `src/features/review/store.ts` (`selectedIds`, `toggle`,
>   `selectPage`, `clearSelection`, carril único `runAction`, `refreshQuietly`,
>   `lastAction`), `src/features/review/actions.ts` (`MAX_IDS = 200`,
>   `BULK_CONFIRM_THRESHOLD = 20`, `countOf`, `actionErrorMessage`, `needsReload`),
>   `src/features/review/service.ts` (`updateMovements`, `parseBulkResult`,
>   `changesBody` campo a campo), `components/ReviewActionBar.vue`,
>   `components/BulkConfirmDialog.vue`, `components/MovementRow.vue` (la casilla).
> - Código real de la F19/F20/F21: `src/features/statement/store.ts` (`show`, `shift`,
>   `applyFilters`, `loadMore`, `extra`, `days`, `adoptUpdated`, `refreshQuietly`,
>   `runWrite`, `editingId`, `lastAction`, `actionNotice`), `service.ts`
>   (`setMovementCategory`, el cuerpo escrito literalmente), `actions.ts`,
>   `filters.ts` (`StatementFilters`: `accountId`, `categoryId`, `uncategorized`, `q`),
>   `months.ts` (`STATEMENT_PAGE_SIZE = 200`),
>   `components/{StatementRow,StatementList,MonthTotals,StatementActionNotice,RowCategoryEditor}.vue`
>   y `views/StatementView.vue`.
> - `src/shared/movements.ts`: `Movement` **todavía no mapea `excludedFromTotals`**
>   (hay que añadirlo al parseo de frontera, ADR-002), `MovementChanges` solo conoce
>   `categoryId` y `status`, `changesBody` los copia campo a campo, y el PATCH en
>   bloque (`updateMovements`, `MAX_IDS`) **sigue viviendo en `features/review`**.
> - Datos reales del humano (medidos el 2026-09-26): **29 apuntes de depósito** en
>   myinvestor (285.000 € de gasto y 275.652 € de ingreso, el **58 %** de la base),
>   **17 traspasos propios sin pareja**, 1.607 movimientos, 33 meses, mes más cargado
>   ≈93 movimientos. **Una tanda típica —filtrando por cuenta y mes— son de 1 a 10
>   movimientos**, nunca 200.
>
> **Fuera de alcance** (lo dice el `intent`): tocar el backend; cambiar importe, fecha,
> descripción o saldo; **marcar desde la cola de revisión**; **esconder lo marcado**
> (el interruptor con `excluded`/`transfer` es la rodaja siguiente); y **cualquier
> automatismo que escriba la marca** (reglas, heurísticas, «marcar todos los DEP.»).

## Cobertura del intent

| Punto de `como_se_que_esta_bien` / `acceptance` | Requirements |
|---|---|
| «Marco un movimiento y las sumas del mes bajan al momento en ese importe» | R1, R11, R12 |
| «Marco varios de una vez, sin repetir el gesto uno por uno» | R1, R2, R5 |
| «Un movimiento marcado se ve distinto en la lista: sé cuáles he apartado» | R8 |
| «Le quito la marca y las sumas vuelven a incluirlo» | R1, R12, R14 |
| «El importe, la fecha, la descripción y el saldo no cambian nunca» | R1, C1 |
| «Si algo falla, me lo dice y no me deja la pantalla diciendo algo que no es» | R15, R16 |
| «Puedo encontrar rápido lo que quiero marcar… filtrando por myinvestor» | R7, C2 |
| «No quiero perder de vista lo marcado: apartado no es escondido» | R9 |
| `acceptance` 1 y 2 (se escribe `excludedFromTotals`, booleano literal) | R1 |
| `acceptance` 3 (cuerpo campo a campo: ni `status` ni `categoryId`) | R1, C1 |
| `acceptance` 4 (las sumas se vuelven a pedir; única acción que sí las mueve) | R11, R12, C3 |
| `acceptance` 6 (se puede marcar cualquier tipo, también `neutral` y piernas de traspaso) | R10 |
| `acceptance` 7 (tope de 200 y sin ids repetidos) | R2 |
| `acceptance` 9 (nada marca movimientos por su cuenta) | C2 |
| `acceptance` 10 (el editor de categoría de la F21 sigue igual) | R4, R6, C5 |
| `acceptance` 11 y 12 (inglés, tema oscuro, sin dependencias, puerta verde) | C6, C7 |

---

## R1
CUANDO el usuario ejecuta la acción de marcar (o desmarcar) sobre la selección, el
sistema DEBE enviar **una sola** petición `PATCH /api/movements` cuyo cuerpo tenga
exactamente dos propiedades, `ids` y `excludedFromTotals`, con `excludedFromTotals`
como booleano literal `true` o `false`.

## R2
CUANDO el sistema construye esa petición, DEBE incluir en `ids` únicamente los
movimientos seleccionados cuyo `excludedFromTotals` actual **difiere** del valor
pedido, sin ids repetidos y como máximo 200.

## R3
SI tras ese filtrado no queda ningún id ENTONCES el sistema NO DEBE enviar ninguna
petición y DEBE mostrar el aviso `Nothing to change`.

## R4
MIENTRAS el modo de selección está apagado, la lista del extracto NO DEBE mostrar
ninguna casilla de selección.

## R5
CUANDO el usuario enciende el modo de selección, el sistema DEBE mostrar una casilla
por línea y una barra con el número de movimientos seleccionados y sus dos acciones
(`Exclude from totals` e `Include in totals`).

## R6
MIENTRAS el modo de selección está encendido, el sistema NO DEBE ofrecer el editor de
categoría de la F21 en ninguna línea.

## R7
CUANDO el usuario cambia de mes, cambia un filtro o apaga el modo de selección, el
sistema DEBE vaciar la selección.

## R8
MIENTRAS un movimiento tiene `excludedFromTotals: true`, su línea DEBE llevar la
etiqueta `Not counted` y su importe atenuado.

## R9
El sistema NO DEBE ocultar, filtrar ni reordenar un movimiento por el hecho de estar
marcado.

## R10
El sistema DEBE permitir seleccionar y marcar movimientos de cualquier `type`,
incluidos los `neutral` y las piernas de un traspaso.

## R11
CUANDO el `PATCH` responde `200`, el sistema DEBE sustituir en la lista cada
movimiento devuelto por su versión nueva, sin recargar la página.

## R12
CUANDO el `PATCH` responde `200`, el sistema DEBE volver a pedir el mes con los mismos
filtros en segundo plano —sin vaciar la pantalla ni mostrar el indicador de carga— y
adoptar `totals` y `pagination` de esa respuesta.

## R13
CUANDO la acción va a afectar a 20 o más movimientos, el sistema DEBE pedir una
confirmación que nombre el número exacto antes de enviar nada.

## R14
CUANDO una acción termina bien, el sistema DEBE mostrar sobre la lista una línea que
diga qué hizo, con un botón `Undo` sin cuenta atrás que envía un único `PATCH` con el
valor contrario sobre exactamente esos mismos ids.

## R15
SI el `PATCH` falla ENTONCES el sistema DEBE mostrar una frase en inglés escrita en el
frontend, sin pintar en ningún caso el `message` que devuelve el backend.

## R16
SI el fallo del `PATCH` no es un `400` ni un fallo de red ENTONCES el sistema DEBE
recargar el mes antes de dar por cierto lo que hay en pantalla.

---

## Restricciones (C)

- **C1** — El cuerpo de toda escritura de esta feature se construye **campo a campo**
  en un único sitio: `status` y `categoryId` NO DEBEN poder viajar en él, ni por
  descuido ni por un *spread* de algo que venga de la vista. Importe, fecha,
  descripción, `note`, `transferId` y el saldo de la cuenta no se tocan nunca.
- **C2** — Nada escribe `excludedFromTotals` por su cuenta: no hay reglas,
  heurísticas, sugerencias ni «marcar todo lo que ponga DEP.». La marca la escribe
  siempre el humano, movimiento a movimiento o sobre una selección que él ha hecho.
- **C3** — Las tres cifras del mes siguen siendo las de `totals` del backend: el
  cliente NO DEBE calcular, ajustar ni estimar ninguna de ellas, tampoco restando el
  importe de lo que acaba de marcar.
- **C4** — La **nota permanente de la F19** en `MonthTotals.vue` sigue visible, sin
  poder cerrarse y **sin cambiar ni una palabra**: la reescribe la feature siguiente
  (el interruptor del ruido), no esta.
- **C5** — Un solo carril de escritura y un solo gesto a la vez: mientras hay un
  `PATCH` en vuelo, un segundo clic no inicia otro; el editor de categoría de la F21 y
  el diálogo de reglas siguen funcionando exactamente igual fuera del modo selección.
- **C6** — Todo en inglés, tema oscuro con tokens semánticos y contraste verificado;
  **sin dependencias nuevas**. Las respuestas se validan en frontera (ADR-002)
  reutilizando el parseo de `src/shared/movements.ts`, al que se añade
  `excludedFromTotals`.
- **C7** — Las features 15 a 21 siguen funcionando igual: lo que se mueva a `shared/`
  se re-exporta y sus suites pasan **sin tocar ni un test**. `pnpm type-check`,
  `pnpm lint`, `pnpm test:unit`, `pnpm build` y `./init.sh` terminan en verde.
- **C8** — La comprobación contra el backend real **escribe**, así que solo se ejecuta
  con el **visto bueno explícito** del humano y sobre uno o dos movimientos, con foto
  del antes y el después (movimientos y sumas del mes).

---

## Procedencia

- **R1** — (humano) «decirle a un movimiento que no cuenta en mis sumas» + «de varios
  a la vez», `respuestas_del_humano` 1 («marcar en bloque, con selección múltiple») y
  `acceptance` 2 y 3. **(añadido)** que la escritura sea **siempre** por
  `PATCH /api/movements`, también cuando hay un solo movimiento seleccionado: el
  `acceptance` 1 mencionaba los dos endpoints. Motivo: un único camino, un único
  cuerpo y un único test que lo lee letra por letra; el contrato admite `ids` de
  longitud 1. Alternativa descartada: dos caminos, el de `:id` para uno y el de bloque
  para varios. ← REVISAR EN APROBACIÓN (🔴 5).
- **R2** — (humano) `acceptance` 7 (tope de 200, sin repetidos). **(añadido)** mandar
  **solo los que de verdad cambian**: el humano no lo pidió. Motivo: seleccionar 10 y
  marcar cuando 7 ya estaban marcados escribiría 7 veces lo mismo, y además deja el
  deshacer exacto (R14) en una sola petición sobre los que sí cambiaron.
  ← REVISAR EN APROBACIÓN (⚙️).
- **R3** — (añadido) el `intent` no dice qué pasa si todo lo seleccionado ya está como
  se pide. Propongo **no mandar nada y decirlo**, en vez de un 200 que no cambia nada.
  ← REVISAR EN APROBACIÓN.
- **R4, R5, R6** — (delegado) `delego_en_agente` 4, «cómo conviven la selección
  múltiple y el editor de categoría que ya tiene la línea». Decido un **modo de
  selección que se enciende a propósito**: apagado, el extracto se ve exactamente como
  hoy (la F21 escondió el editor justo para poder leer meses de ~93 líneas, y 93
  casillas permanentes lo desharían); encendido, casillas y barra, y el editor de
  categoría se aparta para que un clic no signifique dos cosas. Alternativa descartada:
  casillas siempre visibles, como en la cola de revisión. ← REVISAR EN APROBACIÓN (🔴 1).
- **R7** — (delegado) misma delegación: la selección muere con el contexto en el que se
  hizo, igual que decidió la F16 al cambiar de filtro. Un id seleccionado que ya no
  está en pantalla sería una trampa.
- **R8** — (delegado) `delego_en_agente` 1, «cómo se ve un movimiento marcado sin que
  la lista se vuelva un árbol de Navidad». Decido **una etiqueta gris `Not counted`
  junto a la de `Transfer` y el importe atenuado**: sin color de fondo, sin tachado y
  sin icono propio. Con myinvestor filtrado, casi todas las líneas del mes estarán
  marcadas, y cualquier marca vistosa convertiría el mes en un bloque de alarma.
  Alternativa descartada: fondo o franja de color en la fila. ← REVISAR EN APROBACIÓN (🔴 2).
- **R9** — (humano) «No quiero perder de vista lo marcado: apartado de las sumas no es
  lo mismo que escondido» y `acceptance` 5. Esconderlo es la feature siguiente, y con
  su propio interruptor.
- **R10** — (humano) `acceptance` 6, que a su vez es literal del contrato (se puede
  marcar un `neutral` y una pierna de traspaso). Es la diferencia con la F21, donde un
  `neutral` no se podía tocar.
- **R11** — (humano) «las sumas del mes cambien al momento» y `acceptance` 4; la lista
  se pone al día con los movimientos que devuelve el `PATCH`, como ya hace la F16.
- **R12** — (humano) `acceptance` 4 («tras marcar o desmarcar, las sumas del mes se
  vuelven a pedir»). **(añadido)** el *cómo*: **una sola** petición en segundo plano,
  sin indicador de carga y sin vaciar la lista, y **siempre** (aquí, al revés que en la
  F21, los `totals` sí se mueven). Alternativa descartada: recargar el mes con su
  indicador de carga, que haría parpadear las ~93 líneas después de cada tanda.
  ← REVISAR EN APROBACIÓN (⚙️).
- **R13** — (delegado) `delego_en_agente` 2, «si hace falta pedir confirmación al
  marcar muchos de golpe». Decido **mantener el umbral de 20** que la F16 fijó para las
  acciones en bloque de la cola: una tanda típica suya (1 a 10 movimientos filtrando
  por cuenta y mes) nunca verá el diálogo, y una selección enorme por error sí.
  Alternativa descartada: sin confirmación, porque desmarcar es un clic.
  ← REVISAR EN APROBACIÓN (🔴 3).
- **R14** — (delegado) `delego_en_agente` 3, «si conviene un deshacer como el de la
  cola, o basta con volver a pulsar». Decido **las dos cosas**: volver a seleccionar y
  pulsar la acción contraria siempre funciona, y además queda la línea fija con `Undo`
  sin cuenta atrás, porque tras la acción la selección se ha vaciado y rehacerla a mano
  sobre 10 líneas es justo el trabajo que el humano no va a repetir.
  Alternativa descartada: sin `Undo`, solo volver a pulsar. ← REVISAR EN APROBACIÓN (🔴 4).
- **R15** — (humano) `acceptance` 8. Mismo criterio que la F16 y la F21: el `message`
  del backend viene en español y nombra ids, y no se pinta nunca.
- **R16** — (humano) `acceptance` 8 («ante un fallo que pudiera haber escrito, se
  recarga en vez de afirmar que no pasó nada»); el reparto exacto es el `needsReload`
  ya compartido.
- **C1, C3, C4, C6, C7** — (humano) salen de `que_no_quiero` y de los `acceptance` 3,
  4, 10, 11 y 12.
- **C2** — (humano) `respuestas_del_humano` 4 («nada de marcar automáticamente por
  regla») y `acceptance` 9.
- **C5** — (delegado) lectura técnica de «lo más sencillo posible»: un solo carril de
  escritura, como en la F21.
- **C8** — (añadido) el `intent` no habla de cómo se comprueba contra el backend real.
  Propongo el patrón de la T22 de la F21: **solo con visto bueno explícito**, uno o dos
  movimientos, con foto del antes y el después **y de las sumas del mes**.
  ← REVISAR EN APROBACIÓN.
