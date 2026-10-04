# overview-previous-months — implementación

## Lote A — implementación

Tasks cerradas: T1, T2, T3, T4 y T5 (2026-10-04). Sin commits. La feature sigue
`in_progress`.

### Para el leader, antes de lanzar los lotes B y C

1. **Las cifras reales de 2024-10 a 2025-02 que me pasaste NO están en las fixtures.**
   El spec aprobado dice otra cosa en cuatro sitios, y el spec manda: T3 fija la
   respuesta del periodo en `60135.60` / `80934.73` / `-20799.13` y 863 movimientos; T5
   (d) pide que de `2024-10` a `2025-02` las filas salgan `empty`; T10 cuenta nueve filas
   con `net` negativo (con esos cinco meses serían catorce); T13 busca en el navegador
   una fila `No movements`. Además, meter esos meses en la tabla de meses de
   `fixtures.ts` cambiaría lo que leen `reading.spec.ts` y `store.spec.ts`, que C2
   prohíbe tocar. He seguido el spec. Si quieres esas cifras en los tests, hace falta
   cambiar el spec primero.
2. **Dos líneas que este lote vuelve falsas y están fuera de sus archivos** (ver
   «Documentos actualizados»): `docs/architecture.md` (la tiene la T14 del Lote D) y
   `docs/roadmap.md:383` (no está en la cabecera `Archivos:` de ningún lote).
3. **La respuesta real del periodo no ha pasado por el código nuevo**; solo se ha
   comprobado su forma (ver «Prueba real»).

### Archivos modificados / creados

- `src/features/overview/types.ts` — añadidos `PeriodTotals`, `NetSign` y `MonthRow`.
  Nada de lo que había cambia.
- `src/features/overview/service.ts` — añadida `getPeriodTotals(from, to, client?)`. Las
  tres lecturas de la F25 no cambian. Cambia el comentario de cabecera, que decía que el
  archivo tenía tres lecturas.
- `src/features/overview/previousMonths.ts` — nuevo. `SHOWN_MONTHS`, `shownMonths`,
  `summedPeriod`, `scaleTop`, `buildMonthRows`, `periodSentence`, `leftOutLine`,
  `notShownLine`, `dataEndsLine` y las constantes de texto.
- `src/features/overview/__tests__/fixtures.ts` — añadidos: el valor `'period'` en
  `ReadKind`, la rama de `readOf` (`from` y `to` de meses distintos), `PERIOD`
  (exportado, de tipo `PeriodTotals`), `rawPeriodPage()` y la rama de `mockBackend`, que
  responde solo a `2024-10-01`…`2026-08-31` y rechaza cualquier otro rango. Además de
  los añadidos cambian tres líneas de comentario y la línea del tipo `ReadKind`.
- `src/features/overview/__tests__/previousMonths.spec.ts` — nuevo, 44 tests.
- `src/features/overview/__tests__/previousMonthsService.spec.ts` — nuevo, 7 tests.
- `specs/26-overview-previous-months/tasks.md` — T1 a T5 marcadas.
- `progress/current.md` — el plan del lote.

### Lo que dejo para los lotes B, C y D

- `fixtures.ts` exporta `PERIOD` y `rawPeriodPage()`. Una lectura de periodo llega al
  `override` de `mockBackend` con `read.kind === 'period'` y `read.month === '2024-10'`
  (el mes de `from`), así que un test puede hacerla fallar o retenerla igual que las
  demás. `api.count('period')` la cuenta. `api.months()` no la incluye.
- Con una fecha del último dato distinta de la de la fixture (por ejemplo
  `2026-09-30`), el periodo que calcula `summedPeriod` es otro y `mockBackend` lo
  rechaza por defecto: el test que lo necesite lo responde con `override`.
- `buildMonthRows` devuelve los `totals` de cada mes como **el mismo objeto** que hay
  en `figuresByMonth` (hay un test que lo afirma con `toBe`).

### Decisiones tomadas

- **`MONTH_COLUMN_LABEL = 'Month'`**, que design §4 no lista. Design §6 pide la
  cabecera `Month` y design §2 dice que `previousMonths.ts` tiene todos los textos de
  este bloque; el Lote C no puede tocar ese archivo, así que la constante tiene que
  existir ya.
- **`notShownLine` devuelve `null` con una lista de meses vacía** (base sin
  movimientos). El spec no cubre ese caso; sin filas, el texto `… is not one of these
  months.` no hablaría de nada.
- **`periodSentence` usa `period.to` para `{last}`** y el parámetro `first` para
  `{first}`, como dice la firma de design §4; no lee `period.from`.
- **La página que responde la fixture al periodo lleva un movimiento** con fecha
  `2026-08-31`, porque con `pageSize=1` y 863 coincidencias el backend devuelve uno.
- **«Nunca `number` sobre un importe» (T5 d)** se comprueba leyendo el fuente de
  `previousMonths.ts`: no contiene `Number(`, `parseFloat`, `parseInt`, `Math.` ni
  `sumAmounts`.
- Tests añadidos que la T5 no nombra: febrero bisiesto en `summedPeriod`; un mes
  incompleto con cifras muy altas no cambia la escala; todos los meses completos a
  `0.00` dan anchos `0`; un periodo con movimientos que suman cero no es el caso 1 de
  R11; `mockBackend` de `fixtures.ts` (lo que responde a `fetch` en los tests) rechaza un rango distinto del previsto.

### Trazabilidad (parcial: solo lo que cubre el Lote A)

Lo puro y la lectura. La parte de pantalla de cada requisito la cubren los lotes B, C
y D; la trazabilidad completa `R1…R15` es de la T14.

- R1 → `previousMonths.spec.ts` › «is the 24 months that end in the month of the last
  data, newest first», «crosses two changes of year without skipping a month», «is
  empty when the base has no movements»
- R2 → «August 2026: the backend totals, its two widths, a negative sign, and shown
  above», «hands over the totals of the backend untouched, as the same strings (R2, C3)»
- R3 → «is the highest figure, in or out, of the 18 complete months of the fixture»,
  «January 2026: its two widths and a positive sign», «July 2025 sets the scale: what
  went out fills the whole bar», «an incomplete month does not set the scale, however
  high its figures»
- R4 → «nine of the 18 complete months spent more than came in (R4)», «a net of exactly
  zero with money moving reads as zero»
- R5 → «marks the month shown above, and only that one (R5)»
- R6 → «marks no row when the month shown above is none of them (R6)», «names the month
  shown above when it is none of the 24»
- R9 → «September 2026 is incomplete: its totals, no widths and no sign (R9)», «says
  where the data ends, with the date as the rest of the app writes it»
- R10 → «from October 2024 to February 2025 the fixture has no movements: empty, with
  no totals (R10)», «a month with movements that add up to zero is complete, not empty
  (R10)»
- R11 → los seis tests de `periodSentence (R11)`; los cinco de `summedPeriod (R11)`;
  `previousMonthsService.spec.ts` › «asks for the whole run of months in one request
  and hands over the backend sums (R11)»
- R12 → los tres tests de `leftOutLine (R12)`
- R13 (solo «sin filas a medias») → «is null while any month is missing: no rows by
  halves (R13)»
- C1 → `previousMonthsService.spec.ts` › «only sends a GET to /api/movements, with no
  body (C1)»
- C2 → los cuatro specs de la F25 pasan sin tocarse (salida abajo) y el check 10 está
  en verde
