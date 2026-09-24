# Review — feature 18 `rule-match-preview`

**Veredicto:** APPROVED

> Revisor, 2026-09-24. Puerta ejecutada entera por mí, sin fiarme del informe:
> `pnpm type-check` OK · `pnpm lint` OK · `pnpm test:unit` OK **973/973 en 67 ficheros** ·
> `pnpm build` OK · `pnpm test:e2e --project=chromium` OK **17/17** · `./init.sh` OK
> («[OK] Entorno listo»). Los números coinciden con los que declara el implementer.
> **La T18 no se exige**: es la comprobación con el humano delante y queda pendiente a propósito.

## Trazabilidad requirements ↔ tests (SDD)

- R1: [x] `preview-rules.spec.ts` › *previewQuery (R1)* · `preview-store.spec.ts:38`, que fija el
  querystring entero `status=pending_review&type=expense&uncategorized=true&q=mercadona&page=1&pageSize=5` ·
  `RuleDialog.spec.ts` («asks once for a burst of keystrokes», «waits the same 350 ms»).
- R2: [x] `preview-rules.spec.ts` › *canPreview (R2)* (3 caracteres normalizados; tope de 100 medido
  sobre el texto tal cual, espacios finales incluidos) · `preview-store.spec.ts:73` y `:85` (cero
  llamadas y estado `idle`) · `RuleDialog.spec.ts` (emite la cadena vacía por debajo y por encima).
- R3: [x] `preview-rules.spec.ts` › *matchCountLine* (singular, plural y 0) ·
  `RuleMatchPreview.spec.ts:50` · e2e `category-rules.spec.ts:330`.
- R4: [x] `RuleMatchPreview.spec.ts:59` (fecha `31 Jul 2026`, concepto e importe `-45,37`) y `:69`
  (nunca más de cinco, con seis de entrada) · e2e (ejemplo con concepto e importe).
- R5: [x] `preview-rules.spec.ts` › *matchWarning* (51 avisa, 50 no) · `RuleMatchPreview.spec.ts:75`
  y `:84` · `RuleDialog.spec.ts` (guardar sigue activo con el aviso).
- R6: [x] `preview-rules.spec.ts` › *matchWarning* (0) · `RuleMatchPreview.spec.ts:88` · e2e.
- R7: [x] `RuleDialog.spec.ts` (guardar habilitado con demasiados, con ninguno y con el recuento
  fallado) · e2e (`rule-save` habilitado con 0 coincidencias).
- R8: [x] `preview-store.spec.ts:109`, con dos promesas diferidas: **la vieja resuelve después de la
  nueva** y el estado se queda con la nueva (total 7, no 900). Y `:133`: una respuesta en vuelo tras
  `clearPreview()` se descarta. Es el test correcto, no un camino feliz disfrazado.
- R9: [x] `preview-store.spec.ts:96` (estado `loading` observado en vuelo) ·
  `RuleMatchPreview.spec.ts:42` · `RuleDialog.spec.ts` («leaves the field, the selector and the save
  button usable while counting», que además teclea y comprueba que el campo responde).
- R10: [x] `preview-rules.spec.ts` › *previewErrorMessage* (red, 400, ValidationError y genérico),
  **más** la aserción de que ninguna frase contiene un `message` del backend (`BACKEND_MESSAGES`) ·
  `preview-store.spec.ts:146` y `:159` (no lanza; queda en `failed`) · `RuleMatchPreview.spec.ts:103`.
- R11: [x] `RuleDialog.spec.ts` («asks for the count as soon as it opens, without a keystroke») ·
  `RulesView.spec.ts` (al abrir una regla existente, y con el `kind` de su categoría: `type=income`) ·
  `ReviewView.spec.ts` (consulta al abrir, y `type=income` en la fila de ingreso) · e2e.
- R12: [x] `ReviewView.spec.ts` («never sends anything but a GET of the movements while it counts»:
  todas las llamadas posteriores a abrir son GET de `/api/movements` y `patches()` queda vacío) ·
  `RulesView.spec.ts` («writes nothing while the dialog is open») · `preview-store.spec.ts:172`
  (todos los métodos GET, todos los paths bajo `/api/movements`, todos sin cuerpo) · e2e, donde la
  lista de escrituras interceptadas queda vacía.
- R13: [x] tabla §7 (`TPV VIRTUAL 1234 AMAZON MARKETPLACE` va a `amazon`) y «skips the channel
  words and keeps the shop behind them» (`COMPRA INTERNET WEB REPSOL` va a `repsol`).
