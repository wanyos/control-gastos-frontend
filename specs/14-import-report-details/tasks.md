# Tasks — Feature 14: import-report-details

> Checklist ejecutable para el `implementer`, en orden. Cada task referencia los
> `R<n>` / `C<n>` de `requirements.md`. Marcar `[x]` al completar. **Se construye
> encima de la F13; no se tocan sus tipos, service, store ni lógica de resumen. No se
> toca el backend.**

- [x] T0 — Línea base, **antes de construir**. (a) Comprobar que la feature 13 está
  `done` en `feature_list.json` y que existen `src/features/import/{types,store,outcome}.ts`,
  `ImportDialog.vue`, `FileIssueList.vue` y `src/shared/components/BaseDialog.vue`; si
  no, **parar** con `blocked` («falta la F13»). (b) `./init.sh` en verde. (c) Añadir las
  líneas `contrast:` de design.md §7 que falten y pasar `theme-dark.spec.ts`; aplicar el
  plan B de §7 si alguna no llega. Anotar en `progress/implementation/import-report-details.md`.
  Cubre: C1, C4.

- [x] T1 — Fixtures en `src/features/import/__tests__/fixtures.ts` (sin tocar los de la
  F13): informe «todo limpio» (solo importados, sin avisos); un informe por disparador
  del titular «things to check» (skipped, unparsed, mismatch, ambiguous, conflict,
  `transfers.error`, `categorization.error`); extracto importado con `anchored: true` y
  `balancesFilled: 3` y otro con `balancesFilled: 1`; archivo con 42 filas no leídas y
  otro `failed` `ALL_ROWS_UNPARSED` con 6; 12 grupos ambiguos; 11 conflictos; producto de
  tipo desconocido (`crypto`); informe grande del e2e (design.md §8). Textos del backend
  en español. Cubre: soporte de R1-R14.

- [x] T2 — `src/features/import/details.ts` + `details.spec.ts` con textos exactos de
  design.md §3: `detailSections` (orden, omisión, recuentos); `finalPassFailures`;
  `checkLabel` (3 casos); `mismatchGroups`; `unreadLineGroups` (3 / 6 / 42 filas,
  fallido incluido); `visibleAmbiguous` y `visibleConflicts` (tope 10 y resto);
  `directionLabel`; `importedFileRows` (extracto con y sin cuenta nueva, notas y
  plurales; producto con y sin `snapshot`, tipo conocido y desconocido); `moreLabel`
  (0 → `null`, singular, plural). Cubre: R1, R2, R3, R5, R6, R7, R8, R9, R10, R11.

- [x] T3 — `ReportSection.vue` + `ReportSection.spec.ts` (`<details>` sin `open`, título y
  recuento en el `summary`, `data-test`). Cubre: R2.

- [x] T4 — `FinalPassAlerts.vue`, `BalanceMismatchList.vue`, `UnreadLineList.vue` + specs:
  avisos fuera de `<details>`, «Details» con `lang="es"`; descuadre con cifras vía
  `formatMoney`/`formatDate` (esperados generados, no tecleados), `font-mono
  tabular-nums`, agrupado por archivo; filas con `reason` en `lang="es"` y línea de
  resto. Cubre: R3, R4, R5, R6.

- [x] T5 — `AmbiguousTransferList.vue`, `CategoryConflictList.vue` + specs: frases de
  sección, tope de 10 y resto, `Out`/`In`, `description`/`matchText`/`categoryName` en
  `lang="es"`, ningún `button` ni `a`. Cubre: R7, R8, R12.

- [x] T6 — `ImportedFileList.vue` + spec: extracto (`39 new · 2 already imported`, badge
  `New account` + alias, notas de ancla y saldos rellenados), producto (tipo legible,
  `New product`, `Value as of`), slug de banco desconocido tal cual. Cubre: R9, R10, R11.

- [x] T7 — `ImportDetails.vue` + `ImportDetails.spec.ts`: orden de secciones con el
  fixture completo; solo `imported-files` en el informe limpio; nada sin archivos;
  encabezado «Things to check» solo con secciones 1-5; `it.each` de R14; todas
  desplegadas → 0 `button`/`a` y sin `fetch` nuevo; sin contadores
  `anchoredCount`/`balanceFilledCount`; texto sin español fuera de `lang="es"`.
  Cubre: R1, R2, R11, R12, R14, C1.

- [x] T8 — Integración: `<ImportDetails>` en la fase `finished` de `ImportDialog.vue`
  detrás de `FileIssueList`; caso nuevo en `ImportDialog.spec.ts` (orden). Los demás
  tests de la F13 sin editar. Cubre: R1, C4.

- [x] T9 — `BaseDialog.vue`: altura máxima y cuerpo con scroll (design.md §5); caso nuevo
  en `BaseDialog.spec.ts` (clases de panel, cuerpo `overflow-y-auto`, pie fuera del
  cuerpo); tests existentes intactos. Cubre: R13, C4.

- [x] T10 — e2e: escenario «large report» en `e2e/import-dialog.spec.ts` (design.md §8):
  todas las secciones desplegadas, Close en viewport y panel ≤ 720 px a 1280×720, sin
  errores de consola. `pnpm test:e2e --project=chromium` en verde sin backend.
  Cubre: R13.

- [x] T11 — Cierre: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build`,
  `./init.sh` verdes; `git diff package.json` sin dependencias; `git diff` sin cambios en
  `types.ts`, `service.ts`, `store.ts`, `outcome.ts`, `summary.ts`, `fileMessages.ts`;
  grep sin `Intl.` ni `Number(` en los archivos nuevos. Comprobación visual en `pnpm dev`
  con `page.route` o fixture (no hace falta importar de verdad: si se hace, **avisar
  antes al humano**, mismos efectos que en la F13). Mapa R↔test en
  `progress/implementation/import-report-details.md`. Cubre: C1, C2, C3, C5.
