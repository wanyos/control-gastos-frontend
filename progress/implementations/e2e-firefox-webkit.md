# Cabo 44 — pruebas de navegador en Firefox y WebKit — implementación

**Estado: terminado.** La primera parte acabó bloqueada en dos decisiones; el humano las tomó el
2026-11-04 y están aplicadas en «Segunda parte», al final.
Lo que era un fallo de la prueba ya está arreglado. No se ha escrito nada en la base de datos
ni en las carpetas de datos del humano: todas las pruebas de `e2e/` contestan la API con
`page.route`.

## 1. Qué falla hoy (antes de tocar nada)

```
npx playwright test --project=firefox --project=webkit --reporter=line
→ exit 1 · 7 failed · 161 passed (2.5m)
```

| Navegador | Prueba | Error |
|---|---|---|
| firefox | `e2e/statement.spec.ts:346` the month picker reads legibly… | `Expected: "month"` / `Received: "text"` |
| webkit | `e2e/statement.spec.ts:346` (la misma) | `Expected: "month"` / `Received: "text"` |
| webkit | `e2e/action-notice-in-view.spec.ts:940` at the top of the page the notice sits between… | `its bottom (493.5535888671875) is below the window (411)` |
| webkit | `e2e/action-notice-in-view.spec.ts:1106` the notice does not cover the row that was just changed | `Expected: < 0.5` / `Received: 1.009…` |
| webkit | `e2e/action-notice-in-view.spec.ts:1176` …rules folded above the list | `Expected: < 0.5` / `Received: 0.6967…` |
| webkit | `e2e/action-notice-in-view.spec.ts:1176` …rules open above the list | `Expected: < 0.5` / `Received: 0.6967…` |
| webkit | `e2e/action-notice-in-view.spec.ts:1246` the notice does not cover a row changed while… | `Expected: < 108.0004…` / `Received: 108.98…` |

Es la misma lista que la del 2026-10-28 (7 fallos, mismos dos tipos de error y el de `:1246`).

## 2. Qué es cada fallo, y cómo lo he comprobado

Las comprobaciones se hicieron con pruebas de usar y tirar en la carpeta temporal de la
sesión (fuera del repositorio), con su propia configuración de Playwright, contra el
servidor de desarrollo y con la API contestada por `page.route`, igual que la suite.

### A. El campo «Jump to month» — **fallo real de la aplicación** (no he tocado nada)

`src/features/statement/components/MonthNav.vue` pinta un `<input type="month">` (a través
de `BaseInput`). Comprobado en los tres navegadores leyendo el campo de `/movements`:

| Navegador | `input.type` | atributo `type` | valor | qué se ve |
|---|---|---|---|---|
| chromium | `month` | `month` | — | «noviembre de 2026» con el icono de calendario; al pulsarlo sale un selector de mes |
| firefox | `text` | `month` | `2026-11` | una caja de texto normal con `2026-11`, sin icono y sin selector |
| webkit | `text` | `month` | `2026-11` | lo mismo que Firefox |

Es decir: Firefox y este WebKit no conocen `type="month"` y lo pintan como un campo de texto.
Escribir `2024-01` a mano **sí funciona** en los dos (comprobado: la etiqueta pasa a
«January 2024» y la URL a `?month=2024-01`). Escribir «January 2024» no hace nada, porque
`onJump` solo acepta `AAAA-MM`; el campo no dice en ningún sitio que haya que escribirlo así
(no tiene `placeholder`). Las flechas Previous / Next funcionan en todos.

No lo he comprobado en Safari de macOS: el WebKit de Playwright en Windows no es Safari.

La prueba hace bien en fallar: comprueba que el campo es un selector de mes, y en esos
navegadores no lo es. Cambiarla para aceptar `text` sería taparlo.

### B. WebKit en este ordenador ve una ventana de 731 × 411, no de 1280 × 720 — **fallo del entorno de pruebas**

Medido dentro de la página, con el dispositivo `Desktop Safari` (que declara 1280 × 720):

| Navegador | `innerWidth` × `innerHeight` | `devicePixelRatio` |
|---|---|---|
| chromium | 1280 × 720 | 1 |
| firefox | 1280 × 720 | 1 |
| webkit | **731 × 411** | **3.5** |

