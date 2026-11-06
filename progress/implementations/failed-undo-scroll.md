# Cabo suelto 47 — un `Undo` que falla en `Movements` devuelve la página arriba

No es una feature de `feature_list.json`: sin spec, sin `checks`. Pedido por el humano el
2026-11-06. No he escrito en la base de datos ni en carpetas de datos del humano: todo
con `page.route` y con el `mockApi` de los unitarios, datos inventados.

## Lo que hay que mirar primero: una diferencia visible

Para que la página no se mueva, la lista **no puede desaparecer** mientras se vuelve a
pedir el mes tras el fallo. Así que, en esa recarga en concreto (y solo en esa), ya no
salen durante la petición la línea `Loading <mes>…` ni la pantalla sin lista: se ve la
lista de antes hasta que llega la respuesta, y entonces se cambia. Es lo mismo que causaba
el salto, así que no lo he podido separar del arreglo. Lo que queda al final (filas, cifras,
frase del fallo, `Undo` quitado, selección vaciada, filas de `Load more` quitadas) es
lo mismo que antes. Si el humano quiere que esa línea siga saliendo, el arreglo tiene que
ser otro.

## 1. Reproducción, antes de tocar nada (Chromium, `page.route`)

La prueba nueva de la categoría, con `src/` sin tocar:
`npx playwright test e2e/action-notice-in-view.spec.ts -g "an Undo that fails in Movements" --project=chromium --repeat-each=3`
→ **3 failed**. `scrollY` antes del `Undo` 2611 / 2046 / 2046 → después **0 / 0 / 0**. La
línea pasa a estar a 2706 px de la parte de arriba de la ventana (fuera de la pantalla).

## 2. Causa, comprobada

Puse en la página un registro de cada evento `scroll` y de cada cambio del DOM (con
`MutationObserver`) desde que se pulsa `Undo`, apuntando `scrollY`, el alto de la página,
las filas pintadas y si está la línea de carga. Salida con `src/` sin tocar:

```
dom:0|720|0|loading ; scroll:0|720|0|loading ; dom:0|5014|66|- ; dom:0|5053|66|-
```

Es decir: en el primer cambio tras el 409 hay **0 filas**, sale la línea de carga y la
página mide **720 px** (una ventana); el navegador baja `scrollY` a 0. Cuando vuelven las
66 filas (5014 px) la página sigue en 0.

Por qué: un 409 no es un 400, así que `needsReload` (`src/shared/movements.ts`) da `true`
(la escritura pudo quedar hecha) y `write` / `applyExclusion` de
`src/features/statement/store.ts` llamaban a `show(...)`. `show` pone `isLoading` a
`true`, y `StatementView.vue` pinta la lista con `v-if="store.result && !store.isLoading"`:
la lista se quita mientras viaja la petición. `refreshQuietly` no lo hace (no toca
`isLoading`), pero no sirve tal cual: si la petición del mes falla, se calla, y tras una
escritura dudosa eso dejaría en pantalla datos que pueden ser falsos. `Review` no salta
porque su `reportFailure` recarga con su `refreshQuietly`, que no quita la lista.

La recarga se queda: es la que dice qué se escribió de verdad.

## Archivos modificados / creados

- `src/features/statement/store.ts` — `show` pasa a llamar a una función interna
  `load(..., keepListOnScreen, client)`. Nueva `reloadAfterFailedWrite(client)` =
  `load` del mes en pantalla con `keepListOnScreen = true`: no pone `isLoading`, y vacía las
  filas de `Load more`, `page` y `totalWithoutHiding` **al llegar la respuesta** (o el
  fallo) en vez de al empezar. El `Undo`, la frase y la selección se olvidan al empezar,
  como antes. Si la petición del mes falla: `result = null` y `error`, como `show`. Las dos
  llamadas tras fallo (`write` y `applyExclusion`) usan ahora `reloadAfterFailedWrite`.
  No se exporta: nadie de fuera la necesita.
- `src/features/statement/__tests__/store.spec.ts` — 3 tests nuevos y la constante
  `CONFLICT_BODY` (409 inventado).
- `e2e/action-notice-in-view.spec.ts` — 2 pruebas de navegador nuevas al final, con
  `CONFLICT`, `rejectUndoSlowly` y `watchLowestScroll`. Ninguna existente tocada.
- `docs/architecture.md` — un párrafo tras «Lo que el extracto escribe, y nada más».

## Decisiones tomadas

- También arreglo el `Undo` de un «excluir de los totales» que falla: pasa por la misma
  recarga (`applyExclusion`) y saltaba igual (medido abajo). Es un `Undo` de `Movements`.
- Las filas de `Load more` se siguen quitando tras el fallo, como hacía `show`. Si el
  usuario estaba en esas filas, la página sigue acortándose (ver sugerencias).
