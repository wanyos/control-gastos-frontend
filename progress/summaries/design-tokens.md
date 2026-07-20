# Resumen — feature 4 `design-tokens`

Fecha de cierre: 2026-07-20
Intención original: `feature_list.json` → feature `design-tokens`, bloque `intent`
Spec (si SDD): no aplica (feature de flujo simple, sin spec)

## Qué hace ahora la app que antes no

La app ya se ve con **tu diseño**, no con los valores de fábrica. El fondo, la
tipografía (Schibsted / Hanken / JetBrains Mono), el tamaño de letra base, los
colores, los radios y las sombras del design system **control·cuentas** están
cargados en el proyecto y disponibles como clases de Tailwind. A partir de
ahora, cuando maquetes escribes `bg-surface-card`, `text-ink-muted`,
`border-line-subtle` o `text-positive` y sale el color exacto del diseño; no
tienes que copiar ningún código de color a mano.

Además, los defaults de Tailwind están sobrescritos con los tuyos: `text-base`
son 14px (no 16) y `rounded-md` son 10px. Es decir, incluso las clases de
siempre pintan ya con tus valores.

La carpeta del diseño se conserva entera en `design-system/` (ahora en la raíz
del repo) como material de referencia de solo lectura, para ir portando sus
componentes de React a Vue cuando toque.

## Por dónde se usa (puntos de entrada)

- **Al maquetar:** clases de utilidad en el `<template>` de cualquier `.vue`.
  El catálogo completo (qué nombre tiene cada token) está en `docs/stack.md:125-147`.
  Resumen: `brand*`, `surface-*`, `ink-*` (colores de texto), `line-*` (bordes),
  `positive/negative/warning/info` (+ `-subtle`), `chart-1…8`, `font-display`,
  `font-mono`, `text-2xs…text-5xl`, `rounded-*`, `shadow-*`.
- **Al portar un componente de `design-system/` a Vue:** usa la tabla de
  traducción de `docs/stack.md:110-124`. Solo hay que traducir 7 nombres
  (`var(--text-muted)` en la referencia es `var(--ink-muted)` aquí) y los textos
  al inglés.
- **Si regeneras el design system:** vuelve a copiar los CSS de `design-system/`
  sobre `src/assets/styles/` y aplica el renombrado de los 7 alias. Nada más;
  no hay valores duplicados en ningún otro sitio. Los tests avisan si algo se
  descuadra.
- **Espaciado:** no hay nada que aprender; la rejilla de 4px del diseño coincide
  con la de Tailwind, así que `p-4`, `gap-6`… ya son las correctas.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Hoja global: carga de fuentes primero (obligatorio) | `src/assets/main.css:8` |
| Hoja global: Tailwind | `src/assets/main.css:10` |
| Hoja global: exclusión de la carpeta de referencia del escaneo | `src/assets/main.css:15` |
| Hoja global: carga de los 4 CSS de tokens (después de Tailwind) | `src/assets/main.css:20-23` |
| Puente que convierte los tokens en clases de Tailwind | `src/assets/main.css:32-111` |
| Colores del diseño (copia) + los 7 alias renombrados | `src/assets/styles/tokens/colors.css:84-90` |
| Escala tipográfica (copia idéntica) | `src/assets/styles/tokens/typography.css` |
| Espaciado, radios, sombras, z-index, motion (copia idéntica) | `src/assets/styles/tokens/spacing.css` |
| Estilos base del `body` (fondo, tipografía, color) | `src/assets/styles/tokens/base.css:8-17` |
| Fuentes de Google (copia idéntica) | `src/assets/styles/fonts.css` |
| Shell de la app con los tokens | `src/App.vue:2` |
| Tests que vigilan que la copia no se altere | `src/assets/__tests__/styles.spec.ts:67-109` |
| Tests del orden de carga (fuentes y tokens) | `src/assets/__tests__/styles.spec.ts:34-65` |
| Test del shell con tokens (y sin la paleta de serie) | `src/__tests__/App.spec.ts:19-31` |
| Referencia fuera del lint / formateo | `eslint.config.ts:23`, `.oxlintrc.json:3`, `.prettierignore:4,7` |
| Documentación del sistema de tokens | `docs/stack.md:60-172` |
| Regla de maquetación con tokens | `docs/conventions.md:166-200` |

