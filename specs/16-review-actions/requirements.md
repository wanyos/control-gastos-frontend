# Requirements — Feature 16: review-actions (categorizar y confirmar, uno a uno y en bloque)

> Derivado del bloque `intent` de la feature 16 en `feature_list.json` (fuente de
> verdad) y de sus 11 criterios de `acceptance`. EARS estricto según `docs/specs.md`.
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
> `../gastos-backend/docs/api-contract.md` → `### PATCH /api/movements` (body `ids`
> de 1 a 200 sin repetidos + `categoryId` y/o `status`; todo o nada; respuesta
> `{ updated, movements }` con los movimientos ya cambiados; 400 por esquema, por
> `kind` que no casa con el `type` o por `neutral` con categoría; 404 por id o
> categoría inexistente), `### PATCH /api/movements/:id`, `### GET /api/movements`
> y `### GET /api/categories`; y el **código real** de la F15
> (`src/features/review/{types,service,filters,store}.ts`, `views/ReviewView.vue`,
> `components/*`, `src/shared/{validation,money,errors}.ts`,
> `src/shared/components/Base*.vue`). Donde el código de la F15 no coincidía con lo
> que su spec preveía, manda el código.
>
> **Nota del contrato que condiciona el diseño:** `GET /api/movements` **no**
> devuelve el `kind` de las categorías que un movimiento *podría* recibir (solo el
> de la que ya tiene). Qué categorías admite un movimiento se decide cruzando su
> `type` con el `kind` de `GET /api/categories`.
>
> **Fuera de alcance:** emparejar traspasos, reglas de categorías
> (`/api/category-rules`), editar importe, fecha o descripción, el extracto de la E7
> y cualquier cambio en el backend.

## Cobertura del intent

| Punto de `como_se_que_esta_bien` | Requirements |
|---|---|
| «le pongo categoría a un movimiento y lo confirmo, desaparece de la cola y el contador baja» | R4, R5, R10 |
| «marco varios y pulso confirmar, se confirman todos de una vez» | R1, R2, R6 |
| «marco todos los de la página y los categorizo, se aplica a todos los que la admiten» | R2, R7 |
| «si algo de lo que he marcado no se puede cambiar, me lo dice y no se cambia nada a medias» | R7, R12 |
| «puedo deshacer: volver a dejar un movimiento pendiente o quitarle la categoría» | R4, R13, R14 |
| «no se me queda la pantalla desactualizada» | R10, R11 |
| `que_no_quiero`: sin tocar el backend, acción en bloque explícita y con el número, sin editar el hecho bancario, sin traspasos ni reglas | R8, C1, C3, C4 |
| `acceptance` 1-2 (PATCH individual y en bloque) | R4, R5, R6, R7 |
| `acceptance` 3 (marcar la página nunca supera el tope) | R2, R9 |
| `acceptance` 4 (explícita y dice a cuántos afecta) | R6, R7, R8 |
| `acceptance` 5 (todo o nada, la UI dice que no se cambió nada y por qué, en inglés) | R12 |
| `acceptance` 6 (lista y contador con los movimientos devueltos, sin recargar) | R10 |
| `acceptance` 7 (volver atrás) | R4, R13 |
| `acceptance` 8 (nada fuera de `ids`, `categoryId`, `status`) | R9 |
| `acceptance` 9-11 (inglés/oscuro/contraste, F15 intacta, puerta verde) | C2, C3, C5 |

---

## Selección

## R1
CUANDO el usuario marca la casilla de una fila, el sistema DEBE añadir el `id` de
ese movimiento a la selección, y CUANDO la desmarca DEBE quitarlo, mostrando en todo
momento cuántos movimientos hay seleccionados.

> Verificación: `store.spec.ts` — `toggleSelection(10)` añade y vuelve a quitar;
> `MovementRow.spec.ts` — la casilla lleva `aria-label` con la descripción y emite el
> evento; `ReviewView.spec.ts` — marcar dos filas muestra `2 selected`.

## R2
CUANDO el usuario marca la casilla «seleccionar todo», el sistema DEBE seleccionar
**exactamente los movimientos de la página cargada** (como máximo `PAGE_SIZE` = 100,
por debajo del tope de 200 ids del contrato), y CUANDO la desmarca DEBE vaciar la
selección; MIENTRAS haya algunos pero no todos seleccionados, esa casilla DEBE
mostrarse en estado indeterminado.

> Verificación: `MovementList.spec.ts` — con 3 filas, marcar la cabecera selecciona
> los 3 ids; con 1 de 3, la casilla tiene `indeterminate === true`;
> `store.spec.ts` — `selectPage()` nunca selecciona ids que no estén en `result`.

