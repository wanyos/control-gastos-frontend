# Tasks — Feature 13: import-dialog

> Checklist ejecutable para el `implementer`, en orden. Cada task referencia los
> `R<n>` / `C<n>` de `requirements.md`. Marcar `[x]` al completar. **No se toca el
> backend.** El detalle del informe (filas, descuadres, traspasos, conflictos) es la
> feature 14: aquí se parsea entero pero no se pinta.

- [x] T0 — Línea base y riesgos, **antes de construir**. `./init.sh` en verde. Anotar
  cada resultado en `progress/implementation/import-dialog.md`:
  (a) **e2e sin backend:** con el backend parado, montar provisionalmente en
  `AppShell` un componente que llame a `GET /api/ingestion/pending` al montar y lanzar
  el smoke en chromium; confirmar que se pone rojo (502 en consola) y que la
  `page.route` de design.md §10 lo devuelve a verde. Deshacer el montaje provisional.
  (b) **Contraste:** añadir las 6 líneas `contrast:` de design.md §9 a
  `theme-dark.css` y pasar `theme-dark.spec.ts`; si el borde del panel sobre el scrim
  no llega a 3, aplicar el plan B de §9 y anotarlo.
  (c) Confirmar en `node_modules/@lucide/vue` los nombres `FileUp`, `X`, `CircleCheck`,
  `Circle`, `CircleX`, `TriangleAlert` (sustituir por el equivalente si alguno cambió).
  Cubre: C3, C4.

- [x] T1 — `ApiError.apiCode` en `src/shared/errors.ts` y lectura de `code` del
  cuerpo en `src/services/http.ts` (design.md §2). Casos nuevos en `http.spec.ts`:
  503 con `code` → `apiCode`, `code === 'API_HTTP'`, `status` y `message` iguales que
  hoy; cuerpo no JSON y fallo de red → `apiCode` indefinido. Tests existentes sin
  tocar. Cubre: R13.

- [x] T2 — `src/shared/validation.ts` (`createValidators`) + `validation.spec.ts`
  (mensaje exacto `<context>: <path> is not <expected>` por validador). Migrar
  `net-worth/service.ts` a él. `src/features/net-worth/__tests__/` en verde **sin
  editarlo**. Cubre: C2.

- [x] T3 — `src/shared/banks.ts` (`bankLabel`) + `banks.spec.ts` (5 slugs y uno
  desconocido); reexport desde `net-worth/breakdown.ts`; `breakdown.spec.ts` sin
  cambios. De paso, actualizar el comentario de `src/shared/money.ts:4`, que cita
  `specs/net-worth-view/design.md`: la ruta es ahora `specs/09-net-worth-view/design.md`.
  Cubre: C2, R5, R10.

- [x] T4 — `src/features/import/types.ts` (design.md §4) y
  `__tests__/fixtures.ts`: (a) pendientes con 2 archivos en 2 bancos y con 0; más de 8
  archivos; slug desconocido `newbank`; (b) informe **completo** que incluya un extracto
  importado con `account.created: true`, `unparsedRows` y `balanceMismatches`, un
  extracto `failed` con `MISSING_ACCOUNT_DATA`, un `failed` sin `error`, un producto
  importado con `snapshot`, un depósito con `snapshot: null`, un **producto fallido con
  `product: null`**, un `skipped` con `reason` (caso defensivo: archivo no reconocido), `transfers` con un ambiguo y
  `categorization` con un conflicto (forma de `POST /api/category-rules/apply`); (c)
  informes de borde: sin archivos, todo duplicados, solo productos, todo fallido.
  Mensajes del backend en español, como los reales. Cubre: soporte de R5, R9, R10, R11.

- [x] T5 — `src/features/import/service.ts` (`getPendingFiles`, `runImport`,
  `parsePendingFiles`, `parseImportReport`, `isDriveError`) + `service.spec.ts`:
  mapea el fixture completo; discrimina `skipped` / `product` (por la **clave**, también
  con `product: null`) / `statement`; `error` ausente → `null`; `code` y `type`
  desconocidos aceptados; `status` desconocido → `ValidationError`; `files` no array →
  `ValidationError` con el contexto `POST /api/import`; `runImport` llama a `fetch` con
  `method: 'POST'`, sin `body` y sin `Content-Type`; `isDriveError` verdadero solo con
  `apiCode === 'DRIVE_CONNECTION_ERROR'`. Cubre: R6, R7, R11, R13.

- [x] T6 — `src/features/import/store.ts` (design.md §5) + `store.spec.ts` con `fetch`
  mockeado y Pinia de test: `refreshPending` guarda / fallo → `null` sin lanzar;
  `open` → `checking` → `upToDate` (0, sin POST) o `confirm`; fallo drive/server →
  `checkFailed` con su `kind` y `pending` a `null`; respuesta obsoleta tras `close()`
  ignorada; `start` ×3 → 1 POST; `close()` en `importing` sin efecto; 200 → `finished`;
  503 drive / 500 / red → `importFailed`; 200 inválido → `reportUnreadable`; tras cada
  resultado 1 GET de pendientes más; recarga de Patrimonio solo con `netWorth` cargado;
  `retry` desde ambos fallos → `checking`. Cubre: R2, R4, R5, R6, R7, R8, R11, R12.

