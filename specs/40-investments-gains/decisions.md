# Decisiones — F40 `investments-gains`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** `Investments` pasa a enseñar lo que gana o pierde cada inversión y el total de las vivas, leyendo la consulta nueva del backend (`GET /api/investments/gains`, su feature 67). Los depósitos entran en esas listas y la tarjeta `Deposits` desaparece. **No toca** `Net Worth`, el backend ni nada que escriba: la pantalla solo mira.

---

## 🔴 Confirma o corrige (6)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **La tarjeta `Deposits` sale.** Cada depósito pasa a ser una fila más: los vivos en la lista de arriba, los vencidos y cancelados en `Closed`. Si se quedara, un depósito vivo saldría dos veces con dos cifras: `Not earned yet` en la tarjeta y lo que lleva ganado en la lista. Se pierden el enlace `See in Movements` y, en los dudosos, el número de cobros posibles o lo que devolvió; queda el motivo. | Dejar la tarjeta tal cual debajo de las listas: una petición más y las dos cifras distintas para el mismo depósito. |
| 2 | **Orden y barra, en euros.** De la que más gana a la que más pierde en €; la barra sale de una línea central: verde a la derecha si gana, roja a la izquierda si pierde, larga en proporción a la mayor ganancia o pérdida. Las que no tienen cifra, al final y sin barra. | Ordenar y medir por %: un depósito pequeño al 1,9 % saldría por encima de un fondo de 12.000 € al 1,5 %, y la barra no diría cuánto suma cada uno al total. |
| 3 | **Depósito vivo:** su fila enseña lo que lleva ganado hasta hoy como cualquier otra, y debajo `Counted day by day: 275,00 € when it matures on 1 Mar 2027` («Se cuenta día a día: 275,00 € cuando venza el 1 mar 2027»). | Una barra «día 246 de 364»: el backend no da los días, habría que contarlos aquí y podrían no cuadrar con su cifra. |
| 4 | **`Worth` dice de qué día es el dato:** `Worth 12.800,50 € on 30 Sept 2026` si la valoración del fondo no es de hoy; `… today` si lo es (los depósitos vivos, siempre). *(añadido)* | Solo `Worth 12.800,50 €`: una valoración de hace dos meses parecería de hoy. |
| 5 | **Cerrados:** tarjeta `Closed` debajo, toda en gris, sin barra y sin verde ni rojo (la ganancia lleva su `+` o `-`). Cada fila: nombre, tipo, banco, `Started`, `Closed` y lo ganado en € y %. Un depósito cancelado añade `Cancelled before it matured`. *(lo último, añadido)* | Gris pero con la ganancia en verde/rojo apagado; o añadir también `Put in` y lo que valía al cerrar. |
| 6 | **Bajo la cifra grande:** `on 22.300,00 € put in` (sobre cuánto se calcula el %) y, si alguna viva no entra, `Not included: ETF Mundo (no valuation on file)`. Una ganancia de exactamente 0 sale en el color normal, ni verde ni rojo. *(añadido)* | Solo la cifra y el %, sin la línea de lo invertido. |

## 🔤 Textos (inglés → traducción)

| En pantalla | Traducción |
|---|---|
| `Gain or loss on live investments` (etiqueta de la cifra grande) | Ganancia o pérdida de las inversiones vivas |
| `+686,35 €` · `+3,08 %` | Con signo; el % con los decimales que manda el backend (`0,9 %` no se rellena a `0,90 %`) |
| `No live investments right now.` | Ahora no tienes ninguna inversión viva (en lugar de la cifra, si solo hay cerradas) |
| `Your investments` / `Closed` (títulos de las tarjetas) | Tus inversiones / Cerradas |
| `Not part of the total: when they closed, the money went back to your account.` | No suman en el total: al cerrarse, el dinero volvió a tu cuenta |
| `Fund` · `ETF` · `Managed portfolio` · `Fixed-term deposit` | Fondo · ETF · Cartera gestionada · Depósito a plazo (los mismos que `Net Worth`) |
| `Started 3 Nov 2025` · `Put in 12.300,00 €` · `Closed 1 Sept 2026` | Empezó el · Invertido · Cerrada el |
| `<motivo> · Not in the total` | <motivo> · No entra en el total |
| `no valuation on file` · `the valuation has no gain` · `the valuation has no gain percent` | No hay valoración · La valoración no trae la ganancia · La valoración no trae el % |
| `its payment is not in your statement` · `several possible payments in your statement` | Su cobro no está en tu extracto · Hay varios cobros posibles en tu extracto |
| `it paid back less than you put in` · `its conditions are incomplete` | Devolvió menos de lo que metiste · Le faltan condiciones |
| `Loading your investments…` · `Couldn't load your investments` + `Try again` · `You have no investments yet.` | Cargando · No se pudieron leer + Reintentar · Aún no tienes inversiones |

