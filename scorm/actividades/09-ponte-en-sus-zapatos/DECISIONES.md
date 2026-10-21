# Decisiones · 09 Ponte en sus zapatos

- **Tipo nuevo `simulacion` en `core/`** (versión 3.8 del sistema): ningún tipo existente permite hacer una tarea en una interfaz con una limitación. La mini-web se declara en el JSON con 5 elementos fijos y se construye con `h()`: no hay HTML de la actividad.
- **La simulación no puede excluir a nadie**: el botón «Necesito otra forma de hacer esta tarea» está siempre visible y sustituye la tarea por una descripción textual y una pregunta equivalente que vale lo mismo. Así no se penaliza a quien usa lector de pantalla, no puede usar teclado o no ve bien la web.
- **Los filtros no afectan al lector de pantalla** (el texto del DOM no cambia) y el desenfoque es fijo en px, así que A+ lo reduce: es coherente con la pauta «facilitar aumento de letra», que es justo lo que enseña la pregunta.
- **Solo teclado en el móvil**: teclas en pantalla (Mayús+Tab, Tab, ↑, ↓, Espacio, Intro) que no roban el foco; el foco se dibuja con `:focus` (no `:focus-visible`) para que se vea también cuando lo mueven esas teclas.
- **El puntero se desactiva en la web de teclado** (`pointer-events: none`) y se avisa si alguien pulsa con el ratón. Con VoiceOver táctil la web no responde al doble toque: para eso están las teclas en pantalla y la otra forma.
- **Web «mal hecha» con 3 fallos a la vez** (foco invisible, orden de Tab distinto del visual y botón final que es un `div`): la respuesta correcta es «No se puede completar». Las webs bien hechas siempre se pueden completar, para que no baste con decir siempre «no se puede».
- **Tarea y reflexión valen 0,5 cada una**, y cada simulación pesa 2 (66 % de la nota): es el núcleo de la actividad. Terminar la tarea con otros datos (p. ej., otra sesión) no suma la mitad de la tarea.
- **Banco**: 8 simulaciones en 4 grupos de 2 (teclado bien, teclado mal, visión baja —borrosa y sol—, color) + 11 cortas; `garantizar` 4 simulaciones, así sale una de cada grupo. 8 preguntas en 30 min (las simulaciones llevan tiempo).
- **Corregido en este borrador**: el motor barajaba los elementos de la mini-web (heredado de `clasificar`), lo que desordenaba la página y el orden de Tab. Ahora la mini-web conserva el orden del JSON.
- **Corregido**: en «otra forma» de las webs bloqueadas, la correcta era la única que empezaba por «No»; ahora hay dos «No» con razones distintas para no dar pista por la forma.
- **Daltonismo simulado como deuteranopía** (matriz de Machado et al., 2009) porque es el más frecuente; el temario solo dice «problemas en la visualización del color» (153).
- **Sol en la pantalla**: el temario (156) cita pantallas pequeñas y humo; el sol lo añado como contexto de uso (iluminación, 155). La simulación es una bajada de contraste estática, sin destellos.
- **Fuera del temario, sin cifras nuevas**: no se piden ratios de contraste ni criterios WCAG concretos; las reflexiones usan solo los principios y pautas de las diapositivas 163–164 y los patrones de la 44.
- **Diapositiva 155** retirada de `img/`: ninguna pregunta la citaba.
- **Sin verificar**: uso real con lector de pantalla (VoiceOver/NVDA) y con teclado físico en Safari/Firefox (solo Chrome automatizado); fidelidad perceptiva de los filtros en pantallas reales.
- Nombres de negocios y personas inventados.