Windows está al 175 % (`HKCU\Control Panel\Desktop\WindowMetrics\AppliedDPI` = 168), y
1280 / 1.75 = 731, 720 / 1.75 = 411. El WebKit de Playwright 1.64.1 en Windows divide la
ventana por la escala de la pantalla. Pasa igual con `deviceScaleFactor: 1` y con la ventana
visible (`headless: false`). Lanzándolo con la variable de entorno de Windows
`__COMPAT_LAYER=DpiUnaware`, WebKit sí ve 1280 × 720 (`devicePixelRatio` 2).

Con eso:

- `:940` (`below the window (411)`): no es de WebKit. Chromium con una ventana de 731 × 411
  da exactamente lo mismo (el aviso, abajo en 493.5). Con `__COMPAT_LAYER=DpiUnaware` pasa.
- `:1246` (`108.98…`) y el segundo `:1176` también pasan con 1280 × 720.
- Con 731 × 411 y `devicePixelRatio` 3.5 queda además un `:1176` que falla por 0.7 px: tras
  desplazar la página, `scrollY` de WebKit se mueve 2–3 px solo, sin que la prueba haga nada
  (medido: 4588 → 4585 a los 200 ms). No lo he investigado más porque no pasa a 1280 × 720.

No lo he arreglado: el reglamento me pide no improvisar un apaño cuando una herramienta falla.
La propuesta está en «Qué hay que decidir».

### C. WebKit corta los decimales del desplazamiento — **fallo de la prueba** (arreglado)

Incluso con WebKit a 1280 × 720, `:1106` y `:1176` (los dos) fallaban por 0.9375 y 0.625 px,
en el paso que prepara la prueba (`expectAtBottomOfTopBar`: «la fila empieza justo donde
acaba la barra de arriba»), no en lo que la prueba comprueba después.

Medido: `window.scrollTo(0, 100.4)` y `window.scrollTo(0, 100.7)` dejan `scrollY` en
`100 / 101` en chromium y firefox (redondean) y en `100 / 100` en webkit (corta los decimales).
`bringUnderTopBar` desplazaba con `scrollBy(distancia con decimales)`; en chromium la fila
quedaba a 0.0625 px y en webkit a 0.9375 px, que es justo la cifra del fallo.

Arreglo (solo en la prueba): `bringUnderTopBar` calcula la posición de destino y la redondea
ella misma, `window.scrollTo(0, Math.round(window.scrollY + distance - extra))`, así los tres
navegadores caen en el mismo píxel. La tolerancia de 0.5 px no se ha tocado; no hay
reintentos; no se salta ningún navegador.

La aplicación no tiene este problema: `StickyBelowTopBar.vue` ya desplaza con
`Math.ceil(...)`, un número entero.

### D. Una vez, en WebKit: `:992` con un error de página

En una de las pasadas de WebKit con `__COMPAT_LAYER=DpiUnaware` falló una vez `:992` (Undo
pressed from the bottom…): `Fetch API cannot load …/api/movements?status=pending_review&uncategorized=true&page=1&pageSize=1 due to access control checks.`,
una lectura que estaba en marcha cuando la prueba navega a `/movements`. No se repitió en
`--repeat-each=3` (45 de 45) ni en las dos pasadas completas posteriores. No lo he tocado.

## Archivos modificados

- `e2e/action-notice-in-view.spec.ts` — solo `bringUnderTopBar` y su comentario (11 líneas
  añadidas, 5 quitadas).

No he tocado `docs/roadmap.md`, ni código de la aplicación, ni `playwright.config.ts`.
`e2e/category-rules.spec.ts`, `docs/stack.md`, `docs/roadmap.md` y `progress/current.md` ya
estaban modificados antes de empezar; no son míos.

## 3. Resultado

```
__COMPAT_LAYER=DpiUnaware npx playwright test --project=webkit e2e/action-notice-in-view.spec.ts --repeat-each=3 --reporter=line
→ exit 0 · 45 passed

npx playwright test --reporter=line            # los tres navegadores, tal cual
→ exit 1 · 4 failed · 248 passed (2.2m)
  [firefox] statement.spec.ts:346   month picker            (A, de la aplicación)
  [webkit]  statement.spec.ts:346   month picker            (A, de la aplicación)
  [webkit]  action-notice-in-view.spec.ts:946   top of the page  (B, ventana de 731 × 411)
  [webkit]  action-notice-in-view.spec.ts:1182  …rules folded    (B, ventana de 731 × 411)

__COMPAT_LAYER=DpiUnaware npx playwright test --reporter=line   # los tres, WebKit a 1280 × 720
→ exit 1 · 2 failed · 250 passed (2.2m)
  [firefox] statement.spec.ts:346   month picker            (A)
  [webkit]  statement.spec.ts:346   month picker            (A)
```

