# Review — feature 4 `design-tokens`

**Veredicto:** APPROVED

- **Fecha:** 2026-07-20
- **Agente:** reviewer
- **Base de revisión:** feature **sin** `"sdd": true` → bloque `intent` +
  `acceptance` de la feature 4 en `feature_list.json`, `docs/stack.md`,
  `docs/conventions.md`, `docs/architecture.md`, `docs/verification.md` y
  `CHECKPOINTS.md`. Informe del implementer:
  `progress/implementation/design-tokens.md`.
- **Todo lo verde de abajo está reproducido por el reviewer**, no dado por bueno
  del informe: gate completo re-ejecutado + inspección del CSS compilado +
  estilos computados en Chromium (dev y preview).

## Trazabilidad requirements ↔ tests (solo SDD)

No aplica — la feature no tiene `"sdd": true`; no existe `specs/design-tokens/`.

## Tasks completas (solo SDD)

No aplica — feature de flujo simple, sin `tasks.md`.

## Criterios de aceptación (siempre)

### 1. Tokens copiados a `src/assets/styles/` sin alterar valores y cargados desde `main.css` — [x] CUMPLE

Verificado **archivo por archivo con `diff`**, no por la palabra del implementer:

| Fuente | Copia | Resultado del `diff` |
|---|---|---|
| `design-system/fonts.css` | `src/assets/styles/fonts.css` | **idéntico** (0 diferencias) |
| `design-system/tokens/typography.css` | `src/assets/styles/tokens/typography.css` | **idéntico** |
| `design-system/tokens/spacing.css` | `src/assets/styles/tokens/spacing.css` | **idéntico** |
| `design-system/tokens/colors.css` | `src/assets/styles/tokens/colors.css` | **solo** el bloque de 7 alias (líneas 81-90) |
| `design-system/tokens/base.css` | `src/assets/styles/tokens/base.css` | **solo** 4 líneas: 13, 21, 41, 56 (usos de los alias) |

**Ningún VALOR cambia en ninguno de los cinco archivos.** El hunk de
`colors.css` es exclusivamente el renombrado; los lados derechos
(`var(--neutral-900)`, `var(--neutral-700)`, `var(--neutral-500)`,
`var(--neutral-400)`, `var(--neutral-0)`, `var(--neutral-50)`,
`var(--blue-500)`) son idénticos a la fuente. En `base.css` solo cambia el
nombre dentro de `var(...)`; ninguna propiedad ni valor más.

Carga desde `src/assets/main.css:8` (fonts) y `:20-23` (colors, typography,
spacing, base), después de `@import 'tailwindcss'` (`main.css:10`).

> Observación menor (no bloquea): la copia añade un comentario explicativo de
> 3 líneas en `src/assets/styles/tokens/colors.css:81-83` que no está en la
> fuente. No es un cambio de nombre ni de valor, y el test lo tolera a
> propósito (`styles.spec.ts:14`, que descarta comentarios antes de comparar);
> el archivo ya no podía ser byte-idéntico por el renombrado. Documentado bien
> en `docs/stack.md:86-93`.

### 2. Los 7 alias `--text-*` → `--ink-*` en la copia, tamaños intactos — [x] CUMPLE

Los 7 exactos, con valor conservado, en `src/assets/styles/tokens/colors.css:84-90`:
`--ink-strong`, `--ink-body`, `--ink-muted`, `--ink-faint`, `--ink-on-brand`,
`--ink-on-dark`, `--ink-link`. Ni uno más, ni uno menos (el `diff` no muestra
ninguna otra línea tocada en el archivo).

La escala de tamaños sigue en `--text-*`: `typography.css` es **byte-idéntico**
a la fuente, luego `--text-2xs`…`--text-5xl` no se han rozado. Confirmado en el
navegador: `--text-base` computa 14px (no los 16px de Tailwind) y `.text-2xs`
computa 11px = `0.6875rem`.

La referencia queda re-copiable: `design-system/tokens/colors.css` sigue con
`--text-strong` (guardado por `styles.spec.ts:103-108`).

### 3. `main.css` expone los tokens vía `@theme inline` — [x] CUMPLE

`src/assets/main.css:32-111`. **Ninguna entrada incrusta un valor**: las 47
entradas mapean a `var(--token)` (verificado a mano y guardado por el test
`maps every theme entry to a token var instead of copying its value`,
`styles.spec.ts:54-64`). Eso es lo que mantiene la re-copia como único paso de
actualización.

