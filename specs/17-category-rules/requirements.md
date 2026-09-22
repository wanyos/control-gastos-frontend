# Requirements — Feature 17: category-rules (reglas de categorización)

> Derivado del bloque `intent` de la feature 17 en `feature_list.json` (fuente de
> verdad) y de sus 12 criterios de `acceptance`. EARS estricto según `docs/specs.md`.
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
> `../gastos-backend/docs/api-contract.md` → `### POST /api/category-rules`
> (body `matchText` + `categoryId`, `matchText` guardado normalizado —minúsculas,
> sin tildes, sin espacios en los extremos—, al menos 3 caracteres tras normalizar,
> único; 201 con la regla y su categoría embebida; 400 / 404 / 409),
> `### GET /api/category-rules` (todas, ordenadas por `id`),
> `### PATCH /api/category-rules/:id` (solo `matchText` y/o `categoryId`; body vacío
> o con otra clave → 400; no des-categoriza nada), `### DELETE /api/category-rules/:id`
> (204; no modifica ningún movimiento), `### POST /api/category-rules/apply` (sin
> body; solo toca movimientos sin categoría, `pending_review` y no `neutral`;
> respuesta `{ categorized, conflictCount, conflicts[], unmatched, error? }`; idempotente;
> **no devuelve qué movimientos categorizó**), el modelo `Movement` y la tabla de
> errores y del 400 `BAD_REQUEST` por cuerpo vacío declarado como JSON. Código real:
> `src/features/review/` (F15 y F16: `store.ts`, `service.ts`, `actions.ts`,
> `views/ReviewView.vue`, `components/MovementRow.vue`, `MovementList.vue`,
> `ActionNotice.vue`), `src/features/import/service.ts` (`runImport` sin body ni
> `Content-Type`, `parseCategorization`), `src/shared/{validation,errors}.ts`,
> `src/services/http.ts`, `src/shared/components/Base{Dialog,Input,Select,Button}.vue`,
> `src/router/index.ts` y la normalización real del backend
> (`gastos-backend/src/modules/category-rules/category-rules.service.ts:30`,
> `normalizeForMatch`: NFD, quitar marcas, minúsculas, `trim`; los espacios
> interiores **no** se colapsan).
>
> **Fuera de alcance:** crear, editar o borrar categorías; resolver conflictos desde
> la web; crear una regla sin partir de un movimiento; deshacer una aplicación de
> reglas; cualquier cambio en el backend.

## Cobertura del intent

| Punto del `intent` / `acceptance` | Requirements |
|---|---|
| «creo una regla desde un movimiento y, al aplicarlas, los parecidos sin categoría se categorizan» | R1, R2, R3, R5, R10, R11, R12 |
| «veo cuántos se categorizaron, cuántos quedaron sin regla y qué movimientos chocan entre dos reglas» | R12 |
| «si el texto ya existe en otra regla o es demasiado corto, me lo dice y no se crea nada» | R4, R6 |
| «borrar o cambiar una regla no toca lo ya categorizado» | R8, R9 |
| `que_quiero`: ver, cambiar y borrar las reglas; pasarlas sobre lo pendiente sin reimportar | R7, R8, R9, R10 |
| `que_no_quiero`: no pisar confirmados ni categorizados; solo ver los conflictos; no tocar categorías ni backend | R10, R12, C1, C4 |
| `delego_en_agente` 1-4 (dónde vive la lista, texto propuesto, confirmación, aplicar solo o aparte) | R7, R2, R10, R5 |
| `acceptance` 1 (crear desde Review, texto editable, categorías del `kind` del movimiento) | R1, R2, R3, R5 |
| `acceptance` 2 (lista, cambiar y borrar) | R7, R8, R9 |
| `acceptance` 3 (aplicar bajo demanda y ver `categorized`, `unmatched`, `conflicts`) | R10, R11, R12 |
| `acceptance` 4 (cola, totales y contador al día tras aplicar) | R14 |
| `acceptance` 5 (errores en inglés sin el `message`; nada a medias) | R4, R6, R9, R13 |
| `acceptance` 6 (`error` dentro de la respuesta de apply → en inglés y recarga) | R13, R14 |
| `acceptance` 7 (cuerpos campo a campo; apply sin body) | R5, R8, R11 |
| `acceptance` 8-12 (sin categorías ni conflictos, validación en frontera, inglés/oscuro, F15-F16 intactas, puerta) | C1-C5 |

---

## Crear una regla desde un movimiento

