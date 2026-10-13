# Decisiones — F30 `rules-applied-result`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué anotaste en la revisión:** aplicaste las reglas en `Rules`, cerraste la ventana
`Rules applied`, fuiste a `Review` y escribiste «no veo que haya cambiado nada». Sí
había cambiado (los pendientes sin categoría bajaron de 1.373 a 1.011), pero nada en
pantalla lo decía, y los números de la ventana se pierden al cerrarla.

**Qué hace esto:** al cerrar la ventana queda a la vista, en `Rules` y en `Review`,
cuántos movimientos se categorizaron, con la lista de cuáles y la de «choques» (tu
palabra: movimientos a los que les casan dos reglas de categorías distintas). Y `Review`
dice siempre cuántos pendientes siguen sin categoría. **No toca** qué movimientos tocan
las reglas, ni confirma nada, ni añade un deshacer. 13 requisitos (14 si dices sí a la
decisión 2).

**La lista la devuelve ya el backend al aplicar,** como pediste; lo hizo en su
feature 56. Esta feature solo la lee y la enseña.

---

## 🔴 Confirma o corrige (6)

**Solo la 2 y la 3 necesitan tu respuesta: son nuevas.** La 1 es lo que pediste. La 4,
la 5 y la 6 las aprobaste el 2026-10-12 y no han cambiado.

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **De dónde sale la lista:** de la respuesta del backend al aplicar, que trae cada movimiento categorizado con su fecha, concepto, importe y categoría. **Coste:** aplicar cuesta 1 petición, como hoy. | Ninguna: es lo que pediste el 2026-10-12. |
| 2 | **Propuesta mía, no pedida y no dada por hecha:** que cada fila de la lista enseñe además el texto de la regla que le casó (`“colmado norte”`). El backend lo manda ya con cada movimiento, y sirve para lo que querías la lista: ver si una regla hace lo que creías. **Solo se hace si dices sí.** | **Decir que no:** la fila queda como la aprobaste (fecha, concepto, importe y categoría). No cambia nada más. |
| 3 | **Si la respuesta del backend llega mal** (sin lista, o con una lista que no tiene tantos movimientos como el número que la acompaña): no se enseña ningún recuadro y la ventana dice lo que ya dice cuando algo falla al aplicar: que puede haber movimientos ya categorizados y que `Review` se ha recargado. No debería pasar nunca: el backend promete que cuadra siempre. | **Enseñar los números sin lista,** con una frase que diga por qué no la hay (un requisito y un texto más). |
| 4 | **Dónde se enseña:** en un recuadro debajo del título, el mismo en `Rules` y en `Review`. La lista de categorizados y la de choques están plegadas, cada una tras su botón. Son de solo lectura: para corregir un movimiento, lo buscas en `Review`. La ventana `Rules applied` no cambia. | **Solo en la pantalla donde aplicaste:** un sitio menos; al ir a `Review` volverías a no ver nada. |
| 5 | **Cuánto tiempo sigue a la vista:** hasta que pulses `Dismiss`, apliques otra vez, o recargues o cierres la pestaña. Lleva la hora (`Rules applied at 10:42`), así sigue siendo cierto aunque después cambies movimientos a mano. | **Quitarlo en cuanto cambies cualquier movimiento:** más estricto, pero lo pierdes al primer arreglo, justo cuando lo estás usando para repasar. |
| 6 | **Tras recargar la página no queda nada del resultado.** El número de pendientes sin categoría de `Review` sí, porque se vuelve a pedir. | **Guardarlo en el navegador y enseñarlo con su hora:** contradice tu «no me enseñes como recién categorizado algo que ya no lo es». |

**Textos nuevos en pantalla**

| En la aplicación | En castellano |
|---|---|
| Rules applied at 10:42: 362 movements categorized. | Reglas aplicadas a las 10:42: 362 movimientos categorizados. |
| Rules applied at 10:42: no movements were categorized. | Reglas aplicadas a las 10:42: no se categorizó ningún movimiento. |
| 1011 still without a matching rule · 3 conflicts | 1011 siguen sin regla que les case · 3 choques |
| `Show the 362 movements` / `Hide the movements` | Enseñar los 362 movimientos / Esconder los movimientos |
| `Show the 3 conflicts` / `Hide the conflicts` · `Dismiss` | Enseñar los 3 choques / Esconder los choques · Quitar |
| 1011 pending movements have no category. | 1011 movimientos pendientes no tienen categoría. |
| Every pending movement has a category. | Todos los movimientos pendientes tienen categoría. |

## ✅ Ya las cerraste tú (5)

- **Qué movimientos se categorizaron lo dice el backend,** no lo deduce la aplicación
  comparando lo que había antes y después.
- **Te basta con verlo justo después de aplicar;** volver otro día queda fuera.
- **Lo que categorizan las reglas al importar queda fuera.**
- **La lista de choques sigue a la vista igual que la de lo categorizado.**
- **Sin deshacer, sin confirmar nada, sin cambiar qué tocan las reglas.**

## 🧪 Cómo se comprobará que está hecho

