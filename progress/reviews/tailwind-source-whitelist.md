# Review — feature 5 `tailwind-source-whitelist`

**Veredicto:** APPROVED

Feature **sin `sdd`**: no hay `specs/`, así que se contrasta contra el `intent`
(escrito por el humano) y los 8 criterios de `acceptance` de `feature_list.json`.
Las secciones de trazabilidad `R<n>` y de tasks no aplican.

Todo lo de abajo está **verificado por el reviewer ejecutando los comandos**, no
leído del informe. Donde el informe afirma algo, se dice si se reprodujo.

---

## Trazabilidad requirements ↔ tests (solo SDD)

No aplica: la feature no tiene `"sdd": true`.

## Tasks completas (solo SDD)

No aplica.

---

## Criterios de aceptación (los 8, uno a uno)

### 1. `main.css` acota el escaneo con `source()` en el `@import` — CUMPLE

`src/assets/main.css:15` → `@import 'tailwindcss' source('../');`, con el porqué
en el comentario de `src/assets/main.css:10-14`. `main.css` vive en
`src/assets/`, luego `'../'` = `src/`.

Verificado por **efecto**, no por lectura: con esa línea el bundle emite las 4
utilidades de `App.vue` y ninguna de las citadas solo en `docs/` o `progress/`
(ver criterios 3 y 4). Sin ella, el escaneo se ensancha (control negativo del
criterio 5).

### 2. Se elimina `@source not '../../design-system'` — CUMPLE

`git diff -- src/assets/main.css` muestra la línea y su comentario borrados, y en
su lugar `@source '../../index.html'` (`src/assets/main.css:17-20`). La exclusión
es efectivamente redundante: `design-system/` está en la raíz, fuera de la base
`src/`. Comprobado que nada de esa carpeta llega al bundle: `.container` —que
procede de `design-system/components/**/*.jsx`, no de `docs/`— desaparece.

### 3. El CSS compilado NO contiene `.bg-chart-3`, `.fill-chart-3`, `.text-red-500` ni `.container` — CUMPLE

Medido por el reviewer sobre `dist/assets/index-DWXM5jDg.css` (build propio):

| Selector | Antes (`index-EqvsFnFt.css`, HEAD) | Después |
|---|---|---|
| `.bg-chart-3` | presente | **0 apariciones** |
| `.fill-chart-3` | presente | **0** |
| `.text-red-500` | presente | **0** |
| `.container` | presente | **0** |

Selectores de clase totales: de **35** a **13** por mi extractor (el informe dice
56 → 15 con un contador más laxo que incluye artefactos tipo `.com`/`.googleapis`
del `@import` de Google Fonts; la diferencia es de método de conteo, no de hecho).

Tamaño del CSS medido por el reviewer: **15.81 kB → 9.67 kB** (gzip 4.29 → 3.19).
JS sin cambios (87.22 kB).

Automatizado en `src/assets/__tests__/tailwind-sources.spec.ts:114-116`.

### 4. El CSS SÍ conserva lo que usa `App.vue` y la app se ve igual — CUMPLE (verificado a fondo)

Este es el criterio que era fácil incumplir en silencio, así que **no** me he
quedado en "las 4 clases están". He comparado los dos bundles (HEAD vs. cambio)
capa por capa:

- Las 4 utilidades de `src/App.vue:2` (`min-h-screen`, `bg-surface-app`,
  `text-ink-body`, `antialiased`) están, con **la misma declaración** que antes.
- **`@layer base` es byte-idéntico** (3589 bytes en ambos). Ahí vive el preflight
  y los estilos de `body` del design system: fondo, tipografía, tamaño base. Es
  la capa que decide cómo se ve hoy la app, y no se ha movido ni un byte.
- **Todo lo que hay fuera de `@layer` es byte-idéntico** (4967 bytes): los `:root`
  de `tokens/colors.css`, `typography.css`, `spacing.css`, `base.css`, y las 7
  clases propias `.cc-*`. Ningún token cambia de valor.
- Del `@layer theme` solo desaparecen 11 variables, **todas** las que respaldaban
  utilidades que ya no se emiten (`--color-red-500`, `--color-gray-900`,
  `--radius-*`, `--spacing`, `--text-5xl`…). Ninguna cambia de valor; no se añade
  ninguna.
