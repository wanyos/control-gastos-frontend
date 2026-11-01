# Review — dependency-upgrade-2026-11-01 (tarea de mantenimiento, sin commitear)

## Review — 2026-11-01

**Veredicto:** CHANGES_REQUESTED

### Cambios requeridos

1. **El fallo de `category-rules.spec.ts:779` ya está apuntado en `docs/roadmap.md`, y el
   informe dice que no.**
   - `progress/implementations/dependency-upgrade-2026-11-01.md:138-139` dice que
     «no está apuntado». Es falso: es el cabo 41 (`docs/roadmap.md:481`, que lo cita
     todavía como `:761`). El cabo 44 (`docs/roadmap.md:484`) lo nombra con su línea
     actual: «`[chromium] :779`, fondo con 1 unidad de color de diferencia, que es el
     cabo 41». El `grep` del informe (`intermitent|flaky|aborted`) no podía
     encontrarlo, porque el cabo dice «falla a veces».
   - `progress/implementations/dependency-upgrade-2026-11-01.md:435-438` propone abrir
     un cabo nuevo con los dos tests. Uno de los dos ya lo tiene.
   - `docs/stack.md:843-851` lo presenta como «visto el 2026-11-01» y no remite al
     cabo 41. Además lo titula «sin causa en el código», que nadie ha comprobado.
     Hay que citar el cabo 41 para `:779` y quitar esa afirmación, o decir que no
     se ha comprobado.
2. **`action-notice-in-view.spec.ts:992` no se ha visto fallar con las versiones de
   antes, y el informe dice que sí.**
   - `progress/implementations/dependency-upgrade-2026-11-01.md:13-15` y `:136-137`
     dicen que los dos tests fallan «con las versiones viejas y con las nuevas».
   - Según su propio paso 2b, con las versiones de partida solo falló `:779`. `:992`
     falló una sola vez, con las versiones nuevas.
   - Yo no he conseguido que `:992` falle ni con unas ni con otras:
     - `--repeat-each=60` en una copia de `HEAD` → `60 passed`;
     - `--repeat-each=60` en el repo → `60 passed`;
     - la suite chromium completa con `--repeat-each=5` → `415 passed`;
     - `category-rules` y `action-notice-in-view` con `--repeat-each=10` → ningún
       fallo de `:992`.
   - Ese test no está en el cabo 41. Tampoco está en el 44, que es de Firefox y
     WebKit y con otros errores. Es nuevo y no está explicado.
   - Hay que decir que con las versiones de antes no se ha visto fallar, en vez de
     darlo por hecho.
3. **`progress/implementations/dependency-upgrade-2026-11-01.md:465` usa una
   metáfora.** «sin `vue-tsc` como red» es precisamente una de las palabras que
   `CLAUDE.md` pone de ejemplo de lo que no se usa (§Vocabulario), y no está en
   `docs/vocabulary.md`. Hay que describirlo literalmente: «sin `vue-tsc`
   comprobando los `.vue` aparte».

### Comprobado sin hallazgos

Lo he ejecutado yo hoy (`date -u` → `Sun Nov  1 08:18:34 UTC 2026`).

- **Versiones y rangos.**
  - `git diff package.json` sube solo `@lucide/vue` `^1.62.0`→`^1.66.0`,
    `@types/node` `^26.6.5`→`^26.6.6` y `vue-tsc` `^3.3.13`→`^3.3.14`. Los tres
    siguen con `^`.
  - `typescript` sigue en `"~6.0.3"` (`package.json:39`).
  - `grep -c "typescript@7" pnpm-lock.yaml` → `0`. Las únicas entradas son
    `typescript@6.0.3`.
  - `pnpm ls --depth 0` da 20 paquetes, entre ellos `@lucide/vue@1.66.0`,
    `@types/node@26.6.6`, `typescript@6.0.3` y `vue-tsc@3.3.14`.
  - `ls pnpm-workspace.yaml .npmrc` → no existen.
  - `pnpm outdated` → solo `typescript 6.0.3 → 7.0.2`.
  - Fechas de publicación (`pnpm view … time`): 1.66.0 el 2026-10-31T06:17,
    26.6.6 el 2026-10-28T18:36, 3.3.14 el 2026-10-29T19:06.
