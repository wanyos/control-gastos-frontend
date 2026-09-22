# Decisiones — F17 `category-rules`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** desde una fila de **Review** creas una regla («lo que contenga este texto va
a esta categoría»); en una pantalla nueva **Rules** ves tus reglas, las cambias y las
borras; y con **Apply rules** las pasas sobre lo pendiente sin reimportar, viendo cuántos
se categorizaron, cuántos no casan con ninguna regla y qué movimientos chocan. **No toca:**
categorías, conflictos (solo se ven), el backend, ni nada ya confirmado o ya categorizado.
14 requisitos.

---

## 🔴 Confirma o corrige (6)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Las reglas tienen pantalla propia, `Rules`, en la barra lateral justo debajo de `Review`.** Desde Review solo se *crea* la regla (un botón por fila) y se puede aplicar justo después. | Un panel plegable dentro de Review: todo en un sitio, pero en una pantalla que ya lleva filtros, barra de acciones, avisos y 100 filas. |
| 2 | **El texto propuesto es la primera palabra con sentido del concepto**, saltando palabras de trámite del banco (`recib`, `compra`, `tarj`, `transferencia`, `bizum`, `clientes`…): «RECIB /IBERDROLA CLIENTES, S.A» → `iberdrola`. Lo puedes editar antes de guardar. La lista de palabras de trámite la escribo yo **sin mirar tus extractos**. | Proponer el concepto entero (`recib /iberdrola clientes, s.a`) y que lo recortes tú: nunca se pasa de amplio, pero si no lo recortas solo casa con conceptos idénticos. |
| 3 | **Crear una regla no aplica nada.** Al crearla sale un aviso `Rule "iberdrola" → Suministros created.` con un botón `Apply rules now`; aplicar es siempre un gesto aparte. | Aplicar sola al crear cada regla: un clic menos, pero una escritura en masa sin deshacer cada vez que creas una. |
| 4 | **Aplicar pide confirmación siempre**, en una ventana que dice que solo toca pendientes sin categoría, nunca lo confirmado ni lo ya categorizado, y que **no se puede deshacer desde la app**. No puede decir cuántos cambiará: el backend no lo sabe de antemano. | No preguntar: el backend solo rellena huecos y repetirlo no cambia nada; pero una regla con un texto flojo categoriza cientos sin aviso. |
| 5 | **Crear la regla no categoriza el propio movimiento**: se categoriza al aplicar, como los demás (si sigue sin categoría). | Que crear la regla le ponga también la categoría a ese movimiento: más natural, pero son dos escrituras y, si falla la segunda, queda la regla creada y el movimiento no. |
| 6 | **El resultado enseña todos los conflictos**, no los 10 primeros como el informe de importación: fecha, concepto y cada regla que choca con su categoría. Solo lectura, en la misma ventana. | Los 10 primeros + «and N more», igual que la importación: más corto, pero aquí verlos es justo lo que pediste. |

## ✅ Ya las cerraste tú (5)

- **No se toca el backend:** los cinco endpoints de reglas ya existen.
- **Aplicar nunca pisa lo confirmado ni lo que ya tiene categoría** (lo garantiza el backend).
- **Los conflictos se ven, no se resuelven** desde la web.
- **Ni crear ni editar categorías.**
- **Borrar o cambiar una regla no toca lo ya categorizado:** la pantalla no manda nada
  sobre movimientos al hacerlo, y la ventana de borrar lo dice.

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (7)

1. **Solo se ofrecen categorías del tipo del movimiento** (gasto → categorías de gasto) y,
   al cambiar una regla, solo las de su mismo tipo.
2. **Texto de menos de 3 letras o dígitos:** te lo dice al escribir y no deja guardar.
   **Texto repetido:** lo dice el backend (409) y la ventana sigue abierta con lo escrito.
3. **Errores en inglés, nunca el mensaje del backend** (viene en español).
4. **Tras aplicar, la cola de Review, sus totales y el contador se vuelven a pedir** sin
   recargar, y se sueltan la selección y el `Undo` de la F16.
   ⚠️ *Efecto:* el `Undo` de tu última acción desaparece al aplicar reglas.
5. **Si la pasada falla** (o la respuesta no se entiende), no se enseñan cifras: se dice
   que algunos pueden haberse categorizado ya y se recarga la cola.
6. **En `Rules` no hay botón de «nueva regla»:** nacen siempre de un movimiento, como pediste.
7. **Las categorías pasan a una pieza común** de la app (ya las usaban Review y ahora
   también Rules); Review sigue funcionando igual y **no entra ninguna librería nueva**.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Aplicar reglas escribe en masa sobre tus datos reales** (hoy, 1.379 pendientes sin
  categoría) y **no se puede deshacer**: el backend ni siquiera dice *qué* movimientos
  categorizó, solo cuántos.
- **Aplicar pasa todas tus reglas, no solo la nueva**, incluidas las de la semilla del
  backend si la lanzaste.
- **La prueba contra el backend real necesita tu visto bueno:** una regla de texto muy
  concreto (1-2 movimientos), una sola aplicación, foto de los ids antes y después, y
  vuelta atrás acordada contigo. Si salen más de los esperados, se para y te los enseño.
- **Revisa la lista de palabras de trámite del 🔴 2** con tus conceptos reales cuando la veas fallar.

## ⚠️ Incoherencias conocidas que se heredan

- **Si a un pendiente le quitas la categoría en Review y una regla casa con él, aplicar
  se la vuelve a poner.** Para que no pase, confírmalo sin categoría o cambia la regla.
- **Los conflictos no se guardan:** al cerrar la ventana desaparecen; para volver a
  verlos, se aplica otra vez (no cambia nada lo ya hecho).
