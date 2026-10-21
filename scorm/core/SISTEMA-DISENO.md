# Sistema de diseño · Actividades SCORM UT2

Sistema compartido por todas las actividades SCORM del curso. Vive en `scorm/core/` y lo copia `build.py` en cada paquete. **Las actividades no tienen CSS propio**: solo aportan contenido (`actividad.json`) e imágenes.

**Versión 2 · «Bento»**. Lenguaje visual tomado de la referencia `ejemplo-ui.jpg`:
- teselas de color plano agrupadas en paneles negros (bento);
- titulares condensados en mayúsculas;
- botones en píldora negra con flecha en círculo;
- etiquetas pequeñas en mayúsculas;
- radios grandes;
- garabatos dibujados a mano.

## Principios

1. **Expresivo por fuera, legible por dentro.** La tipografía condensada (Anton) solo se usa en titulares cortos y cifras. Todo lo que hay que leer con atención (enunciados, opciones, explicaciones) va en Atkinson Hyperlegible, en minúsculas, alineado a la izquierda, con interlineado de 1,6. Pensado también para alumnado con dislexia.
2. **El color identifica; el texto confirma.** Cada tipo de pregunta y cada categoría tiene su color, pero siempre acompañado de su nombre. Correcto, parcial e incorrecto llevan icono y texto además del color.
3. **Solo parece pulsable lo que se puede pulsar.** Las píldoras con borde y las flechas en círculo están reservadas a botones. Las teselas informativas no llevan flechas.
4. **Tocable y operable con teclado.** Objetivos táctiles de 44 px como mínimo (52 px en controles principales; 48 px en móvil). Todo funciona con Tab, flechas, Espacio y Enter. El foco siempre es visible: negro sobre fondos claros, amarillo sobre fondos oscuros.
5. **La persona decide cómo leer.** Tamaño de texto (5 pasos) y tres temas: color, oscuro y alto contraste.

## Tokens

Los tokens están en `estilos.css`, organizados en tres niveles. Los componentes **solo** usan los niveles 2 y 3.

| Nivel | Prefijo | Para qué | Ejemplo |
|---|---|---|---|
| 1. Referencia | `--ref-*` | Valores en bruto: paleta, escalas | `--ref-yellow-300: #F6C956` |
| 2. Semántico | `--color-*`, `--space-*`, `--font-*`, `--radius-*`, `--border-*`, `--size-*` | Qué significa cada valor. **Los temas solo redefinen este nivel** | `--color-selected-bg: var(--ref-yellow-300)` |
| 3. Componente | `--btn-*`, `--tile-*`, `--card-*`, `--option-*`, `--chip-*`, `--map-*`, `--tag-*`, `--panel-*`, `--dialog-*`, `--ficha-*`, `--hueco-*`, `--monton-*`, `--bandeja-*`, `--deslizar-*`, `--arbol-*`, `--cazar-*`, `--contraste-*`, `--sim-*` | Decisiones de un componente | `--map-done-bg: var(--color-action-primary)` |

### Paleta de referencia

| Token | Valor | Origen en la referencia |
|---|---|---|
| `--ref-lavender-300` | `#AAA6F7` | Fondo de página |
| `--ref-yellow-300` | `#F6C956` | Tesela principal «Explore 500+» |
| `--ref-violet-600` | `#5E43E8` | Tesela «Filming» |
| `--ref-red-500` | `#E84F49` | Tesela «Music» |
| `--ref-sky-200` | `#A5D3FC` | Tesela «Art» |
| `--ref-lime-300` | `#C6D675` | Tesela «Writing» |
| `--ref-ink-950` | `#111015` | Paneles, botones, texto |
| `--ref-paper-100` | `#F1F1F4` | Tarjetas interiores |

### Color (nivel semántico)

| Token | Uso | Color | Oscuro | Alto contraste |
|---|---|---|---|---|
| `color-bg-page` | Fondo de página | lavanda | `#111015` | negro |
| `color-bg-surface` | Tarjetas, botón secundario | blanco | `#1E1D25` | negro |
| `color-bg-surface-raised` | Opciones, explicación, grupos | `#F1F1F4` | `#2B2A35` | negro |
| `color-bg-inverse` | Cabecera y paneles bento | `#111015` | `#1E1D25` | negro |
| `color-text-primary` | Texto principal | `#111015` | `#F1F1F4` | blanco |
| `color-text-secondary` | Instrucciones y etiquetas | `#3A3846` | `#C4C2D0` | blanco |
| `color-text-inverse` | Texto sobre fondos inversos | `#F1F1F4` | `#F1F1F4` | blanco |
| `color-action-primary` | Botón principal, preguntas respondidas | `#111015` | `#F1F1F4` | `#FFFF00` |
| `color-text-on-action` | Texto sobre el botón principal | blanco | `#111015` | negro |
| `color-selected-bg` / `-fg` | Opción elegida | amarillo / tinta | amarillo / tinta | `#FFFF00` / negro |
| `color-border-control` | Límite de controles (≥ 3:1) | `#111015` | `#8E8BA0` | blanco |
| `color-border-selected` | Borde de lo elegido y anillo de la pregunta actual | `#111015` | amarillo | `#FFFF00` |
| `color-focus` / `-inverse` | Anillo de foco / foco en la cabecera | tinta / amarillo | amarillo / amarillo | `#FFFF00` |
| `color-feedback-success-bg` | Correcta, aprobado | lima | lima | `#7CFF9B` |
| `color-feedback-error-bg` | Incorrecta, tiempo crítico, suspenso | rojo | rojo | `#FF8A8A` |
| `color-feedback-warning-bg` | Parcial, pendiente, avisos | amarillo | amarillo | `#FFFF00` |
| `color-accent-1…5-bg` / `-fg` | Teselas, etiquetas de tipo, chips | amarillo, violeta (texto blanco), rojo, cielo, lima | igual | negro con borde blanco |

