# monthly-cost — implementación

## Lote A — implementación

Tasks cerradas: T1 a T9 (las nueve del lote). No se ha escrito nada en la base de datos ni
en las carpetas de datos del humano.

### Archivos modificados / creados

Creados (todos en la cabecera `Archivos:` del Lote A):

- `src/features/monthly-cost/types.ts`
- `src/features/monthly-cost/service.ts`
- `src/features/monthly-cost/texts.ts`
- `src/features/monthly-cost/store.ts`
- `src/features/monthly-cost/components/ChargeList.vue`, `BillRow.vue`, `BillList.vue`,
  `GroupRow.vue`, `BlockHeading.vue`
- `src/features/monthly-cost/views/MonthlyCostView.vue`
- `src/features/monthly-cost/__tests__/fixtures.ts`, `service.spec.ts`, `texts.spec.ts`,
  `store.spec.ts`, `BillRow.spec.ts`, `MonthlyCostView.spec.ts`
- `e2e/monthly-cost.spec.ts`

Modificados:

- `src/router/index.ts`: ruta `/monthly-cost` (nombre `monthly-cost`, etiqueta
  `Monthly cost`, icono `ReceiptEuro`) justo después de `overview`.
- `src/router/__tests__/router.spec.ts`: listas de 7 a 8, test renombrado a
  `declares the eight navigable routes with English paths`, test nuevo
  `lists Monthly cost in the menu right below Overview`.
- `specs/32-monthly-cost/tasks.md`: `[x]` en T1–T9.
- `progress/current.md`: una línea con el lote y el plan.

### Decisiones tomadas

- **El estado de carga del store se llama `loadState`, no `load`.** El design (§5) llama
  `load` a la vez al estado (`load: LoadState`) y a la acción (`load()`); en un store no
  pueden llamarse igual. Se queda `load()` para la acción (la vista y `Try again` la
  llaman así, como dice el design) y el estado pasa a `loadState`. No cambia ningún
  comportamiento ni ningún nombre de test.
- **`load()` vacía `data` al empezar**, para que mientras carga no haya ninguna cifra (R3),
  también al reintentar y al volver a entrar (el store de Pinia sobrevive entre visitas).
- **Lo que está abierto** vive en la vista (`ref<Set<string>>` con `bill:<key>`, `people`,
  `variable:<i>`), como pide el design. `BillRow` y `GroupRow` exponen `v-model:open`
  (`defineModel`): si el padre no lo enlaza, la fila guarda su propio estado. Así
  `BillRow.spec.ts` abre y cierra una fila montada sola, y en la pantalla manda la vista.
- **Función pura extra en `texts.ts`: `isEmpty(data)`** (sin recibos, sin gasto variable y
  personas a `0.00`, R17). Más constantes de texto (`TITLE`, `SUBTITLE`, `TOTAL_LABEL`,
  `BILLS_TITLE`…, `BILL_COLUMNS`), todas con los textos exactos de design §4.
- **`changeView` con `change` positivo y `hasIncreased: false`** (el contrato dice que no
  ocurre) lo pinta como `Same`: no lleva badge porque solo `hasIncreased` lo pone (R8).
- **Datos de prueba:** la propuesta de design §6 tal cual, más un segundo recibo sin
  cargos en el periodo (`revista ficticia`, `every_six_months`, `0.00`) para probar el
  plural de la línea de los recibos plegados. Los totales no cambian (228,02 / 118,50 /
  9,53 → 356,05). Todo inventado; ningún nombre de persona, comercio real ni número de
  cuenta.
- **Prueba de navegador:** solo responde `ingestion/pending`, `net-worth`, el recuento de
  pendientes de `GET /api/movements` (lista vacía, así que ningún movimiento necesita
  `deposit: null`) y `GET /api/recurring-expenses`. Todo lo demás se corta y se apunta;
  la prueba exige esa lista vacía, una sola lectura de `/api/recurring-expenses` y solo
  `GET`.
- La cabecera de columnas tiene una séptima celda vacía (`aria-hidden`) encima del botón
  `Show charges`, sin texto: el design no da uno.

### Trazabilidad

