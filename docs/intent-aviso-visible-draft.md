# Borrador de la feature 27 — El aviso de lo último que hice se ve desde donde estoy

> **Borrador escrito por el leader para que lo corrijas.** Lo que hay aquí es
> lo que entendí de tus notas de la revisión (cabos sueltos 19 y 24). Cambia,
> tacha o añade lo que quieras. Al final hay dos preguntas. Cuando lo des por
> bueno, lo copio a `feature_list.json` y borro este archivo.

## Qué quiero que pase

Cuando hago algo que escribe en `Review` o en `Movements` (poner una categoría,
confirmar, marcar que un movimiento no cuenta), quiero ver lo que acaba de
pasar y poder deshacerlo **sin moverme de donde estoy**. Hoy esa línea y su
botón `Undo` salen arriba del todo, encima de la lista: si he bajado por la
página, no los veo.

Y quiero reconocer el botón de deshacer como lo que es.

## Por qué lo quiero

Porque en la revisión confirmé un movimiento con la página bajada, no vi ni la
línea ni el `Undo`, y pensé que no existían: el movimiento se quedó confirmado
sin que yo pudiera deshacerlo. En `Movements` me pasó parecido: el botón estaba
arriba de la tabla y lo tomé por un botón de recargar.

## Cómo sabré que está bien

- En `Review`, bajo hasta el final de la lista, pulso `Confirm` en una fila y,
  sin subir, veo qué ha pasado y el botón para deshacerlo.
- Lo mismo al poner una categoría a una fila del final de la lista.
- En `Movements`, lo mismo al cambiar la categoría de una línea del final del
  mes y al marcar que un movimiento no cuenta.
- Si estoy arriba del todo, lo sigo viendo, como hasta ahora.
- Pulso deshacer desde ahí abajo y la fila vuelve a como estaba.
- El botón de deshacer no se confunde con uno de recargar.
- Si lo que hice falla, el mensaje de error también lo veo desde donde estoy.

## Qué NO quiero / límites

- No quiero que cambie qué hace cada acción ni qué deshace el `Undo`: solo
  dónde se ve.
- No quiero que el `Undo` dure más ni menos que ahora.
- No quiero tocar el backend.
- No quiero que el aviso me tape la fila que estoy mirando.

## Lo que NO sé y delego en el agente

- Cómo se consigue que se vea: que la línea se quede fija en un borde de la
  pantalla al bajar, que salga junto a la fila tocada, o de otra forma.
- Qué se hace con el icono o el texto del botón para que no parezca recargar.
- Si se hace con una sola pieza común a las pantallas o una por pantalla.

## Preguntas para ti

1. **¿Entra también `Transfers`?** Tiene el mismo aviso con `Undo` encima de la
   lista de parejas (38 hoy). En tu revisión no te dio problemas. Yo la
   incluiría, para que las tres pantallas se comporten igual.
2. **¿Y el aviso de `Review` tras crear una regla** (la línea verde con el
   botón `Apply rules now`)? Sale en el mismo sitio. Yo lo incluiría también.
