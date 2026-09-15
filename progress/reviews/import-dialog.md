# Review — feature 13 `import-dialog`

**Veredicto:** APPROVED (condicionado a C7: prueba contra el backend real, que decide el humano)

- **Fecha:** 2026-09-15
- **Agente:** reviewer
- **Contrastado contra:** `specs/13-import-dialog/{requirements,design,tasks,decisions}.md`, `feature_list.json` (intent + 12 acceptance de la 13), `docs/{specs,verification,conventions,architecture,stack}.md`, `CHECKPOINTS.md`, `../gastos-backend/docs/api-contract.md` §`GET /api/ingestion/pending`, §`POST /api/import`, §`POST /api/category-rules/apply` (solo lectura) y `gastos-backend/src/modules/import/import.types.ts` (solo lectura), `progress/implementation/import-dialog.md`, `git diff --ignore-cr-at-eol` + `git status`.
- **Método:** tests leídos uno a uno (no la tabla del informe); para cada R se comprobó que la aserción cae si se rompe el requisito.
- **Seguridad:** no se lanzó ningún `POST /api/import`. No se tocó `:3000` ni `:5173`: el e2e y `./init.sh` se corrieron con `CI=true E2E_PREVIEW_PORT=8099` (preview del build). `pnpm lint` se sustituyó por `npx oxlint .` **sin `--fix`** para no modificar código (mismo linter, misma config).

## Evidencia (ejecutada por el reviewer)

| Comando | Resultado |
|---|---|
| `pnpm type-check` | exit 0 |
| `npx oxlint .` (equivalente a `pnpm lint` sin `--fix`) | exit 0, sin avisos |
| `pnpm test:unit` | 31 ficheros, 438 tests, verdes |
| `pnpm build` | exit 0 |
| `CI=true E2E_PREVIEW_PORT=8099 pnpm test:e2e --project=chromium` | 3 passed (smoke + 2 del modal), sin backend |
| `CI=true E2E_PREVIEW_PORT=8099 ./init.sh` | `[OK] Entorno listo` (14 features, specs `<nn>-<name>` OK, tsc OK, 438 tests, e2e chromium verde) |
| `git diff package.json pnpm-lock.yaml` | vacío |
| `git -C ../gastos-backend status --short` | vacío (backend intacto) |
| grep de `fetch(` en `src/**/*.vue` | vacío |
| `git status src/features/net-worth/__tests__/` | sin cambios |

## Trazabilidad requirements ↔ tests (SDD)

