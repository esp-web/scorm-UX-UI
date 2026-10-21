# Actividades SCORM – UT2 UX/UI, usabilidad y accesibilidad

Paquetes SCORM 1.2 autocorregibles para Moodle Centros.

## Archivos para subir a Moodle

Están en `dist/`, uno por actividad:

| Archivo | Actividad | Tiempo | Preguntas |
|---|---|---|---|
| `dist/00-experiencia-usuario.zip` | ¿Qué es la experiencia de usuario? | 15 min | 10 de un banco de 28 |
| `dist/01-que-patron-es.zip` | ¿Qué patrón es? (borrador) | 20 min | 12 de un banco de 26 |
| `dist/02-swipe-patrones.zip` | Swipe de patrones (borrador) | 15 min | 5 de un banco de 13 (siempre 3 pilas de 5 situaciones + 2 cortas; 15 situaciones de 35) |
| `dist/03-primer-dia-agencia.zip` | Primer día en la agencia (borrador) | 20 min | 12 encargos de un banco de 25 |
| `dist/04-card-sorting.zip` | Card sorting (borrador) | 25 min | 4 de un banco de 10 (siempre 1 card sorting de 24 tarjetas + 3 cortas) |
| `dist/05-tree-test.zip` | Tree test (borrador) | 25 min | 10 de un banco de 24 (siempre 8 tareas de tree test de 17 + 2 cortas de 7) |
| `dist/06-que-estructura-es.zip` | ¿Qué estructura es? (borrador) | 20 min | 10 de un banco de 22 |
| `dist/07-caza-heuristicos.zip` | Caza heurísticos (borrador) | 40 min | 8 de un banco de 21 (siempre 3 pantallas con 4 fallos cada una + 5 cortas) |
| `dist/08-arregla-vitroceramica.zip` | Arregla la vitrocerámica (borrador) | 10 min | 8 de un banco de 18 (siempre 3 paneles) |
| `dist/09-ponte-en-sus-zapatos.zip` | Ponte en sus zapatos (borrador) | 30 min | 8 de un banco de 19 (siempre 4 simulaciones de 8, una de cada clase + 4 cortas de 11) |
| `dist/10-auditor-wcag.zip` | Auditor WCAG (borrador) | 25 min | 12 de un banco de 29 |
| `dist/11-reto-contraste.zip` | Reto de contraste (borrador) | 10 min | 8 de un banco de 19 (siempre 4 ajustes de contraste de 8 + 4 cortas de 11) |

## Enunciado para el alumnado

Cada actividad tiene un `enunciado-moodle.md` en su carpeta de `actividades/`. Pega su texto en la **Descripción** de la actividad en Moodle y marca *Muestra la descripción en la página del curso* si quieres que se vea sin entrar.

## Configuración recomendada en Moodle

*Añadir una actividad o un recurso → Paquete SCORM*, subir el .zip y ajustar:

- **Apariencia**
  - Mostrar: *Ventana actual*.
  - Mostrar la estructura del curso en la página de entrada: *No*.
  - Mostrar estructura del curso en el reproductor: *Oculto*.
  - Mostrar navegación: *No*.
- **Calificación**
  - Método de calificación: *Calificación más alta*.
  - Calificación máxima: *100*.
- **Gestión de intentos**
  - Número de intentos: *1*.
  - Forzar nuevo intento: *No*.
  - Bloquear después del último intento: *No* (así el alumnado puede volver a ver su feedback; el paquete no deja repetir).
- **Configuración de compatibilidad**
  - Forzar completado: *No*.
  - Continuación automática: *No*.
- **Finalización de actividad**: *El estudiante debe recibir una calificación* o *Requiere estado aprobado* (aprobado = 50).

## Cómo funciona

- Cada intento elige preguntas al azar de un banco más grande y baraja las opciones.
- El cronómetro empieza al pulsar «Empezar» y sigue corriendo aunque se cierre la ventana. Si se agota, se entrega lo respondido.
- El progreso se guarda en Moodle y, al volver, el alumno o alumna continúa donde lo dejó.
- La nota (0–100) se envía al libro de calificaciones. Los aciertos parciales suman y los fallos no restan.
- En *Informes* de la actividad verás cada respuesta (interacciones): respuesta dada, respuesta correcta y resultado.
- Accesibilidad: tipografía Atkinson Hyperlegible, tamaño de texto ajustable, temas color/oscuro/alto contraste, lectura en voz alta, uso completo con teclado.

