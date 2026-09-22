# Review — feature 15 `review-queue`

**Veredicto:** APPROVED (condicionado a la comprobación manual C7, no bloqueante:
es de solo lectura y no afecta a ningún test)

Revisado el 2026-09-18 contra `specs/15-review-queue/` (R1-R14 y las restricciones
C1-C7), los 12 criterios de `acceptance` de la feature 15 en `feature_list.json`,
`docs/specs.md`, `docs/verification.md`, `docs/conventions.md`,
`docs/architecture.md`, `CHECKPOINTS.md`, el informe
`progress/implementation/review-queue.md` y el contrato de solo lectura
`../gastos-backend/docs/api-contract.md` (`GET /api/movements` y `GET /api/categories`).
No se ha tocado el backend: solo se ha leído su contrato.

## Trazabilidad requirements ↔ tests (tests leídos, no la tabla del informe)

- R1: [x] `ReviewCountBadge.spec.ts:28` (7 → `7`), `:35` (0 → no existe el nodo),
  `:44` (500 → nada), `:51` (el `aside` entero, sin una palabra de error) y
  `AppShell.spec.ts:104` (la entrada Review apunta a `/review`).
- R2: [x] `store.spec.ts:140` (querystring exacta `status=pending_review&page=1&pageSize=1`),
  `:159` (una carga sin filtros escribe el recuento con UNA sola petición), `:169` (una
  carga filtrada no lo toca), `ReviewCountBadge.spec.ts:67` (1 GET al montar y ninguno
  más tras 10 minutos de timers falsos) e `import/__tests__/store.spec.ts:313` (200, 503
  e informe ilegible → 1 GET de recuento).
- R3: [x] `service.spec.ts:188`, `store.spec.ts:41` (`pageSize=100`) y
  `MovementList.spec.ts:11`, que fija el orden con un fixture deliberadamente
  desordenado por fecha (31-07, 30-07, 02-08): si el cliente reordenara, el test falla.
- R4: [x] `MovementRow.spec.ts:24-68`: gasto → `formatMoney('-45.37')` con `text-ink-strong`,
  ingreso → tono positivo sin signo, neutral → `0,00 €` en tono apagado, fecha generada
  con `formatDate` (nunca tecleada), `Food` y `Uncategorized`.
- R5: [x] `filters.spec.ts:29` (solo los filtros con valor), `store.spec.ts:103` (desde
  `page=3`, cambiar un filtro pide `page=1`), `ReviewView.spec.ts:89`.
- R6: [x] `filters.spec.ts:50`, `:120` y `:174` (ni desde el estado, ni hacia la URL, ni
  desde la URL), la barrera final de `buildMovementsQuery` en `service.spec.ts`,
  `store.spec.ts:127`, `ReviewFilterBar.spec.ts:97` (los dos sentidos del control) y
  `e2e/review-queue.spec.ts:190`, que mira la querystring real del navegador.
- R7: [x] `service.spec.ts:159-182`, `CategorySelect.spec.ts` (4 casos: un `optgroup` por
  raíz con la raíz elegible, deshabilitado con `Categories unavailable` al fallar, y
  deshabilitado mientras el árbol es desconocido), `store.spec.ts:181` (una sola
  petición) y `ReviewView.spec.ts:74` (con las categorías caídas la lista se pinta igual).
- R8: [x] `filters.spec.ts:64-86`, con el caso exacto del contrato (99 letras y 3 espacios
  = 102 → error; exactamente 100 → válido); `ReviewFilterBar.spec.ts:66` (tres pulsaciones
  con timers falsos → UN solo `change`), `:86` (101 caracteres → aviso y ningún emit),
  `:82` (texto de ayuda) y `e2e:169` (buscar `cafeteria` encuentra `CAFETERÍA CENTRAL`
  con una única petición).
- R9: [x] `ReviewTotals.spec.ts:13` y `:27`, este último con una página que NO cuadra con
  los totales: se siguen mostrando los de la API.
- R10: [x] `filters.spec.ts:110-179` (ida y vuelta, `page=abc`, `page=0`, `page=-1`,
  `type=foo`, fecha mal formada, clave repetida) y `ReviewView.spec.ts:89-152`, incluido
  `router.back()`: volver atrás restaura los filtros y vuelve a pedir esa lista.
- R11: [x] `store.spec.ts:57` y `ReviewView.spec.ts:60`: con la petición en vuelo hay
  indicador y los `select` de filtro siguen en el DOM y habilitados.
- R12: [x] `MovementList.spec.ts:29` y `:39`, `ReviewView.spec.ts:156` y `:165`: los dos
  textos según haya filtros, `Clear filters` limpia la URL y recarga, y en ningún caso
  existe una sola fila.
