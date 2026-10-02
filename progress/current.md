# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** 25 — month-at-a-glance (implementada; pendiente de reviewer y de
  la T19 con el humano). Primera de la E8.
- **Plan:** las tasks T0..T18 de `specs/25-month-at-a-glance/tasks.md` (hechas). La T19 no
  es del implementer.
- **Última sesión:** 2026-09-22 → 2026-10-02 (features 16 a 24). Todo su detalle está
  en `progress/history.md`.

## Estado

25 features cerradas, etapas E0 a E7 completas y la E8 empezada. `./init.sh` ejecuta nueve pasos, con
lint y formato incluidos.

## Cabos sueltos que no son de ninguna feature en curso

- **Fallo de paginación del backend** (`../docs/handoff-paginacion-estable.md`):
  `GET /api/movements` con `pageSize=100` devuelve 1.605 movimientos distintos de 1.607.
  La cola de revisión esconde dos (21728 y 24276) hasta que el backend lo arregle. Cuando
  esté, comprobar desde la cola que recorrer las 17 páginas da 1.607 distintos.
- **`GET /api/investments/deposits`** (feature 50 del backend): servido y sin usar. Dice
  lo que ganó cada depósito; encaja en Patrimonio, ya en la E8.
- **Deuda de las reglas** (anotada en el resumen de la F18): «ANUL. /VivaGym» propone
  `anul. /vivagym`, y los nombres de canal (`trans inm`, `tpv virtual`) siguen flojos.
- **Higiene transversal** anotada por el reviewer: los tests unitarios no tienen una red
  de seguridad global (el origen de jsdom coincide con el backend real; se cierra con una
  línea en `vitest.config.ts`), y un fallo de red al escribir se cuenta como «no cambió
  nada» en F16, F21, F22 y F24.
- **Historial con nombres de terceros**: en dos commits antiguos, aún sin subir. El
  humano decidió dejarlo como está (2026-10-02).
- **17 traspasos propios sin pareja** siguen contando en las sumas; los marca el humano
  desde el extracto cuando quiera.

## Bitácora

- **2026-10-02 — F25 `month-at-a-glance` en `spec_ready`** (primera de la E8). Spec en
  `specs/25-month-at-a-glance/`; espera la aprobación del humano sobre `decisions.md`.
  Solo lectura; 15 requisitos. Dato medido al redactar: la media de doce meses está
  arrastrada por julio y agosto de 2025 (11.527 € y 10.942 € de gasto).

- **2026-10-02 — F25: el humano aprueba con un cambio, mediana en vez de media.**
  Aplicado en los cuatro archivos del spec (sigue en `spec_ready`). Textos: «your usual
  month» y «the middle value of the previous 12 months». El umbral se queda en ±25 %:
  con 15, 25 o 33 % salen las mismas etiquetas en los once meses completos.

- **2026-10-02 — F25 implementada (T0–T18).** Carpeta nueva `src/features/overview/`
  (service, reading, store, vista y cuatro componentes), `formatMoneyWhole` en
  `shared/money.ts`, una llamada en `import/store.ts`, la ruta `/overview` y
  `e2e/overview.spec.ts`. Solo lectura: tres `GET /api/movements`. `./init.sh` en verde
  (nueve pasos, 99 archivos y 1.575 tests unitarios, e2e chromium), `pnpm type-check` y
  `pnpm build` en verde. Informe: `progress/implementation/month-at-a-glance.md`.
  Sin commits; la feature sigue `in_progress`.
  - Fixtures con las cifras reales: leídas del backend local con 33 `GET` de solo lectura
    (solo `totals` y recuentos; ningún concepto ni nombre entra en el repo).
  - **Un test de una feature anterior cambia de contenido:** `AppShell.spec.ts` usaba
    `/overview` como ejemplo de placeholder; ahora usa `/investments`.
  - **Desviación del diseño:** el enlace al extracto no lleva la utilidad de color en un
    hijo, porque esa clase es un «contaminante» vigilado por `tailwind-sources.spec.ts`;
    `base.css` ya le da el color de enlace.
  - **Incoherencia del spec:** la T19 (paso 6) espera `1 previous month with data` para
    febrero de 2024; R11 fija `Your usual month is the only previous month with data.`,
    que es lo implementado.

