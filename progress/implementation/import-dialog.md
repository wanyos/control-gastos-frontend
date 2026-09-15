# Implementación — Feature 13 `import-dialog`

> Informe del implementer (2026-09-15). Spec: `specs/13-import-dialog/` (aprobado por el
> humano el 2026-09-15). Estado en `feature_list.json`: **`in_progress`**, sin cambiar; no
> se marca `done` (lo cierra el flujo tras el reviewer). La F14 y
> `specs/14-import-report-details/` no se han tocado en contenido (ver *Incidencia de finales
> de línea*).

## Resumen

Botón **Import** (primario, icono `FileUp`) y aviso **«N new files»** en la barra superior
de todas las rutas; modal por fases sobre un `BaseDialog` hecho a mano (comprobación →
confirmación con la lista → importando → resultado o fallo), un único
`POST /api/import` sin cuerpo ni `Content-Type`, informe parseado **entero** y pintado solo
en titular, contadores, línea de pasadas finales, frase de revisión y «Needs attention». Se
retiran la ruta `/import` y su entrada de la sidebar. Sin dependencias nuevas y sin tocar el
backend.

## Tareas

| Task | Estado | Nota |
|---|---|---|
| T0 | [x] | Ver *T0 — Línea base y riesgos*. |
| T1 | [x] | `ApiError.apiCode` + `readErrorBody`; tests existentes intactos. |
| T2 | [x] | `createValidators`; `src/features/net-worth/__tests__/` sin editar y verde. |
| T3 | [x] | `bankLabel` en `shared/banks.ts` con reexport; comentario de `money.ts:4` corregido. |
| T4 | [x] | `types.ts` + `fixtures.ts` con todas las formas pedidas. |
| T5 | [x] | Service completo + 12 tests. |
| T6 | [x] | Store + 25 tests. |
| T7 | [x] | `outcome.ts`, `summary.ts`, `fileMessages.ts` + tests con textos exactos. |
| T8 | [x] | `BaseButton`, `BaseSpinner`, `BaseDialog` + tests. |
| T9 | [x] | `ImportPhases`, `PendingList`, `ImportSummary`, `FileIssueList` + tests. |
| T10 | [x] | `ImportDialog`, `ImportButton` + tests. |
| T11 | [x] | Slot `actions`, `ImportButton` en el shell, `/import` fuera. |
| T12 | [x] | Smoke con pendientes + `e2e/import-dialog.spec.ts` (2 escenarios). |
| T13 | [x] | `docs/architecture.md` y `docs/stack.md`. |
| T14 | [x] salvo C7 | Puerta verde. **C7 no se pudo hacer** (justificado en `tasks.md` y abajo). |

## T0 — Línea base y riesgos

- **Línea base:** `./init.sh` verde antes de tocar nada (18 ficheros, 254 tests unitarios,
  smoke e2e chromium verde). Sin backend en `:3000` ni dev server en `:5173`.
- **(a) e2e sin backend:** con un `onMounted` provisional en `AppShell.vue` que pedía
  `GET /api/ingestion/pending`, el smoke se puso **rojo**:
  `Failed to load resource: the server responded with a status of 502 (Bad Gateway)` en
  `consoleErrors` (el proxy de Vite da `ECONNREFUSED`). Con la
  `page.route('**/api/ingestion/pending', …)` de design.md §10 volvió a **verde**. Montaje
  provisional deshecho. La `page.route` se queda: hace falta.
- **(b) Contraste:** las 6 líneas de design.md §9 añadidas a `src/assets/theme-dark.css`
  (5 en *Overlays*, la de `Details` en *Cards*) y `theme-dark.spec.ts` verde. El borde del
  panel sobre el scrim **llega a 3** en los dos fondos: **no** hace falta el plan B
  (`border-line-default`). No se anotan los ratios exactos: el test los mide y pasa.
- **(c) Iconos:** `FileUp`, `X`, `CircleCheck`, `Circle`, `CircleX`, `TriangleAlert` existen
  con ese nombre en `@lucide/vue` instalado (`dist/lucide-vue.d.ts`). Sin sustituciones.

## Trazabilidad R<n> / C<n> ↔ test

Rutas: `import/` = `src/features/import/__tests__/`.

