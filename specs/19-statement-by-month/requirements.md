# Requirements — Feature 19: statement-by-month (el extracto, mes a mes)

> Derivado del bloque `intent` de la feature 19 en `feature_list.json` (fuente de
> verdad, incluidas sus `respuestas_del_humano`) y de sus 11 criterios de
> `acceptance`. EARS estricto según `docs/specs.md`.
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
>
> - `../../../gastos-backend/docs/api-contract.md` → `### GET /api/movements`:
>   `from` y `to` en `YYYY-MM-DD` con **los dos extremos incluidos**
>   (`from=2026-08-01&to=2026-08-31` es agosto entero), `status` opcional
>   (`confirmed` / `pending_review`), `page` ≥ 1 y `pageSize` 1-200 (def. 50);
>   orden `bookingDate DESC, daySequence DESC`; respuesta
>   `{ movements[], pagination: { page, pageSize, total, totalPages },
>   totals: { income, expense, net } }`, con `pagination.total` y `totals`
>   calculados sobre **todas** las coincidencias del filtro, no sobre la página; un
>   filtro válido sin coincidencias es **200 con `total: 0`**; `404 NOT_FOUND` solo
>   si se manda un `accountId`/`categoryId` inexistente (esta pantalla no manda
>   ninguno de los dos); modelo `Movement` completo, con `transferId`,
>   `balanceAfter` (nullable), `account` y `category` embebidos.
> - `progress/exploration/ruido-traspasos-backend.md` → `computeTotals`
>   (`movements.service.ts:456-471`) **excluye de `totals`** los movimientos con
>   `transferId`, los `neutral` y los que tuvieran `productId` (hoy nadie lo
>   escribe). No excluye nada más, no hay filtro «sin traspasos» y **ningún campo
>   escribible desde el frontend saca un movimiento de los totales**.
> - `progress/exploration/ruido-traspasos-datos.md` → 1.607 movimientos, 33 meses
>   (2024-01 a 2026-09), mes más cargado ≈93 movimientos; los 29 apuntes de
>   depósito de myinvestor (`APERTURA DEP` / `INTERESES DEP` / `CANCELACION DEP`)
>   valen **285.000 € de gasto y 275.652 € de ingreso**, el 58 % del gasto y el
>   56 % del ingreso de toda la base, y **siguen dentro de los `totals`**;
>   2026-07 da 59.096 € de gasto y 57.949 € de ingreso, que es un depósito
>   renovándose, no vida real.
> - Código real: `src/shared/movements.ts` (`Movement`, `MovementQuery`,
>   `MovementPage`, `buildMovementsQuery`, `parseMovementPage`, `getMovements`),
>   `src/shared/money.ts` (`formatMoney`, `formatDate`, `toCents`),
>   `src/shared/banks.ts` (`bankLabel`), `src/shared/components/`
>   (`BaseCard`, `BaseButton`, `BaseBadge`, `BaseInput` con `type: 'text' | 'date'`),
>   `src/features/review/` (`MovementRow.vue`, `MovementList.vue`,
>   `ReviewTotals.vue`, `ReviewPager.vue`, `filters.ts`, `store.ts`),
>   `src/router/index.ts` (`/movements` → `PlaceholderView`) y
>   `src/router/__tests__/router.spec.ts:58`.
>
> **Fuera de alcance** (lo dice el `intent` y lo repite aquí para el reviewer):
> tocar el backend; escribir cualquier cosa (categoría, estado, borrado); editar
> importe, fecha o descripción; gráficas; exportar a CSV; columna de saldo;
> **filtros, búsqueda y el interruptor del ruido** (van en features posteriores de
> la E7); duplicar la cola de revisión; y **arreglar las sumas infladas** — no
> tiene solución desde el frontend (ver R6 y C7).

## Cobertura del intent

