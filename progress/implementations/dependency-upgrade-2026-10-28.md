# dependency-upgrade-2026-10-28 — implementación

Tarea de mantenimiento del 2026-10-28 (no es una feature de `feature_list.json`):
actualizar las dependencias de la lista de `ncu` que dio el humano, «sin romper
nada». Sin commits. Modelo seguido: `progress/implementations/dependency-upgrade-2026-10.md`.

Entorno: Node v24.18.0, pnpm 11.22.0, Windows.

**Un fallo que no viene de esta subida, pero que hay que saber:** `pnpm test:e2e`
en los tres navegadores sale con **exit 1**: 6 tests fallan en firefox y webkit
(243 pasan). Fallan igual con las versiones de antes de la subida, comprobado
restaurando el `package.json` y el `pnpm-lock.yaml` de partida (ver paso 2b).
`./init.sh` no lo ve porque solo lanza el e2e en chromium.

## Archivos modificados / creados

- `package.json` — catorce rangos de versión subidos. Ninguna dependencia añadida ni quitada.
- `pnpm-lock.yaml` — regenerado por `pnpm add`.
- `docs/stack.md` — versiones citadas, nota «Última pasada», dependencias
  indirectas de esta pasada, la prueba nueva de TypeScript 7 y un párrafo en
  «Otras trampas conocidas» sobre la antigüedad mínima.
- `docs/conventions.md` — una línea: Prettier `3.9.9` → `3.9.10`.
- `progress/implementations/dependency-upgrade-2026-10-28.md` — este informe.

**Ningún archivo de código, test ni configuración tocado** (`src/`, `e2e/`,
`.oxlintrc.json`, `tsconfig*`, `vite.config.ts`…). No se creó
`pnpm-workspace.yaml` (`ls pnpm-workspace.yaml` → `No such file or directory`,
antes y después). `progress/current.md` ya traía la nota de la tarea, escrita por
el leader; no la he cambiado.

## Versiones que quedaron

| Paquete | Antes | Ahora | Rango en `package.json` | Nota |
|---|---|---|---|---|
| `@lucide/vue` | 1.51.0 | **1.62.0** | `^1.62.0` | no 1.63.0: antigüedad mínima |
| `pinia` | 4.0.3 | 4.1.0 | `^4.1.0` | |
| `vue` | 3.5.43 | 3.5.44 | `^3.5.44` | |
| `vue-router` | 5.3.1 | 5.4.0 | `^5.4.0` | |
| `@playwright/test` | 1.63.0 | 1.64.1 | `^1.64.1` | navegadores descargados con `npx playwright install` |
| `@types/node` | 26.6.4 | **26.6.5** | `^26.6.5` | no 26.6.6: antigüedad mínima |
| `@vitejs/plugin-vue` | 6.0.9 | 6.0.10 | `^6.0.10` | |
| `jsdom` | 30.1.1 | 30.1.3 | `^30.1.3` | |
| `npm-run-all2` | 9.0.3 | 9.0.4 | `^9.0.4` | |
| `oxlint` | 1.86.0 | 1.90.0 | `~1.90.0` | |
| `prettier` | 3.9.9 | 3.9.10 | `3.9.10` (exacta) | |
| `vite` | 8.3.2 | 8.3.5 | `^8.3.5` | |
| `vitest` | 5.0.3 | 5.0.5 | `^5.0.5` | |
| `vue-tsc` | 3.3.12 | 3.3.13 | `^3.3.13` | |
| `typescript` | 6.0.3 | 6.0.3 (sin cambio) | `~6.0.3` | la 7 probada y descartada (paso 3) |

### Las dos que no llegaron a la versión de `ncu`

`pnpm outdated` (pnpm 11, que aplica `minimumReleaseAge`, 1 día por defecto) ya
no ofrecía las versiones que daba `ncu`:

```
$ pnpm outdated
│ @types/node (dev)        │ 26.6.4  │ 26.6.5 │
│ @lucide/vue              │ 1.51.0  │ 1.62.0 │
```

Fechas de publicación (`pnpm view <paquete> time --json`), con la hora del
sistema `Wed Oct 28 20:21:32 UTC 2026`:

```
"26.6.5": "2026-10-09T18:46:47.657Z",
"26.6.6": "2026-10-28T18:36:36.455Z"
"1.62.0": "2026-10-27T06:12:34.919Z",
"1.63.0": "2026-10-28T06:11:51.748Z"
```

