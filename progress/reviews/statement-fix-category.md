# Review — feature 21 `statement-fix-category`

**Veredicto:** APPROVED

- Fecha: 2026-09-27 · Reviewer: subagente `reviewer`
- Feature SDD (`"sdd": true`), única en `in_progress`. Spec aprobado por el humano sin
  cambios el 2026-09-27, las 5 🔴 tal cual.
- Puerta **repetida entera por el reviewer**, no leída del informe (ver §Verificación).
- La **T22 no se exige ni se ejecutó**: escribe en datos reales y necesita visto bueno
  explícito del humano (C8 del spec). Queda anotada como pendiente, no como fallo.

---

## Trazabilidad requirements ↔ tests (SDD)

Cada `R<n>` con al menos un test **concreto** que lo verifica; localizados y leídos uno
a uno, no aceptados del informe.

- **R1** (cuerpo con solo `categoryId`): [x] `statement/__tests__/service.spec.ts:17`
  (cuerpo `{"categoryId":2}` letra por letra), `:32` (el `null`), `:41` (contrabando),
  `store.spec.ts:408`, e2e `statement-fix-category.spec.ts:245`.
- **R2** (insignia pulsable, sin selector en la línea): [x] `StatementRow.spec.ts:85`,
  `StatementList.spec.ts:83`, `StatementView.spec.ts:390`.
- **R3** (activar la insignia la sustituye en su sitio): [x] `StatementRow.spec.ts:105`,
  `RowCategoryEditor.spec.ts:108` (`Close` y `Esc`), `store.spec.ts:615`,
  `StatementList.spec.ts:92`.
- **R4** (solo categorías del `kind` + `No category`): [x] `RowCategoryEditor.spec.ts:22`
  y `:31`.
- **R5** (`neutral` deshabilitado con su texto): [x] `RowCategoryEditor.spec.ts:68`,
  `StatementRow.spec.ts:125`.
- **R6** (igual en `confirmed` que en `pending_review`): [x] `store.spec.ts:430`,
  `StatementRow.spec.ts:135`, e2e `:245` (fila 0 = `confirmed`).
- **R7** (200 → sustituir la fila sin recargar): [x] `store.spec.ts:408` y `:534`
  (fila traída por `Load more`), `StatementView.spec.ts:411`.
- **R8** (desaparece al momento si deja el filtro): [x] `actions.spec.ts:41` (tres casos),
  `store.spec.ts:481` y `:509` (**con el refresco fallando a propósito**: la desaparición
  no puede atribuirse al `GET` posterior), e2e `:280`.
- **R9** (repedir el mes **solo** con filtro de categoría): [x] `actions.spec.ts:32`,
  `store.spec.ts:469` (cero lecturas extra) y `:481` (dos lecturas con filtro),
  `StatementView.spec.ts:411`, e2e `:212` (queda en 1) y `:280` (pasa a 2).
- **R10** (las cifras nunca se calculan en el cliente): [x] `store.spec.ts:552`,
  `MonthTotals.spec.ts` verde **sin tocarlo**, e2e `:280` (cifras y recuento del backend).
- **R11** (línea sobre la lista con `Undo` sin cuenta atrás): [x]
  `StatementActionNotice.spec.ts:9` (incluida la aserción de que no hay segundos),
  `StatementView.spec.ts:437` (orden cifras → aviso → lista).
- **R12** (`Undo` manda el `categoryId` anterior): [x] `store.spec.ts:563`,
  `StatementView.spec.ts:472`, e2e `:307`.
- **R13** (mes/filtro/salida olvidan la acción): [x] `store.spec.ts:593`,
  `StatementView.spec.ts:585`. «Abandonar la pantalla» lo cubre el `show()` del
  `onMounted` de `StatementView.vue:155`, que llama a `forgetAction` (`store.ts:115`).
- **R14** (frase en inglés, nunca el `message` del backend): [x] `actions.spec.ts:94`
  (las cinco frases + antifiltración), `store.spec.ts:626/646/657`,
  `StatementView.spec.ts:487`, e2e `:330`.
- **R15** (recargar salvo 400 y fallo de red): [x] `actions.spec.ts:137`,
  `store.spec.ts:626` (400 sin recarga), `:646` (red sin recarga), `:657` (404 recarga),
  e2e `:330`.
