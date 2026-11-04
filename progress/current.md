# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** ninguna. F40 `investments-gains` cerrada el 2026-11-04. Al cerrarla se vaciaron los `checks` de F38 y F39 (comprobaban la tarjeta Deposits, que la F40 borra; lo decía la hoja aprobada): fallaban 11 de 13 y 4 de 7.
- **Nivel de consumo:** medio (todos los subagentes en `opus`).
- **Lote:** A (único). Plan: T1 formato de % y de importe con signo en `shared/money.ts` → T2-T3 tipos y service de `GET /api/investments/gains` → T4 `gains.ts` → T5 store → T6-T7 componentes → T8 vista → T9 borrar lo de la tarjeta `Deposits` → T10 recarga tras importar → T11 E2E → T12 documentos → T13 verificación.
- **Estado del lote A (2026-11-04):** T1-T13 hechas (el leader amplió el lote con `AppShell.spec.ts`); `./init.sh` y `./init.sh --checks 40` en verde. Pendiente del reviewer.

Lo que sigue vivo está en `docs/roadmap.md` (tabla «Cabos sueltos con dueño») y, para las
ideas de mejora de la aplicación, en `../docs/ideas-de-mejora.md`.

## Correcciones del humano

## Cambios pendientes en proyecto hermano `gastos-backend`

- 2026-11-03 · para la feature 40 `investments-gains`: una lectura de solo `GET` con lo acumulado de cada producto de inversión (invertido, valor actual, ganancia en € y %, fecha del dato, huecos con motivo) y el total con su fórmula, más su sección en `api-contract.md`. Encargo `progress/backend-investments-gains.md` **entregado por el humano al leader del backend el 2026-11-03**. ✅ Hecho en el backend (feature 67, `GET /api/investments/gains`, 2026-11-04); se relanza el spec de la F40. Aplicar en el harness del backend, en una sesión dedicada.
