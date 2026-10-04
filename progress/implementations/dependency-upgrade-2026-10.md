# dependency-upgrade-2026-10 — implementación

Tarea de mantenimiento del 2026-10-04 (no es una feature de `feature_list.json`):
subir las versiones de las dependencias que se pueden subir. Sin commits.

Entorno: Node v24.18.0, pnpm 11.22.0, Windows.

## Archivos modificados / creados

- `package.json` — once rangos de versión subidos. Ninguna dependencia añadida ni quitada.
- `pnpm-lock.yaml` — regenerado por `pnpm add`.
- `docs/stack.md` — versiones citadas, línea «Última pasada», sección de TypeScript 7.
- `docs/conventions.md` — una línea: Prettier `3.9.6` → `3.9.9`.
- `progress/current.md` — nota de la tarea.
- `progress/implementations/dependency-upgrade-2026-10.md` — este informe.

**Ningún archivo de código ni de test tocado** (`src/`, `e2e/`, configuraciones).
No se creó `pnpm-workspace.yaml` (comprobado con `ls`: no existe).

## Versiones que quedaron

| Paquete | Antes (instalada) | Ahora (instalada) | Rango en `package.json` |
|---|---|---|---|
| `vue` | 3.5.42 | 3.5.43 | `^3.5.43` |
| `@lucide/vue` | 1.45.0 | 1.51.0 | `^1.51.0` |
| `vite` | 8.3.0 | 8.3.2 | `^8.3.2` |
| `@vitejs/plugin-vue` | 6.0.8 | 6.0.9 | `^6.0.9` |
| `vitest` | 5.0.0 | 5.0.3 | `^5.0.3` |
| `@vue/test-utils` | 2.5.0 | 2.5.1 | `^2.5.1` |
| `jsdom` | 30.0.1 | 30.1.1 | `^30.1.1` |
| `vue-tsc` | 3.3.11 | 3.3.12 | `^3.3.12` |
| `oxlint` | 1.82.0 | 1.86.0 | `~1.86.0` |
| `prettier` | 3.9.6 | 3.9.9 | `3.9.9` (exacta) |
| `@types/node` | 26.5.1 | 26.6.4 | `^26.6.4` |
| `typescript` | 6.0.3 | 6.0.3 (sin cambio) | `~6.0.3` |

Las demás (`pinia` 4.0.3, `vue-router` 5.3.1, `@playwright/test` 1.63.0,
`tailwindcss` y `@tailwindcss/vite` 4.3.3, `@tsconfig/node24` 24.0.5,
`@vue/tsconfig` 0.9.1, `npm-run-all2` 9.0.3) no aparecían en `pnpm outdated` y
no se tocaron. Playwright no subió: no hubo que bajar navegadores.

## Paso 1 — Línea base, antes de tocar nada

| Comando | Resultado |
|---|---|
| `./init.sh` | exit 0. tsc OK, `lint:oxlint:check` OK, `format:check` OK, Vitest v5.0.0 `Test Files 104 passed (104)`, `Tests 1703 passed (1703)`, e2e de chromium verde, `[OK] Entorno listo` |
| `pnpm type-check` | exit 0 |
| `pnpm build` | exit 0. vite v8.3.0, `2076 modules transformed`, JS 292.91 kB (gzip 90.30 kB), CSS 32.84 kB |
| `pnpm peers check` | exit 0. `No peer dependency issues found` |
| `pnpm outdated` | exit 1 (es su salida cuando lista algo). Las mismas 11 que leyó el leader, más `typescript` 6.0.3 → 7.0.2 |

## Paso 2 — Las menores y de parche, juntas

Comandos (`ncu` no está instalado en el proyecto; se usó `pnpm add` con el
mismo tipo de rango que ya tenía cada paquete):

```
pnpm add "vue@^3.5.43" "@lucide/vue@^1.51.0"
pnpm add -D "vite@^8.3.2" "@vitejs/plugin-vue@^6.0.9" "vitest@^5.0.3" "@vue/test-utils@^2.5.1" "jsdom@^30.1.1" "vue-tsc@^3.3.12" "oxlint@~1.86.0" "@types/node@^26.6.4"
pnpm add -D -E "prettier@3.9.9"
```

