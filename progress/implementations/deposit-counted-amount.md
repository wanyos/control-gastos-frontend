# deposit-counted-amount — implementación

## Lote A — implementación

**Estado: bloqueado en T12.** T1–T11 hechas, con sus tests en verde y marcadas en
`tasks.md`. `./init.sh` completo sale en rojo **solo** por el paso de pruebas de
navegador (`pnpm test:e2e --project=chromium`): 52 de 64 fallan porque las respuestas
simuladas de `GET /api/movements` escritas en `e2e/*.spec.ts` no llevan `deposit`, y
desde R1 la pantalla da error si falta. Esos archivos no están en la cabecera
`Archivos:` del Lote A, así que no los he tocado (ver «Bloqueo»).

No he escrito en la base de datos ni en carpetas de datos del humano.

### Archivos modificados / creados

Todos dentro de la cabecera `Archivos:` del Lote A.

- `src/shared/movements.ts` — tipos `DepositKind`, `DepositReason`, `MovementDeposit`;
  `Movement.deposit?`; `parseDeposit`; cuarto argumento de `parseMovement`
  (`'required' | 'absent'`, por defecto `'absent'`); `parseMovementPage` pasa `'required'`.
- `src/shared/deposits.ts` (nuevo) — `hiddenWhenHiding`, `depositCountsNothing`,
  `depositLine`, `countedLine`, `withKnownDeposit` y los textos de design §4.
- `src/shared/__tests__/movements.spec.ts`, `src/shared/__tests__/deposits.spec.ts` (nuevo).
- `src/assets/theme-dark.css` — línea
  `contrast: --warning on --surface-sunken >= 4.5 (deposit: doubtful text on a hovered row)`.
  La mide `theme-dark.spec.ts` sin tocarlo: pasa.
- `src/features/statement/components/StatementRow.vue` — R3–R8.
- `src/features/statement/components/MonthTotals.vue` — frase a la vista nueva, sexta
  frase plegada, y prop opcional `movementCount` para el número de movimientos.
- `src/features/statement/components/StatementList.vue` — prop opcional `visibleTotal`
  para decidir si está vacía y para `Showing x of y`.
- `src/features/statement/store.ts` — `visibleMovements`, `hiddenInBrowser`,
  `visibleTotal`, `hiddenCount` pasa a `computed`; `adoptUpdated` conserva `deposit` y
  quita de la lista una apertura o cancelación con la casilla puesta.
- `src/features/statement/views/StatementView.vue` — pasa `visibleTotal` a `MonthTotals`
  y a `StatementList`.
- `src/features/review/components/MovementRow.vue` — R9.
- `src/features/review/store.ts` — mapa `knownDeposits` que se llena en `adoptPage` y
  que `applyUpdated` usa con `withKnownDeposit`.
- Fixtures: `deposit: null` en los movimientos de `statement`, `review`, `overview` y
  `category-rules`; los de `import` no tienen ningún movimiento (su página de
  `GET /api/movements` trae `movements: []`), así que no ha hecho falta tocarlos.
  Fixtures nuevos de depósito (T5) en `statement` y `review`, con `asPatchAnswer` para
  fabricar la respuesta de un PATCH sin `deposit`.
- Specs: `StatementRow.spec.ts`, `MonthTotals.spec.ts`, `StatementView.spec.ts`,
  `statement/store.spec.ts`, `review/MovementRow.spec.ts`, `review/store.spec.ts`,
  `review/service.spec.ts`.
- `specs/31-deposit-counted-amount/tasks.md` (T1–T11 marcadas) y `progress/current.md`.

### Tests existentes que han cambiado, y por qué

Ninguno cambia de nombre. Ningún nombre de un `check` ha cambiado.

- `MonthTotals.spec.ts` › `shows one sentence and keeps the rest folded until it is opened`
  (nombra un check de la F29): cambia el texto esperado de la frase a la vista, la lista
  de frases plegadas gana la sexta y el recuento pasa de 5 a 6. Es lo que pide T8.
- `MonthTotals.spec.ts` › `is the fixed text, word for word (R14)` y
  `carries no figure of any kind: not one digit (R14)`: no se han editado; usan las
  mismas constantes del archivo, que ahora llevan la frase nueva.
