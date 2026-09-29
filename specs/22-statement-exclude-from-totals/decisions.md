# Decisiones — F22 `statement-exclude-from-totals`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** en el extracto aparece un botón `Select movements`. Al pulsarlo, cada
línea saca una casilla y arriba sale una barra: marcas las que quieras y pulsas
`Exclude from totals` (o `Include in totals` para devolverlas). Lo marcado **sigue en
la lista**, con una etiqueta `Not counted`, y **las cifras del mes se vuelven a pedir
al backend al momento** — es la primera acción del extracto que las mueve de verdad.
**No toca:** el backend, el importe, la fecha, el concepto, el saldo, el estado, la
categoría ni la nota permanente sobre las sumas infladas (esa la reescribe la feature
siguiente). **No trae:** el interruptor para esconder el ruido, ni marcar desde la cola
de revisión, ni ningún automatismo. 16 requisitos.

---

## 🔴 Confirma o corrige (5)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Las casillas solo salen cuando las pides.** El extracto se ve exactamente como hoy hasta que pulsas `Select movements`; entonces aparecen las casillas y la barra de acciones (justo encima de la lista, debajo de las cifras). Mientras estás en ese modo, **la etiqueta de categoría deja de ser pulsable**: un clic no puede significar dos cosas. Sales del modo y vuelve todo. Motivo: la F21 escondió el editor porque un mes tuyo tiene hasta 93 líneas y el extracto es para leer meses; 93 casillas permanentes lo desharían. | **Casillas siempre visibles en cada línea**, como en la cola de revisión: te ahorras un clic por tanda, a cambio de volver a convertir el extracto en una lista de trabajo. |
| 2 | **Un movimiento marcado se ve con una etiqueta gris `Not counted`** junto a la de `Transfer`, **y el importe en gris apagado**. Nada más: sin fondo de color, sin tachado y sin franja lateral. Motivo: filtrando por myinvestor casi todas las líneas del mes estarán marcadas, y cualquier marca vistosa convertiría el mes entero en un bloque de alarma. | **Fila con fondo o franja de color**: se ve desde más lejos, a cambio de que un mes de myinvestor parezca un error. |
| 3 | **Confirmación a partir de 20 movimientos**, el mismo umbral que ya fijaste en la F16 para la cola. Tu tanda típica (de 1 a 10, filtrando por cuenta y mes) **no verá nunca el diálogo**; una selección enorme por error, sí, y dice el número exacto. | **Sin confirmación** (total, desmarcar es un clic), o **bajarlo a 10** si prefieres que te pregunte más a menudo. |
| 4 | **Hay deshacer, y también vale volver a pulsar.** Tras cada acción queda una línea fija encima de la lista —`3 movements excluded from totals`— con un `Undo` sin cuenta atrás, que devuelve **exactamente esos** movimientos. Motivo: después de actuar la selección se vacía, y rehacer a mano una selección de 10 líneas es justo el trabajo que no vas a repetir. | **Sin `Undo`**: te quedas solo con «vuelve a seleccionarlos y pulsa la acción contraria», más simple de construir y más pesado de usar cuando te equivocas con una tanda larga. |
| 5 | **Un solo camino para escribir: siempre la petición de bloque**, también cuando has marcado un único movimiento. Motivo: un solo cuerpo de petición que vigilar, y es justo donde no puede colarse ni el estado ni la categoría. | **Dos caminos** (uno para un movimiento, otro para varios), como decía el criterio técnico original: dos sitios donde mantener la misma vigilancia. |

## ✅ Ya las cerraste tú (4)

- **Marcar en bloque, con selección múltiple.** No hay un gesto propio de la línea suelta.
- **Sin ayudas para encontrar los depósitos.** Se llega filtrando por la cuenta de
  myinvestor, como ya haces; no se inventa ningún buscador de «DEP.».
- **Solo desde el extracto.** En la cola de revisión no se puede marcar.
- **Nada se marca solo.** Ni reglas, ni heurísticas, ni sugerencias: la marca la
  escribes siempre tú.

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (5)

1. **La petición lleva dos cosas y solo dos: la lista de ids y la marca.** Se construye
   en una única función que no sabe escribir ni `status` ni `categoryId`, y hay un test
   que lee el cuerpo enviado letra por letra.
   ⚠️ *Efecto:* aquí importa más que en la F21, porque se escribe sobre varios de golpe
   y el extracto enseña también los confirmados.
2. **Solo viajan los que de verdad cambian.** Si seleccionas 10 y siete ya estaban
   marcados, la petición lleva tres. Así no se reescribe lo que ya estaba y el `Undo`
   devuelve exactamente lo que tocaste.
3. **Después de cada acción se pide el mes una vez, en segundo plano**, sin indicador de
   carga y sin vaciar la lista: las filas ya cambiaron al instante con lo que devuelve la
   propia acción, y ese refresco solo trae las tres cifras nuevas. Ni cifras desfasadas
   ni pantalla parpadeando. Las cifras **nunca** se calculan aquí: se restan en el
   backend.
4. **Si algo falla, lo dice en inglés con palabras nuestras** (nunca el mensaje del
   backend, que viene en español y nombra ids) y, cuando el fallo pudo haber escrito
   algo, **recarga el mes** en vez de afirmar que no pasó nada. Mismo criterio que la
   F16 y la F21.
5. **La parte que escribe en bloque se muda a la carpeta común** (hoy vive en la cola de
   revisión) para que las dos pantallas usen el mismo código, con las pruebas de la cola
   pasando sin tocar ni un test.

## 📌 Consecuencias que te tocan a ti (no son código)

- **La comprobación final escribe en tus datos reales y no se hará sin que tú lo digas**
  (T23 del plan): con tu visto bueno, uno o dos movimientos, foto con `curl` del
  movimiento **y de las sumas del mes** antes, marcar y desmarcar desde la pantalla, y
  foto después para ver que todo queda igual y que las cifras bajaron y volvieron en ese
  mismo importe. Sin visto bueno explícito, queda anotado como pendiente.
- **Marcar los 29 depósitos es trabajo tuyo, a mano:** filtras por la cuenta de
  myinvestor, mes a mes, y vas marcando. Están repartidos por varios meses, así que serán
  varias tandas cortas. Y lo mismo cada vez que importes movimientos nuevos de esa cuenta.
- **Con esta feature las cifras ya pueden ser honestas, pero la pantalla todavía no lo
  dice:** la nota permanente sigue avisando de que están infladas. La reescribe la
  feature siguiente, el interruptor del ruido, junto con esconder lo marcado.
- **Los 17 traspasos propios sin pareja** también se marcan aquí, uno a uno o en tanda:
  no hay nada automático que los reconozca.

## ⚠️ Incoherencias conocidas que se heredan

- **La nota fija seguirá diciendo que las sumas están infladas** aunque ya hayas marcado
  medio mes. Es deliberado: reescribirla es la feature siguiente.
- **El recuento y las cifras dejan de cuadrar a ojo:** «93 movements» sigue contando los
  marcados, pero las tres cifras ya no los incluyen. Quien lo explica del todo es el
  interruptor, que dirá cuánto se está dejando fuera.
- **`Undo` solo deshace la última tanda**, no un historial, y muere al cambiar de mes o
  de filtro.
- **La selección se vacía al cambiar de mes o de filtro.** Marcar todo myinvestor son
  varias tandas, una por mes.
