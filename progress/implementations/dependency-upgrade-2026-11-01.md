# dependency-upgrade-2026-11-01 — implementación

Tarea de mantenimiento del 2026-11-01 (no es una feature de `feature_list.json`):
actualizar las librerías que dio `pnpm outdated` «sin romper nada» y revisar si
TypeScript 7 ya es posible, o de qué forma podría hacerse. Sin commits. Modelo
seguido: `progress/implementations/dependency-upgrade-2026-10-28.md`.

Entorno: Node v24.18.0, pnpm 11.22.0, Windows. Hora del sistema al empezar:
`Sun Nov  1 07:49:18 UTC 2026`.

**Un fallo que no viene de esta subida, pero que hay que saber:** el e2e de
chromium que lanza `./init.sh` falla de vez en cuando. De los cinco `./init.sh`
de esta pasada sin TypeScript 7 instalado, dos salieron con exit 1 solo por el e2e, cada vez por un
test distinto, y la repetición salió con 0. Uno de los dos,
`category-rules.spec.ts:779`, también falla con las versiones **de antes** (paso 2b) y
es el cabo 41 de `docs/roadmap.md`. El otro, `action-notice-in-view.spec.ts:992`, falló
una sola vez, con las versiones nuevas; con las de antes no se ha visto fallar, y el
reviewer no lo hizo fallar con ninguna de las dos (60 de 60). No lo he arreglado.
*(Corregido por el leader el 2026-11-01 tras la revisión.)*

## Archivos modificados / creados

- `package.json` — tres rangos subidos: `@lucide/vue` `^1.66.0`, `@types/node`
  `^26.6.6`, `vue-tsc` `^3.3.14`. Ninguna dependencia añadida ni quitada.
- `pnpm-lock.yaml` — regenerado por `pnpm add`.
- `docs/stack.md` — versión de `@lucide/vue`, nota «Última pasada», sección
  nueva «Lo que subió por debajo en la pasada del 2026-11-01», la prueba nueva de
  TypeScript 7, un bloque «El camino que hay», «Cuándo reintentarlo» reescrito
  (conservando la regla anterior como historia) y dos puntos en «Otras trampas
  conocidas».
- `progress/implementations/dependency-upgrade-2026-11-01.md` — este informe.

**Ningún archivo de código, test ni configuración tocado** (`src/`, `e2e/`,
`tsconfig*`, `vite.config.ts`, `.oxlintrc.json`…). No se creó
`pnpm-workspace.yaml` (`ls pnpm-workspace.yaml` → `No such file or directory`,
antes y después). `progress/current.md` ya traía la nota de la tarea escrita por
el leader; no la he cambiado. `docs/conventions.md` no cita ninguna versión de
las tres que cambian (solo Prettier `3.9.10`, que no cambia): no se toca.

Las pruebas de TypeScript 7.1 y de la convivencia 6 + 7 (paso 4) se hicieron en
**copias del proyecto** dentro de la carpeta temporal de la sesión
(`git archive HEAD …`), nunca en el repo.

## Versiones que quedaron

| Paquete | Antes | Ahora | Rango en `package.json` | Publicada |
|---|---|---|---|---|
| `@lucide/vue` | 1.62.0 | **1.66.0** | `^1.66.0` | 2026-10-31T06:17 |
| `@types/node` | 26.6.5 | **26.6.6** | `^26.6.6` | 2026-10-28T18:36 |
| `vue-tsc` | 3.3.13 | **3.3.14** | `^3.3.14` | 2026-10-29T19:06 |
| `typescript` | 6.0.3 | 6.0.3 (sin cambio) | `~6.0.3` | la 7 probada y descartada (paso 3) |

Las tres tienen más de un día (`pnpm view <paquete> time --json`), así que la
antigüedad mínima de pnpm no bloqueó ninguna. `@vue/language-core` y `@volar/*`
suben por debajo (ver «Dependencias indirectas»).

## Paso 1 — Línea base, antes de tocar nada

Antes de nada se guardó copia de `package.json` y `pnpm-lock.yaml` en la carpeta
temporal de la sesión.

| Comando | Resultado |
|---|---|
| `./init.sh` | **exit 0**. `Type check OK (tsc sin errores)`, `OK: pnpm lint:oxlint:check`, `OK: pnpm format:check`, Vitest v5.0.5 `Test Files 126 passed (126)`, `Tests 2077 passed (2077)`, `OK: pnpm type-check (vue-tsc --build, incluye los .vue)`, `E2E smoke verde (chromium)`, `Entorno listo. Puedes empezar a trabajar.` |
| `pnpm build` | **exit 0**. `✓ 2203 modules transformed.`, `dist/assets/index-R4toWmgH.css 34.76 kB │ gzip: 7.87 kB`, `dist/assets/index-oXIqPBcg.js 376.20 kB │ gzip: 112.11 kB`, `✓ built in 833ms` |
| `pnpm peers check` | exit 0. `No peer dependency issues found` |
| `pnpm outdated` | exit 1 (su salida cuando lista algo): `@types/node 26.6.5 → 26.6.6`, `vue-tsc 3.3.13 → 3.3.14`, `@lucide/vue 1.62.0 → 1.66.0`, `typescript 6.0.3 → 7.0.2` (lo mismo que dio el leader) |

