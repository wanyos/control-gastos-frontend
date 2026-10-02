# Review — feature 24 `transfer-pairs-review`

**Veredicto:** APPROVED

> **Segunda pasada (2026-10-02): APPROVED.** Los tres cambios pedidos están hechos y verificados; el detalle está al final, en «Segunda pasada». Lo que sigue hasta ahí es el informe de la primera pasada, que fue CHANGES_REQUESTED, y se conserva tal cual (sus números de línea son los de entonces).
>
> Primera pasada (2026-10-02). El código cumple el spec aprobado, la puerta está verde y
> los 15 requirements tienen test real. Lo que frena el cierre son **dos cosas pequeñas
> que conviene arreglar antes del primer commit**, no un defecto de construcción:
> nombres de terceros en ficheros de test que van al repositorio, y una frase que sería
> falsa en un caso alcanzable. Ninguna de las dos es un descuido del implementer: las dos
> salen de lo que el spec pedía al pie de la letra, así que **cada una necesita antes una
> línea del leader en el spec**.

## La puerta, ejecutada por el reviewer

| Comando | Resultado |
|---|---|
| `./init.sh` (nueve pasos) | exit 0, `[OK] Entorno listo` |
| ↳ 4. `tsc --noEmit` | OK |
| ↳ 5. `pnpm lint:oxlint:check` (sin `--fix`) | OK |
| ↳ 6. `pnpm format:check` | OK |
| ↳ 7. Unitarios | 94 ficheros, 1.448 tests, todos verdes |
| ↳ 8. E2E chromium | OK |
| `pnpm build` (incluye `vue-tsc --build`) | exit 0 · CSS 32,09 kB · JS 273,10 kB |
| `git status` tras la puerta | idéntico al de antes: la puerta no tocó ningún archivo |

**El backend real no cambió durante la revisión.** Foto con `GET` antes y después de la
puerta completa: `GET /api/transfers` → 38 parejas, mismo hash del cuerpo
(`7b78664c3c70a996`) las dos veces; `GET /api/transfers/ambiguous` →
`{"ambiguousCount":0,"ambiguous":[]}` las dos veces. No hice ninguna escritura ni
ejecuté la T22.

## Trazabilidad requirements ↔ tests (SDD)

Rutas relativas a `src/features/transfers/__tests__/` salvo que se diga otra cosa.

- R1: [x] `src/router/__tests__/router.spec.ts:26` (siete rutas, `/transfers` tras `/rules`), `:65` (vista y `Link2`), `:91` (orden de la barra); e2e `:290` (la entrada va justo después de `Rules`).
- R2: [x] `service.spec.ts:65`; `store.spec.ts:53`; `TransfersView.spec.ts:48` (una petición por lista, ninguna escritura); `TransferPairRow.spec.ts:70` (orden intacto).
- R3: [x] `TransferPairRow.spec.ts:15` y `:33` (`lang="es"`); `service.spec.ts:94` (pierna mal ordenada, 1 o 3 piernas → `ValidationError`).
- R4: [x] `pairs.spec.ts:52-71` (multas, buenas, mayúsculas, cualquiera de las dos piernas, «BIZ» sin «UM»); `TransferPairRow.spec.ts:41`, `:50`, `:70`; e2e `:305-310`.
- R5: [x] `pairs.spec.ts:97-118` (0, 1 y 2 piernas marcadas, literal); `UnlinkConfirmDialog.spec.ts:26`, `:44`, `:54` (foco en `Cancel`); `store.spec.ts:112`; `TransfersView.spec.ts:122`; e2e `:340-354`.
- R6: [x] `store.spec.ts:127`; `TransfersView.spec.ts:138`; e2e `:356-364`. (Ver cambio requerido 2: el literal se cumple, pero el literal es el problema.)
- R7: [x] `store.spec.ts:149` (cuerpo `{"movementIds":[33339,24377]}`, sin `Undo` después, segunda llamada no manda nada); e2e `:366-377`.
- R8: [x] `service.spec.ts:105`, `:124`; `AmbiguousGroupCard.spec.ts:33`, `:51`.
- R9: [x] `TransfersView.spec.ts:71`; `pairs.spec.ts:192`; e2e `:322`.
- R10: [x] `AmbiguousGroupCard.spec.ts:58`, `:69`, `:80`, `:95`; `pairs.spec.ts:77`; `store.spec.ts:219`; e2e `:394-401`.
- R11: [x] `AmbiguousGroupCard.spec.ts:85`; `store.spec.ts:273` (cero peticiones); `TransfersView.spec.ts:193-198`; e2e `:430`.
- R12: [x] `store.spec.ts:232`, `:253` (`DELETE` con el `transferId` del 201, codificado); `TransfersView.spec.ts:173`; e2e `:382`.
- R13: [x] `pairs.spec.ts:127-190`; `store.spec.ts:170`, `:185`, `:196`, `:290`, `:307`, `:320`, `:333`; `TransfersView.spec.ts:225`.
- R14: [x] `store.spec.ts:68`, `:90`; `TransfersView.spec.ts:81`, `:108`.
- R15: [x] `service.spec.ts:35`, `:55`; `store.spec.ts:387`; e2e `expectOnlyTransferWrites` en los cuatro casos.

