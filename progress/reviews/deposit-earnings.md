## Review — 2026-11-02

**Veredicto:** CHANGES_REQUESTED

### Cambios requeridos

1. `src/features/net-worth/deposits.ts:22-23` (y `components/DepositRow.vue:12`, que pinta
   la etiqueta con ese tono): la etiqueta `Matured` sale en verde (`BaseBadge` tono
   `positive` = `bg-positive-subtle text-positive`) y la etiqueta `Active` en azul (tono
   `info`). La hoja aprobada dice en la decisión 2 «Todas las filas iguales salvo los
   cancelados, en gris. **Solo lo ganado de un vencido va en verde.**», y en la tabla de
   textos solo `Doubtful` lleva color (ámbar). Lo de los tonos sale de `design.md §4`, que
   el humano no aprueba, y contradice la hoja. Dos salidas: (a) quitar el color a las
   etiquetas `Active` y `Matured` y que `shows what a matured deposit earned, in green`
   compruebe también que la etiqueta no es verde; o (b) que el leader se lo pregunte al
   humano y, si lo acepta, lo apunte en el bloque 🔄 de `decisions.md`.
2. `CHECKPOINTS.md` C4 bis — la lectura nueva (`GET /api/investments/deposits`) no se ha
   pasado por un dato real. El informe dice por qué (backend caído; lo he repetido:
   `curl -s -m 5 -o /dev/null -w "%{http_code}" http://localhost:3000/api/investments/deposits`
   → `000`, exit 7), pero en `docs/roadmap.md` no hay ninguna línea que se la apunte al
   humano como deber (`git diff docs/roadmap.md` solo añade el aviso del backend en
   `:76-79`). Estar en el bloque 📌 de `decisions.md` no basta. Es del leader.
   En la misma edición (también del leader, como prevé `design.md §9`):
   `docs/roadmap.md:74`, `:356-357` y `:379-380` siguen diciendo que
   `GET /api/investments/deposits` está «sin usar»; con esta feature ya es falso.

### Comprobado sin hallazgos

- R1–R15 ↔ tests: cada `R<n>` tiene al menos un test que comprueba salida concreta (texto,
  clases, `href`, número y método de peticiones), con caminos de error (estado
  desconocido, `earned` fuera de `matured`, `maturity` donde no toca, total que no cuadra,
  500). Solo se imita `fetch`. Fixtures con nombres del contrato y cifras inventadas.
- Contrato «GET /api/investments/deposits»: solo `matured` lleva `earned` (el service
  rechaza lo contrario y `earnedCell` solo pinta cifra en `matured`); `total` se compara en
  céntimos con la suma de los `matured` y se enseña tal cual; `expectedGain` solo se
  formatea, nunca se suma; el total no entra en ninguna cifra de Net Worth (test R11 con
  cifras y frase idénticas con y sin depósitos).
- Decisiones 1, 3, 4, 5 y 6 y las tres técnicas: respetadas en código y tests.
- Arquitectura y convenciones: todo dentro de `src/features/net-worth/`, nada importado
  de otra feature, `shared/` sin cambios, componentes solo con props, comentarios en
  inglés, sin colores crudos ni `console.log`.
- `docs/stack.md`: el único cambio es el párrafo de `:509-514` (la home pide también los
  depósitos y las specs de `e2e/` la responden). Es lo que justifica el informe.
- Los 9 specs de `e2e/` que responden `**/api/net-worth` responden también
  `**/api/investments/deposits` (`grep -L` sobre ellos: ninguno sin la ruta).
- Prueba de navegador inestable: **no reproducida**. `pnpm exec playwright test
  --project=chromium --reporter=list` seis veces seguidas → las seis exit 0,
  `83 passed`. Y los 9 specs tocados más `e2e/action-notice-in-view.spec.ts` con
  `--repeat-each=5` → exit 0, `265 passed`. Los fallos de la primera pasada del Lote B
  (`action-notice-in-view.spec.ts:1316`, `:1374`, `statement.spec.ts:430`, `:473`) abren
  `/review` y `/movements`, no la home, así que no pasan por la petición nueva; no he
  encontrado la causa de aquel fallo y no puedo descartarla del todo.
- `./init.sh --checks 38` → exit 0, **Checks: 13 de 13 en verde**. El 10 termina con
  `[OK] Entorno listo` (incluye type-check, lint, formato, `test:unit`, `build-only`,
  `./init.sh` con el e2e de chromium en verde). Los 12 checks con filtro de vitest,
  lanzados uno a uno: los 12 dan `Tests 1 passed | N skipped`. Los `checks` coinciden con
  la tabla 🧪 de `decisions.md`.
- SDD: `decisions.md` cabe en una página, 🔴 con 6 puntos y su alternativa; 15
  requirements, dicho en la hoja; procedencia con los 15 clasificados; T1–T11 en `[x]`.
- `docs/guia-de-uso.md` y `docs/architecture.md` al día; las líneas `--` del humano en la
  guía, intactas. Vocabulario sin términos nuevos.
- CHECKPOINTS C1, C2, C3, C4, C5, C6 y C7 sin hallazgos; C4 bis con el hallazgo 2; C8 no
  se aplica todavía (sin resumen mientras haya cambios pedidos).

## Review — 2026-11-02 (segunda)

**Veredicto:** APPROVED
Comprobado: requirements R1–R15 ↔ tests, arquitectura, convenciones, verificación,
CHECKPOINTS C1-C8. Checks: 13 de 13 en verde (`./init.sh --checks 38` → exit 0; el 10
acaba en `Entorno listo`; los filtros de los checks 2 y 5, lanzados a mano: `Tests 1 passed | 9 skipped`).
Hallazgo 1: `statusBadge` da `neutral` a `Active` y `Matured`, el test exige `text-ink-body`
y ningún color en la etiqueta, y `design.md §4` y la guía de uso dicen lo mismo que la hoja.
Hallazgo 2: `git diff docs/roadmap.md` corrige las tres líneas de «sin usar» y añade el cabo 45 como deber del humano.
Sin hallazgos. La prueba que pone los tonos antiguos y ve fallar el test la hizo el implementer; yo no la he repetido.
Resumen de cierre: `progress/summaries/deposit-earnings.md`.
