# statement-readable — implementación

## Lote A — implementación

Fecha: 2026-10-12. Tasks cerradas: **T1 a T14 (14 de 14 del lote)**, marcadas `[x]` en
`specs/29-statement-readable/tasks.md`. La feature sigue `in_progress`; el Lote B no está
empezado.

**Estado de la verificación, en una línea:** `pnpm test:unit`, `pnpm type-check`,
`pnpm lint:oxlint:check`, `pnpm format:check` y `./init.sh --checks` salen con exit 0;
`./init.sh` completo sale con **exit 1** y el único paso en rojo son 6 pruebas de `e2e/`
que citan el texto antiguo de la nota de debajo de las cifras. Esos archivos son del
Lote B (T15) y no los he tocado.

### Archivos modificados / creados

Solo archivos de la cabecera `Archivos:` del Lote A (13 de 13; ninguno creado):

| Archivo | Qué cambió |
|---|---|
| `src/features/statement/components/StatementRow.vue` | T1, T2, T3 |
| `src/assets/theme-dark.css` | T4: dos líneas `contrast:` (comentario; ningún valor cambia) |
| `src/features/statement/components/MonthTotals.vue` | T7 |
| `src/features/statement/store.ts` | T9: `totalWithoutHiding` |
| `src/features/statement/filters.ts` | T10: `nothingShownLine` |
| `src/features/statement/components/StatementList.vue` | T11: `emptyState: 'unknown'` |
| `src/features/statement/views/StatementView.vue` | T12 |
| `src/features/statement/__tests__/StatementRow.spec.ts` | T5, T6 |
| `src/features/statement/__tests__/MonthTotals.spec.ts` | T8 |
| `src/features/statement/__tests__/store.spec.ts` | T9 |
| `src/features/statement/__tests__/filters.spec.ts` | T10 |
| `src/features/statement/__tests__/StatementList.spec.ts` | T11 |
| `src/features/statement/__tests__/StatementView.spec.ts` | T13 |

Fuera de esa lista solo he escrito `specs/29-statement-readable/tasks.md` (las marcas
`[x]`), `progress/current.md` (una línea) y este informe.

`src/features/statement/__tests__/fixtures.ts` **no** está en la cabecera del lote, así
que no lo he tocado: los datos nuevos que hacían falta (un ingreso emparejado como
traspaso, un traspaso con categoría, la respuesta de un mes con `total` 0 o 3) se
construyen dentro de cada archivo de test a partir de los que ya exporta. Todos los
valores son los inventados que ya había; no hay nombres de personas ni números de
cuenta nuevos.

### Qué se hizo, task por task

- **T1** — `StatementRow.vue`: computed `isLeftOut` (`excludedFromTotals` o
  `transferId !== null`). `amountClass` devuelve `text-ink-faint line-through` cuando
  `isLeftOut`; si no, lo de antes. El concepto lleva `text-ink-muted` cuando `isLeftOut`
  y `text-ink-strong` si no. El comentario que decía «no strikethrough» se reescribió.
- **T2** — `Transfer` y `Not counted` son dos `<span class="font-semibold">` dentro del
  `<p>` del segundo renglón, después de `statement-row-account`, con los mismos `v-if`,
  `data-test`, `title`, `aria-label` y texto. Los dos `BaseBadge` desaparecen.
- **T3** — La etiqueta de categoría es `BaseBadge` con `tone="neutral"` en las dos ramas
  (botón y no botón). Sin categoría, un `<span>` local con las clases de `design.md §2`
  y el mismo `data-test="statement-row-category"`. `BaseBadge.vue` no se toca.
- **T4** — Las dos líneas `contrast:` de `design.md §4`, en el bloque «Cards», debajo de
  la línea existente del mismo par a `>= 3`, que se queda.
- **T5** — Los seis tests con sus nombres literales, en un `describe` nuevo.
- **T6** — Los dos tests que quedaban falsos pasan a llamarse `crosses the amount out
  without changing it, and paints no coloured row` y `crosses an income out too, sign and
  figure untouched`: ahora esperan `text-ink-faint` y `line-through`; la parte que
  comprueba que la cifra y el signo no cambian, y que la fila no gana ninguna clase, se
  conserva. Tres nombres de test que decían «badge» de `Not counted` / `Transfer` dicen
  «label» (ya no son `BaseBadge`). `carries the id of its movement so the notice can find
  it` no se ha tocado y pasa.
- **T7** — `MonthTotals.vue`: `FIGURES_LINE`, `MORE_SUMMARY`, `MORE_LINES` (las cinco
  frases de R10) y la estructura de `design.md §3`. El contenedor
  `statement-totals-note` pasa de `<p>` a `<div>` (un `<details>` no puede ir dentro de
  un `<p>`). `ambiguousNote` no cambia de texto ni de condición.
- **T8** — Test `shows one sentence and keeps the rest folded until it is opened`.
  Corregidos los del bloque `the permanent note` que citaban el texto antiguo; el de «not
  one digit» se conserva sobre el texto nuevo (la nota entera y cada frase fija).