- R14: [x] tabla §7 (`servicios selecta`, `juan jose romero`) + «grows past a generic word even when
  it is already long enough» + «stops at four words» (`GRUPO NUEVO SERVICIOS GENERAL CENTRO` va a
  `grupo nuevo servicios general`).
- R15: [x] tabla §7, las cuatro filas de regresión, **y la sección `proposeMatchText` de
  `rules.spec.ts` sin tocar** (comprobado con `git diff`: ese fichero no aparece modificado).

## Tasks completas (SDD)

- T0 a T17: [x] todas, verificadas contra el código (traslado a `shared/`, re-exports, helpers,
  algoritmo, store, componentes, vistas, tests, e2e, `docs/architecture.md` y la puerta).
- T18: [ ] **pendiente a propósito**: la comprobación con el humano delante contra el backend real.
  Justificada en `progress/implementation/rule-match-preview.md` y en la propia `tasks.md` («no
  bloquea el cierre»), y excluida explícitamente del encargo de esta revisión. **No es motivo de
  rechazo.**

## Los cuatro puntos de lupa del encargo

### 1. Que esta feature no escriba nada

Verificado por mí, no leído en el informe:

- Grep en `src/features/category-rules/` y en `src/shared/movements.ts`: **ni un POST, PATCH ni
  DELETE** en el camino de la previsualización. Los dos PATCH que escriben movimientos se quedan en
  `src/features/review/service.ts`, donde estaban.
- El store solo llama a `getMovements(previewQuery(...))` (`store.ts:221`), que manda un GET sin
  cuerpo (`shared/movements.ts:246`).
- `RuleMatchPreview.vue` no tiene ni un `button`, ni un `input`, ni un `select`, y hay un test que
  lo fija (`RuleMatchPreview.spec.ts:117`).
- **Nada puede salir a `:3000`.** Los tests unitarios o inyectan un cliente falso (`fakeClient`) o
  espían `globalThis.fetch` y **rechazan con `TypeError` cualquier ruta no declarada**
  (`category-rules/__tests__/fixtures.ts:195`, `review/__tests__/fixtures.ts:272`). El e2e monta
  primero la red de seguridad `page.route('**/api/**', route => route.abort())`
  (`e2e/category-rules.spec.ts:132`) y declara sus rutas encima; además la ruta de movimientos
  aborta explícitamente cualquier método distinto de GET (`:137` a `:141`). Lo ejecuté con el
  backend levantado: 17/17 en verde y la lista de escrituras vacía en el escenario nuevo.

### 2. Que la consulta sea la del spec

`previewQuery` (`rules.ts:345`) devuelve exactamente `status: 'pending_review'`,
`uncategorized: true`, `type: <kind>`, `q: text.trim()`, `page: 1` y `pageSize: 5`, y **nunca**
`categoryId` (con `uncategorized` sería un 400). Contrastado contra
`../gastos-backend/docs/api-contract.md`, sección `GET /api/movements`: los seis parámetros existen,
`pageSize` va de 1 a 200, `q` de 2 a 100 con el **máximo medido sobre el texto tal cual y el mínimo
sobre el recortado**, y `categoryId` junto a `uncategorized=true` es un 400. `canPreview`
(`rules.ts:335`) exige 3 caracteres normalizados (más estricto que el 2 del contrato: es el mínimo
de `matchText`) y 100 como máximo **sobre el texto tal cual**, igual que mide el backend; hay test
del caso «99 letras más dos espacios». Por debajo del mínimo no sale nada: el diálogo emite la
cadena vacía, la vista llama a `clearPreview()` y el store corta antes de la red (`store.ts:213`).

«Una respuesta vieja no pisa a la nueva»: `previewToken` sube con cada consulta **y con cada
`clearPreview()`** (`store.ts:194` a `:218`), y las dos ramas, éxito y fallo, comparan el token
antes de tocar el estado. Fijado con dos promesas diferidas resueltas en orden invertido.

### 3. La tabla del punto rojo 4

La tabla de `design.md` §7 está **literal** en `preview-rules.spec.ts:115` a `:128` como `it.each`,
con las cuatro filas nuevas y las cuatro de regresión. La recorrí a mano sobre el algoritmo
(`keepsGrowing`, `rules.ts:196`) y sale lo que promete: `AB Servicios Selecta E` da
`servicios selecta` (crece porque `servicios` es genérica), `JUAN JOSE ROMERO RAMOS - INGRESO` da
`juan jose romero` (para en `romero`, que no es genérica), `TPV VIRTUAL 1234 AMAZON MARKETPLACE` da
`amazon` (`tpv` y `virtual` son ahora palabras de trámite y `1234` no es alfabética) y
`TPV VIRTUAL` se queda en `tpv virtual` (no sobrevive ninguna palabra, así que se devuelve el
concepto entero). `iberdrola`, `mercadona`, `mega deportes` y `tulotero` salen **exactamente igual
que hoy**. Hay además dos invariantes que no son decorativas: que toda propuesta sigue **contenida
en el concepto normalizado** y el tope de cuatro palabras. Fijan la tabla de verdad: tocando el
criterio, cualquiera de las ocho filas cae.