Comprobado sobre el CSS **compilado** (`dist/assets/index-*.css`), no sobre el
fuente:

```
.bg-surface-app{background-color:var(--surface-app)}
.text-ink-muted{color:var(--ink-muted)}
.border-line-subtle{border-color:var(--border-subtle)}
.bg-chart-3{background-color:var(--chart-3)}
.rounded-pill{border-radius:var(--radius-pill)}
.font-display{font-family:var(--font-display)}
.shadow-sm{--tw-shadow:var(--shadow-sm);…}
```

El hallazgo 1 del implementer (`--shadow-*` no encaja solo) queda confirmado:
`.shadow-sm` referencia el token y en Chromium pinta
`rgba(11,17,22,.07) 0 1px 3px` — la sombra del diseño, no la de Tailwind.

**Sobre la capa `@theme inline` y valores hardcodeados:** no reintroduce
ninguno. Verificado además el orden real en el bundle: las entradas
autorreferenciales que Tailwind emite en su `:root`
(`--font-display:var(--font-display)`, offset 1813;
`--shadow-sm:var(--shadow-sm)`, offset 1614) quedan **antes** de las
definiciones reales de los tokens (offsets 11544 y 12647), así que la cascada
resuelve al valor del diseño. Ese orden es justo lo que fija el test
`imports the tokens after Tailwind…` (`styles.spec.ts:44-52`); sin él, estas
custom properties quedarían inválidas y las utilidades se romperían en
silencio. Invariante frágil, pero **cubierta por test**.

### 4. `docs/stack.md` con la tabla de equivalencias de los 7 renombrados — [x] CUMPLE

`docs/stack.md:110-124`: tabla `design system → proyecto → utilidad Tailwind`
con las 7 filas, más el aviso de que `--text-muted` es color pero `--text-base`
es tamaño (`docs/stack.md:122-123`). Sirve exactamente para lo que pide el
intent: traducir al portar un componente de la referencia.

### 5. Las 3 fuentes cargan; `body` con `--font-sans` y `--surface-app` — [x] CUMPLE

**Verificado por el reviewer en Chromium (Playwright), leyendo estilos
computados**, contra `pnpm dev` y contra el build de producción (`pnpm preview`):

| Comprobación | Valor computado | Token |
|---|---|---|
| `body` background | `rgb(247, 249, 251)` | `--surface-app` → `--neutral-50` ✅ |
| `body` font-family | `"Hanken Grotesk", system-ui, …` | `--font-sans` ✅ |
| `body` color | `rgb(56, 67, 79)` | `--ink-body` → `--neutral-700` ✅ |
| `body` font-size | `14px` | `--text-base` ✅ |
| shell de `App.vue` | `rgb(247, 249, 251)` / `rgb(56, 67, 79)` | `bg-surface-app` / `text-ink-body` ✅ |
| `document.fonts` | `Hanken Grotesk`, `JetBrains Mono`, `Schibsted Grotesk` | las 3 del diseño ✅ |
| sonda `bg-brand` | `rgb(10, 143, 95)` | `--brand` `#0A8F5F` ✅ |
| sonda `border-line-subtle` | `rgb(227, 232, 237)` | `--border-subtle` → `--neutral-200` ✅ |
| sonda `text-ink-muted` | `rgb(107, 119, 133)` | `--ink-muted` → `--neutral-500` ✅ |

El hallazgo 2 (el `@import` remoto debe ir primero) también reproducido: en
`dist/assets/index-*.css` el `@import` de Google Fonts está en el **offset 0**
del archivo. La invariante está guardada por `styles.spec.ts:35-42`.

### 6. Referencia movida a `design-system/`, íntegra, fuera de tsconfig y ESLint — [x] CUMPLE

- `src/design-system-source/` ya no existe; `design-system/` tiene **83
  archivos** y conserva su estructura completa (`readme.md`, `SKILL.md`,
  `styles.css`, `fonts.css`, `tokens/`, `components/`, `cards/`, `ui_kits/`,
  `assets/`). Legible como referencia.
- **tsconfig:** `tsconfig.app.json:3` incluye solo `env.d.ts` y `src/**/*`; al
  estar en la raíz, la carpeta queda fuera sin necesidad de un `exclude`.
  `pnpm type-check` (vue-tsc) exit 0.
