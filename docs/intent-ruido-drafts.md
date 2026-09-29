# Borradores de intención — las tres features del ruido

> **Esto son tres borradores que ha escrito el agente para que TÚ los corrijas.**
> Los reviso contigo uno a uno; según los apruebes, se copian al campo `intent` de
> su feature en `feature_list.json` y se lanzan **de una en una**. Este archivo se
> borra cuando las tres estén dadas de alta.
>
> Formato: `docs/intent-template.md`.

## De dónde salen

El backend cerró su parte (features 49 y 50). Ahora existe:

- **`excludedFromTotals`** en cada movimiento: `true` lo saca de las sumas de entrada
  y salida **sin tocar** importe, fechas, descripción ni el saldo de la cuenta. Lo
  escribes solo tú, de uno en uno o **en bloque hasta 200**, y se deshace poniéndolo
  a `false`.
- **Filtros `excluded=only|none` y `transfer=only|none`** en la lista de movimientos.
- **`GET /api/transfers`**: todas las parejas enlazadas, con su identificador, que es
  lo que hacía falta para poder deshacer una desde la web.
- **`GET /api/transfers/ambiguous`**: los grupos que parecen traspasos y que la
  detección no supo resolver. Se calculan en el momento, así que siempre están al día.
- **`GET /api/investments/deposits`**: lo que ganó cada depósito.

Y tus datos, medidos el 2026-09-26:

| | |
|---|---|
| Ruido de depósitos | **29 apuntes**: 285.000 € de gasto y 275.652 € de ingreso, el 58 % de tu base |
| Traspasos ya emparejados | 40 parejas (80 movimientos), ya fuera de las sumas |
| De esas parejas, **falsas** | **2**: dos multas casadas con Bizums de quien te devolvía su parte |
| Traspasos propios sin pareja | 17, de los que 16 no tienen espejo importado |
| Efecto si se limpia | los últimos 6 meses pasan de 165.829 / 168.376 € a **20.360 / 23.376 €** |

---

# Feature A — Marcar «esto no cuenta para mis cuentas»

## Qué quiero que pase

Quiero poder decirle a un movimiento que **no cuenta en mis sumas**: las aperturas y
vencimientos de depósito, y los traspasos a cuentas mías que el programa no emparejó.
Quiero poder hacerlo **de varios a la vez**, porque son decenas y de uno en uno no lo
voy a hacer nunca.

Quiero verlo claro: que un movimiento marcado se distinga de un vistazo, que las sumas
del mes cambien al momento, y **poder quitar la marca** si me equivoco.

Quiero que quede claro que marcar **no borra ni cambia nada**: el movimiento sigue en
su sitio, con su importe y su fecha, y el saldo de la cuenta no se mueve.

## Por qué lo quiero

Porque hoy las sumas de cualquier mes están infladas y no me sirven para nada. Julio
dice 57.948 € de entrada cuando lo mío fueron 221 €. Mientras no pueda apartar ese
ruido, ni el extracto ni los dashboards que vienen después me dicen la verdad.

## Cómo sabré que está bien

- Marco un movimiento y las sumas del mes bajan al momento en ese importe.
- Marco varios de una vez, sin repetir el gesto uno por uno.
- Un movimiento marcado se ve distinto en la lista: sé cuáles he apartado.
- Le quito la marca y las sumas vuelven a incluirlo.
- El importe, la fecha, la descripción y el saldo de la cuenta no cambian nunca.
- Si algo falla, me lo dice y no me deja la pantalla diciendo algo que no es.
- Puedo encontrar rápido lo que quiero marcar: los depósitos son todos de una cuenta y
  de conceptos parecidos.

## Qué NO quiero / límites

- No quiero tocar el backend.
- No quiero que marcar cambie el importe, la fecha, la descripción ni el saldo.
- No quiero que se marque nada solo, ni por regla ni por adivinanza: lo decido yo.
- No quiero perder de vista lo marcado: apartado de las sumas no es lo mismo que
  escondido.

## Lo que NO sé y delego en el agente

- Dónde vive el gesto de marcar: en la línea, en una selección como la de la cola de
  revisión, o las dos cosas.
- Cómo se ve un movimiento marcado sin que la lista se vuelva un árbol de Navidad.
- Si hace falta pedir confirmación al marcar muchos de golpe.
- Si conviene un deshacer como el de la cola, o basta con volver a pulsar.

### Preguntas

1. **¿Marcar en bloque como en la cola de revisión** (casillas y una barra de acciones)
   **o de uno en uno con el gesto de la línea, y ya está?**
   → *respuesta:* creo que mejor marcar en bloque, no estoy seguro

2. **Los 29 apuntes de depósito son casi todo el ruido.** ¿Te vale con filtrar por la
   cuenta de myinvestor y marcarlos a mano, o quieres algo que te ayude a encontrarlos
   (por ejemplo, buscar «DEP.» y marcar todo lo que salga)?
   → *respuesta:* solo estan en la cuenta de myinvestor, de momento hacerlo solo alli o de la forma mas facil posible

3. **¿Dónde quieres poder marcar: solo en el extracto, o también en la cola de
   revisión?**
   → *respuesta:* de momento no lo tengo claro, la forma mas sencilla por ahora

---

# Feature B — El interruptor del ruido

## Qué quiero que pase

