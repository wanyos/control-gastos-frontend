# Review — dependency-upgrade-2026-10-28 (tarea de mantenimiento, sin commitear)

## Review — 2026-10-28

**Veredicto:** CHANGES_REQUESTED

### Cambios requeridos

1. `docs/stack.md:733-734` — la frase «**No se ha repetido la prueba con
   TypeScript 7 instalado** después de añadirlo» ahora es falsa: esta misma pasada
   la repitió, y el párrafo nuevo que viene justo debajo (l. 738-743) lo cuenta.
   El punto 3 se contradice a sí mismo. Hay que fecharla en pasado («hasta el
   2026-10-28 no se había repetido…») o quitarla, y dejar claro que el `exit 0`
   de las l. 728-730 es el del 2026-10-04. Lo he comprobado: en una copia del
   repo (`git worktree` en la carpeta temporal, con el `package.json` y el lockfile
   de esta pasada y `pnpm add -D typescript@~7.0.2`), `pnpm type-check` → exit 1
   con `ERR_PACKAGE_PATH_NOT_EXPORTED`, y `./init.sh` → exit 1 con
   `[FAIL] Fallido: pnpm type-check (exit 1):` y
   `[FAIL] Entorno NO está listo`. El paso 4 siguió diciendo
   `Type check OK (tsc sin errores)`.
2. `docs/stack.md:680` — «Cambiaron de versión mayor **seis** dependencias
   indirectas» no cuadra con el lockfile. Comparando las claves de `packages:` de
   `git show HEAD:pnpm-lock.yaml` con el lockfile actual, por paquete y versión
   mayor, entran 9 versiones mayores nuevas (`@asamuzakjp/dom-selector@10`,
   `data-urls@8`, `obug@3`, `ast-kit@3`, `@babel/parser@8`, `@babel/types@8`,
   `@babel/helper-string-parser@8`, `@babel/helper-validator-identifier@8`,
   `tr46@7`) y salen 4 (`@asamuzakjp/dom-selector@9`, `data-urls@7`, `obug@2`,
   `whatwg-url@16`). El párrafo no menciona ni `tr46` 6 → 7 ni los dos
   `@babel/helper-*` 8. El informe del implementer sí los recoge. Hay que corregir
   la cifra y completar la lista, o quitar la cifra.

### Comprobado sin hallazgos

Lo que sigue lo he ejecutado yo hoy; pego el comando y lo que salió.

- **Versiones y tipo de rango.** `git diff package.json`: los 14 rangos son los
  de la tabla del informe; mantienen `^`, con `~` en oxlint y versión exacta en
  prettier; `typescript` sigue en `~6.0.3`; no se añade ni se quita ningún paquete.
  `pnpm ls --depth 0`: los 20 paquetes coinciden con el informe
  (`@lucide/vue@1.62.0`, `@types/node@26.6.5`, `typescript@6.0.3`,
  `oxlint@1.90.0`, `prettier@3.9.10`, …).
- **Las dos que se quedan una versión atrás, y la antigüedad mínima.**
  `pnpm view … time`: `26.6.6` se publicó el `2026-10-28T18:36:36Z` y `1.63.0` el
  `2026-10-28T06:11:51Z`. Hora del sistema: `Wed Oct 28 20:39:59 UTC 2026`, así
  que las dos tienen menos de un día. Para probarlo, en un proyecto vacío de la
  carpeta temporal: `pnpm add @lucide/vue@1.63.0` → pnpm crea
  `pnpm-workspace.yaml` con `minimumReleaseAgeExclude: ['@lucide/vue@1.63.0']`;
  `pnpm add "@lucide/vue@^1.51.0" "@types/node@^26.6.4"` → resuelve `^1.62.0` y
  `^26.6.5`, sin crear el archivo. En el repo no se ha añadido ninguna exclusión:
  `ls pnpm-workspace.yaml .npmrc` → `No such file or directory` los dos (tampoco
  en `..` ni en `../..`), y `git grep minimumReleaseAge` solo aparece en docs e
  informes antiguos. El bloque `settings:` del lockfile no cambia
  (`autoInstallPeers`, `excludeLinksFromLockfile`).
