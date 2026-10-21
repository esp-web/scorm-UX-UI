# Decisiones · 11 Reto de contraste

- **Tipo nuevo `contraste` en `core/`** (versión 3.7 del sistema): ninguno de los existentes permite manipular un color. Deslizador nativo de luminosidad HSL + botones ±1 + «Volver al original»; vista previa «Original» y «Tu versión».
- **Contenido fuera del temario**: los mínimos de contraste de WCAG (4,5:1 texto normal, 3:1 texto grande y bordes de controles; 7:1 AAA solo se menciona en explicaciones) y la definición de texto grande (24 px, o 19 px en negrita). El temario solo dice «facilitar aumento de letra y de contraste» (163). Se dan en `instrucciones`, en el enunciado de Moodle y cada explicación lo advierte.
- **Equilibrio didáctico**: el medidor da la cifra en vivo pero no dice si cumple. Como con la cifra visible bastaría con llevar el color al extremo, la regla es «cambiar el diseño lo mínimo»: entero entre el mínimo y el mínimo + 1; la mitad si se pasa; 0 si no llega. Así hay que saber qué mínimo aplica a cada elemento (texto normal, grande o borde). Quien cree que un titular grande necesita 4,5:1 se queda con media pregunta.
- **Margen de 1 punto, explicado con un ejemplo neutro** («con un mínimo de 2:1, entre 2:1 y 3:1») para no revelar los mínimos reales. Es una regla del reto, no de WCAG: se presenta como petición del cliente (conservar la marca).
- **Sin parcial por quedarse cerca** (p. ej. 3:1 cuando se pedía 4,5:1): premiaría el error conceptual que el reto quiere detectar. El parcial es solo para quien cumple pero se pasa.
- **Solo cambia la luminosidad, una capa por pregunta**: conserva el tono de marca y obliga a decidir qué capa (el enunciado lo dice). Con colores saturados, oscurecer mucho desplaza el aspecto (el coral se vuelve rojo).
- **Ratio truncado a 2 decimales** (4,499 no llega a 4,5), igual en el motor, en `build.py` y en lo que se ve.
- **Banco**: 8 retos en 4 grupos de 2 (botón, párrafo, titular, borde de campo); `garantizar` 4 `contraste`, así siempre sale uno de cada clase. 11 cortas (2 grupos de 2); salen 4. Total por intento: 8 en 10 min.
- **Variedad de dirección**: 2 retos se resuelven aclarando (modo oscuro) y 6 oscureciendo.
- **Los colores de los retos no cambian con el tema** (oscuro o alto contraste): son el contenido que se evalúa. Lo dice el enunciado de Moodle.
- **Paralelismo con el sol** (c04, c06): el temario (156) habla de pantallas pequeñas y humo; el sol en la pantalla lo añado como contexto de uso (iluminación, 155).
- **Respuesta en Moodle como `performance`** («L38 4.55:1»; correcta «4.5:1-5.5:1»): SCORM 1.2 no tiene un tipo numérico con rango.
- **Lectura en voz alta**: lee los códigos de color sin «#» y el ratio como «4,55 a 1».
- **Sin verificar**: uso real con lector de pantalla (VoiceOver/NVDA) del deslizador y su `aria-valuetext`, y el deslizador en un móvil táctil real (solo emulación de 390 px).
- Nombres de negocios y personas inventados.
