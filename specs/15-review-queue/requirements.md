# Requirements — Feature 15: review-queue (la cola de pendientes, con filtros y búsqueda)

> Derivado del bloque `intent` de la feature 15 en `feature_list.json` (fuente de
> verdad) y de sus 12 criterios de `acceptance`. EARS estricto según `docs/specs.md`.
>
> Datos (solo lectura): `../gastos-backend/docs/api-contract.md` →
> `### GET /api/movements` (filtros `accountId`, `from`, `to`, `type`, `status`,
> `categoryId`, `uncategorized`, `q`, `page`, `pageSize` máx. 200; forma de
> `movements[]` con `account` y `category` embebidos; `pagination`, `totals`; reglas
> de `q`) y `### GET /api/categories` (raíces con `children`). `### PATCH
> /api/movements` y `### PATCH /api/movements/:id` se han leído **solo** para saber
> qué hace la F16 y no invadirla.
>
> **Fuera de alcance (feature 16, `review-actions`):** seleccionar movimientos,
> asignar o quitar categoría, confirmar o devolver a pendiente, uno a uno o en
> bloque. Esta feature **no llama a ningún `PATCH`** ni escribe nada. El diseño deja
> el sitio (columna izquierda de la fila y barra de acciones) sin construirlo.
>
> **Fuera de alcance (E7, el extracto):** la vista completa de movimientos
> confirmados. La ruta placeholder `/movements` se queda como está.

## Cobertura del intent

| Punto de `como_se_que_esta_bien` | Requirements |
|---|---|
| «la barra lateral tiene una entrada Review con cuántos movimientos me quedan por revisar» | R1, R2 |
| «veo la lista de pendientes ordenada de lo más reciente a lo más antiguo, paginada, y sé cuántos hay en total» | R3, R4, R9 |
| «cuando filtro por cuenta, fechas, tipo, categoría o “sin categoría”, la lista y los totales se ajustan» | R5, R6, R7, R9 |
| «cuando escribo un trozo del concepto, encuentro los movimientos aunque escriba sin tildes o en minúsculas» | R8 |
| «cuando cambio de página o de filtro, no se me pierde lo que estaba mirando» | R4, R10 |
| «si no hay nada pendiente, la pantalla me lo dice en lugar de mostrarme una tabla vacía» | R12 |
| `que_no_quiero`: sin tocar el backend, sin confirmar ni categorizar, sin editar el hecho bancario, sin colgarse ni mentir si la API falla | R13, R11, R14, C4, C5 |
| `acceptance` 1: entrada Review con el número; `/movements` se sustituye o se reubica | R1, C1 |
| `acceptance` 4: el selector de categorías sale de `GET /api/categories` | R7 |
| `acceptance` 5: `pagination.total` y `totals` sin recalcular | R9 |
| `acceptance` 8: 404 y 400 comprensibles y pantalla usable | R14 |
| `acceptance` 10-12: inglés/oscuro/contraste, e2e, puerta | C2, C3, C6 |

---

## Barra lateral

## R1
El sistema DEBE mostrar en la barra lateral una entrada **Review**
(`data-test="nav-review"`) que navega a la ruta `/review`, y MIENTRAS el último
recuento conocido de pendientes es mayor que 0 DEBE mostrar junto a ella ese número
(`data-test="review-count"`); con 0, o si la última consulta falló, NO DEBE mostrar
el número ni ningún error en la barra lateral.

> Verificación: `AppSidebar.spec.ts` — la entrada existe y apunta a `/review`;
> `ReviewCountBadge.spec.ts` — `total: 7` → `7`; `0` → no existe el nodo; consulta
> que responde 500 → no existe el nodo y el `aside` no contiene texto de error.

## R2
CUANDO se monta el shell, CUANDO termina una importación (con cualquier resultado) o
CUANDO la lista de revisión se carga con el filtro de estado y ningún otro filtro
activo, el sistema DEBE actualizar el recuento de pendientes con el
`pagination.total` de `GET /api/movements?status=pending_review&page=1&pageSize=1`
(o, en el tercer caso, con el `pagination.total` de esa misma carga), sin ninguna
consulta periódica.

> Verificación: `store.spec.ts` — `refreshPendingCount()` hace 1 GET con esa
> querystring exacta y guarda `total`; una carga de lista sin filtros actualiza
> `pendingCount` sin GET extra; una carga con filtros no lo toca. `ReviewCountBadge.spec.ts`
> — 1 GET al montar y ninguno más con timers falsos avanzados 10 min.
> `import/__tests__/store.spec.ts` — tras `start()` con 200, con 503 y con informe
> ilegible hay 1 GET de recuento.

