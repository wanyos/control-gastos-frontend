# Borrador de la feature 29 — `Movements` se entiende de un vistazo

> **Borrador escrito por el leader para que lo corrijas.** Cambia, tacha o
> añade lo que quieras. Al final hay tres preguntas. Cuando lo des por bueno, lo
> copio a `feature_list.json` y borro este archivo.

## De dónde sale (para situarte)

Sale de cuatro cosas de la pantalla `Movements` que anotaste en la revisión del
6 de octubre, o que salieron al prepararla:

- **El importe de lo que no cuenta no se distingue.** La guía te decía que un
  movimiento `Not counted` lleva el importe en gris, y anotaste: «la cantidad no
  está en gris» y «cantidad en gris nunca la vi». Lo medí: sí cambia de color,
  pero de un gris claro a otro gris claro casi igual. No se nota.
- **Los colores de las etiquetas no se entienden.** Anotaste: «en unas pone en
  verde que serán de entrada, otras en blanco que serán de salida; en verde pone
  otros ingresos, en blanco pone uncategorized». Y que no entiendes ver
  `Not counted` seguido de una categoría como `Ocio` en la misma línea.
- **La nota gris de debajo de las cifras no se entiende.** En el paso 13
  anotaste: «esta parte no la entiendo». Son tres frases largas en inglés que
  empiezan por `These figures already leave out what does not count`.
- **Un mes vacío culpa a la casilla.** Si abres un mes sin ningún movimiento
  (hoy, octubre de 2026) con la casilla `Hide what does not count` puesta, la
  pantalla dice `Hiding 0 movements` y `Nothing left to show in October 2026:
  everything in this month is hidden`, como si la casilla lo hubiera vaciado.
  Esto no lo anotaste tú: lo encontré yo al comprobar la guía.

Son los cabos sueltos 11, 18, 20 y 22 del roadmap.

## Qué quiero que pase

Que al mirar la lista de `Movements` distinga sin pensar tres cosas: qué
movimientos cuentan en las sumas y cuáles no, qué es una entrada y qué es una
salida, y qué tiene categoría y qué no. Que la explicación de qué incluyen las
cifras se lea en un momento. Y que un mes sin movimientos diga que no tiene
movimientos, esté como esté la casilla.

## Por qué lo quiero

Porque hoy tengo que fiarme de etiquetas pequeñas y de colores que no sé qué
significan. Si no distingo lo que cuenta de lo que no, no puedo comprobar las
cifras de arriba mirando la lista de abajo, que es para lo que sirve esta
pantalla.

## Cómo sabré que está bien

- Un movimiento que no cuenta en las sumas (marcado por mí, o uno de los dos de
  un traspaso emparejado) se distingue a simple vista de uno que sí cuenta, sin
  tener que leer su etiqueta.
- Su importe no se confunde con el de un movimiento normal.
- Sé por qué una etiqueta de categoría tiene el color que tiene, o todas tienen
  el mismo.
- Un movimiento sin categoría se distingue de uno que la tiene.
- Entiendo qué quiere decir una línea que lleva `Not counted` y una categoría a
  la vez.
- Leo la explicación de debajo de las cifras y sé qué incluyen y qué no.
- Abro un mes sin movimientos con la casilla puesta y la pantalla dice que ese
  mes no tiene movimientos, no que están escondidos.
- Abro un mes en el que todo lo que hay está escondido por la casilla y la
  pantalla sí dice que está escondido, con la forma de enseñarlo.

## Qué NO quiero / límites

- No quiero que cambie ninguna cifra ni qué movimientos cuentan.
- No quiero tocar el backend.
- No quiero cambiar los nombres de las categorías.
- No quiero que cambie cómo se marca o se desmarca un movimiento.
- No quiero cambiar el idioma de la aplicación en esta feature.

## Lo que NO sé y delego en el agente

- Cómo se distingue lo que no cuenta: atenuando toda la línea, tachando el
  importe, o de otra forma.
- Qué colores quedan y con qué significado, cuidando que se lean bien sobre el
  fondo oscuro.
- Cómo queda redactada la explicación de debajo de las cifras.

## Preguntas para ti

1. **Los colores de las etiquetas de categoría.** Hoy las de ingreso van en
   verde y las de gasto sin color. Opciones:
   - a) Todas iguales, sin color. El verde se queda solo en el importe, que ya
     dice si entra o sale. Es la que yo pondría: un solo sitio donde mirar.
   - b) Dejarlas como están y explicarlo en algún sitio de la pantalla.
   - c) Otra que prefieras.

2. **La explicación de debajo de las cifras.** Opciones:
   - a) Una frase corta siempre a la vista (por ejemplo, que las cifras no
     cuentan los traspasos emparejados ni lo que marcaste), y el resto de la
     explicación plegado, para abrirlo si quieres. Es la que yo pondría.
   - b) Reescribir las tres frases más cortas y dejarlas todas a la vista.
   - c) Quitarla.

3. **`Not counted` junto a una categoría.** Un movimiento que no cuenta puede
   tener categoría (por ejemplo, los intereses de un depósito). ¿Te vale que se
   vean las dos cosas si la línea entera se distingue como «no cuenta», o
   prefieres que a lo que no cuenta no se le enseñe la categoría?