## R3
CUANDO cambian los filtros, la búsqueda o la página, el sistema DEBE vaciar la
selección y DEBE ocultar el aviso de la última acción.

> Verificación: `store.spec.ts` — con 2 seleccionados, `apply()` y `goToPage()` dejan
> la selección vacía y `lastAction` a `null`; `ReviewView.spec.ts` — tras pasar de
> página no queda ninguna casilla marcada.

## Acciones sobre un movimiento

## R4
CUANDO el usuario elige una categoría en el selector de una fila, el sistema DEBE
enviar `PATCH /api/movements/:id` con un body que contiene **únicamente**
`categoryId` (el id elegido, o `null` al elegir `No category`), y el selector de esa
fila DEBE ofrecer solo las categorías cuyo `kind` coincide con el `type` del
movimiento; MIENTRAS el movimiento sea `neutral`, el selector DEBE estar
deshabilitado con el texto `Neutral movements can't be categorized`.

> Verificación: `service.spec.ts` — `updateMovement(10, { categoryId: 4 })` hace un
> `PATCH` a `/api/movements/10` con `{"categoryId":4}` y `Content-Type:
> application/json`; `MovementCategorySelect.spec.ts` — con un `expense` solo salen
> las categorías `kind: 'expense'` y la opción `No category`; con un `neutral` el
> `<select>` está `disabled` y aparece ese texto.

## R5
CUANDO el usuario pulsa el botón `Confirm` de una fila, el sistema DEBE enviar
`PATCH /api/movements/:id` con un body que contiene **únicamente**
`{ status: 'confirmed' }`.

> Verificación: `store.spec.ts` — `confirmOne(10)` produce una sola llamada `PATCH`
> con ese body exacto; `MovementRow.spec.ts` — el botón existe y emite su evento.

## Acciones en bloque

## R6
MIENTRAS haya al menos un movimiento seleccionado, el sistema DEBE mostrar una barra
de acciones con el número de seleccionados y un botón `Confirm N movements`, y CUANDO
se ejecuta esa acción DEBE enviar **una sola** petición `PATCH /api/movements` con
`{ ids, status: 'confirmed' }`.

> Verificación: `ReviewActionBar.spec.ts` — con 3 seleccionados el botón dice
> `Confirm 3 movements`; sin selección la barra no se pinta. `store.spec.ts` —
> `confirmSelected()` hace **1** `PATCH` a `/api/movements` con los 3 ids y sin
> ninguna otra clave.

## R7
CUANDO el usuario aplica una categoría a la selección, el sistema DEBE enviar
`PATCH /api/movements` con `{ ids, categoryId }` incluyendo **solo** los movimientos
que admiten esa categoría (los de `type` igual al `kind` de la categoría; nunca los
`neutral` ni en el caso `categoryId: null`), DEBE indicar antes de ejecutarla a
cuántos de los seleccionados se aplica (`Applies to N of M selected`), y SI no queda
ninguno aplicable ENTONCES NO DEBE enviar ninguna petición y DEBE dejar la acción
deshabilitada.

> Verificación: `actions.spec.ts` — con 2 `expense`, 1 `income` y 1 `neutral`
> seleccionados y una categoría `expense`, los ids elegibles son los 2 `expense`;
> `ReviewActionBar.spec.ts` — el texto `Applies to 2 of 4 selected`; con 0 elegibles
> el botón está `disabled` y `store.spec.ts` no registra ninguna llamada.

## R8
CUANDO una acción en bloque afecta a 20 movimientos o más, el sistema DEBE pedir
confirmación en un diálogo que nombre la acción y el número exacto de movimientos
antes de enviar nada, y SI el usuario cancela ENTONCES NO DEBE enviar ninguna
petición ni cambiar la selección.

> Verificación: `ReviewView.spec.ts` — con 19 seleccionados no aparece diálogo y sale
> 1 `PATCH`; con 20 aparece `role="dialog"` con el texto
> `Confirm 20 movements?`, y pulsar `Cancel` deja 0 llamadas y los 20 seleccionados.

## R9
El sistema NO DEBE enviar nunca un `ids` con más de 200 elementos, con elementos
repetidos o vacío, y NO DEBE incluir en ningún body ninguna propiedad que no sea
`ids`, `categoryId` o `status`.

> Verificación: `service.spec.ts` — `Object.keys` del body enviado en los dos
> endpoints; un `ids` de 201 elementos hace que la función lance antes de llamar al
> cliente HTTP; ids repetidos se deduplican antes de salir. Grep de cierre: en
> `src/features/review/` no se construye ningún body con otra clave.

## Refresco, estados y errores

