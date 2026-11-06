## Review — cabo suelto 30 de `docs/roadmap.md` (2026-11-04)

**Veredicto:** CHANGES_REQUESTED

Revisado: el diff frente a HEAD de `StickyBelowTopBar.vue` y su test, `ReviewView.vue` y
su test, `StatementView.vue`, las 4 pruebas nuevas del final de
`e2e/action-notice-in-view.spec.ts` y el párrafo de `StickyBelowTopBar` de
`docs/architecture.md`. No he revisado el cambio de `bringUnderTopBar` (cabo 44).

Mediciones hechas en una copia temporal del repositorio (`git worktree` en el scratchpad,
ya borrada). Las pruebas se lanzaron con su propio Vite en el puerto 5199: en el 5173 había
un Vite del repositorio principal que no arranqué yo, y la primera pasada lo reutilizó.
Esa pasada no la cuento.

### Cambios requeridos

1. `src/shared/components/StickyBelowTopBar.vue:70-75` (el `watch` de `busy`) junto con
   `src/features/review/views/ReviewView.vue:389` y `src/features/statement/views/StatementView.vue:376`
   (`touchedRow` escrito antes de `rules.create`). **El arreglo crea un salto nuevo.**
   Si guardar una regla falla, el diálogo sigue abierto y el aviso no cambia. Aun así,
   cuando `rules.isSaving` vuelve a `false`, el componente mide y sube la página por
   debajo del diálogo. Lo medí en Chromium con una prueba temporal: en `Review`,
   categoricé la fila 4131, la dejé 30 px bajo la barra (18 px detrás del aviso), abrí
   desde ella `Create rule` y pulsé `rule-save`. `POST /api/category-rules` contestó 409
   tras 300 ms.
   - Con el arreglo, en 3 de 3 intentos: `scrollY` 2161 → 2142 (−19 px), la fila pasa
     de 89,94 a 108,94 px y el aviso sigue igual (`1 movement categorized as Groceries Undo`).
   - Sin el arreglo, en 3 de 3 intentos: `scrollY` 2161 → 2161, no se mueve.

   Es el mismo tipo de salto que pide quitar el cabo 30: la página se mueve sin que el
   aviso haya cambiado y con un diálogo abierto. Incumple «no cambia nada visible aparte
   del salto». Arreglo: medir al acabar `busy` solo si, mientras duraba, cambió lo que
   enseña el aviso o el selector. Y escribir `touchedRow` solo cuando la regla se ha
   guardado de verdad. Hace falta una prueba de navegador para este caso, que falle con
   el código actual.

### Comprobado sin hallazgos

- **El salto existía y desaparece** (Chromium, prueba temporal propia, 3 repeticiones de
  cada caso, mismos números en las tres):

  | Caso | Sin el arreglo | Con el arreglo |
  |---|---|---|
  | `Movements`, `Undo` | `scrollY` 2630 → 2598, línea 13,70 px bajo el aviso | 2630 → 2611, línea a 0,70 px |
  | `Review`, `Undo` | la fila baja 19 px en pantalla | la fila no se mueve (0 px) |
  | `Review`, abrir `Create rule` desde otra fila | `scrollY` −18 | `scrollY` igual |

- **Las pruebas nuevas fallan sin el arreglo.** Se probaron en la copia, con los tres
  archivos de `src/` devueltos a HEAD.
  - `npx playwright test -c <config a 5199> e2e/action-notice-in-view.spec.ts -g "partly behind the notice"`
    → **10 failed, 2 passed**. Las cuatro fallan en Chromium (13,70 / 19 / 2488≠2506 /
    3008≠3027) y cada una falla en al menos dos navegadores.
  - `npx vitest run` de los dos specs → **3 failed | 63 passed**. Fallan justo los 3 tests nuevos.
- **Las pruebas nuevas pasan con el arreglo** dentro de la pasada completa de abajo.
- **Ninguna prueba existente se ha aflojado.** En el alcance de esta revisión, el diff
  solo añade líneas. Las únicas líneas quitadas de `action-notice-in-view.spec.ts` son
  de `bringUnderTopBar` (cabo 44).
- **F27** (`specs/27-action-notice-in-view/requirements.md` y
  `progress/reviews/action-notice-in-view.md`): R11 sigue cubierto. Guardar la regla con
  éxito aún nombra la fila. C1 a C5 sin cambios: no se tocan stores ni `data-test`.
  Todas las pruebas de la F27 pasan.