## R1
MIENTRAS la cola de Review muestra un movimiento que no es `neutral` y las categorías
están cargadas, el sistema DEBE ofrecer en su fila un botón `Create rule` (con
`aria-label` que nombre la descripción) que abre el diálogo de nueva regla con la
descripción del movimiento a la vista; MIENTRAS el movimiento sea `neutral` o las
categorías no estén disponibles, ese botón DEBE estar deshabilitado.

> Verificación: `MovementRow.spec.ts` — con un `expense` el botón existe, está
> habilitado y emite `create-rule`; con un `neutral`, o con `categories` a `null`,
> está `disabled`. `ReviewView.spec.ts` — pulsarlo abre `role="dialog"` con el título
> `Create a rule` y la descripción del movimiento.

## R2
CUANDO se abre el diálogo de nueva regla, el sistema DEBE proponer en un campo de
texto editable el resultado de `proposeMatchText(description)`: la descripción
normalizada como el backend (sin tildes, en minúsculas, sin espacios en los extremos),
partida en palabras por todo lo que no sea letra o dígito, y de ellas **la primera**
que tenga al menos 3 caracteres, solo letras, y no esté en la lista fija de palabras
de trámite bancario (`BANK_BOILERPLATE`, `design.md` §6); SI esa palabra tiene menos de
`MIN_PROPOSAL_LENGTH` (6) caracteres ENTONCES DEBE alargar la propuesta con las palabras
siguientes del concepto, **tal cual están en él** (nunca más allá del concepto), hasta
llegar a esa longitud, parando antes de cualquier palabra que lleve dígitos; SI ninguna
palabra cumple ENTONCES DEBE proponer la descripción normalizada entera.

> Corregido tras la prueba contra el backend real (T22): «MEGA DEPORTES» proponía `mega`,
> que por la comparación «contiene» del backend casaba también con «ACADEMIA OMEGA SL».
> Ahora propone `mega deportes`; «RECIB /IBERDROLA CLIENTES, S.A» sigue dando
> `iberdrola`. La decisión 🔴 2 (primera palabra con sentido, editable) no cambia.

> Verificación: `rules.spec.ts` — `RECIB /IBERDROLA CLIENTES, S.A` → `iberdrola`;
> `COMPRA TARJ. 5540XXXXXXXX1234 MERCADONA VALENCIA` → `mercadona` (salta `compra`,
> `tarj` y el token con dígitos); `Café Ñandú` → `cafe`; `RECIBO 12/08` → `recibo 12/08`
> (nada cumple: la descripción entera); el campo de `RuleDialog.spec.ts` admite
> escritura y lo escrito es lo que se envía.

## R3
El selector de categoría del diálogo de nueva regla DEBE ofrecer **solo** las
categorías (raíz e hijas) cuyo `kind` coincide con el `type` del movimiento, y DEBE
llegar preseleccionado con la categoría que el movimiento ya tenga, o vacío con el
texto `Choose a category…` si no tiene ninguna.

> Verificación: `RuleDialog.spec.ts` — con `kind: 'expense'` no aparece ninguna
> categoría `income`; con el movimiento en la categoría 4, el `<select>` vale `4`; sin
> categoría, vale `''` y el botón `Create rule` está deshabilitado.

## R4
SI el texto, normalizado como el backend, queda con menos de 3 caracteres ENTONCES el
sistema DEBE mostrar bajo el campo `Use at least 3 letters or digits.`, DEBE
deshabilitar el botón de guardar y NO DEBE enviar ninguna petición.

> Verificación: `rules.spec.ts` — `isMatchTextTooShort(' ab ')` y `(' á ')` son `true`,
> y `('á b')` es `false` (el backend no colapsa los espacios interiores: `a b` mide 3
> y lo acepta; la pantalla no puede ser más estricta que el contrato),
> `('abc')` es `false`; `RuleDialog.spec.ts` — con `ab` aparece el texto y el botón
> está `disabled`; `store.spec.ts` — `create({ matchText: 'ab', … })` no llama al
> cliente HTTP.

## R5
CUANDO el usuario guarda la nueva regla, el sistema DEBE enviar **una sola**
`POST /api/category-rules` con un body que contiene **únicamente** `matchText` y
`categoryId`; y CUANDO responde 201 DEBE cerrar el diálogo y mostrar sobre la cola el
aviso `Rule "<matchText>" → <categoría> created.` con un botón `Apply rules now`, **sin
aplicar nada por sí solo** y sin cambiar la categoría del propio movimiento.

