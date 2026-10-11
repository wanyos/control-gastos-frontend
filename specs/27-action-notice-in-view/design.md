# Design — Feature 27: action-notice-in-view

> Cómo se construye lo que pide `requirements.md`. Se apoya en `docs/architecture.md` y
> `docs/conventions.md`: aquí solo van los puntos donde esta feature añade algo o roza lo
> que ya hay.

## 1. Los hechos que ordenan el diseño

1. **La página entera es la que se desplaza** (`window`), no un contenedor interior.
   `AppShell.vue` no pone `overflow` en ningún antepasado de la pantalla, y el `div` raíz
   de cada pantalla (`flex flex-col gap-5` / `gap-6`) mide lo que mide la página. Por eso
   un hijo directo de ese `div` con `position: sticky` se queda pegado durante todo el
   recorrido. **Comprobado en Chromium el 2026-10-11** con un script de un solo uso
   (Playwright, `pnpm dev`, `/api` abortado, ventana 1280×720): con la página bajada
   5.000 px, un elemento de prueba con `position: sticky; top: var(--topbar-h)` queda con
   su borde superior en 60 px en `/review`, `/movements` y `/transfers`.
2. **La barra superior ya está pegada arriba** (`AppTopBar.vue`: `sticky top-0`, 60 px,
   `z-[var(--z-sticky)]` = 100). El aviso se pega justo debajo: `top` = `--topbar-h`.
3. **Los cuatro avisos son copias a propósito** (`docs/architecture.md`: `statement` y
   `transfers` no importan de `review`). Lo que esta feature añade —quedarse pegado— es
   lo mismo en los cuatro y no es vocabulario de ninguna pantalla: va en `src/shared/`.
4. **Un aviso sin nada que decir no pinta nada** (los tres `*ActionNotice` tienen dos
   raíces con `v-if` / `v-else-if`). El bloque que se queda pegado tiene fondo opaco, así
   que **no puede existir vacío**: lo decide la pantalla con un `v-if`.
5. **Al confirmar en `Review` la fila sale de la lista;** al categorizar, en `Review` y
   en `Movements`, la fila se queda. Solo en esos casos hay una fila que el aviso pueda
   tapar (R11).
6. **Leído, no ejecutado:** las etiquetas de día de `StatementList.vue` llevan
   `sticky top-0 z-10` dentro de un `BaseCard` con `overflow-hidden`. No se tocan. El
   bloque nuevo necesita un `z-index` por encima de 10 para no quedar debajo de ellas.

## 2. Archivos

| Archivo | Qué cambia |
|---|---|
| `src/shared/components/StickyBelowTopBar.vue` | **Nuevo.** El bloque que se queda pegado bajo la barra superior (§3) |
| `src/shared/components/__tests__/StickyBelowTopBar.spec.ts` | **Nuevo.** |
| `src/features/review/components/ActionNotice.vue` | Botón `Undo` (§5). Comentario de cabecera |
| `src/features/statement/components/StatementActionNotice.vue` | Ídem |
| `src/features/transfers/components/TransfersActionNotice.vue` | Ídem |
| `src/features/review/components/MovementRow.vue` | `:data-movement-id="movement.id"` en el `<li>` raíz |
| `src/features/statement/components/StatementRow.vue` | Ídem |
| `src/features/review/views/ReviewView.vue` | Envuelve los dos avisos (§4) |
| `src/features/statement/views/StatementView.vue` | Envuelve el aviso (§4) |
| `src/features/transfers/views/TransfersView.vue` | Envuelve el aviso (§4) |
| `src/assets/theme-dark.css` | Solo si falta alguna línea `contrast:` (§5) |
| `e2e/action-notice-in-view.spec.ts` | **Nuevo.** Lo único que puede demostrar «a la vista» |
| `docs/architecture.md`, `docs/stack.md` | Lo que esta feature vuelve falso (§8) |

**No cambian:** `RuleCreatedNotice.vue` (se envuelve desde `ReviewView.vue`), ningún
`store.ts`, `service.ts`, `actions.ts`, `pairs.ts`, `shared/movements.ts`,
`shared/transfers.ts`, `AppShell.vue`, `AppTopBar.vue`, `BaseButton.vue`,
`StatementSelectionBar.vue`, `ReviewActionBar.vue`, ni los cinco archivos de `e2e/` que
ya miran estos avisos.