- **R1** (botón en la barra, `Importing…` deshabilitado) →
  `src/shared/components/__tests__/AppShell.spec.ts:93` «shows the Import button inside the
  topbar on %s» (`/net-worth`, `/overview`, `/nope`);
  `import/ImportButton.spec.ts:85` «is a primary Import button with its icon»;
  `import/ImportButton.spec.ts:96` «reads Importing… and is disabled while an import runs».
- **R2** (GET al montar, al abrir y al terminar; sin sondeo) →
  `import/store.spec.ts:41` «makes one GET and keeps the pending files»;
  `import/store.spec.ts:86` «asks for confirmation … refreshes the known pending»;
  `import/store.spec.ts:192`, `:205`, `:231` (un GET más tras 200, 503 e informe ilegible);
  `import/ImportButton.spec.ts:70` «asks for the pending files once on mount and never polls»
  (timers falsos, 10 min).
- **R3** (aviso 3 / 1 / 0 / fallo) → `import/ImportButton.spec.ts:39`, `:46`, `:53`, `:60`;
  `import/summary.spec.ts:84` (`pendingCountLabel`); `import/store.spec.ts:51` (fallo → `null`).
- **R4** (clic → comprobación con 1 GET) → `import/ImportDialog.spec.ts:88` «opens on the
  checking phase with a single GET»; `import/store.spec.ts:63`.
- **R5** (upToDate / confirm, lista, slug desconocido, plegado > 8) →
  `import/store.spec.ts:76` «ends up to date with 0 pending and never POSTs»;
  `import/store.spec.ts:86`; `import/ImportDialog.spec.ts:120`, `:155`, `:173`;
  `import/PendingList.spec.ts:12`, `:24`, `:30` (`newbank`), `:36` (plegado con recuento).
- **R6** (fallo de comprobación drive/server, Try again) →
  `import/store.spec.ts:106` (drive), `:121` (500, red, JSON inválido → server), `:144` (retry);
  `import/ImportDialog.spec.ts:186`, `:200`; `import/service.spec.ts:181`, `:197` (`isDriveError`).
- **R7** (un único POST sin cuerpo ni `Content-Type`) →
  `import/service.spec.ts:55` «POSTs /api/import without body and without Content-Type»;
  `import/store.spec.ts:162` «makes exactly one POST however many times it is called»;
  `import/ImportDialog.spec.ts:219` «makes one POST on a double click on Import 2 files»;
  `e2e/import-dialog.spec.ts:129` (1 petición, `postData() === null`, sin `content-type`).
- **R8** (fase importando, no se cierra) → `import/store.spec.ts:179` «does not close while
  importing»; `import/ImportDialog.spec.ts:237` «shows the importing phase and cannot be closed
  while it runs» (Esc, scrim, sin X, acción `disabled`).
- **R9** (titular, contadores, línea final, frase sin enlace) →
  `import/outcome.spec.ts:21`–`:66` (4 titulares y bordes: sin archivos, todo duplicados, solo
  productos, cada motivo de «things to check»); `import/summary.spec.ts:29`–`:79`;
  `import/ImportSummary.spec.ts:12`, `:29`, `:37` (sin `<a>`), `:45`;
  `import/ImportDialog.spec.ts:261`; `e2e/import-dialog.spec.ts:129` (Partially imported).
- **R10** («Needs attention», 9 códigos, desconocido, sin error, skipped, Details `lang="es"`) →
  `import/fileMessages.spec.ts:47` (9 códigos), `:51`, `:56`, `:60`, `:66`, `:74`, `:84`;
  `import/FileIssueList.spec.ts:13`, `:30`, `:45`; `e2e/import-dialog.spec.ts:129`.
- **R11** (fallo del POST y informe ilegible) →
  `import/store.spec.ts:205` (503 drive), `:221` (500 y red → server), `:231` (200 inválido →
  `reportUnreadable`), `:260` (retry → checking, sin POST);
  `import/ImportDialog.spec.ts:295`, `:309`, `:321` (ninguna variante dice «Nothing has been
  imported»); `import/service.spec.ts:172`; `e2e/import-dialog.spec.ts:152` (503 drive).
- **R12** (recarga de Patrimonio solo si estaba cargado) → `import/store.spec.ts:279`
  «reloads a net worth already loaded after %s» (200, 503, ilegible) y `:297` «does not request
  the net worth when it was never loaded».
