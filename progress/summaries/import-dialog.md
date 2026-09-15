# Resumen — feature 13 `import-dialog`

Fecha de cierre: 2026-09-15 (aprobado por el reviewer, **condicionado a la prueba contra el backend real (C7)**, que decides tú)
Intención original: `feature_list.json` → feature `import-dialog`, bloque `intent`
Spec (SDD): `specs/13-import-dialog/`

## Qué hace ahora la app que antes no

Ahora puedes importar desde la web. Arriba a la derecha, en cualquier pantalla, hay un botón **Import** y, si hay archivos nuevos en Drive, un aviso «3 new files». Al pulsarlo se abre un modal que comprueba Drive, te enseña qué archivos hay (por banco y año), importa con una sola llamada cuando confirmas y te resume el resultado: titular, cuatro contadores y qué archivos no entraron y por qué, en inglés. Antes solo se podía lanzar a mano contra el backend, y la sidebar tenía una página «Import» vacía que ya no existe.

## Por dónde se usa (puntos de entrada)

- Botón **Import** de la barra superior (`data-test="import-button"`) y aviso `N new files` (`data-test="pending-badge"`).
- Llama a `GET /api/ingestion/pending` al abrir la app, al abrir el modal y al terminar una importación (nunca de forma periódica).
- Llama a `POST /api/import` solo al pulsar «Import N files» en la confirmación, una única vez, sin cuerpo.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Botón y aviso de la barra; pide pendientes al montar | `src/features/import/components/ImportButton.vue:3`, `:6`, `:33` |
| Hueco de acciones en la barra y montaje del botón | `src/shared/components/AppTopBar.vue:9`, `src/shared/components/AppShell.vue:7` |
| Modal por fases (cuerpo y botones de cada fase, región `aria-live`) | `src/features/import/components/ImportDialog.vue:6`, `:10`, `:90` |
| Máquina de estados: comprobar, confirmar, importar, fallos | `src/features/import/store.ts:16` (`check` `:36`, `start` `:61`, cierre bloqueado `:83`, reintento `:89`) |
| Un único POST: paso síncrono a «importing» antes de esperar | `src/features/import/store.ts:65` |
| Refresco del aviso y recarga de Patrimonio (solo si ya estaba cargado) | `src/features/import/store.ts:74-80` |
| Acceso a la API y lectura completa del informe | `src/features/import/service.ts:36` (pendientes), `:110` (cada archivo), `:251` (informe), `:279` (POST sin cuerpo), `:284` (¿fallo de Drive?) |
| Titular del resultado | `src/features/import/outcome.ts:25` |
| Contadores, línea de pasadas finales, frase de revisión, textos de fase | `src/features/import/summary.ts:19`, `:39`, `:54`, `:91` |
| Explicación en inglés por código de error | `src/features/import/fileMessages.ts:7`, `:25` |
| Lista de pendientes, resumen y «Needs attention» | `src/features/import/components/PendingList.vue`, `ImportSummary.vue`, `FileIssueList.vue:18` |
| Modal accesible reutilizable (Esc, fondo, X, trampa de foco, foco de vuelta) | `src/shared/components/BaseDialog.vue:11`, `:72`, `:92`, `:107` |
| Botón con estado de carga y spinner | `src/shared/components/BaseButton.vue`, `src/shared/components/BaseSpinner.vue` |
| Código de error del backend guardado aparte (`apiCode`) | `src/shared/errors.ts:36`, `src/services/http.ts:12` |
| Validación de respuestas compartida con Patrimonio | `src/shared/validation.ts:29`, `src/features/net-worth/service.ts:51` |
| Nombres legibles de banco compartidos | `src/shared/banks.ts:14` |
| Ruta `/import` retirada | `src/router/index.ts` |
| Contraste medido del modal | `src/assets/theme-dark.css:37`, `:100-104` |
| Tests principales | `src/features/import/__tests__/store.spec.ts`, `ImportDialog.spec.ts`, `service.spec.ts`; `src/shared/components/__tests__/BaseDialog.spec.ts`; `e2e/import-dialog.spec.ts:129`, `:152` |

## Cumplimiento de la intención

