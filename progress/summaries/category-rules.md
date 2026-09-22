# Resumen — feature 17 `category-rules`

Fecha de cierre: 2026-09-22
Intención original: `feature_list.json` → feature `category-rules`, bloque `intent`
Spec: `specs/17-category-rules/`

## Qué hace ahora la app que antes no

Ahora, cuando ves un movimiento en **Review**, puedes decir «a partir de ahora, todo lo
que contenga este texto va a esta categoría» sin salir de la fila: pulsas `Create rule`,
la app te propone la palabra que de verdad identifica al comercio —de
«RECIB /IBERDROLA CLIENTES, S.A» saca `iberdrola`, saltándose el trámite del banco—, la
puedes editar, eliges la categoría y se guarda.

Hay una pantalla nueva, **Rules** (`/rules`, en la barra lateral justo debajo de
Review), donde ves todas tus reglas con su texto y su categoría, las cambias y las
borras.

Y con **Apply rules** las pasas todas sobre lo pendiente sin reimportar nada. Antes de
escribir, siempre te pregunta; al terminar te dice cuántos movimientos se categorizaron,
cuántos siguen sin ninguna regla que les case y **todos** los que chocan entre dos
reglas, con su fecha, su concepto y las reglas que se los disputan. Al cerrar, la cola de
Review, sus totales y el contador de la barra lateral se han puesto al día solos, sin
recargar la página.

## Por dónde se usa (puntos de entrada)

- Botón **`Create rule`** en cada fila de la cola de `/review` (apagado en los
  movimientos `neutral`, que ninguna regla puede categorizar).
- Aviso verde sobre la cola tras crear una regla, con el botón **`Apply rules now`**.
- Pantalla **`/rules`**: la lista, con `Edit` y `Delete` por fila y el botón
  **`Apply rules`** arriba (apagado si no tienes ninguna regla).
- Contra la API, los cinco endpoints que ya existían, sin tocar el backend:
  `GET` y `POST /api/category-rules`, `PATCH` y `DELETE /api/category-rules/:id`, y
  `POST /api/category-rules/apply`.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Texto propuesto a partir del concepto | `src/features/category-rules/rules.ts:69` |
| Lista de palabras de trámite del banco | `src/features/category-rules/rules.ts:18` |
| Normalización idéntica a la del backend | `src/features/category-rules/rules.ts:51` |
| «Al menos 3 letras o dígitos», antes de la red | `src/features/category-rules/rules.ts:60` |
| Textos de error, en inglés y sin el mensaje del backend | `src/features/category-rules/rules.ts:87`, `:116`, `:140` |
| Las tres cifras del resultado | `src/features/category-rules/rules.ts:154` |
| Cuerpo del POST y del PATCH, campo a campo | `src/features/category-rules/service.ts:115` |
| Crear una regla | `src/features/category-rules/service.ts:135` |
| Cambiar una regla (un body vacío nunca sale) | `src/features/category-rules/service.ts:141` |
| Borrar una regla | `src/features/category-rules/service.ts:157` |
| Aplicar las reglas, sin body ni cabecera | `src/features/category-rules/service.ts:165` |
| Estado: lista, diálogos y la pasada | `src/features/category-rules/store.ts:27` |
| Crear sin aplicar nada ni tocar el movimiento | `src/features/category-rules/store.ts:96` |
| Una sola pasada a la vez, y aviso al terminar | `src/features/category-rules/store.ts:193` |
| Refresco de la cola tras la pasada | `src/features/review/store.ts:414` y `:423` |
| Botón `Create rule` en la fila | `src/features/review/components/MovementRow.vue:68` |
| Diálogo de crear y de cambiar una regla | `src/features/category-rules/components/RuleDialog.vue` |
| Aviso con `Apply rules now` | `src/features/category-rules/components/RuleCreatedNotice.vue:4` |
| Confirmación antes de aplicar (las tres frases) | `src/features/category-rules/components/ApplyRulesDialog.vue:11` |
| Las tres cifras y la lista de conflictos | `src/features/category-rules/components/ApplyResult.vue:8` y `RuleConflictList.vue:9` |
| Confirmación antes de borrar | `src/features/category-rules/components/DeleteRuleDialog.vue:9` |
| Pantalla `Rules` | `src/features/category-rules/views/RulesView.vue` |
| Ruta `/rules` en la barra lateral | `src/router/index.ts:57` |
| Categorías compartidas entre Review y Rules | `src/shared/categories.ts` |
| Test de la lógica pura | `src/features/category-rules/__tests__/rules.spec.ts` |
| Test de lo que viaja por el cable | `src/features/category-rules/__tests__/service.spec.ts` |
| Test del comportamiento | `src/features/category-rules/__tests__/store.spec.ts` |
| Prueba en navegador real | `e2e/category-rules.spec.ts` |

