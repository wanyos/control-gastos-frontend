# Requirements — Feature 21: statement-fix-category (corregir la categoría desde el extracto)

> Derivado del bloque `intent` de la feature 21 en `feature_list.json` (fuente de
> verdad, incluidas sus `respuestas_del_humano`) y de sus 13 criterios de
> `acceptance`. EARS estricto según `docs/specs.md`. Tercera rodaja de la E7 y
> **la primera vez que el extracto escribe**.
>
> **Tamaño: 17 requirements**, dos por encima del tope blando de ~15. No se parte
> la feature porque las dos mitades (cambiar la categoría / crear la regla) cuelgan
> del mismo editor de la misma línea, y partirlas dejaría media pantalla a medias;
> R16 y R17 son las dos únicas de la segunda mitad y reutilizan entera la F17.
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
>
> - `../../../gastos-backend/docs/api-contract.md` → `### PATCH /api/movements/:id`:
>   actualiza **exclusivamente** `categoryId` y/o `status`, al menos una de las dos;
>   `categoryId` entero ≥ 1 o `null` (quita la categoría); el `kind` de la categoría
>   **debe coincidir con el `type`** del movimiento; un `neutral` no se categoriza.
>   **Body vacío o con cualquier otra propiedad → 400 `VALIDATION_ERROR`**, nunca se
>   descarta en silencio. 400 también si el `kind` no casa o es neutral con categoría;
>   **404 `NOT_FOUND`** si el movimiento o la categoría no existen. **Respuesta 200 =
>   el movimiento serializado completo**, con `account` y `category` embebidos, la
>   misma forma que cada elemento de `GET /api/movements`. Dice explícitamente que
>   «el saldo de la cuenta y los `totals` de `GET /api/movements` **no cambian** por
>   categorizar ni por confirmar».
> - `../../../gastos-backend/docs/api-contract.md` → `### POST /api/category-rules`:
>   body `{ categoryId, matchText }` y nada más; `matchText` ≥ 3 caracteres tras
>   normalizar y único; 400 / 404 / 409. «Las reglas no categorizan nada por sí solas
>   al crearse»: lo hace la pasada (`POST /api/category-rules/apply`).
> - `../../../gastos-backend/docs/api-contract.md` → `### GET /api/movements`:
>   `totals` y `pagination.total` se calculan **sobre todas las coincidencias del
>   filtro**; `uncategorized` + `categoryId` juntos es 400.
> - Código real de la F16: `src/features/review/actions.ts`
>   (`eligibleForCategory`, `undoPlan`, `actionSummary`, `actionErrorMessage`,
>   `needsReload`, `UNDO_PARTIAL`), `src/features/review/service.ts`
>   (`updateMovement`, `changesBody` campo a campo, `parseUpdatedMovement`),
>   `src/features/review/store.ts` (`runAction` de carril único, `refreshQuietly`,
>   `applyUpdated`, `lastAction`), `components/MovementCategorySelect.vue`
>   (filtrado por `kind`, opción `No category`, `neutral` deshabilitado con su
>   texto), `components/ActionNotice.vue` (`Undo` sin cuenta atrás),
>   `components/MovementRow.vue`.
> - Código real de la F17/F18: `src/features/category-rules/components/RuleDialog.vue`
>   (props `mode`, `description`, `initialText`, `initialCategoryId`, `kind`,
>   `categories`, `busy`, `message`, `preview`), `components/RuleMatchPreview.vue`,
>   `store.ts` (`create`, `previewMatches`, `clearPreview`, `saveMessage`,
>   `lastCreated`, `dismissCreated`), `rules.ts` (`proposeMatchText`), y
>   `views/ReviewView.vue` §Rules, donde se ve que **crear la regla no escribe nada
>   en el movimiento de origen**.
> - Código real de la F19/F20: `src/features/statement/store.ts` (`show`, `shift`,
>   `applyFilters`, `loadMore`, `extra`, `days`, `shown`, guarda `loadRun`),
>   `filters.ts` (`StatementFilters`, `monthQuery`, `hasActiveFilters`,
>   `fromRouteQuery`), `months.ts` (`STATEMENT_PAGE_SIZE = 200`, `showingLine`),
>   `components/{StatementRow,StatementList,MonthTotals,StatementFilterBar}.vue`
>   (incluida la **nota permanente no cerrable** de `MonthTotals.vue`),
>   `views/StatementView.vue` (la URL como única escritora del mes y los filtros).
> - `src/shared/movements.ts` (la mitad de lectura, ya compartida en la F18:
>   `Movement`, `parseMovement`, `MOVEMENTS_PATH`, `getMovements`) y
>   `src/shared/categories.ts`.
> - `docs/architecture.md` §«El extracto no depende de ninguna otra feature
>   (feature #19)» — la nota que esta feature **deja obsoleta** y hay que actualizar.
> - Datos reales del humano: 1.607 movimientos, 33 meses, **1.373 sin categoría**,
>   5 cuentas, 16 categorías, mes más cargado ≈93 movimientos (siempre por debajo de
>   `STATEMENT_PAGE_SIZE = 200`, así que en la práctica el mes entra en una página).
>
> **Fuera de alcance** (lo dice el `intent`): tocar el backend; editar importe,
> fecha o descripción; borrar movimientos; **cambiar el estado desde el extracto**;
> **acciones en bloque**; mover las sumas de sitio o quitar la nota que explica que
> están infladas; y convertir el extracto en otra cola de revisión.

## Cobertura del intent

| Punto de `como_se_que_esta_bien` / `acceptance` | Requirements |
|---|---|
| «Cambio la categoría de un movimiento del mes y lo veo al instante» | R1, R2, R3, R7 |
| «Funciona igual con uno ya confirmado que con uno pendiente» | R1, R6 |
| «Las sumas del mes se actualizan solas después del cambio» | R9, R10, C3 |
| «Puedo crear una regla desde un movimiento del extracto, viendo antes a cuántos afectaría» | R16, R17 |
| «Puedo deshacer lo último que hice y vuelve a estar como estaba» | R11, R12, R13 |
| «Si el cambio falla, me lo dice claramente y no me deja la pantalla mintiendo» | R14, R15 |
| «Si tengo el filtro "sin categoría" puesto y categorizo una línea, esa línea desaparece al momento» | R8 |
| «No puedo tocar por error el importe, la fecha ni el concepto» | R1, C1 |
| `acceptance` 3 (solo categorías cuyo `kind` case; el neutral no se categoriza) | R4, R5 |
| `acceptance` 9 (ninguna propiedad fuera de `categoryId`; ni estado, ni importe, ni fecha, ni descripción) | R1, C1 |
| `acceptance` 10 (la nota permanente sigue visible y las cifras son las del backend) | R10, C3 |
| `acceptance` 11 (la cola, las reglas y la previsualización siguen igual) | C6 |
| `acceptance` 12 y 13 (inglés, tema oscuro, sin dependencias nuevas, puerta verde) | C5, C7 |

---

## R1
CUANDO el usuario elige una categoría (o `No category`) en el editor de categoría de
una línea del extracto, el sistema DEBE enviar `PATCH /api/movements/:id` con un
cuerpo cuya **única** propiedad sea `categoryId`.

## R2
MIENTRAS una línea del extracto no tiene su editor abierto, el sistema DEBE mostrar
su categoría como una insignia pulsable, sin ningún selector en la línea.

## R3
CUANDO el usuario activa la insignia de categoría de una línea, con el ratón o con el
teclado, el sistema DEBE sustituirla en su sitio por el selector de categoría de ese
movimiento.

## R4
DONDE el movimiento es de tipo `expense` o `income`, el selector DEBE ofrecer
únicamente las categorías cuyo `kind` coincide con su `type`, más la opción
`No category`.

## R5
MIENTRAS el movimiento es de tipo `neutral`, el sistema DEBE mantener su control de
categoría deshabilitado con el texto `Neutral movements can't be categorized`.

## R6
CUANDO la línea corresponde a un movimiento con `status` `confirmed`, el sistema DEBE
ofrecer exactamente el mismo editor y la misma petición que para uno `pending_review`.

## R7
CUANDO el `PATCH` responde `200`, el sistema DEBE sustituir esa línea de la lista por
el movimiento devuelto, sin recargar la página.

## R8
CUANDO el movimiento devuelto ya no cumple el filtro de categoría activo
(`uncategorized` o `categoryId`), el sistema DEBE quitar su línea de la lista en ese
mismo momento, sin esperar a ninguna otra respuesta.

## R9
CUANDO el `PATCH` responde `200`, el sistema DEBE volver a pedir el mes con los mismos
filtros en segundo plano, y adoptar `totals` y `pagination` de esa respuesta, **si y
solo si** hay un filtro de categoría activo (`uncategorized` o `categoryId`).

## R10
El sistema NO DEBE calcular, ajustar ni estimar en el cliente ninguna de las tres
cifras del mes: siempre son las de `totals` de la última respuesta del backend.

## R11
CUANDO una escritura termina bien, el sistema DEBE mostrar sobre la lista una línea
que diga qué hizo, con un botón `Undo` sin cuenta atrás.

## R12
CUANDO el usuario pulsa `Undo`, el sistema DEBE enviar `PATCH /api/movements/:id` con
el `categoryId` que ese movimiento tenía antes de la acción.

## R13
CUANDO el usuario cambia de mes, cambia un filtro o abandona la pantalla, el sistema
DEBE olvidar la última acción y su `Undo`.

## R14
SI el `PATCH` falla ENTONCES el sistema DEBE mostrar una frase en inglés escrita en el
frontend, sin pintar en ningún caso el `message` que devuelve el backend.

## R15
SI el fallo del `PATCH` no es un `400` ni un fallo de red ENTONCES el sistema DEBE
recargar el mes antes de dar por cierto lo que hay en pantalla.

## R16
CUANDO el usuario pulsa `Create rule` en el editor abierto de una línea, el sistema
DEBE abrir el diálogo de reglas de la F17 con el texto propuesto a partir del
concepto, su previsualización de coincidencias (F18) y solo categorías del `kind` del
movimiento.

## R17
CUANDO la regla se crea desde el extracto, el sistema NO DEBE modificar el movimiento
de origen ni ejecutar la pasada de categorización.

---

## Restricciones (C)

- **C1** — El extracto NO DEBE ofrecer cambiar `status`, importe, fecha, descripción
  ni borrar un movimiento, ni ninguna acción en bloque. La única escritura de toda la
  carpeta es la de R1.
- **C2** — Un solo editor abierto a la vez y un solo `PATCH` en vuelo: mientras hay
  una escritura en curso, un segundo clic no inicia otra (carril único de la F16).
- **C3** — La nota permanente de la F19 sobre las sumas infladas sigue visible, sin
  poder cerrarse y **sin cambiar una palabra**.
- **C4** — Las respuestas se validan en frontera (ADR-002) reutilizando el parseo de
  `src/shared/movements.ts`; una deriva del contrato sale como `ValidationError`
  nombrando el campo que falla.
- **C5** — Todo en inglés, tema oscuro con tokens semánticos y contraste verificado;
  **sin dependencias nuevas**.
- **C6** — Las features 15 a 20 siguen funcionando igual: lo que se mueva a `shared/`
  se re-exporta y sus suites pasan **sin tocar ni un test**.
- **C7** — `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
  `./init.sh` terminan en verde.
- **C8** — La comprobación contra el backend real **escribe**, así que solo se ejecuta
  con el visto bueno explícito del humano y sobre uno o dos movimientos.

---

## Procedencia

- **R1** — (humano) «ponerle o cambiarle la categoría a cualquier movimiento del mes»
  y `acceptance` 1 y 9. Que el cuerpo lleve **solo** `categoryId` es literal del
  `intent` («No quiero cambiar el estado desde aquí»).
- **R2** — (delegado) `delego_en_agente` 1, «si el control de categoría está siempre
  visible o aparece al pasar por encima o al pulsar la línea». Decido **escondido
  tras la insignia que ya existe**: el extracto enseña meses enteros para leerlos, y
  un selector fijo en cada una de las ~93 líneas lo convertiría en la segunda cola de
  revisión que el `intent` no quiere. Alternativa descartada: selector siempre visible
  como en la cola. ← REVISAR EN APROBACIÓN (🔴 1).
- **R3** — (delegado) misma delegación que R2: decido **pulsar**, no *hover*, para que
  funcione con teclado y en táctil, y **en su sitio**, no en un panel lateral.
- **R4** — (humano) `acceptance` 3. Misma regla que la F16: se reutiliza el filtrado
  por `kind` para que una elección que el backend devolvería como 400 no se pueda ni
  hacer.
- **R5** — (humano) `acceptance` 3 («un movimiento neutral no se categoriza, igual que
  en la feature 16»). El texto es el que ya existe, palabra por palabra.
- **R6** — (humano) «Funciona igual con uno ya confirmado que con uno pendiente» y
  `acceptance` 2.
- **R7** — (humano) «Cambio la categoría de un movimiento del mes y lo veo al
  instante» y `acceptance` 4.
- **R8** — (humano) «Si tengo el filtro "sin categoría" puesto y categorizo una línea,
  esa línea desaparece al momento», `respuestas_del_humano` 4 y `acceptance` 6.
  **(delegado)** `delego_en_agente` 4, el caso simétrico que el humano no cerró:
  filtrando por una categoría concreta y poniéndole otra, decido **el mismo
  comportamiento** (la línea desaparece), porque la lista significa «lo que cumple el
  filtro» y una excepción para un caso y no para el otro sería inexplicable.
  Alternativa descartada: dejarla visible en gris con una marca «ya no cumple el
  filtro» hasta el siguiente cambio de mes o de filtro. ← REVISAR EN APROBACIÓN (🔴 3).
- **R9** — (añadido) el `intent` pide que «las sumas del mes se actualicen solas» y el
  `acceptance` 4 habla de «un refresco en segundo plano», pero ninguno dice cuándo.
  Propongo **refrescar solo si hay filtro de categoría activo**: el contrato garantiza
  que categorizar **no cambia los `totals`**, así que sin ese filtro no hay nada que
  refrescar y la petición solo haría parpadear la pantalla; con él, el conjunto
  filtrado cambia y las cifras y el recuento sí se mueven. Alternativa descartada:
  refrescar siempre, como hace la F16. ← REVISAR EN APROBACIÓN (🔴 5).
- **R10** — (humano) «No quiero que las sumas dejen de ser las del backend» (heredado
  de la F19 y la F20) y `acceptance` 10.
- **R11** — (delegado) `delego_en_agente` 2, «cuánto dura el deshacer y dónde se
  enseña». Decido **sin cuenta atrás y en una línea fija sobre la lista**, la misma
  decisión que la F16 tomó para la cola. Alternativa descartada: un aviso flotante con
  cuenta atrás de unos segundos. ← REVISAR EN APROBACIÓN (🔴 4).
- **R12** — (humano) «Puedo deshacer lo último que hice y vuelve a estar como estaba»
  y `acceptance` 5. Una sola petición: en el extracto se actúa de uno en uno
  (`respuestas_del_humano` 2), así que no hace falta el `undoPlan` por grupos de la F16.
- **R13** — (delegado) misma delegación que R11: decido que el deshacer viva **hasta la
  siguiente acción, hasta cambiar de mes o de filtro, o hasta salir de la pantalla**.
  Cambiar de mes ya vacía la lista, y un `Undo` que apunta a un movimiento que ya no
  está en pantalla sería una trampa.
- **R14** — (humano) `acceptance` 8. Se reutiliza el criterio de la F16 de no pintar
  nunca el `message` del backend (viene en español y nombra ids).
- **R15** — (humano) `acceptance` 8 («ante un fallo que pudiera haber escrito se
  recarga en vez de afirmar que no pasó nada»). El reparto exacto —400 y fallo de red
  son los dos únicos casos en que seguro no se escribió; el resto recarga— es el de
  `needsReload` de la F16.
- **R16** — (humano) «quiero poder crear una regla desde ese movimiento, como ya hago
  desde la cola de revisión», `respuestas_del_humano` 3 y `acceptance` 7.
  **(delegado)** `delego_en_agente` 3: decido **reutilizar el diálogo de la F17 tal
  cual** y colgar su entrada **del editor ya abierto** de la línea, no de un botón
  permanente por fila (mismo motivo que R2). Alternativa descartada: ofrecerlo en el
  aviso posterior al cambio de categoría. ← REVISAR EN APROBACIÓN (🔴 2).
- **R17** — (delegado) `delego_en_agente` 3 y coherencia con la F17, que ya decidió que
  **crear una regla no categoriza el movimiento de origen**: la regla se aplica aparte,
  con la pasada. Alternativa descartada: que el mismo gesto categorice también el
  movimiento de origen. ← REVISAR EN APROBACIÓN (🔴 2).
- **C1, C3, C5, C6, C7** — (humano) salen de `que_no_quiero` y de los `acceptance` 9
  a 13.
- **C2** — (delegado) el `intent` dice «de uno en uno, lo más sencillo»; el carril
  único y el editor único son la lectura técnica de esa frase.
- **C4** — (humano) heredado de ADR-002 y de los `acceptance` de las F17 a F20.
- **C8** — (añadido) el `intent` no habla de cómo se comprueba contra el backend real.
  Propongo el patrón de la T21 de la F16: **solo con visto bueno explícito**, uno o dos
  movimientos, con foto del antes y el después. ← REVISAR EN APROBACIÓN.
