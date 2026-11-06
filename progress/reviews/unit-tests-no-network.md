## Review — 2026-11-04

**Veredicto:** APPROVED

Primera mitad del cabo 9 de `docs/roadmap.md`. No es una feature de
`feature_list.json`: sin `checks` y sin resumen de cierre en `progress/summaries/`
(igual que `e2e-category-rules-779`).

Comprobado: los cuatro puntos del encargo, arquitectura, convenciones, documentos
que se vuelven falsos, vocabulario, `docs/lessons.md`, CHECKPOINTS C1-C5.
Sin hallazgos.

### Lo que ejecuté y lo que salió

- Antes de nada, `netstat -ano | grep ":3000"`: nada escuchando. El backend real no
  se arrancó ni se usó.
- Un test de usar y tirar en `src/__rv_probe__/rv.spec.ts`, con cuatro casos: un
  `fetch` sin mock que se traga el error; un `fetch` DELETE después de
  `vi.spyOn(...)` + `vi.restoreAllMocks()`; un `fetch` POST después de
  `vi.stubGlobal('fetch', …)` + `vi.unstubAllGlobals()`; y uno con mock que responde.
  - Sin nada en `:3000`: `Tests 3 failed | 1 passed (4)`, exit 1. Cada fallo con
    método y ruta, p. ej. `Error: During this test, a request was sent that no mock
    answered (unit tests never reach the network): DELETE /api/accounts`.
  - Con un servidor mío de prueba (`node:http` en `127.0.0.1:3000`, responde
    `{"probe":true}`; comprobado con `curl` que contestaba): el mismo resultado,
    `3 failed | 1 passed`, exit 1. El log del servidor solo tiene `listening` y el
    `GET /ping` de mi `curl`: no le llegó ninguna petición de los tests.
- Un archivo con `// @vitest-environment node` que hace `fetch` sin mock y se traga
  el error: `FAIL … GET /api/y`. La protección cubre también ese entorno.
- Lo borré todo (`src/__rv_probe__/`, el servidor y su log); `git status` no
  muestra nada mío.
- Ningún test se ha cambiado por esto: `git diff --stat` en `src/` solo tiene
  `MonthNav*` (cabo 44, fuera de esta revisión). No hay en `src/` ningún
  `undici`, `node:http` ni otra forma de saltarse el `setupFiles`, y
  `vitest.config.ts` es la única configuración de vitest (`test:unit` →
  `vitest run`).
- `pnpm test:unit`: `Test Files 133 passed (133)`, `Tests 2145 passed | 1 expected
  fail (2146)`, exit 0. El `expected fail` es el `it.fails` de
  `src/__tests__/no-network.spec.ts`, a propósito.
- `./init.sh`: exit 0. Tipos, oxlint, formato, tests unitarios, `vue-tsc --build` y
  E2E smoke (chromium) en `[OK]`; última línea `Entorno listo`.
- `git grep` en `docs/` de `setupFiles`, `vitest.config`, `restoreAllMocks` y
  `fetch real`: aparte de lo nuevo de `docs/conventions.md`, solo queda
  `docs/stack.md:878` («Vitest 5 … no exigió cambios en `vitest.config.ts`»), que
  habla de la feature #12 y sigue siendo cierto.