- R1: [x] `AppShell.spec.ts:93` (botón dentro de `header` en `/net-worth`, `/overview`, `/nope`; la sidebar no lista Import); `ImportButton.spec.ts:85` (primario con icono, habilitado), `:96` (store en `importing` → texto `Importing…` y `disabled`).
- R2: [x] `ImportButton.spec.ts:70` (1 GET al montar; timers falsos +10 min → sigue 1); `store.spec.ts:41` (`refreshPending` 1 GET y guarda), `:86` (`open()` actualiza `pending`), `:192` / `:205` / `:231` (tras 200, 503 e informe ilegible → 2.º GET).
- R3: [x] `ImportButton.spec.ts:39` (`3 new files`), `:46` (`1 new file`), `:53` (0 → sin aviso), `:60` (503 → sin aviso y `header` solo dice `Import`); `summary.spec.ts:85`.
- R4: [x] `ImportDialog.spec.ts:88` (tras el clic, fase `checking` con su texto y exactamente `[GET_PENDING]`); `store.spec.ts:63`.
- R5: [x] `store.spec.ts:76` (0 → `upToDate`, 0 POST), `:86` (2 → `confirm`); `ImportDialog.spec.ts:120` (textos exactos, solo Close, 0 POST), `:155` (lista, nota, Cancel e `Import 2 files`), `:173`; `PendingList.spec.ts:12` (banco → año → archivo), `:30` (`newbank` tal cual), `:36` (más de 8 → `<details>` cerrados con `Bankinter · 5 files`).
- R6: [x] `store.spec.ts:106` (503 `DRIVE_CONNECTION_ERROR` → `drive`, `pending` a null), `:117` (500, red, JSON que no valida → `server`), `:144` (retry → `checking` → `confirm`, 2 GET); `ImportDialog.spec.ts:186`, `:200` (textos exactos y Try again vuelve a comprobar); `service.spec.ts:181`, `:197` (`isDriveError`, también a través del cliente HTTP real).
- R7: [x] `service.spec.ts:55` (`method: 'POST'`, `body` indefinido, `Headers` sin `content-type`); `store.spec.ts:162` (3 × `start()` con el POST pendiente → 1 POST, también tras resolver); `ImportDialog.spec.ts:219` (triple clic → 1 POST); `e2e/import-dialog.spec.ts:129` (Chromium: 1 petición, `postData() === null`, sin `content-type` en `allHeaders()`).
- R8: [x] `store.spec.ts:179` (`close()` en `importing` no cambia `flow`); `ImportDialog.spec.ts:237` (Esc en `document` + clic en scrim → sigue abierto; sin `dialog-close`; acción y botón de barra `disabled`; foco en el panel). Doble capa: guard del store y `:dismissible` de `BaseDialog` (`BaseDialog.spec.ts:136`).
- R9: [x] `outcome.spec.ts:21-71` (4 titulares; bordes sin archivos, todo duplicados, solo productos; los 7 motivos de «things to check»); `summary.spec.ts:28-80` (contadores, línea con plurales y partes omitidas, `null`; frase singular/plural/null); `ImportSummary.spec.ts:12`, `:29`, `:37` (sin `<a>`), `:45`; `ImportDialog.spec.ts:261`.
- R10: [x] `fileMessages.spec.ts:25-47` (9 códigos con texto exacto), `:51` (desconocido, incluido `constructor` contra el prototipo), `:56` (sin `error`), `:60` (`skipped`), `:74` (details = `error.message` / `reason` / null), `:84`; `FileIssueList.spec.ts:13`, `:30` (`<details>` cerrado, `lang="es"`, original), `:45` (nada sin archivos); `e2e/import-dialog.spec.ts:129`.
- R11: [x] `store.spec.ts:205` (503 drive → `importFailed` `drive`), `:218` (500 y red → `server`), `:231` (200 con `files: {}` → `reportUnreadable` con `ValidationError`), `:260` (retry → comprobar, sigue 1 POST); `ImportDialog.spec.ts:287` (3 variantes: título + «Some files may already have been imported…», sin «Nothing has been imported»), `:309`, `:321` (ilegible: texto exacto, solo Close); `e2e/import-dialog.spec.ts:152`.
- R12: [x] `store.spec.ts:275` (con `netWorth` cargado: 200, 503 e ilegible → 2 GET a `/api/net-worth`), `:297` (nunca cargado → 0).
- R13: [x] `http.spec.ts:98` (`apiCode`, `code === API_HTTP`, `status 503`, `message` `HTTP 503: Drive unavailable`), `:120` (no JSON → undefined, mensaje de `statusText`), `:132` (JSON sin `code`), `:144` (red → `API_NETWORK`, undefined). Tests previos de `http.spec.ts` intactos (el diff solo añade) y `errors.spec.ts` sin tocar.
- R14: [x] `BaseDialog.spec.ts:49` (`role`, `aria-modal`, `aria-labelledby` → título), `:74` y `:80` (foco inicial / panel), `:86` (Tab último → primero, Shift+Tab al revés), `:108` (sin enfocables), `:117` y `:136` (Esc, scrim, X solo con `dismissible`), `:146` y `:173` (devolución del foco al cerrar y al desmontar); `ImportDialog.spec.ts:104`, `:120` (foco en Close), `:142` (foco vuelve al botón Import), `:155` (foco en `Import 2 files`), `:186` (foco en Try again).
- R15: [x] `ImportDialog.spec.ts:338` (mismo nodo `aria-live="polite"` pasa por checking → found → importing → titular); `summary.spec.ts:100` (texto por fase).
- C1: [x] `router.spec.ts:19` (4 rutas), `:45` (`/import` no resuelve), `navEntries` sin Import; `AppShell.spec.ts:73` (usa `/investments`).
- C2: [x] `validation.spec.ts:21-45` (mensaje exacto por validador); `net-worth/__tests__/` sin editar y verde; `banks.spec.ts:12`, `:16`; `breakdown.ts` reexporta `bankLabel`.
- C3: [x] `expectEnglishOnly()` en todas las fases de `ImportDialog.spec.ts`; `theme-dark.spec.ts` verde con las 6 líneas nuevas y «has no raw colors» sobre todos los `.vue` de `src/`.
- C4: [x] `e2e/app-boot.spec.ts:49`; `e2e/import-dialog.spec.ts:129`, `:152`.
- C5 y C6: [x] ver §Evidencia.
- C7: [ ] **pendiente** (sin backend durante la implementación; POST real prohibido). Justificado en `tasks.md` T14 y en `progress/implementation/import-dialog.md` → *Lo que no se pudo probar*. Lo decide el humano.

