# Decisiones — F21 `statement-fix-category`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** en el extracto, la etiqueta de categoría de cada línea pasa a ser
**pulsable**: la pulsas, eliges otra categoría (o le quitas la que tiene) y se guarda
sola, esté el movimiento pendiente o ya confirmado. Desde ahí mismo puedes **crear una
regla**, con la previsualización de a cuántos afectaría. Y puedes **deshacer** lo
último. **Es la primera vez que el extracto escribe. No toca:** el backend, el estado
de un movimiento, el importe, la fecha, el concepto, las sumas de sitio ni la nota que
explica que están infladas. **No trae:** acciones en bloque. 17 requisitos.

---

## 🔴 Confirma o corrige (5)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **El control de categoría está escondido hasta que lo pides.** La línea se ve exactamente como hoy; la etiqueta de categoría se vuelve un botón y, al pulsarla, **se convierte en el desplegable en su mismo sitio** (no se añade ninguna columna ni se ensancha la fila). Solo una línea en edición a la vez, y funciona con teclado, no solo pasando el ratón por encima. Motivo: el extracto enseña **meses enteros para leerlos**; 93 desplegables abiertos a la vez lo convierten en la cola de revisión, que es justo lo que no quieres. | **Desplegable siempre visible en cada línea**, como en la cola: se ahorra un clic por corrección, a cambio de que cada mes se lea entre 93 controles y la pantalla pase a parecer una lista de trabajo. |
| 2 | **Crear una regla se ofrece dentro de ese mismo editor abierto** (un botón `Create rule` al lado del desplegable), y **crear la regla NO categoriza el movimiento del que sale**: se mantiene lo que cerraste en la F17, las reglas se aplican aparte con su gesto de «aplicar reglas». | **Que el mismo clic haga las dos cosas** (crear la regla y categorizar ese movimiento): un gesto menos, a cambio de que el extracto se comporte distinto de la cola y de que el deshacer quede ambiguo (¿deshace la categoría, la regla, o las dos?). |
| 3 | **Si el cambio deja la línea fuera del filtro que tienes puesto, desaparece al momento — también filtrando por una categoría concreta.** Tú ya cerraste ese comportamiento para «sin categoría»; el caso que faltaba es el simétrico: si estás viendo «Supermercado» de marzo y a una línea le pones «Ocio», esa línea se va. Sigue recuperable con `Undo`, que se queda en pantalla. | **Dejarla visible en gris con una marca «ya no cumple el filtro»** hasta que cambies de mes o de filtro: ves lo que acabas de hacer, a cambio de que la lista deje de significar «lo que cumple el filtro» y de que el recuento y las cifras no cuadren con lo que se ve. |
| 4 | **Deshacer sin cuenta atrás, en una línea fija encima de la lista** (debajo de las cifras): dice qué hiciste y trae el botón `Undo`. Vive hasta la siguiente corrección, hasta que cambias de mes o de filtro, o hasta que te vas de la pantalla. Es la misma decisión que ya tomó la cola de revisión. | **Aviso flotante con cuenta atrás de unos segundos**: molesta menos, y en una pantalla por la que bajas leyendo un mes entero lo pierdes justo cuando te das cuenta del error. |
| 5 | **Después de corregir una categoría, las cifras solo se vuelven a pedir si tienes un filtro de categoría puesto.** El backend garantiza que categorizar **no cambia** el dinero que entró ni el que salió, así que sin ese filtro no hay nada que actualizar y volver a pedir el mes solo haría parpadear las ~93 líneas. Con «sin categoría» o con una categoría puesta, sí cambia lo que cumple el filtro: ahí sí se pide de nuevo, en segundo plano y sin vaciar la pantalla. | **Refrescar siempre** tras cada corrección, como hace la cola de revisión: una regla más simple de explicar, a cambio de una petición inútil y un parpadeo de la lista entera cada vez que tocas una categoría. |

## ✅ Ya las cerraste tú (4)

- **Solo la categoría.** El estado no se toca desde el extracto: ni confirmar ni
  devolver a pendiente. Técnicamente el estado **no puede viajar** en la petición.
- **De uno en uno.** Nada de marcar varios: para trabajar en serie está la cola.
- **Sí se puede crear una regla desde el extracto**, con su previsualización.
- **Con «sin categoría» puesto, la línea categorizada desaparece al momento.**

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (5)

1. **La petición lleva una sola cosa: la categoría.** El cuerpo se construye en una
   función que solo sabe escribir `categoryId`, así que un estado no puede colarse ni
   por descuido; hay un test que lee el cuerpo enviado letra por letra.
   ⚠️ *Efecto:* importa más aquí que en la cola, porque el extracto enseña también los
   confirmados y un estado colado te los cambiaría en silencio.
2. **El desplegable solo ofrece lo que el backend aceptaría:** categorías de gasto
   para un gasto y de ingreso para un ingreso; un movimiento de importe cero sigue sin
   poder categorizarse, con el mismo texto que ya usa la cola.
3. **Se guarda al elegir**, sin botón de guardar, igual que en la cola.
4. **La parte que escribe se muda a la carpeta común** (hoy vive en la cola de
   revisión) para que las dos pantallas usen exactamente el mismo código, con las
   pruebas de la cola pasando sin tocar ni un test.
5. **El diálogo de crear regla se reutiliza tal cual**, con su previsualización; el
   editor de la línea y el aviso de deshacer se copian de la cola (unas 65 líneas)
   para no enredar las dos pantallas entre sí.

## 📌 Consecuencias que te tocan a ti (no son código)

- **La comprobación final escribe en tus datos reales y no se hará sin que tú lo
  digas** (T22 del plan): con tu visto bueno, uno o dos movimientos, foto con `curl`
  antes, cambiar y deshacer desde la pantalla, y foto después para ver que quedan
  igual — incluido el estado. Sin visto bueno explícito, queda anotado como pendiente,
  como pasó en la F16.
- **La nota permanente sobre las sumas infladas no cambia ni una palabra** y sigue sin
  poder cerrarse. Y ojo con una lectura fácil: **corregir categorías no arregla esas
  cifras**, porque lo que las infla son los traspasos y los depósitos, no la falta de
  categoría.
- **Esta feature no aplica reglas a lo ya importado.** Si creas una regla desde el
  extracto, para que surta efecto sigues teniendo que darle a «aplicar reglas» en la
  pantalla de reglas, y solo tocará lo que esté **sin categoría y sin confirmar**.
- **Con esta se cierra la E7 salvo el interruptor del ruido**, que sigue esperando la
  parte 1 del encargo al backend.

## ⚠️ Incoherencias conocidas que se heredan

- **El extracto y la cola ya no se parecen tanto:** la cola tiene casilla, selector
  fijo y botón de confirmar en cada fila; el extracto solo enseña, y el control
  aparece cuando lo pides. Es deliberado.
- **`Undo` solo deshace lo último**, no un historial. Si corriges cinco líneas
  seguidas, solo la quinta tiene vuelta atrás con un clic.
- **La línea «Showing 12 of 13» puede quedar desfasada unas décimas** entre que una
  fila desaparece y llega el refresco de las cifras. Se prefirió eso a retrasar la
  desaparición que tú pediste.
