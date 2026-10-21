# Actividades SCORM · UT2 UX/UI, usabilidad y accesibilidad

Actividades autocorregibles para Moodle Centros (Junta de Andalucía) de la asignatura Diseño y desarrollo web, 3º EAS Diseño Gráfico. El docente responsable usa este repositorio para generar los paquetes .zip que sube a Moodle.

## Estructura

- `temario/UT2-UX-UI-usabilidad-accesibilidad.md`: el temario completo; `temario/imagenes/` (originales) y `temario/diapositivas/` (diapositivas en HD). **Única fuente de contenido.**
- `ACTIVIDADES-SCORM.md`: catálogo de actividades con su estado. Actualízalo al terminar una.
- `scorm/core/`: motor común (`motor.js`, `scorm12.js`, `estilos.css`, `index.html`, `fonts/`) y `SISTEMA-DISENO.md`.
- `scorm/actividades/<NN-nombre>/`: `actividad.json`, `img/` y `enunciado-moodle.md`. Las actividades **no llevan CSS ni JS propios**.
- `scorm/build.py`: valida y empaqueta en `scorm/dist/` (+ `dist/index.html` para probar en local).
- `scorm/pruebas/`: `moodle-simulado.html` y `prueba-humo.js`.

## Reglas fijas (decididas por el docente)

- SCORM 1.2. Un SCORM independiente por actividad.
- Un solo intento; nota 0–100; se aprueba con 50; los aciertos parciales suman y los fallos no restan.
- Feedback y nota solo al final. En cada pregunta: bien/mal, explicación y diapositiva del temario; la solución solo en las falladas.
- Banco de preguntas al azar, al menos el doble de las que salen en un intento, para poder reutilizarlo.
- Límite de tiempo dentro del paquete; sigue corriendo al cerrar y volver; si se agota, se entrega lo hecho.
- Ordenador y móvil. Accesibilidad AA, pensando en alumnado con dislexia: frases cortas, sin dobles negaciones, sin depender solo del color, todo operable con teclado.
- **Nunca uses nombres reales del alumnado.** En los casos, nombres inventados.
- Cada actividad lleva un `enunciado-moodle.md` para el alumnado.
- El diseño visual sigue `scorm/core/SISTEMA-DISENO.md`. Todo cambio visual va en `core/` con tokens: nada de colores ni medidas escritos a mano en los componentes.

## Comandos

```bash
python3 scorm/build.py [carpeta]                      # valida, comprueba contraste y empaqueta
node scorm/pruebas/prueba-humo.js <carpeta>           # escritorio y móvil, todo bien / todo mal; capturas en scorm/pruebas/capturas/
python3 -m http.server 8000 --directory scorm         # luego http://localhost:8000/dist/
```

Si `scorm/pruebas/node_modules` no existe: `npm install --prefix scorm/pruebas`.

## Antes de dar una actividad por terminada

1. `build.py` sin errores.
2. `prueba-humo.js` de la actividad nueva **y de todas las anteriores** (si has tocado `core/`), sin fallos.
3. Revisa las capturas en escritorio y móvil.
4. Actualiza `ACTIVIDADES-SCORM.md`, el README de `scorm/` y `SISTEMA-DISENO.md` (si has añadido componentes).