> Verificación: `service.spec.ts` — `Object.keys` del body es `['matchText',
> 'categoryId']` y lleva `Content-Type: application/json`; `store.spec.ts` — un doble
> `create()` en vuelo produce 1 llamada; tras el 201 no hay ninguna llamada a
> `/api/category-rules/apply` ni a `PATCH /api/movements`; `ReviewView.spec.ts` — el
> aviso aparece con el `matchText` que devolvió la API (ya normalizado) y el botón.

## R6
SI guardar una regla (al crearla o al cambiarla) falla ENTONCES el sistema DEBE
mantener el diálogo abierto con lo escrito, DEBE mostrar dentro de él un mensaje en
inglés según el fallo —409 `Nothing was saved: another rule already uses that text.`,
400 `Nothing was saved: the text needs at least 3 letters or digits.`, 404
`Nothing was saved: that category or rule no longer exists.`, fallo de red
`Couldn't reach the server. Nothing was saved.`, respuesta ilegible u otro fallo con
el texto de «recargando las reglas» de `design.md` §6— y NO DEBE mostrar nunca el
`message` del backend.

> Verificación: `rules.spec.ts` — `ruleErrorMessage` da los seis textos, uno por caso;
> `store.spec.ts` — tras un 409 la lista de reglas no cambia y no hay `GET` de
> refresco; tras un 404 y tras una respuesta ilegible sí hay un `GET
> /api/category-rules`; ningún texto mostrado contiene el `message` en español.

## La lista de reglas

## R7
El sistema DEBE tener una pantalla `Rules` en la ruta `/rules`, con su entrada en la
barra lateral justo debajo de `Review`, que liste las reglas de
`GET /api/category-rules` en el orden de la API, mostrando de cada una su texto y el
nombre de su categoría; SI no hay reglas ENTONCES DEBE decir
`No rules yet. Create one from a movement in Review.`; y SI la carga falla ENTONCES
DEBE mostrar un mensaje en inglés con `Try again`.

> Verificación: `router.spec.ts` — la entrada `Rules` va entre `Review` y `Overview`;
> `RulesView.spec.ts` — con 3 reglas pinta 3 filas con `matchText` y categoría en ese
> orden; con `[]`, el estado vacío; con un 500, el mensaje y `Try again`, que repite
> el `GET`.

## R8
CUANDO el usuario cambia una regla desde su fila (`Edit`), el sistema DEBE abrir el
mismo diálogo con su texto y su categoría (solo categorías de su mismo `kind`), DEBE
enviar `PATCH /api/category-rules/:id` con un body que contiene **solo los campos que
han cambiado** (`matchText` y/o `categoryId`), SI no ha cambiado nada ENTONCES NO DEBE
enviar ninguna petición, y CUANDO responde 200 DEBE sustituir esa fila por la regla
devuelta **sin enviar ninguna petición sobre movimientos**.

> Verificación: `service.spec.ts` — cambiar solo la categoría envía `{"categoryId":6}`;
> `store.spec.ts` — guardar sin cambios hace 0 llamadas; tras el 200 la fila trae la
> regla devuelta y el registro de llamadas no contiene ninguna a `/api/movements`.

## R9
CUANDO el usuario pulsa `Delete` en una regla, el sistema DEBE pedir confirmación en un
diálogo que diga `Movements it already categorized keep their category.`, y CUANDO la
confirma DEBE enviar `DELETE /api/category-rules/:id` y quitar la fila de la lista
**sin enviar ninguna petición sobre movimientos**; SI responde 404 ENTONCES DEBE quitar
la fila igualmente y decir `That rule no longer exists.`; y SI el usuario cancela
ENTONCES NO DEBE enviar nada.

> Verificación: `store.spec.ts` — `remove(7)` hace 1 `DELETE` a
> `/api/category-rules/7` y la regla sale de `rules`; con 404 también sale y queda el
> mensaje; `RulesView.spec.ts` — cancelar deja 0 llamadas; en ningún caso hay llamadas
> a `/api/movements`.

## Aplicar las reglas

## R10
CUANDO el usuario pulsa `Apply rules` (en la pantalla `Rules`, o `Apply rules now` en
el aviso de R5), el sistema DEBE abrir **siempre** un diálogo de confirmación que diga
que solo se categorizan movimientos pendientes y sin categoría, que no se toca nada
confirmado ni ya categorizado, y que **no se puede deshacer desde la app**, antes de
enviar nada; y SI el usuario cancela ENTONCES NO DEBE enviar ninguna petición.

> Verificación: `ApplyRulesDialog.spec.ts` — el paso `confirm` contiene
> `Only pending movements without a category` y `can't be undone`; `store.spec.ts` —
> `openApply()` + `closeApply()` hacen 0 llamadas; `RulesView.spec.ts` — con 0 reglas
> el botón `Apply rules` está deshabilitado.

