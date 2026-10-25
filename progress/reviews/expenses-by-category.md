## Review — 2026-10-25

**Veredicto:** APPROVED
Comprobado: requirements R1–R16 ↔ tests, arquitectura, convenciones,
verificación, CHECKPOINTS C1-C8 (C4 bis, C6 y C7 incluidos). Checks: 14 de 14 en verde.
Sin hallazgos.
Resumen de cierre: `progress/summaries/expenses-by-category.md`.

### Comandos lanzados (código de salida y lo que salió)

- `pnpm type-check` → 0. `pnpm lint` → 0 (después, `git diff` y los archivos nuevos
  idénticos a antes). `pnpm lint:oxlint:check` → 0. `pnpm format:check` → 0,
  `All matched files use Prettier code style!`.
- `pnpm test:unit` → 0, `Test Files 126 passed (126)`, `Tests 2077 passed (2077)`.
- `pnpm build` → 0, `✓ built`.
- `./init.sh` → 0, `Entorno listo`; incluye `E2E smoke verde (chromium)`.
- `./init.sh --checks 37` → 0, `Checks: 14 de 14 en verde.` Cada filtro de vitest
  lanzado aparte: los 16 dan `Tests 1 passed | N skipped`; los tres e2e, `1 passed`.
- Backend real (`:3000`, solo `GET`): el `amount` de `GET /api/expenses-by-category`
  coincide con `period.totals.expense` de `GET /api/overview` en 2026-08 y en 2026-09.
- `git grep` de `Monthly cost`/`monthly-cost`/`MonthlyCost`/`recurring-expenses`/
  `ReceiptEuro` fuera de `progress/`, `specs/` y `feature_list.json`: solo frases que
  dicen que la pantalla se quitó en la F37, la línea de historia de `docs/stack.md:335`
  y los tests de R2. `init.local.sh` no la nombra. `package.json`, `pnpm-lock.yaml`,
  `src/features/overview/`, `src/shared/` y `src/assets/` sin cambios.

### Para el leader al cerrar (AGENTS.md §5.3; tasks.md lo dejó fuera del implementer)

- `docs/roadmap.md:54` dice en presente que el frontend enseña los recurrentes en
  `Monthly cost`, y `docs/roadmap.md:379` los da por hechos con la F32. Las dos quedan
  falsas con esta feature.
- `../docs/ideas.md:485`, `:775` y `:785` siguen hablando de `Monthly cost` como
  «a sustituir».
- Los `checks` de la F32 en `feature_list.json` (ya previsto en `progress/current.md`).