## Paso 2 — Las tres menores y de parche

```
pnpm add "@lucide/vue@^1.66.0"
pnpm add -D "@types/node@^26.6.6" "vue-tsc@^3.3.14"
```

Los dos con exit 0 (`Done in 5.9s` / `Done in 1.7s`), `✓ Lockfile passes
supply-chain policies`. `grep -iE "warn|peer|minimumRelease|age"` sobre su salida
solo encontró `Packages: +1 -1` y `Packages: +18 -13`: ningún aviso. (pnpm
avisa de `Update available! 11.22.0 → 12.16.1`; no es de esta tarea.)

| Comando | Resultado |
|---|---|
| `pnpm install` | exit 0. `Already up to date`, sin avisos |
| `pnpm peers check` | exit 0. `No peer dependency issues found` |
| `pnpm type-check` | exit 0 |
| `pnpm type-check --force` | exit 0 (`vue-tsc --build` es incremental) |
| `pnpm lint` | exit 0. `$ oxlint . --fix`, nada más; `git status --short` después: solo `package.json`, `pnpm-lock.yaml`, `progress/current.md` (no arregló nada) |
| `npx oxlint .` | exit 0 (sin ninguna línea de salida en esta terminal) |
| `pnpm test:unit` | exit 0. Vitest v5.0.5, `Test Files 126 passed (126)`, `Tests 2077 passed (2077)` |
| `pnpm build` | exit 0. `index-R4toWmgH.css 34.76 kB`, `index-oXIqPBcg.js 376.20 kB │ gzip: 112.11 kB`, `✓ built in 905ms` |
| `./init.sh` (1.ª vez) | **exit 1**, solo por el e2e: `[FAIL] E2E smoke rojo (chromium)`, `1 failed` (`action-notice-in-view.spec.ts:992`), `82 passed`. Todo lo demás `[OK]`. Ver 2b |
| `npx playwright test --project=chromium e2e/action-notice-in-view.spec.ts --repeat-each=10` | exit 0. `150 passed (52.7s)` |
| `./init.sh` (2.ª vez) | **exit 0**. `126 passed` / `2077 passed`, `OK: pnpm type-check`, `E2E smoke verde (chromium)`, `Entorno listo.` |

### Los iconos de `@lucide/vue` (sube cuatro menores)

- La app importa **25 iconos** (`grep` de los `import { … } from '@lucide/vue'` en
  `src/`, incluida la importación de varias líneas de `src/router/index.ts`):
  ArrowLeftRight, ChartBar, ChartLine, Check, ChevronLeft, ChevronRight, Circle,
  CircleCheck, CircleX, Eye, EyeOff, FileUp, Info, Landmark, LayoutDashboard,
  Link2, ListChecks, Pencil, Search, Tag, Trash2, TriangleAlert, Wallet,
  WandSparkles, X; más el tipo `LucideIcon`.
- `pnpm type-check` y `pnpm build` en verde: los 25 nombres siguen exportados.
- Descargué el tarball de la 1.62.0 (`npm pack @lucide/vue@1.62.0`, en la carpeta
  temporal) y comparé archivo a archivo `dist/esm/icons/<icono>.mjs` contra la
  1.66.0 instalada, quitando las dos primeras líneas (la cabecera de licencia con
  el número de versión): **los 25 iguales** (`Trash2` es un alias de `trash.mjs`
  en las dos versiones), y `dist/esm/Icon.mjs` también igual.
- Lo confirma el build: el JS sale con **el mismo hash** que en la línea base
  (`index-oXIqPBcg.js`, sha256 `7b5b3ec0…f84f`), y Vite pone el hash por el
  contenido.
- La app en marcha la miré con la prueba de humo del e2e
  (`e2e/app-boot.spec.ts`, «shell mounts with the design system applied and no
  console errors»), que pasa en cada `./init.sh` verde. No abrí `pnpm dev` a mano.

### 2b — El e2e de chromium falla a veces, también con las versiones de antes

Fallo del primer `./init.sh` del paso 2:

```
1) [chromium] › e2e\action-notice-in-view.spec.ts:992:1 › Undo pressed from the bottom of the list puts the row back
   Error: expect(received).toEqual(expected) // deep equality
   - Array []
   + Array [
   +   "GET /api/movements",
   + ]
   > 215 |   expect(watch.aborted).toEqual([])
```

Para saber si lo traía la subida:

| Prueba | Resultado |
|---|---|
| Versiones nuevas: `npx playwright test --project=chromium --repeat-each=5` | exit 0. `415 passed (1.7m)` |
| Versiones de partida (copié el `package.json` y el lockfile de la línea base, `pnpm install --frozen-lockfile`, `pnpm ls` → `@lucide/vue@1.62.0`, `@types/node@26.6.5`, `vue-tsc@3.3.13`): el mismo comando | **exit 1**. `2 failed`, `413 passed`, las dos veces `category-rules.spec.ts:779` («the result of applying looks the same on Rules and on Review…»), con `"background": "rgb(20, 27, 34)"` donde esperaba `rgb(21, 28, 35)` |

Después volví a poner los archivos del paso 2 (`pnpm install --frozen-lockfile`,
`cmp` contra la copia: iguales). En el cierre (paso 5), uno de los `./init.sh`
volvió a caer en ese mismo test, `category-rules.spec.ts:779`, con la misma
diferencia de color, y el siguiente salió con 0. `category-rules.spec.ts:779`
falla a veces con las versiones viejas y con las nuevas: no es de esta subida, y ya
estaba apuntado como cabo 41 de `docs/roadmap.md` (que lo cita por su línea antigua,
`:761`). `action-notice-in-view.spec.ts:992` falló una vez y solo con las versiones
nuevas; no se ha visto fallar con las de antes. *(Corregido por el leader el
2026-11-01: el informe decía que ninguno estaba apuntado y que los dos fallaban con
las dos versiones.)* Lo he dejado escrito en
`docs/stack.md` → «Otras trampas conocidas» (para quien haga la próxima subida) y
como sugerencia abajo.

### Dependencias indirectas que cambiaron

Comparando las claves de la sección `packages:` del lockfile antes y después
(**272 → 277** paquetes). Ninguna cambia de versión mayor.

| Paquete | Antes | Después | Quién lo trae (`pnpm why`) |
|---|---|---|---|
| `@volar/language-core`, `@volar/source-map`, `@volar/typescript` | 2.4.28 | 2.4.30 | `vue-tsc` 3.3.14 |
| `@vue/language-core` | 3.3.13 | 3.3.14 | `vue-tsc` 3.3.14 |
| `@volar/language-service` | — | 2.4.30 (nuevo) | `@volar/typescript` 2.4.30 ← `vue-tsc` |
| `vscode-jsonrpc` 10.0.0, `vscode-languageserver-protocol` 3.18.5, `vscode-languageserver-textdocument` 1.0.16, `vscode-languageserver-types` 3.18.5 | — | nuevos | `@volar/language-service` 2.4.30 |

Todo es de la comprobación de tipos; nada va al navegador (bundle idéntico).

**Dato que importa para TypeScript 7:** `pnpm view @volar/typescript@2.4.30
peerDependencies` → `{ "typescript": "<7" }`; lo mismo `@volar/language-service`
2.4.30. La 2.4.28 no declaraba ninguna peer. Es decir, desde la 3.3.14 la serie 3
de `vue-tsc` dice por escrito que no admite TypeScript 7.

## Paso 3 — TypeScript 7.0.2 con `vue-tsc` 3.3.14: falla, se volvió a la 6

Con las tres ya subidas. `pnpm add -D "typescript@~7.0.2"` (exit 0,
`- typescript 6.0.3` / `+ typescript 7.0.2`) y, **nuevo respecto al 2026-10-28**:

```
[WARN] Issues with peer dependencies found. Run "pnpm peers check" to list them.

$ pnpm peers check            # exit 1
✕ unmet peer typescript
  Installed: 7.0.2
  Wanted:
    <7:
      @volar/typescript@2.4.30
      @volar/language-service@2.4.30
```

`pnpm ls typescript vue-tsc` → `typescript@7.0.2`, `vue-tsc@3.3.14`.

| Comando | Resultado con TypeScript 7.0.2 + vue-tsc 3.3.14 |
|---|---|
| `pnpm type-check` | **exit 1** |
| `pnpm build` | **exit 1** (`ERROR: "type-check" exited with 1.`) |
| `./init.sh` | **exit 1**. `[FAIL] Fallido: pnpm type-check (exit 1):` con el mismo error en la sección 6b y `[FAIL] Entorno NO está listo. Resuelve los errores antes de avanzar.`; el resto en verde (`Type check OK (tsc sin errores)`, lint, formato, `126 passed` / `2077 passed`, `E2E smoke verde (chromium)`) |