### 4. La desviación de `RulesView.spec.ts`

`api.touchedMovements()` pasa a `api.wroteMovements()` en el test «changing a rule…»
(`RulesView.spec.ts:106`). **Conserva lo que ese test protegía; no lo debilita.** Lo que protegía es
la invariante de la F17: cambiar una regla no modifica ningún movimiento. Medirla por **ruta** era
un proxy que ya no vale, porque desde esta feature el diálogo **lee** esa ruta por diseño aprobado
(puntos rojos 2 y 3); medirla por **método** es la medida directa de la invariante, no una más
floja. Lo que se pierde —que a `/api/movements` no llegue nada— dejó de ser cierto a propósito, y
está compensado con creces: en el mismo fichero el test nuevo «writes nothing while the dialog is
open» comprueba que **todas** las llamadas de la pantalla son GET, y hay dos equivalentes en
`ReviewView.spec.ts` y en `preview-store.spec.ts`. La red queda más tupida que antes, no menos. El
cambio está comentado en el propio test y declarado en el informe.

Detalle menor y sin consecuencias: en ese test no se stubea la respuesta de movimientos, así que la
lectura cae en la rama de rechazo del mock y el bloque queda en `failed`. Ninguna aserción depende
de ello.

## Criterios de aceptación (los 11 de `feature_list.json`)

- [x] 1 — `GET /api/movements` con `q`, `status=pending_review` y `uncategorized=true`, y el total de
  la paginación → `previewQuery` + `preview-store.spec.ts:38`.
- [x] 2 — Concepto, fecha e importe dentro del mismo diálogo → `RuleMatchPreview.spec.ts:59` y
  `RuleDialog.spec.ts` («shows the count and the examples inside the dialog itself»).
- [x] 3 — Se refresca solo, con espera tras la última tecla, y una consulta no pisa a la siguiente →
  `RuleDialog.spec.ts` (ráfaga, una sola emisión; 349 ms nada, 350 ms sí) + `preview-store.spec.ts:109`.
- [x] 4 — Avisa con demasiados o con ninguno y **guardar sigue habilitado** → `RuleDialog.spec.ts`
  (los tres escenarios: amplio, cero y fallo) + e2e.
- [x] 5 — Por debajo del mínimo no se consulta nada → `preview-store.spec.ts:73`.
- [x] 6 — Lo mismo al cambiar una regla existente → `RulesView.spec.ts` + e2e.
- [x] 7 — Solo lectura mientras se escribe → ver lupa 1.
- [x] 8 — `proposeMatchText` mejora sin estropear lo que ya salía bien → ver lupa 3.
- [x] 9 — No cambia las F15, F16 ni F17: `git diff` confirma que **ningún** test de esas features
  cambió salvo la aserción explicada, y que `review/store.ts`, `actions.ts`, `RuleList`, `RuleRow`,
  `ApplyRulesDialog`, `ApplyResult`, el router y `category-rules/service.ts` están intactos.
- [x] 10 — Todo en inglés; solo alias semánticos (`text-warning`, `bg-warning-subtle`,
  `text-ink-muted`, `text-ink-body`, `text-ink-faint`, `text-negative`, `border-line-subtle`); las
  parejas usadas ya tienen su línea `contrast:` en `theme-dark.css` (líneas 29, 30, 31, 33, 35 y 59)
  y `theme-dark.spec.ts` está verde. `package.json` intacto: **cero dependencias nuevas**.
- [x] 11 — Puerta entera en verde, repetida por mí.

## Arquitectura (docs/architecture.md)

- [x] Organización por feature: lo nuevo vive en `category-rules/`, y lo que necesitan dos features
  (`GET /api/movements`) se mueve a `shared/movements.ts`, la misma jugada que `shared/categories.ts`.
- [x] **Sentido de la dependencia intacto**: grep de `features/review` y de `features/import` dentro
  de `src/features/category-rules/` no devuelve **ninguna** coincidencia. No se cierra el ciclo.
- [x] La UI no habla con la API: ni `RuleMatchPreview.vue` ni `RuleDialog.vue` tienen `fetch`; la
  vista llama al store y el store al service compartido.
