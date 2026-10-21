# Decisiones — F35 `doubtful-own-money`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué pediste:** «en el caso de que una transferencia no esté clara que es mía o de otra
persona, ponerla como dudosa, y la resuelvo a mano». Ver los dudosos en `Transfers` con
concepto, importe, fecha y motivo; responder uno a uno «es mío» / «no es mío»; poder
deshacer; enterarte por un número junto a `Transfers` y una línea al importar; y en
`Movements`, ver tachado lo que es entre tus cuentas y en ámbar lo dudoso.

**Qué hace esto:** eso. **No toca** el backend, `Review`, ni la tabla de tus cuentas (es la
feature 36). Hoy tienes 0 dudosos: todo se prueba con datos inventados. 16 requisitos.

**Dos «dudosos» distintos en `Transfers`:** los `Doubtful transfers` que ya tenías son
parejas de traspaso que la importación no supo emparejar; los nuevos son movimientos
sueltos que solo nombran el banco de una de tus cuentas y en los que dices si son tuyos.

---

## 🔴 Confirma o corrige (6)

La 1 es la que me dejaste; la 4 y la 5 me las pidió decidir el leader; la 2, la 3 y la 6 no las pediste.

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Cómo se ven:** sección nueva arriba del todo en `Transfers`, `Doubtful: between your accounts?` (*Dudosos: ¿entre tus cuentas?*). Cada dudoso en una tarjeta: fecha · cuenta, concepto, motivo, importe con signo, y dos botones `It's mine` (*Es mío*) y `Not mine` (*No es mío*). Un clic responde, sin pregunta de confirmación. | **Preguntar «¿seguro?» antes de cada respuesta:** un clic más por dudoso. |
| 2 | **Deshacer:** la línea verde de arriba de la pantalla, con `Undo`, deshace **solo la última respuesta** y mientras sigas en la pantalla. Lo ya respondido deja de verse en `Transfers`. | **Una lista de «ya respondidos» con deshacer en cada uno:** el backend no deja pedir «los que ya resolví»; habría que pedírselo en otra sesión del backend. |
| 3 | **El número junto a `Transfers` cuenta solo estos dudosos**, no los grupos de `Doubtful transfers`. | **Sumar los dos:** el número no diría cuál de las dos cosas te espera. |
| 4 | **La línea al importar:** el backend no dice cuántos dudosos trae una importación. La aplicación mira cuáles hay justo antes y justo después, y cuenta los que no estaban: `2 new doubtful movements: say in Transfers whether they are yours.` (*2 movimientos dudosos nuevos: di en Transfers si son tuyos.*). Coste: dos lecturas más por importación; si una falla, no sale la línea. | **Decir cuántos dudosos hay en total** tras importar (una lectura, pero no distingue los nuevos), o **pedir el dato al backend** (otra sesión; esta feature espera). |
| 5 | **La casilla `Hide what does not count`** esconde también lo de entre tus cuentas (lo calcula la pantalla, como con los depósitos) y lo suma a `Hiding`. Los dudosos no se esconden: cuentan. | **No tocar la casilla:** seguirías viendo líneas tachadas que no cuentan con la casilla puesta. |
| 6 | **Textos en `Movements`:** `Between your accounts` (*Entre tus cuentas*) en gris, también si lo respondiste tú; `Doubtful · names Banco X · counts until you answer in Transfers` (*Dudoso · nombra Banco X · cuenta hasta que respondas en Transfers*) en ámbar, **con el importe sin tachar** porque cuenta. En un movimiento de depósito manda lo de la feature 31. | **El dudoso tachado como los depósitos dudosos:** pero diría que no cuenta, y sí cuenta. |

**Otros textos:** motivo `Names "Banco X", the bank of your account "Cuenta Y"` (*Nombra "Banco X", el banco de tu cuenta "Cuenta Y"*) · vacío `No doubtful movements. When a movement only names the bank of one of your accounts, it shows up here so you can say whether it is yours.` (*No hay dudosos. Cuando un movimiento solo nombre el banco de una de tus cuentas, saldrá aquí para que digas si es tuyo.*) · `Marked as yours. It no longer counts in your totals.` (*Marcado como tuyo. Ya no cuenta en tus sumas.*) · `Marked as not yours. It counts in your totals.` (*Marcado como no tuyo. Cuenta en tus sumas.*) · `Answer undone.` (*Respuesta deshecha.*) · `Nothing changed. The server rejected that answer.` (*No ha cambiado nada. El servidor rechazó la respuesta.*)

## ✅ Ya las cerraste tú (5)

- **Los dudosos viven en `Transfers`.** · **El número sale solo si hay alguno, como el de `Review`.**
- **Lo que es entre tus cuentas, tachado y en gris como desde la feature 29; los dudosos, `Doubtful` en ámbar.**
- **Uno a uno, nunca varios a la vez, y ninguno sin tu clic.** · **No se toca el backend.**

## 🧪 Cómo se comprobará que está hecho

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Veo la lista con concepto, importe, fecha y motivo | la prueba de una tarjeta y la de la pantalla con dos dudosos |
| «Es mío» deja de contar; «no es mío» cuenta y deja de ser dudoso | las pruebas que comprueban que se manda exactamente esa respuesta y que sale de la lista, también en un navegador con el backend imitado. Que deje de contar lo hace el backend |
| Puedo deshacer | la prueba del `Undo`, también en el navegador |
| Si no hay ninguno, me lo dice | la prueba de la pantalla vacía |
| Me entero sin buscarlos | las pruebas del número junto a `Transfers` y de la línea al importar |
| Si falla, me lo dice y no cambia nada | la prueba de una respuesta rechazada y la de un fallo al leer la lista |
| *(añadido)* uno a uno y nada sin tu clic; tachado, ámbar y la casilla en `Movements` | una prueba para cada uno |

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (4)

1. **Si el backend dejara de decir si un movimiento es dinero tuyo, la pantalla da error** en vez de pintarlo como si contara. ⚠️ *Efecto:* hay que tocar unas 25 pruebas de otras features para que lo lleven.
2. **Enlazar o desenlazar una pareja en `Transfers` vuelve a leer también los dudosos**: una pierna de traspaso deja de ser dudosa.
3. **La lista enseña hasta 200 dudosos**; el número del menú dice el total real. Dijiste que serán pocos.
4. **16 requisitos, uno por encima del tope:** partirla separaría el número del menú de la lista a la que lleva.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Cada respuesta cambia las sumas** de `Movements`, `Overview` y `Monthly cost`. Pasado el `Undo`, se corrige desde la API (sesión del backend).
- **Probarlo con tus datos cuando llegue el primer dudoso** (hoy 0); el leader lo apunta como cabo suelto.

## ⚠️ Incoherencias conocidas que se heredan

- La nota plegada bajo las cifras de `Movements` no menciona lo de entre tus cuentas, y `Review` lo pinta como un movimiento normal.
