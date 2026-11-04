# Revisión — feature 39 `deposits-to-investments`

## Review (2026-11-03)

**Veredicto:** APPROVED
Comprobado: acceptance ↔ tests, arquitectura, convenciones, verificación, CHECKPOINTS C1-C5 y C8
(C4 bis: un `GET` real en el informe; C6: no cambia el contrato; C7 no aplica, sin spec).
Checks: 7 de 7 en verde. Sin hallazgos.
Resumen de cierre: `progress/summaries/deposits-to-investments.md`.

### Comandos lanzados por el reviewer y su resultado

- `./init.sh --checks 39` → exit 0, `Checks: 7 de 7 en verde.` El check 6 imprime `3 passed`
  (chromium, firefox, webkit); el 7 termina con `Entorno listo` de `./init.sh`.
- Los cinco checks que filtran por nombre, relanzados uno a uno con `pnpm exec vitest run <archivo> -t "<nombre>"`:
  cada uno `Tests 1 passed | N skipped` (ejecutan un test, no cero).
- `pnpm test:unit` → `Test Files 131 passed (131)`, `Tests 2121 passed (2121)`, exit 0.
- `pnpm exec playwright test --project=chromium` (todos los specs de `e2e/`) → `84 passed`, exit 0.

### Lo que pedía el leader, comprobado

- Tarjeta sin cambios visibles: `diff` de `git show HEAD:src/features/net-worth/<archivo>` contra
  `src/features/investments/<archivo>`: `DepositRow.vue` y `deposits.spec.ts` idénticos;
  `deposits.ts` y `DepositEarnings.vue` solo cambian el comentario de cabecera;
  `DepositEarnings.spec.ts` solo la ruta del router de prueba. `InvestmentsView.vue` usa el mismo
  contenedor (`flex flex-col gap-6`) que tenía `NetWorthView.vue`.
- Net Worth como antes de la 38: `git diff 29eec8d^ --stat -- src/features/net-worth` → solo los
  dos tests nuevos (`NetWorthView.spec.ts | 14 +`, `store.spec.ts | 15 +`). Los nueve e2e que tocó
  la 38: `git diff --quiet 29eec8d^` sin diferencias en los nueve; `grep -lF investments/deposits e2e/*.ts`
  → solo `e2e/investments.spec.ts`.
- Decisión 6 de la 38: el error lo pinta la tarjeta (`says the deposits could not be read instead of staying blank`);
  tras importar, `refreshDepositsIfLoaded` pide otra vez solo si había depósitos
  (`import/__tests__/store.spec.ts`: el caso cargado y el caso no cargado).
- Ninguna prueba de la 38 quitada sin trasladar: los 10 tests de `getDepositEarnings` están con el
  mismo nombre en `investments/__tests__/service.spec.ts`; `asks the deposits once on mount, only with GET`
  y `shows a deposits answer that breaks the contract…` en `InvestmentsView.spec.ts`;
  `paints the Deposits part below Details` pasa a `shows the deposits card on the investments page`.
  Sin traslado, porque describen Net Worth con depósitos: `keeps every net worth figure…`,
  `keeps the rest of the screen when the deposits request fails` y los tres del store de net-worth
  sobre las dos peticiones a la vez. Los sustituyen `does not show the deposits card` y
  `does not ask for the deposits`.
- Documentos: `git grep` de `investments/deposits`, `PlaceholderView`, `placeholder`, `DepositEarnings`,
  `useInvestmentsStore` fuera de `progress/` y `specs/`: lo que queda es verdad (histórico del roadmap,
  `design-system/`, comentarios de las features 19 y 25). `docs/stack.md` dice diecisiete specs:
  `ls e2e/*.spec.ts | wc -l` → 17, y `grep -L "'**/api/**'"` no devuelve ninguno.

### Nota para el leader (no es de esta feature ni la puede arreglar el implementer)

Los `checks` de la feature 38 dejan de pasar con este traslado: comprobado
`grep -qF "paints one row per deposit…" src/features/net-worth/__tests__/DepositEarnings.spec.ts`
→ exit 2 (el archivo ya no está ahí) y el nombre del check 13 ya no existe en
`import/__tests__/store.spec.ts` → exit 1. Los tests existen y pasan en `src/features/investments/__tests__/`.
`./init.sh --checks 38` entero no lo he lanzado. Qué hacer con esos `checks` (apuntarlos a las rutas
nuevas o retirar los que ya no aplican) lo decide el leader con el humano.