- **ESLint:** `eslint.config.ts:23` (`globalIgnores([… 'design-system/**'])`).
  Comprobado: `npx eslint design-system` → 0 archivos linteados.
- **oxlint:** `.oxlintrc.json:3` (`ignorePatterns`). Comprobado:
  `npx oxlint design-system` → *No files found to lint*.
- **Prettier:** `.prettierignore:4,7`. Comprobado que la exclusión **hace
  trabajo real**: con `--ignore-path .gitignore`, Prettier reformatearía tanto
  `src/assets/styles/tokens/colors.css` como `design-system/tokens/colors.css`;
  con el `.prettierignore` de la feature, ninguno de los dos. La decisión 5 del
  implementer no es teórica.

### 7. `docs/stack.md` actualizado (de dónde salen, dónde viven, cómo se consumen) — [x] CUMPLE

`docs/stack.md:60-172`. Cubre origen y política de solo-lectura (64-76),
ubicación y tabla fuente→copia (78-96), la colisión `--text-*` (98-124), el mapa
de utilidades por grupo (125-147), las 4 razones no obvias del montaje de
`main.css` (149-164) y la deuda de webfonts por CDN (166-169). Puntero añadido
desde la sección de estilos previa (`docs/stack.md:56-57`).

### 8. `docs/conventions.md` → Estilos/UI actualizado, guía de contenido NO adoptada — [x] CUMPLE

`docs/conventions.md:166-200`. Dice explícitamente que se usan los alias
semánticos y nada de hex ni paleta de serie (173-177), y el bloque de
`docs/conventions.md:188-193` deja por escrito que **la guía de contenido del
design system no se adopta**: el texto de cara al usuario sigue en inglés y el
formato de moneda/fechas se decide aparte. Coincide con el `que_no_quiero` del
intent. Añadido también el aviso de no editar a mano las copias (198-200).

### 9. `pnpm build`, `pnpm type-check` y `./init.sh` en verde — [x] CUMPLE

**Re-ejecutado por el reviewer, salida real:**

```
./init.sh        exit 0  — Type check OK · Test Files 5 passed (5) · Tests 37 passed (37)
                          "[OK] Entorno listo."
pnpm type-check  exit 0  — vue-tsc --build
pnpm lint        exit 0  — oxlint . --fix (0) · eslint . --fix --cache (0)
                          git status idéntico después: --fix no cambió nada
pnpm build       exit 0  — dist/assets/index-DkEZ2Yoc.css 15.76 kB │ gzip 4.27 kB
                          dist/assets/index--KfSZlR_.js  87.22 kB │ gzip 34.09 kB
npx prettier --check src/  exit 0 — "All matched files use Prettier code style!"
npx prettier --check .     exit 1 — 31 archivos, TODOS .md/.json/.html del arnés
                                    (AGENTS.md, docs/*, progress/*, specs/*,
                                    index.html, pnpm-lock.yaml…). Condición
                                    preexistente y global: el script del proyecto
                                    es `prettier --write src/`. Ningún archivo de
                                    código de esta feature falla.
```

### 10. Política de `@apply` respetada — [x] CUMPLE

Cero usos de `@apply` en todo `src/` (grep). La única coincidencia es el
comentario de cabecera de `src/assets/main.css:1-3`, que documenta la excepción
y el punto de `@reference`, tal como pide `docs/conventions.md:202-213`. El
estilo se hace con utilidades en el `<template>` (`src/App.vue:2`), sin
`<style scoped>`.

## La "decisión propia" del implementer: bordes como `line-*`

**Aceptada.** Está razonada y es la elección correcta:

- Mapear 1:1 daría `--color-border-subtle` → `border-border-subtle` (tartamudea).
- Aplanar a `--color-subtle/default/strong` generaría **`text-strong`** como
  color de *borde*, colisionando semánticamente con `text-ink-strong` (color de
  *texto*). Es un generador de bugs silenciosos real, no una excusa.
- `--color-line-*` (`src/assets/main.css:87-90`) mantiene la regla "un prefijo
  por grupo" que ya siguen `surface-`, `ink-` y `chart-`. Coherente con el resto
  del naming.
- **No toca la copia**: los tokens siguen llamándose `--border-*` en
  `src/assets/styles/tokens/colors.css:93-96`; `line-*` es solo el nombre de la
  utilidad en la capa puente. La re-copia sigue intacta.
