# Resumen — feature 9 `net-worth-view`

Fecha de cierre: 2026-09-12
Intención original: `feature_list.json` → feature `net-worth-view`, bloque `intent`
Spec (SDD): `specs/net-worth-view/`

## Qué hace ahora la app que antes no

Al abrir la app (o `/net-worth`) ves por fin tu patrimonio real: la cifra total que da el backend con una frase que la explica, de qué está hecho (por tipo y por banco, con barras), una ficha por banco con cada cuenta y producto, y los avisos cuando un dato no es fiable. Antes esa ruta era un cartel de «próximamente».

## Por dónde se usa (puntos de entrada)

- Ruta `/net-worth` (y `/`, que redirige a ella): la vista pide `GET /api/net-worth` una vez al montar.
- `useNetWorthStore().load()`: la acción que trae los datos y guarda carga/error.
- `src/shared/money.ts`: formato de cifras, porcentajes y fechas reutilizable por las próximas vistas.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Vista: estados, bloques A, avisos, B y E | `src/features/net-worth/views/NetWorthView.vue:1` |
| Carga al montar | `src/features/net-worth/views/NetWorthView.vue:101` |
| Total del bloque A leído de la API | `src/features/net-worth/views/NetWorthView.vue:17` |
| Aviso de descuadre (compara en céntimos) | `src/features/net-worth/views/NetWorthView.vue:136` |
| Store (`netWorth`, `isLoading`, `error`, `load`) | `src/features/net-worth/store.ts:12` |
| Céntimos exactos (`toCents`, `sumAmounts`) | `src/shared/money.ts:40`, `src/shared/money.ts:58` |
| Porcentaje con un solo redondeo | `src/shared/money.ts:66` |
| Formato `1.234,56 €` / `38,3 %` / `12 Sept 2026` | `src/shared/money.ts:81`, `:90`, `:105` |
| Reparto por tipo (4 grupos) y por banco | `src/features/net-worth/breakdown.ts:101`, `:112` |
| Nombres legibles de banco | `src/features/net-worth/breakdown.ts:46` |
| Frase del bloque A | `src/features/net-worth/sentence.ts:17` |
| Textos de avisos y tipos de producto | `src/features/net-worth/issues.ts:21`, `:17` |
| Filas del reparto, badge *Idle money*, descuadre | `src/features/net-worth/components/BreakdownList.vue:18`, `:48` |
| Ficha de banco y fila con hueco *No valuation* | `src/features/net-worth/components/BankCard.vue:77`, `src/features/net-worth/components/AccountCard.vue:22` |
| Panel de avisos | `src/features/net-worth/components/DataWarnings.vue:2` |
| Componentes portados | `src/shared/components/BaseCard.vue:1`, `BaseBadge.vue:30`, `StatCard.vue:14`, `ShareBar.vue:23` |
| Muestra de datos del e2e de humo | `e2e/app-boot.spec.ts:25`, `:47` |
| Test principal de la vista | `src/features/net-worth/__tests__/NetWorthView.spec.ts:52` |
| Tests de formato y céntimos | `src/shared/__tests__/money.spec.ts:70` |
| Tests de repartos e invariante | `src/features/net-worth/__tests__/breakdown.spec.ts:85` |

## Cumplimiento de la intención

- ✅ «Cuando abro /net-worth con el backend arrancado, veo el total que devuelve la API y debajo una frase interpretada» → se cumple; `NetWorthView.spec.ts:90` (total tal cual, aunque las partes no cuadren) y `:118`, `sentence.spec.ts:17`. Comprobado en vivo por el reviewer: `curl` da `88850.64` y la pantalla `88.850,64 €`.
- ✅ «Reparto por naturaleza con barras horizontales, y los grupos suman exactamente el total» → se cumple; `breakdown.spec.ts:85` y `:92`, `NetWorthView.spec.ts:138`. Si algún día no cuadra, se avisa en pantalla (`:97`).
- ✅ «Veo el dinero parado señalado dentro de ese reparto» → se cumple (cuentas corrientes); `NetWorthView.spec.ts:171`, `:181`.
- ✅ «Veo el reparto por banco (Bankinter, N26, Openbank, MyInvestor, Trade Republic)» → se cumple; `breakdown.spec.ts:125`, `NetWorthView.spec.ts:193`.
- ✅ (en parte, por decisión tuya) «Una ficha por cada banco y producto con valuedAt y desde cuándo hay dato» → fichas y fecha del dato sí (`NetWorthView.spec.ts:211`); «desde cuándo hay dato» queda fuera porque la API no lo trae, como decidiste el 2026-09-12.
- ✅ «Los productos con value: null aparecen como hueco, nunca como cero, y no suman» → se cumple; `NetWorthView.spec.ts:237`, `:247`, `breakdown.spec.ts:102`.
- ✅ «Los investments.issues se muestran como avisos legibles» → se cumple; `issues.spec.ts:8`, `:14`, `:27`, `NetWorthView.spec.ts:259`.
- ✅ «Textos en inglés y cifras con el formato fijado en el spec» → se cumple (UI en inglés, cifras es-ES con separador también en 4 cifras); `NetWorthView.spec.ts:282`, `money.spec.ts:70`, `NetWorthView.spec.ts:126`.
- ✅ «La vista se ve coherente con los tokens del design system» → se cumple por revisión: solo alias semánticos, sin hex ni colores de serie, `src/assets/styles/` intacto; captura revisada por el implementer y render en vivo sin errores.

## Decisiones que se tomaron por ti

- (delegado, aprobado) Cifras formateadas desde el texto exacto de la API y sumas en céntimos enteros: no se pierde un céntimo; `src/shared/money.ts:40-90`.
- (delegado, aprobado) Frase del bloque A, sin hablar nunca de crecimiento; `src/features/net-worth/sentence.ts:17`.
- (técnica) Fechas en inglés británico (`12 Sept 2026`); se cambia en un único sitio, `src/shared/money.ts:27`.
- (añadido) Estado de carga mientras llega el dato y aviso de error con el mensaje del error, sin botón de reintentar; `NetWorthView.vue:3`, `:7`.
- (añadido) Aviso en pantalla si los grupos no suman el total; con datos coherentes no sale nunca.
- (delegado) Depósito vencido integrado en su banco y en *Fixed-term deposits*, con `Matured …` y su aviso; `BankCard.vue:69`.
- (implementación) Badge *Idle money* en tono neutro para no confundirlo con los avisos amarillos; `BreakdownList.vue:18`.
- (aprobado, punto rojo 6) El e2e de humo responde la llamada con una muestra de datos para no depender del backend; nada más del smoke cambió.

## Qué NO se tocó / quedó fuera

- Cascada (bloque C) y evolución (bloque D): el backend no tiene patrimonio a una fecha.
- «Desde cuándo hay dato» por producto: pendiente de que el backend lo sirva.
- Backend, tipos y cliente de la feature 7, router, estilos del design system y dependencias: sin cambios.
- Otras pantallas (mes, extracto…): siguen como placeholder.

## Notas para el futuro

- Provocar una vez un aviso real (un producto sin valoración) y verlo en pantalla: la base de hoy no trae ninguno.
- El ejemplo de `GET /api/net-worth` del contrato del backend no cuadra (`investments.total`); corregirlo en una sesión del backend.
- `./init.sh` reutiliza un dev server abierto en :5173: si ese servidor tiene backend detrás, la puerta no detectaría una dependencia nueva del backend. Valdría un modo de smoke con servidor propio.
- Las cifras dentro de frases no van en tipografía mono (sí todas las cifras sueltas); si se quiere, es un retoque de presentación.
