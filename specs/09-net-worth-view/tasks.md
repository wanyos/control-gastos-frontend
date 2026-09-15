# Tasks — Feature 9: net-worth-view

> Checklist ejecutable para el `implementer`, en orden. Cada task referencia los
> `R<n>` / `C<n>` de `requirements.md`. Marcar `[x]` al completar. Aplicar antes
> las decisiones cerradas en la puerta del 2026-09-12 (decisions.md): cifras es-ES,
fechas en-GB, 4 grupos, dinero parado = `checking`, frase aprobada, e2e con fixture.

- [x] T0 — Línea base: `./init.sh` en verde. Comprobar el riesgo e2e (design.md §9):
  con el backend **parado**, sustituir provisionalmente el placeholder por una vista
  que llame a `useNetWorthStore().load()` y lanzar el smoke en chromium. Anotar el
  resultado en `progress/implementation/net-worth-view.md` y aplicar lo elegido en
  design.md §9 si el smoke se pone rojo: interceptar `/api/net-worth` con una
  fixture en el propio smoke (o anotar que no hizo falta). Cubre: C3.

- [x] T1 — `tsconfig.app.json`: añadir `ES2023.Intl` a `lib` (y a
  `tsconfig.vitest.json` si el type-check de tests lo pide). `pnpm type-check`
  verde. Cubre: R6 (soporte).

- [x] T2 — `src/shared/money.ts` (`toCents`, `fromCents`, `sumAmounts`,
  `sharePermille`, `formatMoney`, `formatPercent`, `formatDate`) +
  `src/shared/__tests__/money.spec.ts`: `"1234.56"` → `1.234,56 €` (agrupación de
  4 cifras con `useGrouping: 'always'`), `"-5.00"` → `-5,00 €`, `"0.00"` →
  `0,00 €`, importe mayor que `Number.MAX_SAFE_INTEGER` céntimos, `383` → `38,3 %`,
  **esperados con `\u00a0` antes de `€`/`%`**; redondeo half-up en una sola pasada,
  `total <= 0` → `null`; `formatDate("2026-09-12")` → valor en-GB observado
  (`12 Sept 2026` en ICU actual) sin corrimiento por zona horaria; string inválido
  → `ValidationError`. Cubre: R6, R8 (soporte), R12 (fechas).

- [x] T3 — `src/features/net-worth/__tests__/fixtures.ts`: (a) fixture **coherente**
  con los cinco `type` de producto, cuentas `checking` y `savings`, un saldo
  negativo, un `value: null`, los cinco slugs de banco y los tres `reason` de
  issue, con nombres neutros en inglés; (b) fixture **inconsistente** (`total:
  "999.99"`); (c) base vacía. **No usar el ejemplo del contrato como fixture
  coherente: sus cifras no cuadran** (ver decisions.md ⚠️). Cubre: soporte de todos.

- [x] T4 — `src/features/net-worth/breakdown.ts` (`groupByNature`, `groupByBank`,
  `bankLabel`, `sumOfGroups`) según design.md §4–§5 + `breakdown.spec.ts`:
  pertenencia de cada `type`, grupo vacío omitido, `Σ grupos === total` en ambos
  repartos, cada id en un solo grupo, `value: null` fuera, orden por importe,
  slug desconocido. Cubre: R7, R8, R11, R13.

- [x] T5 — `src/features/net-worth/sentence.ts` + `sentence.spec.ts`: plantilla
  de design.md §6 con texto exacto en los cinco casos. Cubre: R5.

- [x] T6 — `src/features/net-worth/issues.ts` (`issueMessage`,
  `holdingTypeLabel`) + `issues.spec.ts`: texto exacto por `reason` y por tipo.
  Cubre: R14, R12 (etiquetas), R15.

- [x] T7 — `src/features/net-worth/store.ts` (`useNetWorthStore`) + `store.spec.ts`
  con `fetch` mockeado: `load()` guarda el `NetWorth`; `isLoading` true durante y
  false después; rechazo `ApiError` → `error` es esa instancia; rechazo no-Error →
  `code === 'UNKNOWN'`; `load()` no relanza. Cubre: R1, R2, R3.

- [x] T8 — Portar componentes a `src/shared/components/`: `BaseCard.vue`,
  `BaseBadge.vue`, `StatCard.vue`, `ShareBar.vue` (design.md §8: traducción de
  tokens, textos en inglés, sin props de interacción). Cubre: C4, R6, R7.

- [x] T9 — Componentes de feature en `src/features/net-worth/components/`:
  `AccountCard.vue` (con hueco `No valuation`), `BreakdownList.vue` (filas con
  importe, %, `ShareBar`, badge `Idle money`, aviso de descuadre),
  `DataWarnings.vue`, `BankCard.vue`. Mapas de color con clases literales.
  Cubre: R7, R9, R10, R11, R12, R13, R14.

- [x] T10 — `NetWorthView.vue`: sustituir el placeholder y su TODO; `load()` al
  montar; estados carga / error / cargado; bloques A, avisos, B, E con los
  `data-test` de requirements. Cubre: R1–R5, R7, R9–R15, C1.

- [x] T11 — `NetWorthView.spec.ts` (Pinia de test + `fetch` mockeado): una
  petición al montar (R1); carga (R2); error con `message` (R3); `999,99 €` con
  fixture inconsistente (R4) y aviso de descuadre (R9, ausente con la coherente);
  frase en bloque A (R5); `font-mono`/`tabular-nums` en `data-test="money"` (R6,
  clases compuestas en runtime); filas y anchos de naturaleza (R7); badge de
  dinero parado en su fila (R10); filas por banco (R11); nº de fichas y filas,
  fechas en-GB de fondo y depósito generadas con `formatDate` (R12); hueco sin `0,00 €` (R13); 3 avisos / 0 avisos
  (R14); sin español y títulos en inglés (R15); solo bloques A, B, E (C1).

- [x] T12 — Ajustar `src/shared/components/__tests__/AppShell.spec.ts`: aserciones
  de placeholder a `/overview`; montajes en `/net-worth` con Pinia y `fetch`
  mockeado. Suite completa verde. Cubre: C6.

- [x] T13 — Docs: `docs/conventions.md` (cifras es-ES con `useGrouping: 'always'`
  y su trampa de 4 cifras, fechas en-GB; corregir la nota que daba en-US como
  propuesta y quitarlo de «Pendientes»), `docs/stack.md` (`ES2023.Intl` y por
  qué). Cubre: R6.

- [x] T14 — Cierre: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `./init.sh`
  verdes; `git diff package.json` sin dependencias nuevas; grep sin `Number(` /
  `parseFloat` / `parseInt` sobre importes; con backend en `:3000` y `pnpm dev`,
  cifra del bloque A = `total` de `curl http://localhost:3000/api/net-worth`
  (anotarlo). Mapa de trazabilidad R↔test en
  `progress/implementation/net-worth-view.md`. Cubre: C2, C3, C5, C6.
