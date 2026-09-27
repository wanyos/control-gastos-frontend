# Resumen — feature 21 `statement-fix-category`

Fecha de cierre: 2026-09-27
Intención original: `feature_list.json` → feature `statement-fix-category`, bloque `intent`
Spec: `specs/21-statement-fix-category/` (17 requisitos, 22 tasks; las 5 🔴 aprobadas sin
cambios el 2026-09-27)

## Qué hace ahora la app que antes no

En `/movements`, la etiqueta de categoría de cada línea **es un botón**. La pulsas y, en
su mismo sitio, se convierte en un desplegable con las categorías que ese movimiento
acepta; eliges una (o «No category») y **se guarda solo**, esté el movimiento pendiente o
ya confirmado. Del mismo editor cuelgan `Create rule` (el diálogo de la F17, con la
previsualización de a cuántos movimientos afectaría de la F18) y `Close` (también `Esc`).
Encima de la lista, bajo las cifras, hay una línea fija que dice qué hizo la última
corrección, con un `Undo` **sin cuenta atrás**.

Antes el extracto solo se leía: para corregir una categoría había que irse a la cola de
revisión, acordarse del concepto y buscarlo, y encima solo estaba allí si seguía
pendiente. **Es la primera vez que el extracto escribe**, y escribe una sola cosa.

## Por dónde se usa (puntos de entrada)

- Pantalla `/movements` (entrada `Movements` de la barra lateral).
- Pulsar la insignia de categoría de una línea → editor de esa línea.
- Elegir en el desplegable → `PATCH /api/movements/:id` con el cuerpo `{"categoryId":N}`
  (o `{"categoryId":null}` para quitarla).
- `Undo` en la línea de aviso → otro `PATCH` con la categoría anterior.
- `Create rule` en el editor → `POST /api/category-rules` (no toca el movimiento).

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| La **única** escritura del extracto (`setMovementCategory`) | `src/features/statement/service.ts:16` |
| Lógica pura: filtro de categoría, frases del aviso y de los errores | `src/features/statement/actions.ts:16`, `:25`, `:46`, `:61` |
| Estado nuevo del store (editor, carril único, aviso, deshacer) | `src/features/statement/store.ts:62-75` |
| Sustituir la fila y quitarla si deja el filtro | `src/features/statement/store.ts:193` |
| Refresco silencioso del mes | `src/features/statement/store.ts:214` |
| La escritura y su `catch` (recarga antes de pintar el error) | `src/features/statement/store.ts:246-277` |
| El deshacer, que no deja nada que rehacer | `src/features/statement/store.ts:295` |
| El editor de la línea (selector + `Create rule` + `Close`/`Esc`) | `src/features/statement/components/RowCategoryEditor.vue:1` |
| La línea de aviso con el `Undo` | `src/features/statement/components/StatementActionNotice.vue:10` |
| La insignia convertida en botón (y el `neutral`, que no lo es) | `src/features/statement/components/StatementRow.vue:31-70` |
| Cableado de la lista | `src/features/statement/components/StatementList.vue:31` |
| La vista: aviso entre cifras y lista, y el diálogo de reglas | `src/features/statement/views/StatementView.vue:30`, `:90` |
| El `PATCH` de un movimiento, ahora compartido | `src/shared/movements.ts:282`, `:297`, `:314` |
| Test del cuerpo exacto que viaja | `src/features/statement/__tests__/service.spec.ts:17`, `:32`, `:41` |
| Tests del store (14 casos nuevos) | `src/features/statement/__tests__/store.spec.ts:408-690` |
| Tests de la pantalla completa | `src/features/statement/__tests__/StatementView.spec.ts:390-600` |
| Recorridos en navegador real | `e2e/statement-fix-category.spec.ts:212`, `:245`, `:280`, `:307`, `:330` |

## Cumplimiento de la intención

- ✅ «Cambio la categoría de un movimiento del mes y lo veo al instante» → se cumple; la
  fila se sustituye por el movimiento que devuelve la API, sin recargar.
  Verificado en `store.spec.ts:408` y `StatementView.spec.ts:411`.
- ✅ «Funciona igual con uno ya confirmado que con uno pendiente» → se cumple; es el mismo
  control y la misma petición, y el estado **no puede** viajar en el cuerpo.
  Verificado en `store.spec.ts:430`, `StatementRow.spec.ts:135` y
  `e2e/statement-fix-category.spec.ts:245` (sobre una fila confirmada).
- ✅ «Las sumas del mes se actualizan solas después del cambio» → se cumple con el matiz
  que aprobaste (🔴 5): las cifras son **siempre** las del backend y solo se vuelven a
  pedir si hay un filtro de categoría puesto, porque sin él no cambian.
  Verificado en `store.spec.ts:469` (cero peticiones extra), `:481` (una de refresco con
  filtro) y `e2e:280`.
- ✅ «Puedo crear una regla desde un movimiento del extracto, viendo antes a cuántos
  afectaría» → se cumple; es el diálogo de la F17 tal cual, con la previsualización de la
  F18 y solo categorías del tipo del movimiento.
  Verificado en `StatementView.spec.ts:504`.
- ✅ «Puedo deshacer lo último que hice y vuelve a estar como estaba» → se cumple; un solo
  `PATCH` con la categoría anterior, y después **no queda nada que rehacer**.
  Verificado en `store.spec.ts:563` (un segundo `Undo` no manda ninguna petición),
  `StatementView.spec.ts:472` y `e2e:307`.
