# Decisiones — F37 `expenses-by-category`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** una pantalla nueva, que solo mira, con lo gastado por categoría en un mes o en un año, en fijo y variable, comparado con el periodo anterior y con los movimientos de cada categoría desplegables. Sustituye a `Monthly cost`, que se quita entera. **No toca** `Overview`, el backend ni qué categorías son fijas.

---

## 🔴 Confirma o corrige (6)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Lo que no se toca** (te lo propuso el leader): ninguna librería de gráficos nueva —las barras son la misma barrita que ya pinta `Overview` para lo sin categoría— y `Overview` no cambia ni un archivo. | Meter una librería de gráficos (Chart.js o similar): una dependencia más, más peso, y viene en claro y hay que oscurecerla. |
| 2 | **Menú:** la entrada se llama `Expenses by category`, en el hueco de `Monthly cost` (justo debajo de `Overview`). `/monthly-cost` lleva a `Net Worth`, como cualquier dirección que no existe. *(añadido: no dijiste nombre ni sitio)* | Otro nombre (`Spending`, `By category`) u otro sitio del menú: dime cuál. |
| 3 | **Elegir periodo:** dos botones `Month` / `Year`. En mes, las flechas y el salto de mes de `Overview` y un desplegable `Compare with`: `Previous month` (por defecto) o `Same month last year`. En año, flechas de año, siempre contra el año anterior (el backend no da otra). **Abre en el mes en curso contra el mes anterior entero**, como `Overview`. | Abrir en el último mes completo: el mes en curso, a medias, sale casi siempre «más barato» que el anterior entero. |
| 4 | **Arriba, una frase y la honestidad del dato:** «In September 2026 you spent 714,20 €, 25,86 € more than in August 2026.» (en el periodo en curso, «So far in…»); debajo, el total, y «3 movements with no category — 2,0 % of the spending». *(añadido: la frase sale de tu `ideas.md`, el texto es mío)* | Sin frase: empezar directamente por el total y los bloques. |
| 5 | **Fijo y variable:** dos tarjetas, `Fixed` y debajo `Variable`, cada una con su suma y su diferencia. Una fila por categoría: nombre, barra horizontal **= % del total del periodo** (con la cifra), lo gastado, lo del periodo comparado, la diferencia (roja si sube, verde si baja), etiqueta `New` o `Gone`, en año la columna `A month`, y `Show movements`. Los sin categoría, en su fila `No category` dentro de `Variable`. | Barra relativa a la categoría más grande: barras más largas, pero ya no dicen qué parte del gasto es cada una. |
| 6 | **El código de `Monthly cost` se borra entero:** su carpeta, sus tests, su prueba de navegador, su ruta y su sección de la guía de uso. | Dejarlo sin ruta: código que nadie usa pero que hay que seguir compilando, y el backend no puede retirar su consulta. |

## ✅ Ya las cerraste tú (5)

- **Mes y año en la misma pantalla.** (2026-10-23)
- **Las categorías fijas vienen del backend**: aquí no se elige nada. (2026-10-23)
- **`Monthly cost` sale del menú en esta feature.** (2026-10-23)
- **Los movimientos de cada categoría, desplegados debajo de su línea.** (2026-10-23)
- **No se toca el backend.**

## 🧪 Cómo se comprobará que está hecho

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Al abrir, el mes por categoría, fijo y variable, total y diferencia | Test de la pantalla con una respuesta inventada, y prueba en navegador que entra por el menú |
| Al cambiar a año, lo mismo y la media mensual | Test de la pantalla, test de la fila y prueba en navegador |
| Al desplegar, sus movimientos | Tests de abrir una categoría; la que «ya no está» no tiene nada que abrir |
| Nueva o que ya no está, distinguida | Test de la fila con las etiquetas `New` y `Gone` |
| Los sin categoría y cuánto pesan | Test de la frase «N movements with no category — X %» |
| El total coincide con Overview | Test de que el total es el del backend sin tocar, y de que una respuesta que no suma no se enseña. **La igualdad con `Overview` con tus datos no tiene comando**: la garantiza el backend (ver 📌) |
| `Monthly cost` no está ni se abre | Test del menú y prueba en navegador de la dirección vieja |
| Inglés, oscuro, todo en verde | Los comandos de tipos, lint, formato, tests, build y `./init.sh`. «Inglés y oscuro», además, lo mira el reviewer |

Más 6 comprobaciones marcadas *(añadido)*: el nombre y sitio del menú, la frase primero, la comparación con el año pasado, que solo lee, el fallo con `Try again` y que el código viejo ya no existe.

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (6)

1. **El periodo se guarda en la dirección** (`?month=2026-09` o `?year=2025`): atrás y recargar enseñan lo mismo, como en `Overview`.
2. **No recalcula nada:** enseña las cifras del backend; si su total no es la suma de los bloques, dice que no se pudo leer.
3. **Los movimientos no dicen de qué cuenta son**, y una subcategoría sale con su nombre, sin el del padre: los dos pedirían otra consulta.
4. **Se vuelve a pedir al entrar en la pantalla**, no al terminar una importación.
5. **Si el backend falla**, lo dice con `Try again`, como todas las pantallas.
6. **16 requisitos, uno por encima del tope de ~15:** partirla separaría el borrado de `Monthly cost`, que pediste en esta misma feature.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Avisar a la sesión del backend** de que ya puede retirar `GET /api/recurring-expenses`: nadie la usará (su cabo suelto 29).
- **Mirar una vez con tus datos** que el total de un mes cerrado es el `Money out` de ese mes en `Overview`.

## ⚠️ Incoherencias conocidas que se heredan

- **Los `checks` de la F32 dejan de pasar**: comprueban tests que esta feature borra. Hay que vaciarlos al cerrar.
- **Un año con meses sin importar** divide igual entre 12 para `A month`, y el backend no avisa (está en su contrato).