Error exacto de `pnpm type-check`:

```
$ vue-tsc --build
C:\Users\roybe\Escritorio\proyectos\control-gastos\gastos-frontend\node_modules\.pnpm\vue-tsc@3.3.14_typescript@7.0.2\node_modules\vue-tsc\index.js:68
                throw err;
                ^

Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './lib/tsc' is not defined by "exports" in C:\Users\roybe\Escritorio\proyectos\control-gastos\gastos-frontend\node_modules\.pnpm\vue-tsc@3.3.14_typescript@7.0.2\node_modules\typescript\package.json
    at exportsNotFound (node:internal/modules/esm/resolve:314:10)
    at packageExportsResolve (node:internal/modules/esm/resolve:662:9)
    at resolveExports (node:internal/modules/cjs/loader:707:36)
    at Module._findPath (node:internal/modules/cjs/loader:774:31)
    at Module._resolveFilename (node:internal/modules/cjs/loader:1502:27)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1071:27)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1122:12)
    at require.resolve (node:internal/modules/helpers:171:31)
    at resolveTscPath (C:\Users\roybe\Escritorio\proyectos\control-gastos\gastos-frontend\node_modules\.pnpm\vue-tsc@3.3.14_typescript@7.0.2\node_modules\vue-tsc\index.js:73:43)
    at main (C:\Users\roybe\Escritorio\proyectos\control-gastos\gastos-frontend\node_modules\.pnpm\vue-tsc@3.3.14_typescript@7.0.2\node_modules\vue-tsc\index.js:44:45) {
  code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'
}

Node.js v24.18.0
[ELIFECYCLE] Command failed with exit code 1.
```

Es el mismo error que con 3.3.13, 3.3.12 y 3.3.11. Claves de `exports` del
`typescript@7.0.2` instalado (`node -e` sobre su `package.json`):
`./package.json . ./unstable/sync ./unstable/async ./unstable/fs ./unstable/proto ./unstable/ast ./unstable/ast/is ./unstable/ast/factory ./unstable/ast/utils ./unstable/ast/scanner ./unstable/ast/visitor ./unstable/ast/clone`.

**Con la 7.0.2 instalada, el `tsc` de la 7 solo con los `.ts`** (para el punto 4):

| Comando | Resultado |
|---|---|
| `npx tsc --version` | `Version 7.0.2` |
| `npx tsc -p tsconfig.node.json --noEmit --incremental false` | exit 0 (real 1,1 s, casi todo arranque de `npx`) |
| `npx tsc -p tsconfig.app.json --noEmit --incremental false` | exit 1: 10 errores, **todos** `TS2307 Cannot find module './App.vue'…` (imports de `.vue`) |
| `npx tsc -p tsconfig.vitest.json --noEmit --incremental false` | exit 1: 106 errores, **todos** `TS2307` de imports de `.vue` |

Con la 6.0.3, después de volver: `tsconfig.node.json` exit 0 (real 1,9 s) y
`tsconfig.app.json` exit 2 con los mismos 10 `TS2307`. O sea, la 7 no encuentra en
los `.ts` ningún error que la 6 no encuentre, y sin `vue-tsc` no puede mirar
nada que toque un `.vue`. `pnpm type-check --force` (vue-tsc + TS 6, los tres
tsconfig) tarda **9,0 s** reales.

**Vuelta atrás:** copié `package.json` y `pnpm-lock.yaml` de la copia guardada
tras el paso 2 y `pnpm install --frozen-lockfile` (exit 0,
`- typescript 7.0.2` / `+ typescript 6.0.3`). `cmp` contra la copia: iguales.
`grep -c "typescript@7" pnpm-lock.yaml` → `0`. `grep '"typescript"' package.json`
→ `"typescript": "~6.0.3",`. `pnpm peers check` → `No peer dependency issues found`.

## Paso 4 — Qué camino hay hacia TypeScript 7 para un proyecto Vue

### Comprobado ejecutando (registro npm, código instalado y copias del proyecto)

1. **No hay `vue-tsc` 4.** `pnpm view vue-tsc versions --json | grep -cE '"4\.'` →
   `0`; última `3.3.14`; `dist-tags`: `latest 3.3.14`, `v3.0 3.0.11`.
