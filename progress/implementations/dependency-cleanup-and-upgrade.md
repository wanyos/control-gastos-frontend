# Informe de implementación — feature 12 `dependency-cleanup-and-upgrade`

- **Tipo:** no SDD (contrato: `intent` + 11 criterios de `acceptance`).
- **Fecha:** 2026-09-13.
- **Estado en `feature_list.json`:** `in_progress` (no se toca; lo cierra el flujo reviewer).
- **Decisiones del humano aplicadas:** fuera `vite-plugin-vue-devtools`; lint solo con
  oxlint; se mantiene `npm-run-all2`.

## Resumen

- `package.json` pasa de **32 a 20 dependencias**: se quitan **12** (`@vue/devtools-api`,
  `@types/jsdom`, `vite-plugin-vue-devtools` y 9 del ecosistema ESLint). En el grafo
  instalado desaparecen ~179 paquetes.
- Todo lo que queda está en su **última versión publicada**, salvo `typescript`, que se
  queda en la última 6.0.x (6.0.3) porque la 7 rompe `vue-tsc`.
- Vitest 4 → 5 **sin cambios** en `vitest.config.ts` ni en los tests.
- `pnpm-workspace.yaml` **se elimina**: solo tenía exclusiones de antigüedad mínima y
  todas estaban obsoletas. No hizo falta ninguna nueva.
- Cobertura de lint perdida: **las plantillas `<template>` de Vue** y **todas las reglas
  de Playwright** (detalle abajo).
- Sin cambios visuales: captura de `/net-worth` idéntica píxel a píxel frente a `HEAD`
  (ocultando el botón de DevTools en la versión antigua).

## Archivos modificados / creados / eliminados

| Archivo | Cambio |
|---|---|
| `package.json` | −12 dependencias, −script `lint:eslint`, versiones subidas |
| `pnpm-lock.yaml` | regenerado |
| `pnpm-workspace.yaml` | **eliminado** (solo tenía exclusiones obsoletas) |
| `eslint.config.ts` | **eliminado** |
| `.eslintcache` | **eliminado** (no estaba en git) |
| `.gitignore` | fuera la línea `.eslintcache` |
| `vite.config.ts` | fuera `vueDevTools()` y su import |
| `tsconfig.node.json` | fuera `eslint.config.*` de `include` |
| `tsconfig.vitest.json` | `types: ["node"]` (sin `jsdom`); `lib` con `ES2022`, `DOM`, `DOM.Iterable` (ver abajo) |
| `.oxlintrc.json` | configuración ampliada (ver *Cambios de configuración*) |
| `playwright.config.ts` | `headless: process.env.HEADED !== '1'` (arreglo trivial de lint, mismo valor) |
| `src/shared/config.ts` | un comentario `oxlint-disable-next-line no-new` (sin cambio de código) |
| `docs/stack.md` | versiones, sección nueva *Lint (solo oxlint)*, TS 7, Pinia/peer, pnpm, Vitest 5 |
| `docs/conventions.md` | linter = solo oxlint; Prettier 3.9.6; referencia a `eslint.config.ts` |
| `docs/verification.md` | `pnpm lint` = oxlint |
| `.claude/agents/leader.md` | ejemplo `.eslintrc` → `.oxlintrc.json` |
| `.vscode/extensions.json` | fuera `dbaeumer.vscode-eslint` |
| `.vscode/settings.json` | fuera `.eslint*, eslint*` del file nesting (fichero ignorado por git) |
| `README.md` | «Lint with ESLint» → «Lint with Oxlint» |
| `progress/current.md` | bitácora de la sesión |

No se tocó `design-system/`, `src/assets/styles/` ni el backend.

## Auditoría de dependencias (antes de cambiar nada)

Búsqueda por import/uso en `src/`, `e2e/`, configs y `tsconfig*`, más peers vía
`npm view … peerDependencies` y `pnpm why`.

### `dependencies`