`python3 scorm/comprobar_contraste.py -v` verifica 28 combinaciones en los tres temas: texto ≥ 4,5:1, y controles, foco y progreso ≥ 3:1. `build.py` lo ejecuta antes de empaquetar y **no genera el .zip si algo falla**.

**Regla del violeta.** Es el único acento que lleva texto blanco: con negro solo alcanza 3,1:1.

### Asignación de acentos

| Uso | 1 amarillo | 2 violeta | 3 rojo | 4 cielo | 5 lima |
|---|---|---|---|---|---|
| Teselas de portada | Título | Nº de preguntas | Minutos | Puntos para aprobar (50/100) | Intentos |
| Etiqueta de tipo de pregunta | Verdadero o falso, Desliza | Clasifica, Agrupa | Arrastra al gráfico, Busca en el menú, Caza fallos | Elige una, Ponte en su lugar | Varias correctas, Ajusta el contraste |
| Chips de clasificar y montones de agrupar (por orden de categoría; la 6ª repite el amarillo) | 1ª | 5ª | 4ª | 2ª | 3ª |
| Resultado | — | — | No aprobado | — | Aprobado |

### Tipografía

| Token | Tamaño | Familia | Uso |
|---|---|---|---|
| `font-size-display-xl` | 5 rem (móvil 3,75) | Anton | Nota final |
| `font-size-display-num` | 3,75 rem (móvil 3) | Anton | Cifras de teselas |
| `font-size-display-lg` | 3 rem (móvil 2,25) | Anton | h1 de portada |
| `font-size-display-md` | 2,25 rem (móvil 1,75) | Anton | Título del resultado, cifras del resumen |
| `font-size-display-sm` | 1,75 rem | Anton | h2 de sección, diálogos |
| `font-size-heading-md` | 1,375 rem (móvil 1,25) | Atkinson negrita | Enunciado de pregunta |
| `font-size-heading-sm` | 1,25 rem | Atkinson / Anton | h3, título de cabecera |
| `font-size-body` | 1 rem (16 px) | Atkinson | Texto general y opciones. Se amplía con A+ |
| `font-size-secondary` | 1 rem | Atkinson negrita | Botones y etiquetas de tesela (mayúsculas, espaciado 0,06 em) |
| `font-size-caption` | 0,875 rem | Atkinson negrita | Etiquetas en píldora (mayúsculas) |

La clase `.display` aplica Anton en mayúsculas. **Úsala solo con textos de 8 palabras como máximo.** El texto fuente se escribe en minúsculas normales: las mayúsculas las pone el CSS, así los lectores de pantalla no deletrean.

### Espaciado, forma y tamaño

