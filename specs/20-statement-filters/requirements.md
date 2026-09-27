# Requirements — Feature 20: statement-filters (filtrar y buscar dentro del mes)

> Derivado del bloque `intent` de la feature 20 en `feature_list.json` (fuente de
> verdad, incluida su `respuestas_del_humano`) y de sus 13 criterios de
> `acceptance`. EARS estricto según `docs/specs.md`. Segunda rodaja de la E7,
> encima de la pantalla que cerró la F19.
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
>
> - `../../../gastos-backend/docs/api-contract.md` → `### GET /api/movements`:
>   todos los parámetros son **opcionales y combinables entre sí**, así que
>   `from`/`to` del mes viajan junto a `accountId`, `categoryId`,
>   `uncategorized`, `q`, `type`, `status`, `page` y `pageSize`.
>   `accountId` inexistente → **404 `NOT_FOUND`**; `categoryId` inexistente →
>   **404 `NOT_FOUND`**; **`categoryId` + `uncategorized=true` en la misma
>   petición → 400 `VALIDATION_ERROR`**; `uncategorized=false` no filtra nada;
>   `q` de **2 a 100 caracteres** (el máximo se mide sobre el texto tal cual
>   llega, el mínimo sobre el texto recortado; fuera de rango es 400), busca
>   **por trozo** de `description`, **ignorando mayúsculas y tildes**, sin
>   comodines (`%` y `_` son literales) y solo en `description`.
>   `pagination.total` y `totals` se calculan **sobre todas las coincidencias
>   del filtro**, nunca sobre la página. Un filtro válido sin coincidencias es
>   **200 con `total: 0` y totales `"0.00"`**. Un parámetro desconocido se ignora.
> - `../../../gastos-backend/docs/api-contract.md` → `### GET /api/categories`
>   (árbol de raíces con `children`, un nivel) y `### GET /api/accounts` (lista
>   de cuentas con `id`, `iban`, `bank`, `alias`, `type` y saldos).
> - Código real de la F19: `src/features/statement/store.ts`, `months.ts`
>   (`monthQuery`, `monthRange`, `monthFromRouteQuery`, `emptyMonthLine`,
>   `statementErrorMessage`, `showingLine`, `movementCountLine`), `types.ts`,
>   `views/StatementView.vue` (la URL como única escritora del mes),
>   `components/{MonthNav,MonthTotals,StatementList,StatementRow}.vue`
>   (incluida la **nota permanente no cerrable** de `MonthTotals.vue`).
> - Código real de la F15/F16: `src/features/review/filters.ts`
>   (`searchTerm`, `SEARCH_MIN`, `SEARCH_MAX`, `SEARCH_TOO_LONG`,
>   `hasActiveFilters`, `toQuery`, `toRouteQuery`, `fromRouteQuery` con su
>   tolerancia a URLs escritas a mano), `components/ReviewFilterBar.vue`
>   (temporizador de la búsqueda, exclusión categoría ↔ sin categoría, cuentas
>   sacadas de la página cargada), `components/CategorySelect.vue`,
>   `components/MovementList.vue` (`EmptyState: 'caughtUp' | 'noMatches'`),
>   `store.ts` (`reviewErrorMessage`, `loadRun`), `views/ReviewView.vue`
>   (`replace` para filtros, `push` para página).
> - `src/shared/movements.ts` (`MovementQuery` con `categoryId`/`uncategorized`
>   ya excluyentes en `buildMovementsQuery`, `SEARCH_DEBOUNCE_MS = 350`) y
>   `src/shared/categories.ts` (`getCategories`, `Category`).
> - Datos reales del humano: **5 cuentas**, **16 categorías**, 1.607 movimientos
>   en 33 meses, y **1.373 sin categoría** — el filtro «sin categoría» es el que
>   más se va a usar. Mes más cargado ≈93 movimientos.
>
> **Fuera de alcance** (lo dice el `intent`): tocar el backend; escribir
> cualquier cosa (sigue siendo solo mirar); un **rango libre de fechas**; perder
> la navegación por meses; cambiar las sumas por unas calculadas en el cliente;
> el interruptor del ruido; corregir la categoría desde el extracto; y duplicar
> la barra de filtros de la cola de revisión si se puede reutilizar.

