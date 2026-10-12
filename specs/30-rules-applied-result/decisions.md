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
dice siempre cuántos pendientes siguen sin categoría. **No toca** el backend, ni qué
movimientos tocan las reglas, ni confirma nada, ni añade un deshacer. 15 requisitos, en
el límite: si prefieres dos features, el corte limpio es sacar aparte el número de
`Review`.

**La duda del backend, resuelta: se puede hacer sin tocarlo.** Cómo, en la decisión 1.

---

## 🔴 Confirma o corrige (6)

Todas son decisiones mías. La 1, la 4 y la 5 son las tres que me dejaste a mí.

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **De dónde sale la lista:** la aplicación lee los pendientes sin categoría justo antes de aplicar y todos los pendientes justo después, y se queda con los que antes no tenían categoría y ahora sí. **Coste:** aplicar pasa de 1 petición a 15 o 16 con tus números de hoy (7 antes, la de aplicar, 7 u 8 después). Cuánto tarda no lo he medido. | **Que el backend devuelva la lista al aplicar:** 1 petición y exacta siempre. Es tocar el backend: otra sesión, antes que esta. |
| 2 | **Cuándo NO se enseña la lista:** si no tiene exactamente tantos movimientos como dice el backend, o si falla la lectura de después. Se ven los números (que vienen del backend y son buenos) y una frase que dice por qué no hay lista. Esa lista ya no se recupera. | **Un botón `Try again`** para volver a leerla cuando falló la lectura (un requisito más). O **enseñarla igualmente con un aviso** de que no cuadra. |
| 3 | **Sin que lo pidieras: si falla la lectura de antes, las reglas no se aplican** y la ventana lo dice. Aplicar no se deshace, y sin esa lectura no habría lista. | **Aplicar igualmente** y enseñar solo los números, como hoy. |
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
| The list of these movements could not be loaded. The numbers come from the server and are right. | No se pudo cargar la lista de estos movimientos. Los números vienen del servidor y son correctos. |
| The list is not shown: it did not add up to the number the server gave, so something else changed your movements at the same time. | No se enseña la lista: no cuadraba con el número que dio el servidor, así que otra cosa cambió tus movimientos a la vez. |
| Couldn't read your pending movements, so the rules were not applied. Nothing changed. Try again. | No se pudieron leer tus movimientos pendientes, así que las reglas no se aplicaron. No ha cambiado nada. Inténtalo otra vez. |
| 1011 pending movements have no category. | 1011 movimientos pendientes no tienen categoría. |
| Every pending movement has a category. | Todos los movimientos pendientes tienen categoría. |

## ✅ Ya las cerraste tú (4)

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
| Puedo ver la lista, cada uno con su categoría | dos pruebas: la que calcula la lista a partir de las dos lecturas, y la que la despliega y mira la categoría de cada fila |
| Si no se categorizó ninguno, me lo dice | la prueba que espera `no movements were categorized` y ningún botón de lista |
| Sin aplicar nada, en `Review` veo cuántos quedan | la prueba que abre `Review` y espera la frase con el número |
| Si recargo, lo que veo sigue siendo verdad | dos pruebas: al empezar de cero no hay resultado ni nada guardado en el navegador; y una lista que no cuadra no se enseña |
| *(añadido)* Aplicar no confirma nada | la prueba de que al aplicar solo sale una escritura, la de aplicar |
| *(añadido)* Si falla la lectura de antes, no se aplica | la prueba de que en ese caso no sale la petición de aplicar |
| *(añadido)* Lo de la feature 27 sigue igual | dos pruebas: aplicar sigue borrando el `Undo` y las casillas; y el recuadro nuevo no se mete en la línea que se queda bajo la barra de arriba |

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (3)

1. **El número de `Review` cuesta una petición más**, pequeña (pide un solo movimiento
   y lee el total). No sale de las que la pantalla ya hace: esas llevan tus filtros.
   Se vuelve a pedir tras cada acción, cada `Undo` y cada aplicación de las reglas.
2. **Una lista equivocada exige que otra pestaña cambie movimientos durante los
   segundos que dura aplicar.** Casi todos esos casos descuadran el número y la lista
   no se enseña (decisión 2).
   ⚠️ *Efecto:* queda uno sin detectar: dos cambios a mano, a la vez, que se compensen.
3. **Lo de la feature 27 no se toca:** la línea de la última acción y la de la regla
   creada siguen como están, y aplicar sigue borrando el `Undo` y las casillas.

## 📌 Consecuencias que te tocan a ti (no son código)

- Al cerrar, aplica las reglas con tus datos y mira cuánto tarda: es lo único de la
  decisión 1 que no se puede comprobar sin tu backend.
- **Dos comprobaciones de features cerradas dejarán de pasar,** sin que esas features
  estén rotas: la última de la 27 y la última de la 29 exigen que archivos de `Review`
  y de `Rules` sigan idénticos a un commit, y esta feature los edita (es lo que apuntó
  la lección 3). Hoy la de la 29 pasa; la he ejecutado. Hay que decidir si se retiran.
- `docs/guia-de-uso.md` se corrige donde dice que no se sabe cuáles se categorizaron y
  en el paso donde anotaste que no veías nada; tus anotaciones (`--`) no se tocan.

## ⚠️ Incoherencias conocidas que se heredan

- **El número del menú sigue sin bajar al aplicar, y `In` / `Out` / `Net` no se
  mueven:** es correcto (aplicar pone categoría, no confirma), y ahora el recuadro dice
  qué pasó.
- **Las filas de `Review` no marcan cuáles acaban de recibir categoría:** se ven en la
  lista del recuadro, no en la cola.
- **Si la aplicación de las reglas falla a medias,** no hay recuadro ni lista, como hoy.
