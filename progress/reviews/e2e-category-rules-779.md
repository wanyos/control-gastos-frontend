# Revisión — cabo 41, `e2e/category-rules.spec.ts:793` (antes `:779`)

## Review — 2026-11-04

**Veredicto:** CHANGES_REQUESTED

### Cambios requeridos
1. `docs/stack.md:851-860`: el arreglo ha dejado falso este párrafo. Dice «El e2e de chromium
   falla a veces, sin causa comprobada (cabo 41…)» y cita `category-rules.spec.ts:779` con el
   color `rgb(21, 28, 35)` frente a `rgb(20, 27, 34)`. Esa prueba ya tiene la causa comprobada y
   arreglada, y ahora está en `:793`. Hay que reescribirlo sin tocar la parte de
   `action-notice-in-view.spec.ts:992`, que sigue sin explicar. El informe del implementer ya lo
   señalaba y lo dejó sin corregir. Es solo un cambio en `docs/`. (`docs/roadmap.md:488` y `:491`
   también citan `:779`, pero son del leader y no los juzgo aquí.)

### Comprobado sin hallazgos
- **La causa está comprobada, no deducida.** La reproduje yo con la prueba de HEAD, copiada a una
  carpeta ignorada por git (ya borrada) y lanzada con una configuración temporal:
  `pnpm exec playwright test -c <temporal>/pw.config.ts category-rules.spec.ts:779 --project=chromium --repeat-each=30 --reporter=line`
  → `7 failed, 23 passed`, todos en `background`: `rgb(21, 28, 35)` frente a `rgb(20, 27, 34)`.
  Después añadí a esa copia un registro temporal que, justo cuando la versión antigua daba el
  bloque por quieto, apuntaba `getAnimations({ subtree: true }).length` y los fondos que había
  guardado. Resultado: `4 failed, 26 passed`. De 120 lecturas, 116 tenían el color final. Las
  otras 4 guardaban un color a medio camino (`rgb(21, 28, 35)`, `rgb(22, 30, 37)`), y en una de
  ellas aún quedaba una transición en marcha (`anims=1`). Coincide con lo que dice el informe: la
  prueba leía el bloque mientras el botón seguía cambiando de color. El experimento con
  `reducedMotion` que cuenta el informe no lo repetí.
- **La prueba sigue comprobando lo mismo.** El diff frente a HEAD solo añade un `expect.poll` al
  principio de `settledLookOfLastApply`, que espera a que no quede nada en hover ni ninguna
  transición en marcha dentro de `last-apply`, y cambia el comentario. La lectura
  (`lookOfLastApply`), la exigencia de dos lecturas iguales y las cuatro comparaciones `toEqual`
  de la prueba (de la F33, línea 793) siguen igual. No hay reintentos ni `retries`, y no se ha
  borrado ni desactivado nada. Si esa espera no se cumpliera, la prueba fallaría por tiempo; no
  puede hacer que pase sin comprobar.
- **No se ha tocado código de la aplicación.** `git status` solo muestra
  `e2e/category-rules.spec.ts`, más `docs/roadmap.md` y `progress/current.md` del leader, y el
  informe.
- **Deja de fallar.**
  `pnpm exec playwright test e2e/category-rules.spec.ts:793 --project=chromium --repeat-each=120 --reporter=line`
  → `120 passed (1.8m)`, exit 0. Con la prueba de HEAD fueron 7 fallos de 30 en la misma máquina
  y el mismo día.
- **`./init.sh`** → exit 0: tipos OK, oxlint y prettier OK, `132 passed (132)` /
  `2139 passed (2139)`, `vue-tsc --build` OK, `E2E smoke verde (chromium)`, «Entorno listo».
- Convenciones del archivo (comentario en inglés, como el resto de la prueba). No hay datos reales
  del humano. El vocabulario del informe y de esta revisión es descriptivo y no usa términos sin
  aprobar. Las lecciones activas de `docs/lessons.md` (1-4) no se repiten.
- No es una feature de `feature_list.json`: no tiene `checks` ni spec, así que no hay
  `./init.sh --checks` que lanzar ni C7.
