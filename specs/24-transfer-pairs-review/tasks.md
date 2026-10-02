# Tasks — Feature 24: transfer-pairs-review

> Orden de ejecución. Cada task referencia los `R<n>` / `C<n>` que cubre. El
> implementer marca `[x]` al completarla. **La T22 no es del implementer.**

## Preparación

- [x] T0 — Comprobaciones previas, anotadas en `progress/implementation/transfer-pairs-review.md`:
  (a) qué devuelve `src/services/http.ts` ante un **204 sin cuerpo** y cómo lo resuelve
  ya el `DELETE` de `category-rules/service.ts`; (b) que `Link2` existe en la versión
  instalada de `@lucide/vue` y no se usa ya con otro significado; (c) que el par
  `warning` de `BaseBadge` está declarado en `theme-dark.css` con contraste ≥ 4.5:1.
  Cubre: C3, C4.

## La frontera: rutas y service

- [x] T1 — `src/shared/transfers.ts` (nuevo) con `TRANSFERS_PATH` y
  `AMBIGUOUS_TRANSFERS_PATH`. `src/features/statement/service.ts` importa el segundo
  de ahí y lo re-exporta con el mismo nombre; `getAmbiguousCount` no cambia. Los
  tests del extracto pasan **sin tocarlos**. Cubre: C5.
- [x] T2 — `src/features/transfers/types.ts` y `service.ts`: `getTransferPairs`,
  `getAmbiguousGroups`, `linkMovements`, `unlinkPair` (design §3). Cubre: R2, R3, R8,
  R15, C1.
- [x] T3 — `__tests__/service.spec.ts`: (a) el `POST` lleva **letra por letra**
  `{"movementIds":[<gasto>,<ingreso>]}` y método `POST`; (b) el `DELETE` codifica el
  `transferId` en la ruta; (c) una pareja cuya primera pierna no es `expense`, o con
  1 o 3 piernas, lanza `ValidationError`; (d) un grupo de 3 se reparte en `out`/`in`
  conservando el orden; (e) `pairs: []` y `ambiguous: []` son respuestas válidas.
  Cubre: R2, R3, R8, R15, C1.

## Lo puro

- [x] T4 — `pairs.ts`: `mentionsBizum`, `linkProblem`, `unlinkConsequence`,
  `groupKey`, `transferWriteError` y los textos de design §5. Cubre: R4, R5, R9, R11,
  R13, R14.
- [x] T5 — `__tests__/pairs.spec.ts`: (a) `mentionsBizum` es `true` para **las dos
  multas reales** (fixtures con sus conceptos **sin el nombre de nadie**: `BIZUM DE <persona> CONCEPTO multa`) y `false` para las **tres
  parejas buenas reales** de las fixtures y para un concepto con «BIZ» sin «UM»; con
  mayúsculas, minúsculas y en cualquiera de las dos piernas; (b) `linkProblem`:
  incompleto, misma cuenta, válido; (c) `unlinkConsequence` con 0, 1 y 2 piernas
  marcadas, texto literal; (d) `transferWriteError` para 400, 404 (unlink y link),
  409, red, `ValidationError` y 500, sin rastro del `message` del backend. Cubre: R4,
  R5, R11, R13.

## El store

- [x] T6 — `store.ts`: estado, `load`, `retryPairs`, `retryGroups`, `reloadBoth`,
  `requestUnlink`/`cancelUnlink`/`confirmUnlink`, `choose`, `link`, `undo`, `busy` y
  `notice` (design §4). Cubre: R2, R5, R6, R7, R8, R10, R12, R13, R14, C7.
- [x] T7 — `__tests__/store.spec.ts`, deshacer: 204 → se piden **las dos** listas y el
  aviso es el de R6 con `undo`; `undo` → `POST` con los ids de esa pareja en orden
  gasto, ingreso → aviso de R7 **sin** `undo`; 404 al deshacer → frase y recarga.
  Cubre: R6, R7, R13.
- [x] T8 — `__tests__/store.spec.ts`, enlazar: con elección válida → `POST` → 201 →
  recarga y aviso de R12; `undo` → `DELETE` con el `transferId` **del 201**; con
  elección inválida `link()` **no hace ninguna petición**; 409 → frase y recarga; 400
  → frase y **sin** recarga; tras recargar, las elecciones quedan vacías. Cubre: R10,
  R11, R12, R13, C7.
- [x] T9 — `__tests__/store.spec.ts`: una lectura que falla deja la otra `ready`
  (R14); mientras `busy`, una segunda escritura no sale; **ninguna petición del store
  usa un método distinto de `GET`, `POST` o `DELETE`, ni otra ruta que las dos de
  `shared/transfers.ts`** (espía sobre el cliente). Cubre: R14, R15, C1.

## La pantalla

- [x] T10 — `components/TransferPairRow.vue` y `TransferPairList.vue`: dos piernas con
  fecha, cuenta, concepto (`lang="es"`) e importe; etiqueta `Bizum` + frase cuando
  toca; botón `Unlink`. Cubre: R3, R4, C2, C3.
- [x] T11 — `components/UnlinkConfirmDialog.vue`: título, las dos piernas, la
  consecuencia y la línea de la memoria; `Cancel` con el foco. Cubre: R5.
