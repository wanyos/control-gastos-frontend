# Informe de implementación — feature 8 `app-shell`

- **Fecha:** 2026-09-12
- **Agente:** implementer
- **Tipo:** flujo simple (no SDD). Contrato: `intent` + `acceptance` de la
  feature 8 en `feature_list.json`.
- **Estado en `feature_list.json`:** `in_progress` (no se ha tocado; el cierre
  es tras el `reviewer`).

## Qué se hizo

La app deja de ser una página suelta: sidebar a la izquierda, topbar arriba y
`RouterView` en el área principal, portado de
`design-system/ui_kits/web/Shell.jsx` (React) a SFC Vue3, con textos en inglés y
solo alias semánticos de tokens. Cinco rutas reales en inglés: `/net-worth`
(home) y placeholders para `/overview`, `/movements`, `/investments` e
`/import`. Lucide instalado como `@lucide/vue`. `index.html` con `lang="en"` y
título.

## Decisiones y su porqué

### 1. Integración de Lucide: `@lucide/vue`, un icono por import nombrado

- **`@lucide/vue` 1.45.0**, en `dependencies` (es código de runtime).
- **Descartado `lucide-vue-next`**: es el nombre histórico para Vue 3 y está
  **deprecado en npm** con el mensaje «Please use @lucide/vue instead». Nacería
  con deuda.
- **Descartado `lucide` (vanilla)**: es lo que usa la referencia React
  (`<i data-lucide="…">` + `createIcons()`); reescribe el DOM por fuera de Vue y,
  al resolver iconos por nombre en tiempo de ejecución, obliga a registrar el set.
- **Por qué no arrastra el set:** cada icono es un módulo ESM propio y el paquete
  declara `"sideEffects": false`; con `import { Wallet } from '@lucide/vue'` Vite
  descarta el resto. **Comprobado en el build de producción**, no supuesto: los
  únicos `name:` de icono presentes en `dist/assets/*.js` son `wallet`,
  `layout-dashboard`, `arrow-left-right`, `chart-line` y `file-up`; JS total
  95,49 kB (37,42 kB gzip).
- **Iconos elegidos** (delegado en el agente): Net Worth → `Wallet` (la referencia
  lo usaba para cuentas), Overview → `LayoutDashboard` (el de «Resumen»),
  Movements → `ArrowLeftRight` (el de «Movimientos»), Investments → `ChartLine`
  (el `line-chart` de la referencia, renombrado en Lucide), Import → `FileUp`
  (la ingesta es subir ficheros del banco).
- El color no se pasa por prop: se hereda por `currentColor` desde la utilidad de
  texto del contenedor.

### 2. Estructura de rutas: un único `src/router/index.ts`, y las rutas son el modelo de navegación

- **Todas juntas en un archivo, no uno por feature.** Son cinco rutas, cuatro de
  ellas placeholder; partirlas en `features/*/routes.ts` crearía cuatro carpetas
  de feature vacías solo para alojar una línea. Cuando una feature tenga rutas
  anidadas, ese es el momento de moverle las suyas.
- **`meta.label` y `meta.icon` son la única fuente de verdad** de la sidebar y del
  título de la topbar (`RouteMeta` aumentado en `src/router/index.ts:9`). La
  sidebar consume `navEntries` (`src/router/index.ts:69`), derivado de `routes`:
  una ruta y su entrada de menú no pueden desincronizarse. El orden del array es
  el orden de la sidebar.
- **`/` redirige a `/net-worth`** (`src/router/index.ts:29`), así que la home es
  una ruta real con URL propia, no un alias.
- **Imports estáticos, sin lazy loading**: las vistas hoy son placeholders de
  pocas líneas; un chunk por ruta no paga. Se reconsidera cuando la F9 traiga una
  vista con peso.
- **Sin ruta catch-all** (ver sugerencias fuera de alcance).

### 3. Dónde vive cada pieza

- **Shell en `src/shared/components/`** (`AppShell`, `AppSidebar`, `AppTopBar`):
  es transversal a todas las features, que es la definición de `shared/` en
  `docs/architecture.md`. No es una feature.
- **Vista de `/net-worth` en `src/features/net-worth/views/NetWorthView.vue`**,
  junto a los `types.ts` y `service.ts` que dejó la F7, respetando
  `features/<feature>/views/`. No se ha tocado nada de lo existente en esa
  carpeta. Por dentro es un placeholder con `TODO(feat-9)`; **no llama a la API**.