- R13: [x] `store.spec.ts:335` y `ReviewView.spec.ts:279` comprueban método y ruta de cada
  llamada; `e2e/review-queue.spec.ts:114` aborta cualquier `/api` que no sean las dos
  lecturas. Grep confirmado: ni un `PATCH` ni un `POST` en `src/features/review/`.
- R14: [x] `store.spec.ts:204-332`: 404 sin reintento; 400 en `page=3` → exactamente dos
  peticiones y su aviso; 400 en `page=1` sin reintento; no se encadena un segundo
  reintento; red; `ValidationError`; genérico; el mensaje español del backend nunca se
  pinta; `load()` nunca lanza. `ReviewView.spec.ts:185-266`: cada mensaje con su botón y
  los filtros habilitados.

Ningún `R<n>` queda sin un test que falle si se rompe el requisito.

## Tasks completas

T0 [x] T1 [x] T2 [x] T3 [x] T4 [x] T5 [x] T6 [x] T7 [x] T8 [x] T9 [x] T10 [x]
T11 [x] T12 [x] T13 [x]

T13 se marca con la comprobación real (C7) explícitamente documentada como NO hecha en
`progress/implementation/review-queue.md`, sección «Lo no probado»: el backend de `:3000`
estuvo apagado toda la sesión. Justificación documentada y aceptada.

## Criterios de aceptación (los 12 de `feature_list.json`)

1. [x] Entrada Review con el número (`AppShell.spec.ts:104`, `ReviewCountBadge.spec.ts`).
   `/movements` se conserva como placeholder, que es la decisión roja nº 1 del humano;
   verificado en `router.spec.ts:50`.
2. [x] Lista de `status=pending_review` paginada con fecha, descripción, cuenta, importe
   de `money.ts` y categoría (`MovementRow.spec.ts`, `MovementList.spec.ts`).
3. [x] Filtros combinables y `categoryId` + `uncategorized` nunca juntos, con test en las
   tres capas (filtros puros, service y UI) y en el e2e.
4. [x] Selector construido con `GET /api/categories` y sus `children` (`CategorySelect.spec.ts`).
5. [x] `pagination.total` y `totals` sin recalcular (`ReviewTotals.spec.ts:27`).
6. [x] `q` entre 2 y 100, recortada, con su texto de ayuda (`filters.spec.ts:64`,
   `ReviewFilterBar.spec.ts:82`).
7. [x] Estados de cargando, error, lista vacía y sin pendientes (R11, R12, R14).
8. [x] 404 y 400 comprensibles con la pantalla usable (`ReviewView.spec.ts:193` y `:205`;
   los controles nunca se deshabilitan por un error).
9. [x] Solo lectura (R13 y grep).
10. [x] Inglés, oscuro con alias semánticos y contraste verificado (`ReviewView.spec.ts:270`,
    `theme-dark.spec.ts` sin modificar, y el test de colores crudos).
11. [x] Smoke verde sin backend y e2e propio: 8 tests de chromium en verde.
12. [x] La puerta completa en verde, más abajo.

## Arquitectura (docs/architecture.md)

- [x] Organización por feature: tipos, service, filtros puros, store, componentes, vista y
  tests co-localizados dentro de `src/features/review/`.
- [x] Ningún `.vue` llama a `fetch`: grep limpio en todo `src/`.
- [x] El store guarda estado y el service trae y mapea (`parseMovementPage`,
  `parseCategories`); el JSON crudo no sale del service.
- [x] Tipos propios en `review/types.ts`, escritos desde el contrato y sin compartir con
  otras features: enumeraciones cerradas estrictas, texto abierto tolerante.
- [x] Componentes tontos: `ReviewFilterBar` no guarda filtros, solo emite `change`.
- [x] Dependencia de `import` hacia `review` en un solo sentido y documentada en
  `docs/architecture.md:98-103`; `review` no conoce `import`.
- [x] Sin dependencias nuevas: `git diff package.json pnpm-lock.yaml` vacío.

## Convenciones (docs/conventions.md)

- [x] Identificadores, comentarios y textos de UI en inglés; docs y specs en español.
- [x] Orden de imports, `import type`, comillas simples, sin punto y coma; `pnpm lint` limpio.
- [x] Solo alias semánticos en el markup: ni un hex suelto ni paleta de serie de Tailwind.
- [x] Cifras y fechas únicamente por `money.ts`; los textos esperados de los tests se
  generan con `formatMoney` y `formatDate`, nunca se teclean.