- C3 → «never turns an amount into a number (C3)»
- R7, R8, R14, R15 → nada en este lote.

### Los cuatro specs de la F25, sin tocarlos (T3)

`pnpm exec vitest run` sobre `reading.spec.ts`, `store.spec.ts`, `service.spec.ts` y
`components.spec.ts` de `src/features/overview/__tests__/`:

```
 Test Files  4 passed (4)
      Tests  85 passed (85)
exit=0
```

`git status --short` no lista ninguno de los cuatro. `OverviewView.spec.ts` tampoco
está modificado y pasa dentro de la suite completa.

### Documentos actualizados

`git grep -n "three reads\|tres lecturas\|ReadKind\|Which of the three" -- . ':!progress' ':!specs'`

- `src/features/overview/service.ts:1` — corregida (está en mi lote).
- `src/features/overview/__tests__/fixtures.ts` — corregido el comentario de `ReadKind`.
- **Sin corregir, fuera de los archivos del Lote A:**
  - `docs/architecture.md:132` («`service.ts` # tres lecturas…») y `:167` («sus tres
    lecturas son `GET /api/movements`»): ahora son cuatro. El archivo es del Lote D
    (T14, design §8).
  - `docs/roadmap.md:383` («Solo lectura: tres lecturas `GET /api/movements`»): habla
    de lo que dejó la F25 al cerrarse. No está en la cabecera `Archivos:` de ningún lote
    ni en design §8. Decide el leader si es histórico o se corrige.

### Prueba real

Hecha a medias, y lo digo como es:

- **Lo comprobado** (2026-10-04, dos `GET` con `curl` al backend real, ninguna
  escritura): `GET /api/movements?from=2024-10-01&to=2026-08-31&pageSize=1` responde
  200 con las claves `movements`, `pagination`, `totals`; 1 movimiento en la página;
  `pagination.total` 1.081 (el mismo recuento que leyó el leader); `totals` con
  `income`, `expense` y `net`, los tres strings con dos decimales. `GET
  /api/movements?pageSize=1` responde 200 con la misma forma y `pagination.total` 1.607.
- **Lo que no he comprobado:** que esa respuesta real pase por `getPeriodTotals` y
  `periodSentence`. Lo intenté dos veces con un test desechable en la carpeta temporal
  de la sesión, fuera del repositorio, y Vitest no lo carga desde fuera de la raíz del
  proyecto (primero falló al cargar la configuración; después, `Cannot find module
  '/@fs/…/real.spec.ts'`). Hacerlo exige un archivo de test temporal dentro de `src/`,
  que no está en los archivos de este lote, así que paré ahí. Queda para la T15 o para
  quien pueda crear ese archivo.
- Los dos archivos con las respuestas reales estaban en la carpeta temporal de la
  sesión, fuera de git, y están borrados. Ningún dato real ha entrado en el
  repositorio en este lote: `PERIOD` es la suma de los 18 meses que la fixture ya
  tenía, con las cifras que fija la T3.

### Último ./init.sh

```
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  101 passed (101)
      Tests  1626 passed (1626)
[OK]    Todos los tests pasan
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
init exit=0
```

Antes del lote eran 99 archivos y 1.575 tests (según `progress/current.md`); los dos
archivos nuevos suman 51 tests.

`pnpm type-check` (`vue-tsc --build`): exit 0. La primera pasada salió con exit 2
(`Property 'toSorted' does not exist on type 'string[]'` en `previousMonths.spec.ts`);
`./init.sh` no lo veía porque su `tsc` no mira los tests con esa configuración. Corregido
y vuelto a lanzar todo.

`pnpm build`: no lanzado en este lote (lo pide la T14).

### Último ./init.sh --checks 26

exit 1: **1 de 11 en verde**, que es lo esperado al acabar el Lote A.

- En verde: el 10 («No quiero que cambie nada de la parte del mes…»: los archivos de la
  F25 son idénticos al commit `a68df91` y sus cuatro specs pasan).
- En rojo, los diez restantes: buscan tests en `PreviousMonths.spec.ts`,
  `OverviewPreviousMonths.spec.ts`, `previousMonthsStore.spec.ts` y
  `e2e/overview.spec.ts`, que son de los lotes B, C y D y todavía no existen
  (`grep: … No such file or directory`).

### Sugerencias fuera de scope (NO aplicadas)

- `./init.sh` lanza `tsc --noEmit` y no `vue-tsc --build`, así que un error de tipos en
  un archivo de test puede pasar con la salida en verde (es lo que ocurrió aquí con
  `toSorted`). `docs/verification.md` ya lo dice y manda lanzar `pnpm type-check` al
  cierre; quien haga los lotes B, C y D debería lanzarlo también al terminar el suyo.

## Lote B — implementación

Tasks cerradas: T6 y T7 (2026-10-04). Sin commits. La feature sigue `in_progress`.

### Para el leader, antes de lanzar el Lote D

1. **El archivo de tests de lo puro que dejó el Lote A ya no está en disco.** El spec
   nombra dos archivos que solo se distinguen por una mayúscula:
   `__tests__/previousMonths.spec.ts` (Lote A, T5, 44 tests de `previousMonths.ts`) y
   `__tests__/PreviousMonths.spec.ts` (Lote C, T10, los dos componentes). En Windows son
   el mismo archivo. Comprobado con `ls src/features/overview/__tests__/`: hay un solo
   archivo, `PreviousMonths.spec.ts`, y su contenido es el de los componentes (`grep -c`
   de tres nombres de test del Lote A en ese archivo: 0). No lo he tocado ni es de mi
   lote. Como el del Lote A nunca se llegó a guardar en git, `git` no lo recupera.
   Efecto medido: la suite tiene 1.640 tests; con los 1.626 del Lote A más los 25 míos
   y los del Lote C deberían ser más. Efecto sobre la trazabilidad: todo lo que el
   informe del Lote A apoya en `previousMonths.spec.ts` (R1–R6, R9–R13 en lo puro, C3)
   se ha quedado sin test. Hace falta decidir un nombre distinto para uno de los dos
   archivos (cambia el spec, y los `checks` 2, 5 y 6 nombran `PreviousMonths.spec.ts`)
   y volver a escribir los tests de la T5.
2. **`docs/architecture.md:130`** describe `store.ts` como «el mes, lo leído en esta
   visita (por mes), la fecha del último dato y un estado de carga por grupo de
   lecturas». No es falso, pero no dice que ahora guarda también los 24 meses y la suma
   del periodo. El archivo es del Lote D (T14).

### Archivos modificados / creados

- `src/features/overview/store.ts` — añadidos: el estado `previousLoad`, `period` y
  `periodLoad`; los getters `previousMonths` y `monthRows`; la acción
  `loadPreviousMonths(client?)`; un `Map` de lecturas de mes que todavía no han
  respondido y una promesa de la lectura de la fecha del último dato que todavía no ha
  respondido, los dos como variables del setup del store (no de módulo). Cambian
  `readFigures` y `readLatest` (devuelven la lectura que ya está en camino si la hay),
  `reset` (vacía además lo nuevo) y `refreshIfLoaded`. `show`, `retry` y
  `retryComparison` no cambian ni una línea.
- `src/features/overview/__tests__/previousMonthsStore.spec.ts` — nuevo, 25 tests.
- `specs/26-overview-previous-months/tasks.md` — T6 y T7 marcadas.
- `progress/current.md` — el plan y el resultado del lote.

### Decisiones tomadas