- **T9** — `store.ts`: `totalWithoutHiding`, escrito junto a `hiddenCount` en `show()` y
  en las tres salidas de `loadHiddenCount`, bajo el mismo `run !== loadRun`, y exportado.
  Test `keeps the total of the month without hiding from the read it already makes`, más
  uno añadido: `drops the total without hiding of a month nobody is looking at any more`.
- **T10** — `nothingShownLine` y su test con el nombre literal.
- **T11** — `StatementList.vue` admite `'unknown'`: `data-test="statement-nothing-shown"`,
  la frase de `nothingShownLine` y el mismo botón `Show everything`. Test con el nombre
  literal, más uno añadido que comprueba que `Show everything` no sale en `'month'` ni en
  `'noMatches'`.
- **T12** — `StatementView.vue`: el `emptyState` de `design.md §5` tal cual, y
  `:hidden-count="store.totalWithoutHiding === 0 ? null : store.hiddenCount"`.
- **T13** — Los cinco tests con sus nombres literales, más dos añadidos: `says the same
  while the second read has not answered yet, then what it learns` (la otra mitad de R14:
  la respuesta aún no ha llegado) y `keeps Hiding 0 movements in a month that does have
  movements` (la segunda frase de la procedencia de R15). Corregidos los dos tests que
  leían la nota (antes líneas 302–303 y 985). Revisado el test existente de
  `statement-nothing-left` (`nothing left to show names both causes…`): ya imita la
  segunda petición con `total: 5`, así que sigue siendo cierto y no se ha tocado. `paints
  no notice block while there is nothing to say` no se ha tocado y pasa.
- **T14** — Salidas abajo.

### Decisiones tomadas

1. **El par «`BaseBadge` con categoría / `<span>` sin categoría» está escrito dos veces
   en el template** (una dentro del botón, otra en la rama que no es botón).
   `design.md §2` pedía no escribirlo dos veces «por ejemplo» con un `<template>`
   reutilizado, y prohíbe crear un componente. Un SFC de Vue no tiene forma de reutilizar
   un trozo de template sin componente, y la rama que no es botón lleva además un `title`
   que la otra no lleva. Lo que sí está escrito una sola vez es la cadena larga de clases
   de `Uncategorized`, en la constante `UNCATEGORIZED_CLASS` del `<script setup>` (cadena
   literal completa, que Tailwind lee igual). El resultado en el DOM es el del design.
2. **Clases del `<summary>`**: `design.md §3` dejaba puntos suspensivos. Lleva
   `w-fit cursor-pointer rounded-xs font-semibold` más las tres de foco que pide el
   design. `w-fit` es para que la zona que se pulsa sea el texto y no todo el ancho.
3. **Tests añadidos que el spec no nombra** (cuatro, citados arriba en T9, T11 y T13).
   No cambian ni sustituyen a ninguno de los que nombran los `checks`.
4. **Comentarios**: se han reescrito los que el cambio volvía falsos en los archivos del
   lote (cabeceras de `MonthTotals.vue`, `StatementList.vue`, `StatementView.vue` y
   `StatementRow.vue`).

No hay ninguna desviación de `decisions.md`. Los textos de la explicación están copiados
de su tabla, letra por letra, y el test los compara enteros.

### `docs/stack.md` y `docs/architecture.md` frente al design

Leídos los dos enteros. **No he encontrado ningún choque** entre `design.md` y ellos:

- Sin dependencias nuevas, sin iconos nuevos (`Info` ya estaba), sin componentes nuevos.
- Los colores son alias semánticos; cada par sobre fondo nuevo tiene su línea
  `contrast:` y `src/assets/__tests__/theme-dark.spec.ts` la mide (ver abajo).
- La vista sigue sin llamar a la API; el dato nuevo vive en el store y sale de una
  respuesta que ya se pedía. Ninguna petición nueva (test de C1).
- `features/statement/` sigue sin importar nada de `review`.

Una línea de `docs/architecture.md` queda **incompleta** (no falsa): la 108, que
enumera lo que hay en `statement/filters.ts` (`hiddenCountLine` y `nothingLeftLine`), no
nombra `nothingShownLine`; y la descripción de `store.ts` (líneas 102–103) no nombra
`totalWithoutHiding`. `docs/architecture.md` no está en la cabecera de ningún lote.

### Trazabilidad

Archivo entre paréntesis; todos en `src/features/statement/__tests__/` salvo el de
contraste.