**Procedencia:** [x] `requirements.md:211-261` clasifica R1–R15 y C1–C8.

## Tasks completas (SDD)

- T0–T21: [x] las 22 marcadas en `specs/24-transfer-pairs-review/tasks.md`.
- T22: [ ] sin hacer **a propósito y con justificación** (`tasks.md:111-113` y el informe): escribe en la base real y es del leader con el humano. No la exijo ni la he ejecutado.

## Criterios de aceptación

- [x] Pantalla nueva con entrada en la barra y todas las parejas con sus dos patas → R1–R3.
- [x] Deshacer con `DELETE`, pidiendo confirmación → R5, R6. La parte «vuelven a contar» solo puede probarse en real (T22).
- [x] Grupos dudosos y texto cuando no hay ninguno → R8, R9.
- [x] Elegir dos y enlazar cumpliendo el contrato antes de mandar nada → R10–R12.
- [x] Un emparejamiento a mano se puede deshacer → R12 (`Undo`) y la lista de parejas.
- [x] No se escribe nada fuera de enlazar y desenlazar → R15, C1.
- [x] Errores en inglés sin el mensaje del backend; recarga si pudo escribir → R13 (con la salvedad del fallo de red, juzgada abajo).
- [x] Inglés, tema oscuro, tokens semánticos, contraste, sin dependencias nuevas → todos los pares usados ya están declarados en `src/assets/theme-dark.css` (`:21`, `:24`, `:25`, `:28-30`, `:35`, `:37`, `:59`).
- [x] `./init.sh` verde con lint y formato.

## Las seis cosas con lupa

### 1. Solo se escribe enlazar y desenlazar — bien

- `service.ts:88-99`: `linkMovements` recibe dos números y serializa el literal `{ movementIds: [expenseId, incomeId] }`. `service.ts:102-106`: `DELETE` sin cuerpo, id con `encodeURIComponent`. En `src/features/transfers/` no hay ningún `PATCH`, `PUT`, `updateMovement` ni llamada directa a `fetch`; `excludedFromTotals` solo **se lee** (`pairs.ts:67-68`).
- **El test que lo fija prueba lo que dice** (`store.spec.ts:387-429`). Espía `globalThis.fetch`, que es la frontera real, y apunta cada llamada **antes** de decidir si la contesta (`fixtures.ts:299`), así que una petición imprevista quedaría registrada aunque se rechazara. Recorre todos los gestos (deshacer, su `Undo`, enlazar, su `Undo`, los dos reintentos) y comprueba el conjunto exacto de métodos, las rutas una a una, que la única clave del cuerpo de cada `POST` es `movementIds`, y que los `DELETE` van sin cuerpo. La lista de palabras prohibidas del final (`:425-428`) es redundante con lo anterior, no la única barrera.
- En el navegador lo repite el e2e con `request.postData()` letra por letra (`:364`, `:373-377`, `:409-411`, `:421-425`).

### 2. Nada sale a `:3000` — hoy cierto; en unitarios lo es por disciplina, no por construcción