- Los bloques `@property --tw-*` desaparecen porque ninguna utilidad emitida los
  usa. Comprobado que **no queda ni una referencia `var(--tw-*)` en el CSS
  final**: no hay propiedad registrada colgando.
- **Referencias a variables sin definir: las mismas antes y después** (los cuatro
  `--default-*-font-*` de Tailwind), menos `--tw-leading`, que se va con su
  utilidad. El acotado no ha dejado ningún `var()` roto.

Conclusión: lo que se ha perdido es exactamente CSS muerto; nada de lo que pinta
la app ha cambiado. Es un resultado más fuerte que "las 4 clases siguen ahí".

Sobre la comprobación en Chromium del implementer: **se sostiene**. Las dos
capturas siguen en el scratchpad de la sesión y tienen el **mismo sha256**
(`06466ae6…`, 6633 bytes). Por sí solas probarían poco (la página está vacía
porque el router aún no tiene rutas), pero suman a la comparación de CSS de
arriba, que es la evidencia dura.

Automatizado en `src/assets/__tests__/tailwind-sources.spec.ts:118-126`, que lee
las clases del atributo `class` de `App.vue` en tiempo de ejecución en lugar de
fijarlas como literales: el test sigue a la app solo.

### 5. Existe un test que falla si el escaneo vuelve a abarcar ficheros que no son código de aplicación — CUMPLE (control negativo reproducido)

`src/assets/__tests__/tailwind-sources.spec.ts`, 12 tests. **Lo he puesto rojo
yo**: quitando **solo** `source('../')` de `src/assets/main.css:15` y dejando el
resto igual, la suite del fichero da **5 failed | 7 passed**, con el mensaje
`container leaked into the bundle: the scan widened`. `main.css` restaurado
después (sha256 idéntico al del implementer; `git status` sin cambios extra).

El test **no es de configuración sino de efecto**: compila el bundle real con la
API de Vite (`build({ write: false })`, líneas 82-94) y asevera sobre el CSS
resultante. Un `grep` de `source('../')` habría seguido en verde si el escaneo se
ensanchara por otra vía.

**Los tests de vacuidad hacen lo que dicen.** He reimplementado la lógica de
`filesQuoting` (líneas 70-78) fuera del repo y comprobado los dos guardarraíles:

| Probe | Ficheros que lo citan fuera de `src/` | Dentro de `src/` |
|---|---|---|
| `bg-chart-3` | 7 (`docs/`, `progress/`, `feature_list.json`) | 0 |
| `fill-chart-3` | 6 | 0 |
| `text-red-500` | 7 | 0 |
| `bg-negative-subtle` | 5 | 0 |
| `container` | 11 (sobre todo `design-system/**/*.jsx`) | 0 |
| nombre inventado (control) | **0** → el test fallaría | 0 |

Si mañana alguien reescribe `docs/stack.md` y deja de citar `bg-chart-3`, el
`toBeGreaterThan(0)` de las líneas 104-107 falla con un mensaje que dice qué
hacer, en vez de degradarse a un test verde que no prueba nada. Y si alguien
empieza a **usar** el probe dentro de `src/`, falla el `toEqual([])` de 108-111.
Es el modo de fallo correcto en las dos direcciones.

**El truco de `probe()` (línea 24) es correcto y necesario, y está bien
explicado** en el docblock de las líneas 19-23. El spec vive en `src/`, que ahora
sí se escanea entero: escrito literalmente, `'bg-chart-3'` se emitiría **desde el
propio test** y la aserción "no está en el bundle" no podría fallar nunca. Ningún
trozo (`'bg-'`, `'chart-3'`, `'cont'`, `'ainer'`) es una utilidad válida, así que
no emite nada. Que esto no es teórico lo demuestra el caso `bg-gray-50` (abajo).
Comprobado además que los nombres compuestos por `it.each` solo existen en tiempo
de ejecución, nunca en el texto del fichero.

Dos detalles de precisión, ambos correctos y verificados: la frontera de palabra
`(?<![\w-])X(?![\w-])` (línea 70) evita que `--container-max` de
`tokens/spacing.css` cuente como uso de `container`, y `\.X(?![\w-])` (línea 73)
evita que `.text-ink-body` se lea como `.text-ink`.

Coste medido por mí: la suite completa tarda **1.72 s** con 49 tests. Aceptable.

