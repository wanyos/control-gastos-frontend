# Requirements — Feature 27: action-notice-in-view (el aviso de la última acción y su `Undo`, a la vista desde donde estoy)

> Derivado del bloque `intent` de la feature 27 en `feature_list.json` (fuente de verdad,
> incluidas sus dos `respuestas_del_humano` del 2026-10-11). El `acceptance` está vacío:
> manda el `intent`. EARS estricto según `docs/specs.md`.
>
> **Tamaño: 12 requirements + 8 restricciones**, por debajo del tope de ~15 (regla 2 de
> `docs/specs.md`). No se parte.
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
>
> - Los cuatro avisos: `src/features/review/components/ActionNotice.vue`,
>   `src/features/statement/components/StatementActionNotice.vue`,
>   `src/features/transfers/components/TransfersActionNotice.vue` y
>   `src/features/category-rules/components/RuleCreatedNotice.vue`.
> - Las tres pantallas que los montan: `ReviewView.vue`, `StatementView.vue` y
>   `TransfersView.vue`; y de dónde sale lo que enseñan (`store.lastAction`,
>   `store.actionMessage`, `store.actionNotice`, `store.canUndo`, `store.notice`,
>   `rules.lastCreated`).
> - Lo que rodea a la página: `src/shared/components/AppShell.vue`, `AppTopBar.vue`
>   (`sticky top-0`, alto `--topbar-h` = 60px, `z-index` `--z-sticky` = 100) y
>   `BaseDialog.vue` (`--z-modal` = 400); `BaseButton.vue` (variantes `primary`,
>   `secondary`, `ghost`); las filas `MovementRow.vue` y `StatementRow.vue`;
>   `StatementSelectionBar.vue` y `ReviewActionBar.vue`.
> - Los tests que ya miran estos avisos: los tres `*ActionNotice.spec.ts`, los tres
>   `*View.spec.ts` y cinco archivos de `e2e/` (`review-actions`, `category-rules`,
>   `statement-fix-category`, `statement-exclude-from-totals`, `transfer-pairs-review`).
>   Todos localizan los avisos por `data-test`.
> - **Comprobado en un navegador** (2026-10-11, Chromium, ventana de 1280×720, con
>   `pnpm dev` y todas las llamadas a `/api` abortadas; script de un solo uso, fuera del
>   repositorio): un elemento con `position: sticky; top: var(--topbar-h)` metido como
>   hijo del `div` raíz de cada pantalla, con la página bajada 5.000 px, queda con su
>   borde superior en 60 px —justo el borde inferior de la barra superior— en `/review`,
>   `/movements` y `/transfers`. En reposo estaba en 128,7 / 155,3 / 132,7 px.
> - **Lo que NO se ha comprobado.** No se ha probado con los avisos reales ni con una
>   lista real cargada (el backend no se ha usado). No se ha medido si, al aparecer el
>   aviso con la página bajada, el navegador mueve el contenido: de eso depende R11, y lo
>   decide su test en navegador.
>
> **Dos hechos del código que condicionan el alcance:**
>
> 1. En `Review`, al confirmar una fila, la fila **sale de la lista** (la cola solo enseña
>    pendientes). No existe «junto a la fila tocada» para ese caso.
> 2. En `Movements`, marcar que un movimiento no cuenta se hace con el botón
>    `Exclude from totals`, que está en `StatementSelectionBar`, **encima de la lista**. La
>    fila no tiene un botón propio para eso. Quien está al final del mes tiene que subir a
>    pulsarlo, con esta feature o sin ella (C6).

## Vocabulario de este documento

- **Barra superior:** `AppTopBar.vue`, la barra con el título de la pantalla y el botón
  `Import`, que ya se queda fija arriba al bajar.
- **El aviso:** cualquiera de los cuatro componentes de arriba, con lo que enseñe en ese
  momento (la frase de lo que se hizo y su botón, o la frase de un fallo).
- **A la vista:** el rectángulo del aviso está entero dentro de la ventana, su borde
  superior no queda por encima del borde inferior de la barra superior, y nada lo tapa
  (`document.elementFromPoint` en su centro devuelve un elemento del propio aviso).
- **Página bajada:** `window.scrollY` mayor que la posición que el aviso ocupa en reposo.

## Requirements

## R1
MIENTRAS `Review` enseñe `ActionNotice` con una frase de resultado y la página esté
bajada, el sistema DEBE mantener a la vista esa frase y su botón `Undo`, con el borde
superior del aviso pegado al borde inferior de la barra superior.

## R2
MIENTRAS `Movements` enseñe `StatementActionNotice` con una frase de resultado y la
página esté bajada, el sistema DEBE mantener a la vista esa frase y, cuando lo tenga, su
botón `Undo`, con el borde superior del aviso pegado al borde inferior de la barra
superior.

