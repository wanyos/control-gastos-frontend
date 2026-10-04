# dependency-upgrade-2026-10 — revisión

## Review (2026-10-04)

**Veredicto:** APPROVED
Tarea de mantenimiento, no es una feature de `feature_list.json`: no hay
`acceptance`, ni spec, ni `checks` propios. Comprobado lo pedido contra
ejecuciones mías. Sin cambios requeridos. Al final hay cuatro observaciones que
no bloquean; decide el leader.
Resumen de cierre: `progress/summaries/dependency-upgrade-2026-10.md`.

Entorno de mis ejecuciones: Node v24.18.0, pnpm 11.22.0, `bash` de Git para
Windows. Todo lanzado después de las ediciones de `docs/`, con el árbol de
trabajo tal como lo dejó el implementer (nada commiteado).

### Qué ejecuté y qué salió

| # | Qué | Comando | Resultado |
|---|---|---|---|
| 1 | Verificación completa | `./init.sh` | `exit=0`. `Type check OK (tsc sin errores)`, `OK: pnpm lint:oxlint:check`, `OK: pnpm format:check`, Vitest `RUN v5.0.3`, `Test Files 104 passed (104)`, `Tests 1703 passed (1703)`, `Cabeceras Archivos: de 16 tasks.md: ninguna…`, `E2E smoke verde (chromium)`, `[OK] Entorno listo`. Ningún `[FAIL]` ni `[WARN]` |
| 1 | Tipos con los `.vue` | `pnpm type-check` y `pnpm type-check --force` | los dos `exit=0` |
| 1 | Build | `pnpm build` | `exit=0`. `vite v8.3.2`, `✓ 2108 modules transformed`, `dist/assets/index-DRSQdJEe.css 32.84 kB │ gzip: 7.47 kB`, `dist/assets/index-Bl3V7mJM.js 293.58 kB │ gzip: 90.58 kB` (los mismos nombres y tamaños que da el informe) |
| 1 | Peers | `pnpm peers check` | `exit=0`, `No peer dependency issues found` |
| 1 | Lo que queda por subir | `pnpm outdated` | `exit=1`, una sola fila: `typescript (dev) │ 6.0.3 │ 7.0.2` |
| 2 | Lockfile y `node_modules` cuadran | `pnpm install --frozen-lockfile` | `exit=0`, `Already up to date`. `git status --short` después: los mismos cinco ` M` y el informe sin seguimiento |
| 2 | Versiones instaladas | `pnpm list --depth 0` | `@lucide/vue@1.51.0`, `vue@3.5.43`, `@types/node@26.6.4`, `@vitejs/plugin-vue@6.0.9`, `@vue/test-utils@2.5.1`, `jsdom@30.1.1`, `oxlint@1.86.0`, `prettier@3.9.9`, `vite@8.3.2`, `vitest@5.0.3`, `vue-tsc@3.3.12`, `typescript@6.0.3`. Las once coinciden con el informe. Sin cambio: `pinia@4.0.3`, `vue-router@5.3.1`, `@playwright/test@1.63.0`, `tailwindcss` y `@tailwindcss/vite` `4.3.3`, `@tsconfig/node24@24.0.5`, `@vue/tsconfig@0.9.1`, `npm-run-all2@9.0.3`. 20 paquetes |
| 3 | Solo se subieron versiones | script de `node` que compara `git show HEAD:package.json` con el actual | `dependencies`: 4 claves antes y 4 ahora, añadidas `[]`, quitadas `[]`. `devDependencies`: 16 y 16, `[]`, `[]`. 11 rangos cambiados, los once con el mismo tipo de rango: nueve `^`, `oxlint` `~1.82.0 → ~1.86.0`, `prettier` `3.9.6 → 3.9.9` (exacta). **Ningún rango cambió de tipo.** Ningún otro campo de `package.json` cambió (`scripts`, `engines`) |
| 4 | `typescript` igual que estaba | `git show HEAD:package.json \| grep typescript` y `grep typescript package.json` | las dos: línea 39, `"typescript": "~6.0.3"` |
| 4 | Sin rastro de la 7 en el lockfile | `grep -c "typescript@7" pnpm-lock.yaml`; `grep -n "7\.0\.2" pnpm-lock.yaml` | `0`; la única línea con `7.0.2` es la 1036, `oxlint-tsgolint: '>=7.0.2003'` (un peer opcional de oxlint, no TypeScript). El lockfile resuelve `typescript@6.0.3` (líneas 60-62 y 1207) |
| 5 | No se tocó código ni tests | `git status --short`; `git diff --stat` | cinco ` M` (`docs/conventions.md`, `docs/stack.md`, `package.json`, `pnpm-lock.yaml`, `progress/current.md`) y `?? progress/implementations/dependency-upgrade-2026-10.md`. Nada en `src/`, `e2e/` ni en los archivos de configuración |
| 5 | Sin `pnpm-workspace.yaml` ni exclusiones de antigüedad mínima | `ls pnpm-workspace.yaml .npmrc`; `grep -rn minimumReleaseAge package.json pnpm-lock.yaml` | `No such file or directory` los dos; 0 líneas. `git status --short --ignored` solo añade `.vscode/settings.json`, `dist/`, `playwright-report/` y `tsconfig.tsbuildinfo`. El bloque `settings` del lockfile no cambia |
| 8 | Versiones antiguas citadas como actuales | el mismo `git grep -nE "3\.5\.42\|1\.45\.0\|8\.3\.0\|6\.0\.8\|5\.0\.0\|2\.5\.0\|30\.0\.1\|3\.3\.11\|1\.82\.0\|3\.9\.6\|26\.5\.1"` del informe, fuera de `progress`, `specs`, `pnpm-lock.yaml` y `design-system` | dos líneas, ninguna es una versión actual: `docs/stack.md:668` (`vue-tsc` 3.3.11, citada como la de la feature #12) y `docs/verification.md:159` (`GNU Awk 5.0.0`) |
| 8 | Las versiones que citan los documentos son las instaladas | lectura de `docs/stack.md` y del diff de `docs/conventions.md` contra la salida de `pnpm list` | coinciden: Vue `^3.5.43` (l. 34), `@vue/test-utils` `^2.5.1` (l. 86), `@lucide/vue` 1.51.0 (l. 288), Vite `^8.3.2` y `@vitejs/plugin-vue` `^6.0.9` (l. 338), Prettier `3.9.9` (l. 366 y `docs/conventions.md:68`), oxlint `~1.86.0` (l. 400), Vitest `^5.0.3` y jsdom `^30.1.1` (l. 461), y las que no cambiaron (TypeScript, Pinia, Vue Router, Tailwind, Playwright) |
| 3b | Datos del humano en lo que va a git | `grep -c roybe` sobre el informe, `docs/stack.md` y `progress/current.md` | 0 en los tres: las rutas del error van con `…` |

### El diff del lockfile (punto 6)

Comparé con un script de `node` las versiones de la sección `packages:` del
lockfile de `HEAD` y del actual: 237 paquetes antes, 234 ahora, 80 con alguna
versión distinta. Ningún paquete nuevo.

Casi todo son los once paquetes y sus piezas (los 19 binarios de `oxlint`, los
15 de `rolldown` 1.2.8 → 1.2.12, los `@vue/*` 3.5.43, `@vitest/*` 5.0.3,
`@vue/language-core` 3.3.12). **Cinco dependencias indirectas cambian de versión
mayor**, todas detrás de paquetes que solo se usan al lanzar los tests:

| Paquete | Antes | Ahora | Quién lo trae |
|---|---|---|---|
| `@asamuzakjp/css-color` | 6.0.5 | 7.1.3 | `jsdom` 30.1.1 |
| `@asamuzakjp/dom-selector` | 8.3.2 | 9.2.4 | `jsdom` 30.1.1 |
| `html-encoding-sniffer` | 6.0.0 | 7.0.0 | `jsdom` 30.1.1 |
| `w3c-xmlserializer` | 5.0.0 | 6.0.0 | `jsdom` 30.1.1 |
| `why-is-node-running` | 2.3.0 | 3.2.1 | `vitest` 5.0.3 |

Quién lo trae está leído en la sección `snapshots:` del lockfile. Desaparecen
tres paquetes: `symbol-tree` (de `jsdom`), `siginfo` y `stackback` (de
`why-is-node-running` 2). Ninguno de los ocho entra en el build de producción.
`@asamuzakjp/dom-selector` es lo que `jsdom` usa para resolver selectores CSS,
así que es el cambio que más podría notarse en los tests de componentes: los
1703 pasan con él. No lo considero un hallazgo; ver observación 2.

Otros cambios indirectos, sin cambio de versión mayor: `undici` 8.9.0 → 8.11.2 y
`bidi-js` 1.0.3 → 1.1.0 (los dos de `jsdom`), `@oxc-project/types` 0.149.0 →
0.152.0. `postcss`, `nanoid` y `@jridgewell/sourcemap-codec` pasan de dos
versiones resueltas a una.

### TypeScript 7 (punto 7)

Lo repetí, **en una copia fuera del repositorio** (los archivos con seguimiento
de `src/`, `e2e/`, los `tsconfig*.json`, `package.json` y el lockfile, copiados a
la carpeta temporal de la sesión; el repositorio no se tocó: `git status --short`
y `pnpm list` después dan lo mismo que antes, con `typescript@6.0.3`).

| Comando en la copia | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` y `pnpm type-check` (control, con la 6.0.3) | los dos `exit=0` |
| `pnpm add -D "typescript@~7.0.2"` | `exit=0`; `pnpm list`: `typescript@7.0.2`, `vue-tsc@3.3.12` |
| `pnpm type-check` | **`exit=1`**. `Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './lib/tsc' is not defined by "exports" in …\vue-tsc@3.3.12_typescript@7.0.2\node_modules\typescript\package.json`, `at resolveTscPath`, `code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'` |
| `pnpm build` | **`exit=1`**, `ERROR: "type-check" exited with 1.` |
| `npx tsc --noEmit --incremental` (el comando de tipos que lanza `./init.sh`) | `exit=0`, sin salida; `npx tsc --version` → `Version 7.0.2` |
| claves de `exports` de `typescript@7.0.2` | `./package.json`, `.`, y las once `./unstable/*` que lista el informe. Ninguna `./lib/*` |
| `pnpm view vue-tsc version` | `3.3.12`: sigue siendo la última publicada |

`docs/stack.md:645-683` dice lo mismo que salió: fecha (2026-10-04), versiones
(`vue-tsc` 3.3.12, `typescript` 7.0.2), el error con su texto, que `pnpm build`
cae con él y que es el mismo error de la feature #12. La conclusión («sigue sin
entrar») se sostiene: es un fallo al arrancar `vue-tsc`, antes de mirar ningún
archivo, y no hay una versión de `vue-tsc` más nueva que probar.