| Punto de `como_se_que_esta_bien` / `acceptance` | Requirements |
|---|---|
| «Entro y veo el mes en curso con sus movimientos y sus sumas, sin tocar nada» | R1, R5, R8 |
| «Cambio al mes anterior de un clic y las sumas cambian con él» | R2, R5 |
| «Veo todo, tanto lo pendiente como lo que haya confirmado» | R1 |
| «Las sumas son las que calcula el backend, no una cuenta inventada» | R5 |
| «Con 1.607 movimientos y 33 meses, la pantalla no se arrastra» | R13, R14, R15 |
| «Lo que veo cuadra con lo que dice mi banco para ese mes» | R5, R9, R10, C6 |
| «Si un mes no tiene movimientos, me lo dice» | R11 |
| «Cada línea: fecha, concepto, cuenta, categoría e importe» | R8, R9 |
| `acceptance` 2 (el mes vive en la URL: recargar y atrás funcionan) | R3, R4 |
| `acceptance` 4 (signo derivado de `type`, sin columna de saldo) | R9 |
| `acceptance` 5 (mes vacío distinto de fallo de carga) | R11, R12 |
| `acceptance` 6 (paginación del contrato respetada, mes completo visible) | R1, R13 |
| `acceptance` 7 (solo lectura) | C1 |
| `acceptance` 8 (validación en frontera reutilizando `shared/movements.ts`) | C2 |
| `acceptance` 9 (las F15-F18 no cambian) | C4 |
| `respuestas_del_humano` 1 (al entrar, el mes en curso) | R1 |
| `respuestas_del_humano` 2 (la pantalla es `Movements`) | R1, C3 |
| `respuestas_del_humano` 3 (sin columna de saldo) | R9 |
| `respuestas_del_humano` 4 (corregir categoría, en otra feature) | C1 |
| `por_que`: «la pantalla que sustituye al Excel» / sumas que signifiquen algo | R5, R6, R7, R10 |

---

## R1
CUANDO el usuario entra en la ruta `/movements` sin `month` en la URL, el sistema DEBE
pedir `GET /api/movements` con `from` = primer día del mes natural en curso, `to` =
último día de ese mes, `page=1`, `pageSize=200` y **sin `status`**, de forma que la
respuesta traiga tanto lo pendiente como lo confirmado.

## R2
CUANDO el usuario pulsa la flecha de mes anterior, la de mes siguiente, o elige un mes
en el selector de mes, el sistema DEBE cargar ese mes con la misma petición de R1
cambiando `from` y `to`.

## R3
CUANDO el mes mostrado cambia, el sistema DEBE dejarlo en la URL como
`?month=YYYY-MM`, de manera que recargar la página o usar el botón de atrás del
navegador muestre ese mismo mes.

## R4
SI la URL trae un `month` que no cumple `YYYY-MM` con mes entre `01` y `12` ENTONCES
el sistema DEBE mostrar el mes natural en curso, sin mensaje de error.

## R5
CUANDO llega la respuesta del mes, el sistema DEBE mostrar `totals.income`,
`totals.expense` y `totals.net` de esa respuesta —nunca una suma calculada sobre los
movimientos de la página— junto al número de movimientos del mes
(`pagination.total`), con las etiquetas neutras `Money in`, `Money out` y
`Difference`.

## R6
MIENTRAS se muestran las sumas de un mes, el sistema DEBE mostrar de forma permanente,
sin posibilidad de cerrarla, una nota que diga las cuatro cosas: (a) que son los
movimientos tal y como los dio el banco; (b) que las aperturas y vencimientos de
depósito y las transferencias a cuentas propias no importadas **cuentan** como dinero
que entra y sale; (c) que por eso un mes puede leerse muy por encima del gasto real, con
el ejemplo concreto de julio de 2026 (≈58.000 € por lado de un solo depósito
renovándose); y (d) que los traspasos ya emparejados **no** están en estas sumas aunque
sí se vean en la lista.

## R7
El sistema NO DEBE usar en esta pantalla las palabras `spent`, `earned`, `savings` ni
ninguna otra que presente estas cifras como gasto o ingreso de la vida real.

## R8
CUANDO la respuesta del mes trae movimientos, el sistema DEBE pintarlos en una sola
lista continua, en el orden en que los devuelve la API (`bookingDate` descendente),
agrupados bajo una cabecera por día con la fecha de ese día formateada.

## R9
Cada línea de la lista DEBE mostrar exactamente el concepto, la cuenta (banco + alias),
la categoría —`Uncategorized` cuando no la tiene— y el importe con el signo derivado de
`type`, y ningún otro dato del movimiento: en particular NO DEBE pintar `balanceAfter`
ni como columna ni como texto.

## R10
SI un movimiento trae `transferId` no nulo ENTONCES su línea DEBE mostrar una marca
visible `Transfer`, que es lo que explica que las líneas visibles sumen más que las
sumas del mes.

## R11
SI la respuesta del mes trae `pagination.total` igual a 0 ENTONCES el sistema DEBE
mostrar una frase que nombre ese mes y NO DEBE pintar ninguna lista ni cabecera de día.

## R12
SI la petición del mes falla, o su respuesta no cumple el contrato, ENTONCES el sistema
DEBE mostrar una frase propia en inglés —sin pintar el `message` del backend— y un
botón de reintentar, distinta de la frase del mes vacío de R11.