26.6.6 y 1.63.0 tenían menos de un día. No se forzaron: se instaló la última que
cumple la política. No se creó ninguna excepción.

## Paso 1 — Línea base, antes de tocar nada

| Comando | Resultado |
|---|---|
| `./init.sh` | exit 0. `Type check OK (tsc sin errores)`, `OK: pnpm lint:oxlint:check`, `OK: pnpm format:check`, Vitest v5.0.3 `Test Files 126 passed (126)`, `Tests 2077 passed (2077)`, `OK: pnpm type-check (vue-tsc --build, incluye los .vue)`, `E2E smoke verde (chromium)`, `Entorno listo. Puedes empezar a trabajar.` |
| `pnpm build` | exit 0. vite v8.3.2, `✓ 2160 modules transformed.`, `dist/assets/index-R4toWmgH.css 34.76 kB │ gzip: 7.87 kB`, `dist/assets/index-BlqWC3h5.js 374.67 kB │ gzip: 111.53 kB` |
| `pnpm peers check` | exit 0. `No peer dependency issues found` |
| `pnpm outdated` | exit 1 (es su salida cuando lista algo): 15 filas, las de la tabla de arriba con 26.6.5 y 1.62.0 como últimas, más `typescript 6.0.3 → 7.0.2` |

Antes de tocar nada se guardó copia de `package.json` y `pnpm-lock.yaml` fuera
del repo (carpeta temporal de la sesión).

## Paso 2 — Las catorce menores y de parche, juntas

`ncu` no se usó (no es dependencia del proyecto). Comandos, cada paquete con el
mismo tipo de rango que tenía:

```
pnpm add "vue@^3.5.44" "@lucide/vue@^1.62.0" "pinia@^4.1.0" "vue-router@^5.4.0"
pnpm add -D "@playwright/test@^1.64.1" "@types/node@^26.6.5" "@vitejs/plugin-vue@^6.0.10" "jsdom@^30.1.3" "npm-run-all2@^9.0.4" "oxlint@~1.90.0" "vite@^8.3.5" "vitest@^5.0.5" "vue-tsc@^3.3.13"
pnpm add -D -E "prettier@3.9.10"
```

Los tres con exit 0 (`Done in 7.6s` / `4.8s` / `2.1s`). En su salida no hay
ninguna línea con `WARN`, `peer` ni avisos de antigüedad
(`grep -iE "warn|peer|minimumRelease|age"` solo encontró las líneas
`Packages: +33 -19`, `Packages: +33 -36`, `Packages: +1 -1`). Los dos últimos
dijeron `✓ Lockfile passes supply-chain policies`.

Después: `npx playwright install` (exit 0; descargó los navegadores de 1.64.1).

| Comando | Resultado |
|---|---|
| `pnpm install` | exit 0. `Already up to date`, sin avisos |
| `pnpm peers check` | exit 0. `No peer dependency issues found` |
| `pnpm type-check` | exit 0 |
| `pnpm type-check --force` | exit 0 (`vue-tsc --build` es incremental) |
| `pnpm lint` | exit 0. `$ oxlint . --fix`, sin ninguna línea más; `git status` después: solo `package.json`, `pnpm-lock.yaml`, `progress/current.md` (no arregló nada) |
| `npx oxlint .` | `Version: 1.90.0` · `Found 0 warnings and 0 errors.` · `Finished in 51ms on 320 files with 174 rules using 12 threads.` |
| `pnpm test:unit` | exit 0. Vitest `v5.0.5`, `Test Files 126 passed (126)`, `Tests 2077 passed (2077)` |
| `pnpm build` | exit 0. vite v8.3.5, `✓ 2203 modules transformed.`, CSS `34.76 kB │ gzip: 7.87 kB`, JS `index-oXIqPBcg.js 376.20 kB │ gzip: 112.11 kB` |
| `./init.sh` | exit 0. tsc OK, lint OK, formato OK, Vitest v5.0.5 `126 passed` / `2077 passed`, `OK: pnpm type-check`, `E2E smoke verde (chromium)`, `Entorno listo.` |
| `pnpm test:e2e` (chromium, firefox, webkit) | **exit 1**. `6 failed`, `243 passed (2.5m)`. Ver 2b |

**oxlint 1.90**: no salió ninguna regla nueva fallando; ni la configuración de
oxlint ni el código se tocaron. **Prettier 3.9.10**: `format:check` en verde
sin reformatear nada.

