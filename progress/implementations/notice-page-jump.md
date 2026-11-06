# Cabo suelto 30 (restos de la F27): la página se movía antes de que cambiara el aviso — implementación

Nada de lo ejecutado ha escrito en la base de datos ni en las carpetas de datos del
humano: todas las pruebas usan las respuestas imitadas de `e2e/` y de los tests unitarios.

## 1. Reproducido antes de tocar nada (Chromium, 2026-11-04)

Con una prueba temporal añadida al final de `e2e/action-notice-in-view.spec.ts` (ya
retirada), que reutiliza sus funciones de rutas y de medida, y que además registra cada
llamada a `window.scrollBy({ top })` del componente con el texto del aviso, si el botón
estaba desactivado y si había un diálogo abierto. Fila a 30 px bajo la barra superior,
es decir, 18 px detrás de un aviso de 48 px.

`npx playwright test e2e/action-notice-in-view.spec.ts -g "REPRO" --project=chromium --reporter=line`

| Caso | `scrollY` antes → después | Llamada del componente | Resultado |
|---|---|---|---|
| `Movements`, `Undo` | 2630 → 2598 | `top: -19`, texto `Categorized as Groceries  Undo`, botón **desactivado** | la línea queda 13,70 px por debajo del aviso (que encoge de 48 a 34,56 px) |
| `Review`, `Undo` de una categoría | 2161 → 2090 | `top: -19`, botón **desactivado** | el aviso desaparece; la fila, que estaba a 90 px, queda a 108,94 px: bajó 19 px en la pantalla |
| `Review`, abrir el diálogo de regla desde otra fila 18 px detrás | 2506 → 2488 | `top: -18`, mismo texto, botón activo, **diálogo abierto** | la página sube sin que el aviso haya cambiado |

Pasa hoy, igual que lo midió el reviewer de la F27.

## 2. Causa, comprobada

`src/shared/components/StickyBelowTopBar.vue` mide (y mueve la página) cada vez que Vue
vuelve a pintar lo que envuelve y cada vez que cambia `keepClearOf`. Dos momentos en que
eso pasa sin que el aviso tenga aún su forma nueva:

1. **Al pulsar `Undo`** (y cualquier acción): el store pone `isActing` a `true`, el botón
   se desactiva, Vue vuelve a pintar el aviso con la frase y el alto de antes, y el
   componente sube la página contra ese aviso viejo. Lo prueba la tabla: la llamada se
   hace con el botón desactivado y la frase anterior. Al llegar la respuesta, el aviso
   encoge (`Movements`) o desaparece (`Review`) y sobra lo que se subió.
2. **Al abrir el diálogo de regla**: `onCreateRule` de `ReviewView.vue` y de
   `StatementView.vue` escribía `touchedRow` con la fila del diálogo; el componente mide
   y sube la página con el diálogo ya abierto (la llamada se registra con `dialog: true`).

## 3. Arreglo

- `StickyBelowTopBar.vue`: prop opcional nueva `busy`. Mientras vale `true`, no mide (la
  comprobación se hace después del `nextTick` y del `requestAnimationFrame`, así que
  también vale si la acción empieza mientras una medida espera); cuando vuelve a `false`,
  mide. No cambia qué mide ni cuánto mueve.
- `ReviewView.vue` y `StatementView.vue`: le pasan `:busy="store.isActing || rules.isSaving"`.
  `touchedRow` ya no se escribe al abrir el diálogo de regla (`onCreateRule`), sino al
  guardar la regla (`onSaveRule`), con la fila del diálogo.
- `TransfersView.vue` y `RulesView.vue` no cambian: no pasan `keepClearOf`.

Medido después del arreglo (misma prueba temporal, 30 repeticiones en Chromium):
`Movements` tras `Undo`, `scrollY` 2630 → 2611 y la línea a 0,70 px bajo el aviso ya
encogido (una sola llamada, `top: -5`, con el texto `Change undone`), 30 de 30; `Review`
tras `Undo`, la fila a 89,94 px (estaba a 90), ninguna llamada, 30 de 30; abrir el
diálogo, `scrollY` igual (2506), ninguna llamada, 30 de 30.

Lo que exige la F27 sigue igual: el aviso a la vista, pegado bajo la barra, y R11 (la
fila recién tocada queda entera bajo el aviso cuando este aparece o cambia). Lo único
que cambia en el momento: la página se mueve una vez, cuando llega la respuesta, en vez
de al pulsar. Con las respuestas imitadas no se nota diferencia; con el backend real,
lo que tarde la respuesta. No he visto ningún otro cambio de lo que ve el usuario.

## Archivos modificados / creados

- `src/shared/components/StickyBelowTopBar.vue` — prop `busy`.
- `src/features/review/views/ReviewView.vue` — `:busy`, `touchedRow` al guardar la regla.
- `src/features/statement/views/StatementView.vue` — ídem.
- `src/shared/components/__tests__/StickyBelowTopBar.spec.ts` — 2 tests nuevos.
- `src/features/review/__tests__/ReviewView.spec.ts` — 1 test nuevo.
- `e2e/action-notice-in-view.spec.ts` — 4 pruebas nuevas al final, con tres funciones
  propias (`twoFrames`, `gapUnderNotice`, `leavePartlyUnderNotice`). Ninguna prueba
  existente se ha tocado.