- **Volver a llamar a `loadPreviousMonths` con las 24 filas ya leídas no pasa por
  `loading`.** Si la fecha del último dato y los 24 meses ya están, `previousLoad` se
  queda en `ready` mientras se vuelve a pedir solo el periodo. Design §5 no lo detalla;
  R14 pide conservar las filas cuando falla el periodo, y pasar por `loading` las
  quitaría durante el reintento. Hay un test que lo afirma con la respuesta del periodo
  retenida.
- **`previousLoad` no espera al periodo.** Pasa a `ready` o `error` cuando responden los
  meses; el periodo tiene su `periodLoad`. La promesa que devuelve la acción sí espera a
  los dos.
- **El periodo no se pide dos veces a la vez ni si ya está leído**: así «pide solo lo
  que falta, periodo incluido» vale en los dos sentidos (falla un mes → no se repite el
  periodo; falla el periodo → no se repite ningún mes).
- **`refreshIfLoaded` mira las dos partes por separado.** Design §5 dice que recuerda
  si `previousLoad !== 'idle'` y que entonces llama también a `loadPreviousMonths`
  después de lanzar `show`. No dice qué pasa si la parte del mes nunca se cargó y este
  bloque sí (en la pantalla no ocurre: se cargan los dos). He hecho que en ese caso se
  vuelva a leer solo el bloque, sin llamar a `show`. Con la parte del mes cargada el
  comportamiento es el de antes (`reset` y `show`), y con ninguna de las dos no pide
  nada, como antes.
- **Base sin movimientos:** `previousLoad: 'ready'`, `monthRows` es `[]` (no `null`),
  `period` es `null` y `periodLoad` se queda en `idle`.
- **`monthRows` es `null` siempre que `previousLoad` no es `ready`**, también en
  `error` con 23 meses leídos.
- Los cinco meses de 2024-10 a 2025-02 siguen vacíos en los tests, como fija el spec.
  Las cifras del mes que un test hace aparecer «tras una importación» (2025-01) están
  inventadas desde cero.
- Tests añadidos que la T7 no nombra: el mismo recuento de 27 con las dos llamadas en
  el orden contrario; dos `loadPreviousMonths` a la vez; llamarla otra vez con todo
  leído no pide nada; la fila de un mes lleva el mismo objeto `totals` que la parte del
  mes; cambiar el mes de arriba mueve la marca y no las filas; un fallo de este bloque
  no cambia el estado de la parte del mes; una fecha del último dato que llega después
  del `reset`; una lectura de la visita anterior que sigue en camino no se comparte con
  la visita nueva; `refreshIfLoaded` tras un error del bloque.

### Trazabilidad (parcial: solo lo que cubre el Lote B)

Todos en `src/features/overview/__tests__/previousMonthsStore.spec.ts`.

- R1 → «the 24 months, the rows and the sums of the backend»; «a base with no movements
  is ready, with no rows and no month or period asked for»
- R2 (mismas cifras que la parte del mes, en el store) → «a row carries the very
  figures the month has when it is above»
- R5, R6 (en el store) → «changing the month above moves the mark, not the rows»
- R11 → «the 24 months, the rows and the sums of the backend» (`period` es `PERIOD`, y
  `mockBackend` de `fixtures.ts` (lo que responde a `fetch` en los tests) rechaza cualquier rango que no sea 2024-10-01 → 2026-08-31)
- R13 → «one failed month is an error with no rows, and the second call asks only for
  it»; «a failed read of the last date is an error, and nothing else is asked for»
- R14 → «a failed period leaves the rows, and the second call asks only for it»
- R15 → **«asks for each month once in a visit, whoever asks»** (el del check 8); «is
  the same when the months below are asked for first»; «with an incomplete month above
  it is 27 requests too»; «with an empty month above it is 27 requests too»; «a second
  call while the first is on its way asks for nothing»
- C1 → «only ever sends GET to /api/movements, with no body (C1)»
- C2 → `store.spec.ts` pasa sin tocarse (salida abajo); `git status --short` no lo lista
- C4 → «reset empties it»; «answers that started before the reset are not kept»; «a
  last date that arrives after the reset is not kept, and asks for nothing else»; «a
  read still on its way from the visit before is not shared with the new one»; los
  cuatro de `refreshIfLoaded`
- R3, R4, R7–R10, R12 → nada en este lote.

### Comprobación de que el test de R15 falla cuando debe

Desactivé a propósito en `store.ts` la línea que devuelve la lectura de un mes que ya
está en camino, lancé `previousMonthsStore.spec.ts` y volví a dejarla como estaba:

```
 × asks for each month once in a visit, whoever asks
 × is the same when the months below are asked for first
 × refreshIfLoaded reads the months below again when they had been read
AssertionError: expected [ …(39) ] to have a length of 27 but got 39
      Tests  3 failed | 22 passed (25)
```

### Los specs de la F25 sobre el store nuevo

`pnpm exec vitest run` sobre `store.spec.ts` y `OverviewView.spec.ts`, ninguno
modificado: `Test Files 2 passed (2)`, `Tests 43 passed (43)`, exit 0. No he tenido
que tocar ninguna aserción de la F25.

### Documentos actualizados

`git grep -n "refreshIfLoaded\|readFigures\|readLatest\|overview/store" -- . ':!progress' ':!specs'`
(fuera de `store.ts` y de `__tests__/` de `overview`):

- `docs/architecture.md:179` («una llamada a `refreshIfLoaded` tras cada importación»):
  sigue siendo verdad.
- `src/features/import/store.ts:85` y su test: llaman a `refreshIfLoaded(client)`, cuya
  firma no cambia.
- Ninguna línea corregida. La de `docs/architecture.md:130` va arriba, en «Para el
  leader».

### Prueba real

No hecha en este lote, y no la he intentado: el store no lee nada nuevo de fuera. Usa
las mismas cuatro lecturas de `service.ts` que ya existían al cerrar el Lote A, y
ningún test de este lote sale a `localhost:3000` (`mockBackend` de `fixtures.ts`, que responde a `fetch` en los tests y rechaza lo no previsto,
rechaza cualquier petición que no sea `GET /api/movements`). Que las respuestas reales
pasen por el store queda para la T15.

### Último ./init.sh

Dos pasadas. La primera, con el Lote C todavía escribiendo, exit 1 por un archivo que
no es de este lote:

```
[warn] src/features/overview/__tests__/PreviousMonths.spec.ts
[FAIL]  Fallido: pnpm format:check
```

La segunda, unos minutos después:

```
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
 Test Files  102 passed (102)
      Tests  1640 passed (1640)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
init exit=0
```

`pnpm type-check` (`vue-tsc --build`): la primera pasada, exit 2, con dos errores
`TS2740` en `PreviousMonths.spec.ts` (líneas 80 y 82), del Lote C en curso; la segunda,
exit 0. Ninguna de las dos dio errores en `store.ts` ni en
`previousMonthsStore.spec.ts`.

`pnpm exec prettier --check` y `pnpm exec oxlint` sobre los dos archivos del lote:
exit 0 los dos.

### Último ./init.sh --checks 26

exit 1: **5 de 11 en verde**.

- En verde: el 8 («asks for each month once in a visit, whoever asks», de este lote),
  el 10 (la parte del mes, idéntica al commit `a68df91`) y el 2, 5 y 6 (del Lote C).
- En rojo: 1, 3, 4, 7 y 9 (buscan `OverviewPreviousMonths.spec.ts`, del Lote D, que
  todavía no existe) y 11 (el test e2e nuevo, del Lote D).