> Los `checks` de `feature_list.json`: se ejecutan al cerrar y, si uno falla, la
> feature no se cierra. Si falta un caso, es aquí donde se pide.

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Aplico, cierro la ventana y veo cuántos | la prueba que hace tu recorrido en el navegador con un backend simulado: aplica en `Rules`, cierra, ve el número, va a `Review` y lo sigue viendo |
| Puedo ver la lista, cada uno con su categoría | dos pruebas: la que comprueba que la lista guardada es la que mandó el backend, y la que la despliega y mira la categoría de cada fila |
| Si no se categorizó ninguno, me lo dice | la prueba que espera `no movements were categorized` y ningún botón de lista |
| Sin aplicar nada, en `Review` veo cuántos quedan | la prueba que abre `Review` y espera la frase con el número |
| Si recargo, lo que veo sigue siendo verdad | la prueba de que al empezar de cero no hay resultado ni nada guardado en el navegador |
| *(añadido)* Aplicar no confirma nada | la prueba de que al aplicar sale una sola petición, la de aplicar |
| *(añadido)* Si la respuesta del backend llega mal, no se enseña nada (decisión 3) | tres pruebas: una respuesta sin lista se rechaza, una con otro número de movimientos también, y en los dos casos no queda resultado y la ventana dice que algo falló |
| *(añadido)* Lo que categorizan las reglas al importar sigue fuera | la prueba de que el informe de importar se lee igual cuando trae la lista nueva, y no la guarda |
| *(añadido)* Lo de la feature 27 sigue igual | dos pruebas: aplicar sigue borrando el `Undo` y las casillas; y el recuadro nuevo no se mete en la línea que se queda bajo la barra de arriba |
| La regla de cada fila (decisión 2, solo si dices sí) | — sin check: llevaría su prueba, que ejecuta el reviewer, pero no se añade un check hasta que respondas |

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (4)

1. **El número de `Review` cuesta una petición más**, pequeña (pide un solo movimiento
   y lee el total). No sale de las que la pantalla ya hace: esas llevan tus filtros.
   Se vuelve a pedir tras cada acción, cada `Undo` y cada aplicación de las reglas.
2. **Aplicar vuelve a costar una sola petición.** Ya no hay lecturas antes ni después,
   ni lista que pueda salir equivocada porque otra pestaña cambie algo a la vez: la
   lista la escribe el mismo backend que categoriza.
3. **La pantalla de importar no se toca.** Su respuesta trae ahora la misma lista y la
   aplicación la ignora; lo he leído en el código y una prueba nueva lo demuestra.
4. **Lo de la feature 27 no se toca:** la línea de la última acción y la de la regla
   creada siguen como están, y aplicar sigue borrando el `Undo` y las casillas.

## 📌 Consecuencias que te tocan a ti (no son código)

- Al cerrar, aplica las reglas con tus datos y abre la lista: es la primera vez que la
  aplicación lee la lista del backend real; las pruebas usan un backend simulado.
- **Se retiran dos checks de features cerradas,** al implementar esta: el último de la
  27 y el último de la 29, que exigen que archivos de `Review` y de `Rules` sigan
  idénticos a un commit, y esta feature los edita (lección 3). Decidido por el leader,
  contigo informado. Ningún check de esta feature es de ese tipo.
- `docs/guia-de-uso.md` se corrige donde dice que no se sabe cuáles se categorizaron y
  en el paso donde anotaste que no veías nada; tus anotaciones (`--`) no se tocan.

## ⚠️ Incoherencias conocidas que se heredan

- **El número del menú sigue sin bajar al aplicar, y `In` / `Out` / `Net` no se
  mueven:** es correcto (aplicar pone categoría, no confirma), y ahora el recuadro dice
  qué pasó.
- **Las filas de `Review` no marcan cuáles acaban de recibir categoría:** se ven en la
  lista del recuadro, no en la cola.
- **Si la aplicación de las reglas falla a medias,** no hay recuadro ni lista, como hoy.
- **Al importar, las reglas también categorizan y la aplicación sigue sin enseñar
  cuáles:** lo dejaste fuera, para una revisión posterior.

## 🔄 Cambios desde tu última lectura (2026-10-13)

- La lista sale de la respuesta del backend; aplicar cuesta 1 petición, no 15 o 16 — decisión 1 y técnica 2 — lo pediste el 2026-10-12 y el backend ya lo devuelve.
- Desaparecen «cuándo no se enseña la lista» y «si falla la lectura de antes no se aplica», con sus tres textos — antiguas decisiones 2 y 3 — ya no hay lecturas ni comparación, ni el caso sin detectar.
- Nueva decisión 2, **pendiente de tu sí:** enseñar en cada fila el texto de la regla que le casó.
- Nueva decisión 3: si la respuesta del backend llega sin lista o no cuadra, no hay recuadro y la ventana dice que algo falló.
- Se retiran los dos checks de las features 27 y 29 que comparan con un commit; importar no se toca y gana una prueba — bloque 📌 y técnica 3.
