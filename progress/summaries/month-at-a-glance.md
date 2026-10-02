# Resumen — feature 25 `month-at-a-glance`

Fecha de cierre: 2026-10-02 (aprobada por el reviewer y comprobada contigo delante contra el backend real, T19)
Intención original: `feature_list.json` → feature `month-at-a-glance`, bloque `intent`
Spec (si SDD): `specs/25-month-at-a-glance/`

## Qué hace ahora la app que antes no

La entrada `Overview` del menú, que estaba vacía, enseña ahora un mes: una frase ya
interpretada («In August 2026, 2.590 € came in and 4.004 € went out: you spent 1.414 €
more than came in.»), debajo lo que entró, lo que salió, el ahorro y la tasa de ahorro,
una etiqueta que dice si lo que entró y lo que salió fue lo habitual, y cuánto de ese
gasto no tiene categoría todavía. Solo mira: no escribe nada.

## Por dónde se usa (puntos de entrada)

- Barra lateral → `Overview` (mismo sitio e icono de siempre), o directamente
  `/overview?month=2026-08`. Sin `month`, o con uno inválido, abre el mes en curso.
- Flechas y selector de mes: los mismos del extracto. Cada cambio queda en el historial,
  así que «atrás» y recargar conservan el mes.
- Enlace `See the movements of August 2026`: abre el extracto de ese mes, sin filtros.
- Tras una importación la pantalla se vuelve a leer sola, si estaba abierta.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| La ruta `/overview` | `src/router/index.ts:76` |
| La pantalla (orden: navegación, frase, cifras, leyenda, sin categoría, enlace) | `src/features/overview/views/OverviewView.vue:10` |
| El mes sale de la URL y solo de ella | `src/features/overview/views/OverviewView.vue:109` |
| Las tres lecturas, las tres `GET /api/movements` | `src/features/overview/service.ts:12`, `:22`, `:41` |
| Cuándo un mes está incompleto (sin reloj) | `src/features/overview/reading.ts:64` |
| **La mediana**, la única cifra que calcula la pantalla | `src/features/overview/reading.ts:74` |
| La etiqueta (margen del 25 % sobre la mediana) | `src/features/overview/reading.ts:85` |
| La frase, sus ocho casos | `src/features/overview/reading.ts:120` |
| La leyenda «con cuántos meses comparé» | `src/features/overview/reading.ts:154` |
| La línea del gasto sin categoría | `src/features/overview/reading.ts:190` |
| Qué se lee según el mes (vacío, incompleto, completo) | `src/features/overview/store.ts:113` |
| La comparación solo existe con los doce meses leídos | `src/features/overview/store.ts:56` |
| Las cuatro tarjetas y el `—` de la tasa | `src/features/overview/components/MonthFiguresGrid.vue:59` |
| Euros enteros para la frase | `src/shared/money.ts:97` |
| El refresco tras importar | `src/features/import/store.ts:85` |
| Test de la mediana con tus doce meses reales | `src/features/overview/__tests__/reading.spec.ts:182` |
| Test de la pantalla entera | `src/features/overview/__tests__/OverviewView.spec.ts:66` |
| Prueba en navegador | `e2e/overview.spec.ts:179` |

## Cumplimiento de la intención

- ✅ «Lo primero que leo es una frase ya interpretada, no un gráfico» → se cumple;
  `OverviewView.spec.ts:66` (la frase va justo bajo las flechas y antes de cualquier
  cifra) y `reading.spec.ts:52-115` (los ocho textos, letra por letra).
- ✅ «Veo lo que entró, lo que salió, el ahorro y la tasa de ahorro» → se cumple;
  `OverviewView.spec.ts:88` y `components.spec.ts:31`. Las tres cifras son las del
  backend con sus céntimos, sin recalcular (`components.spec.ts:45`).
- ✅ «Me dice si gasté más o menos que de costumbre, contra los doce anteriores» → se
  cumple, **con la mediana y no con la media**, que es el cambio que hiciste al aprobar.
  `reading.spec.ts:182` (centrales 2.819,35 y 3.115,81 → 2.967,58 €), `:221` (agosto:
  gasto `More than usual`, 34,9 % por encima; entrada `About usual`, 12,2 % por debajo) y
  `OverviewView.spec.ts:103`.
- ✅ «Me dice qué parte del gasto no tiene categoría» → se cumple;
  `OverviewView.spec.ts:125` (3.036,33 € de 4.003,89 €, 75,8 %, 48 movimientos).
- ✅ «Si el mes está incompleto, me lo dice en vez de una tasa disparatada» → se cumple;
  `reading.spec.ts:117-143` y `OverviewView.spec.ts:186` (septiembre: frase de incompleto,
  `—` en la tasa, sin comparación).
- ✅ «Puedo cambiar de mes y volver, y recargar sin perder el mes» → se cumple;
  `OverviewView.spec.ts:329` y `e2e/overview.spec.ts:241-252`.
- ✅ «Las cifras cuadran con las del extracto del mismo mes» → se cumple por construcción
  (es la misma petición que hace el extracto, `service.spec.ts:13`) y en el navegador
  (`e2e/overview.spec.ts:257-260`). **Contra tus datos reales, comprobado en la T19**
  (2026-10-02): las tres cifras de agosto de 2026 son las mismas que enseña el extracto.