- R1 → `lists Monthly cost in the menu right below Overview`,
  `declares the eight navigable routes with English paths`,
  `exposes one navigation entry per navigable route, in sidebar order` (router.spec.ts);
  `reads the monthly cost from the menu, opens a bill and the folded ones, and only reads`
  (e2e)
- R2 → `asks the recurring expenses path with no method and no body` (service.spec.ts);
  `shows the monthly total and the period it comes from at the top` (comprueba una sola
  petición `GET` sin cuerpo); e2e (una lectura, solo `GET`)
- R3 → `shows a loading line and no figures until the answer arrives`
- R4 → `shows the monthly total and the period it comes from at the top`
- R5 → `says how many bills went up under the total`;
  `writes singular and plural in every counted line` (texts.spec.ts)
- R6 → `shows a bill with its name, monthly cost, periodicity, last charge and increase`
- R7 → `names each periodicity in words and leaves an unknown one as it comes`,
  `reads an unknown periodicity as text`,
  `shows an annual bill as yearly with its usual amount each time`
- R8 → `marks a bill that went up apart from one that went down or stayed the same`,
  `tells the change of a bill without computing it`
- R9 → `keeps the bills from most to least expensive a month`,
  `puts the bills with no charges in the period at the end and folded`,
  `splits the bills with no charges in the period and keeps the order`; e2e
- R10 → `opens a bill and lists its charges with date and amount`; e2e
- R11 → `shows what is sent to people as a group apart with its monthly cost`
- R12 → `opens the group sent to people and a category to list their charges`
- R13 → `shows the variable spending by category with the monthly cost of each`
- R14 → `shows block subtotals that add up to the figure at the top`,
  `adds up each block in exact cents`
- R15 → `rejects a response whose monthly costs do not add up to the monthly total`;
  `says it could not read a response that does not add up` (MonthlyCostView.spec.ts)
- R16 → `says the backend failed and asks again on Try again`,
  `keeps the error and never throws`, `keeps only the answer of the latest load`
- R17 → `shows the figure and one sentence when nothing counts`

### Documentos actualizados

Ninguno: los documentos son del Lote B. Lanzado:

```
git grep -n -i "seven navigable\|siete entradas\|7 entradas\|recurring-expenses\|monthly-cost\|Monthly cost" -- . ':!progress' ':!specs' ':!src/features/monthly-cost' ':!e2e/monthly-cost.spec.ts'
git grep -n -i "siete\|seven\|navEntries\|LayoutDashboard" -- docs README.md AGENTS.md
```

**Línea que este lote ha vuelto falsa y que está fuera de sus archivos (para el Lote B):**
`docs/guia-de-uso.md:74-75` dice «El menú de la izquierda tiene siete entradas, en este
orden: `Net Worth`, `Review`, `Rules`, `Transfers`, `Overview`, `Movements`,
`Investments`». Ahora son ocho, con `Monthly cost` entre `Overview` y `Movements`. La T12
no la menciona; no la he tocado. El resto de coincidencias son de `feature_list.json`
(la propia feature 32) o hablan de otra cosa («siete de los doce meses»).

### Prueba real

Había un backend respondiendo en `localhost:3000` (no lo he arrancado yo). Con una prueba
temporal en una carpeta ignorada por git (`coverage/realcheck/`, borrada al acabar) se
hizo un único `GET /api/recurring-expenses` y se pasó por `parseRecurringExpenses`, el
mismo código de la pantalla. Resultado (recuentos, sin contenido):

- respuesta 200; se lee sin error, **incluido el cuadre de la suma con `monthlyTotal`**;
- periodo: «October 2025 to September 2026»;
- 15 recibos: 13 con cargos en el periodo y 2 sin cargos (irían plegados); 8 con
  `hasIncreased` (la línea diría `8 of 15 bills went up…`);
- transferencias a personas: 99 cargos en el periodo;
- gasto variable: 8 entradas, ninguna sin categoría;
- las 7 periodicidades del contrato aparecen y las 7 tienen su texto (ninguna sale tal
  cual).

No he abierto la pantalla en un navegador contra ese backend (no arranco servidores en
5173 a mano).

### Último ./init.sh

`timeout 900 ./init.sh` → exit 0. Resumen de la salida:

