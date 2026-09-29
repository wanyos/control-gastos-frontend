# Requirements — Feature 23: statement-noise-toggle (el interruptor del ruido, y una nota que ya no miente)

> Derivado del bloque `intent` de la feature 23 en `feature_list.json` (fuente de
> verdad, incluidas sus `respuestas_del_humano`) y de sus 10 criterios de
> `acceptance`. EARS estricto según `docs/specs.md`. **Quinta rodaja de la E7** y la
> que cierra el arco: la F22 dio la manera de apartar el ruido, esta da la manera de
> **no verlo** y **reescribe la nota** que desde la F19 dice algo que ya es falso.
>
> **Tamaño: 15 requirements + 8 restricciones**, justo en el tope de ~15 (regla 2 de
> `docs/specs.md`). No se parte: R15 es una frase de la misma nota que R14, y separar
> «la nota» de «la cifra viva de la nota» dejaría media feature mintiendo. La feature
> es de **solo lectura**: no escribe ni un campo.
>
> **Segunda vuelta (2026-09-29).** El humano rechazó los literales «17» y «2» de la
> nota: caducan igual que caducó la de la F19. R14 pasa a ser texto fijo **sin ninguna
> cifra** y R15 añade la única que el backend cuenta él,
> `ambiguousCount`.
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
>
> - `../../../gastos-backend/docs/api-contract.md` → §`GET /api/movements`,
>   parámetros **`transfer`** y **`excluded`** (feature 49 del backend, 2026-09-27):
>   `transfer=only` deja solo los movimientos con `transferId` no nulo, `transfer=none`
>   solo los que lo tienen a `null`; `excluded=only` solo los de
>   `excludedFromTotals: true`, `excluded=none` solo los de `false`. Sin el parámetro
>   **no filtran**. Cualquier otro valor → **400 `VALIDATION_ERROR`**. Se combinan
>   entre sí y con todos los demás (`from`, `to`, `accountId`, `categoryId`,
>   `uncategorized`, `q`, `page`, `pageSize`).
> - Mismo fichero, mismo §: los `totals` se calculan **sobre todas las coincidencias
>   del filtro** y **ya dejan fuera**, siempre, los `neutral`, las dos piernas de un
>   traspaso (`transferId != null`), las aportaciones a producto (`productId != null`)
>   y los marcados (`excludedFromTotals: true`). **Consecuencia medular de esta
>   feature: pedir el mes con `excluded=none&transfer=none` devuelve EXACTAMENTE los
>   mismos tres `totals` que pedirlo sin esos parámetros.** El interruptor no cambia
>   las cifras; cambia qué filas se ven al lado de ellas.
> - Mismo fichero, mismo §: **con `transfer=only` o `excluded=only` los tres `totals`
>   salen siempre a `"0.00"`**, por construcción. `pagination.total` sí cuenta cuántos
>   hay. De aquí sale, entera, la decisión R7/R8: el **importe** de lo escondido **no
>   se le puede pedir al backend por ningún camino**, y el cliente no lo calcula.
> - Mismo fichero → `pagination.total` = cuántos coinciden con el **filtro entero**,
>   no cuántos trae la página.
> - `../../../gastos-backend/docs/api-contract.md` → §`GET /api/transfers/ambiguous`:
>   **solo lectura**, sin parámetros, **no escribe nada**; responde
>   `{ ambiguousCount, ambiguous[] }`; `ambiguousCount` son **grupos**, no movimientos,
>   y siempre vale `ambiguous.length`; `0` y `[]` no son error. Se calcula **en el
>   momento de la petición**, así que refleja lo que se haya enlazado o deshecho a mano.
>   Un movimiento **sin ningún candidato** (un traspaso cuya otra pierna nunca se
>   importó) **no sale aquí**: por eso R14 lo dice en palabras y R15 no lo cuenta.
> - Mismo fichero → §`GET /api/transfers`: **sin paginar**, devuelve **todas** las
>   parejas con **las dos piernas serializadas completas**. Descartado para la nota
>   (design §8): es de toda la historia, no del mes en pantalla, y es la respuesta más
>   pesada de las cuatro candidatas.
> - `../../src/features/statement/filters.ts` → `StatementFilters` (4 controles),
>   `EMPTY_FILTERS`, `monthQuery`, `toRouteQuery`, `fromRouteQuery`,
>   `hasActiveFilters`, `filterScopeLine`, `noMatchesLine`.
> - `../../src/features/statement/store.ts` → `show`, `shift`, `applyFilters`,
>   `loadMore`, `refreshQuietly`, `adoptUpdated`, `shownMovements`, `selectedIds`,
>   `isSelecting`, `lastExclusion`, `loadRun`.
> - `../../src/features/statement/components/MonthTotals.vue` → la constante
>   `FIGURES_NOTE` de la F19 y su marco de aviso (`bg-warning-subtle`, `TriangleAlert`).
> - `../../src/features/statement/views/StatementView.vue` → la URL como única
>   escritora del mes y de los filtros (`syncFromRoute`, `onMonth`, `onFilters`).
> - `../../src/shared/movements.ts` → `MovementQuery`, `buildMovementsQuery`,
>   `getMovements`, `parseMovementPage`.
> - `../../progress/exploration/ruido-traspasos-datos.md` → §1 (tabla por mes:
>   2026-07 pasa de **57.948,93 / 59.096,05** con solo el criterio `transferId` a
>   **2.785,90 / 4.096,05** con los depósitos marcados), §2 («Dos de los 40 son falsos
>   positivos»: dos multas casadas con Bizums de otra persona, **150 € de gasto y
>   150 € de ingreso reales ocultos**), §3 («**17 sin `transferId`**», traspasos
>   propios que hoy **sí** cuentan) y §4 (los **29** apuntes de depósito de myinvestor).
> - `../22-statement-exclude-from-totals/decisions.md` → sus 📌 y ⚠️, que esta
>   feature viene a cerrar.

