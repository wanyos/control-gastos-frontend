# Decisiones — F38 `deposit-earnings`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** añade a `Net Worth` una tarjeta `Deposits` con todos tus depósitos (vivos, vencidos y cancelados), lo que esperabas y lo que ganó cada uno, y arriba el total ganado. Solo lee del backend. **No toca** el backend ni ninguna cifra de `Net Worth`. 15 requisitos.

---

## 🔴 Confirma o corrige (6)

La 1, 2, 3 y 4 son lo que dejaste en mis manos; la 5 y la 6 no las pediste.

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Sitio:** una tarjeta propia a todo el ancho, debajo de `Details` (lo que propuso el leader). | Dentro de cada tarjeta de banco de `Details`: mezcla lo que tienes hoy con depósitos cerrados hace meses. |
| 2 | **Orden y aspecto:** una sola lista, en el orden del backend (el vencimiento más reciente primero, así los vivos salen arriba). Todas las filas iguales salvo los cancelados, en gris. Solo lo ganado de un vencido va en verde. | Tres grupos separados (vivos / vencidos / cancelados), cada uno con su título. |
| 3 | **Textos:** los de la tabla de abajo. | Cambiar cualquiera: dime cuál. |
| 4 | **Ir a `Movements`:** un vencido con su cobro lleva el enlace `See in Movements`, que abre `Movements` en el mes del vencimiento (no señala la línea). Con varios cobros posibles no hay enlace. | Sin enlace. O que señale la línea exacta: eso cambia `Movements` y sería otra feature. |
| 5 | **El que devolvió menos de lo que metiste dice cuánto devolvió** (`it paid back 3.990,00 €…`): sin la cifra, el motivo no se entiende. | Solo el motivo, sin cifra. |
| 6 | **Si no se pueden leer los depósitos, solo la tarjeta lo dice** y el resto de `Net Worth` se sigue viendo. Y **tras una importación se vuelven a pedir**, como ya se hace con el patrimonio. | Que la pantalla entera dé error; o no volver a pedirlos tras importar (habría que recargar la página). |

**Textos (decisión 3)**

| En la aplicación | En castellano |
|---|---|
| Etiquetas: `Active` / `Matured` / `Cancelled` / `Doubtful` (ámbar) | Vivo / Vencido / Cancelado / Dudoso |
| `Put in 4.000,00 €` · `Opened 2 May 2026` · `Matures …` / `Matured …` / `Was due …` · `Expected 7,10 €` | Metido · Abierto · Vence / Venció / Debía vencer · Esperado. Un dato que falte sale como `—`, nunca como 0 |
| Columna de lo ganado: la cifra (vencido), `Not earned yet` (vivo), `Not in the total` (cancelado o dudoso) | la cifra / Aún no ganado / No entra en el total |
| `Cancelled on 10 Mar 2026, before it matured` | Cancelado el 10 mar 2026, antes de vencer |
| `Doubtful · its payment is not in your statement` | Dudoso · su cobro no está en tu extracto |
| `Doubtful · 2 possible payments in your statement, none chosen` | Dudoso · 2 cobros posibles en tu extracto, no se elige ninguno |
| `Doubtful · it paid back 3.990,00 €, less than you put in` | Dudoso · devolvió 3.990,00 €, menos de lo que metiste |
| Arriba: `Earned by your deposits` y el total | Lo que te han dado tus depósitos |
| `Only deposits that matured with their payment in your statement add up here. This figure is not part of your net worth: that interest already counts as income in Overview and Movements.` | Aquí solo suman los depósitos vencidos con su cobro en el extracto. Esta cifra no forma parte de tu patrimonio: ese interés ya cuenta como ingreso en Overview y Movements. |
| `You have no deposits yet.` / `Loading your deposits…` / `Couldn't load your deposits` | Aún no tienes depósitos. / Cargando tus depósitos… / No se han podido leer tus depósitos |

## ✅ Ya las cerraste tú (5)

- **Todos los depósitos, también los cerrados hace meses;** el total es el del backend: solo los vencidos con su cobro.
- **Un vivo enseña lo esperado y cuándo vence, y que aún no está ganado;** un cancelado se distingue y no suma.
- **Propuestas del leader que aprobaste:** el dudoso se ve en ámbar con su motivo y «no entra en el total», como en la F31; sin depósitos la tarjeta lo dice; el total no se suma al patrimonio ni a ninguna cifra; textos en inglés, tema oscuro y todas las comprobaciones en verde.
- **Desde aquí no se corrige un dudoso ni se elige su cobro;** la tarjeta solo lee.
- **No se toca el backend ni el resto de `Net Worth`.**

## 🧪 Cómo se comprobará que está hecho

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Veo todos mis depósitos | la prueba con uno de cada estado que espera una fila por depósito, en el orden del backend |
| El vencido enseña lo ganado; el total, solo esos | la prueba de la cifra en verde; la de que el total sale tal cual; y la de que una respuesta cuyo total no cuadra se rechaza |
| El vivo: esperado, vencimiento, aún no ganado | la prueba de su fila |
| El cancelado se distingue y no suma | la prueba de su fila en gris con `Not in the total` |
| El dudoso, con motivo y fuera del total | la prueba de los tres tipos de dudoso |
| Sin depósitos, lo dice | la prueba con la lista vacía |
| El total no se suma a nada | la prueba de que las cifras del patrimonio salen iguales que las del backend |
| Inglés, oscuro, todo en verde | los comandos de tipos, lint, formato, tests, build e `./init.sh`. Si se ve bien lo dices tú |
| (añadidas) decisiones 4 y 6 | una prueba cada una |

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (3)

1. **Si el backend manda un total que no es la suma de los vencidos, la tarjeta da error** en vez de enseñarlo (como en `Expenses by category`).
2. **Ni colores ni iconos nuevos:** los tonos usados ya están medidos para leerse en oscuro.
3. **Las pruebas de navegador que pasan por `Net Worth` contestan también esta petición nueva;** si no, la que impide salir al backend real la cortaría.

## 📌 Consecuencias que te tocan a ti (no son código)

- `../docs/ideas.md` dice en dos sitios que `Net Worth` no enseña lo que ganó cada depósito; al cerrar hay que corregirlo (está fuera de este proyecto). La guía de uso se corrige en esta feature.
- Al terminar, abre `Net Worth` con tus datos y mira si los dudosos que salgan son los que esperas.

## ⚠️ Incoherencias conocidas que se heredan

- **Este total no tiene por qué coincidir con los intereses que suma `Overview`:** un vencimiento antiguo sin archivo de producto suma su interés allí y aquí no aparece (así lo define el backend).
