# init-local-type-check — implementación

Tarea de higiene del 2026-10-04 (no es una feature de `feature_list.json`):
`./init.sh` ejecuta ahora `pnpm type-check` desde `init.local.sh` y termina en
rojo si sale distinto de 0. Sin commits.

## Archivos modificados / creados

- `init.local.sh` — función nueva `run_pnpm_type_check` y su llamada en
  `local_steps`, después de `check_case_only_paths` y antes del e2e.
- `docs/verification.md` — nota del Nivel 1, filas 4 y 6b de la tabla de pasos,
  sección nueva «`pnpm type-check` dentro de `./init.sh`» y «Verificación final
  antes de cerrar».
- `docs/stack.md` — «Cómo se hace una actualización aquí» (punto 4 y el párrafo
  siguiente) y el punto 3 de «Por qué TypeScript 7 no entra (todavía)».
- `progress/current.md` — la anotación de la tarea en curso que pide el
  protocolo del implementer. El leader la quita al cerrar.
- `progress/implementations/init-local-type-check.md` — este informe.

`init.sh`, `feature_list.json` y `specs/` no se han tocado.

## Decisiones tomadas

- **Va en `local_steps`, no en una variable.** La cabecera de `init.sh` (bloque
  «Lo propio del proyecto: init.local.sh») prevé tres cosas: `LOCAL_TEST_CMD`
  (sustituye el comando de tests), `LOCAL_STYLE_CMDS` (sustituye el paso 5, lint
  y formato) y `local_steps()`. No hay variable para el paso 4 de tipos.
  `LOCAL_STYLE_CMDS` ejecutaría el comando y pondría la pasada en rojo, pero lo
  haría bajo el título «5. Lint y formato» y con una variable documentada para
  otra cosa; por eso no se usa.
- **Mismo patrón que el paso del e2e:** `info` con el comando, salida capturada,
  `ok` si sale con 0, y si no `fail` con el código de salida, la salida entera y
  `EXIT_CODE=1`.
- **Sin comprobación previa de que exista el script en `package.json`.** Si
  falta, `pnpm type-check` sale distinto de 0 y la pasada queda en rojo. No lo
  he provocado: no lo he comprobado.

## Hallazgo: el paso 4 de `init.sh` no comprueba ningún archivo

El encargo decía que `npx tsc --noEmit --incremental` no mira los `.vue`. Lo
comprobado es más amplio: **no mira ningún archivo**, tampoco los `.ts`.
`tsconfig.json` tiene `files: []` y solo `references`; `tsc` sin `--build` no las
sigue.

```
--- .ts probe: npx tsc --noEmit --incremental
exit=0
--- .ts probe: npx tsc --noEmit --incremental --listFiles | wc -l
0
--- .ts probe: pnpm type-check
$ vue-tsc --build
src/tmpTypeCheckProbe.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'.
[ELIFECYCLE] Command failed with exit code 2.
exit=2
```

Consecuencia que sigue en pie tras este cambio: `./init.sh --fast` solo ejecuta
ese paso 4, así que no comprueba tipos de ningún archivo. Queda escrito en
`docs/verification.md`.

## Comprobaciones

### 1. `./init.sh` con el repositorio como está, y tiempos

Una pasada de cada, con `time`, en esta máquina:

| Qué | Tiempo | Exit |
|---|---|---|
| `./init.sh` antes del cambio | 39,725 s | 0 |
| `./init.sh` después del cambio | 46,540 s | 0 |
| `./init.sh` después, última pasada (con los documentos ya editados) | 47,858 s | 0 |
| `pnpm type-check` solo | 6,554 s | 0 |
| `pnpm type-check` solo, segunda vez | 6,521 s | 0 |
| `pnpm exec vue-tsc --build --force` (sin reutilizar `.tsbuildinfo`) | 6,517 s | 0 |

Diferencia entre antes y después: 6,8 s en la primera pasada posterior. Es una
sola medida de cada; no he medido la variación entre pasadas iguales.

Bloque 6b de la pasada posterior al cambio:

