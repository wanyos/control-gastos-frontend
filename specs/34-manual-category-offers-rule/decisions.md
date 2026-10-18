# Decisiones — F34 `manual-category-offers-rule`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué pediste:** «tengo 20 movimientos que son de lo mismo, con darle la categoría a uno
automáticamente se ponga para todos». Al cambiar a mano la categoría de un movimiento en
`Movements` o en `Review`, que te pregunte si la pones en todos los que contienen un
texto, diciéndote cuántos y cuáles; si dices que sí se crea la regla, si dices que no solo
cambia ese.

**Qué hace esto:** eso, y además cada movimiento cuya categoría puso el cierre de la
importación lo dice en pequeño. **No toca** el backend, la ventana de `Create rule` ni la
pantalla `Rules`. 15 requisitos.

---

## 🔴 Confirma o corrige (6)

La 1 es la que me dejaste; la 2 y la 6 salen de tus respuestas; la 3, la 4 y la 5 no las pediste.

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Dónde sale la pregunta:** debajo de la línea verde del cambio (`Categorized as …` + `Undo`), en el mismo bloque que se queda pegado bajo la barra de arriba. Se ve aunque cambies una fila del final y no tapa la línea ni el `Undo`. Botones `Create rule` y `No, only this one` (*No, solo este*). | **Debajo de la fila:** más cerca, pero si tienes un filtro y la fila sale de la lista al cambiarla, la pregunta se va con ella. **Una ventana:** tapa la línea y el `Undo`. |
| 2 | **El texto que se ofrece lo calcula la aplicación**, con los cinco pasos que el contrato describe para la lista de propuestas. El backend no lo da para un movimiento suelto: la lista solo trae conceptos con 3 o más movimientos sin poner a mano, y el tuyo ya es «puesto a mano» al cambiarlo. **Riesgo:** en conceptos raros podría salir un texto algo distinto del que pondría la lista; lo puedes corregir y el número se recalcula. | **Pedir al backend un dato con el texto de cada movimiento** (otra sesión del backend; esta feature espera). |
| 3 | **No te pregunta** si ningún otro movimiento se movería, si ya hay una regla con ese texto, si el texto sale de menos de 5 letras (la lista tampoco lo propondría) o si la comprobación falla. Si una regla con otro texto ya recoge ese concepto, casi siempre cae en «ninguno se movería». | **Preguntar siempre** y decir `No other movement would move…` (*ningún otro se movería*): una pregunta más por cada cambio suelto. |
| 4 | **Al dar categoría a varias filas a la vez** (barra de `Review`) no pregunta: cada fila puede dar un texto distinto. | Preguntar solo si todas las marcadas dan el mismo texto. |
| 5 | **Si cambias el texto y ya no movería ninguno**, te lo dice y `Create rule` sigue encendido: la regla sirve para lo que importes después. Con un texto que ya usa otra regla, o mientras comprueba, está apagado. | Apagar `Create rule` también cuando no movería ninguno. |
| 6 | **De dónde salió la categoría:** solo cuando la puso el cierre de la importación, `Set when the import was closed` (*Puesta al cerrar la importación*) en gris pequeño, en la línea de la cuenta bajo el concepto, en `Movements` y en `Review`. | Un icono pequeño con ese texto al pasar el ratón: ocupa menos y se ve menos. |

**Textos de la pregunta** (todos en design §6): `Use Educación for the other movements that contain this text too?` (*¿Usar también Educación en los otros movimientos que contienen este texto?*) · `19 other movements would move to Educación.` (*Otros 19 pasarían a Educación.*) · `Movements you categorized by hand, or that another rule already categorized, do not move.` (*Los que pusiste a mano o ya puso otra regla no se mueven.*) · `Another rule already uses this text.` (*Otra regla ya usa este texto.*) · `Couldn't check which movements would move.` (*No se pudo comprobar.*)

## ✅ Ya las cerraste tú (4)

- **El texto por defecto es el que propondría la lista de propuestas**, y lo puedes cambiar antes de decidir.
- **El origen de la categoría solo se enseña cuando es el cierre de la importación.**
- **No se crea ninguna regla sin tu sí.** · **No se toca el backend.**

## 🧪 Cómo se comprobará que está hecho

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Cambio la categoría y me pregunta | las pruebas que cambian una fila en `Review` y en `Movements` y ven la pregunta |
| Antes del sí, veo cuántos y cuáles | la prueba de la pregunta: número y lista, sin crear nada |
| Puedo cambiar el texto y se actualiza | la prueba que edita el texto, también en un navegador con el backend imitado |
| Si digo que sí, se crea y veo cuántos | el recorrido en un navegador en `Movements`, y la prueba de `Review` |
| Si digo que no, solo cambia ese | la prueba que comprueba que solo salió el cambio de ese movimiento |
| Si no se movería ninguno, no pregunta | la prueba sin ninguno, y la que dice «ninguno» al editar |
| No pregunta si ya hay regla con ese texto | la prueba con el backend diciendo que ya existe |
| *(añadido)* puntos 2, 4 y 6, que no tapa la línea ni el `Undo`, y un fallo al crear | una prueba para cada uno |

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (3)

1. **`Movements` enseña ahora la línea verde de la regla creada**, como `Review`; también al crear desde la ventana de `Create rule`. Resuelve lo que dejó pendiente la feature 33.
2. **El número de la pregunta es solo lo que movería la regla nueva.** La línea verde de después cuenta todo lo que movió crearla: casi siempre el mismo número; puede ser mayor si había pendientes de otras reglas.
3. Si el backend no mandara el origen de la categoría, la etiqueta no sale y nada más se rompe.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Cada `Create rule` de la pregunta mueve movimientos de tus datos y no se deshace desde la aplicación**: borrar la regla no los devuelve.
- Probarlo en el navegador con tus datos (las pruebas automáticas usan datos inventados); el leader lo apunta como cabo suelto.

## ⚠️ Incoherencias conocidas que se heredan

- En `Review`, al decir que sí se pierde el `Undo` del cambio a mano (crear una regla recarga la lista desde la feature 33).
- Si cambias un movimiento del cierre de la importación y pulsas `Undo`, vuelve a su categoría pero queda como «puesta a mano»: ninguna regla lo moverá después. Es del backend.