## El límite conocido de la comparación

**La etiqueta «más o menos de lo habitual» todavía no es de fiar en todos los meses, y no
es un fallo del código.** Con la mediana, enero de 2026 sigue saliendo «53,5 % menos de lo
habitual», que no es verdad: entre octubre de 2024 y septiembre de 2025, siete de los doce
meses pasan de 5.000 € de gasto por traspasos a tus cuentas propias de inversión que
siguen sin marcar, así que el «mes habitual» con el que se compara está inflado. La
mediana aguanta un mes excepcional, pero no limpia datos cuando más de la mitad de los
meses están sucios.

Se corrige **cuando marques esos traspasos como que no cuentan desde el extracto**
(`Select movements` → `Exclude from totals`), no con código: no se ajusta la fórmula para
que las etiquetas salgan bien sobre datos sucios. Hasta entonces, lee la etiqueta con esa
reserva en cualquier mes cuyos doce anteriores caigan en ese tramo. Las cifras del mes (lo
que entró, lo que salió, el ahorro y la tasa) no están afectadas por esto dentro del
propio mes que miras, salvo que ese mes tenga él mismo traspasos sin marcar.

## Comprobado contra el backend real (T19, 2026-10-02)

Contigo delante y solo leyendo: cero escrituras y cero errores.

- Siete meses contra la API: las cifras, la mediana (calculada aparte) y el gasto sin
  categoría coinciden en los siete.
- Agosto de 2026 lee «In August 2026, 2.590 € came in and 4.004 € went out: you spent
  1.414 € more than came in», con la entrada `About usual` y la salida `More than usual`
  (34,9 % sobre 2.967,58 €).
- Septiembre de 2026 sale como incompleto, sin tasa ni comparación.
- Febrero de 2024 compara con su único mes previo; enero de 2024 dice que no hay meses
  anteriores; mayo de 2023, sin movimientos.
- Las tres cifras de agosto son las mismas que enseña el extracto.
- Patrimonio sigue siendo la pantalla de inicio.

## Decisiones que se tomaron por ti

- (delegado) Se llama `Overview` y no se mueve del menú.
- (delegado) Un mes está incompleto si el movimiento más reciente de toda la base es
  anterior a su último día. No se usa el reloj (`reading.ts:64`).
- (delegado) Tres etiquetas con un margen del 25 % sobre la mediana. **El corte se decide
  sobre el porcentaje que ves, redondeado a una décima**: hasta `25,0 %` es `About usual`.
  Así la etiqueta nunca contradice al número que tiene al lado (`reading.ts:85`).
- (delegado) Con menos de doce meses con datos compara con los que haya y lo dice; con
  uno, «the only previous month with data»; con ninguno, que no hay con qué comparar.
- (delegado) La frase va en euros enteros; los céntimos, en las tarjetas.
- (añadido) La misma comparación para lo que entró, no solo para el gasto.
- (añadido) Qué se ve en un mes sin movimientos: solo la frase.
- (añadido) El enlace al extracto del mismo mes.
- (añadido) Si falla la lectura de un mes anterior no hay comparación (nunca una mediana
  con «los que sí llegaron»), y lo dice con un `Try again`.
- (añadido) El refresco tras importar: una línea en el importador.
- (añadido, no estaba en la hoja de decisiones) Un título `Overview` y una línea de
  descripción encima de las flechas, como en el extracto: «One month at a glance: what
  came in, what went out and whether it was a usual month.» (`OverviewView.vue:4-7`).
- La palabra «average» no aparece en ningún texto de la pantalla; hay un test que lo
  vigila (`reading.spec.ts:398`).

## Qué NO se tocó / quedó fuera

- El backend, y cualquier escritura: la pantalla solo manda `GET /api/movements`.
- La pantalla de inicio sigue siendo Patrimonio.
- Sin reparto por categoría ni gráficos por categoría.
- La tira del año: queda el sitio debajo, sin nada pintado.
- El extracto: ni un archivo suyo cambia.
- Un test de la barra de la app (`AppShell.spec.ts:57`) usaba `/overview` como ejemplo de
  pantalla vacía; ahora usa `/investments`. Comprueba lo mismo.

## Notas para el futuro (opcional)

- Las cifras de las pruebas son tus totales mensuales reales (solo totales y recuentos,
  ningún concepto ni nombre). El implementer las leyó a mano del backend con peticiones de
  solo lectura; no queda registro con que comprobarlo después, pero coinciden con las que
  ya estaban en el spec.
- La comparación es tan buena como limpios estén los doce meses anteriores: ver «El límite
  conocido de la comparación», más arriba. Cuando marques los traspasos a tus cuentas de
  inversión, conviene volver a mirar enero de 2026.
- «Incompleto» mira toda la base, no cada banco.
- Ya igualado tras la revisión: el spec decía en dos sitios (R10 y T7) que el 25 % se
  cortaba al céntimo y en otro (design §5) que a la décima; ahora dice en todos lo que está
  implementado, a la décima. Y `feature_list.json` recoge la mediana en los criterios y en
  tus respuestas (el texto original de la intención conserva la palabra «media», con el
  cambio anotado al lado).
- Fuera de esta feature: el extracto pide el mes en curso una vez de más al salir de él
  (lo vio el implementer; aquí está resuelto con una guarda).