### 6. `docs/stack.md` documenta la lista blanca, el porqué y la consecuencia práctica — CUMPLE

Sección nueva *Qué ficheros escanea Tailwind (lista blanca)*, `docs/stack.md:167-212`.

- **El qué y el cómo:** `docs/stack.md:178-183` (bloque de código con las dos
  líneas reales de `main.css`).
- **El porqué de lista blanca y no exclusiones:** `docs/stack.md:185-194`.
- **La consecuencia práctica**, que es lo que había que comprobar:
  `docs/stack.md:196-200` lo dice explícito y en lenguaje de riesgo, no de
  mecanismo: *"un fichero con clases fuera de `src/` no se escanea salvo que se
  declare […] se caen del CSS en silencio (sin error de build)"*, con `index.html`
  como caso concreto y explicando por qué se declara aunque hoy no lleve clases.
  No es solo el cómo: nombra el fallo, dice que es silencioso y dice qué hacer.
- **Nota 4 de la sección anterior reescrita** (`docs/stack.md:164-166`) para no
  dejar colgando la referencia al `@source not` eliminado. La doc queda coherente,
  no parcheada.
- **Aviso al futuro redactor:** `docs/stack.md:208-212` deja escrito que `src/` se
  escanea entero, **tests incluidos**, y que por eso el spec compone sus nombres
  en runtime. Es justo el conocimiento que evita que el próximo test rompa la
  propiedad en silencio.

`docs/stack.md` no pasa `prettier --check`, pero **ya no pasaba en HEAD** y `docs/`
está fuera del scope del formateador (`pnpm format` = `prettier --write src/`).
No es un defecto de esta feature.

### 7. `pnpm build`, `pnpm type-check`, `pnpm lint` y `./init.sh` en verde — CUMPLE (ejecutado por el reviewer)

| Comando | Resultado real |
|---|---|
| `./init.sh` | **exit 0** — stack node v24.18.0, arnés completo, `feature_list.json` válido (5 features), type-check OK, **6 test files / 49 tests passed**, `[OK] Entorno listo` |
| `pnpm type-check` | **exit 0** (`vue-tsc --build`, sin errores) |
| `pnpm lint` | **exit 0** (`oxlint . --fix` + `eslint . --fix --cache`; el `--fix` no modificó ningún fichero: `git status` idéntico antes y después) |
| `pnpm build` | **exit 0** — `dist/assets/index-DWXM5jDg.css` **9.67 kB** (gzip 3.19), `index-dSk_J2qt.js` 87.22 kB, built in 133 ms |

Suite re-ejecutada al final, tras restaurar todo lo que toqué para los controles:
**6 files / 49 tests passed**, 1.72 s.

### 8. No cambia ningún token ni ninguna entrada de `@theme inline` — CUMPLE (verificado con `git diff`)

`git diff` completo del árbol: 4 ficheros modificados (`docs/stack.md`,
`feature_list.json`, `progress/current.md`, `src/assets/main.css`) y 2 nuevos
(el spec y el informe). Es decir:

- `src/assets/styles/**` (los 4 CSS de tokens + `fonts.css`): **sin tocar**, ni
  aparecen en el diff.
- `src/assets/main.css`: el diff son **15 líneas, todas en el bloque del `@import`
  (líneas 10-20)**. El bloque `@theme inline` (`main.css:37-116`) no aparece en el
  diff: ni una entrada añadida, quitada ni cambiada.
- Confirmado además por el resultado compilado (criterio 4): los `:root` de tokens
  del CSS final son byte-idénticos y ninguna variable de theme cambia de valor.
- `src/assets/__tests__/styles.spec.ts` (los 10 tests que vigilan que la copia de
  tokens sea literal) sigue verde.

---

## El hallazgo `bg-gray-50` — dictamen

**Hecho, reproducido por el reviewer:** `src/__tests__/App.spec.ts:30` contiene la
cadena literal `'bg-gray-50'` en `expect(wrapper.classes()).not.toContain(...)`.
Ese fichero vive en `src/`, luego entra en la lista blanca, luego Tailwind lo lee
como texto plano y emite la utilidad. Medido en el bundle: **1 aparición de
`.bg-gray-50`** en `dist/assets/index-DWXM5jDg.css`, y ningún componente la usa.
Mi barrido lo confirma: `bg-gray-50` es el único de los nombres examinados que
aparece citado **dentro** de `src/` (1 fichero: ese spec).