```
[OK]    feature_list.json válido (32 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
All matched files use Prettier code style!
[OK]    OK: pnpm format:check
 Test Files  114 passed (114)
      Tests  1915 passed (1915)
[OK]    Todos los tests pasan
[OK]    Cabeceras Archivos: de 21 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
exit 0
```

### Último ./init.sh --checks 32

`timeout 900 ./init.sh --checks 32` → exit 0:

```
── Checks de la feature ───────────────────────────────
[OK]        exit 0     (x14, uno por check)
[OK]    Checks: 14 de 14 en verde.
exit 0
```

### Sugerencias fuera de scope (NO aplicadas)

- Corregir `docs/guia-de-uso.md:74-75` (siete → ocho entradas, con `Monthly cost`) en el
  Lote B, junto con la T12.

## Lote B — implementación

Tasks cerradas: T10, T11 y T12 (las tres del lote). No se ha escrito nada en la base de
datos ni en las carpetas de datos del humano.

### Archivos modificados

Los tres de la cabecera `Archivos:` del Lote B:

- `docs/architecture.md`: en el árbol de §Estructura de carpetas, la carpeta
  `monthly-cost/` después de `overview/`, con lo que hay en cada archivo; y un párrafo
  nuevo en las notas de debajo del árbol, después del de la feature #26: solo lee, una
  petición, las cifras son del backend salvo los subtotales de los tres bloques (suma en
  céntimos de cifras ya redondeadas), el servicio rechaza una respuesta que no cuadra, no
  reordena, no pinta la cuenta de cada cargo ni recarga tras importar, y de qué otras
  features importa.
- `docs/stack.md` §Iconos (Lucide): la línea «Feature #32: `ReceiptEuro`, la entrada
  `Monthly cost` del menú.»
- `docs/guia-de-uso.md`:
  - líneas 75-77: el menú pasa de siete a ocho entradas, con `Monthly cost` entre
    `Overview` y `Movements` (la línea que avisó el Lote A);
  - tabla «Qué verás si el backend no está arrancado»: una fila `Monthly cost` con
    `Something went wrong loading the monthly cost.` y `Try again`;
  - «Mapa de la aplicación»: una fila `Monthly cost`, «Solo mira», debajo de `Overview`;
  - sección nueva «## 2b. `Monthly cost` — solo mira», entre el `---` que sigue al
    bloque de notas de la sección 2 y `## 3.`, sin renumerar: una cita al principio que
    dice que es nueva desde la feature 32 y no se probó en la primera revisión, «Para qué
    sirve», «Qué probar» (12 pasos), «Lo que no hace o hace a medias» y el bloque
    «Mis notas de esta prueba» vacío;
  - «Lo que está pendiente»: quitado el punto «Los gastos recurrentes. Espera al
    backend.», que ya no es verdad, y añadida debajo de la lista una frase que dice que
    existen desde la feature 32 en la sección 2b.

Además, fuera de la cabecera pero propios de cualquier implementer:
`specs/32-monthly-cost/tasks.md` (`[x]` en T10–T12) y `progress/current.md` (el plan del
lote).

### Decisiones tomadas

- **Dependencias en `docs/architecture.md`.** La T10 dice «no depende de ninguna otra
  feature salvo `statement/months.ts` (`formatMonthLabel`)». Lo comprobé con `grep` de
  los `import` de `src/features/monthly-cost/`: además de `formatMonthLabel`, `types.ts`
  importa el tipo `MonthKey` de `statement/months.ts` y los tipos `DecimalString` y
  `DateOnly` de `features/net-worth/types.ts` (lo que el design §2 llama «re-export del
  de net-worth, como hacen las demás»). Escribí lo que hay: solo tipos de `net-worth`, y
  de `statement/months.ts` la función y el tipo. Ninguna feature importa de
  `monthly-cost` (solo `src/router/index.ts` y su test).
- **Las cifras citadas en la guía** son recuentos, nunca importes ni nombres: el periodo
  (`October 2025 to September 2026`), 8 de 15 recibos subidos, 2 sin cargos en el
  periodo, 99 cargos enviados a personas, 8 filas de gasto variable y ninguna sin
  categoría. Medidas el 2026-10-17 por mí con un único
  `GET http://localhost:3000/api/recurring-expenses` (backend ya arrancado; no arranqué
  ni paré nada), del que solo se imprimieron recuentos. Coinciden con la prueba real del
  Lote A.