---

## Cobertura del intent

| Punto de `como_se_que_esta_bien` / `acceptance` | Requirements |
|---|---|
| «Pongo el interruptor y desaparecen de la lista los marcados y los traspasos» | R2, R6 |
| «Las sumas que veo se corresponden con lo que queda a la vista» | R6, C3 |
| «La pantalla me dice cuántos movimientos ha dejado fuera y por cuánto» | R7, R8, R9 |
| «Quito el interruptor y vuelve todo» | R1, R3 |
| «El interruptor se recuerda al cambiar de mes y al recargar» | R4, R5 |
| «La nota ya no dice que las sumas están infladas: dice lo que pasa de verdad» | R14, R15 |
| `que_no_quiero` «no tocar el backend» / «que no escriba nada» | C1, C2 |
| `que_no_quiero` «que no se ponga solo sin que yo lo sepa» | R1 |
| `que_no_quiero` «no perder los filtros ni la navegación por meses» | R4, R10, C4 |
| `que_no_quiero` «esconder es una vista, no un borrado» | R3, R12, R13 |
| `acceptance` 1 y 2 (`excluded=none` / `transfer=none`; las sumas son las de `totals`) | R2, R6 |
| `acceptance` 4 y 5 (vive en la URL; empieza apagado) | R1, R4, R5 |
| `acceptance` 8 (convive con los filtros de la F20 y la selección de la F22) | R10, R11, R12 |
| `acceptance` 9 y 10 (inglés, tema oscuro, sin dependencias, puerta verde) | C6, C7 |

---

## R1
CUANDO el usuario abre el extracto sin la clave `hide` en la URL, el sistema DEBE
dejar el interruptor **apagado** y pedir el mes **sin** los parámetros `excluded` ni
`transfer`.

## R2
MIENTRAS el interruptor está encendido, el sistema DEBE pedir el mes con
`excluded=none` **y** `transfer=none` añadidos a los filtros activos y al rango del
mes, en la misma petición.

## R3
CUANDO el usuario apaga el interruptor, el sistema DEBE volver a pedir el mismo mes
con los mismos filtros y **sin** `excluded` ni `transfer`.

