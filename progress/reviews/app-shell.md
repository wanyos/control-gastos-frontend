# Review — feature 8 `app-shell`

**Veredicto:** APPROVED

Fecha: 2026-09-12 · Revisor: reviewer · Flujo simple (no SDD): no existe
`specs/app-shell/` y no debe existir. Contrato validado: `intent` + los 10
`acceptance` de la feature 8 en `feature_list.json`.

## Alcance real del diff (separando el ruido)

La F7 y la Parte 3 del handoff **ya están commiteadas** (`0a3e9cb`, `99165ec`),
así que el working tree sin commitear es casi todo de la F8:

- Modificados: `index.html`, `package.json`, `pnpm-lock.yaml`, `src/App.vue`,
  `src/__tests__/App.spec.ts`, `src/router/index.ts`, `docs/stack.md`,
  `docs/conventions.md`, `docs/architecture.md`, `progress/current.md`,
  `feature_list.json` (solo `pending` → `in_progress` de la 8).
- Nuevos: `src/shared/components/{AppShell,AppSidebar,AppTopBar,PlaceholderView}.vue`,
  `src/shared/components/__tests__/AppShell.spec.ts`,
  `src/features/net-worth/views/NetWorthView.vue`,
  `src/router/__tests__/router.spec.ts`, `progress/implementation/app-shell.md`.
- **No tocados** (comprobado con `git diff --stat HEAD --` vacío y sin untracked):
  `e2e/`, `src/assets/` (incluido `styles/`), `design-system/`,
  `src/features/net-worth/types.ts`, `src/features/net-worth/service.ts`,
  `src/shared/config.ts`, `vite.config.ts`. `pnpm-workspace.yaml` tampoco.
  **La F8 no modifica nada de la F7**; solo añade `views/` en su carpeta.

## Criterios de aceptación

- [x] **1. Shell con sidebar izquierda y topbar arriba, portado de `Shell.jsx` a SFC Vue3**
  → `AppShell.vue:2-9` (flex: `AppSidebar` + columna con `AppTopBar` y `<main>`).
  Test `AppShell.spec.ts:25` (monta `aside`, `header` y las 5 entradas) y `:33`
  (un `svg` por entrada). Comprobado por mí en Chromium: sidebar
  `rgb(20,27,34)` = `--surface-inverse`, ancho 248px = `--sidebar-w`, topbar
  60px = `--topbar-h`.
- [x] **2. Rutas en inglés: `/net-worth` home real + placeholders `/overview`, `/movements`, `/investments`, `/import`**
  → `src/router/index.ts:28-62`; `/` redirige por nombre a `net-worth` (`:29`).
  Tests `router.spec.ts:19` (paths exactos y en orden), `:25` (`/` → `/net-worth`),
  `:35` (cada path resuelve a un componente). `/net-worth` monta
  `NetWorthView` (ruta real con su propia vista), las otras cuatro
  `PlaceholderView`.
- [x] **3. Nada en español (identificadores, archivos, rutas, texto de UI)**
  → grep de tildes/ñ sin resultados en los SFC nuevos, router, `App.vue` e
  `index.html`; grep de resumen/cuentas/movimiento/inversion/importar/patrimonio/buscar
  solo encuentra la aserción negativa de `AppShell.spec.ts:87`. Comentarios en
  inglés. Tests `router.spec.ts:69` (ningún label del `Shell.jsx` sobrevive en
  labels, paths ni nombres) y `AppShell.spec.ts:82` (wordmark).
- [x] **4. `RouterView` renderiza según la URL y la entrada activa se marca**
  → `RouterView` en `AppShell.vue:7`; `aria-current="page"` + clases activas en
  `AppSidebar.vue:24-26,34`. Tests `AppShell.spec.ts:46` (la vista enrutada
  vive dentro de `<main>`), `:54` (exactamente una activa y es la correcta),
  `:62` (cambio de ruta mueve activa, título y vista), `:75` (ruta fuera de la
  navegación: sin activa ni título). Además verifiqué en Chromium que **clicar**
  «Movements» y «Net Worth» cambia URL, título y activa, y que es navegación
  SPA (un marcador en `window` sobrevive: no hay recarga completa), con cero
  errores de consola.