## 3. `StickyBelowTopBar.vue`

```vue
<template>
  <div
    ref="block"
    class="sticky top-[var(--topbar-h)] z-[var(--z-sticky)] -my-2 bg-surface-app py-2"
    data-test="sticky-below-top-bar"
  >
    <slot />
  </div>
</template>
```

```ts
const props = defineProps<{
  /**
   * CSS selector of the one row the last action touched, or null. If that row is
   * still on the page and ends up under this block, the page moves up just enough.
   */
  keepClearOf?: string | null
}>()
```

- **Clases.** `sticky top-[var(--topbar-h)]`: se pega bajo la barra superior.
  `bg-surface-app`: el fondo de la página, opaco (R9); en reposo no se distingue.
  `py-2` con `-my-2`: da aire a la frase cuando está pegada sin mover nada en reposo
  (R6). `z-[var(--z-sticky)]`: el mismo nivel que la barra superior (100), por encima de
  las etiquetas de día (10) y por debajo de `--z-dropdown` (200) y `--z-modal` (400)
  (R10). No se solapa con la barra superior porque empieza donde ella acaba.
- **Sin estado y sin props de contenido.** Lo que enseña es el slot.
- **R11.** Tras montarse, y cada vez que cambia `keepClearOf`, después de que Vue
  actualice el DOM (`nextTick`) y de un `requestAnimationFrame`:
  1. si `keepClearOf` es nulo o `document.querySelector(keepClearOf)` no encuentra nada,
     no hace nada;
  2. `overlap = block.getBoundingClientRect().bottom - row.getBoundingClientRect().top`;
  3. si `overlap > 0` **y** `row.getBoundingClientRect().bottom > block…top` (la fila
     está de verdad debajo del bloque, no por encima de la ventana), llama a
     `window.scrollBy({ top: -overlap })`.
  Nada más mueve la página. No hay escucha de `scroll`: si el usuario mueve la página
  después, el bloque pasa por encima de las filas igual que la barra superior.
- **Riesgo conocido, sin comprobar.** Al aparecer el aviso con la página bajada, el
  documento crece por encima de la ventana. No se ha medido si Chromium compensa el
  desplazamiento (lo que se llama *scroll anchoring*) antes o después del
  `requestAnimationFrame`. El test de navegador de R11 lo decide; si falla por el
  momento de la medida, el implementer ajusta **cuándo** mide, no **qué** hace, y lo
  dice en su informe.

## 4. Las tres pantallas

**`ReviewView.vue`.** Los dos avisos siguen excluyentes (C5); cambia quién los envuelve:

```vue
<StickyBelowTopBar v-if="hasNotice" :keep-clear-of="touchedRow">
  <RuleCreatedNotice v-if="rules.lastCreated" :rule="rules.lastCreated" @apply="rules.openApply()" />
  <ActionNotice v-else … />
</StickyBelowTopBar>
```

```ts
/** Same three sources the two notices read today; nothing new is stored in the store. */
const hasNotice = computed(
  () => rules.lastCreated !== null || Boolean(store.lastAction?.summary) || Boolean(store.actionMessage),
)
/** `[data-movement-id="<id>"]` of the single row just acted on; null after a bulk action. */
const touchedRow = ref<string | null>(null)
```

`touchedRow` se escribe en `onConfirmOne`, `onCategorizeOne` y `onCreateRule` (antes de
llamar al store) y se pone a `null` en `run` (acciones en bloque). Es estado de la
pantalla, no del store (C1).

**`StatementView.vue`.** `hasNotice` = `Boolean(store.actionNotice) ||
Boolean(store.actionMessage)`. `touchedRow` se escribe en el manejador de `@categorize`
y en `onCreateRule`, y se pone a `null` en `askOrWrite`. El bloque sigue entre
`MonthTotals` y la barra de selección (R6).

**`TransfersView.vue`.** `v-if="store.notice.summary || store.notice.error"`. Sin
`keepClearOf`: desenlazar y enlazar quitan de la lista lo que se tocó.

En las tres, las props y los eventos que recibe cada aviso son **exactamente** los de
hoy (C1, C2).

## 5. El botón `Undo` (R8)