**Lo que no he comprobado:** `./init.sh` entero con TypeScript 7 instalado. En
la copia solo lancé su comando de tipos (`exit=0`); no los pasos de lint,
formato, tests unitarios ni e2e. Para comprobarlo haría falta instalar la 7 en
el repositorio o llevar a la copia `init.sh` y el resto del harness.

### Vocabulario (punto 9)

Leídos el diff de `docs/stack.md`, el de `docs/conventions.md`, el de
`progress/current.md` y el informe. No introducen ningún nombre corto: lo nuevo
se describe con comandos, versiones y fechas. `grep -inE
"puerta|red de seguridad|guardi|protecci|gate"` sobre las líneas añadidas del
diff y sobre el informe: 0 líneas en los dos.

### Las tres cosas que el implementer señala fuera de su encargo

1. **`feature_list.json:256` — cierta.** `grep -n "progress/implementation/"
   feature_list.json` da esa línea («…lo anota en progress/implementation/ y no
   bloquea el cierre»); `ls progress` da `implementations/`. Es la única
   aparición fuera de `progress/` y `specs/`.
2. **`docs/stack.md` nombra `ncu` — cierta a medias.** Lo nombra en las líneas
   630 y 634. No es dependencia del proyecto: 0 apariciones de
   `npm-check-updates` en `package.json` y en `pnpm-lock.yaml`, y no está en
   `node_modules/.bin`. **Pero sí está instalado en esta máquina, de forma
   global:** `which ncu` → `…/AppData/Roaming/npm/ncu`, `ncu --version` →
   `22.2.0`. La frase del informe («no está instalado en el proyecto») es exacta;
   «no está instalado», a secas, no lo es. Ver observación 1.