## R3
MIENTRAS `Transfers` enseñe `TransfersActionNotice` con una frase de resultado y la
página esté bajada, el sistema DEBE mantener a la vista esa frase y, cuando lo tenga, su
botón `Undo`, con el borde superior del aviso pegado al borde inferior de la barra
superior.

## R4
MIENTRAS `Review` enseñe `RuleCreatedNotice` y la página esté bajada, el sistema DEBE
mantener a la vista la frase de la regla creada y su botón `Apply rules now`, con el
borde superior del aviso pegado al borde inferior de la barra superior.

## R5
SI una acción de `Review`, `Movements` o `Transfers` falla con la página bajada ENTONCES
el sistema DEBE mantener a la vista la frase del fallo, en el mismo sitio en que
mantiene la frase de resultado (R1–R3).

## R6
MIENTRAS la página no esté bajada, el sistema DEBE pintar el aviso en el sitio que ocupa
hoy: dentro del flujo de la página, entre los mismos dos bloques que lo rodean hoy en
cada pantalla y sin solaparse con ninguno de ellos.

## R7
CUANDO el usuario pulsa `Undo` con la página bajada, el sistema DEBE ejecutar el mismo
deshacer que ejecuta hoy ese botón, sin llevar la página al principio.

## R8
El sistema DEBE pintar el botón `Undo` de los tres avisos (`ActionNotice`,
`StatementActionNotice`, `TransfersActionNotice`) con la palabra `Undo`, sin ningún
icono y con la variante `secondary` de `BaseButton` (fondo y borde visibles).

## R9
MIENTRAS el aviso esté pegado bajo la barra superior, el sistema DEBE pintarlo sobre un
fondo opaco del color de fondo de la página (`surface-app`), de modo que las filas que
pasan por detrás no se lean a través de él.

## R10
MIENTRAS haya un diálogo abierto (`BaseDialog`), el sistema NO DEBE pintar el aviso por
encima del diálogo ni de su fondo oscurecido.

## R11
SI, al aparecer o cambiar el aviso tras una acción sobre una sola fila, esa fila sigue
en la lista y el aviso pegado se solapa con ella ENTONCES el sistema DEBE subir la
página los píxeles justos para que la fila quede entera por debajo del aviso.

## R12
MIENTRAS no haya nada que avisar (ni frase de resultado, ni frase de fallo, ni regla
recién creada), el sistema NO DEBE pintar ningún elemento del aviso ni reservar espacio
para él.

## Restricciones

- **C1 — No cambia qué hace cada acción ni qué deshace el `Undo`.** No se toca ningún
  `store.ts`, `service.ts`, `actions.ts` ni `pairs.ts` de `review`, `statement`,
  `transfers` y `category-rules`, ni `shared/movements.ts`, ni `shared/transfers.ts`. Las
  frases de resultado y de fallo no cambian ni una letra.
- **C2 — El `Undo` dura lo mismo.** El aviso y su botón aparecen y desaparecen con las
  mismas condiciones que hoy, porque se siguen leyendo de los mismos campos de los
  mismos stores.
- **C3 — No se toca el backend** ni se añade, quita o cambia ninguna petición.
- **C4 — Los `data-test` de los cuatro avisos y de sus botones no cambian**
  (`action-summary`, `action-error`, `action-undo`, `statement-action-*`,
  `transfers-action-*`, `rule-created-notice`, `apply-rules-now`). Los tests unitarios y
  de navegador que ya existen siguen pasando; solo se tocan las aserciones que afirmen
  el icono o la variante del botón `Undo`, si las hay.
- **C5 — En `ReviewView.vue`, `RuleCreatedNotice` y `ActionNotice` siguen siendo
  excluyentes** (`v-if` / `v-else`), con la misma condición que hoy.
- **C6 — `StatementSelectionBar` y `ReviewActionBar` no se mueven ni cambian.** Los
  botones `Exclude from totals`, `Include in totals`, `Confirm N movements` y
  `Apply category` siguen encima de la lista.
- **C7 — Alcance cerrado.** Quedan fuera la línea gris `review-notice` de `Review`, los
  mensajes de fallo de carga de las tres pantallas y los avisos de `Rules` e `Import`.
- **C8 — Criterios vigentes del proyecto.** Ninguna feature importa de otra por esto: lo
  común vive en `src/shared/`. Sin dependencias nuevas. Textos en inglés. Solo tokens
  semánticos del tema oscuro; si aparece un par de colores que no esté medido, se añade
  su línea `contrast:` en `src/assets/theme-dark.css`.

## Cobertura de `como_se_que_esta_bien`

