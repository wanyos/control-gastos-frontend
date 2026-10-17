# Borrador de la feature 32 — Cuánto me cuesta existir

> **Borrador escrito por el leader para que lo corrijas.** Cambia, tacha o
> añade lo que quieras. Al final hay cuatro preguntas. Cuando lo des por bueno,
> lo copio a `feature_list.json` y borro este archivo.

## De dónde sale (para situarte)

Es la vista de gastos recurrentes que pensaste en agosto: «cuánto me cuesta
existir, y qué me ha subido». El 17 de octubre tomaste las cuatro decisiones
(están en `../docs/handoff-recurrentes.md`):

- Los recibos, cada uno por separado, aunque haya salido una sola vez.
- Los recurrentes anuales, como anuales.
- «Ha subido» quiere decir que ha subido aunque sea un euro.
- Las transferencias a personas, en la lista y en el total, en su propio grupo.

El backend ya lo calcula (su feature 58). Esta feature es la pantalla.

**Lo que devuelve hoy con tus datos** (leído el 2026-10-17, solo lectura). El
periodo son los 12 meses completos anteriores a este, de octubre de 2025 a
septiembre de 2026:

- **Total al mes: 2.875,79 €.**
- **Recibos: 15.** Los que más pesan son el de la tarjeta (271,51 € al mes),
  el seguro del coche (146,22 €, trimestral), los tributos (136,73 €), la
  comunidad (121,77 €), el impuesto municipal (89,05 €) y la luz (89,05 €).
  Ocho de ellos han subido respecto al cargo anterior.
- **Transferencias a personas: 1.332,04 € al mes.**
- **Gasto variable por categoría:** `Otros gastos` 360,71 € al mes, `Compras`
  120,83 €, y el resto por debajo de 15 €.

Tres cosas que se ven en esos datos y que conviene que sepas antes de mirar la
pantalla. Son del cálculo del backend, no de la pantalla:

- **Los `tributo` se juntan en uno.** Todos los cargos que empiezan por
  `TRIBUTO` salen como un solo recibo, aunque sean impuestos distintos.
- **Las transferencias a personas son casi la mitad del total.** Entran también
  las de familiares, que decidiste meter en su propio grupo.
- **El supermercado sale en solo 13,01 € al mes.** Casi todo el gasto sin regla
  propia está en `Otros gastos`. Para que el gasto variable se reparta como
  quieres (comida, gasolina…) hacen falta reglas, que dijiste que crearías tú.

## Qué quiero que pase

Una pantalla nueva que me diga cuánto me cuesta un mes de vida. Arriba, la cifra
total. Debajo, los recibos uno por uno, con lo que cuesta cada uno al mes, cada
cuánto se cobra, cuándo fue el último y si ha subido y cuánto. Después, lo que
envío a personas, sumado. Y el gasto variable, por categoría. Quiero poder ver
los cargos de un recibo concreto para comprobarlo.

## Por qué lo quiero

Porque no sé cuánto me cuesta existir: cuánto pago al mes sin hacer nada, solo
por tener casa, coche, luz y teléfono. Y quiero enterarme cuando me suben un
recibo, aunque sea poco, sin tener que ir mirándolos uno a uno.

## Cómo sabré que está bien

- Veo arriba lo que me cuesta un mes, y el periodo del que sale.
- Veo cada recibo con su nombre, lo que cuesta al mes, cada cuánto se cobra,
  cuándo fue el último cargo, y si ha subido, cuánto.
- Distingo de un vistazo los recibos que han subido.
- Un recibo anual se lee como anual, no como uno mensual al que le faltan meses.
- Puedo abrir un recibo y ver sus cargos, con su fecha y su importe.
- Veo lo que envío a personas como un grupo aparte, con lo que cuesta al mes.
- Veo el gasto variable por categoría, con lo que cuesta al mes cada una.
- La suma de lo que veo da la cifra de arriba.
- Si el backend falla, me lo dice y puedo volver a intentarlo.

## Qué NO quiero / límites

- No quiero tocar el backend: ya calcula todo.
- No quiero que la pantalla escriba nada.
- No quiero presupuestos, avisos ni alertas: esto es solo mirar.
- No quiero poder marcar a mano qué es recurrente y qué no.

## Lo que NO sé y delego en el agente

- Cómo se dibuja: tabla, tarjetas, barras.
- Cómo se nombra cada recibo en pantalla (el backend da el concepto del banco y
  una versión corta).
- Cómo se enseñan los cargos de un recibo: desplegados en el sitio o en una
  ventana.

## Preguntas para ti

1. **¿Dónde va en el menú?** Opciones:
   - a) Una entrada nueva en el menú, por ejemplo `Monthly cost`. Es la que yo
     pondría: es una pregunta distinta de las otras pantallas.
   - b) Dentro de `Overview`, debajo de lo que ya hay.

2. **El orden de los recibos.** ¿De más caro a más barato al mes (lo que yo
   pondría), o los que han subido primero?

3. **Los recibos que ya no se cobran.** Hay dos que no tienen ningún cargo en el
   periodo y cuestan 0,00 € al mes (por ejemplo, un seguro antiguo). ¿Se
   enseñan aparte, al final, o no se enseñan? Yo los pondría al final, plegados.

4. **Los tres avisos de arriba** (los `tributo` juntos, las transferencias a
   personas, el supermercado en `Otros gastos`). Ninguno es de la pantalla. ¿Los
   dejas para después, o quieres que alguno se arregle antes en el backend?
