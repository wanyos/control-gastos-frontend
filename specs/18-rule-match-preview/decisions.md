# Decisiones — F18 `rule-match-preview`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** mientras escribes el texto de una regla —creándola desde Review o
cambiándola desde Rules—, el propio diálogo te dice **a cuántos pendientes sin
categoría afecta** y te enseña **unos cuantos**, y te avisa si son demasiados o
ninguno. Además, el texto que te propone por defecto mejora para conceptos genéricos.
**No toca:** el backend, cómo se aplican las reglas, la lista de Rules ni la cola de
Review. Solo mira: no escribe nada. 15 requisitos.

---

## 🔴 Confirma o corrige (5)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **«Demasiado amplio» = más de 50 movimientos.** Sale un aviso ámbar debajo del recuento (`That is a lot — check the examples below before you save.`) y **el botón de guardar sigue activo**: solo avisa. Con ~1.373 pendientes sin categoría, 50 es un 3,6%; por debajo cabe un comercio muy frecuente sin chillar. | Otro número (20 avisa mucho más, 100 casi nunca), o un porcentaje de tus pendientes en vez de un número fijo — se mueve con tus datos, pero el aviso deja de ser predecible. |
| 2 | **Se enseñan 5 movimientos, los más recientes**, con fecha, concepto e importe, dentro del diálogo. Son los que devuelve el backend de primeras (ordena por fecha descendente). | Los **conceptos más repetidos**, que es lo que de verdad te diría si el texto pesca cosas raras; cuesta traerse todas las páginas y agruparlas en el navegador, y tarda. |
| 3 | **Se consulta 350 ms después de la última tecla**, la misma espera que ya usa el buscador de la cola de Review. Si escribes rápido, solo sale una petición; la respuesta de una consulta vieja nunca pisa a la nueva. | 600 ms: menos peticiones al backend, pero el número se siente perezoso mientras tecleas. |
| 4 | **La propuesta de texto crece mientras la última palabra sea genérica**, con una lista de palabras «de relleno» (negocio: `servicios`, `grupo`, `centro`, `comercial`… y nombres de pila: `juan`, `jose`, `maria`…), tope de 4 palabras. Y se saltan las palabras de canal (`tpv`, `virtual`, `online`, `terminal`…) como ya se saltan `recib` o `compra`. Resultado: **«AB Servicios Selecta E» → `servicios selecta`**, **«JUAN JOSE ROMERO RAMOS - INGRESO» → `juan jose romero`**, **«TPV VIRTUAL 1234 AMAZON» → `amazon`** («TPV VIRTUAL» a secas se queda en `tpv virtual`: no hay nada más en el concepto). **No se estropean:** `iberdrola`, `mercadona`, `mega deportes` y `tulotero` salen exactamente igual que hoy. | Deducir lo genérico de tu propio historial (preguntando cuántos casan con cada palabra y quedándose con la menos frecuente): acierta sin listas escritas a mano, pero son varias peticiones cada vez que abres el diálogo y deja de ser predecible. |
| 5 | **Si la consulta falla, se dice y ya**: sin número, sin ejemplos y **sin impedirte guardar**. No dices qué hacer en ese caso en la feature. | Bloquear el guardado hasta que el recuento se consiga: más seguro, pero te deja sin poder crear una regla porque el contador no responde. |

## ✅ Ya las cerraste tú (4)

- **El recuento cuenta solo los pendientes sin categoría**, los que aplicar tocaría de verdad.
- **Los ejemplos se ven dentro del propio diálogo**, no en otra pantalla.
- **Avisar, no decidir:** una regla amplia se puede guardar igual.
- **No se toca el backend** ni cambia nada de las features 15, 16 y 17.

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (5)

1. **Se pide una sola petición por texto** (`GET /api/movements` con el texto, «pendiente»,
   «sin categoría», el tipo de la categoría y 5 por página): de ahí salen el total y los ejemplos.
2. **Se filtra además por tipo** (gasto o ingreso, según la categoría de la regla), porque
   aplicar nunca cruza los dos ni toca los movimientos de importe 0. Así el número se
   parece más a lo que pasaría de verdad.
3. **Por debajo de 3 letras no se consulta nada** (como hoy) y por encima de 100 caracteres
   tampoco, porque el buscador del backend no los acepta: se deja de previsualizar, pero
   se sigue pudiendo guardar.
4. **La lectura de movimientos pasa a una pieza común** de la app, porque ahora la
   necesitan Review y el diálogo de reglas. Review sigue funcionando igual y **no entra
   ninguna librería nueva**.
5. **Mientras cuenta, la pantalla sigue viva:** el campo, el selector y el botón de
   guardar se pueden usar; solo el bloque del recuento muestra que está cargando.

## 📌 Consecuencias que te tocan a ti (no son código)

- **El número es una estimación honesta, no una promesa.** Debajo lo dice una línea
  pequeña. Puede quedarse **corto** al editar una regla (lo que esa regla ya categorizó
  ya no está «sin categoría») y **largo** si otra regla se pelea por los mismos
  movimientos: cuando dos reglas de categorías distintas casan, aplicar no los
  categoriza, los deja como conflicto.
- **Revisa la lista de palabras del 🔴 4 con tus conceptos reales.** Está escrita sin
  mirar tus extractos; la comprobación final (T18) te enseña qué propone en 5-10
  conceptos tuyos para que digas cuáles siguen saliendo mal.
- **La comprobación final es con el backend real pero de solo lectura:** ninguna
  petición de esta feature escribe, así que no hace falta el aparato de la F17 (foto
  previa, visto bueno, vuelta atrás). Solo que estés delante y digas si los números
  cuadran.

## ⚠️ Incoherencias conocidas que se heredan

- **El recuento y la pasada no ven exactamente lo mismo:** la previsualización usa el
  buscador del backend y aplicar usa las reglas. Normalizan igual y comparan igual
  («contiene», sin mayúsculas ni tildes), así que casi siempre coinciden, pero no es la
  misma consulta y nunca prometerá el número exacto de lo que se categorizará.
- **La propuesta de texto sigue sin mirar tu historial:** puede acertar de lleno o
  quedarse genérica. La red de seguridad es precisamente el número que ahora ves al lado.