| Paquete | Dónde se usa / por qué | Acción |
|---|---|---|
| `@lucide/vue` | `src/router/index.ts` (iconos de la sidebar) | se queda |
| `@vue/devtools-api` | **Ningún import.** Peer **no opcional** de `pinia` 4 (`peerDependenciesMeta.optional: false`); `vue-router` 5.3.1 la trae como `dependency` | **eliminada**: pnpm la resuelve con `autoInstallPeers: true` (default, en `settings` del lockfile). `pnpm peers check` → «No peer dependency issues found»; `pnpm why` la muestra bajo `pinia` y `vue-router` |
| `pinia` | `src/main.ts`, `src/features/net-worth/store.ts`, tests | se queda, sube |
| `vue` | todos los `.vue`, `src/main.ts`, store | se queda, sube |
| `vue-router` | `src/router/index.ts`, `AppShell/AppSidebar/AppTopBar/PlaceholderView.vue`, tests | se queda, sube |

### `devDependencies`

| Paquete | Dónde se usa / por qué | Acción |
|---|---|---|
| `@playwright/test` | `playwright.config.ts`, `e2e/app-boot.spec.ts` | se queda, sube |
| `@tailwindcss/vite` | `vite.config.ts` | se queda |
| `@tsconfig/node24` | `extends` de `tsconfig.node.json` y `e2e/tsconfig.json` | se queda, sube |
| `@types/jsdom` | `types: ["jsdom"]` en `tsconfig.vitest.json`. Ningún test usa la API de jsdom (solo un comentario en `src/__tests__/App.spec.ts`). **Pero** aportaba de rebote la `lib` DOM: al quitarlo, `vue-tsc` falló con `Cannot find name 'HTMLElement'` / `'location'` (NetWorthView.spec.ts, BaseComponents.spec.ts, config.ts) porque ese tsconfig sobreescribía `lib` a solo `ES2023.Intl` | **eliminada**; `tsconfig.vitest.json` declara `lib: ["ES2022", "ES2023.Intl", "DOM", "DOM.Iterable"]` (la misma de `tsconfig.app.json`) |
| `@types/node` | `types: ["node"]` en `tsconfig.node.json`/`tsconfig.vitest.json`; tests con `node:fs`, `node:path`; peer opcional de vitest | se queda, sube |
| `@vitejs/plugin-vue` | `vite.config.ts` | se queda |
| `@vitest/eslint-plugin` | `eslint.config.ts` | **eliminada** (ESLint fuera) |
| `@vue/eslint-config-typescript` | `eslint.config.ts` | **eliminada** |
| `@vue/test-utils` | 4 specs de componentes | se queda, sube |
| `@vue/tsconfig` | `extends` de `tsconfig.app.json` | se queda |
| `eslint` | script `lint:eslint` | **eliminada** |
| `eslint-config-prettier` | `eslint.config.ts` | **eliminada** |
| `eslint-plugin-oxlint` | `eslint.config.ts` | **eliminada** |
| `eslint-plugin-playwright` | `eslint.config.ts` | **eliminada** |
| `eslint-plugin-vue` | `eslint.config.ts` | **eliminada** |
| `jiti` | Sin import. Solo lo pedía ESLint para cargar `eslint.config.ts`. `vite` lo declara como peer **opcional**; `@tailwindcss/node` lo trae como dependencia propia | **eliminada** (sigue en el grafo vía Tailwind; ningún aviso) |
| `jsdom` | `environment: 'jsdom'` en `vitest.config.ts` (peer opcional de vitest); fija el suelo de Node | se queda |
| `npm-run-all2` | scripts `build` (`run-p`) y `lint` (`run-s`) | se queda (decisión del humano) |
| `oxlint` | script `lint:oxlint` | se queda, sube |
| `prettier` | script `format`, `.prettierrc.json` | se queda (ya en la última, 3.9.6) |
| `tailwindcss` | `src/assets/main.css` (`@import 'tailwindcss'`), `styles.spec.ts` | se queda |
| `typescript` | motor de `vue-tsc`; `init.sh` ejecuta `tsc` | se queda en 6.0.x |
| `vite` | `dev`/`build-only`/`preview`, `vite.config.ts` | se queda, sube |
| `vite-plugin-vue-devtools` | `vite.config.ts` | **eliminada** (decisión del humano) |
| `vitest` | `test:unit`, `vitest.config.ts`, todos los specs | se queda, sube a 5 |
| `vue-eslint-parser` | Sin import; lo usan los plugins de ESLint | **eliminada** |
| `vue-tsc` | script `type-check` | se queda, sube |