- **R13** (`apiCode`) → `src/services/__tests__/http.spec.ts:98`, `:120`, `:132`, `:144`;
  los tests previos de `http.spec.ts` y `errors.spec.ts` sin cambios y verdes.
- **R14** (accesibilidad del modal) → `src/shared/components/__tests__/BaseDialog.spec.ts:49`,
  `:74`, `:80`, `:86` (Tab/Shift+Tab), `:101`, `:108`, `:117`, `:128`, `:136`, `:146`, `:173`;
  `import/ImportDialog.spec.ts:104`, `:120` (foco en Close), `:142` (foco vuelve al botón
  Import), `:155` (foco en «Import 2 files»), `:186` (foco en Try again).
- **R15** (región `aria-live` estable) → `import/ImportDialog.spec.ts:338` «announces every
  phase from the same node»; `import/summary.spec.ts:100` (`phaseAnnouncement` por fase).
- **C1** (sin `/import`) → `src/router/__tests__/router.spec.ts:19`, `:35`, `:45`, `:54`;
  `AppShell.spec.ts:73` (usa `/investments`) y `:93` (la sidebar no lista Import).
- **C2** (validación y `bankLabel` compartidos) → `src/shared/__tests__/validation.spec.ts:21`,
  `:41`, `:45`; `src/shared/__tests__/banks.spec.ts:12`, `:16`;
  `src/features/net-worth/__tests__/` **sin editar** (`git status` limpio en esa carpeta) y verde.
- **C3** (inglés y oscuro) → `import/ImportDialog.spec.ts` `expectEnglishOnly()` en checking,
  upToDate, confirm, checkFailed, importing, finished e importFailed; `theme-dark.spec.ts`
  verde con las 6 líneas nuevas y «no raw colors» sobre los `.vue` nuevos.
- **C4** (e2e) → `e2e/app-boot.spec.ts:49` y `e2e/import-dialog.spec.ts:129`, `:152`.
- **C5** → `git diff package.json pnpm-lock.yaml` vacío; nada fuera de `gastos-frontend/`.
- **C6** → ver *Verificación*.
- **C7** → **no hecho**; ver *Lo que no se pudo probar*.

## Decisiones de implementación (dentro del spec)

- **Hover solo con el botón habilitado:** las variantes de `BaseButton` usan
  `enabled:hover:bg-…` / `enabled:active:bg-…` en vez de `hover:bg-…` de design.md §8, para que
  un botón deshabilitado o cargando no cambie de fondo al pasar el ratón. Mismos tokens.
- **Tamaño del spinner por prop** (`size`, 14 px por defecto, estilo en línea) en vez de la
  clase fija `size-3.5`; el resto de clases del spinner son las de §8.
- **La X del modal** es un `<button>` propio dentro de `BaseDialog` (port del `IconButton`
  ghost: `text-ink-muted hover:bg-surface-hover`), no un `BaseButton`.
- **Esc y la trampa de Tab** se atienden en un único `keydown` en `document` mientras el modal
  está abierto; si el foco está fuera del panel, Tab lo mete dentro.
- **Devolución del foco:** al abrir se guarda `document.activeElement` y al cerrar o desmontar
  se le devuelve si sigue en el documento.
- **Pie de confirmación:** orden visual Cancel · Import N files (como `AddModal`); el foco
  inicial va a «Import N files» (`data-autofocus`), como pide la tabla de §8.
- **Singular:** `Import 1 file`, `Importing 1 file…`, `1 new file found`, con el mismo helper
  `plural()` que el aviso.
- **Fases:** `ImportPhases` pinta la frase de la fase como etiqueta («Checking Drive for new
  files…», «2 new files found», «Importing 2 files…» + «This can take a few seconds.») y
  «Import files» para la fase pendiente.
- **Título de fallo con icono** `TriangleAlert` `text-negative` (`aria-hidden`); par ya medido
  (`--negative on --surface-card`).
- **`phaseAnnouncement` en `reportUnreadable`:** anuncia la frase completa del cuerpo, porque
  esa fase no tiene título de fallo.
- **`checkRun`:** `close()` también lo incrementa, así una comprobación que responde tras
  Cancel no reabre el flujo (pero sí actualiza `pending`).
