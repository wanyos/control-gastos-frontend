# Decisiones — F16 `review-actions`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** en la pantalla **Review** ya existente, te deja **ponerle categoría** a
un movimiento y **darlo por revisado**, de uno en uno o **marcando varios y
resolviéndolos de una vez** (hasta la página entera), con un **Undo** para la última
acción. **No toca nada más:** ni los filtros, ni la búsqueda, ni los totales, ni el
backend; y sigue sin poder editarse importe, fecha ni descripción. Traspasos y reglas
de categorías siguen fuera. 14 requisitos.

---

## 🔴 Confirma o corrige (6)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Se marca con una casilla por fila**, más una de «marcar todos los de esta página» (100 como mucho, por debajo del tope de 200 del backend). **Al cambiar de página, de filtro o al buscar, lo marcado se suelta.** | Que la selección te siga entre páginas: te deja pasarte de 200 y confirmar a ciegas cosas que ya no estás viendo. |
| 2 | **Categorizar y confirmar son dos gestos distintos.** Eliges la categoría en la fila y **se guarda sola** (sin botón de guardar), y `Confirm` es aparte: puedes categorizar hoy y confirmar mañana. | Un único gesto «categorizar y dar por revisado» en el mismo clic: menos clics, pero pierdes poder dejar algo categorizado y aún pendiente. |
| 3 | **A partir de 20 movimientos**, una acción en bloque pide confirmación en una ventanita que dice cuántos son. Por debajo, basta con que el botón lleve el número (`Confirm 12 movements`). | Preguntar siempre (un clic de más también para 3) o no preguntar nunca (con 100 de golpe da vértigo). |
| 4 | **Al confirmar, la fila desaparece de la cola al instante** y el número de la barra lateral baja. Es una lista de pendientes: lo confirmado ya no pertenece a ella. | Dejarlas en pantalla tachadas hasta recargar: ves lo que acabas de hacer, pero el «N movements» deja de casar con lo que hay. |
| 5 | **Undo de la última acción**, en un aviso sobre la lista (`3 movements confirmed · Undo`). **Sin cuenta atrás:** dura hasta la siguiente acción o hasta que te vas de la pantalla. Devuelve categoría y estado a como estaban. | Un aviso con temporizador (10 s) al estilo de Gmail: más discreto, pero te obliga a correr. |
| 6 | **Los que no admiten la categoría se quedan fuera antes de enviar nada:** los traspasos y demás `neutral` nunca se categorizan, y una categoría de gasto no se aplica a un ingreso. Te lo dice antes: `Applies to 2 of 4 selected`. | Mandarlos todos y enseñar el error del backend: como es todo o nada, un solo movimiento incompatible tumbaría la operación entera. |

## ✅ Ya las cerraste tú (5)

- **No se toca el backend:** el contrato ya tiene los dos `PATCH` que hacen falta.
- **Nada de editar importe, fecha ni descripción:** son el hecho bancario.
- **Una acción en bloque es explícita y dice a cuántos afecta** antes de ejecutarse.
- **Traspasos ambiguos y reglas de categorías, más adelante:** aquí no.
- **Todo en inglés y en oscuro,** con cifras y fechas del formato ya fijado.

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (7)

1. **El backend es todo o nada:** o cambia todo lo que le mandas o no cambia nada. Por
   eso la pantalla nunca enseña «estos sí y estos no»; ante un fallo dice que no se
   cambió nada y por qué, en inglés, y tú sigues con lo marcado.
2. **La respuesta trae los movimientos ya cambiados** y se aprovecha para refrescar la
   lista al momento, sin recargar la página.
   ⚠️ *Efecto:* justo después se vuelve a pedir la página **en segundo plano**, para
   que el «N movements» y las sumas sigan siendo los que calcula el backend y no una
   cuenta inventada aquí.
3. **Tope de 200 movimientos por petición**, el del contrato. Con 100 por página nunca
   se llega; aun así hay una barrera que impide enviar más, o repetidos, o ninguno.
4. **Solo viajan tres cosas al servidor:** la lista de ids, la categoría y el estado.
   Cualquier otra propiedad sería un error del backend, y el cuerpo se construye
   campo a campo para que no se cuele.
5. **El contador de la barra lateral y los totales se actualizan tras cada acción,**
   igual que tras una importación.
6. **Mientras se aplica un cambio** el botón se queda en «cargando» y un segundo clic
   no lanza una segunda petición; al terminar, una línea te dice qué pasó.
7. **Se reutiliza todo lo de la F15** (lista, filtros, tipos, cliente HTTP, validación
   de respuestas, botones y campos) y **no entra ninguna librería nueva**.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Esta feature escribe en tu base de datos de verdad.** Es la primera que lo hace
  desde la web: hasta ahora la pantalla solo leía.
- **Las pruebas contra el backend real se harán con tu visto bueno y sobre pocos
  movimientos** (uno o dos), confirmando y deshaciendo a continuación para dejarlo
  como estaba. Si prefieres que no se toque nada real, se dice y la comprobación
  queda anotada como pendiente.
- **Decide si 20 es tu número** para el 🔴 3: es el único valor inventado de la hoja y
  es el que va a marcar cuántas veces te sale una ventanita al día.

## ⚠️ Incoherencias conocidas que se heredan

- **Un movimiento ya confirmado deja de verse desde esta pantalla:** si te arrepientes
  después de haber hecho otra cosa (o de salir), el `Undo` ya no está y no hay dónde
  encontrarlo hasta que exista el extracto de la E7.
- **`Movements` sigue siendo una página vacía** (placeholder) hasta la E7.
