# Stack del proyecto

> Este archivo describe QUÉ tecnologías usa el proyecto. Es el primero que
> debe leer un agente para entender el entorno antes de tocar nada.
>
> Estado: **rellenado desde la configuración real del repo** (package.json,
> tsconfig, vite/vitest/playwright config, prettier, editorconfig). Todo lo de
> aquí es descubrible; si algo cambia en esos archivos, actualiza este doc.

## Lenguaje

- **TypeScript** `~6.0.3` (rango en `package.json` → serie 6.0.x).
  **Bloqueado en la serie 6 a propósito**: ver *Mantenimiento de dependencias*
  → «Por qué TypeScript 7 no entra (todavía)».
- **Modo estricto: sí.** `strict: true` viene de `@vue/tsconfig` (base que
  heredan los tsconfig del proyecto vía `@vue/tsconfig/tsconfig.dom.json`).
  Además:
  - `noUncheckedIndexedAccess: true` (en `tsconfig.app.json`) — accesos a
    array/objeto pueden ser `undefined`.
  - `verbatimModuleSyntax: true` — obliga a `import type` / `export type`
    explícitos para tipos.
  - `moduleResolution: bundler`, `target: ESNext` con `lib: ES2022` (el target
    real de compilación lo fija Vite).
  - **`ES2023.Intl` añadido a `lib`** (feature #9) en `tsconfig.app.json` y en
    `tsconfig.vitest.json`: tipa `Intl.NumberFormat#format(string)` y
    `useGrouping: 'always'`. Los importes se formatean **desde el string decimal
    exacto** de la API (ECMA-402 NumberFormat v3), sin pasar por `number` ni
    castear; ver `src/shared/money.ts` y *Formato de cifras y fechas* en
    `docs/conventions.md`. Soporte en navegador: Chrome 106, Firefox 116,
    Safari 15.4.

## Framework / Runtime

- **Vue 3** `^3.5.40` — SFC (`.vue`) con Composition API. `jsx: preserve` /
  `jsxImportSource: vue` habilitados por si se usa TSX.
- **Runtime Node** — `engines`: `^22.22.2 || ^24.15.0 || >=26.0.0`. En desarrollo todo
  corre sobre Vite; no hay servidor propio (el backend es un proyecto hermano).

## Librerías clave

- **Estado / store:** Pinia `^4.0.2` — se usan *setup stores* (función que
  devuelve refs/computed/acciones). Se registra en `src/main.ts` como plugin
  base. Desde la v4, Pinia es **ESM-only** (sin problema: el proyecto es
  `"type": "module"` y se empaqueta con Vite) y **`@vue/devtools-api` `^8.2.1`
  es una peer dependency NO opcional que hay que declarar a mano** — por eso
  aparece en `dependencies` sin que ningún import de `src/` la nombre. No la
  quites «por no usarse»: sin ella Pinia no resuelve su peer. El store de ejemplo del scaffold (`src/stores/counter.ts`) se retiró en
  el bootstrap; los stores viven por feature en `src/features/<feature>/store.ts`
  (ver `docs/architecture.md`).
- **Routing:** Vue Router `^5.2.0` — `createWebHistory(import.meta.env.BASE_URL)`.
  Ver `src/router/index.ts`: desde la feature #8 declara las rutas reales del
  shell (`/` redirige a `/net-worth`), y su `meta.label` / `meta.icon` es la
  única fuente de verdad de la sidebar y del título de la topbar.
- **Iconos:** **Lucide** vía `@lucide/vue` — ver *Iconos (Lucide)* más abajo.
- **Validación de schemas:** ninguna instalada (no Zod, no Typebox). Decisión
  (feature #2, 2026-07-10): la configuración de entorno se valida **a mano** en
  `src/shared/config.ts` (una sola variable hoy; ver ADR-004 en
  `docs/architecture.md`). **Revisado en la feature #7** al consumir la primera
  respuesta de la API: se mantiene la validación a mano
  (`parseNetWorth` en `src/features/net-worth/service.ts`, ~60 líneas de
  guardas que lanzan `ValidationError` con el campo que falla). Vuelve a
  plantearse cuando haya varios endpoints con esquemas grandes; con uno solo,
  una librería de schemas no paga todavía su dependencia.
- **Cliente HTTP:** ninguno instalado (no axios); se usa `fetch` nativo.
  El cliente base vive en `src/services/http.ts` (feature #2): `createHttp()`
  con config inyectada + cliente `http` por defecto ligado a `appConfig`;
  normaliza fallos HTTP/red a `ApiError`.
- **Estilos:** **Tailwind CSS v4** (utility-first) — instalado en la feature #3
  (2026-07-10). Versiones exactas (lockfile): `tailwindcss` **4.3.3** +
  `@tailwindcss/vite` **4.3.3** (rango `^4.3.3` en `package.json`, dev deps).
  Configuración según la doc oficial de v4: plugin `tailwindcss()` registrado en
  `vite.config.ts` y CSS global `src/assets/main.css` con `@import 'tailwindcss'`,
  cargada como primera import de `src/main.ts`. **Sin** `tailwind.config.js` ni
  PostCSS (v4 no los necesita con el plugin de Vite).
  Política de uso y de `@apply`: `docs/conventions.md` → *Estilos / UI*.
  Los valores del theme (colores, tipografía, radios, sombras) los aporta el
  design system: ver *Design system y tokens* más abajo. Qué ficheros mira
  Tailwind para decidir qué CSS emite: ver *Qué ficheros escanea Tailwind*.
- **Test utils:** `@vue/test-utils` `^2.4.11`.

## Design system y tokens

> Feature #4 (`design-tokens`, 2026-07-14). **No se añadió ninguna dependencia.**

### De dónde salen

El design system **control·cuentas** lo generó el humano con Claude. La carpeta
original vive en **`design-system/`** (raíz del repo, fuera de `src/`), y es
**material de referencia de solo lectura**: se conserva íntegra y **no se toca**,
para (a) poder portar sus componentes React a Vue3 poco a poco y (b) poder
re-copiar los tokens si el design system se regenera. Su guía completa está en
`design-system/readme.md`.

Está fuera de `src/` a propósito: `tsconfig.app.json` incluye `src/**/*`, así que
dentro sus `.d.ts` de React entraban en el type-check. Además se excluye
explícitamente en `eslint.config.ts`, `.oxlintrc.json` (ambos glob-ean desde la
raíz, así que mudarla no bastaba) y `.prettierignore`.

### Dónde viven en el proyecto

Enfoque **híbrido**: los CSS de tokens se copian **tal cual** (mismos valores,
misma estructura que la fuente) a `src/assets/styles/`, y encima va una capa
`@theme inline` en `src/assets/main.css` que los mapea a los namespaces de
Tailwind. Así, si el design system se regenera, basta **volver a copiar** los
CSS sin retraducir nada.

| Fuente (`design-system/`) | Copia (`src/assets/`) | Cambios respecto a la fuente |
|---|---|---|
| `fonts.css` | `styles/fonts.css` | ninguno (idéntico) |
| `tokens/typography.css` | `styles/tokens/typography.css` | ninguno (idéntico) |
| `tokens/spacing.css` | `styles/tokens/spacing.css` | ninguno (idéntico) |
| `tokens/colors.css` | `styles/tokens/colors.css` | **solo** el renombrado `--text-*` → `--ink-*` (7 alias) |
| `tokens/base.css` | `styles/tokens/base.css` | **solo** los usos de esos 7 alias |
| `styles.css` (entry) | — | no se copia; su papel lo hace `main.css` |

`src/assets/__tests__/styles.spec.ts` vigila estas invariantes: si alguien edita
un valor de la copia o rompe el orden de imports, los tests fallan.

### La colisión `--text-*` y la tabla de equivalencias

El design system usa `--text-*` para **dos** cosas: los **tamaños** de fuente y
los **colores** de texto. En Tailwind v4 `--text-*` es el namespace de
*font-size*, así que los colores generarían utilidades rotas (`text-muted` sería
un tamaño con valor de color).

Los **tamaños** (`--text-2xs`…`--text-5xl`) se quedan igual: encajan con el
namespace nativo y lo sobreescriben **a propósito** (el diseño quiere
`text-base` = 14px, no los 16px de Tailwind). Los **7 alias de color** se
renombran a `--ink-*` **solo en la copia**.

**Tabla de traducción al portar un componente de `design-system/` a `src/`:**

| Design system | Proyecto (`src/assets/styles/`) | Utilidad Tailwind |
|---|---|---|
| `var(--text-strong)`   | `var(--ink-strong)`   | `text-ink-strong`   |
| `var(--text-body)`     | `var(--ink-body)`     | `text-ink-body`     |
| `var(--text-muted)`    | `var(--ink-muted)`    | `text-ink-muted`    |
| `var(--text-faint)`    | `var(--ink-faint)`    | `text-ink-faint`    |
| `var(--text-link)`     | `var(--ink-link)`     | `text-ink-link`     |
| `var(--text-on-brand)` | `var(--ink-on-brand)` | `text-ink-on-brand` |
| `var(--text-on-dark)`  | `var(--ink-on-dark)`  | `text-ink-on-dark`  |

> Ojo al portar: en la referencia `--text-muted` es un **color**, pero
> `--text-base` es un **tamaño**. Solo se renombran los 7 de arriba.

### Cómo se consumen desde Tailwind

**Criterio (decidido en la feature #4): se exponen como utilidad los alias
semánticos, no las escalas crudas.** El propio design system dice que la UI debe
consumir los alias (`--brand`, `--surface-app`, `--positive`), no las escalas
(`--green-300`, `--neutral-700`). Para un caso raro que pida un peldaño crudo,
sigue estando `var(--green-300)` en CSS.

| Grupo | Utilidades | Ejemplo |
|---|---|---|
| Marca | `brand`, `brand-hover`, `brand-active`, `brand-subtle`, `brand-subtle-2`, `accent` | `bg-brand`, `ring-brand/30` |
| Superficies | `surface-app`, `surface-card`, `surface-sunken`, `surface-inverse`, `surface-hover`, `surface-overlay` | `bg-surface-card` |
| Texto (ink) | `ink-strong`, `ink-body`, `ink-muted`, `ink-faint`, `ink-link`, `ink-on-brand`, `ink-on-dark` | `text-ink-muted` |
| Bordes (line) | `line-subtle`, `line-default`, `line-strong`, `line-brand` | `border border-line-subtle` |
| Señales | `positive`, `negative`, `warning`, `info` (+ `-subtle`) | `text-positive`, `bg-negative-subtle` |
| Charts | `chart-1`…`chart-8` | `bg-chart-3`, `fill-chart-3` |
| Tipografía | `font-display`, `font-sans`, `font-mono`; `text-2xs`…`text-5xl` | `font-mono tabular-nums` |
| Radios / sombras | `rounded-xs`…`rounded-2xl`, `rounded-pill`; `shadow-xs`…`shadow-xl`, `shadow-brand`, `shadow-inset` | `rounded-lg shadow-sm` |

**Espaciado: no se mapea nada.** La rejilla de 4px del design system
(`--space-1: 0.25rem`…) coincide con el `--spacing: 0.25rem` por defecto de
Tailwind, que ya genera `p-4`, `gap-6`… dinámicamente. `spacing.css` se copia
igualmente porque lleva radios, sombras, z-index, motion y layout vars.

**Notas de por qué `main.css` está montado así** (verificado contra el CSS
servido y contra los estilos computados en Chromium, no solo leído):

1. **`fonts.css` va antes que `@import 'tailwindcss'`.** Solo contiene un
   `@import` remoto a Google Fonts, y un `@import` remoto sobrevive al build
   únicamente si no le precede nada. Si se baja de sitio, las webfonts dejan de
   cargarse **en silencio** y la app cae a `system-ui`.
2. **Los tokens van después de Tailwind**, para que sus `:root` ganen a los
   valores por defecto del theme (así `text-base` = 14px y `rounded-md` = 10px).
3. **Las sombras se mapean una a una en `@theme inline`.** `--font-*`,
   `--text-*` y `--radius-*` generan utilidades que apuntan a `var(--token)`, así
   que el override por `:root` les basta; **`--shadow-*` no**: Tailwind incrusta
   sus propios valores en la utilidad e ignora el `:root`. Sin esos mapeos,
   `shadow-sm` pintaría la sombra de Tailwind, no la del diseño.
4. **El escaneo va por lista blanca** (`source('../')`): ver *Qué ficheros
   escanea Tailwind* más abajo.

### Qué ficheros escanea Tailwind (lista blanca)

> Feature #5 (`tailwind-source-whitelist`, 2026-07-20). Sin dependencias nuevas.

Tailwind v4 decide qué CSS emite **leyendo ficheros como texto plano** y
extrayendo lo que parezca un nombre de clase. Por defecto parte del directorio
de trabajo, así que escaneaba **todo el repo**: `docs/`, `progress/` y
`feature_list.json` citan nombres de utilidades al explicar cosas, y Tailwind
los tomaba por usados. El bundle traía `.bg-chart-3`, `.fill-chart-3`,
`.text-red-500`, `.container`… que ninguna pantalla usa.

La base del escaneo se fija en `src/assets/main.css`:

```css
@import 'tailwindcss' source('../');   /* main.css vive en src/assets/ → src/ */
@source '../../index.html';
```

**Por qué lista blanca y no exclusiones.** Ir excluyendo carpetas
(`@source not …`) es un juego de topos: solo tapa lo que ya has descubierto y la
contaminación crece sola (`progress/history.md` no se poda nunca). Declarar
dónde vive el código lo invierte. Consecuencias:

- Escribir documentación **ya no cambia** lo que se compila.
- El bundle vuelve a ser fiable para saber qué está vivo: si borras una clase
  del código, desaparece del CSS aunque un informe antiguo la nombre.
- La exclusión `@source not '../../design-system'` **se eliminó**: la carpeta de
  referencia está fuera de `src/`, así que ya no entra por definición.

**La consecuencia práctica, y la trampa:** un fichero con clases **fuera de
`src/` no se escanea salvo que se declare**. Si añades clases a `index.html` o a
cualquier plantilla externa sin su `@source`, se caen del CSS **en silencio**
(sin error de build). Por eso `index.html` se declara explícitamente aunque hoy
no lleve ninguna clase: es código de aplicación y vive en la raíz.

**Lo vigila un test de efecto**, no de configuración:
`src/assets/__tests__/tailwind-sources.spec.ts` compila el bundle de producción
real y comprueba que las clases citadas solo fuera de `src/` **no** están y que
las que usa `App.vue` **sí**. Un `grep` de `source('../')` no valdría: seguiría
pasando si el escaneo se ensancha por otra vía.

> Al escribir en este documento: los nombres de utilidad de las tablas de arriba
> **ya no contaminan** el bundle. El reverso es que `src/` sí se escanea entero,
> **tests incluidos**: una clase escrita literalmente en un `.spec.ts` acaba en
> el CSS de producción (por eso ese spec compone sus nombres en tiempo de
> ejecución).

**Deuda conocida (heredada del design system, ver `design-system/readme.md`):**
las webfonts se cargan desde el CDN de Google Fonts (`@import`), así que no hay
build offline ni `@font-face` local. Si algún día se quiere, hay que bajar los
woff2 y sustituir el `@import`.

**Iconos:** los iconos **Lucide** que el design system asume se instalaron en la
feature #8; ver *Iconos (Lucide)*.

### Iconos (Lucide)

> Feature #8 (`app-shell`, 2026-09-12). **Dependencia nueva aprobada** para esta
> feature.

- **Paquete:** `@lucide/vue` **1.45.0** (rango `^1.45.0` en `dependencies`; es
  código de runtime). Peer: `vue >=3.0.1`.
- **Por qué este paquete y no otro:**
  - Es el paquete **oficial** de Lucide para Vue. `lucide-vue-next`, el nombre
    histórico para Vue 3, está **deprecado** en npm («Please use @lucide/vue
    instead»); instalarlo hoy sería nacer con deuda.
  - El paquete plano `lucide` (vanilla, `createIcons()` sobre `data-lucide`, que
    es lo que hace la referencia React del design system) **no se usa**:
    reescribe el DOM por fuera de Vue y, al registrar iconos por nombre, empuja a
    importar el set entero.
- **Cómo no arrastra todo el set al bundle:** cada icono es un componente ESM
  independiente y el paquete declara `"sideEffects": false`, así que Vite solo
  empaqueta los que se importan **por nombre**:

  ```ts
  import { Wallet } from '@lucide/vue'          // sí: tree-shakable
  import * as icons from '@lucide/vue'          // no: mete los ~1.700 iconos
  ```

  Verificado en el build de producción de la feature #8: el bundle contiene
  exactamente los 5 iconos del shell (`wallet`, `layout-dashboard`,
  `arrow-left-right`, `chart-line`, `file-up`) y ninguno más; el JS total de la
  app queda en ~95 kB (37 kB gzip).
- **Tipo para pasar iconos como dato:** `LucideIcon` (`import type`). Se usa en
  `RouteMeta.icon` (`src/router/index.ts`).
- **Tamaño y color:** prop `:size` en px; el color lo hereda por `currentColor`,
  así que se tiñe con las utilidades de texto del contenedor (`text-accent`…),
  nunca con la prop `color`.

## Build / Dev tooling

- **Bundler / build tool:** Vite `^8.2.0` (`@vitejs/plugin-vue` 6 +
  `vite-plugin-vue-devtools`).
- **Gestor de paquetes:** **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`).
- **Alias de imports:** `@` → `./src` (definido en `vite.config.ts` y en los
  `paths` de `tsconfig.app.json`).
- **Comandos** (definidos en `package.json`):

  | Acción | Comando | Qué hace |
  |--------|---------|----------|
  | Dev | `pnpm dev` | Arranca Vite (por defecto `http://localhost:5173`). |
  | Build | `pnpm build` | `run-p type-check "build-only"` → type-check + `vite build`. |
  | Preview | `pnpm preview` | Sirve el build de producción (`4173`). |
  | Type-check | `pnpm type-check` | `vue-tsc --build` (incluye `.vue`). |
  | Lint | `pnpm lint` | `run-s lint:*` → `oxlint . --fix` y `eslint . --fix --cache`. |
  | Format | `pnpm format` | `prettier --write src/`. |

## Testing

- **Unitarios:** **Vitest** `^4.1.10`, entorno `jsdom` `^30.0.1`, con
  `@vue/test-utils`. El requisito de Node del proyecto lo marca **jsdom**, que
  es más estricto que Vite o Vue: ver *Restricciones / decisiones de versionado*.
  - Comando: `pnpm test:unit`.
  - Ubicación: co-localizados por módulo en `src/**/__tests__/*.spec.ts`
    (así lo esperan `eslint.config.ts` y `tsconfig.vitest.json`).
- **E2E:** **Playwright** `^1.62.1`. Tras subir de versión hay que refrescar los
  navegadores con `npx playwright install`; los binarios van atados a la versión.
  - Comando: `pnpm test:e2e`.
  - Ubicación: `e2e/`.
  - Navegadores: chromium, firefox, webkit. `baseURL` = `5173` en local
    (dev server) / `4173` en CI (preview). Config: `playwright.config.ts`.
  - **Headless por defecto en todos los modos** (para que la puerta de
    `./init.sh` no abra ventanas). Para observar la ejecución:
    `HEADED=1 pnpm test:e2e`.
  - **La puerta de `./init.sh` ejecuta solo chromium**
    (`pnpm test:e2e --project=chromium`) y termina en rojo si falla; si faltan
    los navegadores de Playwright, degrada con un aviso de instalación en vez
    de fallar. Los tres navegadores quedan disponibles con `pnpm test:e2e`.

#### E2E en cada modo (feature #6, 2026-08-10)

El e2e es una **prueba de humo de arranque real** (`e2e/app-boot.spec.ts`),
no una aserción sobre el scaffold: verifica que la app monta, que el shell
aplica el fondo y la tipografía del design system (comparando **estilos
computados** contra los tokens de `:root`, sin nombres de clase literales,
para no depender de —ni contaminar— el CSS de Tailwind) y que no hay errores
de consola ni de `pageerror` durante la carga.

Desde la feature #9 la home (`/net-worth`) pide `GET /api/net-worth` al montar.
Sin backend, el proxy responde 502 y Chromium lo escribe como error de consola,
así que el smoke **intercepta `**/api/net-worth` con `page.route`** y responde
una muestra pequeña y coherente con el contrato. Sigue probando el arranque
real, no la vista, y no depende de tener el backend en `:3000`.

- **Modo local (`pnpm test:e2e`)**: Playwright arranca el **dev server**
  (`npm run dev` → 5173) si no hay uno corriendo. `VITE_API_URL` se lee de
  `.env.development`.
- **Modo CI (`CI=true pnpm test:e2e`)**: Playwright arranca `npm run preview`
  contra el **build de producción** en 4173. Requiere `dist/` → ejecutar
  `pnpm build` antes. El puerto es sobreescribible con
  `E2E_PREVIEW_PORT` (útil si el 4173 cae en un rango de puertos excluidos por
  Windows en la máquina local, p. ej. 4151–4250). Aquí la app **también debe montar**: `VITE_API_URL` se
  hornea en el bundle desde `.env.production` en tiempo de build. El fail-fast
  de `src/shared/config.ts` **no se relaja**: si el entorno de build es
  inválido, la app se niega a arrancar y el e2e lo descubre (página en blanco
  + errores de consola).
- **Cobertura de la puerta (`./init.sh`, sección 6)**: solo chromium, contra
  el dev server. Es la red de seguridad diaria: si alguien rompe el arranque
  (config invalidada, tokens que dejan de cargar, CSS de producción que se
  cae), `./init.sh` termina en rojo.

## Base de datos / Persistencia

- **No aplica en el frontend.** No hay ORM ni acceso directo a datos. La
  persistencia vive en el backend hermano (**gastos-backend**: Fastify +
  Prisma + PostgreSQL) y se consume **solo por la API**.
- Fuente de verdad del contrato: `gastos-backend/docs/api-contract.md`
  (ver `docs/related-projects.md`).

## Restricciones / decisiones de versionado

- **Node bloqueado** a `^22.22.2 || ^24.15.0 || >=26.0.0` (campo `engines`).
  Ese suelo **no es arbitrario: lo dicta `jsdom` 30**, que es la dependencia más
  exigente del stack. Se subió el 2026-08-03 al actualizar jsdom, para que quien
  esté por debajo falle al instalar con un mensaje claro en vez de reventar a
  mitad de los tests. Si algún día se baja jsdom, este rango puede relajarse.
  El resto de dependencias usan rangos semver estándar (`^` / `~`) fijados en
  `package.json`; el lockfile es `pnpm-lock.yaml`.
- **Librerías prohibidas:** ninguna declarada aún. Si se decide vetar algo
  (p. ej. un UI kit para forzar componentes propios), anótalo en
  `docs/conventions.md` → *Estilos / UI* y aquí.
- **Bootstrap (feature #1, 2026-07-08):** se confirman las versiones ya fijadas
  en `package.json` (TypeScript `~6.0.3`, Vue `^3.5.39`, Vite `^8.1.3`, Pinia
  `^3.0.4`, Vue Router `^5.1.0`, Vitest `^4.1.10`) como línea base; **no se
  añadió ninguna dependencia nueva**. Se creó el esqueleto feature-based en
  `src/` (`features/`, `shared/`, `services/`, con `.gitkeep` para carpetas
  vacías) y se retiró el scaffold de ejemplo (`src/stores/counter.ts`). El
  cliente HTTP (`services/http.ts`) y Tailwind quedan para sus features
  respectivas (#2 y #3).

## Mantenimiento de dependencias

> Última pasada: **2026-08-03**. Tarea de mantenimiento, no una feature.

### Cómo se hace una actualización aquí

`ncu` lista lo desatendido, pero **no se sube todo de golpe**: si algo rompe,
mezclar 20 paquetes hace imposible saber cuál fue. El orden que funciona es:

1. Línea base: `./init.sh` en verde **antes** de tocar nada.
2. Todo lo **minor/patch** junto (`ncu -u --target minor`) → verificar.
3. Cada **major uno a uno**, verificando entre medias.
4. Cierre: `pnpm type-check`, `pnpm test`, `pnpm lint`, `pnpm build`.

`./init.sh` **no cubre** ni el lint ni el build (solo hace type-check, la suite
unitaria y, desde la feature #6, el e2e smoke en chromium). En una
actualización de dependencias hay que lanzarlos a mano.

### Por qué TypeScript 7 no entra (todavía)

TypeScript 7 está publicado (`~7.0.2`) y **la config del proyecto ya es
compatible**: no usa nada de lo que la 7 elimina (`baseUrl`, `outFile`,
`target: ES5`, `moduleResolution: node10`…). Aun así se **descarta a propósito**
y `typescript` se queda en `~6.0.3`, por dos motivos comprobados en el repo:

1. **`vue-tsc` 3.3.9 ni arranca.** TS 7 reestructuró los `exports` de su
   `package.json` y `vue-tsc` sigue resolviendo `typescript/lib/tsc`:
   `ERR_PACKAGE_PATH_NOT_EXPORTED`. Eso tumba `pnpm type-check` y, con él,
   `pnpm build`. Es un fallo duro, no un aviso.
2. **`typescript-eslint` no lo soporta.** Su peer es `>=4.8.4 <6.1.0` y sigue
   siéndolo en la última publicada (8.66.0). Entra por
   `@vue/eslint-config-typescript`, así que no se arregla subiendo nada.

**Cuándo reintentarlo:** cuando `vue-tsc` publique una versión que resuelva TS 7
y `typescript-eslint` amplíe su peer por encima de `<6.1.0`. Hasta entonces
`ncu` seguirá ofreciendo la 7: es esperado, no es un despiste.

### Otras trampas conocidas

- **`pnpm add` de un major puede añadir peers nuevas sin avisar en claro.**
  Comprueba siempre `pnpm peers check` después (así salió la peer no opcional
  `@vue/devtools-api` de Pinia 4).
- **`pnpm-workspace.yaml` crece solo.** Cada instalación añade entradas a
  `minimumReleaseAgeExclude` (política de antigüedad mínima de pnpm). Que el
  diff lo toque es normal.
- **El e2e del scaffold (`e2e/vue.spec.ts`) estuvo roto de fábrica** desde la
  feature #1 (esperaba `<h1>You did it!</h1>` que `App.vue` ya no pinta) hasta
  la feature #6, que lo sustituyó por la prueba de humo `e2e/app-boot.spec.ts`.

## Acceso a la API en desarrollo: proxy + base relativa

> Feature #7 (`api-types-and-net-worth-client`, 2026-09-12). Sin dependencias
> nuevas.

El backend **no tiene CORS** (se decide en su despliegue). Si el navegador
llama directo a `http://localhost:3000`, la petición se bloquea. La solución es
el **proxy del dev server**, declarado en `vite.config.ts`:

```ts
server: { proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } } }
```

**El choque que había que resolver.** El proxy solo interviene si la petición
sale contra el **origen del dev server**. Pero `createHttp` construye la URL con
`new URL(path, config.apiUrl)` y `loadConfig` exigía una URL **absoluta**: con
`VITE_API_URL=http://localhost:3000` el navegador se saltaba el proxy y chocaba
con CORS. Proxy y configuración se contradecían.

**Decisión: `VITE_API_URL` admite una base *root-relative*, y los entornos
locales usan `/`.** `loadConfig(raw, origin)` acepta dos formas:

| Valor | Qué hace |
|---|---|
| `/` (empieza por `/`) | Se resuelve contra el origen de la página (`location.origin`) → la petición es **same-origin** y el proxy la reenvía. |
| `http://host:puerto` | Base absoluta: el navegador llama a ese origen directamente (necesita CORS en el backend). |

El fail-fast **no se relaja**: una base relativa sin origen que resolver (SSR,
Node puro) y un valor que no es ni URL parseable ni ruta absoluta siguen
lanzando `ConfigError` al importar `appConfig`. `apiUrl` sigue siendo siempre
una **URL absoluta ya resuelta**, así que `services/http.ts` no cambia.

**Trade-off.** La alternativa era apuntar `VITE_API_URL` al propio dev server
(`http://localhost:5173`): no tocaba `config.ts`, pero ata la configuración a un
puerto concreto — si el 5173 está ocupado, Vite arranca en el 5174 y **todas**
las llamadas se van al servidor equivocado sin error claro. La base relativa no
puede desincronizarse: sea cual sea el puerto, es el de la página. A cambio,
`AppConfig.apiUrl` deja de ser literalmente lo que pone el `.env` (se resuelve),
y un despliegue con la API en otro origen **tiene que** escribir la URL absoluta
y habilitar CORS.

**Consecuencia en los paths:** la base es el **origen** de la API, no
`…/api`. Los servicios piden rutas absolutas que ya incluyen el prefijo
(`http('/api/net-worth')`), como hace `src/features/net-worth/service.ts`.

Los cuatro `.env` committeados usan `/`: desarrollo (para el proxy), test (jsdom
aporta el origen) y producción (la app se sirve desde el mismo origen que la
API; ver `docs/related-projects.md`). La forma absoluta sigue cubierta por los
tests de `loadConfig`.

## Variables de entorno requeridas

- Convención Vite: solo las variables con prefijo **`VITE_`** se exponen al
  cliente vía `import.meta.env`. Playwright lee `CI` para su comportamiento
  en CI.
- La configuración se valida al arrancar en `src/shared/config.ts`
  (`loadConfig` + singleton `appConfig`); un entorno inválido impide el
  arranque con un `ConfigError` claro (feature #2, ADR-004).
- Ficheros committeados (sin secretos): `.env.example` (plantilla),
  `.env.development` (valores locales de `pnpm dev`), `.env.test` (Vitest),
  `.env.production` (valores del build de producción; necesario para que el
  build monte bajo `vite preview` en el e2e CI, ver *E2E en cada modo*).
  Overrides personales via `*.local` (git-ignored).

| Nombre | Descripción | Obligatoria | Ejemplo |
|--------|-------------|-------------|---------|
| `VITE_API_URL` | Base de la API: **origen absoluto** (`http://localhost:3000`) o **ruta root-relative** (`/`), que se resuelve contra el origen de la página. | sí | `/` |

> Puerto del backend **confirmado** contra el proyecto hermano en la feature #7:
> `http://localhost:3000`, y es el `target` del proxy de `vite.config.ts`.
