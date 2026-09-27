# Decisiones — F20 `statement-filters`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** en el extracto que cerró la F19 aparece una barra con **cuatro cosas**:
buscar por un trozo del concepto, cuenta, categoría y una casilla **sin categoría**.
Afinan el mes que estás mirando y las cifras pasan a ser las de lo filtrado, siempre
calculadas por el backend. **No toca:** el backend, ni un dato de un movimiento (sigue
siendo solo mirar), ni la navegación por meses, ni la cola de revisión.
**No trae:** rango libre de fechas ni el interruptor del ruido. 15 requisitos.

---

## 🔴 Confirma o corrige (5)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **La barra de la cola de revisión se parte en dos: se comparte el cerebro, se copia la cara.** Lo delicado (las reglas de la búsqueda y la lectura de la URL) se muda a un sitio común que las dos pantallas usan, y el extracto estrena su propia barra con **solo sus cuatro controles**. En el extracto **no salen** los otros tres de la cola: **tipo** (el signo del importe ya lo dice), **estado** (tú cerraste que el extracto enseña lo pendiente y lo confirmado) y **desde/hasta** (el mes manda). | **Compartir la barra entera** con interruptores para esconder controles: ~60 líneas menos, pero cada cambio futuro del extracto pasa por el componente del que dependen la F15 y la F16, y se pueden romper. **O copiarla tal cual:** cero riesgo hoy, y dos copias de las reglas de la búsqueda que tienen que casar al carácter con el backend. |
| 2 | **Con filtros puestos, las tres cifras siguen llamándose igual** (`Money in` / `Money out` / `Difference`) y debajo aparece **una línea** que dice qué has filtrado y cuántos son: `12 movements match these filters in March 2026 · Uncategorized · "luz"`. **No se pide el mes sin filtrar** para poder decir «12 de 93». | Decir «12 de 93»: se lee mejor, cuesta **una petición más cada vez que tocas un filtro**. O no enseñar nada: las cifras cambiarían sin que nada explique por qué. |
| 3 | **URL:** el mes sigue en `?month=2026-03` y los filtros van al lado con **las mismas claves que ya usa la cola** (`account`, `category`, `uncategorized`, `q`), así recargar y el botón de atrás siguen funcionando. Una URL a mano con **categoría y «sin categoría» a la vez** (que el backend rechaza con un 400) **se arregla aquí antes de pedir nada: gana «sin categoría»**, en silencio y sin error; la petición prohibida no sale nunca. Si la URL trae una cuenta o categoría **borrada**, eso sí es un 404 real y se ve un mensaje con el botón de quitar filtros. | Mandarla tal cual y pintar el error del backend: una pantalla en rojo por una URL vieja, y un mensaje que no puedes arreglar salvo tocando la dirección. |
| 4 | **Los dos desplegables se llenan con todo lo que existe:** tus **5 cuentas** y tus **16 categorías**, pedidas una sola vez al entrar. Cuesta una llamada más (la lista de cuentas, que el frontend aún no usaba). | Llenarlos con lo que aparece en el mes cargado, que es lo que hoy hace la cola con las cuentas: cero llamadas nuevas, pero en cuanto filtras por una cuenta el desplegable se queda con esa sola, y un mes tranquilo te esconde cuentas que sí tienes. |
| 5 | **«Sin categoría» arranca apagado:** entrar en el extracto sigue enseñando el mes entero, y el filtro que más vas a usar (1.373 de tus 1.607 movimientos no tienen categoría) queda a un clic. | Marcarlo por defecto o poner un atajo fijo en la cabecera: te ahorra ese clic, a cambio de que el extracto ya no sea «mi mes tal cual» al entrar. |

## ✅ Ya las cerraste tú (5)

- **Los filtros afinan el mes**, no lo sustituyen: la navegación por meses se queda.
- **Nada de rango libre de fechas todavía.** Si hace falta, se añade después.
- **Las sumas siguen siendo las del backend**, ahora calculadas sobre el filtro.
- **Sigue siendo solo mirar:** esta feature no escribe nada.
- **Al cambiar de mes los filtros se quedan puestos**, y se pueden quitar todos de un
  botón sin que cambie el mes que estás viendo.

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (5)

1. **La búsqueda espera 350 ms desde la última tecla**, la misma espera que la cola y
   que la previsualización de reglas: no hay dos esperas distintas en la aplicación.
2. **Menos de 2 letras no viaja** (escribir la primera no es un error, simplemente no
   se pide nada) y **más de 100 avisa** junto al campo sin llamar al backend: son los
   dos límites exactos del contrato.
3. **Las tildes no se tocan en la pantalla:** el texto va tal cual y el backend ya
   compara sin tildes ni mayúsculas, así que `cafeteria` encuentra `CAFETERÍA`.
4. **Al cambiar un filtro se vuelve al principio del mes** y se descarta lo que
   hubiera traído `Load more`: esa lista era del filtro anterior.
5. **Filtrar no se guarda en el historial del navegador** (escribir en la búsqueda
   llenaría el botón de atrás de basura); **cambiar de mes sí**, como en la F19.
   ⚠️ *Efecto:* si un desplegable no carga (falla su petición), se apaga **solo ese**
   y el resto de la pantalla sigue funcionando.

## 📌 Consecuencias que te tocan a ti (no son código)

- **La nota permanente sobre las sumas infladas no cambia ni una palabra**, y sigue
  sin poder cerrarse, también con filtros puestos. Su ejemplo (julio de 2026) habla de
  un mes entero y sigue siendo verdad; lo que dice sobre qué se ha calculado cada
  cifra es la línea nueva del 🔴 2. **Cuidado con una lectura fácil:** filtrar por una
  cuenta o por «sin categoría» **no limpia** el ruido de los depósitos — si filtras por
  myinvestor verás las cifras más infladas de toda tu base, no las más limpias.
- **La comprobación final es con el backend real, contigo delante y de solo lectura**
  (T17 del plan): ocho combinaciones de filtros en un mes con datos, comparando cifras
  y recuento con lo que responde la API, más una URL a mano con la combinación
  imposible para ver que no sale ningún 400.
- **Quedan dos rodajas de la E7 después de esta:** el interruptor del ruido (espera la
  parte 1 del encargo al backend) y corregir la categoría desde el extracto.

## ⚠️ Incoherencias conocidas que se heredan

- **La cola de revisión y el extracto no filtran igual**, a propósito: la cola tiene
  tipo, estado y fechas porque es una lista de trabajo; el extracto no.
- **Las líneas visibles siguen sumando más que el total**, con filtros o sin ellos:
  los traspasos emparejados se ven en la lista pero no cuentan en las cifras (de ahí la
  marca `Transfer` de la F19).
- **Filtrar por una categoría no arrastra sus subcategorías:** el backend pide la
  categoría exacta, así que «Ocio» no trae lo de sus hijas. Si te molesta, es una
  feature del backend, no de esta pantalla.
