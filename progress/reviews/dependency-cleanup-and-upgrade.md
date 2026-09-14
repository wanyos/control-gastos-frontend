# Review — feature 12 `dependency-cleanup-and-upgrade`

**Veredicto:** APPROVED (condicionado a repetir `./init.sh` en verde tras reiniciar el dev server de `:5173`; ver *Verificación ejecutada*)

Feature no SDD: no aplican trazabilidad de requirements ni tasks.

## Criterios de aceptación (siempre)

- [x] 1. Auditoría escrita → `progress/implementation/dependency-cleanup-and-upgrade.md`, tablas *dependencies* / *devDependencies*: cada paquete con archivo de uso o razón (peer, `extends`, `types`, motor de `vue-tsc`). Contrastado con grep en `src/`, `e2e/`, configs, `tsconfig*`, `init.sh`: ningún paquete eliminado tiene import o referencia; los 20 restantes tienen uso real.
- [x] 2. `@vue/devtools-api` y `@types/jsdom` fuera (`package.json`). `jsdom` fuera de `types` en `tsconfig.vitest.json:15`. `@vue/devtools-api` sigue resuelta como peer de `pinia` 4.0.3 y dependencia de `vue-router` 5.3.1 (`pnpm-lock.yaml:16,2274,2464`; `autoInstallPeers: true` en `settings`); `pnpm peers check` → sin problemas.
- [x] 3. `vite-plugin-vue-devtools` fuera de `package.json` y de `vite.config.ts:9`. Comprobado con un dev server propio en `:5191`: el HTML servido no contiene ninguna referencia a devtools.
- [x] 4. Lint solo oxlint: `eslint.config.ts` borrado, script `lint:eslint` fuera (`package.json:14-15`), los 9 paquetes ESLint + `jiti` fuera, `.eslintcache` no existe y su línea sale de `.gitignore`. `.oxlintrc.json` activa `eslint/typescript/unicorn/oxc/vue`, `correctness`+`suspicious`, las reglas TS del recomendado y override `vitest` para `src/**/__tests__/**`. Cobertura perdida listada (plantillas Vue ~56 reglas, Playwright 36 reglas) en el informe y en `docs/stack.md:368`.
- [x] 5. `npm-run-all2` se mantiene (usado en `build` y `lint`).
- [x] 6. Grep de `eslint` / `devtools` en todo el repo (sin `node_modules`, `dist`, `design-system`, informes históricos de `progress/`): solo quedan menciones legítimas (nombres de plugin/reglas en `.oxlintrc.json`, notas históricas en `docs/stack.md` / `docs/conventions.md`, texto de `feature_list.json`, y la extensión de navegador Vue.js devtools en `README.md:12-16`, que sigue existiendo). `.claude/agents/leader.md`, `.vscode/extensions.json`, `tsconfig.node.json`, `docs/verification.md:104` y `README.md:69` actualizados. `init.sh` no tenía referencias.
- [x] 7. Versiones: `pnpm outdated` solo muestra `typescript 6.0.3 → 7.0.2`. Vitest 5.0.0 confirmado. TS 7 justificado en `docs/stack.md:496` con la evidencia `ERR_PACKAGE_PATH_NOT_EXPORTED` en `vue-tsc` 3.3.11.
- [x] 8. `docs/stack.md` refleja versiones finales, sección *Lint (solo oxlint)* (`:337`), tipos DOM en tests (`:397`), sin `pnpm-workspace.yaml`, Vitest 5.
- [x] 9. `pnpm-workspace.yaml` borrado. `git show HEAD:pnpm-workspace.yaml` confirma que solo contenía `minimumReleaseAgeExclude` (33 entradas): sin `packages`, `onlyBuiltDependencies`, `overrides` ni otros ajustes. No hay uno en carpetas superiores. El lockfile no tiene `esbuild` ni `requiresBuild`; oxlint, tailwind oxide y rolldown llegan como bindings nativos opcionales (instalados los `win32-x64-msvc`), así que quitar el fichero no cambia qué scripts de build se ejecutan. `pnpm install --frozen-lockfile` → «Already up to date».
- [x] 10. Sin cambios de comportamiento ni visuales: `pnpm build` da el CSS con el mismo hash que el informe declara para `HEAD` (`index-Cp3V8v7O.css`, 24.95 kB), JS 118.51 kB. Único cambio en `src/`: un comentario en `src/shared/config.ts:59`. El nuevo `headless` de `playwright.config.ts:54` es booleano equivalente al ternario anterior. E2E de humo verde contra dev server propio y contra el build.
- [x] 11. install / type-check / lint / test:unit / build en verde (ver abajo). `./init.sh`: secciones 1–5 verdes; sección 6 roja solo por entorno (ver abajo). E2E de humo sin cambios (`e2e/` no está en el diff).

## Arquitectura (docs/architecture.md)

- [x] No se tocan capas ni estructura de `src/`; solo configuración de tooling.
- [x] No se introducen dependencias nuevas (se quitan 12 y se suben versiones).

## Convenciones (docs/conventions.md)