## Cobertura del intent

| Punto de `como_se_que_esta_bien` / `acceptance` | Requirements |
|---|---|
| «Filtro por una cuenta y veo solo la suya, con sus propias sumas» | R1, R2, R4, R14 |
| «Filtro por una categoría y veo todo lo que la lleva en ese mes» | R1, R2, R14 |
| «Pido los que no tienen categoría y veo cuántos son en ese mes» | R1, R5, R9 |
| «Busco un trozo del concepto y lo encuentro, con tildes o sin ellas» | R1, R7 |
| «Cambio de mes y los filtros que tenía puestos siguen puestos» | R12 |
| «Si un filtro deja el mes sin nada, me lo dice y lo distingue del mes vacío» | R13 |
| «Puedo quitar todos los filtros de una vez» | R11 |
| «Recargo la página o le doy a atrás y sigo viendo lo mismo» | R8, R10 |
| `acceptance` «uncategorized y categoryId nunca viajan juntos» | R9, R10 |
| `acceptance` «las sumas siguen siendo las de totals» | R4 |
| `acceptance` «la nota permanente sigue visible y sin poder cerrarse» | R6 |
| `acceptance` «solo lectura» / «no cambia la cola de revisión» | C1, C4 |

---

## R1
CUANDO el extracto pide un mes, el sistema DEBE llamar a `GET /api/movements`
con el `from` y el `to` de ese mes **y**, en la misma petición, los filtros
activos: `accountId`, `categoryId` **o** `uncategorized=true`, y `q` recortada
de espacios y enviada tal cual la escribió el usuario, sin quitarle tildes ni
pasarla a minúsculas (el contrato ya compara sin tildes y sin mayúsculas).

## R2
El sistema DEBE mostrar sobre la lista del extracto una barra con exactamente
cuatro controles —búsqueda por concepto, cuenta, categoría y una casilla «sin
categoría»— y NO DEBE mostrar en ella controles de tipo, de estado ni de rango
de fechas.

## R3
CUANDO cambia cualquier filtro, el sistema DEBE volver a pedir el mes desde la
primera página y descartar los movimientos que `Load more` hubiera traído.

## R4
MIENTRAS haya filtros activos, el sistema DEBE pintar como cifras del periodo
las de `totals` de la respuesta filtrada, y NO DEBE derivar ninguna de ellas de
los movimientos en pantalla.

## R5
MIENTRAS haya filtros activos, el sistema DEBE mostrar junto a las cifras una
línea que nombre los filtros aplicados y el recuento `pagination.total` de la
respuesta filtrada, sin pedir el mes sin filtrar para compararlo.

## R6
MIENTRAS haya filtros activos, el sistema DEBE seguir mostrando la nota
permanente sobre las cifras crudas del banco, con su texto íntegro y sin ningún
control para cerrarla.

## R7
CUANDO el usuario escribe en la búsqueda, el sistema DEBE esperar 350 ms desde
la última tecla antes de pedir nada, no enviar el texto si recortado mide menos
de 2 caracteres, y —si el texto tal cual mide más de 100— mostrar el aviso de
longitud junto al campo sin enviar la petición.

## R8
El sistema DEBE guardar el mes y los filtros activos en la querystring de
`/movements`, y NO DEBE guardarlos en ningún otro sitio.

## R9
CUANDO el usuario elige una categoría estando marcada la casilla «sin
categoría» (o la marca teniendo una categoría elegida), el sistema DEBE dejar
activo solo el último de los dos, de modo que `categoryId` y
`uncategorized=true` nunca viajen en la misma petición.

## R10
CUANDO la pantalla se carga con una querystring, el sistema DEBE reconstruir de
ella el mes y los filtros; SI la querystring trae valores imposibles o basura
(una categoría junto a `uncategorized=true`, un id que no es un entero
positivo, una `q` de más de 100 caracteres, un mes inválido) ENTONCES el
sistema DEBE caer a un estado válido en silencio —gana «sin categoría» sobre la
categoría, el resto se ignora— sin mostrar error y sin llegar a emitir la
petición que el contrato rechazaría.

