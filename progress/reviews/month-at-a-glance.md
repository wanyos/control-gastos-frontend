# Review — feature 25 `month-at-a-glance`

**Veredicto:** APPROVED

Revisado el 2026-10-02 contra `specs/25-month-at-a-glance/` (aprobado con mediana en vez
de media), `CHECKPOINTS.md`, `docs/` y `../gastos-backend/docs/api-contract.md`. Leídos
uno a uno los cinco specs nuevos, las fixtures, el e2e y los cuatro tests tocados de
features anteriores. La puerta la he ejecutado yo: `./init.sh` con salida 0 (nueve pasos:
tsc, lint sin `--fix`, `prettier --check`, 99 ficheros y 1.575 tests unitarios, e2e
chromium) y `pnpm build` con salida 0 (vue-tsc + vite; CSS 32,31 kB, JS 284,25 kB). Tras
la puerta, `git status` es idéntico al de antes: no modificó ningún archivo.

La T19 (comprobación con el humano delante) sigue en `[ ]` a propósito: no la he
ejecutado ni la exijo. No he hecho ninguna petición al backend real.

## Trazabilidad requirements ↔ tests (solo SDD)

- R1: [x] `router.spec.ts` › `mounts the month at a glance on /overview, not the placeholder (feature 25)`; `e2e/overview.spec.ts:187` (entra por la barra lateral).
- R2: [x] `OverviewView.spec.ts:318` › `opens %s on the current month with no error` (sin `month`, `2026-13`, `nope`).
- R3: [x] `OverviewView.spec.ts:329` (`push` exactamente una vez, `replace` nunca, `back` vuelve) y `:350` (selector de mes); e2e `:241-252` (recarga y atrás).
- R4: [x] `reading.spec.ts:52-115`, los ocho casos con el texto entero en `toBe`, más el orden de precedencia (`:110`); `OverviewView.spec.ts:66` (orden nav → frase → cifras).
- R5: [x] `service.spec.ts:13` (querystring exacto `from=2026-08-01&to=2026-08-31&pageSize=1`); `components.spec.ts:31` y `:45` (un `net` que no cuadra se pinta tal cual: no se recalcula); `OverviewView.spec.ts:88`; e2e `:257-260` (mismas cifras en el extracto).
- R6: [x] `reading.spec.ts:145-152` (392 y −546); `components.spec.ts:58`.
- R7: [x] `components.spec.ts:78`; `OverviewView.spec.ts:203`.
- R8: [x] `reading.spec.ts:117-143` (un día antes, el último día, uno después, bisiesto); `store.spec.ts:109` (no pide ningún mes anterior); `OverviewView.spec.ts:186`; e2e `:225-238`.
- R9: [x] `store.spec.ts:123`; `OverviewView.spec.ts:219` (ni tarjetas, ni leyenda, ni línea, ni enlace; 2 lecturas); e2e `:270`.
- R10: [x] `reading.spec.ts:181-296`; `components.spec.ts:93-143`; `OverviewView.spec.ts:103`, `:154`, `:178`.
- R11: [x] `reading.spec.ts:299-310` (12, 5, 11, 2, 1, 0); `OverviewView.spec.ts:119`, `:160`, `:172`, `:181`.
- R12: [x] `service.spec.ts:37` (los siete parámetros, ninguno más); `reading.spec.ts:351-371`; `components.spec.ts:145-187`; `OverviewView.spec.ts:125`, `:238`.
- R13: [x] `reading.spec.ts:373-396`; `store.spec.ts:137`; `OverviewView.spec.ts:250`, `:268`.
- R14: [x] `store.spec.ts:163` (11 meses llegaron y `comparison` es nula; el reintento pide solo el que faltaba), `:190`; `OverviewView.spec.ts:280`, `:304`.
- R15: [x] `OverviewView.spec.ts:135` (`href` = `/movements?month=2026-08`); e2e `:255-257`.
- C1: [x] `service.spec.ts:68`, `store.spec.ts:295`, `OverviewView.spec.ts:384`; e2e `:264-265`.
- C2: [x] `reading.spec.ts:202` y `:215`; `money.spec.ts` › `formatMoneyWhole (feature 25)`.
- C3: [x] `store.spec.ts:235-293`; `OverviewView.spec.ts:372`; `import/__tests__/store.spec.ts` (tres tests de la feature 25).
- C4: [x] `store.spec.ts:203` y `:221`.
- C5: [x] `router.spec.ts` (listas exhaustivas intactas, `HOME_ROUTE_NAME`). Ver la nota sobre `AppShell.spec.ts` más abajo.
- C6: [x] `OverviewView.spec.ts:144`.

Sección de procedencia: presente en `requirements.md:231-272`, con R1–R15 y C1–C9
clasificados.