- [x] Iconos Lucide importados por nombre; `src/assets/styles/` sin tocar.
- [x] Errores por `ApiError`, `ValidationError` y `toAppError`, con el texto elegido en
  `reviewErrorMessage`; sin `console.log` y sin TODOs sueltos.

## Verificación (docs/verification.md)

- [x] Solo se mockea la frontera HTTP; filtros, parseo y totales se ejercitan con datos
  reales de fixture y los componentes se montan de verdad.
- [x] Los tests comprueban salida concreta (querystrings exactas, textos, número de
  peticiones), no que la función no lance.
- [x] Nivel 2 cubierto con `e2e/review-queue.spec.ts` en chromium y sin backend.
- [x] Nivel 4: el mapa de requirements a tests del informe, verificado aquí uno por uno.

## Contrato del backend (solo lectura)

- [x] `categoryId` y `uncategorized` nunca viajan juntos; gana `uncategorized`.
- [x] `q` recortada antes de viajar; el máximo de 100 se mide sobre lo tecleado tal cual y
  el mínimo de 2 sobre lo recortado, exactamente como el contrato; los comodines viajan
  escapados por `URLSearchParams` y llegan como literales.
- [x] `pageSize=100` dentro del rango 1-200 y `page` entero mayor o igual que 1.
- [x] `pagination.total` y `totals` se pintan tal cual, sin sumar la página.
- [x] 404 (cuenta o categoría inexistente) y 400 (filtro inválido o página fuera de rango)
  con mensaje propio, filtros usables y reintento único en `page=1`.
- [x] Validación en frontera con `createValidators` de `src/shared/validation.ts`.
- [x] Ningún endpoint inventado: solo las dos lecturas del contrato.

## Los dos ajustes del implementer

- [x] Resaltado de fila con `hover:bg-surface-sunken` (`MovementRow.vue:3`) en lugar de
  `--surface-hover`, donde `--positive` medía 3,95 y no llegaba a 4,5. Se aparta de la
  letra de `design.md` seccion 8 para cumplir su seccion 9, que es lo correcto.
- [x] Recuento con fondo tintado `bg-accent/15` y `text-ink-on-dark`
  (`ReviewCountBadge.vue:4`); no hizo falta el plan B del diseño.
- [x] `theme-dark.css` gana tres líneas `contrast:`: positive sobre surface-sunken a 4,5;
  ink-faint sobre surface-sunken a 3 (el punto decorativo); e ink-on-dark sobre accent/15
  encima de surface-inverse a 4,5.
  `src/assets/__tests__/theme-dark.spec.ts` NO se ha modificado: el `git diff` de
  `src/assets/` son 5 líneas, todas del CSS. El test mide esos pares nuevos con la misma
  matemática de siempre y pasa. Ninguna regla se ha debilitado ni relajado.

## Impacto en la feature 13

- [x] `src/features/import/store.ts` solo gana el import del store de review y la llamada
  al refresco del recuento en el `finally` de `start()`.
- [x] Con `void` y un store que nunca lanza, un fallo del recuento no puede alterar el
  resultado del modal.
- [x] Los 26 casos previos de `import/__tests__/store.spec.ts` siguen pasando; solo se
  añaden 3, y `fixtures.ts` se amplía sin editar nada existente.

## Reutilización

- [x] `BaseInput`, `BaseSelect` y `BaseCheckbox` siguen el patrón de `BaseButton` y
  `BaseBadge`: props tipadas, `update:modelValue`, etiqueta atada al control por `id` con
  `useId()`, clases literales y alias semánticos.
- [x] Nada duplicado: se usan `money.ts`, `banks.ts`, `validation.ts`, `errors.ts` y
  `services/http.ts`.
- [x] Cero dependencias nuevas.

## CHECKPOINTS.md

- [x] C1 — Arnés completo; `./init.sh` termina con exit code 0.
- [x] C2 — Estado coherente: solo la 15 en `in_progress`; la 16 sigue `pending` e intacta.
- [x] C3 — Arquitectura y convenciones respetadas, sin dependencias nuevas, sin logs de
  debug ni TODOs sueltos.
- [x] C4 — Verificación real: 691 tests en 51 ficheros, con caminos de error.
- [x] C5 — Sin archivos sospechosos sin trackear; `progress/current.md` describe la sesión
  activa. La entrada de `progress/history.md` la escribe el implementer al cerrar, igual
  que en las features anteriores.
- [x] C6 — `docs/related-projects.md` sigue vigente; el contrato del backend no cambia:
  esta feature consume lo que su feature 47 ya publicó.