## R11
CUANDO el usuario pulsa el botón de quitar filtros, el sistema DEBE dejar los
cuatro filtros vacíos conservando el mes que estaba viendo.

## R12
CUANDO el usuario cambia de mes, el sistema DEBE conservar los filtros activos
y aplicarlos al mes nuevo.

## R13
SI la respuesta de un mes trae `pagination.total` igual a 0, ENTONCES el
sistema DEBE decir «no hay nada con estos filtros», nombrando el mes y
ofreciendo quitar los filtros, cuando haya filtros activos, y mantener la frase
de mes vacío de la F19 cuando no los haya.

## R14
El sistema DEBE llenar el desplegable de cuentas con todas las cuentas que
devuelve `GET /api/accounts` y el de categorías con todas las que devuelve
`GET /api/categories`, pidiendo cada lista una sola vez por sesión.

## R15
SI la petición de las cuentas o la de las categorías falla, ENTONCES el sistema
DEBE deshabilitar solo ese desplegable con un aviso en inglés y dejar el resto
de la pantalla funcionando.

---

## Restricciones (no son requirements, pero el reviewer las comprueba)

- **C1 — Solo lectura.** Ninguna petición de esta feature usa un método distinto
  de `GET`. Grep de cierre: en `src/features/statement/` no aparece `POST`,
  `PATCH` ni `DELETE`.
- **C2 — Frontera (ADR-002).** Las respuestas se mapean con `parseMovementPage`
  y `parseCategories` de `shared/`, y las cuentas con un parser nuevo en
  `src/shared/accounts.ts` hecho con `createValidators`; no se declara un tipo
  paralelo ni se lee una respuesta sin validar.
- **C3 — Un solo sentido de dependencia.** `features/statement/` **no importa
  nada de `features/review`**; lo que las dos necesitan se mueve a `shared/` y
  `review/filters.ts` lo re-exporta (mismo movimiento que hicieron la F17 con
  las categorías y la F18 con la lectura de movimientos).
- **C4 — Las F15 a F19 no cambian de comportamiento**: sus suites pasan **sin
  tocarlas**. Se admite como única excepción prevista la actualización de los
  tests de `months.spec.ts` que apuntaban a `monthQuery`, porque esa función se
  muda a `filters.ts` (misma feature, mismo spec).
- **C5 — Sin dependencias nuevas**, todo en inglés, tema oscuro con alias
  semánticos y su línea `contrast:` en `theme-dark.css` para cualquier pareja
  nueva de color.
- **C6 — Puerta verde:** `pnpm type-check`, `pnpm lint`, `pnpm test:unit`,
  `pnpm build`, e2e chromium y `./init.sh`.
- **C7 — Comprobación final con el humano delante**, contra el backend real de
  `:3000` y de **solo lectura**: varias combinaciones de filtros comparadas con
  lo que responde la API (T15 del plan).

---

## Procedencia

- **R1** — (humano) «filtrar por cuenta, por categoría y por los que no tienen
  categoría, y buscar por un trozo del concepto, sin salir del mes» y
  `acceptance` 1. **(delegado)** el detalle de mandar `q` **tal cual**, sin
  normalizar tildes en el cliente: el contrato ya compara sin tildes, así que
  normalizar aquí sería trabajo duplicado y una fuente de discrepancias.
- **R2** — (delegado) `delego_en_agente` 1, «si la barra de filtros de la cola
  se reutiliza tal cual, se comparte o se copia». Decido **compartir la lógica
  pura y no el componente**: las guardas de `q` y los ayudantes de la URL se
  mueven a `shared/`, y el extracto estrena su propia barra con **solo sus
  cuatro controles**. **(añadido)** dejar fuera **tipo** (el signo del importe
  ya lo dice y el humano no lo pidió), **estado** (él cerró en la F19 que el
  extracto enseña lo pendiente y lo confirmado) y **fechas** (el mes manda:
  `respuestas_del_humano`). ← REVISAR EN APROBACIÓN.
