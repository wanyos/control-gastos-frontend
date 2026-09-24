# Tasks — Feature 18: rule-match-preview

> Orden de ejecución. El `implementer` marca `[x]` al completar cada una; el
> `reviewer` rechaza si queda alguna `[ ]` sin justificación escrita.
> Cada task dice qué `R<n>` / `C<n>` cubre (`requirements.md`).

## Preparación

- [ ] T0 — Comprobaciones previas, antes de escribir código: (a) medir
      `--warning on --surface-card` y ver si ya tiene línea `contrast:` en
      `src/assets/theme-dark.css`; (b) confirmar que `getMovements` acepta
      `type` y `uncategorized` juntos tal y como los arma `buildMovementsQuery`;
      (c) confirmar con `vi.useFakeTimers()` que el patrón de temporizador de
      `ReviewFilterBar.vue:144` se puede reproducir en `RuleDialog`. Cubre: C3.

## El traslado a `shared/` (design §1)

- [ ] T1 — Crear `src/shared/movements.ts` moviendo **tal cual** los tipos y las
      funciones de lectura de `review/types.ts`, `review/service.ts` y el
      `SEARCH_DEBOUNCE_MS` de `review/filters.ts`, según la tabla de design §1.
      Cubre: C2.
- [ ] T2 — Re-exportar lo movido desde `review/{types,service,filters}.ts` con el
      mismo nombre y correr la suite de `review` **sin tocar ni un test**.
      Cubre: C2, C4.

## Lógica pura (`rules.ts`)

- [ ] T3 — Constantes y helpers nuevos: `PREVIEW_SAMPLE_SIZE`, `BROAD_MATCH_LIMIT`,
      `MAX_PREVIEW_TEXT`, `canPreview`, `previewQuery`, `matchCountLine`,
      `matchWarning`, `previewErrorMessage`. Cubre: R1, R2, R3, R5, R6, R10.
- [ ] T4 — `proposeMatchText`: ampliar `BANK_BOILERPLATE`, añadir `GENERIC_WORDS` y
      `MAX_PROPOSAL_WORDS`, y cambiar el criterio de crecimiento (design §7).
      Cubre: R13, R14, R15.
- [ ] T5 — Tests de `rules.spec.ts` para T3 y T4, con la **tabla entera de design §7**
      como casos (los cuatro que cambian y los cuatro que no). Cubre: R13, R14, R15.

## Estado (`store.ts`, `types.ts`)

- [ ] T6 — Tipo `MatchPreview` y estado `preview` + `previewMatches(text, kind, client?)`
      + `clearPreview()`, con el contador `previewToken` que descarta las respuestas
      que ya no son la última. La acción nunca lanza. Cubre: R1, R8, R10.
- [ ] T7 — Tests de store: filtro exacto de la petición, respuesta tardía descartada,
      fallo → `failed`, y **ninguna llamada** cuando `canPreview` es falso.
      Cubre: R1, R2, R8, R10.

## Interfaz

- [ ] T8 — `RuleMatchPreview.vue`: los cuatro estados, hasta 5 ejemplos con fecha,
      concepto e importe, los dos avisos y la nota de «estimate». Cubre: R3, R4, R5, R6.
- [ ] T9 — `RuleDialog.vue`: temporizador de 350 ms sobre el texto, emisión `preview`
      inmediata al abrir, prop `preview` y montaje del bloque bajo el campo de texto.
      El botón de guardar **no cambia de condiciones**. Cubre: R1, R7, R9, R11.
- [ ] T10 — `ReviewView.vue` y `RulesView.vue`: enganchar `@preview` a
      `previewMatches(text, kind)`, pasar `:preview`, y llamar a `clearPreview()` al
      cerrar el diálogo y tras un guardado correcto. Cubre: R11, R12.
- [ ] T11 — Tests de `RuleMatchPreview.spec.ts` y de `RuleDialog.spec.ts` (ráfaga de
      teclas → una sola emisión; emisión al abrir; nada por debajo de 3; guardar sigue
      habilitado con aviso y con carga). Cubre: R1, R4, R5, R6, R7, R9, R11.
- [ ] T12 — Tests de vista: al abrir el diálogo en Review y en Rules sale la consulta,
      y **no sale ninguna petición que no sea `GET /api/movements`** mientras se
      escribe. Cubre: R11, R12, C1.

## Cierre

- [ ] T13 — Escenario nuevo en `e2e/category-rules.spec.ts` con la red de seguridad
      (`page.route('**/api/**', route => route.abort())`) y las rutas concretas
      interceptadas: escribir en el diálogo, ver recuento y ejemplos, y aserción de que
      ningún método distinto de `GET` salió. Los otros cuatro specs, verdes sin
      tocarlos. Cubre: R3, R4, C1, C4.
- [ ] T14 — Repaso de textos (todo en inglés, sin el `message` del backend), colores
      (solo alias semánticos) y `theme-dark.spec.ts` en verde. Cubre: C3.
- [ ] T15 — Grep de cierre: `category-rules/` no importa nada de `review/` ni de
      `import/`; en el camino de la previsualización no hay `POST`, `PATCH` ni
      `DELETE`. Cubre: C1, C2.
- [ ] T16 — `docs/architecture.md`: `shared/movements.ts` en el árbol y la nota de por
      qué se movió (misma frase que la de `shared/categories.ts`). Cubre: C2.
- [ ] T17 — Puerta: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
      `./init.sh` en verde; `progress/implementation/rule-match-preview.md` con la
      trazabilidad `R<n> → test`. Cubre: C5.
- [ ] T18 — **Comprobación con el humano delante**, con el backend real en `:3000` y
      `pnpm dev`. Es de **solo lectura**: ninguna petición de esta feature escribe, así
      que no hace falta foto previa ni vuelta atrás; lo único que se pide es que él
      esté mirando y diga si los números le cuadran.
      1. Abrir el diálogo desde una fila de Review y escribir un texto que él conozca
         (p. ej. `mercadona`): anotar el recuento y los 5 ejemplos.
      2. Contrastar ese número con
         `GET /api/movements?q=<texto>&status=pending_review&uncategorized=true&type=<kind>&pageSize=1`
         hecho a mano: `pagination.total` tiene que ser el mismo.
      3. Probar un texto genérico corto (p. ej. `pago`, `tarjeta`) y comprobar que
         salta el aviso de «demasiados», y uno inventado para ver el de «ninguno».
      4. Abrir en `Rules` una regla existente y comprobar que se ve lo mismo al abrir,
         sin teclear (R11).
      5. Anotar en el informe qué propuso `proposeMatchText` en 5-10 conceptos reales
         suyos, para que él diga cuáles siguen saliendo mal (es la lista de palabras
         del 🔴 4).
      6. Cerrar sin guardar ninguna regla nueva; si guarda alguna, que sea decisión
         suya y se anota.
      Si el backend no está levantado, se anota como pendiente y **no bloquea el
      cierre**. Cubre: C6.