## R11
CUANDO el usuario confirma la aplicación, el sistema DEBE enviar **una sola**
`POST /api/category-rules/apply` **sin body y sin cabecera `Content-Type`**, DEBE
mostrar el diálogo en estado de progreso (`Applying your rules…`) sin permitir
cerrarlo, y NO DEBE permitir que un segundo clic lance una segunda petición.

> Verificación: `service.spec.ts` — el `init` enviado es exactamente
> `{ method: 'POST' }`; `store.spec.ts` — con la primera promesa sin resolver, un
> segundo `confirmApply()` no añade llamadas; `ApplyRulesDialog.spec.ts` — en
> `applying` el diálogo no es `dismissible` y no hay botón de cerrar.

## R12
CUANDO la aplicación responde 200 sin `error`, el sistema DEBE mostrar en el diálogo
cuántos movimientos se categorizaron (`categorized`), cuántos quedaron sin regla
(`unmatched`) y cuántos chocan (`conflictCount`), y DEBE listar **todos** los
conflictos recibidos, cada uno con su fecha, su descripción y cada regla que choca
(`"texto" → categoría`), **sin ningún control** para resolverlos.

> Verificación: `ApplyResult.spec.ts` — con `{ categorized: 12, unmatched: 5,
> conflictCount: 1 }` salen `12 movements categorized`, `5 still without a matching
> rule` y `1 conflict`; con 14 conflictos se pintan las 14 filas; con
> `conflictCount` mayor que la lista, una línea `and N more not listed`; dentro de la
> lista no hay `button`, `select` ni `input`.

## R13
SI la respuesta de la aplicación trae `error`, o la petición falla (HTTP, red o
respuesta ilegible), ENTONCES el sistema DEBE mostrar en el diálogo un mensaje en
inglés que diga que la pasada no terminó y que **algunos movimientos pueden haberse
categorizado ya**, NO DEBE mostrar las cifras de esa respuesta, y NO DEBE mostrar
nunca el `message` del backend.

> Verificación: `rules.spec.ts` — `applyErrorMessage` para `error` en el 200, 500, red
> y `ValidationError`, ninguno con el `message` del cuerpo; `ApplyRulesDialog.spec.ts`
> — en el paso `failed` no aparece `categorized`.

## R14
CUANDO una aplicación de reglas termina, con éxito o con fallo, el sistema DEBE volver
a pedir en segundo plano la página actual de la cola de Review si estaba cargada (con
sus `totals` y su `pagination`), DEBE volver a pedir el contador de pendientes de la
barra lateral, y DEBE vaciar la selección y el `Undo` de la F16; NO DEBE recargar la
página del navegador.

> Verificación: `store.spec.ts` (review) — tras un `applyRun` nuevo hay 1 `GET` de la
> página actual y 1 `GET` del recuento (`pageSize=1`), `selectedIds` vacío y
> `lastAction` a `null`; sin `result` cargado solo el del recuento.
> `e2e/category-rules.spec.ts` — aplicar desde el aviso de Review cambia la categoría
> pintada de la fila sin recargar.

---

## Restricciones de cierre (se verifican con tests existentes, grep o comandos)

- **C1 — Sin tocar el backend, las categorías ni los conflictos.** `git diff
  package.json` sin entradas nuevas; nada fuera de `gastos-frontend/`; ninguna llamada
  a `POST`, `PATCH` o `DELETE` de `/api/categories`; ningún control que resuelva un
  conflicto.
- **C2 — Validación en frontera y cuerpos campo a campo.** Las tres respuestas (regla,
  lista de reglas, resultado de apply) pasan por `createValidators`; un campo que no
  cumple → `ValidationError` con su ruta. Ningún body lleva otra clave que
  `matchText` / `categoryId`, y apply no lleva body.
- **C3 — Inglés, oscuro y contraste.** Todo texto propio en inglés; solo alias
  semánticos; líneas `contrast:` nuevas, si las hay (`design.md` §9), y
  `theme-dark.spec.ts` en verde.
- **C4 — Las F15 y F16 siguen funcionando.** Sus suites pasan; los tests que fijan la
  lista exacta de la barra lateral o de los controles de la fila se **sustituyen** por
  su equivalente (`design.md` §10), no se borran; `e2e/review-*.spec.ts` sin tocar y en
  verde.
