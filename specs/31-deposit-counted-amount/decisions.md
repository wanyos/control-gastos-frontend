# Decisiones — F31 `deposit-counted-amount`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué pediste:** que en `Movements`, al mirar un movimiento de depósito, sepas cuánto cuenta
de verdad en las cifras. Hoy las cifras ya no cuentan aperturas ni cancelaciones y del
vencimiento solo el interés, pero la lista sigue pintándolos como si contaran enteros, y la
frase de debajo de las cifras dice algo que ya no es verdad.

**Qué hace esto:** cambia cómo se ven las líneas de depósito en `Movements` y en `Review`,
la frase de debajo de las cifras y lo que esconde la casilla `Hide what does not count`.
**No toca** el backend, las cifras, el resto de líneas ni cómo se marca un movimiento. 15 requisitos.

---

## 🔴 Confirma o corrige (6)

Las 1, 2 y 4 son lo que me dejaste a mí; la 3, la 5 y la 6 no las pediste.

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Vencimiento:** el importe del banco (25.037,07 €) sigue ahí, en gris y sin tachar, y debajo, pequeño y en verde, `Counts 37,07 €`. Bajo el concepto: `Deposit maturity · only the interest counts`. | Dejar el importe en verde y decir el interés solo bajo el concepto: menos cambio, pero sigue pareciendo un ingreso entero. |
| 2 | **Textos nuevos:** los de la tabla de abajo, bajo el concepto junto a la cuenta, como `Transfer` y `Not counted`. | Cambiar cualquiera: dime cuál. |
| 3 | **Dudoso:** importe tachado y en gris (de momento no cuenta) y bajo el concepto, en ámbar, el texto de dudoso con su motivo. Igual para una cancelación dudosa, aunque solo hablaste del vencimiento. | Sin ámbar, en gris como lo demás: se ve menos. |
| 4 | **La casilla esconde aperturas y cancelaciones y las cuenta en `Hiding N movements`.** El backend no ofrece filtro por depósito, así que se quitan en el navegador, y el número de movimientos de la tarjeta baja con ellas. | Pedir antes al backend un filtro por depósito (una feature del backend antes que esta) para que esconda y cuente él. |
| 5 | **La casilla no esconde un dudoso**, aunque cuente 0: es justo lo que no quieres perder de vista. | Esconderlo también, como lo demás que cuenta 0. |
| 6 | **En una línea de depósito no salen `Transfer` ni `Not counted`**: desde el cambio del backend, la marca no cambia lo que suma un depósito, y `Not counted` en un vencimiento que cuenta su interés sería falso. | Enseñarlas igual, aunque no cambien nada en las cifras. |

**Textos (decisión 2)**

| En la aplicación | En castellano |
|---|---|
| `Deposit opening` / `Deposit cancellation` | Apertura de depósito / Cancelación de depósito |
| `Deposit maturity · only the interest counts` | Vencimiento de depósito · solo cuentan los intereses |
| `Counts 37,07 €` | Cuenta 37,07 € |
| `Doubtful deposit maturity · no deposit amount found for it · not counted for now` | Vencimiento de depósito dudoso · no se encuentra el capital de ningún depósito para él · de momento no cuenta |
| Otros motivos: `it could belong to more than one deposit` / `no opening of this amount found` | podría ser de más de un depósito / no se encuentra la apertura de este importe |
| Frase a la vista: `These figures leave out the movements labelled "Transfer" or "Not counted", and count a deposit only by its interest.` | Estas cifras dejan fuera los movimientos con «Transfer» o «Not counted», y de un depósito solo cuentan los intereses. |
| Nueva, plegada: `Opening or cancelling a deposit is not counted. When one matures, only its interest counts. A doubtful one counts nothing until the app knows how much was put in.` | Abrir o cancelar un depósito no cuenta. Al vencer, solo cuentan sus intereses. Uno dudoso no cuenta nada hasta que la aplicación sepa cuánto se metió. |

## ✅ Ya las cerraste tú (4)

- **Aperturas y cancelaciones, con el aspecto de lo que no cuenta de la feature 29:** importe tachado y gris, concepto en gris.
- **El dudoso se ve solo en su línea, con su motivo;** un sitio que los junte queda para la idea de mejora 6.
- **`Review` entra, con el mismo aspecto;** sus demás líneas no cambian.
- **Resolver a mano el dudoso de agosto de 2025 queda fuera.**

## 🧪 Cómo se comprobará que está hecho

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Octubre: aperturas y cancelaciones se distinguen | la prueba de que salen tachadas y en gris. Si se ve «a simple vista» lo dices tú |
| El vencimiento dice que solo cuentan 37,07 € | la prueba con un vencimiento de 25.037,07 € que espera `Counts 37,07 €` |
| Sigo viendo el importe del banco | la prueba de que cada línea de depósito enseña su importe con su signo |
| Agosto de 2025, dudoso con motivo y sin contar | la prueba de la línea dudosa con su motivo y el importe tachado |
| La frase dice lo de los intereses | la prueba del texto de la frase |
| La casilla esconde aperturas y cancelaciones, no el vencimiento | la prueba de la pantalla con la casilla puesta |
| Las cifras no cambian | la prueba de que la tarjeta enseña tal cual lo que manda el backend |
| (añadidas) `Review`, el número de `Hiding`, el ámbar legible | una prueba cada una |

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (2)

1. **Si el backend dejara de mandar el dato de depósito, la pantalla da error** en vez de pintar el vencimiento como ingreso entero.
2. **Al cambiar la categoría de una línea de depósito, no pierde lo que cuenta**, aunque la respuesta del backend a ese cambio no lo traiga.

## 📌 Consecuencias que te tocan a ti (no son código)

- Ya no hace falta marcar como `Not counted` los depósitos nuevos de cada importación; la guía de uso se corrige en esta feature (tus notas no se tocan).

## ⚠️ Incoherencias conocidas que se heredan

- Un vencimiento que marques como `Not counted` o que se empareje como traspaso lo esconde la casilla, aunque cuente su interés: eso lo filtra el backend. La migración del backend quitó la marca a los 29 que la tenían; si alguno está emparejado como traspaso no lo he comprobado.
- Si un mes pasara de 200 movimientos, el número de `Hiding` se quedaría corto hasta pulsar `Load more`. El 2026-09-26 el mes más cargado tenía 93.