## La lista

## R3
CUANDO se abre `/review`, el sistema DEBE pedir `GET /api/movements` con
`status=pending_review`, `page` y `pageSize` según `design.md` §4 y los filtros que
traiga la URL, y DEBE pintar una fila por movimiento en el orden en que la API los
devuelve (más reciente primero), sin reordenarlos en el cliente.

> Verificación: `service.spec.ts` — la querystring contiene `status=pending_review`
> y `pageSize=100`. `MovementList.spec.ts` — el orden de las filas es el del array
> recibido, con un fixture deliberadamente desordenado por fecha.

## R4
El sistema DEBE mostrar por cada movimiento su descripción, su cuenta
(`bankLabel(account.bank)` + `account.alias`), su fecha contable con `formatDate`, su
importe con `formatMoney` (los `expense` con signo menos) y su categoría, o la marca
`Uncategorized` cuando `category` es `null`.

> Verificación: `MovementRow.spec.ts` — gasto de `45.37` → `-45,37 €`; ingreso →
> `1.200,00 €` con el tono positivo; `neutral` de `0.00` → `0,00 €`; la fecha coincide
> con `formatDate('2026-07-31')` (el texto esperado se genera, nunca se teclea: ICU
> puede cambiar la abreviatura del mes); categoría `Food`
> y, con `category: null`, el texto `Uncategorized`.

## R5
CUANDO el usuario cambia un filtro (cuenta, desde, hasta, tipo, categoría, «sin
categoría» o texto), el sistema DEBE volver a pedir la lista con `page=1` y DEBE
enviar **solo** los parámetros con valor, omitiendo los vacíos.

> Verificación: `filters.spec.ts` — el mapa de filtros a querystring omite los
> vacíos. `store.spec.ts` — estando en `page=3`, cambiar un filtro pide `page=1`.

## R6
El sistema NO DEBE enviar nunca `categoryId` y `uncategorized=true` en la misma
petición: al elegir una categoría DEBE desmarcar «Uncategorized», y al marcar
«Uncategorized» DEBE vaciar la categoría elegida.

> Verificación: `filters.spec.ts` — con los dos puestos a la vez en el estado, la
> querystring solo lleva uno (el último elegido). `ReviewFilters.spec.ts` — elegir
> categoría desmarca el interruptor y viceversa; ninguna petición de los tests de
> `store.spec.ts` contiene los dos parámetros.

## R7
CUANDO se monta la vista, el sistema DEBE pedir `GET /api/categories` una sola vez y
construir el selector con las raíces y sus `children` agrupados bajo cada raíz; SI
esa consulta falla ENTONCES el selector DEBE quedar deshabilitado con el texto
`Categories unavailable` y el resto de la pantalla DEBE seguir funcionando.

> Verificación: `service.spec.ts` — `parseCategories` mapea raíces e hijos y rechaza
> una respuesta que no es array. `CategorySelect.spec.ts` — un `<optgroup>` por raíz
> con sus hijos; con la consulta en error, el `<select>` tiene `disabled` y ese texto.
> `ReviewView.spec.ts` — con categorías en error, la lista se pinta igual.

## R8
CUANDO el usuario escribe en el campo de búsqueda, el sistema DEBE esperar 350 ms sin
pulsaciones antes de pedir la lista, DEBE recortar los espacios de los extremos y
DEBE enviar `q` solo cuando lo recortado mide 2 caracteres o más; SI lo tecleado mide
más de 100 caracteres ENTONCES NO DEBE enviar la petición y DEBE mostrar el aviso
`Search is limited to 100 characters`. El campo DEBE llevar siempre junto a él el
texto `Searches the description, ignoring case and accents` (acceptance 6: el usuario
entiende qué busca).

> Verificación: `filters.spec.ts` — `"  ca  "` → `q=ca`; `"a"` → sin `q`; 101
> caracteres → estado inválido. `ReviewFilters.spec.ts` (timers falsos) — tres
> pulsaciones seguidas → 1 petición; el aviso aparece con 101 caracteres y no hay
> petición. `e2e/review-queue.spec.ts` — escribir `cafeteria` devuelve la fila
> `CAFETERÍA CENTRAL` del mock.

## R9
El sistema DEBE mostrar `pagination.total` como número de coincidencias y los tres
`totals` (`income`, `expense`, `net`) con `formatMoney`, tal y como llegan de la API,
y NO DEBE calcular ninguno de los cuatro sumando la página.