- **E2E: protegido de verdad.** La red `**/api/**` → `abort()` se monta primero (`e2e/transfer-pairs-review.spec.ts:175`), todas las ramas del manejador de traspasos terminan en `fulfill` o `abort` (`:184-265`) y en todo `e2e/` no hay un solo `route.continue()` ni `route.fallback()`. Una llamada imprevista se aborta, Chromium la escribe como error de consola y `expect(watch.consoleErrors).toEqual([])` (`:285`) pone el test en rojo.
- **Pero la aserción del puerto no prueba nada** (`:281`, `expect(call.url.port).not.toBe("3000")`). El navegador siempre habla con el dev server (`:5173`); el salto a `:3000` lo da el proxy de Vite, fuera de la vista de Playwright. Esa línea no puede fallar nunca. `docs/stack.md:532-534` la presenta como garantía («ninguna petición va dirigida al puerto `3000`») y no lo es. Ver cambio 3.
- **Unitarios: ojo.** El entorno jsdom de Vitest usa por defecto la URL `http://localhost:3000` (no hay `environmentOptions` en `vitest.config.ts`) y `.env.test` pone `VITE_API_URL=/`, así que el cliente HTTP de los tests resuelve **exactamente al origen del backend real**. No hay ningún `setupFiles` que corte `fetch` por defecto. Lo único que separa un test de esta feature de un `DELETE` real es que llame a `mockApi` antes. **Hoy todos lo hacen** (comprobado test a test en `store.spec.ts`, `TransfersView.spec.ts` y `service.spec.ts`; los otros cuatro specs no disparan ninguna petición), `mockApi` rechaza cualquier llamada que no sea una de las cuatro (`fixtures.ts:308`), y la foto del backend antes y después de la suite es idéntica. Pero un test futuro que olvide el mock escribiría de verdad. Es heredado (las escrituras de F16, F21 y F22 tienen la misma exposición), por eso no lo exijo aquí; ver «Para el leader».

### 3. Validaciones previas al enlazar — bien

- Un gasto y un ingreso: lo garantiza la forma. `linkProblem` busca cada id **en su columna** (`pairs.ts:58-59`), así que dos del mismo tipo o un id ajeno dan `incomplete` (`pairs.spec.ts:82-84`).
- Cuentas distintas: `pairs.ts:61`, con la frase de R11.
- Mismo importe: es del grupo por contrato; no hay nada que comparar.
- Dos barreras: botón apagado (`AmbiguousGroupCard.vue:60`) y `store.link()` vuelve a pasar `linkProblem` (`store.ts:164`). El test de la vista hace clic con la elección inválida y comprueba cero escrituras (`TransfersView.spec.ts:197-198`).
- Grupos de 3 y de 4 probados en service, tarjeta, store, vista y e2e; el de una sola columna no pinta botón (`AmbiguousGroupCard.spec.ts:127`).
- El 400 no puede salir de una elección hecha en pantalla. El 409 sí puede llegar con la pantalla vieja (otra pestaña enlazó antes), y está bien tratado: frase propia y recarga (`store.spec.ts:290`). `decisions.md` ya decía «la mayoría de 409».

### 4. La etiqueta `Bizum` — bien

- Criterio exacto del apartado 6 del design: `/bizum/i` sobre los dos conceptos (`pairs.ts:33-41`), sin ruta, fechas, importe ni nombres. La expresión no lleva la bandera `g`, así que no guarda estado entre llamadas.
- Dice un hecho: etiqueta `Bizum` y la frase de R4, sin «suspicious» ni nada parecido (`TransferPairRow.vue:51-58`).
- No reordena ni esconde: `TransferPairList.vue:3-9` es un `v-for` sobre lo recibido, sin `sort` ni `filter`; no hay contador de marcadas. Fijado en `TransferPairRow.spec.ts:70-90`, `TransfersView.spec.ts:63-68` y e2e `:305-307`.

### 5. Las observaciones no aplicadas