- **C5 — Puerta.** `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
  `./init.sh` en verde.
- **C6 — Comprobación real (escribe en la base de datos, y en masa).** Solo con el
  visto bueno explícito del humano, según T22 de `tasks.md`: foto previa de los ids
  pendientes sin categoría, una regla de texto muy concreto, una sola aplicación,
  comparación antes/después y vuelta atrás acordada con él. Sin visto bueno, se anota
  como pendiente y no bloquea el cierre.

---

## Procedencia

- **R1 — (humano)** «cuando categorizo un movimiento, poder decir…» + acceptance 1.
  **(añadido)** que sea un botón por fila y que se deshabilite en los `neutral` (el
  contrato nunca los categoriza, una regla desde ellos no serviría de nada).
- **R2 — (delegado).** `delego_en_agente`: «qué texto se propone por defecto». Decidido:
  la primera palabra significativa, saltando una lista fija y corta de palabras de
  trámite bancario; con «RECIB /IBERDROLA CLIENTES, S.A» sale `iberdrola`.
  Alternativa descartada: proponer el concepto entero, que nunca se pasa de amplio pero
  tal cual solo casa con conceptos idénticos. **(añadido)** la lista
  `BANK_BOILERPLATE`: la escribe el agente sin haber visto extractos reales (a
  propósito, como el backend en su semilla). ← REVISAR EN APROBACIÓN (🔴 2).
- **R3 — (humano)** acceptance 1 «solo categorías cuyo kind case con el type».
  **(añadido)** la preselección de la categoría que el movimiento ya tenga.
- **R4 — (humano)** «si el texto es demasiado corto, me lo dice y no se crea nada».
  **(añadido)** comprobarlo antes de enviar, con la misma normalización del backend; el
  400 sigue cubierto en R6 por si ambas divergen.
- **R5 — (humano)** acceptance 1 y 7. **(delegado)** «si las reglas se aplican solas al
  crear una»: decidido que **no**, y que el aviso ofrezca `Apply rules now` como gesto
  aparte. ← REVISAR EN APROBACIÓN (🔴 3). **(añadido)** que crear la regla **no**
  categorice el propio movimiento. ← REVISAR EN APROBACIÓN (🔴 5).
- **R6 — (humano)** «si el texto ya existe… me lo dice y no se crea nada» + acceptance
  5. **(añadido)** los casos de red y de respuesta ilegible, donde la regla **pudo**
  crearse: se recarga la lista en vez de afirmar que no pasó nada (lección de la F16).
- **R7 — (humano)** «poder ver las reglas que tengo» + acceptance 2. **(delegado)**
  «dónde vive la lista»: pantalla propia en la barra lateral. ← REVISAR EN APROBACIÓN
  (🔴 1).
- **R8 — (humano)** «cambiarlas» y «cambiar una regla no toca lo ya categorizado» +
  acceptance 2 y 7. **(añadido)** limitar el cambio de categoría al mismo `kind`, y no
  enviar nada si no cambió nada.
- **R9 — (humano)** «borrarlas» y «borrar no toca lo ya categorizado». **(añadido)** la
  confirmación previa al borrar y el trato del 404 como «ya no estaba».
- **R10 — (humano)** «pasarlas sobre lo pendiente sin reimportar» + acceptance 3.
  **(delegado)** «si aplicar pide confirmación»: siempre, porque es una escritura en
  masa sin deshacer. ← REVISAR EN APROBACIÓN (🔴 4).
- **R11 — (humano)** acceptance 3 y 7. **(añadido)** sin `Content-Type`: el contrato
  responde 400 a un cuerpo vacío declarado como JSON (mismo remedio que `runImport`).
- **R12 — (humano)** «veo cuántos se categorizaron, cuántos quedaron sin regla y qué
  movimientos chocan» + `que_no_quiero` «solo verlos». **(añadido)** listarlos
  **todos**, no los 10 primeros como el informe de importación. ← REVISAR EN APROBACIÓN
  (🔴 6).
- **R13 — (humano)** acceptance 5 y 6. **(añadido)** no enseñar las cifras de una pasada
  fallida, que pueden ser parciales.
- **R14 — (humano)** acceptance 4. **(añadido)** vaciar la selección y el `Undo` de la
  F16 tras aplicar: deshacer sobre una cola que acaba de cambiar en masa podría pisar lo
  que la pasada escribió.
- **C1, C4 — (humano)** `que_no_quiero` y acceptance 8 y 11. **C2, C3, C5 — (humano)**
  acceptance 7, 9, 10 y 12. **C6 — (añadido)**, y es la consecuencia que más toca al
  humano: aplicar reglas escribe sobre datos reales, en masa y sin deshacer (ver 📌 de
  `decisions.md`).