### Sugerencias fuera de scope (NO aplicadas)

- Ninguna comprobación del proyecto detecta dos archivos cuyo nombre solo cambia en
  mayúsculas. Una línea en `init.local.sh` que compare los nombres de `git ls-files` y
  de los archivos sin seguimiento pasados a minúsculas lo habría parado.

## Lote C — implementación

**He sobrescrito un archivo que no era de mi lote: `__tests__/previousMonths.spec.ts`,
el del Lote A (T5, 44 tests de `previousMonths.ts`). Sigue sin restaurar. Estado del
lote: bloqueado.** No he escrito en la base de datos ni en datos del humano.

Tasks: T8, T9 y T10 hechas y marcadas (2026-10-04). Sin commits. La feature sigue
`in_progress`.

### Para el leader: el bloqueo

1. **Qué pasó.** El spec nombra dos archivos que solo se distinguen por una mayúscula:
   `__tests__/previousMonths.spec.ts` (Lote A) y `__tests__/PreviousMonths.spec.ts`
   (Lote C, el mío). En este disco son el mismo archivo. Al crear el mío con la
   herramienta de escritura, lo que hice fue reemplazar el contenido del del Lote A. No
   lo comprobé antes de escribir; lo vi después, al lanzar `./init.sh`, porque
   `git status` ya no listaba el archivo del Lote A y la suite daba 1.640 tests.
   Comprobado con `ls src/features/overview/__tests__/`: hay un solo archivo,
   `PreviousMonths.spec.ts`, con mis 31 tests.
2. **Qué se ha perdido.** Los 44 tests de la T5. El archivo nunca se añadió a git, así
   que `git` no lo recupera. La trazabilidad que el informe del Lote A apoya en ese
   archivo (R1–R6, R9–R13 en lo puro, C3) está hoy sin test.
3. **Lo que hay para recuperarlo.** El registro de la sesión del implementer del Lote A
   guarda las dos operaciones que hizo sobre ese archivo: la escritura inicial
   (13.827 caracteres, 44 `it(`) y una edición de una línea (la de `toSorted`). He
   extraído la escritura inicial, sin la edición aplicada, a la carpeta temporal de la
   sesión, fuera del repositorio: `scratchpad/a-write.ts`. **No he comprobado** que
   ese contenido más la edición sea idéntico al archivo perdido: para comprobarlo hay
   que ponerlo en el repositorio y lanzar sus tests, `prettier --check` y
   `pnpm type-check`.
4. **Lo que intenté y no se me permitió.** Quise dejar el archivo del Lote A como
   estaba (quitar el mío de esa ruta, guardar el mío fuera y reescribir el del Lote A
   desde el registro). El sistema de permisos denegó la operación por modificar un
   archivo que no es de mi lote. No lo he vuelto a intentar por otra vía.
5. **Lo que hay que decidir, y no me toca a mí.** Los dos archivos no pueden existir a
   la vez en este disco con los nombres del spec. Los `checks` 2, 5 y 6 nombran
   `PreviousMonths.spec.ts`, y design §2 y la T5 nombran `previousMonths.spec.ts`. O se
   cambia el nombre de uno (cambia el spec, y si es el mío, los `checks`, que aprobó el
   humano), o los dos grupos de tests viven en un solo archivo (funciona en este disco;
   en un sistema que distingue mayúsculas, una de las dos rutas del spec no existiría).
6. **Una segunda denegación.** Al final quise lanzar en un solo comando
   `./init.sh --checks 26`, el `git grep` del paso 6 y la lectura del registro de la
   última pasada de `./init.sh`. El sistema de permisos lo denegó entero. Por eso abajo
   faltan esas salidas.

### Archivos modificados / creados

- `src/features/overview/components/PreviousMonthRow.vue` — nuevo. Una fila (`<tr>`).
- `src/features/overview/components/PreviousMonths.vue` — nuevo. El bloque.
- `src/features/overview/__tests__/PreviousMonths.spec.ts` — 31 tests. **Ocupa la ruta
  del archivo del Lote A** (ver arriba).
- `src/assets/theme-dark.css` — **sin tocar**: no aparece ningún par de colores nuevo.
- `specs/26-overview-previous-months/tasks.md` — T8, T9 y T10 marcadas.
- `progress/current.md` — **no lo he actualizado** (paso 3 del protocolo): paré tras la
  segunda denegación.

### T8 — comprobación previa

- **Colores de las barras:** `bg-chart-8` para lo que entró y `bg-chart-5` para lo que
  salió. Distintos entre sí y de `bg-chart-4`. Sus líneas ya están en `theme-dark.css`:
  `--chart-8 on --surface-sunken >= 3` y `--chart-5 on --surface-sunken >= 3` (barra
  sobre su pista) y `--chart-8 on --surface-card >= 3` / `--chart-5 on --surface-card
  >= 3` (el punto de cada cabecera, sobre la tarjeta). Evité `chart-6`, que en este
  tema es el color de `negative`, y `chart-1`/`chart-2`, que son verdes como `positive`.
- **Los demás pares, todos ya declarados:** `negative`, `positive`, `ink-strong`,
  `ink-body` e `ink-muted` sobre `surface-card`; `border-brand` y `border-subtle` sobre
  `surface-card`; `brand` sobre `brand-subtle` y `warning` sobre `warning-subtle` (las
  dos etiquetas). La fila marcada no cambia de fondo.
- **Clases que vigila `tailwind-sources.spec.ts`:** `grep` de las cinco (`text-ink-link`,
  `fill-chart-3`, `text-red-500`, `rounded-2xl` y la palabra suelta que empieza por
  `cont` y nombra un contenedor) sobre mis tres archivos: ninguna coincidencia (exit 1
  de `grep`). El enlace no lleva utilidad de color: lo pinta `base.css`.

### Decisiones tomadas

- **Una prop más de las que lista design §6: `dataEnds: string | null`** en los dos
  componentes. R9 pide `Data ends on {date}` en la fila del mes incompleto y la lista
  de props (`rows`, `load`, `sentence`, `periodLoad`, `leftOut`, `notShown`) no trae de
  dónde sacarlo. La vista le pasa `dataEndsLine(latest)`, igual que las otras frases.
  **El Lote D tiene que pasarla.**
- **Un `data-test` más de los que lista design §6: `previous-months-data-ends`.**
  Empieza por `previous-months`, como pide C7.
- **El enlace del nombre del mes es un `<a>` propio dentro de `RouterLink` con `custom`,**
  no el `<a>` que pinta `RouterLink`. Lo descubrió un test: los 24 enlaces solo se
  distinguen en la query, y `RouterLink` no la compara, así que marcaba los 24 con
  `aria-current="page"`. R5 pide que solo la fila del mes de arriba lleve
  `aria-current`. Sigue siendo el mismo camino: `navigate` de `RouterLink`, `push`.
- **`select` se emite solo si la pulsación cambió el mes.** Con Ctrl o con el botón
  central el navegador abre otra pestaña, `RouterLink` no navega y la fila no emite: la
  página no se desplaza. R8 no cubre ese caso.
- **El borde izquierdo va en la primera celda de la fila** (`border-l-2` con
  `border-line-brand` o `border-transparent`), no en el `<tr>`.
- **Qué se ve en cada estado** (design §6 no lo detalla): `idle`, nada; `loading`, la
  tarjeta con el título y `Loading month by month…`; `error`, el título, el mensaje y
  `Try again`, sin frase ni filas aunque lleguen por props; `ready` con filas, todo;
  `ready` con cero filas (base sin movimientos), nada, por R1.
