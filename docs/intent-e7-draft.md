# Borrador de intención — E7, la pantalla del extracto

> **Esto es un borrador que ha escrito el agente para que TÚ lo corrijas.**
> Tú dijiste que no sabías qué querías ver ahí; esto es una propuesta razonada a
> partir de tus datos reales, medidos hoy, no una decisión. Táchalo, cámbialo y
> contesta las preguntas del final. Cuando lo des por bueno, se copia al campo
> `intent` de la feature y este archivo se borra.
>
> Formato: `docs/intent-template.md`.

## Lo que dicen tus datos hoy (medido, 2026-09-26)

| | |
|---|---|
| Movimientos | **1.607**, de **enero de 2024** a **septiembre de 2026** (33 meses) |
| Confirmados | **0.** Todo está pendiente de revisar |
| Con categoría | **234**; sin categoría, **1.373** |
| Cuentas | 5: n26 (911 movs), bankinter (371), openbank (205), myinvestor (85), revolut (35) |
| Tipos | 1.434 gastos, 173 ingresos, **0 neutrales** |
| Traspasos emparejados | **80** movimientos con pareja detectada; unos 70 parecen traspasos tuyos por el concepto, ~81.000 € |
| Saldo tras el movimiento | lo traen bankinter, openbank y revolut (611 movs); **n26 y myinvestor no** |

Y el dato que lo cambia todo:

> **Las sumas de tu histórico hoy no significan nada.** En total: 446.014 € de
> «ingreso» y 439.372 € de «gasto». De eso, **290.865 € de gasto y 291.692 € de
> ingreso son de myinvestor**: aperturas de depósito de 25.000-30.000 € y su
> devolución con intereses. Julio de 2026 aparece con 63.096 € de gasto y 61.948 € de
> ingreso, y no es tu vida: es un depósito renovándose. A eso se suman ~81.000 € de
> traspasos entre tus propias cuentas, que **no son neutrales** en los datos: cuentan
> como gasto en una cuenta y como ingreso en la otra.

De ahí salen las cuatro cosas que creo que esta pantalla tiene que resolver:

1. **Ver un mes como lo verías en el banco**, con sus sumas, y poder saltar de mes.
2. **Que las sumas digan la verdad**, o sea, poder dejar fuera el ruido: depósitos y
   traspasos entre tus cuentas.
3. **Encontrar algo concreto** entre 1.607 movimientos y 33 meses.
4. **Ver qué te falta por categorizar**, porque hoy son 1.373 de 1.607.

---

## Intención: el extracto, mi histórico completo

### Qué quiero que pase

Quiero una pantalla con **todo mi histórico**, no solo un trozo. Quiero **moverme por
meses**: ver septiembre entero, con lo que entró, lo que salió y la diferencia, y
saltar al mes anterior sin pelearme con fechas.

Quiero que **las sumas de ese mes signifiquen algo**: que no me cuenten como gasto los
25.000 € de abrir un depósito ni los 1.000 € que muevo de una cuenta mía a otra. Si el
mes dice «gastado 1.200 €», quiero poder creérmelo.

Quiero **filtrar por cuenta, por categoría y por fechas**, **buscar por el concepto** y
**ver de un tirón lo que aún no tiene categoría**. Cada línea tiene que decirme fecha,
concepto, cuenta, categoría e importe.

### Por qué lo quiero

Porque es la pantalla que sustituye al Excel, y porque hoy **no tengo ningún sitio
donde mirar «qué pagué en marzo» o «cuánto llevo en la luz este año»**. La cola de
revisión es una lista de trabajo: sirve para ir vaciándola, no para leer mi vida
financiera por meses. Y porque, en cuanto empiece a confirmar movimientos, lo
confirmado desaparecerá de la cola y me quedaré sin verlo en ninguna parte.

### Cómo sabré que está bien

- Entro y veo un mes con sus movimientos y sus sumas, sin tocar nada.
- Cambio de mes de un clic y las sumas cambian con él.
- Las sumas del mes **no incluyen** las aperturas y devoluciones de depósitos de
  myinvestor ni los traspasos entre mis cuentas, y la pantalla me dice que los ha
  dejado fuera y cuánto eran.