- **Aviso tras deshacer con una pata marcada → arreglar ahora** (cambio 2). El diálogo dice la verdad (`pairs.ts:66-79`) y, un clic después, el aviso la contradice: «Its two movements count in your totals again». El caso no existe hoy, pero se llega a él con dos gestos del propio humano (marcar una pata desde el extracto, F22, y deshacer la pareja aquí; el contrato dice que las dos cosas son independientes). El propio spec ya razonó que «un diálogo que prometa lo contrario mentiría» (`requirements.md:229-231`); el aviso es la misma promesa. El arreglo son diez líneas y el dato ya está en la mano (`store.ts:136-145` tiene el `pair`). Dejarlo anotado es apostar a que alguien lo recuerde el día que ocurra, en la única pantalla cuyo trabajo es no falsear las sumas. El implementer hizo bien en no tocarlo: R6 fija el literal. Es un defecto del spec y lo destraba el leader.
- **Fallo de red = «no cambió nada», sin recargar → aceptable aquí, queda anotado.** Razones: (a) es lo que el humano aprobó (`requirements.md:253-255` y la técnica 3 de `decisions.md`); (b) se corrige solo en el siguiente gesto: repetir el `Unlink` da 404 y repetir el enlace da 409, y los dos recargan con frase propia; (c) en la topología real, backend caído es un 502 del proxy, que **sí** recarga; un fallo de red de verdad es el dev server caído, y ahí la recarga también fallaría; (d) cambiar `needsReload` toca F16, F21 y F22. Lo que sí es cierto es que la frase «Nothing changed» afirma algo que el cliente no sabe. Tarea de higiene transversal, no de esta feature.
- **Nombres de terceros** → punto 6.

### 6. Datos personales en las fixtures — sí, anonimizar (cambio 1)

Coincido con el criterio del leader. Hay un nombre y dos apellidos de una tercera persona y el nombre con iniciales de otra, junto a un importe, una fecha y la palabra «multa», en ficheros que van a un repositorio con remoto en GitHub. El test de la etiqueta solo necesita que el concepto contenga «bizum»; ningún test necesita el nombre. Hoy cuesta cuatro líneas; después del commit cuesta reescribir historia. Los ids reales (`33339`, `24377` y los demás) no identifican a nadie y los fijan R7 y T17: se quedan.

## Que nadie llame duplicados a las tres parejas del 2026-07-24

- [x] Ni en `src/`, ni en `e2e/`, ni en `docs/`, ni en el informe aparece esa afirmación. Las únicas menciones son las que la **niegan**: `requirements.md:61-65`, `decisions.md:49`, `progress/current.md:110`. Las fixtures no usan esas tres parejas.

## Arquitectura (docs/architecture.md)

- [x] Organización por feature: todo en `src/features/transfers/`; a `shared/` solo bajan las dos rutas.
- [x] La UI no habla con la API: ningún `fetch` en los `.vue`.
- [x] El store guarda estado y el service trae y mapea; los tipos son propios (`types.ts`).
- [x] Sin estado mutable de módulo: los contadores `pairsRun` / `groupsRun` viven dentro del store (`store.ts:49-50`).
- [x] `transfers` no importa de ninguna feature y solo el router importa de ella; el re-export de `statement/service.ts:54-56` conserva el nombre y sus tests no se tocaron.
- [x] `docs/architecture.md` actualizado.

## Convenciones (docs/conventions.md)

- [x] Estilo, nombres, orden de imports, `import type`; lint y formato verdes sin `--fix`.
- [x] Identificadores, comentarios y textos de pantalla en inglés; conceptos del banco con `lang="es"`.
- [x] Manejo de errores: `toAppError`, `ApiError`, `ValidationError`; nada tragado, ningún log de consola.
- [x] Tokens semánticos, importes en `font-mono tabular-nums`, sin colores crudos.

## Verificación (docs/verification.md)

- [x] Solo se imita la frontera HTTP; las fixtures crudas pasan por el service real.
- [x] Los tests comprueban resultados concretos (cuerpos letra por letra, textos literales, recuentos de peticiones).
- [ ] Una aserción del e2e no prueba lo que dice (`:281`) → cambio 3.

## CHECKPOINTS.md

- [x] C1 — Arnés completo
- [ ] C2 — Estado coherente: una sola feature `in_progress`, sí; pero `progress/current.md:6-93` sigue encabezado por la sesión de la F23, ya cerrada. Es del leader, al cerrar.
- [x] C3 — Arquitectura
- [x] C4 — Verificación real
- [ ] C5 — Sesión cerrada bien: falta la entrada de `history.md`; toca al cierre, no ahora.
- [x] C6 — Coherencia con proyectos hermanos (no se tocó el contrato ni el backend; nada inventado)
- [x] C7 — SDD (4 archivos, 15 requirements, 5 puntos rojos, EARS, todos los requirements con test; T22 justificada)
- [x] C8 — Resumen de cierre escrito en la segunda pasada

