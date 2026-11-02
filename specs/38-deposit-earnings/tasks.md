# Tasks — F38 `deposit-earnings`

Dos lotes en secuencia: la parte entera con sus pruebas unitarias, y después las pruebas
de navegador y los documentos (las pruebas de navegador fallan o no según lo que pida la
pantalla del Lote A).

Los nombres de test van entre comillas invertidas tal cual: los `checks` de
`feature_list.json` los filtran por ese nombre exacto. No los cambies. **Ningún dato de
prueba lleva nombres ni cifras reales**: los de los ejemplos del contrato (`Deposito 3m`,
`myinvestor`…) o inventados. **No apuntes nada en `docs/roadmap.md`**: lo hace el leader.

**No toques `src/shared/`, `src/features/import/store.ts`, `breakdown.ts`, `sentence.ts`
ni `BankCard.vue`**: si crees que hace falta, para y dilo.

## Lote A — la parte Deposits, sus datos y sus pruebas unitarias
Archivos: `src/features/net-worth/types.ts`, `src/features/net-worth/service.ts`, `src/features/net-worth/store.ts`, `src/features/net-worth/deposits.ts`, `src/features/net-worth/components/DepositEarnings.vue`, `src/features/net-worth/components/DepositRow.vue`, `src/features/net-worth/views/NetWorthView.vue`, `src/features/net-worth/__tests__/fixtures.ts`, `src/features/net-worth/__tests__/deposits.spec.ts`, `src/features/net-worth/__tests__/service.spec.ts`, `src/features/net-worth/__tests__/store.spec.ts`, `src/features/net-worth/__tests__/DepositEarnings.spec.ts`, `src/features/net-worth/__tests__/NetWorthView.spec.ts`, `src/features/import/__tests__/store.spec.ts`, `src/shared/components/__tests__/AppShell.spec.ts`
Depende de: —

- [x] T1 — `types.ts` (design §2) y en `__tests__/fixtures.ts` `depositEarnings()` y
  `emptyDepositEarnings()` (design §7). Cubre: R3–R10 (soporte).
- [x] T2 — `service.ts` (design §3). Tests en `service.spec.ts`, en un `describe`
  propio: `asks the deposits path with no method, body or query` (R1),
  `maps every deposit field of the contract example` (R3, R4),
  `rejects an unknown deposit status` (R12),
  `rejects earned on a deposit that is not matured` (R12),
  `rejects a response whose total is not the sum of the matured deposits` (R6, R12).
  Cubre: R1, R3, R4, R6, R12.
- [x] T3 — `store.ts` (design §5). Tests en `store.spec.ts`:
  `load() asks the net worth and the deposits at the same time` (R1),
  `a failed deposits request leaves the net worth loaded` (R12). Ajusta
  `load() fetches the net worth once and keeps it` para que conteste por URL y cuente
  las dos peticiones, sin cambiar lo que comprueba del patrimonio. Cubre: R1, R12.
- [x] T4 — `deposits.ts` (design §4). Tests en `deposits.spec.ts`:
  `names the status of each deposit` (R5, R7, R8, R9),
  `writes the maturity date with the verb of its status` (R4),
  `writes the reason of each doubtful deposit` (R9),
  `paints a missing field as a dash, never as zero` (R4),
  `links to the month of the maturity only when there is one` (R13).
  Cubre: R4, R5, R7, R8, R9, R13.
- [x] T5 — `DepositRow.vue` y `DepositEarnings.vue` (design §4 y §6). Tests en
  `DepositEarnings.spec.ts`, montando la tarjeta con props y el router en memoria:
  `paints one row per deposit of every status in the order the backend sends` (R3),
  `shows what a matured deposit earned, in green` (R5),
  `shows the total exactly as the backend sent it` (R6),
  `shows an active deposit with its expected gain, its maturity date and not earned yet` (R4, R7),
  `shows a cancelled deposit in grey, with its cancel date and not in the total` (R8),
  `shows each doubtful deposit in amber with its reason and not in the total` (R9),
  `says there are no deposits instead of an empty part` (R10),
  `offers See in Movements on a deposit with its maturity movement` (R13),
  `says the deposits could not be loaded with the error message` (R12),
  `says it is loading the deposits` (R15). Las clases de color se componen en tiempo de
  ejecución (como `cls()` en `NetWorthView.spec.ts`), nunca literales en el spec.
  Cubre: R3–R10, R12, R13, R15.
- [x] T6 — `NetWorthView.vue` (design §6). Tests en `NetWorthView.spec.ts`, con una
  imitación de `fetch` que contesta por ruta:
  `asks the deposits once on mount, only with GET` (R1),
  `paints the Deposits part below Details` (R2),
  `keeps every net worth figure as the backend sends it when deposits earned something` (R11),
  `keeps the rest of the screen when the deposits request fails` (R12). Ajusta
  `requests the net worth exactly once on mount (R1)` y los demás tests que contestaban lo
  mismo a cualquier ruta, sin cambiar lo que comprueban. Cubre: R1, R2, R11, R12.
- [x] T7 — `src/features/import/__tests__/store.spec.ts`:
  `asks the deposits again after an import when the net worth was loaded` (R14). Y, en
  ese archivo y en `AppShell.spec.ts`, responder `/api/investments/deposits` solo si su
  imitación de `fetch` falla con la ruta nueva (compruébalo ejecutándolos). Cubre: R14.
- [x] T8 — `pnpm type-check`, `pnpm lint:oxlint:check`, `pnpm format:check` y
  `pnpm test:unit` en verde, incluido `src/assets/__tests__/theme-dark.spec.ts` (ningún
  color crudo en los `.vue` nuevos). Cubre: frase «textos en inglés, en oscuro…».

## Lote B — pruebas de navegador y documentos
Archivos: `e2e/app-boot.spec.ts`, `e2e/expenses-by-category.spec.ts`, `e2e/import-dialog.spec.ts`, `e2e/overview.spec.ts`, `e2e/statement-exclude-from-totals.spec.ts`, `e2e/statement-fix-category.spec.ts`, `e2e/statement-noise-toggle.spec.ts`, `e2e/statement.spec.ts`, `e2e/transfer-pairs-review.spec.ts`, `docs/guia-de-uso.md`, `docs/architecture.md`
Depende de: Lote A

- [x] T9 — Ejecuta `pnpm test:e2e --project=chromium` y pega el resultado. En cada spec
  de la cabecera (son los que responden `**/api/net-worth`) responde también
  `**/api/investments/deposits` con `{ "asOf": "2026-06-15", "deposits": [], "total": "0.00" }`
  (design §8), junto a su ruta de `net-worth`. Vuelve a ejecutar y pega el resultado en
  verde. Si un spec que no está en la cabecera también se rompe, para y dilo. Cubre: R1
  (soporte).
- [x] T10 — `docs/guia-de-uso.md` y `docs/architecture.md` (design §9). Cubre: —
  (documentos).
- [x] T11 — `pnpm build-only` y `./init.sh` en verde; pega el final de la salida de cada
  uno. Cubre: frase «… build e ./init.sh en verde».