- R1 → `crosses out the amount and greys the description of a marked movement and of a paired transfer`; `never paints the amount of a movement that does not count in green or in white`; `crosses the amount out without changing it, and paints no coloured row`; `crosses an income out too, sign and figure untouched` (`StatementRow.spec.ts`)
- R2 → `crosses out the amount and greys the description of a marked movement and of a paired transfer` (`StatementRow.spec.ts`)
- R3 → el mismo test, en su segunda mitad: gasto `text-ink-strong`, ingreso `text-positive`, neutro `text-ink-muted`, ninguno con `line-through` (`StatementRow.spec.ts`)
- R4 → `keeps the category on a movement that does not count` (`StatementRow.spec.ts`)
- R5 → `writes Transfer and Not counted under the description next to the account` (`StatementRow.spec.ts`)
- R6 → `gives every category the same label look for income and for expense` (`StatementRow.spec.ts`)
- R7 → `draws the Uncategorized label with a dashed outline and no fill` (`StatementRow.spec.ts`)
- R8, R9, R10, R11 → `shows one sentence and keeps the rest folded until it is opened` (`MonthTotals.spec.ts`); R8 además `shows the scope line with the count of the filter, and keeps the note` y R11 `reads the doubtful groups once per session and puts them in the note` (`StatementView.spec.ts`)
- R12 → `an empty month opened with the checkbox on says it has no movements`; `with filters and the checkbox on a month where nothing matches blames the filters` (`StatementView.spec.ts`)
- R13 → `a month whose movements are all hidden says so and offers Show everything`; el existente `nothing left to show names both causes and offers the switch back` (variante con filtros) (`StatementView.spec.ts`)
- R14 → `says nothing is shown without blaming the checkbox when the second read fails`; `says the same while the second read has not answered yet, then what it learns` (`StatementView.spec.ts`); `says nothing is shown and offers Show everything while the reason is unknown` (`StatementList.spec.ts`); `names the month and the checkbox when nothing is shown and the reason is unknown` (`filters.spec.ts`); `keeps the total of the month without hiding from the read it already makes` (`store.spec.ts`)
- R15 → `an empty month opened with the checkbox on says it has no movements` (sin `statement-hidden-count` ni la palabra `Hiding`); `keeps Hiding 0 movements in a month that does have movements` (`StatementView.spec.ts`)
- C1 → `asks the backend for nothing new to tell an empty month from a hidden one` (`StatementView.spec.ts`)
- C2 → `src/assets/__tests__/theme-dark.spec.ts`, que genera un test por línea `contrast:`
- C3, C5 → check 12 de la feature (`git diff --quiet d5290e7 -- …`), exit 0
- C4 → `carries the id of its movement so the notice can find it` (`StatementRow.spec.ts`) y `paints no notice block while there is nothing to say` (`StatementView.spec.ts`), sin tocar y en verde

### Comprobación de que los tests nuevos fallan cuando el código está mal

Para no dar por buenos unos tests que pasaron a la primera, rompí el código a propósito
en cinco sitios a la vez (el mínimo de contraste nuevo subido a 9; `emptyState` devuelto
a «con la casilla puesta, siempre `nothingLeft`» y `hidden-count` sin el `null`;
`amountClass` y el `tone` como estaban antes; `<details open>`; y `totalWithoutHiding`
guardando la resta en vez del total) y lancé
`pnpm exec vitest run src/features/statement src/assets`:

```
 Test Files  5 failed | 14 passed (19)
      Tests  13 failed | 578 passed (591)
```

Fallaron, entre otros, los de los `checks` 1, 2, 3, 4, 8 y 9, y los tests de R14 y del
store. Después restauré los cinco archivos desde su copia y la misma orden volvió a
`591 passed`. Los `checks` 5, 6, 7, 10 y 11 no los he roto a propósito.

### Documentos actualizados

`git grep -n` fuera de `progress/` y `specs/` de: `These figures already`,
`FIGURES_NOTE`, `en gris`, `nothingLeftLine`, `nothing-left`, `Hiding 0`,
`everything in this month is hidden`, `no strikethrough`, `ni tachado`, `tone="brand"`,
`statement-row-excluded`, `statement-row-transfer`, `statement-totals-note`,
`emptyState`.

Dentro de los archivos del lote: corregidos los comentarios citados en «Decisiones», 4.

**Líneas que mi cambio vuelve falsas y están fuera de los archivos de mi lote** (no las
he tocado):

- Del **Lote B**, ya previstas en sus tasks:
  - `e2e/statement.spec.ts:10`, `e2e/statement-fix-category.spec.ts:11`,
    `e2e/statement-exclude-from-totals.spec.ts:11`, `e2e/statement-noise-toggle.spec.ts:11`
    — la constante `NOTE_START` con el texto antiguo (T15).
  - `docs/guia-de-uso.md:347`, `:441-442`, `:505-511` (T18).
- **De ningún lote:**
  - `docs/roadmap.md`, filas 11, 18, 20 y 22 de la tabla de cabos sueltos (líneas 435,
    442, 444 y 446): describen como abiertos los cuatro fallos que esta feature arregla.
    Entiendo que es el paso de cierre de la feature (`AGENTS.md §5`), no del implementer.
  - `docs/architecture.md:102-108`: incompleta, descrita arriba.

### Prueba real