¿Algo más simple o mejor? No se encontró un reemplazo que compense: cada paquete
restante tiene un uso directo. `@vue/test-utils` sigue siendo la opción oficial de
Vue; `npm-run-all2` se mantiene por decisión del humano.

## Versiones antes / después

| Paquete | Antes (lockfile) | Después | Nota |
|---|---|---|---|
| `@lucide/vue` | 1.45.0 | 1.45.0 | ya en la última |
| `pinia` | 4.0.2 | **4.0.3** | |
| `vue` | 3.5.41 | **3.5.42** | |
| `vue-router` | 5.2.0 | **5.3.1** | |
| `@playwright/test` | 1.62.1 | **1.63.0** | navegadores reinstalados (`npx playwright install`) |
| `@tailwindcss/vite` | 4.3.3 | 4.3.3 | ya en la última |
| `@tsconfig/node24` | 24.0.4 | **24.0.5** | |
| `@types/node` | 26.1.2 | **26.5.1** | |
| `@vitejs/plugin-vue` | 6.0.8 | 6.0.8 | ya en la última |
| `@vue/test-utils` | 2.4.11 | **2.5.0** | de paso quita el aviso `glob@10.5.0` deprecado (ahora `js-beautify` 2 → `glob` 13) |
| `@vue/tsconfig` | 0.9.1 | 0.9.1 | ya en la última |
| `jsdom` | 30.0.1 | 30.0.1 | ya en la última |
| `npm-run-all2` | 9.0.3 | 9.0.3 | ya en la última |
| `oxlint` | 1.77.0 | **1.82.0** | rango `~` a propósito (ver config) |
| `prettier` | 3.9.6 | 3.9.6 | ya en la última |
| `tailwindcss` | 4.3.3 | 4.3.3 | ya en la última |
| `typescript` | 6.0.3 | 6.0.3 | **no sube a 7.0.2** (ver abajo); 6.0.3 es la última 6.0.x |
| `vite` | 8.2.1 | **8.3.0** | |
| `vitest` | 4.1.10 | **5.0.0** | mayor |
| `vue-tsc` | 3.3.9 | **3.3.11** | |

`pnpm outdated` final: solo `typescript 6.0.3 → 7.0.2`.

## Cambios de configuración

### `.oxlintrc.json`

- Plugins base: `eslint`, `typescript`, `unicorn`, `oxc`, `vue` (`vitest` pasa a un override).
- Categorías: `correctness: error` (como antes) **+ `suspicious: error`** (nueva).
- Reglas explícitas que activaba `vueTsConfigs.recommended` y oxlint no incluye en esas
  categorías: `no-array-constructor`, `no-var`, `prefer-const`, `prefer-rest-params`,
  `prefer-spread`, `typescript/ban-ts-comment`, `no-empty-object-type`, `no-explicit-any`,
  `no-namespace`, `no-require-imports`, `no-unsafe-function-type`.
- Override `src/**/__tests__/**` con plugin `vitest` + las reglas de estilo del recomendado
  de `@vitest/eslint-plugin` que estaban activas (`no-identical-title`,
  `no-import-node-test`, `no-interpolation-in-snapshots`, `no-mocks-import`,
  `no-unneeded-async-expect-function`, `prefer-called-exactly-once-with`);
  `no-commented-out-tests` ya entra por `suspicious`.
- Sin override para `e2e/`: se probó con `jest` y con `vitest` y no aportan nada (ver
  cobertura perdida).
- `oxlint` en `~1.82.0`: antes el `~` servía para ir a la par con `eslint-plugin-oxlint`;
  ahora se mantiene porque un minor puede añadir reglas a `correctness`/`suspicious`.