## Cumplimiento de la intención

Por cada punto del `como_se_que_esta_bien` del `intent`:

- ✅ **"Cuando arranco con pnpm dev, la app se ve con el fondo y la tipografía
  del diseño, no con los por defecto del navegador"** → se cumple. El reviewer
  lo comprobó abriendo la app en Chromium y leyendo los **estilos que el
  navegador calcula de verdad** (no el texto del CSS): el `body` sale con fondo
  `rgb(247,249,251)` (= `--surface-app`, tu `#F7F9FB`), tipografía
  `"Hanken Grotesk"` (= `--font-sans`), color de texto `rgb(56,67,79)`
  (= `--ink-body`) y tamaño base 14px. Las tres webfonts aparecen cargadas en
  `document.fonts`. El cableado que lo hace posible está fijado por tests
  (`src/assets/__tests__/styles.spec.ts:35-52`) y el shell por
  `src/__tests__/App.spec.ts:19-31`.
- ✅ **"Cuando maqueto un componente, puedo usar los colores y tamaños del
  diseño desde clases de Tailwind, sin copiar códigos de color a mano"** → se
  cumple. Se probaron clases reales en el navegador: `bg-brand` da
  `rgb(10,143,95)` (tu `#0A8F5F`), `border-line-subtle` da `rgb(227,232,237)`,
  `text-ink-muted` da `rgb(107,119,133)`, `rounded-pill` da 999px, `text-2xs`
  da 11px, `font-display` da Schibsted Grotesk y `shadow-sm` pinta **tu** sombra,
  no la de Tailwind. El test `styles.spec.ts:54-64` garantiza que ninguna de las
  47 clases lleve un color escrito a mano: todas apuntan al token.
- ✅ **"Cuando abro la carpeta del design system, sigue ahí entera y legible
  como referencia para portar componentes"** → se cumple. `design-system/` tiene
  sus 83 archivos intactos (readme, tokens, components, cards, ui_kits, assets)
  y **no se ha tocado ni una línea**: el renombrado de los 7 nombres se aplicó
  solo a la copia de `src/`. Hay un test que lo vigila
  (`src/assets/__tests__/styles.spec.ts:103-108`): si alguien "arregla" la
  referencia, el test falla. Queda además fuera del compilador, de los dos
  linters y del formateador, para que no moleste ni se reformatee sola.
- ✅ **"pnpm build y ./init.sh siguen en verde"** → se cumple; el reviewer los
  volvió a ejecutar: `./init.sh` exit 0 (type-check OK, **37/37 tests**),
  `pnpm type-check` exit 0, `pnpm lint` exit 0 (que antes de esta feature estaba
  **rojo**) y `pnpm build` exit 0. Evidencia en
  `progress/reviews/design-tokens.md`.

## Decisiones que se tomaron por ti

Lo que el `intent` marcaba como delegado, más lo que decidió el implementer:

- (delegado) **Cómo se conectan los tokens con Tailwind:** enfoque híbrido, tal
  como acordasteis. Los CSS se copian tal cual y encima va una capa puente
  (`src/assets/main.css:32-111`) que les pone nombre de clase. Ventaja concreta:
  regenerar el diseño es volver a copiar archivos, sin retraducir nada.
- (delegado) **Dónde vive la referencia:** `design-system/` en la raíz, fuera de
  `src/`, como acordasteis.
- (delegado) **La colisión de nombres `--text-*`:** los 7 **colores** de texto
  pasan a llamarse `--ink-*` (solo en la copia) y los **tamaños** se quedan
  igual. Tabla de traducción en `docs/stack.md:110-124`.
- (añadido) **Los bordes se llaman `line-*`, no `border-*`.** Es la única
  desviación respecto a los ejemplos del encargo y está bien traída: usar
  `border-*` habría creado una clase `text-strong` que significa "color de
  borde fuerte" y se confundiría con `text-ink-strong` ("color de texto
  fuerte"). Se escribe `border border-line-subtle`. Los tokens del CSS siguen
  llamándose `--border-*`; solo cambia el nombre de la clase.