- **R16** (diálogo de la F17 con previsualización y solo su `kind`): [x]
  `RowCategoryEditor.spec.ts:91`, `StatementView.spec.ts:504` (lee el `q=cafeteria` del
  preview y comprueba que `Salary` no está entre las opciones).
- **R17** (crear la regla no toca el movimiento de origen): [x]
  `StatementView.spec.ts:529` (la única escritura es `POST /api/category-rules`, sin
  `PATCH` y sin `/apply`).

Restricciones: **C1** `service.spec.ts:56` + `StatementView.spec.ts:560` (métodos
`GET`+`PATCH`) + `StatementRow.spec.ts:73`; **C2** `store.spec.ts:672`,
`RowCategoryEditor.spec.ts:77`, `StatementActionNotice.spec.ts:48`; **C3** ver §4 de la
lupa; **C4** `service.spec.ts:66`; **C5** `theme-dark.spec.ts` verde, cero dependencias
nuevas (`package.json` sin cambios), iconos `WandSparkles`/`Undo2`/`X` ya usados en el
repo; **C6** ver desviación 2; **C7** ver §Verificación; **C8** T22, no exigida.

## Tasks completas (SDD)

T0–T21 en `[x]` (verificado en `specs/21-statement-fix-category/tasks.md`).
**T22 en `[ ]` con justificación válida y documentada** (escribe en datos reales; el
propio spec, C8, la condiciona al visto bueno explícito del humano): no bloquea.

Salvedad de bookkeeping, no de trabajo: **T3 está marcada `[x]` aunque su segunda frase
(«casos del `PATCH` movidos a `src/shared/__tests__/movements.spec.ts`») no se hizo**. La
desviación está declarada en el informe §6.3 y la juzgo aceptable (ver desviación 3),
pero lo limpio sería una nota inline en `tasks.md` junto a la T3, no solo en el informe.

## Criterios de aceptación (`feature_list.json`, 13)

- [x] 1 — asignar/cambiar/quitar categoría con `PATCH /api/movements/:id` y solo
  `categoryId` → `statement/service.ts:16`, tests de R1.
- [x] 2 — igual en confirmado que en pendiente; el `status` no viaja nunca → R6.
- [x] 3 — solo categorías con `kind` compatible; `neutral` no se categoriza → R4, R5.
- [x] 4 — lista y cifras al día con la respuesta y un refresco en segundo plano, sin
  recargar → R7, R9 (con el matiz aprobado de la 🔴 5: el refresco solo con filtro).
- [x] 5 — deshacer la última acción con otro `PATCH` → R12.
- [x] 6 — con `uncategorized`, la línea desaparece al momento → R8.
- [x] 7 — crear regla reutilizando el diálogo de la F17 con su previsualización → R16.
- [x] 8 — errores en inglés sin el mensaje del backend, y recarga ante un fallo que
  pudiera haber escrito → R14, R15.
- [x] 9 — ninguna propiedad fuera de `categoryId`, ni controles de estado, importe,
  fecha o descripción → R1, C1.
- [x] 10 — nota permanente visible y no cerrable, cifras del backend → §4 de la lupa.
- [x] 11 — cola, reglas y previsualización siguen igual → desviación 2.
- [x] 12 — inglés, tokens semánticos, sin dependencias nuevas → C5.
- [x] 13 — puerta completa en verde → §Verificación.

## Los cinco puntos con lupa

### 1. El cuerpo del `PATCH`

- **Se construye en un único sitio**: `statement/service.ts:16-22` llama a
  `updateMovement(id, { categoryId }, client)` con el literal escrito ahí dentro.
- **El store no puede mandar otra cosa**: el `grep` de `updateMovement` en todo `src/`
  devuelve solo `shared/movements.ts:297` (definición), `review/service.ts:24` y `:40`
  (re-export), `review/store.ts:325` y `:338` (la cola) y `statement/service.ts`. El store
  del extracto (`statement/store.ts:23`) importa **únicamente** `setMovementCategory`,
  cuya firma es `(id, categoryId: number | null, client?)`: no hay hueco tipado por donde
  entre un `status`.
- **Segunda barrera**: `changesBody` (`shared/movements.ts:282`) copia campo a campo, así
  que ni un spread colaría nada.
