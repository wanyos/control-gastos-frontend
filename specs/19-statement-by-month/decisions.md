# Decisiones — F19 `statement-by-month`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** la pantalla `Movements` deja de estar vacía y se convierte en tu extracto:
entras y ves **el mes en curso entero** —lo pendiente y lo confirmado— con lo que entró,
lo que salió y la diferencia, y saltas de mes con dos flechas. **No toca:** el backend,
ni un solo dato de un movimiento (es de solo lectura). **No trae todavía:** filtros,
búsqueda ni el interruptor del ruido; son los pasos siguientes de esta etapa.
15 requisitos.

---

## 🔴 Confirma o corrige (6)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **El mes se elige con dos flechas** (‹ anterior · siguiente ›) y, para saltar lejos, con un **selector de mes** al lado, para no dar 20 clics hasta enero de 2024. La flecha de «siguiente» se apaga en el mes en curso. **Un mes sin datos no enseña una tabla vacía:** dice `No movements in September 2026.` y las flechas siguen funcionando. Hacia atrás no hay tope: el frontend no sabe dónde empieza tu histórico, así que un mes anterior a enero de 2024 sale vacío con esa misma frase. | Solo flechas (una cosa menos, 20 clics para llegar a 2024) o un **rango libre de fechas** — rompe el modelo «un mes» del que dependen las sumas y las cabeceras de día, y es justo lo que va en la feature de filtros. |
| 2 | **Las sumas son las tres del backend, etiquetadas `Money in` / `Money out` / `Difference`** —nunca «gastado» ni «ingresado»— y debajo, **siempre visible y sin botón de cerrar**, una nota que dice: *son los movimientos crudos del banco; las aperturas y vencimientos de depósito y las transferencias a cuentas tuyas no importadas cuentan como dinero que entra y sale; julio de 2026 lee 57.949 € de entrada y 59.096 € de salida, casi todo un depósito renovándose; los traspasos ya emparejados no están en estas cifras aunque se vean en la lista; la vista limpia necesita el interruptor del ruido, que llega después.* | Un aviso que se pueda cerrar, o un iconito con explicación al pasar el ratón: ocupa menos, pero se cierra una vez y no se vuelve a ver — y estas cifras están infladas hasta un 1.400 %. |
| 3 | **Lista continua con una cabecera por día** (`11 Sept 2026`), en el orden que manda la API, de lo más reciente a lo más antiguo. **La línea muestra concepto, cuenta, categoría e importe** con su signo; la **fecha la pone la cabecera del día**, no se repite 93 veces. | Una fila plana con la fecha en cada línea: más fácil de copiar a una hoja de cálculo, más ruido al leer. |
| 4 | **Un mes entero viene en una sola petición** de 200 movimientos, el máximo del contrato: tu mes más cargado tiene 93, así que nunca hará falta más. Si algún mes se pasara de 200, aparece un botón **`Load more`** que añade el resto al final (`Showing 200 of 412`) y **las sumas no cambian**, porque son del mes completo. | Páginas numeradas como en la cola de revisión: al pasar a la página 2 desaparece la primera mitad del mes, y sería un control que en tus datos nunca se usa. |
| 5 | **Los movimientos que el backend ya emparejó como traspaso llevan la marca `Transfer`.** Esto **no lo pediste**, y lo meto porque si no la pantalla miente por omisión: esos apuntes **se ven en la lista pero no están en las sumas** (así las calcula el backend), así que sumar las líneas a mano no cuadraría y nada lo explicaría. | No marcarlos: una etiqueta menos en cada línea, a cambio de una diferencia inexplicable entre lo que ves y lo que suma. |
| 6 | **El mes vivo está en la URL** (`/movements?month=2026-03`) y en ningún otro sitio: recargar y el botón de atrás funcionan, y puedes guardar un mes en favoritos. Si la URL trae un mes inválido (`2026-13`, escrito a mano), **se cae al mes en curso en silencio**, sin error. | Recordar el último mes que mirabas en el navegador: te devuelve donde estabas sin URL, pero no se puede enlazar ni compartir y hay dos sitios donde puede estar la verdad. |