Los tres con exit 0. pnpm no rechazó ninguna versión por antigüedad mínima:
se instaló en todas la última que ofrecía `pnpm outdated`.

Verificación después:

| Comando | Resultado |
|---|---|
| `./init.sh` | exit 0. tsc OK, `lint:oxlint:check` OK, `format:check` OK, Vitest v5.0.3 `104 passed`, `1703 passed`, e2e de chromium verde |
| `pnpm type-check` | exit 0 |
| `pnpm type-check --force` | exit 0 (lanzado además porque `vue-tsc --build` es incremental) |
| `pnpm build` | exit 0. vite v8.3.2, `2108 modules transformed`, JS 293.58 kB (gzip 90.58 kB), CSS 32.84 kB |
| `pnpm peers check` | exit 0. `No peer dependency issues found` |

`oxlint` 1.86.0 y `prettier` 3.9.9 no marcaron ni pidieron reformatear ningún
archivo: los dos pasos salieron en verde sin cambiar nada. `git status` tras la
verificación solo mostraba `package.json`, `pnpm-lock.yaml` y
`progress/current.md`.

## Paso 3 — TypeScript 7: falla, se volvió a la 6

Probado con las menores ya subidas y verificadas. `pnpm add -D "typescript@~7.0.2"`
(exit 0); `pnpm ls` confirmó `typescript@7.0.2` y `vue-tsc@3.3.12`.

| Comando | Resultado con TypeScript 7.0.2 + vue-tsc 3.3.12 |
|---|---|
| `pnpm type-check` | **exit 1** |
| `pnpm build` | **exit 1** (`ERROR: "type-check" exited with 1.`) |
| `./init.sh` | exit 0 (tsc OK, lint OK, formato OK, 104 archivos y 1703 tests, e2e de chromium verde) |

Error exacto de `pnpm type-check`:

```
$ vue-tsc --build
…\node_modules\.pnpm\vue-tsc@3.3.12_typescript@7.0.2\node_modules\vue-tsc\index.js:68
                throw err;
                ^

Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './lib/tsc' is not defined by "exports" in …\node_modules\.pnpm\vue-tsc@3.3.12_typescript@7.0.2\node_modules\typescript\package.json
    at exportsNotFound (node:internal/modules/esm/resolve:314:10)
    …
    at require.resolve (node:internal/modules/helpers:171:31)
    at resolveTscPath (…\vue-tsc\index.js:73:43)
    at main (…\vue-tsc\index.js:44:45) {
  code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'
}
```

Es el mismo error que `docs/stack.md` recogía para `vue-tsc` 3.3.11. Las claves
de `exports` de `typescript@7.0.2`, leídas del `package.json` instalado:
`./package.json`, `.`, y once rutas `./unstable/*` (`sync`, `async`, `fs`,
`proto`, `ast`, `ast/is`, `ast/factory`, `ast/utils`, `ast/scanner`,
`ast/visitor`, `ast/clone`). No hay `./lib/*`.

**Dato que no estaba escrito:** `./init.sh` termina con exit 0 con TypeScript 7
instalado, porque no ejecuta `vue-tsc` ni el build. Queda apuntado en
`docs/stack.md`.

**Vuelta atrás:** se restauraron `package.json` y `pnpm-lock.yaml` a como
quedaron tras el paso 2 (copia guardada antes de la prueba, fuera del repo) y
se lanzó `pnpm install --frozen-lockfile` (exit 0, `- typescript 7.0.2` /
`+ typescript 6.0.3`). `grep -c "typescript@7" pnpm-lock.yaml` → 0. Los
comandos del cierre, abajo, son posteriores a esta vuelta atrás.

## Paso 4 — Cierre (estado final)

