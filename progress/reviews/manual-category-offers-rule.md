## Review — 2026-10-18

**Veredicto:** APPROVED
Comprobado: requirements R1–R15 ↔ tests, arquitectura, convenciones, verificación,
CHECKPOINTS C1–C8 (C4 bis: ver abajo). Checks: 12 de 12 en verde.
Sin hallazgos.
Resumen de cierre: `progress/summaries/manual-category-offers-rule.md`.

### Con qué se comprobó (comando → resultado)

- `timeout 900 ./init.sh` → **primera pasada exit 1**: 1 prueba de navegador roja,
  `e2e/category-rules.spec.ts:761` (feature 33), por un color de fondo de 1 unidad
  (`rgb(21, 28, 35)` frente a `rgb(20, 27, 34)`). **Ya fallaba antes de esta feature:** en
  una copia del commit `a88aa4e` (sin los cambios de la F34), compilada y servida en otro
  puerto, la misma prueba repetida 60 veces falló 9, con la misma diferencia; con los
  cambios de la F34, 2 de 20. **Segunda pasada de `./init.sh`: exit 0** (1987 tests
  unitarios, E2E smoke verde). No es de la F34; queda para que el leader lo apunte como
  cabo suelto.
- `timeout 900 ./init.sh --checks 34` → 12 de 12. Cada una de las 21 partes de vitest y
  Playwright de los 12 checks, lanzada suelta: **exactamente 1 test ejecutado** en cada
  una (ninguna sale con 0 sin comprobar). En los checks 4 y 5 la parte unitaria va detrás
  de la de navegador y también se ejecuta (1 passed cada una).
- Que fallan si se rompe el comportamiento: sobre una copia del árbol de trabajo, 12
  cambios a propósito en el código (abrir la pregunta con 0 movimientos, abrirla con un
  409, la etiqueta también para `rule`, pedir más cosas tras un `POST` rechazado, quitar
  el paso 3 del texto, quitar la espera al teclear, `Create rule` siempre encendido,
  `Review` sin pregunta, la pregunta fuera del bloque bajo la barra, `Movements` sin la
  línea de la regla creada, `No, only this one` que crea la regla, el número que no sigue
  al texto editado) → el check correspondiente pasa a rojo en los 12 casos.
- `--checks` 27, 28, 29, 30, 31, 32, 33 → 12/12, 8/8, 11/11, 9/9, 10/10, 14/14, 11/11. La
  prueba nueva de la feature 27 mide, con la página bajada, que la línea, su `Undo`, la
  pregunta y sus dos botones están dentro de la ventana y sin nada encima (el elemento
  del centro es suyo), la pregunta por debajo de la línea y del `Undo`, y la fila cambiada
  por debajo del bloque.
- Texto propuesto calculado en el navegador, contra el backend real (solo `GET`):
  `GET /api/category-rules/suggestions` → 67 propuestas, 784 movimientos. En las 67, al
  menos un movimiento da con `suggestionTextOf` exactamente el `matchText` del backend
  (67 de 67); 746 de los 784 movimientos lo dan (los otros 38 entran en la propuesta por
  contener el texto, no porque salga de su concepto). Además, `suggestionTextOf` y la
  función del backend que hace lo mismo dan el mismo resultado en los 784. Paso a paso
  con el contrato: igual en los cinco pasos; el código del backend difiere en detalles
  que el contrato no dice (`\b` tras `concepto`, letras solo `a-z` en el paso 3), sin
  efecto en estos datos.
- `GET /api/category-rules/preview` real, con cada una de las 67 propuestas y una
  categoría de su tipo: `parseRulePreview` lee las 67 sin error, y el número de
  movimientos de la regla nueva es el de la propuesta en las 67. Los espacios viajan como
  `+` y el backend los lee bien (mismo resultado que con `%20`).
- Navegador con datos reales, solo leyendo (copia compilada en el puerto 8097, cualquier
  petición que no fuera `GET` se abortaba; no hubo ninguna): `Movements`, abril 2024,
  junio y julio 2026 → 247 líneas; las 148 con `categorySource: "closing"` enseñan
  `Set when the import was closed` y las 99 restantes no. `Review` no se pudo comprobar
  con datos reales: la cola tiene 0 pendientes. No se cambió ninguna categoría ni se
  creó nada, así que la pregunta no se vio con datos reales.
- `docs/guia-de-uso.md`: las 107 líneas `--` y los 11 bloques «Mis notas de esta prueba»
  son idénticos a los de `HEAD` (`diff` de las líneas de nota: sin diferencias). Solo se
  borran 2 líneas, de texto del agente. Ningún texto nuevo queda entre un paso y su
  `-- ok`: todo va debajo de la nota.
- `docs/architecture.md` y `prettier --check`: ya fallaba en `HEAD` y en `HEAD~1`; las
  tres diferencias que da (líneas 20–21, 46 y 550, cursivas con `*`) no son de esta
  feature.
- Datos de prueba: sin nombres de personas ni comercios reales; el IBAN de
  `e2e/manual-category-offers-rule.spec.ts:18` no es de ninguna de las 5 cuentas reales.
  Ningún test habla con `localhost:3000` (la primera ruta de cada prueba de navegador
  aborta cualquier `/api` no prevista).

### `Undo` del cambio a mano al decir que sí

En `Review` se pierde (la lista se vuelve a pedir y la selección y el `Undo` se van): está
en ⚠️ de la hoja aprobada y viene de la feature 33. En `Movements` tampoco se ve: la
línea de la regla creada ocupa el sitio de la línea del cambio y su `Undo` hasta la
siguiente escritura (design §5, ⚙️ 1 de la hoja «como `Review`»; la guía lo dice en el
paso 15). No contradice lo aprobado ni la feature 27, que pide que la línea y su `Undo`
estén a la vista mientras existen, no que sobrevivan a crear una regla; pero la hoja solo
nombraba `Review`.

### Comprobado sin hallazgos

acceptance/requirements ↔ tests (R1–R15, cada uno con al menos un test con nombre),
`tasks.md` 15 de 15 en `[x]`, hoja de decisiones (una página, 🔴 con 6 puntos y su
alternativa, 15 requirements, procedencia de los 15), checks ↔ tabla 🧪 de la hoja,
arquitectura (dependencia `review`/`statement` → `category-rules`, nunca al revés),
convenciones, documentos que la feature volvía falsos (`git grep` fuera de `progress/` y
`specs/`), lecciones activas de `docs/lessons.md`, CHECKPOINTS C1–C8. C4 bis: el
implementer no hizo pasada real y el leader lo apuntó (cabo 40); la de lectura la hizo
esta revisión (arriba).

Nota fuera de la feature: el servidor de desarrollo que escuchaba en el puerto 5173 al
empezar esta revisión (PID 32724) ya no estaba al final. Esta revisión solo paró el
servidor que arrancó ella en el 8097 (PID 33420); no sé quién lo paró.