Comprobado con ficheros sonda temporales (borrados): en tests unitarios salta
`vitest/no-focused-tests`, `valid-expect` y `no-identical-title`; en `.vue`,
`vue/no-async-in-computed-properties` y `typescript/no-explicit-any`.

**Lo que detectó el lint ampliado y qué se hizo:**

| Regla | Dónde | Decisión |
|---|---|---|
| `eslint/no-unneeded-ternary` | `playwright.config.ts:54` | **arreglado** (trivial, mismo booleano): `HEADED === '1' ? false : true` → `HEADED !== '1'` |
| `eslint/no-new` | `src/shared/config.ts:59` (`new URL(raw)` como validación dentro de `try`) | **desactivado en la línea** con comentario; reescribirlo (p. ej. `URL.canParse`) cambiaría código de runtime |
| `unicorn/no-array-sort` (7 casos) | `NetWorthView.vue`, `BankCard.vue`, `breakdown.ts`, 2 specs | **regla desactivada**: todos ordenan una copia recién creada; `toSorted()` no está tipado con `lib: ES2022` |
| `unicorn/consistent-function-scoping` (6 casos) | helpers locales en 4 specs y en `e2e/app-boot.spec.ts` | **regla desactivada**: en el e2e el helper **debe** vivir dentro de `evaluate()` (se ejecuta en el navegador); en los specs son locales a propósito |
| `jest/no-conditional-in-test` (2 casos, al probar override e2e) | `e2e/app-boot.spec.ts` (dentro de callbacks `page.on`/`evaluate`) | override e2e descartado entero |

### `tsconfig.vitest.json`

`lib` antes era solo `["ES2023.Intl"]`; los globals DOM y ES los aportaban `@types/jsdom`
y `@types/node` por `/// <reference lib>`. Ahora `lib` es explícita e igual que la de la
app. Solo afecta al type-check de los tests.

## Cobertura de lint perdida

Reglas activas en ESLint antes del cambio, sacadas con `npx eslint --print-config` sobre
`src/App.vue`, un spec, `e2e/app-boot.spec.ts` y `src/shared/money.ts` (reglas que
`eslint-plugin-oxlint` ya apagaba por duplicar oxlint no cuentan: siguen cubiertas).

1. **Vue `<template>` (56 reglas de `eslint-plugin-vue` `flat/essential`) — sin
   equivalente.** oxlint solo analiza el `<script>` de los SFC. Se pierden:
   `block-lang`, `comment-directive`, `jsx-uses-vars`, `multi-word-component-names`,
   `no-child-content`, `no-deprecated-*` (15), `no-dupe-v-else-if`,
   `no-duplicate-attributes`, `no-mutating-props`, `no-parsing-error`,
   `no-ref-as-operand`, `no-template-key`, `no-textarea-mustache`,
   `no-unused-components`, `no-unused-vars`, `no-use-computed-property-like-method`,
   `no-use-v-if-with-v-for`, `no-useless-template-attributes`,
   `no-v-for-template-key-on-child`, `no-v-text-v-html-on-component`,
   `require-component-is`, `require-toggle-inside-transition`, `require-v-for-key`,
   `require-valid-default-prop`, `use-v-on-exact`, `valid-attribute-name`,
   `valid-template-root` y los 17 `valid-v-*`. Lo más sensible en la práctica:
   `require-v-for-key`, `no-mutating-props`, `no-use-v-if-with-v-for`,
   `no-unused-components`. Parte de `valid-*` lo sigue parando el compilador de Vue en
   `vue-tsc`/`vite build`. Lo que oxlint **sí** trae de Vue (31 reglas `correctness` del
   `<script>`: `no-async-in-computed-properties`, `valid-define-props`,
   `no-side-effects-in-computed-properties`…) no lo tenía ESLint con `essential`.
