## Review — 2026-10-17

**Veredicto:** APPROVED
Comprobado: requirements R1–R17 ↔ tests, arquitectura, convenciones, verificación,
CHECKPOINTS C1–C8 (C4 bis y C6 incluidos). Checks: 14 de 14 en verde.
Sin hallazgos.
Resumen de cierre: `progress/summaries/monthly-cost.md`.

### Con qué se comprobó (comando → resultado)

- `timeout 900 ./init.sh` → exit 0: 114 archivos de test y 1915 tests en verde; `tsc`,
  oxlint, prettier, `vue-tsc --build` y el E2E de chromium en verde.
- `timeout 900 ./init.sh --checks 32` → `Checks: 14 de 14 en verde`, exit 0. Cada uno
  relanzado a mano: los 14 ejecutan exactamente 1 test (`1 passed | N skipped`); ninguno
  pasa sin ejecutar nada. En una copia del código en una carpeta temporal (antes, la
  copia sin tocar pasó sus 50 tests), un cambio por check que rompe la frase de ese check:
  los 14 pasan a rojo (`1 failed`). La copia está borrada.
- Features 27 a 31: `./init.sh --checks` de cada una → 12/12, 8/8, 11/11, 9/9, 10/10,
  todas con exit 0.
- `timeout 900 pnpm exec playwright test e2e/monthly-cost.spec.ts --project=chromium` →
  1 passed.
- Datos reales, solo `GET`: `GET http://localhost:3000/api/recurring-expenses` → 200.
  Sumado en céntimos: recibos 1017,57 + personas 1332,04 + variable 526,18 = 2875,79 =
  `monthlyTotal`. Pantalla abierta en un servidor propio en el puerto 5180, parado al
  acabar (el 5173 del humano no se tocó y sigue respondiendo). Lo que se vio coincide con
  la API: cifra `2.875,79 €`, periodo «October 2025 to September 2026», «8 of 15 bills
  went up…», subtotales `1.017,57 €` / `1.332,04 €` / `526,18 €`. Los 15 recibos salen en
  el orden de la API (de más caro a más barato al mes), y los 2 que tienen 0,00 € están
  dentro del desplegable cerrado («2 bills with no charges between October 2025 and
  September 2026»), que se abre con un clic. Salen las 7 periodicidades con su texto. En
  `Twice a month` pone «a month», y es correcto: comprobé que `usualAmount` es la mediana
  del total de cada mes, como dice el contrato. En personas salen 99 cargos y en el gasto
  variable 8 filas. Al salir de la pantalla y volver, aparece la frase de carga sin
  ninguna cifra antigua. Peticiones que no son `GET`: 0. Errores en la consola: 0. El
  menú tiene las 8 entradas en orden.
- Contraste (WCAG) de todos los textos de la pantalla nueva: el mínimo es 6,96:1, en la
  etiqueta roja `Up …` (11 px). Todos los demás están entre 9,5:1 y 18:1.
- `docs/guia-de-uso.md`: comparé con `HEAD` todas las líneas `--` y las de los bloques
  «Mis notas de esta prueba». Son idénticas byte a byte; lo único añadido es el bloque
  vacío nuevo. La sección 2b va después del `---` que sigue a las notas de la sección 2,
  así que no queda encima de ningún `-- ok`. Solo se quitan 4 líneas, y ninguna es del
  humano.
- Informe del implementer: completo y legible (Lote A y Lote B). No queda ninguna comilla
  invertida suelta y los bloques de código están cerrados (10 marcas, 5 pares).

### Comprobado sin hallazgos
La validación de `service.ts` coincide campo a campo con el contrato: lo que no se usa no
se lee, y una respuesta mal formada o que no cuadra da `ValidationError` y el mensaje de
error. La trazabilidad R1–R17 está completa y las tareas T1–T12 están en `[x]`. Los checks
coinciden con la tabla 🧪 de `decisions.md`. Los 17 requisitos, dos por encima del tope,
llevan la razón dicha. Revisado también: arquitectura, convenciones, sin `console`/TODO.
Los tests y los datos de prueba no tienen nombres de personas, comercios reales ni números
de cuenta, y ningún test llama a `localhost:3000`. Ningún documento ha quedado falso
(`git grep`). Navegación y features 27–31 sin retrocesos.