## ✅ Ya las cerraste tú (6)

- **Al entrar, el mes en curso.** Sin tocar nada.
- **La pantalla es `Movements`**, la que ya está en el menú y hoy está vacía.
- **Sin columna de saldo:** es ruido que sobra (solo lo traen tres de tus cinco cuentas).
- **Corregir la categoría desde el extracto se queda para otra feature.** Esta solo mira.
- **Se ve todo:** lo pendiente y lo confirmado, sin filtro de estado.
- **En esta feature no hay filtros, ni búsqueda, ni interruptor del ruido.**

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (5)

1. **La pantalla es una feature nueva y aislada** (`features/statement/`): no importa
   nada de la cola de revisión ni de las reglas, así que no puede romperlas.
   La **fila se copia** de la de Review quitándole sus cuatro controles que escriben.
2. **Las sumas no se calculan aquí nunca**, ni para comprobar: se pintan tal cual vienen
   del backend. Solo se mira el signo de la diferencia para colorearla.
3. **El mes se construye como texto** (`2026-09-01` → `2026-09-30`), sin aritmética de
   fechas, para que ningún huso horario mueva un día ni en febrero de un año bisiesto.
4. **Si pulsas las flechas más rápido que la red, gana la última:** una respuesta vieja
   se descarta en vez de pintar septiembre con las sumas de julio.
5. **Los errores se cuentan en inglés y con frases propias**, nunca con el mensaje del
   backend (viene en español y nombra ids), y con un botón de reintentar.
   ⚠️ *Efecto:* el único test de una feature anterior que cambia es el que afirmaba que
   `/movements` era un placeholder a propósito. Es el que esta feature viene a jubilar.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Esta pantalla no arregla tus sumas, y no puede.** Medido: los 29 apuntes de depósito
  de myinvestor valen **285.000 € de gasto y 275.652 € de ingreso**, el 58 % de toda tu
  base, y **siguen contando** en lo que devuelve la API. No existe ningún campo que el
  frontend pueda escribir para sacarlos. Lo arregla **la feature del backend que ya está
  encargada** (una marca de «esto no cuenta»); hasta entonces, lo único honesto es la
  nota del 🔴 2.
- **Esa feature del backend también decide la E8.** Los dashboards heredarán el mismo
  ruido; conviene que la marca viva en un sitio y la usen las dos etapas.
- **Quedan tres rodajas de la E7 después de esta:** filtros y búsqueda, el interruptor
  del ruido, y corregir la categoría desde el extracto.
- **La comprobación final es con el backend real pero de solo lectura:** ninguna
  petición de esta pantalla escribe, así que no hace falta el aparato de la F17 (foto
  previa, visto bueno, vuelta atrás). Solo que estés delante comparando las cifras de un
  mes con lo que responde la API (T18 del plan).

## ⚠️ Incoherencias conocidas que se heredan

- **Las líneas visibles suman más que el total del mes**, siempre que haya traspasos:
  el backend los saca de las sumas pero los devuelve en la lista. Es lo que explica la
  marca `Transfer` del 🔴 5.
- **La marca `Transfer` no está en todos los traspasos.** Solo en las 40 parejas que el
  backend supo emparejar. Hay al menos **17 traspasos tuyos sin pareja** (envíos a
  Myinvestor, ING, Trade Republic y Criptan, cuentas cuyos extractos no están
  importados) que se verán como gasto normal y contarán en las sumas.
- **Dos de esas 40 parejas no son traspasos:** una multa y su reembolso por Bizum
  (150 € por lado). Aparecerán marcadas como `Transfer` y fuera de las sumas, y es un
  fallo del emparejador del backend, no de esta pantalla.
- **Septiembre de 2026 está incompleto:** tus datos acaban el día 11, así que el mes en
  curso se verá corto hasta la próxima importación.