## Cumplimiento de la intención

- ✅ «Creo una regla desde un movimiento y, al aplicarlas, los parecidos sin categoría se
  categorizan.» → se cumple. La regla nace en la fila
  (`src/features/review/__tests__/MovementRow.spec.ts:84`), se guarda con un solo POST
  (`src/features/category-rules/__tests__/service.spec.ts:46`) y la pasada es un único
  POST sin body (`service.spec.ts:111`). De extremo a extremo, en un navegador real:
  `e2e/category-rules.spec.ts:197` y `:218`, donde la fila acaba mostrando su categoría
  nueva sin recargar.
- ✅ «Veo cuántos se categorizaron, cuántos quedaron sin regla y qué movimientos chocan
  entre dos reglas.» → se cumple. Las tres cifras y **todos** los conflictos, con fecha,
  concepto y cada regla que se lo disputa, verificados en
  `src/features/category-rules/__tests__/ApplyResult.spec.ts:18`, `:28` y `:35`. Que son
  de solo lectura, sin ningún control para resolverlos, en `ApplyResult.spec.ts:54`.
- ✅ «Si el texto ya existe en otra regla o es demasiado corto, me lo dice y no se crea
  nada.» → se cumple. Demasiado corto: te lo dice al escribir y no sale ninguna petición
  (`RuleDialog.spec.ts:116`, `store.spec.ts:74`). Repetido: el diálogo se queda abierto
  con lo que escribiste y el mensaje en inglés, y la lista no cambia
  (`store.spec.ts:116`, `e2e/category-rules.spec.ts:253`).
- ✅ «Borrar o cambiar una regla no toca lo ya categorizado.» → se cumple. Ni cambiar ni
  borrar mandan **nada** sobre movimientos: `store.spec.ts:161`, `:192` y `:290`, y en
  navegador `e2e/category-rules.spec.ts:284`, donde las dos únicas escrituras de toda la
  prueba son el `PATCH` y el `DELETE` de la regla. Además la ventana de borrar lo dice
  con todas las letras: «Movements it already categorized keep their category.»

## Decisiones que se tomaron por ti

Las seis que aprobaste sin cambios, recordadas aquí porque se notan al usar la app:

- (delegado) **Las reglas tienen pantalla propia**, `Rules`, justo debajo de `Review`;
  desde Review solo se crean. `src/router/index.ts:57`.
- (delegado) **El texto propuesto es la primera palabra con sentido**, saltando las
  palabras de trámite del banco. Esa lista la escribió el agente **sin mirar tus
  extractos**: `src/features/category-rules/rules.ts:18`. Si alguna vez te propone mal,
  ese es el sitio donde se corrige.
- (delegado) **Crear una regla no aplica nada**: aplicar es siempre un gesto aparte, el
  botón del aviso. `src/features/category-rules/store.ts:96`.
- (delegado) **Aplicar pide confirmación siempre**, y la ventana dice que solo toca
  pendientes sin categoría y que no se puede deshacer desde la app.
  `src/features/category-rules/components/ApplyRulesDialog.vue:11`.
- (añadido) **Crear la regla no categoriza el propio movimiento**: se categoriza al
  aplicar, como los demás.
- (añadido) **Se enseñan todos los conflictos**, no los diez primeros como en el informe
  de importación.
- (añadido) **Tras aplicar se suelta el `Undo`** de tu última acción de Review, y la
  selección: volver atrás sobre una cola que acaba de cambiar en masa podría pisar lo que
  la pasada escribió. `src/features/review/store.ts:414`.