## Decisiones de esta feature que no están en el spec

- 2026-10-02 — **Arranca la E8** con un borrador razonado (`docs/intent-e8-draft.md`) que
  el humano aprueba entero: A el mes, B la tira del año, C recurrentes y D por categoría,
  más una pequeña con lo que ganó cada depósito. Sus respuestas: «mes normal» contra los
  doce anteriores, mes y año en **una sola pantalla**, y Patrimonio sigue siendo el
  inicio. **D se aplaza** hasta que haya más categorizado (hoy el 6,9 % del gasto).
- 2026-10-02 — **Recurrentes se le pide al backend**, no se calcula en el navegador:
  encargo en `../docs/handoff-recurrentes.md`, con las siete trampas vistas en los datos.
- 2026-10-02 — **Media → mediana, y un diagnóstico equivocado del leader.** Al ver que la
  media de doce meses estaba inflada, el leader propuso la mediana creyendo que el
  problema eran picos sueltos (un coche, una moto). El humano la aprobó. Al medirlo, **no
  arregla el caso que la motivó**: enero de 2026 sigue saliendo «53 % menos de lo
  habitual», porque de octubre de 2024 a septiembre de 2025 siete de doce meses pasan de
  5.000 € de gasto por los traspasos a cuentas de inversión propias sin marcar. La
  mediana resiste excepciones, no limpia datos. Se le enseñó la tabla al humano y decidió
  **seguir con la mediana**: es mejor que la media, y la comparación se corregirá sola
  cuando marque esos traspasos. No se ajusta la fórmula para que las etiquetas salgan
  bien sobre datos sucios.
- 2026-10-02 — El humano aprueba el spec de la F25. Pasa a `in_progress`.

- 2026-10-02 — reviewer **aprueba** la F25 sin cambios de código. Verificó la mediana a
  mano (centrales 2.819,35 y 3.115,81 → 2.967,58), que es la única cifra calculada en el
  cliente, los textos carácter a carácter, que «average» no aparece, y que las fixtures
  solo llevan totales y recuentos, sin conceptos ni nombres. El leader cerró tres cabos:
  el spec decía «un céntimo más» para el borde del 25 % cuando el diseño y el código lo
  deciden a la décima; `feature_list.json` seguía diciendo «media»; y un paso de la T19
  esperaba un texto distinto del de R11.
- 2026-10-02 — **T19 hecha** con el humano delante, solo lectura. Siete meses contra la API:
  las cifras, la mediana (calculada aparte por el leader) y el gasto sin categoría
  coinciden en los siete. Agosto de 2026: «In August 2026, 2.590 € came in and 4.004 €
  went out: you spent 1.414 € more than came in», entrada `About usual` y salida `More
  than usual` (34,9 % sobre 2.967,58 €). Septiembre sale como incompleto, sin tasa ni
  comparación, y entra con 5 peticiones en vez de 17. Febrero de 2024 compara con su
  único mes previo; enero de 2024 dice que no hay meses anteriores; mayo de 2023, «No
  movements». Las tres cifras de agosto son las mismas que enseña el extracto. La pantalla
  de inicio sigue siendo Patrimonio. Cero escrituras y cero errores. El leader arrancó
  `pnpm dev` para la prueba y lo paró al terminar.

## Próximo paso

La tira del año, debajo del mes en la misma pantalla `Overview`; y lo que ganó cada
depósito, en Patrimonio. Recurrentes espera a la parte 1 de
`../docs/handoff-recurrentes.md`; el reparto por categoría, a que haya más categorizado.

Para que la comparación de «mes normal» diga la verdad, el humano tiene que marcar como
que no cuentan los traspasos a sus cuentas de inversión, en bloque desde el extracto.