- `StatementView.spec.ts` ›
  `shows the scope line with the count of the filter, and keeps the note (R5, R6)`:
  esperaba la frase a la vista antigua letra por letra; ahora
  espera la nueva. Mismo motivo que el anterior.
- `review/service.spec.ts` › `keeps the whole movement, not only the painted fields`:
  compara el movimiento leído campo a campo; gana `deposit: null` en lo esperado,
  porque la lectura ahora lo trae.

### Decisiones tomadas

- `parseMovement` en modo `'required'` rechaza con `movements[i].deposit is not null or a
  deposit object` si falta la clave; si la clave está, cada campo se comprueba con los
  validadores de siempre (`asMember` estricto en `kind` y `reason`).
- `withKnownDeposit`: si la respuesta trae `deposit` gana la respuesta; si no lo trae,
  se pone el de la última lectura; si no se conoce ninguno, se deja tal cual.
- `hiddenCount` = (total sin esconder − `pagination.total`, como antes, nunca negativo)
  + filas quitadas en el navegador. `null` en los mismos casos que antes.
- En `StatementRow`, un vencimiento resuelto pinta el importe en `text-ink-muted` y el
  concepto como hoy (`text-ink-strong`), según la tabla de design §3.
- En `Review`, el texto de depósito va en el mismo renglón que la cuenta y la fecha,
  después de la fecha. Las líneas que no son de depósito no cambian (tampoco ganan
  tachado si están marcadas o emparejadas).
- La prueba de `Review` (T7) no importa `StatementRow`: comprueba los mismos textos y
  clases que los tests de `StatementRow`, para no hacer depender `review` de
  `statement` ni en los tests.

### Trazabilidad

- R1 → `reads the deposit of every movement and rejects a missing one`
- R2 → `keeps the deposit a PATCH answer does not carry`, `keeps the deposit of a line after changing its category`, `keeps the deposit of a line that comes back with Undo`
- R3 → `crosses out a deposit opening and a deposit cancellation and greys their description`
- R4 → `writes the kind of deposit movement under the description next to the account`, `writes the line of each kind of deposit movement and of each doubtful reason`
- R5 → `shows on a deposit maturity the bank amount and under it only the interest that counts`
- R6 → `keeps the bank amount and its sign on every deposit movement`
- R7 → `shows a doubtful deposit with its reason and its amount crossed out`
- R8 → `never writes Transfer or Not counted on a deposit movement`
- R9 → `paints a deposit line in Review the same way as in Movements`, `leaves the lines of Review that are not deposits as they were`
- R10 → `says under the figures that a deposit counts only by its interest`, `shows one sentence and keeps the rest folded until it is opened`
- R11 → `the checkbox hides deposit openings and cancellations and keeps a maturity that counts its interest`
- R12 → `counts the hidden deposit openings and cancellations in Hiding`
- R13 → `counts the hidden deposit openings and cancellations in Hiding` (número de la tarjeta y `Showing 2 of 248`), `a month whose movements are all deposit openings says everything is hidden`
- R14 → `paints the backend totals untouched in a month with deposit movements`
- R15 → `contrast: --warning on --surface-sunken >= 4.5` (lo mide `theme-dark.spec.ts`)

Comprobación de que los tests de R2 miden algo: con `withKnownDeposit` cambiado a
mano para que devolviera siempre la respuesta tal cual, los dos tests de las tiendas
fallaron (`Tests  2 failed | 129 skipped`); después se dejó el archivo como estaba
(`diff` sin diferencias).

### Documentos actualizados

Ninguno: no hay documentos en la cabecera del Lote A. Lo que `git grep` encuentra fuera
de `progress/` y `specs/` y ha dejado de ser verdad:

- `git grep -n "leave out the movements labelled"` → `docs/guia-de-uso.md:403` cita la
  frase antigua, y `docs/guia-de-uso.md:404` dice «cinco frases más» (ahora son seis).
  Es T13, Lote B. Los cuatro `e2e/*.spec.ts` que la nombran solo usan el principio de la
  frase (`NOTE_START`), que no ha cambiado.
