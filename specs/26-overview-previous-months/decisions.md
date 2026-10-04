# Decisiones — F26 `overview-previous-months`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** en `Overview`, debajo de la parte del mes, añade veinticuatro meses, uno
por fila, con lo que entró, lo que salió y el ahorro de cada uno, y encima una frase con
lo ahorrado en todo ese tiempo. **Solo mira.** **No toca** el backend, ni el menú, ni un
solo texto de la parte del mes. 15 requisitos, en el tope. Textos en inglés, como toda
la app. No propongo ningún nombre corto para esto: aquí es «los meses anteriores, debajo
del mes».

> **Lo que no he podido comprobar.** Hoy el backend no responde en `localhost:3000`, así
> que no he leído nada nuevo. Trabajo con las cifras de marzo de 2025 a septiembre de
> 2026, que ya están en el repositorio. **No tengo las de octubre de 2024 a febrero de
> 2025** (cinco de los 24 meses): tu frase real de ahorro y la barra más larga salen en
> la comprobación final.

---

## 🔴 Confirma o corrige (6)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Cómo se dibuja: las dos cosas, en la misma fila.** Una fila por mes, del más reciente al más antiguo: el nombre del mes, dos barras horizontales (lo que entró y lo que salió) y tres cifras con céntimos (`Money in`, `Money out`, `Savings`). El ahorro va en rojo y con signo menos cuando gastaste más de lo que entró, y en verde cuando ahorraste: con las cifras que tengo, 9 de 18 meses salen en rojo. Título: `Month by month`. | **Columnas verticales, una al lado de otra**, como un gráfico clásico: se parece más a tu «uno al lado de otro», pero con 24 meses las cifras no caben junto a las barras y harían falta el gráfico y, aparte, una tabla. |
| 2 | **Todas las barras comparten una escala: la cifra más alta de esos meses llena el ancho.** Los picos aplastan al resto y no lo arreglo con un truco: con lo que conozco, el tope son los 11.527 € de gasto de julio de 2025, y agosto de 2026 (4.004 €) ocupa un 35 % del ancho y enero (1.893 €), un 16 %. El pico de 20.680 € (agosto de 2024) queda fuera de los 24 meses. La cifra exacta va siempre al lado. | **Recortar la escala** (por ejemplo, al doble de tu mes habitual) y pintar llenas, con una marca, las barras que se pasan: los meses corrientes se leen mejor, pero el dibujo deja de ser proporcional y hay que elegir el corte a mano. |
| 3 | **Qué meses: siempre los 24 que acaban en el mes de tu último dato** (hoy, de octubre de 2024 a septiembre de 2026). No se mueven al pulsar: solo cambia cuál está señalado (borde de color y la etiqueta `Shown above`). **Sin que lo pidieras:** si el mes de arriba no está entre ellos —hoy octubre de 2026, que es donde abre la pantalla, y de enero a septiembre de 2024— no se señala ninguno y lo dice: *«October 2026 is not one of these months.»* | **Los 24 anteriores al mes de arriba:** el de arriba sería siempre la primera fila y todas las filas se correrían en cada pulsación. Igual de fácil de hacer. |
| 4 | **Lo ahorrado: una frase, lo primero bajo el título, en euros enteros, y la suma la hace el backend.** Se le pide en una sola petición todo el periodo; la pantalla no suma nada, así que no tiene nada que avisar. Con los 18 meses que tengo: *«From October 2024 to August 2026, 60.136 € came in and 80.935 € went out: you spent 20.799 € more than came in.»* | **La que había apuntado el leader y no habías visto:** sumar aquí los 24 ahorros y decirlo en pantalla (*«…added up here from each month's totals»*). Una petición menos, y una segunda cifra calculada en la pantalla, además de la mediana. |
| 5 | **Mes incompleto y mes vacío.** Incompleto (mismo criterio que la parte del mes): etiqueta `Incomplete`, sus tres cifras, **sin barras** y *«Data ends on 11 Sept 2026»*; no entra en la escala **ni en lo ahorrado**, y se dice: *«September 2026 is left out: it is incomplete.»* Sin movimientos: *«No movements»*, sin cifras ni barras; un mes que suma cero sí enseña `0,00 €`. | **Incompleto con barras atenuadas** y contando en lo ahorrado «hasta hoy»: septiembre restaría 805 € y parecería un mes en el que casi no gastaste. |
| 6 | **Pulsar el nombre de un mes lo pone arriba** por el mismo camino que las flechas: cambia la dirección y «atrás» vuelve. **Sin que lo pidieras:** la página sube hasta la parte del mes; si no, pulsando la fila 20 no verías qué cambió. | **Sin subir:** la página se queda donde estaba. |

## ✅ Ya las cerraste tú (6)

- **Veinticuatro meses**, y **sí quieres ver lo ahorrado** a lo largo de ellos.
- **Va en `Overview`, debajo del mes;** sin entrada nueva en el menú.
- **No se toca el backend y la pantalla no escribe nada.**
- **Sin reparto por categoría** ni fijo frente a variable.
- **Pulsar un mes para verlo arriba** y **mes sin movimientos como vacío, no como cero:** las propuso el agente y las aprobaste con el borrador el 2026-10-03.
- **La parte del mes no cambia.**

## 🧪 Cómo se comprobará que está hecho

> Los `checks` de `feature_list.json`: se ejecutan al cerrar y, si uno falla, la
> feature no se cierra. Si falta un caso, es aquí donde se pide.

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Debajo del mes veo los meses anteriores… | el test que abre agosto de 2026 y cuenta 24 filas debajo, con sus cifras |
| Distingo… qué meses gasté más de lo que ingresé | el test que busca las nueve filas en rojo y con signo menos |
| El mes que tengo arriba está señalado | el test que comprueba que hay una fila señalada, y solo una |
| Pulso otro mes y pasa a ser el de arriba | el test que pulsa enero de 2026 y mira la dirección, la frase de arriba y «atrás» |
| Un mes incompleto está marcado como incompleto | el test de septiembre de 2026: etiqueta, cifras y ninguna barra |
| Un mes sin movimientos se ve como vacío | el test que lo distingue de un mes que suma `0,00 €` |
| Las cifras de cada mes son las mismas… | dos tests: la fila y la parte del mes enseñan lo mismo; cada mes se pide una sola vez |
| Veo lo que he ahorrado… | el test de la frase y de que la petición abarca el periodo entero |
| *(añadido)* No cambia nada de la parte del mes | sus archivos son idénticos a los de la F25 y sus tests pasan |
| *(añadido)* Solo mira | la prueba en navegador: toda la visita manda solo lecturas |

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (4)

1. **Coste: entrar a un mes pasa de 15 a 27 peticiones** (11 meses que la parte del mes no pedía y 1 de lo ahorrado). El leader midió 17 en el navegador con las 15 de hoy: esas 2 de más no son de esta pantalla. No he vuelto a medir el tiempo; en la F25 eran unos 5 ms por petición. Cada mes se pide una sola vez y lo usan las dos partes. Después, moverte por los últimos doce meses baja de 2 peticiones a 1.
2. **Si falla un mes, no se pintan filas a medias:** *«Couldn't load these months.»* y `Try again`. Si falla la suma, las filas siguen y lo dice.
3. **Tras una importación se vuelve a leer,** sin tocar el importador.
4. **Cambian cinco comprobaciones de los tests de la F25,** y solo esas: las que contaban las peticiones de toda la pantalla o afirmaban que debajo del mes no había nada.
   ⚠️ *Efecto:* con un mes vacío arriba (hoy, octubre) ya no se ve «solo su frase»: debajo están los 24 meses.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Lo ahorrado va a salir muy negativo hasta que marques los traspasos a tus cuentas de inversión.** De marzo de 2025 a agosto de 2026 suma −20.799 €, casi todo por cuatro meses (marzo, abril, julio y agosto de 2025: −26.376 €); los últimos doce meses completos suman +4.017 €. Se corrige marcándolos desde el extracto, igual que la comparación del mes.
- **La comprobación final es contigo delante y de solo lectura:** cuatro filas contra la API, la frase contra una petición del periodo, y de paso las cifras de octubre de 2024 a febrero de 2025, que hoy no tengo.

## ⚠️ Incoherencias conocidas que se heredan

- **Las barras de los meses corrientes quedan cortas** mientras haya picos de más de 10.000 €.
- **«Incompleto» mira toda la base, no cada banco** (igual que en la parte del mes).
- **La frase redondea a euros y las filas no.**