(Los números de línea suben 6 respecto a la tabla del punto 1 porque el comentario de
`bringUnderTopBar` es más largo.)

### Último ./init.sh

```
./init.sh → exit 0
Test Files 132 passed (132) · Tests 2139 passed (2139)
OK: pnpm lint:oxlint:check · OK: pnpm format:check · OK: pnpm type-check
E2E smoke verde (chromium) · Entorno listo.
```

## Documentos actualizados

`git grep -n "bringUnderTopBar\|scrollBy"` fuera de `progress/` y `specs/`: solo salen la
propia prueba, `StickyBelowTopBar.vue` y su test unitario, y `docs/architecture.md:358`, que
habla del desplazamiento de la aplicación (no de la prueba) y sigue siendo verdad. Ningún
documento de `docs/` ha quedado falso.

## Qué hay que decidir

1. **El campo «Jump to month» en Firefox y Safari** (fallo A). Hoy ahí se ve una caja de
   texto con `2026-11` que solo entiende `AAAA-MM`. Propuestas, de menos a más cambio visible:
   - a) Dejarlo como está y que la prueba de `:346` se limite a chromium diciéndolo en la
     prueba. Lo que ve el usuario de Firefox no cambia.
   - b) Mantener el `type="month"` y, cuando el navegador no lo conoce, poner en la caja una
     pista `YYYY-MM` (`placeholder`). Chromium no cambia; en Firefox se entiende qué escribir.
   - c) Cambiar el campo por dos desplegables (mes y año) que se vean igual en todos los
     navegadores. Cambia lo que se ve también en Chrome. Toca `MonthNav.vue` y probablemente
     `PeriodPicker.vue` y `OverviewView.vue`, que también usan `MonthNav`.
   La prueba se ajustaría a lo que se elija.
2. **WebKit con la pantalla de Windows al 175 %** (fallo B). Propuesta: en
   `playwright.config.ts`, solo para el proyecto `webkit` y solo en Windows, lanzar el
   navegador con `launchOptions: { env: { ...process.env, __COMPAT_LAYER: 'DpiUnaware' } }`,
   para que la ventana sea de verdad 1280 × 720. No lo he probado puesto así en la
   configuración, solo con la variable en la consola (resultado arriba). Alternativa sin
   tocar nada: lanzar WebKit con esa variable a mano y apuntarlo en `docs/verification.md`.

## Sugerencias fuera de scope (NO aplicadas)

- `:940` (R6, «el aviso, arriba de la página») falla también en chromium con una ventana de
  731 × 411: en una ventana baja, el aviso que sale arriba de la lista queda por debajo del
  borde. Puede ser lo esperado; si no lo es, es otro cabo.

---

## Segunda parte — las dos decisiones del humano (2026-11-04)

1. «Jump to month»: opción b. Se mantiene `type="month"` y el campo lleva `placeholder="YYYY-MM"`.
2. WebKit al 175 %: `__COMPAT_LAYER: 'DpiUnaware'` en `playwright.config.ts`, solo para el
   proyecto `webkit` y solo en Windows.

### Archivos modificados (segunda parte)

- `src/features/statement/components/MonthNav.vue` — `placeholder="YYYY-MM"` en el `BaseInput`
  y un comentario con el porqué. `BaseInput` no se ha tocado: ya tenía la prop `placeholder`.
  `MonthNav` lo usan también `PeriodPicker.vue` (Expenses by category) y `OverviewView.vue`,
  así que la pista sale también allí.
- `src/features/statement/__tests__/MonthNav.spec.ts` — prueba nueva `hints the format for
  browsers that paint the month field as plain text` (el campo lleva `placeholder` `YYYY-MM`).
- `e2e/statement.spec.ts` — `the month picker reads legibly with the design system tokens`:
  - chromium: `input.type` tiene que ser `month`; firefox y webkit: tiene que ser `text`.
  - Los tres: el valor es exactamente el mes actual (antes solo se pedía la forma `AAAA-MM`),
    `placeholder` es `YYYY-MM`, y siguen las comprobaciones de color y `color-scheme`.
  - firefox y webkit: con el campo vacío, el campo cumple `:placeholder-shown`.
  - Los tres: escribir `2024-01` deja la etiqueta en «January 2024», la URL en
    `month=2024-01`, la última consulta del extracto con `from=2024-01-01`, y ningún error de
    consola.
