# Cabo 41 — `e2e/category-rules.spec.ts:779` falla a veces — implementación

No es una feature de `feature_list.json`. Solo cambia la prueba. No se ha tocado código de la
aplicación, ni `docs/roadmap.md`, ni se ha hecho commit.

## Archivos modificados / creados

- `e2e/category-rules.spec.ts`: solo la función auxiliar `settledLookOfLastApply` y su
  comentario. Al alargarse la función, la prueba ha pasado de la línea **779 a la 793**.
- Este informe.

Archivos temporales, fuera del repositorio (carpeta temporal de la sesión): una configuración de
Playwright con `reducedMotion: 'reduce'` (`pw.reduced.config.ts`) y una copia de la prueba
original, que usé para devolverla a su estado tras el registro temporal (ver abajo).

## Causa, comprobada

Antes, `settledLookOfLastApply` quitaba el puntero (`page.mouse.move(0, 0)`) y daba el bloque
por quieto en cuanto **dos lecturas seguidas** salían iguales. La primera repetición de
`expect.poll` se lanza enseguida, así que las dos lecturas pueden caer en el mismo fotograma del
navegador. En ese caso salen iguales aunque el botón recién pulsado siga cambiando de color: lo
pierde el hover y los botones tienen `transition-colors` (`src/shared/components/BaseButton.vue`).
La prueba guardaba el color a medio camino.

Cómo lo comprobé:

1. **Línea base**, prueba sin tocar:
   `pnpm exec playwright test e2e/category-rules.spec.ts:779 --project=chromium --repeat-each=30 --reporter=line`
   → **8 fallos de 30**, todos en la línea 812 y todos en `background`
   (`rgb(21, 28, 35)` y `rgb(24, 31, 39)` frente a `rgb(20, 27, 34)`).

2. **Con las transiciones desactivadas**, sin tocar la prueba: una configuración temporal que
   importa `playwright.config.ts` y añade `use.reducedMotion: 'reduce'`. Con esa opción la
   aplicación pone todas las transiciones a 0.01 ms (`src/assets/styles/tokens/base.css:60`).
   `pnpm exec playwright test -c <temporal>/pw.reduced.config.ts category-rules.spec.ts:779 --project=chromium --repeat-each=60`
   → **24 fallos de 60**. No dejó de fallar: falló más. Además la diferencia pasó a ser el
   color de hover entero: en `openOnRules` era `showMovements` el que tenía
   `rgb(56, 67, 79)` (fondo en hover) y en Review lo tenía `showConflicts`, o al revés. La
   hipótesis del reviewer (que la culpa es de la duración de la transición) **no se cumple**.
   Lo que falla es el momento en que se lee: aunque la transición sea casi instantánea, se puede
   leer antes de que el navegador haya aplicado el cambio de hover.

3. **Registro temporal** dentro de `settledLookOfLastApply` (ya quitado: la prueba se devolvió a
   la copia original antes de aplicar el arreglo). Justo después de `mouse.move(0, 0)` hacía 8
   lecturas seguidas del botón `last-apply-show-conflicts`, cada una con `performance.now()`,
   `matches(':hover')`, `block.getAnimations({ subtree: true }).length` y `backgroundColor`.
   En modo normal hubo pasadas con
   `2524.7 hover=false anim=1 bg=rgb(21, 28, 35) | 2529.3 hover=false anim=1 bg=rgb(21, 28, 35) | 2534.4 hover=false anim=0 bg=rgb(20, 27, 34)`:
   dos lecturas iguales, separadas por 5 ms y con una transición todavía en marcha, con justo
   el valor que sale en los fallos. Esas dos lecturas bastaban para que la versión anterior diera
   el bloque por quieto.

4. **Con el arreglo, se repite el experimento 2** (transiciones desactivadas):
   `... -c <temporal>/pw.reduced.config.ts category-rules.spec.ts:793 --project=chromium --repeat-each=60`
   → **60 passed** (antes, 24 fallos).

## El arreglo

Solo en la prueba. Antes de las dos lecturas, `settledLookOfLastApply` espera (con `expect.poll`)
a que se cumplan las dos cosas dentro del bloque `last-apply`:

- ningún elemento está bajo el puntero: `block.querySelector(':hover') === null`;
- no queda ninguna transición en marcha: `block.getAnimations({ subtree: true }).length === 0`.
  `getAnimations` obliga al navegador a aplicar antes los cambios de estilo pendientes, así que
  una transición recién creada también cuenta.

Después sigue haciendo lo de antes: dos lecturas seguidas tienen que coincidir.

Qué sigue comprobando la prueba: las comparaciones no se han tocado.
`expect(await settledLookOfLastApply(page)).toEqual(foldedOnRules)` y `.toEqual(openOnRules)`
siguen comparando las palabras, las medidas y la pintura (color, fondo, borde, radio, relleno,
fuente) del bloque y de sus partes entre Rules y Review. Lo único que cambia es que se lee el
bloque cuando ya está quieto. No hay reintentos, no se ha quitado ningún campo de la comparación
y no se ha desactivado ninguna transición en la prueba. No he hecho una prueba de mutación (meter
una diferencia real entre las dos pantallas y ver que la prueba falla): las aserciones son las
mismas de antes.

## Demostración de que está arreglada

- `pnpm exec playwright test e2e/category-rules.spec.ts:793 --project=chromium --repeat-each=60 --reporter=line`,
  lanzado dos veces seguidas → `60 passed (41.9s)` y `60 passed (41.8s)`: **0 fallos en 120**
  (antes, 8 de 30).
- Con las transiciones desactivadas → `60 passed` (antes, 24 de 60).

## Documentos actualizados

`git grep -n "779" -- ':!progress' ':!specs'`:

- `docs/roadmap.md:488` y `:491` — no los he tocado, porque lo pediste. El cabo 41 nombra
  `:779`, que ahora es `:793`.
- `docs/stack.md:851-860` — **no corregido, queda pendiente**: dice «El e2e de chromium falla
  a veces, sin causa comprobada (cabo 41…)» y nombra `category-rules.spec.ts:779`. La causa de
  `:779` ya está comprobada y arreglada. El mismo párrafo habla también del fallo de
  `action-notice-in-view.spec.ts:992`, que sigue sin explicar, así que hay que reescribirlo con
  cuidado. Lo dejo para quien actualice el cabo 41.

`progress/current.md` tampoco lo he tocado: tenía cambios tuyos sin guardar.

## Prueba real

No aplica: el cambio no lee datos de fuera.

## Último ./init.sh

`./init.sh` → **exit 0**. Lint y formato OK (`oxlint`, `prettier --check`), vitest
`132 passed (132)` / `2139 passed (2139)`, `pnpm type-check` OK y
`E2E smoke verde (chromium)`. Cierra con «Entorno listo».

## Sugerencias fuera de scope (NO aplicadas)

- Si otras pruebas leen colores justo después de quitar el puntero con la misma técnica de «dos
  lecturas iguales», tienen el mismo riesgo. No lo he buscado.