- Filtro por una cuenta y veo solo la suya, con sus propias sumas.
- Filtro por una categoría y veo todo lo que la lleva en ese periodo.
- Busco un trozo del concepto y lo encuentro, con tildes o sin ellas.
- Veo cuántos movimientos del mes están sin categoría y puedo quedarme solo con esos.
- Con 1.607 movimientos y 33 meses, la pantalla no se arrastra.
- Lo que veo cuadra con lo que dice mi banco para ese mes.

### Qué NO quiero / límites

- No quiero tocar el backend.
- No quiero editar importe, fecha ni descripción: el hecho bancario no se toca.
- No quiero borrar movimientos.
- No quiero gráficas aquí: esto es la tabla. Los dashboards son la etapa siguiente.
- No quiero exportar a CSV todavía.
- No quiero emparejar traspasos a mano ni resolver conflictos de reglas.
- No quiero que esta pantalla duplique la cola de revisión: revisar sigue siendo su
  sitio.

### Lo que NO sé y delego en el agente

- Si el mes se elige con flechas, con un desplegable o con un rango libre de fechas.
- Dónde van las sumas y si se quedan fijas al bajar por la lista.
- Cómo se agrupan las líneas: por mes, por día o lista continua con separadores.
- Cuántos movimientos se cargan de golpe y cómo se sigue bajando.
- **Cómo se decide qué es ruido** (depósito o traspaso propio) sin tocar el backend:
  por el concepto, por la cuenta, por la pareja de traspaso que ya viene marcada, o
  por una mezcla; y cómo enseñarlo para que yo lo vea y no sea magia.
- Cómo se distingue a simple vista un traspaso propio de un gasto real.
- Si se enseña el saldo tras el movimiento en las tres cuentas que lo traen, y qué se
  pone en las otras dos.
- Qué hacer con myinvestor, que no es gasto corriente sino inversión.

---

## Preguntas que cambian el tamaño de la feature

Contéstalas aquí mismo, en una línea cada una:

1. **¿Con qué te encuentras al entrar:** el mes en curso, los últimos 30 días, o lo
   último que estabas mirando?
   → *respuesta:* el mes en curso

2. **El ruido de las sumas (depósitos y traspasos propios): ¿fuera de las sumas pero
   visible en la lista, o con un interruptor para esconderlo del todo?**
   → *respuesta:* un interruptor

3. **¿myinvestor entra en esta pantalla** (es tu cuenta, al fin y al cabo) **o la dejas
   fuera por defecto** porque es inversión y ya tiene su vista de Patrimonio?
   → *respuesta:* entra en la pantalla

4. **¿Quieres poder cambiar la categoría desde aquí** (eso escribe en la base de
   datos), o esta primera versión **solo mira** y la corrección va después?
   → *respuesta:* lo que se mas practico, me da igual hacerlo ahora o dejarlo para mas adelante

5. **¿Esta pantalla es `Movements`** (hoy vacía, ya tiene su entrada en el menú) **o
   vive en otro sitio?**
   → *respuesta:* creo que debe estar en el menu, no lo se

6. **¿Te sirve el saldo de la cuenta tras cada movimiento** (lo traen bankinter,
   openbank y revolut; n26 y myinvestor no), **o es ruido que sobra?**
   → *respuesta:* no ponerlo es ruido que sobra

---

## Lo que yo partiría en dos features, si me dejas opinar

Tal cual está escrito arriba, esto es grande. Yo lo haría así:

- **Primera feature — el extracto que mira:** meses, filtros, búsqueda, sumas
  honestas (con el ruido fuera y a la vista) y la lista. Solo lectura: es la mayor
  parte del valor y no puede romper nada.
- **Segunda feature — corregir desde el extracto:** cambiar la categoría de un
  movimiento desde aquí y, si quieres, devolverlo a pendiente. Escribe, así que va
  aparte y con su propia prueba contra tus datos.

Si lo prefieres todo junto se hace, pero tardarás más en verlo funcionando.

## Una cosa que no es de esta pantalla, pero que este análisis ha dejado clara

Los depósitos de myinvestor y los traspasos entre tus cuentas van a ensuciar **todos**
los dashboards de la E8, no solo esta pantalla. Si al final decidimos una regla para
distinguirlos, conviene que viva en un sitio y la usen las dos etapas. Y puede que lo
correcto sea que eso acabe en el backend (una marca en el movimiento), no en cada
pantalla. Aquí lo resolveremos como podamos sin tocarlo, pero queda dicho.