## Tiempo ampliado (p. ej., dislexia)

Un SCORM no puede dar más tiempo a una sola persona. Duplica la actividad, cambia `"minutos"` en `actividad.json`, regenera el .zip y restringe el acceso de cada copia por usuario o grupo (*Restricciones de acceso*).

## Probar sin Moodle

Abre `dist/<actividad>/index.html` en el navegador: funciona en modo vista previa (las respuestas se guardan solo en ese navegador; el aviso superior permite reiniciar).

## Modificar o crear actividades

1. Edita `actividades/<carpeta>/actividad.json` (datos, banco de preguntas y descripciones de diapositivas).
   - Tipos de pregunta: `unica`, `multiple`, `vf`, `clasificar`, `arrastrar` (términos sobre un gráfico), `emparejar`, `agrupar` (card sorting: repartir tarjetas en categorías), `deslizar` (pila de tarjetas que se lanzan a izquierda o derecha) `arbol` (tree test: buscar una página en un menú textual), `cazar` (busca los fallos de una imagen y etiquétalos) `contraste` (ajusta la luminosidad de un color hasta cumplir un contraste mínimo) y `simulacion` (hacer una tarea en una mini-web con una limitación simulada y reflexionar).
   - Las preguntas con el mismo `grupo` no salen juntas en un intento.
   - `"garantizar": ["arrastrar", "emparejar"]` asegura que cada intento incluya al menos una pregunta de esos tipos. Repetir un tipo (`["arrastrar", "arrastrar"]`) asegura esa cantidad.
   - `"peso": 4` en una pregunta hace que valga como 4 preguntas (por defecto, 1). Útil para un ejercicio largo como el card sorting.
   - `"etiqueta"` es el texto corto de la etiqueta de la portada (una línea).
   - `"instrucciones": {"clasificar": "…"}` cambia la instrucción de un tipo en toda la actividad; `"instruccion"` dentro de una pregunta la cambia solo en esa.
   - `"imagen"` + `"alt"` en una pregunta `unica`, `vf`, `multiple`, `clasificar` o `emparejar` muestra esa imagen encima de las respuestas (y en el resultado). El `alt` describe la imagen sin dar la respuesta y se lee con «Escuchar».

   Formato de los dos tipos de arrastre:

   ```json
   { "id": "q25", "tipo": "arrastrar", "enunciado": "…",
     "imagen": "img/diagrama.svg",
     "alt": "Descripción del gráfico y de sus zonas numeradas, sin dar la respuesta.",
     "zonas": [ { "id": "z1", "x": 23, "y": 45, "correcta": "t1" } ],
     "terminos": [ { "id": "t1", "texto": "Interfaz (UI)" }, { "id": "t4", "texto": "Distractor" } ],
     "explicacion": "…", "diapositiva": 73 }

   { "id": "q27", "tipo": "emparejar", "enunciado": "…",
     "pares": [ { "id": "p1", "izquierda": "Concepto", "derecha": "Definición" } ],
     "distractores": [ "Respuesta que no empareja con nada" ],
     "explicacion": "…", "diapositiva": 12 }
   ```

   Si las zonas están muy juntas y las etiquetas de los pines se tapan, añade `"pinesSoloNumero": true` a la pregunta: los pines muestran solo el número, como en el móvil (lo colocado se ve en la lista de huecos).

   Formato de `agrupar` (card sorting cerrado): cada categoría admite varias tarjetas; si una tarjeta encaja en dos categorías razonables, se aceptan las dos (la primera es la de referencia para Moodle). Usa ids cortos (`t1`, `c1`): `build.py` comprueba que la respuesta quepa en los 255 caracteres que admite SCORM 1.2. Hasta 10 categorías.

   ```json
   { "id": "q01", "tipo": "agrupar", "peso": 4, "enunciado": "…",
     "categorias": [ { "id": "c1", "texto": "Tarifas" }, { "id": "c2", "texto": "Clases y cursos" } ],
     "tarjetas": [ { "id": "t1", "texto": "Bono de 10 entradas", "categorias": ["c1"] },
                   { "id": "t2", "texto": "Salida a la roca", "categorias": ["c2", "c1"] } ],
     "explicacion": "…", "diapositiva": 89 }
   ```

   Formato de `deslizar` (tarjetas tipo «swipe»): `lado` es `"i"` (izquierda) o `"d"` (derecha); la `explicacion` de cada tarjeta se ve en el resultado. Hacen falta tarjetas en los dos lados. Las tarjetas salen barajadas; cada una suma por separado (usa `peso` para que la pila valga por varias preguntas). `build.py` comprueba que la respuesta quepa en 255 caracteres.

   ```json
   { "id": "q01", "tipo": "deslizar", "peso": 5, "enunciado": "¿Este diseño respeta la exploración segura?",
     "izquierda": "No la respeta", "derecha": "Sí la respeta",
     "tarjetas": [ { "id": "t1", "lado": "d", "texto": "Situación breve…", "explicacion": "Por qué." } ],
     "explicacion": "…", "diapositiva": 29 }
   ```

   Formato de `arbol` (tree test): el árbol del menú va una sola vez en `"arboles"` (nivel de actividad) y cada tarea lo nombra. Ids de nodo de 1 a 3 letras o cifras (`"0"` está reservado para Inicio). `destinos` son las páginas que valen la tarea entera (la primera es la de referencia para Moodle); elegir una página dentro de `ramas` vale la mitad. Sin `ramas`, vale la mitad cualquier página de la sección de primer nivel de un destino. Se registra el camino (cada página visitada, también al volver) y en el resultado se compara con el camino ideal.

   ```json
   "arboles": { "pedalea": { "nombre": "Pedalea · tienda y taller de bicis", "nodos": [
     { "id": "f", "texto": "Ayuda", "hijos": [ { "id": "f2", "texto": "Cambios y devoluciones" } ] },
     { "id": "e", "texto": "Mi cuenta", "hijos": [ { "id": "e1", "texto": "Mis pedidos", "hijos": [ { "id": "e11", "texto": "Seguimiento del envío" } ] } ] } ] } },

   { "id": "t01", "tipo": "arbol", "arbol": "pedalea", "enunciado": "Te ha llegado un casco pequeño y quieres que te den el dinero. ¿Dónde lo buscarías?",
     "destinos": ["f2", "e1"], "ramas": ["f", "e1"], "explicacion": "…", "diapositiva": 96 }
   ```

   Formato de `cazar` (busca los fallos): zonas invisibles sobre la imagen, en porcentaje (`x`, `y` = esquina superior izquierda; `an`, `al` = ancho y alto). Las zonas con `fallo` son los fallos (`fallo` lista las etiquetas que valen; la primera es la de referencia para Moodle); las demás son señuelos sin fallo. Cada zona lleva `texto` (lo que se ve, sin decir si está bien: es lo que lee quien no ve la imagen y aparece en la lista numerada) y `explicacion` (se ve en el resultado). Las etiquetas van en `categorias`, en la pregunta o una sola vez en la actividad. Solo se pueden marcar tantas zonas como fallos hay (dilo en el enunciado). Cada fallo encontrado vale medio punto y con la etiqueta correcta, uno entero; los señuelos no suman. Pon al menos tantos señuelos como fallos. `build.py` comprueba que las zonas quepan en la imagen y que la respuesta quepa en 255 caracteres.

   ```json
   "categorias": [ { "id": "h1", "texto": "1 · Visibilidad del estado del sistema" }, { "id": "h5", "texto": "5 · Prevención de errores" } ],

   { "id": "c01", "tipo": "cazar", "peso": 3, "enunciado": "… Tiene 4 fallos de usabilidad…",
     "imagen": "img/registro.svg", "alt": "Descripción general, sin dar los fallos.",
     "zonas": [ { "id": "z1", "x": 54, "y": 19.6, "an": 42.5, "al": 6.9, "texto": "Los pasos «1 Datos · 2 Pago»…", "explicacion": "Sin fallo…" },
                { "id": "z2", "x": 3.8, "y": 28.5, "an": 92.5, "al": 7.7, "texto": "Recuadro rojo: «Error 422…»", "fallo": ["h9", "h2"], "explicacion": "Fallo…" } ],
     "explicacion": "…", "diapositiva": 118 }
   ```

   Formato de `contraste`: `muestra` es el elemento de la vista previa (`boton`, `parrafo`, `titular` o `campo`); `color` es el texto (o el borde, en `campo`) y `fondo`, el fondo, en `#RRGGBB`; `ajustar` dice qué capa cambia el alumnado (`color` o `fondo`), solo en luminosidad (conserva el tono de marca). `objetivo` es el ratio mínimo (4.5 texto normal, 3 texto grande o bordes); vale entero entre `objetivo` y `objetivo + margen` (`margen` opcional, por defecto 1), la mitad si se pasa y 0 si no llega. En `campo`, `etiqueta` es el rótulo y `tinta` el color del rótulo y del texto escrito (debe cumplir 4,5:1). Estos colores son contenido de la pregunta, no tokens. `build.py` comprueba que los originales no cumplan ya y que haya al menos 2 luminosidades válidas. Explica en el enunciado qué elemento es y su tamaño, y en `instrucciones` los mínimos de la norma si el alumnado debe aplicarlos.

   ```json
   { "id": "q01", "tipo": "contraste", "muestra": "boton", "texto": "Reservar mesa",
     "color": "#FFFFFF", "fondo": "#F28C38", "ajustar": "fondo", "objetivo": 4.5,
     "enunciado": "… botón con texto blanco de 16 px. Oscurece el naranja hasta que cumpla AA.",
     "explicacion": "…", "diapositiva": 163 }
   ```

   Formato de `simulacion`: `limitacion` es `teclado`, `borroso`, `sol` o `daltonismo`; `web` es el nombre que sale en la barra de la mini-web y `confirmacion`, el titular al terminar. `elementos` es la web, en el orden del documento (el de Tab): `titulo`, `texto`, `opciones` (radios; `id` y `opciones` con `id` y `texto`), `casilla` (`id`) y `boton` (`id`; uno con `"fin": true` termina la tarea; los demás muestran su `mensaje`). Opcionales por elemento: `color` y `fondo` (#RRGGBB, contenido), `tam` (`pequeno` o `grande`) y `orden` (posición visual, para webs donde Tab no sigue la pantalla); por opción, `color` (círculo de color) y `error` (mensaje si se elige: p. ej., talla agotada). `"roto": true` en un botón lo hace `div` (no llega el teclado) y `"sinFoco": true` en la pregunta oculta el foco. `meta.valores` dice qué pide la tarea (`"o1": "b"`, varias válidas `["b","d"]`, casilla `true`/`false`); `meta.bloqueo: true` si no se puede completar (la respuesta buena es «No se puede completar»). `solucion` es el texto para quien falla la tarea. `alternativa` (otra forma: `descripcion` textual de la web + `enunciado` y `opciones` con una correcta) y `reflexion` (`enunciado` + `opciones`). Tarea y reflexión valen la mitad cada una; suele llevar `"peso": 2`.

   ```json
   { "id": "s01", "tipo": "simulacion", "peso": 2, "limitacion": "teclado", "web": "Cines Lumbre · Reserva",
     "confirmacion": "Reserva hecha", "enunciado": "Reserva 2 entradas para las 19:30…",
     "elementos": [ { "t": "titulo", "texto": "El faro de papel" },
       { "t": "opciones", "id": "o1", "texto": "Sesión", "opciones": [ { "id": "a", "texto": "17:00" }, { "id": "b", "texto": "19:30" } ] },
       { "t": "boton", "id": "b1", "texto": "Pagar", "fin": true } ],
     "meta": { "valores": { "o1": "b" } }, "solucion": "…",
     "alternativa": { "descripcion": "…", "enunciado": "…", "opciones": [ { "id": "a", "texto": "…", "correcta": true }, { "id": "b", "texto": "…" } ] },
     "reflexion": { "enunciado": "…", "opciones": [ { "id": "a", "texto": "…", "correcta": true }, { "id": "b", "texto": "…" } ] },
     "explicacion": "…", "diapositiva": 164 }
   ```

   `x` e `y` son la posición de cada zona en porcentaje del ancho y alto de la imagen. Los gráficos van en `img/`, mejor en SVG y sin rótulos que den la respuesta.
2. Regenera: `python3 scorm/build.py` (todas) o `python3 scorm/build.py 00-experiencia-usuario`.

El script valida el banco (ids repetidos, respuestas correctas, imágenes que faltan) antes de empaquetar.

## Sistema de diseño

Colores, tipografía, espaciado y componentes comunes están documentados en [core/SISTEMA-DISENO.md](core/SISTEMA-DISENO.md). `build.py` comprueba el contraste de los tres temas (`comprobar_contraste.py`) y no empaqueta si algo no cumple WCAG AA.