- **R3** — (añadido) el `intent` no dice qué pasa con lo que ya trajo
  `Load more` al cambiar un filtro. Propongo tirarlo y volver a empezar por la
  primera página: la lista mezclada sería del filtro viejo.
  ← REVISAR EN APROBACIÓN.
- **R4** — (humano) «que las sumas que veo se correspondan con lo que estoy
  viendo filtrado», `que_no_quiero` «que las sumas dejen de ser las del
  backend» y `acceptance` 2. El backend ya calcula `totals` sobre el filtro.
- **R5** — (delegado) `delego_en_agente` 3, «qué se enseña cuando hay filtros
  puestos: un resumen de lo filtrado, un contador, o nada». Decido **resumen +
  contador del propio filtro**, y **no** pedir el mes sin filtrar para poder
  decir «12 de 93»: sería una petición más por cada cambio de filtro.
  Alternativa descartada: no enseñar nada, y que las cifras cambien sin que
  nada explique por qué.
- **R6** — (humano) `acceptance` 11. La nota **no cambia ni una palabra**: su
  ejemplo de julio de 2026 describe un mes entero, y por eso el alcance del
  filtro se dice en la línea aparte de R5, no dentro de ella.
- **R7** — (humano) `acceptance` 4 («respeta los límites del contrato para `q` y
  espera tras la última tecla, como en la cola»). **(delegado)**
  `delego_en_agente` 2: los valores concretos son los que ya existen —350 ms
  (`SEARCH_DEBOUNCE_MS`), mínimo 2 sin error y máximo 100 con aviso local—
  reutilizando `searchTerm`. Alternativa descartada: una espera propia del
  extracto; dos esperas distintas en la misma aplicación serían ruido.
- **R8** — (humano) `acceptance` 5, y `delego_en_agente` 4 («cómo se reparten
  los filtros y el mes en la URL»): decido **`?month=` intacto de la F19 más
  las mismas claves que ya usa la cola** (`account`, `category`,
  `uncategorized`, `q`), y **ninguna clave de página** (el extracto no pagina,
  usa `Load more`). Alternativa descartada: claves nuevas propias del extracto,
  que harían ilegibles dos URLs de la misma aplicación.
- **R9** — (humano) `acceptance` 3, «elegir uno desmarca el otro».
- **R10** — (añadido) el `intent` no contempla una URL escrita a mano con una
  combinación que el backend rechaza con 400. Propongo la misma tolerancia
  silenciosa que ya tiene `fromRouteQuery` de la cola y `monthFromRouteQuery`
  de la F19: se corrige antes de pedir, gana «sin categoría», y nunca se emite
  la petición prohibida. ← REVISAR EN APROBACIÓN.
- **R11** — (humano) «Puedo quitar todos los filtros de una vez» y
  `acceptance` 8. **(añadido)** que el mes **no** se reinicie al limpiar: quitar
  filtros no es volver al mes en curso. ← REVISAR EN APROBACIÓN.
- **R12** — (humano) «Cambio de mes y los filtros que tenía puestos siguen
  puestos», `acceptance` 6 y `respuestas_del_humano`.
- **R13** — (humano) «Si un filtro deja el mes sin nada, me lo dice y distingue
  eso de que el mes esté vacío» y `acceptance` 7. Copia el patrón
  `caughtUp`/`noMatches` de `MovementList.vue`.
- **R14** — (delegado) `delego_en_agente` 5, «si los desplegables se llenan con
  todo lo que existe o con lo que aparece en el mes». Decido **con todo lo que
  existe**: son 5 cuentas y 16 categorías, una petición por sesión cada una, y
  en cuanto filtras por una cuenta el mes cargado solo contiene esa —el
  desplegable de la cola de revisión, que se llena con la página, se queda corto
  por eso. Alternativa descartada: sacarlas del mes cargado (cero peticiones
  nuevas, lista incompleta y cambiante).
- **R15** — (añadido) el `intent` no dice qué pasa si falla una de esas dos
  listas. Propongo el patrón que ya usa la cola con las categorías: se apaga ese
  desplegable con un aviso y la pantalla sigue viva. ← REVISAR EN APROBACIÓN.
