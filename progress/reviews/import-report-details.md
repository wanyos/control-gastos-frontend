# Review — feature 14 `import-report-details`

**Veredicto:** APPROVED

Revisado el 2026-09-15 contra `specs/14-import-report-details/` (decisions, requirements,
design, tasks), el `acceptance` de la feature 14, `docs/{specs,verification,conventions,architecture}.md`,
`CHECKPOINTS.md`, el contrato `../gastos-backend/docs/api-contract.md` (solo lectura) y el
informe `progress/implementation/import-report-details.md`.

## Trazabilidad requirements ↔ tests (SDD)

Rutas: `import/` = `src/features/import/__tests__/`. Todos los tests leídos; cada uno falla si se
rompe el requisito (textos exactos, orden con `toEqual`, cifras generadas con `formatMoney`/`formatDate`).

- R1: [x] `import/details.spec.ts:38` (orden exacto), `:51` (vacías fuera; limpio → solo `imported-files`; sin archivos → nada); `import/ImportDetails.spec.ts:42`, `:83`, `:90`; `import/ImportDialog.spec.ts:282` (`compareDocumentPosition` FileIssueList → ImportDetails)
- R2: [x] `import/ReportSection.spec.ts:13`, `:22`; `import/ImportDetails.spec.ts:56` (las 5 cerradas, título y recuento); `import/details.spec.ts:63` (recuento del total, 42, no de las filas pintadas)
- R3: [x] `import/FinalPassAlerts.spec.ts:22`, `:33`, `:42`, `:49` (fuera de `<details>`, Details cerrado con `lang="es"`), `:62`; `import/ImportDetails.spec.ts:75`
- R4: [x] `import/BalanceMismatchList.spec.ts:19` (cuenta · fecha, tres rótulos, cifras con `formatMoney`), `:42` (`font-mono`, `tabular-nums`), `:51` (dos grupos por archivo con banco legible)
- R5: [x] `import/details.spec.ts:114`, `:121`, `:129`; `import/BalanceMismatchList.spec.ts:78`
- R6: [x] `import/details.spec.ts:160` (3), `:171` (6 → `and 1 more line`), `:182` (42 → `and 37 more lines`), `:189` (fallido `ALL_ROWS_UNPARSED`); `import/UnreadLineList.spec.ts:12`, `:24` (`lang="es"`), `:32`
- R7: [x] `import/details.spec.ts:207`, `:231`; `import/AmbiguousTransferList.spec.ts:45` (grupo del contrato, 3 movimientos, Out/In), `:73` (`lang="es"`), `:83` (12 → 10 + `and 2 more groups`)
- R8: [x] `import/CategoryConflictList.spec.ts:14`, `:30` (`lang="es"` en descripción, matchText y categoría), `:43` (11 → 10 + `and 1 more movement`); `import/details.spec.ts:216`
- R9: [x] `import/ImportedFileList.spec.ts:26`, `:41` (`39 new · 2 already imported`, New account + alias), `:51`, `:58` (slug desconocido); `import/details.spec.ts:243`, `:254`, `:275`
- R10: [x] `import/ImportedFileList.spec.ts:82` (Fund, New product, Value as of), `:93` (depósito sin foto, `crypto` tal cual); `import/details.spec.ts:279`, `:298`
- R11: [x] `import/ImportedFileList.spec.ts:66` (nota, plural, singular, 0 → nada); `import/details.spec.ts:264`; `import/ImportDetails.spec.ts:140`
- R12: [x] `import/ImportDetails.spec.ts:123` (todo desplegado: 0 `button`, 0 `a`, `fetch` sin llamadas); `import/AmbiguousTransferList.spec.ts:83`; `import/CategoryConflictList.spec.ts:43`
- R13: [x] `src/shared/components/__tests__/BaseDialog.spec.ts:68` (clases del panel/cuerpo/pie; pie y título fuera del cuerpo); `e2e/import-dialog.spec.ts:244` (1280×720, todo desplegado, cuerpo desbordado y desplazado, Close y título `toBeInViewport()`, panel ≤ 720, sin errores de consola)
- R14: [x] `import/ImportDetails.spec.ts:112` (`it.each` sobre los 7 disparadores, `fixtures.ts:569`; comprueba antes que el titular real de `importOutcome` es «things to check»). El caso `category conflicts` cubre el informe real de la F13 (solo `conflictCount > 0` → sección `conflicts`, `details.ts:75-79`).

## Tasks completas (SDD)

- T0 a T11: [x] todas marcadas en `specs/14-import-report-details/tasks.md`.

## Criterios de aceptación

- [x] 1 Orden fijo y vacías fuera → R1
- [x] 2 Plegables, cerradas, título y recuento; fallos siempre visibles → R2, R3
- [x] 3 «Your imported movements are safe.» + original plegado `lang="es"` → `FinalPassAlerts.spec.ts:22`, `:49`
- [x] 4 Descuadres con `money.ts` y `check` traducido → R4, R5
- [x] 5 5 filas / 10 elementos + «and N more», `lang="es"` → R6, R7, R8
- [x] 6 Archivos importados, producto/tipo/foto, New account / New product → R9, R10
- [x] 7 Solo lectura, sin HTTP → R12
- [x] 8 Modal limitado a la ventana (e2e) → R13
- [x] 9 Inglés, tokens semánticos, contraste verificado; sin backend ni dependencias; F13 intacta → `ImportDetails.spec.ts:153`, `theme-dark.spec.ts` verde con `theme-dark.css:38-40`; `git diff` vacío en `package.json`, `pnpm-lock.yaml` y `types/service/store/outcome/summary/fileMessages.ts`
- [x] 10 Puerta verde → ver Verificación

## Decisiones del humano (decisions.md)