## Tasks completas (solo SDD)

- T0–T18: [x]
- T19: [ ] — sin hacer a propósito (es del leader con el humano; justificado en
  `tasks.md:117` y en el informe). No bloquea esta revisión; sí bloquea el `done`.

## Criterios de aceptación (siempre)

- [x] Pantalla con entrada en la barra lateral, frase y cuatro cifras → R1, R4–R6.
- [x] Cifras del mes del backend (`totals` de `GET /api/movements`) → `service.ts:12-15`, `service.spec.ts:13`.
- [x] Comparación con las cifras del backend de cada mes; lo único calculado en cliente es la mediana, y queda dicho → `reading.ts:74-83`, leyenda de R11. (El criterio de `feature_list.json` dice «media»; lo sustituye la corrección del humano del 2026-10-02.)
- [x] Parte del gasto sin categoría con cifra del backend → `service.ts:22-38`.
- [x] Mes incompleto señalado y sin tasa engañosa → R8.
- [x] Con menos de doce meses, compara con los que haya y dice con cuántos → R11.
- [x] El mes vive en la URL → R2, R3, e2e.
- [x] Solo lectura → C1.
- [x] Coincide con el extracto del mismo mes → e2e `:257-260`. Contra datos reales queda para la T19.
- [x] No cambia el inicio ni lo anterior → C5.
- [x] Inglés, tema oscuro, tokens semánticos, contraste, sin dependencias → `theme-dark.spec.ts` verde, ninguna línea `contrast:` nueva necesaria, `package.json` sin tocar.
- [x] `./init.sh` verde con lint y formato.

## Las siete comprobaciones con lupa

1. **La mediana: correcta.** `reading.ts:74-83`: `toCents` de cada cifra, orden de
   `bigint` sobre la copia que devuelve `map`, N impar → el central con `fromCents` (sin
   tocar), N par → suma de los dos centrales, división entera y un único ajuste de medio
   céntimo hacia fuera del cero; lista vacía → `null`; N = 1 → ese valor; N = 2 → la media.
   Ningún `number` toca un importe. Comprobado a mano contra el caso real: los doce gastos
   anteriores a agosto de 2026, ordenados, tienen en el centro `2819.35` y `3115.81`;
   suman `5935.16` → `2967.58`. Los doce ingresos: centrales `2785.90` y `3114.10` →
   `2950.00`. Es lo que afirman `reading.spec.ts:188-189`, `store.spec.ts:61-65` y el e2e.
   Medio céntimo (`0.01` y `0.02` → `0.02`, negativos → `-0.02`), orden por valor y no por
   texto, entrada congelada sin mutar y más allá de 2^53: los cuatro con test.
2. **Única cifra calculada en cliente: sí.** No hay ninguna suma de movimientos en
   `src/features/overview/` (ni `sumAmounts`, ni `reduce`). Las tarjetas pintan
   `totals.income`, `totals.expense` y `totals.net` con `formatMoney`
   (`MonthFiguresGrid.vue:3-15`); el resto son cocientes de dos cifras del backend
   (`sharePermille`) y el cambio de signo de `net`. Ni `Number()`, ni `parseFloat`, ni
   `parseInt` en el código de la feature.
3. **Textos: literales.** Comparados carácter a carácter con `decisions.md` (puntos rojos
   1 a 6) y con R4, R7, R8, R11, R12, R14 y R15: los ocho casos de la frase, las dos notas
   de la tasa, las cuatro leyendas, las tres etiquetas, la línea de sin categoría
   (singular incluido), los dos textos de fallo y el enlace. Todos coinciden y todos están
   fijados con `toBe`. **«average» no aparece** en ningún `.ts` ni `.vue` de la feature
   (grep propio, sin distinguir mayúsculas; la única aparición es la expresión del test
   que lo prohíbe, `reading.spec.ts:400`).
4. **Mes incompleto: sin reloj.** `monthState` (`reading.ts:64-68`) compara como texto
   la fecha del último dato con el último día del mes; no hay `Date`, `Date.now` ni
   `new Date` en la feature. El único uso del reloj es `currentMonth()` para el mes por
   defecto de R2, que es lo que el spec pide. En un mes incompleto la tasa es `—` con su
   nota (`MonthFiguresGrid.vue:60`), la leyenda es `No comparison for an incomplete month.`
   y no se pide ningún mes anterior (`store.ts:141`, test `store.spec.ts:109`).