- Está documentado donde se busca: `docs/stack.md:138` y
  `docs/conventions.md:174`.

## El test de `App.spec.ts`: ¿se relajó para pasar?

**No.** `src/__tests__/App.spec.ts:19-31` afirma **más** que antes, no menos:
las tres clases del shell (`min-h-screen`, `bg-surface-app`, `text-ink-body`) y
además una aserción negativa que fija la regresión que esta feature existe para
evitar (`not.toContain('bg-gray-50')`, línea 30). Los otros dos tests del
archivo (outlet presente, outlet dentro del shell) siguen intactos. La
limitación de jsdom está declarada en el comentario de las líneas 20-22 y
compensada con la verificación en navegador, no escondida.

## Arquitectura (docs/architecture.md)

- [x] `src/App.vue` sigue siendo un shell tonto (`<RouterView />` + clases); no
      se ha portado ningún componente de React, como pedía el `que_no_quiero`.
- [x] Ubicación correcta: los CSS son assets de app (`src/assets/`), no código
      de `features/`, `shared/` ni `services/`. La referencia queda **fuera** de
      `src/` por ser material que no se compila.
- [x] **Cero dependencias nuevas**: `package.json` y `pnpm-lock.yaml` no
      aparecen en `git status`. Lucide sigue sin instalar, como marcaba el scope.
- [x] Sin `console.log` ni TODOs sueltos en los archivos tocados (grep).

## Convenciones (docs/conventions.md)

- [x] Idioma: nombres de archivo, identificadores, comentarios y nombres de test
      en inglés (`styles.spec.ts`, `keeps the type scale on the --text-* namespace…`);
      docs y `progress/` en español. Correcto.
- [x] Estilo: comillas simples, sin `;`, 2 espacios, ≤100 columnas;
      `prettier --check src/` limpio y `eslint`/`oxlint` en 0.
- [x] Imports: en `styles.spec.ts:1-3`, vendor/node primero y los helpers
      después; `src/main.ts` sin cambios.
- [x] Comentarios: cortos y explican el *por qué* no obvio (por qué `fonts.css`
      va primero, por qué se listan todas las sombras). Justo lo que pide
      `docs/conventions.md:148-157`.
- [x] Manejo de errores: no aplica, la feature no añade lógica.

## Verificación (docs/verification.md)

- [x] Tests con recursos reales, sin mocks innecesarios: `styles.spec.ts` lee
      del disco los CSS reales de la copia **y de la fuente** y los compara
      (`styles.spec.ts:5-9`). Es la forma correcta de vigilar una copia.
- [x] Tests con output concreto, no "no lanza excepción": comparan mapas de
      declaraciones (`:74`), igualdad byte a byte (`:77-82`), valores concretos
      (`--text-base` = `0.875rem`, `:87`) y ausencia de alias obsoletos (`:98-100`).
- [x] Camino de error / regresión cubierto: cada test fija una invariante que el
      propio informe demuestra que se rompe **en silencio** (orden de imports,
      hex incrustado en `@theme`, valor editado en la copia, rename olvidado,
      referencia contaminada). No son espejos del código.
- [x] Nivel 3 (smoke) hecho y **reproducido** por el reviewer en dev y preview.
- [x] Honestidad sobre los límites: el informe declara que los unit tests no
      pueden probar el pintado y que la prueba real es el navegador
      (`progress/implementation/design-tokens.md:163-169`). Se comparte el
      criterio: jsdom no computa Tailwind.

## CHECKPOINTS.md

- [x] **C1 — Arnés completo**: archivos base y `docs/` presentes; `./init.sh`
      exit 0 (reproducido).
- [x] **C2 — Estado coherente**: solo la feature 4 en `in_progress`; las `done`
      (1, 2, 3) con tests que pasan (37/37); `progress/current.md` describe la
      sesión activa, sin basura de sesiones anteriores.
- [x] **C3 — Arquitectura**: estructura conforme; **0 dependencias nuevas**; sin
      logs de debug ni TODOs; convenciones respetadas.
- [x] **C4 — Verificación real**: 10 tests nuevos para el módulo nuevo, +3 del
      shell, ejecutados en el entorno de `docs/verification.md`; todos pasan.
