# Revisión — feature 40 `investments-gains`

## Review (2026-11-04)

**Veredicto:** APPROVED
Comprobado: requirements ↔ tests, arquitectura, convenciones, verificación, CHECKPOINTS C1-C8.
Checks: 18 de 18 en verde. Sin hallazgos.
Resumen de cierre: `progress/summaries/investments-gains.md`.

### Comandos lanzados por el reviewer y su resultado

- `./init.sh --checks 40` → exit 0, `Checks: 18 de 18 en verde.` El check 13 lanza `./init.sh`
  completo y termina con `Entorno listo. Puedes empezar a trabajar.`; el check 18 (E2E) imprime
  `1 passed`.
- Los 16 checks que filtran por nombre con `vitest -t`, relanzados uno a uno: todos dan
  `Tests 1 passed | N skipped`, así que cada uno ejecuta un test.
- `pnpm test:unit` → `Test Files 132 passed (132)`, `Tests 2139 passed (2139)`, exit 0.
- `pnpm exec playwright test --project=chromium` (los 17 specs de `e2e/`) → `84 passed`, exit 0.

### `e2e/category-rules.spec.ts:779`: el fallo se repite y ya existía antes de esta feature

- En el working tree: `pnpm exec playwright test e2e/category-rules.spec.ts:779 --project=chromium --repeat-each=15`
  → `4 failed, 11 passed`. Lo relancé y volvió a fallar. Siempre falla
  `expect(await settledLookOfLastApply(page)).toEqual(openOnRules)` (línea 812): cambia el
  `background` de un botón recién pulsado. Una vez fue `showConflicts`, que esperaba
  `rgb(26, 34, 42)` y recibió `rgb(20, 27, 34)`.
- En HEAD (`29eec8d`, sin las features 39 y 40), con un `git worktree` aparte en la carpeta
  temporal y el mismo comando → `3 failed, 12 passed`, con la misma diferencia
  (`rgb(21, 28, 35)` frente a `rgb(20, 27, 34)`).
- Conclusión comprobada: el fallo es intermitente y ya ocurría antes de la feature 40, así que no
  viene de ella. No he comprobado cuál es la causa. Que el color recibido varíe entre ejecuciones
  hace pensar en la transición del color de fondo del botón tras el clic, pero eso no lo he
  verificado. Para comprobarlo habría que repetir la prueba con las transiciones de CSS
  desactivadas y ver si deja de fallar. Ese fallo intermitente puede poner en rojo `./init.sh`
  en cualquier pasada, sin que tenga que ver con la feature que se esté cerrando.

### Lo que pedía el leader, comprobado

- Contrato: tipos, motivos, `closedOn`, `conditions` solo en depósitos, `uninvestedCash` solo en
  fondo/ETF/cartera y la regla de que `total.gain` sea la suma de los `gain` de `live` coinciden
  con `../gastos-backend/docs/api-contract.md` §`GET /api/investments/gains`.
  `service.spec.ts` → `maps every field of the contract example` compara campo a campo con el
  ejemplo del contrato.
- Trazabilidad: cada uno de R1-R15 tiene al menos un test concreto, con valores y clases
  esperados (la tabla de trazabilidad del informe del implementer coincide con los nombres reales
  de los tests).
- `tasks.md`: T1-T13 en `[x]`. La cabecera `Archivos:` del lote A incluye
  `AppShell.spec.ts` con la nota de que lo autorizó el leader. El cambio de la feature 40 en ese
  archivo son las líneas 57-63. El otro cambio frente a HEAD (líneas 85-86) es de la feature 39,
  como dice su informe.
- `checks` frente a la tabla 🧪 de `decisions.md`: las 8 filas y las 5 comprobaciones
  *(añadido)* tienen su check, y ninguno se ha aflojado.
- La hoja tiene 6 puntos en 🔴, cada uno con su alternativa. Hay 15 requirements, y la razón está
  dicha en ⚙️ 5. Cada R tiene su procedencia.
- Documentos: `git grep` de `investments/deposits`, `DepositEarnings`, `DepositRow`,
  `deposit-earnings`, `deposits-loading`, `refreshDepositsIfLoaded` y `Deposits` fuera de
  `progress/` y `specs/`. Solo quedan menciones en pasado o tests que comprueban que eso ya no
  está, más `docs/roadmap.md:74-78` y `:356`/`:378`, que corrige el leader al cerrar.
- C4 bis: no se pudo hacer una pasada con datos reales. El backend no estaba en marcha
  (`curl` → `000`, exit 7) y el informe lo dice. Queda como deber del humano (§📌 de la hoja); el
  leader lo apunta en `docs/roadmap.md` al reescribir el cabo 45.

### Comprobado sin hallazgos

Requirements ↔ tests (R1-R15), arquitectura (`investments` no importa `net-worth` ni `import`;
`import` → `investments` documentado en `docs/architecture.md`), convenciones (formato solo en
`shared/money.ts`, comparaciones en céntimos `bigint`, clases de Tailwind literales, alias
semánticos del tema oscuro, textos en inglés), sin `console.*` ni TODO, datos de prueba
inventados, ninguna palabra fuera del vocabulario aprobado, CHECKPOINTS C1-C8. Los `checks` de
las features 38 y 39 en rojo y las líneas de `docs/roadmap.md` quedan fuera de esta revisión, como
dijo el leader.
