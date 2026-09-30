# Resumen — feature 23 `statement-noise-toggle`

Fecha de cierre: 2026-09-30
Intención original: `feature_list.json` → feature `statement-noise-toggle`, bloque `intent`
Spec: `specs/23-statement-noise-toggle/`

## Qué hace ahora la app que antes no

En el extracto (`/movements`), encima de las tres cifras, hay una casilla:
**`Hide what does not count`**. Al ponerla, la lista deja de enseñar dos cosas que
ensuciaban el mes: los movimientos que tú marcaste como que no cuentan (feature 22) y
las dos piernas de cada traspaso entre tus cuentas. A su lado aparece
**`Hiding 34 movements`**, para que no se te olvide que eso sigue existiendo. Al quitar
la casilla, vuelve todo: esconder es una vista, no un borrado.

Y las tres cifras **no se mueven** al ponerla. Eso no es un descuido, es el hallazgo que
ordena toda la feature: el backend nunca metió en las sumas ni los traspasos ni lo
marcado. Lo que estaba roto era la **lista**, que enseñaba filas que las cifras no
contaban. El interruptor no arregla las cifras; hace que la lista deje de contradecirlas.

La segunda mitad es la **nota permanente** bajo las cifras. Desde la feature 19 decía que
las sumas estaban infladas sin remedio y ponía de ejemplo julio de 2026 con 57.949 €
contra 59.096 €. Las dos cosas dejaron de ser verdad el día que marcaste los depósitos.
Se ha reescrito entera y, sobre todo, **ya no lleva ningún número escrito a mano**: lo
que ningún recuento puede saber se dice en palabras, y la única cifra que aparece la
cuenta el backend (los grupos que parecen traspasos y no se pudieron emparejar solos),
que se pide **una vez por sesión** y, si falla o vale cero, simplemente no se dice nada.

Esto es lo que evita que la nota vuelva a caducar: el «17» y el «2» de la medición de
septiembre eran juicios tuyos, no datos del programa, y clavarlos habría repetido el
fallo de la F19 con números distintos.

**La feature no escribe absolutamente nada.** Solo cambia la pregunta que ya se le hacía
a la API.

## Por dónde se usa (puntos de entrada)

- **La casilla `Hide what does not count`**, entre la barra de filtros y las cifras, en
  `/movements`. A su derecha, la línea `Hiding N movements` (solo con la casilla puesta).
- **La dirección de la página**: `/movements?month=2026-07&hide=true`. El interruptor
  vive ahí, junto al mes y a los cuatro filtros, así que se recuerda al cambiar de mes,
  al recargar, al volver atrás y al compartir el enlace. Entrar sin `hide` lo deja
  apagado, siempre. Cualquier otro valor (`hide=1`, `hide=yes`) se lee como apagado.
- **El botón `Show everything`**, que sale cuando el interruptor te deja la pantalla
  vacía: lo apaga y deja los filtros donde estaban.
- **La nota gris** bajo las tres cifras, siempre visible y sin botón de cerrar.
- Contra la API, solo lecturas: `GET /api/movements` con `excluded=none&transfer=none`
  añadidos, una segunda lectura del mismo mes con `pageSize=1` para saber cuántos se
  esconden, y `GET /api/transfers/ambiguous` una vez por sesión.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| La casilla y la línea `Hiding N` | `src/features/statement/components/NoiseSwitch.vue:1` |
| El texto fijo de la nota, palabra por palabra | `src/features/statement/components/MonthTotals.vue:89` |
| La frase viva (singular y plural) | `src/features/statement/components/MonthTotals.vue:103` |
| Los dos parámetros en la pregunta del mes | `src/features/statement/filters.ts:78` |
| La pregunta de «cuántos se esconden» | `src/features/statement/filters.ts:101` |
| El interruptor en la dirección (escribir / leer) | `src/features/statement/filters.ts:119` y `:150` |
| La frase `Hiding N movements` | `src/features/statement/filters.ts:204` |
| La frase del vacío que nombra las dos causas | `src/features/statement/filters.ts:213` |
| El estado del interruptor y del número | `src/features/statement/store.ts:67` y `:73` |
| La resta de los dos recuentos | `src/features/statement/store.ts:204` |
| La fila que desaparece al marcarla | `src/features/statement/store.ts:280` |
| Los grupos dudosos, una vez por sesión | `src/features/statement/store.ts:554` |
| La lectura de `GET /api/transfers/ambiguous` | `src/features/statement/service.ts:63` |
| Los dos parámetros en la frontera HTTP | `src/shared/movements.ts:108` y `:169` |
| El tercer vacío, con `Show everything` | `src/features/statement/components/StatementList.vue:158` |
| La casilla montada y la URL reescrita | `src/features/statement/views/StatementView.vue:24` y `:241` |
| Test principal de la nota | `src/features/statement/__tests__/MonthTotals.spec.ts:64` |
| Test principal del interruptor | `src/features/statement/__tests__/store.spec.ts:1119` |
| Test de pantalla completa | `src/features/statement/__tests__/StatementView.spec.ts:820` |
| E2E en navegador real | `e2e/statement-noise-toggle.spec.ts:223` |

