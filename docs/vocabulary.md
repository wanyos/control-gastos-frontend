# Vocabulario aprobado

> **Qué es este archivo.** La lista de términos que el humano ha aprobado para
> nombrar acciones, mecanismos y conceptos de este proyecto. Los del propio
> harness (`checks`, `/lessons`…) no van aquí: están en `CLAUDE.md`
> §Vocabulario y llegan con cada update.
>
> **Si una palabra no está aquí ni en `CLAUDE.md` §Vocabulario, no está
> aprobada** y no se usa: se describe la cosa literalmente (qué archivo, qué
> hace, cuándo se ejecuta).
>
> La regla que obliga a esto está en [`../CLAUDE.md`](../CLAUDE.md) §Vocabulario.

## Cómo se añade un término

1. El agente **propone**: la palabra, qué abarca, qué **no** abarca, y por qué
   hace falta un nombre corto en vez de la descripción entera.
2. El humano **aprueba, cambia o rechaza**.
3. Solo si aprueba, el término se apunta aquí con su definición y la fecha.

No se da por aprobado por silencio, ni porque el humano no lo haya corregido, ni
porque ya aparezca escrito en otro documento del repositorio.

**Un término aprobado significa una sola cosa.** Si se acaba usando para dos
mecanismos distintos, deja de servir: eso es exactamente lo que originó esta
regla. Al proponer, di también qué **no** abarca.

## Términos aprobados

| Término | Qué significa exactamente | Qué NO abarca | Aprobado el |
|---|---|---|---|
| idea de mejora | Algo que la aplicación no hace hoy y que estaría mejor si lo hiciera, o si lo hiciera de otra forma. Incluye mejoras, refactors y cambios de estructura de la aplicación (frontend o backend). Se apunta en `../docs/ideas-de-mejora.md`, a nivel workspace | Algo que ya existe y falla o hay que revisar (eso es un cabo suelto). Las mejoras del harness y las correcciones del humano a los agentes (eso son lecciones, `docs/lessons.md`) | 2026-10-10 |

## Propuestos, esperando respuesta

_Ninguno todavía._

| Término propuesto | Qué abarcaría | Qué NO abarcaría | Propuesto el |
|---|---|---|---|

## Usados sin aprobar antes de que existiera esta regla

Solo en proyectos que ya estaban en marcha al adoptar la regla. **No se usan
más** hasta que el humano decida; se listan para que pueda revisarlos cuando
quiera.

| Palabra | Con qué se usó | Dónde quedó escrita |
|---|---|---|

> ⚠️ Al rellenar esta tabla, marca aparte las palabras que hayan llegado al
> **código** —nombres de columnas, de funciones, de migraciones, del contrato de
> API—. Ésas no se corrigen editando un documento y no se tocan sin que el humano
> lo decida a propósito.
