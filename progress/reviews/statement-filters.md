# Review — feature 20 `statement-filters`

**Veredicto:** APPROVED

- **Revisor:** reviewer — 2026-09-27
- **Spec:** `specs/20-statement-filters/` (4 archivos; 5 🔴 aprobadas por el humano sin
  cambios el 2026-09-27)
- **Informe del implementer:** `progress/implementation/statement-filters.md`
- **Verificado por mí mismo**, no por el informe: la puerta entera ejecutada de nuevo,
  los `git diff` de todos los ficheros tocados y los tests leídos uno a uno.

---

## Puerta ejecutada por el reviewer (2026-09-27)

| Comando | Resultado |
|---|---|
| `pnpm type-check` | OK `vue-tsc --build` sin errores (exit 0) |
| `pnpm lint` | OK `oxlint . --fix` limpio (exit 0, y no dejó ningún fichero modificado) |
| `pnpm test:unit` | OK **78 ficheros, 1.135 tests** pasan (18,04 s) |
| `pnpm build` | OK `dist/assets/index-CAbTQXL4.js` 238,91 kB (76,93 kB gzip), CSS 31,76 kB |
| `pnpm test:e2e --project=chromium` | OK **23 tests** en 7,3 s; los dos nuevos son `e2e/statement.spec.ts:290` y `:333` |
| `./init.sh` | OK «Entorno listo. Puedes empezar a trabajar.» (exit 0) |

Las cifras del informe cuadran con lo medido aquí (1.135 tests, 23 e2e, mismo tamaño de
bundle). Sin dependencias nuevas: `package.json` y `pnpm-lock.yaml` no aparecen en
`git status`. `src/assets/theme-dark.css` tampoco: el tema no se tocó.

---

## Los cinco puntos mirados con lupa

### 1. La 🔴 1 — la barra partida y las features 15 a 18

Comprobado con `git diff`, no leyendo:

- `git status --porcelain` y `git diff --stat` muestran **un solo fichero tocado fuera
  de `statement/`**: `src/features/review/filters.ts` (+19/-38). **Ningún fichero de test
  de `review/`, `category-rules/`, `import/` ni `net-worth/` aparece en el diff**: cero
  tests de las F15-F18 cambiados, ni de contenido ni de formato. La afirmación del
  implementer es exacta.
- El diff de `review/filters.ts` es una mudanza pura: borra `SEARCH_MIN`, `SEARCH_MAX`,
  `SEARCH_TOO_LONG`, `searchTerm` y los dos ayudantes locales (`first`,
  `positiveInteger`), los importa de `@/shared/movement-filters` y **re-exporta los
  cuatro públicos** (`review/filters.ts:23`). Comparado carácter a carácter: el cuerpo de
  `searchTerm` y de los dos ayudantes en `src/shared/movement-filters.ts:21,32,38` es
  idéntico al que había, comentario incluido. `dateOnly` y `fromRouteQuery` solo cambian
  el nombre del ayudante que llaman. Cero cambio de comportamiento, y los 240 tests de
  `review` lo demuestran pasando sin tocarlos.
- C3 en los dos sentidos, verificado con grep: `src/features/statement/` no importa nada
  de `@/features/review`, y ni `review/` ni `shared/` importan nada de `statement/`.
- `StatementCategorySelect.vue` es copia literal de `review/components/CategorySelect.vue`:
  un `diff` de los dos ficheros devuelve **solo** el comentario nuevo que explica por qué
  se copia. Es exactamente lo que autoriza el design, seccion 1.3.

### 2. La 🔴 3 — la combinación imposible y el 404

Las tres barreras existen y están probadas por separado:

1. **La barra**: `StatementFilterBar.vue:128` (elegir categoría apaga «sin categoría») y
   `:135` (marcar la casilla pone `categoryId: null`). Test de los dos sentidos en
   `StatementFilterBar.spec.ts:139`.
2. **`fromRouteQuery`** (`statement/filters.ts:117`): con `uncategorized=true`,
   `categoryId` se lee `null` sea cual sea el orden del texto. Test
   `filters.spec.ts:137`, que además comprueba que la query resultante no lleva
   `categoryId`.
3. **`monthQuery`** (`statement/filters.ts:68`): es un `if/else if`, nunca las dos claves.
   Test `filters.spec.ts:83`.

