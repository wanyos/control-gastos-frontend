# Decisiones — F23 `statement-noise-toggle`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** encima de las cifras del extracto aparece una casilla
`Hide what does not count`. Al ponerla, la lista deja de mostrar lo que marcaste y
los traspasos emparejados, y a su lado sale `Hiding 34 movements`. Al quitarla, vuelve
todo. Y la nota permanente bajo las cifras —la que desde la F19 dice que están
infladas sin remedio y pone julio de 2026 de ejemplo— **se reescribe entera**: eso ya
no es verdad, y la nueva **no lleva ni un número escrito a mano**. **No toca:** el
backend, ningún dato, ningún importe. **Es solo lectura: el interruptor no escribe
nada, solo cambia la pregunta que se le hace a la API.** 15 requisitos.

> Dato que ordena todo lo demás: **las tres cifras no cambian al poner el
> interruptor**. Nunca incluyeron lo marcado ni los traspasos. Lo que arregla el
> interruptor es que la **lista** deje de contradecirlas.

---

## 🔴 Confirma o corrige (5)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Un solo interruptor**, no dos: `Hide what does not count` esconde a la vez lo marcado y los traspasos. Para ti son la misma idea, y cuando quieras distinguirlos ya lo ves fila a fila con las etiquetas `Not counted` y `Transfer` que puso la F22. | **Dos casillas independientes**: ganas poder esconder solo una de las dos familias, a cambio de 4 combinaciones que recordar, 4 direcciones distintas que compartir y 4 casos que probar. |
| 2 | **La nota nueva, palabra por palabra.** Parte fija (en inglés, como toda la pantalla): *«These figures already leave out what does not count: the two legs of a paired transfer, and everything you marked as not counted. Both stay in the list — turn on "Hide what does not count" to read the month without them. Two things no count can tell you: a transfer of yours whose other leg was never imported still counts as money in and out until you mark it, and a pair the app detected may not be a transfer at all.»* Y, **solo si el backend dice que hay alguno**, una frase más en vivo: *«{N} groups look like transfers but could not be paired automatically.»* (en singular, *«1 group looks like a transfer but could not be paired automatically.»*). En castellano: *las cifras ya dejan fuera los traspasos emparejados y lo que marcaste; las dos cosas siguen en la lista y el interruptor las esconde; dos cosas que ningún recuento puede decirte: un traspaso tuyo cuya otra pierna nunca se importó sigue contando como entrada y salida hasta que lo marques, y una pareja que detectó la app puede no ser un traspaso; y hay N grupos que parecen traspasos y no se pudieron emparejar solos.* **Ninguna cifra clavada a mano**: el «17» y el «2» desaparecen (ver 🔴 3). | **Dejar la nota entera fija**, sin la frase en vivo: cero peticiones extra, a cambio de que la pantalla no te avise nunca de que hay grupos dudosos esperando. |
| 3 | **Las cifras que son juicio tuyo se dicen sin número; solo va en vivo lo que el backend cuenta él.** El «17 traspasos sin pareja» salía de una búsqueda por conceptos que puede colar falsos positivos, y el «2 parejas falsas» de haber mirado dos multas a mano: ninguno de los dos lo sabe el programa, así que se cuentan en palabras, no en número. La **única cifra viva de la nota** es `ambiguousCount` de `GET /api/transfers/ambiguous`: **una petición por sesión** (no depende del mes ni de los filtros), y si falla o vale 0, la frase simplemente no sale. **Fuera del texto quedan a propósito:** cuántas parejas hay enlazadas (`GET /api/transfers` → es de toda tu historia, no del mes que estás mirando, y arrastra los 80 movimientos completos en la respuesta) y cuántos marcados hay en el mes (otra petición por cada mes y cada filtro, para partir en dos el `Hiding N` que ya ves). | **Meter también las parejas enlazadas y los marcados del mes**: la nota pasa de 1 petición por sesión a 1 por sesión + 1 por cada cambio de mes o de filtro, y se convierte en el panel que dijiste que no querías. |
| 4 | **Se dice el número, no el importe.** Con el interruptor puesto sale `Hiding 34 movements`. **El importe no se puede decir**: la API, cuando se le pide solo lo apartado, devuelve las tres sumas a cero **por definición** (esos movimientos no cuentan), y calcularlo aquí sería justo la aritmética inventada que esta pantalla lleva cinco features evitando. El número sí es del backend: cuesta **una petición extra por cada cambio de mes, de filtro o de búsqueda, y solo mientras el interruptor está puesto**. | **(a) Sumar los importes en el cliente**: tendrías el «por cuánto», a cambio de traerte todas las páginas de lo escondido y de que esa cifra sea la única de la pantalla fabricada aquí. **(b) No decir nada**: cero peticiones extra, y te quedas sin saber cuánto has apartado. |
| 5 | **Si el interruptor y un filtro se contradicen, no gana ninguno: se aplican los dos.** Puedes acabar con la pantalla vacía (buscas algo que solo existe entre lo apartado), y entonces sale un texto que nombra las dos causas y un botón `Show everything`. Además: **cambiar el interruptor vacía la selección de la F22** (el modo selección sigue puesto), igual que ya hace cambiar de mes; y si marcas algo con el interruptor puesto, **esa fila desaparece** y el `Undo` de la línea de aviso la devuelve. | **Que el interruptor gane y apague el filtro** (o al revés): nunca ves la pantalla vacía, a cambio de que un gesto tuyo deshaga otro gesto tuyo sin avisar. |