## Cumplimiento de la intención

Punto por punto de tu `como_se_que_esta_bien`:

- ✅ **«Pongo el interruptor y desaparecen de la lista los marcados y los traspasos.»**
  Se cumple, y se esconden **en el servidor**, no filtrando aquí la lista ya descargada
  (eso habría roto el recuento, el `Load more` y las cifras). Verificado en
  `src/features/statement/__tests__/store.spec.ts:1142` (la petición lleva
  `excluded=none&transfer=none` en la misma llamada) y en navegador real en
  `e2e/statement-noise-toggle.spec.ts:223` (5 filas → 3).

- ✅ **«Las sumas que veo se corresponden con lo que queda a la vista.»**
  Se cumple. Y conviene que sepas **por qué no se movió nada**: las sumas ya excluían
  los traspasos y lo marcado, así que con el interruptor puesto no cambian de valor;
  lo que cambia es que la lista de al lado deja de incluir lo que ellas no cuentan.
  Verificado en `src/features/statement/__tests__/store.spec.ts:1213` (los `totals` son
  idénticos a los del mes entero) y en
  `src/features/statement/__tests__/StatementView.spec.ts:921` (las tres cifras en
  pantalla no se mueven al encenderlo).

- ⚠️ **«La pantalla me dice cuántos movimientos ha dejado fuera y por cuánto.»**
  **Se cumple a medias, y a propósito**, con tu visto bueno del 2026-09-29
  (`decisions.md` 🔴 4). El **cuántos** está: `Hiding 34 movements`, y es un número del
  backend (la resta de dos recuentos suyos), verificado en
  `src/features/statement/__tests__/store.spec.ts:1142` y
  `src/features/statement/__tests__/NoiseSwitch.spec.ts:33`. El **por cuánto no está**,
  porque **no existe**: cuando a la API se le pide solo lo apartado, devuelve las tres
  sumas a cero por definición, así que el importe no viaja en ninguna respuesta y la
  única forma de tenerlo sería calcularlo aquí — justo la aritmética inventada que esta
  pantalla lleva cinco features evitando. Hay tests que **vigilan que nunca aparezca un
  importe** junto al interruptor (`NoiseSwitch.spec.ts:53`). Si lo quieres de verdad, la
  vía honesta es una feature del backend.
  **La feature se cierra con este punto a medias, a la vista y sin tapar:** es el único
  de los seis que no está entero, y no se puede completar desde aquí.

- ✅ **«Quito el interruptor y vuelve todo.»** Se cumple; verificado en
  `src/features/statement/__tests__/store.spec.ts:1179` (se vuelve a pedir el mismo mes
  con los mismos filtros y sin los dos parámetros) y en el e2e, que lo desmarca y
  recupera las cinco filas.

- ✅ **«El interruptor se recuerda al cambiar de mes y al recargar.»** Se cumple, porque
  vive en la dirección de la página y no en el navegador (así no se pone solo). Verificado
  en `src/features/statement/__tests__/StatementView.spec.ts:968` (sobrevive al cambio
  de mes conservando los filtros) y en `e2e/statement-noise-toggle.spec.ts:257`, que
  cambia de mes **y recarga** con el navegador de verdad.

- ✅ **«La nota sobre las sumas ya no dice que están infladas sin remedio: dice lo que
  pasa de verdad ahora.»** Se cumple, y con la red más fuerte de toda la feature: el test
  `src/features/statement/__tests__/MonthTotals.spec.ts:76` **duplica el texto entero
  dentro del test** y exige que coincida letra por letra, otro exige que no contenga **ni
  un dígito**, y una lista negra prohíbe expresamente que vuelvan `inflated`, `July`,
  `2026` o `€`. La nota sigue sin poder cerrarse (`MonthTotals.spec.ts`, «cannot be
  dismissed»).

Y de tu `que_no_quiero`, los cinco respetados: no se tocó el backend ni el contrato; el
interruptor **no escribe nada** (hay tests que afirman que el único método de toda la
pantalla es `GET`, y el e2e aborta cualquier llamada no prevista antes de que salga);
empieza apagado y nunca se enciende solo; los filtros y la navegación por meses siguen
igual; y lo escondido se recupera quitando la casilla.

## Decisiones que se tomaron por ti

Lo que el spec marcaba como `(delegado)` o `(añadido)`, recordado aquí:

- **(delegado) Un solo interruptor, no dos.** `Hide what does not count` esconde a la vez
  lo marcado y los traspasos. Tú te inclinabas por dos pero sin seguridad; dos habrían
  sido cuatro estados, cuatro direcciones y cuatro casos de prueba para una distinción
  que ya ves fila a fila con las etiquetas `Not counted` y `Transfer`. Vive en
  `src/features/statement/components/NoiseSwitch.vue:3`.
