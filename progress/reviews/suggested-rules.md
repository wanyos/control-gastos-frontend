## Review — 2026-10-18

**Veredicto:** CHANGES_REQUESTED

### Cambios requeridos

1. `docs/guia-de-uso.md:1161` — dice «Aplicar las reglas borra el `Undo` y las casillas
   marcadas que tuvieras en `Review`», y desde esta feature también lo hacen **crear y
   cambiar una regla**: `postRule` y `update` de `src/features/category-rules/store.ts` suben
   `applyRun`, y `src/features/review/store.ts:497-501` responde a eso con
   `refreshAfterRules`, que llama a `clearSelection` (vacía `selectedIds` y `lastAction`).
   Comprobado con una prueba temporal (creada, ejecutada y borrada; `git status` igual que al
   empezar): con una fila marcada en el store de `Review`, `create` del store de reglas con
   un `POST` simulado → `selectedIds` pasa de `[5]` a `[]` (`1 passed`). La viñeta de justo
   encima (líneas 1157-1160) sí se corrigió con «(desde la feature 33, también al crear o
   cambiar cualquier regla)»; esta tiene que decir lo mismo. Es texto del agente, no una
   nota del humano.
2. `CHECKPOINTS.md` C4 bis — la lectura de `categorization` en la respuesta del `POST` y
   del `PATCH` no se ha pasado por un dato real (el informe dice por qué: es una escritura)
   y no está apuntada como deber del humano en `docs/roadmap.md` (`grep -n -i "F33\|feature
   33\|suggested\|propuest" docs/roadmap.md` no encuentra nada de esta feature). La parte de
   lectura sí la he pasado yo con datos reales (abajo). Falta la línea en el roadmap: probar
   `Create rule` en una propuesta y `Edit` → `Save` con sus datos y mirar la línea verde y el
   recuadro.

### Comprobado sin hallazgos

- **`./init.sh`** (`timeout 900 ./init.sh`): exit 0. Tipos, lint, formato, `1953 passed
  (116 files)`, `vue-tsc --build` y pruebas de navegador en verde.
- **Checks de la F33** (`timeout 900 ./init.sh --checks 33`): **11 de 11 en verde**, exit 0.
  Cada filtro `-t` lanzado a mano: los 17 dan `1 passed` (ninguno con 0 tests); el `-g` del
  check 3 da `1 passed`. Además, en una copia del proyecto en una carpeta temporal, cambié el
  código de 14 formas que rompen lo que dice cada frase (botón `Create rule` encendido sin
  categoría, categoría elegida de antemano, la propuesta usada no se quita ni se vuelve a
  pedir la lista, `needsRulesReload` en lugar de `wroteNothing` al fallar, error no pintado
  en la fila, frase de los puestos a mano oculta, desplegar hace una petición, lista al
  revés, botón para descartar, frase de pasada sin terminar oculta, vuelve `Apply rules now`,
  `Movements` deja de vigilar `applyRun`, un 500 al crear no sube `applyRun`): el check que
  corresponde sale con error en las 14.
- **Checks 🧪 ↔ hoja:** los 11 coinciden con la tabla de `decisions.md`; no han cambiado
  desde la hoja (solo cambió el de la F27 que el leader renombró al aprobar).
- **Features 27 a 32** (`timeout 900 ./init.sh --checks N`): F27 12/12, F28 8/8, F29 11/11,
  F30 9/9, F31 10/10, F32 14/14, todas exit 0. Los 104 nombres que filtran los checks de
  `feature_list.json` siguen existiendo en sus archivos. Ningún test renombrado por esta
  feature estaba en un check.
- **Requirements ↔ tests:** R1–R16 cubiertos con tests que comprueban textos, peticiones y
  estado concretos (lista del informe, verificada leyendo cada test). Camino de error: 400,
  404, 409 y sin conexión (solo el `POST`, nada más cambia, `applyRun` no sube), 500 y
  respuesta ilegible (sí se vuelve a pedir), carga de propuestas fallida o que no cuadra.
- **`wroteNothing` frente a `needsRulesReload`** (decisión 1 del informe): `needsRulesReload`
  devuelve `true` para un 404, `wroteNothing` no; los caminos nuevos usan `wroteNothing` y la
  ventana de crear regla sigue como estaba. Con 404/409/400/red la única petición es el
  `POST` y la frase dice «Nothing was saved…», que es lo que garantiza el contrato.
- **Validación contra el contrato:** `parseSuggestions` y `parseCategorization` leen campo a
  campo lo que dicen `GET /api/category-rules/suggestions` y `POST`/`PATCH
  /api/category-rules`; `movementCount` distinto de la longitud de `movements`, `kind`
  fuera de `expense|income`, falta de `manualMatches` o de `categorization` → error con el
  campo. `manualMatches`: se pinta la frase, y el frontend no toca esos movimientos (no hay
  ninguna escritura sobre movimientos).
- **Datos reales, solo `GET`** (servidor propio en el puerto 5199, parado al acabar; 5173 no
  estaba arrancado; todas las peticiones que no eran `GET` se cancelaban en el navegador, 0
  intentos): `GET /api/category-rules/suggestions` → 200, 67 propuestas, en el orden del
  contrato, ninguna con el número descuadrado. En `Rules` salen 67 filas, en el mismo orden,
  con el mismo texto, tipo, número y frase de los puestos a mano (4 la llevan); 0 diferencias.
  Todos los desplegables empiezan vacíos y todos los `Create rule` apagados. Desplegadas la
  primera (gastos, 73) y la primera de ingresos (41): salen los mismos movimientos que la API,
  en el mismo orden, con signo correcto, y sin ninguna petición. 0 errores de consola.