- **El test de contrabando prueba lo que dice, con un matiz**: `service.spec.ts:41`
  construye un objeto con `status` y `amount` y pasa solo su `categoryId`; la aserción que
  de verdad vale es la de la línea 53 (las claves del cuerpo son exactamente una,
  `categoryId`), y esa sí es real. La parte «un llamante que intenta colar campos» es en
  rigor imposible por la firma —lo garantiza el type-check, no el test—, así que el test
  es algo teatral pero **no vacío**: verifica el cuerpo exacto que viaja.
- **El e2e lo ejercita sobre un confirmado**: `e2e/statement-fix-category.spec.ts:245`;
  la fila 0 nace `status: confirmed` (`:56`) y el test comprueba, en los **dos** cuerpos,
  que no contienen `status` y que su única clave es `categoryId`, más que los métodos de
  toda la sesión son solo `GET` y `PATCH`. Es el caso peligroso y está cubierto en un
  navegador real.

### 2. Nada puede salir a `:3000`

- **Unitarios**: jsdom sirve el origen `http://localhost:3000` (lo he **medido** con un
  spec desechable: `location.origin` devuelve exactamente eso) y `.env.test` usa
  `VITE_API_URL=/`, así que una llamada **no mockeada sí llegaría al backend real**. Red
  de seguridad verificada fichero a fichero: los tres specs de esta feature que pueden
  alcanzar la capa HTTP (`service.spec.ts`, `store.spec.ts`, `StatementView.spec.ts`)
  instalan `mockApi` como primera línea de cada test, y `mockApi`
  (`__tests__/fixtures.ts:305`) **rechaza lo no previsto** («unexpected METHOD path»).
  Los cuatro specs de componentes (`RowCategoryEditor`, `StatementActionNotice`,
  `StatementRow`, `StatementList`) no tocan el store ni el service: solo emiten eventos,
  comprobado en su código.
- **E2E**: los **siete** specs de `e2e/` montan primero la red de seguridad que aborta
  cualquier `/api` (líneas 52, 132, 109, 129, 114, 142 y 150). El nuevo añade una segunda
  capa en `statement-fix-category.spec.ts:152`: en `**/api/movements/*` **aborta cualquier
  método que no sea `PATCH`**. Ninguna ruta del spec reenvía al proxy.
- Conclusión: en esta sesión no ha salido ni una escritura real. Recomendación de higiene
  general al final.

### 3. La 🔴 5 (cuándo se repiden las cifras)

`store.ts:266` refresca **solo** si `hasCategoryFilter(filters.value)`, y
`hasCategoryFilter` (`actions.ts:16`) es «uncategorized, o categoryId distinto de null».
Probado en las dos direcciones y en los dos niveles: `store.spec.ts:469` cuenta **cero**
lecturas extra con `accountId` y `q` puestos (que no son filtro de categoría),
`store.spec.ts:481` cuenta exactamente **dos** con `uncategorized`,
`StatementView.spec.ts:411` lo repite sobre la vista montada, y el e2e mide las lecturas
del mes: 1 sin filtro (`:238`) y 2 con filtro (`:302`). Coincide con la decisión aprobada
y con el contrato, releído en `../gastos-backend/docs/api-contract.md`
→ `PATCH /api/movements/:id` («los `totals` no cambian por categorizar ni por confirmar»).

### 4. La nota permanente de la F19

`MonthTotals.vue` **no aparece en el `git diff`**: la nota es byte-idéntica.
`MonthTotals.vue:76-81` conserva el texto palabra por palabra, `:44-51` la pinta siempre
(sin `v-if`, sin botón de cerrar, con el comentario «Permanent on purpose: no close
button»), y `MonthTotals.spec.ts` sigue verde sin tocarlo (T18). Además se comprueba que
**sobrevive a una escritura**: `StatementView.spec.ts:428` y el e2e `:240`.

### 5. Las seis desviaciones, una a una

1. **`MovementChanges` también bajó a `shared/movements.ts`** (la T1 no lo decía) —
   **aceptable**. Es la firma de `updateMovement`, así que dejarla en `review/types.ts`
   habría creado un import `shared → review`, justo el ciclo que la arquitectura prohíbe.
   `review/types.ts:30` la re-exporta y `BulkUpdate` sigue en `review`. Ningún llamante
   cambió.