- **Diff del lockfile.** Comparé las claves de `packages:` de `git show HEAD:` con
  las de ahora: pasan de 272 a 277.
  - Cambian de versión:
    - `@volar/language-core`, `@volar/source-map` y `@volar/typescript`, de 2.4.28
      a 2.4.30;
    - `@vue/language-core`, de 3.3.13 a 3.3.14;
    - los tres paquetes directos.
  - Entran cinco paquetes: `@volar/language-service@2.4.30`,
    `vscode-jsonrpc@10.0.0`, `vscode-languageserver-protocol@3.18.5`,
    `vscode-languageserver-textdocument@1.0.16` y
    `vscode-languageserver-types@3.18.5`.
  - Ninguno sale. Ninguno pasa a otra versión mayor.
  - Esto coincide con el informe y con `docs/stack.md:678-690`.
  - `pnpm view`:
    - `@volar/typescript@2.4.30` y `@volar/language-service@2.4.30` → peer
      `typescript: "<7"`;
    - `@volar/typescript@2.4.28` → sin peers;
    - `@volar/typescript@2.4.30` depende de `@volar/language-service`, y este, de
      los `vscode-languageserver-*`.
- **Instalación, peers y verificación.**
  - `pnpm install --frozen-lockfile` → `Already up to date`, exit 0.
  - `pnpm peers check` → `No peer dependency issues found`, exit 0.
  - `pnpm type-check --force` → exit 0.
  - `pnpm lint` → exit 0, y `git status` después no cambia.
  - `pnpm test:unit` → `Test Files 126 passed (126)`, `Tests 2077 passed (2077)`.
  - `pnpm build` → exit 0, `index-oXIqPBcg.js 376.20 kB │ gzip: 112.11 kB`. Es el
    mismo hash que en una copia de `HEAD` con las versiones viejas. Allí salen
    `2203 modules transformed`, y aquí `2310`: son más módulos de iconos en Lucide
    1.66, y el bundle no cambia.
  - `./init.sh` → exit 0, con `OK: pnpm type-check`, `E2E smoke verde (chromium)` y
    `Entorno listo`.
- **Sin cambios de código.**
  `git diff --stat -- src e2e tsconfig*.json vite.config.ts vitest.config.ts playwright.config.ts .oxlintrc.json init.local.sh env.d.ts index.html`
  → vacío.
- **Iconos.**
  - Los `import { … } from '@lucide/vue'` de `src/` dan los 25 iconos del informe
    más `LucideIcon`. No hay ningún otro uso de `lucide` en `src`/`e2e`.
  - `import * as L from "@lucide/vue"` con la 1.66.0 instalada → faltan `0`.
- **El fallo de `:779`.** `npx playwright test --project=chromium e2e/category-rules.spec.ts:779 --repeat-each=40`:
  - en una copia de `HEAD`, con `@lucide/vue@1.62.0`, `@types/node@26.6.5` y
    `vue-tsc@3.3.13` → `8 failed`, `32 passed`;
  - en el repo → `5 failed`, `35 passed`.
  - Las dos veces el error es `rgb(20, 27, 34)` frente a `rgb(21, 28, 35)`. Falla
    también con las versiones de antes: es el cabo 41, no lo trae la subida.