## R4
CUANDO el interruptor cambia de posición, el sistema DEBE reescribir la URL con
`router.replace` añadiendo `hide=true` (encendido) o quitando la clave (apagado),
**conservando** la clave `month` y las claves de los cuatro filtros tal como estaban.

## R5
CUANDO el extracto se carga con `hide=true` en la URL, el sistema DEBE encender el
interruptor; SI la clave `hide` trae cualquier otro valor ENTONCES el sistema DEBE
dejarlo apagado y no enviar los parámetros al backend.

## R6
MIENTRAS el interruptor está encendido, el sistema DEBE pintar como «Money in»,
«Money out» y «Difference» los tres valores de `totals` de la respuesta, sin sumar,
restar ni ajustar ninguno en el cliente.

## R7
MIENTRAS el interruptor está encendido y la carga del mes ha terminado con éxito, el
sistema DEBE hacer **una** petición adicional de recuento —el mismo mes y los mismos
filtros, **sin** `excluded` ni `transfer`, con `pageSize=1`— y mostrar junto al
interruptor el número `pagination.total` de esa respuesta menos el `pagination.total`
del mes en pantalla.

## R8
MIENTRAS el interruptor está encendido, el sistema NO DEBE mostrar ningún importe de
lo que queda escondido.

## R9
SI la petición de recuento falla ENTONCES el sistema DEBE omitir el número de
escondidos y dejar intactos la lista, las tres cifras y el resto de la pantalla, sin
pintar ningún error.

## R10
MIENTRAS el interruptor está encendido, el sistema DEBE aplicar los cuatro filtros de
la F20 **a la vez** que el interruptor, sin que ninguno de los dos anule al otro.

## R11
CUANDO el interruptor cambia de posición, el sistema DEBE vaciar la selección de la
F22, conservar el **modo** selección tal como estaba y olvidar el último deshacer.

## R12
SI con el interruptor encendido no queda ningún movimiento a la vista ENTONCES el
sistema DEBE mostrar un texto que nombre las dos causas posibles (los filtros y lo
escondido) y ofrecer un botón que apague el interruptor.

## R13
MIENTRAS el interruptor está encendido, CUANDO una acción de la F22 marca un
movimiento que está en pantalla, el sistema DEBE retirar esa fila de la lista y dejar
visible la línea de aviso con su `Undo`.

## R14
El sistema DEBE mostrar bajo las tres cifras, siempre y sin poder cerrarse, un texto
fijo que diga de qué están hechas las cifras, cómo ver el mes sin el ruido y qué dos
cosas **ningún recuento puede saber** (un traspaso propio cuya otra pierna nunca se
importó, y una pareja detectada que no sea un traspaso); y ese texto fijo NO DEBE
contener ninguna cifra: ni de un mes, ni de movimientos, ni de traspasos.

## R15
CUANDO el extracto se monta, el sistema DEBE pedir `GET /api/transfers/ambiguous`
**una sola vez por sesión** y, SI `ambiguousCount` es mayor que 0, añadir a la nota
una frase que diga ese número de grupos que parecen traspasos y no se pudieron
emparejar; SI la petición falla o `ambiguousCount` es 0 ENTONCES el sistema DEBE
dejar la nota con solo su texto fijo y no pintar ningún error.

---

## Restricciones (C)

- **C1** — Solo lectura. Esta feature NO DEBE emitir ninguna petición `POST`, `PATCH`
  ni `DELETE`, tampoco al pedir `GET /api/transfers/ambiguous` (que el contrato declara
  de solo lectura aunque al calcular encuentre algo emparejable). El interruptor no escribe `excludedFromTotals`, ni `transferId`, ni
  nada: solo cambia la pregunta que se le hace a `GET /api/movements`.
- **C2** — El backend no se toca. Los parámetros `excluded` y `transfer` existen ya
  (feature 49); no se pide ninguno nuevo ni se cambia el contrato.
- **C3** — Las tres cifras siguen siendo las de `totals` del backend. El cliente NO
  DEBE calcular, estimar ni ajustar ninguna, tampoco el importe de lo escondido.