- **Placeholder compartido** `src/shared/components/PlaceholderView.vue` para las
  otras cuatro rutas: una tarjeta con el `meta.label` de la ruta y una línea
  «X is not built yet.» (prop `note` opcional para personalizarla, que usa
  `NetWorthView`). Mínimo a propósito: no se inventa contenido de pantallas que no
  existen.

### 4. Qué se portó de `Shell.jsx` y qué no

- **Portado:** sidebar oscura sticky de ancho `--sidebar-w` con wordmark y
  navegación con icono; entrada activa con fondo verde translúcido y texto verde;
  topbar sticky de alto `--topbar-h` con borde inferior, fondo translúcido con
  blur y título `h1`.
- **Traducciones de color** (la referencia usa escalas crudas y `rgba` sueltos;
  aquí solo alias): fondo `surface-inverse`; texto inactivo `ink-on-dark/70`
  (era `rgba(255,255,255,.72)`); hover `ink-on-dark/5` (era blanco al 6 %);
  activo `accent` sobre `accent/15` (eran `--green-300` sobre `--green-400` al
  16 %); topbar `surface-app/85` (era `rgba(247,249,251,.85)`, que es
  `--neutral-50` = `--surface-app`). Anchos, alto y z-index vía
  `w-[var(--sidebar-w)]`, `h-[var(--topbar-h)]`, `z-[var(--z-sticky)]`,
  `max-w-[var(--container-max)]`: tokens, no números a mano.
- **No portado, a propósito:** la caja «Buscar movimiento…», la campana de
  notificaciones, el botón «Nuevo movimiento», el avatar «Lucía Romero» y la
  tarjeta «Plan · control·cuentas Plus». Serían UI muerta sin funcionalidad
  detrás; el `intent` pide que la topbar muestre el título y el `que_no_quiero`
  prohíbe inventar pantallas. Tampoco el logo SVG: habría que copiar un asset de
  `design-system/assets/` a `src/`, fuera del alcance pedido; el wordmark de texto
  basta.
- **Wordmark en inglés: `control·accounts`.** La referencia dice
  `control·cuentas`; «cuentas» es texto de UI en español y el `acceptance` no deja
  excepciones. Se traduce manteniendo la forma (punto medio en color de acento).
  **Es un nombre de marca: si el humano prefiere otro, es un cambio de una línea**
  (`src/shared/components/AppSidebar.vue:10` e `index.html:7`).

### 5. La trampa de `base.css` con los enlaces (encontrada en navegador, no en tests)

La primera versión ponía las utilidades de color en el `<a>` y los tests
unitarios pasaban, pero **en Chromium las entradas salían azules**:
`src/assets/styles/tokens/base.css` declara `a { color: var(--ink-link) }` y
`a:hover { text-decoration: underline }` **fuera de las capas de Tailwind**, y una
regla sin capa gana siempre a una utilidad en capa. Como `src/assets/styles/` no
se edita:

- el color va en un `<span>` hijo del `<a>` (`AppSidebar.vue:32`), donde ninguna
  regla de `base.css` compite; el icono hereda de él por `currentColor`;
- el subrayado se anula con un `<style scoped>` mínimo (`AppSidebar.vue:51`),
  cuyo selector con atributo supera en especificidad a `a:hover`. Es la excepción
  documentada de `docs/conventions.md` (no hay utilidad que pueda ganar).

Para poder poner las clases en el hijo, el `RouterLink` se usa en modo `custom`
con `v-slot` y `aria-current="page"` explícito en la entrada activa
(`AppSidebar.vue:15-24`). Documentado en `docs/conventions.md` (nota «Enlaces de
UI y `base.css`»).

### 6. `App.vue` y el e2e de humo

El e2e (`e2e/app-boot.spec.ts`, **sin cambios**) exige que `#app` tenga un único
`div` hijo con el fondo `--surface-app`. `App.vue` conserva ese `div` con las
mismas clases y mete `<AppShell />` dentro. Por eso también sigue valiendo, sin
cambios, la aserción de `src/assets/__tests__/tailwind-sources.spec.ts` que lee
las clases de `App.vue`.

## Archivos

### Creados
- `src/shared/components/AppShell.vue` — layout: sidebar + columna con topbar y
  `<main>` con `RouterView` (`:6-7`).