No aplica en el sentido de `CHECKPOINTS.md §C4 bis`: el lote no lee ningún dato de fuera
que no se leyera ya. **No he mirado la pantalla en un navegador**: la instrucción era no
arrancar a mano un servidor en 5173, y los tests unitarios corren en jsdom, que no
pinta. Lo que sí pasó por Chromium es el paso de `e2e/` de `./init.sh` (abajo). Que el
tachado y el gris «se vean a simple vista» queda sin comprobar por mí.

### Último `pnpm exec vitest run src/features/statement src/assets` (T14)

```
 Test Files  19 passed (19)
      Tests  591 passed (591)
```

Antes de empezar, la misma orden daba `570 passed (570)`: 21 tests nuevos.

### Último `pnpm test:unit`

```
$ vitest run
 Test Files  105 passed (105)
      Tests  1772 passed (1772)
   Duration  20.24s
exit=0
```

### Último `pnpm type-check`

```
$ vue-tsc --build
type-check exit=0
```

### Último `pnpm lint:oxlint:check`

```
$ oxlint .
lint exit=0
```

### Último `pnpm format:check`

```
$ prettier --check --experimental-cli src/ e2e/ "*.config.ts" env.d.ts index.html "tsconfig*.json" .oxlintrc.json package.json
Checking formatting...
All matched files use Prettier code style!
format exit=0
```

### Último `./init.sh` — exit 1, por `e2e/` del Lote B

```
[OK]    feature_list.json válido (29 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
[OK]    Todos los tests pasan
[OK]    Cabeceras Archivos: de 18 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[FAIL]  E2E smoke rojo (chromium):
  6 failed
    e2e\statement-exclude-from-totals.spec.ts:250:1 › marks three lines with one request and the figures come back changed
    e2e\statement-fix-category.spec.ts:222:1 › changes the category of a line and does not ask for the figures again
    e2e\statement-noise-toggle.spec.ts:302:1 › the note is permanent, carries the live sentence and nothing else numeric
    e2e\statement-noise-toggle.spec.ts:324:1 › with no doubtful group the note keeps only its fixed text
    e2e\statement.spec.ts:197:1 › opens on the current month with its figures, its note and its days
    e2e\statement.spec.ts:300:1 › filtering inside the month changes the figures and the count (feature 20)
  52 passed (27.1s)
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
exit=1
```

Las seis fallan en la misma aserción, `toContainText(NOTE_START)`, con
`Expected substring: "These figures already leave out what does not count"` y
`Received string: "These figures leave out the movements labelled \"Transfer\" or \"Not counted\".More about what counts…"`.
Líneas: `statement-fix-category.spec.ts:250`, `statement-exclude-from-totals.spec.ts:284`,
`statement.spec.ts:208` y `:321`, `statement-noise-toggle.spec.ts:309` y `:329`.

### Último `./init.sh --checks`

```
[OK]    Checks: 12 de 12 en verde.
exit=0
```

Los doce, uno por uno, con `exit 0`. No he tocado el campo `checks`.

### Lo que debe saber el Lote B

1. **Lo único que falla hoy en `e2e/` (chromium) son esas seis aserciones de
   `NOTE_START`.** Las otras 52 pruebas pasan con el Lote A puesto, incluidas las de
   `e2e/action-notice-in-view.spec.ts` y las que cuentan `statement-row-excluded` y
   `statement-row-transfer`: mover esas dos etiquetas al segundo renglón y cambiar el
   aspecto del importe no ha roto ninguna prueba de chromium. Las seis se paran en su
   primera aserción fallida, así que no sé si más abajo en esas mismas pruebas hay otra
   que falle: se verá al corregir `NOTE_START`. Firefox y WebKit no los he lanzado.
2. **`toContainText` sobre `statement-totals-note` lee también lo plegado.** En el
   `Received string` de arriba se ve que el texto del `<details>` cerrado viaja entero.
   Las pruebas de `statement-noise-toggle.spec.ts:302` y `:324` («nothing else numeric»,
   «only its fixed text») siguen pudiendo leer la nota completa así; si quieren
   distinguir lo que está a la vista, los `data-test` son `statement-totals-line` (la
   frase), `statement-totals-more` (el `<details>`) y `statement-ambiguous-note` (ahora un
   `<li>` dentro del `<details>`, no a la vista hasta abrirlo: un `toBeVisible()` sobre él
   fallaría con el `<details>` cerrado).
3. **`data-test` nuevo:** `statement-nothing-shown` (R14). Se pinta primero, durante lo
   que tarde la segunda petición, y luego se sustituye por `statement-empty`,
   `statement-no-matches` o `statement-nothing-left`. Una prueba de navegador que mire
   `statement-show-everything` justo al cargar un mes vacío puede verlo un instante: para
   T16, esperar a `No movements in` antes de afirmar que `Show everything` no está.
4. **`e2e/statement-noise-toggle.spec.ts:289`** (`statement-nothing-left`) ha pasado en
   chromium con el Lote A, lo que quiere decir que su imitación de la segunda petición
   devuelve un `total` mayor que 0; no he leído el archivo para confirmarlo de otra
   forma.
