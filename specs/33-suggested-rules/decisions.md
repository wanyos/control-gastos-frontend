# Decisiones — F33 `suggested-rules`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué pediste:** una lista de reglas propuestas, de la que más movimientos recoge a la que
menos; en cada una eliges la categoría, se crea la regla, ves qué movió y la propuesta
desaparece. Para quitarte el grueso de `Otros gastos` decidiendo unas sesenta.

**Qué hace esto:** añade esa lista dentro de `Rules` y corrige lo que hoy da por hecho que
crear una regla no mueve nada (desde las features 60 y 61 del backend, sí mueve). **No
toca** el backend ni la pregunta al cambiar una categoría a mano (eso es la feature 34).
16 requisitos, uno por encima del tope: seis son de corregir lo que ya existía (punto 6).

---

## 🔴 Confirma o corrige (6)

La 1 y la 2 son las que me dejaste; la 5 la decidió el leader por ti; la 3, la 4 y la 6 no las pediste.

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Cómo se dibuja:** en `Rules`, un bloque `Suggested rules` encima de tus reglas (que pasan a tener el título `Your rules`). Cada propuesta, una fila: el texto, `Expenses` o `Income`, `73 movements`, un botón `Show the 73 movements` (salen plegados), un desplegable de categoría que empieza vacío y el botón `Create rule`, apagado hasta que eliges. | **Dos pestañas** en `Rules` (propuestas / tus reglas), para no tener 67 filas encima de tus reglas. O abrir la ventana de crear regla en cada propuesta: dos clics más por decisión. |
| 2 | **El texto de la propuesta no se puede cambiar aquí.** Es el único con el que el número que ves es exactamente el que se mueve. | Editable, recalculando el número al escribir: es lo que construye la feature 34; aquí serían 2 o 3 requisitos más. |
| 3 | **Dónde ves lo que movió:** el número, en la línea verde que se queda a la vista aunque hayas bajado (la de `Review` desde la feature 27, ahora también en `Rules`): `Rule “…” → Educación created: 73 movements categorized.` La lista de cuáles, en el recuadro de arriba que dejó la feature 30, igual en `Rules` y en `Review`. | Pintar el resultado en el sitio de la propuesta usada: lo ves justo donde estabas, pero hay que hacer un recuadro nuevo en vez de reutilizar el que ya conoces. |
| 4 | **«Si falla, no ha cambiado nada» solo se puede cumplir** si el servidor rechaza la regla o no se llega a él. Si la regla se crea pero mover sus movimientos se corta a mitad, la regla queda y lo movido se queda: te lo dice con `Not all of its movements could be moved; the rest will move the next time you create or change a rule.` (*No se pudieron mover todos; el resto se moverá la próxima vez que crees o cambies una regla.*) | Borrar la regla sola en ese caso: otra escritura automática, y lo ya movido no vuelve. No lo recomiendo. |
| 5 | **`Apply rules now` se quita, pero la línea verde se queda** y dice cuántos movió (en la feature 27 pediste ver esa línea desde abajo). `Apply rules` de `Rules` sigue igual. | Quitar la línea entera: tras crear una regla desde una fila de abajo no verías nada sin subir. |
| 6 | **Añadido:** cambiar una regla (`Edit` → `Save`) también mueve movimientos, así que te enseña lo que movió en el mismo recuadro; `Review` y `Movements` se refrescan solos tras crear o cambiar una regla; y se corrigen dos frases que ya no son verdad (abajo). | Dejarlo para otra feature: mientras tanto, `Edit` movería movimientos sin decírtelo y `Movements` enseñaría categorías viejas hasta recargar. |

**Textos nuevos o cambiados** (todos en design §5): `3 movements you categorized by hand also contain this text. They will not move.` (*3 movimientos que categorizaste a mano también contienen este texto. No se moverán.*) · `No suggested rules right now.` (*Ahora no hay reglas propuestas.*) · cabecera de `Rules`: `…Creating or changing a rule also moves the movements whose category was set when the import was closed.` (*Crear o cambiar una regla también mueve los movimientos cuya categoría se puso al cerrar la importación.*) · nota de la ventana de crear regla: `Saving also moves the matching movements whose category was set when the import was closed. They are not in this count.` (*Al guardar también se mueven esos; no están en este número.*)

## ✅ Ya las cerraste tú (5)

- **Vive dentro de `Rules`.** · **No se descartan propuestas**: la que no uses sigue saliendo.
- **La categoría la eliges tú siempre**; la aplicación no propone ninguna.
- **No se toca el backend.** · **`Apply rules` se queda.**

## 🧪 Cómo se comprobará que está hecho

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Veo la lista, cada una con su texto y cuántos recogería | la prueba de la fila y la de la pantalla con la lista en orden |
| Puedo ver los movimientos antes de decidir | la prueba que despliega una propuesta sin pedir nada al servidor |
| Elijo una categoría, se crea, veo cuántos y cuáles | el recorrido en un navegador, con el backend imitado |
| La propuesta usada desaparece | la prueba que la quita y vuelve a pedir la lista |
| Si no me interesa, la dejo y sigo | que no hay botón de descartar y que las demás siguen |
| Me avisa de los puestos a mano | la prueba de la frase de los categorizados a mano |
| Si falla, me lo dice y no cambia nada | rechazo y sin conexión: la frase en la fila y nada más se mueve |
| *(añadido)* puntos 4, 5 y 6 y que la categoría empieza vacía | una prueba para cada uno |

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (4)

1. **La respuesta de crear o cambiar una regla tiene que traer lo que movió**; si no, se trata como respuesta ilegible, como ya pasa al aplicar. Por eso cambian las respuestas imitadas de varias pruebas, también dos de navegador.
2. **De dónde salió la categoría de cada movimiento no se lee todavía**: es de la feature 34. Leerlo de más no rompe nada.
3. **Un check de la feature 27 cambia de nombre**: su prueba mencionaba `Apply rules now`. Lo cambia el leader al aprobar.
4. Aplicar las reglas desde `Rules` también refrescará `Movements`, que hoy no lo hace.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Cada `Create rule` mueve movimientos de tus datos y no se deshace desde la aplicación**: borrar la regla no los devuelve. La primera propuesta mueve 73.
- Probarlo en el navegador con tus datos (la prueba automática usa datos inventados).

## ⚠️ Incoherencias conocidas que se heredan

- Crear una regla desde `Movements` no dice allí cuántos movió (lo ves al ir a `Review` o `Rules`); lo resuelve la feature 34.
- El número de la ventana de crear regla sigue contando solo los pendientes sin categoría; ahora lo dice. Contarlo exacto, si lo quieres, encaja en la feature 34.
