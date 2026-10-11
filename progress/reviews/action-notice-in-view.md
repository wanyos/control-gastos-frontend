## Review — 2026-10-11

**Veredicto:** APPROVED
Comprobado: requirements ↔ tests, arquitectura, convenciones, verificación,
CHECKPOINTS C1-C8. Checks: 13 de 13 en verde.
Sin hallazgos que bloqueen. Hay cuatro cosas vistas en el navegador y una de
vocabulario que no incumplen ningún requirement y que el leader tiene que conocer:
están abajo.
Resumen de cierre: `progress/summaries/action-notice-in-view.md`.

### Lo que he ejecutado yo, y qué salió

Antes de empezar, `netstat -ano` no mostraba nada escuchando en 5173 ni en 3000. Todas
las pasadas usaron el servidor que arranca y para la configuración de Playwright. Al
acabar, tampoco hay nada escuchando en esos dos puertos. No he parado ningún proceso.

| Comando | Resultado |
|---|---|
| `./init.sh` | exit 0. `Test Files 105 passed (105)`, `Tests 1729 passed (1729)`, `OK: pnpm lint:oxlint:check`, `OK: pnpm format:check`, `OK: pnpm type-check (vue-tsc --build, incluye los .vue)`, `E2E smoke verde (chromium)`, `Entorno listo` |
| `./init.sh --checks 27` | exit 0. `Checks: 13 de 13 en verde`. Los diez checks de navegador imprimen cada uno `1 passed` con el nombre del test |
| Los checks 6 y 8 (tests unitarios filtrados por nombre) | `./init.sh --checks` solo imprime de ellos las líneas `Start at` y `Duration`, sin recuento. Los he lanzado aparte con el comando literal de `feature_list.json`: check 6 → `Test Files 3 passed (3)`, `Tests 3 passed \| 114 skipped (117)`; check 8 → `Test Files 3 passed (3)`, `Tests 3 passed \| 14 skipped (17)`. Ejecutan un test por archivo, los tres archivos |
| `git diff --quiet 8f0dce6 -- <los doce archivos de C1>` | exit 0 |
| `git status --short src/ e2e/` | Solo los archivos que declara `tasks.md`. De `e2e/`, solo `?? e2e/action-notice-in-view.spec.ts`. `package.json`, `pnpm-lock.yaml` y `feature_list.json` sin cambios |
| `grep -rn Undo2 src e2e` | Sin resultados |

Los `checks` coinciden con la tabla 🧪 de `decisions.md` (diez filas, trece checks:
las filas de `Movements`, de «arriba del todo» y de «añadido: `Transfers` y la línea de
`Apply rules now`» llevan dos checks cada una). Ninguno falta ni se ha aflojado.

### Lo que pediste mirar con más cuidado

**Trazabilidad y `tasks.md`.** R1–R7 y R10 tienen cada uno su test en
`e2e/action-notice-in-view.spec.ts`; R8 y R12, test unitario en los tres archivos de
cada pantalla; R9, la clase de fondo en `StickyBelowTopBar.spec.ts` y, medido por mí en
Chromium, `background-color: rgb(35, 44, 54)` en el `div` (el mismo valor que `body`,
sin transparencia), `position: sticky`, `top: 60px`, `z-index: 100`; R11, cuatro tests
unitarios y dos de navegador. Las 22 tasks están `[x]` y lo que dicen está en el
código y en los tests.

**No cambia qué hace cada acción, qué deshace el `Undo` ni cuánto dura.** Los doce
archivos de C1 son idénticos a `8f0dce6` (comando de arriba). En las tres vistas, las
props y los eventos de cada aviso son los mismos de antes: leído en `git diff`. El
`v-if="rules.lastCreated"` / `v-else` de `ReviewView.vue` sigue igual, ahora dentro del
componente nuevo; lo cubre `holds the rule notice or the action notice, never both
(R4, C5)`.

**Ningún test habla con el backend de `localhost:3000`.** Los doce tests de navegador
registran primero una ruta que aborta cualquier `/api` y la apunta, y los doce acaban
con `expectNothingUnforeseen`, que exige esa lista vacía y ningún error de consola.
Además, durante mis pasadas no había nada escuchando en 3000: una petición que hubiera
salido habría fallado y puesto el test en rojo. Los tests unitarios nuevos usan las
respuestas imitadas que ya usaban los de cada vista.

**La corrección final (`onUpdated` y `Math.ceil`), comprobada en el navegador.** Con una
prueba de un solo uso, fuera del repositorio (copia de las funciones de rutas y de
medida de `e2e/action-notice-in-view.spec.ts`, más un registro de cada llamada a
`window.scrollBy` hecha con un objeto, que son las del componente). Antes de fiarme de
ella comprobé que el registro ve una llamada del componente y no cuenta las de la propia
prueba (`scrollBy(0, n)`): tras la primera categoría, una sola entrada,
`[{"top":-49}]`, `scrollY` 2631 → 2582. Chromium, 1280×720. Diez casos, los diez
terminan; las cifras:

| Caso | Qué pasó |
|---|---|
| `Movements`: `Undo` con la última línea tocada 30 px bajo la barra superior (18 px detrás del aviso) | El componente sube la página 19 px (`scrollY` 2642 → 2623). La línea queda libre. **No es «lo justo»:** tras el `Undo` el aviso pierde el botón y mide 34,56 px en vez de 48, así que la línea queda 13,7 px por debajo de él |
| `Review`: `Undo` de una categoría con la fila en la misma posición | El componente sube la página 19 px (2601 → 2582) y a continuación el aviso desaparece, porque en `Review` deshacer borra la última acción. La fila vuelve a `Uncategorized` |
| `Review`: `Undo` de un `Confirm` (la fila vuelve a la lista) | Ninguna llamada del componente |
| `Review`, aviso puesto y fila tocada en parte detrás: marcar la casilla de otra fila | Ninguna llamada del componente |
| Ídem: abrir el diálogo de regla desde **otra** fila que se ve entera | Ninguna llamada |
| Ídem: abrir el diálogo de regla desde la fila que está en parte detrás del aviso | **La página sube 19 px** (2679 → 2660) al abrirse el diálogo, sin que la fila haya cambiado. No viene de `onUpdated`: viene del `watch`, porque `onCreateRule` escribe el selector de la fila (design §4) |
| `Review`: escribir en el buscador con el aviso puesto | El aviso desaparece (la lista nueva borra la última acción). Ninguna llamada del componente |
| `Movements`, aviso puesto y línea en parte detrás: activar la selección, marcar otra línea, escribir en el buscador | Ninguna llamada del componente en los tres pasos. Con el buscador el aviso desaparece |
| 1280 px: una acción que sale bien y, con el aviso puesto, otra que falla sobre otra fila en parte detrás | La página sube 18 px al pulsar. La frase de fallo no lleva botón y el aviso encoge a 34,56 px: la fila queda 13,3 px por debajo |

Respuesta a la pregunta: en estos casos **la página no se movió en ningún momento en
que no se hubiera pulsado algo**. `busy` solo cambia durante una acción o un `Undo`. Los
dos sitios donde se mueve sin que la fila acabe de cambiar son el `Undo` (previsto por
el implementer) y abrir el diálogo de regla desde una fila en parte tapada (no
previsto en su informe). Ninguno de los dos incumple un requirement tal como está
escrito; el segundo no está en la hoja de decisiones.

**Aviso de más de una línea.** Comprobado en Chromium, solo en `Review`:

- Ventana de 700 px: la frase de fallo ocupa dos líneas (el aviso pasa de 48 a
  53,1 px). El componente sube 18 px al pulsar y otros 5 al llegar la respuesta: la
  fila queda 0,44 px por debajo. Esos 5 px salen de medir en `onUpdated`.
- Ventana de 420 px: la frase con `Undo` ocupa varias líneas (aviso de 111,7 px). La
  frase y el botón están dentro de la ventana y nada los tapa; la fila queda 0,875 px
  por debajo, y 3,25 px tras el fallo. A ese ancho la página ya es más ancha que la
  ventana (602 px frente a 420); no lo he comparado con el commit anterior.

**No comprobado por mí:**

- Firefox y WebKit. Los lancé (`pnpm test:e2e --project=firefox …` y `--project=webkit …`)
  y los dos fallan con `Executable doesn't exist`: no están instalados en esta máquina.
  No los he instalado.
- Un aviso de más de una línea en `Movements` y en `Transfers`.
- Una respuesta lenta del backend durante la cual se mueve la página a mano.
- Una pantalla real con escalado de Windows y el zoom del navegador.
- `Apply rules now` con la fila de la regla en parte detrás del aviso.

### Para el leader (no bloquea)

1. **Abrir el diálogo de regla mueve la página 19 px** si la fila está en parte detrás
   del aviso (`ReviewView.vue`, `onCreateRule`; lo mismo se lee en `StatementView.vue`,
   no medido allí). La hoja de decisiones habla de «la fila que acabas de cambiar».
2. **Cuando el aviso encoge, la página sube unos 13 px de más** (tras `Undo` en
   `Movements`; tras un fallo que sigue a un acierto). R11 dice «los píxeles justos»; el
   test de R11 solo exige que la fila no quede tapada.
3. **El informe del implementer dice que con `Undo` «la página sube lo justo»** y lo
   marca como no comprobado. Lo medido es lo de las dos primeras filas de la tabla.
4. **Vocabulario:** `specs/27-action-notice-in-view/design.md:171` y `tasks.md:65`
   nombran «red de seguridad» a la primera ruta que aborta cualquier `/api`. No está en
   `CLAUDE.md` ni en `docs/vocabulary.md`. Esas dos líneas vienen del commit del spec
   (`4d49041`), no del implementer, que en lo que escribió lo describe literalmente;
   `docs/stack.md` ya usaba esas palabras antes de esta feature.

### Comprobado sin hallazgos

Requirements ↔ tests (R1–R12, C1–C8), tasks 22 de 22, hoja de decisiones (5 puntos 🔴,
cada uno con alternativa; una página), 12 requirements con procedencia clasificada,
arquitectura (lo común en `src/shared/`, ninguna feature importa de otra), convenciones,
sin dependencias nuevas, sin `console.log` ni `TODO`, datos de prueba inventados,
documentos que la feature vuelve falsos (`docs/stack.md`, `docs/architecture.md`),
CHECKPOINTS C1-C5 y C7.