5. **La segunda petición se reconoce por `pageSize=1`** y no lleva `excluded` ni
   `transfer`; la del mes con la casilla `Hide what does not count` puesta lleva
   `excluded=none&transfer=none`. Para T16 hacen falta las dos con `total: 0`.
6. `Transfer` y `Not counted` ya no son `BaseBadge`: son `<span>` dentro del `<p>` de
   `statement-row-account`. Conservan `data-test`, `title` y `aria-label`.

### Sugerencias fuera de scope (NO aplicadas)

- **Etiqueta de categoría con el ratón encima de la línea.** La fila pasa a
  `bg-surface-sunken` al pasar el ratón (`hover:bg-surface-sunken`, ya era así) y el
  `BaseBadge` neutro tiene ese mismo fondo (`bg-surface-sunken`, en `BaseBadge.vue`).
  Antes solo les pasaba a las etiquetas sin color; desde este lote todas las de categoría
  son neutras, así que con el ratón encima el fondo de la etiqueta y el de la fila son el
  mismo alias. Lo he leído en las clases; **no lo he mirado en un navegador**. La de
  `Uncategorized` conserva su borde. Si al mirarlo molesta, es una decisión de diseño que
  el spec no recoge.
- El check de la feature 27 que compara `src/features/statement/store.ts` con el commit
  `8f0dce6` ya no sale con 0 (`git diff --quiet 8f0dce6 -- src/features/statement/store.ts`
  → exit 1). Está avisado en `design.md §8`; es de una feature cerrada y
  `./init.sh --checks` no lo ejecuta.
- `docs/architecture.md:102-108` podría nombrar `totalWithoutHiding` y
  `nothingShownLine`.

## Lote B — implementación

Fecha: 2026-10-12. Tasks cerradas: **T15 a T18 (4 de 4 del lote)**, marcadas `[x]` en
`specs/29-statement-readable/tasks.md` (18 de 18 en total). La feature sigue
`in_progress`; no he tocado `feature_list.json`.

**Estado de la verificación, en una línea:** `pnpm test:e2e --project=chromium` 60 de 60
(exit 0), `./init.sh` completo exit 0, `./init.sh --checks 29` 12 de 12 (exit 0).
**Ninguna prueba de navegador se quedó colgada**: todas las pasadas se lanzaron con
`timeout` y terminaron solas (la más larga, 20,4 s). No sé por qué se colgó el implementer
anterior: no lo he podido reproducir.

### Lo que dejó el implementer anterior, revisado

Comprobado con `git diff -- e2e docs` antes de tocar nada:

- **Los cuatro `e2e/statement*.spec.ts`:** solo la constante `NOTE_START` y su
  comentario. El texto nuevo, `These figures leave out the movements labelled`, es el
  principio de la frase de R8 (`FIGURES_LINE` en `MonthTotals.vue`). Correcto; se queda.
  En `statement-noise-toggle.spec.ts` el comentario de esa constante seguía diciendo
  «whose first words never change … (R14)»; lo he igualado al de los otros tres.
- **Lo que le faltaba a T15:** las dos pruebas de `statement-noise-toggle.spec.ts` que
  leen `statement-totals-note` no estaban ajustadas a la estructura nueva: seguían leyendo la nota entera sin
  distinguir lo que está a la vista de lo plegado. No las lancé en ese estado intermedio,
  así que no sé si pasaban. Hecho ahora.
- **`docs/architecture.md`, siete líneas (102–111 de hoy):** nombran `totalWithoutHiding`
  en `store.ts` y `nothingShownLine` en `filters.ts`. Comprobado que los dos existen
  (`grep -n totalWithoutHiding src/features/statement/store.ts` → líneas 79, 167, 214,
  222, 226; `grep -n "export function nothingShownLine" src/features/statement/filters.ts`
  → línea 221) y que lo que dicen de ellos coincide con el código. Correcto; no he
  cambiado nada en ese archivo.
- T16, T17 y T18 no estaban empezadas.

**Procesos y puertos.** Antes de lanzar nada, `netstat -ano` no mostraba ningún proceso
escuchando en 5173, 4173, 3000 ni 9323. Había dos `node.exe` (PID 33108 y 38688) que no
escuchan en esos puertos; no los he tocado ni sé de quién son. No he matado ningún
proceso. Después de cada pasada, 5173 volvía a quedar sin nadie escuchando: el servidor
lo arranca y lo cierra Playwright.

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `e2e/statement-noise-toggle.spec.ts` | T15 (dos pruebas ajustadas, comentario de `NOTE_START`), T16 (prueba nueva) |
| `e2e/statement.spec.ts` | Prueba nueva que mira en Chromium el aspecto de un movimiento que no cuenta (T17; R1, R2, R3, R5) |
| `e2e/statement-exclude-from-totals.spec.ts`, `e2e/statement-fix-category.spec.ts` | Solo `NOTE_START` (lo que dejó el anterior) |
| `docs/guia-de-uso.md` | T18 |
| `docs/architecture.md` | Sin cambios míos; lo del anterior, revisado |