- [x] T7 — Lógica pura `outcome.ts`, `summary.ts`, `fileMessages.ts` +
  `outcome.spec.ts`, `summary.spec.ts`, `fileMessages.spec.ts` con textos exactos de
  design.md §6 y §7: cuatro titulares y bordes; contadores; línea final con plurales y
  partes omitidas; frase de revisión singular/plural/`null`; los 9 códigos, desconocido,
  sin `error` y `skipped`; `pendingCountLabel`; `phaseAnnouncement` por fase.
  Cubre: R3, R9, R10, R15.

- [x] T8 — Componentes compartidos `BaseButton.vue`, `BaseSpinner.vue` (casos en
  `BaseComponents.spec.ts`: variantes, `loading` → spinner + `disabled` + `aria-busy`,
  sin atenuar) y `BaseDialog.vue` + `BaseDialog.spec.ts` (`attachTo: document.body`):
  atributos ARIA, `aria-labelledby`, foco inicial en `[data-autofocus]` o panel, trampa
  Tab/Shift+Tab, Esc y scrim emiten `close` solo con `dismissible`, X solo con
  `dismissible`, devolución del foco. Clases de design.md §8 (borde del panel incluido).
  Cubre: R8, R14, C3.

- [x] T9 — Componentes de la feature: `ImportPhases.vue`, `PendingList.vue`,
  `ImportSummary.vue`, `FileIssueList.vue` + sus specs (`PendingList.spec.ts`: grupos,
  slug desconocido, plegado > 8; `ImportSummary.spec.ts`: contadores, línea final, frase
  sin `<a>`; `FileIssueList.spec.ts`: `<details>` cerrado con `lang="es"`, nada sin
  archivos). Cubre: R5, R9, R10.

- [x] T10 — `ImportDialog.vue` y `ImportButton.vue` + `ImportDialog.spec.ts` y
  `ImportButton.spec.ts`: aviso con 3 / 1 / 0 / fallo; botón `Importing…` deshabilitado;
  1 GET al montar y ninguno más con timers falsos; clic → fase de comprobación con 1 GET;
  textos de cada fase y de los fallos; doble clic en «Import 2 files» → 1 POST; Esc y
  scrim durante la importación no cierran y no hay X; foco en la acción principal por fase
  y de vuelta al botón Import al cerrar; región `aria-live` estable con la frase de cada
  fase; ningún texto en español fuera de `lang="es"`. Cubre: R1, R3, R4, R5, R6, R8, R9,
  R11, R14, R15, C3.

- [x] T11 — Shell y router: slot `actions` en `AppTopBar.vue`; `ImportButton` en
  `AppShell.vue`; quitar `/import` (y `FileUp`) de `src/router/index.ts`; actualizar
  `router.spec.ts` (4 rutas, `/import` no resuelve) y `AppShell.spec.ts` (test de cambio
  de ruta con `/investments`; botón Import dentro de `header` en varias rutas).
  Cubre: R1, C1.

- [x] T12 — e2e: `page.route` de pendientes en `e2e/app-boot.spec.ts` (si T0 confirmó
  que hace falta) y `e2e/import-dialog.spec.ts` con los dos escenarios de design.md §10
  (informe parcial con 1 POST sin cuerpo ni `content-type`; 503 drive en el POST).
  `pnpm test:e2e --project=chromium` en verde sin backend. Cubre: R7, R9, R10, R11, C4.

- [x] T13 — Docs: `docs/architecture.md` (árbol: `shared/validation.ts`,
  `shared/banks.ts`, componentes base nuevos, `features/import/`) y `docs/stack.md`
  (validación compartida; `FileUp` pasa a la barra; e2e de humo también responde
  pendientes). Cubre: C2, C4.

- [x] T14 — Cierre: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build`,
  `./init.sh` verdes; `git diff package.json` sin dependencias; grep sin `fetch(` en
  `.vue`. Comprobación real con backend en `:3000` y `pnpm dev`: primero con 0
  pendientes (sin efectos). **Antes de importar de verdad, parar y avisar al humano**
  (mueve archivos a `procesados/` en Drive, crea cuentas y reescribe traspasos y
  categorías de toda la BD); con su visto bueno, probar idealmente con un archivo ya
  importado (sale `Already imported`) y comprobar que el aviso baja y Patrimonio se
  recarga. Mapa de trazabilidad R↔test en `progress/implementation/import-dialog.md`.
  Cubre: C5, C6, C7.
  > Nota del implementer (2026-09-15): hecho todo salvo C7. Sin backend en `:3000`
  > durante la sesión (ni el GET de pendientes se pudo probar en real) y el leader prohibió
  > el `POST /api/import` real. Queda para el humano; ver
  > `progress/implementation/import-dialog.md` → *Lo que no se pudo probar*.
  > **C7 superada (2026-09-15):** el leader, con autorización del humano, probó contra el
  > backend real (modal sin pendientes e importación de un archivo de Revolut ya importado).
  > Evidencia en `progress/reviews/import-dialog.md` → *C7 — Prueba contra el backend real*.