## R10
CUANDO una petición de cambio responde 200, el sistema DEBE actualizar la lista con
los movimientos que trae la respuesta —sustituyendo los que siguen en
`pending_review` y quitando de la cola los que ya no lo están—, DEBE restar del
contador de pendientes de la barra lateral los que han salido, y DEBE volver a pedir
la página actual en segundo plano para que `pagination` y `totals` sigan siendo los
de la API; NO DEBE recargar la página del navegador ni recalcular los totales en el
cliente.

> Verificación: `store.spec.ts` — confirmar 2 de 3 filas deja 1 fila en `result`,
> baja `pendingCount` en 2 y dispara 1 `GET` de la misma página; categorizar sin
> confirmar deja las 3 filas con su `category` nueva tomada de la respuesta;
> los `totals` mostrados son siempre los del último `GET`, nunca una suma local.
> `e2e/review-actions.spec.ts` — la fila desaparece sin recargar y el número de la
> barra lateral baja.

## R11
MIENTRAS una petición de cambio está en curso, el sistema DEBE deshabilitar las
acciones afectadas mostrando su estado de carga, y NO DEBE permitir que un segundo
clic lance una segunda petición.

> Verificación: `store.spec.ts` — con la primera promesa sin resolver, una segunda
> llamada a `confirmSelected()` no añade una llamada más; `ReviewActionBar.spec.ts` —
> el botón tiene `aria-busy` y `disabled` mientras dura.

## R12
SI una petición de cambio falla ENTONCES el sistema DEBE mostrar un mensaje en inglés
según el tipo de fallo (400 por categoría incompatible, 404 por movimiento o
categoría inexistente, fallo de red, respuesta ilegible) que deje claro que **no se
cambió nada** —salvo en la respuesta ilegible, donde DEBE decir que recarga la lista
para mostrar la verdad—, DEBE mantener la selección y NO DEBE mostrar nunca el
`message` del backend.

> Verificación: `actions.spec.ts` — los cuatro textos, uno por caso, generados por
> `actionErrorMessage`; `store.spec.ts` — tras un 400, `result` es idéntico al
> anterior, la selección se conserva y no hay `GET` de refresco; tras un 404 y tras
> una `ValidationError` sí hay un `GET` de refresco; el texto mostrado nunca contiene
> el `message` en español del backend.

## Deshacer

## R13
CUANDO una acción termina con éxito, el sistema DEBE mostrar un aviso con lo que hizo
(`3 movements confirmed`) y un control `Undo`, y CUANDO el usuario lo pulsa DEBE
devolver esos mismos ids a su `status` y su `categoryId` anteriores con peticiones
`PATCH /api/movements`, una por cada grupo de movimientos que compartían el mismo
valor anterior.

> Verificación: `actions.spec.ts` — el plan de deshacer de una confirmación de 3 es
> un grupo `{ ids: [...], status: 'pending_review' }`; el de una categorización sobre
> movimientos con categorías previas distintas son dos grupos con su `categoryId`
> anterior. `store.spec.ts` — `undoLast()` envía esos bodies exactos, devuelve las
> filas a la lista y sube el contador de pendientes; después, `lastAction` es `null`.

## R14
SI una petición de deshacer falla ENTONCES el sistema DEBE detenerse en ese punto,
DEBE mostrar un mensaje que avise de que el estado puede haber quedado a medias entre
grupos y DEBE volver a pedir la página actual para mostrar lo que hay de verdad.

> Verificación: `store.spec.ts` — con dos grupos y el segundo fallando, hay 1 `GET`
> de refresco, el mensaje contiene `Reloading the list` y no se envía un tercer
> `PATCH`.

---

## Restricciones de cierre (se verifican con tests existentes, grep o comandos)

- **C1 — Sin tocar el backend ni dependencias.** `git diff package.json` sin entradas
  nuevas; nada fuera de `gastos-frontend/`; ninguna llamada a `/api/category-rules`,
  `/api/transfers` ni a ningún endpoint que no sea `GET /api/movements`,
  `GET /api/categories`, `PATCH /api/movements` y `PATCH /api/movements/:id`.
- **C2 — Inglés, oscuro y contraste.** Todo texto propio en inglés; solo alias
  semánticos, sin colores crudos; las líneas `contrast:` nuevas de `design.md` §8 en
  `theme-dark.css` y `theme-dark.spec.ts` en verde.
- **C3 — La F15 sigue funcionando.** Filtros, búsqueda, paginación, totales, URL,
  estados vacíos, errores de carga y recuento de la barra lateral, sin cambios de
  comportamiento: la suite de la F15 pasa, y los tres tests que hoy afirman que no
  existe selección ni acciones se **sustituyen** por su equivalente de esta feature
  (`design.md` §9), no se borran.
