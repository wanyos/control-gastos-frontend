# Borrador de las features 33 y 34 — Categorizar con el mínimo trabajo a mano

> **Borrador escrito por el leader para que lo corrijas.** Son dos features
> pequeñas en vez de una grande, como prefieres. Cambia, tacha o añade lo que
> quieras. Cada una tiene sus preguntas al final. Cuando las des por buenas, las
> copio a `feature_list.json` y borro este archivo.

## De dónde sale (para situarte)

Es la parte del frontend de `../docs/handoff-categorizacion.md`, que acordaste el
18 de octubre en la sesión del backend. Con tus palabras:

> «Me parece crítico también tener bien categorizados los movimientos. Hacerlo yo
> a mano no es buena idea, sería mucho trabajo manual; vale que algún movimiento
> deba ponerlo a mano, pero deberían ser los mínimos.»

El backend ya lo tiene hecho (sus features 60 y 61):

- **Cada movimiento dice de dónde salió su categoría:** la pusiste tú, una regla,
  o el cierre de la importación (`Otros gastos` u `Otros ingresos` porque ninguna
  regla lo reconoció).
- **Crear una regla ya mueve lo que estaba en `Otros gastos`.** Antes solo servía
  para lo que se importara después. Lo que pusiste tú a mano no lo toca nunca.
- **Hay una lista de reglas propuestas:** los conceptos que más se repiten en
  `Otros gastos`, con el texto de regla y los movimientos que recogería. Hoy son
  67. Las primeras: `grupo ahorramas` (73 movimientos), una transferencia
  periódica a un familiar (56), `vivagym` (56), `empresa municipal` (41),
  `cp madrono` (32). La categoría no la propone: la eliges tú.
- **Se puede ver qué haría una regla antes de crearla:** cuántos y cuáles
  movería.

Eso va antes de rehacer la sección de recurrentes por categoría, que no sirve
mientras más de la mitad del gasto esté en `Otros gastos`.

---

## Feature 33 — Una pantalla con las reglas propuestas

### Qué quiero que pase

Una pantalla con la lista de reglas propuestas, de la que más movimientos recoge
a la que menos. En cada una elijo la categoría y se crea la regla. Al crearla, veo
qué movimientos ha movido y la propuesta desaparece de la lista. Quiero poder
quitarme el grueso de `Otros gastos` en una sola sesión, decidiendo unas sesenta.

### Por qué lo quiero

Porque categorizar movimiento a movimiento es demasiado trabajo, y sin categorías
la vista por categoría no sirve. Con una decisión por concepto se resuelven
decenas de movimientos de golpe.

### Cómo sabré que está bien

- Veo la lista de propuestas, cada una con su texto y cuántos movimientos
  recogería.
- Puedo ver los movimientos de una propuesta antes de decidir.
- Elijo una categoría y se crea la regla; veo cuántos movimientos ha movido y
  cuáles.
- La propuesta que acabo de usar desaparece de la lista.
- Si una propuesta no me interesa, la dejo y sigo con la siguiente.
- Si la propuesta casa también con movimientos que categoricé yo a mano, me lo
  dice, y esos no se mueven.
- Si falla, me lo dice y no ha cambiado nada.

### Qué NO quiero / límites

- No quiero tocar el backend.
- No quiero que se cree ninguna regla sin que yo elija la categoría.
- No quiero que la aplicación me proponga la categoría.

### Lo que NO sé y delego en el agente

- Cómo se dibuja la lista y cómo se elige la categoría.
- Si se puede editar el texto de la regla propuesta antes de crearla.

### Preguntas para ti

1. **¿Dónde vive la pantalla?**
   - a) Dentro de `Rules`, como una sección nueva arriba («Suggested rules»), con
     las reglas que ya tienes debajo. Es la que yo pondría: es el sitio donde ya
     gestionas las reglas.
   - b) Una entrada nueva en el menú.

2. **¿Se puede descartar una propuesta para que no vuelva a salir?** Por ejemplo
   `apertura dep` (los depósitos) sale como propuesta, y puede que no quieras
   categorizarla. Hoy el backend no guarda descartes: una propuesta que no uses
   seguirá saliendo. Yo lo dejaría así de momento; si molesta, se pide al backend.

3. **El botón `Apply rules` y el aviso `Apply rules now`.** Desde ahora crear una
   regla ya la aplica sola a lo pendiente y a `Otros gastos`. El botón de aplicar
   todas sigue sirviendo para repasar, pero el aviso que sale tras crear una regla
   («aplícala ahora») ya no hace falta. ¿Lo quito en esta feature? Yo sí, para que
   no te diga que hagas algo que ya está hecho.

---

## Feature 34 — Al cambiar una categoría a mano, ofrecer aplicarla a los demás

### Qué quiero que pase

Cuando cambio a mano la categoría de un movimiento, en `Movements` o en `Review`,
que la aplicación me pregunte si quiero ponerla también en todos los que contienen
un texto, diciéndome cuántos y cuáles serían. Si digo que sí, se crea la regla y
se aplican. Si digo que no, solo cambia ese movimiento, como ahora.

### Por qué lo quiero

Porque así cada corrección que hago a mano sirve para siempre: para los
movimientos iguales que ya tengo y para los que vengan. Es lo que pedí en la
revisión: «tengo 20 movimientos que son de lo mismo, con darle la categoría a uno
automáticamente se ponga para todos».

### Cómo sabré que está bien

- Cambio la categoría de un movimiento y la aplicación me pregunta si la aplico a
  los demás que contienen un texto.
- Antes de decir que sí, veo cuántos movimientos se moverían y cuáles.
- Puedo cambiar el texto antes de decidir, y lo que se movería se actualiza.
- Si digo que sí, se crea la regla y veo cuántos se han movido.
- Si digo que no, solo ha cambiado ese movimiento.
- Si no hay ningún otro movimiento que se movería, no me pregunta, o me dice que
  no hay ninguno.

### Qué NO quiero / límites

- No quiero tocar el backend.
- No quiero que se cree ninguna regla sin que yo diga que sí.
- No quiero que me pregunte cuando ya existe una regla para ese texto.

### Lo que NO sé y delego en el agente

- Cómo se hace la pregunta: en la propia línea, o en una ventana.

### Preguntas para ti

1. **¿Qué texto te ofrece por defecto la pregunta?**
   - a) El mismo que propondría la lista de propuestas para ese concepto
     (`grupo ahorramas` para `GRUPO AHORRAMAS 1135`). Es la que yo pondría: corta
     y ya pensada para casar con los iguales.
   - b) El concepto entero, tal cual.
   - c) Ninguno: lo escribes tú.

2. **¿Quieres ver en cada movimiento de dónde salió su categoría?** (puesta por
   ti, por una regla, o por el cierre de la importación). Yo lo enseñaría de forma
   discreta solo para el cierre, porque es lo que te interesa revisar: «esto está
   en `Otros gastos` porque nadie lo reconoció». Las otras dos no aportan mucho a
   la vista.
