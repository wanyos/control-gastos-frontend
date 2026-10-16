# Review — deposit-counted-amount (F31)

## Review 2026-10-16

**Veredicto:** CHANGES_REQUESTED

### Cambios requeridos
1. `src/features/review/store.ts:21` — `import type { MovementDeposit } from '@/shared/movements'`
   está entre los imports relativos (después de `./service`, antes de `./types`).
   `docs/conventions.md` §Imports dice que el orden es vendor, luego alias `@/` y luego relativos `./`,
   con una línea en blanco entre grupos. Hay que subirlo al bloque `@/`, entre
   `@/shared/errors` (línea 8) y la línea en blanco. El lint no lo detecta. Solo cambia
   esa línea de sitio: ningún test ni check se ve afectado.

### Comprobado sin hallazgos
R1–R15 ↔ tests, tasks (14 de 14 en `[x]`), hoja de decisiones (🔴 = 6, 15 requirements,
procedencia completa), arquitectura (`shared/deposits.ts`, sin importaciones entre `statement`
y `review`), el resto de convenciones, vocabulario, CHECKPOINTS C1–C7 (C4 bis incluido).
Checks: 10 de 10 en verde.

Qué ejecuté y qué salió:
- `timeout 900 ./init.sh` → EXIT 0: `Test Files 108 passed (108)`, `Tests 1839 passed (1839)`,
  tsc, oxlint, prettier, `vue-tsc --build` en OK, `E2E smoke verde (chromium)`.
- `timeout 900 ./init.sh --checks N` → 31: `10 de 10`; 27: `12 de 12`; 28: `8 de 8`;
  29: `11 de 11`; 30: `9 de 9`. Todos EXIT 0.
- Cada filtro `-t` de los checks de la F31, lanzado aparte: los 9 dan `1 passed` (ninguno
  sale en verde sin ejecutar nada); `theme-dark.spec.ts` da `182 passed` y en el modo
  detallado sale la línea `contrast: --warning on --surface-sunken >= 4.5` medida. Leídos los
  tests: cada uno comprueba las clases, los textos o las cifras de su frase, así que falla si
  el comportamiento se rompe.
- Lectura de `deposit`: coincide campo a campo con `gastos-backend/docs/api-contract.md`
  (`kind`, `principal`, `countedAmount`, `ambiguous`, `reason`, `candidateMovementIds`). Si
  falta la clave o la forma está mal → `ValidationError` con la ruta. `transfers` y los PATCH
  la dejan ausente. Overview y category-rules la leen a través de `getMovements`, e import
  tiene `movements: []`; la suite y las e2e de esas features pasan.
- Prueba propia de la tienda `statement` (archivo temporal en `test-results/`, que git
  ignora, borrado después; `1 passed`). Con la casilla puesta, un filtro de cuenta y dos
  páginas, la página 1 da `shown 1, visibleTotal 3, Hiding 4` y, tras `Load more`,
  `shown 2, visibleTotal 2, Hiding 5`; el dudoso sigue en la lista. Un `deposit.ambiguous`
  que no es booleano deja la pantalla en error.
- Datos reales, solo `GET` (las peticiones que no eran GET se cortaban y no hubo ninguna),
  en un Chromium aparte contra :5173:
  - Octubre de 2026: 30 movimientos, 3 aperturas y 2 cancelaciones tachadas en gris y el
    vencimiento de `25.037,07 €` en gris, sin tachar, con `Counts 37,07 €` en verde. Con la
    casilla puesta quedan 23 líneas, la tarjeta dice `23 movements` y `Hiding 7` (2 los quita
    el backend y 5 la casilla). Las cifras son las mismas con la casilla y sin ella
    (`203,92 €` / `3.455,20 €`).
  - Agosto de 2025: el dudoso, tachado y con
    `Doubtful deposit maturity · no deposit amount found for it · not counted for now` en
    ámbar `rgb(245,158,11)`. Contraste 8,08 sobre la línea y 8,84 con el ratón encima. Con la
    casilla puesta sigue en la lista (34 → 31 líneas, `Hiding 3`).
  - Review: las líneas de depósito pendientes se ven igual que en Movements. Ninguna
    enseña `Transfer` ni `Not counted`; el único «Transfer» que encontré era una opción del
    desplegable de categorías.
- `docs/guia-de-uso.md`: las 106 notas `--` y las 73 líneas `>` son idénticas a `HEAD`. Ningún
  texto nuevo queda encima de un `-- ok`. Los pasos 4 y 13, que llevan debajo una nota que
  no es `-- ok`, se han reescrito como pide T13; las notas siguen intactas.
- Fixtures: los IBAN (`ES6301289999990123456789`, `ES0000000000000000000002`) no son de
  ninguna de las 5 cuentas reales (comprobado con `GET /api/accounts`). Las descripciones son
  inventadas. Ninguna prueba habla con `localhost:3000`.

## Review 2026-10-16 (segunda pasada)

Hubo un primer rechazo (arriba): en `src/features/review/store.ts` el
`import type { MovementDeposit } from '@/shared/movements'` estaba entre los imports
relativos `./`, en contra del orden de `docs/conventions.md` §Imports.

**Veredicto:** APPROVED
Comprobado: acceptance/requirements ↔ tests, arquitectura, convenciones,
verificación, CHECKPOINTS C1-C8. Checks: 10 de 10 en verde.
Sin hallazgos.
Resumen de cierre: `progress/summaries/deposit-counted-amount.md`.

Qué ejecuté y qué salió:
- `git diff src/features/review/store.ts`: el import está ahora en el bloque `@/`, detrás de
  `@/shared/errors` y antes de la línea en blanco (línea 9). El resto del diff del archivo
  (`withKnownDeposit`, `knownDeposits`, `adoptPage`, el bucle de las respuestas del PATCH)
  es el mismo que revisé en la primera pasada.
- `timeout 900 ./init.sh --fast` → exit 0, `tsc` sin errores (en este modo no se lanzan los tests).
- `timeout 900 ./init.sh --checks 31` → exit 0, `Checks: 10 de 10 en verde.`
- Cada filtro `-t` de los 9 checks que filtran por nombre, lanzado aparte: los 9 dan
  `1 passed`; `theme-dark.spec.ts` da `182 passed`.
- `pnpm exec vitest run src/features/review` → `17 passed` archivos, `273 passed` tests.
