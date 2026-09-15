# Resumen — feature 14 `import-report-details`

Fecha de cierre: 2026-09-15
Intención original: `feature_list.json` → feature `import-report-details`, bloque `intent`
Spec (SDD): `specs/14-import-report-details/`

## Qué hace ahora la app que antes no

Al terminar una importación, el modal ya no se queda en el titular y los contadores: debajo
aparece el detalle de lo que conviene revisar (fallos de las pasadas finales, descuadres de
saldo, líneas que no se pudieron leer, traspasos sin emparejar y conflictos de reglas) y, al
final, la lista de archivos importados con las cuentas y productos nuevos. Todo se puede
plegar, es solo de lectura y el modal nunca pasa de la altura de la ventana.

## Por dónde se usa (puntos de entrada)

- Botón **Import** de la barra superior → confirmar → al acabar, el resumen del modal muestra el detalle.
- No hay endpoints ni peticiones nuevas: todo sale del informe de `POST /api/import` que ya pedía la F13.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Montaje del detalle tras «Needs attention» | `src/features/import/components/ImportDialog.vue:67` |
| Orquestador de secciones y encabezado «Things to check» | `src/features/import/components/ImportDetails.vue:1` |
| Sección plegable (título + recuento, cerrada) | `src/features/import/components/ReportSection.vue:2` |
| Qué secciones salen y en qué orden | `src/features/import/details.ts:69` |
| Fallos de pasadas finales («Your imported movements are safe.») | `src/features/import/details.ts:48`, `src/features/import/components/FinalPassAlerts.vue:1` |
| Descuadres y traducción de `check` | `src/features/import/details.ts:105`, `:113`; `src/features/import/components/BalanceMismatchList.vue:1` |
| Líneas no leídas (5 por archivo + «and N more») | `src/features/import/details.ts:132`; `src/features/import/components/UnreadLineList.vue:1` |
| Traspasos ambiguos (10 + resto, Out/In) | `src/features/import/details.ts:147`, `:167`; `src/features/import/components/AmbiguousTransferList.vue:1` |
| Conflictos de reglas (10 + resto) | `src/features/import/details.ts:155`; `src/features/import/components/CategoryConflictList.vue:1` |
| Archivos importados, cuenta/producto nuevo, notas de saldo | `src/features/import/details.ts:233`, `:213`; `src/features/import/components/ImportedFileList.vue:1` |
| Cabecera de archivo reutilizada en tres listas | `src/features/import/components/FileHeadingLine.vue:1` |
| Modal con altura máxima y cuerpo con scroll | `src/shared/components/BaseDialog.vue:15` |
| Contraste de los pares nuevos | `src/assets/theme-dark.css:38` |
| Test de orden, plegado, solo lectura e inglés | `src/features/import/__tests__/ImportDetails.spec.ts:42` |
| Test de la lógica pura | `src/features/import/__tests__/details.spec.ts:37` |
| e2e con informe grande | `e2e/import-dialog.spec.ts:244` |

## Cumplimiento de la intención

- ✅ «Cuando una importación deja cosas por revisar, el titular me lo dice y cada tipo de aviso aparece en su sección plegable.» → se cumple; el titular sigue siendo el de la F13 y un test por cada motivo que lo dispara garantiza que hay una sección visible que lo respalda (`src/features/import/__tests__/ImportDetails.spec.ts:112`); secciones cerradas con título y recuento en `ImportDetails.spec.ts:56`.
- ✅ «Veo qué filas no se leyeron de cada archivo, los descuadres de saldo con las dos cifras y la diferencia, los traspasos ambiguos y los conflictos de reglas.» → se cumple; `UnreadLineList.spec.ts:12`, `BalanceMismatchList.spec.ts:19`, `AmbiguousTransferList.spec.ts:45`, `CategoryConflictList.spec.ts:14`.
- ✅ «Veo qué archivos se importaron, con cuántos movimientos, y si se creó una cuenta o un producto nuevo.» → se cumple; `ImportedFileList.spec.ts:41` (extracto con cuenta nueva) y `:82` (producto nuevo).
- ✅ «Los importes y fechas salen con el formato de la app.» → se cumple; los tests comparan con `formatMoney`/`formatDate` de `src/shared/money.ts` (`BalanceMismatchList.spec.ts:19`, `AmbiguousTransferList.spec.ts:45`, `ImportedFileList.spec.ts:82`).

## Decisiones que se tomaron por ti

- (añadido, aprobado) Todas las secciones empiezan cerradas con su recuento; los fallos de pasadas finales van siempre abiertos.
- (añadido, aprobado) Topes de 5 líneas no leídas por archivo y 10 traspasos o conflictos; el resto solo se cuenta («and N more»), no se puede ver en el modal.
- (añadido, aprobado) «Imported files» sale siempre, plegada y al final, incluso si todo fue bien.
- (añadido, aprobado) Ancla y saldos rellenados como nota por archivo, sin los totales del informe.
- (delegado) Orden fijo: fallos → descuadres → líneas → traspasos → conflictos → archivos (`details.ts:69`).
- (delegado) Los recuentos salen de los totales del informe, los mismos del titular; «and N more» = total − filas pintadas.
- (delegado) Tipo de producto con las etiquetas de Patrimonio; un tipo nuevo del backend sale tal cual (`details.ts:190`). Esto crea una dependencia `import → net-worth`.
- (delegado) Si el mensaje de un fallo de pasada llega vacío, el aviso sale igual pero sin «Details» (mismo criterio que la F13).
- (delegado) Componente `FileHeadingLine.vue` para no repetir la cabecera de archivo en tres listas.

## Qué NO se tocó / quedó fuera

- No se resuelve nada: ni traspasos ni conflictos tienen botones ni enlaces.
- Ni backend, ni dependencias, ni tipos/service/store/titular/contadores de la F13.
- El detalle solo vive mientras el modal está abierto: al cerrarlo se pierde.
- No se muestran IBAN, ids, `unmatched` ni si la foto del mes era nueva.
- No se ha visto pintado con un informe real del backend (no se importó de verdad).

## Notas para el futuro

- Actualizar `docs/architecture.md` (árbol de `features/import/` y el párrafo de dependencias entre features, que hoy dice «una única»).
- Los traspasos ambiguos y conflictos se calculan sobre toda la base: saldrán en cada importación hasta poder resolverlos (etapa E6 u otra feature).
- Posibles mejoras de accesibilidad: separadores legibles por lector de pantalla y margen para el contorno de foco en el borde del cuerpo con scroll.