- **La guía dice lo que se ve en pantalla**, comprobado en el código: la etiqueta de la
  cifra y los nombres de columna salen en mayúsculas (clase `uppercase` en `StatCard.vue`
  y en la cabecera de `BillList.vue`); la cabecera de columnas solo desde `md`
  (`hidden … md:grid`); la etiqueta `Up …` es un `BaseBadge` de tono `negative` (en la
  guía, «una etiqueta con fondo de color»); al volver a entrar se ve otra vez la frase de
  carga porque `load()` pone `data` a `null`; `Per month` es «lo cobrado en el periodo
  entre 12» según el contrato (`gastos-backend/docs/api-contract.md`, tabla de `bills`).
- **La fila de la tabla sin backend** dice `Something went wrong loading the monthly
  cost.`, como las demás pantallas; la frase de debajo de esa tabla (que a veces sale
  `Couldn't reach the server.`) ya cubre el otro caso. No comprobado en el navegador, como
  el resto de esa tabla.

### Notas del humano en `docs/guia-de-uso.md`

Comprobado con `git diff docs/guia-de-uso.md` y comparando con una copia del archivo
tomada antes de editar:

- Líneas que empiezan por `--` (sin contar las líneas `---` de separación): **92 antes,
  92 después**, idénticas y en el mismo orden (mismo `md5sum`).
- Bloques «Mis notas de esta prueba»: **10 antes, 11 después** (52 líneas antes, 56
  después). Los 10 de antes son idénticos línea a línea; la diferencia es solo el bloque
  vacío nuevo de la sección 2b (4 líneas).
- Líneas quitadas en todo el `git diff`: solo cuatro, ninguna del humano: las dos del
  menú («siete entradas…»), el punto «Los gastos recurrentes. Espera al backend.» y la
  línea en blanco que lo seguía.
- Ningún texto nuevo queda justo encima de un `-- ok`: la sección 2b va entre un `---` y
  `## 3.`, y las demás inserciones son filas de tabla y líneas de listas sin notas
  debajo.

### Documentos actualizados

Lanzado (fuera de `progress/` y `specs/`):

```
git grep -n -i "siete entradas\|seven\|gastos recurrentes\|recurring\|monthly.cost\|ReceiptEuro\|navEntries" -- . ':!progress' ':!specs' ':!src/features/monthly-cost' ':!e2e/monthly-cost.spec.ts' ':!src/router'
git grep -n -i "recurrente\|cuánto me cuesta\|cuesta existir\|ocho entradas\|7 rutas\|siete rutas\|seven routes" -- . ':!progress' ':!specs'
```

Corregidas: las de `docs/guia-de-uso.md` de arriba. El resto de coincidencias de `src/`
son de otra cosa (`'seven'` como valor de prueba, «seventh item») o leen `navEntries`, que
ya incluye la entrada nueva.

**Líneas que siguen sin ser verdad y que están fuera de los archivos de este lote (para el
leader):** `docs/roadmap.md:52-53` («Lo siguiente en la E8: los recurrentes…») y
`docs/roadmap.md:377-378` («⏸️ **Recurrentes**: espera al backend…»). La pantalla de los
recurrentes ya existe (sin cerrar todavía). No las he tocado: `docs/roadmap.md` no está en
la cabecera del lote y el encargo lo prohíbe.

### Último ./init.sh

`timeout 900 ./init.sh` → exit 0. Resumen:

```
[OK]    feature_list.json válido (32 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  114 passed (114)
      Tests  1915 passed (1915)
[OK]    Todos los tests pasan
[OK]    Cabeceras Archivos: de 21 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### Último ./init.sh --checks 32

`timeout 900 ./init.sh --checks 32` → exit 0. Última línea:
`[OK]    Checks: 14 de 14 en verde.`

### Sugerencias fuera de scope (NO aplicadas)

- Poner al día `docs/roadmap.md:52-53` y `:377-378` (los recurrentes ya no esperan al
  backend) cuando se cierre la feature 32.