## Tasks completas (SDD)

- T0–T13: [x] marcadas y contrastadas con código y diff (T0: `page.route` de pendientes justificada; líneas de contraste en `theme-dark.css:37` y `:100-104`; iconos existentes).
- T14: [x] salvo C7, con justificación escrita en `specs/13-import-dialog/tasks.md:122-125`.

## Criterios de aceptación (feature_list.json)

- [x] 1 Botón en todas las rutas + aviso con más de 0; oculto con 0 o fallo, sin error → R1, R3.
- [x] 2 Sin `/import` ni entrada de sidebar → C1 (`src/router/index.ts` sin la ruta ni `FileUp`).
- [x] 3 Modal: nada que importar / confirmación por banco y año / error con reintento → R4, R5, R6.
- [x] 4 Un único POST sin body ni `Content-Type`; no cerrable durante (Esc, fondo, X) → R7, R8.
- [x] 5 Titular, contadores, fallidos y omitidos con explicación por `error.code`, genérico para desconocido/skipped y original como detalle → R9, R10.
- [x] 6 503 o fallo durante la importación advierte y dice que reintentar es seguro; informe ilegible comunicado como tal → R11.
- [x] 7 Refresco de pendientes y recarga de Patrimonio solo si cargado → R2, R12.
- [x] 8 `ApiError.apiCode` sin cambiar `code`; validación compartida sin romper net-worth → R13, C2.
- [x] 9 Accesibilidad del modal → R14, R15.
- [x] 10 Inglés, oscuro con tokens, contraste medido, componentes portados → C3; `BaseButton`, `BaseSpinner`, `BaseDialog` con tests.
- [x] 11 Smoke e2e verde sin backend respondiendo pendientes → C4.
- [x] 12 type-check, lint, test:unit, build, `./init.sh` verdes → §Evidencia.

## Decisiones del humano (decisions.md)

- [x] Confirmación con lista antes de importar (`ImportDialog.vue:30-44`, `:100-107`).
- [x] Refresco del aviso al montar, al abrir y al terminar, sin sondeo (`ImportButton.vue:33`, `store.ts:36-54`, `:74-80`).
- [x] No cerrable mientras importa; botón de barra `Importing…` deshabilitado (`ImportDialog.vue:6`, `store.ts:83-84`, `ImportButton.vue:6-11`).
- [x] Errores por tipo en inglés con original español plegado (`fileMessages.ts:7-20`, `FileIssueList.vue:18-23`).
- [x] Frase de revisión sin enlace (`ImportSummary.vue:31`, test `ImportSummary.spec.ts:37`).
- [x] Progreso por fases, sin tocar backend (`ImportPhases.vue`).
- [x] Botón en la barra en toda la app; fuera `/import` (`AppShell.vue:5-9`, `AppTopBar.vue:8-10`).
- [x] Lista abierta de bancos (`src/shared/banks.ts:14`).
- [x] Técnicas 1–9 presentes: `errors.ts:36`; `validation.ts:29`; `banks.ts`; Try again vuelve a comprobar (`store.ts:89-93`); recarga condicional (`store.ts:76-79`); sin `/health/drive`; modal a mano con borde (`BaseDialog.vue:15`); skipped defensivo; informe ilegible como «may have been imported».

