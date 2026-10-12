# Review — feature 29 `statement-readable`

## Review (2026-10-12)

**Veredicto:** APPROVED
Comprobado: requirements ↔ tests (R1–R15 y C1–C5), arquitectura, convenciones,
verificación, CHECKPOINTS C1–C8, hoja de decisiones, procedencia, 18 de 18 tasks.
Checks: 12 de 12 en verde. Sin hallazgos que pidan cambio.
Resumen de cierre: `progress/summaries/statement-readable.md`.

### Con qué se comprobó (comando y resultado)

| Qué | Comando | Resultado |
|---|---|---|
| Pasada completa | `timeout 560 ./init.sh` | exit 0. Lint y formato OK; `105 passed (105)` archivos, `1772 passed (1772)` tests; `pnpm type-check` OK; pruebas de navegador de Chromium en verde |
| Pruebas de navegador, con recuento | `timeout 300 pnpm exec playwright test --project=chromium --reporter=line` | `60 passed (21.3s)`, exit 0. Incluye las 12 de `e2e/action-notice-in-view.spec.ts` (feature 27), que no se ha tocado |
| `checks` | `timeout 400 ./init.sh --checks 29` | `Checks: 12 de 12 en verde`, exit 0 |
| Que cada check ejecuta un test | El `vitest run … -t "…"` de cada check, uno por uno | Checks 1, 2, 4, 5, 6, 7: `1 passed \| 32 skipped (33)`. Check 8: `1 passed \| 19 skipped (20)`. Checks 9, 10, 11: `1 passed \| 71 skipped (72)`. Check 3: `178 passed (178)`. Ninguno sale con 0 sin haber ejecutado nada |
| Que cada check falla si el comportamiento se rompe | Copia de `src/` en la carpeta temporal de la sesión (fuera del repositorio; primero comprobé que sus tests pasaban sin cambios: `384 passed`). En la copia cambié una cosa cada vez y lancé el comando del check | 24 cambios, 24 veces `exit 1` con `1 failed`: los 11 checks que lanzan tests, entre 1 y 4 cambios cada uno (traspaso que deja de tratarse como «no cuenta», importe sin tachar, importe verde o blanco, mínimo de contraste subido a 9, etiqueta de ingreso en verde, `Uncategorized` con fondo o sin borde a rayas, categoría borrada de un movimiento marcado, `Not counted` fuera del renglón de la cuenta, `Transfer` sin `title`, `<details open>`, una palabra cambiada, dos frases cambiadas de orden, frase de los grupos con 0, casilla puesta que dice siempre «escondido», `Hiding 0 movements` en mes vacío, mes escondido que dice «vacío», una lectura de más al backend). Al acabar, `diff -rq` entre la copia y `src/`: idénticas |
| Notas del humano en `docs/guia-de-uso.md` | `git diff -U0 -- docs/guia-de-uso.md`, leído entero; y `diff` de las líneas que casan con `^\s*--\|^>\|^ {6,}\S` entre `git show HEAD:docs/guia-de-uso.md` y el archivo de hoy | 35 líneas añadidas, 20 quitadas, todas texto de la guía. Líneas de nota: 178 antes y 178 después, idénticas. UTF-8, LF, 0 retornos de carro antes y después. **Ninguna nota tocada** |
| Archivos que no debían cambiar | `git diff --stat d5290e7 -- src/features/review src/shared src/features/statement/service.ts …/actions.ts …/NoiseSwitch.vue …/RowCategoryEditor.vue …/months.ts …/__tests__/fixtures.ts` | Sin salida, exit 0 |
| `store.ts` | `git diff -- src/features/statement/store.ts`, leído | 12 líneas añadidas y ninguna quitada: solo se guarda `totalWithoutHiding` de una respuesta que ya se pedía. Nada de lo que marca, desmarca o deshace cambia |
| Feature 27 | `grep` en `StatementRow.vue` y `StatementView.vue` | `:data-movement-id="movement.id"` sigue en la línea 5; el bloque `StickyBelowTopBar` con `StatementActionNotice` no sale en el diff |
| Backend real | Mi pasada de navegador (abajo) apunta cada petición | Orígenes vistos: mi servidor en `localhost:5183` y las fuentes de Google. Ninguna petición a `localhost:3000`. En los cuatro `e2e/statement*.spec.ts` la primera ruta es `**/api/**` → `route.abort()`; los tests unitarios sustituyen `fetch` (`mockApi`, `vi.spyOn(globalThis, 'fetch')`) |
| Datos reales | `git diff -- e2e src`, líneas añadidas | Conceptos inventados (`TRASPASO A MYINVESTOR`, `DEVOLUCION FIANZA`, `NOMINA`), ningún nombre de persona ni número de cuenta nuevo |

### Pasada propia en Chromium

Servidor arrancado por mí en el puerto 5183 (`pnpm exec vite --port 5183 --strictPort`) y
parado por mí al acabar; no toqué nada en 5173 ni en 3000. Todas las peticiones a `/api`
respondidas con datos inventados o abortadas. Script en la carpeta temporal de la sesión.

**Los tres estados del mes con la casilla `Hide what does not count` puesta**
(`/movements?month=2026-10&hide=true`):