- ✅ «Cuando abro la app, veo arriba a la derecha el botón Import y, si hay archivos nuevos en Drive, un aviso con cuántos son.» → se cumple; `src/shared/components/__tests__/AppShell.spec.ts:93` (botón en la barra en varias rutas) y `src/features/import/__tests__/ImportButton.spec.ts:39-60` (3 / 1 / 0 / fallo, sin error en la barra).
- ✅ «Cuando pulso Import, el modal me dice en qué fase está (comprobando Drive, cuántos archivos hay, importando) y no me deja cerrarlo a medias.» → se cumple; `ImportDialog.spec.ts:88`, `:155`, `:237` (Esc y fondo no cierran, sin X) y `:338` (anuncio de cada fase).
- ✅ «Si no hay nada que importar, me lo dice y no lanza nada.» → se cumple; `ImportDialog.spec.ts:120` y `store.spec.ts:76` (0 POST).
- ✅ «Al terminar veo un resumen: movimientos nuevos, cuántos ya estaban, archivos de inversión actualizados y archivos no importados y por qué, en inglés.» → se cumple; `ImportSummary.spec.ts:12`, `FileIssueList.spec.ts:13`, `fileMessages.spec.ts:25-60`, `ImportDialog.spec.ts:261` y el e2e `e2e/import-dialog.spec.ts:129`.
- ✅ «Si Drive o el servidor fallan, me lo dice claramente, me deja reintentar y no me engaña.» → se cumple; `ImportDialog.spec.ts:186`, `:200` (comprobación: «Nothing has been imported»), `:287` (importación: «Some files may already have been imported. Trying again is safe…»), `:321` (informe ilegible: «Your files may have been imported») y el e2e `:152` (503 de Drive).
- ✅ «Después de importar, el aviso de archivos nuevos y la vista de Patrimonio se actualizan solos.» → se cumple en tests; `store.spec.ts:192-231` (nuevo GET de pendientes con cualquier resultado) y `:275`, `:297` (Patrimonio se recarga solo si ya estaba cargado). **Pendiente de verlo con el backend real (C7).**

## Decisiones que se tomaron por ti

- (delegado) El error guarda el código del backend en `apiCode` (`src/shared/errors.ts:36`) para distinguir «Couldn't reach Google Drive» de «Couldn't reach the server»; `code` sigue igual.
- (delegado) «Try again» vuelve a comprobar Drive, no relanza la importación (`src/features/import/store.ts:89`).
- (delegado) Patrimonio se recarga solo si ya estaba cargado (`store.ts:76-79`).
- (delegado) Un 200 cuyo informe no se puede leer se comunica como «may have been imported», nunca como fallo.
- (delegado) Modal hecho a mano, con borde en el panel para distinguirlo del fondo oscurecido (`src/shared/components/BaseDialog.vue:15`).
- (delegado) Con más de 8 archivos pendientes, cada banco se pliega con su recuento (`PendingList.vue`).
- (delegado) Un archivo que el backend no reconoce sale como «This bank or file type isn't supported yet» (caso defensivo).
- (añadido, aprobado) Paso de confirmación con la lista antes de importar; texto original en español plegado en «Details»; frase «N new movements are waiting for your review» sin enlace.
- (delegado) La validación de respuestas y los nombres de banco pasan a `src/shared/` para que Patrimonio y el modal los compartan; los tests de Patrimonio no se tocaron.

## Qué NO se tocó / quedó fuera

- El backend: ni una línea.
- El detalle del informe (filas no leídas, descuadres, traspasos ambiguos, conflictos de categoría): se lee entero pero no se pinta; es la feature 14.
- Progreso archivo a archivo: el modal va por fases.
- Dependencias nuevas: ninguna.

## Notas para el futuro

- **C7, prueba real, pendiente y tuya:** primero abrir el modal con el backend arrancado (solo lectura, sin efectos). Importar de verdad mueve archivos a `procesados/` en Drive, puede crear cuentas y reescribe traspasos y categorías de toda la base de datos: hazlo solo si quieres, idealmente con un archivo ya importado (debería salir «Already imported»).
- Si en esa prueba el resumen dice «report couldn't be read», el sospechoso principal es una descripción vacía en un traspaso ambiguo o en un conflicto: el lector la exige no vacía (`src/features/import/service.ts:210`, `:231`) y el contrato no lo garantiza.
- Un 200 con cuerpo que no es JSON se mostraría como «Couldn't reach the server» (con el aviso de que pudo importarse) en lugar de «report couldn't be read».
- `revolut` no tiene nombre legible en `src/shared/banks.ts`; se ve el slug tal cual.
- La importación no tiene límite de tiempo: si el navegador corta una llamada muy larga, se verá como fallo de conexión aunque el backend termine por detrás.
- El modal no tiene scroll interno: con muchos archivos en «Needs attention» puede crecer más que la ventana (la F14 lo prevé).
