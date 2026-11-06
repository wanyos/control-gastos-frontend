# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** ninguna. F40 `investments-gains` cerrada el 2026-11-04. Al cerrarla se vaciaron los `checks` de F38 y F39 (comprobaban la tarjeta Deposits, que la F40 borra; lo decía la hoja aprobada): fallaban 11 de 13 y 4 de 7.
- **Nivel de consumo:** medio (todos los subagentes en `opus`).

Lo que sigue vivo está en `docs/roadmap.md` (tabla «Cabos sueltos con dueño») y, para las
ideas de mejora de la aplicación, en `../docs/ideas-de-mejora.md`.

## Correcciones del humano

## Cambios pendientes en proyecto hermano `gastos-backend`

- 2026-11-05 · cabo 37 (b): un filtro de `GET /api/movements` que esconda lo marcado y lo emparejado salvo los movimientos de depósito que suman. Encargo `progress/backend-hide-not-counted.md`, para que el humano se lo pase al leader del backend. Aplicar en su harness, en una sesión dedicada.
