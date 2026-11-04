# Tasks — F40 `investments-gains`

Un solo lote: todo pasa por `src/features/investments/`, y borrar los tipos de los
depósitos rompe la compilación de los componentes que los usan, así que partirlo
dejaría un lote a medias sin poder acabar en verde. Los nombres de test entre comillas
son los que buscan los `checks` de `feature_list.json`: **se crean con ese nombre exacto**.

## Lote A — lo ganado por cada inversión en Investments
Archivos: `src/features/investments/types.ts`, `src/features/investments/service.ts`,
`src/features/investments/gains.ts`, `src/features/investments/store.ts`,
`src/features/investments/components/GainsSummary.vue`,
`src/features/investments/components/GainRow.vue`,
`src/features/investments/components/GainBar.vue`,
`src/features/investments/views/InvestmentsView.vue`,
`src/features/investments/deposits.ts`,
`src/features/investments/components/DepositEarnings.vue`,
`src/features/investments/components/DepositRow.vue`,
`src/features/investments/__tests__/fixtures.ts`,
`src/features/investments/__tests__/service.spec.ts`,
`src/features/investments/__tests__/store.spec.ts`,
`src/features/investments/__tests__/gains.spec.ts`,
`src/features/investments/__tests__/GainsSummary.spec.ts`,
`src/features/investments/__tests__/GainRow.spec.ts`,
`src/features/investments/__tests__/InvestmentsView.spec.ts`,
`src/features/investments/__tests__/deposits.spec.ts`,
`src/features/investments/__tests__/DepositEarnings.spec.ts`,
`src/shared/money.ts`, `src/shared/__tests__/money.spec.ts`,
`src/features/import/store.ts`, `src/features/import/__tests__/store.spec.ts`,
`src/features/import/__tests__/fixtures.ts`,
`e2e/investments.spec.ts`,
`docs/architecture.md`, `docs/stack.md`, `docs/guia-de-uso.md`,
`src/shared/components/__tests__/AppShell.spec.ts` (solo líneas 57-63: `deposits-loading` → `gains-loading` y su comentario; autorizado por el leader el 2026-11-04 porque el spec lo había dejado fuera)
Depende de: —

- [x] T1 — `formatPercentText` y `formatSignedMoney` en `src/shared/money.ts`
  (`design.md §4`), con tests en `money.spec.ts`, entre ellos
  `"formats a percent string as it comes, with a comma and no invented digits"`.
  Cubre: R2, R4, R9.
- [x] T2 — Tipos de `design.md §3` en `types.ts`; quitar los de depósitos. Cubre: R11.
- [x] T3 — `service.ts`: `GAINS_PATH`, `parseInvestmentGains`, `getInvestmentGains`
  (`design.md §6`); quitar lo de depósitos. `fixtures.ts` con `investmentGains()`
  (`design.md §7`). Tests en `service.spec.ts`:
  `"maps every field of the contract example"`,
  `"rejects a product whose type is not an investment"`,
  `"rejects a response whose total gain is not the sum of the live gains"`,
  `"asks the gains path with no method, body or query"`,
  más los de cada rechazo de `design.md §6`. Cubre: R1, R11.
- [x] T4 — `gains.ts` (`design.md §4` y §5). Tests en `gains.spec.ts`:
  `"sorts live products by gain in euros, with the ones without a figure at the end"`,
  `"scales each bar to the biggest gain or loss of the live products"`,
  `"names the reason of each figure that cannot be obtained"`,
  `"says a closed deposit was cancelled only when it closed before its maturity date"`.
  Cubre: R5, R6, R8, R10.
- [x] T5 — `store.ts` (`design.md §6`) y `store.spec.ts`: carga, error sin relanzar,
  limpieza del error al volver a pedir, `refreshGainsIfLoaded` con y sin datos.
  Cubre: R1, R13, R14.
- [x] T6 — `GainBar.vue` y `GainRow.vue` (`design.md §6`). Tests en `GainRow.spec.ts`:
  `"draws a green bar to the right for a gain and a red one to the left for a loss"`,
  `"shows a live deposit counting its expected gain day by day"`,
  `"shows a gap and its reason for a figure that cannot be obtained, never a zero"`,
  `"says when the value of a product is not from today"`. Cubre: R4, R6, R7, R8.
- [x] T7 — `GainsSummary.vue`. Tests en `GainsSummary.spec.ts`:
  `"shows the total of the live investments in euros and percent, green when it gains"`,
  `"paints the total red when it loses"`,
  `"lists the live investments left out of the total with their reason"`.
  Cubre: R2, R3.
- [x] T8 — `InvestmentsView.vue` (`design.md §6`). Tests en `InvestmentsView.spec.ts`:
  `"asks the gains once on mount, only with GET"`,
  `"shows one row per live investment with its start date, put in, worth and gain"`,
  `"orders the live investments from the one that gains most to the one that loses most"`,
  `"shows the closed investments apart, in grey, with their gain and close date, outside the total"`,
  `"shows the deposits inside the lists and no Deposits card"`,
  `"says the investments could not be loaded and offers Try again"`,
  `"says it is loading the investments"`,
  `"says there are no investments yet"`,
  `"says there are no live investments when only closed ones come"`.
  Cubre: R1, R2, R4, R5, R9, R12, R14, R15.
- [x] T9 — Borrar `deposits.ts`, `DepositEarnings.vue`, `DepositRow.vue`,
  `__tests__/deposits.spec.ts` y `__tests__/DepositEarnings.spec.ts`. Comprobar con
  `grep -rn "investments/deposits\|DepositEarnings\|DepositRow" src e2e` que solo quedan
  las líneas de `src/features/net-worth/__tests__/` que comprueban su ausencia. Cubre: R12.
- [x] T10 — `src/features/import/store.ts`: `refreshGainsIfLoaded`. En
  `import/__tests__/fixtures.ts` la respuesta `deposits` pasa a `gains`
  (`/api/investments/gains`); en `store.spec.ts`,
  `"asks the gains again after an import when they were loaded"` y
  `"does not ask the gains after an import when they were never loaded"`. Cubre: R13.
- [x] T11 — Reescribir `e2e/investments.spec.ts` (`design.md §7`) con el test
  `"opens investments and sees the gain of each product and the total"`.
  Cubre: R1, R2, R5, R9, R12.
- [x] T12 — Documentos que la feature vuelve falsos: `docs/architecture.md` (árbol de
  `investments/` y el párrafo «Lo que ganó cada depósito vive en `investments`»),
  `docs/stack.md` (el párrafo de `GET /api/investments/deposits` en los E2E pasa a
  `GET /api/investments/gains`) y `docs/guia-de-uso.md` (§3 `Investments` y su fila en
  la tabla de pantallas). Cubre: —.
- [x] T13 — `pnpm type-check && pnpm lint:oxlint:check && pnpm format:check && pnpm test:unit && pnpm build-only && ./init.sh`
  en verde. Cubre: todos.