- `docs/architecture.md` no menciona aún `shared/deposits.ts`: T14, Lote B.
- `docs/roadmap.md:461` (cabo suelto 37) describe el fallo que esta feature arregla: lo
  cierra el leader.

### Prueba real

El backend ya estaba en marcha en el puerto 3000 (no lo he arrancado yo). Tres lecturas
`GET /api/movements` (solo lectura), guardadas en la carpeta temporal de la sesión,
fuera del repositorio, pasadas por `parseMovementPage` y por las funciones de
`shared/deposits.ts` con un spec temporal que se borró nada más ejecutarse
(`git status` limpio de él). Después se borraron también las respuestas guardadas.
Recuentos y forma, sin contenido:

| Lectura | Filas | Movimientos de depósito | Clases | Con `Counts …` | Pintados como que no cuentan | Los quitaría la casilla | Con marca o traspaso |
|---|---|---|---|---|---|---|---|
| octubre de 2026 | 30 | 6 | 3 aperturas, 2 cancelaciones, 1 vencimiento | 1 | 5 | 5 | 0 |
| octubre de 2026 con `excluded=none&transfer=none` | 28 | 6 | igual | 1 | 5 | 5 | 0 |
| agosto de 2025 | 34 | 2 | 1 apertura, 1 vencimiento dudoso `principal_not_found` | 0 | 2 | 1 | 0 |

Ninguna lectura dio `ValidationError`. Textos que salen (con las cifras cambiadas por
`#`): `Deposit opening`, `Deposit cancellation`,
`Deposit maturity · only the interest counts` y
`Doubtful deposit maturity · no deposit amount found for it · not counted for now`.
Con la casilla puesta, octubre se quedaría en 28 − 5 = 23 filas a la vista.

### Último ./init.sh

`timeout 900 ./init.sh` → **exit 1**. Todo en verde salvo el paso de pruebas de navegador:

```
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  108 passed (108)
      Tests  1839 passed (1839)
[OK]    Todos los tests pasan
[OK]    Cabeceras Archivos: de 20 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[FAIL]  E2E smoke rojo (chromium):
  52 failed
  12 passed (2.0m)
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
```

Fallos por archivo: `action-notice-in-view` 13, `category-rules` 6,
`statement-exclude-from-totals` 6, `statement` 6, `statement-fix-category` 5,
`statement-noise-toggle` 5, `review-actions` 4, `review-queue` 4, `overview` 3. En el
contexto de error que guarda Playwright la pantalla dice
`The server answered, but the list couldn't be read.`

Comprobación de la causa: con `parseMovementPage` cambiado a mano a `'absent'` (sin
exigir `deposit`), `pnpm test:e2e --project=chromium e2e/review-queue.spec.ts e2e/statement.spec.ts`
dio `11 passed`; después se restauró el archivo (copia idéntica).

### Último ./init.sh --checks

- `timeout 900 ./init.sh --checks 31` → exit 0, `Checks: 10 de 10 en verde.`
- `timeout 900 ./init.sh --checks 29` → exit 0, `Checks: 11 de 11 en verde.`
- `timeout 900 ./init.sh --checks 30` → **exit 1**, `Checks: 8 de 9 en verde.` Falla el
  check 1, que es una prueba de navegador
  (`e2e/category-rules.spec.ts -g "the result of applying stays in view from Rules to Review"`):
  misma causa, la pantalla `Review` dice `The server answered, but the list couldn't be read.`
  Los otros 8 checks de la F30 (pruebas unitarias) pasan.

### Bloqueo

Para cerrar T12 hace falta añadir `deposit: null` a los movimientos que fabrican estas
simulaciones de `GET /api/movements`, cada una en su función que construye un movimiento
(la que hoy lleva `excludedFromTotals: false`):

- `e2e/action-notice-in-view.spec.ts`
- `e2e/category-rules.spec.ts`
- `e2e/overview.spec.ts`
- `e2e/review-actions.spec.ts`
- `e2e/review-queue.spec.ts`
- `e2e/statement-exclude-from-totals.spec.ts`
- `e2e/statement-fix-category.spec.ts`
- `e2e/statement-noise-toggle.spec.ts`
- `e2e/statement.spec.ts`

