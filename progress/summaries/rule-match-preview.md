# Resumen — feature 18 `rule-match-preview`

Fecha de cierre: 2026-09-24
Intención original: `feature_list.json` → feature `rule-match-preview`, bloque `intent`
Spec: `specs/18-rule-match-preview/`

## Qué hace ahora la app que antes no

Cuando escribes el texto de una regla —creándola desde una fila de Review o cambiándola desde
Rules—, el propio diálogo te dice **a cuántos movimientos pendientes sin categoría afectaría** y te
enseña **hasta cinco** de ellos, con su fecha, su concepto y su importe. Si casan más de 50 te avisa
en ámbar; si no casa ninguno, te lo dice. El número se actualiza solo mientras tecleas, sin pulsar
nada, y **nunca te impide guardar**: avisa, no decide. Antes escribías el texto a ciegas y solo
descubrías que era demasiado amplio después de aplicar las reglas, cuando ya había que corregir a
mano.

Además, el texto que el diálogo te propone por defecto ha mejorado: ya no se queda en una palabra
genérica. «AB Servicios Selecta E» propone ahora `servicios selecta` (antes `servicios`),
«JUAN JOSE ROMERO RAMOS - INGRESO» propone `juan jose romero` (antes `juan jose`) y
«TPV VIRTUAL 1234 AMAZON MARKETPLACE» propone `amazon` (antes `tpv virtual`). Los que ya salían
bien salen exactamente igual: `iberdrola`, `mercadona`, `mega deportes` y `tulotero`.

**Esta feature solo mira.** No escribe absolutamente nada: la única petición que hace es un
`GET /api/movements`.

## Por dónde se usa (puntos de entrada)

- **Review** (`/review`) → botón `Create rule` de una fila → el bloque de recuento aparece bajo el
  campo de texto del diálogo.
- **Rules** (`/rules`) → botón de editar de una regla → al abrirse ya se ve el recuento, sin teclear.
- Por debajo, una sola llamada de lectura: `GET /api/movements` con el texto en `q`,
  `status=pending_review`, `uncategorized=true`, el tipo de la categoría en `type`, `page=1` y
  `pageSize=5`. De esa única respuesta salen el total y los cinco ejemplos.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| El bloque que ves en el diálogo (recuento, aviso, ejemplos, «contando…», error) | `src/features/category-rules/components/RuleMatchPreview.vue:1` |
| El diálogo: espera de 350 ms tras la última tecla y consulta al abrir | `src/features/category-rules/components/RuleDialog.vue:119` |
| El filtro exacto que viaja | `src/features/category-rules/rules.ts:345` |
| Cuándo se puede consultar (3 caracteres mínimo, 100 máximo) | `src/features/category-rules/rules.ts:335` |
| El umbral de «demasiados» (50) | `src/features/category-rules/rules.ts:325` |
| Las frases del recuento y de los avisos | `src/features/category-rules/rules.ts:361` y `:368` |
| Las frases de un recuento que falla, en inglés y nunca las del backend | `src/features/category-rules/rules.ts:378` |
| El estado y la regla de «la última respuesta gana» | `src/features/category-rules/store.ts:194` a `:228` |
| La propuesta de texto mejorada | `src/features/category-rules/rules.ts:209`, con la lista de palabras genéricas en `:73` y el criterio de crecimiento en `:196` |
| La lectura de movimientos, ahora compartida | `src/shared/movements.ts:1` |
| Enganche en Review | `src/features/review/views/ReviewView.vue:274` |
| Enganche en Rules | `src/features/category-rules/views/RulesView.vue:125` |
| Test de la lógica pura y de la tabla de propuestas | `src/features/category-rules/__tests__/preview-rules.spec.ts:115` |
| Test del estado (filtro exacto, carrera de respuestas, solo lectura) | `src/features/category-rules/__tests__/preview-store.spec.ts:38` |
| Test del bloque visual, sus cuatro estados | `src/features/category-rules/__tests__/RuleMatchPreview.spec.ts:35` |
| Prueba de extremo a extremo | `e2e/category-rules.spec.ts:330` |

## Cumplimiento de la intención

Por cada punto del `como_se_que_esta_bien`:

- ✅ «Escribo un texto en el diálogo de la regla y me dice cuántos movimientos pendientes sin
  categoría casan con él» → se cumple; verificado en
  `src/features/category-rules/__tests__/preview-store.spec.ts:61` y en
  `src/features/category-rules/__tests__/RuleMatchPreview.spec.ts:50`.
- ✅ «Puedo ver unos cuantos de esos movimientos, para confirmar que son los que creo» → se cumple,
  cinco como máximo y con fecha, concepto e importe; verificado en
  `src/features/category-rules/__tests__/RuleMatchPreview.spec.ts:59` y `:69`.
- ✅ «Si casan demasiados, o ninguno, me lo dice de forma clara antes de que guarde» → se cumple, por
  encima de 50 y con 0; verificado en
  `src/features/category-rules/__tests__/RuleMatchPreview.spec.ts:75` y `:88`.