| Comando | Resultado |
|---|---|
| `./init.sh` | **exit 0**. `Type check OK (tsc sin errores)`, `OK: pnpm lint:oxlint:check`, `OK: pnpm format:check`, Vitest v5.0.3 `Test Files 104 passed (104)`, `Tests 1703 passed (1703)`, `Cabeceras Archivos: de 16 tasks.md: ninguna declara dos rutas…`, `E2E smoke verde (chromium)`, `[OK] Entorno listo. Puedes empezar a trabajar.` |
| `pnpm type-check` | **exit 0** (y `pnpm type-check --force`, exit 0) |
| `pnpm build` | **exit 0**. vite v8.3.2, `✓ 2108 modules transformed`, `dist/index.html 0.61 kB`, `dist/assets/index-DRSQdJEe.css 32.84 kB │ gzip: 7.47 kB`, `dist/assets/index-Bl3V7mJM.js 293.58 kB │ gzip: 90.58 kB` |
| `pnpm peers check` | **exit 0**. `No peer dependency issues found` |
| `pnpm outdated` | exit 1, una sola fila: `typescript (dev) │ 6.0.3 │ 7.0.2` |

Estos cinco se lanzaron antes de editar `docs/stack.md` y `docs/conventions.md`.
Tras editar los dos documentos y escribir este informe se volvió a lanzar
`./init.sh`: exit 0, mismas líneas (104 archivos, 1703 tests, e2e de chromium
verde). Los otros cuatro no se repitieron después de las ediciones de `docs/`.

## Decisiones tomadas

- `pnpm add <paquete>@<rango>` en vez de `ncu -u --target minor`: `ncu` no es
  dependencia del proyecto y la lista ya la daba `pnpm outdated`.
- Cada paquete conserva el tipo de rango que tenía: `^` en general, `~` en
  `oxlint`, versión exacta en `prettier`.
- TypeScript 7 se probó en el propio repo (no en una copia) y se deshizo.

## Documentos actualizados

`git grep -nE "3\.5\.42|1\.45\.0|8\.3\.0|6\.0\.8|5\.0\.0|2\.5\.0|30\.0\.1|3\.3\.11|1\.82\.0|3\.9\.6|26\.5\.1|progress/implementation/" -- . ":!progress" ":!specs" ":!pnpm-lock.yaml" ":!design-system"`

Corregidas:

- `docs/stack.md`: Vue `^3.5.43`; `@vue/test-utils` `^2.5.1`; `@lucide/vue`
  1.51.0 / `^1.51.0`; Vite `^8.3.2` y `@vitejs/plugin-vue` `^6.0.9`; Prettier
  `3.9.9`; oxlint `~1.86.0`; Vitest `^5.0.3` y jsdom `^30.1.1`.
- `docs/stack.md` → «Mantenimiento de dependencias»: «Última pasada» con fecha
  2026-10-04 y este informe; la ruta del informe de la feature 12 pasa de
  `progress/implementation/…` a `progress/implementations/…` (el archivo existe
  ahí, comprobado).
- `docs/stack.md` → «Por qué TypeScript 7 no entra (todavía)»: fecha de la
  prueba, `vue-tsc` 3.3.12, el error exacto, que `./init.sh` no lo detecta, y
  cuándo reintentarlo.
- `docs/conventions.md:68`: Prettier `3.9.6` → `3.9.9`.

No tocadas:

- `docs/verification.md:159` (`GNU Awk 5.0.0`): no es una dependencia del proyecto.
- `feature_list.json:256` cita `progress/implementation/` en el `acceptance` de
  una feature cerrada; la carpeta se llama `progress/implementations/`. No se
  tocó porque la tarea prohíbe editar ese archivo: queda para el leader.

## Último ./init.sh

Exit 0, ver la tabla del paso 4.

## Sugerencias fuera de scope (NO aplicadas)

- `./init.sh` no ejecuta `vue-tsc` ni el build, y por eso terminó con exit 0 con
  una versión de TypeScript que rompe `pnpm type-check` y `pnpm build`. Un paso
  en `init.local.sh` que lance `pnpm type-check` lo cubriría; cuesta unos
  segundos por pasada.
- `docs/stack.md` → «Cómo se hace una actualización aquí» nombra `ncu`, que no
  está instalado en el proyecto.
