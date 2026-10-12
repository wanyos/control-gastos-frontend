# Design — F29 `statement-readable`

Todo ocurre en `src/features/statement/`, más una línea en `src/assets/theme-dark.css`.
No hay archivos nuevos de código ni componentes nuevos. No se toca el backend ni el
contrato.

## 1. Archivos que se modifican

| Archivo | Qué cambia | R |
|---|---|---|
| `src/features/statement/components/StatementRow.vue` | Importe y concepto de lo que no cuenta; `Transfer` y `Not counted` pasan al segundo renglón; etiqueta de categoría siempre neutra; `Uncategorized` con borde discontinuo | R1–R7 |
| `src/features/statement/components/MonthTotals.vue` | La explicación: una frase a la vista y un `<details>` con el resto | R8–R11 |
| `src/features/statement/store.ts` | Guarda también el `pagination.total` de la lectura sin esconder (`totalWithoutHiding`) | R12–R15 |
| `src/features/statement/filters.ts` | Función nueva `nothingShownLine` | R14 |
| `src/features/statement/components/StatementList.vue` | Cuarto valor de `emptyState`: `'unknown'` | R14 |
| `src/features/statement/views/StatementView.vue` | `emptyState` decide con `totalWithoutHiding`; no pasa la cuenta de escondidos a `NoiseSwitch` cuando el mes no tiene nada | R12–R15 |
| `src/assets/theme-dark.css` | Dos líneas `contrast:` nuevas (solo comentario; ningún valor cambia) | C2 |
| Tests de `src/features/statement/__tests__/` y `e2e/` | Los nuevos y los que la feature vuelve falsos (ver `tasks.md`) | — |
| `docs/guia-de-uso.md` | Los pasos que describen lo que cambia | — |

**No se tocan:** `NoiseSwitch.vue` (sigue sin pintar nada con `hiddenCount: null`),
`RowCategoryEditor.vue`, `service.ts`, `actions.ts`, `months.ts`,
`src/shared/components/BaseBadge.vue`, `src/features/review/**`.

## 2. `StatementRow.vue`

Un computed nuevo, y solo uno, decide lo que no cuenta:

```ts
/** Left out of the month's figures: marked by the user, or one of a paired transfer. */
const isLeftOut = computed(
  () => props.movement.excludedFromTotals || props.movement.transferId !== null,
)
```

- **Importe (R1, R3).** `amountClass` devuelve `'text-ink-faint line-through'` si
  `isLeftOut`; si no, lo de hoy (`text-positive` / `text-ink-strong` /
  `text-ink-muted`). Clases literales completas (Tailwind lee el fuente como texto).
- **Concepto (R2).** El `<p data-test="statement-row-description">` deja de llevar
  `text-ink-strong` fijo: `isLeftOut ? 'text-ink-muted' : 'text-ink-strong'`.
- **`Transfer` y `Not counted` (R5).** Los dos `BaseBadge` de hoy desaparecen. En el
  `<p>` del segundo renglón, después de `statement-row-account`, van dos `<span>` con
  `class="font-semibold"`, los mismos `v-if`, `data-test`, `title` y `aria-label` de hoy
  y el mismo texto. El `<p>` ya es `flex flex-wrap gap-x-2 text-xs text-ink-muted`, así
  que heredan el color y la separación.
- **Etiqueta de categoría (R6).** En el botón, `:tone="movement.category ? 'brand' :
  'neutral'"` se sustituye por lo de abajo; en la rama `v-else` ya era neutra.
- **`Uncategorized` (R7).** `BaseBadge` no admite una variante sin fondo y es
  compartido con `Review`, así que **no se toca**: cuando `movement.category` es `null`
  la fila pinta un `<span>` propio en vez del `BaseBadge`, con las medidas del
  `size="sm"`:
  `inline-flex items-center whitespace-nowrap rounded-pill border border-dashed border-line-default px-[7px] py-[2px] text-2xs leading-[1.4] font-semibold text-ink-muted`
  y el mismo `data-test="statement-row-category"`. Vale para las dos ramas (botón y no
  botón). Para no escribir el par dos veces, la etiqueta se saca a un bloque del propio
  template (por ejemplo un `<template>` reutilizado con `v-if`/`v-else` dentro del
  botón y del `v-else`); **no** se crea un componente nuevo.
- **El punto de color de la izquierda no cambia** (`dotClass`): un color por categoría,
  gris si no tiene.