En los tres `*ActionNotice.vue`: `variant="ghost"` pasa a `variant="secondary"`, se
quita `<template #icon>` y el `import { Undo2 }`. Mismo `size="sm"`, mismo `data-test`,
mismo `:disabled="busy"`, mismo texto `Undo`. `secondary` es la variante que ya usa `Select movements` en
`StatementView.vue`, directamente sobre el fondo de la página.

Colores: el `<p>` del aviso sigue en `text-positive` / `text-negative` sobre
`surface-app` (pares ya medidos en `theme-dark.css`, líneas 24 y 25). El botón
`secondary` pinta `text-ink-strong` sobre `surface-card` con borde `line-default`
(`--border-default on --surface-card`, línea 49). No se espera ningún par nuevo; si el
test de `theme-dark.spec.ts` pide alguno, se añade su línea.

`Undo2` deja de usarse en `src/` (solo lo importaban estos tres archivos, comprobado
con `grep -rl Undo2 src`): sale del bundle.

## 6. Errores y excepciones

Ninguno nuevo. No hay camino de fallo propio: si el selector no encuentra la fila, R11
no hace nada.

## 7. Cómo se prueba

- **Vitest (jsdom) no sabe de posiciones.** Sirve para: el slot y las clases del bloque
  nuevo, R11 con `getBoundingClientRect` y `window.scrollBy` sustituidos, R8, R12 y que
  cada pantalla envuelve su aviso sin cambiarle props.
- **«A la vista» solo se demuestra en un navegador:** `e2e/action-notice-in-view.spec.ts`,
  con sus propias respuestas imitadas y la misma red de seguridad que el resto de
  `e2e/` (`**/api/**` abortado antes de declarar las rutas esperadas). Una función
  `expectInView(page, locator)` afirma las tres cosas de la definición de
  `requirements.md`: rectángulo entero dentro de la ventana, borde superior ≥ borde
  inferior de la barra superior, y `document.elementFromPoint` en su centro dentro del
  aviso. **`toBeInViewport` solo no vale:** da por visto un elemento que está detrás de
  la barra superior.
- Para que la página tenga recorrido basta una lista larga (≥ 60 filas) o una ventana
  baja; el spec elige y lo comenta.

## 8. Documentos que quedan falsos

- `docs/architecture.md`: la lista de `shared/components/` (falta el archivo nuevo) y
  el párrafo que dice que el aviso con `Undo` está copiado: sigue copiado, pero lo de
  quedarse pegado es común.
- `docs/stack.md`: «los once specs de `e2e/`» pasan a doce; y en *Iconos (Lucide)* una
  línea de la feature #27: `Undo2` deja de usarse.

No se toca `docs/guia-de-uso.md`: es del humano y sus pasos siguen siendo ciertos (la
línea verde con `Undo` sigue existiendo).

## 9. Alternativas descartadas

1. **El aviso junto a la fila tocada.** Al confirmar en `Review` la fila sale de la
   lista, y al desenlazar en `Transfers` la pareja también: no hay fila junto a la que
   ponerlo. Además obligaría a que cada fila supiera del aviso.
2. **Pegado al borde inferior de la ventana** (`position: fixed; bottom: 0`). Taparía
   las últimas filas de la lista, que es justo donde el humano hace la prueba; habría
   que reservar hueco al final de la página y sacar el aviso del sitio que ocupa hoy
   (contra R6).
3. **Subir la página hasta el aviso tras cada acción.** Se vería, pero mueve al usuario
   de donde está: lo contrario de lo pedido.
4. **Un solo aviso compartido que sustituya a los cuatro.** Toca tres pantallas y sus
   tests para unificar props que hoy difieren (`undoable`, el botón de la regla), y
   deshace una decisión de `docs/architecture.md` sin que haga falta: lo común es
   quedarse pegado, no el contenido.
5. **Meter el aviso dentro de la barra superior** (con `Teleport`). Nunca taparía una
   fila, pero la barra mide 60 px fijos y una frase de fallo larga no cabe; y haría que
   `AppTopBar` supiera de tres pantallas.
6. **Cambiar el icono de `Undo` por otro.** El actual ya es el icono de deshacer del
   juego de iconos y aun así se leyó como recargar; con la palabra `Undo` y un borde no
   hay icono que interpretar.