- [x] Rojo 1: secciones cerradas con título y recuento (`ReportSection.vue:2-17`); fallos siempre abiertos (`FinalPassAlerts.vue`, fuera de `<details>`)
- [x] Rojo 2: topes 5 / 10 con «and N more», sin «Show all» (`details.ts:21-22`, `:132-164`)
- [x] Rojo 3: «Imported files» siempre, al final y plegada, también en informe limpio (`details.ts:80-84`, `ImportDetails.spec.ts:83`)
- [x] Rojo 4: ancla y saldos como nota por archivo, sin totales (`details.ts:213-230`)
- [x] Rojo 5: cuenta · fecha, nombre + explicación, tres cifras en columna `<dl>` (`BalanceMismatchList.vue`)
- [x] Rojo 6: panel `max-h-[calc(100dvh-40px)]`, cuerpo con scroll, título y pie fijos (`BaseDialog.vue:15-47`)
- Adaptaciones del informe (12): ninguna contradice lo decidido ni cambia lo visible de forma relevante. La 1 (mensaje vacío → sin «Details») sigue el criterio ya aceptado en la F13. La 10 (palabras enteras) no debilita el test: la subcadena `importe` daba falso positivo con «imported»; el test sigue quitando los nodos `lang="es"`, exige texto propio no vacío que contenga `imported` y busca las cuatro palabras prohibidas.

## Arquitectura (docs/architecture.md)

- [x] Componentes tontos por props; lógica pura y probada en `details.ts`
- [x] Sin HTTP en componentes; nada nuevo en store/service
- [x] Cambios en F13 limitados a lo permitido: `ImportDialog.vue:67` (montar el detalle) y `BaseDialog.vue` (solo clases y dos `data-test`; props, eventos, ARIA y foco sin cambios; tests previos de la F13 sin editar y verdes)
- [x] `FileHeadingLine.vue` justificado: la cabecera se repite en tres listas nuevas; no duplica nada reutilizable (la de `FileIssueList` es de la F13 y no se debía tocar)
- [ ] (no bloqueante, documental) `docs/architecture.md:65-66` no lista `details.ts` ni los componentes nuevos, y `:87-91` dice que entre features hay «una única dependencia»; la F14 añade `import → net-worth` (`details.ts:4`, `holdingTypeLabel`), declarada en design §3 y en el mismo sentido. Actualizar el doc al cerrar (tarea del leader).

## Convenciones (docs/conventions.md)

- [x] Inglés, `<script setup lang="ts">`, template primero, `data-test` coherentes con la F13
- [x] Solo tokens semánticos (grep sin colores crudos; «no raw colors» de `theme-dark.spec.ts` verde); 3 líneas `contrast:` nuevas y medidas
- [x] Importes y fechas solo con `formatMoney`/`formatDate`; grep sin `Intl.`, `Number(`, `parseFloat`, `parseInt` en los 10 archivos nuevos
- [x] Textos del backend en `lang="es"` (reason, message, description, matchText, categoryName)
- [x] `<details>/<summary>` nativo, accesible por teclado; sin `console.*` ni TODOs

## Verificación (docs/verification.md)

- [x] Componentes reales y `parseImportReport` real; solo se mockea `fetch` (frontera) y `/api` en e2e, con red de seguridad que aborta toda `/api` no prevista (`e2e/import-dialog.spec.ts:109`)
- [x] Salida concreta (textos exactos, orden, recuentos, atributos), no solo «no lanza»

Ejecutado por el reviewer (2026-09-15), sin tocar `:3000` ni `:5173` y sin ningún `POST /api/import` real:

| Comando | Resultado |
|---|---|
| `pnpm type-check` | exit 0 |
| `npx oxlint .` (sin `--fix`) | exit 0 |
| `pnpm test:unit` | 40 ficheros, 529 tests verdes |
| `pnpm build` | OK |
| `CI=true E2E_PREVIEW_PORT=8099 pnpm test:e2e --project=chromium` | 4/4 verdes (incluido «large report») |
| `CI=true E2E_PREVIEW_PORT=8099 ./init.sh` | exit 0, «Entorno listo» |

## CHECKPOINTS.md

- [x] C1 — Arnés completo (`./init.sh` exit 0)
- [x] C2 — Estado coherente (solo F14 `in_progress`; `progress/current.md` describe la sesión)
- [x] C3 — Arquitectura (con la nota documental de arriba; sin dependencias nuevas)
- [x] C4 — Verificación real (test por módulo nuevo; bordes: vacíos, mensaje vacío, tipos/slugs/checks desconocidos)
- [x] C5 — Sin archivos sospechosos sin trackear (`dist/`, `playwright-report/`, `test-results/` ignorados). Entrada de `progress/history.md` y `done`: al cerrar tras este veredicto.
- [x] C6 — Sin cambios de contrato; los campos usados existen en `api-contract.md` (`POST /api/import`; `conflicts` de `POST /api/category-rules/apply`)
- [x] C7 — SDD: 4 archivos, 6 puntos rojos, 14 R en EARS con procedencia, tasks `[x]`, cada R con test
- [x] C8 — Resumen de cierre escrito

## Resumen de cierre

- Escrito en `progress/summaries/import-report-details.md` → sí

## Cambios requeridos

Ninguno.

## Notas no bloqueantes

1. `docs/architecture.md:65-66` y `:87-91`: añadir `details.ts`, los componentes de la F14 y la dependencia `import → net-worth` (`holdingTypeLabel`).
2. Si el backend enviara un contador > 0 con su array vacío (fuera del contrato), la sección saldría con recuento y sin filas; aceptable porque los recuentos vienen de los totales (decisión técnica 4).
3. Sugerencias del implementer (contorno de foco recortado en el borde del cuerpo con scroll, separadores para lector de pantalla) quedan como mejoras posibles.
