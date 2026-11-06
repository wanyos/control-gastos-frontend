## Review — 2026-11-04 (cabo 44 de `docs/roadmap.md`, no es una feature de `feature_list.json`)

**Veredicto:** APPROVED
Comprobado: el diff frente a HEAD de `e2e/action-notice-in-view.spec.ts`, `e2e/statement.spec.ts`,
`playwright.config.ts`, `MonthNav.vue`, `MonthNav.spec.ts` y lo del cabo 44 en `docs/stack.md`;
arquitectura, convenciones, `docs/lessons.md`, documentos que pudieran quedar falsos, vocabulario,
verificación, CHECKPOINTS C1-C5 y C8. Checks: sin checks (no es una feature).
Sin hallazgos.
Resumen de cierre: `progress/summaries/e2e-firefox-webkit.md`.

### Lo que he ejecutado yo, y qué salió

- `npx playwright test --reporter=line` (los tres navegadores; la consola solo trae su
  `__COMPAT_LAYER=RunAsInvoker PerProcessSystemDPIForceOff HighDpiAware` de serie, no he puesto
  ninguna variable) → **exit 0 · 252 passed (2.4m)**.
- `./init.sh` → **exit 0** · Test Files 132 passed (132) · Tests 2140 passed (2140) · oxlint,
  format y `vue-tsc --build` OK · E2E smoke verde (chromium) · Entorno listo.
- Tamaño de ventana (prueba de usar y tirar en la carpeta temporal, que carga
  `playwright.config.ts` del proyecto): con la configuración tal cual, chromium 1280 × 720 dpr 1,
  webkit 1280 × 720 dpr 2, firefox 1280 × 720 dpr 1. Quitándole a webkit solo su
  `launchOptions`: webkit 731 × 411 dpr 3.5. La línea nueva es la que lo arregla.
- Desplazamiento con decimales (página de 5000 px): `scrollTo(0, 100.4)` / `(0, 100.7)` deja
  `scrollY` en 100 / 101 en chromium y firefox y en 100 / 100 en webkit. Confirma la causa del
  arreglo de `bringUnderTopBar`.
- Chromium, con el servidor de desarrollo: captura del campo de mes con y sin el atributo
  `placeholder`, con valor y vacío, en `/movements` (`StatementView`), `/overview`
  (`OverviewView.vue`) y `/expenses-by-category` (`PeriodPicker.vue`): idénticas byte a byte en
  los seis pares. En Chromium no cambia nada de lo que se ve, tampoco en las dos pantallas que
  reutilizan `MonthNav`.
- `docs/stack.md:870` cita `action-notice-in-view.spec.ts:998`: es «Undo pressed from the bottom of
  the list…», la prueba que antes estaba en `:992`.

Ninguna prueba se ha aflojado: la tolerancia de 0.5 px sigue; `retries` sigue en 0 fuera de CI; no
hay `test.skip`. La prueba del campo de mes distingue por navegador y lo dice en su comentario
(`e2e/statement.spec.ts:375`), y a cambio pide más que antes: el valor exacto del mes, la pista
`YYYY-MM`, `:placeholder-shown` con el campo vacío en firefox y webkit, y que escribir `2024-01`
lleve a enero de 2024 en los tres.
