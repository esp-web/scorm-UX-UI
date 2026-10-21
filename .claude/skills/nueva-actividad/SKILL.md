---
name: nueva-actividad
description: Crea o refina una actividad SCORM del catálogo ACTIVIDADES-SCORM.md delegando en el subagente creador-scorm. Uso «/nueva-actividad 03» o «/nueva-actividad 07 refinar: menos preguntas y más tiempo».
---

# Nueva actividad SCORM

Argumentos: número de la actividad (columna «#» de `ACTIVIDADES-SCORM.md`) y, opcionalmente, indicaciones de refinamiento.

1. Lee la fila de esa actividad en `ACTIVIDADES-SCORM.md`. Si no existe, dilo y para.
2. Elige la carpeta: `scorm/actividades/<NN>-<nombre-en-minusculas-con-guiones>` (si ya existe, es un refinamiento).
3. Lanza el subagente `creador-scorm` con un encargo que incluya:
   - número, título, bloque, interacción, tiempo y preguntas de la tabla;
   - la carpeta de destino;
   - si es refinamiento, las indicaciones del docente y la instrucción de leer antes `DECISIONES.md`.
4. **No lances dos `creador-scorm` a la vez**: pueden modificar `scorm/core/` y pisarse.
5. Cuando termine, comprueba tú:
   - `python3 scorm/build.py <carpeta>`;
   - `node scorm/pruebas/prueba-humo.js <carpeta>`.
6. Resume al docente en pocas líneas: qué hay, cómo probarlo (`scorm/dist/index.html` o la orden del servidor local) y las decisiones discutibles de `DECISIONES.md`.