- [x] Estilo, nombres, imports: `docs/conventions.md:68-72` actualizado a oxlint; el comentario de `config.ts:59` en inglés, con motivo tras `--`.
- [x] Manejo de errores: sin cambios (la validación con `new URL` en `try/catch` sigue igual).

## Verificación (docs/verification.md)

- [x] Tests usan los recursos correctos: 254 tests intactos, `vitest.config.ts` sin cambios, ningún spec modificado (no se relajó nada).
- [x] Tests verifican output concreto: los mismos que antes; el e2e verifica montaje, tokens y cero errores de consola.

## Revisión de `.oxlintrc.json` y reglas desactivadas

- `unicorn/no-array-sort` (`.oxlintrc.json:24`): relancé la regla aislada. Los 7 casos (`NetWorthView.vue:122`, `BankCard.vue:87`, `breakdown.ts:123`, `breakdown.spec.ts:94,96,97`, `theme-dark.spec.ts:112`) ordenan una copia (spread, resultado de `.map`, literal de array). Falsos positivos reales; `toSorted()` requiere `ES2023.Array`, fuera de la `lib` actual. ESLint no tenía esta regla: no es cobertura perdida.
- `unicorn/consistent-function-scoping`: 6 casos, helpers locales en specs y el de `page.evaluate` en `e2e/app-boot.spec.ts:55`, que tiene que vivir en el callback (se serializa al navegador). Falso positivo real; tampoco existía en ESLint.
- `oxlint-disable-next-line no-new` en `src/shared/config.ts:59`: `new URL(raw)` dentro de `try` es la validación; disable de una línea y con motivo. Correcto.
- `tsconfig.vitest.json:14`: `lib` = `ES2022, ES2023.Intl, DOM, DOM.Iterable`, idéntica a `tsconfig.app.json`; `vue-tsc --build` en verde.
- `forbidOnly` en CI sigue en `playwright.config.ts:33` como mitigación de `test.only`.

## CHECKPOINTS.md

- [ ] C1 — Arnés completo → archivos base y docs presentes; `./init.sh` sale con exit 1 solo por el e2e contra el dev server viejo de `:5173` (condición de entorno, ver abajo). Hay que repetirlo tras el reinicio.
- [x] C2 — Estado coherente (solo la 12 en `in_progress`; `progress/current.md` describe la sesión activa)
- [x] C3 — Arquitectura (sin dependencias nuevas; sin logs de debug ni TODOs añadidos)
- [x] C4 — Verificación real (254 unit + e2e de humo verde en `:5191` dev y en `:8099` preview)
- [ ] C5 — Sesión cerrada bien → pendiente del cierre: entrada de la 12 en `progress/history.md` y paso a `done`. No bloqueante (lo hace el flujo tras aprobar). Único untracked: el informe del implementer.
- [x] C6 — No afecta al contrato con el backend
- [x] C7 — No aplica (no SDD)
- [x] C8 — Resumen de cierre escrito

## Verificación ejecutada por el reviewer

- `pnpm install --frozen-lockfile` → «Already up to date»; `pnpm peers check` → «No peer dependency issues found»
- `pnpm outdated` → solo `typescript 6.0.3 → 7.0.2`
- `pnpm type-check` → exit 0
- `pnpm lint` → exit 0; `npx oxlint .` sin `--fix` → exit 0; el diff no cambia tras `--fix`
- `pnpm test:unit` → Vitest 5.0.0, 18 archivos, 254/254
- `pnpm build` → OK, `index-Cp3V8v7O.css` 24.95 kB, `index-lO3-aFct.js` 118.51 kB
- E2E humo modo CI (`E2E_PREVIEW_PORT=8099`, chromium) → 1 passed
- E2E humo contra dev server propio en `:5191` (config temporal borrada, servidor parado después) → 1 passed
- `./init.sh` → secciones 1–5 OK (tsc, 254 tests); sección 6 FAIL: `#app > div` = 0. Diagnóstico sin tocar `:5173`: el proceso que escucha (PID 22688) arrancó el 2026-09-12 20:38, antes del cambio de `node_modules`, y en Chromium responde 404 a `/@vite/client`. Es la condición de entorno anunciada, no un defecto de la feature: el mismo test pasa en `:5191` y en preview. **Hay que repetir `./init.sh` después de que el humano reinicie su `pnpm dev`, antes de marcar `done`.**

## Resumen de cierre (si APPROVED)

- Escrito en `progress/summaries/dependency-cleanup-and-upgrade.md` → sí

## Cambios requeridos (si aplica)

Ninguno.

## Notas no bloqueantes

1. `unicorn/no-array-sort` está apagada en todo el repo. Hoy son falsos positivos, pero es la regla que avisaría de un `.sort()` in situ sobre una prop o un array del store. Alternativa futura: `ES2023.Array` en `lib` + `toSorted()`, o disable por línea.
2. `forbidOnly` solo actúa con `CI`; `./init.sh` corre en modo dev, así que un `test.only` en `e2e/` no lo para nadie en local (hoy hay un único test e2e).
3. `@vue/devtools-api` depende de `autoInstallPeers` (por defecto) y de que `vue-router` la siga trayendo; documentado en `docs/stack.md:44`.