- ✅ «El número se actualiza si cambio el texto, sin que yo tenga que pulsar nada» → se cumple,
  350 ms después de la última tecla y con una sola petición por ráfaga; verificado en
  `src/features/category-rules/__tests__/RuleDialog.spec.ts`.
- ✅ «Al cambiar una regla que ya existe, veo lo mismo» → se cumple, y el recuento sale **al abrir**,
  sin teclear; verificado en `src/features/category-rules/__tests__/RulesView.spec.ts`.
- ✅ «Esto no escribe nada: solo mira» → se cumple; verificado a tres niveles: el estado
  (`src/features/category-rules/__tests__/preview-store.spec.ts:172`, todas las llamadas son GET y
  sin cuerpo), las dos pantallas (`ReviewView.spec.ts` y `RulesView.spec.ts`, ninguna escritura
  mientras el diálogo está abierto) y la prueba de extremo a extremo (`e2e/category-rules.spec.ts:330`,
  la lista de escrituras queda vacía).

Y lo que pediste que **no** pasara: guardar sigue habilitado con una regla amplia, con cero
coincidencias y hasta si el recuento falla; la pantalla no se queda pillada mientras cuenta —el
campo, el selector y el botón siguen usables—; y no se ha tocado el backend, ni cómo se aplican las
reglas, ni la pantalla de Rules.

## Decisiones que se tomaron por ti

Lo que en el spec estaba marcado como `(delegado)` o `(añadido)`, recordado aquí:

- (delegado) **«Demasiado amplio» son más de 50 movimientos**. Con unos 1.373 pendientes sin
  categoría, son un 3,6%. Vive en `src/features/category-rules/rules.ts:325`: cambiarlo es cambiar
  ese número.
- (delegado) **Se enseñan cinco movimientos, los más recientes**, que es el orden en que los
  devuelve el backend (`src/features/category-rules/rules.ts:318`).
- (delegado) **Se consulta 350 ms después de la última tecla**, la misma espera que ya usaba el
  buscador de la cola de Review; ahora es una sola constante compartida
  (`src/shared/movements.ts:117`).
- (delegado) **Se filtra también por tipo** (gasto o ingreso, según la categoría de la regla),
  porque aplicar nunca cruza los dos ni toca los movimientos neutros: así el número se parece más a
  lo que pasaría de verdad (`src/features/category-rules/rules.ts:345`).
- (delegado) **La propuesta de texto crece mientras la última palabra sea genérica**, con una lista
  escrita a mano de palabras de negocio y nombres de pila y un tope de cuatro palabras
  (`src/features/category-rules/rules.ts:73` y `:196`).
- (añadido) **Por encima de 100 caracteres tampoco se consulta**, porque el buscador del backend no
  los acepta: se deja de previsualizar, pero se sigue pudiendo guardar
  (`src/features/category-rules/rules.ts:335`).
- (añadido) **Si la consulta falla, se dice y ya**: frase propia en inglés, sin número, sin ejemplos
  y **sin bloquear el guardado** (`src/features/category-rules/rules.ts:378`).

## Qué NO se tocó / quedó fuera

- El backend, de principio a fin: ni un endpoint nuevo ni un cambio de contrato.
- Cómo se aplican las reglas, la lista de Rules y la cola de Review: siguen exactamente igual.
- Crear una regla **no** categoriza nada por sí misma; eso no ha cambiado.
- Sin dependencias nuevas: `package.json` está intacto.
- **El número es una estimación honesta, no una promesa**, y la interfaz lo dice en una línea
  pequeña debajo. Puede quedarse **corto** al editar una regla (lo que esa regla ya categorizó ya no
  está «sin categoría») y **largo** si otra regla se pelea por los mismos movimientos, porque un
  conflicto los deja sin categorizar.

## Notas para el futuro

- **Comprobado contigo delante el 2026-09-24 (la T18 del spec), y salió bien:** 14 conceptos reales
  tuyos pasados por el diálogo. Lo que dice la pantalla coincide con la API en los 14, cero
  escrituras y cero errores de consola. El aviso de «demasiado amplio» saltó donde debía
  (`servicios selecta` → 355) y los ceros (`tulotero`, `mega deportes`, `iberdrola`) son correctos:
  esos movimientos ya están categorizados.
- **Deuda que decidiste dejar para más adelante** (nada de esto rompe nada: el texto es editable y
  el recuento avisa antes de guardar):
  - La propuesta arrastra papeleo y puntuación: «ANUL. /VivaGym» propone `anul. /vivagym` cuando
    debería proponer `vivagym`, con `anul` en la lista de palabras de papeleo.
  - Sigue floja con los nombres de canal: «TRANS INM/ N26» propone `trans inm`, que pesca también
    movimientos de Openbank, y «TPV VIRTUAL» propone `tpv virtual`.
- El tope de 100 caracteres del buscador está escrito en dos sitios (`review/filters.ts` y
  `category-rules/rules.ts`). Cabría unificarlo en `shared/movements.ts` cuando se vuelva a tocar la
  cola de Review; hoy no compensa.
- Si algún día el diálogo se reabriera para otro movimiento sin cerrarlo antes, ese primer recuento
  llegaría 350 ms tarde. Hoy no ocurre: las dos pantallas cierran antes de abrir.
