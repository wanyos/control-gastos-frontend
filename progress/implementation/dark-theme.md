# Informe de implementación — feature 10 `dark-theme`

- **Fecha:** 2026-09-13
- **Agente:** implementer
- **Flujo:** simple (no SDD). El contrato es el `intent` más los 12 criterios de `acceptance`.
- **Estado en `feature_list.json`:** `in_progress` (no lo toco: el cierre va después del reviewer)

## Enfoque

1. **Un archivo de tema propio cargado para toda la app:** `src/assets/theme-dark.css`,
   importado en `src/assets/main.css:32` **después** de `tokens/base.css`. Redefine en
   `:root` (`src/assets/theme-dark.css:91`) los alias semánticos del design system
   (surface, ink, border, brand, señales y sus `-subtle`). Cada alias apunta a un
   **peldaño de la paleta del propio design system**, sin colores literales. También
   añade `color-scheme: dark` (`:93`) para que las scrollbars y los controles nativos no
   salgan claros.
2. **Por qué vale para todo, también para lo que venga:** lo he comprobado en el CSS
   construido (`dist/assets/*.css`). El puente `@theme inline` genera utilidades que leen
   la variable, no valores copiados:
   - `.bg-surface-card{background-color:var(--surface-card)}`
   - `.text-ink-muted{color:var(--ink-muted)}`
   - `.bg-surface-app\/85` → `color-mix(in oklab, var(--surface-app) 85%, transparent)`
   - `.bg-accent\/15` → `color-mix(in oklab, var(--accent) 15%, transparent)`
   - En el bundle aparece primero `--surface-card:var(--neutral-0)` y después
     `--surface-card:var(--neutral-900)`, así que gana el del tema.

   Cualquier componente que use alias semánticos sale oscuro sin tocarlo.
3. **`base.css`** pinta `body` con `--surface-app` y `--ink-body`, `h1–h5` con `--ink-strong`
   y `a` con `--ink-link`. Todo eso sigue al tema sin editar la copia.
4. **Los `-subtle` oscuros** mezclan el color de la señal con la tarjeta:
   `color-mix(in srgb, <tono> N%, var(--surface-card))`.
5. **Contraste medido:** cada par que se usa junto está escrito como una línea
   `contrast: <texto> on <fondo> [over <base>] >= <mínimo> (dónde)` en la cabecera de
   `theme-dark.css` (`:17–88`). El test lee esas líneas y resuelve los valores reales:
   colors.css con el tema encima, `var()`, `rgba()`, `color-mix` y la opacidad `/NN`
   compuesta en sRGB, como hace el navegador. Con eso calcula el ratio WCAG 2.x.

**Tonos elegidos** (todos de la paleta `neutral` del design system):

| Zona | Token | Color |
|---|---|---|
| Sidebar (la más oscura) | `neutral-950` | #0B1116 |
| Zona central y topbar | `neutral-800` | #232C36 |
| Tarjetas | `neutral-900` | #141B22 |
| Pozos, pistas de barra y badge neutro | `neutral-950` | #0B1116 |
| Texto | de `neutral-50` a `neutral-400` | — |
| Bordes | `neutral-500` | — |

## Tokens redefinidos (claro → oscuro)