5. **No escribe y nada sale a `:3000`.** `service.ts` solo llama a `getMovements`; ninguna
   función acepta método ni cuerpo. Unitarios: `mockBackend` (`fixtures.ts:188-206`)
   rechaza todo lo que no sea `GET /api/movements`, y los tres tests de C1 comprueban
   método, ruta y cuerpo indefinido. `AppShell.spec.ts:29` deja `fetch` pendiente para
   siempre, así que montar la vista real ahí no sale a red. E2E: la red de seguridad sobre
   todo `/api` se registra la primera, aborta y apunta; `aborted` acaba vacía y el único
   método de la sesión es `GET` (`e2e/overview.spec.ts:264-265`, `:285-286`).
6. **Desviaciones**: ver la sección siguiente.
7. **Datos personales: limpio.** `fixtures.ts`, `e2e/overview.spec.ts`, los tres tests
   nuevos del store de `import` y el informe solo llevan totales, recuentos, la fecha del
   último dato y el número de movimientos de la base. Los únicos conceptos son `MOVEMENT`
   y `MOVEMENT` seguido de un id; la cuenta es `ES00` / `bank` (y `n26` / `Main` en la
   muestra de patrimonio, igual que en los demás e2e). Ningún nombre de persona, ningún
   concepto real, ningún IBAN real.

## Desviaciones del informe

La numeración que me pasó el leader (siete, con «la 4», «la 2» y «la 1») no coincide con
la del informe, que lista nueve en «Decisiones y desviaciones» y deja el test de
`AppShell` y las 33 lecturas en secciones aparte. Las juzgo todas, con la numeración del
informe.

- **1 — El enlace sin utilidad de color en un hijo.** Aceptable. Esa utilidad es un
  contaminante vigilado por `tailwind-sources.spec.ts`; usarla obligaba a tocar un test de
  la F5. `base.css` ya pinta todo `a` con `--ink-link`, que es el color pedido, y el par
  está medido.
- **2 — El borde del 25 % sobre el porcentaje redondeado a la décima** (la que el leader
  llama «la 4»). **Aceptable, y es lo correcto.** Sigue la fórmula literal de `design.md`
  §5 (`sharePermille` y valor absoluto menor o igual que 250). Decidir sobre el valor
  exacto produciría en pantalla `25,0 % above your usual month` junto a `More than usual`,
  que es justo la contradicción que una etiqueta interpretada no debe tener; el usuario
  solo ve la décima. El coste es una franja de 0,05 puntos (hasta 25,04 % es
  `About usual`), irrelevante: `decisions.md` ya mide que con 15, 25 o 33 % salen las
  mismas 22 etiquetas. **Queda una incoherencia de redacción en el spec, que es del
  leader:** R10 dice «no supera el 25 % de la mediana» y T7 dice «un céntimo más es
  `more`», lo cual solo es cierto con medianas pequeñas (el test `reading.spec.ts:244` usa
  `20.00`, donde un céntimo son 0,05 puntos). No bloquea; conviene una línea en R10 y T7
  diciendo que el corte es sobre el porcentaje a una décima.
- **3 — `N` = 0 dentro del tipo `Comparison`.** Aceptable: ese `usual` a cero nunca se
  pinta (`MonthFiguresGrid.vue:55-57` exige al menos un mes; test `components.spec.ts:110`).
- **4 — Lo de sin categoría se pide aunque el gasto sea 0.** Aceptable; es design §6
  literal y la línea no se pinta (test `OverviewView.spec.ts:238`).
- **5 — Salir de la pantalla no dispara lecturas.** Aceptable y mejor que el diseño;
  test `OverviewView.spec.ts:361`.
- **6 — Una respuesta tardía solo se guarda si es de la misma visita.** Aceptable; cierra
  un hueco real de C3. Test `store.spec.ts:250`.
- **7 — `retryComparison` pide solo lo que faltaba.** Es lo que pide T10 (e).
- **8 — Textos de carga y de error.** Los de design §5 y §7. Sin texto mientras carga lo
  de sin categoría: correcto no inventar uno.
- **9 — `h1` `Overview` y una línea de descripción sobre la navegación.** Aceptable: mismo
  patrón que `StatementView.vue:4-7`, y R4 habla del primer contenido **bajo** la
  navegación (test de orden). Es un texto de pantalla que no está en `decisions.md`
  («One month at a glance: what came in, what went out and whether it was a usual
  month.»); lo recojo en el resumen para que el humano lo sepa.
- **El test de la F8 (`AppShell.spec.ts:57-64`)** (la que el leader llama «la 2»).
  **Protege lo mismo.** El test afirma que la vista enrutada se pinta dentro del `main`
  del shell; la ruta era un ejemplo. Con `/investments` conserva las tres aserciones
  (existe el placeholder, lleva la etiqueta de la ruta, está dentro de `main`). Es
  consecuencia obligada de R1. Dos apuntes: C5 lista como únicas ediciones fuera de la
  carpeta tres archivos y este no está (tampoco es de las cinco features que C5 protege);
  y volverá a romperse el día que `/investments` deje de ser placeholder.
