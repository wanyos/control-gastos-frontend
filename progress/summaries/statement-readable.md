# Resumen — feature 29 `statement-readable`

Fecha de cierre: 2026-10-12
Intención original: `feature_list.json` → feature `statement-readable`, bloque `intent`
Spec: `specs/29-statement-readable/`

## Qué verás distinto en `Movements`

- **Lo que no cuenta en las sumas se ve.** Un movimiento que marcaste (`Not counted`) o
  uno de los dos de un traspaso (`Transfer`) sale con el **importe tachado y en gris** y el
  concepto en gris claro en vez de blanco. Antes un traspaso salía como uno normal.
- **`Transfer` y `Not counted` ya no son etiquetas.** Son palabras bajo el concepto, junto
  a la cuenta (`Banco ···1234  Not counted`). Lo único con forma de etiqueta en una
  línea es la categoría.
- **Las etiquetas de categoría son todas grises**, sea ingreso o gasto. El verde queda solo
  en el importe de lo que entra. `Uncategorized` lleva borde a rayas y no tiene fondo.
- **La explicación de debajo de las cifras es una frase**:
  `These figures leave out the movements labelled "Transfer" or "Not counted".` El resto
  (cinco frases, y la de los grupos que parecen traspasos cuando los hay) se abre pulsando
  `More about what counts`. Sale plegado cada vez que entras.
- **Un mes sin movimientos, con la casilla `Hide what does not count` puesta**, dice
  `No movements in October 2026.`, sin botón y sin `Hiding 0 movements`. Si el mes sí tiene
  movimientos y están todos escondidos, sigue diciendo que están escondidos, con
  `Show everything`.

No cambia ninguna cifra, qué cuenta, cómo se marca, el backend, ni la pantalla `Review`.

## Lo que solo puedes juzgar tú, mirándolo con tus datos

1. **Si lo que no cuenta se distingue «a simple vista».** Medido: el gris del importe
   tachado y el verde de un ingreso tienen casi la misma claridad (cociente 1,03); se
   separan por el color y por el tachado. Frente al blanco de un gasto la diferencia es
   mayor (2,34). El concepto en gris claro frente al blanco se diferencia poco (1,41): lo
   que más separa las dos líneas es el importe.
2. **La etiqueta de categoría con el ratón encima de la línea.** Al pasar el ratón, el
   fondo de la línea y el de la etiqueta son el mismo color: la forma de la etiqueta deja
   de verse y queda solo el nombre de la categoría. En reposo se ve, pero poco (1,09). No
   incumple nada de lo aprobado; ya pasaba con las etiquetas sin color y ahora pasa con
   todas. `Uncategorized` conserva su borde a rayas. Si te molesta, hay que decidir cómo
   (un borde, u otro fondo) y es un cambio aparte.
3. **Si la explicación se entiende**, y si entiendes una línea con `Not counted` y una
   categoría a la vez.