Y comprobado de punta a punta, que es lo que importa: `StatementView.spec.ts:228` monta
`/movements?month=2026-03&category=1&uncategorized=true` y mide **la petición que sale**:
una sola, con `uncategorized=true` y **sin `categoryId`**, y sin bloque de error en
pantalla. El e2e `statement.spec.ts:333` repite la jugada en el navegador real con la
petición interceptada: la lista de querystrings tiene longitud 1, contiene
`uncategorized=true`, no contiene `categoryId`, `statement-error` tiene `toHaveCount(0)`
y todas las peticiones de la sesión son GET. **El 400 del contrato no puede verse nunca:
la petición prohibida no se emite.**

La URL con una cuenta o categoría **inexistente** sí llega al backend y es un 404
legítimo: `statementErrorMessage` (`statement/months.ts:163`) devuelve
`That account or category no longer exists.` con `action: clear` — y **siempre** `clear`,
también sin filtros activos, porque el id vino de la URL (test explícito en
`months.spec.ts`). `StatementView.spec.ts:325` cierra el círculo: con `account=77` y un
404 se pinta ese mensaje, **no** aparece el botón `statement-retry`, el mensaje español
del backend no se filtra, y al pulsar `Clear filters` la URL queda en `{ month: 2026-03 }`.
Exactamente lo que dice el spec.

### 3. La nota permanente de la F19

- El `git diff` de `MonthTotals.vue` **no toca ni el bloque de la nota ni la constante
  `FIGURES_NOTE`**: lo único que añade es el párrafo `statement-scope`
  (`MonthTotals.vue:42`), colocado **encima** de la nota y fuera de ella, más la prop
  `scope?: string`. Palabra por palabra intacta.
- Sigue sin botón de cerrar y sin tooltip: `MonthTotals.spec.ts:107` compara el texto de
  la nota **con y sin** línea de alcance (con `toBe`, no `toContain`), exige
  `findAll('button')` de longitud **0** en todo el componente y que la nota esté visible.
- Visible con filtros puestos en la pantalla entera: `StatementView.spec.ts` comprueba la
  nota con `account=1&q=luz` puestos, y el e2e `statement.spec.ts:290` la comprueba en el
  navegador después de marcar «sin categoría». El test de la F19 que exige más de 200
  caracteres de nota sigue ahí sin tocar.

### 4. Nada escribe y nada puede salir a `:3000`

- **Grep de cierre:** en `src/features/statement/`, `src/shared/accounts.ts` y
  `src/shared/movement-filters.ts` no hay POST, PATCH ni DELETE. La única coincidencia es
  el campo `method: string` del registro de llamadas de `__tests__/fixtures.ts:254`.
- **Unitarios:** `mockApi` de `fixtures.ts` intercepta `globalThis.fetch` y ahora atiende
  los tres paths de lectura; **cualquier otro path o método hace
  `Promise.reject(new TypeError(...))`**, así que una llamada no prevista pone el test en
  rojo en vez de salir a la red. Revisados los dos ficheros que hacen HTTP:
  `StatementView.spec.ts` monta **siempre** por `mountView`, que llama a `mockApi` antes
  de montar, y **todos** los tests nuevos de `store.spec.ts` abren con `mockApi(...)`.
  Los otros ficheros nuevos no hacen HTTP (`StatementFilterBar.spec.ts` monta el
  componente tonto, `movement-filters.spec.ts` es lógica pura) y `accounts.spec.ts`
  inyecta un `vi.fn()` como cliente. El único otro fichero que importa `StatementView`
  (`src/router/__tests__/router.spec.ts`) solo compara la referencia del componente, no
  lo monta. Importante porque jsdom da origen `localhost:3000`: sin mock, un fetch real
  saldría de verdad. No queda ninguno.
- **E2E:** `prepare()` (`e2e/statement.spec.ts:150`) registra **primero** la red de
  seguridad que aborta `**/api/**` y solo después las cinco rutas esperadas,
  `/api/accounts` y `/api/categories` incluidas (las posteriores ganan). Los dos
  escenarios nuevos terminan comprobando que **todas** las peticiones de la sesión son GET
  y que `consoleErrors` está vacío. Ninguna petición puede llegar al proxy de `:3000`.