Un dato que el backend no tiene sale `—`, nunca `0`.

## ✅ Ya las cerraste tú (6)

- **Cifra grande arriba** con el total de lo vivo en € y en %, verde si ganas y rojo si pierdes. (2026-11-03)
- **Una fila por producto vivo** con inicio, invertido, valor actual y ganancia en € y %, de más a menos, con barra. (2026-11-03)
- **Ninguna cuenta en esta pantalla**, tampoco la remunerada. (2026-11-03)
- **Los cerrados, aparte**, con otro tono, como referencia y sin sumar. (2026-11-03)
- **Un depósito vivo suma su ganancia esperada repartida por días; uno cancelado va a cerrados con 0.** (2026-11-04, en la feature 67 del backend)
- **El % del total es el del backend:** ganancia de las vivas ÷ lo invertido en las vivas que entran, capital de los depósitos incluido. Aquí se enseña tal cual, no se recalcula.

## 🧪 Cómo se comprobará que está hecho

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Cifra grande en € y %, verde o rojo | Tests de la cifra con una ganancia y con una pérdida |
| Cada producto con sus datos | Test de la pantalla con una respuesta inventada (un fondo, una cartera que pierde, un depósito, un ETF sin valoración) |
| Ordenados, con barra | Test del orden en €, test de la pantalla y test de la barra a cada lado |
| Los cerrados aparte, sin sumar | Test de la tarjeta `Closed` |
| Ninguna cuenta | Test de que una respuesta con un tipo que no es inversión se rechaza. Que el backend no las mande lo prueba él |
| Los depósitos siguen viéndose | Test de que salen en las listas y no hay tarjeta `Deposits`; test de la línea del día a día |
| Hueco y motivo, nunca cero | Test de la fila con hueco y test de la línea `Not included` |
| Inglés, oscuro, todo en verde | Los comandos de tipos, lint, formato, tests, build y `./init.sh`. «Inglés y oscuro», además, lo mira el reviewer |

Más 5 comprobaciones marcadas *(añadido)*: que solo lee y pide una vez, que la cifra no se enseña si no cuadra con las filas, el fallo con `Try again`, la recarga tras importar y la prueba en navegador entrando por el menú.

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (5)

1. **Una sola petición al abrir la pantalla**, y otra tras importar si ya se había abierto (como hacían los depósitos).
2. **No recalcula nada:** enseña las cifras del backend; si su total no es la suma de las filas, dice que no se pudo leer.
3. **El efectivo sin invertir de un fondo no se enseña:** no lo pediste y ya está en `Net Worth`.
4. **Se borra el código de la tarjeta `Deposits`** y sus tests.
5. **15 requisitos, en el tope;** uno junta los estados «cargando» y «vacío».

## 📌 Consecuencias que te tocan a ti (no son código)

- **Abrir `Investments` con el backend en marcha y tus datos** y mirar que las cifras de tus fondos son las de MyInvestor. Sustituye al cabo 45 del `docs/roadmap.md` (probar la tarjeta `Deposits` con datos reales): el leader lo reescribe al cerrar.

## ⚠️ Incoherencias conocidas que se heredan

- **Los `checks` de las features 38 y 39 dejan de pasar:** comprueban la tarjeta que esta feature borra. Hay que vaciarlos al cerrar.
- **Un depósito vivo vale aquí capital + lo ganado por días, y en `Net Worth` solo el capital;** uno vencido sin cierre escrito está aquí en `Closed` y allí sigue sumando con su aviso. Lo decidió así el backend a propósito.