2. **Dos aserciones de tests de la F19/F20 cambiaron de contenido** — **aceptable, y la
   garantía no se debilita donde importa**. En `StatementRow.spec.ts:73` el «cero botones»
   se sustituye por una **lista exacta** de botones (solo la insignia de categoría) más
   cero `input`, cero `select` y «no dice Confirm»: es igual de fuerte que antes (ningún
   control nuevo puede aparecer sin romperlo) y más explícito. En
   `StatementList.spec.ts:83` sí hay un matiz: se pasó de acotar **todos** los botones a
   contar solo los cuatro de categoría, así que un botón nuevo en la fila no tumbaría *ese*
   test; queda cubierto por el de `StatementRow` (que sí acota el total) y por
   `StatementView.spec.ts:560` (la única escritura de la pantalla es el `PATCH`).
   Recomendación, no bloqueo: en ese test, acotar también el total de botones.
   Confirmado con `git diff` que **ningún test de las F15–F18 cambió** (el diff no toca
   `features/review/__tests__` ni `features/category-rules/__tests__`) y que sus suites
   pasan enteras.
3. **La T3 que decidió no hacer** — **su razonamiento se sostiene; no hay que hacerla**.
   La T3 pide dos cosas incompatibles en la práctica («sin tocar ni un test» y «mover los
   casos»), `src/shared/__tests__/movements.spec.ts` **no existe** (la mudanza de la mitad
   de lectura en la F18 tampoco lo creó, así que el precedente es el mismo) y, sobre todo,
   **no se pierde cobertura**: `updateMovement`, `parseUpdatedMovement` y `changesBody` se
   siguen ejercitando desde `review/__tests__/service.spec.ts` contra la implementación
   compartida vía la re-exportación; `needsReload` se prueba **importado directamente de
   `@/shared/movements`** en `statement/__tests__/actions.spec.ts:4` y `:137`; y el cuerpo
   exacto se prueba aparte en `statement/__tests__/service.spec.ts`. Mover los casos habría
   movido cobertura, no añadido. Lo que sí queda como deuda menor: `shared/movements.ts`
   no tiene test co-localizado, y la convención pide uno por módulo; si aparece una tercera
   pantalla escritora, ese fichero vale la pena.
4. **El e2e no puede comprobar el `status` en pantalla** — **aceptable**. El extracto no
   pinta el estado; se comprueba por los dos frentes que quedan: el cuerpo interceptado en
   el e2e (`:270-274`) y el `status` de la fila en `store.spec.ts:430`. Es la única vía sin
   inventar UI.
5. **El `ref` nuevo `actionNotice`** — **aceptable y bien resuelto**. Con un solo
   `lastAction` no caben «queda la frase `Change undone`» y «nada se rehace». Verificado
   que **el deshacer no puede rehacer**: `store.ts:295-303` pone `lastAction = null` tras
   un undo correcto, el botón depende de `lastAction !== null`
   (`StatementView.vue:33`, `StatementActionNotice.vue:11`), y hay test de que un
   **segundo** `Undo` no manda ninguna petición (`store.spec.ts:585`) y de que el botón
   desaparece (`StatementActionNotice.spec.ts:41`, `StatementView.spec.ts:482`, e2e `:325`).
6. **`findCategoryName` sale de la vista a `actions.ts`** — **aceptable**. Es el mismo
   recorrido del árbol que ya estaba escrito a mano en `StatementView.vue`, ahora con test
   propio (`actions.spec.ts:62`) y compartido por store y vista (`store.ts:288`,
   `StatementView.vue:184`). No cambia comportamiento.

**Y el reordenamiento de `show(...)` antes del mensaje de error** (informe §3.5):
`store.ts:272-274` recarga primero y **luego** asigna `actionError` y `actionMessage`. Es
obligado, porque `show()` llama a `forgetAction()` (`store.ts:115`) y borraría la frase.
Verificado que **el mensaje no se pierde**: `store.spec.ts:657` (404) comprueba a la vez el
texto en inglés, que no lleva el mensaje del backend, las **dos** lecturas del mes y que la
paginación es la recargada.

## Arquitectura (`docs/architecture.md`)

- [x] 1 — Organización por feature: todo lo nuevo vive en `src/features/statement/`.
- [x] 2 — La UI no habla con la API: `grep` de `fetch(` en `src/features/statement/` está
  vacío; la vista va contra el store.
