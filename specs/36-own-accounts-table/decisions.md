# Decisiones — F36 `own-accounts-table`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Lo que pediste:** ver la tabla de mis cuentas (banco, número, tipo, fechas y los textos
con los que aparecen), dar de alta una cuenta y cambiar una existente, sobre todo sus
textos, y ver y cambiar las formas de mi nombre. Sin borrar filas y sin tocar el backend.

**Qué hace:** una pantalla nueva en el menú con la tabla y, encima, las formas de tu
nombre. Se da de alta y se cambia en una ventana. **No** borra filas, **no** dice qué
movimientos cambian al guardar y **no** toca otras pantallas.

---

## 🔴 Confirma o corrige (6)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | La entrada del menú se llama `My accounts` (Mis cuentas) y va **justo debajo de `Transfers`**. Evito `Accounts` a secas porque `All accounts` ya es el filtro de las cuentas importadas en `Movements` y `Review`. | Llamarla `Accounts`, como te sugirió el leader, o ponerla al final del menú, debajo de `Investments`. |
| 2 | Dar de alta y cambiar se hacen en **una ventana** (la misma para las dos), con un botón `Edit` (Cambiar) en cada fila y `Add account` (Dar de alta una cuenta) arriba. Cada texto va en su propio campo, con `Remove` (Quitar) y `Add text` (Añadir texto). | Cambiar en la propia fila. Con siete datos y una lista de textos, la tabla de 12 filas se ensancha y salta mientras escribes. |
| 3 | Al guardar **no se hace nada en otras pantallas**: `Movements`, `Review`, `Overview`, `Monthly cost` y `Transfers` ya vuelven a pedir sus datos cada vez que entras en ellas, así que verás el efecto al entrar. | Poner tras guardar una frase como «abre `Movements` para ver cómo cambian las sumas». |
| 4 | Antes de mandar nada, la ventana **no deja guardar** lo que el backend rechazaría y dice por qué junto al campo: nombre o banco vacíos, sin tipo, un texto de menos de 3 letras o cifras, o cierre anterior a la apertura. | Dejar guardar siempre y enseñar el rechazo del backend después. |
| 5 | Las formas de tu nombre se cambian en su propia ventana con la lista entera; **guardar la lista vacía las borra todas sin preguntar más**. | Pedir una confirmación aparte cuando la lista se quede vacía. |
| 6 | Una cuenta **cerrada se ve igual** que una abierta, con su fecha en `Closed` (Cierre); una fila sin textos dice `No texts` (Sin textos). Todas en el orden del backend (banco y nombre). | Pintar en gris las cerradas, o llevarlas al final de la tabla. |

## ✅ Ya las cerraste tú (4)

- **La tabla vive en una entrada nueva del menú.** Respuesta del 2026-10-21.
- **Ver qué movimientos cambian al guardar queda fuera.** El backend no lo devuelve.
- **No se borran filas.** Una fila que no sirve se deja sin textos; la ventana lo recuerda.
- **No se toca el backend.**

## 🧪 Cómo se comprobará que está hecho

| Tu frase de «cómo sé que está bien» | Se comprueba ejecutando |
|---|---|
| Veo las 12 filas de la tabla con todos sus datos. | Las pruebas que pintan 12 filas inventadas con todos sus datos (y `—` o `No texts` donde falta algo), en la pantalla y en el navegador. |
| Doy de alta una cuenta nueva y aparece. | La prueba que da de alta, comprueba lo que se manda y ve la fila nueva. |
| Cambio los textos de una cuenta y se guardan. | Las pruebas que cambian los textos de una fila, mandan la lista entera y la fila los enseña. |
| Cierro una cuenta poniéndole fecha de cierre. | Las pruebas que ponen la fecha de cierre, mandan solo esa fecha y la fila la enseña. |
| Veo y cambio las formas de mi nombre. | Las pruebas que enseñan las formas, las cambian y pintan lo que guardó el backend. |
| Si algo falla, me lo dice y no ha cambiado nada. | Las pruebas de fallo al cargar y al guardar, en la tabla y en las formas de tu nombre. |
| No quiero borrar filas. | La prueba de que no hay ningún botón de borrar ni se manda nunca un borrado. |

Dos más marcadas «añadido»: que `My accounts` está justo debajo de `Transfers`, y que la
ventana no deja guardar lo que el backend rechazaría.

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (4)

1. **Tras guardar se vuelve a pedir la tabla entera.** Así sale en el orden del backend y con los textos como los guardó (dos textos iguales se guardan una vez).
2. **Al cambiar una fila solo viaja lo que cambió;** si no cambiaste nada, no se manda nada.
3. **El número de cuenta se ve entero,** tal como está guardado. Las pruebas usan solo números inventados.
4. **El banco se escribe a mano,** no se elige de una lista: así se puede dar de alta el primero de un banco nuevo, como Criptan.

## 📌 Consecuencias que te tocan a ti (no son código)

- Cuando cambies un texto o una forma de tu nombre, mira tú en `Movements` u `Overview` si las sumas cambian como esperas: esta pantalla no te lo dirá.
- La guía de uso gana una sección nueva, la 7b, `My accounts`, con su bloque de notas para tu prueba.

## ⚠️ Incoherencias conocidas que se heredan

- El número de movimientos dudosos junto a `Transfers` (feature 35) puede no cambiar al guardar aquí hasta que se vuelva a pedir. Cuándo se pide lo decide la feature 35, que todavía no tiene la hoja escrita; el leader lo revisa con las dos hojas delante.