- **Espacios** (escala de 4 px): `space-gap-xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `2xl` 32 · `3xl` 48 px.
- **Radios**:
  - `radius-inner` 16 px (explicación, imagen);
  - `radius-control` 20 px (opciones, filas);
  - `radius-container` 28 px (tarjetas, teselas, diálogos);
  - `radius-panel` 36 px (panel bento);
  - `radius-pill` (botones, etiquetas, chips, cronómetro).
- **Bordes**: `border-width-thin` 1 px · `control` 2 px · `selected` 3 px.
- **Sombras** (duras, sin desenfoque; color `color-shadow`: negro en color, lavanda en oscuro, blanco en alto contraste):
  - `shadow-hard` `15px 15px 0` (8 px en ≤ 560 px): tarjetas;
  - `shadow-lift` `4px 4px 0`: fichas seleccionadas, al pasar el ratón y mientras se arrastran; teselas de revisión al pasar el ratón;
  - `shadow-sheet` `0 -8px 0`: panel del mapa en móvil.
- **Movimiento**: `duration-fast` 120 ms para fondo, hundimiento al pulsar (`:active`) y aparición de «Guardado»; `duration-swipe` 240 ms para la salida de una tarjeta lanzada (deslizar). Todo se desactiva si el sistema pide reducir el movimiento.
- **Tamaños**:
  - `size-target-min` 44 px · `size-control` 52 px (48 px en móvil) · `size-icon` 34 px (flechas y smiley);
  - `size-marker` 28 px (marcador de opción) · `size-marker-sm` 22 px (marcador de chip) · `size-progress` 14 px;
  - `size-tile-min` 9,5 rem (8 rem en móvil) · `size-nav-bar` 76 px (barra inferior móvil) · `size-content-max` 54 rem.
- **Sobre imágenes**: `color-on-image-bg` / `-fg` (tinta / blanco en todos los temas) para los números de los pines, que deben leerse sobre cualquier gráfico.

## Componentes

| Componente | Clase | Propósito | Variantes | Estados | Accesibilidad |
|---|---|---|---|---|---|
| **Botón** | `.btn` | Ejecutar una acción. **Único componente de botón** del sistema | Variantes: `.btn-principal` (píldora negra; una por pantalla; en la barra inferior móvil pasa a amarillo), `.btn-secundario` (píldora blanca con borde), `.btn-inverso` (sobre fondos oscuros: cabecera), `.btn-enlace`. Tamaños: normal (52 px) y `.btn-sm` (44 px). `.btn-flecha` añade la flecha en círculo | normal, hover (sube 1 px), pulsado (baja 1 px), foco, deshabilitado | `<button>`; la flecha es `aria-hidden`; texto en mayúsculas por CSS |
| **Etiqueta** | `.tag` | Rotular el contexto (curso, progreso, tipo, estado) | `.tag-tinta`, `.tag-borde`, `.tag-tipo` (color de acento, peso normal), `.insignia` (feedback) | — | Siempre en una línea (si no cabe, puntos suspensivos): el texto debe ser corto. La etiqueta de tipo es `aria-hidden` porque la instrucción ya lo dice |
| **Cabecera** | `.cabecera` | Identidad, tiempo y ajustes de lectura | En móvil, una sola fila: smiley · título recortado · cronómetro · botón **Aa** que despliega A−, A+ y tema | — | `Aa` con `aria-expanded`; el panel se cierra con Esc o al pulsar fuera |
| **Panel bento** | `.panel.bento` | Agrupar teselas sobre fondo negro | `.bento-portada`, `.bento-resultado` | — | `<section>` con `aria-labelledby`; las teselas de datos son una lista `<ul>` |
| **Tesela** | `.tile` | Mostrar un dato clave o el titular | `.tile-1…5` (acentos), `.tile-blanco`, `.tile-hero` | — | No es interactiva: sin flechas ni hover. Cifra (`.tile-num`) + rótulo (`.tile-label`) se leen juntos |
| **Tesela de revisión** | `.tesela-rev` | Ver el estado de cada pregunta e ir a ella | por estado: respondida (negro), a medias (amarillo), sin responder (blanco, borde discontinuo) | normal, hover (se eleva), foco | Es un `<button>`: aquí la flecha sí está justificada porque lleva a la pregunta |
| **Garabato** | `.garabato` | Toque de dibujo a mano alrededor de una cifra | — | — | SVG decorativo (`aria-hidden`); hereda el color del texto. Uno por pantalla como máximo |
| **Tarjeta** | `.tarjeta` | Contenido de lectura: instrucciones, pregunta, resultado | `.pregunta`, `.resultado` | Sombra dura `15px 15px 0`, 8 px en móvil | `<section>` o `<article>` con encabezado |
| **Marcador** | `.marcador` | Dibujar el estado de radios y casillas | círculo (radio), cuadrado redondeado (casilla); tamaño normal y de chip | vacío, elegido (relleno tinta con punto o ✓ amarillo) | Decorativo (`aria-hidden`). El input nativo sigue ahí, oculto pero focalizable: teclado y lector de pantalla funcionan igual |
| **Opción** | `.opcion` | Elegir una o varias respuestas | radio (única, verdadero/falso), casilla (múltiple) | normal, hover, pulsada, seleccionada (amarillo + borde de 3 px), foco | `<label>` que envuelve un input nativo. **La selección no cambia el peso de la letra** para que el texto no se mueva |
| **Chips de clasificación** | `.elemento` + `.cat` | Asignar una categoría a cada elemento | color por categoría | sin elegir, elegida (color de acento), foco | Un `<fieldset>` por elemento con `<legend>`; radios nativos (se navega con flechas) |
| **Ficha** | `.ficha` | Término o respuesta que se coloca en un hueco | en el banco, colocada, seleccionada, arrastrando, fantasma (la copia que sigue al puntero) | normal, hover (se eleva), seleccionada (`aria-pressed`, amarillo), arrastrando (semitransparente) | `<button>` con `aria-pressed`. Asa «⠿» que indica que se puede arrastrar |
| **Hueco** | `.hueco` | Destino de una ficha | `.hueco-vacio` (discontinuo), `.hueco-lleno` (ficha + botón ✕ «Quitar») | normal, destino activo (borde continuo cuando hay ficha seleccionada o arrastrándose), encima (amarillo) | El vacío es un `<button>` con `aria-label` («Zona 1: vacío»); quitar tiene su propio botón |
| **Gráfico con zonas** | `.dnd-figura` + `.dnd-pin` | Imagen con zonas numeradas donde soltar términos | interactivo (pines = botones) y estático (en resultados); `.dnd-solo-numero` (pregunta con `pinesSoloNumero`): solo el número también en escritorio, para zonas muy juntas | vacío (discontinuo), lleno (amarillo con el término; en móvil solo el número) | La imagen lleva `alt` que describe las zonas sin dar la respuesta. Los pines y la lista de huecos son dos caminos al mismo destino |
| **Imagen de pregunta** | `.figura-pregunta` | Mostrar un gráfico (p. ej., un mapa del sitio) en preguntas que no son de arrastrar | — | — | `<figure>` con `<img>` y `alt` obligatorio (lo exige `build.py`); el `alt` se añade a «Escuchar». Máx. 40 rem; 32 rem en resultados |
| **Arrastrar y soltar** | `.dnd` | Colocar fichas en huecos (`arrastrar`: sobre un gráfico; `emparejar`: junto a su pareja) | `.dnd-arrastrar` (gráfico a la izquierda y huecos a la derecha; apilado en móvil), `.dnd-emparejar` (filas «concepto · hueco») | — | **Tres formas equivalentes**: arrastrar con ratón o dedo; pulsar ficha y luego hueco; teclado (Tab + Enter; Esc cancela). Cada movimiento se anuncia («"UX" colocado en Zona 1») |
| **Agrupar (card sorting)** | `.agrupar` + `.agrupar-monton` + `.agrupar-bandeja` | Repartir muchas tarjetas (`.ficha`) en categorías; cada categoría (montón) admite varias | montón con cabecera de color por categoría y contador; bandeja de destinos (fondo inverso, pegada abajo; en móvil, sobre la barra de navegación y con los destinos en dos columnas) | montón vacío (discontinuo), destino activo (borde continuo con tarjeta seleccionada o arrastrándose), encima (amarillo); destino actual de la tarjeta con «✓» (`aria-pressed`) | **Tres formas**: arrastrar con ratón (la página se desplaza sola cerca del borde); pulsar tarjeta y luego categoría en la bandeja o en la cabecera del montón; teclado (Enter en una tarjeta lleva el foco a la bandeja; tras colocarla, el foco pasa a la siguiente sin colocar; Esc cancela). En pantallas táctiles, deslizar sobre las tarjetas desplaza la página: se colocan pulsando. Cada movimiento se anuncia con el total del montón |
| **Deslizar (swipe)** | `.deslizar` + `.deslizar-tarjeta` + `.deslizar-botones` + `.deslizar-lista` | Decidir, tarjeta a tarjeta, entre dos opciones (izquierda / derecha) | tarjeta actual sobre una de fondo (pila); botones de lado (`.deslizar-lado`, con flecha; en móvil, flecha encima del texto) y «↩ Deshacer»; lista «Ya decididas» con «Cambiar»; mensaje final `.deslizar-fin` | arrastrando (sigue al puntero y gira; pasado el umbral, borde de 3 px, sello amarillo con el lado y botón de ese lado resaltado `.sobre`), saliendo (`.deslizar-sale`, vuela por su lado), botones deshabilitados al acabar | **Tres formas**: arrastrar la tarjeta con ratón o dedo (deslizar en vertical sigue desplazando la página); los dos botones siempre visibles; flechas ← → con el foco en la tarjeta o en los botones. Tarjeta con `role="group"` y nombre «Situación N de M + texto»; cada decisión se anuncia. Deshacer la última y cambiar cualquiera (exploración segura). Sin tiempo por tarjeta. Con reducir movimiento, ni giro ni vuelo |
| **Árbol (tree test)** | `.arbol` + `.arbol-migas` + `.arbol-lista` + `.arbol-nodo` + `.arbol-elegir` + `.arbol-elegido`; en resultados `.arbol-camino` | Buscar una página en el menú textual de una web ficticia, como el usuario de un tree test | marco con el nombre de la web (`.arbol-web`); migas de pan («¿dónde estoy?», `.arbol-miga` para saltar a un nivel anterior); título de la página actual; lista de apartados (los que tienen más apartados llevan «›»); página sin apartados (`.arbol-hoja`, discontinua); «← Volver a «X»» y «✓ Lo buscaría aquí» (amarillo, no es la acción principal de la pantalla); tras elegir, panel `.arbol-elegido` con la ruta y «↺ Empezar de nuevo». En resultados, camino seguido con «↩» en cada vuelta atrás y camino ideal | apartado normal, hover (se eleva), foco; en Inicio no hay «Volver» ni «Lo buscaría aquí» | **Solo botones y listas nativas, sin gestos**. Migas en `<nav aria-label="Dónde estás">` con `aria-current="page"`; lista con `aria-labelledby` del título; los apartados con hijos dicen «con apartados» (texto oculto). Al entrar en una página, el foco va a su título (que dice cuántos apartados tiene) y se anuncia la ruta; al elegir, el foco va al panel. «Empezar de nuevo» permite cambiar de idea (exploración segura) |
| **Cazar (busca los fallos)** | `.cazar` + `.cazar-figura` + `.cazar-capa` + `.cazar-zona` + `.cazar-lista` + `.cazar-item` + `.cazar-bandeja` (sobre `.agrupar-bandeja`); en resultados `.cazar-r` | Encontrar los fallos de una interfaz dibujada y etiquetar cada uno (p. ej., con el heurístico de Nielsen que incumple) | zonas invisibles sobre la imagen (al pasar el ratón, contorno discontinuo); zona marcada (contorno continuo y número en la esquina), zona elegida (contorno amarillo); lista numerada de zonas con su descripción y la etiqueta puesta («✓ Marcada: …»); contador «Marcadas: n de N» con aviso si se pulsa fuera de las zonas; «Ampliar» fuera de la imagen; bandeja de etiquetas pegada abajo (en el móvil, sin la descripción y en dos columnas). En resultados, fallos con borde continuo y señuelos marcados con borde discontinuo | zona normal, hover, elegida, marcada; ítem de la lista elegido (`aria-pressed`, amarillo) y marcado (borde continuo de 3 px); límite alcanzado (la bandeja lo dice y no ofrece etiquetas) | **La lista es el camino accesible**: botones nativos con «Zona N: descripción»; la capa de zonas sobre la imagen es solo para el puntero (`aria-hidden`), con el `alt` general en la imagen. Enter en una zona lleva el foco a la primera etiqueta; al marcar, vuelve a la zona de la lista; Esc cancela. Cada marca se anuncia con el total («Llevas 2 de 4 marcas») |
| **Contraste** | `.contraste` + `.contraste-muestras` + `.contraste-lienzo` + `.contraste-panel` + `.contraste-rango` + `.contraste-botones`; en resultados, `.contraste-muestras` | Ajustar la luminosidad de un color de interfaz (texto, borde o fondo) hasta que cumpla un contraste mínimo | vista previa del elemento (`.contraste-lienzo-boton`, `-parrafo`, `-titular`, `-campo`) «Original» y «Tu versión», cada una con su ratio debajo; panel con medidor (cifra en Anton, `data-ratio`), código hex y luminosidad, deslizador nativo y botones «− Más oscuro», «+ Más claro» y «↺ Volver al original». **Los colores de la vista previa son contenido de la pregunta** (estilo en línea), no tokens: no cambian con el tema | sin tocar (original), ajustado; botones deshabilitados en los extremos (0 % y 100 %) y «Volver» sin cambios | `<input type="range">` con `<label>` y `aria-valuetext` («38 %, contraste 4,55 a 1»): flechas, Inicio/Fin y RePág/AvPág. Los botones mueven de 1 en 1 (motricidad fina en móvil) y anuncian el nuevo contraste. Cada vista previa es `role="img"` con su descripción (elemento, colores en hex y ratio). El medidor da la cifra con texto, nunca solo con color, y **no dice si cumple**: saber el mínimo es parte de la tarea |
| **Simulación (ponte en su lugar)** | `.sim` + `.sim-limitacion` + `.sim-pantalla` (`data-limitacion`) + `.sim-web` + `.sim-teclas` + `.sim-estado` + `.sim-alternativa` + `.sim-reflexion`; en resultados, `.sim-resumen` | Hacer una tarea en una mini-web ficticia con una limitación simulada y reflexionar sobre ella | limitación `teclado` (el puntero no llega a la web: `pointer-events: none`; teclas en pantalla Mayús+Tab, Tab, ↑, ↓, Espacio, Intro), `borroso` (`--sim-borroso`, desenfoque fijo en px), `sol` (`--sim-sol` + reflejo estático) y `daltonismo` (filtro SVG de deuteranopía). La web «mal hecha» usa `.sim-sin-foco` (sin foco visible), `orden` visual distinto del DOM y botones «rotos» (`div` con clic). **La mini-web es contenido**: fondo blanco fijo (`--sim-web-*`) y colores en línea de la pregunta; no cambia con el tema | sin terminar, terminada (confirmación con los valores elegidos), «No se puede completar», otra forma; «Ver sin filtro» (`aria-pressed`) tras resolver | Controles nativos (`fieldset`/`legend`, radios, casilla, `button`); foco con `:focus` (visible también al mover el foco con las teclas en pantalla). Las teclas en pantalla no roban el foco (`mousedown` cancelado). Mensajes de la web en `role="status"`; aviso si se usa el ratón en «teclado». **Vía alternativa siempre visible**: «Necesito otra forma de hacer esta tarea» muestra una descripción textual de la web y una pregunta equivalente, para quien no pueda hacer la simulación (lector de pantalla, discapacidad motriz o visual). Sin movimiento ni destellos |
| **Barra de navegación** | `.nav-pregunta` | Anterior · n/N · Siguiente | En escritorio, en línea bajo la pregunta; en móvil, **fija abajo** sobre fondo negro | — | `<nav>` con `aria-label`. El botón n/N abre el mapa (`aria-expanded`) |
| **Mapa de preguntas** | `.mapa` en `.mapa-panel` | Saltar a cualquier pregunta | En escritorio siempre visible; en móvil, panel que sube desde la barra | sin responder (blanco ·), a medias (amarillo ◐), respondida (negro ✓), actual (doble anillo) | `aria-label` «Pregunta N, estado»; `aria-current="step"` |
| **Barra de progreso** | `.progreso-barra` | Cuánto llevas respondido | — | se rellena al responder | Decorativa; la etiqueta «Pregunta N de M» da la posición |
| **Guardado** | `.guardado` | Confirmar que la respuesta se ha guardado | — | aparece 2 s tras cada cambio | `role="status"`: el lector de pantalla lo anuncia sin interrumpir |
| **Control segmentado** | `.segmentado` + `.segmento` | Filtrar resultados: «Todas» / «A repasar» | — | activo (negro) | Botones con `aria-pressed` dentro de un grupo con `aria-label` |
| **Línea de respuesta** | `.resp li` | Mostrar cada respuesta dada y si es correcta | ✔ (lima) / ✖ (rojo) **al principio** de la línea | — | Icono decorativo + texto oculto «Correcto:» / «Incorrecto:» para lectores de pantalla |
| **Cronómetro** | `.reloj` | Tiempo restante | — | normal (claro), aviso ≤ 5 min (amarillo), urgente ≤ 1 min (rojo) | Se anuncia a los 10, 5 y 1 minutos (`aria-live`), no cada segundo |
| **Aviso** | `.aviso` | Mensaje del sistema | `.aviso-plegable` (`<details>`: vista previa sin Moodle, plegado por defecto) | — | Fondo amarillo con borde e icono |
| **Diálogo** | `dialog` | Confirmar la entrega; ver una diapositiva | `.dlg-ancho` | abierto | `<dialog>` nativo: atrapa el foco, se cierra con Esc y devuelve el foco |

### Patrones de pantalla

1. **Portada**:
   - panel bento con la tesela amarilla (etiqueta del curso, h1 y objetivo) y 4 teselas de datos (preguntas con garabato, minutos, nota para aprobar, intentos);
   - debajo, las tarjetas «Antes de empezar» y «Ajustes de lectura»;
   - botón **Empezar** al final, para que se lean las condiciones antes.
2. **Pregunta**: «Pregunta N de M» + «✓ Guardado» → barra de lo respondido → tarjeta (etiqueta de tipo, enunciado, instrucción, Escuchar, controles) → barra de navegación (fija abajo en móvil) → mapa.
3. **Revisión**: cuadrícula de teselas numeradas por estado; cada una lleva a su pregunta → **Entregar actividad** (con confirmación).
4. **Resultados**:
   - panel bento con la tesela de nota (lima si aprueba, roja si no) y 3 teselas blancas de resumen;
   - control segmentado «Todas / A repasar»;
   - una tarjeta por pregunta con etiqueta de estado, el gráfico (en las de arrastrar), tu respuesta con ✔/✖ al principio, la correcta si fallaste, la explicación, Escuchar y Ver diapositiva.

## Contenido y tono

- Se habla de **tú**, con frases cortas y una idea por frase.
- Las instrucciones de cada tipo de pregunta las pone el motor (una actividad puede sustituirlas con `instrucciones` o una pregunta con `instruccion` cuando el texto genérico suene forzado):
  - *Elige una respuesta.*
  - *Indica si la afirmación es verdadera o falsa.*
  - *Marca todas las respuestas correctas. Cada opción bien decidida suma.*
  - *Elige una categoría para cada elemento. Cada elemento bien clasificado suma.*
  - *Arrastra cada término a su zona del gráfico. También puedes pulsar un término y después su zona. Cada zona bien rellenada suma.*
  - *Arrastra cada respuesta junto a su pareja. También puedes pulsar una respuesta y después su hueco. Cada pareja bien hecha suma.*
  - *Pulsa una tarjeta y después la categoría donde la buscarías. En el ordenador también puedes arrastrarla. Cada tarjeta bien colocada suma.*
  - *Lanza cada tarjeta a su lado: arrástrala, pulsa uno de los dos botones o usa las flechas ← y →. Puedes deshacer. Cada tarjeta bien decidida suma.*
  - *Pulsa sobre un fallo en la imagen o elige su zona en la lista. Después elige el heurístico que incumple. Solo puedes marcar tantas zonas como fallos hay. Cada fallo encontrado suma medio punto; con el heurístico correcto, el punto entero.*
  - *Mueve el control o usa los botones para cambiar la luminosidad del color (el tono no cambia). Consigue el contraste mínimo que pide el enunciado cambiando lo menos posible: vale entero si quedas entre el mínimo y 1 punto más (por ejemplo, con un mínimo de 2:1, entre 2:1 y 3:1); si te pasas, la mitad.*
  - *Haz la tarea en la web simulada, con la limitación indicada. Si con esa limitación no se puede terminar, pulsa «No se puede completar». Después responde la reflexión. La tarea vale la mitad y la reflexión, la otra mitad. ¿Necesitas hacerla de otra forma? Pulsa «Necesito otra forma de hacer esta tarea».*
  - *Busca en el menú como lo harías en la web: entra en los apartados y vuelve atrás si hace falta. En la página donde lo buscarías, pulsa «Lo buscaría aquí». La página correcta suma entera; la sección correcta, la mitad.*
- **Gráficos para arrastrar**: sin rótulos que den la respuesta; las zonas se numeran. Incluye algún término de más (distractor) para que la última ficha no se coloque por descarte.
- Los rótulos de tesela, etiqueta y botón son de 1 a 3 palabras: «Preguntas», «Para aprobar», «Siguiente».
- **Enunciados**: una pregunta o una situación concreta. Nada de dobles negaciones, y evita «¿cuál NO…?».
- **Explicaciones**: dicen por qué es correcta la respuesta y, si ayuda, por qué no lo son las otras. Siempre llevan la referencia a la diapositiva.
- **Nombres en los casos**: inventados y que no coincidan con los del alumnado.
- Cada actividad lleva un `enunciado-moodle.md` para el alumnado (ver el README).

## Mantenimiento

- **Cualquier cambio visual se hace en `core/`** y se aplica a todas las actividades al regenerarlas con `python3 scorm/build.py`.
- **Antes de añadir un componente**, comprueba que ninguno de los existentes resuelve lo mismo: mismo propósito y mismo comportamiento = mismo componente.
- **Un componente nuevo necesita**:
  - tokens de nivel 3 si tiene decisiones propias;
  - sus estados;
  - teclado y lector de pantalla resueltos;
  - una fila en la tabla de componentes de este documento.
- **Un color nuevo** se añade como `--ref-*`, se asigna en los tres temas y se añade a `PARES` en `comprobar_contraste.py`.
- **Antes de publicar un .zip**: `build.py` sin errores, una prueba en el móvil y otra solo con teclado, en los tres temas.

### Registro de cambios

- **3.8** (21/10/2026): tipo de pregunta `simulacion` (actividad 09) con el componente «Simulación»: mini-web declarada en el JSON con elementos fijos (`titulo`, `texto`, `opciones`, `casilla`, `boton`), construida con `h()` (sin `innerHTML` con datos), bajo una limitación simulada (`teclado`, `borroso`, `sol`, `daltonismo`). La tarea se comprueba por el estado al pulsar el botón final o con «No se puede completar» (webs con `bloqueo`). Tarea y reflexión valen 0,5 cada una; «Necesito otra forma» sustituye la tarea por una pregunta equivalente que vale lo mismo. Respuesta compacta `{t, v, m, a, r}`; a Moodle va como `performance` («tarea.c.b,b,1,refl.a»). Los elementos de la mini-web no se barajan (su orden es el de Tab). `build.py` valida la estructura y la coherencia de `meta` (p. ej., `bloqueo` exige botón final roto). Tokens nuevos `--sim-*` y 5 pares nuevos en `comprobar_contraste.py`. Etiqueta de tipo «Ponte en su lugar» en cielo.
- **3.7** (15/10/2026): tipo de pregunta `contraste` (actividad 11) con el componente «Contraste»: vista previa de un botón, párrafo, titular o campo con los colores de la pregunta (contenido, no tokens), deslizador nativo de luminosidad HSL de una capa (texto/borde o fondo, conservando tono y saturación), botones de ±1 y «Volver al original», y medidor del ratio WCAG con cifras (truncado a 2 decimales; no dice si cumple). Puntuación: 1 entre `objetivo` y `objetivo + margen` (por defecto 1), 0,5 si se pasa (cambia el diseño más de lo necesario), 0 si no llega. Respuesta: la luminosidad (`"38"`). A Moodle va como `performance` («L38 4.55:1»). `build.py` repite el cálculo y exige que los colores originales no cumplan y que haya al menos 2 luminosidades válidas. Tokens nuevos `--contraste-*` (sin colores nuevos). Etiqueta de tipo «Ajusta el contraste» en lima.

- **3.6** (15/10/2026): tipo de pregunta `cazar` (busca los fallos, actividad 07) con el componente «Cazar»: zonas invisibles en % sobre una imagen, con fallo o señuelo, más una lista numerada de zonas como camino de teclado y lector de pantalla; la etiqueta se elige en la bandeja de «Agrupar». Solo se marcan tantas zonas como fallos. Puntuación por fallo: 0,5 encontrado, 1 con la etiqueta correcta; los señuelos no suman. Respuesta: un carácter por zona (`.` o la posición de la etiqueta en base 36). Las etiquetas pueden ir en la actividad (`categorias`). A Moodle va como `matching`. Tokens nuevos `--cazar-*` (sin colores nuevos). Etiqueta de tipo «Caza fallos» en rojo.
- **3.5** (15/10/2026): tipo de pregunta `arbol` (tree test, actividad 05) con el componente «Árbol»: menú textual con migas de pan, «Volver», lista de apartados y «Lo buscaría aquí», solo con botones nativos. El árbol se define una vez por actividad (`arboles`). La respuesta es el camino (ids separados por `.`, máx. 40 pasos, `!` al elegir) y en resultados se compara con el camino ideal. Puntuación 1 / 0,5 (sección correcta) / 0. A Moodle va como `performance`. Tokens nuevos `--arbol-*` (sin colores nuevos). Etiqueta de tipo «Busca en el menú» en rojo.
- **3.4** (15/10/2026): tipo de pregunta `deslizar` (actividad 02) con el componente «Deslizar»: pila de tarjetas que se lanzan a izquierda o derecha con gesto, botones o flechas, con deshacer y cambiar. La respuesta se guarda como una cadena de un carácter por tarjeta decidida (`i`/`d`). Tokens nuevos `--deslizar-*` y `--duration-swipe` (sin colores nuevos). Etiqueta de tipo «Desliza» en amarillo (binaria, como verdadero o falso).
- **3.3** (15/10/2026): tipo de pregunta `agrupar` (card sorting cerrado, actividad 04) con el componente «Agrupar»: montones de categoría que admiten varias tarjetas, bandeja de destinos pegada abajo y tres formas de responder. La respuesta se guarda como una cadena de un carácter por tarjeta. Tokens nuevos `--monton-*` y `--bandeja-*` (sin colores nuevos). El arrastre se comparte entre `arrastrar`, `emparejar` y `agrupar` (`arrastrarFicha`) y gana desplazamiento automático cerca del borde de la ventana. Las preguntas admiten `peso` (por defecto 1) para que un ejercicio largo valga por varias.

- **3.2** (15/10/2026): opción `pinesSoloNumero` en preguntas `arrastrar` (clase `.dnd-solo-numero`): los pines rellenos muestran solo el número también en escritorio, para gráficos con zonas muy juntas (actividad 08).
- **3.1** (14/10/2026): imagen opcional (`imagen` + `alt`) en preguntas que no son de arrastrar, con el componente `.figura-pregunta`. `build.py` valida la imagen y el `alt` en cualquier tipo.
- **3.0** (14/10/2026): mejoras de usabilidad y dos tipos de pregunta nuevos.
  - Tipos `arrastrar` (términos sobre un gráfico con zonas) y `emparejar`, con tres formas de responder: arrastrar, pulsar y teclado.
  - Móvil: cabecera en una fila con botón «Aa» y barra de navegación fija abajo con el mapa en un panel.
  - Marcadores propios de 28 px; la opción elegida ya no se pone en negrita (el texto no se mueve).
  - Indicador «✓ Guardado»; la barra de progreso mide lo respondido y desaparece la etiqueta duplicada «Respondidas».
  - Un único componente de botón con tamaños y variantes (desaparecen `.btn-herr` y el estilo propio de `.btn-leer`).
  - Etiquetas siempre en una línea; revisión en teselas; filtro «Todas / A repasar»; ✔/✖ al principio de cada respuesta.
  - Microinteracciones de 120 ms, precarga de fuentes y aviso de vista previa plegable.
  - Tokens nuevos: `shadow-lift`, `shadow-sheet`, `duration-fast`, `size-marker(-sm)`, `size-nav-bar`, `color-on-image-*` y los de marcador, ficha y hueco. El comprobador de contraste pasa a 29 pares por tema.
- **2.4** (14/10/2026): la etiqueta de tipo de pregunta (`.tag-tipo`) pasa de negrita a peso normal.
- **2.3** (14/10/2026): el texto general pasa de 18 a 16 px por defecto (`font-size-body` → `--ref-font-size-200`). El alumnado puede ampliarlo con A+ hasta 28 px.
- **2.2** (14/10/2026): la sombra de las tarjetas baja a 8 px en pantallas ≤ 560 px. La tesela de nota mínima muestra «50/100 · Puntos para aprobar».
- **2.1** (14/10/2026): las tarjetas (`.tarjeta`) llevan una sombra dura de 15 px (`--shadow-hard`).
- **2.0** (14/10/2026): nuevo lenguaje visual «Bento» a partir de `ejemplo-ui.jpg`.
  - Paleta lavanda, amarillo, violeta, rojo, cielo y lima; tinta y papel.
  - Anton para titulares.
  - Paneles y teselas, botones en píldora con flecha, etiquetas, chips de color por categoría, mapa circular, garabato y smiley en la cabecera.
  - Temas: color (por defecto), oscuro y alto contraste. El tema «claro» crema desaparece: lo sustituye «color».
  - El comprobador de contraste pasa de 20 a 28 pares por tema.
  - Las flechas decorativas de las teselas de la referencia no se han incorporado: aquí serían un affordance falso.
- **1.1** (14/10/2026): tokens en tres niveles; escala de espaciado de 4 px; los bordes de los controles cumplen 3:1; comprobación de contraste en el build.
- **1.0** (14/10/2026): primera versión con la actividad 00.