- **(delegado) Cómo se dice lo que queda fuera:** un número, con **una sola** lectura
  extra al backend (la más barata posible, una fila) y restando dos recuentos suyos.
  Descartado hacer dos peticiones, que además habrían contado dos veces un traspaso que
  además estuviera marcado. Vive en `src/features/statement/store.ts:204`.
- **(añadido) No se dice el importe**, por lo explicado arriba. Vive como prohibición en
  los tests, no como código.
- **(añadido) Si la lectura del número falla, no pasa nada visible:** desaparece el
  `Hiding N` y el mes, las cifras y la lista siguen ahí, sin pintar error.
  `src/features/statement/store.ts:213`.
- **(delegado) Si el interruptor y un filtro se contradicen, no gana ninguno:** se
  aplican los dos en la misma petición. Puedes acabar con la pantalla vacía, y entonces
  sale un texto que **nombra las dos causas** y un botón `Show everything`.
  `src/features/statement/filters.ts:213`.
- **(delegado) Cambiar el interruptor vacía la selección** de la feature 22 (el modo
  selección sigue puesto), igual que ya hace cambiar de mes. `store.ts:165`.
- **(añadido) Si marcas algo con el interruptor puesto, esa fila desaparece** al momento
  y el `Undo` de la línea de aviso la devuelve. `store.ts:280`.
- **(delegado) Qué dice la nota**, con dos criterios: el texto fijo no lleva ninguna
  cifra, y la única cifra viva es la que el backend cuenta él. De las cuatro cifras
  posibles se eligió solo la de los grupos dudosos: es la única global (una lectura por
  sesión, no por mes ni por filtro), la única accionable y la más barata.
- **(añadido) `Clear filters` NO apaga el interruptor.** Limpia la barra y nada más:
  volver a ver el ruido tiene que ser un gesto tuyo, consciente.
- **(desviación del implementer, revisada y aceptada)** Se estrena el icono `Info` de
  Lucide, que no se usaba en el proyecto. No es una dependencia nueva (Lucide ya estaba
  y cada icono se importa por nombre) y sustituye al triángulo de alarma, que es
  justamente lo que esta feature viene a quitar.

## Qué NO se tocó / quedó fuera

- **El backend y su contrato**: intactos. Los dos parámetros ya existían desde su
  feature 49.
- **Ningún dato**: la feature no escribe ni un campo. Las escrituras del extracto siguen
  siendo las dos de siempre (la categoría de una fila, y la marca de «no cuenta»).
- **El importe de lo escondido**: no se da, y no se puede sin una feature del backend.
- **Deshacer una pareja detectada que no es un traspaso** (las dos multas casadas con
  Bizums de otra persona): hace falta un borrado de traspaso que ninguna pantalla usa
  todavía. Es la feature de revisar parejas, ya prevista en la E7; hoy solo con `curl`.
- **Los traspasos tuyos que se quedaron sin pareja** (envíos de bankinter a Myinvestor
  cuya otra pierna nunca se importó): los tienes que marcar tú a mano, según los veas.
  **No salen en la frase de la nota**, porque no tienen con quién casarse y el
  emparejador no los ve como dudosos: por eso la nota también lo dice en palabras.
- **La cola de revisión (`/review`) no tiene interruptor**: esto es solo del extracto.
## La comprobación contra el backend real (T20) ✅

Hecha el **2026-09-30 contigo delante**, de solo lectura. Cinco vistas contra la API,
todas cuadrando:

- **Julio pasa de 93 a 79 filas** al poner el interruptor, y **las tres sumas no se
  mueven** — exactamente lo que predecía la feature: lo que se esconde ya no estaba en
  las cifras.
- La **nota nueva** sale **sin un solo dígito** y **sin botón de cerrar**.
- El **recuento de grupos dudosos** se pide **una sola vez por sesión**.

## Notas para el futuro

- **La cifra de la nota se pide una vez por sesión.** Si arreglas una pareja desde otro
  sitio mientras la app está abierta, la frase no cambia hasta que recargues. Es el
  precio de no hacer una petición por cada cosa que haces.
- **Con el interruptor quitado sigue habiendo un desajuste heredado de la F22:** el
  recuento de arriba («93 movements») cuenta también lo apartado y las tres cifras no.
  Con el interruptor puesto ya cuadran. Es lo que el interruptor viene a resolver, no a
  esconder.
- **Un detalle pequeño, anotado y no visto en la T20:** si abres un mes **realmente vacío**
  con el interruptor puesto, el texto dice «everything in this month is hidden», que
  culpa al interruptor de un vacío que no es suyo. No molesta y el botón de salida es el
  correcto, pero está anotado.
- Cuando llegue la feature de revisar parejas, será quien mueva la lectura de los grupos
  dudosos a la carpeta compartida: hoy la usa una sola pantalla y por eso vive con ella.
