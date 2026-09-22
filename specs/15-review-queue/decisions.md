# Decisiones — F15 `review-queue`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** añade la pantalla **Review** con la cola de movimientos pendientes
(fecha, descripción, cuenta, importe y categoría), filtros por cuenta, fechas, tipo,
categoría y «sin categoría», búsqueda por el concepto, paginación y los totales que
da la API. Pone el número de pendientes en la barra lateral. **Es solo mirar:** no
confirma, no categoriza y no escribe nada (eso es la F16). 14 requisitos.

---

## 🔴 Confirma o corrige (6)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | La pantalla vive en **`/review`**, entrada nueva en la barra lateral debajo de Net Worth. El placeholder **Movements se queda** para el extracto de la E7. | Sustituir Movements por Review y dejar la app sin hueco para el extracto hasta la E7 (habría que reubicarlo entonces). |
| 2 | La pantalla enseña **solo lo pendiente de revisar**; no hay filtro de estado. Es la cola: lo confirmado desaparece de ella. | Añadir un selector «Pending / Confirmed / All». Cuesta poco, pero convierte la cola en un extracto a medias y el número de la barra lateral deja de casar con lo que ves. |
| 3 | **Los filtros y la página van en la dirección web:** puedes recargar, volver atrás y guardar el enlace sin perder lo que mirabas. | Filtros solo en memoria: más simple, pero recargar o volver atrás te devuelve a la cola entera. |
| 4 | **La búsqueda se lanza sola mientras escribes**, 0,35 s después de la última tecla. Debajo del campo pone «Searches the description, ignoring case and accents». Con menos de 2 letras no busca; con más de 100 avisa y no manda nada. | Buscar solo al pulsar Intro: menos peticiones, un gesto más en lo que más vas a repetir. |
| 5 | **100 movimientos por página** (el backend trae 50 por defecto y admite hasta 200). Con 100, en la F16 podrás marcar la página entera de una vez. | 50, páginas más cortas y más clics para vaciar 1.378 pendientes; o 200, una sola página larguísima de leer. |
| 6 | **El número de la barra lateral** sale de preguntar cuántos pendientes hay y se refresca al abrir la app, al terminar una importación y cada vez que cargas la cola sin filtros. Si la consulta falla, no se enseña número (nunca un error ahí). | Refrescarlo solo al entrar en la pantalla: una petición menos al arrancar, pero el número se queda viejo mientras navegas por el resto de la app. |

## ✅ Ya las cerraste tú (5)

- **La lista viene ordenada de lo más reciente a lo más antiguo** y no se reordena aquí.
- **No se toca el backend:** el contrato ya trae todos los filtros que hacen falta.
- **Nada de editar importe, fecha ni descripción:** son el hecho bancario.
- **Confirmar y categorizar, en la F16;** esta pantalla solo mira.
- **Todo en inglés y en oscuro,** con las cifras y fechas del formato ya fijado
  (`1.234,56 €`, `31 Jul 2026`).

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (7)

1. **Esta pantalla no escribe nada.** Solo hace dos consultas de lectura: la lista de
   movimientos y la de categorías. Hay una comprobación de cierre que falla si
   aparece una escritura.
2. **La F16 tiene el sitio hecho:** cada fila reserva un hueco a la izquierda para su
   casilla de selección y queda espacio bajo los filtros para la barra de acciones,
   pero **no se construye nada de eso** ahora.
3. **El total y las sumas se enseñan tal y como los da la API**, nunca sumando la
   página que estás viendo: la API los calcula sobre todas las coincidencias del
   filtro y la página solo trae 100.
4. **Nunca se piden a la vez «esta categoría» y «sin categoría»** (el backend lo
   rechaza): elegir una cosa limpia la otra en la pantalla.
5. **Si la lista falla, la pantalla sigue usable** y te dice qué pasó en cristiano:
   cuenta o categoría que ya no existe, filtros rechazados, o servidor inalcanzable
   con un botón para reintentar. Si pides una página que ya no existe (porque el
   filtro estrechó la cola), vuelve sola a la primera y te lo dice.
6. **El desplegable de cuentas se rellena con las cuentas que aparecen en la lista**,
   sin pedir el listado completo de cuentas: una consulta menos.
   ⚠️ *Efecto:* si filtras muy estrecho, el desplegable enseña pocas cuentas.
   Si molesta, se añade la consulta de cuentas en una feature posterior.
7. **Se reutiliza lo que ya hay** (cliente HTTP, validación de respuestas, formato de
   cifras, tarjetas y botones) y **no entra ninguna librería nueva**; la fila se porta
   del diseño (`TransactionRow`) y los filtros de sus controles de formulario.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Probar con el backend real es seguro:** la pantalla solo lee. El implementer lo
  comprobará contra tus datos de verdad y **no modificará ni un movimiento**. La
  primera escritura llega con la F16, y ahí sí habrá que tener cuidado.
- **Mientras esta feature no esté aprobada, la cola sigue creciendo** con cada
  importación: la F13 ya te dice «N new movements are waiting for your review», pero
  hasta aquí no hay dónde mirarlos.

## ⚠️ Incoherencias conocidas que se heredan

- La pantalla te deja **ver** la cola pero no vaciarla: hasta la F16 el número de la
  barra lateral solo puede subir.
- **Movements sigue siendo una página vacía** (placeholder) hasta la E7; durante un
  tiempo convivirán «Review» y «Movements» en la barra lateral.