- `docs/architecture.md` — el párrafo de `StickyBelowTopBar`.

## Decisiones tomadas

- El arreglo va en el momento de medir, no en qué se mide: R11 y el redondeo hacia
  arriba siguen igual.
- Descartado comparar el texto del aviso para decidir si medir: dos acciones seguidas
  sobre filas distintas con la misma frase (`1 movement categorized as Groceries`) no
  habrían movido la página para la segunda fila, que hoy sí se mueve.
- `busy` incluye `rules.isSaving` para que guardar una regla tampoco mida antes de que
  salga la línea de la regla creada.

## Pruebas que fallan con el salto y pasan sin él

Cuatro pruebas nuevas en `e2e/action-notice-in-view.spec.ts`, cada una parte de una fila
con su parte de arriba detrás del aviso (lo comprueba antes de pulsar):

1. `Undo in Movements, from a row partly behind the notice, moves the page only as much as the shorter notice needs` — la línea queda bajo el aviso a menos de 1 px.
2. `Undo of a category in Review, from a row partly behind the notice, leaves the row where it was` — la fila no se mueve más de 1 px en la pantalla.
3. `opening the rule dialog in Review from a row partly behind the notice does not move the page` — `scrollY` igual.
4. `opening the rule dialog in Movements from a line partly behind the notice does not move the page` — ídem (este caso no lo había medido el reviewer de la F27: también subía 19 px).

Con el código de antes (los tres archivos de `src/` devueltos a `HEAD` con `git stash`
solo para esta pasada): `npx playwright test e2e/action-notice-in-view.spec.ts -g "partly behind the notice" --reporter=line`
→ **10 failed, 2 passed**:

| Prueba | chromium | firefox | webkit |
|---|---|---|---|
| 1 (`Undo` en `Movements`) | falla: 13,70 | pasa | pasa |
| 2 (`Undo` en `Review`) | falla: 19 | falla: 18 | falla: 19 |
| 3 (diálogo en `Review`) | falla: 2488 en vez de 2506 | falla: 2488 / 2507 | falla: 2488 / 2506 |
| 4 (diálogo en `Movements`) | falla: 3008 / 3027 | falla: 3009 / 3028 | falla: 3008 / 3027 |

La 1 pasa en Firefox y WebKit con el código de antes: allí el aviso que encoge no deja
la línea más abajo. No he averiguado por qué; la 2 sí cubre el salto de `Undo` en los
tres.

Con el arreglo: `--repeat-each=10` en los tres navegadores → **120 passed**.

Unitarios nuevos: en `StickyBelowTopBar.spec.ts`, «does not measure while an action is
in flight, and measures once it is over» y «does not measure when it appears while an
action is still in flight»; en `ReviewView.spec.ts`, «names the row of a rule when the
rule is saved, not when its dialog opens», que con el `ReviewView.vue` de antes falla
(`Expected: "[data-movement-id="11"]"`, `Received: "[data-movement-id="10"]"`).

## Documentos actualizados

`git grep -n -i "StickyBelowTopBar\|keepClearOf\|keep-clear-of\|touchedRow\|píxeles justos" -- ':!progress' ':!specs' ':!src' ':!e2e'`
y `git grep -n -i "sube la página\|página sube\|página se mueve\|lo justo" -- docs README.md ':!docs/roadmap.md'`:
la única línea que quedaba falsa era `docs/architecture.md` (párrafo de
`StickyBelowTopBar`: decía que `keepClearOf` se escribe al abrir el diálogo de regla).
Corregida, y añadida la prop `busy` con su porqué. `docs/roadmap.md` no se ha tocado.

## Último ./init.sh

`./init.sh` → exit 0: tipos OK, oxlint y prettier OK, `Test Files 133 passed (133)`,
`Tests 2148 passed | 1 expected fail (2149)`, `vue-tsc --build` OK, `E2E smoke verde (chromium)`.

## Pruebas de navegador en los tres navegadores

- Primera pasada, `npx playwright test --reporter=line` → exit 1, **3 failed, 261 passed**,
  las tres en Firefox:
  - `action-notice-in-view.spec.ts:729` y `expenses-by-category.spec.ts:299`:
    `browserContext.close: Protocol error (Browser.removeBrowserContext): can't access property "_maybeDontRestoreTabs"…`,
    un fallo de Firefox al cerrar el contexto, no de una aserción.
  - `action-notice-in-view.spec.ts:998`: `watch.aborted` con `GET /api/movements`, el
    mismo que ya está anotado en el cabo 41 y en `docs/stack.md` como sin causa. **No
    viene de este arreglo:** repetida 60 veces solo en Firefox, falla 4 de 60 con el
    código de antes y 2 de 60 con el arreglo.
- Segunda pasada, mismo comando → exit 0, **264 passed**.