`e2e/transfer-pairs-review.spec.ts` también fabrica movimientos, pero sus pruebas pasan
y no lo he revisado más. Design §2 ya decía «los fixtures crudos de `GET /api/movements`
… necesitan `deposit: null`», pero la cabecera `Archivos:` del Lote A no incluye `e2e/`.
Hace falta que el spec añada esos archivos (al Lote A o a un lote nuevo) antes de tocarlos.

### Sugerencias fuera de scope (NO aplicadas)

- `docs/roadmap.md`, cabo 37: cerrarlo cuando la feature quede hecha (es del leader).

## Lote A — cierre de T12

**Estado: bloqueado.** T12 sin marcar.

### Lo hecho

`deposit: null,` añadido, una línea por archivo, en la función que construye un
movimiento simulado (justo después de `excludedFromTotals: false,`) de los nueve
archivos de `e2e/` de la cabecera corregida. `git diff --stat e2e/` → `9 files changed,
9 insertions(+)`. Ninguna aserción ni ningún nombre de prueba ha cambiado.

### Resultado

`timeout 900 pnpm test:e2e --project=chromium` → exit 1, `2 failed`, `62 passed (31.2s)`.
Antes eran 52 fallos; los 50 que se debían a la falta de `deposit` pasan.

Los dos que siguen fallando están en `e2e/statement-noise-toggle.spec.ts` y no tienen que
ver con `deposit`: cuentan las frases plegadas de la nota de `MonthTotals`, que T8 ha
pasado de cinco a seis (design §4).

- `the note is permanent, carries the live sentence and nothing else numeric`
  (línea 362): `expect(more.locator('li')).toHaveCount(6)` → `Expected: 6, Received: 7`
  (seis frases fijas más la de los grupos dudosos).
- `with no doubtful group the note keeps only its fixed text` (línea 390):
  `expect(more.locator('li')).toHaveCount(5)` → `Expected: 5, Received: 6`. El comentario
  de la línea 389 dice además «the five fixed sentences».

Arreglarlos exige cambiar esas dos aserciones (6 → 7 y 5 → 6) y el comentario, que es
lo que la corrección del leader prohíbe. Ningún `check` de `feature_list.json` nombra
estas dos pruebas (`grep` de sus nombres en `feature_list.json`: sin resultados).

No he lanzado `./init.sh` ni `./init.sh --checks` en esta pasada: con estas dos pruebas
en rojo `./init.sh` no puede salir con 0.

### Otros sitios que necesitan `deposit`

Ninguno encontrado que rompa algo: la pasada completa de chromium solo falla en las dos
pruebas de arriba. `e2e/transfer-pairs-review.spec.ts` fabrica movimientos sin `deposit`,
pero sus pruebas pasan en esta pasada; no lo he tocado.

### Segunda pasada (tras la decisión del leader)

**Estado: T12 hecho y marcado `[x]`.**

Antes de cambiar nada, comprobé con `git diff src/features/statement/components/MonthTotals.vue`
que la única frase añadida a `MORE_LINES` es la sexta, la de T8: «Opening or cancelling a
deposit is not counted. When one matures, only its interest counts. A doubtful one counts
nothing until the app knows how much was put in.» Es la frase de que los depósitos solo
cuentan por sus intereses; no hay otra.

Cambios en `e2e/statement-noise-toggle.spec.ts` (nada más del archivo, ningún nombre de
prueba):
- línea 362: `toHaveCount(6)` → `toHaveCount(7)`.
- línea 389: comentario «the five fixed sentences» → «the six fixed sentences».
- línea 390: `toHaveCount(5)` → `toHaveCount(6)`.

Resultados (todos con `timeout 900`):
- `./init.sh` → exit 0. Vitest: `Test Files 108 passed (108)`, `Tests 1839 passed (1839)`;
  tsc, oxlint, prettier, `pnpm type-check` en OK; `E2E smoke verde (chromium)`. Última
  línea: `[OK] Entorno listo. Puedes empezar a trabajar.`
- `pnpm test:e2e --project=chromium` lanzado aparte para tener el recuento (que `./init.sh`
  no imprime): `64 passed (19.5s)`, exit 0.