- (añadido) **El botón `Create rule` está apagado en los movimientos `neutral`**, que la
  pasada nunca categoriza.
- (añadido) Si guardar falla de una forma en la que la regla **pudo** crearse (un 404, o
  una respuesta que no se entiende), la lista se vuelve a pedir en vez de afirmar que no
  pasó nada. `src/features/category-rules/rules.ts:127`.

## Probado contra tus datos reales (T22)

Hecho el **2026-09-22** con tu visto bueno, pulsando en la interfaz y sin ningún mock:

- Creaste la regla **`tulotero` → Ocio** desde una fila de Review y la aplicaste desde el
  aviso. La pantalla dijo **«5 movements categorized · 1372 still without a matching rule
  · 1 conflict»** y la API confirmó exactamente esos mismos cinco movimientos (TULOTERO,
  ids 21750, 33099, 33260, 33371 y 42521).
- Solo salieron dos escrituras: el `POST /api/category-rules` de la regla y el
  `POST /api/category-rules/apply` sin body. Cero errores de consola.
- Estado en el que quedaron tus datos: **63 reglas y 1.373 pendientes sin categoría**.
  Antes, probando, se creó la regla `mega` (la propuesta por defecto), se corrigió a
  `mega deportes` desde `Rules` y una aplicación categorizó el movimiento 42520 como
  Salud y deporte.

## Dos cosas que se corrigieron después de esa prueba

- **El texto propuesto era a veces demasiado corto.** `mega` casaba también con «ACADEMIA
  OMEGA». Ahora la propuesta se alarga con las palabras siguientes del concepto, cortando
  tal cual viene, hasta llegar a un mínimo de 6 caracteres: «MEGA DEPORTES» propone
  `mega deportes`, y `iberdrola` sigue igual que antes.
- **El `data-test` no llegaba al diálogo.** `BaseDialog` no pasaba los atributos al panel
  (Vue avisaba de ello) y un test daba por bueno algo que siempre pasaba. Ahora los
  atributos llegan al panel `role="dialog"`, el aviso desaparece y los tests comprueban
  las dos caras, abierto y cerrado.

Tras las dos correcciones, la puerta completa quedó en verde: 905 tests unitarios, 16
e2e, `build` e `init.sh` con «Entorno listo».

## Qué NO se tocó / quedó fuera

- **El backend, ni una línea.** Los cinco endpoints ya existían y el contrato se leyó
  como fuente de verdad.
- No se crean, renombran ni borran categorías.
- Los conflictos **se ven, no se resuelven** desde la web: no hay ni un enlace al
  movimiento.
- No se puede crear una regla en blanco desde `/rules`: nacen siempre de un movimiento.
- No hay vista previa de «a cuántos afectaría»: el contrato no la ofrece, y una
  aproximación parecería exacta sin serlo.
- **Aplicar no se deshace**: el backend no dice qué movimientos categorizó, solo cuántos.
- Sin librerías nuevas.

## Notas para el futuro

- **Aplicar pasa todas tus reglas, no solo la nueva**, incluidas las de la semilla del
  backend si alguna vez la lanzaste.
- **Repasa la lista de palabras de trámite** (`src/features/category-rules/rules.ts:18`)
  la primera vez que te proponga un texto malo con un concepto real tuyo.
- Si a un pendiente le quitas la categoría en Review y una regla casa con él, aplicar se
  la vuelve a poner. Para que no pase: confírmalo sin categoría, o cambia la regla.
- Los conflictos no se guardan: al cerrar la ventana desaparecen. Para volver a verlos se
  aplica otra vez, que no cambia nada de lo ya hecho.
- Deuda menor y consciente: el selector de categorías con `optgroup` está duplicado entre
  `MovementCategorySelect` (F16) y el diálogo de reglas; extraerlo a `shared/` sería una
  feature de limpieza aparte.
- El ejemplo de la nota de verificación de R4 en `specs/17-category-rules/requirements.md`
  contradecía al propio R4 y al backend; **ya está corregido** (explicado en
  `progress/reviews/category-rules.md`). No tenía efecto en el código.