- [x] Tipos propios derivados del contrato; la respuesta cruda se parsea en la frontera con
  `createValidators`, y un contrato roto sale como `ValidationError` (probado).
- [x] Componente tonto: `RuleMatchPreview` solo recibe `preview` y pinta.
- [x] `docs/architecture.md` actualizado: `shared/movements.ts` en el árbol (líneas 106-107) y la
  nota de por qué se movió (133-141).
- [x] Sin dependencias nuevas.

## Convenciones (docs/conventions.md)

- [x] Identificadores, comentarios y texto de cara al usuario en inglés; contenido de docs en
  español. SFC en el orden `<template>` → `<script setup lang="ts">`. `import type` donde toca y el
  orden vendor → alias → relativos.
- [x] Sin `console.log` ni TODOs sueltos (grep limpio). `pnpm lint` (oxlint) sin avisos.
- [x] Importes y fechas por `@/shared/money` (`formatMoney` y `formatDate`), cifras en
  `font-mono tabular-nums`, sin colores sueltos ni paleta de serie de Tailwind, sin `@apply`.
- [x] Errores: nunca se pinta el `message` del backend, frases propias en inglés, `AppError`
  normalizado con `toAppError` y el store no lanza.

## Verificación (docs/verification.md)

- [x] Recursos reales donde es viable: los payloads de los fixtures **pasan por `parseMovementPage`
  de verdad**, no se inyectan objetos ya parseados; solo se mockea la frontera HTTP. El e2e va
  contra la app real.
- [x] Nada de «no lanza excepción»: se comprueba el querystring entero, el texto exacto de cada
  frase, el número de ejemplos, el total concreto y cuál de las dos respuestas gana la carrera.
- [x] Caminos de error cubiertos: red caída, 400, respuesta que no cumple el contrato, texto corto,
  texto largo, respuesta tardía y diálogo cerrado con una consulta en vuelo.
- [x] Nivel 2 (e2e) presente, como pide una feature de interfaz.

## CHECKPOINTS.md

- [x] C1 — Arnés completo; `./init.sh` termina en 0.
- [x] C2 — Una sola feature en `in_progress` (la 18) y `progress/current.md` describe la sesión viva.
- [x] C3 — Arquitectura respetada, sin dependencias nuevas, sin logs de debug ni TODOs.
- [x] C4 — Al menos un test ejecutable por módulo nuevo; 973/973 en verde; camino feliz y de error.
- [x] C5 — Nada sospechoso sin trackear (lo untracked es el código y los tests de la feature más el
  informe). La entrada de `progress/history.md` la escribe el implementer al cerrar a `done`, como
  en la F16 y la F17; hoy la bitácora viva está en `progress/current.md`. `feature_list.json`
  refleja el estado correcto (`in_progress`).
- [x] C6 — El backend no se toca y no hay endpoints ni campos inventados: `GET /api/movements` se usa
  tal y como lo describe `gastos-backend/docs/api-contract.md`. No hace falta tocar
  `docs/related-projects.md`.
- [x] C7 — SDD: los cuatro archivos del spec existen, 15 requirements (dentro del tope), EARS,
  sección de procedencia con los 15 clasificados (humano / delegado / añadido) y los cinco puntos
  rojos con su alternativa concreta; cada `R<n>` con test.
- [x] C8 — Resumen de cierre escrito.

## Resumen de cierre

- Escrito en `progress/summaries/rule-match-preview.md`: **sí**.

## Cambios requeridos

Ninguno. No hay nada que arreglar para aprobar.

## Observaciones sin consecuencias (no bloquean nada)

1. `review/filters.ts` (`SEARCH_MAX = 100`) y `category-rules/rules.ts` (`MAX_PREVIEW_TEXT = 100`)
   son el mismo tope del contrato escrito en dos sitios. El sitio natural sería
   `shared/movements.ts`, junto a `SEARCH_DEBOUNCE_MS`. El implementer ya lo anotó como fuera de
   alcance y estoy de acuerdo: moverlo tocaría la F15 sin que esta feature lo pida.
2. `RuleDialog` pide el recuento **de inmediato** solo cuando `open` pasa de `false` a `true`. Si
   alguna vez se reabriera el diálogo para otro movimiento **sin cerrarlo antes**, ese primer
   recuento llegaría 350 ms tarde. Hoy no pasa: las dos vistas cierran antes de abrir.
3. En el test «changing a rule…» la lectura de movimientos no está stubeada y cae en la rama de
   rechazo del mock. Inofensivo, pero stubearla dejaría el escenario más parecido al real.
4. `GENERIC_WORDS` sigue escrita a mano y sin mirar extractos reales. Es justo lo que la T18 existe
   para corregir.
