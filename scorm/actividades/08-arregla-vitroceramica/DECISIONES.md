# Decisiones · 08 Arregla la vitrocerámica

- **Mecánica con `arrastrar`, sin tipo nuevo**: el hueco de cada mando es una zona del gráfico y los mandos son los términos. Un tipo «panel» propio solo cambiaría el aspecto; la lógica (colocar ficha en zona, acierto parcial por zona) es la misma.
- **Cambio en `core/`: `pinesSoloNumero`**. Los huecos de un panel están muy juntos (cuadrado de 2×2) y en escritorio las etiquetas de los pines rellenos se tapaban entre sí. Con esta opción los pines muestran solo el número, como ya pasaba en móvil; lo colocado se lee en la lista de huecos. Compatible con todo lo anterior (opción por pregunta, desactivada por defecto).
- **Mandos nombrados por el tipo de fuego** («Fuego pequeño», «Fuego doble», «Fuego alargado»…), no por su posición («trasero izquierdo»). Así hay que mirar la placa, localizar el fuego y llevar su posición al grupo de mandos: eso es el mapeo natural. Con la posición en el nombre bastaría leer. En cada placa los tipos no se repiten.
- **Términos cortos y sin «Mando del…»**: todas las fichas empezarían igual y la instrucción ya dice que cada ficha es un mando.
- **Un distractor por panel** (un tipo de fuego que esa placa no tiene), igual que en las actividades 06 y 10.
- **Siempre 3 paneles**: `garantizar` con tres `arrastrar` y los 6 paneles en tres grupos de dos (`panel-a` 2×2 centrado, `panel-b` tres fuegos o fila, `panel-c` cinco fuegos o lateral). Repetir un tipo en `garantizar` ya funcionaba en el motor; solo se documenta en el README.
- **Panel en fila (q04)**: no es un panel «malo». Si los fuegos están en fila, los mandos en fila también son mapeo natural. El temario no lo dice tal cual; se deduce de la comparación 131–133 y lo anoto por si el docente prefiere quitarlo.
- **Panel cruzado (q10)**: mandos agrupados pero con la izquierda y la derecha cambiadas, para que no se confunda «agrupar» con «mapear».
- **«Mapeo natural»** aparece en el temario solo como pregunta en la diapositiva 133; las explicaciones lo definen como «la disposición de los mandos reproduce la de los fuegos», sin más teoría de Norman (affordances, significantes…), que no está en el temario.
- **Rasgo de la vitrocerámica = facilidad de aprendizaje** (q08, q09), porque el temario coloca las diapositivas 131–133 dentro de ese rasgo. En q08 no se ofrece «memorabilidad» como distractor para evitar ambigüedad.
- **Emparejar (q18)** cita la diapositiva 126, aunque familiaridad (127), facilidad de aprendizaje (130) y eficiencia (134) están en otras; el campo solo admite una.
- **Tiempo**: 10 min para 3 paneles y 5 preguntas cortas (unos 90 s por panel y 45 s por pregunta corta). Puede quedarse justo para alumnado con dislexia: ver «Tiempo ampliado» en el README.
- **Diapositivas no citadas**: 112, 114–123, 127–129, 131, 134–142 (navegación, heurísticos y otros rasgos que tratan las actividades 07 y 00, o ejemplos sin contenido evaluable aquí).
- **SVG** generados con un script de un solo uso (no está en el repositorio). Los fuegos y paneles son dibujos propios inspirados en las diapositivas 131–132; sin marcas.
