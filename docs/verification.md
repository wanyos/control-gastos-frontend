# Verificación — Cómo demostrar que el trabajo funciona

> Regla de oro: **el agente no dice "funciona", lo demuestra**.
> Toda feature termina con evidencia ejecutable, no con afirmaciones.
>
> Los comandos de esta sección están **descubiertos de `package.json`** y son
> reales. Las políticas (qué exigir en cada nivel) las confirma el humano.

## Niveles de verificación

### Nivel 1 — Tests unitarios (obligatorio)

Toda función / composable / store / componente con lógica en `src/` tiene al
menos un test que:

1. Cubre el camino feliz.
2. Cubre al menos un camino de error / borde si puede fallar.

**Comando para ejecutar los tests unitarios** (Vitest, entorno jsdom):

```bash
pnpm test:unit          # una sola pasada (es lo que corre init.sh y la puerta)
```

> `init.sh` detecta el script de tests unitarios de `package.json`
> (`test:unit` → `vitest run`, añadido en la feature #2) y ejecuta la suite
> automáticamente en su bloque de tests. (Su paso 4, «Type checking», no comprueba
> ningún archivo en este proyecto: ver *`pnpm type-check` dentro de `./init.sh`*.) Desde la
> feature #6 también ejecuta el **e2e smoke limitado a chromium**
> (paso 6b del script). Desde la higiene del 2026-09-30 ejecuta además
> **lint y formato** (paso 5); ver *Qué comprueba la puerta*. Desde la higiene
> del 2026-10-04 ejecuta también **`pnpm type-check`** (`vue-tsc --build`), dentro
> del paso 6b; ver *`pnpm type-check` dentro de `./init.sh`*.

### Nivel 2 — Test de integración / E2E (obligatorio para features de UI)

Los tests E2E usan **Playwright** contra la app real (levanta el dev server en
`5173`, o el preview en `4173` bajo CI). Viven en `e2e/`. La feature #6 los
convirtió en una **prueba de humo de arranque real**: la app monta, aplica el
design system y no suelta errores de consola (ver `docs/stack.md` → *E2E en
cada modo*).

```bash
# Primera vez: instalar navegadores
npx playwright install

pnpm test:e2e                      # todos los navegadores (chromium/firefox/webkit)
pnpm test:e2e --project=chromium   # solo chromium (más rápido en local)
pnpm test:e2e --debug              # modo debug
HEADED=1 pnpm test:e2e             # con ventanas visibles (por defecto es headless)

# Modo CI (build de producción servido por preview en 4173):
pnpm build && CI=true pnpm test:e2e
```

La puerta de `./init.sh` (paso 6b) ejecuta el e2e limitado a chromium contra
el dev server y termina en rojo si falla; si faltan los navegadores de
Playwright, degrada con un aviso claro en vez de fallar.

Para componentes, la integración ligera (montar el componente y comprobar
render/interacción) se hace con Vitest + `@vue/test-utils` en el Nivel 1.

### Nivel 3 — Smoke test manual (opcional pero recomendado)

Flujo mínimo antes de cerrar sesión:

```bash
pnpm dev            # abre http://localhost:5173 y comprueba el flujo a mano
# o, más cercano a producción:
pnpm build && pnpm preview   # sirve el build en http://localhost:4173
```

### Nivel 4 — Trazabilidad de requirements (obligatorio para features con `"sdd": true`)

Cada `R<n>` de `specs/<nn>-<name>/requirements.md` debe poder mapearse a al
menos un test concreto. El reviewer rechaza si falta cobertura.

El implementer documenta el mapa en `progress/implementations/<name>.md`:

```markdown
## Trazabilidad
- R1 → `test_xxx`
- R2 → `test_yyy`
- R3 → `test_zzz`
```

Ver `docs/specs.md` para el proceso SDD completo y la notación EARS.

## Anti-patrones (no hacer)

- ❌ "He añadido la feature, debería funcionar." → falta test ejecutable.
- ❌ Test que solo verifica que la función no lanza excepción. → tiene que
  comprobar el resultado concreto.
- ❌ Mocks excesivos del entorno cuando un recurso real (tempdir, sqlite
  in-memory) es viable.
- ❌ Marcar la feature como `done` sin pasar `./init.sh`.
- ❌ Añadir tests que solo se llaman a sí mismos (espejos del código).

## Qué comprueba la puerta (`./init.sh`)

> Reescrito en la higiene del **2026-09-30**. Hasta entonces el script decía
> «Entorno listo» **sin haber pasado el linter**, y no existía ninguna
> comprobación de formato. Por eso un `pnpm lint` en rojo (un
> `no-underscore-dangle`) llegó vivo hasta la revisión de la feature #23.

Orden de los pasos, de arriba abajo. Cualquiera que falle pone `EXIT_CODE=1` y
el script termina con `[FAIL] Entorno NO está listo`:

| # | Paso | Comando real |
|---|------|--------------|
| 1 | Detección de stack | — |
| 2 | Archivos base del arnés | — |
| 3 | `feature_list.json` + specs de las features `sdd` | — |
| 4 | Type check de `init.sh`. **En este proyecto no comprueba ningún archivo** (ver *`pnpm type-check` dentro de `./init.sh`*) | `npx tsc --noEmit --incremental` |
| 5 | Lint y formato (los dos en este paso) | `pnpm lint:oxlint:check` → `oxlint .`, y `pnpm format:check` → `prettier --check …` |
| 6 | Tests unitarios | `pnpm test:unit` |
| 6b | Pasos propios del proyecto (`init.local.sh`), en este orden: las rutas de las cabeceras `Archivos:` de cada `specs/*/tasks.md` que solo se distinguen en mayúsculas y minúsculas (higiene 2026-10-04), la comprobación de tipos con el script del proyecto, que sí mira los `.vue` (higiene 2026-10-04), y el E2E de chromium | función `check_case_only_paths` de `init.local.sh`, `pnpm type-check` → `vue-tsc --build`, y `pnpm test:e2e --project=chromium` |
| 7 | Resumen | — |

### Rutas de un `tasks.md` que solo se distinguen en mayúsculas y minúsculas

> Añadido en la higiene del **2026-10-04**. En la feature 26, el `tasks.md`
> declaraba `__tests__/previousMonths.spec.ts` en la cabecera `Archivos:` de un
> lote y `__tests__/PreviousMonths.spec.ts` en la de otro. En un disco que no
> distingue mayúsculas (Windows, macOS por defecto) son el mismo archivo: el
> segundo lote escribió encima del primero y se perdieron 44 tests que no
> estaban en git.

**Qué comprueba.** Recorre cada `specs/*/tasks.md`, toma las líneas que empiezan
por `Archivos:` y saca las rutas que van entre acentos graves. Si dentro de un
mismo `tasks.md` hay dos rutas distintas que quedan iguales al pasarlas a
minúsculas, `./init.sh` escribe un `[FAIL]` con el `tasks.md` y las dos rutas y
termina con exit 1. Si no hay ninguna, escribe una línea `[OK]`.

**Cuándo se ejecuta.** Solo en `./init.sh` completo, dentro de `local_steps` de
`init.local.sh` (bloque «6b. Pasos propios del proyecto» de la salida), después
de los tests unitarios y antes del e2e. **No** se ejecuta en `./init.sh --state`
ni en `./init.sh --fast` (los dos salen antes de llegar a `local_steps`), ni en
`./init.sh --checks` (ese modo no carga `init.local.sh`).

**Qué no es un fallo.** La misma ruta escrita tal cual en dos lotes; un
`tasks.md` sin cabeceras `Archivos:` (los specs anteriores a los lotes); la
misma ruta, o dos que solo se distinguen en mayúsculas, en dos specs distintos:
la comparación es dentro de cada `tasks.md`.

**Qué no ve.**

- Un archivo creado fuera de lo que declara el spec: solo lee las cabeceras
  `Archivos:`, no el disco ni git.
- Una ruta escrita en otra parte del `tasks.md` (dentro de una task, por
  ejemplo), o en una línea que no empiece exactamente por `Archivos:`.
- Rutas escritas sin acentos graves, o una con `` y la otra con `/`, o con `./` delante
  de una sola de las dos. Comprobado por el reviewer el 2026-10-04.
- Una cabecera con sangría, viñeta, negrita u otra capitalización (`archivos:`): ese
  `tasks.md` se da por bueno sin haberlo mirado. La línea `[OK]` cuenta los `tasks.md`
  recorridos, no los que tienen cabeceras.
- Letras fuera de ASCII (`Árbol.ts` y `árbol.ts`) en esta máquina. En macOS no está
  comprobado; en Ubuntu sí, con GNU Awk y con mawk.
- Una ruta declarada que solo se distingue en mayúsculas de un archivo que ya
  existe en el repositorio pero que ese `tasks.md` no declara.
- Letras fuera de ASCII: comprobado el 2026-10-04 con el `bash` de Git para
  Windows (GNU Awk 5.0.0, sin `LANG` ni `LC_ALL`), `Árbol.ts` y `árbol.ts` **no**
  se detectan como pareja. El paso a minúsculas lo hace `awk`.

### `pnpm type-check` dentro de `./init.sh`

> Añadido en la higiene del **2026-10-04**. Dos veces se vio que `./init.sh`
> terminaba en verde con un error de tipos que `pnpm type-check` sí daba: en la
> feature 26, un `toSorted` que no existe con la `lib` del proyecto
> (`pnpm type-check` exit 2); y en la actualización de dependencias del
> 2026-10-04, con TypeScript 7 instalado en una copia del repositorio
> (`pnpm type-check` exit 1, `npx tsc --noEmit --incremental` exit 0).

**Qué hace.** La función `run_pnpm_type_check` de `init.local.sh` ejecuta
`pnpm type-check` (`vue-tsc --build`). Si sale con 0 escribe una línea `[OK]`; si
no, un `[FAIL]` con el código de salida, la salida entera del comando, y
`./init.sh` termina con exit 1.

**Cuándo se ejecuta.** Solo en `./init.sh` completo, dentro de `local_steps` de
`init.local.sh` (bloque «6b. Pasos propios del proyecto» de la salida), después
de los tests unitarios y antes del e2e. **No** se ejecuta en `./init.sh --state`
ni en `./init.sh --fast` (los dos salen antes de llegar a `local_steps`), ni en
`./init.sh --checks` (ese modo no carga `init.local.sh`). Comprobado el
2026-10-04 con los tres modos. En esta máquina añade unos 7 segundos:
`pnpm type-check` solo tarda 6,5 s y `./init.sh` entero pasó de 39,7 s a 46,5 s.

**Por qué va en `local_steps` y no en una variable.** `init.sh` deja sustituir
el comando de tests (`LOCAL_TEST_CMD`) y el paso de lint y formato
(`LOCAL_STYLE_CMDS`), pero no tiene ninguna variable para su paso 4.

**Qué cubre que el paso 4 de `init.sh` no cubre.** Comprobado el 2026-10-04: el
paso 4 (`npx tsc --noEmit --incremental`) **no comprueba ningún archivo** en este
proyecto, ni `.vue` ni `.ts`. `tsconfig.json` tiene `files: []` y solo
`references` a los otros tres tsconfig, y `tsc` sin `--build` no sigue las
referencias: `npx tsc --noEmit --incremental --listFiles` no lista nada. Con un
error de tipos puesto a propósito en un `.vue` de `src/`, y después en un `.ts`
de `src/`, ese comando salió con 0 las dos veces y `pnpm type-check` con 2.
`vue-tsc --build` sí recorre los tres (`tsconfig.app.json`, `tsconfig.node.json`
y `tsconfig.vitest.json`).

**Qué sigue sin cubrir.**

- **`./init.sh --fast` no comprueba tipos de ningún archivo.** Solo ejecuta el
  paso 4. Es el modo que se usa mientras se trabaja: un error de tipos no
  aparece hasta `./init.sh` completo o `pnpm type-check` a mano.
- **`pnpm build`.** Ni `init.sh` ni `init.local.sh` lo ejecutan. Un test
  unitario (`src/assets/__tests__/tailwind-sources.spec.ts`) llama a `build` de
  Vite en memoria para mirar el CSS, pero no es `pnpm build` ni escribe `dist/`.

### Arreglar vs. comprobar: dos parejas de scripts

Una puerta de verificación **comprueba, no arregla**: si modificara archivos, el
verde sería una consecuencia de la propia puerta y no una propiedad del código.
Por eso cada herramienta tiene dos entradas:

| Uso a mano (**arregla**) | Puerta (**no arregla**) |
|---|---|
| `pnpm lint` → `run-s "lint:*"` → `oxlint . --fix` | `pnpm lint:oxlint:check` → `oxlint .` |
| `pnpm format` → `prettier --write …` | `pnpm format:check` → `prettier --check …` |

Las dos variantes de cada pareja miran **exactamente lo mismo** (mismas rutas,
misma config); solo cambia si escriben en disco.

> **Por qué el nombre es `lint:oxlint:check` y no `lint:check`.** `pnpm lint` es
> `run-s "lint:*"`, y ese glob **sí** captura `lint:check` (comprobado), así que
> el uso a mano habría pasado a correr también la comprobación. El `*` de
> npm-run-all no cruza los dos puntos, de modo que `lint:oxlint:check` queda
> fuera del glob y `pnpm lint` se comporta igual que siempre. Si algún día se
> añade otro linter, su variante de comprobación sigue el mismo patrón
> (`lint:<herramienta>:check`).

## Verificación final antes de cerrar

Desde la higiene del 2026-09-30 `./init.sh` cubre también lint y formato, y
desde la del 2026-10-04 ejecuta `pnpm type-check` (`vue-tsc --build`, que
incluye los `.vue`). Lo único que queda por lanzar a mano es lo que el script
**no** hace, el build de producción:

```bash
./init.sh              # entorno + lint + formato + unit + pnpm type-check + e2e → [OK] Entorno listo
pnpm build             # el build de producción compila
```

`pnpm lint` ya no hace falta en el cierre (la puerta lo cubre sin `--fix`);
úsalo mientras trabajas, para que te arregle lo arreglable.

Si algo de lo anterior está rojo, **no** marques nada como `done`. Anota el
bloqueo en `progress/current.md` y pon la feature en `blocked` en
`feature_list.json`.

## Criterios mínimos por feature

> Plantilla mental al cerrar una feature:

- [ ] La feature cumple TODOS los criterios de su `acceptance` en `feature_list.json`.
- [ ] Hay tests que cubren los criterios de aceptación (no solo el "happy path").
- [ ] `./init.sh` termina verde.
- [ ] El reviewer ha emitido veredicto `APPROVED`.
- [ ] `progress/current.md` describe lo que se hizo.