- **Backend real:** `../gastos-backend` tiene el working tree **limpio** y su último
  commit es anterior a esta sesión (`91ddfce`). Sobre el `GET
  http://localhost:3000/api/accounts` de la T0: es una lectura, no deja rastro, y no hay
  en todo el frontend ninguna ruta de código capaz de emitir un método distinto de GET
  contra el backend (ni en `src/features/statement/`, ni en `src/shared/accounts.ts`, que
  solo expone `getAccounts`). **No hubo ninguna escritura contra el backend real**, y el
  resultado es coherente con las 5 cuentas reales que usa
  `src/shared/__tests__/accounts.spec.ts`.

### 5. Las cinco desviaciones declaradas

**1. `months.spec.ts` cambió más de lo que preveía C4** (además de mudar el describe de
`monthQuery`, se reescribieron las aserciones de `statementErrorMessage` por el cambio de
firma de la T6) → **aceptable, y no se debilitó nada.** Es consecuencia directa de una
task del propio spec, no un cambio de comportamiento de la F19. Comprobado uno a uno: los
cuatro mensajes anteriores siguen fijados **literalmente** (`toEqual` sobre
`{ message, action }`, no `toContain`), se añaden el 404 y el 400 con filtros, y el test
«never leaks the backend sentence» **se reforzó**: recorre los mismos errores **con y sin
filtros** (8 combinaciones en vez de 3) y añade una prohibición nueva de la palabra
`existe`. El invariante que se iba con la mudanza (que la query «nunca lleva `status`» y
la igualdad exacta de sus claves) **está replicado y ampliado** en `filters.spec.ts:56`,
que ahora exige además que no lleve `type` y lo mide con filtros puestos.
`STATEMENT_PAGE_SIZE = 200` se sigue fijando en `months.spec.ts`.

**2. `StatementView.spec.ts`: la aserción de solo-lectura se ensanchó de un path a tres**
→ **aceptable, y tampoco se debilitó.** La antigua era
`api.calls.every(call => call.path === '/api/movements')`; la nueva es una **igualdad
exacta del conjunto** de paths (`toEqual` sobre el `Set` ordenado), así que un cuarto path
pondría el test en rojo igual que antes, y encima exige que los tres previstos aparezcan.
La línea `expect(api.methods()).toEqual(['GET'])` sigue intacta justo encima. Con la R14
la aserción antigua era imposible de cumplir sin renunciar a pedir las listas.

**3. Ningún test de la F15/F16/F17/F18 cambió** → **confirmado con `git diff`** (punto 1).

**4. `noMatchesLine` quedó en `filters.ts`, no en `months.ts`** → **aceptable.** La tabla
de «Modificados» del design y su sección de firmas se contradecían; se siguió la firma,
que es la declaración explícita, y el sitio elegido es el coherente: vive junto a
`filterScopeLine` y `months.ts` no conoce filtros.

**5. `fixtures.ts`: `queries()` ahora filtra por path `/api/movements`** → **aceptable.**
El helper está documentado como «las querystrings de las peticiones de movimientos» y ese
significado no cambia; sin el filtro, cada aserción tragaría dos cadenas vacías de las dos
listas nuevas. No tapa nada: el control de que no hay llamadas ajenas lo hacen `methods()`
y la igualdad exacta de paths de la desviación 2, y los tests que cuentan peticiones de
cuentas y categorías lo hacen sobre `api.calls` **sin** filtrar
(`StatementView.spec.ts:197`, `store.spec.ts`).

**Ninguna de las cinco hay que revertirla.**

---

## Trazabilidad requirements ↔ tests (SDD)

Comprobado leyendo cada test citado, no el informe.

