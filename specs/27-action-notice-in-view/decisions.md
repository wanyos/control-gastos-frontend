# Decisiones — F27 `action-notice-in-view`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué te pasó:** en `Review` confirmaste una fila con la página bajada y no viste ni la
línea `1 movement confirmed` ni su `Undo`: estaban arriba, fuera de la pantalla. En
`Movements` te pasó parecido y además tomaste el botón `Undo` por uno de recargar.

**Qué hace esto:** la línea que dice lo último que hiciste, con su botón, se ve desde
donde estés en `Review`, `Movements` y `Transfers`, y el botón `Undo` deja de llevar la
flecha curva. **No toca** el backend, ni qué hace cada acción, ni qué deshace el `Undo`,
ni cuánto dura. 12 requisitos.

---

## 🔴 Confirma o corrige (5)

Las cinco son decisiones mías; las tres primeras son las que me dejaste a mí.

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Cómo se ve: al bajar, la línea se queda pegada justo debajo de la barra de arriba** (la del título de la pantalla y el botón `Import`, que ya se queda fija). Arriba del todo está donde está hoy, sin cambios. Vale igual para el mensaje de un fallo y para la línea verde de `Apply rules now`. | **Junto a la fila que tocas:** descartada, porque al confirmar en `Review` la fila sale de la lista y no queda fila junto a la que ponerla. **Pegada al borde de abajo de la ventana:** taparía las últimas filas, que es donde hiciste la prueba. |
| 2 | **El botón: se quita la flecha curva y queda la palabra `Undo`, con fondo y borde**, como el botón `Select movements`. Hoy es una flecha y la palabra, sin borde. | **Otro icono junto a la palabra:** habría que elegirlo contigo; el actual ya es el de «deshacer» de la colección de iconos y lo leíste como recargar. |
| 3 | **Una pieza común y pequeña, que solo hace lo de quedarse pegada** (un archivo nuevo, `src/shared/components/StickyBelowTopBar.vue`). Cada pantalla conserva su línea propia, tal como está. | **Una sola línea común para las tres pantallas:** se tocan más archivos y sus tests para no ganar nada que veas. |
| 4 | **Para que no te tape la fila:** la línea pegada ocupa un renglón y tiene fondo, así que las filas pasan por detrás como pasan bajo la barra de arriba. **Sin que lo pidieras:** si la fila que acabas de cambiar queda justo debajo, la página sube los píxeles justos para que se vea entera. | **No mover nunca la página:** más simple; la línea podría tapar parte de esa fila hasta que muevas la rueda. |
| 5 | **Marcar que un movimiento no cuenta: seguirás teniendo que subir a pulsar `Exclude from totals`.** Ese botón está encima de la lista y esta feature no lo mueve. Lo que cambia: la línea `1 movement excluded from totals` y su `Undo` te siguen cuando vuelves a bajar. | **Que la barra de `Exclude from totals` también se quede a la vista al bajar** (y la de `Confirm N movements` en `Review`): es más trabajo y la parte pegada bajo la barra de arriba ocuparía más sitio. Si lo quieres, propongo que sea otra feature. |

## ✅ Ya las cerraste tú (5)

- **Entra `Transfers`** (11 de octubre).
- **Entra la línea de `Review` tras crear una regla** (11 de octubre).
- **No cambia qué hace cada acción ni qué deshace el `Undo`.**
- **El `Undo` dura lo mismo que ahora.**
- **No se toca el backend.**

## 🧪 Cómo se comprobará que está hecho

> Los `checks` de `feature_list.json`: se ejecutan al cerrar y, si uno falla, la
> feature no se cierra. Si falta un caso, es aquí donde se pide.

Casi todo se comprueba en un navegador de verdad, con el backend imitado: una prueba sin
navegador no sabe qué queda dentro de la pantalla.

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| En `Review`, bajo hasta el final, pulso `Confirm`… | la prueba que baja al final, confirma la última fila y mira que la línea y el `Undo` están dentro de la pantalla y sin nada encima |
| Lo mismo al poner una categoría… | la misma prueba, poniendo una categoría a la última fila |
| En `Movements`, lo mismo… | dos pruebas: cambiar la categoría de la última línea; y marcar una línea, pulsar `Exclude from totals`, volver a bajar y ver la línea y el `Undo` |
| Si estoy arriba del todo, lo sigo viendo… | la prueba que mira que arriba la línea está entre los mismos bloques que hoy; y otra de que, sin nada que decir, no se pinta nada |
| Pulso deshacer desde ahí abajo y la fila vuelve | la prueba que pulsa `Undo` desde abajo, ve volver la fila y que la página no se ha ido arriba |
| El botón de deshacer no se confunde con uno de recargar | — a medias: se comprueba que lleva la palabra `Undo`, borde y ningún icono. Si se confunde o no, solo lo puedes decir tú mirándolo |
| Si lo que hice falla, el mensaje de error también lo veo | la prueba que hace fallar la acción desde abajo en las tres pantallas |
| *(añadido)* `Transfers` y la línea de `Apply rules now` | una prueba para cada una, desde abajo |
| *(añadido)* No me tapa la fila | la prueba que cambia una fila que está justo bajo la barra de arriba y mira que queda entera debajo de la línea |
| *(añadido)* No cambia qué hace cada acción | los doce archivos que lo deciden son idénticos a los de hoy |

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (4)

1. **Comprobado antes de proponerlo.** El 11 de octubre, en un navegador (Chromium, ventana de 1280×720, sin backend), un elemento de prueba colocado donde van las líneas se queda pegado bajo la barra de arriba con la página bajada 5.000 px, en las tres pantallas. **No lo he probado con las líneas reales ni con una lista cargada.**
2. **En `Review` las dos líneas siguen sin salir a la vez:** la de la regla recién creada y la de la última acción, como hoy.
3. **La línea pegada queda por debajo de las ventanas de diálogo,** no encima.
4. **Las pruebas que ya había no se tocan** y tienen que seguir pasando. Hay un archivo nuevo de pruebas en navegador.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Repetir tú la prueba que falló:** el paso 12 de `Review` en `docs/guia-de-uso.md` (confirmar una fila con la página bajada) y el `Undo` de `Movements`. Y decir si el botón nuevo se reconoce.
- **Decidir el punto 5:** si quieres que los botones de `Exclude from totals` también se vean desde abajo, hay que apuntarlo como idea de mejora.

## ⚠️ Incoherencias conocidas que se heredan

- **Las acciones sobre varias filas siguen pidiendo subir:** `Exclude from totals`, `Include in totals`, `Confirm N movements` y `Apply category` están encima de la lista.
- **Quedan fuera** los mensajes de `Rules` y de `Import`, y la línea gris de `Review` que avisa de que la página pedida ya no existe.