- ✅ «Si el cambio falla, me lo dice claramente y no me deja la pantalla mintiendo» → se
  cumple; frase en inglés escrita aquí (nunca la del backend, que viene en español y
  nombra ids), y ante un fallo que **pudiera** haber escrito se recarga el mes en vez de
  afirmar que no pasó nada. Solo un 400 y un fallo de red se dan por seguros.
  Verificado en `actions.spec.ts:94` y `:137`, `store.spec.ts:626`, `:646`, `:657` y
  `e2e:330`.
- ✅ «Si tengo el filtro "sin categoría" puesto y categorizo una línea, esa línea
  desaparece al momento» → se cumple, y también filtrando por una categoría concreta
  (🔴 3). El test lo comprueba **con el refresco fallando a propósito**, para que la
  desaparición no pueda deberse a la petición posterior.
  Verificado en `store.spec.ts:481` y `:509`, y `e2e:280`.
- ✅ «No puedo tocar por error el importe, la fecha ni el concepto» → se cumple; en toda la
  fila hay **un** control, la insignia de categoría, y la única escritura de la pantalla es
  ese `PATCH`. Verificado en `StatementRow.spec.ts:73`, `RowCategoryEditor.spec.ts:117` y
  `StatementView.spec.ts:560` (los métodos de toda la sesión son solo `GET` y `PATCH`).

## Decisiones que se tomaron por ti

- (🔴 1, delegado) **El control está escondido hasta que lo pides**: la insignia se vuelve
  desplegable en su sitio, sin ensanchar la fila ni añadir columnas, y funciona con
  teclado. El mes se sigue leyendo como un mes.
- (🔴 2, delegado) **`Create rule` cuelga del editor abierto**, y crear la regla **no**
  categoriza el movimiento del que sale: se aplica aparte, en la pantalla `Rules`.
- (🔴 3, delegado) **La línea desaparece también filtrando por una categoría concreta**, no
  solo con «sin categoría».
- (🔴 4, delegado) **Deshacer sin cuenta atrás**, en una línea fija bajo las cifras; vive
  hasta la siguiente corrección, hasta cambiar de mes o de filtro, o hasta salir.
- (🔴 5, añadido) **Las cifras solo se repiden si hay filtro de categoría puesto.**
- (técnico) El cuerpo del `PATCH` se construye en un **único** sitio
  (`src/features/statement/service.ts:16`) que solo sabe escribir la categoría; el store no
  conoce la función genérica de escritura, así que el estado no puede colarse ni por
  descuido. Hay test que lee el cuerpo letra por letra, también en navegador real y sobre
  un movimiento confirmado.
- (implementación, no pedido) Un dato de estado más (`actionNotice`) para que puedan
  convivir la frase «Change undone» y «no se rehace nada»; y `findCategoryName` sale de la
  vista a `actions.ts` con test propio.

## Qué NO se tocó / quedó fuera

- **El backend**: ni una línea. Solo se consume `PATCH /api/movements/:id` tal como estaba
  documentado en su contrato.
- **El estado de un movimiento**: no se puede confirmar ni devolver a pendiente desde el
  extracto, y técnicamente el `status` no puede viajar en la petición.
- Importe, fecha, descripción y borrado: siguen intocables desde aquí.
- **Acciones en bloque**: no hay; para trabajar en serie está la cola.
- **Las cifras y la nota permanente**: no se movieron de sitio y la nota no cambió **ni una
  palabra** (su fichero no aparece en el diff); sigue sin poder cerrarse, también después
  de escribir.
- Las features 15 a 20 no cambiaron de comportamiento: lo que se mudó a `shared/` se
  re-exporta y sus suites pasan **sin tocar ni un test**.

## Notas para el futuro

- **Hecho el 2026-09-27 con tu visto bueno explícito: la comprobación contra el backend
  real (T22)**, la única que **escribe** en tus datos. Sobre el movimiento **32428**: foto
  con `curl` antes, cambio a **Vivienda** y `Undo` desde la pantalla, foto después. Salieron
  **dos** `PATCH`, los dos con el cuerpo **solo `categoryId`**; el antes y el después son
  idénticos salvo `updatedAt` (el `status` no se movió), y cero errores.
- Corregir categorías **no arregla** las cifras infladas: lo que las infla son los
  traspasos y los depósitos. Eso espera la parte 1 del encargo al backend.
- Quien crea una regla desde el extracto todavía tiene que ir a `Rules` para aplicarla: el
  aviso con «Apply rules now» de la F17 no se monta aquí. Candidato claro a una rodaja
  futura.
- Tras una escritura fallida el editor **se queda abierto** con el valor anterior, para
  reintentar. Es coherente, pero no estaba escrito en el spec: si prefieres lo contrario,
  es una línea.
- Deuda menor anotada por el reviewer: las dos primeras **corregidas al cerrar**
  (`docs/stack.md` ya cuenta los **siete** specs de e2e y describe el séptimo como el que
  escribe; el comentario de cabecera de `src/features/statement/types.ts` ya dice que la
  pantalla también escribe la categoría). Queda una: `src/shared/movements.ts` no tiene
  test co-localizado propio — lo cubren los tests de `review`, que consumen la
  re-exportación (ver la nota de la T3 en `specs/21-statement-fix-category/tasks.md`).