**Dictamen: NO compromete ningún criterio de esta feature. Está bien dejado como
deuda aparte (D1).** Razones:

1. **Ningún criterio lo cubre.** El criterio 3 nombra cuatro clases concretas y
   las cuatro han desaparecido. El 4 exige que siga lo que usa `App.vue`, y sigue.
   El 8 es sobre tokens. No hay criterio que hable de esta clase.
2. **Es un límite legítimo del enfoque, no un fallo de la implementación.** El
   `intent` pide que Tailwind mire *"solo mi código de aplicación"*, y un test en
   `src/__tests__/` **es** código de aplicación bajo cualquier lectura razonable.
   La feature entregó exactamente la frontera que el humano pidió; lo que asoma es
   que dentro de esa frontera hay ficheros que no se publican. Eso es una decisión
   nueva, no un defecto de esta.
3. **Arreglarlo aquí habría sido peor.** `App.spec.ts` es de la feature #4, y
   AGENTS.md §3 es explícito: los cambios fuera de scope se anotan, no se aplican.
4. **Y es la mejor prueba de que el riesgo del que el propio spec se defiende es
   real:** el `probe()` no es paranoia de estilo, hay en el repo un caso vivo del
   fallo exacto que evita.

**¿Está bien planteada la deuda para quien la retome?** Sí, con un matiz.
Lo que está bien: el informe (D1, `progress/implementation/tailwind-source-whitelist.md:294-304`)
da fichero **y línea**, explica el mecanismo, dice por qué no se tocó, propone
**dos** arreglos concretos (partir el nombre como en el spec nuevo, o afirmar
sobre las clases presentes en vez de sobre una ausente) y estima el coste (una
línea). Y `docs/stack.md:208-212` deja la regla general escrita donde la leerá el
próximo, que es lo que evita que se repita.

El matiz, **no bloqueante**, para el leader: hoy la deuda vive solo en el informe
y en una nota de `docs/stack.md`. Conviene que al cerrar quede también en
`progress/history.md` o como feature nueva en `feature_list.json`, para que no se
pierda cuando el informe envejezca. Y una tercera opción que no está en el
informe, para quien la retome: acotar el escaneo a `src/` **excluyendo los
`__tests__/`** (ningún test aporta clases que la app necesite, porque los
componentes se escanean solos). Es más ambiciosa y reintroduce una exclusión, así
que merece su propia discusión con el humano; el arreglo de una línea en
`App.spec.ts:30` basta para saldar D1.

---

## Arquitectura (docs/architecture.md)

- [x] Cambio confinado a la capa de estilos globales (`src/assets/`), donde
      `docs/architecture.md` sitúa el CSS global. No cruza capas ni toca
      `features/`, `shared/` ni `services/`.
- [x] Ninguna dependencia nueva (`package.json` no aparece en el diff).
- [x] El test se co-localiza en `src/assets/__tests__/`, junto al módulo que vigila.
- [x] Fichero de test separado de `styles.spec.ts`: concerns y perfiles de coste
      distintos (uno lee ficheros, el otro arranca un build). Razonado y correcto.

## Convenciones (docs/conventions.md)

- [x] **Idioma:** nombres y comentarios del código en inglés; documentación en
      español. El spec nuevo está íntegramente en inglés, los docs en español.
- [x] **Nombres de fichero en inglés:** `tailwind-sources.spec.ts`.
- [x] **Estilo:** `prettier --check` limpio en el spec nuevo y en `main.css`.
      Comillas simples, sin `;`, 2 espacios, ≤100 columnas.
- [x] **Imports:** vendor (`node:*`, `vitest`, `vite`) y `import type { Rollup }`
      con `import type` explícito, como exige `verbatimModuleSyntax`.
- [x] **Tests:** `describe`/`it`, nombres descriptivos en inglés, ubicación
      `src/**/__tests__/*.spec.ts`.
- [x] **Comentarios:** en inglés, cortos y explicando el *por qué* no obvio (por
      qué se parte el nombre, por qué la frontera de palabra). Sin TODOs sueltos
      ni `console.log`.
- [x] **Estilos/UI:** no se introduce ninguna clase de la paleta de serie de
      Tailwind ni ningún `@apply`. Los literales del spec van partidos.

## Verificación (docs/verification.md)