- **Las dos notas no dependen de la frase:** `leftOut` y `notShown` se pintan siempre
  que hay filas, también cuando falla la suma. Con la suma todavía en camino hay filas
  y ninguna frase.
- **La frase va en `font-display text-base font-semibold`**, un tamaño menos que la de
  la parte del mes, porque aquí va debajo de un título `<h2>`.
- **El mes vacío ocupa con `No movements` las cuatro columnas** de barras e importes.
- **Los tests no dejan salir ninguna petición:** `fetch` está sustituido en todo el
  archivo y, si un test lo llama, el `afterEach` lanza un error. Lo provoqué una vez
  añadiendo un `fetch` a un test: `Error: 1 request(s) left a component that only
  paints`, `Tests 1 failed | 30 passed (31)`; lo quité y volvió a 31 de 31.

### Trazabilidad (parcial: solo lo que cubre el Lote C)

Todos en `src/features/overview/__tests__/PreviousMonths.spec.ts`.

- R1 → «is a card titled Month by month with one row per month, newest first»; «paints
  nothing before the first read, nor when the base has no movements (R1)»
- R2 → «formats the backend strings letter by letter, with their cents (R2)»; «does not
  recompute the savings: a net that does not add up is painted as it came»; «heads the
  columns Month, the bars with no text, Money in, Money out and Savings»
- R3 → «draws the two bars of a complete month against the highest figure of them all
  (R3)» (`22.5%` / `34.7%` en agosto de 2026)
- R4 → **«marks the months that spent more than came in»** (check 2); «marks the other
  nine complete months of the fixture as positive, and none as zero»
- R5 → «marks the row of the month shown above, and only that one»; «moves the mark with
  the month shown above, and the rows stay where they were»; «marks no link as the
  current page: the 24 only differ in the query»
- R6 → «marks no row and says so when the month shown above is none of the 24 (R6)»
- R7 → «links every row to its own month in the URL»; «pushes that month to the URL and
  tells the screen which one was pressed»; «a press that opens another tab neither moves
  this page nor tells the screen»; «a single row tells which month was pressed»
- R9 → **«marks an incomplete month as incomplete, with no bars»** (check 5)
- R10 → **«shows a month with no movements as empty, not as a zero»** (check 6)
- R11, R12 → «says it first, under the title and before the rows, with the note of the
  month left out»; «has no note of a month left out when the newest month is complete»
- R13 → «says it is loading, with no row and no sentence»; «paints no row by halves when
  a month failed: the message and Try again, which asks again»
- R14 → «keeps the rows and says the sum failed, adding nothing up itself (R14)»; «paints
  the rows with no sentence while the sum is still on its way»
- C7 → los cinco casos de «uses no data-test of the part of the month»
- C8 → «paints every amount in the mono face with tabular figures (C8)»
- R8 (el desplazamiento) y R15 → nada en este lote.

### Documentos actualizados

No he lanzado el `git grep` del paso 6 (iba en el comando denegado). Este lote no
cambia ningún nombre que ya existiera: solo crea dos componentes que todavía no monta
nadie.

### Prueba real

No hecha: los dos componentes no leen nada de fuera; pintan lo que reciben por props.

### Último ./init.sh

Lanzado una vez, con mis tres archivos terminados y **con el archivo del Lote A ya
sobrescrito**. Solo tengo estas líneas de su salida (el resto estaba en el registro
que no pude leer después):

```
[OK]    feature_list.json válido (26 features)
[OK]    Specs presentes para features sdd con estado no-pending
 Test Files  102 passed (102)
      Tests  1640 passed (1640)
init exit=0
```

Ese verde no incluye los 44 tests de la T5.

Sobre mis tres archivos, después del último cambio: `pnpm exec prettier --check`
(`All matched files use Prettier code style!`), `pnpm exec oxlint` sin avisos,
`pnpm exec vitest run src/features/overview/__tests__/PreviousMonths.spec.ts`
(`Test Files 1 passed (1)`, `Tests 31 passed (31)`) y `pnpm type-check`
(`vue-tsc --build`, exit 0). Antes de eso `pnpm type-check` salió dos veces con exit 2
por errores de tipos de mi spec (`TS2740` y `TS7006`), ya corregidos.

### Último ./init.sh --checks 26

**No lo he lanzado** (iba en el comando denegado). El informe del Lote B, lanzado con
mi spec ya en disco, da los checks 2, 5 y 6 en verde.

### Sugerencias fuera de scope (NO aplicadas)

- La misma que anota el Lote B: nada en el proyecto detecta dos rutas que solo cambian
  en mayúsculas.

## Lote A — T5 repuesta (2026-10-04)

La T5 la reabrió el leader porque su archivo de tests se perdió (ver arriba, Lote C).
Marcada otra vez. Sin commits. La feature sigue `in_progress`. No he escrito en la base
de datos ni en datos del humano.

### Qué he repuesto y de dónde

- `src/features/overview/__tests__/previousMonthsFunctions.spec.ts` — nuevo, 44 tests de
  las funciones de `previousMonths.ts`. Es el nombre que fija ahora design §2 y la
  cabecera `Archivos:` del Lote A. Donde este informe (secciones del Lote A, B y C) dice
  `previousMonths.spec.ts`, el archivo es hoy este.
- Origen: `scratchpad/a-write.ts` de la carpeta temporal de la sesión, que es la primera
  escritura del implementer del Lote A, sacada del registro de su sesión. Copiado con
  `cp -n` (no sobrescribe) después de comprobar con `ls` que no había ningún archivo con
  ese nombre, tampoco cambiando mayúsculas.
- Único archivo de código o tests tocado. `PreviousMonths.spec.ts`, `previousMonths.ts` y
  el resto, sin tocar.

### Qué cambia respecto a la copia

1. **La línea de `toSorted`** (test «is the 24 months that end in the month of the last
   data, newest first»). La copia tenía
   `expect(MONTHS).toEqual(MONTHS.toSorted().toReversed())`, que no compila con la `lib`
   del proyecto (`ES2022`). Ahora es
   `expect(MONTHS).toEqual([...MONTHS].sort((a, b) => b.localeCompare(a)))`: afirma lo
   mismo, que los 24 meses van del más reciente al más antiguo. Un primer intento con
   `[...MONTHS].sort().reverse()` compilaba, pero `oxlint` lo rechazó
   (`unicorn(no-array-reverse)`, exit 1). No sé qué escribió el implementer original en
   su corrección: esa edición no está en la copia.
2. **Formato.** `prettier --check` sobre la copia salió con exit 1. `prettier --write`
   partió en varias líneas dos sentencias que pasaban de 100 columnas (la función
   auxiliar `period` y la constante `zero` del test del mes que suma cero). Ningún
   cambio de contenido.

Nada más: los 44 nombres de test y sus aserciones son los de la copia.

### Contraste de la copia con el spec

Leída entera contra la T5, `requirements.md` y la trazabilidad del Lote A.

- **Recuento:** 44 `it(` (4 de `shownMonths`, 5 de `summedPeriod`, 3 de `scaleTop`, 17 de
  `buildMonthRows`, 6 de `periodSentence`, 3 de `leftOutLine`, 3 de `notShownLine`, 1 de
  `dataEndsLine`, 2 de los textos fijos). Es el número que da el informe del Lote A.