## Arquitectura (docs/architecture.md)

- [x] Vista → store → service: ningún `.vue` llama a `fetch`; `service.ts` usa el `http` compartido y mapea a tipos propios (`types.ts`).
- [x] Componentes tontos (`PendingList`, `ImportSummary`, `FileIssueList`, `ImportPhases` solo reciben props); lógica pura en `outcome.ts`, `summary.ts`, `fileMessages.ts`.
- [x] Dependencias nuevas documentadas: shared → feature (`AppShell` monta `ImportButton`) e import → net-worth (store), en `docs/architecture.md`.
- [x] Tipos propios; nada compartido con el backend.

## Convenciones (docs/conventions.md)

- [x] Nombres, comentarios y textos de UI en inglés; originales del backend solo dentro de `lang="es"`.
- [x] Tokens semánticos, sin colores crudos (test verde), sin `@apply`, clases literales; Lucide por nombre.
- [x] Errores: todo pasa por `toAppError`; `ValidationError` con contexto y ruta del campo; las acciones del store no lanzan.
- [x] Sin `console.log`, TODO ni FIXME en los archivos nuevos.

## Verificación (docs/verification.md)

- [x] Recursos correctos: `fetch` mockeado solo en la frontera (store, service y http reales en los tests de componentes); Pinia real; `attachTo: document.body` para Teleport y foco; e2e en Chromium real con `page.route`.
- [x] Tests verifican salida concreta (textos exactos, recuentos de peticiones, cuerpo y cabeceras del POST, nodos del DOM, `document.activeElement`), con caminos de error en cada capa.

## Parseo del informe contra el contrato

- [x] `files[]` discriminado en orden fijo: `status === 'skipped'` → skipped (`service.ts:120`); clave `product` presente aunque sea `null` → producto (`:130`); resto → extracto. `status` estricto con `asMember` (`:128`); `code`, `check` y los `type` abiertos con `asText`. `error` ausente → `null` (`:74-83`). `transfers` y `categorization` (misma forma que `POST /api/category-rules/apply`) parseados enteros con su `error` opcional. Contrastado con el ejemplo del contrato y con `import.types.ts` (skipped sin `error`, failed con `error` opcional, producto fallido con `product: null`).

## e2e: ningún POST real

- [x] `e2e/import-dialog.spec.ts:109` registra primero `**/api/**` → `abort` y después las rutas simuladas (en Playwright gana la última registrada): cualquier `/api` no prevista se aborta, nunca se proxya.
- [x] `e2e/app-boot.spec.ts` no tiene esa red de seguridad, pero no pulsa el botón: no puede emitir un POST (spec leído entero).

## Alcance

- [x] Nada de F14 pintado: sin filas no leídas, descuadres, traspasos ambiguos ni conflictos en la UI (solo se parsean).
- [x] Sin dependencias nuevas; backend intacto.
- [x] Ruido ajeno (renombrado de specs, rutas en el harness, `init.sh`, roadmap, alta F13/F14, `progress/current.md`): `git diff --ignore-cr-at-eol` solo muestra cambios de ruta y de alta; la F13 no alteró su contenido. `specs/14-import-report-details/` está sin trackear, así que su «solo EOL» **no se puede verificar con git**: se acepta la declaración del implementer.

## CHECKPOINTS.md

