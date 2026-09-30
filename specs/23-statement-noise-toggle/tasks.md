# Tasks — Feature 23: statement-noise-toggle

> Orden de ejecución. El `implementer` marca `[x]` al completar cada una; el
> `reviewer` rechaza si queda alguna `[ ]` sin justificación escrita.
> Cada task dice qué `R<n>` / `C<n>` cubre (`requirements.md`).
> **Esta feature es de solo lectura: ninguna task escribe en el backend.**

## Preparación

- [x] T0 — Comprobaciones previas: (a) que `buildMovementsQuery` admite parámetros
      nuevos sin romper el orden esperado por los tests de `review`; (b) que el icono
      `Info` de `@lucide/vue` ya se usa en el proyecto (si no, se elige uno del
      conjunto ya importado: **sin dependencias nuevas**); (c) que el par de color de
      la nota informativa tiene su línea `contrast:` en `src/assets/theme-dark.css`.
      Cubre: C6.

## Los dos parámetros entran por la frontera

- [x] T1 — `src/shared/movements.ts`: añadir `MovementScope = 'only' | 'none'`, los
      campos `transfer?` y `excluded?` a `MovementQuery`, y sus dos líneas en
      `buildMovementsQuery`. Aditivo: nada de `features/review` cambia. Cubre: R2, C2.
- [x] T2 — Test en `src/shared/__tests__/movements.spec.ts`: la querystring lleva
      `excluded=none&transfer=none` cuando se piden, y **no lleva las claves** cuando
      no. Cubre: R1, R2.

## El interruptor como estado: filtros y URL

- [x] T3 — `src/features/statement/filters.ts`: 4º parámetro `hideNoise` en
      `monthQuery`; `hiddenCountQuery(month, filters)` (mismos filtros, sin esconder,
      `pageSize: 1`); `hideNoise` en `toRouteQuery` (`hide=true` / clave ausente) y en
      el retorno de `fromRouteQuery` (cualquier valor distinto de `'true'` → apagado).
      Cubre: R2, R4, R5, R7, C5.
- [x] T4 — `filters.ts`: `hiddenCountLine(hidden)` (`Hiding 1 movement` /
      `Hiding 34 movements`) y `nothingLeftLine(month, hasFilters)`, que nombra las
      dos causas posibles. Cubre: R7, R12.
- [x] T5 — Tests en `src/features/statement/__tests__/filters.spec.ts`: ida y vuelta
      de `hide` por la URL, `hide=1` y `hide=yes` leídos como apagado, los filtros
      intactos al encender, `monthQuery` con y sin interruptor, y `hiddenCountQuery`
      sin `excluded`/`transfer` y con `pageSize: 1`. Cubre: R2, R4, R5, R7.

## El store

- [x] T6 — `store.ts`: refs `hideNoise` y `hiddenCount` (`number | null`); `show()`
      acepta el interruptor, lo guarda y lo pasa a `monthQuery`; `loadMore()` y
      `refreshQuietly()` lo arrastran. Cubre: R1, R2, R3, R6.
- [x] T7 — `store.ts`: `loadHiddenCount()` tras una carga con éxito y solo con el
      interruptor encendido; guarda la resta de los dos `pagination.total`; comparte
      el guardián `loadRun`; un fallo deja `hiddenCount` en `null` y no toca `error`.
      Cubre: R7, R9.
- [x] T8 — `store.ts`: `adoptUpdated()` retira la fila cuando el interruptor está
      encendido y el movimiento devuelto trae `excludedFromTotals: true` o
      `transferId` no nulo (design §7). Cubre: R13.
- [x] T9 — Tests en `__tests__/store.spec.ts`: (a) apagado no se piden los parámetros
      ni la petición de recuento; (b) encendido se piden los dos y la petición extra;
      (c) `hiddenCount` es la resta; (d) la de recuento falla y la pantalla queda
      intacta; (e) cambiar el interruptor vacía `selectedIds` y conserva
      `isSelecting`; (f) marcar con el interruptor puesto retira la fila y deja el
      `Undo`. Cubre: R1, R2, R7, R9, R11, R13.
- [x] T10 — Test en `__tests__/store.spec.ts`: con el interruptor encendido, `totals`
      se pinta tal cual viene de la respuesta y **ninguna** cifra se recalcula; y
      **ninguna** petición de esta feature usa un método distinto de `GET`.
      Cubre: R6, C1, C3.

## La pantalla