- [x] **Recursos reales, no mocks:** el test compila el bundle de producción real
      con la API de Vite y la config real del proyecto. No mockea Tailwind ni
      reimplementa el escaneo.
- [x] **Verifica output concreto**, no "no lanza excepción": asevera presencia y
      ausencia de selectores concretos en el CSS emitido.
- [x] **Camino feliz y de fallo:** el positivo (las utilidades de `App.vue` siguen)
      y el negativo (las contaminantes no están), más los guardarraíles de
      vacuidad, que es un tercer nivel poco común y bien traído.
- [x] **El test puede fallar de verdad:** control negativo ejecutado por el
      reviewer → 5 fallos. No es un test verde por construcción.
- [x] Gate completo ejecutado por el reviewer, no dado por bueno del informe.

## CHECKPOINTS.md

- [x] **C1 — Arnés completo.** Archivos base y `docs/` presentes; `./init.sh` exit 0.
- [x] **C2 — Estado coherente.** Solo la #5 en `in_progress`; el resto `done` con
      tests verdes; `progress/current.md` describe esta sesión, sin restos.
- [x] **C3 — Arquitectura.** Sin dependencias nuevas, sin logs de debug, sin TODOs
      sueltos, convenciones respetadas.
- [x] **C4 — Verificación real.** Test ejecutable nuevo, en el entorno de
      `docs/verification.md`, con positivo y negativo y con capacidad probada de
      ponerse rojo.
- [x] **C5 — Sesión cerrada bien.** Árbol limpio (4 modificados + 2 nuevos, todos
      esperados; `dist/` ignorado). `progress/history.md` tiene entrada de la
      última sesión cerrada (#4); la de la #5 la escribe el implementer al cerrar.
      `feature_list.json` refleja `in_progress`, el estado correcto ahora.
- [ ] **C6 — Coherencia con proyectos hermanos.** No aplica: no toca el contrato
      con `gastos-backend` ni inventa endpoints o tipos.
- [ ] **C7 — SDD.** No aplica: la feature no tiene `"sdd": true`.
- [x] **C8 — Resumen de cierre escrito.** `progress/summaries/tailwind-source-whitelist.md`.

## Resumen de cierre

- Escrito en `progress/summaries/tailwind-source-whitelist.md` → **sí**.

---

## Cambios requeridos

Ninguno. Los 8 criterios se cumplen con evidencia reproducida por el reviewer.

## Observaciones menores (no bloquean, no exigen acción del implementer)

1. `progress/implementation/tailwind-source-whitelist.md` dice que
   `feature_list.json` pasó de `blocked` a `in_progress`; el diff real contra HEAD
   es `pending` → `in_progress` (el commit `03a92c9` del leader ya la había
   devuelto a `pending`). Imprecisión del relato, no del trabajo.
2. El recuento de selectores del informe (56 → 15) usa un contador que incluye
   artefactos del `@import` de Google Fonts (`.com`, `.googleapis`). Con un
   extractor estricto de selectores de clase salen **35 → 13**. Mismo hecho,
   distinto método; conviene decir cuál se usa si se vuelve a citar la cifra.
3. `src/assets/__tests__/tailwind-sources.spec.ts:120` lee **el primer**
   `class="…"` de `App.vue`. Hoy es exacto (el SFC tiene uno solo) y el
   `toBeGreaterThan(0)` impide que pase en vacío, pero el día que `App.vue` tenga
   más de un elemento con clases, o clases dinámicas (`:class`), el positivo
   cubrirá menos de lo que parece. Merece un comentario o ampliar el regex cuando
   llegue ese día.
4. El arreglo de encoding de `init.sh` (commit `03a92c9`, `encoding="utf-8"`) es
   correcto y está bien acotado: se ha ejecutado en esta revisión con la `Í` de
   «SÍ» presente en `feature_list.json` y valida las 5 features sin incidencia.
   Nada que objetar.

---

**Estado del repo tras la revisión:** exactamente como lo dejó el implementer.
Los dos controles (quitar `source('../')`, y compilar la versión de HEAD para
comparar) se hicieron sobre copias de seguridad y se revirtieron; `git status`
final = 4 modificados + 2 nuevos, `src/assets/main.css` con el mismo sha256
(`06e7b128…`). No se ha marcado nada como `done` ni se ha hecho ningún commit.
