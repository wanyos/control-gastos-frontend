# Decisiones — F14 `import-report-details`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** debajo del resumen que ya da la F13 añade el detalle de lo que conviene
revisar, en secciones plegables: fallos de las pasadas de traspasos o categorización,
descuadres de saldo, líneas no leídas, traspasos por emparejar, conflictos de reglas y
la lista de archivos importados. **No toca:** el titular, los contadores ni la lista
de archivos fallidos de la F13; no resuelve nada (solo se ve); ni backend ni
dependencias. 14 requisitos.

---

## 🔴 Confirma o corrige (6)

| # | Decisión | Alternativa si no te gusta |
|---|---|---|
| 1 | **Todas las secciones empiezan cerradas**, con título y número («Balance mismatches · 2»). Solo los fallos de las pasadas finales van siempre abiertos, con «Your imported movements are safe». | Abrir de entrada las secciones cuando haya pocos avisos (p. ej. 3 o menos en total): lo ves sin clics, pero el modal crece. |
| 2 | **Topes visibles: 5 líneas no leídas por archivo** y **10 traspasos dudosos o conflictos**; el resto como «and 37 more lines», sin forma de verlos en el modal. | Un botón «Show all» que despliega el resto en su sitio: lo ves todo, a cambio de un estado más por lista. |
| 3 | **«Imported files» sale siempre, al final y plegada**, también cuando todo fue bien: archivo, «39 new · 2 already imported» y la etiqueta «New account» (con su nombre) o «New product». | Mostrarla solo si se creó alguna cuenta o producto, o abrirla por defecto cuando no hay nada más que revisar. |
| 4 | **Ancla y saldos rellenados, como nota por archivo** («Opening balance set from this file», «3 saved balances filled in»); los totales de toda la importación no se muestran. | No mostrarlo en ningún sitio (menos ruido; pierdes saber qué archivo fijó el saldo inicial). |
| 5 | **Un descuadre se lee así:** cuenta · fecha; «Line-by-line check» o «Statement balance check» con una frase que explica qué se comparó; y debajo, en columna, **Calculated −40,00 € / In file −20,00 € / Difference −20,00 €**. | Tabla de una fila por descuadre con las tres cifras en columnas: más compacta, pero obliga a ensanchar el modal. |
| 6 | **El modal nunca pasa de la altura de la ventana:** el contenido hace scroll y el título y el botón Close quedan fijos. Es un cambio pequeño en el modal compartido de la F13. | Llevar el informe a una página propia: más espacio, pero reabre la retirada de `/import` de la F13. |

## ✅ Ya las cerraste tú (4)

- **Solo ver, nada de resolver:** ni traspasos ni conflictos tienen botones ni enlaces.
- **El titular ya lo pone la F13** («Imported, with a few things to check»); la F14 añade el detalle y un test garantiza que, si el titular avisa, hay algo visible que lo respalde.
- **Cifras en `1.234,56 €` y fechas en `12 Sept 2026`**, como el resto de la app.
- **Sin tocar el backend** y todo en inglés y oscuro.

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (6)

1. **Orden fijo de secciones:** fallos → descuadres → líneas no leídas → traspasos → conflictos → archivos importados (primero lo que afecta al dinero).
2. **Los textos que escribe el backend en español** (motivo de la línea, concepto del movimiento, regla y categoría) se muestran tal cual marcados como español, igual que el «Details» de la F13.
3. **Plegado con el `<details>` del navegador:** accesible con teclado y sin código extra; la F13 ya lo usa.
4. **Los números de las secciones salen de los totales del informe,** los mismos que usa el titular: nunca discrepan.
5. **Tipo de producto con las etiquetas de Patrimonio** («Fund», «Fixed-term deposit»…); un tipo nuevo del backend sale con su nombre tal cual.
6. **No se muestran** datos sin uso aquí: IBAN, ids, «unmatched» de categorización, si la foto del mes era nueva o se pisó.

## 📌 Consecuencias que te tocan a ti (no son código)

- **El detalle solo existe mientras el modal está abierto:** el backend no guarda los descuadres; al cerrar se pierde. Para volver a verlo hay que reimportar (desde el backend, `POST /api/import/local`).
- **Traspasos dudosos y conflictos se calculan sobre toda la base de datos**, no solo lo importado: los mismos avisos saldrán en cada importación hasta que se resuelvan, cosa que hoy no puede hacerse desde la web (etapa E6 u otra feature).

## ⚠️ Incoherencias conocidas que se heredan

- **Depende de la F13 implementada:** si al empezar no está cerrada, el implementer para. Si cambias en la F13 su punto 🔴 5 (textos originales en español plegados), cambia aquí también el punto técnico 2.
- El intent decía «el titular me lo dice»; ese titular es de la F13 y esta feature no lo toca.