- **TypeScript.** `grep -c "typescript@7" pnpm-lock.yaml` → `0`; la única entrada
  es `typescript@6.0.3`. `pnpm view typescript versions`: después de `6.0.3` no
  hay ninguna 6.0.x estable. `vue-tsc` 3.3.13 se publicó el 2026-10-10 y es la
  última; declara `peerDependencies: typescript >=5.0.0`.
- **Diff del lockfile.** Pasa de 261 a 272 paquetes. Ningún paquete entra ni sale
  del todo: los nombres son los mismos antes y después, y lo que cambia son
  versiones. Los cambios de versión mayor son los del punto 2 y coinciden con la
  tabla del informe. `@exodus/bytes` y `nostics` cambian de parche o menor (los
  traen `jsdom`, y `pinia` y `vue-router`).
- **Instalación y peers.** `pnpm install --frozen-lockfile` → `Already up to date`,
  exit 0, sin avisos. `pnpm peers check` → `No peer dependency issues found`,
  exit 0.
- **Verificación.** `pnpm type-check --force` → exit 0. `pnpm lint` → exit 0, y
  `git status` después no muestra ningún archivo nuevo modificado.
  `pnpm lint:oxlint:check` → exit 0. `pnpm test:unit` → `Tests 2077 passed (2077)`,
  exit 0. `pnpm build` → exit 0, `✓ 2203 modules transformed.`,
  `index-oXIqPBcg.js 376.20 kB │ gzip: 112.11 kB`. `./init.sh` → exit 0,
  `Test Files 126 passed (126)`, `OK: pnpm type-check`,
  `E2E smoke verde (chromium)`, `Entorno listo.`
- **`pnpm test:e2e` en los tres navegadores** (`npx playwright --version` →
  `1.64.1`). Primera ejecución: exit 1, `8 failed`, `241 passed`. Son los 6 del
  informe más dos de `e2e/category-rules.spec.ts`: `[chromium] :779`, con un
  fondo `rgb(20, 27, 34)` donde se esperaba `rgb(21, 28, 35)`, y `[firefox] :370`,
  con `page.goto` que pasa de 30 s. Al repetir esos dos aparte
  (`--project=chromium --project=firefox --repeat-each=3`): `60 passed`, exit 0.
  Segunda ejecución completa: exit 1, `6 failed`, `243 passed`, y los seis son los
  mismos del informe. **Los 6 ya fallaban antes de la subida:** en un
  `git worktree` de `HEAD` (Playwright `1.63.0`, versiones de antes),
  `npx playwright test --project=firefox --project=webkit e2e/statement.spec.ts e2e/action-notice-in-view.spec.ts`
  → `7 failed`, `37 passed`. Son esos seis con los mismos errores
  (`Expected: "month"` / `Received: "text"`;
  `its bottom (493.5535888671875) is below the window (411)`) y uno más,
  `[webkit] :1246`. El aviso `[VUE_ROUTER_R0100] Discarded invalid param(s)
  "pathMatch"` que sale en la salida del servidor de desarrollo también existe en
  `vue-router` 5.3.1 (`node_modules/.pnpm/vue-router@5.3.1_*/…/vue-router.esm-browser.js:1432`).
- **Código y configuración sin tocar.**
  `git diff --stat -- src e2e .oxlintrc.json tsconfig*.json vite.config.ts vitest.config.ts playwright.config.ts`
  → vacío. `git status --short`: solo `docs/conventions.md`, `docs/stack.md`,
  `package.json`, `pnpm-lock.yaml`, `progress/current.md` y el informe.
- **Documentos.** El `git grep` de las versiones antiguas, fuera de `progress/`,
  `specs/`, el lockfile y `design-system/`, solo encuentra
  `docs/roadmap.md:455` (es una cifra en euros) y en `docs/stack.md` las l. 696,
  716 y 772, que cuentan pasadas anteriores. Las versiones de `docs/stack.md`
  (l. 34, 41, 53, 288, 346, 374, 408, 469, 480) y de `docs/conventions.md:68`
  son las instaladas. La sección de TypeScript 7 conserva la prueba del
  2026-10-04 y la de 3.3.11; el fallo está en el punto 1.
  `docs/verification.md:171` es historia del 2026-10-04 y sigue siendo cierta.
- **Vocabulario.** En el diff de `docs/` y en el informe no aparece ningún término
  nuevo para nombrar mecanismos del proyecto.