## R13
SI la respuesta del mes trae `pagination.totalPages` mayor que 1 ENTONCES el sistema
DEBE ofrecer un botón que traiga la página siguiente **del mismo mes** y la añada al
final de la lista, sin cambiar las sumas ni el número de movimientos ya mostrados.

## R14
MIENTRAS hay una petición de mes en vuelo, el sistema DEBE mostrar un indicador de
carga en lugar de una lista a medias.

## R15
CUANDO llega la respuesta de una petición de mes que ya no es la última pedida, el
sistema DEBE descartarla sin cambiar el mes mostrado, sus sumas ni su lista.

---

## Restricciones (no son requirements, pero el reviewer las comprueba)

- **C1 — Solo lectura.** Ninguna petición de esta pantalla usa un método distinto de
  `GET`. Grep de cierre: en `src/features/statement/` no aparece `POST`, `PATCH` ni
  `DELETE`. No se corrige la categoría desde aquí (`respuestas_del_humano` 4).
- **C2 — Frontera (ADR-002).** La respuesta se mapea con `parseMovementPage` de
  `src/shared/movements.ts`, reutilizando sus tipos y sus guardas; no se declara un
  `Movement` nuevo ni un parser paralelo.
- **C3 — Una feature, un sentido de dependencia.** El código vive en
  `src/features/statement/`; **no importa nada de `features/review`, `import`,
  `category-rules` ni `net-worth`**, y ninguna de ellas lo importa. Lo común sale de
  `shared/`.
- **C4 — Las F15, F16, F17 y F18 no cambian de comportamiento**: sus suites pasan sin
  tocarlas. La única excepción prevista y justificada es el test
  `router.spec.ts:58`, que hoy afirma que `/movements` es un placeholder y pasa a
  afirmar que monta el extracto.
- **C5 — Sin dependencias nuevas**, todo en inglés, tema oscuro con alias semánticos y
  las parejas de color con su línea `contrast:` en `theme-dark.css`.
- **C6 — Puerta verde:** `pnpm type-check`, `pnpm lint`, `pnpm test:unit`,
  `pnpm build`, e2e chromium y `./init.sh`.
- **C7 — Comprobación final con el humano delante**, contra el backend real de `:3000`.
  Es de **solo lectura** (ninguna petición escribe), así que no necesita el aparato de
  visto bueno explícito de la F17: solo que él esté mirando y compare las cifras del mes
  con lo que devuelve la API.

---

## Procedencia

- **R1** — (humano) «Entro y veo el mes en curso» (`respuestas_del_humano` 1), «veo
  todo, tanto lo pendiente como lo que haya confirmado» y `acceptance` 1. **(delegado)**
  en un detalle: `pageSize=200`, el máximo del contrato, para que el mes entero venga en
  **una** petición — el mes más cargado tiene ≈93 movimientos. Alternativa descartada:
  el `pageSize=100` de la cola de Review, que partiría en dos casi ningún mes pero
  obligaría a un segundo viaje sin necesidad.
- **R2** — (delegado) `delego_en_agente` 1, «si el mes se elige con flechas, con un
  desplegable o con un rango libre de fechas». Decido **flechas + un selector de mes
  nativo** (`<input type="month">`): las flechas cubren el gesto de todos los días
  («el mes anterior de un clic», que el `intent` pide literal) y el selector evita 20
  clics para llegar a enero de 2024, sin añadir ninguna dependencia. Alternativas
  descartadas: solo flechas (33 meses a golpe de clic) y un rango libre de fechas
  (rompe el modelo «un mes» del que dependen las sumas y las cabeceras de día, y es
  justo lo que el `intent` mete en la feature de filtros).
- **R3** — (humano) `acceptance` 2, «el mes elegido vive en la URL para que recargar y
  el botón de atrás funcionen», y `delego_en_agente` 5 («cómo se conserva el mes al
  recargar o volver atrás»): decido **la URL y solo la URL**, como ya hace la cola de
  Review con sus filtros. Alternativa descartada: recordar el último mes visto en
  `localStorage` — un estado más que mantener y que no se puede compartir por enlace.
- **R4** — (añadido) el `intent` no dice qué pasa con una URL editada a mano o
  caducada. Propongo la misma tolerancia que ya tiene `fromRouteQuery` de Review: se cae
  al mes en curso en silencio, sin error. ← REVISAR EN APROBACIÓN.