- **Las 33 lecturas a mano contra el backend real** (la que el leader llama «la 1»).
  **Sin nombres ni conceptos en las fixtures: confirmado** (punto 7). **Que no hubo
  ninguna escritura no puedo probarlo a posteriori desde este repo**: no queda registro
  de esas peticiones ni script alguno. Lo que sí hay es evidencia indirecta coherente: el
  informe declara solo `GET /api/movements` con `pageSize=1`; las cifras de las fixtures
  coinciden con las que el spec leyó antes (agosto `2590.26`, `4003.89`, `-1413.63` y 70;
  septiembre `161.82`, `966.84`, `-805.02` y 28; último dato `2026-09-11`; 1.607
  movimientos; sin categoría `3036.33` y 48), es decir, la base no ha cambiado entre las
  dos lecturas; y `git status` no muestra ningún archivo suelto. La T19 lo confirma de paso.

## Arquitectura (docs/architecture.md)

- [x] Por feature: todo en `src/features/overview/`.
- [x] La UI no llama a la API: ningún `fetch(` en los `.vue`; vista → store → service → `getMovements`.
- [x] El store guarda estado y el service trae datos y mapea (`MonthFigures`, `Uncategorized`).
- [x] Tipos propios (`types.ts`); el JSON crudo no llega a los componentes.
- [x] Estado mínimo: `figuresByMonth` vive en el store; `run`, `visit` e `isLatestKnown` están dentro del cierre del store, no a nivel de módulo.
- [x] Componentes tontos: los textos y la aritmética están en `reading.ts`.
- [x] Dependencias en un solo sentido: `overview` → `statement` e `import` → `overview`; ningún archivo de `statement` tocado. Documentado en `docs/architecture.md`.
- [x] Sin dependencias nuevas.

## Convenciones (docs/conventions.md)

- [x] Estilo, nombres, orden de imports, `import type`; lint y formato verdes sin `--fix`.
- [x] Código, comentarios y textos de pantalla en inglés; documentos en español.
- [x] Importes en céntimos `bigint` por `shared/money.ts`; U+00A0 generado en los tests.
- [x] Tokens semánticos, números con `tabular-nums` / `font-mono` (vía `StatCard`), sin colores crudos.
- [x] Errores: `toAppError`, estado de error en el store, texto propio en la vista; el único `catch` sin variable (`store.ts:107`) deja `uncategorizedLoad` en error y se pinta.
- [x] Sin `console.*` ni `TODO`.

## Verificación (docs/verification.md)

- [x] Solo se imita la frontera HTTP (`fetch`); store, router y Pinia son reales.
- [x] Los tests verifican salida concreta (textos enteros, querystrings, recuentos de peticiones), no «no lanza».

## CHECKPOINTS.md

- [x] C1 — Arnés completo; `./init.sh` salida 0.
- [x] C2 — Estado coherente: una sola feature `in_progress` (25); `current.md` describe la sesión.
- [x] C3 — Arquitectura: estructura conforme, sin dependencias nuevas, sin logs ni TODOs.
- [x] C4 — Verificación real: cinco specs nuevos, camino feliz y de error, todos verdes.
- [x] C5 — Sesión: sin archivos sospechosos sin trackear; estado correcto en `feature_list.json`. La entrada de `history.md` se escribe al cerrar la sesión.
- [x] C6 — Proyecto hermano: solo `GET /api/movements` con parámetros del contrato (`from`, `to`, `type`, `uncategorized`, `transfer`, `excluded`, `pageSize`); nada inventado; el contrato no cambia.
- [x] C7 — SDD: cuatro archivos, `decisions.md` con 6 puntos a confirmar, 15 requirements en EARS, cada `R<n>` con test. T19 pendiente a propósito.
- [x] C8 — Resumen de cierre escrito.

## Resumen de cierre (si APPROVED)

- Escrito en `progress/summaries/month-at-a-glance.md` → sí

## Cambios requeridos (si aplica)

Ninguno bloqueante. Cabos para el leader, fuera del código del implementer:

1. `specs/25-month-at-a-glance/requirements.md` R10 y `tasks.md` T7 — una línea que diga
   que el corte del 25 % se decide sobre el porcentaje redondeado a una décima (como ya
   dice `design.md` §5), para que los tres archivos digan lo mismo.
2. `feature_list.json`, feature 25 — `intent` y `acceptance` siguen diciendo «media»; la
   mediana solo consta en el spec y en `current.md`. Decide el leader si lo anota ahí.
3. La T19 sigue pendiente: sin ella la feature no pasa a `done`.