- `./init.sh --checks 31` → exit 0, `Checks: 10 de 10 en verde.`
- `./init.sh --checks 30` → exit 0, `Checks: 9 de 9 en verde.`
- `./init.sh --checks 29` → exit 0, `Checks: 11 de 11 en verde.`
- `./init.sh --checks 28` → exit 0, `Checks: 8 de 8 en verde.`
- `./init.sh --checks 27` → exit 0, `Checks: 12 de 12 en verde.`

No he arrancado ni parado servidores a mano; las e2e usan sus respuestas simuladas, sin
backend real. La feature no está marcada `done`.

## Lote B — implementación

**Estado: T13 y T14 hechas y marcadas `[x]`.** Solo se han tocado `docs/guia-de-uso.md`
y `docs/architecture.md` (cabecera `Archivos:` del Lote B), más `tasks.md` (las dos
marcas) y `progress/current.md`. No he escrito en la base de datos ni en carpetas de
datos del humano; no he arrancado ni parado servidores.

### Archivos modificados

- `docs/guia-de-uso.md` (T13):
  - `Movements`, paso 4: la frase «los 29 apuntes de depósito ya estaban marcados así»
    pasa a «estaban marcados así; hoy ya no (ver el párrafo de debajo de tu nota)», y
    debajo de la nota del humano, un párrafo «Nuevo desde la feature 31…»: los
    movimientos de depósito ya no se marcan, el backend decide lo que cuentan desde su
    feature 57 y su cambio quitó la marca; ya no llevan `Transfer` ni `Not counted`.
  - Paso 5: párrafo nuevo debajo del `-- ok` del humano (texto del paso sin tocar): la
    casilla quita también aperturas y cancelaciones y las suma a `Hiding`; no quita el
    vencimiento ni el dudoso; el número de la tarjeta baja con ellas.
  - Paso 13: el texto del paso pasa a pasado («Hasta la feature 31, a la vista había…
    se abrían cinco frases más»), y debajo de la nota del humano un párrafo con la
    frase nueva y la sexta frase plegada, letra por letra como en `MonthTotals.vue`.
  - Paso nuevo sin número después del 13 («Nuevo desde la feature 31… los movimientos
    de depósito»): octubre de 2026 (aperturas, cancelaciones, el vencimiento con
    `Counts 37,07 €`, importe del banco con su signo), agosto de 2025 (el dudoso con su
    texto en ámbar) y la casilla en los dos meses. Sin número para no renumerar los
    pasos 14–23, que llevan notas del humano debajo.
  - Paso 20: párrafo debajo de la nota del humano: no elegir un movimiento de depósito
    para esa prueba (la marca no cambia ninguna cifra ni se ve en la línea).
  - Tabla «Qué escribe y cómo se deshace», fila `Exclude from totals`: una frase sobre
    la marca en un movimiento de depósito.
  - «Lo que no hace o hace a medias»: el punto del recuento que no cuadra (incluye las
    aperturas y cancelaciones, y dice los dos casos que la casilla deja a la vista);
    «Nada se marca solo» (los de depósito ya no hay que marcarlos, por la feature 57 del
    backend, también los de cada importación); dos puntos nuevos: el límite de 200
    movimientos y que la casilla esconde un vencimiento marcado o emparejado (las dos
    incoherencias heredadas de `decisions.md`).
  - `Review`, paso 3: párrafo debajo del `-- ok`: una fila de depósito se ve igual que
    en `Movements`; las demás no cambian.
  - «El trabajo que solo puedes hacer tú», A: el párrafo «Y cada vez que importes…
    repite los pasos 2 a 7» se sustituye por uno que dice que desde la feature 57 del
    backend los movimientos de depósito de myinvestor ya no se marcan, que el backend
    los cuenta solo por sus intereses también en cada importación, y que este trabajo
    queda solo para los traspasos.