| Caso | Lo que pinta |
|---|---|
| Las dos lecturas con `total` 0 | `No movements in October 2026.`, sin `Show everything`, sin `Hiding`. Casilla sigue puesta. Dos `GET /api/movements` |
| El mes con 0 y la lectura sin esconder con 3 | `Nothing left to show in October 2026: everything in this month is hidden.`, `Show everything`, `Hiding 3 movements`. Al pulsar el botón la URL queda en `/movements?month=2026-10` |
| La segunda lectura retenida | Mientras no llega: `Nothing to show in October 2026 while "Hide what does not count" is ticked.` con `Show everything`, sin `Hiding`. Al llegar con 0 pasa al primer caso; al llegar con 3, al segundo |
| La segunda lectura falla (cortada, y aparte con un 500) | Se queda en la frase anterior con `Show everything`; no pinta ningún bloque de error. El botón quita la casilla |
| Con filtro `q` y las dos lecturas a 0 | `No movements match these filters in October 2026.` con `Clear filters`, sin `Show everything` |
| Con filtro `q`, 0 y 2 | `Nothing left to show …: what these filters match is hidden.`, `Hiding 2 movements` |

En todos, único método `GET` y ningún error de página.

**Colores calculados** (seis movimientos inventados, fondo de la tarjeta `rgb(20, 27, 34)`):
importe de lo que no cuenta `rgb(155, 166, 178)` con `line-through`, 7,02 sobre la tarjeta y
7,68 con el ratón encima; gasto que cuenta `rgb(247, 249, 251)` sin tachar; ingreso que
cuenta `rgb(18, 184, 134)` sin tachar. Concepto de lo que no cuenta `rgb(205, 213, 221)`.
Las etiquetas `Food` y `Salary`, idénticas (`rgb(11, 17, 22)` de fondo, texto
`rgb(227, 232, 237)`). `Uncategorized`: sin fondo, borde `1px dashed rgb(155, 166, 178)`.
`Transfer` queda en el mismo renglón que la cuenta, a su derecha y debajo del concepto.

### Las dos mediciones del implementer

Las repetí y salen las mismas cifras. **Ninguna incumple un requirement ni lo aprobado en
la hoja; las dos son notas para el humano**, y van en el resumen de cierre.

- **(a) Gris tachado frente a verde de un ingreso, cociente 1,03.** R1 pide
  `text-ink-faint` y `line-through`; la decisión 🔴 1 dice «tachado y en gris, nunca en
  verde ni en blanco»; la fila 🧪 «Su importe no se confunde» pide que nunca salga en verde
  ni en blanco y que el gris se lea sobre el fondo (7,02 y 7,68, mínimo 4,5). Todo se
  cumple. Ningún requirement pide diferencia de luminosidad entre los dos importes: se
  separan por el tono y por el tachado, y el tachado no depende del color. Frente al blanco
  de un gasto el cociente es 2,34.
- **(b) Con el ratón encima de una línea, la etiqueta de categoría pierde la forma
  (cociente 1,00; en reposo 1,09).** R6 pide `BaseBadge` en `tone="neutral"` y C3 prohíbe
  tocar `BaseBadge.vue`: se cumple al pie de la letra. No es nuevo: antes ya les pasaba a
  las etiquetas sin color; ahora les pasa a todas las de categoría porque todas son
  neutras. El texto de la categoría se sigue leyendo (15,40) y `Uncategorized` conserva su
  borde a rayas, así que «sin categoría se distingue» se mantiene también con el ratón
  encima. Lo que deja de verse durante ese momento es «lo que tiene forma de etiqueta»
  (decisión 🔴 4). Arreglarlo es una decisión de diseño que el spec no recoge.

### Accesibilidad

- **Bloque plegado.** `<details>` nativo. Al cargar: cerrado; las frases plegadas no son
  visibles. El `<summary>` recibe el foco con el teclado (`tabIndex` 0), con el foco puesto
  desde el teclado pinta `2px solid rgb(18, 184, 134)`, `Enter` lo abre (6 `<li>`) y la
  barra espaciadora lo cierra; al recargar vuelve cerrado. En el árbol de accesibilidad de
  Chromium sale como `group: More about what counts`.
- **Importe tachado.** El árbol de accesibilidad de la línea es: concepto, `Bankinter
  ···0001 Not counted`, el botón de la categoría y `312,80 €`. Un lector de pantalla lee el
  importe **sin ninguna indicación de que está tachado**, pero en la misma línea lee
  `Not counted` (o `Transfer`) como texto: lo que dice el tachado no depende solo de él.
- Nota menor, no pido cambio: el `aria-label` de los dos `<span>` (`Transfer`,
  `Not counted`) no aparece en el árbol de accesibilidad de Chromium, que expone el texto
  visible. R5 pide conservarlo tal cual estaba y así está.

### Notas no bloqueantes (para el leader)

1. `git diff --quiet 8f0dce6 -- … src/features/statement/store.ts …` (el último check de la
   feature 27, ya cerrada) sale ahora con exit 1, porque esta feature añade 12 líneas a
   `store.ts`. Avisado en `design.md §8`. `./init.sh --checks 29` no lo ejecuta.
2. `docs/roadmap.md`, filas 11, 18, 20 y 22 de la tabla de cabos sueltos (líneas 435, 442,
   444 y 446) siguen describiendo como abiertos los cuatro fallos que esta feature arregla.
   Es el paso de cierre de `AGENTS.md §5`.
3. El check 12 no incluye `store.ts` (la feature tiene que cambiarlo); lo que ese archivo
   cambia lo he comprobado leyendo su diff, no con el check.
4. Firefox y WebKit no se han lanzado, ni por el implementer ni por mí.

### Comprobado sin hallazgos

R1–R15 ↔ tests (unitarios y de navegador), C1–C5 del spec, `decisions.md` (una página, 6
puntos 🔴 con alternativa, bloques de la plantilla, tabla 🧪 ↔ los 12 `checks`), 15
requirements, procedencia completa, tasks 18 de 18, arquitectura, convenciones,
vocabulario, lecciones activas, CHECKPOINTS C1–C8, documentos que la feature vuelve falsos
(`git grep` fuera de `progress/` y `specs/`: solo las filas del roadmap de la nota 2).