2. **Sí hay v4 alfa de lo demás.** `@vue/language-core` `dist-tags`:
   `alpha 4.0.0-alpha.2` (publicada 2026-10-29T20:27; alpha.0 el 2026-10-23,
   alpha.1 el 2026-10-29). `@vue/language-core@4.0.0-alpha.2`:
   `peerDependencies: { "typescript": ">=7.1.0-beta" }`,
   dependencia `@volar/language-core 3.0.0-alpha.0`. Lo mismo, `4.0.0-alpha.2`,
   en `@vue/language-server`, `@vue/language-service` y `@vue/language-plugin-pug`.
   Y existe un paquete nuevo, **`@vue/content-mapper`** (`alpha 4.0.0-alpha.2`,
   2026-10-29; peer `typescript >=7.1.0-beta`). Rareza: su `dist-tags.latest`
   apunta a `4.0.0-alpha.0`, así que `pnpm add @vue/content-mapper` sin versión
   instalaría una alfa vieja.
3. **TypeScript 7.1 beta.** `typescript` `dist-tags`: `latest 7.0.2`,
   `beta 7.1.0-beta` (2026-10-20T16:45), `next 7.1.0-dev.20261031.1`. Los
   `exports` de `7.1.0-beta` ya no llevan `unstable/`: `./fs ./ast ./path ./sync
   ./async ./proto ./ast/is ./vscode …` (el dato del leader es correcto). Siguen
   sin incluir `./lib/tsc`, que es lo que pide `vue-tsc` 3.
4. **`vue-tsc` 3.3.14 reconoce un paquete oficial para tener la 6 junto a la 7.**
   En `node_modules/vue-tsc/index.js`, `resolveTscPath` mira si `typescript` es
   en realidad `@typescript/typescript6` y entonces usa
   `@typescript/old/lib/tsc`. `@typescript/typescript6` existe en npm (`6.0.2`,
   publicado por los mantenedores de Microsoft, dependencia
   `"@typescript/old": "npm:typescript@^6"`, comando `tsc6`); su README: «This
   package provides a `tsc6` command that runs TypeScript 6's `tsc`. It also
   reexports the TypeScript 6 API».
5. **Prueba en una copia: TypeScript 7.1.0-beta + `@vue/content-mapper`
   4.0.0-alpha.2** (`git archive HEAD` de `src/` y los `tsconfig*` a la carpeta
   temporal, `pnpm add -D typescript@7.1.0-beta @vue/content-mapper@4.0.0-alpha.2`,
   y en `tsconfig.app.json`
   `"contentMappers": [{ "package": "@vue/content-mapper", "extensions": [".vue"], "options": { "target": 3.5 } }]`):
   - `pnpm add` avisa `✕ unmet peer typescript … Wanted: <7` (por `vue-tsc`
     3.3.14, que sigue en el `package.json` de la copia).
   - Primer intento: el `tsc` de la 7.1 beta **se cae** (exit 2) con
     `panic: bundled: //?/C:/…/node_modules/.pnpm/@typescript+typescript-win32-x64@7.1.0-beta/node_modules/@typescript/typescript-win32-x64/lib/lib.d.ts does not exist; this executable may be misplaced`.
     El archivo existe; la ruta mide 283 caracteres (más de 260). Reinstalando la
     copia con `pnpm install --config.node-linker=hoisted` (ruta corta), arranca.
     En el repo real la ruta sería más corta que en la carpeta temporal; **no lo
     he comprobado**.
   - `npx tsc -b --runExternalCode`: **exit 2, 1.270 errores, todos `TS2353`**
     («Object literal may only specify known properties…»): atributos `data-test`
     y otros `data-*` en elementos HTML, y `dataTest`, `onClick`, `aria-expanded`,
     `lang`, `title`, `dataAutofocus` pasados a componentes propios. Salen
     duplicados porque `tsconfig.vitest.json` hereda la misma lista. Afectan a 96
     `.vue`. Con `vue-tsc` 3 + TS 6 estos mismos archivos dan 0 errores.
   - Añadiendo a `options` `"dataAttributes": ["data-*"], "htmlAttributes": ["aria-*"], "fallthroughAttributes": true`
     (nombres sacados de los tipos de `@vue/language-core` 4 alfa): **exit 2, 4
     errores `TS2345`** (2 reales, duplicados), en
     `src/features/overview/components/PreviousMonths.vue(74,14)` y
     `src/features/overview/views/OverviewView.vue(66,6)`: el evento propio
     `select` del componente se mezcla con el `onSelect` nativo. Es el mismo caso
     que el issue #6307 de `vuejs/language-tools` (cerrado el 2026-10-29); no sé
     si el arreglo está ya en la alpha.2.
   - **Detecta errores de verdad:** metí en la copia de `StatCard.vue` una línea
     `const broken: number = "no es un numero"` en el `<script setup>` y
     `{{ label.toFixed(2) }}` en la plantilla; salieron
     `StatCard.vue(27,7): error TS2322: Type 'string' is not assignable to type 'number'.`
     y `StatCard.vue(5,18): error TS2551: Property 'toFixed' does not exist on type 'string'.`
   - Tiempo: `real 3,2 s` para los tres tsconfig, frente a `9,0 s` de
     `pnpm type-check --force` hoy (medido con `time`, una vez cada uno; incluye
     el arranque de `npx`/`pnpm`).
   - `npx vite build` en la copia con `typescript` 7.1.0-beta: exit 0, el mismo
     bundle (`index-oXIqPBcg.js 376.20 kB`).