- [x] 3 — Store guarda estado, service trae datos: `service.ts` es entrada → datos, sin
  estado.
- [x] 4 — Tipos propios derivados del contrato; la respuesta se parsea en frontera
  (`parseUpdatedMovement`) antes de entrar en el estado.
- [x] 5 — Estado mínimo y explícito: los seis `ref` nuevos están en el store; ninguna
  variable module-level mutable nueva.
- [x] 6 — Componentes tontos: `RowCategoryEditor`, `StatementActionNotice`,
  `StatementRow` y `StatementList` solo reciben props y emiten; la lógica está en
  `actions.ts` y el store.
- [x] Sin ciclos: `statement → category-rules` (mismo sentido que `review →`), y el `grep`
  de `features/review` en `src/features/statement/` está **vacío**. La T20 actualizó la
  nota de `architecture.md` (`:133-153`), que afirmaba lo contrario.
- [x] ADR-002: la escritura compartida vive en `shared/movements.ts` porque la necesitan
  dos features; el `PATCH` en bloque se queda en `review`.

## Convenciones (`docs/conventions.md`)

- [x] Estilo, nombres, imports: inglés en el código y en los textos de UI, orden vendor →
  `@/` → relativos, `import type` donde toca, oxlint y Prettier limpios.
- [x] Manejo de errores: nada de `throw` de strings; `toAppError` + `AppError` en estado
  (`actionError`) y frase propia (`actionMessage`); el mensaje del backend nunca se pinta.
  `refreshQuietly` traga su fallo **a propósito y comentado** (`store.ts:223`), que es
  correcto: la escritura sí salió bien.
- [x] Estilos: solo alias semánticos (`text-positive`, `text-negative`, `outline-brand`,
  `bg-surface-*`); `theme-dark.spec.ts`, que prohíbe colores crudos en los `.vue`, verde.
- [x] Sin `console.log` ni TODOs sueltos (grep vacío en la carpeta y en el e2e nuevo).
- [x] Tests co-localizados en `src/**/__tests__/*.spec.ts`, e2e en `e2e/`.

## Verificación (`docs/verification.md`)

- [x] Los tests usan recursos reales ligeros: solo se mockea la frontera HTTP y los
  payloads pasan por el parseo real (`parseMovementPage` / `parseUpdatedMovement`).
- [x] Verifican output concreto, no «no lanza»: cuerpos leídos letra por letra, textos
  exactos, número de peticiones, ids de las filas en pantalla.
- [x] Camino de error cubierto de sobra: 400, 404, fallo de red, `ValidationError`,
  respuesta ilegible, refresco que falla, fila inexistente y doble clic.
- [x] Dos tests destacan por estar bien pensados: `store.spec.ts:509` (hace fallar el
  refresco a propósito para que la desaparición de la fila no pueda atribuirse al `GET`
  posterior) y `StatementView.spec.ts:529` (la regla creada no escribe nada en su
  movimiento de origen).

**Puerta, ejecutada por el reviewer** (no copiada del informe):

| Comando | Resultado |
|---|---|
| `pnpm type-check` | verde (exit 0) |
| `pnpm lint` | verde (oxlint, exit 0) |
| `pnpm test:unit` | **82 ficheros, 1.212 tests, todos verdes** |
| `pnpm build` | verde — 246,97 kB JS / 78,50 kB gzip, CSS 31,80 kB |
| `pnpm test:e2e --project=chromium` | **28 tests verdes** (9,6 s) |
| `./init.sh` | «[OK] Entorno listo. Puedes empezar a trabajar.» (exit 0) |

Las cifras del informe del implementer coinciden con las medidas.

## CHECKPOINTS.md

- [x] **C1 — Arnés completo.** `AGENTS.md`, `init.sh`, `feature_list.json`,
  `progress/current.md` y los cinco `docs/` existen; `./init.sh` termina con exit 0.
- [x] **C2 — Estado coherente.** Una sola feature en `in_progress` (la 21; 20 `done`);
  `progress/current.md` describe esta sesión y su bitácora, sin basura de sesiones viejas.
- [x] **C3 — Arquitectura.** Estructura feature-based respetada, cero dependencias nuevas
  (`package.json` intacto), sin `console.log` ni TODOs, convenciones cumplidas.