- `src/shared/components/AppSidebar.vue` — wordmark (`:6-11`), navegación desde
  `navEntries` (`:15-40`), estilo scoped del hover (`:51-57`).
- `src/shared/components/AppTopBar.vue` — título desde `route.meta.label`
  (`:5`, `:17`).
- `src/shared/components/PlaceholderView.vue` — placeholder de ruta (`:6-7`,
  `:17`, `:22`).
- `src/features/net-worth/views/NetWorthView.vue` — placeholder de la home con
  `TODO(feat-9)` (`:2-5`).
- `src/router/__tests__/router.spec.ts` — 10 tests.
- `src/shared/components/__tests__/AppShell.spec.ts` — 8 tests.

### Modificados
- `src/router/index.ts` — `RouteMeta` (`:9`), `HOME_ROUTE_NAME` (`:18`), `routes`
  (`:28`), redirect de `/` (`:29`), `navEntries` (`:69`), router (`:75`).
- `src/App.vue` — envuelve `<AppShell />` (`:3`, `:8`); wrapper y clases intactos.
- `src/__tests__/App.spec.ts` — el tercer test comprobaba que `RouterView` era
  hijo directo del wrapper, cosa que por diseño deja de ser cierta: ahora
  comprueba lo mismo con `AppShell` (el contenedor que ve el e2e).
- `index.html` — `lang="en"` (`:2`), `<title>control·accounts — personal
  finance</title>` (`:7`).
- `package.json` (`:20`) y `pnpm-lock.yaml` — `@lucide/vue ^1.45.0`.
  `pnpm-workspace.yaml` no cambió.
- `docs/stack.md` — Routing actualizado y entrada de Iconos (`:43-47`); nueva
  sección *Iconos (Lucide)* con versión, por qué y la verificación del bundle
  (`:232-270` aprox.); retirada la nota «Lucide no está instalado».
- `docs/conventions.md` — la nota de iconos pasa a hecho consumado (`:214`),
  nueva nota sobre enlaces y `base.css` (`:223`), «iconos (Lucide)» sale de la
  lista de pendientes.
- `docs/architecture.md` — árbol de carpetas: `router/index.ts` ya no está vacío
  y aparece `shared/components/`.
- `progress/current.md` — bitácora de la sesión.

### No tocados (a propósito)
`e2e/`, `src/assets/styles/`, `src/assets/main.css`, `design-system/`,
`src/features/net-worth/{types,service}.ts`, `feature_list.json` (status).

## Acceptance, criterio a criterio

| # | Criterio | Cómo se cumple | Evidencia |
|---|---|---|---|
| 1 | Shell con sidebar izquierda y topbar arriba, portado de `Shell.jsx` a SFC | `AppShell` + `AppSidebar` + `AppTopBar` | `AppShell.spec.ts` «mounts a sidebar…», «renders an icon…»; comprobación en Chromium (abajo) |
| 2 | Rutas en inglés: `/net-worth` home real + placeholders `/overview`, `/movements`, `/investments`, `/import` | `routes` + redirect de `/` | `router.spec.ts` «declares the five…», «sends the root path…», `it.each` «resolves %s…» |
| 3 | Nada en español (identificadores, archivos, rutas, UI) | Labels, rutas, nombres, wordmark y título traducidos | `router.spec.ts` «leaves no Spanish label…»; `AppShell.spec.ts` «shows an English wordmark…» |
| 4 | `RouterView` renderiza según URL y se marca la entrada activa | `RouterView` en `<main>`; `aria-current="page"` + clases activas | `AppShell.spec.ts` «renders the routed view…», «marks exactly the active entry…», «moves the active mark and the title…», «renders no title and no active entry…» |
| 5 | `index.html` con `lang="en"` y título descriptivo | `index.html:2`, `:7` | Comprobado en el HTML servido por el dev server |
| 6 | `src/features/` con una carpeta por feature | Ya estrenada por la F7; la vista de la home entra en `features/net-worth/views/` | Estructura en disco |
| 7 | Lucide instalado y anotado en `stack.md`; nota de `conventions.md` actualizada | `@lucide/vue` 1.45.0 | `package.json:20`, `docs/stack.md` *Iconos (Lucide)*, `docs/conventions.md:214` |
| 8 | Solo alias semánticos; `src/assets/styles/` sin tocar | Sin hex, `rgba` ni paleta de serie | `grep` sin resultados en los `.vue` nuevos; `git status src/assets` limpio; `styles.spec.ts` verde |
| 9 | `type-check`, `lint`, `test:unit`, `./init.sh` en verde | — | Abajo |
| 10 | e2e de humo pasa sin cambios | `git diff e2e` vacío | `./init.sh` sección 6 + modo CI |