6. **Prueba en otra copia: la 6 para `vue-tsc` y la 7 para `tsc`**, con
   `"typescript": "npm:@typescript/typescript6@^6.0.2"` y
   `"typescript7": "npm:typescript@7.0.2"` (y `node-linker=hoisted`):
   `pnpm peers check` → `No peer dependency issues found`; `npx tsc --version` →
   `Version 7.0.2`; `npx tsc6 --version` → `Version 6.0.3`;
   `npx vue-tsc --build --force` → exit 0 (9,3 s); con el mismo error metido en la
   plantilla de `StatCard.vue`, `vue-tsc --build` → exit 2 con el `TS2551`; el
   `tsc` de la 7 sobre `tsconfig.node.json` → exit 0. Funciona, pero **no
   probé** `vite build`, `vitest` ni `./init.sh` en esa copia, ni con el
   `node_modules` de pnpm por defecto.

### Leído en documentación (con enlace)

- **El plan de `vue-tsc` 4: no hay `vue-tsc` 4.** El PR
  [vuejs/language-tools#6170 «feat: content mapper (v4 alpha)»](https://github.com/vuejs/language-tools/pull/6170)
  (abierto desde 2026-08-20, contra `master`) dice: «Vue Language Tools **v4**
  type-checks `.vue` files with TypeScript 7.1's own `tsc` through a Content
  Mapper (`@vue/content-mapper`), with no separate `vue-tsc` binary»;
  «**`vue-tsc` is removed.** Use `tsc --runExternalCode`»; «v4 supports
  TypeScript 7.1 only». Instalación que propone:
  `npm i -D typescript@beta @vue/content-mapper` y `tsc --runExternalCode`
  («replaces `vue-tsc --noEmit`»).
- **Cambios que nos afectarían**, del mismo PR: las opciones de Vue van en
  `contentMappers[].options` (ya no en `vueCompilerOptions`, que este proyecto no
  usa); se quitan `strictTemplates` y los `checkUnknown*` (la plantilla con
  `lang="ts"` pasa a ser estricta: de ahí los 1.270 errores); los componentes y
  directivas desconocidos se marcan siempre; en el editor, la v4 pierde el
  formateo de los bloques de script de los `.vue` y algunas cosas más
  («Known v4 regression versus v3»), y el editor necesita el servidor de
  lenguaje de TypeScript 7.1.
- **Errores abiertos de la v4 alfa** (búsqueda «typescript 7» en los issues, 
  2026-11-01): una decena con el prefijo «content-mapper:», entre ellos
  [#6318](https://github.com/vuejs/language-tools/issues/6318) (`aria-*`/`role`
  en componentes siempre rechazados) y
  [#6310](https://github.com/vuejs/language-tools/issues/6310) (`data-*` y props
  `dataCy`), que son de la misma familia que los errores de la prueba;
  [#6307](https://github.com/vuejs/language-tools/issues/6307) (cerrado) es el de
  `select`/`onSelect`.
- **La 3.3.14** ([release](https://github.com/vuejs/language-tools/releases/tag/v3.3.14))
  no menciona TypeScript 7 salvo un arreglo «to keep literal bindings on TS 7.1»
  en el código generado. El repositorio tiene una rama `v3.4`.
- **Las content mappers en TypeScript 7.1**: código de
  [microsoft/typescript-go `internal/contentmapper/contentmapper.go`](https://github.com/microsoft/typescript-go/blob/main/internal/contentmapper/contentmapper.go)
  (vía `ctx7 docs /microsoft/typescript-go`): un paquete declarado en
  `contentMappers` del tsconfig que «transforms otherwise unsupported file
  content (e.g. .vue) into virtual TypeScript», y que solo se ejecuta con
  `--runExternalCode` en la línea de comandos (en el editor, solo en carpetas de
  confianza). PR de origen:
  [microsoft/typescript-go#4712 «Content mappers»](https://github.com/microsoft/typescript-go/pull/4712).
- **Fechas de TypeScript 7.1**:
  [microsoft/TypeScript#63703 «TypeScript 7.1 Iteration Plan»](https://github.com/microsoft/TypeScript/issues/63703):
  beta 2026-10-06, RC **2026-11-10**, estable **2026-11-24**; entre sus objetivos,
  «Stabilize API — Content Mapper API». La beta real salió el 2026-10-20 (dos
  semanas tarde, según `pnpm view typescript time`), así que la estable puede
  retrasarse igual.
- **`vue-tsc` y `@typescript/typescript6`**: `ctx7 docs /vuejs/language-tools`
  devuelve el fragmento de
  [packages/tsc/index.ts](https://github.com/vuejs/language-tools/blob/master/packages/tsc/index.ts)
  con `resolveTscPath`; lo confirmé en el código instalado (punto 4 de arriba).

## Paso 5 — Cierre (estado final)

| Comando | Resultado |
|---|---|
| `cmp` de `package.json` y `pnpm-lock.yaml` contra la copia del paso 2 | iguales |
| `pnpm ls typescript vue-tsc @lucide/vue @types/node` | `@lucide/vue@1.66.0`, `@types/node@26.6.6`, `typescript@6.0.3`, `vue-tsc@3.3.14` |
| `pnpm type-check --force` | **exit 0** |
| `pnpm build` | **exit 0**. `index-R4toWmgH.css 34.76 kB │ gzip: 7.87 kB`, `index-oXIqPBcg.js 376.20 kB │ gzip: 112.11 kB`, `✓ built in 745ms` |
| `./init.sh` (1.ª del cierre, después de editar `docs/stack.md`) | **exit 1**, solo e2e: `1 failed` `category-rules.spec.ts:779` (`"background": "rgb(20, 27, 34)"` frente a `rgb(21, 28, 35)`), `82 passed`; el resto `[OK]` |
| `./init.sh` (2.ª del cierre) | **exit 0**. `Test Files 126 passed (126)`, `Tests 2077 passed (2077)`, `OK: pnpm type-check (vue-tsc --build, incluye los .vue)`, `E2E smoke verde (chromium)`, `Entorno listo. Puedes empezar a trabajar.` |
| `pnpm peers check` | exit 0. `No peer dependency issues found` |
| `pnpm outdated` | una sola fila: `typescript (dev) │ 6.0.3 │ 7.0.2` |
| `git status --short` | `docs/stack.md`, `package.json`, `pnpm-lock.yaml`, `progress/current.md` (y este informe) |

`pnpm test:e2e` con firefox y webkit no se lanzó en esta pasada (el 2026-10-28
tenía 6 fallos de antes de la subida).

## Decisiones tomadas

- `pnpm add <paquete>@<rango>` como en las pasadas anteriores, conservando el
  `^` de los tres.
- TypeScript 7.0.2 se probó en el repo y se deshizo; TypeScript 7.1 beta y la
  convivencia 6 + 7 solo en copias fuera del repo.
- Los fallos del e2e de chromium no se tocan: pasan también con las versiones
  de antes.
- «Cuándo reintentarlo» en `docs/stack.md` cambia de criterio (ya no «una
  `vue-tsc` nueva», porque la serie 3 declara `typescript <7`, sino «TypeScript
  7.1 estable + `@vue/content-mapper` no alfa»). Es lo que dicen los datos; si el
  humano prefiere otro criterio, es una línea.

## Documentos actualizados

```
git grep -nE "1\.62\.0|26\.6\.5|3\.3\.13|vue-tsc|@types/node|lucide" -- . ":!progress" ":!specs" ":!pnpm-lock.yaml" ":!design-system" ":!package.json"
```

Corregidas:

- `docs/stack.md:288`: `@lucide/vue` **1.62.0** / `^1.62.0` → **1.66.0** / `^1.66.0`.
- `docs/stack.md` → «Mantenimiento de dependencias»: nota «Última pasada» con
  fecha 2026-11-01 y este informe (las tres pasadas anteriores siguen citadas);
  sección nueva «Lo que subió por debajo en la pasada del 2026-11-01» (las
  anteriores se conservan); «Por qué TypeScript 7 no entra (todavía)»: punto 2
  con la versión y fecha nuevas (conservando las de antes), «Prueba del
  2026-11-01», bloque «El camino que hay» y «Cuándo reintentarlo» con el criterio
  nuevo (la regla anterior queda escrita como historia); «Otras trampas
  conocidas»: que las versiones que en la pasada anterior no cumplían la
  antigüedad ya entraron, y el e2e de chromium que falla a veces.

No tocadas:

- `docs/stack.md` en la sección de TypeScript 7 y de la pasada del 2026-10-28:
  las menciones a `vue-tsc` 3.3.13, `@types/node` 26.6.5 y `@lucide/vue` 1.62.0
  cuentan lo que pasó entonces; siguen siendo verdad.
- `docs/conventions.md`, `docs/verification.md`, `README.md`, `init.local.sh`,
  `tsconfig*.json`: nombran `vue-tsc` o `@lucide/vue` sin versión; nada cambia.
- `feature_list.json:469`: es el `acceptance` de la feature #12 (historia, y la
  tarea dice no tocar `feature_list.json`).

## Prueba real

No aplica: la tarea no lee datos de fuera del código.

## Último ./init.sh

**Exit 0** (segunda del cierre, tabla del paso 5). La anterior, exit 1 solo por
el e2e de chromium (`category-rules.spec.ts:779`), que también falla con las
versiones de antes (paso 2b).

## Sugerencias fuera de scope (NO aplicadas)

- ~~Apuntar un cabo suelto con los dos tests~~: `:779` ya es el cabo 41; `:992` lo
  apunta el leader en ese mismo cabo.
- pnpm avisa de `Update available! 11.22.0 → 12.16.1`; es una mayor del gestor y
  no estaba en la lista.

## TypeScript 7: opciones

**A. Esperar a TypeScript 7.1 estable y a la v4 no alfa de las herramientas de
Vue, y pasar entonces de `vue-tsc` a `tsc --runExternalCode`** (lo recomendado).
- Qué haría falta: `typescript` 7.1.x, `@vue/content-mapper` 4.x en
  `devDependencies`; quitar `vue-tsc`; añadir `contentMappers` a
  `tsconfig.app.json` (y comprobar que `tsconfig.vitest.json` lo hereda) con
  `dataAttributes`, `htmlAttributes` y `fallthroughAttributes`; cambiar el script
  `type-check` y lo que dice `init.local.sh` / `docs/verification.md`; arreglar o
  declarar los errores que queden (hoy, 2 casos de `select`/`onSelect`); y que la
  extensión de Vue del editor sea la v4.
- Riesgo: medio. La plantilla pasa a revisarse en modo estricto y salen errores
  que hoy no salen; el editor pierde el formateo de los scripts de los `.vue`.
  La caída en Windows por la ruta larga hay que mirarla en el repo real.
- Cuándo: no antes del **2026-11-24** (TypeScript 7.1 estable, según su plan;
  la beta llegó dos semanas tarde) y de que `@vue/content-mapper` publique una
  4.0.0 beta o estable. Comprobación por pasada:
  `pnpm view typescript dist-tags` y `pnpm view @vue/content-mapper dist-tags`.

**B. Probar ya la v4 alfa con TypeScript 7.1 beta, en una rama aparte.**
- Qué haría falta: lo mismo que A, con `typescript@7.1.0-beta` y
  `@vue/content-mapper@4.0.0-alpha.2` (versión exacta: su `latest` apunta a una
  alfa más vieja).
- Riesgo: alto. Alfa y beta, sin `vue-tsc` comprobando los `.vue` aparte: un falso «0 errores» o un
  error que se cuela en `pnpm build` dependen de un paquete alfa; hay una decena
  de issues abiertos de la v4; la beta se cae en Windows con rutas largas de
  pnpm. Con la configuración probada quedan 2 errores falsos.
- Cuándo: posible hoy, pero solo como experimento; no para `main`.

**C. TypeScript 7 solo para los `.ts`, `vue-tsc` sigue con la 6.**
- Qué haría falta: `"typescript": "npm:@typescript/typescript6@^6.0.2"` (paquete
  oficial que `vue-tsc` 3.3.14 reconoce) y la 7 con otro nombre
  (`"typescript7": "npm:typescript@7.0.2"`), y un paso más en el script de tipos
  que lance el `tsc` de la 7 sobre `tsconfig.node.json`.
- Riesgo: bajo en lo técnico (en la copia funcionó sin avisos de peers), pero
  dos TypeScript a la vez en `package.json` y con nombres falsos confunden a quien
  lo lea, y no probé `vite build`, `vitest` ni `./init.sh` en ese montaje.
- Lo que se gana: casi nada. Solo `tsconfig.node.json` (3 archivos de
  configuración) se libra de los `.vue`; `tsconfig.app.json` y
  `tsconfig.vitest.json` los importan y siguen necesitando `vue-tsc` con la 6, que
  es lo que tarda. `pnpm outdated` seguiría ofreciendo la 7 para `typescript`.
- Cuándo: posible hoy; no lo recomiendo.

**D. No hacer nada y seguir en `~6.0.3`.**
- Qué haría falta: nada; en cada pasada, mirar los dos `dist-tags` de la opción A.
- Riesgo: ninguno inmediato. Desde la 6.0.3 (2026-04-16) no se ha publicado
  ninguna 6.x más (`pnpm view typescript versions`); si saldrá alguna, no lo sé.
  La serie 3 de `vue-tsc` declara `typescript <7`, así que seguirá con la 6.
- Cuándo: es el estado actual, hasta que se den las condiciones de A.