2. **Playwright (36 reglas de `eslint-plugin-playwright`) — sin equivalente.** oxlint no
   tiene plugin de Playwright, y sus plugins `jest`/`vitest` no reconocen `test`/`expect`
   importados de `@playwright/test`: con una sonda, `test.only`, títulos duplicados y
   `expect(1)` sin matcher **no saltaron** (cambiando el import a `@jest/globals` saltaron
   las cuatro). Se pierden `missing-playwright-await`, `no-focused-test`,
   `no-skipped-test`, `no-wait-for-timeout`, `no-networkidle`, `no-page-pause`,
   `prefer-web-first-assertions`, `valid-expect`, `valid-title`, `expect-expect`, etc.
   Mitigación existente: `forbidOnly` en CI en `playwright.config.ts`.
3. **TypeScript / base:** nada. Las 13 reglas activas tienen equivalente en oxlint y están
   activadas.
4. **Vitest:** nada. Las 7 activas tienen equivalente y están activadas.

Recuperar 1 y 2 exigiría `jsPlugins` de oxlint con `eslint-plugin-vue` /
`eslint-plugin-playwright`, es decir, volver a meter paquetes de ESLint: descartado por la
decisión del humano. Queda como sugerencia fuera de scope.

## Migración a Vitest 5

Documentación: ctx7 (`/websites/main_vitest_dev`: requisitos Node ≥ 22.12 y Vite ≥ 6.4;
`mergeConfig` y `configDefaults.exclude` sin cambios) y las release notes oficiales de
`v5.0.0` (API de GitHub), porque ctx7 no traía la lista de breaking changes.

Breaking changes revisados contra el repo:

| Cambio en v5 | ¿Afecta? |
|---|---|
| Node 22 / Vite 6.4 mínimos | No: `engines` ya exige `^22.22.2 \|\| ^24.15.0 \|\| >=26`; Vite 8.3 |
| No busca config en directorios ancestros | No: `vitest.config.ts` está en la raíz |
| Limpia mocks antes de cada test por defecto | No: los specs ya hacen `vi.restoreAllMocks()` y crean sus `spyOn` en cada test |
| Métodos «hoistables» fuera del nivel superior → error | No: no hay `vi.mock`/`vi.hoisted` |
| Falla si un `expect` asíncrono no se espera | No: todos los `.resolves`/`.rejects` llevan `await` |
| `$` sin comillas en títulos de `test.each` | No: los `it.each` usan `%s` |
| `toHaveTextContent` estricto, fuera `sequential`, entry points eliminados, salidas en `.vitest/` | No se usan |

Resultado: **cero cambios** en `vitest.config.ts` y en los tests; 254/254 verdes con
`v5.0.0`. Vitest 5 imprime un consejo de rendimiento (jsdom creado 18 veces; sugiere
`pool: 'vmThreads'` o `isolate: false`): **no aplicado**, cambiaría el aislamiento
entre ficheros (sugerencia fuera de scope).

## Exclusiones de pnpm (`minimumReleaseAge`)

- Antes: `pnpm-workspace.yaml` con 33 entradas en `minimumReleaseAgeExclude` (oxlint
  1.73.0/1.77.0 y sus 19 bindings, `@vitest/eslint-plugin@1.6.26`,
  `eslint-plugin-oxlint@1.77.0`, 9 paquetes `@vue/*@3.5.41` + `vue@3.5.41`,
  `vite@8.2.1`).
- Todas obsoletas: o el paquete se ha quitado, o la versión ya no está en el lockfile, o
  ya supera la antigüedad mínima (1 día por defecto en pnpm 11).
- Versiones nuevas: la más reciente es `oxlint` 1.82.0 (2026-09-07) y `vite` 8.3.0
  (2026-09-10); `@lucide/vue` 1.45.0 (2026-09-11) no cambia. **No hizo falta ninguna
  exclusión nueva.**
- El fichero solo tenía eso, así que **se eliminó**. Se comprobó que no hay un
  `pnpm-workspace.yaml` en carpetas superiores. Con `node_modules` borrado,
  `pnpm install` → «Lockfile passes supply-chain policies (266 entries)», y
  `pnpm install --frozen-lockfile` → «Already up to date».

## Qué no se subió y por qué