- [x] **5. `index.html` con `lang="en"` y título descriptivo**
  → `index.html:2` y `:7` (`control·accounts — personal finance`). Confirmado en
  el documento servido.
- [x] **6. `src/features/` con una carpeta por feature**
  → `src/features/net-worth/views/NetWorthView.vue`, junto a los `types.ts` /
  `service.ts` de la F7, respetando `features/<feature>/views/` de
  `docs/architecture.md`. El shell va en `src/shared/components/` (transversal),
  anotado en el árbol de `architecture.md`.
- [x] **7. Lucide instalado y anotado en `docs/stack.md`; nota de `conventions.md` actualizada**
  → `package.json:20` `"@lucide/vue": "^1.45.0"` en `dependencies`; lockfile con
  `@lucide/vue@1.45.0` (peer `vue >=3.0.1`); `node_modules/@lucide/vue/package.json`
  es `@lucide/vue` **1.45.0**, `sideEffects: false`, ISC. **Comprobado en el
  registro npm**: `npm view lucide-vue-next deprecated` devuelve «Package
  deprecated. Please use @lucide/vue instead.» y el `latest` de `@lucide/vue` es
  1.45.0. Import por nombre en `src/router/index.ts:3` (ningún `import *`).
  Build de producción hecho por mí: el bundle contiene exactamente 5 iconos
  (`arrow-left-right`, `chart-line`, `file-up`, `layout-dashboard`, `wallet`).
  Anotado en `docs/stack.md:47` y sección *Iconos (Lucide)* (`:235`).
  `docs/conventions.md:214` ya no dice «no lo añadas» y es coherente con
  `stack.md` (paquete, import por nombre, color por `currentColor`, renombrado
  `line-chart` → `ChartLine`); «iconos (Lucide)» sale de la lista de pendientes.
- [x] **8. Solo alias semánticos; `src/assets/styles/` sin tocar**
  → grep sin hex, `rgb(a)`, `hsl`, paleta de serie de Tailwind, `!important` ni
  `@apply` en los SFC nuevos, router y `App.vue`. Utilidades usadas:
  `bg-surface-inverse`, `text-ink-on-dark(/70)`, `bg-accent/15`, `text-accent`,
  `bg-surface-app/85`, `border-line-subtle`, `bg-surface-card`, `text-ink-strong`,
  `text-ink-muted`; medidas vía token (`w-[var(--sidebar-w)]`,
  `h-[var(--topbar-h)]`, `z-[var(--z-sticky)]`, `max-w-[var(--container-max)]`).
  `git diff HEAD -- src/assets` vacío; `styles.spec.ts` verde.
- [x] **9. `pnpm type-check`, `pnpm lint`, `pnpm test:unit` y `./init.sh` en verde**
  → ejecutados por mí (ver *Verificación*).
- [x] **10. El e2e de humo sigue pasando sin cambios**
  → `git diff HEAD --stat -- e2e/` vacío (último commit que lo toca: `77e0072`,
  F6). Verde en la sección 6 de `./init.sh`.

## Puntos de atención pedidos

1. **Idioma**: cumplido (criterio 3). Rutas exactamente `/net-worth`,
   `/overview`, `/movements`, `/investments`, `/import`; `/` → `/net-worth`.
2. **Lucide**: el paquete y la versión existen de verdad y `lucide-vue-next`
   está deprecado de verdad (criterio 7).