- **R5** — (humano) «Las sumas son las que calcula el backend, no una cuenta inventada
  en la pantalla» y `acceptance` 3. **(añadido)** las **etiquetas neutras** `Money in` /
  `Money out` / `Difference`, en vez de `Spent` / `Earned`: son las mismas tres cifras
  que ya pinta `ReviewTotals`, pero aquí nombrarlas «gasto» sería mentir mientras los
  depósitos estén dentro (ver R6). ← REVISAR EN APROBACIÓN.
- **R6** — (añadido) **la decisión más importante de la feature y el humano no la pidió,
  porque cuando escribió el `intent` aún creía que esta pantalla iba a traer las sumas
  limpias.** Las mediciones de `progress/exploration/ruido-traspasos-datos.md` y la
  lectura de `computeTotals` dicen que **no hay forma de arreglarlo desde el frontend**:
  los 285.000 € de depósitos siguen contando y no existe ningún campo escribible que
  los saque. Propongo decirlo en la propia pantalla, siempre visible, con el ejemplo de
  julio de 2026 y sin botón de cerrar. Alternativa descartada: un aviso que se pueda
  cerrar o un icono con tooltip — se cierra una vez y no se vuelve a ver nunca, que es
  exactamente lo que no puede pasar con una cifra inflada un 1.400 %.
  ← REVISAR EN APROBACIÓN.
- **R7** — (añadido) corolario de R6: la prohibición explícita de las palabras que
  harían pasar estas cifras por gasto de vida real. Es verificable con un test sobre el
  texto renderizado. ← REVISAR EN APROBACIÓN.
- **R8** — (delegado) `delego_en_agente` 3, «cómo se agrupan las líneas dentro del mes:
  por día o lista continua con separadores». Decido **lista continua con una cabecera
  por día**: es como se lee un extracto bancario y la fecha deja de repetirse 93 veces.
  Alternativa descartada: una fila plana con su fecha en cada línea (más fácil de
  copiar y pegar, más ruido al leer).
- **R9** — (humano) «Cada línea tiene que decirme fecha, concepto, cuenta, categoría e
  importe», `acceptance` 4 y `respuestas_del_humano` 3 (sin saldo). **Matiz (delegado):**
  la **fecha** de cada línea la da la cabecera del día bajo la que vive, no se repite en
  la propia línea; es la consecuencia directa de R8. ← REVISAR EN APROBACIÓN.
- **R10** — (añadido) el `intent` no lo pide. Lo introduzco porque sin él la pantalla
  miente por omisión: los movimientos con `transferId` **se ven en la lista pero no
  están en las sumas** (así calcula el backend), así que sumar las líneas a mano no
  cuadra con el total y nada lo explicaría. La marca es la explicación más barata
  posible y no añade ninguna petición. ← REVISAR EN APROBACIÓN.
- **R11** — (humano) «Si un mes no tiene movimientos, me lo dice en lugar de enseñarme
  una tabla vacía» y `acceptance` 5. Copia el patrón de `MovementList.vue` de Review.
- **R12** — (humano) `acceptance` 5, «distinguiéndolo de un fallo de carga». Los textos
  concretos son **(delegado)**: se derivan de `reviewErrorMessage` (`review/store.ts`),
  que ya traduce red, 400, `ValidationError` y el resto a frases en inglés sin pintar el
  `message` del backend, que viene en español.
- **R13** — (delegado) `delego_en_agente` 4, «cuántos movimientos se cargan de golpe y
  cómo se sigue bajando dentro de un mes», y `acceptance` 6. Decido **`Load more`**, que
  añade al final, sobre paginar: con `pageSize=200` ningún mes real llega a la segunda
  página (el peor son 93), así que este camino es una red de seguridad, no el gesto
  diario; un paginador para algo que nunca aparece es un control muerto. Alternativa
  descartada: el `ReviewPager` de la cola (páginas numeradas), que además haría
  desaparecer la primera mitad del mes al pasar de página. Scroll infinito descartado
  también: no se puede volver a donde estabas.
- **R14** — (humano) `que_no_quiero` implícito en «la pantalla no se arrastra» + el
  patrón ya establecido en Review (`review-loading`).
- **R15** — (añadido) el `intent` no lo contempla. Con las flechas se pueden pedir cinco
  meses en dos segundos y las respuestas pueden llegar desordenadas; sin esta regla la
  pantalla acabaría enseñando el mes de septiembre con las sumas de julio. Mismo patrón
  `loadRun` que ya usa el store de Review. ← REVISAR EN APROBACIÓN.