- `playwright.config.ts` — proyecto `webkit`: en `win32`, `launchOptions.env` con
  `__COMPAT_LAYER: 'DpiUnaware'` y el resto de `process.env`.
- `docs/stack.md` — dos viñetas nuevas en la sección de Playwright (WebKit en Windows con
  `DpiUnaware`; el campo `Jump to month` en Firefox y WebKit), y la referencia
  `action-notice-in-view.spec.ts:992` pasa a `:998`, porque el comentario nuevo de
  `bringUnderTopBar` movió la prueba 6 líneas.

### Comprobaciones

**Qué se ve.** En una prueba de usar y tirar fuera del repositorio, captura de la barra del mes
con y sin el atributo `placeholder` (quitándolo con JS): las dos capturas son idénticas byte a
byte en chromium, firefox y webkit (`same-with-and-without-placeholder true` en los tres),
porque el campo tiene valor. Con el campo vacío: en firefox se ve `YYYY-MM` en gris; en
chromium se ve su propio campo vacío (`--------- de ----` y el icono de calendario), sin
`YYYY-MM`. En chromium no cambia nada.

**Que las pruebas fallan sin el cambio.** Quitando a mano la línea `placeholder="YYYY-MM"` de
`MonthNav.vue` (y devolviéndola después):

```
npx playwright test e2e/statement.spec.ts -g "month picker" --reporter=line
→ 3 failed (Expected: "YYYY-MM" / Received: "" en los tres)
npx vitest run src/features/statement/__tests__/MonthNav.spec.ts
→ Tests 1 failed | 7 passed (8): hints the format for browsers that paint…
```

Con el cambio: `month picker` 3 passed en los tres navegadores.

**La ventana de WebKit con la configuración nueva**, sin poner la variable en la consola
(medido dentro de la página con la configuración del proyecto):

```
chromium {"iw":1280,"ih":720,"dpr":1}
webkit   {"iw":1280,"ih":720,"dpr":2}
firefox  {"iw":1280,"ih":720,"dpr":1}
```

Lo mismo quitando la variable del entorno (`env -u __COMPAT_LAYER …`): webkit 1280 × 720.

Ojo: la consola de esta sesión ya trae `__COMPAT_LAYER=RunAsInvoker PerProcessSystemDPIForceOff HighDpiAware`
de serie (no la he puesto yo). Con ese valor es con el que WebKit veía 731 × 411 en la primera
parte. La configuración nueva la sustituye para WebKit, así que da igual lo que traiga la consola.

### Resultado final

```
npx playwright test --reporter=line      # los tres navegadores, sin variables añadidas
→ exit 0 · 252 passed (2.6m)
npx playwright test --reporter=line      # segunda pasada
→ exit 0 · 252 passed (2.6m)
./init.sh
→ exit 0 · Test Files 132 passed (132) · Tests 2140 passed (2140) · lint OK · format OK ·
  pnpm type-check OK · E2E smoke verde (chromium) · Entorno listo.
```

`:998` (antes `:992`) no falló en ninguna de estas dos pasadas.

### Documentos

`git grep -n -E "action-notice-in-view(\.spec\.ts)?:[0-9]|statement\.spec\.ts:[0-9]|:992|type=\"month\"|Jump to month|DpiUnaware|COMPAT_LAYER"`
fuera de `progress/` y `specs/`:

- `docs/stack.md:859` decía `:992` → corregido a `:998`.
- `docs/roadmap.md:488` (cabo 41) también nombra `action-notice-in-view.spec.ts:992`: **no lo he
  tocado** porque el roadmap lo actualizas tú; ahora es `:998`.
- `docs/guia-de-uso.md` (líneas 209, 213, 501, 619, 1800) nombra `Jump to month`: sigue siendo
  verdad, no cambia.

### Sugerencias fuera de scope (NO aplicadas)

- La de `:940` de la primera parte sigue en pie (ahora `:946`): en una ventana baja (731 × 411,
  también en chromium) el aviso que sale arriba de la lista queda por debajo del borde.