`e2e/action-notice-in-view.spec.ts` **no se ha tocado**: sus 12 pruebas pasan tal cual
(C4). Fuera de la lista: `specs/29-statement-readable/tasks.md` (las cuatro marcas),
`progress/current.md` y este informe.

### Qué se hizo, task por task

- **T15** — `the note is permanent, carries the live sentence and nothing else numeric`:
  ahora comprueba que `statement-totals-line` está a la vista con el principio de la
  frase, que `statement-totals-more` tiene `open === false`, que la frase de los grupos
  (`statement-ambiguous-note`) **no** está a la vista; pulsa el `<summary>` y entonces sí
  está, con `2 groups look like transfers…`, y hay 6 `<li>`. El resto (ningún botón en la
  nota, una sola lectura de `/api/transfers/ambiguous`, solo GET) se conserva.
  `with no doubtful group the note keeps only its fixed text`: `<summary>` con
  `More about what counts`, cerrado; al abrirlo, 5 `<li>`; ni un dígito en toda la nota.
- **T16** — Prueba nueva `an empty month with the checkbox on says it has no movements`.
  Añade una ruta imitada que responde `total: 0` a las dos lecturas del mes (la del mes
  con la casilla puesta y la de `pageSize=1` sin `status`); el recuento de la barra
  lateral sigue con su respuesta. Espera a `No movements in` y después comprueba que no
  existen `statement-show-everything`, el texto `Show everything`,
  `statement-nothing-left`, `statement-nothing-shown`, `statement-hidden-count` ni el
  texto `Hiding`. Además cuenta las lecturas de `/api/movements` sin `status`: exactamente
  dos, `pageSize` 200 y 1, la primera con `excluded=none&transfer=none` y la segunda sin
  `excluded` (C1 en el navegador).
  La prueba existente de `statement-nothing-left` (`a search that only matches hidden
  rows…`): leída su imitación. Con `q`, la lectura con la casilla puesta devuelve
  `total: 0` y la lectura sin esconder (que no lleva `excluded` ni `transfer`) devuelve
  `total: 1`. Ya imitaba un total mayor que 0; no se ha cambiado.
- **T17** — Las cinco pruebas de la cabecera: `36 passed (17.6s)`. Ninguna falló por el
  cambio de sitio de `Transfer` / `Not counted` ni por el aspecto del importe, así que no
  hubo nada que corregir. Añadida en `e2e/statement.spec.ts` la prueba
  `a movement that does not count is crossed out, greyed and labelled under its
  description`, que es la que mira los colores calculados (cifras abajo).
- **T18** — `docs/guia-de-uso.md`, sección `Movements` (detalle abajo).

### Comprobación de que las dos pruebas nuevas fallan cuando lo que ven está mal

No podía romper el código del Lote A (no son mis archivos), así que cambié los datos
imitados dentro de mis dos pruebas y las lancé:

- En la del mes vacío, la lectura sin esconder devolviendo `total: 3` →
  `Locator: getByTestId('statement-empty')  Expected substring: "No movements in"
  Error: element(s) not found`.
- En la del aspecto, el primer movimiento sin `transferId` →
  `Error: expect(received).toMatchObject(expected)` en el importe.

`2 failed`, exit 1. Restauré los dos archivos desde su copia y `git diff --stat -- e2e`
volvió a dar las mismas cifras de antes (70 y 108 líneas).

### Lo que el Lote A dejó sin ver, medido en Chromium

Valores de `getComputedStyle`, leídos por la prueba nueva de `e2e/statement.spec.ts`
sobre cuatro movimientos inventados (uno de un traspaso emparejado, un ingreso marcado
con categoría, un gasto que cuenta con categoría, un ingreso que cuenta sin categoría).
Los cocientes de contraste están calculados con la fórmula WCAG sobre esos valores. Los
fondos y el aspecto de las etiquetas de categoría se leyeron con unas líneas de medida
puestas dentro de esa prueba durante una pasada y quitadas después: la prueba que queda
afirma los colores y el tachado del importe y del concepto, la posición de `Transfer` /
`Not counted` y el fondo de la fila con el ratón encima; **no** afirma nada sobre el
fondo de la etiqueta de categoría.

**1. Un movimiento que no cuenta** (igual el del traspaso que el marcado a mano):

| Qué | Color calculado | `text-decoration-line` | Contraste sobre la tarjeta `rgb(20, 27, 34)` |
|---|---|---|---|
| Importe que no cuenta | `rgb(155, 166, 178)` (`--ink-faint`) | `line-through` | 7,02 |
| Importe de un gasto que cuenta | `rgb(247, 249, 251)` (`--ink-strong`) | `none` | 16,45 |
| Importe de un ingreso que cuenta | `rgb(18, 184, 134)` (`--positive`) | `none` | 6,80 |
| Concepto de lo que no cuenta | `rgb(205, 213, 221)` (`--ink-muted`) | `none` | 11,70 |
| Concepto de lo que cuenta | `rgb(247, 249, 251)` (`--ink-strong`) | `none` | 16,45 |
| `Transfer` y `Not counted` | `rgb(205, 213, 221)` (`--ink-muted`) | `none` | 11,70 |