### 2b — Los 6 fallos del e2e ya estaban antes

Fallos con las versiones nuevas:

```
1) [firefox] › e2e\statement.spec.ts:346:1 › the month picker reads legibly with the design system tokens
2) [webkit] › e2e\action-notice-in-view.spec.ts:940:1 › at the top of the page the notice sits between the same blocks as before
3) [webkit] › e2e\action-notice-in-view.spec.ts:1106:1 › the notice does not cover the row that was just changed
4) [webkit] › e2e\action-notice-in-view.spec.ts:1176:3 › the notice leaves the changed row clear with the result of applying the rules folded above the list
5) [webkit] › e2e\action-notice-in-view.spec.ts:1176:3 › the notice leaves the changed row clear with the result of applying the rules open above the list
6) [webkit] › e2e\statement.spec.ts:346:1 › the month picker reads legibly with the design system tokens
```

Errores: en `statement.spec.ts:371`, `Expected: "month"` / `Received: "text"`
(el campo de mes no es `type="month"` en ese navegador); en
`action-notice-in-view.spec.ts:655`,
`"its bottom (493.5535888671875) is below the window (411)"`,
`"at its centre there is <nothing> "`; en `:705`, `Expected: < 0.5` /
`Received: 0.9819297790527344`.

Para saber si los traía la subida: copié el `package.json` y el lockfile de la
línea base sobre los del repo, `pnpm install --frozen-lockfile` (bajó las 14 a
las de antes; `npx playwright --version` → `Version 1.63.0`),
`npx playwright install firefox webkit` (exit 0) y
`npx playwright test --project=firefox --project=webkit e2e/statement.spec.ts e2e/action-notice-in-view.spec.ts`:
**exit 1, `6 failed`, `38 passed`**, los mismos seis tests y los mismos errores
(`Expected: "month"` / `Received: "text"`;
`its bottom (493.5535888671875) is below the window (411)`; el de `:705` con
`Received: 0.6962852478027344`). Luego volví a poner los archivos del paso 2 y
`pnpm install --frozen-lockfile` (`Version 1.64.1`).

No lo he arreglado: no es de esta tarea y exigiría tocar tests o código.
No estaba apuntado: `grep -nE "month picker|firefox|webkit"` en
`docs/roadmap.md`, `docs/verification.md` y `progress/current.md` solo encontró
la línea de `verification.md` que documenta el comando. Queda para el leader.

### Dependencias indirectas que cambiaron de versión mayor

Comparando las claves de la sección `packages:` del lockfile antes y después
(261 → 272 paquetes):

| Paquete | Antes | Después | Quién lo trae (`pnpm why`) |
|---|---|---|---|
| `@asamuzakjp/dom-selector` | 9.2.4 | 10.0.5 | `jsdom` 30.1.3 |
| `data-urls` | 7.0.0 | 8.0.0 | `jsdom` 30.1.3 |
| `whatwg-url` | 16.0.1 y 17.1.2 | 17.1.2 y 17.3.0 | `jsdom` 30.1.3, `data-urls` 8 |
| `obug` | 2.2.1 | 3.0.0 | `vitest` 5.0.5 |
| `ast-kit` | 2.2.0 | 2.2.0 y **3.0.0** | la 3, `ast-walker-scope` 0.10.0 ← `vue-router` 5.4.0 |
| `@babel/parser`, `@babel/types` | 7.29.8 | 7.29.8, 7.29.11 y **8.0.8** | la 8, `ast-kit` 3 y `ast-walker-scope` 0.10.0 ← `vue-router` 5.4.0 |
| `@babel/helper-string-parser`, `@babel/helper-validator-identifier` | 7.29.7 | se añade una 8.x al lado | ídem |

También entra `tr46` 7.0.0 al lado de la 6.0.0 (de `whatwg-url` 17.3.0) y
`confbox` 0.3.1 al lado de 0.1.8 y 0.2.4. Todos son de los tests o de
herramientas de compilación; ninguno es código que se sirva al navegador.

## Paso 3 — TypeScript 7: falla, se volvió a la 6

Con las catorce ya subidas. `pnpm add -D "typescript@~7.0.2"` (exit 0,
`- typescript 6.0.3` / `+ typescript 7.0.2`); `pnpm ls typescript vue-tsc` →
`typescript@7.0.2`, `vue-tsc@3.3.13`. `vue-tsc` 3.3.13 declara
`peerDependencies: { "typescript": ">=5.0.0" }`.