- **C4** — La navegación por meses (F19), los cuatro filtros (F20), el editor de
  categoría (F21) y el modo selección (F22) siguen funcionando igual con el
  interruptor apagado, y sus suites pasan sin cambiar de intención.
- **C5** — El interruptor **no es un filtro de la barra**: `Clear filters` NO DEBE
  apagarlo, y `hasActiveFilters` no lo tiene en cuenta.
- **C6** — Todo en inglés, tema oscuro con tokens semánticos y contraste verificado;
  **sin dependencias nuevas**. Las respuestas se validan en frontera (ADR-002)
  reutilizando `src/shared/movements.ts`.
- **C7** — `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y `./init.sh`
  terminan en verde.
- **C8** — La comprobación final contra el backend real es **de solo lectura**: solo
  `GET`, con el humano delante, comparando pantalla y API. No necesita visto bueno
  previo porque no escribe nada, pero se ejecuta con él presente.

---

## Procedencia

- **R1** — (humano) `respuestas_del_humano` 1: «Al entrar se ve todo: el interruptor
  empieza apagado», y `que_no_quiero` 3 («que no se ponga solo sin que yo lo sepa»).
- **R2** — (humano) `acceptance` 1 y `como_se_que_esta_bien` 1. La decisión de mandar
  **los dos parámetros juntos con un solo interruptor** es la parte delegada; ver
  R2/🔴 1 abajo.
- **R2 (nº de interruptores)** — (delegado) `delego_en_agente` 1. Decido **un solo
  interruptor** que manda `excluded=none` y `transfer=none` a la vez, etiquetado
  `Hide what does not count`. Motivo: para el humano son la misma idea —cosas que se
  ven pero no están en las cifras— y él ya distingue una de otra fila a fila por las
  etiquetas `Not counted` y `Transfer` de la F22; dos interruptores serían 4 estados,
  4 combinaciones de URL y 4 casos de prueba para una distinción que es interna.
  Alternativa descartada: dos interruptores independientes.
  ← REVISAR EN APROBACIÓN (🔴 1).
- **R3** — (humano) `como_se_que_esta_bien` 4.
- **R4, R5** — (humano) `como_se_que_esta_bien` 5 y `acceptance` 4. La clave concreta
  `hide=true` es (delegado): sigue la forma de `uncategorized=true` que ya usa la F20.
- **R6** — (humano) `acceptance` 2 y `como_se_que_esta_bien` 2. Nota de lectura para
  el reviewer: por el contrato, encender el interruptor **no mueve** las tres cifras;
  lo que hace es que la lista deje de contradecirlas.
- **R7** — (delegado) `delego_en_agente` 2, «cómo se dice lo que queda fuera sin
  llenar la pantalla de texto». Decido **una sola petición extra de recuento**
  (`pageSize=1`) y la resta de los dos `pagination.total`. Alternativas descartadas:
  (a) dos peticiones (`excluded=only` + `transfer=only`), que además **contarían dos
  veces** un traspaso marcado; (b) ninguna petición extra y ningún número, más barato
  pero deja al humano sin saber qué se perdió. Coste: **una petición más por cada
  cambio de mes, de filtro o de tecleo en el buscador, solo mientras el interruptor
  está encendido**. ← REVISAR EN APROBACIÓN (🔴 4).
- **R8** — (añadido) El humano pidió «cuántos movimientos y **por cuánto**». El
  importe **no existe en ninguna respuesta del backend**: con `excluded=only` o
  `transfer=only` los tres `totals` salen a `"0.00"` por construcción (contract,
  §`GET /api/movements`), y sumarlo en el cliente sería exactamente la aritmética que
  C3 prohíbe. Propongo **dar el número y no el importe**. Alternativa: sumar en el
  cliente los `amount` de las páginas escondidas.
  ← REVISAR EN APROBACIÓN (🔴 4).
- **R9** — (añadido) El humano no dijo qué pasa si la petición de recuento falla.
  Propongo **fallar en silencio**: es un adorno informativo y no puede robarle la
  pantalla a un mes que sí cargó. ← REVISAR EN APROBACIÓN.
- **R10** — (delegado) `delego_en_agente` 4, «cómo conviven el interruptor y los
  filtros, y qué manda si se contradicen». Decido que **no manda ninguno**: se aplican
  a la vez (una sola petición con todo), porque los dos son formas de estrechar el
  mes y hacer que uno gane significaría desobedecer un gesto que el humano acaba de
  hacer. Alternativa descartada: que el interruptor gane y apague el filtro.
  ← REVISAR EN APROBACIÓN (🔴 5).
- **R11** — (delegado) misma delegación 4, mitad de la selección. Decido tratar el
  cambio de interruptor **como un cambio de mes o de filtro**: contexto nuevo, la
  selección se vacía y el modo sigue puesto, que es lo que `show()` ya hace desde la
  F22. Alternativa descartada: conservar los ids seleccionados.
  ← REVISAR EN APROBACIÓN (🔴 5).
- **R12** — (añadido) El humano no dijo qué ve si el interruptor y un filtro se dejan
  la pantalla vacía. Propongo un vacío que nombre las dos causas y un botón
  `Show everything`. ← REVISAR EN APROBACIÓN (🔴 5).
- **R13** — (añadido) El humano no dijo qué pasa si marca algo con el interruptor
  puesto. Propongo que **la fila desaparezca** (es coherente con lo que el interruptor
  promete) y que la línea de aviso con `Undo` de la F22 quede visible para poder
  deshacerlo. ← REVISAR EN APROBACIÓN.
- **R14** — (delegado) `delego_en_agente` 3, «qué dice exactamente la nota nueva»,
  y `como_se_que_esta_bien` 6. El texto exacto está en `decisions.md` 🔴 2. Decido que
  el texto fijo **no lleve ni una cifra**: el «17» salía de una búsqueda por conceptos
  con falsos positivos posibles y el «2» de mirar dos multas a mano —los dos son juicio
  del humano, no un dato que el programa tenga—, y clavarlos a mano es exactamente lo
  que hizo caducar la nota de la F19. Alternativa descartada: mantenerlos y avisar al
  humano cada vez que cambien. ← REVISAR EN APROBACIÓN (🔴 2).
- **R15** — (delegado) misma delegación 3, la parte «sin llenar la pantalla de texto».
  De las cuatro cifras que el backend sí sabe contar —lo escondido del mes, los
  marcados del mes (`excluded=only`), las parejas enlazadas (`GET /api/transfers` →
  `pairs.length`) y los grupos dudosos (`ambiguousCount`)— decido llevar a la nota
  **solo `ambiguousCount`**: es la única global (una petición **por sesión**, no por
  mes ni por filtro), la única accionable y la de respuesta más ligera. Descartadas:
  `pairs.length` (habla de toda la historia bajo las cifras de un mes, y su respuesta
  arrastra las dos piernas completas de las 40 parejas) y el recuento de marcados del
  mes (una petición por cada mes y cada filtro, solo para partir en dos el `Hiding N`
  que ya se ve). El coste total de la nota queda en **una lectura por sesión**.
  ← REVISAR EN APROBACIÓN (🔴 3).
- **C1, C2, C3** — (humano) `que_no_quiero` 1 y 2, `acceptance` 2 y 7.
- **C4** — (humano) `que_no_quiero` 4 y `acceptance` 8.
- **C5** — (añadido) El humano no habló de la relación entre `Clear filters` y el
  interruptor. Propongo que **no lo apague**: `Clear filters` limpia la barra, y
  volver a ver el ruido tiene que ser un gesto consciente. ← REVISAR EN APROBACIÓN.
- **C6, C7** — (humano) `acceptance` 9 y 10.
- **C8** — (añadido) El `intent` no habla de cómo se comprueba contra el backend real.
  Propongo una comprobación **de solo lectura** con el humano delante, comparando
  combinaciones de interruptor, filtros y meses con lo que devuelve la API.
  ← REVISAR EN APROBACIÓN (📌).