## Resumen de cierre (si APPROVED)

- Escrito en `progress/summaries/transfer-pairs-review.md` → sí (segunda pasada)

## Cambios requeridos (primera pasada; los tres resueltos, ver «Segunda pasada»)

1. **Anonimizar los nombres de terceros en las fixtures.** Sustituir el nombre por uno inventado conservando la forma del concepto (por ejemplo `BIZUM DE PERSONA INVENTADA CONCEPTO multa`):
   - `src/features/transfers/__tests__/fixtures.ts:85` y `:101`, y el comentario de `:7-8`, que hoy dice que los conceptos son los reales.
   - `src/features/transfers/__tests__/TransferPairRow.spec.ts:37`.
   - `e2e/transfer-pairs-review.spec.ts:79` y `:313`.
   - **Antes, el leader** ajusta dos líneas del spec para que las fixtures no lo contradigan: `specs/24-transfer-pairs-review/design.md:41` («ids, conceptos y fechas tal cual») y `tasks.md:36-37` («fixtures con sus conceptos literales») → ids y fechas reales, concepto con el nombre sustituido.
2. **El aviso tras deshacer no puede prometer lo que el diálogo acaba de negar.** `src/features/transfers/store.ts:142` usa siempre `UNLINKED_NOTICE` (`pairs.ts:17`). Debe salir de las marcas de la pareja, como `unlinkConsequence`: sin marcas, el literal actual; con una, cuál vuelve a contar y cuál sigue fuera; con las dos, que ninguna cuenta. Con tests para los tres casos en `pairs.spec.ts` y uno en `store.spec.ts` con una pata marcada. **Antes, el leader** enmienda R6 (`requirements.md:126-130`) y la fila de `design.md:129`, y se lo dice al humano en una línea del changelog: es texto que él aprobó.
3. **Quitar la garantía que no lo es.** `e2e/transfer-pairs-review.spec.ts:280-281`: eliminar la aserción del puerto o sustituirla por una que pueda fallar (por ejemplo, que la red de seguridad apunte lo que aborta y esa lista esté vacía). Y corregir `docs/stack.md:532-534` para que diga lo que protege de verdad: la red que aborta y que ninguna ruta deja pasar la petición.

## Para el leader (no bloquea, pero no lo pierdas)

- **Unitarios sin red de seguridad global.** Con el origen por defecto de jsdom en Vitest (`http://localhost:3000`) y `VITE_API_URL=/`, un test que olvide el mock habla con el backend real. Higiene propuesta: fijar en `vitest.config.ts` una URL de jsdom con un puerto donde no escuche nada, o un `setupFiles` que haga fallar todo `fetch` no espiado. Una línea, y convierte «nadie se ha olvidado» en «no se puede».
- **Fallo de red y «Nothing changed»**: higiene transversal sobre `needsReload` (`src/shared/movements.ts:349`) y las frases de F16, F21, F22 y F24.
- **Nombres ya commiteados fuera de esta feature**: `progress/exploration/ruido-traspasos-datos.md` (líneas 101, 139, 140, 203, 205, 272, 313, 315) y `progress/history.md:898` llevan nombres completos de terceros con importes. Están en commits **locales**: `main` va 21 commits por delante de `origin/main` y ese fichero no está en el remoto. Hay margen para limpiarlo antes de hacer `push`; decide el humano.
- **El nombre del titular** aparece en `fixtures.ts:110`, `:123`, `:132` y en `e2e/transfer-pairs-review.spec.ts:64`. Es suyo y ya estaba en otros ficheros del repo (`feature_list.json`, tests de reglas); queda a su criterio.
- **`progress/current.md`** arranca con el bloque de la F23, ya cerrada.
- Las desviaciones 1 a 5 del informe (el texto `Link undone.`, los de una pata marcada, los de carga, el título sin número mientras carga y el cuarto caso del e2e) son correctas y no piden cambios.

## Segunda pasada (2026-10-02) — APPROVED

### La puerta, otra vez ejecutada por el reviewer