## Visto por el camino, sin arreglar

- En Chromium, la primera categoría de una línea de `Movements` dejó 2 de 30 veces la
  página 563 px más arriba (`scrollY` 2609 → 2046), sin ninguna llamada del componente.
  Pasa igual con el código de antes (2 de 30). No he buscado la causa. Las pruebas
  existentes no lo ven porque solo exigen que la fila no quede tapada.
- En WebKit, el componente a veces mide algo más tarde de lo que espera una prueba que
  vuelve a colocar la fila justo después de una acción. Por eso las pruebas nuevas
  colocan la fila y vuelven a intentarlo hasta que se queda detrás del aviso
  (`leavePartlyUnderNotice`).

## Sugerencias fuera de scope (NO aplicadas)

- Ninguna.

## Segunda vuelta (2026-11-04): la regla que no se guarda

Pedido por el reviewer en `progress/reviews/notice-page-jump.md`, «Cambios requeridos»:
con el arreglo de arriba, si guardar una regla falla (409 de `POST /api/category-rules`),
el diálogo sigue abierto y el aviso no cambia, pero al volver `rules.isSaving` a `false`
el componente medía y subía la página 19 px bajo el diálogo.

### Prueba que lo demuestra, primero en rojo

Dos pruebas nuevas al final de `e2e/action-notice-in-view.spec.ts`, con una función
propia (`rejectRuleSlowly`: `POST /api/category-rules` contesta 409 a los 300 ms):

- `a rule that fails to save, from a row partly behind the notice, does not move the page` (`Review`)
- `a rule that fails to save, from a line partly behind the notice in Movements, does not move the page`

Las dos categorizan una fila, la dejan 18 px detrás del aviso, abren desde ella el
diálogo de regla, pulsan `rule-save` y exigen que salga el error del diálogo, que el
diálogo siga abierto y que `scrollY` no cambie.

Con el código de la primera vuelta:
`npx playwright test e2e/action-notice-in-view.spec.ts -g "fails to save" --reporter=line`
→ **6 failed**: `Review` 2161 → 2142 (chromium y webkit) y 2161 → 2143 (firefox);
`Movements` 2630 → 2611 (chromium y webkit) y 2631 → 2612 (firefox). Es lo que midió el
reviewer.

### Cambio

- `src/shared/components/StickyBelowTopBar.vue`: guarda, en cada medida, la prop
  `keepClearOf` y el texto del bloque (`textContent`). Si al ir a medir los dos son
  iguales que en la medida anterior, no mueve la página. Así, que `busy` vuelva a
  `false` sin que cambie nada del aviso no mueve nada. Sigue sin medir mientras `busy`
  vale `true`, y mide la primera vez que se monta.
- `ReviewView.vue` y `StatementView.vue`, `onSaveRule`: `touchedRow` se escribe solo
  cuando `rules.create` devuelve `true` (la regla se ha guardado), con la fila del
  diálogo guardada antes de la llamada.

Lo que deja de hacer: si se repite exactamente la misma acción sobre la misma fila (mismo
selector, misma frase), la página no se mueve. Con filas distintas el selector cambia; con
la misma fila y otra categoría cambia la frase: en los dos casos sigue moviéndose (lo
comprueba `the notice does not cover a row changed while the notice is already showing`,
sin tocar).

### Tests unitarios nuevos

- `StickyBelowTopBar.spec.ts`: «does not measure when an action ends without changing the
  row or the text».
- `ReviewView.spec.ts`: «does not name the row of a rule that failed to save».

Con los tres archivos de `src/` de la primera vuelta:
`npx vitest run src/shared/components/__tests__/StickyBelowTopBar.spec.ts src/features/review/__tests__/ReviewView.spec.ts`
→ `Tests 2 failed | 66 passed (68)`, los dos nuevos. Con el cambio: `68 passed`.

### Resultados

- Las seis pruebas de este arreglo (las cuatro de la primera vuelta y las dos nuevas):
  `npx playwright test e2e/action-notice-in-view.spec.ts -g "partly behind the notice|fails to save" --reporter=line --repeat-each=10`
  → **180 passed** (chromium, firefox, webkit). Los tres casos de la primera vuelta
  siguen arreglados.
- `npx playwright test --reporter=line` → exit 0, **270 passed**.
- `./init.sh` → exit 0: oxlint y prettier OK, `Test Files 133 passed (133)`,
  `Tests 2150 passed | 1 expected fail (2151)`, `vue-tsc --build` OK,
  `E2E smoke verde (chromium)`.

### Documentos actualizados

`docs/architecture.md`, el mismo párrafo de `StickyBelowTopBar`: que solo mueve la página
si cambian la fila o el texto del bloque, y que `keepClearOf` se escribe cuando la regla
se ha guardado, no al abrir el diálogo ni si el guardado falla.
`git grep -n "al guardar la regla\|guardar la regla del" -- docs ':!docs/roadmap.md'` →
sin resultados: no queda la frase de la primera vuelta. `docs/roadmap.md` sin tocar.