- **Contraste medido en el navegador** (tema oscuro): textos nuevos entre 5,54 y 17,99 (mínimo:
  línea verde de la regla creada sobre el fondo de la página, 5,54; botón `Create rule`
  apagado 7,44; etiqueta `Income` 6,8; frase `UNFINISHED_MOVE` del recuadro 8,08). Todas las
  combinaciones nuevas tienen su línea `contrast:` en `src/assets/theme-dark.css`.
- **`e2e/action-notice-in-view.spec.ts`, las dos pruebas «…folded|open above the list»:** la
  comprobación de que la fila cambiada queda entera por debajo del aviso
  (`expectRowClearOfNotice`) sigue igual y se ejecuta después de que el aviso de la acción
  sustituya a la línea de la regla creada; ahora la fila parte tapada por esa línea, así que
  no se ha debilitado.
- **`docs/guia-de-uso.md`, notas del humano:** las 92 líneas `--` son idénticas y en el mismo
  orden que en `HEAD`; los 11 bloques «Mis notas de esta prueba» son idénticos; el párrafo
  inmediatamente encima de cada `--` es el mismo que en `HEAD` (ningún texto nuevo encima de
  un `-- ok`).
- **Datos de prueba:** los nuevos son inventados (`academia ficticia norte`, `supermercado
  inventado`, `cooperativa sintetica`, `proveedor ficticio NN`). Ningún test habla con
  `localhost:3000`.
- Arquitectura y convenciones (dependencia `statement` → `category-rules` en un solo
  sentido, documentada en `docs/architecture.md`), sin `console.log` ni TODOs, `tasks.md`
  16/16 `[x]`, hoja con 6 puntos 🔴 con alternativa, 16 requirements con la razón dicha,
  procedencia de R1–R16, documentos que nombraban `Apply rules now` corregidos salvo los dos
  pasos con `-- ok` (con su párrafo nuevo debajo). CHECKPOINTS C1–C3, C5, C6, C7.

## Review — 2026-10-18 (segunda pasada)

**Veredicto:** CHANGES_REQUESTED

### Cambios requeridos

1. `docs/roadmap.md:476-477` — el cabo suelto nuevo de la F33 lleva el número `38`, y la fila
   de justo debajo (la del vencimiento de un depósito sin archivo de producto, que ya estaba en
   `HEAD`) también es la `38`. Hay dos cabos con el mismo número, y «el cabo 38» ya no dice
   cuál. Hay que darle al nuevo el siguiente número libre (`grep -n '^| ' docs/roadmap.md` para
   ver cuál es) y no tocar el número del que ya estaba. Es lo único que falta: el contenido de la
   fila está bien.

### Comprobado sin hallazgos

- Punto 1 de la primera pasada: `docs/guia-de-uso.md:1161-1162` dice ya «Aplicar las reglas
  borra el `Undo` y las casillas marcadas que tuvieras en `Review` (desde la feature 33, también
  crear o cambiar una regla).» Resuelto.
- Punto 2 de la primera pasada: el contenido de la fila nueva del roadmap (prueba con datos
  reales de `Create rule` desde una propuesta y de `Edit` → `Save`, a cargo del humano o del
  leader con su permiso) cubre C4 bis. Solo falla el número (arriba).
- Notas del humano en `docs/guia-de-uso.md`: las líneas `--` de `HEAD` y de la copia de trabajo
  son las mismas, en el mismo orden (107 y 107, `diff` vacío); los 11 bloques «Mis notas de esta
  prueba» son idénticos (`diff` vacío); `git diff` no tiene ninguna línea `--` añadida ni quitada.
- `find src e2e -newer progress/reviews/suggested-rules.md`: ningún archivo cambiado desde la
  primera pasada, así que vale lo comprobado entonces sobre el código, los tests y los filtros
  de los checks (cada `-t` y el `-g` con `1 passed`).
- `timeout 900 ./init.sh --state`: exit 0, «Estado del harness coherente».
- `timeout 900 ./init.sh --checks 33`: exit 0, **11 de 11 en verde**.

## Review — 2026-10-18 (tercera pasada)

Rechazos anteriores: primera pasada, `docs/guia-de-uso.md:1161` no decía que crear o cambiar
una regla también borra el `Undo` y las casillas de `Review`, y faltaba en `docs/roadmap.md` la
prueba con datos reales de la F33 (C4 bis); segunda pasada, esa fila del roadmap llevaba el
número 38, repetido con otro cabo suelto.

**Veredicto:** APPROVED
Comprobado: acceptance/requirements ↔ tests, arquitectura, convenciones, verificación,
CHECKPOINTS C1-C8. Checks: 11 de 11 en verde (`timeout 900 ./init.sh --checks 33`, exit 0).
Sin hallazgos. La fila de la F33 en `docs/roadmap.md:476` es ahora la 39; contando los números de
la tabla «Cabos sueltos con dueño», el único repetido es el 37 (líneas 447 y 475), de antes de
esta feature y ninguno suyo. Desde la segunda pasada solo ha cambiado `docs/roadmap.md` (`find src
e2e docs specs -newer` de esta revisión), y su `git diff` es esa única línea.
Resumen de cierre: `progress/summaries/suggested-rules.md`.