```
── 6b. Pasos propios del proyecto (init.local.sh) ──────
[OK]    Cabeceras Archivos: de 16 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[INFO]  Ejecutando: pnpm type-check
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### 2. Que se pone rojo de verdad

Archivo temporal `src/TmpTypeCheckProbe.vue`, con
`const monthCount: number = 'veinticuatro'` en su `<script setup lang="ts">`.

```
--- npx tsc --noEmit --incremental
exit=0
--- pnpm type-check
$ vue-tsc --build
src/TmpTypeCheckProbe.vue(2,7): error TS2322: Type 'string' is not assignable to type 'number'.
[ELIFECYCLE] Command failed with exit code 2.
exit=2
--- ./init.sh
exit=1
```

Líneas de esa pasada de `./init.sh` (46,424 s). El paso 4, lint y formato
salieron en verde; el único `[FAIL]` antes del resumen es el del paso nuevo:

```
22:── 4. Type checking (tsc) ──────────────────────────────
24:[OK]    Type check OK (tsc sin errores)
29:[OK]    OK: pnpm lint:oxlint:check
34:[OK]    OK: pnpm format:check
── 6b. Pasos propios del proyecto (init.local.sh) ──────
[OK]    Cabeceras Archivos: de 16 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[INFO]  Ejecutando: pnpm type-check
[FAIL]  Fallido: pnpm type-check (exit 2):
$ vue-tsc --build
src/TmpTypeCheckProbe.vue(2,7): error TS2322: Type 'string' is not assignable to type 'number'.
[ELIFECYCLE] Command failed with exit code 2.
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
```

Archivo borrado después (`ls: cannot access 'src/TmpTypeCheckProbe.vue': No such
file or directory`). El segundo archivo temporal, `src/tmpTypeCheckProbe.ts`
(el del hallazgo de arriba), también borrado. Tras borrarlos, `pnpm type-check`
exit 0.

### 3. Que no se ejecuta en los otros modos

Se buscó en la salida de cada modo `pnpm type-check`, `vue-tsc`,
`init.local.sh` y `6b`:

```
=== ./init.sh --state
exit=0
4:[INFO]  Cargado init.local.sh (verificación propia del proyecto)
[OK]    Estado del harness coherente (modo --state).
=== ./init.sh --fast
exit=0
4:[INFO]  Cargado init.local.sh (verificación propia del proyecto)
[OK]    Estado y tipos OK (modo --fast; los tests NO se han ejecutado).
=== ./init.sh --checks 26
exit=0
(ninguna línea)
[OK]    Checks: 11 de 11 en verde.
```

En `--state` y `--fast` el archivo se carga (define la función) pero
`local_steps` no se llama: no aparece ni `pnpm type-check` ni el bloque 6b.

### 4. `git status --short` al final

Antes de escribir este informe:

```
 M docs/stack.md
 M docs/verification.md
 M init.local.sh
 M progress/current.md
```

Más este informe, sin seguimiento. Ningún archivo de prueba.

## Documentos actualizados

`git grep -n "type-check\|vue-tsc" -- . ':!progress' ':!specs' ':!pnpm-lock.yaml'`.
Líneas que el cambio volvía falsas, corregidas:

- `docs/verification.md` — nota del Nivel 1 (qué ejecuta `init.sh`); fila 4 de
  la tabla (decía `npx tsc --noEmit`; ahora el comando entero y que no comprueba
  ningún archivo); fila 6b (orden: rutas de `tasks.md`, `pnpm type-check`, e2e);
  «Verificación final antes de cerrar» (decía que `pnpm type-check` había que
  lanzarlo a mano y que «init.sh solo corre tsc»).
- `docs/stack.md` — punto 4 de «Cómo se hace una actualización aquí» y el
  párrafo siguiente (decía que `pnpm type-check` seguía sin cubrir); punto 3 de
  «Por qué TypeScript 7 no entra (todavía)» (decía en presente que `./init.sh`
  no ejecuta `vue-tsc`; ahora está en pasado y dice que la prueba con
  TypeScript 7 **no se ha repetido** con el paso nuevo).

**`pnpm build` sigue sin cubrir — cómo se comprobó:** `grep` de `pnpm build`,
`vite build`, `build-only`, `$PKG build` y `run build` en `init.sh` e
`init.local.sh`: ninguna línea. En la salida entera de `./init.sh` (62 líneas),
la única que contiene «build» es la del paso nuevo (`vue-tsc --build`). Un test
unitario, `src/assets/__tests__/tailwind-sources.spec.ts`, llama a `build` de
Vite con `write: false`; no es `pnpm build`. No he provocado un fallo de
`pnpm build` para ver que `./init.sh` lo deja pasar: eso no está comprobado.

No tocadas, siguen siendo verdad: `README.md:20`, las líneas de `acceptance` de
`feature_list.json` y la tabla de comandos de `docs/stack.md`.

## Último ./init.sh

Exit 0, 47,858 s, ningún `[FAIL]` ni `[WARN]`, 1703 tests unitarios, y:

```
[INFO]  Ejecutando: pnpm type-check
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

## Sugerencias fuera de scope (NO aplicadas)

- El paso 4 de `init.sh` escribe «Type check OK (tsc sin errores)» sin haber
  comprobado ningún archivo, y es lo único de tipos que corre en `--fast`.
  `init.sh` es del motor del harness: arreglarlo (por ejemplo con `tsc --build`
  cuando `tsconfig.json` solo tiene `references`) toca a `harness-template`.
  Candidata a `docs/lessons.md` con alcance `harness`, si el humano lo aprueba.
- `npx tsc --noEmit --incremental` deja un `tsconfig.tsbuildinfo` en la raíz
  (ignorado por `.gitignore:27`, `*.tsbuildinfo`). No molesta a git.
