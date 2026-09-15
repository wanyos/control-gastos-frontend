# Decisiones — F13 `import-dialog`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** pone en la barra superior el botón **Import** y el aviso **«3 new files»**,
y un modal que comprueba Drive, te enseña qué hay, importa con una sola llamada a
`POST /api/import` y te resume el resultado (titular, 4 contadores, archivos que no
entraron y por qué). Retira la entrada Import de la sidebar y su página. **No toca:** el
backend, el detalle fino del informe (filas no leídas, descuadres, traspasos ambiguos,
conflictos de categoría: es la F14), ni añade dependencias. 15 requisitos.

---

## 🔴 Confirma o corrige (0)

Ninguna abierta: todas cerradas en la revisión del 2026-09-15.

## ✅ Ya las cerraste tú (10)

- **Importar pide confirmación (2026-09-15):** el modal comprueba Drive, enseña la lista (banco → año → archivos) y solo importa al pulsar «Import 3 files».
- **El aviso cuenta los archivos pendientes en Drive, que son todos importables (2026-09-15):** todos los bancos tienen lector; tras una importación correcta baja a 0.
- **El aviso se refresca al abrir la app, al abrir el modal y al terminar (2026-09-15),** sin consultas periódicas.
- **El modal no se puede cerrar mientras importa (2026-09-15);** el botón de la barra pasa a «Importing…» deshabilitado.
- **Errores de archivo en inglés por tipo, con el original en español plegado en «Details» (2026-09-15).**
- **«12 new movements are waiting for your review» sin enlace (2026-09-15)** hasta que exista la pantalla de revisión (E6).
- **Progreso por fases sin tocar el backend:** «Checking Drive» → «Importing 3 files…», no archivo a archivo.
- **Botón en la barra superior, en toda la app;** desaparecen la entrada Import de la sidebar y la ruta `/import`.
- **El aviso «N new files» entra ya en esta feature.**
- **Todo en inglés y en oscuro,** sin lista cerrada de bancos (un banco nuevo sale con su nombre tal cual).

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (9)

1. **El error guarda el código del backend aparte** (`apiCode` en [`ApiError`](../../src/shared/errors.ts)), para distinguir «Couldn't reach Google Drive» de «Couldn't reach the server» sin cambiar lo que ya hay.
2. **La validación de respuestas se comparte:** los comprobadores de Patrimonio pasan a `src/shared/validation.ts` con los mismos mensajes; sus tests no se tocan.
3. **Los nombres de banco legibles pasan a `src/shared/banks.ts`,** para que Patrimonio y el modal digan lo mismo.
4. **«Try again» vuelve a comprobar Drive,** no relanza la importación: tras un fallo a medias la lista ha cambiado y la ves antes de confirmar.
5. **Patrimonio se recarga solo si ya estaba cargado;** si nunca abriste esa vista, no se pide.
6. **No se usa `/health/drive`:** la propia consulta de pendientes ya dice si Drive falla.
7. **Modal hecho a mano, no el `<dialog>` del navegador:** el entorno de tests no lo soporta y el bloqueo durante la importación hay que construirlo igual. El panel lleva borde: sin él no se distingue del fondo oscurecido (medido 1,04:1).
8. **Un archivo que el backend no reconozca (p. ej. subido por error) sale como «This bank or file type isn't supported yet».** Caso defensivo, no esperado: hoy todo lo que hay en Drive tiene lector.
9. **Si el backend responde bien pero el informe no se puede leer, se dice «pudo importarse»** («Your files may have been imported»), nunca «falló». Un fallo de conexión durante la importación también avisa de que parte pudo entrar y de que reintentar es seguro.
   ⚠️ *Efecto:* la importación es una sola llamada larga sin límite de tiempo; si el navegador la corta, lo verás como fallo de conexión aunque el backend termine por detrás.

## 📌 Consecuencias que te tocan a ti (no son código)

- **Probar con el backend real tiene efectos de verdad:** una importación mueve los archivos a `procesados/` en Drive, puede crear cuentas y reescribe traspasos y categorías de **toda** la base de datos. El implementer probará primero con 0 pendientes y **te avisará antes de importar de verdad**; lo ideal es hacerlo con un archivo ya importado (sale «Already imported»).

## ⚠️ Incoherencias conocidas que se heredan

- El titular «Imported, with a few things to check» ya sale en esta feature (según el plan), pero **qué** hay que mirar no se ve hasta la F14.