3. **`./init.sh` no lanza `pnpm type-check` — cierta en lo que he podido
   comprobar.** `grep -n "vue-tsc\|type-check\|pnpm build" init.sh
   init.local.sh` no da ninguna línea que los ejecute, y
   `docs/verification.md:187-193` ya lo dice. Con TypeScript 7 instalado, el
   comando de tipos de `./init.sh` sale con 0 mientras `pnpm type-check` sale
   con 1 (tabla de arriba). Que `./init.sh` entero terminara con exit 0 es lo
   que dice el informe; no lo he repetido. Añadir el paso a `init.local.sh` es
   una decisión del humano, no un fallo de esta tarea.

### Observaciones (no bloquean; decide el leader)

1. **El procedimiento escrito y lo que se hizo usan herramientas distintas.**
   `docs/stack.md:634` dice `ncu -u --target minor`; se usó `pnpm outdated` y
   `pnpm add`. El resultado es el que pide el procedimiento (tabla, filas 1 a
   3), y `ncu` existe en esta máquina pero no viaja con el repositorio. Conviene
   que el documento diga uno de los dos, el que el humano prefiera.
2. **Los cinco cambios de versión mayor indirectos no están en el informe ni en
   `docs/stack.md`.** Llegan con una subida menor de `jsdom` (30.0.1 → 30.1.1) y
   una de parche de `vitest`. No rompen nada hoy.
3. **`./init.sh` entero con TypeScript 7** lo ha lanzado solo el implementer
   (`docs/stack.md:669-672` lo afirma con su resultado).
4. **`progress/current.md`** queda con la nota de esta tarea («hecho, sin
   commits, pendiente de revisión»): hay que vaciarla al cerrar.

### Comprobado sin hallazgos

`./init.sh`, `pnpm type-check` (y con `--force`), `pnpm build`, `pnpm peers
check`, `pnpm outdated`, `pnpm install --frozen-lockfile`, `pnpm list --depth 0`
contra `package.json`, claves y tipos de rango de `package.json` contra `HEAD`,
`typescript` idéntico a `HEAD` y sin rastro de la 7 en el lockfile, ningún
archivo de código ni de test tocado, sin `pnpm-workspace.yaml`, diff del
lockfile paquete a paquete, TypeScript 7 repetido en una copia, versiones de
`docs/stack.md` y `docs/conventions.md` contra las instaladas, vocabulario,
`docs/lessons.md` (sin entradas), datos del humano en archivos que van a git
(ninguno), CHECKPOINTS C1, C2, C3 (ninguna dependencia nueva) y C5 (ningún
archivo sin seguimiento aparte del informe).