- **Hechos del registro sobre TypeScript 7** (`pnpm view`):
  - `typescript`: `latest 7.0.2`, `beta 7.1.0-beta` (2026-10-20T16:45); la última
    6.x es la 6.0.3 (2026-04-16).
  - `vue-tsc`: `latest 3.3.14`, ninguna versión 4.
  - `@vue/language-core`: `alpha 4.0.0-alpha.2` (2026-10-29T20:27), con peer
    `typescript >=7.1.0-beta` y dependencia `@volar/language-core 3.0.0-alpha.0`.
  - `@vue/content-mapper`: `latest 4.0.0-alpha.0` y `alpha 4.0.0-alpha.2`, con peer
    `>=7.1.0-beta`. La rareza de `latest` que señala el informe es cierta.
  - `vue-tsc@3.3.14` y `@3.3.13` → peer `typescript >=5.0.0`.
- **Opciones y paquetes que se describen, contra lo publicado.** Bajé los tarballs
  con `npm pack` a la carpeta temporal, sin instalarlos en el proyecto.
  - `typescript@7.1.0-beta`:
    - `schemas/tsconfig.schema.json` define `contentMappers` en el nivel superior
      del tsconfig (`package`, `extensions`, `options`), y su descripción remite a
      `--runExternalCode`;
    - `@typescript/typescript-win32-x64@7.1.0-beta/lib/tsc.exe` contiene las dos
      cadenas;
    - sus `exports` ya no llevan `unstable/` ni `./lib/tsc`.
  - En una copia, poner `contentMappers` dentro de `compilerOptions` da
    `TS5023 Unknown compiler option`: va fuera, como el ejemplo del README de
    `@vue/content-mapper`. El informe no dice dónde va.
  - `@vue/language-core@4.0.0-alpha.2` (`lib/types.d.ts:80-85`) tiene
    `fallthroughAttributes`, `dataAttributes`, `htmlAttributes` y `target`.
  - `@typescript/typescript6@6.0.2`: autor Microsoft, `bin tsc6`, depende de
    `@typescript/old: npm:typescript@^6`, y el README dice lo que cita el informe.
  - `vue-tsc@3.3.14/index.js:73-84`: `resolveTscPath` reconoce
    `@typescript/typescript6`.
- **Fuentes leídas** (API pública de GitHub):
  - PR vuejs/language-tools#6170: abierto desde 2026-08-20 contra `master`. Las
    frases citadas («`vue-tsc` is removed», «v4 supports TypeScript 7.1 only»,
    lo de `strictTemplates`/`checkUnknown*` y la pérdida del formateo) están en su
    texto.
  - microsoft/TypeScript#63703: beta 2026-10-06, RC 2026-11-10, estable
    2026-11-24.
  - Issues #6318 y #6310: abiertos. #6307: cerrado el 2026-10-29.
  - microsoft/typescript-go#4712: «Content mappers», cerrado.
  - La rama `v3.4` existe. La release v3.3.14 trae el arreglo «keep literal
    bindings on TS 7.1».
- **Documentos.** Repetí el `git grep` de `1.62.0`, `26.6.5`, `3.3.13` y `2.4.28`
  fuera de `progress/`, `specs/`, el lockfile y `design-system/`. Solo quedan
  menciones históricas en `docs/stack.md` (l. 681-689, 732, 755, 811, 837-838), que
  siguen siendo ciertas.
  - En `docs/stack.md` no hay frases que se contradigan como en la revisión del
    2026-10-28. El punto 3 está fechado, la regla de «Cuándo reintentarlo» de antes
    queda como historia, y las cifras de dependencias indirectas cuadran con el
    lockfile.

**No lo he comprobado:**

- **La prueba de TypeScript 7.1 beta con `@vue/content-mapper`.** Son los 1.270
  errores falsos y los 4 que quedan con `dataAttributes`/`htmlAttributes`/`fallthroughAttributes`,
  la caída de Windows por la ruta larga y el `vite build`. La monté en una copia
  fuera del repo, pero el sistema de permisos me denegó lanzar
  `tsc -b --runExternalCode`, que ejecuta el código del paquete descargado.
  Comprobarlo exige que el humano permita ese comando en una copia temporal.
- **La convivencia 6 + 7 de la opción C.** No la he montado.