- Las pruebas de navegador apuntan el `scrollY` **más bajo** alcanzado durante el `Undo`,
  no solo el final: en Firefox y WebKit, sin el arreglo, el aviso, al pintarse otra vez,
  bajaba la página desde arriba hasta la línea, y a veces la posición final parecía buena.
  En la primera versión de la prueba (solo la posición final), sin el arreglo, la de
  categoría pasó en Firefox y WebKit.

## Pruebas nuevas

Navegador (`e2e/action-notice-in-view.spec.ts`):
- `an Undo of a category that fails in Movements leaves the page where it was`: la línea
  medio tapada por el aviso; el `Undo` contesta 409 a los 300 ms. Comprueba la frase de
  fallo, las 66 filas, que la línea sigue en `Groceries`, que la línea queda justo debajo del
  aviso (a menos de 1 px, como en `Review`), que el `scrollY` más bajo no baja más de 60 px
  del de antes y que solo viajaron los dos `PATCH`.
- `an Undo of an exclusion that fails in Movements leaves the page where it was`: la línea
  excluida a 300 px bajo la barra; el `Undo` (`PATCH /api/movements`) contesta 409.
  Comprueba la frase, que sigue `Not counted`, el `scrollY` más bajo, que la línea no se
  mueve en pantalla (< 1 px) y que está a la vista.

Unitarios (`store.spec.ts`):
- `the reload after a failed write keeps the list on screen until the answer arrives`
  (con `Load more`: 3 filas en pantalla durante la petición, 2 y `page` 1 al llegar).
- `a reload after a failed write that fails too paints the failure of the month`.
- `the reload after a failed batch keeps the list on screen until the answer arrives (roadmap, loose end 47)`.

### Fallan sin el arreglo (`git stash` de `src/features/statement/store.ts`, y vuelta)

- ~~`npx playwright test e2e/action-notice-in-view.spec.ts -g "fails in Movements leaves"` →
  **6 failed** (las dos en los tres navegadores).~~ **Corregido en la segunda vuelta (abajo):**
  esa cifra salió de una sola pasada; en la del reviewer salió 4 failed, 2 passed (la de
  categoría pasó en Firefox y WebKit), porque la prueba solo miraba eventos `scroll`. Por ejemplo: exclusión, `scrollY` más bajo
  `0` (esperado `> 2322`); categoría en Chromium, el aviso no queda pegado a la barra
  (457,5 px).
- `npx vitest run src/features/statement/__tests__/store.spec.ts` → **2 failed | 87
  passed**: los dos de «keeps the list on screen». El tercero (la recarga que falla también)
  pasa en los dos: protege lo que ya se hacía.

### Pasan con el arreglo

- `npx playwright test e2e/action-notice-in-view.spec.ts -g "fails in Movements leaves" --repeat-each=3`
  → **18 passed**.
- Medido en una pasada de los tres navegadores con 2 repeticiones (`console.log` temporal,
  ya quitado; la salida no dice qué navegador es cada línea, así que no lo atribuyo):
  categoría, `scrollY` 2630 → 2611 con la línea a 0,70 px bajo el aviso (4 líneas iguales)
  y 2631 → 2612,57 con 0,33 px (2 líneas); exclusión, 2382 → 2369 con la línea movida
  0,44 px en pantalla (4 líneas) y 2383 → 2369,57 con 0 px (2 líneas). La página sube lo
  que el aviso encoge, nada más.
- El `Undo` que sale bien sigue igual: `Undo in Movements, from a row partly behind the
  notice, moves the page only as much as the shorter notice needs` y `Undo pressed from the
  bottom of the list puts the row back` pasan sin tocarlas en los tres navegadores (en la
  pasada completa de abajo). No usan la recarga cambiada.

## Documentos actualizados

`git grep -n -i "needsReload\|recarga el mes\|reload the month\|reloads the month\|vuelve arriba\|show(month" -- . ':!progress' ':!specs'`
y `git grep -n -i "recarg\|reload\|refreshQuietly\|isLoading\|statement-loading\|Loading" -- docs ':!docs/roadmap.md'`:
ninguna línea de `docs/` describía la recarga tras un fallo en `Movements`, así que ninguna
se ha vuelto falsa. He añadido el párrafo de `docs/architecture.md` (decisión con su porqué).
`docs/roadmap.md` no lo he tocado.

Encontrada por el camino, **ya falsa antes de este cambio** y no corregida (es la guía del
humano, con sus notas): `docs/guia-de-uso.md:859-861` dice que si una escritura falla por un
corte de red `Movements` dice `Couldn't reach the server. Nothing changed.` sin comprobarlo.
Desde el 2026-10-16 dice `Couldn't reach the server. Reloading, to be sure of what was
written.` y vuelve a pedir el mes (`writeErrorMessage` en `src/features/statement/actions.ts`
y el test `a network failure reloads the month…` de `store.spec.ts`).

## Prueba real

No aplica: no lee datos nuevos de fuera. No he probado con el backend real (no lo he
arrancado); todo es con `page.route`.

## Último `npx playwright test` (tres navegadores)