Quiero un interruptor en el extracto que **esconda lo que no cuenta**: lo que he
marcado y los traspasos entre mis cuentas. Con el interruptor puesto quiero ver solo mi
vida real; al quitarlo, verlo todo otra vez.

Quiero que la pantalla me diga **cuánto se está dejando fuera**, para no olvidarme de
que existe.

Y quiero que **la nota que hoy avisa de que las sumas están infladas cambie**: cuando
ya no lo estén, esa nota tiene que dejar de asustar y decir la verdad nueva.

## Por qué lo quiero

Porque una vez apartado el ruido, lo que quiero de un mes es leerlo limpio, sin 30.000 €
de un depósito en medio. Y porque la nota permanente que pusimos era honesta mientras no
había arreglo; mantenerla igual cuando ya lo hay sería mentir al revés.

## Cómo sabré que está bien

- Pongo el interruptor y desaparecen de la lista los marcados y los traspasos.
- Las sumas que veo se corresponden con lo que queda a la vista.
- La pantalla me dice cuántos movimientos ha dejado fuera y por cuánto.
- Quito el interruptor y vuelve todo.
- El interruptor se recuerda al cambiar de mes y al recargar.
- La nota sobre las sumas ya no dice que están infladas sin remedio: dice lo que pasa
  de verdad ahora.

## Qué NO quiero / límites

- No quiero tocar el backend.
- No quiero que el interruptor escriba nada: solo enseña o esconde.
- No quiero que se ponga solo sin que yo lo sepa.
- No quiero perder los filtros que ya hay ni la navegación por meses.

## Lo que NO sé y delego en el agente

- Si es un interruptor o dos (lo marcado y los traspasos son cosas distintas).
- Si viene puesto o quitado la primera vez.
- Cómo se dice lo que queda fuera sin llenar la pantalla de texto.
- Qué dice exactamente la nota nueva.

### Preguntas

1. **¿Un interruptor para todo el ruido, o dos separados** (uno para lo que marcaste y
   otro para los traspasos)?
   → *respuesta:* quizas dos pero no lo tengo claro, hacer lo que creas mas practico

2. **¿Cómo quieres entrar al extracto: con el ruido escondido** (ves tu vida limpia y lo
   demás es un clic) **o mostrándolo todo** (ves el extracto tal cual y escondes tú)?
   → *respuesta:* mostrarlo todo

---

# Feature C — Revisar las parejas de traspaso

## Qué quiero que pase

Quiero poder **ver las parejas de traspaso** que el programa ha detectado y **deshacer
las que están mal**. Ahora mismo hay dos multas que pagué y que otra persona me devolvió
por Bizum, casadas como si fueran traspasos míos: están fuera de mis sumas y no deberían.

Y quiero ver los **traspasos dudosos**, los que el programa no supo emparejar, y poder
emparejarlos yo cuando esté claro.

## Por qué lo quiero

Porque la detección acierta casi siempre, pero cuando se equivoca hoy no tengo forma de
corregirla desde la web, y el error se queda ahí falseando mis cuentas para siempre.

## Cómo sabré que está bien

- Veo la lista de parejas, con las dos patas de cada una: fecha, cuenta, concepto e
  importe.
- Reconozco de un vistazo las que no cuadran, como las dos multas.
- Deshago una pareja y sus dos movimientos vuelven a contar en las sumas.
- Veo los dudosos y, cuando dos son claramente el mismo dinero, los empareja.
- Si me equivoco emparejando, puedo deshacerlo.
- Nada de esto cambia importes ni fechas.

## Qué NO quiero / límites

- No quiero tocar el backend.
- No quiero que se empareje nada solo desde esta pantalla: solo lo que yo diga.
- No quiero editar movimientos desde aquí, más allá de enlazar y desenlazar.

## Lo que NO sé y delego en el agente

- Si esto es una pantalla propia o vive dentro de otra.
- Cómo se enseña un grupo dudoso de tres o más movimientos, donde hay que elegir dos.
- Qué se hace con las parejas que están bien, que son la inmensa mayoría: enseñarlas
  todas o esconderlas.

### Preguntas

1. **¿Pantalla propia** (una entrada más en el menú, junto a Rules) **o dentro del
   extracto?**
   → *respuesta:* una pantalla mas en el menu

2. **Tienes 40 parejas y solo 2 están mal.** ¿Prefieres verlas todas, o que la pantalla
   intente destacar las sospechosas (por ejemplo, las que casan un cargo con un Bizum de
   otra persona)?
   → *respuesta:* verlas todas, para determinar que son correctas o no como se emparejaron

3. **¿Emparejar dudosos entra en esta feature** o con deshacer las falsas te basta de
   momento?
   → *respuesta:* si se puede incluir en esta feature mejor, si no una feature aparte

---

## Lo que yo haría, si me dejas opinar

**A → B → C, y en tres features separadas.** La A es la que quita la mentira de las
cifras; la B es pequeña y se apoya en ella; la C es la más grande y la menos urgente,
porque afecta a dos multas de 150 € en total, no a 285.000 €.

De la A, mi apuesta: **selección múltiple como en la cola de revisión**, porque 46
movimientos de uno en uno no los marca nadie.

Y una cosa que **no** metería en ninguna de las tres: marcar automáticamente por regla
(«todo lo que ponga APERTURA DEP. no cuenta»). Suena cómodo, pero es exactamente el tipo
de magia que luego no sabes por qué pasó, y el backend ya dejó dicho que esa marca la
escribe solo el humano.