- **No cambia:** `data-test="statement-row"`, `:data-movement-id` (C4), la casilla del
  modo de selección, el editor, los `emit`.

El comentario de `amountClass` que dice «No coloured background, no strikethrough…»
queda falso: se reescribe en una línea.

## 3. `MonthTotals.vue`

`FIGURES_NOTE` (una cadena de tres frases) se sustituye por:

```ts
const FIGURES_LINE =
  'These figures leave out the movements labelled "Transfer" or "Not counted".'
const MORE_SUMMARY = 'More about what counts'
const MORE_LINES = [/* las cinco frases de R10, en orden */] as const
```

Estructura (el `data-test="statement-totals-note"` sigue siendo el contenedor de todo,
para que los tests que solo comprueban que existe sigan valiendo):

```html
<div class="flex items-start gap-2 text-xs text-ink-muted" data-test="statement-totals-note">
  <Info … />
  <div class="flex flex-col gap-1">
    <p data-test="statement-totals-line">{{ FIGURES_LINE }}</p>
    <details data-test="statement-totals-more">
      <summary class="cursor-pointer …">{{ MORE_SUMMARY }}</summary>
      <ul class="mt-1 flex list-disc flex-col gap-1 pl-4">
        <li v-for="line in MORE_LINES" :key="line">{{ line }}</li>
        <li v-if="ambiguousGroups !== null && ambiguousGroups > 0"
            data-test="statement-ambiguous-note">{{ ambiguousNote(ambiguousGroups) }}</li>
      </ul>
    </details>
  </div>
</div>
```

- `<details>` nativo: se abre con ratón y teclado sin estado propio ni JavaScript, y no
  guarda nada entre visitas (aparece cerrado cada vez).
- `ambiguousNote` no cambia de texto ni de condición (R11).
- Colores: todo sigue en `text-ink-muted` sobre `--surface-card`, par ya medido.
- El `<summary>` necesita foco visible:
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`,
  como el botón de la etiqueta de categoría.

## 4. Colores y contraste (C2)

Ningún valor de `theme-dark.css` cambia. Pares que usa la feature, medidos con la
fórmula WCAG del propio `theme-dark.spec.ts` sobre los valores de
`src/assets/styles/tokens/colors.css` (`node -e` con los hex; resultado entre
paréntesis):

| Qué | Par | Mínimo | Línea `contrast:` |
|---|---|---|---|
| Importe de lo que no cuenta | `--ink-faint` on `--surface-card` (7,02) | 4.5 | ya existe |
| Importe de lo que no cuenta, fila con el ratón encima | `--ink-faint` on `--surface-sunken` (7,68) | 4.5 | **nueva** (hoy está a `>= 3`, para el punto) |
| Concepto de lo que no cuenta, `Transfer`, `Not counted`, texto de `Uncategorized` | `--ink-muted` on `--surface-card` (11,70) y on `--surface-sunken` (12,80) | 4.5 | ya existen |
| Borde discontinuo de `Uncategorized` | `--border-default` on `--surface-card` (7,02) | 3 | ya existe |
| Borde discontinuo, fila con el ratón encima | `--border-default` on `--surface-sunken` (7,68) | 3 | **nueva** |
| Etiqueta de categoría | `--ink-body` on `--surface-sunken` | 4.5 | ya existe (neutral badge) |
| Importe de una entrada que cuenta | `--positive` on `--surface-card` y on `--surface-sunken` | 4.5 | ya existen |

Las dos líneas nuevas, en el bloque «Cards» de la cabecera de `theme-dark.css`:

```
contrast: --ink-faint on --surface-sunken >= 4.5 (statement: amount of a movement left out of the figures, hovered row)
contrast: --border-default on --surface-sunken >= 3 (statement: dashed edge of the Uncategorized label, hovered row)
```

La línea existente `--ink-faint on --surface-sunken >= 3 (uncategorized dot…)` se queda:
el test admite el mismo par dos veces con mínimos distintos.

Diferencia entre los dos importes que el humano no distinguía: hoy `rgb(205,213,221)`
frente a `rgb(247,249,251)`; pasa a `rgb(155,166,178)` **y tachado** frente a
`rgb(247,249,251)` sin tachar.

## 5. Un mes en el que la lista sale vacía con la casilla puesta

### Cómo lo distingue hoy

`StatementView.vue` calcula `emptyState` así: si `store.hideNoise` es `true`, siempre
`'nothingLeft'`. No mira nada más, y por eso un mes vacío dice «everything in this month
is hidden».

### El dato ya existe

Con la casilla puesta, `store.show()` hace dos peticiones: el mes
(`monthQuery(..., hideNoise = true)`) y, después, `loadHiddenCount`, que pide
`hiddenCountQuery` (mismo mes y filtros, **sin** esconder, `pageSize: 1`). De esa
segunda respuesta hoy solo se guarda `all.pagination.total - result.pagination.total`
en `hiddenCount`. El `all.pagination.total` es exactamente «cuántos movimientos tiene el
mes sin esconder nada». **No hace falta ninguna petición nueva** (C1).

### Cambios

`store.ts`:

```ts
/**
 * How many movements the month (with its filters) has when nothing is hidden: the
 * `pagination.total` of the read `loadHiddenCount` already makes. Null while the
 * checkbox is off, while that read has not answered, and after it failed.
 */