## Verificación

### Comandos (última pasada, todo tras el último cambio de código)

- `pnpm type-check` → `vue-tsc --build` sin errores (rc 0).
- `pnpm lint` → oxlint + eslint sin errores ni cambios (rc 0).
- `npx prettier --check src/` → «All matched files use Prettier code style!».
- `pnpm test:unit` → **9 archivos / 80 tests, todos verdes** (antes: 7 / 62; +18
  nuevos). Incluye `tailwind-sources.spec.ts`, que compila el bundle real.
- `pnpm build` → OK (`index-*.css` 17,86 kB, `index-*.js` 95,49 kB).
- `CI=true pnpm test:e2e --project=chromium` contra el build de producción
  (preview) → **1 passed**.
- `bash ./init.sh` → salida final:

```
── 5. Ejecutando tests ─────────────────────────────────
 Test Files  9 passed (9)
      Tests  80 passed (80)
[OK]    Todos los tests pasan

── 6. E2E smoke (chromium) ─────────────────────────────
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### Comprobación en navegador real (Chromium vía Playwright, script en línea, sin ficheros)

Contra el dev server en `:5173`:

- `/` → URL final `http://localhost:5173/net-worth`.
- Sidebar: `Net Worth, Overview, Movements, Investments, Import`, 5 `svg`.
- Topbar `Net Worth`, activa `Net Worth`. Clic en «Movements» → URL
  `/movements`, topbar `Movements`, activa `Movements`, vista «Movements is not
  built yet.».
- Estilos computados contra los tokens de `:root`: sidebar `rgb(20, 27, 34)` =
  `--surface-inverse` `#141B22`, ancho `248px` = `--sidebar-w`; topbar `60px` =
  `--topbar-h`, borde `rgb(227, 232, 237)` = `--border-subtle`; texto activo
  `rgb(18, 184, 134)` = `--accent` `#12B886`; inactivo `--ink-on-dark` al 70 %;
  hover sin subrayado y fondo `--ink-on-dark` al 5 %.
- **Cero errores de consola y de `pageerror`.**
- Captura revisada visualmente (en el scratchpad de la sesión, fuera del repo).
- Utilidades del shell presentes en el CSS de producción: `.bg-surface-inverse`,
  `.text-accent`, `.bg-accent\/15`, `.w-\[var\(--sidebar-w\)\]`,
  `.h-\[var\(--topbar-h\)\]`, `.max-w-\[var\(--container-max\)\]`,
  `.z-\[var\(--z-sticky\)\]`, `.bg-surface-app\/85`, `.text-ink-on-dark\/70`,
  `.hover\:bg-ink-on-dark\/5`: las carpetas nuevas quedan dentro del escaneo de
  Tailwind (todo cuelga de `src/`).

## Sugerencias fuera de alcance (NO aplicadas)

1. **Ruta catch-all / 404.** Hoy una URL desconocida pinta el shell con el área
   principal vacía y sin título (lo fija el test «renders no title and no active
   entry on a route outside the navigation»), y Vue Router avisa en consola con
   `warn`. Una ruta `/:pathMatch(.*)*` que redirija a la home o muestre un «Not
   found» cerraría el hueco; es pantalla nueva y no está en el roadmap.
2. **Ampliar `tailwind-sources.spec.ts`** para comprobar las clases estáticas de
   todos los `.vue` y no solo las de `App.vue`. El test sigue teniendo sentido
   (App.vue conserva sus clases), pero ahora cubre una parte menor de la UI.
3. **Logo del design system** (`design-system/assets/logo-mark-dark.svg`) junto al
   wordmark: requiere copiar el asset a `src/` y decidir su nombre en inglés.
4. **Accesibilidad y responsive del shell**: la sidebar es fija de 248 px sin
   colapso en pantallas estrechas; la guía lo deja «pendiente de definir».
5. **Nombre de la marca**: `control·accounts` es traducción literal del wordmark;
   que el humano confirme o elija otro.