| Token | Claro (design system) | Oscuro (tema) |
|---|---|---|
| `--brand` | `var(--green-600)` (#0A8F5F) | `var(--green-500)` (#12B886) |
| `--brand-hover` | `var(--green-700)` (#07744E) | `var(--green-400)` (#34C68C) |
| `--brand-active` | `var(--green-800)` (#075C3F) | `var(--green-300)` (#6FDDB0) |
| `--brand-subtle` | `var(--green-50)` (#ECFBF4) | `color-mix(in srgb, var(--green-500) 16%, var(--surface-card))` (#143432) |
| `--brand-subtle-2` | `var(--green-100)` (#D2F5E5) | `color-mix(in srgb, var(--green-500) 22%, var(--surface-card))` (#143E38) |
| `--brand-on` | `var(--neutral-0)` (#FFFFFF) | `var(--neutral-950)` (#0B1116) |
| `--accent` | `var(--green-500)` (#12B886) | `var(--green-500)` (#12B886) |
| `--surface-app` | `var(--neutral-50)` (#F7F9FB) | `var(--neutral-800)` (#232C36) |
| `--surface-card` | `var(--neutral-0)` (#FFFFFF) | `var(--neutral-900)` (#141B22) |
| `--surface-sunken` | `var(--neutral-100)` (#F0F3F6) | `var(--neutral-950)` (#0B1116) |
| `--surface-inverse` | `var(--neutral-900)` (#141B22) | `var(--neutral-950)` (#0B1116) |
| `--surface-hover` | `var(--neutral-100)` (#F0F3F6) | `var(--neutral-700)` (#38434F) |
| `--ink-strong` | `var(--neutral-900)` (#141B22) | `var(--neutral-50)` (#F7F9FB) |
| `--ink-body` | `var(--neutral-700)` (#38434F) | `var(--neutral-200)` (#E3E8ED) |
| `--ink-muted` | `var(--neutral-500)` (#6B7785) | `var(--neutral-300)` (#CDD5DD) |
| `--ink-faint` | `var(--neutral-400)` (#9BA6B2) | `var(--neutral-400)` (#9BA6B2) |
| `--ink-on-brand` | `var(--neutral-0)` (#FFFFFF) | `var(--neutral-950)` (#0B1116) |
| `--ink-on-dark` | `var(--neutral-50)` (#F7F9FB) | `var(--neutral-50)` (#F7F9FB) |
| `--ink-link` | `var(--blue-500)` (#2E6BE6) | `var(--chart-3)` (#2E9BD6) |
| `--border-subtle` | `var(--neutral-200)` (#E3E8ED) | `var(--neutral-500)` (#6B7785) |
| `--border-default` | `var(--neutral-300)` (#CDD5DD) | `var(--neutral-400)` (#9BA6B2) |
| `--border-strong` | `var(--neutral-400)` (#9BA6B2) | `var(--neutral-300)` (#CDD5DD) |
| `--border-brand` | `var(--green-600)` (#0A8F5F) | `var(--green-500)` (#12B886) |
| `--positive` | `var(--green-600)` (#0A8F5F) | `var(--green-500)` (#12B886) |
| `--positive-subtle` | `var(--green-50)` (#ECFBF4) | `color-mix(in srgb, var(--green-500) 16%, var(--surface-card))` (#143432) |
| `--negative` | `var(--red-500)` (#E5484D) | `var(--chart-6)` (#EF6C5A) |
| `--negative-subtle` | `var(--red-50)` (#FDECEC) | `color-mix(in srgb, var(--red-500) 20%, var(--surface-card))` (#3E242B) |
| `--warning` | `var(--amber-500)` (#F59E0B) | `var(--amber-500)` (#F59E0B) |
| `--warning-subtle` | `var(--amber-50)` (#FEF4E6) | `color-mix(in srgb, var(--amber-500) 16%, var(--surface-card))` (#38301E) |
| `--info` | `var(--blue-500)` (#2E6BE6) | `var(--chart-3)` (#2E9BD6) |
| `--info-subtle` | `var(--blue-50)` (#EAF2FE) | `color-mix(in srgb, var(--blue-500) 16%, var(--surface-card))` (#182841) |

Notas:
- `--accent`, `--ink-faint`, `--ink-on-dark` y `--warning` conservan su valor. Aun así se
  declaran en el tema para que toda la elección oscura esté escrita en un solo sitio.
- `--negative` pasa a coral (`--chart-6`), e `--info` y `--ink-link` pasan a `--chart-3`.
  El motivo: `--red-500` y `--blue-500` no llegan a 4.5:1 en oscuro. Sobre las tarjetas
  (`neutral-900`) dan 4.47 y 3.63; sobre la zona central (`neutral-800`), 3.6 y 2.9.
- Sin tocar:
  - `--chart-1…8`.
  - `--surface-overlay`: ya es un velo oscuro.
  - `--ring-brand`: no se expone como utilidad ni se usa.

## Componentes revisados

He revisado **todos** los `.vue` de `src/` (14). **Ninguno ha tenido que cambiar**: todos
usan solo alias semánticos, y ahora hay un test que lo vigila (sin hex, sin `rgb()` y sin la
paleta de serie de Tailwind).

| Componente | Tokens de color que usa | Antes | Ahora | ¿Cambió? |
|---|---|---|---|---|
| `src/App.vue` | `bg-surface-app`, `text-ink-body` | fondo claro | fondo `neutral-800` | No |
| `src/shared/components/AppShell.vue` | ninguno (solo layout) | — | — | No |
| `src/shared/components/AppSidebar.vue` | `bg-surface-inverse`, `text-ink-on-dark(/70)`, `text-accent`, `bg-accent/15`, `hover:bg-ink-on-dark/5` | oscura, `neutral-900` | más oscura, `neutral-950`; entrada activa a 5.98:1 | No |
| `src/shared/components/AppTopBar.vue` | `bg-surface-app/85` + blur, `border-line-subtle`, `text-ink-strong` | translúcida clara | translúcida `neutral-800`; título a 13.87:1 sobre tarjetas | No |
| `src/shared/components/BaseCard.vue` | `bg-surface-card`, `border-line-subtle`, `text-ink-strong/muted` | blanca | `neutral-900`, borde a 3.80:1 | No |
| `src/shared/components/StatCard.vue` | `bg-surface-card`, `border-line-subtle`, `text-ink-strong/muted`, `bg-brand-subtle text-brand` | blanca, icono sobre verde claro | `neutral-900`; tinte de marca oscuro | No |
| `src/shared/components/BaseBadge.vue` | `bg-surface-sunken text-ink-body`, `bg-{brand,positive,negative,warning,info}-subtle` con su texto y su punto | tintes 50, claros | tintes oscuros (≥ 4.66:1) | No |
| `src/shared/components/ShareBar.vue` | `bg-surface-sunken` (pista) + `bg-chart-*` | pista gris clara | pista `neutral-950`; barras ≥ 4.25:1 | No |
| `src/shared/components/PlaceholderView.vue` | `bg-surface-card`, `border-line-subtle`, `text-ink-strong/muted` | blanca | `neutral-900` | No |
| `src/features/net-worth/views/NetWorthView.vue` | `text-ink-muted` (cargando), `text-ink-body` (error), `text-ink-strong` (Details), `bg-chart-*` | sobre claro | sobre oscuro | No |
| `src/features/net-worth/components/AccountCard.vue` | `bg-surface-card`, `border-line-subtle`, `text-ink-on-brand` sobre `bg-chart-*`, `text-ink-strong/muted/faint`, `text-negative` | blanca; inicial en blanco | `neutral-900`; inicial en `neutral-950` sobre el color | No |
| `src/features/net-worth/components/BankCard.vue` | a través de `BaseCard` y `AccountCard` | — | — | No |
| `src/features/net-worth/components/BreakdownList.vue` | `bg-surface-sunken`, `bg-chart-*`, `text-ink-strong/muted`, `text-negative`, badges | claro | oscuro | No |
| `src/features/net-worth/components/DataWarnings.vue` | a través de `BaseCard` y `BaseBadge` (warning), `text-ink-body` | claro | oscuro | No |

Nota: `text-ink-on-brand` se usa en la inicial de la ficha de banco y se usará en los futuros
botones de marca. Pasa de blanco a `neutral-950` porque con blanco 3 de los 8 colores de
chart ya quedaban por debajo de 3:1 en el tema claro (ámbar 2.15, menta 2.55, teal 2.42).

## Contrastes medidos

Todas las filas salen de las líneas `contrast:` de `src/assets/theme-dark.css`, y las mide
`src/assets/__tests__/theme-dark.spec.ts:206`.
- «Claro»: el mismo par con los valores del design system. Es solo referencia; muchos pares
  no llegaban al mínimo.
- «Oscuro»: lo que se ve ahora.

| Par | Uso | Mínimo | Claro | Oscuro |
|---|---|---|---|---|
| `--ink-strong` sobre `--surface-app` | topbar title, section headings | 4.5 | 16.45 | **13.40** |
| `--ink-strong` sobre `--surface-app/85` (sobre `--surface-card`) | topbar over cards | 4.5 | 16.58 | **13.87** |
| `--ink-muted` sobre `--surface-app` | loading message | 4.5 | 4.32 | **9.53** |
| `--ink-link` sobre `--surface-app` | links painted by base.css | 4.5 | 4.56 | **4.56** |
| `--border-subtle` sobre `--surface-app` | topbar bottom line, card edge | 3 | 1.17 | **3.10** |
| `--ink-strong` sobre `--surface-card` | titles, key figures, amounts | 4.5 | 17.36 | **16.45** |
| `--ink-body` sobre `--surface-card` | body copy, error message | 4.5 | 10.08 | **14.08** |
| `--ink-muted` sobre `--surface-card` | captions, percentages, dates | 4.5 | 4.56 | **11.70** |
| `--ink-faint` sobre `--surface-card` | No valuation gap | 4.5 | 2.47 | **7.02** |
| `--ink-link` sobre `--surface-card` | links painted by base.css | 4.5 | 4.81 | **5.60** |
| `--negative` sobre `--surface-card` | negative amounts, mismatch sentence | 4.5 | 3.91 | **5.76** |
| `--positive` sobre `--surface-card` | positive figures | 4.5 | 4.11 | **6.80** |
| `--warning` sobre `--surface-card` | warning text | 4.5 | 2.15 | **8.08** |
| `--info` sobre `--surface-card` | info text | 4.5 | 4.81 | **5.60** |
| `--brand` sobre `--surface-card` | brand text | 4.5 | 4.11 | **6.80** |
| `--ink-body` sobre `--surface-hover` | hovered rows | 4.5 | 9.05 | **8.17** |
| `--border-subtle` sobre `--surface-card` | card and row edges | 3 | 1.23 | **3.80** |
| `--border-default` sobre `--surface-card` | inputs | 3 | 1.48 | **7.02** |
| `--border-strong` sobre `--surface-card` | emphasized edges | 3 | 2.47 | **11.70** |
| `--border-brand` sobre `--surface-card` | selected edges | 3 | 4.11 | **6.80** |
| `--ink-body` sobre `--surface-sunken` | neutral badge, Idle money | 4.5 | 9.05 | **15.40** |
| `--brand` sobre `--brand-subtle` | brand badge, stat icon tile | 4.5 | 3.85 | **5.24** |
| `--brand` sobre `--brand-subtle-2` | brand tile, stronger tint | 4.5 | 3.51 | **4.66** |
| `--positive` sobre `--positive-subtle` | positive badge | 4.5 | 3.85 | **5.24** |
| `--negative` sobre `--negative-subtle` | Mismatch badge | 4.5 | 3.43 | **4.67** |
| `--warning` sobre `--warning-subtle` | Warning badge | 4.5 | 1.97 | **6.08** |
| `--info` sobre `--info-subtle` | info badge | 4.5 | 4.27 | **4.78** |
| `--ink-on-brand` sobre `--brand` | brand buttons | 4.5 | 4.11 | **7.44** |
| `--ink-on-brand` sobre `--brand-hover` | brand buttons, hover | 4.5 | 5.81 | **8.68** |
| `--ink-on-brand` sobre `--brand-active` | brand buttons, pressed | 4.5 | 8.04 | **11.43** |
| `--chart-1` sobre `--surface-sunken` | bar and dot | 3 | 3.69 | **4.62** |
| `--chart-2` sobre `--surface-sunken` | bar and dot | 3 | 2.29 | **7.44** |
| `--chart-3` sobre `--surface-sunken` | bar and dot | 3 | 2.78 | **6.13** |
| `--chart-4` sobre `--surface-sunken` | bar and dot | 3 | 4.01 | **4.25** |
| `--chart-5` sobre `--surface-sunken` | bar | 3 | 1.93 | **8.84** |
| `--chart-6` sobre `--surface-sunken` | bar | 3 | 2.71 | **6.30** |
| `--chart-7` sobre `--surface-sunken` | bar | 3 | 3.80 | **4.48** |
| `--chart-8` sobre `--surface-sunken` | bar | 3 | 2.17 | **7.85** |
| `--chart-1` sobre `--surface-card` | bank tile | 3 | 4.11 | **4.22** |
| `--chart-2` sobre `--surface-card` | bank tile | 3 | 2.55 | **6.80** |
| `--chart-3` sobre `--surface-card` | bank tile | 3 | 3.10 | **5.60** |
| `--chart-4` sobre `--surface-card` | bank tile | 3 | 4.47 | **3.89** |
| `--chart-5` sobre `--surface-card` | bank tile | 3 | 2.15 | **8.08** |
| `--chart-6` sobre `--surface-card` | bank tile | 3 | 3.02 | **5.76** |
| `--chart-7` sobre `--surface-card` | bank tile | 3 | 4.23 | **4.10** |
| `--chart-8` sobre `--surface-card` | bank tile | 3 | 2.42 | **7.18** |
| `--ink-on-brand` sobre `--chart-1` | bank tile initial, aria-hidden | 3 | 4.11 | **4.62** |
| `--ink-on-brand` sobre `--chart-2` | bank tile initial, aria-hidden | 3 | 2.55 | **7.44** |
| `--ink-on-brand` sobre `--chart-3` | bank tile initial, aria-hidden | 3 | 3.10 | **6.13** |
| `--ink-on-brand` sobre `--chart-4` | bank tile initial, aria-hidden | 3 | 4.47 | **4.25** |
| `--ink-on-brand` sobre `--chart-5` | bank tile initial, aria-hidden | 3 | 2.15 | **8.84** |
| `--ink-on-brand` sobre `--chart-6` | bank tile initial, aria-hidden | 3 | 3.02 | **6.30** |
| `--ink-on-brand` sobre `--chart-7` | bank tile initial, aria-hidden | 3 | 4.23 | **4.48** |
| `--ink-on-brand` sobre `--chart-8` | bank tile initial, aria-hidden | 3 | 2.42 | **7.85** |
| `--ink-on-dark` sobre `--surface-inverse` | wordmark | 4.5 | 16.45 | **17.99** |
| `--accent` sobre `--surface-inverse` | wordmark dot | 3 | 6.80 | **7.44** |
| `--ink-on-dark/70` sobre `--surface-inverse` | idle entries and icons | 4.5 | 8.55 | **9.05** |
| `--ink-on-dark/70` sobre `--ink-on-dark/5` (sobre `--surface-inverse`) | hovered entry | 4.5 | 7.80 | **8.46** |
| `--accent` sobre `--accent/15` (sobre `--surface-inverse`) | active entry | 4.5 | 5.34 | **5.98** |
| `--surface-app` sobre `--surface-inverse` | sidebar stands apart from the main area | 1.25 | 16.45 | **1.34** |
| `--ink-on-dark` sobre `--surface-overlay` (sobre `--surface-app`) | text over a scrim | 4.5 | 3.31 | **15.76** |

**Los que costó cuadrar:**
- **Bordes a 3:1 o más:** obligan a usar `neutral-500` en `--border-subtle`. Da 3.10 contra
  la zona central y 3.80 contra la tarjeta. Los bordes se ven más marcados que en el claro,
  donde estaban a 1.2:1.
- **Rojo de los negativos:** `--red-500` daba 4.46 sobre `neutral-900`. Se usa el coral
  `--chart-6`, que da 5.76.
- **Tintes de los badges:** con mezclas del 28 % y del 22 %, `--brand-subtle-2` e
  `--info-subtle` bajaban de 4.5. Quedaron al 22 % y al 16 % (4.66 y 4.78). El badge
  Mismatch queda en 4.67.
- **`--ink-link` sobre la zona central:** 4.56, justo por encima del mínimo.
- **Inicial de la ficha de banco** (letra `aria-hidden` sobre `bg-chart-*`): incluso con la
  tinta más oscura de la paleta, el índigo (`chart-4`) da 4.25 y el púrpura (`chart-7`) 4.48.
  Ninguna tinta de la paleta llega a 4.5 con los 8 colores, y con blanco sale peor. Por eso
  se mide como icono decorativo (mínimo 3:1): el nombre del banco va escrito al lado. Para
  llegar a 4.5 habría que aclarar esos dos colores de chart en el tema, con tonos que la
  paleta actual no tiene.
- **Sidebar frente a zona central:** `neutral-950` contra `neutral-800` da 1.34:1. No es un
  umbral WCAG; se fija un mínimo de 1.25 para que el test salte si alguien iguala los dos
  tonos.

## Comprobación visual (Chromium real, con el backend en :3000 y el dev server del humano en :5173)

Capturas a 1440×1000, de página completa, en `progress/implementation/dark-theme/`:

| Escena | Antes | Después |
|---|---|---|
| `/net-worth` con datos reales del backend | `before-net-worth.png` | `after-net-worth.png` |
| Placeholder `/overview` | `before-placeholder-overview.png` | `after-placeholder-overview.png` |
| Cargando (petición colgada con `page.route`) | `before-state-loading.png` | `after-state-loading.png` |
| Error (500 simulado) | `before-state-error.png` | `after-state-error.png` |
| Casos borde simulados: 3 avisos de `issues`, `No valuation`, saldo negativo, descuadre (Mismatch) | `before-state-edge-cases.png` | `after-state-edge-cases.png` |

He revisado las 10 capturas a ojo. Además hice un **escaneo automático de los estilos
computados** en las 5 rutas y en el caso borde: se recorren todos los elementos de `#app`,
`body` y `html`, y se listan los que tienen un fondo más claro que `neutral-700`.

- **Qué salió:** solo rellenos de datos. Son las barras `bg-chart-*`, los puntos de grupo,
  los puntos de los badges Warning y las fichas con la inicial del banco.
- **Qué no salió:** ningún fondo de página, topbar, tarjeta, badge ni aviso.
- **Valores computados:**
  - `body`: `rgb(35, 44, 54)` (`neutral-800`).
  - `html`: `color-scheme: dark`.
  - Topbar: `oklab(… / 0.85)`.
  - Entrada activa: `oklab(… / 0.15)`.
- **Consola:** sin errores, salvo el 500 provocado a propósito en el caso de error.

Los scripts de captura y de escaneo estuvieron en el scratchpad de la sesión, fuera del repo,
y los borré al terminar.

Observaciones de las capturas que no tienen que ver con el tema:
- El botón flotante blanco abajo en el centro es **Vue DevTools** (`vite-plugin-vue-devtools`).
  Solo aparece con `pnpm dev`; no está en el build ni es UI de la app.
- En las capturas de página completa la sidebar se corta a 1000 px porque es
  `sticky h-screen`. En el navegador acompaña al scroll, igual que antes del cambio.

## Archivos tocados

| Archivo | Qué |
|---|---|
| `src/assets/theme-dark.css:1` (nuevo) | Cabecera con la regla y los pares `contrast:` (`:17–88`); `:root` con `color-scheme` (`:93`) y los alias redefinidos (`:96–134`) |
| `src/assets/main.css:30-32` | Import del tema después de los tokens, con el porqué |
| `src/assets/__tests__/theme-dark.spec.ts:1` (nuevo) | Wiring (`:158`, `:167`), fondos oscuros (`:190`), pares completos y bien formados (`:198`), contraste WCAG (`:206`), cobertura del puente (`:210`), sin colores crudos en los `.vue` (`:238`) |
| `docs/conventions.md:270` | «La app es solo oscura»: alias semánticos al portar, fondos claros prohibidos y cómo añadir un par; se quita «dark mode» de los pendientes |
| `docs/stack.md:187` | «Tema oscuro: dónde vive»: archivo, orden del import, por qué basta con los alias y qué vigila el test |
| `progress/implementation/dark-theme/*.png` (nuevo) | Las 10 capturas de antes y después |
| `progress/current.md` | Bitácora de la sesión |

No se tocó: `src/assets/styles/`, `design-system/`, `e2e/`, ningún `.vue`, el backend ni
`package.json` (no hay dependencias nuevas).

## Tests

- **`src/assets/__tests__/theme-dark.spec.ts`: 91 tests.**
  - 2 de wiring.
  - 11 de fondos oscuros.
  - 1 que comprueba que los pares están bien formados.
  - 61 pares de contraste.
  - 1 de cobertura del puente.
  - 14 de «sin colores crudos», uno por `.vue`.
- **Comprobé que fallan cuando deben**, y después restauré los archivos:
  - Con `--surface-card: var(--neutral-200)` y `--ink-faint: var(--neutral-500)` en el tema:
    31 fallos (fondo claro y contrastes).
  - Con `bg-white` metido en `BaseCard.vue`: falla «BaseCard.vue has no raw colors».
- **`src/assets/__tests__/styles.spec.ts`** (el que vigila las copias literales): sigue verde
  sin cambios.
- **`src/assets/__tests__/tailwind-sources.spec.ts`** sigue teniendo sentido y no hizo falta
  cambiarlo:
  - Sus sondas (`text-`+`ink-link`, etc.) siguen sin usarse en `src/`. Los archivos nuevos
    solo nombran tokens como `--ink-link`, no utilidades.
  - `App.vue` sigue usando `bg-surface-app` y `text-ink-body`, y el bundle las emite.
- **E2E de humo `e2e/app-boot.spec.ts`:** sin cambios y en verde. Compara el fondo del shell
  con `--surface-app` resuelto, que ahora es `neutral-800`.

## Verificación

```
pnpm type-check   → vue-tsc --build, sin errores (exit 0)
pnpm lint         → oxlint + eslint, sin errores (exit 0)
pnpm test:unit    → Test Files 17 passed (17) · Tests 249 passed (249)
pnpm build        → ✓ built; dist/assets/index-*.css 24.95 kB
./init.sh         → exit 0
```

Extracto del último `./init.sh`:

```
[OK]    Type check OK (tsc sin errores)
 Test Files  17 passed (17)
      Tests  249 passed (249)
[OK]    Todos los tests pasan
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

## Acceptance → evidencia

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Tokens semánticos redefinidos en un archivo propio global | `theme-dark.css:91`, `main.css:32`; test `:158` y `:167` |
| 2 | Ningún fondo claro | test `:190` (11 fondos ≤ `neutral-700`); escaneo de estilos computados en 5 rutas; capturas `after-*` |
| 3 | Todos los `.vue` revisados y listados | tabla «Componentes revisados» |
| 4 | Solo alias semánticos en los SFC | test `:238` (14 SFC) |
| 5 | Sin tocar `styles/` ni `design-system/` | `git status`; `styles.spec.ts` en verde |
| 6 | Contraste medido automáticamente | test `:206` sobre 61 pares leídos del tema; tabla de contrastes |
| 7 | Estados de Patrimonio visibles | `after-state-loading/error/edge-cases.png` y `after-net-worth.png` (entrada activa); pares de cargando, error, faint, negative, badges y sidebar activa |
| 8 | Sidebar oscura y distinta de la zona central | `--surface-inverse: neutral-950` frente a `--surface-app: neutral-800`; par `>= 1.25` (da 1.34) |
| 9 | Documentación | `docs/conventions.md:270`, `docs/stack.md:187` |
| 10 | Chromium real con backend y capturas de antes y después | sección «Comprobación visual» |
| 11 | Sin cambios de contenido; e2e intacto | ningún `.vue` ni `e2e/` tocado; smoke en verde dentro de `init.sh` |
| 12 | Verificaciones en verde | sección «Verificación» |

## Sugerencias fuera de alcance (no aplicadas)

- **Botón de Vue DevTools** (blanco, solo en `pnpm dev`): si molesta, se puede desactivar el
  plugin o su botón flotante en `vite.config.ts`. No es UI de la app ni sale en el build.
- **Iniciales de banco a 4.5:1:** haría falta un índigo y un púrpura de chart más claros, y
  esos tonos no existen en la paleta del design system.
- **Comprobar el orden de `:root` en el bundle:** hoy lo cubren el test del orden de los
  imports y la verificación en navegador. `tailwind-sources.spec.ts` ya compila el bundle, así
  que podría comprobar también que el último `--surface-card` es el oscuro.
- **`--ring-brand`** (el anillo de foco, no expuesto como utilidad) sigue siendo el verde
  `green-600` al 30 %. Cuando haya inputs o botones con foco, conviene medirlo en oscuro.
- Las sombras (`shadow-sm`…) apenas se ven sobre fondo oscuro; los bordes ya separan las
  tarjetas.

## Cambios tras la revisión (CHANGES_REQUESTED, `progress/reviews/dark-theme.md`)

Solo documentación y comentarios. No cambia ningún valor de color ni ningún componente.

1. **Excepción de la inicial de banco escrita donde se mide.** En `src/assets/theme-dark.css`
   la cabecera avisa de que hay una única excepción de texto. Junto a las líneas
   `contrast: --ink-on-brand on --chart-*` hay un comentario que explica por qué ese texto se
   mide a 3:1 (`aria-hidden`, repite la inicial del nombre visible al lado, WCAG exime el texto
   decorativo; índigo 4.25 y púrpura 4.48 con la tinta más oscura de la paleta). También la
   acota: vale **solo** para texto oculto a tecnologías de asistencia **y** redundante con un
   texto visible al lado. En `src/assets/__tests__/theme-dark.spec.ts`, una línea junto a
   `PAIR` remite a esa explicación.
2. **Regla futura.** `docs/conventions.md` (sección «La app es solo oscura», punto de añadir
   pares) recoge la excepción acotada a la regla «4.5:1 texto / 3:1 barras, bordes e iconos».
3. **Cifra corregida** en «Notas» de los tokens: sobre tarjetas, 4.47 (rojo) y 3.63 (azul);
   el 3.6 y el 2.9 eran sobre la zona central.