| Comando | Resultado con TypeScript 7.0.2 + vue-tsc 3.3.13 |
|---|---|
| `pnpm type-check` | **exit 1** |
| `pnpm build` | **exit 1** (`ERROR: "type-check" exited with 1.`) |
| `./init.sh` | **exit 1**. `[FAIL] Fallido: pnpm type-check (exit 1):` en la sección 6b y `[FAIL] Entorno NO está listo. Resuelve los errores antes de avanzar.`; el resto en verde (tsc OK, lint, formato, `126 passed` / `2077 passed`, e2e chromium) |

Error exacto de `pnpm type-check`:

```
$ vue-tsc --build
C:\Users\roybe\Escritorio\proyectos\control-gastos\gastos-frontend\node_modules\.pnpm\vue-tsc@3.3.13_typescript@7.0.2\node_modules\vue-tsc\index.js:68
                throw err;
                ^

Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './lib/tsc' is not defined by "exports" in C:\Users\roybe\Escritorio\proyectos\control-gastos\gastos-frontend\node_modules\.pnpm\vue-tsc@3.3.13_typescript@7.0.2\node_modules\typescript\package.json
    at exportsNotFound (node:internal/modules/esm/resolve:314:10)
    at packageExportsResolve (node:internal/modules/esm/resolve:662:9)
    at resolveExports (node:internal/modules/cjs/loader:707:36)
    at Module._findPath (node:internal/modules/cjs/loader:774:31)
    at Module._resolveFilename (node:internal/modules/cjs/loader:1502:27)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1071:27)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1122:12)
    at require.resolve (node:internal/modules/helpers:171:31)
    at resolveTscPath (C:\Users\roybe\Escritorio\proyectos\control-gastos\gastos-frontend\node_modules\.pnpm\vue-tsc@3.3.13_typescript@7.0.2\node_modules\vue-tsc\index.js:73:43)
    at main (C:\Users\roybe\Escritorio\proyectos\control-gastos\gastos-frontend\node_modules\.pnpm\vue-tsc@3.3.13_typescript@7.0.2\node_modules\vue-tsc\index.js:44:45) {
  code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'
}

Node.js v24.18.0
[ELIFECYCLE] Command failed with exit code 1.
```

Es el mismo error que con 3.3.12 y 3.3.11. Claves de `exports` del
`typescript@7.0.2` instalado:
`./package.json . ./unstable/sync ./unstable/async ./unstable/fs ./unstable/proto ./unstable/ast ./unstable/ast/is ./unstable/ast/factory ./unstable/ast/utils ./unstable/ast/scanner ./unstable/ast/visitor ./unstable/ast/clone`.

**Dato nuevo respecto a la pasada del 2026-10-04:** `./init.sh` ahora sí
detecta TypeScript 7 (exit 1), por el paso de `pnpm type-check` de
`init.local.sh`. El paso 4 (`npx tsc --noEmit --incremental`) siguió diciendo
`Type check OK (tsc sin errores)`.

**Vuelta atrás:** se restauraron `package.json` y `pnpm-lock.yaml` a la copia
guardada tras el paso 2 y `pnpm install --frozen-lockfile` (exit 0,
`- typescript 7.0.2` / `+ typescript 6.0.3`). `grep -c "typescript@7" pnpm-lock.yaml`
→ `0`. `cmp` contra la copia del paso 2: iguales. La 6.0.3 es la última 6.0.x
estable publicada (`pnpm view typescript versions`: después de `6.0.3` no hay
ninguna `6.0.x` estable; `dist-tags`: `latest 7.0.2`, `beta 7.1.0-beta`).

## Paso 4 — Cierre (estado final)

Lanzado después de la vuelta atrás, antes de editar `docs/`:

| Comando | Resultado |
|---|---|
| `grep '"typescript"' package.json` | `"typescript": "~6.0.3",` |
| `pnpm type-check` | **exit 0** (y `--force`, exit 0) |
| `pnpm build` | **exit 0**. `index-R4toWmgH.css 34.76 kB │ gzip: 7.87 kB`, `index-oXIqPBcg.js 376.20 kB │ gzip: 112.11 kB`, `✓ built in 1.01s` |
| `pnpm peers check` | **exit 0**. `No peer dependency issues found` |
| `pnpm outdated` | exit 1, una sola fila: `typescript (dev) │ 6.0.3 │ 7.0.2` |
| `./init.sh` | **exit 0**. `Test Files 126 passed (126)`, `Tests 2077 passed (2077)`, `OK: pnpm type-check (vue-tsc --build, incluye los .vue)`, `E2E smoke verde (chromium)`, `Entorno listo. Puedes empezar a trabajar.` |