- **Recarga tras el POST** en el `finally` de `start()`, pasando el mismo `client` inyectado.
- **Helpers de test:** el `fetch` mockeado por ruta (`mockApi`, `json`, `deferred`,
  `networkDown`) vive en `import/__tests__/fixtures.ts` para compartirlo entre store y
  componentes. `store.spec.ts` reutiliza `coherentNetWorth()` de los fixtures de net-worth.
- **Red de seguridad en el e2e:** `e2e/import-dialog.spec.ts` registra primero
  `page.route('**/api/**', abort)`, así ninguna llamada no prevista (y menos un POST) puede
  llegar a un backend real aunque alguien lo arranque durante la prueba.
- **Trampa de Tailwind encontrada:** un parámetro llamado `container` en `BaseDialog.vue` hizo
  que Tailwind emitiera `.container` y rompió `tailwind-sources.spec.ts` (sonda de
  contaminación). Renombrado a `panelElement`.

## Archivos tocados

### Creados

| Archivo | Qué |
|---|---|
| `src/shared/validation.ts:29` | `createValidators(context)` |
| `src/shared/banks.ts:14` | `bankLabel(slug)` |
| `src/shared/components/BaseButton.vue:2` | botón (primary/secondary/ghost, sm/md, loading) |
| `src/shared/components/BaseSpinner.vue:2` | spinner decorativo o `role="status"` |
| `src/shared/components/BaseDialog.vue:11` | modal; trampa de Tab `:72`, teclado `:92`, devolución de foco `:107` |
| `src/features/import/types.ts:184` | tipos del contrato y `ImportFlow` |
| `src/features/import/service.ts` | `parsePendingFiles` `:36`, discriminación de archivos `:110`, `parseImportReport` `:251`, `runImport` `:279`, `isDriveError` `:284` |
| `src/features/import/store.ts:16` | `useImportStore`; `check` `:36`, `start` `:61` (paso síncrono a `importing` `:65`, `finally` `:74`), `close` `:83` |
| `src/features/import/outcome.ts:25` | `importOutcome` |
| `src/features/import/summary.ts` | `summaryCounters` `:19`, `finalPassesLine` `:39`, `reviewSentence` `:54`, `phaseAnnouncement` `:91` |
| `src/features/import/fileMessages.ts` | mapa de textos `:7`, `fileIssueMessage` `:25` |
| `src/features/import/components/ImportButton.vue` | aviso `:3`, botón `:6`, GET al montar `:33` |
| `src/features/import/components/ImportDialog.vue` | `dismissible` `:6`, región viva `:10`, foco por fase `:176` |
| `src/features/import/components/ImportPhases.vue` | fases con icono |
| `src/features/import/components/PendingList.vue:45` | lista y plegado (> 8) |
| `src/features/import/components/ImportSummary.vue:31` | resumen |
| `src/features/import/components/FileIssueList.vue:20` | «Needs attention» con Details `lang="es"` |
| Tests | `src/shared/__tests__/{validation,banks}.spec.ts`, `src/shared/components/__tests__/BaseDialog.spec.ts`, `src/features/import/__tests__/{fixtures.ts,service,store,outcome,summary,fileMessages,PendingList,ImportSummary,FileIssueList,ImportButton,ImportDialog}.spec.ts`, `e2e/import-dialog.spec.ts` |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/shared/errors.ts:36` | `ApiError.apiCode` |
| `src/services/http.ts:12` | `readErrorBody` → `{ message, apiCode }` |
| `src/services/__tests__/http.spec.ts:97` | 4 casos de `apiCode` |
| `src/features/net-worth/service.ts:51` | usa `createValidators` (borra sus validadores privados) |
| `src/features/net-worth/breakdown.ts:12` | reexporta `bankLabel` de `shared/banks` |
| `src/shared/money.ts:4` | comentario → `specs/09-net-worth-view/design.md` |
| `src/shared/components/AppTopBar.vue:9` | slot `actions` |
| `src/shared/components/AppShell.vue:7` | `<ImportButton />` en la barra |
| `src/router/index.ts` | fuera la ruta `/import` y el import de `FileUp` |
| `src/router/__tests__/router.spec.ts:45` | 4 rutas; `/import` no resuelve |
| `src/shared/components/__tests__/AppShell.spec.ts:73`, `:93` | cambio de ruta con `/investments`; botón Import en `header` |
| `src/shared/components/__tests__/BaseComponents.spec.ts:89`, `:135` | `BaseButton`, `BaseSpinner` |
| `src/assets/theme-dark.css:37`, `:100` | 6 líneas `contrast:` |
| `e2e/app-boot.spec.ts:49` | responde `**/api/ingestion/pending` |
| `docs/architecture.md:65` | árbol con `features/import`, `shared/validation.ts`, `shared/banks.ts`, componentes base; nota de dependencias |
| `docs/stack.md:67`, `:311` | validación compartida, iconos del modal, e2e con pendientes |
| `specs/13-import-dialog/tasks.md` | T0–T14 `[x]` y nota de C7 en T14 |
| `progress/current.md` | bitácora |

## Verificación (última ejecución, 2026-09-15)

| Comando | Resultado |
|---|---|
| `pnpm type-check` | OK (`vue-tsc --build` sin errores) |
| `pnpm lint` | OK (`oxlint . --fix` sin avisos ni cambios) |
| `pnpm test:unit` | **31 ficheros, 438 tests, todos verdes** (antes: 18 / 254) |
| `pnpm build` | OK; `index-*.js` 147,47 kB (54,00 kB gzip), CSS 27,78 kB |
| `pnpm test:e2e --project=chromium` | 3/3 verdes sin backend (smoke + 2 del modal) |
| `./init.sh` | `[OK] Entorno listo` (type-check, 438 tests, e2e chromium verde) |
| `npx prettier --check src e2e` | todos los archivos formateados |
| `grep -rn "fetch(" src --include=*.vue` | vacío |
| `git diff package.json pnpm-lock.yaml` | vacío |

Salida final de `./init.sh` (resumen):

```
[OK]    feature_list.json válido (14 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
 Test Files  31 passed (31)
      Tests  438 passed (438)
[OK]    Todos los tests pasan
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Revisión visual:** capturas en Chromium de la barra, la confirmación, la fase importando y el
resultado parcial (con Details abierto), con un dev server propio en el puerto libre **5199**
y la API mockeada; ese servidor se paró al terminar. Se ve oscuro, el panel se distingue del
scrim por el borde y el botón de la barra pasa a «Importing…». Las capturas no se guardan en
el repo.

## Lo que no se pudo probar

- **C7, comprobación contra el backend real: no hecha.** Durante toda la sesión no había nada
  escuchando en `:3000` ni en `:5173` (`curl` → sin respuesta), así que ni siquiera se pudo
  mirar el `GET /api/ingestion/pending` real. El `POST /api/import` real **no se ejecutó**
  (prohibido por el leader: mueve archivos en Drive, crea cuentas y reescribe traspasos y
  categorías). **Hace falta proponérselo al humano:** primero abrir el modal con el backend en
  marcha (solo GET, sin efectos) y, si quiere, importar de verdad con su visto bueno, idealmente
  con un archivo ya importado («Already imported»), comprobando que el aviso baja y Patrimonio
  se recarga. Es también la única forma de confirmar contra el backend real que el POST sin
  `Content-Type` no da 400 y que `parseImportReport` acepta un informe real completo.
- **e2e en Firefox y WebKit:** solo se ejecutó chromium (lo que exige la puerta).
- **Corte del navegador en un POST largo** (sin timeout): no simulado; por diseño llegaría como
  `API_NETWORK` → «Couldn't reach the server» con el aviso de «may already have been imported»,
  que sí está probado con un fallo de red.
- **Lector de pantalla real:** la región `aria-live` y la trampa de foco están verificadas en el
  DOM (jsdom) y el foco en Chromium, no con NVDA/VoiceOver.

## Incidencia de finales de línea (sin cambio de contenido)

Las ediciones hechas con scripts de Python en Windows escribieron CRLF. Al normalizar a LF
(la regla del repo: `.editorconfig` y `.gitattributes` `eol=lf`) el barrido afectó también a
archivos **ajenos** a esta feature que ya estaban en el árbol de trabajo con CRLF:
`.claude/agents/*.md`, `AGENTS.md`, `CHECKPOINTS.md`, `CLAUDE.md`, `docs/{decisions-template,
roadmap,specs,summary-template,verification}.md`, `feature_list.json`, `init.sh`,
`progress/{implementation,reviews,summaries}/{fundamentos,net-worth-view}.md`,
`specs/README.md`, `specs/13-import-dialog/{decisions,design,requirements}.md` y
`specs/14-import-report-details/*`. **Solo cambió `\r\n` → `\n`**: git normaliza a LF, así que
`git diff` no muestra ninguna diferencia de contenido en ellos. Se avisa por transparencia,
sobre todo por la F14.

## Cambios tras la revisión (2026-09-15)

Notas del reviewer (`progress/reviews/import-dialog.md`, APPROVED condicionado a C7). Sin
cambiar status, sin commit, sin tocar `:3000`/`:5173` y sin `POST /api/import` real.

1. **Texto libre tolerante en el informe.** El validador `asString` no existía: se añade a
   `src/shared/validation.ts` (cualquier string, vacío incluido; rechaza lo que no es string con
   `… is not a string`). En `src/features/import/service.ts` pasan de `asText` a `asString` los
   textos libres que el contrato no promete rellenar: `name` (pendientes y archivos del informe),
   `account.alias`, `error.message` (archivos, `transfers`, `categorization`), `reason` (skipped y
   `unparsedRows`), `product.name`, `accountAlias` (descuadres y traspasos), `description`
   (traspasos ambiguos y conflictos), `matchText` y `categoryName`. Siguen estrictos (no vacíos)
   la estructura, identificadores y códigos: `bank`, `year`, `fileId`, `iban`, los `type`,
   `check`, `error.code` y `status` (`asMember`). `fileIssueDetails` devuelve `null` si el
   original viene vacío, para no pintar un «Details» vacío.
   Tests: `service.spec.ts` «accepts empty free text but keeps identifiers and codes strict
   (review)»; `validation.spec.ts` (`asString`); `fileMessages.spec.ts` (`reason: ''` → `null`).
2. **`revolut` → «Revolut»** en `src/shared/banks.ts`, con su caso en `banks.spec.ts`.
3. **200 con cuerpo no JSON → informe ilegible.** Arreglo pequeño en `src/services/http.ts`: si
   `JSON.parse` falla en una respuesta 2xx se lanza `ValidationError`
   (`<ruta>: response body is not JSON`, con `cause`) en vez de dejar escapar un `SyntaxError`
   (`UNKNOWN`). El store ya traduce `ValidationError` a `reportUnreadable`. Para la comprobación
   de pendientes sigue siendo «Couldn't reach the server» (R6 trata igual una respuesta que no
   valida). Features 7 y 9: su store convierte cualquier error en `error`; solo cambia el código
   del error (`VALIDATION` en vez de `UNKNOWN`) en ese caso raro, y sus tests
   (`src/features/net-worth/__tests__/`) siguen **sin tocarse** y verdes.
   Tests: `http.spec.ts` «throws a ValidationError when a 2xx body is not JSON»;
   `store.spec.ts` «reports an unreadable report on a 200 whose body is not JSON (review)».