`npx playwright test --reporter=line` → exit 0, **279 passed (2.5m)**.

## Último ./init.sh

`./init.sh` → exit 0: `Type check OK`, `OK: pnpm lint:oxlint:check`, `OK: pnpm format:check`,
`Test Files 133 passed (133)`, `Tests 2154 passed | 1 expected fail (2155)`,
`OK: pnpm type-check (vue-tsc --build, incluye los .vue)`, `E2E smoke verde (chromium)`,
`Entorno listo`.

## Sugerencias fuera de scope (NO aplicadas)

- Tras un fallo, las filas que trajo `Load more` se siguen quitando (como antes). Con un mes
  de más de 200 movimientos y el usuario en esas filas, la página se acortaría. Se podría
  mantenerlas, como hace `refreshQuietly`; cambiaría lo que se ve.
- `docs/guia-de-uso.md:859-861`, la frase ya falsa de arriba.

## Segunda vuelta (2026-11-06) — cambios pedidos en `progress/reviews/failed-undo-scroll.md`

### 1. `Load more` durante la recarga tras un fallo

`src/features/statement/store.ts`: una variable interna `isReloadingAfterFailure`, `true`
mientras viaja `reloadAfterFailedWrite` (se pone en `load` y se baja en su `finally` si esa
petición sigue siendo la última). `loadMore` no hace nada mientras está a `true`. El botón
sigue pintado y no se apaga; pulsarlo en ese momento no pide nada. No es reactiva: no la
lee ninguna vista.

Test nuevo en `store.spec.ts`: `Load more does nothing while the month is asked for again
after a failed write`. Mes inventado de 3 páginas, página 2 ya en pantalla, `categorize`
contesta 409, `loadMore()` durante la recarga, la recarga contesta antes que la página 3.
Comprueba que no se pide la página 3, `page` 1, 2 filas, `hasMore` `true`,
`isLoadingMore` `false`, y que después `Load more` vuelve a traer la página 2.

- Con el arreglo de la primera vuelta (solo quitada la línea `if (isReloadingAfterFailure)
  return`, y vuelta a poner): `npx vitest run src/features/statement/__tests__/store.spec.ts`
  → **1 failed | 89 passed**, el nuevo: `expected [ Array(1) ] to have a length of +0 but got 1`
  (se pidió la página 3).
- Con `store.ts` de HEAD (`git stash`): el nuevo **pasa** (allí `isLoading` ya lo impedía);
  fallan los dos de «keeps the list on screen» → 2 failed | 88 passed.
- Con el arreglo completo: **90 passed**.

### 2. La prueba de navegador mide en cada fotograma

`watchLowestScroll` apunta ahora el `scrollY` más bajo en cada fotograma
(`requestAnimationFrame`), en cada evento `scroll` y en cada cambio de la página
(`MutationObserver`). En la prueba de categoría esa comprobación va ahora **antes** de
`expectRowClearOfNotice`: en la primera pasada de esta vuelta, sin el arreglo, la de
categoría fallaba antes de llegar a ella (en `expectStuckUnderTopBar`, el aviso a 457,5 px
porque la página seguía arriba), y así no se veía qué la hacía fallar.

Sin el arreglo (`git stash` de `src/features/statement/store.ts`, y vuelta):
`npx playwright test e2e/action-notice-in-view.spec.ts -g "fails in Movements leaves" --repeat-each=5`
→ **30 failed** (las dos pruebas × 3 navegadores × 5). Las 30 fallan en
`expect(await lowestScroll()).toBeGreaterThan(before - 60)` con **Received: 0**: 5 de
categoría y 5 de exclusión en cada uno de Chromium, Firefox y WebKit.

Con el arreglo, el mismo comando → **30 passed (26.4s)**.

### Documentos

`docs/architecture.md`: añadida al párrafo del cabo 47 la frase de que `Load more` no pide
nada mientras dura esa recarga.

### Último `npx playwright test` (tres navegadores)

`npx playwright test --reporter=line` → exit 0, **279 passed (2.4m)**.

### Último ./init.sh

`./init.sh` → exit 0: `Type check OK`, `OK: pnpm lint:oxlint:check`, `OK: pnpm format:check`,
`Test Files 133 passed (133)`, `Tests 2155 passed | 1 expected fail (2156)`,
`OK: pnpm type-check (vue-tsc --build, incluye los .vue)`, `E2E smoke verde (chromium)`,
`Entorno listo`.

### Visto por el camino, sin comprobar

Si una escritura falla mientras viaja un `Load more` que empezó antes, la recarga sube
`loadRun` y el `finally` de `loadMore` ya no baja `isLoadingMore`; parece que se quedaría
en `true` y `Load more` dejaría de funcionar hasta cambiar de mes. Pasaba igual con `show`
antes de este arreglo. **No lo he comprobado**: haría falta un test con un `Load more`
pendiente, una escritura que falle y la recarga contestando antes.