- [x] **C5 — Sesión cerrada bien**: sin archivos temporales ni basura; los
      untracked (`design-system/`, `src/assets/styles/`, `src/assets/__tests__/`,
      `.prettierignore`, `progress/implementation/design-tokens.md`) pertenecen
      todos a la feature; `dist/` y `.eslintcache` git-ignored. La entrada de
      `progress/history.md` y el `status: done` los pone el implementer al
      cerrar, después de este veredicto (sesión aún abierta).
- [x] **C6 — Proyectos hermanos**: la feature no toca el contrato de la API; no
      hay endpoints ni tipos inventados.
- [x] **C7 — SDD**: no aplica (feature sin `"sdd": true`).
- [x] **C8 — Resumen de cierre escrito**: `progress/summaries/design-tokens.md`.

## Resumen de cierre (si APPROVED)

- Escrito en `progress/summaries/design-tokens.md` → **sí**

## Cambios requeridos (si aplica)

**Ninguno.** La feature cumple los 10 criterios de `acceptance` y los 4 puntos
del `como_se_que_esta_bien` del `intent`.

## Notas no bloqueantes (para el humano, antes de commitear)

1. **El CSS de producción sale más grande de lo que dice el informe: 15.76 kB,
   no 9.79 kB.** No es un fallo del cableado; es la detección automática de
   fuentes de Tailwind. Al excluir `design-system/` (acertado) se pasó por alto
   que Tailwind también escanea los `.md` del arnés, y esta feature ha llenado
   `docs/stack.md` con **tablas que enumeran todas las utilidades**. Resultado
   comprobado en `dist/assets/index-*.css`: se emiten `.bg-chart-3`,
   `.fill-chart-3`, `.text-positive`, `.bg-negative-subtle`,
   `.border-line-subtle`, `.rounded-pill`, `.text-ink-muted`, `.container` (×6),
   `.flex`, `.grid`, `.text-red-500` y `.text-gray-900` — **ninguna** se usa en
   `src/`. `text-red-500` y `bg-gray-50` vienen literalmente de los ejemplos de
   `docs/conventions.md` y de `App.spec.ts`.
   No afecta a lo que pinta la app y no está en el `acceptance`, pero crecerá con
   cada documento que se escriba. **Sugerencia para una tarea de mantenimiento:**
   acotar las fuentes en `src/assets/main.css` (limitar `@source` a `src/`, o
   añadir `@source not` para `docs/`, `progress/` y `specs/`) y comprobar que el
   bundle vuelve a la zona de los 10 kB. No lo arregles dentro de esta feature.
2. **`vite.config.ts` lleva un cambio sin commitear que NO es de esta feature**:
   alguien eliminó `vueDevTools()` de los plugins (el paquete
   `vite-plugin-vue-devtools` sigue en `package.json` y `docs/stack.md:176-177`
   lo sigue listando como tooling activo). El implementer hizo lo correcto: lo
   señaló y no lo tocó. Antes de commitear, decide si se revierte o se asume (y
   entonces se actualiza `docs/stack.md` y se retira la dependencia). Ojo: es
   además el único `.ts` que `prettier --check` marca.
3. **`e2e/vue.spec.ts` sigue siendo el scaffold**: espera un
   `<h1>You did it!</h1>` que no existe desde la feature #1. Fallaría si se
   ejecutara `pnpm test:e2e`. Deuda preexistente, ajena a esta feature; no entra
   en el gate (`init.sh` no corre E2E). Merece su propia tarea, y sería el sitio
   natural para automatizar la verificación visual que aquí se ha hecho a mano.
4. **`pnpm preview` no monta la app**: el build de producción no tiene
   `VITE_API_URL` (no hay `.env.production`), así que `src/shared/config.ts`
   aborta el arranque con `ConfigError` y `#app` queda vacío. Preexistente de la
   feature #2 y correcto como *fail-fast*; solo tenlo en cuenta si alguien
   verifica estilos contra `preview` (el `body` sí se ve; el shell de `App.vue`
   no llega a renderizarse). En `pnpm dev` todo monta y se ve bien (verificado).
5. **Deuda ya conocida y documentada**: webfonts por CDN de Google (sin build
   offline), iconos Lucide sin instalar, formato de moneda/fechas por decidir, y
   `--num-features`/z-index/motion/layout vars copiados pero no expuestos como
   utilidad. Todas anotadas en `docs/stack.md` y en el informe del implementer;
   ninguna es un descuido.