> Verificación: `ReviewTotals.spec.ts` — con una página de 2 movimientos y
> `total: 132`, `totals` `{ income: '1200.00', expense: '845.37', net: '354.63' }`,
> los textos son `132 movements`, `1.200,00 €`, `845,37 €` y `354,63 €`; con una
> página cuyos importes no suman los totales, se siguen mostrando los de la API.

## R10
CUANDO cambian los filtros o la página, el sistema DEBE reflejarlos en la
querystring de la URL (`account`, `from`, `to`, `type`, `category`, `uncategorized`,
`q`, `page`), y CUANDO se abre una URL que ya los trae DEBE restaurarlos en los
controles y pedir esa misma lista.

> Verificación: `filters.spec.ts` — ida y vuelta filtros ↔ query. `ReviewView.spec.ts`
> (router de test) — cambiar cuenta y página escribe la query; montar con
> `?account=1&page=2&q=luz` deja los controles puestos y pide esa querystring; una
> query con valores basura (`page=abc`) cae a los valores por defecto sin romper.

## R11
MIENTRAS la lista se está cargando, el sistema DEBE mostrar un indicador de carga
(`data-test="review-loading"`) y mantener visibles los controles de filtro.

> Verificación: `ReviewView.spec.ts` — con la petición pendiente existe el indicador
> y los `<select>` de filtro siguen en el DOM y habilitados.

## R12
CUANDO la respuesta trae `pagination.total === 0`, el sistema DEBE mostrar
`You're all caught up. Nothing is waiting for review.` si no hay ningún filtro activo
además del estado, o `No movements match these filters.` con un botón `Clear filters`
si lo hay, y en ninguno de los dos casos DEBE pintar la tabla vacía.

> Verificación: `ReviewView.spec.ts` — los dos textos según los filtros; el botón
> `Clear filters` deja la querystring sin filtros y vuelve a pedir la lista; no
> existe ninguna fila (`data-test="movement-row"`) en ninguno de los dos casos.

## R13
El sistema NO DEBE emitir ninguna petición que no sea `GET /api/movements` o
`GET /api/categories`.

> Verificación: `store.spec.ts` y `ReviewView.spec.ts` — todas las llamadas al
> `fetch` mockeado son `GET` a esas dos rutas (método y URL comprobados en cada
> escenario). Grep de cierre: `PATCH` no aparece en `src/features/review/`.

## R14
SI `GET /api/movements` falla ENTONCES el sistema DEBE mostrar un mensaje a partir
del error del store (`ApiError` / `toAppError`) según la tabla de `design.md` §7 —404
con `Clear filters`, 400 con `Clear filters`, red o servidor con `Try again`—
dejando los controles de filtro usables; y SI el fallo es un 400 estando en una
página mayor que 1 ENTONCES DEBE reintentar **una sola vez** con `page=1` y mostrar
`That page no longer exists. Showing the first page.`

> Verificación: `store.spec.ts` — 404 → `error` con su mensaje y sin reintento; 400
> en `page=3` → 1 reintento con `page=1` y aviso; 400 en `page=1` → error sin
> reintento; fallo de red → error con `Try again`; `load()` nunca lanza.
> `ReviewView.spec.ts` — los cuatro mensajes y que los filtros siguen habilitados.

---

## Restricciones de cierre (se verifican con tests existentes, grep o comandos)

- **C1 — Ruta.** `src/router/index.ts` declara `/review` (nombre `review`, label
  `Review`) delante de `/overview`; **`/movements` se queda** como placeholder para la
  E7. `router.spec.ts` actualizado (5 rutas navegables, `/review` resuelve a la vista).
- **C2 — Inglés y oscuro.** Todo texto propio en inglés (test: el `text()` de la vista
  no contiene `Cuenta`, `Categoría`, `Buscar`, `Pendiente`); solo alias semánticos, sin
  colores crudos; líneas `contrast:` nuevas de `design.md` §9 en `theme-dark.css` y
  `theme-dark.spec.ts` en verde.
- **C3 — e2e.** `e2e/app-boot.spec.ts` responde también `**/api/movements*` (la barra
  lateral pide el recuento al montar) y sigue verde sin backend;
  `e2e/review-queue.spec.ts` (chromium) cubre lista + paginación + búsqueda con
  `page.route`.
- **C4 — Sin tocar el backend ni dependencias.** `git diff package.json` sin entradas
  nuevas; nada fuera de `gastos-frontend/`.
- **C5 — Sin alcance de la F16.** No existe en `src/features/review/` ningún
  checkbox de selección, botón de confirmar o de categorizar, ni llamada a `PATCH`.