- **T5 (a)–(f): no falta ningún caso.** (a) 24 meses de `2026-09` a `2024-10`, los dos
  cambios de año, `[]` con `null`; (b) los dos periodos, con `2026-09-11` y con
  `2026-09-30`; (c) `11527.15` con los 18 meses completos, `null` sin meses; (d) agosto
  de 2026 `225` / `347`, `negative`, `isShown` y solo ella; enero de 2026 `270` / `164`
  y `positive`; julio de 2025 `192` / `1000`; septiembre de 2026 `incomplete` con sus
  `totals` y anchos y signo `null`; de `2024-10` a `2025-02` `empty` con `totals: null`;
  el mes con movimientos y las tres cifras a `0.00`, `complete`, anchos `0` y `zero`;
  `null` si falta un mes; el fuente de `previousMonths.ts` sin `Number(`, `parseFloat`,
  `parseInt`, `Math.` ni `sumAmounts`; (e) los cuatro casos de R11 letra por letra, el 4
  con `PERIOD` de la fixture; (f) `leftOutLine` y `notShownLine` en sus dos sentidos, y
  `dataEndsLine`.
- **Trazabilidad del Lote A:** cada nombre de test que lista (R1–R6, R9–R13, C3) está en
  el archivo con ese nombre exacto. No he añadido ningún test.
- **Fixtures:** el archivo no declara cifras propias de ningún mes real; usa `figuresOf`,
  `fabricated`, `PERIOD` y `LATEST` de `fixtures.ts`, y los importes que escribe son
  totales y recuentos inventados para sus casos. Ningún concepto ni nombre.
- **Red:** el archivo no llama a `fetch` ni monta nada; solo importa funciones y lee el
  fuente de `previousMonths.ts` con `readFileSync(..., 'utf8')`.

### Documentos actualizados

`git grep -n "previousMonths\.spec" -- . ':!progress' ':!specs'`: ninguna coincidencia
(exit 1). El nombre antiguo solo queda en `progress/` y en las dos notas de corrección
del spec, que son históricas.

### Comprobaciones

`pnpm exec vitest run src/features/overview/__tests__/previousMonthsFunctions.spec.ts`:

```
 Test Files  1 passed (1)
      Tests  44 passed (44)
exit=0
```

`pnpm exec vitest run src/features/overview/__tests__/PreviousMonths.spec.ts` (sin
tocarlo):

```
 Test Files  1 passed (1)
      Tests  31 passed (31)
exit=0
```

`pnpm type-check`:

```
$ vue-tsc --build
exit=0
```

`pnpm exec oxlint` y `pnpm exec prettier --check` sobre el archivo nuevo: exit 0 los dos
(después de los dos cambios de arriba).

`./init.sh`:

```
[OK]    feature_list.json válido (26 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  103 passed (103)
      Tests  1684 passed (1684)
[OK]    Todos los tests pasan
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
init exit=0
```

Antes eran 102 archivos y 1.640 tests; el archivo repuesto suma 1 y 44.
`ls src/features/overview/__tests__/` lista los dos archivos por separado:
`PreviousMonths.spec.ts` y `previousMonthsFunctions.spec.ts`.

**No lanzado:** `./init.sh --checks 26` (ningún check nombra este archivo, y los del
Lote D siguen sin sus archivos) ni `pnpm build` (lo pide la T14).

**No comprobado:** que el archivo repuesto sea idéntico al perdido. Lo comprobado es que
tiene los 44 tests, que cubren la T5 entera y que pasan.

## Lote D — implementación

Tasks cerradas: T11, T12, T13 y T14 (2026-10-04). La T15 no es del implementer. Sin
commits. La feature sigue `in_progress`. No he escrito en la base de datos ni en datos del
humano. Los unitarios sustituyen `fetch` y el e2e aborta cualquier `/api` no prevista; la
lista de llamadas abortadas del e2e acabó vacía.

### Para el leader

1. **Tres títulos de tests de la F25 ya no describen la pantalla entera, y no los he
   cambiado**, porque design §7 cierra la lista de cambios en esos tests a cinco
   aserciones: `OverviewView.spec.ts` › «paints nothing below the block of the month (C6)»
   (ahora afirma que debajo está `previous-months`) y «an empty month is only its sentence
   (R9)»; `e2e/overview.spec.ts` › «a month after the last data says so, and shows nothing
   else». Los dos últimos siguen siendo verdad leídos como «la parte del mes». Cambiarlos
   exige ampliar la lista del spec.
2. **Dos líneas de `docs/roadmap.md` que esta feature vuelve falsas y están fuera de los
   archivos del lote:** `:383` («tres lecturas `GET /api/movements`»; ahora son cuatro,
   ya lo apuntó el Lote A) y `:365` («⬜ La tira del año… debajo del mes»), que es el
   estado de esta feature en la lista de la E8.
3. **La prueba con datos reales no la he hecho** (ver «Prueba real»): es la T15.

### Archivos modificados / creados

- `src/features/overview/views/OverviewView.vue` — monta `PreviousMonths` como último
  hijo del contenedor, fuera del `<template>` del mes; `onMounted` llama a
  `store.loadPreviousMonths()` después de `syncFromRoute()`; el `Try again` de la parte del
  mes llama además a `loadPreviousMonths` si `previousLoad === 'error'`; el evento `select`
  del bloque llama a `scrollIntoView({ block: 'start' })` sobre el elemento de `MonthNav`
  (con `?.`). Ningún texto ni el orden de lo que había cambia. Cambian tres comentarios
  (ver «Documentos actualizados»).
- `src/features/overview/__tests__/OverviewView.spec.ts` — las cuatro aserciones de
  design §7 (abajo).
- `src/features/overview/__tests__/OverviewPreviousMonths.spec.ts` — nuevo, 19 tests.
  Antes de crearlo, `ls src/features/overview/__tests__/ | grep -i overviewprevious`: sin
  coincidencias.
- `e2e/overview.spec.ts` — la respuesta al rango del periodo, cinco meses más en `MONTHS`,
  `2` → `27` y un test nuevo. Pasa de dos tests a tres.
- `docs/architecture.md` y `docs/stack.md` — ver «Documentos actualizados».
- `specs/26-overview-previous-months/tasks.md` — T11 a T14 marcadas.
- `progress/current.md` — el plan y el resultado del lote.

### Las cinco aserciones de tests de la F25 que cambian (design §7), y ninguna más

En `OverviewView.spec.ts` (es todo lo que da `git diff -U0` de ese archivo):

- «paints nothing below the block of the month (C6)»: el último hijo pasa de
  `overview-statement-link` a `previous-months`, y la línea
  `expect(wrapper.text()).not.toMatch(/coming soon|year/i)` se sustituye por «el penúltimo
  hijo es `overview-statement-link`».
- «an incomplete month…»: quitada `expect(api.months()).toEqual(['2026-09'])`.
- «an empty month is only its sentence (R9)»: quitada `expect(api.calls).toHaveLength(2)`.
  La lista de lo que no se pinta, intacta.
- «entering the screen again reads again…»: `15` y `15` → `27` y `27`.
- En el segundo y el tercero, además, `const { api, wrapper }` pasa a `const { wrapper }`:
  al quitar la aserción, `api` quedaba sin usar. No es una aserción.

En `e2e/overview.spec.ts`, segundo test: `expect(overviewReads(watch)).toHaveLength(2)` →
`27`, y el comentario de encima, que decía «Only the core». El resto de ese test y el
primero entero, sin tocar; los dos pasan.