Las referencias `archivo:línea` de las secciones anteriores pueden haberse desplazado unas
líneas en `service.ts`, `validation.ts`, `http.ts` y los specs tocados.

**Verificación tras los cambios:**

| Comando | Resultado |
|---|---|
| `pnpm type-check` | OK |
| `pnpm lint` | OK |
| `pnpm test:unit` | 31 ficheros, **443 tests** verdes |
| `pnpm build` + `CI=true E2E_PREVIEW_PORT=8099 pnpm test:e2e --project=chromium` | 3/3 verdes, contra el build servido en el puerto libre 8099 (no se usó `:5173`); servidor parado al acabar |
| `npx prettier --check src e2e` | OK |

## Sugerencias fuera de scope (no aplicadas)

1. **Documentar la trampa de `tailwind-sources.spec.ts`** en `docs/stack.md`: un identificador
   de código que coincida con una sonda (`container`) rompe el test aunque no sea una clase.
2. **`BaseDialog` sin scroll interno:** con muchos archivos en «Needs attention» el panel puede
   crecer más que la ventana. La F14 ya prevé tocarlo.
3. **Tras un 503 al comprobar**, el aviso de la barra desaparece (pendientes a `null`) hasta la
   siguiente consulta; es lo que pide R3, pero conviene tenerlo presente al probar en real.
4. `docs/stack.md` (sección de Lucide) sigue citando «los 5 iconos del shell» de la feature 8
   como dato histórico; podría actualizarse con el recuento actual del bundle.
