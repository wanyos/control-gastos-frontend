# Decisiones — F29 `statement-readable`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué anotaste en la revisión:** en `Movements` no viste «en gris» el importe de un
`Not counted`; no entendiste por qué unas etiquetas de categoría salen en verde y otras
no; no entendiste la nota gris de debajo de las cifras; y un mes sin movimientos, con la
casilla `Hide what does not count` puesta, te dijo que todo estaba escondido.

**Qué hace esto:** arregla esas cuatro cosas en la pantalla `Movements`. **No toca** el
backend, ninguna cifra, qué movimientos cuentan, cómo se marcan, los nombres de las
categorías, el idioma, ni la pantalla `Review`. 15 requisitos.

---

## 🔴 Confirma o corrige (6)

Todas son decisiones mías. Las tres primeras y la 5 son lo que me dejaste a mí.

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Lo que no cuenta: el importe sale tachado y en gris, nunca en verde ni en blanco, y el concepto pasa de blanco a gris claro.** Igual para lo que marcaste tú (`Not counted`) y para los dos movimientos de un traspaso (`Transfer`), que hoy salen como uno normal. | **Bajar el tono de toda la línea, sin tachar:** descartada, porque la categoría también se apagaría y quieres seguir leyéndola. |
| 2 | **Colores que quedan en una línea, y qué significan:** verde en el importe = entra dinero y cuenta; blanco = sale y cuenta; gris tachado = no cuenta. El punto de color de la izquierda sigue: un color por categoría, gris si no tiene. Las etiquetas, ninguna con color. | **Quitar también el punto de color:** hay ocho colores y más categorías, así que dos categorías pueden compartir color. Es un cambio pequeño; dímelo y entra. |
| 3 | **Sin categoría: la etiqueta `Uncategorized` sale con el borde a rayas y sin fondo;** las que tienen categoría, con fondo gris liso. | **`Uncategorized` en ámbar:** se ve más, pero vuelve a meter un color en las etiquetas. |
| 4 | **Sin que lo pidieras: `Transfer` y `Not counted` dejan de ser etiquetas y pasan a ser texto bajo el concepto, junto a la cuenta** (`Banco ···1234  Not counted`). Si no, al quedar todas grises serían iguales que una categoría y estarían a su lado. Así lo que tiene forma de etiqueta es siempre la categoría. | **Dejarlas donde están:** menos cambio; una línea puede enseñar tres etiquetas grises iguales seguidas. |
| 5 | **El texto de la explicación** es el de la tabla de abajo. La frase sobre grupos que parecen traspasos (la que sale a veces) va con el resto, plegada, sin cambiar. | **Esa frase, a la vista cuando haya grupos:** la nota ocupa un renglón más esos días. O cambia cualquier frase: dime cuál. |
| 6 | **Mes sin nada en la lista, con la casilla puesta.** Si el mes no tiene movimientos: `No movements in October 2026.`, sin botón y sin `Hiding 0 movements`. Si los tiene y están escondidos: lo de hoy, con `Show everything`. **Sin que lo pidieras:** durante el instante en que aún no se sabe cuál de los dos es (o si esa lectura falla), dice `Nothing to show in October 2026 while "Hide what does not count" is ticked.` con `Show everything`. | **Esperar a saberlo antes de enseñar nada:** no verías cambiar la frase, pero todos los meses con la casilla puesta tardarían un poco más en aparecer. |

**Texto de la explicación (decisión 5).** A la vista siempre, la primera; el resto se abre
pulsando `More about what counts` («Más sobre qué cuenta»).

| En la aplicación | En castellano |
|---|---|
| These figures leave out the movements labelled "Transfer" or "Not counted". | Estas cifras dejan fuera los movimientos que llevan «Transfer» o «Not counted». |
| They stay in the list, with the amount crossed out. Tick "Hide what does not count" to take them off the list. | Siguen en la lista, con el importe tachado. Marca «Hide what does not count» para quitarlos de la lista. |
| "Transfer" is put by the app on the two movements of a transfer between your accounts. "Not counted" is put by you. | «Transfer» lo pone la aplicación en los dos movimientos de un traspaso entre tus cuentas. «Not counted» lo pones tú. |
| A movement that is left out keeps its category: the category says what it was, the label says it is not in the sums. | Un movimiento que queda fuera conserva su categoría: la categoría dice qué fue; la etiqueta, que no está en las sumas. |
| If only one of the two movements of a transfer was imported, it still counts until you mark it as "Not counted". | Si de un traspaso solo se importó uno de sus dos movimientos, sigue contando hasta que lo marques como «Not counted». |
| The app can pair two movements that are not a transfer. Unlink them in "Transfers". | La aplicación puede emparejar dos movimientos que no son un traspaso. Sepáralos en «Transfers». |