- [x] C1 — Arnés completo (`./init.sh` exit 0).
- [x] C2 — Estado coherente (solo la 13 en `in_progress`; `current.md` describe la sesión).
- [x] C3 — Arquitectura (estructura documentada, sin dependencias nuevas, sin logs de debug, convenciones).
- [x] C4 — Verificación real (tests por módulo, feliz + error, e2e real).
- [ ] C5 — Sesión cerrada bien: falta la entrada de la F13 en `progress/history.md` y pasar la 13 a `done`. Es parte del cierre del flujo tras este veredicto; no bloquea.
- [x] C6 — Coherencia con proyecto hermano: solo consume endpoints existentes del contrato; nada inventado.
- [x] C7 — SDD: 4 archivos, 0 puntos 🔴, 15 R en EARS con procedencia completa, tasks `[x]` (T14 con C7 justificado), cada R con test.
- [x] C8 — Resumen de cierre escrito.

## Resumen de cierre

- Escrito en `progress/summaries/import-dialog.md` → sí

## Condición (C7)

Aprobado condicionado a la prueba contra el backend real, que decide el humano: (1) abrir el modal con el backend arrancado (solo GET, sin efectos); (2) si lo autoriza, importar de verdad, idealmente con un archivo ya importado. Es la única forma de confirmar que el POST sin `Content-Type` no da 400 y que `parseImportReport` acepta un informe real completo.

## Notas no bloqueantes

1. `service.ts:210` y `:231` validan con `asText` (no vacío) la `description` de traspasos ambiguos y conflictos; el contrato la da «tal cual la da el banco» y no garantiza que no esté vacía. Si llega vacía, el informe entero sale como «report couldn't be read». Vigilarlo en C7; si ocurre, aceptar vacío en esos campos (encaja en la F14).
2. Un 200 con cuerpo no JSON lanza `SyntaxError` en `src/services/http.ts:72` → `UNKNOWN` → `importFailed` «Couldn't reach the server» en vez de `reportUnreadable`. El texto sigue avisando de que pudo importarse (no engaña), pero el título no es exacto.
3. `bankLabel` (`src/shared/banks.ts:5-11`) no incluye `revolut`, que el importador ya lee: saldría el slug tal cual. Previsto por la lista abierta, pero es una línea.

## Cambios requeridos

Ninguno.

## C7 — Prueba contra el backend real (leader, 2026-09-15)

Condición del veredicto «APROBADO CONDICIONADO A C7». Ejecutada por el leader con
autorización explícita del humano, con backend (`:3000`) y dev server (`:5173`)
arrancados por él. Navegador Chromium con Playwright (script temporal fuera del
repo, ya borrado).

- **Sin pendientes:** `GET /api/ingestion/pending` → `{"totalPending":0}` en ~3,9 s.
  Sin aviso en la barra; el modal pasa de «Checking Drive for new files…» a
  «You're up to date». Esc cierra y el foco vuelve a «Import». Sin errores de consola.
- **Con un archivo:** el humano devolvió `revolut/2025/revolut_2026-09-15.csv`
  (ya importado) desde `procesados/`. Aviso «1 new file»; confirmación con
  «Revolut · 2025 · revolut_2026-09-15.csv» y «Import 1 file».
- **POST real:** `POST /api/import` salió **sin body y sin `Content-Type`**
  (cabeceras capturadas: solo `accept: application/json` y las del navegador) →
  **200** en ~5,4 s. Durante la importación Esc no cerró el modal.
- **Informe real parseado sin error:** `importedCount 0`, `duplicateCount 35`,
  archivo `imported` con `movedToProcessed: true`; `categorization.conflictCount 1`
  (pasada sobre toda la BD) → titular «Imported, with a few things to check» y
  contadores New movements 0 / Already imported 35 / Investment files updated 0 /
  Files not imported 0. El conflicto no se detalla: es alcance de la F14.
- **Después:** se repitieron `GET /api/ingestion/pending` y `GET /api/net-worth`
  (Patrimonio estaba cargado); el aviso desapareció. Sin errores de consola.

**Resultado: C7 superada. Veredicto final: APPROVED.**