### Decisiones tomadas

- **La frase del periodo se construye en la vista** (`periodSentence(store.period, <el más
  antiguo de store.previousMonths>)`), igual que las otras tres líneas (`leftOutLine`,
  `notShownLine`, `dataEndsLine`): el store no tiene un getter para ella y `store.ts` no
  es de este lote.
- **`dataEnds`** (la prop que añadió el Lote C): `dataEndsLine(store.latest)`, o `null`
  sin fecha del último dato.
- **El `Try again` del bloque** llama a `store.loadPreviousMonths()` tal cual: pide solo
  lo que falta (lo afirma un test con el recuento de peticiones).
- **El `Try again` de la parte del mes** llama primero a `store.retry()` y después a
  `loadPreviousMonths` si el bloque está en error: el mes que necesitan las dos partes
  sale en una sola petición (lo afirma un test).
- **En el e2e, un rango de varios meses que no sea el previsto no se contesta:**
  `answerMovements` devuelve `null` y la ruta lo aborta y lo apunta en la lista que debe
  acabar vacía. Es en el navegador lo mismo que hace `mockBackend` en los unitarios.
- **En el e2e, antes de pulsar se desplaza a la vista la fila de marzo de 2025** y se
  afirma que la navegación de mes **no** está a la vista antes de pulsar enero de 2026 y
  **sí** después: sin lo primero, lo segundo no probaría nada.
- **La frase de arriba de enero de 2026** es `In January 2026, 3.114 € came in and
  1.893 € went out: you saved 1.222 €, 39,2 % of what came in.` (texto de la F25; la T12 y
  la T13 solo dicen «la frase de enero»).
- **El e2e afirma cinco filas `No movements`**, no una: son los cinco meses de 2024-10 a
  2025-02, que las fixtures tratan como vacíos.
- Tests añadidos que la T12 no nombra: la suma fallida conserva las filas (R14) dentro de
  la pantalla; un mes de los 24 que falla no pinta filas y su `Try again` pide solo ese
  mes (R13); el mes que falla para las dos partes; el `Try again` de la parte del mes no
  vuelve a pedir el bloque si estaba leído; una base sin movimientos no pinta el bloque;
  pulsar funciona también donde no existe `scrollIntoView`; pulsar un mes ya leído cuesta
  una petición; entrar cuesta 27 y ningún mes se repite.

### Trazabilidad completa (R1…R15)

Archivos: **F** = `previousMonthsFunctions.spec.ts`, **S** = `previousMonthsStore.spec.ts`,
**C** = `PreviousMonths.spec.ts`, **V** = `OverviewPreviousMonths.spec.ts`, **E** =
`e2e/overview.spec.ts` › «reads the previous months below the month and moves on a click».

- R1 → V «shows the 24 months below the month, each with what came in and what went out»
  (check 1); V «a base with no movements shows no months below»; F «is the 24 months that
  end in the month of the last data, newest first»; E
- R2 → V «shows the 24 months below the month…» (las cifras de cada mes con movimientos);
  V «a row shows the same figures as the month does when it is above» (check 7); C «formats
  the backend strings letter by letter, with their cents (R2)»
- R3 → C «draws the two bars of a complete month against the highest figure of them all
  (R3)»; F «is the highest figure, in or out, of the 18 complete months of the fixture»;
  E (la barra de lo que salió en julio de 2025 mide `100%`)
- R4 → C «marks the months that spent more than came in» (check 2); F «nine of the 18
  complete months spent more than came in (R4)»
- R5 → V «marks the month shown above, and only that one» (check 3); C «marks the row of
  the month shown above, and only that one»; E
- R6 → V «marks no row with 2026-10 above, and says so» y «marks no row with 2024-03
  above, and says so»; C «marks no row and says so when the month shown above is none of
  the 24 (R6)»
- R7 → V «pressing another month puts it above, through the URL» (check 4: `push`, la URL,
  la frase, la marca, las mismas 24 filas y «atrás»); E
- R8 → V el mismo test (`scrollIntoView` llamado una vez con `{ block: 'start' }` sobre el
  elemento `statement-nav`); V «still changes the month where the browser cannot scroll»;
  E (la navegación de mes no está a la vista antes de pulsar y sí después)
- R9 → C «marks an incomplete month as incomplete, with no bars» (check 5); E
- R10 → C «shows a month with no movements as empty, not as a zero» (check 6); E
- R11 → V «says what was saved over the complete months, with the totals of the backend»
  (check 9: la frase, antes de las filas, y una sola petición,
  `from=2024-10-01&to=2026-08-31&pageSize=1`); F los seis de `periodSentence (R11)`; E
- R12 → V el mismo test (`September 2026 is left out: it is incomplete.`); F los tres de
  `leftOutLine (R12)`; E
- R13 → V «one failed month paints no row, and Try again asks only for it»; V «a month
  that fails for both parts comes back with the Try again of the month»; S «one failed
  month is an error with no rows, and the second call asks only for it»
- R14 → V «a failed sum keeps the rows and says so, adding nothing up here (R14)»; S «a
  failed period leaves the rows, and the second call asks only for it»
- R15 → S «asks for each month once in a visit, whoever asks» (check 8); V «entering a
  complete month is 27 requests, and no month is asked for twice»; V «a month already read
  costs one request: its spending with no category»
- C1 → V «a whole visit only sends GET to /api/movements»; E (todos los métodos de la
  sesión son `GET` y la lista de llamadas abortadas acaba vacía; check 11)
- C2 → check 10; V «the part of the month is letter by letter what it was (C2)»
- C3 → F «never turns an amount into a number (C3)»; V «a failed sum keeps the rows and
  says so, adding nothing up here (R14)»
- C4 → S los de `reset` y `refreshIfLoaded`; `OverviewView.spec.ts` › «entering the screen
  again reads again…» (27 y 27)
- C7 → C «uses no data-test of the part of the month»; V «the part of the month is letter
  by letter what it was (C2)» (`money` sigue apareciendo cuatro veces)

### Comprobación de que los tests nuevos fallan cuando deben

Quité a propósito de `OverviewView.vue` la llamada a `scrollIntoView` y la línea que
vuelve a pedir el bloque desde el `Try again` de la parte del mes, lancé el spec nuevo y
el test e2e nuevo, y restauré el archivo desde una copia en la carpeta temporal de la
sesión:

```
 × pressing another month puts it above, through the URL
 × a month that fails for both parts comes back with the Try again of the month
AssertionError: expected "vi.fn()" to be called once with arguments: [ { block: 'start' } ]
AssertionError: expected true to be false // Object.is equality
      Tests  2 failed | 17 passed (19)
    Error: expect(locator).toBeInViewport() failed
  1 failed
```

Con el archivo restaurado: `Tests 19 passed (19)`.

`pnpm test:e2e --project=chromium e2e/overview.spec.ts --repeat-each=3`: `9 passed (5.6s)`
(los tres tests, tres veces cada uno; lo lancé por el recuento de 27, que se lee sin
esperar).

### Documentos actualizados

Lanzados: `git grep -n -i -E "tres lecturas|three reads|nothing below|year strip|tira del
a|only its sentence|shows nothing else|solo su frase|15 peticiones|dos tests|two tests"
-- . ':!progress' ':!specs'` y `git grep -n -E "overview\.spec|OverviewView" -- .
':!progress' ':!specs' ':!src/features/overview' ':!e2e'`.

