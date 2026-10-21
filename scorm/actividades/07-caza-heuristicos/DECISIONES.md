# Decisiones · 07 Caza heurísticos

- **Tipo nuevo `cazar`** (no `zonas`): `zonas` ya es un campo de `arrastrar` y como tipo confundiría. El verbo sigue la línea de `arrastrar`, `agrupar`, `deslizar`.
- **Límite de marcas = número de fallos**, dicho en el enunciado y en el contador «Marcadas: n de N». Así marcar todo no compensa: cada señuelo marcado gasta una marca. Con 4 fallos y 4 señuelos, marcar 4 zonas al azar da de media 2 fallos encontrados.
- **Puntuación por fallo**: 0,5 si lo encuentras con un heurístico equivocado; 1 si el heurístico es correcto. Cada marca lleva siempre un heurístico (no existe «marcada sin etiquetar»): elegir la zona y elegir el heurístico es un solo gesto.
- **Algunos fallos admiten dos heurísticos** (`fallo: ["h9", "h2"]`), porque Nielsen se solapa: error técnico en inglés (9 o 2), papelera para «favoritos» (4 o 2), iconos sin texto (6 o 4). Las dos valen el punto entero; Moodle recibe la primera.
- **La lista de zonas revela los candidatos** (fallos y señuelos). Es el precio de que se pueda hacer con teclado y lector de pantalla; la dificultad está en distinguir fallo de señuelo y en el heurístico. Las descripciones dicen lo que se ve, sin juzgar.
- **Las zonas de la imagen no tienen tabulación** (capa `aria-hidden`): con teclado se usa la lista, que lleva al mismo sitio. Evita duplicar 8 paradas de tabulación por pantalla.
- **«Ampliar» va debajo de la imagen**, no encima: en la esquina tapaba zonas (p. ej., «Pagar ahora»).
- **Pulsar fuera de las zonas** avisa «Ahí no hay nada que marcar» y no cuenta como fallo.
- **Peso 3 por pantalla** (3 pantallas = 9 de 14 puntos, 64 % de la nota), con 5 cortas de 1. Siempre 3 pantallas, una de cada grupo (formulario, tienda, app), y siempre un emparejar.
- **Etiquetas con número** («5 · Prevención de errores»), como en la diapositiva 118, para relacionarlas con la imagen del temario.
- **Interfaces ficticias** en SVG generadas con un script de un solo uso (no está en el repositorio): gimnasio Muévete, club de pádel La Red, tienda Tintero (ficha y pago) y apps Bus Ya y Cocinillas. Sin marcas reales.
- **Las apps se dibujan como dos pantallas seguidas** con una nota cuando el fallo no se ve en una imagen fija (Bus Ya: «al pulsar Confirmar, la pantalla se queda igual»; Cocinillas: «la pantalla 1 se ve justo después de borrar»). En la ficha de Tintero el enunciado dice «acabas de pulsar Añadir al carrito» por lo mismo.
- **El temario solo da los nombres de los 10 heurísticos** (diapositiva 118), sin definirlos. Las explicaciones los interpretan a partir del nombre y los relacionan con la diapositiva 117 («dar respuesta inmediata», «dar el control», «evitar errores», «no memorizar») y con los rasgos (consistencia, persistencia, eficiencia). El docente debería revisar si quiere añadir las definiciones al temario.
- **s06 (flexibilidad)** cita en la explicación las diapositivas 134–135 (eficiencia) pero su campo `diapositiva` es la 118; no copio 134–135.
- **s12 y s13 (clasificar)** separan heurísticos que se suelen confundir (5 frente a 9, 6 frente a 7). La frontera 6/7 es interpretación (ver punto anterior).
- **Tiempo**: 40 min (unos 9 min por pantalla y 1–2 min por pregunta corta). Hay mucho texto en la lista de zonas; para dislexia, ver «Tiempo ampliado» en el README.
- **Móvil**: la imagen se ve pequeña; se trabaja con la lista y «Ampliar». La bandeja de 10 heurísticos ocupa casi toda la pantalla, pero se desplaza por dentro y tiene «Cancelar».
- **Diapositivas no citadas**: 111–115, 119–120, 122–125, 127–141 (las trata la actividad 08 o no tienen contenido evaluable aquí).