- `Transfer` y `Not counted` **se leen bajo el concepto**: la prueba comprueba que son
  visibles, que su borde superior queda por debajo del borde inferior del concepto, que
  están a la misma altura que la cuenta (menos de 2 px de diferencia) y a su derecha.
- La etiqueta de categoría del movimiento marcado sigue diciendo `Food`.
- Dos cifras para quien decida si esto «se ve a simple vista» (la hoja de decisiones
  dice que eso lo dice el humano): el gris del importe tachado y el verde de un ingreso
  tienen casi la misma luminosidad (cociente entre los dos, 1,03): se distinguen por el
  tono y por el tachado, no por lo claro u oscuro. Y el concepto de lo que no cuenta
  frente al de lo que cuenta tiene un cociente de 1,41: la diferencia de gris del
  concepto es pequeña; lo que más separa las dos líneas es el importe.

**2. Con el ratón encima de una línea:**

| Qué | En reposo | Con el ratón encima |
|---|---|---|
| Fondo de la fila | transparente (se ve la tarjeta, `rgb(20, 27, 34)`) | `rgb(11, 17, 22)` (`--surface-sunken`) |
| Fondo de la etiqueta de una categoría | `rgb(11, 17, 22)` | `rgb(11, 17, 22)` |
| Borde de esa etiqueta | `1px solid` transparente | igual |
| Cociente entre el fondo de la etiqueta y lo que tiene detrás | 1,09 | **1,00** |
| Texto de esa etiqueta | `rgb(227, 232, 237)`, 15,40 sobre su fondo | igual |
| `Uncategorized` | sin fondo, borde `1px dashed rgb(155, 166, 178)` | igual; el borde, a 7,68 sobre la fila |

**Con el ratón encima, la forma de la etiqueta de una categoría deja de distinguirse del
fondo de la fila**: los dos son exactamente el mismo color y el borde es transparente.
Queda a la vista solo el texto de la categoría. En reposo ya se distinguía poco (1,09).
La de `Uncategorized` conserva su borde a rayas. **No lo he cambiado.** El spec no lo
recoge (R6 pide `tone="neutral"` y C3 prohíbe tocar `BaseBadge.vue`), así que no es un
incumplimiento de ningún requirement y no lo trato como bloqueo.

**Ninguna prueba de navegador ha destapado un defecto del código del Lote A.**

### `docs/guia-de-uso.md` (T18)

Solo la sección `4. Movements`. Cambiado el texto de la guía en:

- Paso 2: añadido que las etiquetas de categoría son todas grises y que `Uncategorized`
  lleva borde a rayas y no tiene fondo.
- Pasos 3 y 4: `Transfer` y `Not counted` van bajo el concepto, junto a la cuenta, y el
  importe sale tachado y en gris; en el 4, que la etiqueta de categoría sigue ahí.
- Paso 13: la frase que está a la vista y que el resto se abre con
  `More about what counts`.
- Paso 18: «en gris, sin tachar y sin signo» (el movimiento neutro).
- Pasos 20 y 21: «importe tachado y en gris», y que al deshacer deja de estar tachado.
- «Lo que no hace o hace a medias»: las dos frases sobre la nota gris dicen ahora que
  eso está dentro de `More about what counts`; el «Fallo conocido» del mes vacío se
  sustituye por lo que la pantalla dice en cada uno de los tres casos (y ya no remite al
  cabo suelto 11 de `docs/roadmap.md`).

**Las anotaciones del humano no se han tocado.** Comprobado con
`git diff -U0 -- docs/guia-de-uso.md`: 35 líneas añadidas y 20 quitadas. Las 20 quitadas
son, todas, texto de la guía (las he leído una a una en la salida: son de los pasos 3, 4,
13, 18, 20 y 21 y de tres puntos de «Lo que no hace o hace a medias»). Ninguna línea
añadida ni quitada empieza por `--` ni por `>`, ni es una de las líneas de continuación
de sus notas (`grep -E "^[-+]\s*(--|>)|^[-+] {6,}\S"` sobre el diff: sin resultados). El
número de líneas que empiezan por `--` o por `>` en todo el archivo es 178 antes y 178
después. El archivo sigue en UTF-8 con finales de línea LF.

### Trazabilidad (lo que añade el Lote B; lo del Lote A sigue valiendo)

