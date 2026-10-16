# Borrador de la feature 31 — Ver cuánto cuenta cada movimiento de depósito

> **Borrador escrito por el leader para que lo corrijas.** Cambia, tacha o
> añade lo que quieras. Al final hay tres preguntas. Cuando lo des por bueno, lo
> copio a `feature_list.json` y borro este archivo.

## De dónde sale (para situarte)

El 16 de octubre diste la regla de los depósitos: «si un depósito se cancela no
tiene repercusión en el aumento del saldo o patrimonio, tampoco debería tenerlo
solo por ser un depósito; lo que se gana son los intereses cuando vence su
plazo».

El backend ya la cumple (su feature 57). Lo comprobé con tus datos: octubre de
2026 pasó de 75.203,92 € de entrada y 78.455,20 € de salida a 203,92 € y
3.455,20 €. Las aperturas y cancelaciones ya no cuentan, y cada vencimiento
cuenta solo su interés: 37,07 € el de octubre. Los meses de antes recuperan sus
intereses, que antes no contaban en ningún sitio.

Pero la lista de `Movements` no lo enseña. En octubre, las tres aperturas de
25.000 € salen en blanco y sin tachar, y las dos cancelaciones y el vencimiento
de 25.037,07 € en verde, como si contaran enteros. Arriba, las cifras ya los
dejan fuera. Y la frase de debajo de las cifras sigue diciendo que solo se dejan
fuera los `Transfer` y los `Not counted`.

Hay además un vencimiento que el backend no ha podido resolver: el de agosto de
2025, de 20.034,01 €. No encuentra la apertura de ese depósito, así que no sabe
cuánto es interés, y de momento no cuenta nada. Lo marca como dudoso.

Es el cabo suelto 37 del roadmap.

## Qué quiero que pase

Que en la lista de `Movements` vea, en cada movimiento de depósito, cuánto
cuenta de verdad en las sumas. Que una apertura o una cancelación se distinga
como algo que no cuenta. Que un vencimiento diga que solo cuenta su interés, y
cuánto es. Que un depósito dudoso se vea como dudoso, con el motivo. Y que la
frase de debajo de las cifras diga lo que de verdad dejan fuera.

## Por qué lo quiero

Porque la lista sirve para comprobar las cifras de arriba. Si un vencimiento de
25.037,07 € sale en verde como si fuera un ingreso entero, y arriba solo cuentan
37,07 €, no puedo cuadrar una cosa con la otra. Y un depósito dudoso que no
cuenta nada sin decirlo es justo un dato que se pierde sin que me entere.

## Cómo sabré que está bien

- En octubre de 2026, las aperturas y cancelaciones de depósito se distinguen a
  simple vista como movimientos que no cuentan.
- El vencimiento de 25.037,07 € dice que solo cuentan 37,07 €, que son los
  intereses.
- Sigo viendo el importe que dio el banco en cada movimiento.
- El vencimiento de agosto de 2025 se ve como dudoso, con el motivo, y que de
  momento no cuenta.
- La frase de debajo de las cifras dice también que los depósitos solo cuentan
  por sus intereses.
- La casilla `Hide what does not count` esconde las aperturas y cancelaciones, y
  no esconde un vencimiento que cuenta sus intereses.
- Las cifras de arriba no cambian: son las del backend.

## Qué NO quiero / límites

- No quiero tocar el backend: ya manda lo que hace falta.
- No quiero poder cambiar desde aquí cuánto cuenta un depósito.
- No quiero que cambie nada de cómo se ven los demás movimientos.

## Lo que NO sé y delego en el agente

- Cómo se enseña cuánto cuenta un vencimiento sin que se confunda con el importe
  del banco.
- Qué texto exacto lleva cada clase de movimiento de depósito, en inglés como el
  resto de la aplicación, con su traducción en la hoja de decisiones.
- Si la casilla `Hide what does not count` cuenta los movimientos de depósito en
  su recuento de escondidos.

## Preguntas para ti

1. **¿Dónde quieres ver los depósitos dudosos?** Hoy solo hay uno, el de agosto
   de 2025.
   - a) Solo en su línea de `Movements`, con su motivo. Es la que yo pondría: es
     uno, y está donde lo buscarías al ver ese mes.
   - b) Además en algún sitio que los junte todos, para no tener que ir mes a
     mes. Encajaría mejor con tu idea de mejora 6 (revisar los dudosos en cada
     import), y lo dejaría para entonces.

2. **¿Y en `Review`?** Los movimientos de depósito también están en la lista de
   pendientes de `Review`. No he mirado cómo salen allí. Yo lo incluiría con el
   mismo aspecto que en `Movements`, para que no veas dos cosas distintas.

3. **El dudoso de agosto de 2025: ¿sabes de qué depósito era?** Si recuerdas que
   era uno de 20.000 €, como los de los meses siguientes, el interés serían
   34,01 €. Hoy la aplicación no tiene forma de que se lo digas. Si quieres
   poder resolverlo tú, sería otra feature, primero en el backend.