## ✅ Ya las cerraste tú (3)

- **Al entrar se ve todo.** El interruptor empieza apagado, siempre, y nunca se pone solo.
- **Esconder es una vista, no un borrado.** Lo apartado se sigue pudiendo ver: se quita el interruptor y vuelve.
- **No se toca el backend.** Los dos parámetros que hacen falta ya existen desde su feature 49.

> **Segunda vuelta (2026-09-29).** Ya diste por buenos los puntos **🔴 1, 4 y 5** (un
> solo interruptor; el número y no el importe; interruptor y filtros aplicándose los
> dos) y que la nota deje de ser alarma ámbar y pase a nota gris informativa. Siguen
> en la tabla tal cual, sin tocar, solo para que no haya que buscarlos en otro sitio.
> **Lo único nuevo a confirmar son los puntos 2 y 3.**

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (4)

1. **El interruptor vive en la dirección de la página** (`hide=true`), junto al mes y
   a los filtros. Así se recuerda al cambiar de mes, al recargar, al volver atrás y al
   compartir el enlace, sin guardar nada en el navegador.
   ⚠️ *Efecto:* si abres la app «desde cero» (sin esa dirección) empieza apagado. Es
   lo que pediste.
2. **`Clear filters` NO apaga el interruptor.** Limpia la barra de filtros y nada más:
   volver a ver el ruido tiene que ser un gesto tuyo, consciente.
3. **Esconder se hace en el servidor, no aquí.** Se le pide al backend el mes ya sin
   esas filas, en la misma petición de siempre; el recuento del mes, el `Load more` y
   las tres cifras siguen siendo suyos. Filtrar la lista ya descargada habría roto los
   tres.
4. **Si la petición del número falla, no pasa nada visible:** desaparece el
   `Hiding N` y el mes, las cifras y la lista siguen ahí. Es un dato de adorno y no
   puede robarle la pantalla a un mes que sí cargó.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Los traspasos tuyos que se quedaron sin pareja los tienes que marcar tú, a mano**,
  con el gesto de la F22, según los vayas viendo en la lista. La medición de septiembre
  encontró unos cuantos (sobre todo envíos de bankinter a Myinvestor de 2024 y 2025,
  cuya otra pierna nunca se importó), pero **ese recuento no entra en la nota**: es un
  juicio tuyo, no algo que el programa sepa. Mientras no los marques, siguen contando.
- **Las parejas detectadas que no son traspasos** (la medición encontró dos multas
  casadas con Bizums de otra persona) **no se pueden deshacer desde esta pantalla**:
  hace falta `DELETE /api/transfers/:id`, que ninguna pantalla usa todavía. Decide si
  quieres una feature para revisar parejas —ya está en la E7— o lo haces con `curl`.
- **La nota no caduca sola y no hay que avisarme para actualizarla.** Es la diferencia
  con la de la F19: lo que no se puede contar va en palabras, y la única cifra que
  lleva la calcula el backend en cada sesión.
- **La comprobación final es de solo lectura y se hace contigo delante** (T20 del
  plan): julio de 2026 y el mes en curso, con el interruptor puesto y quitado, con
  filtro de cuenta, con `Uncategorized` y con una búsqueda que deje la pantalla vacía,
  comparando cada combinación con lo que devuelve la API. **No se escribe nada**, así
  que no hace falta visto bueno previo, solo que estés ahí.

## ⚠️ Incoherencias conocidas que se heredan

- **`Hiding N` es un número, no un importe.** El «por cuánto» que pediste no existe en
  la API (🔴 4). Si lo quieres de verdad, la vía honesta es una feature futura en el
  backend, no un cálculo aquí.
- **Con el interruptor quitado sigue pasando lo de la F22:** el recuento de arriba
  («93 movements») cuenta también lo apartado, y las tres cifras no. Con el
  interruptor puesto ya cuadran; sin él, no. Es lo que el interruptor viene a resolver,
  no a esconder.
- **El `Undo` de la F22 muere al cambiar el interruptor**, igual que ya muere al
  cambiar de mes o de filtro.
- **La cola de revisión no tiene interruptor.** Esto es solo del extracto.
- **`N groups look like transfers…` no es «los traspasos que te faltan por marcar».**
  Son los grupos que el emparejador vio y no supo resolver; un traspaso tuyo cuya otra
  pierna nunca se importó **no sale ahí** porque no tiene con quién casarse. Por eso la
  nota lo dice también en palabras.
- **Esa cifra se pide una vez por sesión**, así que si arreglas una pareja desde otro
  sitio, la nota no cambia hasta que recargues.