- R1, R2, R3, R5 → `a movement that does not count is crossed out, greyed and labelled under its description` (`e2e/statement.spec.ts`), en Chromium y con colores calculados
- R4 → la misma prueba (`statement-row-category` dice `Food` en el movimiento marcado)
- R8, R9, R11 → `the note is permanent, carries the live sentence and nothing else numeric` y `with no doubtful group the note keeps only its fixed text` (`e2e/statement-noise-toggle.spec.ts`)
- R12, R15, C1 → `an empty month with the checkbox on says it has no movements` (`e2e/statement-noise-toggle.spec.ts`)
- R13 → `a search that only matches hidden rows names both causes and gives the way back` (`e2e/statement-noise-toggle.spec.ts`), sin cambios
- C4 → las 12 pruebas de `e2e/action-notice-in-view.spec.ts`, sin tocar y en verde

### Documentos actualizados

`git grep -n -E "These figures already|FIGURES_NOTE|importe en gris|ni tachado|no strikethrough|Fallo conocido|etiqueta .(Transfer|Not counted)"`
fuera de `progress/`, `specs/` y `design-system/`. Después de mis cambios queda una sola
línea, y no es de mis archivos:

- `docs/roadmap.md:446` cita `These figures already leave out what does not count` al
  describir como abierto el cabo suelto 22. Junto con las filas 11, 18 y 20 (ya avisadas
  por el Lote A), describe como abiertos fallos que esta feature arregla. Se me indicó no
  tocar `docs/roadmap.md`; queda para el cierre de la feature.

Dos pasajes de `docs/guia-de-uso.md` **fuera** de la sección `Movements`, que no he
tocado porque el encargo era solo esa sección: en el apartado A («Marcar los
traspasos…»), el paso 4 dice «que no lleven la etiqueta `Transfer` ni `Not counted`»
(las palabras siguen saliendo; ya no tienen forma de etiqueta), y en `Transfers` se dice
que «la nota gris de `Movements` avisa de que una pareja puede no ser un traspaso» (lo
sigue avisando, ahora dentro de `More about what counts`).

### Prueba real

No aplica en el sentido de `CHECKPOINTS.md §C4 bis`: el lote no lee ningún dato de fuera.
Las pruebas de navegador responden a todas las peticiones a `/api` con datos imitados e
inventados y abortan cualquier otra; ninguna habla con el backend real. Lo que sí queda
visto en un navegador (Chromium) es el aspecto, con las cifras de arriba. Firefox y
WebKit no los he lanzado.

### Último `pnpm test:e2e --project=chromium` (entero, con `timeout 500`)

```
$ playwright test "--project=chromium"

Running 60 tests using 6 workers
…
[42/60] [chromium] › e2e\statement.spec.ts:220:1 › a movement that does not count is crossed out, greyed and labelled under its description
[45/60] [chromium] › e2e\statement-noise-toggle.spec.ts:302:1 › an empty month with the checkbox on says it has no movements
[49/60] [chromium] › e2e\statement-noise-toggle.spec.ts:341:1 › the note is permanent, carries the live sentence and nothing else numeric
[53/60] [chromium] › e2e\statement-noise-toggle.spec.ts:375:1 › with no doubtful group the note keeps only its fixed text
…
[60/60] [chromium] › e2e\action-notice-in-view.spec.ts:1067:1 › an open dialog paints over the notice
  60 passed (20.4s)
exit=0
```

Antes del lote eran 58 pruebas (52 pasaban y 6 fallaban); ahora son 60: dos nuevas.

### Las cinco pruebas de la cabecera (T17, con `timeout 400`)

```
Running 36 tests using 5 workers
  36 passed (17.6s)
exit=0
```

### Último `./init.sh` (con `timeout 560`)

```
[OK]    feature_list.json válido (29 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  105 passed (105)
      Tests  1772 passed (1772)
[OK]    Todos los tests pasan
[OK]    Cabeceras Archivos: de 18 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
exit=0
```

### Último `./init.sh --checks 29`

```
[INFO]  Feature: F29 statement-readable
[OK]        exit 0        (doce veces: checks 1 a 12, uno por uno)
[OK]    Checks: 12 de 12 en verde.
exit=0
```

No he tocado el campo `checks`.

### Sugerencias fuera de scope (NO aplicadas)

- **La forma de la etiqueta de categoría con el ratón encima** (cifras arriba: cociente
  1,00 con el fondo de la fila). Si se quiere que se siga viendo hay que decidir cómo (un
  borde, u otro fondo para la fila o para la etiqueta); toca `StatementRow.vue` o
  `BaseBadge.vue`, que no son de este lote, y el segundo lo comparte `Review`.
- `docs/roadmap.md`, filas 11, 18, 20 y 22 de los cabos sueltos: a cerrar con la feature.
- Los dos pasajes de `docs/guia-de-uso.md` de fuera de la sección `Movements` citados en
  «Documentos actualizados».
- En la carpeta temporal de la sesión (fuera del repositorio) quedan dos copias de mis
  dos archivos de prueba y tres salidas de comandos. Intenté borrar las copias y la
  comprobación de seguridad de la herramienta bloqueó el borrado; no están en git.