- [x] T12 — `components/AmbiguousGroupCard.vue` y `AmbiguousGroupList.vue`: importe,
  columnas `Money out` / `Money in` con radios sin elegir, frase de misma cuenta,
  `Link these two`; grupo con una sola columna sin botón. Cubre: R8, R10, R11, C7.
- [x] T13 — `components/TransfersActionNotice.vue` (copia de
  `StatementActionNotice.vue`). Cubre: R6, R7, R12, R13, C5.
- [x] T14 — `views/TransfersView.vue`: aviso arriba; sección `Doubtful transfers`
  primero y `Linked pairs (N)` después, cada una con sus estados de carga, vacío
  (R9) y error con `Try again` (R14); el diálogo. Cubre: R2, R8, R9, R14.
- [x] T15 — `src/router/index.ts` + `router.spec.ts`: la ruta `transfers` con
  `Link2`, justo después de `rules`. Cubre: R1, C4.
- [x] T16 — Tests de componentes (`TransferPairRow`, `UnlinkConfirmDialog`,
  `AmbiguousGroupCard`, `TransfersView`): (a) en una lista con una multa y tres buenas,
  **solo** la multa lleva `Bizum` y el orden no cambia; (b) el botón de enlazar está
  desactivado sin elección, con una sola columna elegida y con dos de la misma cuenta,
  y activo con una válida; (c) grupo de 3 y de 4 movimientos; (d) los dos textos de
  vacío literales; (e) error en una sección y la otra pintada; (f) el concepto se
  pinta tal cual y el `message` del backend nunca aparece. Cubre: R1, R3, R4, R8, R9,
  R10, R11, R14, C2.

## Extremo a extremo

- [x] T17 — `e2e/transfer-pairs-review.spec.ts` con `/api/transfers*` interceptado y
  la red de seguridad: (a) entrar por la barra lateral y ver 4 parejas con la multa
  marcada; (b) `Unlink` → `Cancel` no manda nada; `Unlink` → confirmar → `DELETE` →
  aviso → `Undo` → `POST` con `{"movementIds":[33339,24377]}`; (c) con un grupo
  dudoso fabricado de 3: elegir, `Link these two`, `POST`, aviso y `Undo` → `DELETE`;
  (d) con `ambiguous: []` sale el texto de R9. Ninguna petición a `:3000`; métodos
  permitidos `GET`, `POST`, `DELETE` y solo sobre `/api/transfers*`. Cubre: R1, R2,
  R5, R6, R7, R8, R9, R10, R12, R15.

## Cierre

- [x] T18 — `docs/architecture.md`: `features/transfers/` y `shared/transfers.ts` en
  el árbol, y la nota de que esta pantalla es la que escribe `transferId`. Cubre: C5.
- [x] T19 — Contraste: comprobar a mano (o con el test de tokens existente) los pares
  nuevos usados. Cubre: C3.
- [x] T20 — Trazabilidad `R1…R15 → test` en
  `progress/implementation/transfer-pairs-review.md`. Cubre: todos.
- [x] T21 — Puerta: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
  `./init.sh` en verde (lint y formato incluidos). Cubre: C8.
- [x] T22 *(HECHA el 2026-10-02 por el leader con visto bueno explícito del humano, **con otra variante de la escrita abajo**: el humano eligió deshacer y rehacer una pareja buena —42369/42519, 1.000 € bankinter → n26, 9 sept 2026— y no volver a enlazar la multa de 100 €. Detalle en `progress/current.md`.)* — *(NO es del implementer: la hace el leader con el humano delante, y
  **escribe en la base real**. Sin visto bueno explícito del humano, queda como
  pendiente y la feature se cierra sin ella.)* Sobre **una sola** multa, la de
  100,00 € (gasto `33339`, n26, 2025-06-30 · ingreso `24377`, openbank,
  2025-06-27). **La de 50,00 € no se toca.**
  1. Foto con `curl` (solo `GET`): los dos movimientos y los `totals` de
     `GET /api/movements?from=2025-06-01&to=2025-06-30`.
  2. **Con su visto bueno**, volver a enlazarla con
     `POST /api/transfers {"movementIds":[33339,24377]}` (hoy está deshecha desde el
     28-09). Comprobar que los `totals` de junio de 2025 bajan 100,00 € por cada lado.
  3. En la pantalla: 39 parejas, la de la multa con `Bizum` y **ninguna otra**; la
     sección de dudosos con el texto de R9.
  4. `Unlink` desde la pantalla → confirmar. Los `totals` de junio vuelven a la foto.
  5. `Undo` → la pareja vuelve (39) y los `totals` bajan otra vez. `Unlink` de nuevo
     → 38 parejas y los `totals` iguales a la foto.
  6. Foto final: importe, fechas, concepto, categoría, `status` y
     `excludedFromTotals` de los dos movimientos **idénticos** a la foto 1;
     `transferId: null`.
  Si el humano prefiere no volver a enlazar la multa, la alternativa es hacer el paso
  4-5 sobre una pareja **buena** (deshacer y `Undo` en el acto) y dejarla enlazada.
  Cubre: R4, R5, R6, R7 contra datos reales.
