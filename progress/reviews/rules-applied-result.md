# Review — rules-applied-result (F30)

> Hubo un primer rechazo (2026-10-14, abajo): el código estaba bien, pero había cuatro
> fallos de documentos y de `feature_list.json` (cabo suelto 26 desfasado, prueba con
> datos reales sin apuntar en `docs/roadmap.md`, `"checks": []` añadido a las features
> 1 a 25, y texto nuevo de la guía encima de un `-- ok` del humano). Corregidos por el
> leader; aprobado en la segunda pasada.

## Review 2026-10-14 (segunda pasada)

**Veredicto:** APPROVED
Comprobado: acceptance/requirements ↔ tests, arquitectura, convenciones,
verificación, CHECKPOINTS C1-C8. Checks: 9 de 9 en verde.
Sin hallazgos.
Resumen de cierre: `progress/summaries/rules-applied-result.md`.

Con qué comando y qué salió (solo lo que cambió desde la primera pasada; el código no ha
cambiado y lo comprobado entonces sigue abajo):

- Hallazgo 1: `git diff docs/roadmap.md` → el cabo 26 dice «**F30**, en curso desde el
  2026-10-13 (el backend ya devuelve qué movimientos categoriza, su feature 56)».
- Hallazgo 2: el cabo 32 apunta la prueba con datos reales de F27-F30, con lo que hay que
  ver de la F30 y que aplicar escribe en sus datos; a cargo del leader con permiso del
  humano, o del humano en la segunda revisión. C4 bis cumplido.
- Hallazgo 3: comparación por feature de `feature_list.json` contra
  `git show HEAD:feature_list.json` (script de node) → solo difieren las F26 (11→10
  checks), F27 (13→12) y F29 (12→11); las tres líneas borradas son los `git diff --quiet
  <commit>`. Las features 1 a 25 son idénticas a HEAD. La F30 ya estaba `in_progress` en
  HEAD.
- Hallazgo 4: `git diff docs/guia-de-uso.md` → el párrafo «Nuevo desde la feature 30, sin
  probar en tu primera revisión» queda debajo del `-- ok`. `git diff docs/guia-de-uso.md |
  grep -nE '^[-+]\s*(--|.*Mis notas)'` solo devuelve la cabecera `--- a/…`: ninguna nota
  del humano añadida, borrada ni cambiada.
- `timeout 300 ./init.sh --state` → exit 0, «Estado del harness coherente».
- `timeout 900 ./init.sh --checks 30` → **Checks: 9 de 9 en verde**, exit 0.

---

## Review 2026-10-14

**Veredicto:** CHANGES_REQUESTED

El código y los tests están bien; los cuatro hallazgos son de documentos y de
`feature_list.json`.

### Cambios requeridos

1. `docs/roadmap.md:450` (cabo suelto 26) — la última columna sigue diciendo
   «**F30**, `blocked`: espera al backend». Ya no es verdad: el backend ya devuelve
   `categorizedMovements` y la F30 está `in_progress` con todo implementado. Hay que
   poner el estado actual.
2. CHECKPOINTS C4 bis — la feature lee algo nuevo de fuera (`categorizedMovements` en
   la respuesta de `POST /api/category-rules/apply`), y no se ha hecho la prueba con
   datos reales. El informe explica por qué (`## Prueba real`, las dos secciones), pero
   **no hay ninguna línea en `docs/roadmap.md` que se la apunte al humano como deber**:
   `grep -n "F30\|feature 30\|rules-applied-result" docs/roadmap.md` solo devuelve la
   línea 450 del punto 1. Que esté en el bloque 📌 de `decisions.md` no basta: C4 bis
   pide que esté en `docs/roadmap.md`.
3. `feature_list.json` — a las features 1 a 25 se les ha añadido `"checks": []`
   (`git diff feature_list.json`: 25 bloques `+      "checks": []`, por ejemplo después
   de la línea 46). No lo cuenta ninguno de los dos informes (el del Lote B dice «−8»,
   que son solo los tres checks retirados), no está en ninguna task, y
   `docs/specs.md:353-354` dice que las features antiguas no se migran. Hay que
   deshacerlo o escribir en el informe quién lo hizo y por qué.
4. `docs/guia-de-uso.md:557-561` — la frase nueva sobre los pendientes sin categoría
   está metida en el paso 2 de `Review`, **justo encima** de la nota `-- ok` del humano.
   La nota no ha cambiado (lo he comprobado abajo), pero ahora parece que da por bueno
   algo que él nunca ha probado. Este paso no estaba en la lista de T18. Hay que poner
   el texto nuevo en un paso propio, o debajo de la nota, para que no quede firmado por
   el `-- ok`. (En el paso 15 la nota `-- no veo que haya cambiado nada…` también queda
   debajo de texto nuevo, pero eso sí lo anunciaba el bloque 📌 de la hoja que aprobó el
   humano.)

### Comprobado sin hallazgos

Con qué comando y qué salió:

- `PLAYWRIGHT_HTML_OPEN=never timeout 900 ./init.sh` → exit 0: lint y formato OK,
  `Tests 1820 passed (1820)`, ninguna pareja de rutas que solo cambie en mayúsculas,
  `pnpm type-check` OK, `E2E smoke verde (chromium)`.
- `./init.sh --checks 30` → **Checks: 9 de 9 en verde**, exit 0. Cada filtro lo he
  vuelto a lanzar a mano (`timeout 300 pnpm exec vitest run <archivo> -t "<nombre>"`):
  todos ejecutan algo (`1 passed | N skipped`; el de `rejects an apply answer`,
  `2 passed`). Para comprobar el control, un nombre que no casa con ningún test da
  `7 skipped` y exit 0, así que el `grep -qF` que va delante de cada check sí hace
  falta, y lo tienen todos. El check 1 (navegador) da `1 passed`. Los 9 checks coinciden
  con la tabla 🧪 de `decisions.md`, y ninguno compara un archivo con un commit
  (lección 3).