- [x] C7 — SDD: los 4 archivos del spec existen; `decisions.md` cabe en una página con 6
  puntos rojos y su alternativa; 14 requirements; EARS estricto; tasks todas marcadas;
  cada requirement con test.
- [x] C8 — Resumen de cierre escrito.

## Puerta, ejecutada por el reviewer

- `pnpm type-check` → verde.
- `pnpm lint` → verde. El script del proyecto lleva `--fix` de serie, cosa anterior a esta
  feature; no dejó nada por formatear.
- `pnpm test:unit` → 51 ficheros, 691 tests, todos en verde.
- `pnpm build` → 1975 módulos, 181,19 kB de JS y 30,93 kB de CSS.
- `pnpm test:e2e --project=chromium` → 8 tests en verde (4 de review-queue), sin backend.
- `./init.sh` → Entorno listo, exit code 0.
- `git diff package.json pnpm-lock.yaml` → vacío.

## C7, la comprobación contra el backend real

No se hizo, porque el backend de `:3000` estaba apagado, y no bloquea la aprobación:

- Es una comprobación de solo lectura (un `GET`): no puede tocar datos.
- Todo lo que verificaría está cubierto contra el contrato: la querystring del recuento se
  comprueba carácter a carácter y el 400 de página fuera de rango tiene su test.
- Lo único que quedaría por confirmar es que el backend real se comporta como su contrato
  dice; si no lo hiciera, sería un fallo del backend, no de esta feature.

Tarea para el humano, de un minuto: `pnpm dev`, abrir `/review` y comparar el número de la
barra lateral con el `pagination.total` de un `curl` a
`/api/movements?status=pending_review&pageSize=1`.

## Ruido ajeno a la F15 (revisado, no alterado)

El alta de las features 15 y 16 en `feature_list.json`, la nota de E6 desbloqueada en
`docs/roadmap.md` y las entradas de `progress/current.md` son del leader. El implementer
no los ha alterado: la 15 sigue en `in_progress`, la 16 en `pending` con su intent intacto,
y en el roadmap solo está el bloque del leader.

## Resumen de cierre

- Escrito en `progress/summaries/review-queue.md` → sí

## Cambios requeridos

Ninguno.

## Notas no bloqueantes

1. `specs/15-review-queue/requirements.md:45` nombra un atributo `data-test` para la
   entrada de la barra lateral que no existe en `AppSidebar.vue`; la conducta que describe
   sí está verificada por el `href` en `AppShell.spec.ts:104`. Es la prosa del spec la que
   se quedó vieja, no el código.
2. `toRouteQuery` escribe en la URL una búsqueda de una sola letra que no viaja a la API
   (`?q=a` sin `q` en la petición). Es coherente y no confunde; si algún día molesta, se
   resuelve con la misma guarda de `searchTerm`.
3. El punto de color de categoría (`bg-chart-*`) no tiene línea `contrast:` sobre
   surface-sunken, solo sobre surface-card. Es un adorno decorativo que repite la categoría
   escrita al lado, así que no cambia nada, pero completaría la tabla.

## C7 — Comprobación contra el backend real (leader, 2026-09-20)

Condición del veredicto «APROBADO CONDICIONADO A C7». Backend del humano en
`:3000`; su `pnpm dev` no estaba arrancado, así que el leader levantó un dev
server propio en el puerto libre 5199 y lo paró al terminar. Chromium con
Playwright, con **toda petición que no fuera `GET` abortada** (contador de
escrituras: 0). Script temporal fuera del repo, ya borrado.

| Qué | La pantalla | La API (`curl`) |
|---|---|---|
| Pendientes (contador de la sidebar y cabecera) | `1607` | `pagination.total` = 1607 |
| Totales del filtro | In 446.014,03 € · Out 439.372,60 € · Net 6.641,43 € | `totals` idénticos |
| Paginación | «Page 1 of 17», 100 filas | 1607 / 100 = 17 páginas |
| `q=cafeteria` (sin tildes) | 3 movimientos, primero `CAFETERIA GRAN VIA` | 3 |
| `q=CAFETERÍA` (con tilde y mayúsculas) | 3 movimientos | 3 |
| `uncategorized=true` | 1379 movimientos | 1379 |

- La búsqueda y el filtro viajan en la URL (`/review?q=CAFETER%C3%8DA`,
  `/review?uncategorized=true`) y **sobreviven a una recarga**: tras `reload()`
  el campo seguía con `CAFETERÍA` y la lista con sus 3 coincidencias.
- **Cero escrituras** y **cero errores de consola** en toda la sesión.
- Capturas en el scratchpad de la sesión (no versionadas).

**Resultado: C7 superada. Veredicto final: APPROVED.**
