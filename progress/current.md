# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** ninguna. F40 `investments-gains` cerrada el 2026-11-04. Al cerrarla se vaciaron los `checks` de F38 y F39 (comprobaban la tarjeta Deposits, que la F40 borra; lo decía la hoja aprobada): fallaban 11 de 13 y 4 de 7.
- **Cambio en curso (fuera de `feature_list.json`):** parte del frontend del cabo 37 (b): la casilla `Hide what does not count` manda `hideNotCounted=true` en vez de `excluded=none&transfer=none`. Implementado, pendiente de reviewer; informe en `progress/implementations/hide-not-counted-param.md`.
- **Nivel de consumo:** medio (todos los subagentes en `opus`).

Lo que sigue vivo está en `docs/roadmap.md` (tabla «Cabos sueltos con dueño») y, para las
ideas de mejora de la aplicación, en `../docs/ideas-de-mejora.md`.

## Correcciones del humano

## Cambios pendientes en proyecto hermano `gastos-backend`

Ninguno. (El del cabo 37 (b) lo hizo el backend en su feature 68 el 2026-11-06.)