- **Arquitectura y convenciones:** el párrafo de `docs/architecture.md` describe el
  código nuevo. Además del hallazgo 1, no he encontrado ninguna línea de `docs/` que se
  haya vuelto falsa.
- **`npx playwright test`** (tres navegadores, repositorio real) → exit 0, **264 passed (2.2m)**.
- **`./init.sh`** → exit 0: tipos OK, oxlint y prettier OK, `Test Files 133 passed (133)`,
  `Tests 2148 passed | 1 expected fail (2149)`, `vue-tsc --build` OK, `E2E smoke verde (chromium)`.
- Datos: solo respuestas imitadas, ningún dato real en archivos que van a git.
  Checkpoints C1-C5 sin más hallazgos. No es una feature de `feature_list.json`: no hay
  `checks`, spec ni resumen de cierre.

## Segunda revisión (2026-11-04)

**Veredicto:** APPROVED

Mismo alcance que la primera revisión. Medí en una copia temporal del repositorio, ya
borrada, con su propio Vite en el puerto 5199. Usé una prueba temporal propia, con 2
repeticiones por caso en Chromium y los mismos números en las dos. «Antes» es HEAD.

| Caso (fila 18 px detrás del aviso) | HEAD | Ahora |
|---|---|---|
| `Movements`, `Undo` | `scrollY` 2630 → 2598, línea 13,70 px bajo el aviso | 2630 → 2611, 0,70 px |
| `Review`, `Undo` | la fila baja 19 px | 0 px |
| `Review`, abrir `Create rule` desde otra fila | −18 | 0 |
| `Review`, guardar regla con 409 (diálogo abierto) | 0 | 0 (con la 1.ª vuelta: −19) |
| `Review`, guardar regla con éxito, misma fila | 2161 → 2290, fila a 0,06 px bajo el aviso | idéntico |
| Cancelar el diálogo, `Review` / `Movements` | −18 / −19 | 0 / 0 |
| `Review`, `Undo` con 409 (sale la frase de fallo) | sube 32, fila a 13,94 px bajo el aviso | sube 19, fila a 0,94 px |
| `Movements`, `Undo` con 409 | la página vuelve arriba (`scrollY` 0) al recargar el mes | idéntico |

- **El salto que encontré ha desaparecido.** Ninguno de los casos de arriba abre otro.
  En el `Undo` que falla, la página se mueve porque cambia la frase del aviso, y lo hace
  menos de 1 px de más (R11). En `Movements`, un `Undo` que falla lleva la página arriba
  al recargar el mes, pero pasa igual en HEAD: no viene de este arreglo.
- **Las pruebas nuevas fallan sin el arreglo.** Rehíce en la copia el código de la primera
  vuelta: el texto del bloque no se compara y `touchedRow` se escribe antes de
  `rules.create`.
  - Las dos pruebas `a rule that fails to save…` dan **6 failed** en los tres navegadores
    (2161 → 2142/2143 y 2630/2631 → 2611/2612).
  - Unitarios: **2 failed | 66 passed**, y los 2 que fallan son los nuevos.
  - En HEAD, las 4 pruebas de la primera vuelta siguen fallando en Chromium (13,70 / 19 /
    2488 / 3008).
- **Ninguna prueba existente se ha aflojado.** En el alcance, el diff solo añade pruebas.
  `the notice does not cover a row changed while the notice is already showing` sigue
  sin tocar y pasa.
- **Arquitectura y documentos:** `docs/architecture.md` describe la comparación del
  texto y la escritura de `touchedRow` al guardar con éxito.
- **`npx playwright test`** (tres navegadores, repositorio real) → exit 0, **270 passed (2.3m)**.
- **`./init.sh`** → exit 0: tipos OK, oxlint y prettier OK, `Test Files 133 passed (133)`,
  `Tests 2150 passed | 1 expected fail (2151)`, `vue-tsc --build` OK, `E2E smoke verde (chromium)`.

Comprobado: lo pedido ↔ pruebas, arquitectura, convenciones, verificación, CHECKPOINTS
C1-C5 y C8. Checks: sin checks (no es una feature de `feature_list.json`).
Resumen de cierre: `progress/summaries/notice-page-jump.md`.