- **`typescript` 7.0.2 — no.** Comprobado en una copia del repo (en el scratchpad, ya
  borrada): con `typescript@7.0.2` + `vue-tsc@3.3.11`, `pnpm type-check` falla con
  `ERR_PACKAGE_PATH_NOT_EXPORTED` en `resolveTscPath` (`vue-tsc/index.js:73`). Los
  `exports` de TS 7.0.2 solo publican `.` (version), `./package.json` y `./unstable/*`: sin
  API programática estable. Quitar ESLint elimina el otro bloqueo (`typescript-eslint`
  `<6.1.0`) pero no cambia la conclusión. Se queda en `~6.0.3` = última 6.0.x.
- **pnpm 12.4.1** está publicado (el propio pnpm lo avisa). No es una dependencia de
  `package.json` (no hay `packageManager`) y cambiar de gestor mayor queda fuera del
  alcance: sugerencia.
- Nada más: el resto está en `latest`.

## Verificación

Línea base antes de tocar nada: `./init.sh` verde (254 tests, e2e chromium verde).

Final:

| Comprobación | Resultado |
|---|---|
| `pnpm install` (con `node_modules` borrado) | OK, sin avisos de peers; `pnpm peers check` → «No peer dependency issues found» |
| `pnpm type-check` | OK (exit 0) |
| `pnpm lint` (`run-s "lint:*"` → solo `oxlint . --fix`) | OK (exit 0, 0 avisos); `--fix` no cambió ningún fichero |
| `pnpm test:unit` | Vitest v5.0.0 — 18 ficheros, **254/254** |
| `pnpm build` | OK; CSS `index-Cp3V8v7O.css` 24.95 kB (**mismo hash que en `HEAD`**), JS 118.51 kB (118.31 kB en `HEAD`; +0.2 kB de Vue 3.5.42 / Router 5.3.1) |
| `./init.sh` | Secciones 1–5 **OK** (estructura, `feature_list.json`, `tsc`, 254 tests). Sección 6 (e2e) **ROJA por el dev server del humano en 5173**, no por el código: ver abajo |
| e2e smoke modo CI (`CI=true E2E_PREVIEW_PORT=8099 pnpm test:e2e --project=chromium`) | **1 passed** (build de producción) |
| e2e smoke modo dev contra un dev server nuevo en **5183** (config temporal que hereda `playwright.config.ts`, borrada) | **1 passed** |
| Chromium: `/net-worth` en `HEAD` (worktree, 5181) frente a la versión nueva (5182), backend real en 3000 | texto de `#app` idéntico, 0 errores de consola en ambos; elementos de Vue DevTools: **1 antes → 0 ahora**; captura de página completa **idéntica byte a byte** ocultando el botón de DevTools en la antigua |

**Por qué la sección 6 de `./init.sh` sale roja.** Playwright reutiliza el servidor que ya
escucha en 5173 (`reuseExistingServer`), que es el `pnpm dev` del humano. Ese proceso
arrancó con Vite 8.2.1 y el plugin de DevTools; al cambiar las dependencias sus ficheros
ya no existen en `node_modules` y responde `404` a `/@vite/client`, así que la app no
monta (`#app > div` = 0). `pnpm add vite@^8.3.0` ya lo dejaba así, y además hice un
`rm -rf node_modules` para la instalación limpia con el servidor corriendo. No se paró ni
reinició, como pedía el encargo. **Cuando el humano reinicie su `pnpm dev`, `./init.sh`
debería quedar verde**: el mismo smoke pasa en 5183 y en modo CI.

## Estado final

- `feature_list.json`: feature 12 sigue en `in_progress`.
- Pendiente: reviewer. Antes, el humano reinicia su dev server de 5173 y se repite
  `./init.sh`.

## Sugerencias fuera de scope (no aplicadas)

- Reglas de plantilla Vue / Playwright: solo se recuperan con `jsPlugins` de oxlint +
  plugins de ESLint, o esperando soporte nativo de oxlint.
- `typescript/no-floating-promises` (cubriría parte de `missing-playwright-await`)
  necesita el modo type-aware de oxlint, que pide un paquete nuevo (`oxlint-tsgolint`).
- `pool: 'vmThreads'` en Vitest 5 para no crear jsdom 18 veces.
- pnpm 11 → 12.