const totalWithoutHiding = ref<number | null>(null)
```

- `show()`: se pone a `null` donde hoy se pone `hiddenCount.value = null`.
- `loadHiddenCount()`: se escribe junto a `hiddenCount` en sus tres salidas (casilla sin
  poner → `null`; éxito → `all.pagination.total`; fallo → `null`), bajo el mismo
  `run !== loadRun`.
- Se exporta en el `return` del store. Nada más cambia en el store.

`filters.ts`:

```ts
/** Nothing on screen with the checkbox on, and no way yet to know why (R14). */
export function nothingShownLine(month: MonthKey): string
// → `Nothing to show in October 2026 while "Hide what does not count" is ticked.`
```

`StatementView.vue`:

```ts
const emptyState = computed<'month' | 'noMatches' | 'nothingLeft' | 'unknown'>(() => {
  const withoutCheckbox = hasActiveFilters(store.filters) ? 'noMatches' : 'month'
  if (!store.hideNoise) return withoutCheckbox
  if (store.totalWithoutHiding === null) return 'unknown'
  return store.totalWithoutHiding === 0 ? withoutCheckbox : 'nothingLeft'
})
```

y a `NoiseSwitch` le pasa
`:hidden-count="store.totalWithoutHiding === 0 ? null : store.hiddenCount"` (R15).

`StatementList.vue`: `emptyState` admite `'unknown'`; con él pinta
`data-test="statement-nothing-shown"`, la frase `nothingShownLine(month)` y el mismo
botón `Show everything` que `'nothingLeft'`. `isFiltered` y el resto, igual.

### Consecuencia que se acepta

La respuesta del mes llega antes que la lectura sin esconder. En un mes vacío con la
casilla puesta se pinta primero el bloque de R14 y, cuando llega la segunda respuesta,
el de R12 o R13. Es un cambio de frase visible durante lo que tarde esa petición.

## 6. Alternativas descartadas

- **Bajar la opacidad de toda la línea que no cuenta.** Un color con opacidad no es un
  alias del tema; habría que declarar cada tinta «al N %» sobre dos fondos, y la
  categoría, que el humano quiere seguir leyendo, perdería tinta también.
- **Añadir una variante sin fondo a `BaseBadge`.** Es compartido con `Review` y otras
  pantallas; un `<span>` local en la fila deja `Review` intacto (C3).
- **Esperar a la lectura sin esconder antes de quitar el `Loading…`.** Evitaría el
  cambio de frase de §5, pero ata la aparición de la lista a una segunda petición en
  todos los meses con la casilla puesta, que es lo que la feature 23 evitó a propósito
  («after the month, never instead of it»).
- **Una petición más (`excluded=only` / `transfer=only`) para saber qué hay escondido.**
  Innecesaria: el total sin esconder ya viaja.
- **Guardar si el `<details>` estaba abierto.** No pedido; nada se guarda en el
  navegador en esta pantalla.

## 7. Errores y excepciones

Ninguna nueva. El fallo de la lectura sin esconder sigue sin pintar error (como en la
feature 23): solo deja `totalWithoutHiding` y `hiddenCount` a `null`, y entonces aplica
R14.

## 8. Nota para el reviewer

Un `check` de la feature 27 compara `src/features/statement/store.ts` con el commit
`8f0dce6`. Esta feature cambia ese archivo a propósito (§5); ese `check` pertenece a una
feature ya cerrada.
