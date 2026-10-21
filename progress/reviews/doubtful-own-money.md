## Review — 2026-10-21

**Veredicto:** APPROVED
Comprobado: requirements ↔ tests, arquitectura, convenciones, verificación,
CHECKPOINTS C1-C8. Checks: 12 de 12 en verde.
Sin hallazgos.
Resumen de cierre: `progress/summaries/doubtful-own-money.md`.

### Con qué comandos y qué salió

- `timeout 900 ./init.sh` → EXIT 0: `Tests 2026 passed (2026)`, `pnpm type-check` OK,
  `E2E smoke verde (chromium)`, `[OK] Entorno listo`. `timeout 900 pnpm build` → EXIT 0.
- `timeout 900 ./init.sh --checks 35` → `Checks: 12 de 12 en verde.`, EXIT 0. Las 20
  llamadas a `vitest -t` de los checks, relanzadas una a una: `1 passed` en las 20. Las
  tres de `playwright -g`: `1 passed` en las tres.
- `timeout 900 ./init.sh --checks <id>`, de 27 a 34: 12/12, 8/8, 11/11, 9/9, 10/10,
  14/14, 11/11, 12/12, todas EXIT 0.
- Que cada check falla si se rompe lo que dice: 23 cambios temporales en el código (uno
  cada vez, con copia y `cmp` al restaurar; `git status` idéntico antes y después). Entre
  ellos: enviar `mine` y `not_mine` cambiados, enviar `mine` en el `Undo` en vez de
  `null`, quitar la espera de `busy`, recargar tras un 400, no exigir `ownership`, no
  conservarlo tras un `PATCH`, contar todos los de después en vez de los nuevos, sacar
  el número con 0, quitar `mine` de lo que se tacha, quitar el ámbar, esconder también
  los dudosos, enviar una respuesta al cargar. Los 23 hacen fallar su test
  (`Failed Tests 1`). En el navegador, cambiar `mine`/`not_mine` y el `null` del `Undo`
  hace fallar los dos tests de `e2e/doubtful-own-money.spec.ts`.
- `ownership` mal formado, pasado por `parseMovementPage`: falta la clave, `status`
  `maybe`, `ownAccountId` `"4"` o `4.5`, `ownAccountName` o `matchedText` número o
  ausente, o un array → `ValidationError` con la ruta del campo en los nueve casos.
- Datos reales, solo `GET` a `localhost:3000`: los 1667 movimientos pasan por
  `parseMovementPage` sin error (68 `own`, 1599 `null`, 0 dudosos, 0 de depósito con
  `ownership`). Con un servidor en el puerto 5199 (parado al acabar) y toda petición
  que no fuera `GET` abortada (0 abortadas, 0 errores en la página): en `Transfers`
  no sale el número del menú, sale la frase de vacío y el orden es dudosos → `Doubtful
  transfers` → `Linked pairs`; en `Movements` de julio y octubre de 2026 las 5 y 2
  líneas `own` de la API salen con `Between your accounts`, tachadas y en gris, y las
  tres cifras coinciden con los `totals` de la API; con la casilla, `Hiding 14` y
  `Hiding 10`, lo mismo que sale de la API.
- Peticiones: el número del menú pide `ownership=doubtful&pageSize=1` una vez al
  cargar la aplicación, no en cada cambio de pantalla (navegando por seis pantallas:
  1 lectura del número y 1 de la lista por cada visita a `Transfers`; nada más en 5 s
  de espera). No hay nada en bucle. Una importación hace 2 lecturas de 200 y 1 del
  número; si `Transfers` ya estaba cargada, 1 más de la lista, que también pone el
  número: esa lectura del número sobra en ese caso, pero es lo que dice design §7.
- `docs/guia-de-uso.md`: las 181 líneas de nota del humano (`--` y `>`) de `HEAD` están
  iguales, carácter a carácter y en el mismo orden; las 5 que se añaden son el aviso
  `> El 2026-10-21 no había ningún movimiento dudoso…`, del agente. La línea de encima
  de cada nota `--` es la misma que en `HEAD`. Las 13 líneas quitadas son texto de
  agentes.
- Datos de prueba: solo nombres inventados (`Banco Ficticio Norte`, `Cartera inventada`,
  `Titular Inventado`) e IBAN `ES0000…`. Ningún test nuevo usa `localhost:3000`, y los
  14 archivos de `e2e/` abortan todo `/api` que no contestan.

### Comprobado sin hallazgos

Requirements R1-R16 ↔ tests (cada uno con al menos uno), 16/16 tasks `[x]`, hoja de
decisiones (6 en 🔴 con su alternativa; 16 requirements con la razón dicha en ⚙️ 4),
procedencia de los 16, checks ↔ tabla 🧪 (las 7 filas tienen su check; los checks 11
y 12 cubren ⚙️ 1 y R2, y son los mismos que había en el commit de aprobación
`84e3fbd`), arquitectura y convenciones, documentos que la feature vuelve falsos
(`docs/architecture.md` y `docs/guia-de-uso.md` al día), vocabulario, lecciones
activas 1-3 (no se repiten), CHECKPOINTS C1-C8.