- `docs/architecture.md` (T14): en la estructura de carpetas, `shared/deposits.ts` con
  la línea de por qué vive en `shared/` (lo usan `statement` y `review`, que no se
  importan); además, porque lo cambió el Lote A y la estructura quedaba incompleta:
  `shared/movements.ts` lee `deposit`, `statement/store.ts` gana `visibleMovements`,
  `hiddenInBrowser`, `visibleTotal` y `hiddenCount` computed, `review/store.ts` gana
  `knownDeposits`. Y tras el párrafo de la feature #23 («Esconder se hace en el
  servidor, nunca filtrando aquí la lista ya descargada»), que dejaba de ser verdad, un
  párrafo «La excepción de los movimientos de depósito (feature #31)».

### Las notas del humano en `docs/guia-de-uso.md`

Copia del archivo antes de editar en la carpeta temporal de la sesión; comparación
después:

- Líneas que empiezan por `--` (con su sangría): **106 antes, 106 después**;
  `diff` de las dos listas: sin diferencias.
- Líneas que empiezan por `>` (cabecera y los diez bloques «Mis notas de esta prueba»):
  **73 antes, 73 después**; `diff`: sin diferencias.
- `git diff -U0 docs/guia-de-uso.md`, líneas quitadas: solo texto de la guía (paso 4,
  dos líneas; paso 13, dos líneas; la fila de la tabla; el punto del recuento, dos
  líneas; «Nada se marca solo», dos líneas; el párrafo «Y cada vez que importes», tres
  líneas). Ninguna es una nota ni una línea de continuación de una nota.
- Línea justo encima de cada nota, antes y después (`grep -B1`): cambia **una**, la
  última del texto del paso 4, encima de la nota «-- la cantidad no esta en gris…», que
  no es un `-- ok`. Encima de ningún `-- ok` hay texto nuevo.

### Comprobación con datos reales

Para escribir el paso nuevo, dos lecturas `GET /api/movements` (solo lectura) al backend
que ya estaba en marcha, octubre de 2026 y agosto de 2025, sin guardar las respuestas.
Recuentos: octubre, 30 movimientos, 3 aperturas, 2 cancelaciones y 1 vencimiento
resuelto con `countedAmount` 37.07, ninguno con marca ni traspaso; agosto, 34
movimientos, 1 apertura y 1 vencimiento dudoso `principal_not_found`. Que la migración
de la feature 57 quitó las marcas lo dice `gastos-backend/docs/api-contract.md`
(§«Movimientos de depósito en las sumas»). La guía no la he probado en el navegador; por
eso cada párrafo nuevo dice «sin probar en tu primera revisión».

### Documentos actualizados

`git grep -n -i 'leave out the movements labelled\|cinco frases\|five fixed\|apuntes de depósito\|depósito.*marca\|marca.*depósito' -- . ':!progress' ':!specs'`:
las líneas de `docs/guia-de-uso.md` quedan corregidas (las que citan la frase antigua
están en pasado). Fuera de mi lote y ya no verdad:

- `docs/roadmap.md:46`, `:231` y `:287` dicen que los 29 apuntes de depósito están
  marcados; desde la feature 57 del backend ya no. El roadmap no lo puedo tocar: queda
  para el leader, junto con el cabo 37 (`docs/roadmap.md:461`).
- `feature_list.json:911` y `:920` (la feature 22) hablan de marcar los depósitos: es
  el texto histórico del humano, no lo toco.

### Último ./init.sh

`timeout 900 ./init.sh` → exit 0. `Test Files 108 passed (108)`,
`Tests 1839 passed (1839)`, `E2E smoke verde (chromium)`. Última línea:
`[OK]    Entorno listo. Puedes empezar a trabajar.`

### Último ./init.sh --checks 31

`timeout 900 ./init.sh --checks 31` → exit 0. Última línea:
`[OK]    Checks: 10 de 10 en verde.`

### Sugerencias fuera de scope (NO aplicadas)

- `docs/roadmap.md` líneas 46, 231 y 287: añadir que desde la feature 57 del backend
  los apuntes de depósito ya no llevan la marca.

- Corrección tras la revisión: en `src/features/review/store.ts`, `import type { MovementDeposit } from '@/shared/movements'` pasa del bloque de imports relativos (`./`) al bloque de alias `@/`, detrás de `@/shared/errors` (orden de `docs/conventions.md`). `./init.sh`: exit 0; `./init.sh --checks 31`: 10 de 10 en verde.