## ✅ Ya las cerraste tú (4)

- **Etiquetas de categoría: todas iguales y sin color;** el verde, solo en el importe.
- **La explicación: una frase a la vista y el resto plegado.**
- **Un movimiento que no cuenta sigue enseñando su categoría.**
- **No se toca el backend, ni las cifras, ni cómo se marca, ni el idioma.**

## 🧪 Cómo se comprobará que está hecho

> Los `checks` de `feature_list.json`: se ejecutan al cerrar y, si uno falla, la
> feature no se cierra. Si falta un caso, es aquí donde se pide.

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Lo que no cuenta se distingue a simple vista | — a medias: la prueba que mira que el importe sale tachado y el concepto en gris, marcado o traspaso. Si se ve «a simple vista» lo dices tú |
| Su importe no se confunde | la prueba de que nunca sale en verde ni en blanco; y la medida de que el gris se lee sobre el fondo oscuro |
| Todas las etiquetas tienen el mismo color | la prueba que compara la de un ingreso con la de un gasto |
| Sin categoría se distingue | la prueba que mira el borde a rayas y que no tiene fondo |
| Entiendo `Not counted` con una categoría | — a medias: dos pruebas (sigue enseñando la categoría; `Not counted` va bajo el concepto). Si se entiende, lo dices tú |
| Leo la explicación y sé qué incluyen | — a medias, *(añadido)*: la prueba de que el texto es el de arriba y el resto está plegado. Si se entiende, lo dices tú |
| Mes sin movimientos con la casilla puesta | la prueba que abre ese mes y espera `No movements in`, sin `Show everything` ni `Hiding` |
| Mes con todo escondido | la prueba que espera la frase de hoy y pulsa `Show everything` |
| *(añadido)* No se toca el backend | la prueba de que la pantalla no pide nada nuevo |
| *(añadido)* No cambia cómo se marca ni `Review` | esos archivos son idénticos a los de hoy |

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (4)

1. **Distinguir «mes vacío» de «todo escondido» no cuesta ninguna petición más.** Hoy la
   pantalla, con la casilla puesta, dice siempre «escondido» sin mirar nada. El dato ya
   llega: es el total del mes sin esconder que se pide para calcular `Hiding N`.
   ⚠️ *Efecto:* ese dato llega un instante después de la lista; de ahí la decisión 6.
2. **`Review` no cambia.** La etiqueta que comparten las dos pantallas no se toca; la de
   `Uncategorized` se dibuja en `Movements` aparte.
3. **Contraste medido.** Gris del importe tachado sobre el fondo de la tarjeta: 7,0
   (mínimo 4,5); con el ratón encima de la línea: 7,7. Borde a rayas: 7,0 y 7,7 (mínimo
   3). Se añaden dos líneas de medida a [`theme-dark.css`](../../src/assets/theme-dark.css);
   ningún color del tema cambia.
4. **Lo de la feature 27 no se toca:** la línea de la última acción sigue pegada bajo la
   barra de arriba.

## 📌 Consecuencias que te tocan a ti (no son código)

- Al cerrar, mira `Movements` con tus datos: las frases «a medias» de la tabla 🧪 solo
  las puedes dar por buenas tú.
- `docs/guia-de-uso.md` se corrige donde dice «importe en gris» y donde describe el
  fallo del mes vacío; tus anotaciones (`--`) no se tocan.

## ⚠️ Incoherencias conocidas que se heredan

- **`Review` sigue con las etiquetas de categoría en verde.** Esta feature es solo de
  `Movements`.
- **`Not counted` junto a categorías en castellano** (tu anotación del idioma): queda
  fuera, como pediste.