4. **El cambio de frase al cargar un mes vacío con la casilla puesta.** Durante un
   instante dice `Nothing to show in October 2026 while "Hide what does not count" is
   ticked.` y luego pasa a `No movements in…` o a `Nothing left to show…`. Si la segunda
   lectura falla, se queda en esa frase, con `Show everything`.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| Decide si un movimiento no cuenta en las sumas | [StatementRow.vue:174](../../src/features/statement/components/StatementRow.vue#L174) |
| La frase a la vista y el bloque plegado | [MonthTotals.vue:51](../../src/features/statement/components/MonthTotals.vue#L51) |
| Decide qué frase sale cuando la lista está vacía | [StatementView.vue:323](../../src/features/statement/views/StatementView.vue#L323) |
| Guarda cuántos movimientos tiene el mes sin esconder nada | [store.ts:79](../../src/features/statement/store.ts#L79) |

## Dónde está el código

### La línea de un movimiento

| Qué hace | Dónde |
| --- | --- |
| Importe tachado y gris; verde, blanco o gris si cuenta | [StatementRow.vue](../../src/features/statement/components/StatementRow.vue) → `amountClass`, `isLeftOut` |
| `Transfer` y `Not counted` bajo el concepto | [StatementRow.vue](../../src/features/statement/components/StatementRow.vue) → `statement-row-transfer`, `statement-row-excluded` |
| `Uncategorized` con borde a rayas y sin fondo | [StatementRow.vue](../../src/features/statement/components/StatementRow.vue) → `UNCATEGORIZED_CLASS` |
| Las dos medidas de contraste nuevas (ningún color cambia) | [theme-dark.css](../../src/assets/theme-dark.css) → líneas `contrast:` con `statement:` |

### La explicación de debajo de las cifras

| Qué hace | Dónde |
| --- | --- |
| La frase a la vista, el título del bloque y las cinco frases | [MonthTotals.vue](../../src/features/statement/components/MonthTotals.vue) → `FIGURES_LINE`, `MORE_SUMMARY`, `MORE_LINES` |
| La frase de los grupos, la última del bloque | [MonthTotals.vue](../../src/features/statement/components/MonthTotals.vue) → `ambiguousNote` |

### El mes con la lista vacía y la casilla puesta

| Qué hace | Dónde |
| --- | --- |
| Guarda el total del mes sin esconder, de una lectura que ya se hacía | [store.ts](../../src/features/statement/store.ts) → `totalWithoutHiding`, `loadHiddenCount` |
| Elige entre mes vacío, filtros sin resultado, todo escondido o «aún no se sabe» | [StatementView.vue](../../src/features/statement/views/StatementView.vue) → `emptyState` |
| No pinta `Hiding N` si el mes no tiene nada | [StatementView.vue](../../src/features/statement/views/StatementView.vue) → `:hidden-count` de `NoiseSwitch` |
| La frase de «aún no se sabe» | [filters.ts](../../src/features/statement/filters.ts) → `nothingShownLine` |
| Pinta esa frase y su botón | [StatementList.vue](../../src/features/statement/components/StatementList.vue) → `emptyLine`, `emptyTest`, `offersEverything` |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| Importe, concepto, etiquetas, `Uncategorized`, posición de las dos palabras | [StatementRow.spec.ts](../../src/features/statement/__tests__/StatementRow.spec.ts) → `telling apart what counts, what does not and what has no category` |
| Texto exacto, plegado, frase de los grupos | [MonthTotals.spec.ts](../../src/features/statement/__tests__/MonthTotals.spec.ts) → `shows one sentence and keeps the rest folded until it is opened` |
| Los estados del mes vacío y que no se pide nada nuevo | [StatementView.spec.ts](../../src/features/statement/__tests__/StatementView.spec.ts) → `a month where the list comes out empty with the checkbox on` |
| El dato nuevo del store, también cuando la lectura falla o llega tarde | [store.spec.ts](../../src/features/statement/__tests__/store.spec.ts) → `keeps the total of the month without hiding from the read it already makes` |
| La frase y el bloque de «aún no se sabe» | [filters.spec.ts](../../src/features/statement/__tests__/filters.spec.ts) → `names the month and the checkbox…`; [StatementList.spec.ts](../../src/features/statement/__tests__/StatementList.spec.ts) → `says nothing is shown and offers Show everything while the reason is unknown` |
| Colores calculados y posición, en Chromium | [statement.spec.ts](../../e2e/statement.spec.ts) → `a movement that does not count is crossed out, greyed and labelled under its description` |
| Mes vacío con la casilla, y el bloque plegado, en Chromium | [statement-noise-toggle.spec.ts](../../e2e/statement-noise-toggle.spec.ts) → `an empty month with the checkbox on says it has no movements`, `the note is permanent…`, `with no doubtful group…` |
| Principio de la frase a la vista | [statement-exclude-from-totals.spec.ts](../../e2e/statement-exclude-from-totals.spec.ts), [statement-fix-category.spec.ts](../../e2e/statement-fix-category.spec.ts) → `NOTE_START` |

### Documentos

| Qué cambia | Dónde |
| --- | --- |
| Sección `4. Movements` puesta al día; tus notas, sin tocar (comprobado línea a línea) | [guia-de-uso.md](../../docs/guia-de-uso.md) |
| `totalWithoutHiding` y `nothingShownLine` en el mapa de carpetas | [architecture.md](../../docs/architecture.md) |

## Cumplimiento de la intención

Resultado real de `./init.sh --checks 29` del 2026-10-12: **12 de 12 en verde**.

- ✅ «Un movimiento que no cuenta se distingue a simple vista» → a medias por comando:
  importe tachado y concepto gris, marcado o traspaso. Check 1 ✅. **Si se ve a simple
  vista lo dices tú** (punto 1 de arriba).
- ✅ «Su importe no se confunde con el de un movimiento normal» → nunca verde ni blanco
  (check 2 ✅); el gris se lee sobre el fondo, 7,02 y 7,68 con mínimo 4,5 (check 3 ✅).
- ✅ «Sé por qué una etiqueta tiene el color que tiene, o todas el mismo» → todas el mismo.
  Check 4 ✅.
- ✅ «Un movimiento sin categoría se distingue de uno que la tiene» → borde a rayas y sin
  fondo. Check 5 ✅.
- ✅ «Entiendo `Not counted` y una categoría a la vez» → a medias por comando: sigue
  enseñando la categoría (check 6 ✅) y `Not counted` va bajo el concepto (check 7 ✅). **Si
  se entiende lo dices tú.**
- ✅ «Leo la explicación y sé qué incluyen y qué no» → a medias por comando: texto exacto y
  resto plegado (check 8 ✅). **Si se entiende lo dices tú.**
- ✅ «Mes sin movimientos con la casilla puesta: dice que no tiene movimientos» → check 9
  ✅, y visto en Chromium.
- ✅ «Mes con todo escondido: dice que está escondido, con la forma de enseñarlo» → check
  10 ✅, y visto en Chromium (`Show everything` quita la casilla).
- ✅ (añadido) No se pide nada nuevo al backend → check 11 ✅ (dos lecturas con la casilla,
  una sin ella).
- ✅ (añadido) No cambia cómo se marca ni `Review` → check 12 ✅.

## Decisiones que se tomaron por ti

- (delegado) Tachar y poner en gris el importe, y bajar el concepto a gris claro, en vez de
  apagar toda la línea.
- (delegado) Sin categoría se dice con la forma (borde a rayas), no con un color.
- (delegado) La redacción de la explicación y el título `More about what counts`.
- (añadido) `Transfer` y `Not counted` pasan de etiqueta a texto bajo el concepto.
- (añadido) La frase de los grupos que parecen traspasos va plegada con el resto.
- (añadido) Con filtros puestos y nada que coincida ni sin esconder, la frase es la de los
  filtros, con `Clear filters`.
- (añadido) La frase intermedia mientras no se sabe si el mes está vacío o escondido.
- (añadido) `Hiding 0 movements` desaparece solo en el mes vacío; en un mes con
  movimientos se mantiene.

## Qué NO se tocó / quedó fuera

- `Review` sigue con las etiquetas de categoría en verde.
- `Not counted` en inglés junto a categorías en castellano: fuera, como pediste.
- El punto de color de la izquierda de cada línea no cambia.
- Firefox y WebKit no se han probado; todo lo de navegador es Chromium.

## Notas para el futuro

- La forma de la etiqueta de categoría con el ratón encima (punto 2 de arriba).
- Un lector de pantalla lee el importe tachado sin decir que está tachado; en la misma
  línea lee `Not counted` o `Transfer`, que dicen lo mismo con palabras.
- El último check de la feature 27 compara `store.ts` con un commit anterior y ya no sale
  con 0, porque esta feature le añade 12 líneas. Estaba avisado en `design.md §8`.
- En `docs/roadmap.md` quedan por tachar los cabos sueltos 11, 18, 20 y 22, que esta
  feature resuelve.