| Frase del `intent` | Requirements |
|---|---|
| En `Review`, bajo hasta el final, pulso `Confirm` y, sin subir, veo qué ha pasado y el botón para deshacerlo | R1 |
| Lo mismo al poner una categoría a una fila del final de la lista | R1, R11 |
| En `Movements`, lo mismo al cambiar la categoría de una línea del final del mes y al marcar que un movimiento no cuenta | R2 (y C6 para el botón `Exclude from totals`) |
| Si estoy arriba del todo, lo sigo viendo, como hasta ahora | R6, R12 |
| Pulso deshacer desde ahí abajo y la fila vuelve a como estaba | R7 |
| El botón de deshacer no se confunde con uno de recargar | R8 |
| Si lo que hice falla, el mensaje de error también lo veo desde donde estoy | R5 |
| *(respuesta)* entra también `Transfers` | R3 |
| *(respuesta)* entra también el aviso de `Review` tras crear una regla | R4 |
| *(no quiero)* que el aviso me tape la fila que estoy mirando | R9, R11 |

## Procedencia

- R1 — (humano) «En `Review`, bajo hasta el final de la lista, pulso `Confirm` en una
  fila y, sin subir, veo qué ha pasado y el botón para deshacerlo» y «lo mismo al poner
  una categoría». (delegado) «Cómo se consigue que se vea»: el aviso se queda pegado bajo
  la barra superior al bajar. Alternativas descartadas: junto a la fila tocada (al
  confirmar, la fila sale de la lista); pegado al borde inferior de la ventana (taparía
  las últimas filas, que es justo el caso que probó el humano). ← REVISAR.
- R2 — (humano) «En `Movements`, lo mismo al cambiar la categoría de una línea del final
  del mes y al marcar que un movimiento no cuenta». (delegado) mismo mecanismo que R1.
  Ojo con C6: para marcar que no cuenta hay que subir a pulsar `Exclude from totals`; lo
  que garantiza R2 es que el aviso sigue a la vista cuando se vuelve a bajar. ← REVISAR.
- R3 — (humano) respuesta del 2026-10-11: «sí entra también `Transfers`».
- R4 — (humano) respuesta del 2026-10-11: «sí entra también el aviso de `Review` tras
  crear una regla».
- R5 — (humano) «Si lo que hice falla, el mensaje de error también lo veo desde donde
  estoy».
- R6 — (humano) «Si estoy arriba del todo, lo sigo viendo, como hasta ahora».
- R7 — (humano) «Pulso deshacer desde ahí abajo y la fila vuelve a como estaba».
  (añadido) «sin llevar la página al principio»: el humano no lo dijo; sale de «sin
  moverme de donde estoy».
- R8 — (delegado) «Qué se hace con el icono o el texto del botón para que no parezca
  recargar»: se quita el icono (`Undo2`, una flecha curva), se deja la palabra `Undo` y
  el botón pasa a tener fondo y borde. Alternativa descartada: cambiar el icono por
  otro. ← REVISAR.
- R9 — (delegado) parte de «cómo se consigue que se vea»: sin fondo opaco, las filas se
  leerían mezcladas con la frase.
- R10 — (añadido) El humano no habló de los diálogos. Sin esto, el aviso pegado podría
  quedar pintado sobre el diálogo de nueva regla o el de confirmación.
- R11 — (humano) «No quiero que el aviso me tape la fila que estoy mirando». (añadido)
  cómo: mover la página los píxeles justos, solo para la fila recién tocada y solo en el
  momento en que aparece o cambia el aviso. Alternativa: no mover nunca la página.
  ← REVISAR.
- R12 — (humano) parte de «como hasta ahora»: hoy, sin nada que decir, no se pinta nada.
- C1, C2, C3 — (humano) «No quiero que cambie qué hace cada acción ni qué deshace el
  `Undo`», «No quiero que el `Undo` dure más ni menos que ahora», «No quiero tocar el
  backend».
- C4 — (añadido) protege los tests que ya existen.
- C5 — (humano, por el leader) indicación del encargo: no cambiar la exclusión entre los
  dos avisos de `Review` salvo que haga falta. No hace falta.
- C6 — (añadido) El humano pidió ver el aviso «al marcar que un movimiento no cuenta»
  sin decir nada del botón con el que se marca, que está arriba. Se deja donde está.
  Alternativa: que esa barra también se quede a la vista al bajar. ← REVISAR.
- C7 — (añadido) frontera del alcance, para que no crezca.
- C8 — (delegado) «Si se hace con una sola pieza común a las pantallas o una por
  pantalla»: una pieza común para lo de quedarse pegado, en `src/shared/`; cada pantalla
  conserva su propio aviso. Alternativa descartada: fundir los tres avisos en uno.
  ← REVISAR.