- **C4 — Sin editar el hecho bancario.** La fila no expone ningún control de importe,
  fecha ni descripción (`MovementRow.spec.ts`), y los únicos campos que viajan en un
  body son `categoryId` y `status`.
- **C5 — Puerta.** `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
  `./init.sh` en verde, con el e2e de humo intacto.
- **C6 — Comprobación real (escribe en la base de datos).** Con el backend en `:3000`
  y `pnpm dev`, y **con el visto bueno previo del humano**: confirmar **un** movimiento
  y deshacerlo, y categorizar **dos** y deshacerlos, comprobando con
  `curl` que quedan como estaban. Si el humano no da el visto bueno, la comprobación
  se anota como pendiente en el resumen y no bloquea el cierre.

---

## Procedencia

- **R1 — (delegado).** `delego_en_agente`: «cómo se marcan los movimientos». Decidido:
  una casilla por fila, el patrón más común y el que el diseño de la F15 ya dejó
  hueco para (`MovementRow.vue:7`). Alternativa descartada: selección por rango con
  clic + Shift, más código y sin soporte de teclado gratis.
- **R2 — (humano)** «marco todos los de la página»; + acceptance 3. **(delegado)** el
  estado indeterminado de la casilla de cabecera.
- **R3 — (delegado).** `delego_en_agente`: «qué pasa al cambiar de página o de filtro
  con lo que tenía marcado». Decidido: se vacía. Alternativa descartada: conservarla
  entre páginas, que permitiría pasar de 200 ids y confirmar a ciegas cosas que ya no
  ves. ← REVISAR EN APROBACIÓN (🔴 1).
- **R4 — (humano)** «ponerle categoría a un movimiento» + acceptance 1 y 7.
  **(añadido)** que elegir la categoría **se aplique sola**, sin un botón `Save`
  aparte, y que el selector filtre por `kind`. ← REVISAR EN APROBACIÓN (🔴 2 y 🔴 6).
- **R5 — (humano).** «darlo por revisado» + acceptance 1.
- **R6 — (humano).** «marcar varios y confirmarlos de una vez» + acceptance 2 y 4.
  **(añadido)** que el propio botón lleve el número dentro. ← REVISAR EN APROBACIÓN.
- **R7 — (humano)** «se aplica la categoría a todos los que la admiten» + acceptance
  5. **(delegado)** «cómo explicar los errores cuando el `kind` no encaja o hay
  neutrales»: decidido **no llegar al error**, filtrando en el cliente con el `kind`
  de `GET /api/categories`. Alternativa descartada: mandarlo todo y enseñar el 400
  del backend. ← REVISAR EN APROBACIÓN (🔴 6).
- **R8 — (humano)** `que_no_quiero` «una acción en bloque tiene que ser explícita y
  decirme a cuántos afecta» + acceptance 4. **(añadido)** el umbral concreto de **20**
  a partir del cual además hay diálogo. ← REVISAR EN APROBACIÓN (🔴 3).
- **R9 — (humano).** Acceptance 2, 3 y 8, directamente del contrato.
- **R10 — (humano)** «no se me queda la pantalla desactualizada» + acceptance 6.
  **(delegado)** «cómo refrescar aprovechando que el PATCH devuelve los movimientos»:
  decidido aplicar la respuesta al instante y, además, repedir la página en segundo
  plano para no inventar `pagination` ni `totals`. **(añadido)** que las filas
  confirmadas **desaparezcan** de la cola en vez de quedarse marcadas. ← REVISAR EN
  APROBACIÓN (🔴 4).
- **R11 — (añadido).** El humano no dijo qué se ve mientras se aplica el cambio; se
  reutiliza el patrón de la F13 (botón con estado de carga, un solo envío).
- **R12 — (humano).** Acceptance 5 y `como_se_que_esta_bien` «me lo dice y no se
  cambia nada a medias». **(añadido)** el caso de la respuesta ilegible, donde el
  cambio **sí pudo aplicarse**: se recarga en vez de afirmar que no pasó nada (misma
  lección que el 503 de la F13).
- **R13 — (humano)** «puedo deshacer mi decisión» + acceptance 7. **(delegado)** la
  forma: un aviso con `Undo` que vive hasta la siguiente acción o hasta salir de la
  pantalla, sin temporizador. ← REVISAR EN APROBACIÓN (🔴 5).
- **R14 — (añadido).** El humano no contempló que el propio deshacer falle; se decide
  parar y enseñar la verdad recargando, nunca dejar la pantalla mintiendo.
- **C1, C4 — (humano)** `que_no_quiero`. **C2, C3, C5 — (humano)** acceptance 9-11.
  **C6 — (añadido)**, y es la consecuencia que más le toca al humano: esta feature
  **escribe en datos reales** (ver 📌 de `decisions.md`).
