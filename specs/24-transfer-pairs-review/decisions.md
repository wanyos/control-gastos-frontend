# Decisiones — F24 `transfer-pairs-review`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** una pantalla nueva, `Transfers`, con dos partes: los **traspasos
dudosos** (grupos que la importación no supo emparejar), donde eliges dos y los
enlazas, y **todas las parejas enlazadas**, cada una con sus dos movimientos (fecha,
cuenta, concepto, importe) y un botón `Unlink`. **Escribe, y solo dos cosas:**
enlazar y desenlazar. Ni importes, ni fechas, ni categorías, ni estado, ni la marca de
«no cuenta». **No toca** el backend. 15 requisitos, en el tope.

> **Dato que cambia el punto de partida.** Leí tus datos hoy (solo lectura): hay **38
> parejas, no 40**. **Las dos multas ya están deshechas desde el 28-09 a las 16:46**
> (sus cuatro movimientos tienen el enlace vacío y vuelven a contar). Hoy la pantalla
> enseñará 38 parejas buenas, ninguna marcada, y 0 dudosos.

---

## 🔴 Confirma o corrige (5)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Una sola señal, y dice lo que ve, no lo que sospecha:** si el concepto de alguna de las dos patas contiene «bizum», la pareja lleva una etiqueta `Bizum` y la frase *«A Bizum usually comes from another person, not from one of your accounts.»* La lista no se reordena ni se filtra. Medido: **0 de tus 38 parejas buenas** la llevarían; **las 2 multas, sí**. No caza una pareja falsa que no sea un Bizum (p. ej. un reembolso por transferencia). | **(a) Sin señal:** ves los dos conceptos y juzgas tú. **(b) «Ninguna pata te nombra a ti ni a un banco tuyo»:** también 0 falsos hoy y cazaría más casos, a cambio de escribir tu nombre y tus bancos en el código. Descarté la ruta rara (n26 → openbank) y la distancia de fechas: la primera acierta por casualidad y la segunda marcaría 6 buenas. |
| 2 | **Deshacer pide confirmación y deja `Undo`.** El diálogo nombra los dos movimientos y dice *«Both movements will count in your totals again. The next import won't pair these two again.»* (si alguno lo marcaste como que no cuenta, dice que ese sigue fuera). Después: *«Pair unlinked. Its two movements count in your totals again.»* con `Undo`, que los vuelve a enlazar. Motivo del `Undo`: una pareja deshecha **no vuelve a salir como dudosa**, así que sin él un clic equivocado no se arregla desde la web. | **Solo confirmación, sin `Undo`:** más simple; si te equivocas, se vuelve a enlazar con `curl`. |
| 3 | **Un grupo dudoso se enseña en dos columnas, `Money out` y `Money in`, y eliges uno de cada** (nada elegido de antemano). `Link these two` no se activa hasta que hay uno en cada columna **y de cuentas distintas**; si eliges dos de la misma cuenta, lo dice. El importe no hace falta comprobarlo: es el mismo para todo el grupo. Con eso, el 400 y la mayoría de 409 no llegan a verse. **Enlazar no pide confirmación:** lleva `Undo`, y la pareja nueva aparece en la lista para deshacerla cuando quieras. | **(a) Confirmar también al enlazar:** un clic más. **(b) Casillas libres** (eliges dos cualesquiera) y error al pulsar si son del mismo tipo: más flexible, y te deja pedir lo que el backend rechaza. |
| 4 | **Se llama `Transfers`, va justo debajo de `Rules`** (dirección `/transfers`). Arriba la sección **dudosos** (una línea cuando no hay: *«No doubtful transfers. When an import finds money that looks like a transfer between your accounts but can't tell which movements go together, the group shows up here.»*), y debajo **`Linked pairs (38)`**. Dudosos arriba porque son lo único que pide acción; hoy ocupan una línea. | **Parejas arriba y dudosos debajo** (tendrías que bajar 38 parejas para ver si hay alguno), o **otro nombre**: `Transfer pairs`, `Pairs`. |
| 5 | **La prueba final escribe en tu base y no se hace sin tu «sí».** Como las multas ya están deshechas, propongo: con `curl`, volver a enlazar **solo la de 100 €** (junio de 2025), ver que en la pantalla sale con `Bizum` y **ninguna otra**, deshacerla desde la pantalla, `Undo`, y deshacerla otra vez; comprobando cada vez que las sumas de junio de 2025 bajan y vuelven 100 € por lado. Termina como está hoy (deshecha). **La de 50 € no se toca.** | **Deshacer y `Undo` en el acto sobre una pareja buena**, dejándola enlazada: no prueba la etiqueta con un caso real. O **sin prueba real** (solo tests con datos fabricados). |

## ✅ Ya las cerraste tú (5)

- **Pantalla propia**, una entrada más en el menú junto a `Rules`.
- **Se ven todas las parejas**, para que juzgues tú; la etiqueta ayuda, no esconde.
- **Emparejar dudosos entra en esta feature**, aunque hoy no tengas ninguno: se prueba con grupos fabricados de 2, 3 y 4 movimientos.
- **Nada se empareja ni se desempareja solo:** cada escritura sale de un clic tuyo.
- **No se toca el backend** ni se edita ningún otro dato del movimiento.

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (4)

1. **La petición de enlazar lleva un solo campo, los dos ids**, construida en un único sitio; un test lee el cuerpo letra por letra, y otro comprueba que la pantalla no hace ninguna otra escritura.
2. **Tras cada escritura se vuelven a pedir las dos listas**, sin parpadeo: deshacer una pareja puede crear un grupo dudoso nuevo y enlazar puede hacer desaparecer uno, y eso solo lo sabe el backend.
3. **Los errores, en inglés y con palabras nuestras** (nunca el mensaje del backend); si el fallo pudo haber escrito, recarga en vez de afirmar que no pasó nada. Mismo criterio que F16, F21 y F22.
4. **Si falla una de las dos listas, la otra se ve igual**, con su `Try again` en la que falló.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Cada `Unlink` mueve tus sumas históricas:** esos dos movimientos vuelven a contar como gasto e ingreso en su mes, en el extracto y en los dashboards que vienen. Deshaz solo lo que sepas que no es un traspaso tuyo.
- **Las tres parejas iguales del 24-07-2026** (1.000 € bankinter → openbank, tres veces): **no está claro que sean duplicados**, y eso solo lo sabes tú. Comprobado el 2026-10-02: las tres salidas de bankinter entraron en la **misma** importación y con posición distinta en el día (1, 2 y 3), y openbank trae por su lado otras tres entradas el día 23. Dos bancos contando tres líneas cada uno apunta a **tres transferencias de verdad**, no a una reimportación. En cualquier caso están bien emparejadas: no las deshagas salvo que sepas que sobran.
- **Pasado el `Undo`, una pareja deshecha no se recupera desde la web**: la importación no la vuelve a juntar y no sale como dudosa. Quedaría `curl`.
- **La multa de 50 € (septiembre de 2024) ya está como debe**, deshecha; la prueba no la toca.

## ⚠️ Incoherencias conocidas que se heredan

- **El texto de tu feature dice «ahora mismo hay dos multas»**: ya no es así desde el 28-09. La feature sigue teniendo sentido (revisar, deshacer, emparejar), pero hoy no tendrás nada que corregir.
- **La etiqueta `Bizum` solo ve Bizums.** Una pareja falsa por transferencia de un tercero pasaría sin marca; para eso está la lista entera a la vista.
- **`Undo` solo deshace la última acción** y muere al salir de la pantalla, como en el extracto.
- **La nota del extracto (F23)** avisa de que una pareja puede no ser un traspaso, pero no enlaza a esta pantalla. Se deja así.