- `./init.sh --checks 26` → 10 de 10; `--checks 27` → 12 de 12; `--checks 28` → 8 de 8;
  `--checks 29` → 11 de 11. Todas con exit 0.
- **Prueba de navegador montada por mí** (copia de `e2e/category-rules.spec.ts` en el
  scratchpad, con su propio config de Playwright y un servidor de desarrollo arrancado
  por Playwright y parado al acabar; todas las peticiones a `/api` simuladas con
  `page.route`). `timeout 300 pnpm exec playwright test --config …` → `9 passed`.
  - Aplicar en `Rules` → ir a `Review` → `Dismiss` → volver a `Rules`: no hay recuadro
    (`last-apply` 0), y la única escritura es el `POST` de aplicar, sin cuerpo. La
    prueba de control (el mismo recorrido sin `Dismiss`) sí lo encuentra en `Rules`, así
    que la prueba anterior es capaz de fallar.
  - La frase de pendientes sin categoría (otra prueba mía, `1 passed`): en la primera
    visita no se pinta nada hasta que llega la respuesta; al volver a `Review`, mientras
    la petición está en curso, sigue enseñando **el último número conocido** (medido:
    `3 pending movements have no category.` hasta que llegó el 2); si esa petición falla,
    la frase desaparece. Tras categorizar una fila a mano se vuelve a pedir (test
    `asks for the number again after confirming a row`). Tras aplicar las reglas también
    (test `asks for that number again after an action an undo and a rules pass`, y en el
    navegador `1 pending movement has no category.` en las dos pruebas de la F30).
- Validación contra el contrato (`../gastos-backend/docs/api-contract.md:622-720`): en
  `parseCategorized` se comprueban los 8 campos con el tipo del contrato (`amount` con
  `asDecimal`, que exige dos decimales; `type` solo `income`/`expense`; `rules[]` con
  `ruleId` entero y `matchText` texto), y el tamaño de la lista se compara con
  `categorized`. Si falta la lista, viene `null` o no cuadra, lanza `ValidationError`:
  la ventana queda en `failed` con la frase de siempre, no se guarda resultado y
  `applyRun` sube igual (tests de `service.spec.ts` y `store.spec.ts`). Lo único que no
  se comprueba es que `rules` tenga al menos un elemento y que la lista venga ordenada;
  R1 no lo pide y la pantalla funciona sin eso.
- Aplicar sigue siendo **una sola petición** (`POST`, sin cuerpo y sin `PATCH`): unit
  `applying sends a single request and it is the POST without a body`, y en el
  navegador `writes(watch)` da una sola escritura. El frontend no cambia qué movimientos
  se tocan: solo manda el `POST`. La lectura del informe de importación sigue
  funcionando con el campo nuevo y no lo guarda (`reads a report whose categorization
  carries the categorized movements`).
- F27 en `Review` con el recuadro pintado: `draws the result of the rules pass outside
  the block that sticks under the top bar`, `a rules pass still clears the Undo and the
  ticked rows`, las dos pruebas de navegador nuevas de `e2e/action-notice-in-view.spec.ts`
  y `--checks 27` en verde. F28 y F29: sus checks en verde.
- `e2e/review-queue.spec.ts:205` (`Uncategorized travels alone…`): es verdad que esa
  aserción se cumple ya con la petición nueva. Pero el comportamiento sigue cubierto: la
  ruta simulada (línea 125) solo devuelve 1 fila cuando la petición de la página lleva
  `uncategorized=true`, la línea 203 espera esa 1 fila, y la 206-208 comprueba que
  ninguna petición lleva a la vez `categoryId` y `uncategorized`. No queda nada sin
  cubrir.
- Notas del humano en `docs/guia-de-uso.md`: en `git diff` ninguna línea que empiece por
  `--` ni de un bloque «Mis notas de esta prueba» sale como borrada o cambiada; todas
  las líneas `-` son texto de la guía. (El cambio de sitio está en el hallazgo 4.)
- Ningún test habla con `localhost:3000`: cada archivo de navegador tocado empieza
  abortando cualquier `**/api/**` que no esté simulado, y no había nada escuchando en
  3000 ni en 5173 antes ni después. Los datos de las fixtures nuevas son inventados
  (`COMPRA SINTETICO COLMADO NORTE`, `ABONO SINTETICO TALLER EJEMPLO`…). El IBAN de
  `e2e/category-rules.spec.ts:12` ya estaba antes y no lo cambia esta feature.
- Trazabilidad: R1, R2, R5-R16 y C1-C4 tienen cada uno al menos un test concreto (lista
  del informe, comprobada contra los archivos). Las 18 tasks de `tasks.md` están en
  `[x]`; T8 está hecha y se cumple R16. `decisions.md`: 🔴 con 6 puntos, cada uno con
  su alternativa; 13 requirements más R16. Procedencia clasificada en todos.
- Arquitectura y convenciones: `review` → `category-rules` en un solo sentido;
  `LastApplyReport` no lee ningún store; textos en inglés; formatos a través de
  `shared/money.ts`; las combinaciones de colores con `bg-surface-sunken` ya tienen su
  línea `contrast:`. `docs/architecture.md` está al día. No hay `console.log` ni
  archivos sueltos fuera de lo de la feature.
- CHECKPOINTS C1, C2, C3, C4, C5, C6 y C7 sin hallazgos. C4 bis tiene el hallazgo 2. C8
  no aplica todavía (no se escribe resumen con CHANGES_REQUESTED).