| Comando | Resultado |
|---|---|
| `./init.sh` (nueve pasos) | exit 0, `[OK] Entorno listo`; lint sin `--fix` y formato en verde |
| Unitarios | 94 ficheros, **1.452 tests** (4 más que en la primera pasada) |
| E2E chromium | OK |
| `pnpm build` | exit 0 |
| Backend real | `GET /api/transfers` → 38 parejas, mismo hash (`7b78664c3c70a996`) antes y después; 0 dudosos. Ninguna escritura |

### Los tres cambios

1. **Nombres de terceros: resuelto en la feature.** Los conceptos de las dos multas son ahora `BIZUM DE <persona> CONCEPTO multa` en `src/features/transfers/__tests__/fixtures.ts:86` y `:102`, `TransferPairRow.spec.ts:37` y `e2e/transfer-pairs-review.spec.ts:79` y `:322`; el comentario de `fixtures.ts:7` ya no dice que los conceptos sean los reales. El spec lo recoge (`design.md:41`, `tasks.md:36-37`). El test de la etiqueta sigue pasando, que es la prueba de que el nombre nunca hizo falta.
2. **El aviso tras deshacer: resuelto.** `unlinkedNotice(pair)` en `src/features/transfers/pairs.ts:68` lee las mismas marcas que el diálogo; `store.ts:142` la llama con la pareja deshecha y la constante fija ya no existe en ningún sitio. R6 enmendado con las tres frases (`requirements.md:126-137`) y `design.md:129`.
   - **Los tests prueban lo que dicen.** `pairs.spec.ts:120-140` fija las tres frases letra por letra, y el caso de una sola pata marcada se prueba en los dos sentidos. `store.spec.ts:152-178` es el que importa: carga una pareja marcada **por la respuesta de la API** (pasa por el service real), la deshace con un 204 y lee `store.notice.summary`, con una y con las dos patas marcadas. Si el store volviera a una frase fija, ese test se pondría rojo. El caso sin marcas sigue en `store.spec.ts:130`.
   - La frase de una pata no dice cuál; el diálogo de justo antes sí. Suficiente y nunca falso.
3. **La aserción del puerto: resuelto.** Ya no existe. Las tres salidas que abortan pasan por una sola función (`e2e/transfer-pairs-review.spec.ts:172-176`: la red de seguridad de `:183`, una escritura sobre movimientos en `:189` y cualquier otra cosa sobre traspasos en `:272`), que apunta método y ruta, y los cuatro casos exigen que esa lista acabe vacía (`:292`). **Esta sí puede fallar**: cualquier llamada no prevista entra en la lista. `docs/stack.md:528-536` dice ahora lo que protege de verdad y por qué mirar el puerto no probaba nada.

### Las dos cosas que el implementer señaló y no tocó

- **El nombre del titular** en los conceptos de ingreso de las tres parejas buenas: de acuerdo en no tocarlo. Es suyo, ya estaba en el repo antes de esta feature y no es dato de un tercero. Si el humano quiere quitarlo, es una decisión suya y transversal.
- **Los nombres de pila de `src/features/category-rules/rules.ts`**: es un diccionario de nombres comunes de la F18, no datos de nadie. Nada que hacer.

### Una corrección al parte del leader

El grep de nombres **no da cero** fuera de la feature. Quedan, en ficheros que no son de esta feature:

- `progress/exploration/ruido-traspasos-datos.md:203` y `:313`: un nombre de pila y un nombre con dos apellidos de terceros, en la descripción de unas transferencias; `:272` repite el nombre de pila.
- `../docs/handoff-paginacion-estable.md:36` (nivel workspace): un nombre de pila en un concepto.

No bloquea el cierre de la F24, porque ninguno está en su código ni en sus tests, pero la limpieza que hizo el leader no está completa. Conviene terminarla antes del `push`.

### Lo que sigue anotado, sin bloquear

- Unitarios sin red de seguridad global (origen por defecto de jsdom igual al del backend real): higiene de una línea en `vitest.config.ts`.
- Fallo de red y la frase «Nothing changed»: higiene transversal sobre `needsReload`.
- `progress/current.md` arranca con el bloque de la F23 (C2) y falta la entrada de `history.md` (C5): las dos son del cierre de sesión del leader.
- T22, la prueba contra el backend real, sigue sin hacer a propósito.