3. **Enlaces azules**: `src/assets/styles/tokens/base.css:56-57` pinta
   `a { color: var(--ink-link) }` y `a:hover { text-decoration: underline }` sin
   capa. El arreglo es limpio:
   - color en el `<span>` hijo (`AppSidebar.vue:32-35`), con `RouterLink custom`
     + `v-slot` para poder poner las clases dentro. El icono hereda por
     `currentColor`. En Chromium: span activo `rgb(18,184,134)` = `--accent`,
     `svg` igual; el `<a>` sigue siendo `--ink-link`, pero no pinta texto propio.
   - subrayado anulado con un `<style scoped>` de una regla
     (`AppSidebar.vue:51-58`); compila a
     `nav a[data-v-df45b6ab]:hover{text-decoration:none}` (especificidad 0,2,2
     frente a 0,1,1), sin `!important` ni `@apply`. En Chromium, en hover:
     `text-decoration-line: none` y fondo `--ink-on-dark` al 5 %.
   - La nota de `docs/conventions.md:223` describe exactamente eso y es correcta.
4. **Tailwind**: todas las carpetas nuevas cuelgan de `src/` (dentro de
   `source('../')`); en el CSS de producción están `.text-accent`, la regla
   scoped y el resto. `tailwind-sources.spec.ts` sigue teniendo sentido: sus
   sondas de contaminación no dependen de la F8 y `App.vue` conserva sus clases.
   Ahora cubre una fracción menor de la UI (nota no bloqueante 2).
5. **Alcance**: `NetWorthView.vue` es un placeholder de 10 líneas con
   `TODO(feat-9)` con contexto; ni `fetch`, ni servicio, ni store. Lo omitido
   del `Shell.jsx` (búsqueda, campana, «Nuevo movimiento», avatar, tarjeta
   «Plan», logo SVG) es **razonable**: el `intent` pide sidebar con navegación y
   topbar con título; los cuatro primeros serían UI muerta y el `que_no_quiero`
   prohíbe inventar; el logo exigiría copiar un asset fuera del alcance. El
   acceptance no exige ninguno. Lo que define el parecido (sidebar oscura sticky
   de `--sidebar-w`, wordmark con punto en acento, entradas con icono de 17px,
   activa en verde translúcido, topbar sticky translúcida con blur, borde
   inferior y `h1` `text-xl` bold) está portado. Desviación menor aceptada: el
   texto activo es `--accent` (green-500) donde la referencia usa `--green-300`;
   no existe alias semántico para green-300 y la regla del proyecto manda alias.
   Correcto también: no se portan «Presupuestos» ni «Metas de ahorro» (no están
   en el roadmap) y sí «Import» (etapa E5 del roadmap, pedida en el acceptance).
6. **Activa y título**: `AppTopBar.vue:17` lee `route.meta.label`; la sidebar
   sale de `navEntries` (`src/router/index.ts:69`), derivado de `routes`: ruta,
   entrada y título no pueden desincronizarse.
7. **e2e**: sin cambios y verde.
8. **Tests**: prueban comportamiento real con un router de verdad
   (`createMemoryHistory`) y el shell montado entero, sin stubs: montaje,
   navegación, entrada activa única, reactividad al cambiar de ruta y el borde de
   ruta desconocida. No son adorno. El cambio de `App.spec.ts` es consecuencia
   legítima del diseño (el hijo del wrapper pasa a ser `AppShell`).

## Arquitectura (docs/architecture.md)

- [x] Organización por feature: vista en `features/net-worth/views/`, shell en `shared/components/`.
- [x] La UI no habla con la API: ningún `fetch(` en `.vue`; el placeholder no llama al servicio.
- [x] Componentes tontos: los SFC solo leen la ruta; el modelo de navegación vive en `navEntries`.
- [x] Sin estado global mutable nuevo; sin dependencias circulares (router → vistas; sidebar → router).
- [x] Dependencia nueva justificada y anotada en `docs/stack.md`.

## Convenciones (docs/conventions.md)