- R1: [x] `filters.spec.ts:64` (mes y filtros en la misma petición) y `:76` (`q` recortada y tal cual, con tildes y mayúsculas); `store.spec.ts` (misma query medida entera); `StatementView.spec.ts` (los filtros de la URL salen con el mes).
- R2: [x] `StatementFilterBar.spec.ts:40` (los cuatro `data-test`, y exactamente 2 `select` y 2 `input`) y `:51` (no hay `filter-type`, `filter-from`, `filter-to`, `filter-status`, ni `input[type=date]`, ni los textos «All types» / «Pending»).
- R3: [x] `store.spec.ts` (`applyFilters` deja `extra` vacío y `page = 1`, y la query vuelve a `page=1`); `StatementView.spec.ts` (tras `Load more` hay 3 filas y al filtrar quedan 2).
- R4: [x] `store.spec.ts` (los totales son los del backend, que **no** cuadran con las filas del fixture: si alguien sumase en el cliente, el test rompe); `MonthTotals.spec.ts` (las cifras no cambian por poner la línea de alcance).
- R5: [x] `filters.spec.ts:171` (orden exacto de la frase), `:188` (caída a `Account #77` / `Category #3`), `:194` (singular, plural y cero); `MonthTotals.spec.ts:90`; `StatementView.spec.ts` (frase completa con el alias real de la cuenta, el nombre de la categoría resuelto del árbol, y ausencia de la línea sin filtros).
- R6: [x] `MonthTotals.spec.ts:107`; `StatementView.spec.ts`; e2e `statement.spec.ts:290`.
- R7: [x] `movement-filters.spec.ts:19,26,31` (menos de 2 recortada no viaja y no es error, texto tal cual, 101 con espacios avisa, y el límite 100 es inclusivo); `StatementFilterBar.spec.ts:107` (tres teclas y **un** solo `change` tras 350 ms) y `:128` (101 caracteres: avisa y no emite nada).
- R8: [x] `filters.spec.ts:102,106,116,120,127` (mes siempre escrito, mismas claves que la cola, nunca `page`, ida y vuelta); `StatementView.spec.ts` (comprueba que el historial no crece y que `router.back()` no se mueve).
- R9: [x] `filters.spec.ts:83,120`; `StatementFilterBar.spec.ts:139` (los dos sentidos); `store.spec.ts` («uncategorized» viaja sola).
- R10: [x] `filters.spec.ts:137,149,158,165` (URL imposible, basura, `q` de 101, clave repetida); `StatementView.spec.ts:228` y `:325`; e2e `statement.spec.ts:333`.
- R11: [x] `StatementFilterBar.spec.ts:157` (`Clear filters` solo con filtros activos, y deja los cuatro vacíos); `StatementView.spec.ts` (limpiar desde el estado vacío deja la URL en `{ month }`, el mes no se reinicia); e2e.
- R12: [x] `store.spec.ts` (cambio de mes con la querystring de febrero llevando `uncategorized=true`); `StatementView.spec.ts:259` (`push` y URL con los dos).
- R13: [x] `filters.spec.ts:203`; `StatementView.spec.ts:302` (`statement-no-matches` presente y `statement-empty` **ausente**); `store.spec.ts` (total 0 no es un fallo); e2e con `q=zzzz`. La frase de mes vacío de la F19 sigue probada aparte.
- R14: [x] `accounts.spec.ts:58,78,95` (5 cuentas reales, saldos ignorados, un solo GET a `/api/accounts`); `store.spec.ts` (dos invocaciones, **una** llamada de cada lista); `StatementFilterBar.spec.ts:63,81` (todas las cuentas, árbol de categorías, y la cuenta de una URL vieja conservada); `StatementView.spec.ts:197`.
- R15: [x] `store.spec.ts` (fallo de cuentas y fallo de categorías, cada uno apaga **solo** su bandera y `error` sigue `null`); `StatementFilterBar.spec.ts:178` (los dos, con su aviso y el otro select habilitado); `StatementView.spec.ts:359` (con la lista de cuentas caída, el mes sigue pintando sus 5 filas y no hay bloque de error).

Ningún `R<n>` queda sin test. Los tests miden **salida concreta** (querystrings enteras,
frases literales, recuentos, `disabled`, `checked`), no «no lanza excepción».

## Tasks completas (SDD)

- T0 a T16: [x] todas. La T0 dejó rastro verificable en `progress/current.md` (las tres
  comprobaciones previas, con las parejas de color nombradas una a una).
- T17: [ ] **pendiente a propósito** y justificado en el informe (secciones 1 y 4): es la
  comprobación con el humano delante contra el backend real (C7), no es trabajo del
  implementer. **No se exige para aprobar.** El resto de `tasks.md` está `[x]`.

## Criterios de aceptación (los 13 de `feature_list.json`)