- [x] T11 — `components/NoiseSwitch.vue` (nuevo): casilla `Hide what does not count`
      (reutilizando `BaseCheckbox`) y, a su lado, la línea `Hiding N movements` cuando
      hay número. Tonto: no guarda estado, emite `change`. Cubre: R7, R8.
- [x] T12 — `views/StatementView.vue`: leer `hideNoise` en `syncFromRoute`, pintar
      `NoiseSwitch` entre la barra de filtros y las cifras, y `router.replace` al
      cambiarlo conservando mes y filtros. Cubre: R1, R3, R4, R5, R10.
- [x] T13 — `components/StatementList.vue` + vista: tercer estado de vacío
      (`'nothingLeft'`) con el botón `Show everything`, que apaga el interruptor y
      deja los filtros donde estaban. Cubre: R12, C5.
- [x] T14 — Tests en `__tests__/NoiseSwitch.spec.ts` y `__tests__/StatementView.spec.ts`:
      (a) al entrar sin `hide` el interruptor está apagado y se ve todo; (b) encenderlo
      escribe `hide=true` sin perder `month`, `account`, `category`, `uncategorized` ni
      `q`; (c) el número aparece solo encendido y nunca hay un importe de lo escondido;
      (d) el vacío de R12 con su botón; (e) `Clear filters` **no** apaga el interruptor.
      Cubre: R1, R4, R8, R10, R12, C5.

## La nota

- [x] T15 — `components/MonthTotals.vue`: sustituir `FIGURES_NOTE` por el texto fijo
      exacto de `design.md` §8 —**sin ninguna cifra**—, cambiar el envoltorio de aviso
      ámbar a nota informativa (`text-ink-muted`, icono informativo), permanente y sin
      cerrar. Cubre: R14, C6.
- [x] T16 — `service.ts`: `getAmbiguousCount()` sobre `GET /api/transfers/ambiguous`
      (solo `ambiguousCount`, validado en frontera); en el store, `ambiguousGroups` y
      `loadAmbiguous()` con el patrón «una vez por sesión» de `loadAccounts`, fallo
      silencioso incluido. La vista lo pide en `onMounted`. Cubre: R15, C1.
- [x] T17 — `MonthTotals.vue`: `ambiguousNote(n)` como segunda frase del mismo párrafo,
      solo cuando `ambiguousGroups` es un número mayor que 0; singular y plural.
      Cubre: R15.
- [x] T18 — Tests en `__tests__/MonthTotals.spec.ts` y `__tests__/store.spec.ts`: la
      nota se pinta siempre; el texto fijo **no contiene ningún dígito** ni la palabra
      `inflated` ni el nombre de ningún mes; con `ambiguousCount` 0, ausente o tras un
      fallo no sale la segunda frase ni ningún error; con 1 sale en singular y con 3 en
      plural; `GET /api/transfers/ambiguous` se pide **una sola vez** aunque se cambie
      de mes y de filtro; y sigue sin botón de cerrar. Cubre: R14, R15, C1.

## Cierre

- [x] T19 — Repasar la trazabilidad `R<n>` ↔ test en
      `progress/implementation/statement-noise-toggle.md` y dejar verde
      `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y `./init.sh`.
      Cubre: C4, C7.
- [x] T20 — *(NO es del implementer: se hace con el humano delante; el leader la
      ejecuta con él. Queda abierta a propósito.)* **Comprobación con el humano delante, SOLO LECTURA** (C8). Nada de
      `PATCH`, `POST` ni `DELETE`: solo `GET` con `curl` contra
      `http://localhost:3000` y la pantalla al lado. Para **julio de 2026** y para el
      **mes en curso**, y en cada uno con: (1) interruptor apagado; (2) encendido;
      (3) encendido + filtro de cuenta `myinvestor`; (4) encendido + `Uncategorized`;
      (5) encendido + un `q` que solo case con movimientos escondidos (para ver el
      vacío de R12). En cada combinación se comprueba que el número de filas y el
      `Hiding N` cuadran con los `pagination.total` de las dos peticiones y que las
      tres cifras son idénticas a los `totals` que devuelve la API. Se anota el
      resultado en `progress/implementation/statement-noise-toggle.md`. Se añade una
      comprobación más: `curl http://localhost:3000/api/transfers/ambiguous` y comparar
      su `ambiguousCount` con la frase de la nota (o con su ausencia si vale 0).
      Cubre: R2, R6, R7, R10, R12, R15, C1, C8.
