# Decisiones — F25 `month-at-a-glance`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** la entrada `Overview` del menú deja de estar vacía y enseña **un mes**:
una frase ya interpretada, y debajo lo que entró, lo que salió, el ahorro y la tasa de
ahorro; si entró y salió más o menos que de costumbre; y cuánto de ese gasto no tiene
categoría. **Solo mira:** ni una escritura. **No toca** el backend, ni la pantalla de
inicio, ni el extracto. **No trae** reparto por categoría ni la tira del año (queda el
sitio debajo). 15 requisitos, en el tope. Los textos van en inglés, como toda la app.

> **Dato que cambia el punto de partida.** Leí tus 36 meses hoy (solo lectura). Los doce
> últimos están limpios, pero **justo antes hay meses que no lo están**: julio y agosto
> de 2025 leen **11.527 € y 10.942 € de gasto**. Por eso cambiaste la media por la
> **mediana** (2026-10-02): aguanta un pico suelto. No aguanta un año entero alto: de
> octubre de 2025 a enero de 2026 el «mes habitual» de gasto sigue entre 4.073 y 6.793 €.

---

## 🔴 Confirma o corrige (6)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **La frase, lo primero bajo las flechas de mes, en euros enteros** (los céntimos van en las tarjetas). **Ahorro:** *«In January 2026, 3.114 € came in and 1.893 € went out: you saved 1.222 €, 39,2 % of what came in.»* **Déficit:** *«In August 2026, 2.590 € came in and 4.004 € went out: you spent 1.414 € more than came in.»* **Sin ingresos:** *«In {mes}, nothing came in and 967 € went out.»* **Sin movimientos:** *«No movements in October 2026. Your data ends on 11 Sept 2026.»* **Incompleto:** *«September 2026 is incomplete: your data ends on 11 Sept 2026. So far, 162 € came in and 967 € went out.»* | **Con céntimos también en la frase** (`2.590,26 €`): exacta, y más larga de leer. O la frase de ahorro **sin el porcentaje**, que ya está en su tarjeta. |
| 2 | **Un mes está incompleto si el movimiento más reciente de toda tu base es anterior a su último día.** Hoy ese movimiento es del 11-09-2026: septiembre está incompleto, agosto no. No uso el reloj ni finjo saber hasta cuándo importaste: solo digo la fecha del último dato que hay. En ese caso se ven las tres cifras («so far»), **la tasa es `—`** (*«Not shown: the month is incomplete.»*) y **no hay comparación**. | **«Incompleto = el mes en curso del calendario»:** hoy, 2 de octubre, daría septiembre por completo y enseñaría el −497 %. |
| 3 | **«Mes normal» se enseña con una etiqueta bajo `Money in` y otra bajo `Money out`:** `About usual` si la cifra está a menos de un **25 %** de tu mes habitual (la **mediana** de los doce anteriores), `More than usual` o `Less than usual` si se sale; al lado, *«34,9 % above your usual month (2.967,58 €)»*. El ahorro no lleva etiqueta: es la consecuencia. Con tus datos, **lo que entra** sale `About usual` en 6 de 11 meses y `More than usual` en 5 (los de ingreso extra). **El gasto casi nunca sale normal:** `Less than usual` de octubre a febrero, `About usual` solo en marzo, `More than usual` de abril a agosto (+35 a +90 %). Agosto: gasto `More than usual`, entrada `About usual` (12 % menos). | **Mover el umbral no cambia nada:** con 15 %, 25 % o 33 % salen las mismas 22 etiquetas; tu gasto se mueve mucho más que eso. **Solo el gasto**, sin etiqueta en lo que entra. O **volver a la media**. |
| 4 | **Los doce meses se piden uno a uno al backend, y la mediana la calcula la pantalla: es la única cifra que no viene hecha del backend.** Se acepta porque no existe endpoint que la dé, no quieres tocar el backend, y es el valor central de doce totales suyos (con doce, la media de los dos del centro), en céntimos exactos; **nunca se suman movimientos**. La pantalla lo dice: *«Your usual month is the middle value of the previous 12 months, worked out here from each month's totals.»* Coste: 15 peticiones la primera vez y 2 por cada mes que retrocedas (medido: 5 ms cada una); lo leído se guarda mientras la pantalla está abierta y se tira al salir o al importar. Con menos de doce meses con datos compara con los que haya y lo dice (*«…the middle value of the 5 previous months with data…»*; con uno solo, *«Your usual month is the only previous month with data.»*); con ninguno, *«No earlier months to compare with.»* | **Pedir al backend una consulta de meses seguidos** (se puede añadir al traspaso abierto de los recurrentes): la mediana sería suya y la tira del año la aprovecharía. No hace falta por velocidad; retrasa esta feature una sesión del backend. |
| 5 | **La línea de honestidad:** *«3.036,33 € of this month's 4.003,89 € spending has no category yet (75,8 %, 48 movements).»*, con una barra horizontal. Las dos cifras son del backend (el gasto del mes, y el mismo gasto pidiendo solo lo que no tiene categoría); el porcentaje es una entre otra. Si no se puede leer, lo dice en vez de callar. | **Solo el porcentaje**, sin importes ni recuento: más corta, y menos comprobable contra el extracto. |
| 6 | **Se llama `Overview` y se queda donde está en el menú** (entre `Transfers` y `Movements`): la entrada ya existe y hoy está vacía. Dirección `/overview?month=2026-08`: recargar y «atrás» conservan el mes. Mismas flechas y selector de mes que el extracto. **Añado, sin que lo pidieras, un enlace *«See the movements of August 2026»*** que abre el extracto en ese mes. | **Llamarla `Month`**, o **subirla justo debajo de `Net Worth`** (cambia el orden del menú). O **sin el enlace**. |