- [x] 1 — filtros y `q` junto al `from`/`to` del mes, en la misma petición → `filters.spec.ts:64`, `store.spec.ts`, `StatementView.spec.ts`.
- [x] 2 — las sumas siguen siendo las de `totals`, nunca sumadas en el cliente → `store.spec.ts` (totales que no cuadran con las filas), `MonthTotals.spec.ts`.
- [x] 3 — `uncategorized` y `categoryId` nunca juntos, elegir uno desmarca el otro → las tres barreras del punto 2.
- [x] 4 — límites 2-100 del contrato y espera tras la última tecla → `movement-filters.spec.ts`, `StatementFilterBar.spec.ts:107,128`.
- [x] 5 — filtros y mes en la URL; recargar y atrás conservan lo visto → `filters.spec.ts:127`, `StatementView.spec.ts`, e2e.
- [x] 6 — al cambiar de mes los filtros se conservan → `store.spec.ts`, `StatementView.spec.ts:259`.
- [x] 7 — mes con filtros sin resultados, con mensaje distinto del mes vacío → `StatementView.spec.ts:302`.
- [x] 8 — se pueden quitar todos los filtros de una vez → `StatementFilterBar.spec.ts:157`, `StatementView.spec.ts`.
- [x] 9 — solo lectura, ni un POST/PATCH/DELETE → grep, los métodos registrados en los tests y dos aserciones e2e.
- [x] 10 — no cambia la cola de revisión ni las reglas, y sus tests siguen pasando sin tocarlos → `git diff` sin un solo test suyo y 1.135 verdes.
- [x] 11 — la nota permanente sigue visible y sin poder cerrarse → punto 3.
- [x] 12 — inglés, tema oscuro con tokens semánticos y contraste verificado, sin dependencias nuevas → `theme-dark.css`, `package.json` y el lockfile fuera del diff; `styles.spec.ts` y `theme-dark.spec.ts` en verde.
- [x] 13 — la puerta entera en verde → ejecutada de nuevo por el reviewer, tabla de arriba.

## Arquitectura (docs/architecture.md)

- [x] **Organización por feature.** Lo nuevo vive en `src/features/statement/` (barra, selector, `filters.ts`) y lo que necesitan dos pantallas está en `src/shared/` (`movement-filters.ts`, `accounts.ts`): el mismo movimiento de las F17 y F18. La estructura coincide con el árbol del doc.
- [x] **La UI no habla con la API.** No hay `fetch(` en ningún `.vue`: la barra es tonta y emite `change`, la vista delega en el store y el store en `getAccounts` / `getCategories` / `getMovements`.
- [x] **El store guarda estado, el service trae datos.** `store.ts:129,140` solo orquesta y captura; el HTTP y el mapeo viven en `shared/accounts.ts:44`.
- [x] **Tipos propios y frontera validada (ADR-002).** `parseAccounts` (`accounts.ts:28`) usa `createValidators` como el resto, valida los cinco campos del desplegable e ignora saldos y timestamps; `statement/types.ts` re-exporta desde `shared/`, sin tipos paralelos. Contrastado contra el contrato del backend: los cinco campos existen con ese nombre y ese tipo.
- [x] **Estado mínimo y explícito.** Los dos guardias de una-vez-por-sesión son variables del propio setup store, no globales de módulo.
- [x] **Componentes tontos.** La barra no guarda filtros (solo el temporizador de su campo) y toda la lógica de frases y de querystring es pura en `filters.ts`.
- [x] **Sin dependencias nuevas.**

## Convenciones (docs/conventions.md)

- [x] **Idioma.** Nombres, comentarios y texto de cara al usuario en inglés; los `.md` del harness en español; ficheros nuevos con nombre en inglés.
- [x] **Estilo, nombres, imports.** `pnpm lint` limpio y `--fix` no dejó nada por reformatear; `import type` donde toca; orden vendor, alias, relativos; comillas simples y sin punto y coma; PascalCase en los `.vue`, `useStatementStore`, y las constantes en UPPER_SNAKE.
- [x] **Estilos / UI.** Solo alias semánticos (`text-ink-muted`, `bg-warning-subtle`), ningún color crudo, y el orden de bloques del SFC correcto.
- [x] **Manejo de errores.** Nada de throw de strings; el store guarda `AppError` y la vista lo pinta; el mensaje español del backend nunca se pinta (hay test). Ningún log de debug ni TODO suelto (grep).
- [x] **Tests.** Co-localizados en `__tests__/*.spec.ts`, en inglés, AAA, y se mockea **solo** la frontera HTTP.

## Verificación (docs/verification.md)

