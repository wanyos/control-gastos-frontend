# Decisiones — F32 `monthly-cost`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué pediste:** una pantalla que diga cuánto te cuesta un mes de vida: arriba la cifra, debajo
los recibos uno a uno (con lo que cuestan al mes, cada cuánto se cobran, el último cargo y si
han subido), lo que envías a personas sumado y el gasto variable por categoría; y poder abrir
un recibo para ver sus cargos.

**Qué hace esto:** añade la entrada `Monthly cost` al menú, justo debajo de `Overview`, con esa
pantalla. Solo lee lo que ya calcula el backend: **no toca** el backend, no escribe nada y no
cambia ninguna otra pantalla. 17 requisitos, dos por encima del tope: son los puntos 5 y 6 de
abajo; si dices que no a los dos, quedan 15.

---

## 🔴 Confirma o corrige (6)

Las 1, 2 y 3 son lo que me dejaste a mí; la 4 es la que me pidió el leader; la 5 y la 6 no las pediste.

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Cómo se dibuja:** arriba una tarjeta con la cifra y el periodo; debajo tres bloques (`Bills`, `Sent to people`, `Variable spending`), cada uno con **su subtotal** en la cabecera, para comprobar la suma con tres cifras. Los recibos en filas con columnas, como una tabla. | Sin subtotales: menos cifras, pero comprobar la suma es sumar a mano unas 24. |
| 2 | **Nombre de cada recibo:** la versión corta del backend con mayúscula (`Seguro hogar`) y debajo, pequeño, el concepto del banco tal cual (`RECIBO /SEGURO HOGAR…`). | Solo el concepto del banco: es lo que ves en el extracto, pero largo y en mayúsculas. |
| 3 | **Los cargos de un recibo se despliegan debajo de su fila** con `Show charges` (fecha, importe y concepto); puedes tener varios abiertos. | En una ventana encima de la pantalla: se lee aislado, pero tapa la lista. |
| 4 | **Textos nuevos:** los de la tabla de abajo. Cada recibo dice también **cuánto suele cobrarse cada vez**: así uno anual se lee `Yearly`, `187,37 € each time` y, en la columna del mes, `16,44 €`. | Cambiar cualquiera: dime cuál. |
| 5 | **También se pueden abrir** el grupo de personas y cada categoría del gasto variable: el backend ya manda sus cargos y sirve para ver qué hay en `Otros gastos`. | Solo los recibos, como pediste. |
| 6 | **Debajo de la cifra, una línea con cuántos recibos han subido** (`8 of 15 bills went up…`), para enterarte sin mirarlos uno a uno. Las subidas llevan además una etiqueta roja `Up 9,92 €`. | Solo la etiqueta roja en cada recibo. |

**Textos (decisión 4)**

| En la aplicación | En castellano |
|---|---|
| `What a month costs` (sale en mayúsculas, como las demás tarjetas) | Lo que cuesta un mes |
| `Monthly average of the 12 complete months before this one: October 2025 to September 2026.` | Media mensual de los 12 meses completos anteriores a este: de octubre de 2025 a septiembre de 2026. |
| `8 of 15 bills went up since their previous charge.` | 8 de 15 recibos han subido desde su cargo anterior. |
| `Bills` · `Sent to people` (fila `Transfers to people`) · `Variable spending` · `No category` | Recibos · Enviado a personas (Transferencias a personas) · Gasto variable · Sin categoría |
| Columnas: `How often` · `Usual amount` · `Last charge` · `Change` · `Per month` | Cada cuánto · Importe habitual · Último cargo · Cambio · Al mes |
| `Monthly` · `Twice a month` · `Every 2 months` · `Every 3 months` · `Every 6 months` · `Yearly` · `Once` | Mensual · Dos veces al mes · Cada 2 meses · Cada 3 meses · Cada 6 meses · Anual · Una sola vez |
| `… each time` (en `Twice a month`: `… a month`) | … cada vez (… al mes) |
| `Up 9,92 €` + `was 187,37 €` · `Down 2,00 €` · `Same` · `No earlier charge` | Ha subido 9,92 € + antes 187,37 € · Ha bajado 2,00 € · Igual · Sin cargo anterior |
| `2 bills with no charges between October 2025 and September 2026` | 2 recibos sin cargos entre octubre de 2025 y septiembre de 2026 |
| `Show charges` / `Hide charges` · `All 2 charges, newest first` · `2 charges in these 12 months, newest first` | Ver cargos / Ocultar cargos · Los 2 cargos, el más reciente primero · 2 cargos en estos 12 meses… |
| `Reading what a month costs…` · `Nothing counts as spending in these 12 months.` | Leyendo lo que cuesta un mes… · Nada cuenta como gasto en estos 12 meses. |

## ✅ Ya las cerraste tú (5)

- **Entrada nueva del menú, `Monthly cost`.** Y nada de backend: ya calcula todo.
- **Recibos de más caro a más barato al mes**; los que salen a 0,00 € al mes, **al final y plegados**.
- **Si ha subido un euro, ha subido**: sin umbral, como lo decide el backend.
- **Lo que envías a personas entra en la cifra**, en su propio bloque.
- **Solo mirar**: sin presupuestos, avisos, alertas ni marcar a mano qué es recurrente.

## 🧪 Cómo se comprobará que está hecho

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Veo arriba lo que cuesta un mes y el periodo | la prueba de la pantalla que espera la cifra y la frase del periodo |
| Cada recibo con nombre, al mes, cada cuánto, último cargo y subida | la prueba de una fila de recibo con todo eso |
| Distingo los que han subido | la prueba de que solo la subida lleva la etiqueta roja. Si se ve «de un vistazo» lo dices tú |
| Un anual se lee como anual | la prueba de un recibo anual que espera `Yearly` y su importe de cada vez |
| Abro un recibo y veo sus cargos | la prueba que pulsa `Show charges` y espera fecha e importe de cada cargo |
| Personas aparte y variable por categoría | una prueba de la pantalla cada una |
| La suma da la cifra de arriba | la prueba de los tres subtotales y la cifra, y la de que una respuesta que no cuadra no se enseña |
| Si el backend falla, me lo dice y reintento | la prueba que falla, pulsa `Try again` y ve las cifras |
| (añadidas) tus tres respuestas y «no escribe» | una prueba cada una |

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (4)

1. **Si lo que manda el backend no cuadra con la cifra de arriba, la pantalla da error** en vez de enseñar cifras que no suman.
2. **Una periodicidad nueva que mande el backend se enseña tal cual**, sin dejar la pantalla en error.
3. **Se lee de nuevo cada vez que entras**, y no se recarga sola tras una importación. ⚠️ *Efecto:* si importas estando en ella, sal y vuelve a entrar.
4. **Los cargos no dicen de qué cuenta son**: haría falta otra lectura para nombrar la cuenta.

## 📌 Consecuencias que te tocan a ti (no son código)

- Las categorías que falten para el gasto variable (`Gasolina`…) y sus reglas las creas tú desde `Rules`; esta pantalla no crea nada.
- La guía de uso gana una sección para esta pantalla; tus notas no se tocan.