- [x] Nombres: componentes PascalCase, `HOME_ROUTE_NAME` constante real, `NavEntry` sin prefijo `I`.
- [x] Orden de bloques SFC `<template>` → `<script setup lang="ts">` → `<style scoped>`.
- [x] Imports: vendor → alias → relativos; `import type` para tipos (`RouteRecordRaw`, `LucideIcon`, `Router`).
- [x] Estilos: utilidades en el markup; `<style scoped>` solo donde ninguna utilidad puede ganar, y documentado.
- [x] `npx prettier --check src/` limpio; `pnpm lint` no modificó ningún archivo (hash del diff idéntico antes y después).
- [x] Manejo de errores: no aplica (no hay caminos de error nuevos); sin `console.log`.

## Verificación (docs/verification.md), ejecutada por el revisor

- `pnpm type-check` → `vue-tsc --build`, rc 0.
- `pnpm lint` → oxlint + eslint, rc 0, sin cambios en disco.
- `pnpm test:unit` → **9 archivos / 80 tests**, todos verdes.
- `vite build` (salida al scratchpad, sin tocar `dist/`) → OK; CSS 17,86 kB, JS 95,49 kB (37,42 kB gzip).
- `bash ./init.sh` → rc 0: type-check OK, 80/80, **E2E smoke verde (chromium)**, «Entorno listo».
- Chromium contra un dev server propio (script efímero, ya borrado): redirect
  `/` → `/net-worth`, clic navega en SPA, título y activa sincronizados, colores
  y medidas iguales a los tokens, cero errores ni avisos de consola.

- [x] Tests usan recursos reales (router real en memoria, componentes montados sin stubs).
- [x] Tests verifican output concreto (textos, paths, `aria-current`, contención en `<main>`).

## CHECKPOINTS.md

- [x] C1 — Arnés completo: archivos base y docs presentes; `./init.sh` exit 0.
- [x] C2 — Estado coherente: solo la 8 en `in_progress`; las `done` pasan sus tests; `progress/current.md` describe la sesión activa (handoff + F7 + F8 del mismo día).
- [x] C3 — Arquitectura: estructura coincide con `architecture.md` (actualizado); dependencia nueva justificada en `stack.md`; sin `console.log`; el único TODO lleva contexto (`TODO(feat-9)`).
- [x] C4 — Verificación real: 18 tests nuevos (router + shell) con camino feliz y borde (ruta desconocida); todo verde.
- [x] C5 — Sesión: sin archivos sospechosos sin trackear (`dist/` está ignorado; los scripts de revisión se borraron). La entrada en `progress/history.md` y el paso a `done` corresponden al cierre tras este veredicto, no a la revisión.
- [x] C6 — Proyectos hermanos: la F8 no consume ni altera el contrato; no se inventan endpoints.
- [ ] C7 — No aplica (no SDD).
- [x] C8 — Resumen de cierre escrito.

## Resumen de cierre

- Escrito en `progress/summaries/app-shell.md` → sí

## Cambios requeridos

Ninguno. Notas **no bloqueantes** para el futuro:

1. `src/shared/components/__tests__/AppShell.spec.ts`: la navegación se prueba
   con `router.push`, no con un clic en la entrada. El cableado manual
   `@click="navigate"` de `AppSidebar.vue:27` (necesario por usar `custom`) no
   tiene test unitario: si se borrase, el enlace seguiría funcionando pero con
   recarga completa, y ningún test fallaría. Lo verifiqué en navegador; un test
   con `trigger('click')` que compruebe la ruta resultante lo blindaría.
2. `src/assets/__tests__/tailwind-sources.spec.ts:118` solo comprueba las clases
   de `App.vue`; convendría ampliarlo a todos los `.vue` (sugerencia 2 del implementer).
3. Sin ruta catch-all: una URL desconocida pinta el shell vacío y Vue Router
   avisa en consola (lo fija `AppShell.spec.ts:75`). Es pantalla nueva, fuera del roadmap.
4. Wordmark `control·accounts` (`AppSidebar.vue:10`, `index.html:7`): traducción
   literal de un nombre de marca; que el humano lo confirme.
5. `AppSidebar.vue:29-31` y `:52-54`: comentarios de tres líneas, algo largos
   frente a «cortos y simples»; aportan el *por qué*, se aceptan.