- [x] **C4 — Verificación real.** Test ejecutable por cada módulo nuevo (4 specs nuevos +
  1 e2e, +77 tests), camino feliz y de error.
- [x] **C5 — Sesión cerrada bien.** Los untracked son todos artefactos legítimos de la
  feature (3 fuentes, 4 specs, 1 e2e, 1 informe); ningún temporal, build ni caché.
  `progress/history.md` tiene su entrada de la última sesión cerrada (F20); la de la F21
  la escribe el leader al cerrar. La feature sigue en `in_progress`, su estado correcto
  hasta que el implementer la marque `done`.
- [x] **C6 — Coherencia con el proyecto hermano.** El backend **no se tocó** desde aquí y
  no hay endpoints ni campos inventados: `PATCH /api/movements/:id` y
  `POST /api/category-rules` están releídos en `../gastos-backend/docs/api-contract.md`, y
  el comportamiento del cliente (cuerpo con solo `categoryId`, 400/404, respuesta = el
  movimiento completo) coincide con el contrato. `docs/related-projects.md` no necesita
  cambios: el contrato no se modifica desde aquí. Nota informativa: el backend tiene en
  curso su feature 49, que añade `excludedFromTotals` al mismo `PATCH`; **no rompe nada
  aquí** — `changesBody` solo manda lo que se le pide y `parseMovement` ignora las claves
  que no conoce.
- [x] **C7 — SDD.** Cuatro archivos en `specs/21-statement-fix-category/`; `decisions.md`
  cabe en una página y tiene **5** puntos 🔴 (tope 6), cada uno con su alternativa
  concreta; 17 requirements, dos por encima del tope blando, con la razón **dicha
  explícitamente** en el encabezado de `requirements.md`; EARS estricto; sección de
  **Procedencia** presente y **todos** los `R1`–`R17` y `C1`–`C8` clasificados
  (`humano` / `delegado` / `añadido`); cada `R<n>` con test concreto (arriba); T0–T21 en
  `[x]` y la única `[ ]` justificada.
- [x] **C8 — Resumen de cierre escrito.** `progress/summaries/statement-fix-category.md`.

## Resumen de cierre

- Escrito en `progress/summaries/statement-fix-category.md` → **sí**.

## Cambios requeridos

**Ninguno.** Nada de lo revisado bloquea el cierre.

## Recomendaciones (no bloquean, y varias no son del implementer)

1. `docs/stack.md` → *E2E en cada modo* dice «la cumplen los **seis** specs de `e2e/`» y
   presenta `e2e/statement.spec.ts` como el sexto, «de solo lectura». Ahora son **siete** y
   el séptimo **escribe** (con su abort de todo método distinto de `PATCH`). Es una línea
   de doc y territorio del leader, no del implementer; conviene hacerla al cerrar, por el
   mismo precedente con el que se documentaron los seis anteriores.
2. `src/features/statement/types.ts:1-4` sigue diciendo «The screen reads
   `GET /api/movements` and nothing else». Ya no es cierto (el fichero no se tocó).
3. `StatementList.spec.ts:83`: acotar también el total de botones, para no perder la
   garantía que la versión de la F19 tenía a nivel de lista.
4. Higiene general del repo (no de esta feature): dado que el origen de jsdom **es**
   `http://localhost:3000`, un `setupFiles` de Vitest que deje `fetch` fallando por
   defecto convertiría «me olvidé del mock» en un test rojo en vez de en una escritura
   real. Hoy la protección depende de que cada test recuerde `mockApi`.
5. Deuda ya anotada por el implementer y que comparto: `shared/movements.ts` sin test
   co-localizado, y ~100 líneas de datos de muestra repetidas entre `e2e/statement.spec.ts`
   y el nuevo spec.
6. Bookkeeping: dejar una nota inline en la T3 de `tasks.md` diciendo que su segunda frase
   no se ejecutó y por qué, para que el `[x]` no se lea como «hecha entera».

## Pendiente para el humano

- **T22** — comprobación contra el backend real de `:3000`, que **escribe**. No se exige
  para aprobar y no se ha ejecutado. Cuando el humano dé el visto bueno: foto con `curl`
  de uno o dos movimientos, cambiar y deshacer desde la pantalla, foto después, y
  comprobar que `categoryId` vuelve a su valor y que **`status` no se movió**.