- `docs/architecture.md` — el árbol de `features/overview/` (los dos componentes nuevos,
  `previousMonths.ts`, los tipos nuevos, lo que `store.ts` guarda ahora y «cuatro
  lecturas» en `service.ts`); en la nota de la F25, «sus tres lecturas» → «sus cuatro
  lecturas»; y un párrafo nuevo sobre los 24 meses: qué meses son, que cada mes se pide
  una vez, que lo ahorrado lo suma el backend y que la mediana sigue siendo la única cifra
  calculada en el cliente.
- `docs/stack.md` — el párrafo de `e2e/overview.spec.ts` (tres tests, la pregunta nueva y
  el recuento de 27) y una línea de iconos para la feature #26 (ninguno nuevo).
- `src/features/overview/views/OverviewView.vue` — el comentario «Nothing below the
  month: the year strip of a later feature goes here (C6)», sustituido; «An empty month
  is only its sentence (R9)» → «Of an empty month, only its sentence (R9)»; y el
  comentario de cabecera del script.
- Sin corregir, fuera del lote: las dos líneas de `docs/roadmap.md` y los tres títulos de
  tests de «Para el leader». `docs/intent-e8-draft.md:143` y `feature_list.json:1084`
  hablan del plan («la tira del año debajo»), no de un hecho que haya cambiado.

### Prueba real

No hecha. La pantalla lee de `GET /api/movements`, pero el encargo de este lote dice que
ninguna llamada puede salir a `localhost:3000` desde unitarios ni e2e y que la
comprobación contra el backend real no es de este lote: es la T15, con el humano delante.
No lo he comprobado; para comprobarlo hace falta abrir `/overview?month=2026-08` con
`pnpm dev` contra el backend real y seguir los seis pasos de la T15. Para esa
comprobación: `progress/current.md` apunta que el periodo real suma −41.886,92 € y 1.081
movimientos, no los −20.799,13 € y 863 de las fixtures, que tratan de 2024-10 a 2025-02
como meses vacíos, como fija el spec.

### Último ./init.sh

```
[OK]    feature_list.json válido (26 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  104 passed (104)
      Tests  1703 passed (1703)
[OK]    Todos los tests pasan
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
init exit=0
```

Antes del lote eran 103 archivos y 1.684 tests; el archivo nuevo suma 1 y 19.

`pnpm type-check`:

```
$ vue-tsc --build
type-check exit=0
```

`pnpm build`:

```
✓ 2076 modules transformed.
dist/index.html                   0.61 kB │ gzip:  0.34 kB
dist/assets/index-DRSQdJEe.css   32.84 kB │ gzip:  7.47 kB
dist/assets/index-CEHAIKnK.js   292.91 kB │ gzip: 90.30 kB
✓ built in 840ms
build exit=0
```

### Último ./init.sh --checks 26

Los once checks, cada uno con su línea `[OK]        exit 0` (aquí solo el número de cada
uno; la última línea y el código de salida son literales):

```
[INFO]  Feature: F26 overview-previous-months
[1] exit 0   [2] exit 0   [3] exit 0   [4] exit 0   [5] exit 0   [6] exit 0
[7] exit 0   [8] exit 0   [9] exit 0   [10] exit 0  [11] exit 0
[OK]    Checks: 11 de 11 en verde.
checks exit=0
```

### Sugerencias fuera de scope (NO aplicadas)

- Renombrar los tres títulos de tests de la F25 de «Para el leader» para que digan «la
  parte del mes».

## Cambio pedido por el reviewer — tres títulos de tests (2026-10-04)

Según la ampliación de design §7 («Ampliación del 2026-10-04, tras la revisión»). Sin
commits. La feature sigue `in_progress`. No he escrito en la base de datos ni en datos del
humano.

### Qué cambia

Tres títulos, y solo el título. Ninguna aserción, ningún otro título y ningún otro archivo
de código.

| Archivo | Título que tenía | Título que tiene ahora |
|---|---|---|
| `src/features/overview/__tests__/OverviewView.spec.ts:144` | `paints nothing below the block of the month (C6)` | `paints the previous months below the block of the month, and nothing after them` |
| `src/features/overview/__tests__/OverviewView.spec.ts:218` | `an empty month is only its sentence (R9)` | `an empty month shows only its sentence in the part of the month (R9)` |
| `e2e/overview.spec.ts:300` | `a month after the last data says so, and shows nothing else` | `a month after the last data says so, and shows no figures in the part of the month` |

En `e2e/overview.spec.ts`, con el título nuevo la línea pasa de 100 columnas y el formato
del proyecto (`prettier`) parte en tres líneas el parámetro `async ({ page })` de ese test.
El título sigue en una sola línea y el cuerpo del test no cambia.
`pnpm exec playwright test --project=chromium e2e/overview.spec.ts --list` lo lista con el
título nuevo, junto a los otros dos tests del archivo.

Además, una entrada en `progress/current.md` con el plan de este cambio.

### Dónde siguen citados los títulos antiguos (no los he editado)

`git grep -n -E "paints nothing below|only its sentence|shows nothing else" -- . ':!progress' ':!specs'`:
ningún título antiguo fuera de `progress/` y `specs/`. Las dos coincidencias que quedan no
son títulos de test y siguen siendo verdad: el comentario de
`src/features/overview/views/OverviewView.vue:25` («Of an empty month, only its sentence
(R9)») y uno de `src/features/statement/store.ts:395`, que habla de otra cosa.

`grep` de los tres títulos antiguos en `feature_list.json` y en `init.local.sh`: ninguna
coincidencia (exit 1). Ningún `check` los busca.

En `specs/` y `progress/`:

- `specs/26-overview-previous-months/design.md:224` y `:226` — la tabla de las cinco
  aserciones de §7 nombra los dos tests de `OverviewView.spec.ts` por su título antiguo.
  (`:246` a `:248` son la propia ampliación, con los dos títulos de cada uno.)
- `progress/reviews/overview-previous-months.md:11`, `:30` y `:31` — el veredicto del
  reviewer.
- `progress/implementations/overview-previous-months.md` — la sección del Lote D de este
  mismo informe: «Para el leader» punto 1, las dos primeras viñetas de «Las cinco
  aserciones…» y la sugerencia fuera de scope.
- `progress/implementations/month-at-a-glance.md:147` y `:176` — la trazabilidad de la
  F25 (R9 y C6) cita los dos títulos de `OverviewView.spec.ts` sin el sufijo entre
  paréntesis.
- En `specs/25-month-at-a-glance/`: ninguna coincidencia.

### ./init.sh

```
[OK]    feature_list.json válido (26 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  104 passed (104)
      Tests  1703 passed (1703)
[OK]    Todos los tests pasan
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
init exit=0
```

Los mismos 104 archivos y 1.703 tests que al cerrar el Lote D.

### pnpm type-check

```
$ vue-tsc --build
type-check exit=0
```

### ./init.sh --checks 26

Los once checks, cada uno con su línea `[OK]        exit 0` (aquí solo el número de cada
uno; la última línea y el código de salida son literales):

```
[INFO]  Feature: F26 overview-previous-months
[1] exit 0   [2] exit 0   [3] exit 0   [4] exit 0   [5] exit 0   [6] exit 0
[7] exit 0   [8] exit 0   [9] exit 0   [10] exit 0  [11] exit 0
[OK]    Checks: 11 de 11 en verde.
checks exit=0
```

No lanzado: `pnpm build` (el cambio no toca código que entre en la compilación).