- [x] **Tests con los recursos correctos, sin mocks innecesarios.** Se mockea únicamente `fetch`; el router es un `createMemoryHistory` real, Pinia real, los componentes se montan de verdad, y los fixtures son datos reales del usuario (las 5 cuentas con sus IBAN y bancos).
- [x] **Output concreto.** Se comparan querystrings completas, frases literales, recuentos de filas, atributos `disabled` y el estado de la casilla; ningún test se limita a comprobar que no lanza.
- [x] **Camino de error cubierto en cada pieza:** 404, 400 con y sin filtros, `ValidationError`, red caída, lista de cuentas caída, lista de categorías con forma inválida, respuesta tardía descartada y URL basura.
- [x] **E2E de UI** con los dos escenarios de la T15 y la red de seguridad.

## CHECKPOINTS.md

- [x] C1 — Arnés completo: los archivos base y los cinco `docs/` existen; `./init.sh` exit 0.
- [x] C2 — Estado coherente: **una sola** feature en `in_progress` (la 20); las `done` pasan sus tests (1.135 verdes); `progress/current.md` describe esta sesión y nada más.
- [x] C3 — Arquitectura: estructura y capas respetadas, sin dependencias nuevas, sin logs de debug ni TODOs.
- [x] C4 — Verificación real: 4 ficheros de test nuevos y 5 ampliados, +75 tests, con camino feliz y caminos de error.
- [x] C5 — Sesión cerrada bien: `git status` no trae temporales ni builds (el `dist/` de mi `pnpm build` está ignorado); la feature sigue en `in_progress` y **sin commit**, que es lo que toca antes de la T17. `progress/history.md` tiene la entrada de la última sesión cerrada (la F19); la de la F20 se escribe al cerrarla, después de la T17.
- [x] C6 — Coherencia con el proyecto hermano: el backend **no se toca** (working tree limpio y sin commits nuevos), el contrato no cambia, y los tres endpoints usados están en `api-contract.md` con esos nombres de parámetro y esos errores (404 de cuenta o categoría inexistente, 400 de las dos claves de categoría juntas). `docs/related-projects.md` no lista endpoints, así que no requiere cambio.
- [x] C7 — SDD: los **4** archivos del spec están; `decisions.md` cabe en una página con **5** puntos 🔴 (máximo 6), cada uno con su alternativa concreta; **15** requirements; EARS estricto; sección de **Procedencia** completa, con los 15 requisitos clasificados (humano / delegado / añadido) y las cinco marcas de revisión en aprobación; todas las tasks `[x]` salvo la T17, justificada.
- [x] C8 — Resumen de cierre escrito: `progress/summaries/statement-filters.md`.

## Resumen de cierre (si APPROVED)

- Escrito en `progress/summaries/statement-filters.md` → **sí**.

## Cambios requeridos

**Ninguno.** No hay nada que bloquee el cierre de esta feature.

## Observaciones menores (no bloquean; no hace falta tocar nada ahora)

1. `src/features/statement/components/StatementFilterBar.vue:114` — `emitChange` arrastra
   siempre la `q` que tiene el campo. Si el usuario escribe más de 100 caracteres (que
   avisa y no viaja) y **después** toca otro control, ese texto largo llega a la URL como
   `?q=...`; `fromRouteQuery` lo lee como cadena vacía y la query no lo manda, así que
   **no hay riesgo de 400** ni estado inconsistente, pero la dirección queda con un
   parámetro que se ignora hasta el siguiente cambio. Cosmético.
2. `src/features/statement/views/StatementView.vue:51` — el botón de reintentar llama al
   store directamente en vez de pasar por la URL. Es el patrón que ya traía la F19 y no
   rompe la R8 (nada se guarda fuera de la querystring), pero es el único camino de la
   pantalla en el que la URL no manda.
3. `MonthTotals.spec.ts:12` y `StatementFilterBar.spec.ts:17` — los helpers de montaje
   tipan los overrides como `Record<string, unknown>`, así que un nombre de prop mal
   escrito en un test futuro no lo cazaría el type-check. Un tipo de props explícito lo
   arreglaría la próxima vez que se pase por ahí.
4. `src/features/statement/store.ts:134,146` — los dos `catch` de las listas descartan el
   error sin guardarlo. Es lo que pide la R15 y el fallo se ve en la UI, pero si algún día
   interesa saber por qué falló una lista, ahí no queda nada.