## ✅ Ya las cerraste tú (5)

- **«Mes normal» = la mediana de los doce meses anteriores** (corregido por ti el 2026-10-02; antes, la media).
- **El mes y el año son una sola pantalla;** esta feature hace el mes y no pinta nada debajo.
- **Patrimonio sigue siendo la pantalla de inicio.**
- **Sin reparto por categoría** hasta que haya más categorizado.
- **No se toca el backend y la pantalla no escribe nada.**

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (5)

1. **Las cifras del mes salen de la misma petición que hace el extracto** (`/api/movements` del mes, sin filtros), no de `/api/overview`: así cuadran por construcción, y además trae cuántos movimientos hay, que es lo que distingue un mes vacío de uno que suma cero.
2. **Reutiliza las flechas, el selector y el manejo del mes del extracto** sin tocar ni un archivo suyo.
3. **Si falla la comparación o la línea de honestidad, el mes se sigue viendo** y lo que falló lo dice en su sitio. Nunca se hace una mediana con «los meses que sí llegaron».
4. **Tras una importación la pantalla se refresca sola.**
   ⚠️ *Efecto:* es la única línea que se añade a una feature anterior (el importador), igual que ya hace con Patrimonio.
5. **Si cambias de mes más rápido que la red, gana el último.**

## 📌 Consecuencias que te tocan a ti (no son código)

- **La comparación es tan buena como limpios estén los doce meses anteriores.** Los traspasos a cuentas tuyas que no están importadas siguen contando como gasto hasta que los marques como que no cuentan, y eso ya lo puedes hacer en bloque desde el extracto. Empieza por julio de 2025 (11.527 € de gasto, con unos 10.000 € de traspasos a tus cuentas de inversión sin marcar); el «mes habitual» se corrige solo.
- **La mediana no arregla un año entero alto.** De finales de 2024 a agosto de 2025 más de la mitad de los meses pasan de 5.000 € de gasto; por eso octubre de 2025 a enero de 2026 salen `Less than usual` aunque sean meses corrientes. Se arregla marcando lo que no es gasto, o solo con el tiempo.
- **El 75,8 % de agosto sin categoría no baja solo:** baja vaciando la cola de revisión.
- **La comprobación final es contigo delante y de solo lectura:** seis meses (agosto, enero, septiembre y octubre de 2026; enero y febrero de 2024) contra la API y contra el extracto.
- **Si quieres la consulta de meses en el backend** (🔴 4), hay que pedirla antes de la tira del año.

## ⚠️ Incoherencias conocidas que se heredan

- **«Incompleto» mira toda la base, no cada banco.** Si un banco está importado hasta el día 30 y otro solo hasta el 10, el mes sale completo y le falta gasto. El frontend no puede saberlo.
- **La frase redondea a euros y las tarjetas no:** `1.414 €` arriba y `1.413,63 €` debajo.
- **Los primeros meses de 2024 se comparan con muy pocos:** febrero de 2024, con uno solo. Lo dice, pero la etiqueta vale poco.
- **Tu idea de agosto decía que el patrimonio asomaría en esta pantalla como una cifra clicable.** No lo pediste aquí y no está.
- **La aportación automática a la cartera (282 € al mes) sigue contando como gasto.**