- (añadido) **Se cambió el shell (`src/App.vue:2`)** de `bg-gray-50
  text-gray-900` a los tokens. Hacía falta: el gris de Tailwind tapaba tu fondo.
- (añadido) **`.prettierignore` nuevo.** Sin él, `pnpm format` reformateaba las
  copias y rompía su identidad con el original, convirtiendo cada re-copia en un
  diff eterno.
- (añadido) **Dos arreglos que evitan fallos silenciosos** (los encontró el
  implementer verificando el CSS real, y el reviewer los ha confirmado): las
  fuentes tenían que cargarse **antes** que Tailwind o desaparecían del build
  sin avisar; y las sombras había que declararlas una a una o Tailwind pintaba
  las suyas ignorando las tuyas.
- (añadido) **`--brand-on` no se expone como clase** por ser el mismo valor que
  `--ink-on-brand`; se usa `text-ink-on-brand`.

## Qué NO se tocó / quedó fuera

- **No se portó ningún componente** de React a Vue: la carpeta sigue siendo solo
  referencia, como pedía tu `que_no_quiero`.
- **No se maquetó ninguna pantalla ni el dashboard.** `App.vue` sigue siendo el
  cascarón (fondo, alto mínimo, color de texto) con el `<RouterView />` dentro.
- **No se adoptó la guía de contenido del diseño** (textos en español, `12.480,55 €`,
  voz en "tú"). Consta por escrito en `docs/conventions.md:188-193`: el texto de
  cara al usuario va en inglés y el formato de moneda/fechas se decide en su
  propia feature.
- **No se instaló ninguna dependencia.** Los iconos (Lucide) que el diseño da por
  supuestos siguen sin instalar: es una dependencia nueva y necesita su feature.
- **No se expusieron como clase** las escalas crudas (`--green-300`,
  `--neutral-700`…): la UI consume los alias semánticos, como manda el propio
  design system. Si algún día hace falta un peldaño crudo, sigue disponible como
  `var(--green-300)` en CSS.
- Tampoco se exponen aún los vars de layout (`--sidebar-w`, `--topbar-h`,
  `--container-max`), z-index y motion: están copiados y usables como `var(…)`,
  pero no encajan en ningún grupo de clases de Tailwind y todavía no hay layout
  que los use.

## Notas para el futuro (opcional)

- **El CSS de producción lleva peso de más (15.76 kB).** Tailwind escanea todo
  el repo buscando nombres de clase, y las tablas de `docs/stack.md` que
  enumeran las utilidades hacen que las genere **todas**, aunque no se usen en
  ninguna pantalla. No rompe nada, pero conviene acotarlo en una tarea de
  mantenimiento (limitar el escaneo a `src/`). Detalle y evidencia en
  `progress/reviews/design-tokens.md`, nota 1.
- **`vite.config.ts` tiene un cambio sin commitear que no es de esta feature:**
  alguien quitó `vueDevTools()` de los plugins. Decide si se revierte o se
  asume antes de commitear (si se asume, hay que actualizar `docs/stack.md` y
  quitar la dependencia).
- **Las webfonts vienen del CDN de Google** (`@import` remoto). Es deuda heredada
  del propio design system: sin conexión no hay tipografía. Si algún día se
  quiere build offline, hay que bajar los `.woff2` y sustituir el `@import`.
- **El test E2E `e2e/vue.spec.ts` sigue siendo el de ejemplo** de Vue y fallaría
  si se ejecutara (busca un texto que ya no existe). Deuda anterior a esta
  feature; sería el sitio natural para automatizar la comprobación visual que
  aquí se ha hecho a mano.
- **Recordatorio práctico:** no edites a mano nada dentro de `src/assets/styles/`.
  Son copias; si cambias un valor ahí, los tests fallan y la próxima re-copia se
  lo lleva por delante. Los cambios de diseño se hacen en el design system y se
  vuelven a copiar.
