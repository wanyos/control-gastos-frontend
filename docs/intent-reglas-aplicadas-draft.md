# Borrador de la feature 30 — Ver qué cambió al aplicar las reglas

> **Borrador escrito por el leader para que lo corrijas.** Cambia, tacha o
> añade lo que quieras. Al final hay tres preguntas. Cuando lo des por bueno, lo
> copio a `feature_list.json` y borro este archivo.

## De dónde sale (para situarte)

Sale de tu revisión de `Rules`, el 10 de octubre. En el último paso pulsaste
`Apply rules`, cerraste la ventana, fuiste a `Review` y anotaste: «no veo que
haya cambiado nada después del paso anterior».

Sí había cambiado. Lo comprobé en la API ese mismo día: los movimientos
pendientes sin categoría pasaron de 1.373 a 1.011, es decir, se categorizaron
362. Pero en `Review` no se notaba:

- El número del menú seguía en 1.607, porque aplicar las reglas pone categoría
  pero no confirma.
- `In`, `Out` y `Net` no se movieron, porque una categoría no cambia ninguna
  suma.
- Ninguna fila decía «a mí me acaban de poner categoría».

Lo único que lo dice hoy es la ventana `Rules applied`, con tres números, y
desaparece al cerrarla. Es el cabo suelto 26 del roadmap.

## Qué quiero que pase

Que después de aplicar las reglas pueda ver qué movimientos se han
categorizado, no solo cuántos. Y que, sin haber aplicado nada, pueda saber de
un vistazo cuánto me queda sin categoría.

## Por qué lo quiero

Porque aplicar las reglas cambia cientos de movimientos de golpe y no se puede
deshacer desde la aplicación. Si no veo cuáles ha tocado, no puedo comprobar
que mis reglas hacen lo que yo creía, y me entero de una regla mala cuando ya
lleva meses categorizando mal.

## Cómo sabré que está bien

- Aplico las reglas y, al cerrar la ventana, veo cuántos movimientos se han
  categorizado sin tener que acordarme del número.
- Desde ahí puedo ver la lista de los movimientos que se acaban de categorizar,
  cada uno con la categoría que le han puesto.
- Si no se ha categorizado ninguno, me lo dice con esas palabras.
- Sin aplicar nada, en `Review` veo cuántos pendientes siguen sin categoría.
- Si recargo la página, lo que veo sigue siendo verdad: no me enseña como
  «recién categorizado» algo que ya no lo es.

## Qué NO quiero / límites

- No quiero que aplicar las reglas confirme nada: categorizar no es confirmar.
- No quiero un botón de deshacer la aplicación de las reglas en esta feature.
- No quiero que cambie qué movimientos tocan las reglas (solo pendientes sin
  categoría).
- No quiero tocar el backend, si se puede hacer sin él. Si no se puede, quiero
  saberlo antes de empezar.

## Lo que NO sé y delego en el agente

- De dónde sale la lista de lo recién categorizado. Hoy el backend, al aplicar,
  devuelve cuántos categorizó pero no cuáles. Hay que ver si se puede saber
  cuáles sin tocarlo (por ejemplo, comparando lo que había sin categoría antes
  y después), y si no se puede, decírmelo.
- Dónde se enseña: en `Review`, en `Rules`, o en la propia ventana.
- Cuánto tiempo sigue a la vista: hasta que salgo de la pantalla, hasta la
  siguiente acción, o de otra forma.

## Preguntas para ti

1. **¿Te basta con verlo justo después de aplicar**, o quieres poder volver
   otro día a ver qué categorizó la última aplicación? Lo primero se puede
   intentar solo con el frontend. Lo segundo necesita que el backend lo guarde,
   y sería otra feature, allí primero.

2. **¿También al importar?** Las reglas se aplican solas en cada importación, y
   ahí tampoco se ve qué movimientos categorizaron. Yo lo dejaría fuera de esta
   feature: hoy no tienes archivos para probarlo, y va mejor junto con tu idea
   de mejora 6 (revisar los movimientos dudosos en cada import).

3. **Los choques.** La ventana enseña también los movimientos a los que les
   casan dos reglas de categorías distintas, que se quedan sin categoría; al
   cerrarla se pierden. ¿Quieres que esa lista siga a la vista igual que la de
   lo categorizado? Yo diría que sí: es lo que te dice qué reglas arreglar.