`pnpm test:e2e` con los tres navegadores no se repitió en el cierre: el estado
final es byte a byte el del paso 2 (`cmp` de `package.json` y del lockfile), donde
dio los 6 fallos de 2b.

## Decisiones tomadas

- `pnpm add <paquete>@<rango>` en vez de `ncu -u --target minor`, como en la
  pasada anterior; cada paquete conserva su tipo de rango (`^`, `~` en oxlint,
  exacta en prettier).
- `@types/node` y `@lucide/vue` se quedan en la última versión que cumple la
  antigüedad mínima de pnpm, sin crear `pnpm-workspace.yaml`.
- TypeScript 7 se probó en el propio repo y se deshizo.
- Los 6 fallos del e2e en firefox y webkit no se tocan: vienen de antes.

## Documentos actualizados

```
git grep -nE "3\.5\.43|1\.51\.0|4\.0\.3|5\.3\.1|1\.63\.0|26\.6\.4|6\.0\.9|30\.1\.1|9\.0\.3|1\.86\.0|3\.9\.9|8\.3\.2|5\.0\.3|3\.3\.12|1\.86|oxlint 1\." -- . ":!progress" ":!specs" ":!pnpm-lock.yaml" ":!design-system" ":!package.json"
```

Corregidas:

- `docs/stack.md`: Vue `^3.5.44` (l. 34), Pinia `^4.1.0` (l. 41), Vue Router
  `^5.4.0` (l. 53), `@lucide/vue` **1.62.0** / `^1.62.0` (l. 288), Vite `^8.3.5`
  y `@vitejs/plugin-vue` `^6.0.10` (l. 346), Prettier `3.9.10` (l. 374), oxlint
  `~1.90.0` (l. 408), Vitest `^5.0.5` y jsdom `^30.1.3` (l. 469), Playwright
  `^1.64.1` (l. 480).
- `docs/stack.md` → «Mantenimiento de dependencias»: nota «Última pasada» con
  fecha 2026-10-28 y este informe (las dos pasadas anteriores siguen citadas);
  sección nueva «Lo que subió por debajo en la pasada del 2026-10-28» (la del
  2026-10-04 se conserva debajo); «Por qué TypeScript 7 no entra (todavía)»:
  fecha y versión de la prueba nueva (la del 2026-10-04 se conserva), resultado
  de `./init.sh` con el paso de `pnpm type-check` ya puesto, y «Cuándo
  reintentarlo» pasa a «posterior a la 3.3.13»; «Otras trampas conocidas»: que
  `pnpm outdated` no enseña las versiones demasiado nuevas, con el caso de esta
  pasada.
- `docs/conventions.md:68`: Prettier `3.9.9` → `3.9.10`.

No tocadas:

- `docs/roadmap.md:455`: la coincidencia es una cifra en euros dentro de un cabo
  suelto cerrado, no una versión.
- `docs/stack.md` en la sección de mantenimiento: las menciones a jsdom 30.1.1,
  vitest 5.0.3, vue-tsc 3.3.12 / 3.3.11 y oxlint 1.73 / 1.77 cuentan lo que pasó
  en pasadas anteriores; siguen siendo verdad como historia.
- `npm-run-all2` y `@types/node` no tienen versión citada en `docs/`.

## Último ./init.sh

Exit 0 (tabla del paso 4). Repetido después de editar `docs/` y escribir este
informe: **exit 0**, `Tests 2077 passed (2077)`, `E2E smoke verde (chromium)`,
`Entorno listo. Puedes empezar a trabajar.` `git status --short` después:
`docs/conventions.md`, `docs/stack.md`, `package.json`, `pnpm-lock.yaml`,
`progress/current.md` y este informe, sin nada más.

## Sugerencias fuera de scope (NO aplicadas)

- Los 6 fallos del e2e en firefox y webkit (2b) merecen un cabo suelto en
  `docs/roadmap.md`: `./init.sh` solo corre chromium y por eso no salen en
  ninguna pasada.
- pnpm avisa de que hay pnpm 12.16.1 (`Update available! 11.22.0 → 12.16.1`); es
  una versión mayor del gestor de paquetes y no entraba en la lista del humano.