- **C6 — Puerta.** `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
  `./init.sh` en verde.
- **C7 — Comprobación real (segura).** Con el backend en `:3000` y `pnpm dev`: el
  recuento de la barra lateral coincide con
  `curl "http://localhost:3000/api/movements?status=pending_review&pageSize=1"` →
  `pagination.total`. Solo lecturas: **no modifica ningún dato**.

---

## Procedencia

- **R1 — (humano).** «la barra lateral tiene una entrada Review con cuántos
  movimientos me quedan por revisar» + acceptance 1. **(añadido)** que el número
  desaparezca (en vez de mostrar un error) si la consulta falla, por coherencia con
  el aviso de la F13. ← REVISAR EN APROBACIÓN.
- **R2 — (delegado).** `delego_en_agente`: «de dónde saco el número de pendientes y
  cada cuánto se refresca». Decidido: `pagination.total` de la propia
  `GET /api/movements` con `pageSize=1` (no hay endpoint de recuento), refrescado al
  arrancar, tras importar y al cargar la cola sin filtros. Alternativa descartada:
  `GET /api/overview`, que no separa por estado.
- **R3 — (humano).** «veo la lista de pendientes ordenada de lo más reciente a lo más
  antiguo, paginada» + acceptance 2. El orden lo da la API; no se reordena.
- **R4 — (humano)** «fecha, descripción, cuenta, importe y categoría» + acceptance 2.
  **(delegado)** el formato (`money.ts`, ya fijado en la F9) y el orden de los campos
  dentro de la fila (`design.md` §8), de `delego_en_agente` «cómo presentar la lista».
  **(añadido)** la marca `Uncategorized` para `category: null`. ← REVISAR EN APROBACIÓN.
- **R5 — (humano).** «cuando filtro… la lista y los totales se ajustan» + acceptance 3.
  Volver a la página 1 al cambiar un filtro es **(añadido)**: sin ello, un filtro más
  estrecho puede dejarte en una página que ya no existe (400 del contrato).
- **R6 — (humano).** Acceptance 3: «`categoryId` y `uncategorized=true` nunca se
  mandan juntos». La forma de impedirlo en la interfaz es **(delegado)**.
- **R7 — (humano).** Acceptance 4. **(añadido)** qué pasa si `GET /api/categories`
  falla: el selector se deshabilita y la pantalla sigue viva. ← REVISAR EN APROBACIÓN.
- **R8 — (humano)** «cuando escribo un trozo del concepto, encuentro los movimientos
  aunque escriba sin tildes o en minúsculas» + acceptance 6. **(delegado)** lanzar la
  búsqueda mientras se escribe con 350 ms de espera (`delego_en_agente`: «cuándo se
  lanza la búsqueda mientras escribo»). **(añadido)** no enviar nada con menos de 2
  caracteres útiles y bloquear en local los más de 100: son los dos 400 que el
  contrato documenta. ← REVISAR EN APROBACIÓN.
- **R9 — (humano).** «que me diga cuántos hay en total y cuánto suman» + acceptance 5.
- **R10 — (humano)** «cuando cambio de página o de filtro, no se me pierde lo que
  estaba mirando». **(delegado)** que eso se consiga guardando los filtros en la URL
  (`delego_en_agente`: «si viven en la URL para poder volver a ellos»).
- **R11 — (humano).** Acceptance 7 («estados visibles: cargando…») y `que_no_quiero`
  «no quiero que la pantalla se quede colgada».
- **R12 — (humano).** «si no hay nada pendiente, la pantalla me lo dice» + acceptance 7.
  **(añadido)** distinguir «no queda nada» de «no hay coincidencias con estos filtros»,
  y el botón `Clear filters`. ← REVISAR EN APROBACIÓN.
- **R13 — (humano).** `que_no_quiero` «no quiero todavía confirmar ni cambiar
  categorías desde aquí» + acceptance 9.
- **R14 — (humano)** acceptance 8 y `que_no_quiero` «que no me mienta si la API
  falla». **(añadido)** el reintento automático en `page=1` ante un 400 de página
  fuera de rango, en vez de dejar la pantalla en error. ← REVISAR EN APROBACIÓN.
- **C1 — (humano/delegado).** Acceptance 1 deja la decisión al spec: se **añade**
  `/review` y se conserva `/movements` para la E7. ← REVISAR EN APROBACIÓN.
- **C2, C3, C6 — (humano)** acceptance 10-12. **C4, C5 — (humano)** `que_no_quiero`.
  **C7 — (añadido)**, comprobación de solo lectura.
